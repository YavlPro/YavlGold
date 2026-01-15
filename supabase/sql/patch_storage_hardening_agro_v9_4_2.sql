-- Agro V9.4.2 storage hardening patch
-- Bucket hardening
update storage.buckets set public = false where id = 'agro-evidence';

-- Drop insecure legacy policies (if they exist)
drop policy if exists "Cualquiera puede ver evidencias (si tiene el link)" on storage.objects;
drop policy if exists "Usuarios autenticados pueden subir evidencias" on storage.objects;

-- REFERENCE: Existing income policies (managed via Dashboard)
-- Condition for all 4:
-- bucket_id = 'agro-evidence'
-- and (storage.foldername(name))[1] = auth.uid()::text
-- and name like auth.uid()::text || '/agro/income/%'
-- Policies:
-- "Agro income objects read"   (SELECT)
-- "Agro income objects insert" (INSERT)
-- "Agro income objects update" (UPDATE)
-- "Agro income objects delete" (DELETE)

-- Expense policies (strict per-user + prefix)
create policy "Agro expense objects read"
on storage.objects for select
to authenticated
using (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
        name like auth.uid()::text || '/agro/expense/%'
        or name like auth.uid()::text || '/agro/expenses/%'
    )
);

create policy "Agro expense objects insert"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
        name like auth.uid()::text || '/agro/expense/%'
        or name like auth.uid()::text || '/agro/expenses/%'
    )
);

create policy "Agro expense objects update"
on storage.objects for update
to authenticated
using (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
        name like auth.uid()::text || '/agro/expense/%'
        or name like auth.uid()::text || '/agro/expenses/%'
    )
)
with check (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
        name like auth.uid()::text || '/agro/expense/%'
        or name like auth.uid()::text || '/agro/expenses/%'
    )
);

create policy "Agro expense objects delete"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'agro-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
        name like auth.uid()::text || '/agro/expense/%'
        or name like auth.uid()::text || '/agro/expenses/%'
    )
);

-- Gains/profit prefix not present in agro.js; no policy added.
-- If a gains module is added, replicate these policies with its exact prefix.

-- Checklist A/B (manual verification)
-- A: user A can upload and download via signed URL under /agro/expense and /agro/income.
-- B: user B cannot read/write/delete A's paths (expect 403).
-- Incognito: cannot access /storage/v1/object/public/agro-evidence/...
-- Upload outside /agro/expense or /agro/income should be blocked by policy.
