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

## Diagnóstico inicial: auditoría de historiales Facturero + bug visual de cultivos

### Áreas reales a revisar

- `apps/gold/agro/agro.js`
  - `renderHistoryRow(tabName, item, config, options)` define qué acciones existen de verdad por historial.
  - `setupFactureroCrudListeners()` conecta edición, borrado, duplicado, transferencia y reversión.
  - `editFactureroItem()` + `openFactureroEditModal()` + `saveEditModal()` controlan el flujo de edición.
  - `handleIncomeTransfer()` y `handleLossTransfer()` son los flujos equivalentes para Pagados y Pérdidas.
  - vistas dedicadas:
    - Donaciones: `renderDonacionesDedicatedItem()` permite `edit` + `delete`.
    - Otros: `renderOtrosDedicatedItem()` permite solo `delete`.
- `apps/gold/agro/index.html`
  - contiene el modal de crear/editar cultivo (`#modal-new-crop`) y el submit real vía `window.saveCrop`.
  - el mensaje sospechoso aparece en el fallback de guardado de cultivos cuando faltan columnas opcionales en `agro_crops`.

### Hallazgos iniciales por código

- Pagados:
  - tiene edición.
  - tiene transferencia (`.btn-transfer-income`) hacia Fiados o Pérdidas.
  - si viene de Fiados, también tiene reversión (`.btn-revert-income`).
- Pérdidas:
  - tiene edición.
  - tiene transferencia (`.btn-transfer-loss`) hacia Fiados o Pagados.
  - si viene de Fiados, también tiene reversión (`.btn-revert-loss`).
- Donaciones / Transferencias:
  - en la vista dedicada solo expone `edit` y `delete`.
  - no aparece flujo de transferencia/reversión equivalente al de Fiados/Pagados/Pérdidas.
- Otros:
  - en la vista dedicada solo expone `delete`.
  - no hay edición ni transferencia/reversión desde esa vista.
- Bug tipo Fiados:
  - por lectura de código, el input parcial “pegado” estaba concentrado en `openTransferMetaModal()` con `splitOptions`.
  - ese mismo modal se reutiliza en:
    - Fiados -> Pagados
    - Fiados -> Pérdidas
    - Pérdidas -> Pagados
  - Pagados -> Fiados no usa split; crea registro directo o revierte.
  - Donaciones y Otros no usan este modal de split parcial para sus acciones actuales.

### Hipótesis iniciales

- Historiales:
  - Pagados y Pérdidas probablemente no comparten exactamente el bug de Fiados en todos sus caminos, pero sí comparten el mismo modal base en al menos un flujo, así que requieren QA real.
  - Donaciones y Otros no parecen compartir el bug del input pegado porque no exponen ese paso de cantidad parcial.
  - Otros puede presentar inconsistencia funcional aparente si el usuario espera editar o transferir desde la vista dedicada, porque el código solo deja borrar.
- Cultivos:
  - la causa más probable del “mensaje raro” no es encoding ni emojis como tal.
  - la pista fuerte es este mensaje visible:
    - `Faltan columnas opcionales en agro_crops (override o inversión multimoneda). Ejecuta las migraciones para habilitarlas.`
  - hoy se muestra incluso cuando el guardado termina funcionando por fallback.
  - eso calza con el síntoma reportado: aparece un mensaje raro relacionado con columnas, luego el flujo sigue normal.

### Plan de QA

- Facturero en navegador:
  - validar en viewport móvil y desktop los historiales:
    - Pagados
    - Pérdidas
    - Donaciones
    - Otros
  - comprobar:
    - acciones visibles vs acciones realmente operativas
    - edición
    - transferencia
    - reversión
    - comportamiento de inputs en móvil
    - consistencia preview / confirmación / resultado
- Cultivos en navegador:
  - abrir modal nuevo cultivo.
  - abrir modal editar cultivo.
  - reproducir guardado con fallback de columnas opcionales.
  - inspeccionar consola + mensaje visible.
- Solo si el bug visual queda confirmado y la causa se mantiene clara:
  - aplicar fix quirúrgico.

### Mapa de lógica compartida

