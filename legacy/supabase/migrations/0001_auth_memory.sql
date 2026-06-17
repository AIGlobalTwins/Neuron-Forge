-- Neuron Forge (legacy) — per-user auth memory.
-- Run this once in the Supabase SQL editor.

-- ── Per-user settings (replaces the filesystem settings store) ──────────────
create table if not exists public.user_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  anthropic_api_key text   not null default '',
  vercel_token      text   not null default '',
  claude_model      text   not null default 'claude-sonnet-4-6',
  data              jsonb  not null default '{}'::jsonb,   -- instagram/whatsapp/google etc.
  updated_at        timestamptz not null default now()
);

-- ── Every agent result — the cross-device "memory" ─────────────────────────
create table if not exists public.generations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,                 -- analyze|maps|seo|email|ads|calendar|consulting|security|instagram
  name       text not null default '',
  payload    jsonb not null default '{}'::jsonb,  -- the full result, reopenable
  created_at timestamptz not null default now()
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);
create index if not exists generations_user_type_idx
  on public.generations (user_id, type, created_at desc);

-- ── Row Level Security — a user only ever sees their own rows ───────────────
alter table public.user_settings enable row level security;
alter table public.generations   enable row level security;

drop policy if exists "own_settings" on public.user_settings;
create policy "own_settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_generations" on public.generations;
create policy "own_generations" on public.generations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
