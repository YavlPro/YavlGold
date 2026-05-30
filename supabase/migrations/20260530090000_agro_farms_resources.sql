begin;

create extension if not exists pgcrypto;

create table if not exists public.agro_farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location_text text null,
  notes text null,
  is_default boolean not null default false,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agro_farms_name_check check (char_length(trim(name)) > 0)
);

alter table public.agro_crops
add column if not exists farm_id uuid null references public.agro_farms(id) on delete set null;

create index if not exists agro_farms_user_deleted_idx
on public.agro_farms (user_id, deleted_at);

create index if not exists agro_farms_user_name_idx
on public.agro_farms (user_id, lower(trim(name)))
where deleted_at is null;

create unique index if not exists agro_farms_user_default_uidx
on public.agro_farms (user_id)
where is_default is true and deleted_at is null;

create index if not exists agro_crops_user_farm_idx
on public.agro_crops (user_id, farm_id)
where deleted_at is null;

create or replace function public.agro_farms_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agro_farms_set_updated_at on public.agro_farms;
create trigger agro_farms_set_updated_at
before update on public.agro_farms
for each row
execute function public.agro_farms_set_updated_at();

alter table public.agro_farms enable row level security;

drop policy if exists agro_farms_select_own on public.agro_farms;
create policy agro_farms_select_own
on public.agro_farms
for select
to authenticated
using (((select auth.uid()) = user_id));

drop policy if exists agro_farms_insert_own on public.agro_farms;
create policy agro_farms_insert_own
on public.agro_farms
for insert
to authenticated
with check (((select auth.uid()) = user_id));

drop policy if exists agro_farms_update_own on public.agro_farms;
create policy agro_farms_update_own
on public.agro_farms
for update
to authenticated
using (((select auth.uid()) = user_id))
with check (((select auth.uid()) = user_id));

drop policy if exists agro_farms_delete_own on public.agro_farms;
create policy agro_farms_delete_own
on public.agro_farms
for delete
to authenticated
using (((select auth.uid()) = user_id));

comment on table public.agro_farms is
'Fincas del agricultor como recursos de tierra usados para asociar ciclos de cultivos.';

comment on column public.agro_crops.farm_id is
'Finca a la que pertenece el ciclo de cultivo. Nullable para compatibilidad con cultivos legacy.';

notify pgrst, 'reload schema';

commit;
