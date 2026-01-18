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

## Diagnostico (tarea actual - crypto app shell y fondo)
1) La pagina /crypto se ve como lista plana sin App Shell, lo que reduce coherencia visual con el ecosistema.
2) El fondo actual incluye una imagen/overlay tipo watermark que aparece al hacer scroll, afectando legibilidad y percepcion premium.
3) Al agregar barras fijas (navbar/footer) existe riesgo de que el contenido quede tapado si no se ajusta el layout.
4) Se requiere reservar espacio para futuros sparklines sin tocar la logica de fetch ni el render actual.

## Plan (tarea actual - crypto app shell y fondo)
1) Editar `apps/gold/crypto/index.html` para agregar estructura App Shell (header/nav/main/footer) y placeholders de sparklines sin cambiar logica.
2) Crear/actualizar `apps/gold/crypto/crypto.css` para fondo limpio, navbar glass sticky, layout seguro y placeholders.
3) Mantener el footer estandar del ecosistema y ajustar padding-top/bottom para evitar solapamientos.
4) Ejecutar `pnpm build:gold` al final y reportar resultado.

## Diagnostico (base AGENTS - mapa MPA/supabase/agro/crypto)
1) MPA: `apps/gold/vite.config.js` define entradas HTML para main, cookies, faq, soporte, dashboard, perfil, configuracion, creacion, academia, agro, crypto, herramientas, tecnologia y social.
2) Routing: `apps/gold/vercel.json` activa cleanUrls/trailingSlash; redirects /herramientas -> /tecnologia; rewrites /tecnologia; routes explicitas para /academia, /crypto, /tecnologia y /music.
3) Navegacion: `apps/gold/index.html` usa navbar con anclas (#inicio, #modulos, #testimonios) y cards de modulos; `apps/gold/dashboard/index.html` es el panel principal post-login.
4) Supabase/auth: `apps/gold/assets/js/config/supabase-config.js` crea cliente con VITE_*. `apps/gold/assets/js/auth/authClient.js` importa supabase-config, gestiona sesiones y guard (protected prefixes). `apps/gold/assets/js/auth/authUI.js` controla UI de login/registro y eventos auth. `apps/gold/dashboard/auth-guard.js` valida sesion via window.supabase/AuthClient antes de entrar.
5) Dashboard datos: usa `profiles` (avatar/username), `modules` (lista), `user_favorites` via moduleManager, `notifications` via NotificationsManager. Tablas de progreso (`user_lesson_progress`, `user_quiz_attempts`, `user_badges`) no estan integradas en el dashboard.
6) Agro/Clima: `apps/gold/assets/js/geolocation.js` prioriza Manual > GPS > IP, con cache por modo y keys `YG_MANUAL_LOCATION`, `yavlgold_gps_cache`, `yavlgold_ip_cache`, `yavlgold_location_pref`; `apps/gold/agro/dashboard.js` usa `getCoordsSmart`, `initWeather`, `displayWeather` y cache `yavlgold_weather_*`.
7) Crypto: `apps/gold/crypto/` contiene index MPA y assets relacionados; no depende de servidor python; la UI se monta en `apps/gold/crypto/index.html` con datos de `apps/gold/crypto/crypto.js`.

## Diagnostico (tarea actual - campana crypto)
1) En `apps/gold/crypto/index.html` la campana es solo un boton visual (`.nav-icon`) sin `id`/clases esperadas ni badge, por eso no hay handler.
2) En dashboard, la campana usa `#notification-bell` + `.notification-bell` y `#notification-badge`, y el click se registra desde `apps/gold/assets/js/components/notifications.js`.
3) Crypto no importa ni inicializa `NotificationsManager`, asi que no se registra el click ni se inyecta el dropdown.

## Plan (tarea actual - campana crypto)
1) Editar `apps/gold/crypto/index.html` para usar `id="notification-bell"` + clases y agregar `#notification-badge`, y cargar `NotificationsManager` con init.
2) Ajustar `apps/gold/crypto/crypto.css` para badge y estado focus sin romper el layout.
3) Ejecutar `pnpm build:gold` al final y reportar resultado.

