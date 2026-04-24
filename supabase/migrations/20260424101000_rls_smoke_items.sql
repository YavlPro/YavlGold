-- =====================================================
-- YavlGold RLS smoke-test table
-- Date: 2026-04-24
--
-- Scope:
-- - Add an isolated table for A/B RLS validation.
-- - Keep it unused by the application and safe for staging verification.
-- - Apply only after the staging guard confirms a staging/dev project.
-- =====================================================

begin;

create table if not exists public.rls_smoke_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid(),
    label text not null,
    created_at timestamptz not null default now(),
    constraint rls_smoke_items_label_check
        check (left(label, 11) = '[RLS_SMOKE]')
);

comment on table public.rls_smoke_items is
    'Isolated table for owner-based Supabase RLS smoke tests. Not used by the app.';

create index if not exists rls_smoke_items_user_id_idx
    on public.rls_smoke_items (user_id);

create index if not exists rls_smoke_items_created_at_idx
    on public.rls_smoke_items (created_at desc);

alter table public.rls_smoke_items enable row level security;

grant select, insert, update, delete on public.rls_smoke_items to authenticated;

drop policy if exists rls_smoke_items_select_own on public.rls_smoke_items;
create policy rls_smoke_items_select_own
on public.rls_smoke_items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists rls_smoke_items_insert_own on public.rls_smoke_items;
create policy rls_smoke_items_insert_own
on public.rls_smoke_items
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
    and left(label, 11) = '[RLS_SMOKE]'
);

drop policy if exists rls_smoke_items_update_own on public.rls_smoke_items;
create policy rls_smoke_items_update_own
on public.rls_smoke_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
    (select auth.uid()) = user_id
    and left(label, 11) = '[RLS_SMOKE]'
);

drop policy if exists rls_smoke_items_delete_own on public.rls_smoke_items;
create policy rls_smoke_items_delete_own
on public.rls_smoke_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

commit;
