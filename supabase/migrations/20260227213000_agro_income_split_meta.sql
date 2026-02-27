begin;

create extension if not exists pgcrypto;

alter table if exists public.agro_income
  add column if not exists split_meta jsonb;

notify pgrst, 'reload schema';

commit;
