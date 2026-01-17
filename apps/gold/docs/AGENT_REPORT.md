# AGENT_REPORT.md

Fecha: 2026-01-16

## Diagnostico
1) AGENTS.md existe en raiz; AGENT.md no existia.
2) apps/gold/package.json tenia build con vite y check-dist-utf8.
3) apps/gold/scripts existe y solo tenia check-dist-utf8.mjs.
4) docs/ raiz no existe; apps/gold/docs existe.
5) Build real esperado: pnpm build:gold en raiz.

## Plan
1) Crear AGENT.md como copia exacta de AGENTS.md.
2) Crear agent-guard.mjs para bloquear dependencias UI prohibidas.
3) Crear agent-report-check.mjs para exigir AGENT_REPORT.md.
4) Crear apps/gold/docs/AGENT_REPORT.md con Diagnostico y Plan.
5) Integrar gates en apps/gold/package.json build.
6) Agregar aviso corto al README raiz.

## Cambios ejecutados (Fase 2)
- AGENT.md creado como copia exacta.
- apps/gold/scripts/agent-guard.mjs creado.
- apps/gold/scripts/agent-report-check.mjs creado.
- apps/gold/docs/AGENT_REPORT.md creado.
- apps/gold/package.json build actualizado para gates.
- README.md raiz con aviso para agentes.

## Notas de verificacion
- Gate de reporte exige minimo 30 lineas.
- Gate de dependencias revisa deps/devDeps/peerDeps/optionalDeps.
- Lista prohibida: react, react-dom, vue, svelte, @angular/core, next, nuxt, astro.

## Build
- Ejecutar: pnpm build:gold
- Reportar resultado en el cierre de la tarea.

## Riesgos
- Sin cambios funcionales; solo enforcement.

## Proximo paso
- Si hay fallas del gate, corregir contenido del reporte.

## Diagnostico (tarea actual)
1) Se requiere reforzar Dashboard con continuar/resumen/recomendado.
2) No hay tracker de actividad persistente; se pide fallback local (YG_ACTIVITY_V1).
3) Se solicita debug de geolocalizacion solo con ?debug=1, sin cambiar comportamiento.
4) Crypto debe operar como vista MPA con market data publica y UI DNA 9.4.
5) Gates activos: agent-guard y agent-report-check; no deben romperse.

## Plan (tarea actual)
1) Crear `apps/gold/assets/js/utils/activityTracker.js` para tracking local (YG_ACTIVITY_V1).
2) Tocar `apps/gold/dashboard/index.html` para UI y logica de Continuar/Resumen/Recomendado.
3) Integrar tracker con 1-3 lineas en: `apps/gold/academia/index.html`, `apps/gold/agro/index.html`,
   `apps/gold/crypto/index.html`, `apps/gold/herramientas/index.html`, `apps/gold/social/index.html`.
4) Actualizar `apps/gold/assets/js/geolocation.js` y `apps/gold/agro/dashboard.js` con debug condicional.
5) Convertir Crypto V1 en MPA real: actualizar `apps/gold/crypto/index.html` y agregar `apps/gold/crypto/crypto.js`.
6) Al final ejecutar `pnpm build:gold` y reportar resultado.

## Diagnostico (tarea actual - crypto CORS/451)
1) En produccion, los fetch a Binance desde el browser fallan por CORS o 451.
2) La base actual usa api.binance.com, que no es confiable en frontend.
3) Se requiere mover a data-api.binance.vision y manejar fallback con backoff.

## Plan (tarea actual - crypto CORS/451)
1) Editar `apps/gold/crypto/crypto.js` para cambiar base REST y agregar manejo 451/CORS + backoff.
2) Ajustar `apps/gold/crypto/index.html` solo si se requiere un estado extra en UI.
3) Ejecutar `pnpm build:gold` al final y reportar resultado.

## Diagnostico (tarea actual - FNG + metadata)
1) En /crypto falta un bloque Fear & Greed Index con datos publicos de alternative.me.
2) El titulo/favicon/metadata todavia muestra "Proximamente".
3) Se requiere cache local por 15 min y degradacion si falla la API.

## Plan (tarea actual - FNG + metadata)
1) Editar `apps/gold/crypto/crypto.js` para fetch FNG, cache YG_FNG_V1 y render con fallback.
2) Editar `apps/gold/crypto/index.html` para el bloque FNG y corregir title/metadata.
3) Ejecutar `pnpm build:gold` al final y reportar resultado.

