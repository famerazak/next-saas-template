alter table if exists public.user_two_factor_factors
  add column if not exists backup_code_hashes text[] not null default '{}',
  add column if not exists backup_codes_generated_at timestamptz;
