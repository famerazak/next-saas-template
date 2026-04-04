-- S18 core app read/write gating dashboard note schema

alter table public.tenants
  add column if not exists dashboard_note text;

alter table public.tenants
  drop constraint if exists tenants_dashboard_note_length;

alter table public.tenants
  add constraint tenants_dashboard_note_length
  check (dashboard_note is null or char_length(trim(dashboard_note)) <= 500);
