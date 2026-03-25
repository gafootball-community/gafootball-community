# GaFootball Community MVP

固定ルーム型のサッカーグループチャットMVPです。Next.js App Router + TypeScript + Tailwind CSS + Supabase（匿名認証 + Realtime）で、モバイル最優先のチャット体験を実装しています。

## 主な機能

- 匿名ログイン（メール不要）
- 初回アクセス時にプロフィール自動作成
- ルーム一覧（固定9ルーム）
- ルームチャット（Realtime反映）
- プロフィールでニックネーム変更
- 通報機能（重複通報防止）
- 論理削除 / 非表示に対応したスキーマ
- ダークテーマ + 緑アクセント + 下部固定ナビ + 下部固定入力欄

## ルーム構成（固定）

1. 今日の試合
2. 代表戦
3. 移籍情報
4. プレミアリーグ
5. ラ・リーガ
6. ブンデスリーガ
7. セリエA
8. リーグ・アン
9. 雑談

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数を設定

`.env.example` を `.env.local` にコピーして値を設定します。

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Supabaseの設定

1. Supabaseプロジェクトを作成
2. Authentication > Providers で **Anonymous Sign-Ins** を有効化
3. SQL Editorで `supabase/schema.sql` を実行
4. Database > Replicationで `public.messages` がRealtime対象になっていることを確認

### 4. 起動

```bash
npm run dev
```

`http://localhost:3000` を開くと、初回アクセス時に匿名ログイン + profiles作成が実行されます。

## ディレクトリ構成

- `app/` : App Routerページ
- `components/` : UI部品（下部ナビ、入力欄、通報）
- `lib/` : Supabase接続・認証補助・型・定数
- `supabase/schema.sql` : テーブル/インデックス/RLS/Realtime/seed

## 注意点（MVP）

- 管理画面や通知、検索、画像投稿などは未実装
- ルームごとの表示メッセージは最新200件
- 通報理由入力は簡易プロンプト方式
