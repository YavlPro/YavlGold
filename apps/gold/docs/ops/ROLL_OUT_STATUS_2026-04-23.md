# Rollout Status - 2026-04-23

Estado: operativo / validacion real bloqueada por entorno local.

## Alcance

Rollout end-to-end solicitado para seguridad Supabase, trust pages, Node 20 y health/status.

## Inspeccion rapida

| Item | Resultado |
| --- | --- |
| Rama inicial | `main` limpio contra `origin/main` al inicio de la inspeccion |
| Remote | `https://github.com/YavlPro/YavlGold.git` |
| Supabase canonico | `supabase/` en raiz |
| API | `api/health.js` |
| Vercel | `vercel.json` con rewrite `/health` -> `/api/health` |
| Node declarado | `package.json` y `apps/gold/package.json` ya exigen `node: 20.x` |
| Supabase CLI | `2.72.7` |
| Docker CLI | instalado, pero daemon Docker Desktop no disponible |
| Supabase project ref local | `gerzlzprkarikblqxpjt` detectado en `supabase/.temp/project-ref` |

## Estado Docker / Supabase local

`supabase start --workdir .` no pudo iniciar porque Docker Desktop/daemon no esta disponible:

```text
failed to inspect service: dockerDesktopLinuxEngine pipe not found
```

`docker info` tambien falla con el mismo problema de daemon. Por tanto no se ejecuto `supabase db reset --local --no-seed`.

## Estado staging / remoto

Existe un `project-ref` local, pero `supabase db push --dry-run --workdir .` quedo detenido en `Initialising login role...` y se aborto manualmente para evitar una sesion colgada. No se aplicaron migraciones remotas desde esta sesion.

TODO externo: reintentar staging con sesion Supabase CLI autenticada y red estable.

## Inventario SQL requerido

No se pudo consultar `pg_class`, `pg_policies`, `role_table_grants` ni `storage.buckets` contra una DB viva en esta sesion. La evidencia disponible es estatica por migraciones.

### Tablas owner-scoped detectadas en migraciones

| Recurso | Evidencia estatica | Estado esperado |
| --- | --- | --- |
| `profiles` | `001_setup_profiles_trigger.sql` | RLS activo; lectura publica de perfil basico legacy |
| `agro_feedback` | `20260223183000_agro_feedback.sql` | RLS owner-based select/insert |
| `agro_buyers`, `agro_farmer_profile` | `20260227000500_agro_profiles.sql` | RLS owner-based |
| `agro_public_profiles` | `20260227163000_agro_public_profiles.sql` | RLS activo; lectura publica solo cuando `public_enabled = true` |
| `agro_social_threads`, `agro_social_messages` | `20260227192000_agro_social_v1.sql` | RLS owner-based |
| `agro_pending`, `agro_income`, `agro_losses`, `agro_expenses`, `agro_transfers` | `20260327001000_agro_facturero_base_order_repair.sql` + `20260420120000_security_trust_hardening_v1.sql` | RLS owner-based reforzado |
| `agro_task_cycles` | `20260404120000_agro_task_cycles_v1.sql` | RLS owner-based |
| `agro_period_cycles` | `20260411130000_create_agro_period_cycles.sql` | RLS owner-based |
| `agro_operational_cycles`, `agro_operational_movements` | `20260416190000_consolidate_legacy_app_supabase_objects.sql` | RLS owner-based |
| `agro_crops`, `agro_roi_calculations` | `20260417104335_agro_crops_roi_baseline.sql` | RLS owner-based |

### Storage

| Bucket | Evidencia estatica | Estado esperado |
| --- | --- | --- |
| `agro-evidence` | `20260420120000_security_trust_hardening_v1.sql` inserta/actualiza `storage.buckets.public = false` | Private |
| `avatars` | Uso en `apps/gold/assets/js/profile/profileManager.js`; auditoria previa lo marca pendiente de decision UX | TODO externo: confirmar si publico por diseno o migrar a signed URLs |

## Queries para ejecutar en DB viva

```sql
select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind='r' and n.nspname='public'
order by 1,2;
```

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname in ('public','storage')
order by tablename, policyname;
```

```sql
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where grantee in ('anon','authenticated')
order by table_schema, table_name;
```

```sql
select id, name, public
from storage.buckets
order by id;
```

## Secret scan

Escaneo redaccionado ejecutado sobre el repo excluyendo `node_modules`, `dist` y `.git`.

Resultado:

- No se imprimieron secretos.
- Coincidencias esperadas: nombres de variables `VITE_SUPABASE_ANON_KEY` en `.env*`, ejemplos y cliente frontend; referencias documentales a `service_role`; grants SQL a rol `service_role`.
- No se detecto `SUPABASE_SERVICE_ROLE_KEY` activo en frontend ni bundle en esta inspeccion.

## TODOs pendientes por decision externa

- Confirmar si el bucket `avatars` debe seguir publico o migrarse a signed URLs.
- Reintentar validacion A/B real con Docker Desktop activo o staging autenticado.
- Confirmar si GitHub private vulnerability reporting esta habilitado en `YavlPro/YavlGold`.