## Diagnostico (tarea actual - sparklines crypto)
1) `apps/gold/crypto/crypto.js` renderiza `.market-card` con `.market-change.up/down`, pero no agrega un contenedor real para sparkline.
2) La lista se re-renderiza con `innerHTML` en cada update, por lo que cualquier SVG insertado debe recrearse.
3) Riesgos: parpadeo o duplicados si no es idempotente; impacto en performance si se recalcula demasiado.

## Plan (tarea actual - sparklines crypto)
1) Editar `apps/gold/crypto/crypto.css` para definir `.sparkline-placeholder` con tamanio fijo y SVG acotado.
2) Editar `apps/gold/crypto/index.html` para JS inline: detectar `.market-change` (clase/texto), crear SVG deterministico por simbolo y re-render via MutationObserver.
3) Ejecutar `pnpm build:gold` al final y reportar resultado.

## Diagnostico (tarea actual - campana crypto wiring)
1) Selector en dashboard: boton `#notification-bell.notification-bell` y badge `#notification-badge` dentro del mismo boton.
2) Panel: no hay HTML estatico; `apps/gold/assets/js/components/notifications.js` crea `#notifications-dropdown` y `#notifications-styles` en runtime.
3) JS responsable: `NotificationsManager.init()` (dashboard lo llama desde script inline con imports ESM).
4) En crypto falla si no se importan esos JS o si el boton no coincide con selectors esperados.

## Plan (tarea actual - campana crypto wiring)
1) `apps/gold/crypto/index.html`: asegurar `#notification-bell` + `.notification-bell` + `#notification-badge` y ejecutar `NotificationsManager.init()` al final del body.
2) `apps/gold/crypto/crypto.css`: ajustar badge y focus si hace falta, y asegurar z-index compatible con dropdown.
3) `apps/gold/docs/AGENT_REPORT.md`: registrar diagnostico/plan (este bloque).
4) Ejecutar `pnpm build:gold` y reportar resultado.

## Diagnostico (tarea actual - notificaciones crypto + chart modal)
1) El dropdown se construye en runtime por `apps/gold/assets/js/components/notifications.js` usando datos reales de `notifications`, por eso el contenido puede ser ajeno al contexto crypto.
2) En crypto no hay override de contenido; el panel muestra lo que llega desde el manager sin tema financiero.
3) No existe modal de detalle ni grafico; las `.market-card` se re-renderizan con `innerHTML` en `apps/gold/crypto/crypto.js`.
4) Restriccion activa: sin dependencias nuevas; el grafico debe resolverse con JS/CSS nativo.

## Plan (tarea actual - notificaciones crypto + chart modal)
1) `apps/gold/crypto/index.html`: sobreescribir metodos de `NotificationsManager` para usar 3 alertas financieras simuladas y mantener el mismo dropdown.
2) `apps/gold/crypto/index.html`: agregar modal de detalle y handlers de apertura/cierre con delegacion en `#market-grid`.
3) `apps/gold/crypto/crypto.css`: estilos para modal glass, boton de cierre y contenedor de grafico responsive.
4) Ejecutar `pnpm build:gold` y reportar resultado.

## Diagnostico (tarea actual - hardening tabs finanzas + calendario mobile)
1) Riesgo de duplicados: verificar en runtime con `document.querySelectorAll('#income-form').length` y `document.querySelectorAll('#expense-form').length`; hoy gastos viven en `apps/gold/agro/index.html` y ingresos se inyectan desde `apps/gold/agro/agro.js`.
2) ARIA actual: tabs/panels tienen atributos base, pero se requiere reforzar roles/tabindex/aria-labelledby y mantener sincronizado `aria-selected`/`aria-hidden` via JS.
3) Overrides calendario: el bloque mobile esta en el `<style>` de `apps/gold/agro/index.html` (reglas `@media (max-width: 600px)` para `#modal-lunar`).

