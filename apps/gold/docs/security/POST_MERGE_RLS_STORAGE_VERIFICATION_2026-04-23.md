# Post-Merge RLS + Storage Verification — 2026-04-23

Estado: BLOQUEADO para DB RLS y BLOQUEADO para Storage.

> No se afirma verificacion real de RLS/Storage. La prueba A/B no pudo ejecutarse contra DB viva por falta de Docker local y por ausencia de variables/usuarios QA configurados para el smoke test.
>
> Actualizacion 2026-04-24: tampoco se aplicaron migraciones ni se ejecuto `supabase db push --dry-run` remoto porque `supabase projects list` no mostro un proyecto cuyo nombre confirme staging/dev.
>
> Automatizacion preparada: ver `apps/gold/docs/security/RLS_STORAGE_SMOKE_TEST_RUNBOOK_2026-04-24.md` y `apps/gold/docs/ops/STAGING_GUARDRAILS_AND_SETUP.md`.

## Actualizacion 2026-04-24 - verificacion remota staging

| Item | Resultado |
| --- | --- |
| Fecha/hora local | `2026-04-24 09:54:22 -04:00` |
| HEAD verificado | `0972003` (`Merge pull request #86 from YavlPro/codex/2026-04-23-post-merge-verification`) |
| Supabase CLI | `2.72.7` |
| Project ref usado para `link`/`db push` | Ninguno. No se confirmo staging. |
| Proyecto listado/enlazado | `YavlGold` / `gerzlzprkarikblqxpjt` |
| Metodo de confirmacion de staging | `supabase projects list`; criterio obligatorio: nombre del proyecto debe indicar claramente `staging` o `dev`. |
| Resultado de confirmacion | BLOQUEADO: solo aparece `YavlGold`, sin indicador staging/dev. |
| `supabase db push --dry-run` | NO EJECUTADO: bloqueado por falta de staging confirmado. |
| `supabase db push` | NO EJECUTADO: prohibido aplicar migraciones sin staging confirmado. |
| Smoke test A/B | BLOQUEADO: `node tools/rls-smoke-test.js` falla antes de autenticar por ausencia de `SUPABASE_URL` y `SUPABASE_ANON_KEY`. |

### Comandos ejecutados el 2026-04-24

```bash
git checkout main
git pull --ff-only
supabase --version
supabase login
supabase projects list
node tools/rls-smoke-test.js
```

### Resumen seguro de `supabase projects list`

No se pega la salida completa. Resultado relevante:

| Nombre | Ref | Lectura operativa |
| --- | --- | --- |
| `YavlGold` | `gerzlzprkarikblqxpjt` | No confirma staging/dev; tratado como no apto para `db push`. |

### Resultado A/B 2026-04-24

| Superficie | Caso | Resultado |
| --- | --- | --- |
| DB RLS | A no puede leer filas de B | BLOQUEADO / NO EJECUTADO |
| DB RLS | A no puede update de B | BLOQUEADO / NO EJECUTADO |
| DB RLS | A no puede delete de B | BLOQUEADO / NO EJECUTADO |
| DB RLS | A no puede insert con `user_id != auth.uid()` | BLOQUEADO / NO EJECUTADO |
| Storage | A puede subir/leer en su carpeta | BLOQUEADO / NO EJECUTADO |
| Storage | A no puede subir en carpeta de B | BLOQUEADO / NO EJECUTADO |
| Storage | A no puede leer objeto de B | BLOQUEADO / NO EJECUTADO |

Salida segura del smoke test:

```text
Missing required env: SUPABASE_URL, SUPABASE_ANON_KEY
```

### Runbook exacto para desbloquear remoto

1. Crear o identificar un proyecto Supabase cuyo nombre visible indique `staging` o `dev`.
2. Repetir `supabase projects list` y registrar solo nombre + ref del proyecto staging/dev.
3. Ejecutar `supabase link --project-ref <STAGING_PROJECT_REF>`.
4. Ejecutar `supabase db push --dry-run`.
5. Si el dry-run muestra solo migraciones/policies esperadas de RLS/Storage, ejecutar `supabase db push`.
6. Exportar localmente las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_USER_A_EMAIL`, `SUPABASE_USER_A_PASSWORD`, `SUPABASE_USER_B_EMAIL`, `SUPABASE_USER_B_PASSWORD`.
7. Ejecutar `node tools/rls-smoke-test.js`.
8. Registrar tabla PASS/FAIL por caso sin imprimir secretos.

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