- `openTransferMetaModal()` es el modal base de cantidad/preview para flujos con split parcial.
- `openRevertToPendingWizard()` reutiliza ese modal en devoluciones parciales hacia Fiados.
- `handleIncomeTransfer()` y `handleLossTransfer()` abren caminos distintos según tabla origen/destino:
  - Pagados -> Pérdidas y Pérdidas -> Pagados no pasan por el split parcial base.
  - devoluciones desde Pagados/Pérdidas hacia Fiados sí pasan por el modal compartido.
- Donaciones y Otros usan vistas dedicadas con matrices de acciones más cortas y no comparten el wizard de split parcial.
- `window.saveCrop` en `apps/gold/agro/index.html` concentra create/edit/fallback seguro de cultivos.

### Criterios de severidad

- Alta:
  - corrupción visible de datos, pérdida de trazabilidad, imposibilidad de completar flujo crítico o desborde/ocultamiento severo en móvil.
- Media:
  - flujo completa pero con UX engañosa, preview incoherente, warning visible innecesario o acción aparentemente rota sin pérdida de datos.
- Baja:
  - deuda técnica, ruido de consola, superficies incompletas pero intencionales o fricción menor sin impacto en resultado final.
- Informativa:
  - comportamiento intencional, no reproducido o pendiente de schema/migración sin fix frontend seguro.

### Confirmación tras QA

- Historiales:
  - Pagados y Pérdidas no reabren el bug del valor pegado en los flujos parciales compartidos.
  - En ambos casos, al borrar el valor por defecto del input de cantidad, el campo queda vacío y permite escribir `4` sin reinyectar `1`; el preview queda consistente con `10 -> 4 -> 6`.
  - Donaciones no comparte el flujo de split parcial; su vista dedicada expone `edit` + `delete`.
  - Otros no comparte el flujo de split parcial; su vista dedicada expone solo `delete`.
- Cultivos:
  - Se reprodujo el mensaje raro en create/edit con un fallback de schema:
    - primero falla `insert/update` por columna opcional faltante (`status_mode`/relacionadas),
    - luego el retry sin columnas opcionales sí guarda correctamente,
    - aun así el UI muestra:
      - `Faltan columnas opcionales en agro_crops (override o inversión multimoneda). Ejecuta las migraciones para habilitarlas.`
  - Eso confirma que el bug visual no es de emoji/render, sino de un warning visible que hoy se dispara en un camino exitoso.
- QA visual móvil del shell real:
  - el header, la campana y el drawer móvil cargan sin clipping en el shell compilado.
  - se confirmó un bug visual adicional:
    - el FAB de feedback invade el modal de `Nuevo Cultivo` en móvil.
    - la causa raíz es de stacking/jerarquía visual:
      - `.agro-feedback-fab` usa `position: fixed` + `z-index: 9999`
      - `.modal-overlay` del cultivo también usa `z-index: 9999`
      - al quedar en el mismo plano y con el FAB inyectado al final del `body`, el botón termina pintándose sobre el modal.

### Plan de fix confirmado

- Tocar `apps/gold/agro/index.html`.
- Mantener intacto el fallback funcional de guardado.
- Cambiar únicamente la notificación visible del fallback exitoso:
  - modo normal: `console.warn`, sin mensaje raro al usuario
  - modo debug (`?debug=1`): conservar aviso visible si hace falta diagnóstico
- Tocar `apps/gold/agro/agro.css`.
- Ocultar el FAB de feedback únicamente cuando una capa modal/shell esté abierta en móvil/desktop:
  - sin tocar lógica del feedback
  - sin tocar el CRUD de cultivos
  - sin alterar el estado normal del FAB cuando no hay overlays activos

### Fix aplicado

- `apps/gold/agro/index.html`
  - se agregó `notifyOptionalCropColumnsFallback()`.
  - el fallback exitoso de create/edit ya no muestra un warning raro al usuario en modo normal.
  - el warning queda en `console.warn` y solo se vuelve visible con `?debug=1`.
- `apps/gold/agro/agro.css`
  - el FAB de feedback ahora se oculta mientras haya shell/drawer o modal principal abierto.
  - con eso deja de montarse sobre el modal de `Nuevo Cultivo` y no reordena la lógica del feedback.
- No se tocaron queries, payloads, fallback de compatibilidad, ni la lógica funcional del guardado de cultivos.
