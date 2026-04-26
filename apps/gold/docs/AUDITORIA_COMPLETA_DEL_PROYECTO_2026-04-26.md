# Auditoria completa del proyecto - 2026-04-26

## 1. Alcance

Auditoria general del repo `C:\Users\yerik\gold`, en modo solo diagnostico.

No se hicieron correcciones de codigo, migraciones, cambios de configuracion ni modificaciones en documentacion canonica. El unico archivo creado por esta sesion es este informe.

No se leyo el contenido de `testqacredentials.md` ni de archivos `.env`.

## 2. Veredicto ejecutivo

Estado general: **YELLOW**.

El proyecto esta operativo: el build canonico de Gold pasa, el guard de dependencias prohibidas no detecta React/Vue/Svelte/Angular/Next/Nuxt/Astro en `package.json`, Supabase canonico vive en la raiz y no reaparecio `apps/gold/supabase/`.

El riesgo principal no es una falla inmediata de runtime, sino deuda estructural acumulada: una superficie activa usa Tailwind CDN y Montserrat contra el canon, la validacion real de RLS/Storage sigue pendiente, no hay CI automatico de build, el runtime local usado no coincide con Node 20.x, Agro conserva monolitos grandes, y la deuda visual/eventos/dialogos sigue alta.

## 3. Evidencia ejecutada

Comandos y revisiones principales:

- `git status --short`: limpio antes de crear este informe.
- `pnpm build:gold`: exitoso.
- `pnpm audit --prod`: sin vulnerabilidades conocidas.
- Inspeccion estatica de estructura, scripts, Vite, Vercel, Supabase, Edge Functions, documentacion y superficies activas.
- Conteos de tamano, patrones de eventos, dialogos nativos, `innerHTML`, estilos inline, colores hardcodeados y archivos grandes.

Resultado del build:

- `agent-guard.mjs`: pasa.
- `agent-report-check.mjs`: pasa.
- `vite build`: pasa.
- `check-llms.mjs`: pasa.
- `check-dist-utf8.mjs`: pasa.

Advertencia relevante del build:

- Los `package.json` declaran Node `20.x`, pero el build local corrio con Node `v25.6.0`. Esto no rompio el build, pero introduce riesgo de deriva entre desarrollo, CI y produccion.

Auditoria de dependencias:

- `pnpm audit --prod`: no encontro vulnerabilidades conocidas.
- Se emitio una advertencia de Node sobre `url.parse()` por una dependencia interna/herramienta bajo Node 25.

## 4. Estado de stack y build

### Hallazgos positivos

- `apps/gold/package.json` conserva el gate canonico:
  - `agent-guard.mjs`
  - `agent-report-check.mjs`
  - `vite build`
  - `check-llms.mjs`
  - `check-dist-utf8.mjs`
- Vite sigue configurado como MPA, no como SPA.
- No se detectaron dependencias prohibidas de React, Vue, Svelte, Angular, Next, Nuxt o Astro en los `package.json`.
- La salida `apps/gold/dist/` queda ignorada por git.

### Riesgos

1. **Runtime fuera de contrato**
   - Evidencia: `package.json` y `apps/gold/package.json` exigen Node `20.x`; el build corrio en Node `v25.6.0`.
   - Impacto: errores no reproducibles entre maquinas, CI o Vercel; warnings de dependencias que no aparecen en Node 20.
   - Prioridad: P1.

2. **Guard insuficiente contra dependencias visuales por CDN**
   - Evidencia: `agent-guard.mjs` bloquea dependencias por `package.json`, pero una pagina activa carga Tailwind por CDN.
   - Impacto: el build puede pasar aunque una superficie viole el stack canonico.
   - Prioridad: P1.

3. **No hay CI automatico de build**
   - Evidencia: `.github/workflows/` contiene solo `rls-smoke-staging.yml`, manual por `workflow_dispatch`.
   - Impacto: el build canonico depende de ejecucion local/manual.
   - Prioridad: P1.

## 5. Superficies activas y ADN Visual

### Hallazgo critico de stack visual

