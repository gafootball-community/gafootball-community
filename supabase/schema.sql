-- Extensions
create extension if not exists pgcrypto;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500),
  is_hidden boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_deleted_consistency check (
    (is_deleted = false and deleted_at is null)
    or (is_deleted = true and deleted_at is not null)
  )
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

-- Indexes
create index if not exists idx_rooms_active_sort on public.rooms (is_active, sort_order);
create index if not exists idx_messages_room_created on public.messages (room_id, created_at);
create index if not exists idx_messages_profile on public.messages (profile_id);
create index if not exists idx_reports_message on public.message_reports (message_id);
create index if not exists idx_reports_reporter on public.message_reports (reporter_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_messages_set_updated_at on public.messages;
create trigger trg_messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

-- Validate room active on message insert/update
create or replace function public.ensure_active_room_for_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.rooms r
    where r.id = new.room_id and r.is_active = true
  ) then
    raise exception 'inactive_or_missing_room';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_ensure_active_room on public.messages;
create trigger trg_messages_ensure_active_room
before insert or update of room_id on public.messages
for each row
execute function public.ensure_active_room_for_message();

-- Logical delete helper
create or replace function public.soft_delete_message(target_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set is_deleted = true,
      deleted_at = now()
  where id = target_message_id
    and profile_id = auth.uid();
end;
$$;

grant execute on function public.soft_delete_message(uuid) to authenticated, anon;

-- Seed fixed rooms
insert into public.rooms (slug, name, sort_order, is_active)
values
  ('today-match', '今日の試合', 1, true),
  ('national-team', '代表戦', 2, true),
  ('transfer-news', '移籍情報', 3, true),
  ('premier-league', 'プレミアリーグ', 4, true),
  ('la-liga', 'ラ・リーガ', 5, true),
  ('bundesliga', 'ブンデスリーガ', 6, true),
  ('serie-a', 'セリエA', 7, true),
  ('ligue-1', 'リーグ・アン', 8, true),
  ('chat', '雑談', 9, true)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- RLS
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;

-- profiles policies
create policy "profiles_select_all"
on public.profiles
for select
using (true);

create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- rooms policies
create policy "rooms_select_active"
on public.rooms
for select
using (is_active = true);

-- messages policies
create policy "messages_select_visible"
on public.messages
for select
using (is_hidden = false and is_deleted = false);

create policy "messages_insert_self"
on public.messages
for insert
with check (
  auth.uid() = profile_id
  and exists (
    select 1 from public.rooms r
    where r.id = room_id
      and r.is_active = true
  )
);

create policy "messages_update_own_only"
on public.messages
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- message_reports policies
create policy "reports_insert_self"
on public.message_reports
for insert
with check (auth.uid() = reporter_id);

create policy "reports_select_self"
on public.message_reports
for select
using (auth.uid() = reporter_id);

-- Realtime publication
alter publication supabase_realtime add table public.messages;