## Plan (tarea actual - hardening tabs finanzas + calendario mobile)
1) Anti-duplicados: agregar verificacion defensiva y asegurar estrategia move-not-clone (appendChild de nodo existente a `#tab-panel-ingresos`).
2) Tabs accesibles: completar roles/aria-controls/aria-labelledby y `tabIndex` desde JS (sin reescrituras de DOM).
3) Persistencia: guardar/restaurar tab activo en `localStorage` con key `YG_AGRO_FIN_TAB_V1`.
4) Focus management: al cambiar tab, enfocar primer input visible (o heading con `tabindex=-1`) y evitar scroll agresivo.
5) CSS calendario: mover overrides mobile a CSS del modulo agro con scoping estricto.

## Diagnostico (tarea actual - agro finanzas tabs + agenda lunar)
1) MPA: `apps/gold/vite.config.js` lista entradas MPA (incluye `agro/index.html`); `apps/gold/vercel.json` mantiene cleanUrls/trailingSlash y rewrites; `apps/gold/index.html` navega a `/agro/`; `apps/gold/dashboard/index.html` es el panel post-login.
2) Supabase/auth: `apps/gold/assets/js/config/supabase-config.js` instancia el cliente; `apps/gold/assets/js/auth/authClient.js` y `authUI.js` manejan sesion/UI; `apps/gold/dashboard/auth-guard.js` valida acceso.
3) Dashboard datos: consultas activas a `profiles`, `modules`, `user_favorites`, `notifications`; progreso academico (`user_lesson_progress`, `user_quiz_attempts`, `user_badges`) no esta integrado.
4) Agro/Clima: `apps/gold/assets/js/geolocation.js` aplica prioridad Manual > GPS > IP y usa keys `YG_MANUAL_LOCATION`, `yavlgold_gps_cache`, `yavlgold_ip_cache`, `yavlgold_location_pref`; `apps/gold/agro/dashboard.js` usa `getCoordsSmart`, `initWeather`, `displayWeather` y cache `yavlgold_weather_*`.
5) Crypto: `apps/gold/crypto/` contiene MPA (index/JS/CSS) y backups; no usa servidor python.
6) Finanzas (Gastos): `apps/gold/agro/index.html` en `.finances-section` contiene `<form id="expense-form">` con IDs: `expense-concept`, `expense-amount`, `expense-date`, `expense-category`, `expense-notes`, `upload-dropzone`, `expense-receipt`, `btn-clean`, `btn-save`, `recent-transactions-container`, `expenses-list`, `upload-preview`, `upload-filename`.
7) Finanzas (Ingresos): `apps/gold/agro/agro.js` crea `#agro-income-section` dentro de `.finances-section` con IDs: `income-form`, `income-concept`, `income-amount`, `income-date`, `income-category`, `income-dropzone`, `income-receipt`, `income-clean-btn`, `income-save-btn`, `income-recent-container`, `income-list`.
8) Agenda Lunar: modal en `apps/gold/agro/index.html` (`#modal-lunar` y `#lunar-calendar-grid`); el alto/densidad se define en `apps/gold/agro/agro-interactions.js` via `injectLunarStyles` (.day-cell height 36px, .day-header font-size 9px, .month-title 0.9rem, .lunar-month padding 12px) y estilos inline del grid (padding 20px, gap 14px, contenedor 85vh).

## Plan (tarea actual - agro finanzas tabs + agenda lunar)
1) Editar `apps/gold/agro/index.html`: envolver gastos/ingresos en una sola tarjeta con tabs; crear paneles para Gastos/Ingresos/Pendientes/Perdidas/Transferencias; agregar formularios nuevos con IDs propios; agregar CSS de tabs y override responsive del calendario.
2) Editar `apps/gold/agro/agro.js`: inyectar ingresos dentro de `#tab-panel-ingresos`, implementar `switchTab` con `display:none`/`.is-hidden` sin remover nodos y ajustar aria; agregar listeners placeholder para nuevos formularios.
3) Estrategia DOM: wrap + hide/show para preservar IDs actuales (gastos/ingresos) y evitar recrear nodos/listeners.
4) Estrategia calendario responsive: `@media (max-width: 600px)` con overrides de `#modal-lunar .day-cell`, `.day-header`, `.month-title`, `.lunar-month`, `#lunar-calendar-grid` usando mayor especificidad para ganar al CSS inyectado.
