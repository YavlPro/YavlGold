begin;

create extension if not exists pgcrypto;

create table if not exists public.agro_task_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  crop_id uuid references public.agro_crops(id) on delete set null,
  title text not null,
  task_type text not null,
  task_date date not null default current_date,
  duration_minutes integer not null,
  duration_label text,
  economic_effect text not null default 'none',
  amount numeric(14,2),
  currency text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint agro_task_cycles_title_check
    check (char_length(trim(title)) > 0),
  constraint agro_task_cycles_task_type_check
    check (task_type in (
      'jornal',
      'fumigacion',
      'riego',
      'deshierbe',
      'cosecha',
      'siembra',
      'compra_traslado',
      'revision',
      'mantenimiento',
      'transporte',
      'otra'
    )),
  constraint agro_task_cycles_duration_check
    check (duration_minutes > 0),
  constraint agro_task_cycles_economic_effect_check
    check (economic_effect in ('none', 'expense', 'income', 'loss', 'pending')),
  constraint agro_task_cycles_currency_check
    check (currency is null or currency in ('COP', 'USD', 'VES')),
  constraint agro_task_cycles_amount_effect_check
    check (
      (economic_effect = 'none' and amount is null and currency is null)
      or (
        economic_effect <> 'none'
        and amount is not null
        and amount > 0
        and currency is not null
      )
    )
);

create index if not exists agro_task_cycles_user_task_date_idx
  on public.agro_task_cycles (user_id, task_date desc, created_at desc);

create index if not exists agro_task_cycles_user_deleted_idx
  on public.agro_task_cycles (user_id, deleted_at);

create index if not exists agro_task_cycles_user_type_idx
  on public.agro_task_cycles (user_id, task_type);

create index if not exists agro_task_cycles_user_crop_idx
  on public.agro_task_cycles (user_id, crop_id, task_date desc);

create or replace function public.agro_task_cycles_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agro_task_cycles_set_updated_at on public.agro_task_cycles;
create trigger agro_task_cycles_set_updated_at
before update on public.agro_task_cycles
for each row
execute function public.agro_task_cycles_set_updated_at();

alter table public.agro_task_cycles enable row level security;

drop policy if exists agro_task_cycles_select_own on public.agro_task_cycles;
create policy agro_task_cycles_select_own
on public.agro_task_cycles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists agro_task_cycles_insert_own on public.agro_task_cycles;
create policy agro_task_cycles_insert_own
on public.agro_task_cycles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists agro_task_cycles_update_own on public.agro_task_cycles;
create policy agro_task_cycles_update_own
on public.agro_task_cycles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists agro_task_cycles_delete_own on public.agro_task_cycles;
create policy agro_task_cycles_delete_own
on public.agro_task_cycles
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

commit;
