-- S10 tenant settings schema

alter table public.tenants
add column if not exists updated_at timestamptz not null default now();
