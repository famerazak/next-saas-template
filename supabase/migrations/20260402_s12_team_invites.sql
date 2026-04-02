-- S12 invite member flow schema

create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(trim(email)) > 0 and position('@' in trim(email)) > 1),
  role public.membership_role not null default 'member',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists tenant_invites_pending_unique_idx
  on public.tenant_invites (tenant_id, lower(email))
  where status = 'pending';

create index if not exists tenant_invites_tenant_id_idx on public.tenant_invites(tenant_id);
create index if not exists tenant_invites_status_idx on public.tenant_invites(status);

alter table public.tenant_invites enable row level security;
