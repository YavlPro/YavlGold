-- Agro profiles: buyers + farmer profile (owner-only RLS)
begin;

create extension if not exists pgcrypto;

create table if not exists public.agro_buyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  display_name text not null,
  group_key text not null,
  phone text,
  whatsapp text,
  instagram text,
  facebook text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agro_buyers_user_group_key_uidx
  on public.agro_buyers (user_id, group_key);

create index if not exists agro_buyers_user_id_idx
  on public.agro_buyers (user_id);

create table if not exists public.agro_farmer_profile (
  user_id uuid primary key,
  display_name text,
  farm_name text,
  location_text text,
  phone text,
  whatsapp text,
  instagram text,
  facebook text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agro_buyers enable row level security;
alter table public.agro_farmer_profile enable row level security;

-- agro_buyers policies (owner-only)
drop policy if exists agro_buyers_select_own on public.agro_buyers;
create policy agro_buyers_select_own on public.agro_buyers
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists agro_buyers_insert_own on public.agro_buyers;
create policy agro_buyers_insert_own on public.agro_buyers
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists agro_buyers_update_own on public.agro_buyers;
create policy agro_buyers_update_own on public.agro_buyers
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists agro_buyers_delete_own on public.agro_buyers;
create policy agro_buyers_delete_own on public.agro_buyers
for delete to authenticated
using (auth.uid() = user_id);

-- agro_farmer_profile policies (owner-only)
drop policy if exists agro_farmer_profile_select_own on public.agro_farmer_profile;
create policy agro_farmer_profile_select_own on public.agro_farmer_profile
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists agro_farmer_profile_insert_own on public.agro_farmer_profile;
create policy agro_farmer_profile_insert_own on public.agro_farmer_profile
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists agro_farmer_profile_update_own on public.agro_farmer_profile;
create policy agro_farmer_profile_update_own on public.agro_farmer_profile
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists agro_farmer_profile_delete_own on public.agro_farmer_profile;
create policy agro_farmer_profile_delete_own on public.agro_farmer_profile
for delete to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

commit;
