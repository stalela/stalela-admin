-- Lalela B2B Marketing — Multi-tenant tables
-- Run against your Supabase project via SQL editor or supabase db push.

/* ─── Tenants ─────────────────────────────────────────────────── */

create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  owner_email text not null,
  plan        text not null default 'free'
              check (plan in ('free', 'premium', 'enterprise')),
  status      text not null default 'trial'
              check (status in ('active', 'suspended', 'trial')),
  settings    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tenants_slug on tenants (slug);
create index if not exists idx_tenants_owner on tenants (owner_email);

/* ─── Tenant users (join table: auth.users ↔ tenants) ─────── */

create table if not exists tenant_users (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants (id) on delete cascade,
  user_id    uuid not null,                -- references auth.users(id)
  role       text not null default 'member'
             check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_tenant_users_user on tenant_users (user_id);
create index if not exists idx_tenant_users_tenant on tenant_users (tenant_id);

/* ─── Client companies (a tenant's ad clients) ───────────── */

create table if not exists client_companies (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants (id) on delete cascade,
  name          text not null,
  industry      text,
  website       text,
  logo          text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_client_companies_tenant on client_companies (tenant_id);

/* ─── Campaigns ───────────────────────────────────────────── */

create table if not exists campaigns (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants (id) on delete cascade,
  client_company_id uuid references client_companies (id) on delete set null,
  name              text not null,
  objective         text,
  platform          text not null default 'generic'
                    check (platform in ('google', 'meta', 'linkedin', 'tiktok', 'x', 'generic')),
  status            text not null default 'draft'
                    check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  budget            numeric(12,2),
  currency          text not null default 'ZAR',
  start_date        date,
  end_date          date,
  target_audience   jsonb,
  settings          jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_campaigns_tenant on campaigns (tenant_id);
create index if not exists idx_campaigns_client on campaigns (client_company_id);
create index if not exists idx_campaigns_status on campaigns (status);

/* ─── Campaign content (AI-generated assets) ─────────────── */

create table if not exists campaign_content (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns (id) on delete cascade,
  content_type  text not null
                check (content_type in ('ad_copy', 'headline', 'description', 'cta', 'image_prompt', 'social_post')),
  content       text not null,
  variant_label text,
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_campaign_content_campaign on campaign_content (campaign_id);

/* ─── Campaign metrics (daily performance snapshots) ──────── */

create table if not exists campaign_metrics (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns (id) on delete cascade,
  date         date not null,
  impressions  integer not null default 0,
  clicks       integer not null default 0,
  conversions  integer not null default 0,
  spend        numeric(12,2) not null default 0,
  revenue      numeric(12,2) not null default 0,
  created_at   timestamptz not null default now(),
  unique (campaign_id, date)
);

create index if not exists idx_campaign_metrics_campaign on campaign_metrics (campaign_id);

/* ─── RLS policies ────────────────────────────────────────── */

-- Enable RLS on all new tables
alter table tenants          enable row level security;
alter table tenant_users     enable row level security;
alter table client_companies enable row level security;
alter table campaigns        enable row level security;
alter table campaign_content enable row level security;
alter table campaign_metrics enable row level security;

-- Service-role (admin dashboard) bypasses RLS automatically.
-- These policies allow authenticated tenant users to access their own data.

-- Tenant users can read their own tenant
create policy "Users can read own tenant"
  on tenants for select
  using (id in (select tenant_id from tenant_users where user_id = auth.uid()));

-- Tenant users can read their membership
create policy "Users can read own memberships"
  on tenant_users for select
  using (user_id = auth.uid());

-- Tenant members can read client companies in their tenant
create policy "Tenant members read clients"
  on client_companies for select
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));

-- Tenant admins/owners can manage client companies
create policy "Tenant admins manage clients"
  on client_companies for all
  using (tenant_id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

-- Tenant members can read campaigns
create policy "Tenant members read campaigns"
  on campaigns for select
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));

-- Tenant admins/owners can manage campaigns
create policy "Tenant admins manage campaigns"
  on campaigns for all
  using (tenant_id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ));

-- Campaign content follows campaign access
create policy "Tenant members read content"
  on campaign_content for select
  using (campaign_id in (
    select c.id from campaigns c
    join tenant_users tu on tu.tenant_id = c.tenant_id
    where tu.user_id = auth.uid()
  ));

create policy "Tenant members manage content"
  on campaign_content for all
  using (campaign_id in (
    select c.id from campaigns c
    join tenant_users tu on tu.tenant_id = c.tenant_id
    where tu.user_id = auth.uid() and tu.role in ('owner', 'admin', 'member')
  ));

-- Campaign metrics follow campaign access
create policy "Tenant members read metrics"
  on campaign_metrics for select
  using (campaign_id in (
    select c.id from campaigns c
    join tenant_users tu on tu.tenant_id = c.tenant_id
    where tu.user_id = auth.uid()
  ));

create policy "Tenant admins manage metrics"
  on campaign_metrics for all
  using (campaign_id in (
    select c.id from campaigns c
    join tenant_users tu on tu.tenant_id = c.tenant_id
    where tu.user_id = auth.uid() and tu.role in ('owner', 'admin')
  ));
