-- Client workspace: a reseller groups every agent output under a saved business.
-- Run once in the Supabase SQL editor.

create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null default '',
  description text not null default '',
  website     text not null default '',
  phone       text not null default '',
  hours       text not null default '',
  services    jsonb not null default '[]'::jsonb,  -- string[]
  faqs        jsonb not null default '[]'::jsonb,  -- { question, answer }[]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists clients_user_idx on public.clients (user_id, created_at desc);

alter table public.clients enable row level security;
drop policy if exists "own_clients" on public.clients;
create policy "own_clients" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Link each generation to a client (optional — free generations stay null).
alter table public.generations
  add column if not exists client_id uuid references public.clients(id) on delete set null;
create index if not exists generations_client_idx on public.generations (client_id, created_at desc);