`apps/gold/dashboard/music.html` esta activa en build y routing:

- `apps/gold/vite.config.js` incluye `music: 'dashboard/music.html'`.
- `vercel.json` reescribe `/music` y `/music/` hacia `/dashboard/music`.

La misma superficie carga:

- `https://cdn.tailwindcss.com`
- `jsmediatags@latest`
- Google Fonts con `Montserrat`

Esto contradice el canon:

- Tailwind esta prohibido.
- Las fuentes canonicas son Orbitron, Rajdhani y Playfair Display.
- `@latest` introduce version flotante en runtime.

Impacto:

- Violacion activa del stack.
- Falso negativo del guard.
- Riesgo visual por estilos fuera de tokens.
- Riesgo operativo por dependencia CDN no versionada.

Prioridad: **P1**.

### Otros desvios visuales

- `dashboard/index.html` carga y usa `Montserrat` en varias reglas.
- `dashboard/perfil.html` y `dashboard/configuracion.html` cargan Font Awesome `6.4.0`; el canon indica Font Awesome `6.5`.
- Hay aproximadamente 1,476 ocurrencias de colores hex hardcodeados fuera de archivos de tokens en superficies activas.
- Hay aproximadamente 303 senales de estilos inline en superficies activas.

Impacto:

- La identidad visual V10 existe, pero no esta totalmente consolidada.
- Hay riesgo de duplicar paletas y romper jerarquia tipografica por superficie.

Prioridad: P2.

## 6. Agro

### Estado general

Agro sigue siendo el nucleo operativo del producto.

Evidencia de tamano:

- `apps/gold/agro/agro.js`: 14,714 lineas.
- `apps/gold/agro/agro.css`: 9,264 lineas.
- `apps/gold/agro/agroOperationalCycles.js`: 3,180 lineas.
- `apps/gold/agro/agro-cartera-viva-view.js`: 2,713 lineas.
- `apps/gold/agro/index.html`: 2,681 lineas.
- `apps/gold/agro/agro-agenda.js`: 2,234 lineas.
- `apps/gold/agro/agro-cart.js`: 2,056 lineas.

El monolito principal ya no debe recibir features nuevas. La regla actual de modulos separados es correcta, pero el tamano existente sigue siendo una deuda real para lectura, QA y cambios quirurgicos.

Prioridad: P2.

### Modularizacion

`agro/index.html` ya hace imports dinamicos de modulos externos, incluyendo:

- `agro-feedback.js`
- `agro-market.js`
- `agro-interactions.js`
- `agro-stats.js`
- `agro-notifications.js`
- `agro-trash.js`
- `agro-prompt-modal.js`
- `agro-ia-wizard.js`
- `agro-stats-report.js`
- `agro-section-stats.js`
- `agro-cycles-workspace.js`
- `agroOperationalCycles.js`
- `agro-cartera-viva-view.js`
- `agroTaskCycles.js`

Esto confirma que la direccion modular existe, pero todavia convive con un bootstrap HTML grande y el monolito.

### Dialogos nativos

Conteo aproximado en superficies activas:

- `alert(`: 63
- `confirm(`: 20
- `prompt(`: 8

Archivos con mayor concentracion:

- `apps/gold/agro/agro.js`
- `apps/gold/agro/agroTaskCycles.js`
- `apps/gold/agro/agro-cart.js`
- `apps/gold/agro/agro-agenda.js`

Impacto:

- UX inconsistente con el sistema de modal propio.
- Riesgo de bloqueo de flujo en mobile.
- Dificulta accesibilidad y estilos canonicos.

Prioridad: P2.

### Eventos, timers y memoria

Conteo aproximado en superficies activas:

- `addEventListener`: 458
- `removeEventListener`: 17
- `setInterval`: 8
- `clearInterval`: 9

Riesgos:

- Alta cantidad de listeners sin cleanup explicito.
- `apps/gold/assets/js/components/notifications.js` registra `setInterval` sin `clearInterval` visible.
- La regla canonica exige limpieza de timers y listeners cuando aplique.

Prioridad: P2.

