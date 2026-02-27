begin;

create extension if not exists pgcrypto;

alter table if exists public.agro_buyers
  add column if not exists linked_user_id uuid;

create index if not exists agro_buyers_user_linked_idx
  on public.agro_buyers (user_id, linked_user_id);

create table if not exists public.agro_social_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  buyer_group_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agro_social_threads_user_id_idx
  on public.agro_social_threads (user_id);

create index if not exists agro_social_threads_buyer_group_key_idx
  on public.agro_social_threads (buyer_group_key);

create table if not exists public.agro_social_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.agro_social_threads(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'farmer' check (role in ('farmer', 'note')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists agro_social_messages_thread_id_idx
  on public.agro_social_messages (thread_id);

create index if not exists agro_social_messages_user_id_idx
  on public.agro_social_messages (user_id);

alter table public.agro_social_threads enable row level security;
alter table public.agro_social_messages enable row level security;

-- Threads RLS (owner-only)
drop policy if exists agro_social_threads_select_own on public.agro_social_threads;
create policy agro_social_threads_select_own
on public.agro_social_threads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists agro_social_threads_insert_own on public.agro_social_threads;
create policy agro_social_threads_insert_own
on public.agro_social_threads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists agro_social_threads_update_own on public.agro_social_threads;
create policy agro_social_threads_update_own
on public.agro_social_threads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists agro_social_threads_delete_own on public.agro_social_threads;
create policy agro_social_threads_delete_own
on public.agro_social_threads
for delete
to authenticated
using (auth.uid() = user_id);

-- Messages RLS (owner-only)
drop policy if exists agro_social_messages_select_own on public.agro_social_messages;
create policy agro_social_messages_select_own
on public.agro_social_messages
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists agro_social_messages_insert_own on public.agro_social_messages;
create policy agro_social_messages_insert_own
on public.agro_social_messages
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists agro_social_messages_update_own on public.agro_social_messages;
create policy agro_social_messages_update_own
on public.agro_social_messages
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists agro_social_messages_delete_own on public.agro_social_messages;
create policy agro_social_messages_delete_own
on public.agro_social_messages
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

commit;
