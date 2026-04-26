# RLS + Storage Validation - 2026-04-23

Estado: PASS en staging; prueba A/B real cerrada por workflow manual.

## Entorno

| Item | Resultado |
| --- | --- |
| Local Supabase | Bloqueo historico 2026-04-23: Docker Desktop/daemon no disponible |
| Staging Supabase | PASS: workflow `RLS Storage Smoke Test (Staging)` sobre `main` paso en verde |
| Migraciones aplicadas en esta sesion | Ninguna en este cierre documental |
| Script reproducible | `tools/rls-smoke-test.js` |
| Commit | Ver ultimo commit de la rama `codex/2026-04-23-prA-rls-validation` |
| Fecha cierre staging | 2026-04-24 aprox. |
| Workflow run | Pendiente de pegar URL exacta |

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

## Matriz de validacion cerrada

| Recurso | Select own | Select cross-user | Insert wrong user_id | Update cross-user | Delete cross-user | Storage own upload | Storage cross upload | Storage cross read |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agro_pending` + `agro-evidence` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

Nota: en checks negativos, `PASS` significa que el acceso cross-user o la operacion indebida quedo bloqueada/no visible por RLS o policies de Storage.

## Evidencia estatica

- `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` fuerza `agro-evidence` como bucket privado.
- Esa misma migracion crea policies `agro_evidence_select_own`, `insert_own`, `update_own`, `delete_own` con prefijo `(select auth.uid())::text`.
- Esa misma migracion refuerza RLS owner-based para `agro_pending`, `agro_income`, `agro_losses`, `agro_expenses`, `agro_transfers`.
- El frontend normaliza paths de `agro-evidence` en `apps/gold/agro/agro.js` para conservar el prefijo del usuario.

## Evidencia real staging

| Item | Resultado |
| --- | --- |
| Workflow | `RLS Storage Smoke Test (Staging)` |
| Branch | `main` |
| Job | `Run RLS and storage smoke test` |
| Resultado | PASS / verde / `succeeded` |
| Fecha aproximada | 2026-04-24 |
| Duracion aproximada | 18s |
| Workflow run | Pendiente de pegar URL exacta |
| Evidencia adicional | `apps/gold/docs/AGENT_REPORT_ACTIVE.md`, seccion `Sesion 2026-04-24 — Cierre final Supabase staging/RLS/Storage`; confirmacion del usuario en sesion 2026-04-26 |
| Secretos | No impresos ni registrados |

## Resultado original 2026-04-23 (historico)

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| `supabase start --workdir .` | FAIL | Docker Desktop pipe no disponible |
| `supabase db reset --local --no-seed` | NO EJECUTADO | depende de Docker local |
| `supabase db push --dry-run --workdir .` | ABORTADO | quedo en `Initialising login role...` |
| A/B DB real | SUPERADO POR STAGING | Cerrado por workflow manual PASS el 2026-04-24 aprox. |
| A/B Storage real | SUPERADO POR STAGING | Cerrado por workflow manual PASS el 2026-04-24 aprox. |

## Runbook reproducible de validacion real

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

5. Pegar la URL exacta del run o el JSON resultante en esta seccion si se repite la validacion.

## Pendientes no bloqueantes

- Confirmar bucket `avatars` como publico por diseno o migrarlo a policies privadas.
