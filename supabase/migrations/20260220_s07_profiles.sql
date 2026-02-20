-- S07 profile settings schema

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  job_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(trim(full_name)) <= 80),
  constraint profiles_job_title_length check (job_title is null or char_length(trim(job_title)) <= 80)
);

alter table public.profiles enable row level security;
