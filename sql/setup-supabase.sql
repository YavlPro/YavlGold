-- SQL setup for YavlGold Supabase
-- Run these statements in Supabase SQL editor (do NOT paste JS or shell commands here).

-- 1) Create table `profiles` if it does not exist
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2) Enable Row Level Security and create basic policies
alter table public.profiles enable row level security;

create policy if not exists "Profiles - select own" on public.profiles
  for select using ( auth.uid() = id );

create policy if not exists "Profiles - insert own" on public.profiles
  for insert with check ( auth.uid() = id );

create policy if not exists "Profiles - update own" on public.profiles
  for update using ( auth.uid() = id ) with check ( auth.uid() = id );

-- 3) Function + Trigger: ensure a profile row exists after a user is created
create or replace function public.ensure_profile_exists()
returns trigger as $$
begin
  if not exists (select 1 from public.profiles where id = new.id) then
    insert into public.profiles (id, email, created_at)
    values (new.id, new.email, now());
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger that fires after a new auth user is inserted
-- Note: executing this on auth.users usually works from the SQL editor in the Supabase project
create trigger if not exists ensure_profile_after_signup
  after insert on auth.users
  for each row
  execute procedure public.ensure_profile_exists();
