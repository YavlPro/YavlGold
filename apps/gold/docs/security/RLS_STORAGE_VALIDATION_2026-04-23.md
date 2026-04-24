# RLS + Storage Validation - 2026-04-23

Estado: script reproducible agregado; prueba A/B real no ejecutada por bloqueo de entorno.

## Entorno

| Item | Resultado |
| --- | --- |
| Local Supabase | Bloqueado: Docker Desktop/daemon no disponible |
| Staging Supabase | `project-ref` detectado, pero `supabase db push --dry-run` quedo colgado en inicializacion |
| Migraciones aplicadas en esta sesion | Ninguna |
| Script reproducible | `tools/rls-smoke-test.js` |
| Commit | Completar al cerrar rama |

## Script A/B

El script usa solo `SUPABASE_URL` y `SUPABASE_ANON_KEY` desde entorno. No requiere ni acepta `service_role`.

Variables:

```bash
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_USER_A_EMAIL=...
SUPABASE_USER_A_PASSWORD=...
SUPABASE_USER_B_EMAIL=...
SUPABASE_USER_B_PASSWORD=...
RLS_SMOKE_TABLE=agro_pending
RLS_SMOKE_BUCKET=agro-evidence
node tools/rls-smoke-test.js
```

Alternativa con JWT manuales:

```bash
SUPABASE_USER_A_ACCESS_TOKEN=...
SUPABASE_USER_B_ACCESS_TOKEN=...
node tools/rls-smoke-test.js
```

## Matriz de validacion esperada

| Recurso | Select own | Select cross-user | Insert wrong user_id | Update cross-user | Delete cross-user | Storage own upload | Storage cross upload | Storage cross read |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agro_pending` + `agro-evidence` | TODO ejecutar | TODO ejecutar | TODO ejecutar | TODO ejecutar | TODO ejecutar | TODO ejecutar | TODO ejecutar | TODO ejecutar |

## Evidencia estatica

- `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` fuerza `agro-evidence` como bucket privado.
- Esa misma migracion crea policies `agro_evidence_select_own`, `insert_own`, `update_own`, `delete_own` con prefijo `(select auth.uid())::text`.
- Esa misma migracion refuerza RLS owner-based para `agro_pending`, `agro_income`, `agro_losses`, `agro_expenses`, `agro_transfers`.
- El frontend normaliza paths de `agro-evidence` en `apps/gold/agro/agro.js` para conservar el prefijo del usuario.

## Resultado de esta sesion

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| `supabase start --workdir .` | FAIL | Docker Desktop pipe no disponible |
| `supabase db reset --local --no-seed` | NO EJECUTADO | depende de Docker local |
| `supabase db push --dry-run --workdir .` | ABORTADO | quedo en `Initialising login role...` |
| A/B DB real | NO EJECUTADO | requiere local o staging operativo |
| A/B Storage real | NO EJECUTADO | requiere local o staging operativo |

## Runbook para cerrar validacion real

1. Iniciar Docker Desktop.
2. Ejecutar:

```bash
supabase start --workdir .
supabase db reset --workdir . --local --no-seed
```

3. Crear dos usuarios QA A/B o usar dos usuarios existentes de staging.
4. Ejecutar:

```bash
SUPABASE_URL=<url> \
SUPABASE_ANON_KEY=<anon> \
SUPABASE_USER_A_EMAIL=<qa-a> \
SUPABASE_USER_A_PASSWORD=<password-a> \
SUPABASE_USER_B_EMAIL=<qa-b> \
SUPABASE_USER_B_PASSWORD=<password-b> \
node tools/rls-smoke-test.js
```

5. Pegar el JSON resultante en esta seccion y cambiar la matriz de `TODO ejecutar` a `ok`/`blocked`.

## TODOs pendientes

- Ejecutar A/B real cuando haya DB viva.
- Confirmar bucket `avatars` como publico por diseno o migrarlo a policies privadas.
