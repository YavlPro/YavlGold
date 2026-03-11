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

## Diagnóstico adicional: logout duplicado en móvil del dashboard

### Instancias localizadas

- `apps/gold/dashboard/index.html`
  - `#logout-btn-nav`
    - Vive dentro de `.topbar-right`.
    - Tiene clase `.btn-logout`.
    - `initDashboard()` lo toma dentro de `document.querySelectorAll('#logout-btn-nav, #dropdown-logout-btn, .btn-logout')`, lo fuerza a `display: inline-flex` y le asigna `performDashboardLogout()`.
  - `#mobile-logout-fab`
    - Vive fuera de la topbar.
    - Tiene clase `.mobile-logout-btn`.
    - Su script dedicado lo muestra cuando `window.innerWidth <= 991` y le asigna también `performDashboardLogout()`.
- `apps/gold/assets/css/dashboard-v1.css`
  - Define la apariencia de `#logout-btn-nav` y `.mobile-logout-btn`.
  - Solo oculta `.mobile-logout-btn` en desktop (`min-width: 992px`).
  - No hay regla móvil equivalente para ocultar `#logout-btn-nav`.

### Hallazgo real

- En móvil quedan visibles dos botones funcionales distintos:
  - el logout de topbar `#logout-btn-nav`
  - el FAB móvil `#mobile-logout-fab`
- El duplicado no viene de auth ni de un handler repetido sobre el mismo nodo.
- El duplicado aparece porque:
  - el FAB se enciende explícitamente para móvil
  - el botón de topbar también se fuerza visible por JS sin excepción para móvil

### Instancia correcta vs instancia sobrante

- Instancia correcta en móvil:
  - `#mobile-logout-fab`
  - Está diseñado explícitamente para `<=991px`.
  - Ya ejecuta `performDashboardLogout()` sin depender de auth nueva ni de cambios funcionales.
- Instancia sobrante/duplicada en móvil:
  - `#logout-btn-nav`
  - Debe seguir existiendo para desktop, pero en móvil sobra visualmente porque compite con el FAB.

### Causa raíz

- La capa responsive actual nunca resolvió la convivencia entre dos variantes visuales de logout:
  - variante desktop: botón en topbar
  - variante móvil: FAB flotante
- Como `initDashboard()` fuerza `#logout-btn-nav` a visible y no existe una regla CSS móvil más fuerte para esconderlo, ambas variantes quedan activas al mismo tiempo en móvil.
- El fix correcto es de visibilidad responsiva, no de lógica de logout.

### Plan quirúrgico de fix

- Tocar solo `apps/gold/assets/css/dashboard-v1.css`.
- Agregar una regla móvil explícita para ocultar `#logout-btn-nav` en `<=991px`, con prioridad suficiente para prevalecer sobre el `style.display = 'inline-flex'` del init.
- Mantener visible y funcional `#mobile-logout-fab` en móvil.
- Mantener `#logout-btn-nav` intacto en desktop.
- No tocar `performDashboardLogout()`, `AuthClient.logout()` ni handlers existentes.

## Diagnóstico adicional: Fiados -> Pagados parcial queda pegado en móvil

### Flujo localizado

- `apps/gold/agro/agro.js`
  - `handlePendingTransfer(itemId)` abre el flujo desde el historial de Fiados.
  - `openTransferMetaModal(options)` construye y controla el modal/paso donde se captura:
    - `#pending-transfer-qty-total`
    - `#pending-transfer-qty`
    - `#pending-transfer-total`
  - `computePendingSplitDraft(pending, destination, decision)` valida la cantidad, calcula transferido vs remanente y recalcula montos.
  - Persistencia parcial:
    - inserta destino en `agro_income` o `agro_losses`
    - actualiza origen en `agro_pending`
    - conserva trazabilidad en `split_from_id` y `split_meta`
- `apps/gold/agro/agro-operations.css`
  - solo afecta layout visual del historial; no es donde está el bug funcional principal.

### Hallazgo real

- El modal sí soporta split parcial y la lógica de cálculo/persistencia ya contempla:
  - cantidad total
  - cantidad transferida
  - remanente
  - `split_meta` de origen y destino
- El problema está en la UX del input `#pending-transfer-qty`:
  - `openTransferMetaModal()` enlaza `qtyInput` a `updateSplitPreview()` tanto en `input` como en `blur`.
  - dentro de `updateSplitPreview()` se hace esto en cada pulsación:
    - lee `qtyInput.value`
    - si queda vacío o inválido momentáneamente, lo sustituye por el total
    - luego vuelve a escribir `qtyInput.value = formatQuantityValue(...)`
- En móvil, cuando el usuario intenta borrar el valor por defecto para reemplazarlo, existe un estado transitorio vacío.
  - Ese estado dispara `input`
  - el preview lo “corrige” de inmediato
  - el campo se vuelve a llenar antes de que el usuario termine de escribir
- Resultado práctico:
  - el valor por defecto se siente pegado
  - el usuario termina pudiendo transferir solo el mínimo visible o todo
  - no logra una edición parcial limpia como `4` sobre `10`

### Causa raíz exacta

- La sanitización del campo de cantidad ocurre demasiado pronto.
- El modal normaliza y reinyecta el valor del input durante el evento `input`, en vez de permitir edición transitoria y sanitizar recién al confirmar o al perder foco.
- El split parcial y la persistencia no aparecen como origen del bug; el problema nace en la capa de captura del valor.

### Plan de fix

- Tocar `apps/gold/agro/agro.js`.
- Separar dos comportamientos del modal:
  - en `input`: actualizar preview sin reescribir agresivamente `#pending-transfer-qty`
  - en `blur` o confirmación: sanitizar/clamp final a rango válido
- Mantener intacta `computePendingSplitDraft()` salvo que la validación final requiera un ajuste mínimo.
- Verificar con QA en navegador:
  - 10 -> 4 -> 6
  - 10 -> 1
  - 10 -> 10
  - inválidos: vacío, 0, mayor al total

### Archivos a tocar

- `AGENT_REPORT_ACTIVE.md`
  - registrar diagnóstico, causa raíz y plan antes de editar
- `apps/gold/agro/agro.js`
  - corregir la edición del input parcial y mantener preview + confirmación coherentes
