create table if not exists public.agro_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null default 'bug',
  mensaje text not null,
  page text,
  version text default 'V9.8',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.agro_feedback enable row level security;

drop policy if exists agro_feedback_select_own on public.agro_feedback;
create policy agro_feedback_select_own
on public.agro_feedback
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists agro_feedback_insert_own on public.agro_feedback;
create policy agro_feedback_insert_own
on public.agro_feedback
for insert
to authenticated
with check (auth.uid() = user_id);

create index if not exists agro_feedback_user_created_idx
on public.agro_feedback (user_id, created_at desc);