### Insercion HTML

Conteo aproximado:

- `innerHTML`: 187
- `insertAdjacentHTML`: 1

No toda insercion HTML es vulnerabilidad, pero el volumen exige disciplina estricta de escape/sanitizacion. Los focos principales estan en modulos Agro, dashboard musical y administracion.

Prioridad: P2.

### Polling duplicado

La deuda documentada de ticker/mercado sigue vigente:

- `agro-market.js`
- `agro-interactions.js`

Ambos mantienen logica relacionada con datos de mercado/polling. Debe consolidarse en singleton cuando se toque esa zona.

Prioridad: P3, salvo que se observen sintomas de rendimiento o duplicacion de llamadas en produccion.

## 7. Supabase y backend

### Hallazgos positivos

- La carpeta canonica de Supabase es `supabase/` en la raiz.
- `apps/gold/supabase/` no existe.
- Hay 43 migraciones SQL versionadas.
- Hay hardening reciente para RLS/Storage, incluyendo bucket privado `agro-evidence` y politicas owner-scoped.
- Existe `tools/supabase-staging-guard.mjs` para reducir riesgo de operar contra un proyecto no staging.
- Existe `tools/rls-smoke-test.js` con flujo A/B para validar aislamiento entre usuarios.
- La Edge Function `agro-assistant` tiene `verify_jwt = true`.

### Riesgos

1. **Seed local configurado pero archivo ausente**
   - Evidencia: `supabase/config.toml` tiene `[db.seed] enabled = true` y `sql_paths = ["./seed.sql"]`.
   - Evidencia adicional: `supabase/seed.sql` no existe.
   - Impacto: `supabase db reset --workdir .` puede fallar o comportarse distinto a lo documentado.
   - Prioridad: P1.

2. **Validacion real RLS/Storage pendiente**
   - Evidencia documental: `apps/gold/docs/security/RLS_STORAGE_VALIDATION_2026-04-23.md` conserva matriz TODO.
   - Evidencia documental: `apps/gold/docs/ops/ROLL_OUT_STATUS_2026-04-23.md` indica bloqueo por Docker/staging auth.
   - Impacto: la postura estatica parece buena, pero falta prueba real A/B contra local/staging.
   - Prioridad: P1.

3. **Archivos locales sensibles ignorados**
   - Evidencia: `.env.local`, `apps/gold/.env`, `testqacredentials.md`, `supabase/.env` y `supabase/.env.local` estan ignorados.
   - Impacto: correcto como higiene de secretos; no hay problema observado, pero debe mantenerse.
   - Prioridad: informativo.

4. **`supabase/config.toml.old` versionado**
   - Evidencia: `supabase/config.toml.old` esta tracked.
   - Impacto: puede confundir a agentes o humanos sobre configuracion activa.
   - Prioridad: P3.

## 8. Edge Function `agro-assistant`

### Hallazgos positivos

- Valida usuario con JWT antes de procesar.
- Restringe origenes CORS a dominios esperados y localhost.
- Tiene limites y normalizacion de herramientas.
- Usa `GEMINI_API_KEY` desde variables de entorno, no hardcodeada.

### Riesgos

1. **Manejo de errores no completamente centralizado**
   - Hay multiples `catch`, pero el flujo principal puede lanzar errores de modelo/herramienta hacia fuera sin una envoltura final uniforme.
   - Impacto: respuestas no JSON o sin CORS consistente ante fallos raros.
   - Prioridad: P2.

2. **Logging de argumentos de tool**
   - `handleGetPendingPayments` registra `args` con `JSON.stringify(args)`.
   - Impacto: bajo/medio segun contenido real de argumentos; conviene minimizar logs de datos de usuario en produccion.
   - Prioridad: P3.

## 9. Seguridad web y headers

### Hallazgos positivos

`vercel.json` define headers base:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### Riesgos

- No se detecto `Content-Security-Policy`.
- No se detecto `Strict-Transport-Security`.
- No se detecto `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`.
- `X-XSS-Protection` esta presente, pero es legacy/deprecated en navegadores modernos.

