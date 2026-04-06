create table if not exists public.tenant_files (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  file_name text not null check (char_length(trim(file_name)) > 0),
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 2097152),
  content_base64 text not null,
  uploaded_by_user_id text not null,
  uploaded_by_email text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tenant_files_tenant_created_idx
  on public.tenant_files (tenant_id, created_at desc);
