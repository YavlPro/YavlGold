# AGENT REPORT ACTIVE

Fecha: 2026-03-10
Proyecto: YavlGold
Alcance de este lote: cerrar solo los 2 bugs móviles pendientes en `dashboard` y campana de `Agro`, sin tocar backend, auth, lógica funcional de módulos ni Supabase.

## Reporte de Diagnóstico

### 1. Mapa de puntos de entrada MPA y navegación actual

- `apps/gold/vite.config.js`
  - Build MPA con entradas HTML explícitas para `index`, `dashboard`, `agro`, `crypto`, `academia`, `tecnologia`, `social`, más páginas auxiliares.
  - `dashboard/index.html` y `agro/index.html` siguen el patrón HTML por página + JS modular.
- `apps/gold/vercel.json`
  - Rewrites activos para `/dashboard -> /dashboard/index.html`, `/agro -> /agro/index.html`, `/crypto -> /crypto/index.html`, etc.
  - No hace falta tocar routing para este fix.
- `apps/gold/index.html`
  - Landing principal con CTA y navegación a módulos.
  - Sigue siendo el fallback de login cuando no hay sesión.
- `apps/gold/dashboard/index.html`
  - Página dashboard MPA protegida.
  - Carga `./auth-guard.js`, `../assets/js/main.js`, CSS inline legado y ` /assets/css/dashboard-v1.css`.

### 2. Dónde se instancian datos/auth de Supabase

- `apps/gold/assets/js/config/supabase-config.js`
  - Cliente único Supabase vía `createClient(...)`.
- `apps/gold/assets/js/auth/authClient.js`
  - Guardia general de auth para rutas protegidas (`/dashboard`, `/agro`) y redirect al login si no hay sesión.
- `apps/gold/assets/js/auth/authUI.js`
  - Manejo de modales/login/registro/recuperación.
- `apps/gold/dashboard/auth-guard.js`
  - Guardia específica del dashboard usando `fetchSession()` desde `session-guard.js`.

### 3. Dashboard: qué consulta hoy y qué le falta

- `apps/gold/dashboard/index.html`
  - Verifica sesión con `supabase.auth.getSession()`.
  - Lee `profiles` para nombre/avatar.
  - Lee `modules` para renderizar cards.
  - Usa `FavoritesManager` para `user_favorites`.
  - Cuenta `notifications` no leídas.
  - Usa tracker local para “Continuar / Recomendado / Resumen” cuando existe actividad.
- Tablas citadas en el repo
  - `profiles`, `modules`, `user_favorites`, `notifications` sí están conectadas aquí.
  - `announcements` y `feedback` existen en managers/admin, pero no forman parte del layout que estamos corrigiendo.
- Progreso académico
  - `user_lesson_progress`, `user_quiz_attempts`, `user_badges` existen en `apps/gold/assets/js/academia.js`.
  - No están integradas en el dashboard actual.

### 4. Clima/Agro: prioridad Manual > GPS > IP y llaves de storage

- `apps/gold/assets/js/geolocation.js`
  - `getCoordsSmart()` respeta Manual -> cache del modo actual -> GPS/IP -> fallback.
  - Llaves detectadas:
    - `YG_MANUAL_LOCATION`
    - `yavlgold_gps_cache`
    - `yavlgold_ip_cache`
    - `yavlgold_location_pref`
    - `YG_GEO_DEBUG`
- `apps/gold/agro/dashboard.js`
  - `initWeather()` usa `window.YGGeolocation.getCoordsSmart(...)`.
  - `displayWeather()` pinta los IDs del bloque clima.
  - Clima cacheado con prefijo `yavlgold_weather_`.

### 5. Crypto: estado real

- `apps/gold/crypto/` existe como página MPA registrada en `vite.config.js` y `vercel.json`.
- No afecta este lote.

## Diagnóstico de los bugs solicitados

### Bug 1: Dashboard móvil sigue roto

Hallazgo real:

- `apps/gold/assets/css/dashboard-v1.css` sí gobierna el dashboard final porque entra después del CSS inline legado.
- En móvil, la topbar sigue en una sola fila:
  - `.topbar-inner` no envuelve.
  - `.topbar-left` y `.topbar-right` usan `flex-shrink: 0`.
  - Con logo + 5/6 acciones, el header queda comprimido en 320-390 px.
- Los KPI siguen forzados a 3 columnas en móvil angosto:
  - `.stats-section` usa `repeat(3, 1fr)` en `<=768` y también en `<=480`.
  - Resultado: cards demasiado estrechas y visualmente apretadas.
- Hero y bloques mantienen proporciones cercanas a tablet:
  - avatar/título/espaciados bajan poco respecto al ancho real de teléfono.
  - El layout no se rompe por overflow grave, pero sí queda mal respirado y desbalanceado.

Causa raíz:

- El dashboard tiene ajustes móviles incompletos en `dashboard-v1.css`: se redujo tamaño, pero no se reflowó la estructura principal para teléfonos reales.
- El problema no está en desktop ni en el bug ya resuelto del CTA “Ir al módulo”; está en topbar + KPI grid + ritmo vertical móvil.

### Bug 2: La campana de Agro sigue expandiendo mal en móvil

Hallazgo real:

- El dropdown está en `apps/gold/agro/index.html` con base:
  - parent `.agro-header-notifications` relativo
  - `#notif-dropdown` absoluto, `right: 0`, `width: 320px`
- `apps/gold/agro/agro-dashboard.css` agrega en móvil:
  - `width: min(320px, calc(100vw - 24px)) !important`
  - `right: -60px !important`
- `apps/gold/agro/agro.css` en móvil pone `.agro-shell-header__utilities` a `width: 100%` y `justify-content: space-between`.
  - Eso deja la campana en un extremo del bloque utilitario y el perfil en el otro.
  - El dropdown depende entonces de un desplazamiento manual para “caer” dentro del viewport.
- JS en `apps/gold/agro/agro-notifications.js` solo hace `display: block/none`.
  - No hay lógica de clamp/alineación responsiva.

Causa raíz:

- La solución actual depende de un offset fijo (`right: -60px`) para corregir una geometría móvil que cambia según ancho y disposición del header.
- Ese offset es frágil: en algunos anchos el panel se sigue saliendo o quedando recortado.
- El problema es de anclaje/layout móvil del header, no del contenido del dropdown ni de las notificaciones en sí.

## Plan quirúrgico de fix

Archivos a tocar:

- `AGENT_REPORT_ACTIVE.md`
  - Registrar este diagnóstico y el plan antes de editar código.
- `apps/gold/assets/css/dashboard-v1.css`
  - Reflow móvil de topbar.
  - Rebalancear KPI grid para teléfono.
  - Ajustar solo padding/gaps/proporciones móviles del hero y bloques principales.
  - Sin tocar desktop.
- `apps/gold/agro/agro.css`
  - Corregir la disposición móvil del header utilitario para que la campana quede anclada desde una posición robusta.
- `apps/gold/agro/agro-dashboard.css`
  - Eliminar el parche frágil basado en `right: -60px`.
  - Sustituirlo por ancho clampado al viewport + anclaje consistente para móvil.

No se planean cambios en:

- Backend
- Auth
- Supabase
- JS funcional de módulos
- CTA “Ir al módulo”
- Routing/build MPA