Impacto:

- La postura actual es parcial.
- La falta de CSP se vuelve mas importante porque hay CDNs activos y scripts externos.

Prioridad: P2.

## 10. Testing y QA

### Estado observado

- No se encontraron tests unitarios o de integracion reales.
- `vitest` existe como dependencia/script, pero no hay suite activa visible.
- Hay un workflow manual para smoke RLS staging.
- El build local pasa.

### Riesgos

- Sin CI automatico, regresiones de build pueden entrar si no se ejecuta manualmente `pnpm build:gold`.
- Sin tests funcionales, los flujos sensibles dependen de QA manual:
  - auth/session
  - facturero
  - soft-delete
  - monedas COP/USD/VES
  - rankings/estadisticas
  - Edge Function assistant
  - RLS/Storage

Prioridad: P1 para CI, P2 para tests funcionales incrementales.

## 11. Documentacion y contexto operativo

### Hallazgos positivos

- `AGENTS.md` esta claro como fuente canonica.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` existe y tiene 2,399 lineas, por debajo del umbral de rotacion de 4,000 lineas.
- `AGENT_REPORT_ACTIVE.md` en la raiz es solo puente de compatibilidad y lo declara correctamente.
- `apps/gold/docs/AGENT_REPORT.md` esta tratado como legacy.
- La estructura de docs contiene cronicas, archivo, seguridad y ops.

### Riesgos

1. **Indice de contexto con referencias obsoletas**
   - `apps/gold/docs/AGENT_CONTEXT_INDEX.md` referencia `AGRO-VISUAL-AUDIT-V1.md`, pero el archivo no existe.
   - El mismo indice dice que `AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md` tiene 17,610 lineas; el conteo actual es 13,866.
   - Prioridad: P3.

2. **Daily log con estado stale**
   - `apps/gold/docs/ops/daily-log-2026-04-25.md` dice `pendiente de commit`, aunque el repo estaba limpio antes de este informe.
   - Prioridad: P3.

3. **Legacy surfaces algo desactualizado**
   - `LEGACY_SURFACES.md` dice que `profile/` es un directorio vacio; actualmente `apps/gold/profile` no existe.
   - `apps/gold/herramientas/node_modules` existe localmente ignorado, mientras `herramientas/package.json` esta tracked.
   - Prioridad: P3.

## 12. Higiene de repo

### Estado observado

- Archivos versionados aproximados: 431.
- Extensiones principales:
  - `.js`: 83
  - `.md`: 77
  - `.ttf`: 54
  - `.sql`: 43
  - `.html`: 37
  - `.css`: 25
- `apps/gold/dist/` existe localmente, esta ignorado y pesa aproximadamente 7.31 MB.
- `node_modules/` existe localmente.
- `apps/gold/herramientas/node_modules` existe localmente ignorado.

### Riesgos

- Varios `package.json` anidados (`academia`, `agro`, `herramientas`, `social`) quedan fuera del workspace real definido por `pnpm-workspace.yaml` (`apps/*`, `packages/*`).
- Esto puede confundir auditorias de dependencias o agentes, aunque `agent-guard.mjs` si los escanea.
- `herramientas/package.json` en superficie residual puede conservar ruido si no tiene funcion activa.

Prioridad: P3.

## 13. Assets y performance

### Observaciones de build

Archivos grandes generados:

- `assets/agro-C8YQxX1D.js`: 476.72 kB, gzip 133.21 kB.
- `assets/supabase-config-DErT2hHC.js`: 171.61 kB, gzip 44.85 kB.
- `assets/agro-DZ4whKcP.css`: 229.55 kB, gzip 34.27 kB.
- `assets/agro-atnmt8p2.css`: 193.09 kB, gzip 30.14 kB.
- `assets/me-DUujT4ek.webp`: 1,354.97 kB.
- `dist/agro/index.html`: 148.09 kB.

Impacto:

- No bloquea release, pero confirma que Agro y CSS siguen pesados.
- Conviene priorizar reduccion incremental por superficie, no reescritura masiva.

Prioridad: P3.

## 14. Ranking de riesgos

### P0 - Bloqueantes

No se detectaron bloqueantes inmediatos. El build canonico pasa.

### P1 - Alta prioridad

1. `dashboard/music.html` usa Tailwind CDN, Montserrat y `jsmediatags@latest` estando activo en build/routing.
2. Node local usado para build no coincide con Node `20.x` declarado.
3. No existe CI automatico de `pnpm build:gold`.
4. RLS/Storage tiene validacion estatica fuerte, pero prueba real A/B sigue pendiente.
5. `supabase/config.toml` habilita seed `./seed.sql` y el archivo no existe.

### P2 - Prioridad media

1. Monolitos grandes: `agro.js`, `agro.css`, `agro/index.html` y modulos Agro >2,000 lineas.
2. Dialogos nativos todavia numerosos.
3. Listeners/timers con cleanup desigual.
4. Alto volumen de `innerHTML`.
5. Alto volumen de colores hardcodeados e inline styles.
6. Supabase client aparece por CDN en paginas que tambien conviven con cliente bundlado.
7. Headers de seguridad incompletos, sin CSP/HSTS.
8. Edge Function necesita cierre de errores mas uniforme.

### P3 - Prioridad baja / higiene

1. Documentacion de indice con referencias obsoletas.
2. Daily log del 2026-04-25 con estado stale.
3. `LEGACY_SURFACES.md` menciona `profile/` como directorio vacio, pero ya no existe.
4. `supabase/config.toml.old` esta tracked.
5. Package files residuales fuera del workspace real.
6. Font Awesome 6.4.0 en algunas paginas activas.

## 15. Recomendaciones por orden

1. Decidir si `/music` sigue siendo superficie activa. Si sigue, migrarla fuera de Tailwind/Montserrat a ADN V10 y fijar dependencia de `jsmediatags`; si no sigue, sacarla de Vite/routing activo y archivarla.
2. Extender `agent-guard.mjs` para detectar CDNs prohibidos en HTML, no solo dependencias de `package.json`.
3. Fijar Node 20 en entorno local/CI y documentar comando de uso (`corepack`, Volta, nvm o equivalente).
4. Crear workflow automatico de GitHub Actions para `pnpm install --frozen-lockfile` y `pnpm build:gold`.
5. Resolver la incongruencia de `supabase/seed.sql`: crear seed canonico minimo o desactivar `db.seed` si no aplica.
6. Cerrar validacion real RLS/Storage con `tools/rls-smoke-test.js` en staging/local controlado.
7. Plan incremental para reemplazar dialogos nativos por `agro-prompt-modal.js`.
8. Crear una suite minima de tests para auth guard, soft-delete, monedas, facturero y estadisticas criticas.
9. Reducir deuda visual por superficies: primero activos publicos/dashboard, luego Agro por modulos, siempre usando tokens V10.
10. Disenar CSP/HSTS despues de cerrar inventario de CDNs; aplicar primero en staging.
11. Limpiar referencias obsoletas en indices documentales y marcar/mover residuos que ya no compiten con el estado activo.

## 16. Limitaciones de esta auditoria

No se ejecuto QA autenticada en produccion.

No se abrio navegador para auditoria visual desktop/mobile.

No se ejecuto `supabase db reset` ni smoke RLS real porque implicaria entorno Supabase/Docker/credenciales. La auditoria solo constata que existen scripts y que la validacion real sigue documentada como pendiente.

No se hicieron cambios correctivos por instruccion expresa de solo diagnostico.

## 17. Cierre

El proyecto puede seguir operando, pero no debe considerarse completamente endurecido. La ruta mas segura es cerrar primero las desviaciones que el build actual no bloquea: Tailwind/CDN activo, Node fuera de contrato, CI inexistente, seed ausente y validacion real de RLS/Storage pendiente.

La deuda grande de Agro existe, pero debe tratarse con cirugia incremental y no con reescritura. El build pasa; el siguiente salto de calidad depende de hacer que las reglas canonicas tambien sean verificables por herramientas.
