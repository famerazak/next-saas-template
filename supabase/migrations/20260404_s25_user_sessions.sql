create table if not exists public.user_sessions (
  session_id text primary key,
  user_id text not null,
  email text not null,
  tenant_name text,
  role text,
  user_agent_label text,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create index if not exists user_sessions_user_id_last_seen_at_idx
  on public.user_sessions (user_id, last_seen_at desc);
