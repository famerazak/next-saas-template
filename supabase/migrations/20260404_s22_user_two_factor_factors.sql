create table if not exists public.user_two_factor_factors (
  user_id uuid primary key,
  email text,
  totp_secret text,
  enabled_at timestamptz,
  pending_secret text,
  pending_started_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_two_factor_factors_enabled_at_idx
  on public.user_two_factor_factors (enabled_at desc nulls last);
