-- =====================================================
-- YavlGold Agro V1 - security trust hardening baseline
-- Date: 2026-04-20
--
-- Scope:
-- - Make the existing Agro evidence bucket private from migrations, not only
--   from loose SQL snippets.
-- - Recreate storage policies with strict owner-folder checks for all
--   evidence roots currently accepted by agro.js.
-- - Recreate facturero movement owner policies with the Supabase recommended
--   "(select auth.uid())" pattern.
-- - Keep public catalog/profile semantics unchanged.
-- =====================================================

begin;

-- 1) Evidence bucket must never be public. The bucket may already exist in
-- remote projects; this keeps the migration idempotent for local resets.
insert into storage.buckets (id, name, public)
values ('agro-evidence', 'agro-evidence', false)
on conflict (id) do update
set public = false;

-- Remove legacy broad policies and previous dashboard-managed variants.
drop policy if exists "Cualquiera puede ver evidencias (si tiene el link)" on storage.objects;
drop policy if exists "Usuarios autenticados pueden subir evidencias" on storage.objects;
drop policy if exists "Agro income objects read" on storage.objects;
drop policy if exists "Agro income objects insert" on storage.objects;
drop policy if exists "Agro income objects update" on storage.objects;
drop policy if exists "Agro income objects delete" on storage.objects;
drop policy if exists "Agro expense objects read" on storage.objects;
drop policy if exists "Agro expense objects insert" on storage.objects;
drop policy if exists "Agro expense objects update" on storage.objects;
drop policy if exists "Agro expense objects delete" on storage.objects;
drop policy if exists "agro_evidence_select_own" on storage.objects;
drop policy if exists "agro_evidence_insert_own" on storage.objects;
drop policy if exists "agro_evidence_update_own" on storage.objects;
drop policy if exists "agro_evidence_delete_own" on storage.objects;

create policy "agro_evidence_select_own"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
        name like (select auth.uid())::text || '/agro/income/%'
        or name like (select auth.uid())::text || '/agro/expense/%'
        or name like (select auth.uid())::text || '/agro/expenses/%'
        or name like (select auth.uid())::text || '/agro/pending/%'
        or name like (select auth.uid())::text || '/agro/loss/%'
        or name like (select auth.uid())::text || '/agro/losses/%'
        or name like (select auth.uid())::text || '/agro/transfer/%'
        or name like (select auth.uid())::text || '/agro/transfers/%'
    )
);

create policy "agro_evidence_insert_own"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
        name like (select auth.uid())::text || '/agro/income/%'
        or name like (select auth.uid())::text || '/agro/expense/%'
        or name like (select auth.uid())::text || '/agro/expenses/%'
        or name like (select auth.uid())::text || '/agro/pending/%'
        or name like (select auth.uid())::text || '/agro/loss/%'
        or name like (select auth.uid())::text || '/agro/losses/%'
        or name like (select auth.uid())::text || '/agro/transfer/%'
        or name like (select auth.uid())::text || '/agro/transfers/%'
    )
);

create policy "agro_evidence_update_own"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
        name like (select auth.uid())::text || '/agro/income/%'
        or name like (select auth.uid())::text || '/agro/expense/%'
        or name like (select auth.uid())::text || '/agro/expenses/%'
        or name like (select auth.uid())::text || '/agro/pending/%'
        or name like (select auth.uid())::text || '/agro/loss/%'
        or name like (select auth.uid())::text || '/agro/losses/%'
        or name like (select auth.uid())::text || '/agro/transfer/%'
        or name like (select auth.uid())::text || '/agro/transfers/%'
    )
)
with check (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
        name like (select auth.uid())::text || '/agro/income/%'
        or name like (select auth.uid())::text || '/agro/expense/%'
        or name like (select auth.uid())::text || '/agro/expenses/%'
        or name like (select auth.uid())::text || '/agro/pending/%'
        or name like (select auth.uid())::text || '/agro/loss/%'
        or name like (select auth.uid())::text || '/agro/losses/%'
        or name like (select auth.uid())::text || '/agro/transfer/%'
        or name like (select auth.uid())::text || '/agro/transfers/%'
    )
);

create policy "agro_evidence_delete_own"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
        name like (select auth.uid())::text || '/agro/income/%'
        or name like (select auth.uid())::text || '/agro/expense/%'
        or name like (select auth.uid())::text || '/agro/expenses/%'
        or name like (select auth.uid())::text || '/agro/pending/%'
        or name like (select auth.uid())::text || '/agro/loss/%'
        or name like (select auth.uid())::text || '/agro/losses/%'
        or name like (select auth.uid())::text || '/agro/transfer/%'
        or name like (select auth.uid())::text || '/agro/transfers/%'
    )
);

-- 2) Explicit owner policies for canonical facturero tables. Earlier repair
-- migrations create these dynamically; this migration makes the security
-- surface easier to audit and keeps the policy predicate performant.
do $$
declare
    v_table text;
begin
    foreach v_table in array array[
        'agro_pending',
        'agro_income',
        'agro_losses',
        'agro_expenses',
        'agro_transfers'
    ]
    loop
        execute format('alter table public.%I enable row level security', v_table);
        execute format('create index if not exists %I on public.%I (user_id)', v_table || '_user_id_rls_idx', v_table);

        execute format('drop policy if exists %I on public.%I', 'security_select_own', v_table);
        execute format(
            'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
            'security_select_own',
            v_table
        );

        execute format('drop policy if exists %I on public.%I', 'security_insert_own', v_table);
        execute format(
            'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
            'security_insert_own',
            v_table
        );

        execute format('drop policy if exists %I on public.%I', 'security_update_own', v_table);
        execute format(
            'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
            'security_update_own',
            v_table
        );

        execute format('drop policy if exists %I on public.%I', 'security_delete_own', v_table);
        execute format(
            'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
            'security_delete_own',
            v_table
        );
    end loop;
end $$;

notify pgrst, 'reload schema';

commit;
