# Post-Merge RLS + Storage Verification — 2026-04-23

Estado: BLOQUEADO / FAIL operativo para prueba A/B real.

> No se afirma verificacion real de RLS/Storage. La prueba A/B no pudo ejecutarse contra DB viva por falta de Docker local y por ausencia de variables/usuarios QA configurados para el smoke test.

## Entorno

| Item | Resultado |
| --- | --- |
| Supabase CLI | `2.72.7` |
| Proyecto enlazado | `gerzlzprkarikblqxpjt` (`YavlGold`) |
| Docker daemon | FAIL: pipe `dockerDesktopLinuxEngine` no disponible |
| `.env` local | No existe |
| `testqacredentials.md` | Existe, pero no contiene `SUPABASE_URL`, `SUPABASE_ANON_KEY` ni usuarios A/B con los nombres requeridos por el script |

## Intentos ejecutados

```bash
docker info --format '{{.ServerVersion}}'
supabase --version
supabase projects list
supabase start --workdir .
supabase db push --dry-run --workdir .
node tools/rls-smoke-test.js
```

Resultados:

| Prueba | Resultado |
| --- | --- |
| `docker info` | FAIL: no conecta a Docker Desktop daemon |
| `supabase start --workdir .` | FAIL: Docker Desktop requerido |
| `supabase db push --dry-run --workdir .` | BLOQUEADO: timeout en 45s; proceso detenido |
| `node tools/rls-smoke-test.js` | FAIL esperado: faltan `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

## Cobertura esperada del script

Archivo: `tools/rls-smoke-test.js`.

Tabla por defecto:

- `agro_pending`

Bucket por defecto:

- `agro-evidence`

Casos cubiertos cuando hay entorno:

| Caso | Resultado actual |
| --- | --- |
| Insert own row usuario A/B | NO EJECUTADO |
| Select own row | NO EJECUTADO |
| Select cross-user | NO EJECUTADO |
| Update cross-user | NO EJECUTADO |
| Delete cross-user | NO EJECUTADO |
| Insert con `user_id` ajeno | NO EJECUTADO |
| Storage upload en prefijo propio | NO EJECUTADO |
| Storage upload en prefijo de otro usuario | NO EJECUTADO |
| Storage download de objeto ajeno | NO EJECUTADO |

## Razon del FAIL/BLOQUEADO

- Local no disponible: Docker Desktop/daemon no esta corriendo.
- Staging no identificado de forma segura: el CLI lista un proyecto enlazado `YavlGold`, pero no se confirma que sea staging. No se ejecuto `supabase db push` real contra un proyecto potencialmente productivo.
- No hay `SUPABASE_URL`, `SUPABASE_ANON_KEY` ni credenciales QA A/B disponibles en env local con los nombres requeridos por el script.

## Runbook exacto para cerrar PASS

### Opcion local

```bash
supabase start --workdir .
supabase db reset --workdir . --local --no-seed
SUPABASE_URL=<local_url> SUPABASE_ANON_KEY=<local_anon> SUPABASE_USER_A_EMAIL=<qa-a> SUPABASE_USER_A_PASSWORD=<pwd-a> SUPABASE_USER_B_EMAIL=<qa-b> SUPABASE_USER_B_PASSWORD=<pwd-b> node tools/rls-smoke-test.js
```

### Opcion staging

```bash
supabase login
supabase link --project-ref <PROJECT_REF_STAGING>
supabase db push
SUPABASE_URL=<staging_url> SUPABASE_ANON_KEY=<staging_anon> SUPABASE_USER_A_EMAIL=<qa-a> SUPABASE_USER_A_PASSWORD=<pwd-a> SUPABASE_USER_B_EMAIL=<qa-b> SUPABASE_USER_B_PASSWORD=<pwd-b> node tools/rls-smoke-test.js
```

El resultado aceptable debe ser JSON `ok: true` con:

- `db_select_cross_user: blocked`
- `db_update_cross_user: blocked`
- `db_delete_cross_user: blocked`
- `db_insert_wrong_user_id: blocked`
- `storage_upload_cross_prefix: blocked`
- `storage_read_cross_prefix: blocked`

## TODO externo

- Confirmar project-ref de staging o autorizar explicitamente el proyecto enlazado para pruebas.
- Proveer variables QA A/B o iniciar Docker Desktop local.
