# Post-Merge Rollout Verification — 2026-04-23

Estado: verificacion post-merge ejecutada sobre `main`.

> Nota de fecha: el identificador de rollout solicitado es `2026-04-23`; la ejecucion local ocurrio el 2026-04-24 UTC/Caracas temprano, despues de que los PRs #82, #83, #84 y #85 ya estaban mergeados en `main`.

## Repo

| Check | Resultado | Evidencia |
| --- | --- | --- |
| `git checkout main` + `git pull --ff-only` | PASS | `main` fast-forward a `4a9a1e8` |
| PRs rollout en `main` | PASS | Log incluye merges #82, #83, #84, #85 |
| Working tree limpio al inicio | PASS | `git status --short --branch` sin cambios |
| Basura de agente git-directive | PASS | Busqueda de directivas git de agente sin resultados |

## Secret scan

Comandos ejecutados sin imprimir valores de secretos:

```bash
rg -n -o "service_role|SUPABASE_SERVICE_ROLE" . --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/.git/**' --glob '!**/.env*'
rg -n -o "JWT_SECRET|PRIVATE_KEY|SUPABASE_.*KEY|anon_key" . --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/.git/**' --glob '!**/.env*'
rg -n -o "service_role|SUPABASE_SERVICE_ROLE" apps/gold/dist api apps/gold/assets apps/gold/agro --glob '!**/*.md'
```

Resultado:

- PASS para frontend/dist/API/Agro: no aparece `service_role` ni `SUPABASE_SERVICE_ROLE` en superficies runtime revisadas.
- PASS para tokens reales: detector adicional de JWT/private keys/Supabase tokens no encontro secretos reales.
- Coincidencias restantes son nombres de variables, documentacion, SQL grants al rol `service_role`, o uso de `VITE_SUPABASE_ANON_KEY` via `import.meta.env`.

## Placeholders publicos

Comando:

```bash
rg -n "\[PENDIENTE\]|ORG/REPO|DOMINIO|SECURITY_EMAIL" apps/gold --glob "*.html" --glob "public/*.txt" --glob "*.xml" --glob "!dist/**"
```

Resultado: PASS. No hay placeholders visibles en paginas publicas, sitemap ni `llms.txt`.

## Node / build

| Check | Resultado |
| --- | --- |
| `pnpm -v` | `9.1.0` |
| `node -v` | `v25.6.0` |
| `.nvmrc` | `20` |
| README requisitos Node 20 | PASS |
| `pnpm build:gold` | PASS |
| `git diff --check` | PASS |

Nota: el warning de engine es esperado en esta maquina porque corre Node `v25.6.0`, pero el repo ya fija Node 20 en `.nvmrc` y `engines`.

## Deploy publico

Dominio probado: `https://yavlgold.com` con redirect a `https://www.yavlgold.com`.

| Check | Resultado |
| --- | --- |
| `curl -iL https://yavlgold.com/health` | PASS: 307 -> 200 JSON minimo |
| `curl -IL https://yavlgold.com/health` | PASS: 307 -> 200 sin body |
| `curl -iL -X POST https://yavlgold.com/health` | PASS: 307 -> 405, `Allow: GET, HEAD` |
| `curl -iL https://yavlgold.com/status` | PASS: 307 -> 200 HTML publico |

## Ramas locales ajenas al rollout

`git branch -vv` muestra dos ramas locales con commits no empujados que no pertenecen al rollout #82-#85:

- `codex/fix-mobile-logout` — `ahead 1`
- `codex/fix-section-stats-crop-sync` — `ahead 1`

No se empujaron automaticamente por scope.