## Diagnostico (tarea actual - Tecnologia + favicon PNG)
1) El modulo "Herramientas" pasa a pilar "Tecnologia"; el label debe actualizarse sin romper rutas.
2) El favicon actual (SVG/WebP/ICO) no es tomado por Google en algunos casos.
3) Se requiere un PNG 192x192 servido desde raiz y referenciado en el <head>.

## Plan (tarea actual - Tecnologia + favicon PNG)
1) Actualizar labels y links visibles de "Herramientas" a "Tecnologia" en UI.
2) Ajustar rutas con compatibilidad: /tecnologia como canonica y /herramientas como redirect/alias.
3) Agregar favicon PNG 192x192 en public y referenciarlo en el <head> principal.
4) Hacer rg -n "Herramientas|herramientas|/herramientas|/tools" apps/gold -g "*.html" y no cerrar hasta que solo quede 0 o quede unicamente en el redirect.
5) Ejecutar `pnpm build:gold` al final y reportar resultado.

## Diagnostico (tarea actual - dashboard tecnologia + landing)
1) El Dashboard renderiza modulos desde Supabase y sigue mostrando "Herramientas".
2) /tecnologia carga la landing legacy (Herramientas) pero el pilar no esta construido.
3) Se requiere normalizar UI sin tocar DB y exponer un placeholder "Proximamente".

## Plan (tarea actual - dashboard tecnologia + landing)
1) Normalizar el modulo de herramientas en `apps/gold/dashboard/index.html` (nombre/route/tracking) sin tocar thumbnail.
2) Crear landing simple en `apps/gold/tecnologia/index.html` con SEO y favicons.
3) Ajustar `apps/gold/vite.config.js` y `apps/gold/vercel.json` para servir /tecnologia/ y mantener /herramientas -> /tecnologia.
4) Verificar auth guards para /tecnologia y /herramientas.
5) Ejecutar `pnpm build:gold` al final y reportar resultado.

## DoD (tarea actual - dashboard tecnologia + landing)
- [ ] Dashboard muestra "Tecnologia" y navega a /tecnologia/ manteniendo thumbnail.
- [ ] /tecnologia/ muestra landing "Proximamente" (sin legacy).
- [ ] /herramientas/ resuelve a /tecnologia/ sin 404.
- [ ] Auth cubre /tecnologia y /herramientas.
- [ ] `pnpm build:gold` OK.

## Diagnostico (tarea actual - tecnologia 404 root vercel)
1) El vercel.json raiz no tiene rewrite para /tecnologia y termina en 404.
2) /herramientas sigue resolviendo al HTML legacy; se requiere redireccion 301 a /tecnologia.
3) La landing de /tecnologia debe ser placeholder "Proximamente" con SEO basico.

## Plan (tarea actual - tecnologia 404 root vercel)
1) Crear/ajustar `apps/gold/tecnologia/index.html` con copy "Tecnologia (Proximamente)" y favicons.
2) Actualizar `vercel.json` (raiz) con redirects /herramientas -> /tecnologia y rewrites /tecnologia.
3) Agregar redirect HTML (meta + JS) en legacy `apps/gold/herramientas/*.html` para evitar ver el diseño viejo.
4) Ejecutar `pnpm build:gold` al final y reportar resultado.

## DoD (tarea actual - tecnologia 404 root vercel)
- [ ] `apps/gold/tecnologia/index.html` existe y muestra "Tecnologia (Proximamente)".
- [ ] /tecnologia resuelve sin 404 via vercel.json raiz.
- [ ] /herramientas redirige a /tecnologia.
- [ ] `pnpm build:gold` OK.

## Diagnostico (tarea actual - vercel app gold tecnologia)
1) El vercel.json de `apps/gold` no tenia rewrites explicitos para /tecnologia.
2) /herramientas necesita redirect permanente a /tecnologia para evitar landing legacy.
3) Build solicitado: `pnpm build:v9` debe generar `dist/tecnologia/index.html`.

## Plan (tarea actual - vercel app gold tecnologia)
1) Ajustar `apps/gold/tecnologia/index.html` para "Tecnologia (Proximamente)" con CTAs a /dashboard o /.
2) Editar `apps/gold/vercel.json` para agregar rewrites /tecnologia y redirects /herramientas.
3) Agregar entrada `tecnologia` en `vite.config.js` (raiz) para que build:v9 genere dist/tecnologia/index.html.
4) Verificar authClient/authGuard cubren /tecnologia y mantienen /herramientas.
5) Ejecutar `pnpm build:v9` y reportar resultado.

