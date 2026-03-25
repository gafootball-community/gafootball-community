-- Extensions
create extension if not exists "pgcrypto";

-- Updated at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  profile_id uuid not null references public.profiles(id),
  content text not null check (char_length(content) between 1 and 300),
  is_hidden boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id),
  reporter_id uuid not null references public.profiles(id),
  reason text not null,
  created_at timestamptz not null default now(),
  unique(message_id, reporter_id)
);

-- Indexes
create index if not exists idx_rooms_sort_order on public.rooms(sort_order);
create index if not exists idx_messages_room_created on public.messages(room_id, created_at);
create index if not exists idx_reports_message on public.message_reports(message_id);

-- Trigger
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

-- Seed fixed rooms
insert into public.rooms (slug, name, sort_order) values
  ('today-match', '🔥 今日の試合', 10),
  ('national-team', '🌍 代表戦', 20),
  ('transfer', '🔥 移籍情報', 30),
  ('premier-league', '🇬🇧 プレミアリーグ', 40),
  ('la-liga', '🇪🇸 ラ・リーガ', 50),
  ('bundesliga', '🇩🇪 ブンデスリーガ', 60),
  ('serie-a', '🇮🇹 セリエA', 70),
  ('ligue-1', '🇫🇷 リーグ・アン', 80),
  ('free-talk', '💬 雑談', 90)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

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
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- rooms policies
create policy "rooms_select_all"
on public.rooms
for select
using (is_active = true);

-- messages policies
create policy "messages_select_all"
on public.messages
for select
using (true);

create policy "messages_insert_self"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = profile_id
  and exists (
    select 1 from public.rooms r where r.id = room_id and r.is_active = true
  )
);

create policy "messages_update_admin_only"
on public.messages
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  )
);

-- message_reports policies
create policy "reports_insert_self"
on public.message_reports
for insert
to authenticated
with check (auth.uid() = reporter_id);

create policy "reports_select_admin_only"
on public.message_reports
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  )
);

-- Realtime publication
alter publication supabase_realtime add table public.messages;
