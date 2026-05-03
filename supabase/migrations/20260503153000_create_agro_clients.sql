begin;

create extension if not exists pgcrypto;

create table if not exists public.agro_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_type text not null default 'external',
  linked_profile_id uuid null references auth.users(id) on delete set null,
  display_name text not null,
  phone text null,
  whatsapp text null,
  email text null,
  location text null,
  notes text null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint agro_clients_type_check
    check (client_type in ('registered', 'external')),
  constraint agro_clients_display_name_check
    check (char_length(trim(display_name)) > 0)
);

create index if not exists agro_clients_user_type_idx
  on public.agro_clients (user_id, client_type)
  where deleted_at is null;

create index if not exists agro_clients_user_name_idx
  on public.agro_clients (user_id, display_name)
  where deleted_at is null;

create index if not exists agro_clients_user_deleted_idx
  on public.agro_clients (user_id, deleted_at);

create unique index if not exists agro_clients_user_display_name_uidx
  on public.agro_clients (user_id, lower(trim(display_name)))
  where deleted_at is null;

create or replace function public.agro_clients_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agro_clients_set_updated_at on public.agro_clients;
create trigger agro_clients_set_updated_at
before update on public.agro_clients
for each row
execute function public.agro_clients_set_updated_at();

alter table public.agro_clients enable row level security;

drop policy if exists agro_clients_select_own on public.agro_clients;
create policy agro_clients_select_own
on public.agro_clients
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists agro_clients_insert_own on public.agro_clients;
create policy agro_clients_insert_own
on public.agro_clients
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists agro_clients_update_own on public.agro_clients;
create policy agro_clients_update_own
on public.agro_clients
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists agro_clients_delete_own on public.agro_clients;
create policy agro_clients_delete_own
on public.agro_clients
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

commit;
