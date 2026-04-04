create table if not exists public.tenant_audit_logs (
  id text primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  action text not null,
  summary text not null,
  actor_user_id uuid not null,
  actor_email text not null,
  actor_name text,
  actor_role text,
  origin text not null default 'tenant',
  target_type text,
  target_id text,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists tenant_audit_logs_tenant_occurred_idx
  on public.tenant_audit_logs (tenant_id, occurred_at desc);

create index if not exists tenant_audit_logs_action_idx
  on public.tenant_audit_logs (tenant_id, action, occurred_at desc);
