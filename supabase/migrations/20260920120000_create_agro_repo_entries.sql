-- ==========================================================================
-- YavlGold Agro — Fase 4: AgroRepo persistente (tabla agro_repo_entries)
-- Fecha: 2026-09-20
-- Contexto: AgroRepo vivia SOLO en localStorage (agrorepo_mvp_v1). Esta tabla
-- lo convierte en fuente de verdad persistente por usuario (decision A1 del
-- owner); localStorage queda como cache de trabajo offline.
--
-- Decisiones canonicas de la fase:
--   * client_id TEXT (no UUID): los ids locales son 'agrpf_<ts>_<rand>' /
--     'agrpn_<ts>_<rand>' generados por agro-repo-storage.js buildId().
--   * folder_key + deleted_from_parent_id: necesarios para reconstruir los
--     roots de sistema (renames/deletes del usuario) y la ubicacion original
--     de las notas en papelera al hacer pull en otro dispositivo.
--   * SIN trigger de updated_at: la resolucion de conflictos V1 es
--     "ultima escritura gana" por updated_at controlado por el cliente
--     (agro-repo-sync.js). Un trigger now() romperia ese contrato.
--   * Soft-delete con deleted_at (canon §6). El purge fisico de papelera
--     (>30 dias) NO se propaga como DELETE en V1: las filas ya viajan con
--     deleted_at marcado.
-- ==========================================================================

begin;

create table if not exists public.agro_repo_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  parent_client_id text,
  entry_type text not null
    check (entry_type in ('folder', 'note')),
  title text not null default '',
  content text not null default '',
  template text,
  folder_key text,
  crop_id uuid references public.agro_crops(id) on delete set null,
  position integer not null default 0,
  is_system_root boolean not null default false,
  deleted_at timestamptz,
  deleted_from_parent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agro_repo_entries_user_client_key unique (user_id, client_id)
);

comment on table public.agro_repo_entries is
  'AgroRepo/Bitacora: arbol aplanado de carpetas y notas por usuario. Fuente de verdad persistente (Fase 4); localStorage agrorepo_mvp_v1 es cache offline. Sync V1: ultimo-gana por updated_at.';

comment on column public.agro_repo_entries.client_id is
  'Id estable generado por el cliente (agro-repo-storage.js buildId), clave de sincronizacion.';

comment on column public.agro_repo_entries.folder_key is
  'Solo carpetas root de sistema: folderKey canonico (mi-finca, cultivos, ...). Permite derivar renames/borrados de sistema en otros dispositivos.';

comment on column public.agro_repo_entries.position is
  'Orden del nodo entre sus hermanos (indice base 0 dentro de su padre).';

comment on column public.agro_repo_entries.deleted_from_parent_id is
  'Padre previo al soft-delete, para restaurar en la ubicacion original (papelera).';

create index if not exists agro_repo_entries_user_id_idx
  on public.agro_repo_entries (user_id);

create index if not exists agro_repo_entries_parent_idx
  on public.agro_repo_entries (user_id, parent_client_id);

create index if not exists agro_repo_entries_deleted_idx
  on public.agro_repo_entries (user_id, deleted_at);

create index if not exists agro_repo_entries_updated_idx
  on public.agro_repo_entries (user_id, updated_at);

alter table public.agro_repo_entries enable row level security;

drop policy if exists agro_repo_entries_select_own on public.agro_repo_entries;
create policy agro_repo_entries_select_own
  on public.agro_repo_entries
  for select
  to authenticated
  using (((select auth.uid()) = user_id));

drop policy if exists agro_repo_entries_insert_own on public.agro_repo_entries;
create policy agro_repo_entries_insert_own
  on public.agro_repo_entries
  for insert
  to authenticated
  with check (((select auth.uid()) = user_id));

drop policy if exists agro_repo_entries_update_own on public.agro_repo_entries;
create policy agro_repo_entries_update_own
  on public.agro_repo_entries
  for update
  to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

drop policy if exists agro_repo_entries_delete_own on public.agro_repo_entries;
create policy agro_repo_entries_delete_own
  on public.agro_repo_entries
  for delete
  to authenticated
  using (((select auth.uid()) = user_id));

commit;
