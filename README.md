# GA Football Community MVP

LINEオープンチャット風の**固定ルーム型サッカーコミュニティ**MVPです。

## 1) 最終DB設計

### `profiles`
- `id (uuid, PK, auth.users.id)`
- `nickname (text, 1-20文字)`
- `is_admin (boolean)`
- `created_at`, `updated_at`

### `rooms`
- `id (uuid, PK)`
- `slug (text, unique)`
- `name (text)`
- `sort_order (int)`
- `is_active (boolean)`
- `created_at`

### `messages`
- `id (uuid, PK)`
- `room_id (uuid, FK -> rooms.id)`
- `profile_id (uuid, FK -> profiles.id)`
- `content (text, 1-300文字)`
- `is_hidden (boolean)`
- `is_deleted (boolean)`
- `deleted_at (timestamptz)`
- `created_at`, `updated_at`

> 物理DELETEせず、`is_deleted` / `is_hidden` で論理制御します。

### `message_reports`
- `id (uuid, PK)`
- `message_id (uuid, FK -> messages.id)`
- `reporter_id (uuid, FK -> profiles.id)`
- `reason (text)`
- `created_at`
- `unique(message_id, reporter_id)`

## 2) SQLスキーマ（DDL）
- `supabase/schema.sql` をそのまま Supabase SQL Editor で実行してください。
- テーブル、インデックス、トリガー、固定ルームseed、RLS、Realtime公開設定を含みます。

## 3) RLSポリシー

- `profiles`
  - select: 全員可
  - insert/update: 本人のみ
- `rooms`
  - select: `is_active = true` のみ
- `messages`
  - select: 全員可
  - insert: 投稿者本人 + 有効ルームのみ
  - update: 管理者のみ（`profiles.is_admin=true`）
- `message_reports`
  - insert: 通報者本人のみ
  - select: 管理者のみ

## 4) フォルダ構成

```text
app/
  layout.tsx
  page.tsx                  # ルーム一覧
  profile/page.tsx          # ニックネーム設定
  rooms/[slug]/page.tsx     # ルームチャット
components/
  bottom-nav.tsx
  message-input.tsx
  report-button.tsx
lib/
  auth.ts
  constants.ts
  supabase.ts
  types.ts
supabase/
  schema.sql
```

## 5) Next.jsコード一式
- App Router + TypeScript + Tailwindで実装。
- スマホ優先UI、下部ナビ、固定チャット入力、ダークテーマ（黒 + 緑アクセント）。
- 1ルーム1ストリームで時系列表示。

## 6) Supabase接続

1. Supabaseプロジェクト作成
2. Authentication > Providers > **Anonymous** を有効化
3. `.env.example` をコピーして `.env.local` 作成
4. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
5. SQL Editorで `supabase/schema.sql` を実行

## 7) リアルタイム実装
- `app/rooms/[slug]/page.tsx` で `postgres_changes` を購読
- 対象: `messages` テーブル（ルームIDでfilter）
- insert/update時に再フェッチして画面同期

## 8) デプロイ手順（Vercel想定）

1. GitHubへpush
2. VercelでImport
3. Environment Variablesに以下を設定
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy
5. Supabase側で匿名認証とschema適用済みであることを確認

## ローカル起動

```bash
npm install
npm run dev
```

http://localhost:3000
