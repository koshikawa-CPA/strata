-- ============================================================
-- Strata - Initial Schema Migration
-- ============================================================

-- ────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────
-- profiles
-- ユーザー登録時に auth.users から自動生成される
-- ────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: 本人のみ参照"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: 本人のみ更新"
  on public.profiles for update
  using (auth.uid() = id);

-- handle_new_user: 新規登録時に profiles を自動作成
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at を自動更新する汎用関数
create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ────────────────────────────────────────
-- notebooks
-- ユーザーごとに1つのノートブック（拡張可能な設計）
-- ────────────────────────────────────────
create table public.notebooks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'My Notebook',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.notebooks enable row level security;

create policy "notebooks: 本人のみ参照"
  on public.notebooks for select
  using (auth.uid() = user_id);

create policy "notebooks: 本人のみ追加"
  on public.notebooks for insert
  with check (auth.uid() = user_id);

create policy "notebooks: 本人のみ更新"
  on public.notebooks for update
  using (auth.uid() = user_id);

create policy "notebooks: 本人のみ削除"
  on public.notebooks for delete
  using (auth.uid() = user_id);

create trigger notebooks_updated_at
  before update on public.notebooks
  for each row execute procedure public.set_updated_at();

create index notebooks_user_id_idx on public.notebooks(user_id);

-- ────────────────────────────────────────
-- sections (第1層タブ)
-- ────────────────────────────────────────
create table public.sections (
  id          uuid primary key default uuid_generate_v4(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'Section 1',
  color       text not null default '#7c3aed',
  position    integer not null default 0,    -- 並び順
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sections_position_positive check (position >= 0)
);

alter table public.sections enable row level security;

create policy "sections: 本人のみ参照"
  on public.sections for select
  using (auth.uid() = user_id);

create policy "sections: 本人のみ追加"
  on public.sections for insert
  with check (auth.uid() = user_id);

create policy "sections: 本人のみ更新"
  on public.sections for update
  using (auth.uid() = user_id);

create policy "sections: 本人のみ削除"
  on public.sections for delete
  using (auth.uid() = user_id);

create trigger sections_updated_at
  before update on public.sections
  for each row execute procedure public.set_updated_at();

create index sections_notebook_id_idx on public.sections(notebook_id);
create index sections_user_id_idx     on public.sections(user_id);

-- ────────────────────────────────────────
-- pages (第2層タブ)
-- ────────────────────────────────────────
create table public.pages (
  id          uuid primary key default uuid_generate_v4(),
  section_id  uuid not null references public.sections(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'Page 1',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pages_position_positive check (position >= 0)
);

alter table public.pages enable row level security;

create policy "pages: 本人のみ参照"
  on public.pages for select
  using (auth.uid() = user_id);

create policy "pages: 本人のみ追加"
  on public.pages for insert
  with check (auth.uid() = user_id);

create policy "pages: 本人のみ更新"
  on public.pages for update
  using (auth.uid() = user_id);

create policy "pages: 本人のみ削除"
  on public.pages for delete
  using (auth.uid() = user_id);

create trigger pages_updated_at
  before update on public.pages
  for each row execute procedure public.set_updated_at();

create index pages_section_id_idx on public.pages(section_id);
create index pages_user_id_idx    on public.pages(user_id);

-- ────────────────────────────────────────
-- sheets (第3層タブ)
-- ────────────────────────────────────────
create table public.sheets (
  id          uuid primary key default uuid_generate_v4(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default '1',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sheets_position_positive check (position >= 0)
);

alter table public.sheets enable row level security;

create policy "sheets: 本人のみ参照"
  on public.sheets for select
  using (auth.uid() = user_id);

create policy "sheets: 本人のみ追加"
  on public.sheets for insert
  with check (auth.uid() = user_id);

create policy "sheets: 本人のみ更新"
  on public.sheets for update
  using (auth.uid() = user_id);

create policy "sheets: 本人のみ削除"
  on public.sheets for delete
  using (auth.uid() = user_id);

create trigger sheets_updated_at
  before update on public.sheets
  for each row execute procedure public.set_updated_at();

create index sheets_page_id_idx  on public.sheets(page_id);
create index sheets_user_id_idx  on public.sheets(user_id);

-- ────────────────────────────────────────
-- blocks (ページ内コンテンツブロック)
-- type: 'title' | 'text' | 'grid' | 'divider'
-- content: ブロック種別ごとの JSON データ
--   title   → { "content": "..." }
--   text    → { "content": "<TipTap JSON>" }
--   grid    → { "rows": N, "cols": N, "cells": [...], "colWidths": [...], "rowHeights": [...] }
--   divider → {}
-- ────────────────────────────────────────
create table public.blocks (
  id          uuid primary key default uuid_generate_v4(),
  sheet_id    uuid not null references public.sheets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  content     jsonb not null default '{}',
  position    integer not null default 0,    -- ブロックの表示順
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint blocks_type_valid check (type in ('title', 'text', 'grid', 'divider')),
  constraint blocks_position_positive check (position >= 0)
);

alter table public.blocks enable row level security;

create policy "blocks: 本人のみ参照"
  on public.blocks for select
  using (auth.uid() = user_id);

create policy "blocks: 本人のみ追加"
  on public.blocks for insert
  with check (auth.uid() = user_id);

create policy "blocks: 本人のみ更新"
  on public.blocks for update
  using (auth.uid() = user_id);

create policy "blocks: 本人のみ削除"
  on public.blocks for delete
  using (auth.uid() = user_id);

create trigger blocks_updated_at
  before update on public.blocks
  for each row execute procedure public.set_updated_at();

create index blocks_sheet_id_idx  on public.blocks(sheet_id);
create index blocks_user_id_idx   on public.blocks(user_id);
create index blocks_position_idx  on public.blocks(sheet_id, position);
-- JSONB 全文検索用 GIN インデックス（テキスト検索の高速化）
create index blocks_content_gin_idx on public.blocks using gin(content);

-- ────────────────────────────────────────
-- Storage バケット設定
-- ユーザーがグリッドにアップロードしたファイル・画像を保存
-- ────────────────────────────────────────

-- バケット作成（Supabase Storage）
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- ストレージ RLS: 本人のフォルダのみ操作可能
-- ファイルパス構造: attachments/{user_id}/{filename}

create policy "storage: 本人のみ参照"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage: 本人のみアップロード"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage: 本人のみ更新"
  on storage.objects for update
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage: 本人のみ削除"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
