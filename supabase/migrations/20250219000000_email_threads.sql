-- Email Threads — stores inbound emails and AI-generated reply drafts
-- Populated by the /api/email/inbound Brevo webhook when a lead replies.

create table if not exists email_threads (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references tenants (id) on delete cascade,
  lead_id      uuid references generated_leads (id) on delete set null,
  from_email   text not null,
  from_name    text,
  subject      text,
  body_text    text,
  ai_draft     text,
  status       text not null default 'pending_review'
               check (status in ('pending_review', 'sent', 'dismissed')),
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_email_threads_tenant  on email_threads (tenant_id);
create index if not exists idx_email_threads_lead    on email_threads (lead_id);
create index if not exists idx_email_threads_status  on email_threads (status);
create index if not exists idx_email_threads_from    on email_threads (from_email);

alter table email_threads enable row level security;

-- Service-role (admin dashboard) bypasses RLS automatically.
-- Tenant members can read their own threads
create policy "Tenant members read email threads"
  on email_threads for select
  using (tenant_id in (
    select tenant_id from tenant_users where user_id = auth.uid()
  ));

-- Tenant admins/owners/members can manage their threads
create policy "Tenant members manage email threads"
  on email_threads for all
  using (tenant_id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ));
