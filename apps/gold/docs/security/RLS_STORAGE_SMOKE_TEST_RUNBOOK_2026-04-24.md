# RLS + Storage Smoke Test Runbook — 2026-04-24

Estado: listo para ejecutar cuando exista STAGING confirmado.

Este runbook no requiere Docker. Protege contra `supabase db push` accidental a produccion mediante `tools/supabase-staging-guard.mjs`.

## Variables requeridas

No commitear valores reales.

```text
SUPABASE_PROJECT_REF_STAGING=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_USER_A_EMAIL=
SUPABASE_USER_A_PASSWORD=
SUPABASE_USER_B_EMAIL=
SUPABASE_USER_B_PASSWORD=
```

Opcionales:

```text
RLS_SMOKE_TABLE=rls_smoke_items
RLS_SMOKE_BUCKET=agro-evidence
RLS_SMOKE_RUN_ID=
```

## Preflight de staging

El nombre visible del proyecto debe contener `staging` o `dev`.

```bash
supabase login
supabase projects list
```

Si solo aparece `YavlGold` / `gerzlzprkarikblqxpjt`, detenerse. No se confirma staging.

## PowerShell

```powershell
$env:SUPABASE_PROJECT_REF_STAGING = "<staging-project-ref>"
pnpm guard:staging
pnpm rls:staging:dryrun
```

Si el dry-run muestra solo migraciones esperadas:

```powershell
pnpm rls:staging:apply
```

Configurar variables del smoke test:

```powershell
$env:SUPABASE_URL = "https://<staging-project-ref>.supabase.co"
$env:SUPABASE_ANON_KEY = "<staging-anon-key>"
$env:SUPABASE_USER_A_EMAIL = "<qa-user-a-email>"
$env:SUPABASE_USER_A_PASSWORD = "<qa-user-a-password>"
$env:SUPABASE_USER_B_EMAIL = "<qa-user-b-email>"
$env:SUPABASE_USER_B_PASSWORD = "<qa-user-b-password>"
$env:RLS_SMOKE_TABLE = "rls_smoke_items"
$env:RLS_SMOKE_BUCKET = "agro-evidence"
node tools/rls-smoke-test.js
```

Cleanup best-effort:

```powershell
node tools/rls-smoke-test.js --cleanup-only
```

## Bash

```bash
export SUPABASE_PROJECT_REF_STAGING="<staging-project-ref>"
pnpm guard:staging
pnpm rls:staging:dryrun
```

Si el dry-run muestra solo migraciones esperadas:

```bash
pnpm rls:staging:apply
```

Configurar variables del smoke test:

```bash
export SUPABASE_URL="https://<staging-project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<staging-anon-key>"
export SUPABASE_USER_A_EMAIL="<qa-user-a-email>"
export SUPABASE_USER_A_PASSWORD="<qa-user-a-password>"
export SUPABASE_USER_B_EMAIL="<qa-user-b-email>"
export SUPABASE_USER_B_PASSWORD="<qa-user-b-password>"
export RLS_SMOKE_TABLE="rls_smoke_items"
export RLS_SMOKE_BUCKET="agro-evidence"
node tools/rls-smoke-test.js
```

Cleanup best-effort:

```bash
node tools/rls-smoke-test.js --cleanup-only
```

## Interpretacion de exit codes

| Exit code | Estado | Lectura |
| --- | --- | --- |
| `0` | PASS / CLEANUP_OK | Validacion completa o cleanup exitoso. |
| `2` | FAIL | Fallo de seguridad: usuario A logro operar sobre datos/carpeta de usuario B, o un usuario no pudo operar sobre su propio recurso esperado. |
| `3` | BLOQUEADO | Falta env/config, login QA falla, tabla/bucket no existe, o falta aplicar migraciones en staging confirmado. |

## Resultado JSON esperado

El script imprime JSON sin secrets. Campos relevantes:

```json
{
  "ok": true,
  "status": "PASS",
  "project_host": "<host-only>",
  "table": "rls_smoke_items",
  "bucket": "agro-evidence",
  "results": {
    "db_select_cross_user": { "status": "PASS" },
    "db_update_cross_user": { "status": "PASS" },
    "db_delete_cross_user": { "status": "PASS" },
    "db_insert_wrong_user_id": { "status": "PASS" },
    "storage_read_own": { "status": "PASS" },
    "storage_upload_other_folder": { "status": "PASS" },
    "storage_read_other_folder": { "status": "PASS" }
  }
}
```

## GitHub Actions manual

Workflow: `.github/workflows/rls-smoke-staging.yml`.

Configurar estos GitHub Actions secrets en el repo, con valores de staging:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_USER_A_EMAIL
SUPABASE_USER_A_PASSWORD
SUPABASE_USER_B_EMAIL
SUPABASE_USER_B_PASSWORD
```

El workflow no aplica migraciones. Solo ejecuta build y smoke test contra un staging ya preparado.

## Migracion esperada

La migracion `supabase/migrations/20260424101000_rls_smoke_items.sql` crea `public.rls_smoke_items`, tabla aislada para validar RLS owner-based.

No se aplica hoy a remoto porque no hay staging confirmado.

## Checklist para cerrar PASS

1. Crear o renombrar un proyecto Supabase cuyo nombre contenga `staging` o `dev`.
2. Confirmarlo con `supabase projects list`.
3. Setear `SUPABASE_PROJECT_REF_STAGING`.
4. Ejecutar `pnpm rls:staging:dryrun`.
5. Revisar que el dry-run solo incluya migraciones esperadas.
6. Ejecutar `pnpm rls:staging:apply`.
7. Crear dos usuarios QA existentes en Auth del staging.
8. Setear variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y credenciales QA A/B localmente o como GitHub Actions secrets.
9. Ejecutar `node tools/rls-smoke-test.js`.
10. Registrar el JSON final en la evidencia de seguridad sin secrets.

## TODOs minimos

- Crear o identificar STAGING real con nombre visible `staging` o `dev`.
- Cargar secrets de staging en GitHub Actions.
- Crear usuarios QA A/B en Auth de staging.
- Ejecutar dry-run, apply y smoke test siguiendo este runbook.