## DoD (tarea actual - vercel app gold tecnologia)
- [ ] `apps/gold/tecnologia/index.html` existe con copy "Tecnologia (Proximamente)".
- [ ] `apps/gold/vercel.json` incluye rewrites /tecnologia y redirects /herramientas.
- [ ] `pnpm build:v9` OK y `apps/gold/dist/tecnologia/index.html` existe.

## Diagnostico (tarea actual - vercel root limpieza herramientas)
1) El vercel.json raiz mantiene rewrites de /herramientas que contradicen el redirect.
2) El redirect /herramientas/:path* arrastra subrutas legacy hacia /tecnologia/:path* y puede causar 404.
3) Falta rewrite explicito para /tecnologia/ con trailing slash en el vercel.json raiz.

## Plan (tarea actual - vercel root limpieza herramientas)
1) Editar `vercel.json` (raiz) para quitar rewrites de /herramientas.
2) Ajustar redirect /herramientas/:path* para apuntar a /tecnologia sin path.
3) Agregar rewrite para /tecnologia/ -> /tecnologia/index.html.
4) Ejecutar `pnpm build:gold` al final y reportar resultado.

## DoD (tarea actual - vercel root limpieza herramientas)
- [ ] Rewrites /herramientas removidos del vercel.json raiz.
- [ ] Redirect /herramientas/:path* apunta a /tecnologia (sin path).
- [ ] Rewrite /tecnologia/ agregado.
- [ ] `pnpm build:gold` OK.

## Diagnostico (tarea actual - ActivityTracker dashboard)
1) El Dashboard usa Insights (Continuar/Resumen/Recomendado), pero requiere leer actividad local.
2) ActivityTracker expone window.YGActivity, pero falta el enganche explicito en el flujo post-render.
3) Se necesita fallback cuando no hay historial para evitar errores o UI vacia.

## Plan (tarea actual - ActivityTracker dashboard)
1) Ajustar `apps/gold/dashboard/index.html` para leer `window.YGActivity?.getActivitySummary?.()` tras renderizar modulos.
2) Agregar helpers `updateContinueCard`, `updateSummaryCard`, `updateRecommendCard` con fallback seguro.
3) Mantener comportamiento si YGActivity no existe (sin throws).
4) Ejecutar `pnpm build:v9` al final y reportar resultado.

## DoD (tarea actual - ActivityTracker dashboard)
- [ ] Insights toman datos de ActivityTracker sin romper si no existe.
- [ ] Continuar/Resumen/Recomendado muestran fallback si no hay actividad.
- [ ] `pnpm build:v9` OK.

## Diagnostico (tarea actual - Social DNA)
1) El modulo Social esta en "Proximamente", pero usa colores y tipografias fuera del DNA.
2) Se requiere alinear con #0a0a0a y #C8A752, Orbitron/Rajdhani.

## Plan (tarea actual - Social DNA)
1) Ajustar `apps/gold/social/index.html` para usar paleta y fuentes oficiales.
2) Mantener el layout actual y el estado "Proximamente".
3) Ejecutar `pnpm build:gold` al final y reportar resultado.

## DoD (tarea actual - Social DNA)
- [ ] Social usa paleta #0a0a0a + #C8A752 y Orbitron/Rajdhani.
- [ ] "Proximamente" se mantiene visible.
- [ ] `pnpm build:gold` OK.

## Diagnostico (tarea actual - thumbnails dashboard movil)
1) Las miniaturas usan `loading="lazy"` y en movil quedan con `opacity: 0` por regla global.
2) El script que agrega la clase `.loaded` no corre en el dashboard, asi que no se vuelve visible.
3) Se necesita un override local sin tocar `mobile-optimizations.css`.

## Plan (tarea actual - thumbnails dashboard movil)
1) Agregar un bloque al final de `apps/gold/assets/css/dashboard.css` con un override especifico para `.module-thumbnail` en movil.
2) Forzar `opacity: 1 !important` y `transform: none !important` en `@media (max-width: 768px)`.
3) Ejecutar `pnpm build:gold` al final y reportar resultado.

## DoD (tarea actual - thumbnails dashboard movil)
- [ ] `.module-thumbnail` visible en movil (override activo).
- [ ] No se edita `mobile-optimizations.css`.
- [ ] `pnpm build:gold` OK.
