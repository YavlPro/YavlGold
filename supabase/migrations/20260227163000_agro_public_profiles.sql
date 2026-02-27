begin;

create table if not exists public.agro_public_profiles (
  user_id uuid primary key,
  public_enabled boolean not null default false,
  display_name text,
  avatar_url text,
  bio text,
  location_text text,
  whatsapp text,
  instagram text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agro_public_profiles_public_enabled_idx
  on public.agro_public_profiles (public_enabled)
  where public_enabled = true;

alter table public.agro_public_profiles enable row level security;

-- Read: owner OR explicitly public
drop policy if exists agro_public_profiles_select_public_or_owner on public.agro_public_profiles;
create policy agro_public_profiles_select_public_or_owner
on public.agro_public_profiles
for select
to authenticated
using (public_enabled = true or auth.uid() = user_id);

-- Insert: owner-only
drop policy if exists agro_public_profiles_insert_own on public.agro_public_profiles;
create policy agro_public_profiles_insert_own
on public.agro_public_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

-- Update: owner-only
drop policy if exists agro_public_profiles_update_own on public.agro_public_profiles;
create policy agro_public_profiles_update_own
on public.agro_public_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Delete: owner-only
drop policy if exists agro_public_profiles_delete_own on public.agro_public_profiles;
create policy agro_public_profiles_delete_own
on public.agro_public_profiles
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

commit;
