-- Website Builder — initial schema (multi-tenant + RLS + telemetry + credit ledger)
-- tenants → members → projects → sites. RLS on everything, isolated per tenant.

create extension if not exists "pgcrypto";

-- ── Tenants ──────────────────────────────────────────────────────────────────
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  branding    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── Members (maps a Supabase auth user to a tenant) ─────────────────────────
create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('member','tenant_admin')),
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);
create index if not exists members_user_idx on members(user_id);

-- ── Projects & Sites ─────────────────────────────────────────────────────────
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_tenant_idx on projects(tenant_id);

create table if not exists sites (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  status      text not null default 'draft' check (status in ('draft','published')),
  deploy_url  text,
  created_at  timestamptz not null default now()
);
create index if not exists sites_tenant_idx on sites(tenant_id);

-- ── Telemetry: every AI call ─────────────────────────────────────────────────
create table if not exists usage_events (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  member_id     uuid references members(id) on delete set null,
  project_id    uuid references projects(id) on delete set null,
  operation     text not null check (operation in ('generate','edit','fix')),
  model         text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd      numeric(10,4) not null default 0,
  duration_ms   integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists usage_tenant_idx on usage_events(tenant_id, created_at);

-- ── Credit ledger (append-only: grant + / reserve − / confirm − / refund +) ──
create table if not exists credit_transactions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  kind        text not null check (kind in ('grant','reserve','confirm','refund')),
  amount      integer not null,          -- signed
  ref         text,                      -- links reserve ↔ confirm/refund / usage_event
  created_at  timestamptz not null default now()
);
create index if not exists credits_member_idx on credit_transactions(member_id, created_at);
-- Live balance = sum(amount) over a member's rows (no mutable balance column).

-- ── Row Level Security ───────────────────────────────────────────────────────
-- A caller may see rows of any tenant they belong to (via members.user_id = auth.uid()).
create or replace function current_tenant_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select tenant_id from members where user_id = auth.uid()
$$;

alter table tenants               enable row level security;
alter table members               enable row level security;
alter table projects              enable row level security;
alter table sites                 enable row level security;
alter table usage_events          enable row level security;
alter table credit_transactions   enable row level security;

create policy tenants_sel  on tenants              for select using (id in (select current_tenant_ids()));
create policy members_sel  on members              for select using (tenant_id in (select current_tenant_ids()));
create policy projects_all on projects             for all    using (tenant_id in (select current_tenant_ids())) with check (tenant_id in (select current_tenant_ids()));
create policy sites_all    on sites                for all    using (tenant_id in (select current_tenant_ids())) with check (tenant_id in (select current_tenant_ids()));
create policy usage_sel    on usage_events         for select using (tenant_id in (select current_tenant_ids()));
create policy credits_sel  on credit_transactions  for select using (tenant_id in (select current_tenant_ids()));

-- Writes to usage_events / credit_transactions go through the API with the
-- service role (bypasses RLS). Clients only read.
