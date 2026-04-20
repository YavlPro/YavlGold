# Auditoria Supabase Security - 2026-04-20

Estado: operativo / por verificar contra produccion.

## Alcance

PR logico: `PR1-security-supabase-hardening`.

Este diagnostico cubre el arbol canonico `supabase/` en la raiz del repo. No se inspeccionaron datos remotos ni secretos locales. No se imprimieron llaves reales.

## Hallazgos

| Area | Evidencia local | Riesgo | Accion |
| --- | --- | --- | --- |
| Supabase canonico | `supabase/` raiz contiene `config.toml`, migraciones y Edge Function `agro-assistant` | Bajo si se mantiene unico canon | Mantener operaciones Supabase solo desde raiz |
| Service role | No hay `SUPABASE_SERVICE_ROLE_KEY` activo en frontend; solo placeholder comentado en `.env.example` | Exposicion total si se agrega al cliente | Mantener service role solo server/edge |
| Edge Function | `supabase/config.toml` tenia `verify_jwt = false`; la funcion valida usuario manualmente | Invocacion llega a runtime antes de auth | Cambiado a `verify_jwt = true` |
| Storage Agro | Hardening de `agro-evidence` existia en `supabase/sql/`, no en migraciones | Reset limpio podia no aplicar policies de storage | Migracion `20260420120000_security_trust_hardening_v1.sql` |
| RLS facturero | Policies owner-based existen por migracion dinamica | Auditoria estatica dificil; posible drift remoto | Migracion explicita owner-based con `(select auth.uid())` |
| `agro_events` | La Edge Function referencia `agro_events`, pero no aparece una migracion raiz que cree esa tabla | Log de eventos IA puede fallar o depender de objeto remoto legacy | Pendiente confirmar contrato antes de crear tabla |
| `avatars` bucket | `profileManager.js` sube a bucket `avatars` y usa URL publica | Avatar publico puede ser esperado; no tratar como privado sin decision UX | Pendiente documentar bucket y policies remotas |

## Inventario local de tablas creadas por migraciones

Tablas detectadas con datos de usuario o producto:

- `profiles`: RLS activo; select publico intencional por perfil basico legacy.
- `agro_crops`: RLS owner-based.
- `agro_pending`, `agro_income`, `agro_losses`, `agro_expenses`, `agro_transfers`: RLS owner-based reforzado en migracion 2026-04-20.
- `agro_buyers`, `agro_farmer_profile`, `agro_public_profiles`: RLS activo; `agro_public_profiles` permite lectura publica solo cuando `public_enabled = true`.
- `agro_social_threads`, `agro_social_messages`: RLS owner-based.
- `agro_task_cycles`, `agro_period_cycles`, `agro_operational_cycles`, `agro_operational_movements`: RLS owner-based.
- `agro_roi_calculations`: RLS owner-based.
- `announcements`: lectura publica/autenticada de anuncios activos; gestion por admins.
- `notifications`, `feedback`, `user_favorites`, `user_onboarding_context`, `app_admins`: RLS activo.

## Consultas SQL de verificacion

```sql
-- Tablas public y estado RLS.
select n.nspname as schema,
       c.relname as table,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
order by 1, 2;
```

```sql
-- Policies activas por tabla.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

```sql
-- Grants a roles expuestos por API.
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;
```

```sql
-- Buckets Storage y visibilidad.
select id, name, public
from storage.buckets
order by id;
```

## Pruebas manuales obligatorias

| Caso | Resultado esperado |
| --- | --- |
| Usuario A consulta una tabla owner-based filtrando por `user_id` de B | 0 filas o denied |
| Usuario A actualiza/elimina fila de B | 0 filas afectadas o denied |
| `anon` consulta datos privados | denied |
| Usuario A sube a `agro-evidence/<B>/agro/income/...` | denied |
| Usuario A lee objeto de B en `agro-evidence` | denied |
| URL publica directa `/storage/v1/object/public/agro-evidence/...` | no expone objeto |
| Frontend/bundle contiene `service_role` real | nunca |

## Pendientes de confirmacion

- `SECURITY_EMAIL`.
- Bucket `avatars`: decidir si sera publico por diseno o privado con signed URLs.
- Existencia canonica de `agro_events` en produccion.
- Si se requiere MFA/AAL2 para admins o acciones sensibles.
