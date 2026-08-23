alter table public.gado_state
  add column if not exists deleted_records jsonb not null default '[]'::jsonb;

alter table public.gado_state_history
  add column if not exists deleted_records jsonb not null default '[]'::jsonb;
