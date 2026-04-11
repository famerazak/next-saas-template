create table if not exists public.platform_app_errors (
  id text primary key,
  fingerprint text not null unique,
  source text not null,
  route text not null,
  message text not null,
  severity text not null default 'error',
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  occurrence_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_app_errors_last_seen_idx
  on public.platform_app_errors (last_seen_at desc);
