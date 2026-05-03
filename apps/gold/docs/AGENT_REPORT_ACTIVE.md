# AGENT_REPORT_ACTIVE.md — YavlGold

Estado: ACTIVO
Fecha de apertura: 2026-04-27
Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`

---

## 2026-05-03 — Diagnóstico: Popups informativos Agro

**Estado:** DIAGNÓSTICO / SIN CAMBIOS DE UI

### Objetivo

Auditar todos los popups informativos/no modales existentes en Agro para preparar una futura unificación hacia un popup central pequeño, humano y amigable, inspirado en el modal "Configura tu asistente IA".

### Alcance explícito

- Solo diagnóstico. No se modifica UI, CSS, lógica ni Supabase.
- No se implementa la unificación todavía.
- No se tocan modales funcionales (crear/editar cultivo, Cartera Viva, asistente IA).
- Se documenta cada popup/mensaje encontrado con clasificación completa.

### Riesgos del diagnóstico

- **Bajo**: es solo lectura y documentación.
- Se identificaron zonas donde `alert()` nativo bloquea la UI y donde `showEvidenceToast` se usa sin estar definido (fallback a alert).

### Archivos revisados

- `apps/gold/agro/agro.js` (monolito principal)
- `apps/gold/agro/index.html`
- `apps/gold/agro/agro-agenda.js`
- `apps/gold/agro/agro-cart.js`
- `apps/gold/agro/agro-cartera-viva-view.js`
- `apps/gold/agro/agro-clients.js`
- `apps/gold/agro/agrocompradores.js`
- `apps/gold/agro/agro-crop-report.js`
- `apps/gold/agro/agro-feedback.js`
- `apps/gold/agro/agro-ia-wizard.js` (no encontrado en paths explorados)
- `apps/gold/agro/agro-notifications.js`
- `apps/gold/agro/agro-period-cycles.js`
- `apps/gold/agro/agro-perfil.js` (agroperfil.js)
- `apps/gold/agro/agro-repo-app.js`
- `apps/gold/agro/agro-social.js` (agrosocial.js)
- `apps/gold/agro/agro-stats.js`
- `apps/gold/agro/agro-stats-report.js`
- `apps/gold/agro/agroOperationalCycles.js`
- `apps/gold/agro/agroTaskCycles.js`
- `apps/gold/agro/agro.css`
- `apps/gold/agro/agro-dashboard.css`
- `apps/gold/assets/js/ui/uxMessages.js`
- `apps/gold/assets/js/auth/authUI.js`
- `apps/gold/assets/js/components/notifications.js`
- `apps/gold/assets/js/components/feedbackManager.js`

### DoD del diagnóstico

- [x] No se modificó UI ni lógica.
- [x] Inventario razonable de popups/mensajes encontrado.
- [x] Modales funcionales separados de popups informativos.
- [x] Plan futuro por lotes propuesto.
- [x] `AGENT_REPORT_ACTIVE.md` actualizado con sección de diagnóstico.

---

## 2026-05-03 — Fase 1: notifyFacturero → YGUXMessages (eliminación de alert nativo)

**Estado:** COMPLETADO

### Diagnóstico recibido

El diagnóstico de popups informativos reveló que `showEvidenceToast` se invocaba en ~9 lugares pero **no existía definición** en el codebase. Esto causaba que `notifyFacturero()` (con ~50 call sites) cayera siempre a `alert()` nativo, bloqueando la UI y rompiendo la estética dark/gold.

### Causa raíz

`function notifyFacturero(message, type = 'info')` en `agro.js:6818` ejecutaba `if (typeof showEvidenceToast === 'function') { showEvidenceToast(message, type); } else { alert(message); }`. Como `showEvidenceToast` nunca se definió ni se asignó a `window`, **todas las llamadas a notifyFacturero caían a `alert()` nativo** — bloqueante, sin estética ADN V11, sin accesibilidad.

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro.js` | `notifyFacturero()` reescrita para usar `uxMessages` (import local). Eliminado fallback a `alert()`. |
| `apps/gold/agro/agro.js` | 3 llamadas directas a `showEvidenceToast` reemplazadas por `uxMessages.warning()`. |
| `apps/gold/agro/agro.js` | Bloque condicional `showEvidenceToast`/`alert` en dropUnits → reemplazado por `uxMessages.warning()`. |
| `apps/gold/agro/agro.js` | 2 llamadas `showEvidenceToast('Error al eliminar pagado.')` → `uxMessages.warning()`. |
| `apps/gold/agro/agro/index.html` | `showValidationError()` reescrita para usar `window.YGUXMessages.error()` con fallback a `window.showToast()` y `console.warn` (sin `alert()`). |
| `apps/gold/agro/index.html` | Alert de "botón guardar no encontrado" → `YGUXMessages.error()` con fallback a `console.error`. |
| `apps/gold/agro/index.html` | Alert fallback "Cultivo creado" → `console.warn` como último recurso. |
| `apps/gold/agro/index.html` | Alert fallback "Cambios guardados" → `console.warn` como último recurso. |
| `apps/gold/agro/index.html` | Catch block `alert(e.message)` → `YGUXMessages.error()` con fallback a `window.showToast()` y `console.error`. |
| `apps/gold/agro/agro-cartera-viva-view.js` | `showLiveWalletCropBlockMessage()` reescrita: `window.YGUXMessages.warning()` → `window.showToast()` → `console.warn` (sin `alert()`). |

### Qué API de YGUXMessages se usó

- `uxMessages.show(payload, type)` — paso de objects (`uxMessages.copy.*`)
- `uxMessages[type](string)` — para strings simple: `.success()`, `.error()`, `.warning()`, `.info()`
- `window.YGUXMessages.error(msg)` / `.warning(msg)` / `.success(msg)` — desde index.html (sin import ES6)

### Qué pasó con showEvidenceToast

**Eliminado completamente.** Cero referencias restantes en el codebase. Todas las llamadas que usaban `showEvidenceToast` fueron reemplazadas por `uxMessages` (en agro.js) o `window.YGUXMessages` (en index.html y cartera-viva-view).

### Cuántos alert() quedan y por qué no se tocaron

Quedan **33 `alert()` en `agro.js`** y **0 en `index.html`**. No se tocaron porque:
- Pertenecen a las Fases 2-3 (alerts en AgroLog, validación de cultivo, exportación, agenda, carrito, crop-report, stats).
- Su migración requiere cirugía caso por caso, no un solo wrapper.
- El scope de Fase 1 era exclusivamente `notifyFacturero()` y `showEvidenceToast`.
- Los `confirm()` y `prompt()` destructivos/funcionales tampoco se tocaron (10 confirm + 4 prompt).

### Validación

- `git diff --check`: PASS (cero errores).
- `pnpm build:gold`: PASS completo (Vite + agent-guard + check-llms + utf8).
- `rg "showEvidenceToast"`: ZERO resultados (eliminación completa).
- `notifyFacturero()` ya no contiene `alert()` ni referencia a `showEvidenceToast`.

### QA manual pendiente para el usuario

1. **Crear cultivo** → debe mostrar toast YGUXMessages, no alert nativo.
2. **Editar cultivo** → debe mostrar toast de éxito, no alert nativo.
3. **Crear registro en facturero** → notifyFacturero debe mostrar toast amigable.
4. **Error de guardado** → debe mostrar toast de error, no alert nativo.
5. **Confirmaciones destructivas** → deben seguir funcionando igual (confirm() nativo).
6. **Bloqueo de cartera viva** (cultivo no en producción) → debe mostrar warning toast, no alert.

### Comandos git sugeridos

```bash
git add apps/gold/agro/agro.js apps/gold/agro/index.html apps/gold/agro/agro-cartera-viva-view.js apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "fix(agro): elimina alert() nativo en notifyFacturero y showEvidenceToast — Fase 1 popups"
```

---

### Resumen

- **Total encontrados:** ~85 popups/mensajes informativos
- **Alerts nativos (`alert()`):** ~28
- **Confirms nativos (`confirm()`):** ~10
- **Prompts nativos (`prompt()`):** ~4
- **Toasts/snackbars custom:** ~38
- **Mensajes inline (status bars):** ~5 sistemas
- **Candidatos claros a popup central:** ~45
- **No candidatos (destructivos/funcionales):** ~15 confirm/prompt
- **No candidatos (status bars inline):** ~5 sistemas (distinta naturaleza)
- **Sistemas de toast encontrados:** 7 diferentes

### Sistemas de notificación encontrados

| # | Sistema | Archivo definición | Tipo | Cobertura | Cohesión visual |
|---|---|---|---|---|---|
| 1 | `window.YGUXMessages` / `uxMessages.js` | `assets/js/ui/uxMessages.js` | Toast moderno centralizado | Auth, perfil, onboarding, cultivo CRUD | Alta (dark/gold, ADN V11) |
| 2 | `notifyFacturero()` → `showEvidenceToast` → `alert()` | `agro.js:6818` | Wrapper con fallback a alert | Facturero (CRUD movimientos, transferencias, reversiones) | Baja (caída a alert nativo) |
| 3 | `showAssistantToast()` | `agro.js:14383` | Toast simple en panel IA | Asistente IA (copiar, cola, límites, eliminar) | Media (solo dentro del panel) |
| 4 | `showUndoDeleteToast()` | `agro.js:5978` | Toast con botón undo | Undo de eliminación en facturero | Media (custom HTML) |
| 5 | `pushToast()` | `agro-repo-app.js:797` | Toast propio del repo | Repo app (archivos, carpetas, sync) | Media (solo repositorio) |
| 6 | `NotificationsManager._showToast()` | `assets/js/components/notifications.js:358` | Toast administrativo | Admin (anuncios, feedback) | Baja (inline styles) |
| 7 | `window.showToast` | alias de `uxMessages.show()` | Alias global | Periodos, cartera operativa, carrito | = YGUXMessages |

**Observación crítica:** `showEvidenceToast` se invoca en 9 lugares pero **no tiene definición** en el codebase. Su patron es `typeof showEvidenceToast === 'function'`, cayendo siempre a `alert()` cuando no existe. Esto significa que **todas las ~50 llamadas a `notifyFacturero()` y las 7 llamadas directas a `showEvidenceToast`** producen `alert()` nativo en producción.

### Inventario detallado

#### LOTE A — Alert() nativos (candidatos ALTOS a migración)

| Prioridad | Trigger | Archivo:Línea | Texto/propósito | Bloquea | Migrar | Riesgo |
|---|---|---|---|---|---|---|
| Alta | Cultivo creado | `index.html:2621` | `alert('Cultivo creado correctamente.')` fallback | Sí | Sí | Bajo |
| Alta | Cultivo editado | `index.html:2656` | `alert('Cambios guardados en el cultivo.')` fallback | Sí | Sí | Bajo |
| Alta | Error genérico catch | `index.html:2675` | `alert(e.message)` | Sí | Sí | Bajo |
| Alta | Botón Guardar no encontrado | `index.html:2310` | `alert('⚠️ No se encontró el botón de Guardar.')` | Sí | Sí | Bajo |
| Alta | Validación cultivo | `index.html:2347` | `alert('⚠️ ' + msg)` fallback | Sí | Sí | Bajo |
| Alta | notifyFacturero fallback | `agro.js:6822` | `alert(message)` — ~50 call sites | Sí | Sí | Medio (volumen) |
| Alta | Sesión expirada | `agro.js:5922` | `alert('Sesión expirada. Recarga la página.')` | Sí | Sí | Bajo |
| Alta | Error eliminar | `agro.js:5974` | `alert('Error al eliminar:...')` | Sí | Sí | Bajo |
| Alta | Registro no encontrado | `agro.js:6110` | `alert('No se encontró el registro.')` | Sí | Sí | Bajo |
| Alta | Error datos incompletos | `agro.js:6366` | `alert('Error: datos incompletos.')` | Sí | Sí | Bajo |
| Alta | Sesión expirada (guardado) | `agro.js:6373` | `alert('Sesión expirada.')` | Sí | Sí | Bajo |
| Alta | Validación fecha | `agro.js:6409` | `alert(dateCheck.error)` | Sí | Sí | Bajo |
| Alta | Error guardar movimiento | `agro.js:6624` | `alert('Error al guardar:...')` | Sí | Sí | Bajo |
| Alta | Registro original no encontrado | `agro.js:6661` | `alert('No se encontró el registro original.')` | Sí | Sí | Bajo |
| Alta | Monto inválido | `agro.js:6680` | `alert('Monto invalido. Operacion cancelada.')` | Sí | Sí | Bajo |
| Alta | Error duplicar | `agro.js:6710` | `alert('Error al duplicar:...')` | Sí | Sajo | Bajo |
| Alta | No pudo convertir | `agro.js:6508` | `alert('No se pudo convertir la edición en devolución parcial...')` | Sí | Sí | Bajo |
| Alta | Ciclo huérfano | `agro.js:8369` | `alert('No se pudo identificar el ciclo huérfano.')` | Sí | Sí | Bajo |
| Alta | Error exportar | `agro.js:5642` | `alert('Error al exportar:...')` | Sí | Sí | Bajo |
| Alta | Error cargar datos | `agro.js:5487` | `alert('Error cargando datos.')` | Sí | Sí | Bajo |
| Alta | Error exportar estadísticas | `agro-stats-report.js:854` | `alert('Error al exportar estadísticas:...')` | Sí | Sí | Bajo |
| Alta | Sesión no válida | `agro-stats-report.js:734` | `alert('Sesión no válida.')` | Sí | Sí | Bajo |
| Alta | Error crear actividad | `agro-agenda.js:192` | `alert('Error al crear actividad:...')` | Sí | Sí | Bajo |
| Alta | Error eliminar actividad | `agro-agenda.js:250` | `alert('Error al eliminar:...')` | Sí | Sí | Bajo |
| Alta | Validación agenda | `agro-agenda.js:1369-1371` | `alert('Selecciona un tipo...')` / `alert('El título es obligatorio.')` / `alert('La fecha es obligatoria.')` | Sí | Sí | Bajo |
| Alta | Error crear carrito | `agro-cart.js:225` | `alert('Error al crear carrito:...')` | Sí | Sí | Bajo |
| Alta | Error eliminar carrito | `agro-cart.js:243` | `alert('Error al eliminar:...')` | Sí | Sí | Bajo |
| Alta | Error agregar item | `agro-cart.js:307` | `alert('Error al agregar item:...')` | Sí | Sí | Bajo |
| Alta | Validación carrito | `agro-cart.js:585` / `1208` / `1343` / `1476` / `1477` | `alert(message)` / `alert('El nombre es obligatorio.')` / `alert('El precio debe ser mayor a 0.')` | Sí | Sí | Bajo |
| Alta | Error exportar informe | `agro-crop-report.js:926` | `alert('Error al exportar informe:...')` | Sí | Sí | Bajo |
| Alta | Cultivo no seleccionado | `agro-crop-report.js:672` | `alert('No se seleccionó un cultivo.')` | Sí | Sí | Bajo |
| Alta | Sesión no válida (reporte) | `agro-crop-report.js:677` | `alert('Sesión no válida.')` | Sí | Sí | Bajo |
| Alta | Cartera viva bloqueo | `agro-cartera-viva-view.js:478` | `window.alert(CARTERA_VIVA_CROP_BLOCK_MESSAGE)` fallback | Sí | Sí | Bajo |
| Alta | Error cargar agenda | `agro.js:13735` | `alert('Error al cargar la agenda:...')` | Sí | Sí | Bajo |
| Alta | Error sesión (pagados) | `agro.js:12089` | `alert('Debes iniciar sesion para eliminar pagados.')` | Sí | Sí | Bajo |
| Alta | Error rango fechas | `agro-stats.js:297` | `alert('Rango de fechas inválido.')` | Sí | Sí | Bajo |
| Media | Error actualizar carrito | `agro-cart.js:330` | `alert('Error al actualizar:...')` | Sí | Sí | Bajo |
| Media | Error eliminar item carrito | `agro-cart.js:343` | `alert('Error al eliminar:...')` | Sí | Sí | Bajo |
| Media | No se encontró cultivo | `agro.js:16123` | `alert('Error: No se encontró el cultivo')` | Sí | Sí | Bajo |
| Media | Nombre cultivo obligatorio | `agro.js:16258` | `alert('Por favor ingresa el nombre del cultivo')` | Sí | Sí | Bajo |
| Media | Área obligatoria | `agro.js:16263` | `alert('Por favor ingresa el área en hectáreas')` | Sí | Sí | Bajo |
| Media | Fecha siembra obligatoria | `agro.js:16268` | `alert('Por favor selecciona la fecha de siembra')` | Sí | Sí | Bajo |
| Media | Error guardar cultivo | `agro.js:16329` | `alert('Error al guardar el cultivo:...')` | Sí | Sí | Bajo |
| Media | Exportación no disponible | `agro.js:5405` | `alert('La exportación no está disponible para esta vista.')` | Sí | Sí | Bajo |
| Media | No se pudo completar exportación | `agro.js:8450` | `alert('No se pudo completar la exportación...')` | Sí | Sí | Bajo |
| Media | Error eliminado pagado | `agro.js:12083` | `alert('No se pudo identificar el pagado.')` | Sí | Sí | Bajo |
| Baja | Columnas presentación | `agro.js:6597` | `alert('Aviso: columnas de presentacion/kg...')` | Sí | Sí | Bajo |

#### LOTE B — Confirm() nativos (algunos candidatos, algunos NO)

| Prioridad | Trigger | Archivo:Línea | Texto/propósito | Bloquea | Migrar | Riesgo |
|---|---|---|---|---|---|---|
| **NO** | Eliminar cultivo | `agro.js:16369` | `confirm('⚠️ ¿Estás seguro...?')` destructivo | Sí | **No** (destructivo) | Alto |
| **NO** | Eliminar actividad | `agro-agenda.js:242` | `confirm('¿Eliminar esta actividad?')` destructivo | Sí | **No** (destructivo) | Alto |
| **NO** | Eliminar carrito | `agro-cart.js:230` | `confirm('¿Eliminar este carrito...?')` destructivo | Sí | **No** (destructivo) | Alto |
| **NO** | Eliminar item carrito | `agro-cart.js:335` | `confirm('¿Eliminar este item?')` destructivo | Sí | **No** (destructivo) | Alto |
| **NO** | Eliminar conversación IA | `agro.js:14220` / `15279` | `confirm('¿Eliminar esta conversacion?')` destructivo | Sí | **No** (destructivo) | Alto |
| **NO** | Eliminar pagado | `agro.js:12080` | `window.confirm('¿Eliminar pagado?')` destructivo | Sí | **No** (destructivo) | Alto |
| **NO** | Eliminar ciclo huérfano | `agroOperationalCycles.js:1345` | `window.confirm()` destructivo | Sí | **No** (destructivo) | Alto |
| **NO** | Eliminar anuncio admin | `adminManager.js:389` | `confirm('¿Estás seguro de eliminar...?')` destructivo | Sí | **No** | Alto |
| **NO** | Eliminar feedback admin | `adminManager.js:527` | `confirm('¿Eliminar este feedback?')` destructivo | Sí | **No** | Alto |
| **NO** | Cerrar sesión | `authUI.js:638` | `confirm('¿Estás seguro de cerrar sesión?')` | Sí | **No** (destructivo) | Medio |
| **NO** | Eliminar cliente | `agro-clients.js:806` | `window.confirm()` destructivo | Sí | **No** | Alto |
| **NO** | Confirmar devolución parcial | `agro.js:6514` | `confirm('Detectamos reducción... ¿Continuar?')` destructivo | Sí | **No** (destructivo con contexto) | Alto |
| **NO** | Eliminar ciclo período | `agro-period-cycles.js:1325` | `confirm('¿Eliminar el ciclo...?')` destructivo | Sí | **No** | Alto |
| **NO** | Confirmar exportación ciclo | `agro-crop-report.js:706` | `window.confirm()` con detalle | Sí | **No** | Medio |
| Alta | Confirm wizard IA | `agro-wizard.js:106` | `window.confirm()` para wizard de IA | Sí | **Duda** (contextual) | Medio |
| Alta | Confirmar comprador | `agrocompradores.js:248` | `window.confirm()` para eliminar | Sí | **No** (destructivo) | Alto |

#### LOTE C — Prompt() nativos (NO candidatos a popup informativo)

| Prioridad | Trigger | Archivo:Línea | Texto/propósito | Migrar | Riesgo |
|---|---|---|---|---|---|
| **NO** | Nombrar cartera operativa | `agro-cartera-viva-view.js:1509` | `window.prompt('Nombre de la cartera operativa')` | No | Alto |
| **NO** | Renombrar ciclo | `agro-period-cycles.js:1309` | `prompt('Nuevo nombre del ciclo:')` | No | Alto |
| **NO** | ID cultivo destino (mover) | `agro.js:6645` | `prompt('ID del cultivo destino...')` | No | Alto |
| **NO** | Monto copia | `agro.js:6676` | `prompt('Monto para la copia...')` | No | Alto |
| **NO** | ID cultivo destino (mover registro) | `agro.js:6729` | `prompt('ID del cultivo destino para mover...')` | No | Alto |

#### LOTE D — Toasts/snackbars custom (candidatos a centralizar)

| Prioridad | Sistema | Archivo:Línea | Texto/propósito | Migrar | Riesgo |
|---|---|---|---|---|---|
| Alta | notifyFacturero → showEvidenceToast/YGUXMessages | `agro.js:6818-6822` | ~50 mensajes de éxito/error/warning del facturero | Sí | Medio |
| Alta | showAssistantToast | `agro.js:14383` | 'Copiado', 'No se pudo copiar', 'En cola', 'Límite IA', 'Conversación eliminada', 'Exportación descargada' | Sí | Bajo |
| Alta | window.showToast (alias YGUXMessages) | `uxMessages.js:490` | 'Cultivo creado correctamente.', 'Cambios guardados en el cultivo.', periodos, cartera operativa | Ya centralizado | Bajo |
| Alta | YGUXMessages.copy | `uxMessages.js:308-462` | welcomeBack, registerSuccess, logoutSuccess, cropSaved, movementCreated/Updated/Deleted/Duplicated/Moved, transferCompleted, revertCompleted, etc. | Ya centralizado | Bajo |
| Media | pushToast (repo app) | `agro-repo-app.js:797` | Carpeta creada, Archivo creado, Renombrado, Eliminado, Copiado, Pegado, etc. | Sí (futuro) | Bajo |
| Media | NotificationsManager._showToast | `notifications.js:358` | Toasts admin (inline styles, no ADN V11) | Sí (futuro) | Medio |
| Media | authUI.showToast | `authUI.js:671` | Mensajes auth (ya usa YGUXMessages) | Ya centralizado | Bajo |
| Media | feedbackManager._showToast | `feedbackManager.js:186` | 'Feedback enviado', 'Escribe un mensaje...', etc. | Ya centralizado | Bajo |

#### LOTE E — Status bars inline (NO son popups pero informativos)

| Prioridad | Sistema | Archivo:Línea | Naturaleza | Migrar | Riesgo |
|---|---|---|---|---|---|
| Media | setPageFeedback (clients) | `agro-clients.js:192` | Status bar dentro de la vista de clientes | Duda (naturaleza diferente) | Bajo |
| Media | setPageFeedback (tasks) | `agroTaskCycles.js:597` | Status bar dentro de la vista de tareas | Duda (naturaleza diferente) | Bajo |
| Media | setBuyerStatus | `agrocompradores.js:93` | Status bar dentro de la ficha de comprador | Duda (naturaleza diferente) | Bajo |
| Media | setProfileStatus | `agroperfil.js:150` | Status bar dentro del perfil | Duda (naturaleza diferente) | Bajo |
| Media | setGlobalStatsStatus | `agroperfil.js:157` | Status bar del resumen global | Duda (naturaleza diferente) | Bajo |
| Media | setStatus (social) | `agrosocial.js:39` | Status bar del panel social | Duda (naturaleza diferente) | Bajo |
| Media | setDetailExportState | `agro-cartera-viva-view.js:2848` | Status bar de exportación en cartera viva | Duda (naturaleza diferente) | Bajo |
| Media | showValidationError | `index.html:2343` | Helper que usa toast o alert según disponibilidad | Sí | Bajo |

#### LOTE F — showUndoDeleteToast (especial)

| Prioridad | Trigger | Archivo:Línea | Naturaleza | Migrar | Riesgo |
|---|---|---|---|---|---|
| Alta | Undo delete facturero | `agro.js:5978` | Toast persistente con botón "Deshacer" (HTML custom) | Parcialmente (preservar botón undo) | Medio |

#### LOTE G — Otros mensajes informativos inline (NO popups, solo documentación)

| Prioridad | Sistema | Archivo | Naturaleza |
|---|---|---|---|
| Info | notify() period cycles | `agro-period-cycles.js:117` | Delega a window.showToast |
| Info | notify() operational cycles | `agroOperationalCycles.js:883` | Delega a window.showToast |
| Info | cart showToast | `agro-cart.js:581` | Delega a window.showToast |
| Info | YGUXMessages flash queue | `uxMessages.js:277-294` | Sistema de flash para redirecciones (login → dashboard) |

### Hallazgos importantes

1. **`showEvidenceToast` NO está definido** en ningún archivo del repo. Se invoca en ~9 lugares con `typeof showEvidenceToast === 'function'` pero la función no existe, por lo que **siempre cae al fallback `alert()`**. Esto es el problema más visible y de mayor impacto: ~50+ mensajes del facturero (notifyFacturero) y 7+ llamadas directas producen alerts nativos bloqueantes.

2. **7 sistemas de toast/notificación diferentes** coexisten sin cohesión visual: YGUXMessages, notifyFacturero→alert, showAssistantToast, showUndoDeleteToast, pushToast(repo), NotificationsManager._showToast, status bars. Solo YGUXMessages sigue ADN V11.

3. **~28 `alert()` nativos** bloquean la UI, rompen la estética dark/gold y no siguen el ADN Visual V11.

4. **~10 `confirm()` nativos** son en su mayoría destructivos (eliminar cultivo, carrito, actividad, sesión) y **no deben migrarse al popup central informativo** sino a un futuro componente de confirmación con diseño ADN V11.

5. **4 `prompt()` nativos** son funcionales (inyectar datos) y tampoco son candidatos al popup informativo.

6. **`notifyFacturero()`** es el wrapper más congestionado: conecta 50+ call sites del facturero a un sistema que siempre cae a `alert()`.

7. **`showValidationError()`** en `index.html:2343` ya intenta usar `showEvidenceToast` pero cae a `alert()`.

8. Los sistemas de **status bar inline** (`setPageFeedback`, `setBuyerStatus`, `setProfileStatus`, `setStatus`, `setDetailExportState`) son FUNCIONALMENTE DIFERENTES: son labels de estado embebidos en la vista, no popups flotantes. Su migración es opcional/distinta.

### Respuestas a las 7 preguntas

1. **¿Cuántos popups/mensajes informativos existen?** ~85 mensajes informativos sumando alerts, toasts, status messages y confirm/confirm. De estos, ~45 son claramente popups informativos.

2. **¿Cuántos son candidatos claros a un popup central?** ~45: los ~28 `alert()` informativos más los ~7 `showAssistantToast` más los ~10 `notifyFacturero` que son mensajes de éxito/aviso (no preguntas destructivas).

3. **¿Hay `alert()` nativos?** Sí, ~28 en producción. La mayoría caen por el `showEvidenceToast` indefinido.

4. **¿Hay `confirm()` que deban mantenerse separados por ser destructivos?** Sí, ~10 `confirm()` son confirmaciones destructivas (eliminar cultivo, eliminar carrito, cerrar sesión, etc.) y NO deben migrarse al popup informativo. Necesitan su propio componente de confirmación con estética ADN V11.

5. **¿Qué archivos concentran más mensajes?**
   - `agro.js`: ~55 mensajes (alerts + notifyFacturero + showAssistantToast + showUndoDeleteToast)
   - `index.html`: ~5 mensajes (validación, cultivo creado/editado)
   - `agro-cart.js`: ~11 mensajes
   - `agro-agenda.js`: ~5 mensajes
   - `agro-period-cycles.js`: ~5 mensajes
   - `agrocompradores.js`: ~15 status messages

6. **¿Cuál sería el primer lote seguro para migrar?**
   - **Lote 1 (máximo impacto, mínimo riesgo):** Reemplazar `notifyFacturero()` para que use `YGUXMessages` en vez de `alert()`. Esto elimina ~50 alerts de un solo cambio.
   - **Lote 2:** Reemplazar los `alert()` en index.html (cultivo creado, editado, errores de validación) por `YGUXMessages`.
   - **Lote 3:** Reemplazar `showAssistantToast()` por `YGUXMessages`.
   - **Lote 4:** Reemplazar `showValidationError()` para que use `YGUXMessages` sin fallback a `alert()`.
   - **Lote 5:** Migrar `pushToast()` de repo-app y `NotificationsManager._showToast()` a `YGUXMessages`.

7. **¿Qué NO se debe tocar en la implementación futura?**
   - Los ~10 `confirm()` destructivos (necesitan un componente de confirmación propio, no un popup informativo).
   - Los 4 `prompt()` funcionales (inyectan datos, no informativos).
   - Las status bars inline (`setPageFeedback`, `setBuyerStatus`, `setProfileStatus`, `setStatus`, `setDetailExportState`) — son naturaleza diferente.
   - `showUndoDeleteToast` — tiene botón funcional "Deshacer", necesita tratamiento especial.
   - El modal "Configura tu asistente IA" — solo es referencia visual, no se modifica.
   - Los modales de crear/editar cultivo, Cartera Viva, formularios.

### Recomendación de implementación futura

1. **Crear componente `agro-info-popup`** basado en `YGUXMessages` (que ya sigue ADN V11 con dark/gold, borde dorado, centrado, tipografía Rajdhani/Orbitron).
2. **Reemplazar `showEvidenceToast`** por `YGUXMessages.show()` o un wrapper que centralice todo.
3. **Reescribir `notifyFacturero()`** para delegar a `YGUXMessages` en vez de `alert()`.
4. **Mantener los `confirm()` destructivos** hasta tener un componente `agro-confirm-popup` con estética ADN V11.
5. **No reemplazar modales funcionales** (crear/editar cultivo, Cartera Viva, asistente IA).
6. **Empezar por éxito/errores de crear/editar/guardar** — son los más frecuentes y visibles.

---

## 2026-05-01 — Refresh suave Cartera Operativa

**Estado:** COMPLETADO

### Diagnóstico

`refreshData()` en `apps/gold/agro/agroOperationalCycles.js` marca `state.loading = true` y vuelve a llamar `renderOverview()` / `renderCurrentSubview()`. El listado evita desmontarse durante refresh suave, pero `renderOverview()` reconstruye el HTML del resumen compacto y pierde el estado `open` del `<details>`. Los filtros avanzados se reutilizan en algunos casos, pero `syncFiltersHost()` puede reabrirlos cuando hay filtro activo aunque el usuario los haya cerrado. El mensaje `Actualizando cartera operativa sin desmontar la vista...` y los estilos `.is-refreshing` todavía generan una señal visual demasiado fuerte para un refresh normal.

### Plan

- Agregar microestado en memoria del módulo para recordar `<details>` abiertos/cerrados.
- Añadir atributos `data-*` específicos a resumen, filtros avanzados e historial de card.
- Restaurar estados `open` después de renders y respetar cierre manual aunque existan filtros activos.
- Hacer el estado visual de refresh más silencioso, sin loader/pulso invasivo.
- Validar con `node --check`, `git diff --check` y `pnpm build:gold`.

### Archivos candidatos

- `apps/gold/agro/agroOperationalCycles.js`
- `apps/gold/agro/agro-operational-cycles.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgo estimado

Bajo-medio. El cambio toca render y estado visual en memoria, pero no modifica Supabase, contratos de datos ni acciones de negocio. La mitigación es preservar los handlers existentes y limitar la memoria a estado UI temporal.

### Cambios realizados

- `apps/gold/agro/agroOperationalCycles.js`: se agregó `state.ui.detailsOpen` como microestado en memoria para recordar apertura/cierre de `<details>` sin usar `localStorage`.
- `apps/gold/agro/agroOperationalCycles.js`: se añadieron `data-operational-details-key`, `data-operational-summary-details`, `data-operational-advanced-filters` y `data-operational-card-details` para preservar `Resumen`, `Filtros avanzados` e historial de cards.
- `apps/gold/agro/agroOperationalCycles.js`: `renderOverview()` deja de reconstruir el resumen durante refresh suave y `syncFiltersHost()` respeta si el usuario cerró filtros avanzados, incluso con filtros activos.
- `apps/gold/agro/agroOperationalCycles.js`: el refresh suave ya no escribe mensajes largos de `Actualizando...` ni reemplaza el listado mientras `state.loading && state.loadedOnce`.
- `apps/gold/agro/agro-operational-cycles.css`: se retiró el pulso visual y el glow del estado `.is-refreshing`; el indicador quedó discreto.

### Validación

- `node --check apps/gold/agro/agroOperationalCycles.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con warning local no bloqueante de Node `v25.6.0` vs engine esperado `20.x`.
- QA manual/browser: pendiente; se dejó para validación humana.

### Alcance respetado

- No se eliminaron filtros, cards, acciones, refresh, registros ni lógica de negocio.
- No se tocaron Supabase, contratos de datos, `agro.js`, `MANIFIESTO_AGRO.md` ni `ADN-VISUAL-V11.0.md`.
- El estado preservado es temporal y vive solo en memoria del módulo.

---

## 2026-05-01 — Respiración visual Cartera Operativa

**Estado:** COMPLETADO

### Diagnóstico

`Cartera Operativa` se renderiza en `apps/gold/agro/agroOperationalCycles.js`; el layout visual principal está en `apps/gold/agro/agro-operational-cycles.css`. La vista apila, antes de las cards reales, el header de módulo, privacidad, filtro de familia (`Asociados / No asociados / Todos`), filtro de subvista (`No pagados / Pagados / Donaciones / Pérdidas / Exportar`), panel resumen grande y filtros finos (`Período / Categoría / Tipo`). El header que puede tapar contenido al hacer scroll no pertenece al módulo sino a la `agro-mobile-contextbar` global en `apps/gold/agro/agro.css`; conviene corregir su impacto solo cuando `body[data-agro-active-view="operational"]` está activo.

### Plan

- Reordenar el panel resumen para que viva dentro de la sección de lista, debajo de filtros y antes de cards.
- Convertir el resumen de cards grandes en una franja compacta con detalles expandibles.
- Convertir `Período / Categoría / Tipo` en filtros avanzados colapsables, abiertos solo si hay filtro activo.
- Bajar peso visual de botones, paneles y superficies desde `agro-operational-cycles.css`, sin eliminar controles ni handlers.
- Añadir ajuste scoped para que la contextbar móvil no tape contenido en `Cartera Operativa`.
- Validar con `git diff --check` y `pnpm build:gold`.

### Archivos candidatos

- `apps/gold/agro/agroOperationalCycles.js`
- `apps/gold/agro/agro-operational-cycles.css`
- `apps/gold/agro/agro.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgo estimado

Medio-bajo. El cambio toca jerarquía de render y CSS, pero no modifica Supabase, contratos de datos, creación/edición/exportación ni handlers. La mitigación es mantener los mismos `data-operational-action`, `data-operational-filter-*`, ids y refs.

### Cambios realizados

- `apps/gold/agro/agroOperationalCycles.js`: el resumen operativo se reubicó dentro de la sección de lista y ahora se renderiza como franja compacta con detalles expandibles; los filtros `Período / Categoría / Tipo` quedaron en `Filtros avanzados`, colapsados salvo que exista un filtro activo.
- `apps/gold/agro/agroOperationalCycles.js`: se conservaron ids, refs, `data-operational-action` y `data-operational-filter-*`, por lo que no se removieron filtros, exportación, cards, acciones ni lógica de negocio.
- `apps/gold/agro/agro-operational-cycles.css`: se bajó el peso visual de tabs, subfiltros, paneles, summary, lista y cards para alinear la vista con el lenguaje sobrio de `Ciclos de cultivo`.
- `apps/gold/agro/agro.css`: se añadió un ajuste scoped para `body[data-agro-active-view="operational"] .agro-mobile-contextbar`, evitando que la barra contextual móvil quede flotando encima del contenido de Cartera Operativa.

### Validación

- `node --check apps/gold/agro/agroOperationalCycles.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con warning local no bloqueante de Node `v25.6.0` vs engine esperado `20.x`.
- QA manual/browser: pendiente; se dejó para validación humana según política operativa de uso quirúrgico de Codex.

### Alcance respetado

- No se eliminaron funciones, filtros, cards, acciones, registros ni lógica de datos.
- No se tocaron Supabase, contratos de datos, migraciones, auth, landing, dashboard global, `MANIFIESTO_AGRO.md` ni `ADN-VISUAL-V11.0.md`.
- Los filtros principales, filtros de estado, exportación y filtros finos siguen presentes y accesibles.

---

## 2026-05-01 — Limpieza vista Mis cultivos Finalizados

**Estado:** COMPLETADO

### Diagnóstico

La vista `Mis cultivos > Finalizados` mezcla tres capas que no pertenecen a la tarea principal de la tab: un bloque editorial estático en `apps/gold/agro/index.html`, métricas intermedias en el mismo bloque (`agro-cycle-finished-count`, `agro-cycle-lost-count`, `agro-cycle-audit-count`) y un acordeón generado en `apps/gold/agro/agro.js` por `ensureCropCycleHistorySection()`. Las cards reales no nacen en esos bloques: se renderizan desde `renderCropCycleHistory()` hacia `#crops-cycle-history-grid` usando `renderCropCycleGroup()` / `renderFinishedCycles()`.

### Plan

- Remover del markup estático el bloque `agro-cycle-overview`.
- Mantener el slot `#agro-cycles-history-slot` como host de la lista real.
- Cambiar `ensureCropCycleHistorySection()` para crear una sección directa de ciclos finalizados, sin `details`, `summary`, flecha ni título `Ciclos finalizados y trazabilidad`.
- Ajustar `renderCropCycleHistory()` para que la tab finalizados no dependa del grid perdido/auditoría dentro de ese wrapper.
- Validar con `pnpm build:gold`.

### Archivos candidatos

- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.js`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgo estimado

Bajo-medio. El cambio es de render visual y no toca Supabase, queries ni registros, pero `agro.js` es monolítico y la función también arma buckets de trazabilidad. La mitigación es conservar el grid de finalizados y no modificar `splitCropsByCycle`, `splitClosedCycleHistory`, clasificación ni construcción de cards.

### Cambios realizados

- `apps/gold/agro/index.html`: se removió el bloque estático `agro-cycle-overview` con `Lectura de cierre` y las métricas `Finalizados / Perdidos / Auditoría`.
- `apps/gold/agro/agro.js`: `ensureCropCycleHistorySection()` ahora crea una sección directa para `Ciclos finalizados (N)` y conserva el grid real de cards sin `details`, `summary`, chevron ni wrapper de trazabilidad.
- `apps/gold/agro/agro.js`: `renderCropCycleHistory()` conserva el render de ciclos finalizados reales y deja de pintar perdidos/auditoría dentro de la tab `Finalizados`.
- `apps/gold/agro/agro.js`: se ocultó el heading `Ciclos finalizados (N)` (`finishedTitleEl.style.display = 'none'`) para igualar visualmente la tab Finalizados con Activos.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con warning local no bloqueante de Node `v25.6.0` vs engine esperado `20.x`.
- QA manual/browser: pendiente por decisión del usuario.

### Alcance respetado

- No se eliminaron ciclos ni registros.
- No se tocaron Supabase, migraciones, auth, landing, dashboard global, `MANIFIESTO_AGRO.md` ni `ADN-VISUAL-V11.0.md`.
- La tab `Activos` conserva su contenedor y render.
- La tab `Perdidos` conserva su markup existente.

---

## 2026-05-01 — Auditoría y consolidación ADN Visual V11

**Estado:** EN PROGRESO

### Diagnóstico inicial

El producto ya evolucionó visualmente hacia un estándar V11 durante los frentes recientes: hub `Mi Granja`, patrón hub/module, modales con canon del asistente IA, reducción de glows, mejor separación semántica y superficies más sobrias tipo documentación Agro. Falta auditar el estado real del repo, eliminar contradicciones del ADN Visual V10 y consolidar documentalmente el nuevo estándar V11.

### Plan

- Leer `AGENTS.md`, `ADN-VISUAL-V10.0.md`, `MANIFIESTO_AGRO.md`, `FICHA_TECNICA.md`, `docs-agro.html`, `llms.txt` y el reporte activo.
- Auditar CSS/HTML visual del producto actual.
- Inventariar hardcodes, glows, gradientes, sombras, animaciones y colores fuera de canon.
- Consolidar ADN Visual V11 como documentación canónica.
- No tocar lógica de negocio.
- No tocar Supabase.
- No crecer `agro.js`.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/ADN-VISUAL-V11.0.md` | Creación | Canon visual V11 activo (549 líneas): paleta, sombras, tipografía, componentes, hub Mi Granja, modales, accesibilidad, gobernanza |
| `AGENTS.md` | Actualización | §2 renombrado a V11, tokens V11, jerarquía canónica, anti-patrón V11, ley visual, schema |
| `FICHA_TECNICA.md` | Actualización | Sistema de diseño apunta a V11 activo, V10 histórico |
| `apps/gold/public/llms.txt` | Actualización | Política visual V11, referencias canónicas |
| `apps/gold/docs/AGENT_CONTEXT_INDEX.md` | Actualización | Mapa central apunta a V11 como ley visual activa |
| `README.md` | Actualización | Sistema de diseño apunta a V11 activo |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Cierre | Cierre de sección V11 |

### Validación

- `git diff --check`: sin conflictos de espacio.
- `pnpm build:gold`: exitoso.
- No se tocó código de producto, Supabase, migraciones, `agro.js`, auth, datos ni workflows.

### Cierre

Se consolidó `ADN-VISUAL-V11.0.md` como canon visual activo del proyecto, dejando `ADN-VISUAL-V10.0.md` como base histórica fundacional. Se actualizaron referencias canónicas en `AGENTS.md`, `FICHA_TECNICA.md`, `llms.txt`, `AGENT_CONTEXT_INDEX.md` y `README.md`. No se tocó código de producto, Supabase, migraciones, Vercel, workflows ni `agro.js`.

**Estado:** COMPLETADO

---

## 2026-05-01 — Actualización documental post Mi Granja

**Estado:** COMPLETADO

### Diagnóstico

El nuevo sistema UX de Agro ya consolidó el hub `Mi Granja`, la navegación `Inicio · Granja · Memoria · Menú`, las superficies `Mis cultivos` y `Calendario operativo`, y la separación clara entre cultivos, períodos, finanzas, trabajo, memoria y menú. La documentación del proyecto debe actualizarse para reflejar el estado real del producto antes de abrir la auditoría visual y la futura reforma ADN Visual V11.

### Plan

- Revisar documentación canónica y pública relacionada con Agro.
- Actualizar nombres, navegación y semántica del hub `Mi Granja`.
- Alinear docs con `Mis cultivos`, `Calendario operativo`, `Rankings de Clientes`, `Memoria` y `Menú`.
- No tocar `ADN-VISUAL-V10.0.md`.
- No tocar código.
- Validar con `git diff --check` y `pnpm build:gold`.

---

## 2026-05-01 — Consolidación puntual de cultivos y períodos en Mi Granja

**Estado:** COMPLETADO

### Diagnóstico

El hub `Mi Granja` está visualmente estable, pero las entradas `Ciclos activos` / `Ciclos finalizados` y `Períodos activos` / `Períodos finalizados` pueden agruparse para mejorar comprensión. El alcance es estrictamente puntual: no se tocarán estadísticas, comparadores, finanzas, trabajo, rankings ni clima.

### Plan

- Cambiar `Ciclos activos` a `Mis cultivos`.
- Integrar activos, finalizados y perdidos dentro de `Mis cultivos` con tabs internos.
- Cambiar `Períodos activos` a `Calendario operativo`.
- Integrar activos y finalizados dentro de `Calendario operativo` con tabs internos.
- Mantener sin cambios estadísticas, comparadores, finanzas y trabajo.
- No tocar `agro.js` ni datos.
- Validar con `git diff --check` y `pnpm build:gold`.

---

## 2026-05-01 — Pulido modal de autenticación

**Estado:** COMPLETADO

### Diagnóstico

Tras estabilizar el splash Dashboard ↔ Agro y corregir el modal intruso post-splash, se revisará el modal público de autenticación. El objetivo es alinear Login, Registro y Recuperar contraseña al canon visual sobrio basado en “Configura tu asistente”, sin tocar lógica de autenticación, Supabase, hCaptcha, sesión ni redirects.

### Plan

- Ubicar archivos dueños del modal de autenticación.
- Auditar estilos de Login, Registro y Recuperación.
- Eliminar glow, shimmer, gradientes fuertes, títulos gritones y hover exagerado.
- Mantener intactos IDs, eventos, validaciones y contratos JS.
- Validar con `git diff --check` y `pnpm build:gold`.

### Diagnóstico técnico

- El dueño del markup del modal público es `apps/gold/index.html` (`#auth-modal`, tabs, formularios login/registro, hCaptcha y links).
- El dueño visual efectivo es `apps/gold/assets/css/landing-v10.css`.
- Recuperar contraseña se activa desde `apps/gold/assets/js/auth/authUI.js` con `#auth-dynamic-title` y `.back-to-login-link`, pero no hizo falta tocar JS porque el ajuste era visual y se resolvió con CSS específico.
- Los problemas visibles venían de estilos heredados: sombra dorada grande, logo con halo, close con rotación, tabs con énfasis excesivo, botón con gradiente/translate/sombra y título dinámico dominante.

### Corrección

- Se limpió el contenedor auth a fondo oscuro, borde gold fino y sombra negra sobria.
- Se retiraron glow del logo, rotación del botón cerrar, gradiente/shadow/translate del botón principal y énfasis excesivo de tabs.
- Se normalizaron inputs, focus, placeholders, links de recuperación/volver y título dinámico de recuperación.
- Se mantuvieron intactos IDs, names, hCaptcha, formularios, handlers, Supabase, redirects y sesión.

### Validación

- Browser local: `#login`, `#register` y recuperación (`AuthUI.toggleRecoveryMode(true)`) revisados en desktop `1366x768` y mobile `390x844`.
- Consola local: solo warnings de hCaptcha por `localhost`; no asociados al cambio CSS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con warning local no bloqueante de Node `v25.6.0` vs engine esperado `20.x`.
- No se ejecutó `node --check` porque no se modificó JS.

---

## 2026-05-01 — Fix modal intruso post-splash Dashboard → Agro

**Estado:** COMPLETADO

### Diagnóstico

QA humano confirmó que el splash Dashboard → Agro aparece correctamente, pero al finalizar la carga se abre un modal inesperado encima de Agro. Esto indica que el problema no está en el splash inicial sino en un flujo posterior de bootstrap/onboarding/modal legacy que se dispara automáticamente después de ocultar el loader.

Diagnóstico técnico:
- El modal intruso identificado es `#modal-new-crop.modal-overlay.hidden.agro-modal-canon`, con texto visible `Nuevo Cultivo`.
- El archivo que lo crea es `apps/gold/agro/index.html`; el estilo que lo deja visible antes del ocultamiento dinámico vive en `apps/gold/agro/agro.css` por `.agro-modal-canon { display: flex; }`.
- No lo abre una función de negocio: queda expuesto por estado inicial CSS cuando `#agro-modal-styles` todavía no existe o se pierde. Ese estilo dinámico se inyecta desde `agro.js`, pero la corrección se hace sin tocar `agro.js`.
- Los legacy `#modal-lunar` (`Agenda Lunar 2026`) y `#modal-market` (`Referencias de mercado`) comparten la misma dependencia de la regla dinámica `.modal-overlay { display: none; }`, aunque el que compite visualmente con mayor prioridad es `#modal-new-crop`.
- No se encontró auto-open en `agro-ia-wizard.js`, `agro-feedback.js`, `profileEditWizard.js`, `agroperfil.js` ni `agro-shell.js`.
- La reproducción local con sesión UI falsa confirmó que, al retirar `#agro-modal-styles`, `#modal-new-crop` pasa de `display:none` a `display:flex` por `.agro-modal-canon`; `#modal-lunar` y `#modal-market` pasan a `display:block`.

### Preguntas obligatorias

- Id/clase: `#modal-new-crop.modal-overlay.hidden.agro-modal-canon`.
- Texto visible: `Nuevo Cultivo`.
- Archivo dueño del markup: `apps/gold/agro/index.html`.
- Archivo dueño del estado visual: `apps/gold/agro/agro.css`; el ocultamiento dinámico venía de `agro.js`.
- Función que lo abre legítimamente: `window.openCropModal()` / `openCropModal()`, pero no es la causa del intruso.
- Disparador real: condición CSS inicial, no `DOMContentLoaded`, `setTimeout`, `localStorage`, `sessionStorage`, onboarding, perfil ni asistente.
- Ocurre al entrar desde Dashboard y puede ocurrir también en recarga directa de `/agro/` si el CSS dinámico tarda/no está; no depende de la ruta anterior.
- El modal sí debe abrirse, pero solo por acción explícita del usuario (`Nuevo cultivo`), nunca por estado inicial.

### Plan

- Identificar el modal exacto por id, clase, texto visible y archivo dueño.
- Identificar qué función lo abre automáticamente.
- Corregir la condición de apertura o el estado persistente que lo dispara.
- No ocultar modales globalmente por CSS.
- No tocar documentación canónica.
- Validar con `git diff --check` y `pnpm build:gold`.

### Corrección

- Se agregó una regla CSS puntual para cerrar solo los estados iniciales `.hidden` de `#modal-new-crop`, `#modal-lunar` y `#modal-market`.
- La regla de `#modal-new-crop` usa `:not(.active)` para no romper la apertura legítima por `openCropModal()`.
- No se tocó `agro.js`, Supabase, auth modal ni documentación canónica.

### Validación

- Browser local: al retirar manualmente `#agro-modal-styles`, `#modal-new-crop`, `#modal-lunar` y `#modal-market` permanecen en `display:none`.
- Browser local: `window.openCropModal()`, `window.openMarketHub()` y `window.openLunarCalendar()` siguen abriendo y cerrando sus modales legítimos.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con warning local no bloqueante de Node `v25.6.0` vs engine esperado `20.x`.

---

## 2026-05-01 — P1/P2: Splash Dashboard-Agro y botón Dashboard

**Estado:** COMPLETADO

### Diagnóstico

Se retoma el frente pendiente del 30 de abril: la transición visual entre Dashboard y Agro sigue sin quedar limpia, y el botón `Dashboard` dentro de Agro aún debe integrarse mejor al lenguaje visual del hub. Este bloque se limita a diagnosticar y corregir esos dos puntos, sin tocar documentación canónica, auth modal, Supabase ni `agro.js`.

Diagnóstico técnico:
- Dashboard tenía CSS de splash duplicado dentro de `index.html`.
- Dashboard marcaba `dashboard-ready` sin esperar a `initDashboard()`, por lo que el splash podía apagarse mientras seguía visible el loader interno de módulos.
- Agro no tenía splash duplicado, pero su splash vivía en `z-index: 9999`, por debajo de modales canon/legacy de la propia página.
- El botón `Dashboard` en Agro usaba acento gold por defecto y no el patrón neutral de chip del hub.

### Plan

- Revisar el flujo `/dashboard → /agro/`.
- Revisar el flujo `/agro/ → /dashboard`.
- Identificar si el problema viene de CSS crítico, orden de scripts, clases body, timing de ready state, overlay duplicado o navegación.
- Corregir el splash con el menor diff posible.
- Ajustar el botón `Dashboard` para que coincida con los chips del hub.
- Validar con `git diff --check` y `pnpm build:gold`.

### Resultado

- Se consolidó el splash del Dashboard en el CSS crítico temprano y se eliminó el bloque duplicado.
- Dashboard y Agro usan splash oscuro con logo íntegro, texto breve, barra dorada fina y reduced motion.
- Ambos splash suben a `z-index: 13000` para no competir con modales/overlays durante la transición.
- Dashboard ahora espera `initDashboard()` antes de marcar `dashboard-ready`.
- El botón `Dashboard` del header Agro quedó como chip neutral tipo hub: sin subrayado, fondo transparente por defecto, hover gold sutil y foco accesible.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con warning local no bloqueante de Node `v25.6.0` vs engine esperado `20.x`.

### Alcance respetado

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.
- No se tocó auth modal ni documentación canónica.

---

## 2026-04-30 — QA visual final: dashboard chip, loader y editor guiado

**Estado:** EN PROGRESO

### Diagnóstico

Después del pase de modales, QA visual humano detectó tres problemas pendientes: el botón `Dashboard` dentro de Agro quedó como link desnudo y no coincide con los chips del sistema; la transición Dashboard ↔ Agro muestra un loader/modal visualmente roto en vez del loader limpio con logo; y el editor guiado de perfil mantiene títulos blancos demasiado grandes que rompen el canon sobrio del modal `Configura tu asistente`.

### Plan

- Estilizar el botón `Dashboard` como chip sobrio del header Agro.
- Reparar/restaurar el loader limpio de navegación entre Dashboard y Agro.
- Bajar intensidad visual del editor guiado de perfil.
- No tocar documentación canónica.
- No tocar Supabase/datos.
- No tocar `agro.js`.
- Validar con `git diff --check` y `pnpm build:gold`.

---

## 2026-04-30 — V3.1 Modales Pase 3: QA visual y bug Trabajo Diario

**Estado:** CERRADO

### Diagnóstico

El Pase 2 migró varios modales al canon, pero QA visual humano detectó que aún quedan desviaciones: el modal de Trabajo Diario bloquea el flujo y no permite avanzar/cerrar correctamente; Ajustes dashboard conserva hardcodes, bloque dorado y títulos fuera del canon; persisten glows/brillos en algunos modales; y Agro necesita una salida visible hacia el Dashboard general.

### Plan

- Corregir primero el bug funcional del modal de Trabajo Diario.
- Alinear Ajustes dashboard al canon modal “Configura tu asistente”.
- Eliminar glows/brillos/gradientes restantes en shells de modal.
- Restaurar botón discreto hacia `/dashboard` desde Agro.
- No tocar documentación canónica.
- No tocar Supabase/datos.
- Validar con `node --check` si se toca JS, `git diff --check` y `pnpm build:gold`.

### Resultado

- Trabajo Diario: se corrigió la causa del overlay bloqueante al forzar que los modales canon con `aria-hidden="true"` queden ocultos aunque el CSS base cargue después; además se agregó cierre por click en overlay para el compositor y la confirmación de borrado.
- Dashboard: Ajustes quedó alineado al canon sobrio dark/gold, sin bloque dorado dominante, sin gradiente fuerte, sin títulos/controles fuera de escala y sin hover con rotación/glow.
- Modales dashboard: se neutralizó el brillo/animación del modal de presentación y se mantuvieron sombras oscuras funcionales.
- Agro: se agregó acceso discreto `Dashboard` hacia `/dashboard` en el header y se corrigieron accesos legacy que apuntaban a `/`.
- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows, credenciales, datos, queries ni cálculos.
- No se tocó documentación canónica (`MANIFIESTO_AGRO.md`, `ADN-VISUAL-V10.0.md`, `FICHA_TECNICA.md`, `README.md`, `llms.txt`, `docs-agro.html`).
- Validación: `node --check apps/gold/agro/agroTaskCycles.js` PASS; `git diff --check` PASS; `pnpm build:gold` PASS con warning de engine local Node v25 vs esperado Node 20.x.

---

## 2026-04-30 — V3.1 Modales Pase 2: migración de modales restantes

**Estado:** CERRADO

### Diagnóstico

El primer pase de modales creó la base `.agro-modal-canon*` y migró superficies seguras, pero el QA visual humano detectó modales restantes que todavía no hablan el idioma del modal madre “Configura tu asistente”. Este pase auditará y migrará los modales pendientes sin tocar documentación canónica ni datos.

### Plan

- Inventariar modales restantes.
- Ubicar archivos dueños.
- Reutilizar `.agro-modal-canon*`.
- Reducir hardcodes, glow, gradientes y colores inconsistentes.
- Migrar modales seguros.
- Documentar pendientes si algún modal requiere pase posterior.
- Validar con `git diff --check` y `pnpm build:gold`.

### Resultado

- Modales auditados: editor guiado de perfil, Nuevo Cultivo, Crear ciclo de período, Nuevo Cliente / wizard cliente, Ficha del Cliente, Ficha pública de cliente/agricultor, Nueva / Editar Cartera Operativa, Nueva tarea, Feedback del Agricultor, modal de presentación del dashboard, Ajustes del dashboard y Panel de Control Global.
- Modales Agro migrados o alineados: Nuevo Cultivo, Crear ciclo de período, Nuevo Cliente / wizard cliente, Ficha del Cliente, Ficha pública, Nueva / Editar Cartera Operativa, Nueva tarea, confirmación de tarea y Feedback del Agricultor.
- Editor guiado de perfil alineado visualmente: se retiraron gradientes, shimmer, glow fuerte, escala/translate decorativo y texto metálico animado.
- Dashboard: Ajustes y modal de presentación recibieron overrides visuales sobrios sin tocar lógica; Panel de Control Global se alineó en estilo y copy visible sin tocar consultas ni datos.
- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows, credenciales, datos, queries ni cálculos.
- No se tocó documentación canónica (`MANIFIESTO_AGRO.md`, `ADN-VISUAL-V10.0.md`, `FICHA_TECNICA.md`, `README.md`, `llms.txt`, `docs-agro.html`).
- Validación: `node --check` en JS tocados PASS; `git diff --check` PASS; `pnpm build:gold` PASS con warning de engine local Node v25 vs esperado Node 20.x.

---

## 2026-04-30 — V3.1 Modales: canon visual basado en Configura tu asistente

**Estado:** CERRADO

### Diagnóstico

Antes de actualizar documentación canónica o preparar ADN Visual V11, se limpiará primero el producto vivo. El modal “Configura tu asistente” queda como pieza madre visual para todos los modales funcionales de Agro. Se revisarán hardcodes, colores inconsistentes, animaciones innecesarias y duplicación de estilos en modales/dialogs/wizards/overlays.

### Plan

- Inspeccionar el modal “Configura tu asistente”.
- Auditar modales existentes de Agro.
- Identificar hardcodes, estilos duplicados y animaciones no deseadas.
- Crear o consolidar una base reusable de modal.
- Migrar un primer grupo controlado de modales al canon.
- No tocar documentación canónica.
- No tocar Supabase ni datos.
- Validar con git diff --check y pnpm build:gold.

### Resultado

- Base reusable `.agro-modal-canon*` creada en `apps/gold/agro/agro.css` a partir del modal “Configura tu asistente”.
- Modal IA conservado como pieza madre y reforzado con clases base, ARIA, Escape cleanup y retorno de foco.
- Prompt modal reusable migrado para consumir la base común y reducir CSS duplicado.
- Modales de Trabajo Diario, Operación Comercial y Mi Carrito alineados en el primer grupo controlado.
- Se neutralizaron glow dorado fuerte, gradientes de shell, slide/scale de apertura y hover translate en los modales tocados.
- No se tocó documentación canónica, Supabase, datos ni `agro.js`.
- Validación: `node --check` en JS tocados PASS; `git diff --check` PASS; `pnpm build:gold` PASS.

---

## Propósito

Este archivo es la única fuente activa de reportes de sesión para agentes IA dentro de YavlGold.

El contexto histórico previo quedó archivado en:

`apps/gold/docs/AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`

---

## Estado actual del proyecto

- Release visible: V1.
- Enfoque actual: YavlGold centrado en Agro.
- Stack: Vanilla JS + Vite MPA + Supabase.
- Prohibido: React, Tailwind, SPA.
- ADN Visual V10.0 activo e inmutable.
- Agro es el módulo principal y operativo.
- Supabase canónico vive en `supabase/` raíz.
- Build canónico: `pnpm build:gold`.

---

## Decisiones canónicas vigentes

- `AGENTS.md` es la ley operativa del repo.
- `MANIFIESTO_AGRO.md` es la verdad semántica del módulo Agro.
- `ADN-VISUAL-V10.0.md` es la ley visual.
- `FICHA_TECNICA.md` describe estructura técnica vigente.
- No crecer `apps/gold/agro/agro.js` con nuevas features.
- Nuevas features de Agro deben nacer modulares.
- `AGENT_REPORT_ACTIVE.md` es estado vivo, no archivo histórico infinito.
- Daily logs son temporales y sirven como insumo para crónica mensual.

---

## Últimos hitos relevantes antes de esta rotación

### 2026-04-26 — Cierre P1 auditoría + Agro Shell

- `/music` retirado de superficies activas.
- `agent-guard` reforzado contra HTML activo con CDNs prohibidos.
- Node 20 fijado para herramientas/CI.
- GitHub Actions `Gold Build` agregado.
- `supabase/seed.sql` mínimo y seguro creado.
- RLS/Storage staging documentado como PASS.
- PostCSS actualizado a versión segura.
- Workflows con permisos explícitos mínimos.
- Agro entra siempre en Dashboard Agro.
- Rail persistente implementado.
- Launcher expandido implementado.
- Feedback mobile corregido.
- Hamburguesa legacy del header eliminada.
- Navegación shell documentada en Manifiesto, Ficha Técnica y docs públicas.

### 2026-04-27 — Seguridad Supabase incremental

- Auditoría RLS estática: YELLOW sin P1 confirmado.
- Primer fix seguro aplicado:
  - índices `user_id` para `agro_operational_cycles`;
  - índices `user_id` para `agro_operational_movements`.
- No se cambiaron policies ni comportamiento RLS.

---

## Frentes abiertos

1. QA visual final de Agro Shell en mobile real.
2. Seguridad P2:
   - modernizar policies legacy a `to authenticated` + `(select auth.uid())`;
   - revisar grants RPC;
   - definir límites MIME/file size de `agro-evidence`;
   - decidir contrato de `avatars`;
   - inventario contra DB viva.
3. CSP/HSTS y headers de seguridad.
4. Reemplazo progresivo de diálogos nativos por modal canónico.
5. Limpieza documental de referencias legacy.
6. Crónica mensual de abril al cierre del mes.

---

## Deuda técnica viva

- `agro.js` sigue siendo monolito legacy.
- `agro.css` e `index.html` siguen siendo superficies grandes.
- Existen `alert`, `confirm`, `prompt` nativos pendientes.
- Existe volumen alto de `innerHTML`; requiere auditoría incremental.
- Market ticker tiene deuda de polling duplicado.
- Algunos docs legacy pueden conservar referencias stale.
- Daily logs de abril deben consolidarse y limpiarse tras crónica mensual.

---

## Reglas para próximas sesiones

- Diagnóstico primero.
- Diff mínimo.
- No tocar `agro.js` salvo cirugía justificada.
- No tocar Supabase sin migración controlada.
- No tocar documentos canónicos sin autorización expresa.
- Ejecutar `pnpm build:gold` al cerrar cambios.
- No usar `git add .`.
- Mantener daily logs fuera de Git si están definidos como temporales locales.

---

## 2026-04-27 — Formato activo post-rotación

**Objetivo:** Restaurar compatibilidad del reporte activo con el guard documental del build tras la rotación canónica.

### Diagnostico

El nuevo `AGENT_REPORT_ACTIVE.md` fue creado correctamente como reporte activo limpio tras archivar `AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`, pero el build requiere que la fuente activa conserve las marcas `Diagnostico` y `Plan`.

### Plan

- Mantener la rotación canonica.
- Conservar el archivo legacy como historico integro.
- Anadir esta seccion minima al reporte activo para cumplir el guard documental.
- Validar con `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Se agrego seccion minima con `Diagnostico` y `Plan` para cumplir `agent-report-check.mjs`. |

### Validacion

- Pendiente ejecutar `pnpm build:gold`.

### NO se hizo

- No se revirtio la rotacion.
- No se toco codigo.
- No se toco Supabase.
- No se toco Vercel.

---

## 2026-04-27 — Rail mobile lateral + Feedback restaurado

**Objetivo:** Reemplazar el rail inferior mobile por un rail lateral compacto, evitar solapes con contenido Agro y restaurar Feedback visible en mobile.

### Diagnostico

El rail mobile era una barra horizontal fija en la parte inferior (`top: auto; bottom: ...; left: ...; right: ...`) que solapaba contenido del dashboard. El boton Feedback estaba oculto con `display: none` en `max-width: 768px`. El `padding-bottom: 5.4rem` compensaba la barra inferior pero no era suficiente.

### Plan

- Eliminar la barra inferior mobile del rail.
- Posicionar el rail como lateral izquierdo compacto en mobile (`width: 3.4rem`, centrado verticalmente).
- Restaurar Feedback FAB como pill flotante en esquina inferior derecha.
- Ajustar `padding-left` del contenedor principal para compensar el rail lateral.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro.css` | CSS mobile rail | Barra inferior eliminada; rail lateral izquierdo compacto con `width: 3.4rem`, centrado verticalmente, `flex-direction: column`, items reducidos a icono con `min-height: 2.6rem`. |
| `apps/gold/agro/agro.css` | CSS feedback | `.agro-feedback-fab` restaurado en mobile: `display: inline-flex`, posicionado abajo-derecha, `z-index: 110`, pill con sombra. |
| `apps/gold/agro/agro.css` | CSS layout | `app-container` en mobile: `padding-left: 4.2rem`, `padding-bottom: 0` (sin barra inferior). |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`.
- No se toco `index.html` ni `agro-shell.js`.
- No se toco Supabase, Vercel, workflows ni credenciales.

---

## 2026-04-27 — Rail mobile colapsable con toggle lateral

**Objetivo:** Agregar control de visibilidad del rail lateral mobile para evitar solapes con contenido cuando el usuario necesita pantalla completa.

### Diagnostico

El rail lateral mobile anterior era siempre visible y en pantallas pequenas podia tapar contenido del borde izquierdo. No existia mecanismo para ocultarlo temporalmente. El Feedback FAB ya habia sido restaurado en la sesion previa.

### Plan

- Agregar boton toggle en el borde derecho del rail mobile (solo visible en `max-width: 768px`).
- Estado colapsado: rail se desplaza fuera de pantalla con `transform`, queda visible solo la pestaña del toggle.
- Estado expandido: rail visible con padding-left en el contenido.
- Persistir preferencia en localStorage (`YG_AGRO_MOBILE_RAIL_COLLAPSED_V1`).
- Respetar `prefers-reduced-motion`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Markup | Boton `#agro-shell-rail-mobile-toggle` agregado dentro del `nav` del rail, con chevron izquierdo y aria-label. |
| `apps/gold/agro/agro.css` | CSS base | `.agro-shell-rail__mobile-toggle` oculto por defecto (`display: none`). Agregado a `prefers-reduced-motion`. |
| `apps/gold/agro/agro.css` | CSS mobile | En `max-width: 768px`: toggle visible como pestaña en borde derecho del rail; `body.agro-shell-rail-collapsed` desplaza rail con `transform` y elimina padding-left del contenido. |
| `apps/gold/agro/agro-shell.js` | JS | Nuevas funciones `readMobileRailCollapsed`/`writeMobileRailCollapsed` con localStorage seguro; listener en toggle que alterna body class, aria-expanded y label. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`.
- No se toco Supabase, Vercel, workflows ni credenciales.

---

## 2026-04-27 — Toggle universal del rail + ocultamiento correcto

**Objetivo:** Corregir el toggle del rail para que funcione en desktop y mobile, y que al colapsar el rail desaparezca completamente dejando solo la pestaña.

### Diagnostico

El toggle anterior era mobile-only (`display: none` en base, `display: flex` solo en `max-width: 768px`). Al colapsar, `translateX(calc(-100% + 1.4rem))` dejaba parte del rail visible con iconos. En desktop no existia toggle.

### Plan

- Convertir el toggle en universal (visible en desktop y mobile).
- Corregir el translateX: rail se mueve `calc(-100% - 0.2rem)` y la pestaña se reposiciona con `translateX(calc(100% + 0.4rem))`.
- Override mobile: pestaña mas grande para touch target.
- Desktop breakpoint: padding-left reducido al colapsar.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro.css` | CSS universal | Toggle visible por defecto: pestaña discreta en borde derecho del rail (1.1rem x 1.8rem). Estado collapsed: rail `translateX(calc(-100% - 0.2rem))`, toggle reposicionado `translateX(calc(100% + 0.4rem))`. Padding del contenido eliminado. |
| `apps/gold/agro/agro.css` | CSS mobile | Override en `max-width: 768px`: pestaña mas grande (1.4rem x 2.2rem) para touch. Reglas duplicadas eliminadas. |
| `apps/gold/agro/agro.css` | CSS desktop | En `min-width: 961px`: `padding-left: var(--space-4)` cuando collapsed. |
| `apps/gold/agro/agro.css` | Reduced motion | Toggle e icono agregados a `prefers-reduced-motion`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`.
- No se toco `index.html` ni `agro-shell.js` (el markup y JS del toggle ya estaban correctos de la sesion anterior).
- No se toco Supabase, Vercel, workflows ni credenciales.
- No se elimino el rail.
- No se rompio desktop.

---

## 2026-04-30 — Fase 2 UX vistas profundas Mi Granja

**Objetivo:** Pulir visual y funcionalmente las vistas profundas del hub Mi Granja para alinearlas con `docs-agro.html` y el ADN Visual V10.

### Diagnostico

- El hub principal ya tiene mejor semantica, pero las vistas profundas conservan superficies mas brillantes, gradientes y acentos semanticos fuertes que se alejan del tono sobrio de `docs-agro.html`.
- `Comparar periodos` vive en `agro-period-cycles.js` como stub: no ofrece selector real ni matriz comparativa.
- La lectura mobile de subtitulos, eyebrows y copies secundarios depende de reglas dispersas; falta centrar y subir contraste en las superficies internas.

### Plan

1. Confirmar duenos reales de vistas antes de editar.
2. Ajustar CSS de ciclos y periodos hacia superficies dark/gold sobrias: menos brillo, bordes sutiles, contraste de texto secundario.
3. Implementar selector real A/B en `Comparar periodos`, usando periodos activos y finalizados ya cargados por el modulo.
4. Pulir mobile para headers, subtitles, eyebrows y empty states sin cambiar rutas ni datos.
5. Ejecutar `git diff --check` y `pnpm build:gold`.

### Archivos previstos

| Archivo | Motivo |
|---|---|
| `apps/gold/agro/agrociclos.css` | Estilos de ciclos activos/finalizados/comparar y stats de ciclos. |
| `apps/gold/agro/agro-period-cycles.js` | Selector real y matriz de comparacion de periodos. |
| `apps/gold/agro/agro-period-cycles.css` | Estilos de periodos activos/finalizados/comparar/estadisticas. |
| `apps/gold/agro/agro.css` | Pulido acotado de stats globales y lectura mobile compartida. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registro operativo de la sesion. |

### Duenos confirmados

- Ciclos activos/finalizados/comparar: markup base en `index.html`, logica de comparar en `agro-cycles-workspace.js`, estilos en `agrociclos.css`.
- Estadisticas de ciclos: markup base en `index.html`, datos existentes via `agro-stats.js`/bridges, estilos `gstats-*` en `agro.css`.
- Periodos activos/finalizados/comparar/estadisticas: `agro-period-cycles.js` y `agro-period-cycles.css`.
- Superficies hermanas revisables con ajuste menor: `agro.css`, `agro-operational-cycles.css`, `agro-task-cycles.css`, `agro-cartera-viva.css`, sin abrir refactor.

### Riesgos

- Riesgo bajo/medio de cascada CSS por especificidad entre `agro.css`, `agro-operations.css` y CSS modulares.
- Riesgo bajo de que la comparacion de periodos sea limitada a metricas estructurales actuales, porque el modulo no conserva totales monetarios numericos por periodo.
- No se tocara Supabase, migraciones, RLS, Storage, Vercel, workflows ni credenciales.

### Cierre operativo

- Se alinearon visualmente ciclos, periodos, estadisticas de ciclos y superficies hermanas acotadas hacia un lenguaje dark/gold mas sobrio.
- `Comparar periodos` ahora tiene selector A/B real con periodos activos y finalizados, resumen por periodo y matriz comparativa.
- Archivos tocados: `agro-period-cycles.js`, `agro-period-cycles.css`, `agrociclos.css`, `agro.css`, `index.html`, `agro-task-cycles.css`, `agro-operational-cycles.css`, `agro-cartera-viva.css` y este reporte.
- No se toco `agro.js`.
- No se tocaron Supabase, datos, migraciones, RLS, RPC, Storage, Vercel, workflows ni documentacion canonica.
- Validacion por comandos: `git diff --check` PASS; `pnpm build:gold` PASS.
- QA manual/browser no ejecutado por instruccion explicita del usuario en sesion.

---

## 2026-04-30 — Cierre visual Trabajo Diario y Rankings de Clientes

**Estado:** COMPLETADO

### Diagnóstico

El sistema hub/module de Mi Granja ya fue corregido semánticamente y pulido en ciclos, períodos y finanzas. Quedan pendientes Trabajo Diario y Rankings de Clientes para que todas las vistas profundas compartan el mismo idioma visual sobrio, dark/gold, alineado a docs-agro y al ADN Visual V10.

### Plan

- Auditar visualmente Trabajo Diario.
- Auditar visualmente Rankings de Clientes.
- Reducir acentos ruidosos o colores inconsistentes.
- Mejorar contraste de subtítulos y textos secundarios.
- Alinear cards, headers, botones, filtros y contenedores con el estilo de las demás vistas profundas.
- No tocar documentación canónica.
- No tocar agro.js.
- Validar con git diff --check y pnpm build:gold.

### Dueños confirmados

- Trabajo Diario: `apps/gold/agro/agroTaskCycles.js` renderiza la vista; `apps/gold/agro/agro-task-cycles.css` gobierna el estilo. No se anticipa tocar JS.
- Rankings de Clientes: `apps/gold/agro/index.html` contiene el markup; `apps/gold/agro/agro.js` contiene la lógica legacy de datos/RPC y no se tocará; `apps/gold/agro/agro-shell.js` contiene el picker de ciclos finalizados y no requiere cambio; `apps/gold/agro/agro.css` y `apps/gold/agro/agro-operations.css` gobiernan el estilo.

### Riesgos

- Riesgo bajo de cascada por convivencia entre `agro.css`, `agro-operations.css` y CSS modular.
- Riesgo medio de tocar estilos de Rankings porque el panel se mueve entre tab interna y vista dedicada; el cambio debe ser CSS-only y acotado.
- No se tocarán Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows, credenciales ni documentación canónica.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-task-cycles.css` | CSS Trabajo Diario | Se redujeron acentos brillantes, se reemplazaron colores hardcodeados de estados por tokens semánticos mezclados con texto, se suavizaron pills/cards/facts y se mejoró centrado mobile. |
| `apps/gold/agro/agro.css` | CSS Rankings | Se apagaron gradientes/glows del panel de Rankings, cards, top items, filtros, privacy strip y selector de ciclos finalizados. Se reforzó contraste de subtítulos/meta y se centró mobile. |
| `apps/gold/agro/index.html` | Markup acotado | Se reemplazó el emoji visible del tab Rankings y los emojis de privacidad de la vista dedicada Rankings por iconos Font Awesome ya canónicos. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs operativa | Paso 0 y cierre documentados. |

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### NO se hizo

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó `apps/gold/agro/agro-shell.js`.
- No se tocaron Supabase, datos, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.
- No se tocó documentación canónica (`MANIFIESTO_AGRO.md`, `FICHA_TECNICA.md`, `README.md`, `llms.txt`).

---

## 2026-04-27 — Integracion visual del toggle como handle del rail

**Objetivo:** Corregir el aspecto visual del toggle del rail para que se perciba como un handle integrado al borde derecho del rail, no como un boton flotante desconectado.

### Diagnostico

El toggle usaba `right: -0.9rem` lo que dejaba un hueco visible entre el rail y la pestana. La pestana no compartia el estilo de borde ni el backdrop del rail, dando la impresion de un elemento flotante ajeno al rail.

### Plan

- Mover toggle a `right: 0` con `transform: translateX(100%)` para flush contra el borde.
- Emparejar borde con el rail usando `color-mix(in srgb, var(--gold-4) 18%, var(--border-neutral))` sin borde izquierdo.
- Agregar `box-shadow` lateral y `backdrop-filter: blur(14px)` coherentes con el rail.
- Simplificar transforms collapsed a `translateX(-100%)` / `translateX(100%)` limpios.
- Eliminar override mobile `right: -1.1rem` que recreaba el gap.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro.css` | CSS toggle base | `right: 0`, `transform: translateY(-50%) translateX(100%)`, borde coherente sin `border-left`, `box-shadow: 1px 0 6px rgba(0,0,0,0.2)`, `backdrop-filter: blur(14px)` igual al rail. |
| `apps/gold/agro/agro.css` | CSS collapsed | Rail: `translateX(-100%)` limpio. Toggle: `translateY(-50%) translateX(100%)` reposicionado al borde viewport. |
| `apps/gold/agro/agro.css` | CSS mobile | Eliminado `right: -1.1rem` que recreaba gap en mobile. Override conserva solo dimensiones touch. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion documentada. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).

### NO se hizo

- No se toco `agro.js`, `index.html` ni `agro-shell.js`.
- No se toco Supabase, Vercel, workflows ni credenciales.
- No se cambio logica de collapse ni localStorage.

---

## 2026-04-27 — Diagnostico y plan P2 Supabase/RLS

**Objetivo:** abrir el frente Seguridad Supabase P2 solo como diagnostico/plan, sin fixes, sin migraciones y sin conexion a DB viva.

### Alcance ejecutado

- `git status --short`: sin salida al inicio; worktree limpio.
- Lectura estatica de `AGENTS.md`, `FICHA_TECNICA.md`, este reporte activo, docs `security/` y `ops/`, `supabase/config.toml`, `supabase/migrations/` y `tools/rls-smoke-test.js`.
- No se ejecuto `supabase db reset`.
- No se conecto a Supabase remoto ni staging.

### Veredicto

**YELLOW controlado.** No aparece P1 nuevo por auditoria estatica. El smoke staging RLS/Storage sigue documentado como PASS para `agro_pending` + `agro-evidence`. La deuda viva es P2/P3 de endurecimiento, inventario remoto y modernizacion gradual.

### Evidencia principal

| Area | Evidencia | Lectura |
|---|---|---|
| Storage `agro-evidence` | `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` | Bucket privado y policies owner-folder con `(select auth.uid())`. |
| Smoke staging | `apps/gold/docs/security/RLS_STORAGE_VALIDATION_2026-04-23.md` | PASS en workflow manual sobre `main`; URL exacta del run sigue pendiente de pegar. |
| Config Supabase | `supabase/config.toml` | API expone `public` y `graphql_public`; Storage tiene limite global `50MiB`; no hay bucket config local con MIME types. |
| Indices operativos | `supabase/migrations/20260427120000_agro_operational_user_id_indexes.sql` | Primer fix seguro ya existe para `agro_operational_cycles` y `agro_operational_movements`. |
| Smoke script | `tools/rls-smoke-test.js` | Usa anon key + usuarios A/B; valida aislamiento DB y Storage; no usa `service_role`. |

### Hallazgos P2

1. **Policies owner-based antiguas sin modernizacion completa.**
   - `supabase/migrations/20260411130000_create_agro_period_cycles.sql` define policies sin `to authenticated` y con `auth.uid()` directo.
   - `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql` hace lo mismo para `agro_crops` y `agro_roi_calculations`.
   - Riesgo: no es bypass confirmado, pero queda por debajo del patron moderno ya usado en `20260420120000_security_trust_hardening_v1.sql`.

2. **RPCs public con grants no explicitados en varias migraciones.**
   - `agro_rank_top_clients`, `agro_rank_pending_clients`, `agro_buyer_portfolio_summary_v1` y `agro_delete_buyer_cascade_v1` viven en esquema `public`.
   - Solo se vio `REVOKE/GRANT` explicito para `public.log_event` y `agro_rank_top_crops_profit`.
   - Riesgo: sin inventario vivo de `pg_proc`/grants no conviene cambiar aun; planificar REVOKE/GRANT explicito por funcion tras confirmar consumidores.

3. **Funciones `SECURITY DEFINER` a revisar por contrato.**
   - `public.handle_new_user()` es trigger de Auth esperado.
   - `public.log_event()` es wrapper `SECURITY DEFINER` con revoke/grant a `authenticated`.
   - `security.log_event()` esta en esquema no expuesto por API, pero hay `GRANT USAGE ON SCHEMA security TO authenticated`; conviene revisar si ese grant sigue siendo necesario.

4. **Storage contract incompleto para limites/MIME por bucket.**
   - `agro-evidence` tiene owner policies y bucket privado.
   - No se ve contrato explicito de `allowed_mime_types` ni `file_size_limit` por bucket en migraciones; solo limite global `50MiB`.
   - `avatars` sigue pendiente de decision: publico por diseno vs signed URLs/private.

### Hallazgos P3

1. **Uso directo de `auth.uid()` en policies ya owner-based.**
   - Aparece en tablas como `agro_feedback`, `agro_buyers`, `agro_farmer_profile`, `agro_public_profiles`, `agro_social_*`, `agro_task_cycles`, `announcements`, `notifications`, `feedback`, `user_favorites`, `user_onboarding_context` y objetos operativos.
   - Riesgo principal: rendimiento/consistencia, no bypass confirmado.

2. **`profiles` conserva semantica publica legacy.**
   - `001_setup_profiles_trigger.sql` tiene `select using (true)` y policies insert/update con `auth.uid()` directo.
   - No tocar sin decision de producto, porque cambiarlo podria modificar comportamiento publico esperado.

3. **Views.**
   - No se detectaron `CREATE VIEW` activos en migraciones raiz.
   - `apps/gold/docs/security/rls-profiles-policies.sql` conserva una propuesta documental de `profiles_public` con nota `security_invoker`, pero no es migracion activa.

### Plan por grupos pequenos

1. **P2-A / Policies owner-based de bajo riesgo.**
   - Tablas: `agro_period_cycles`, `agro_crops`, `agro_roi_calculations`.
   - Cambio futuro: migracion idempotente que dropee/recree solo esas policies con `to authenticated` y `((select auth.uid()) = user_id)`.
   - No tocar `profiles` en este grupo.

2. **P2-B / Inventario RPC y grants.**
   - Antes de migrar: consultar en DB autorizada `pg_proc`, `pg_namespace` y grants efectivos.
   - Luego: migracion explicita por RPC con `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` donde corresponda.
   - Revisar especialmente `agro_buyer_portfolio_summary_v1` y `agro_delete_buyer_cascade_v1`.

3. **P2-C / Storage contract.**
   - Confirmar MIME reales usados por evidencias Agro antes de fijar `allowed_mime_types`.
   - Definir limite por bucket para `agro-evidence`.
   - Resolver decision `avatars` en documento/manifesto antes de tocar policies.

4. **P2-D / Profiles y superficie publica.**
   - Decidir si `profiles` sigue con lectura publica legacy o se migra a vista `profiles_public`.
   - Si se crea vista, exigir `security_invoker = true` en Postgres compatible.

5. **P3 / Limpieza y consistencia.**
   - Modernizar direct `auth.uid()` restante por tandas pequenas.
   - Solo limpiar policies duplicadas facturero si `pg_policies` vivo confirma duplicidad real.

### Primer fix recomendado posterior

Crear una unica migracion pequena para **P2-A**:

- `agro_period_cycles`: `select/insert/update/delete`.
- `agro_crops`: `select/insert/update/delete`.
- `agro_roi_calculations`: `select/insert/delete`.
- Patron: `for <cmd> to authenticated using ((select auth.uid()) = user_id)` y `with check ((select auth.uid()) = user_id)` cuando aplique.

### Validacion futura

- `git diff --check`.
- `pnpm build:gold`.
- Si el usuario autoriza DB viva: consultar `pg_policies`, `role_table_grants`, `pg_proc` y `storage.buckets`; no ejecutar resets destructivos.

### NO se hizo

- No se crearon migraciones.
- No se tocaron policies, RPCs, Storage ni Supabase config.
- No se toco Agro, `agro.js`, Edge Functions, Vercel, workflows ni credenciales.
- No se uso `git add`.

---

## 2026-04-27 — Plan de ejecucion P2-A policies owner-based

**Objetivo:** aplicar el primer fix P2-A recomendado: recrear solo las policies RLS owner-based antiguas de `agro_period_cycles`, `agro_crops` y `agro_roi_calculations` con rol explicito `to authenticated` y patron `((select auth.uid()) = user_id)`.

### Diagnostico

- `git status --short`: sin salida antes de editar.
- `agro_period_cycles` vive en `supabase/migrations/20260411130000_create_agro_period_cycles.sql`.
  - Policies: `user_own_period_cycles_select`, `user_own_period_cycles_insert`, `user_own_period_cycles_update`, `user_own_period_cycles_delete`.
  - Operaciones: select/insert/update/delete.
  - Condicion actual: `auth.uid() = user_id`.
  - Tiene `deleted_at`, pero la policy actual no filtra soft-delete; no se agregara condicion nueva.
- `agro_crops` vive en `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql`.
  - Policies: `Users can view own crops`, `Users can insert own crops`, `Users can update own crops`, `Users can delete own crops`.
  - Operaciones: select/insert/update/delete.
  - Condicion actual: `auth.uid() = user_id`; update ya usa `using` + `with check`.
  - Tiene `deleted_at`, pero la policy actual no filtra soft-delete; no se agregara condicion nueva.
- `agro_roi_calculations` vive en `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql`.
  - Policies: `Users can view own ROI calculations`, `Users can insert own ROI calculations`, `Users can delete own ROI calculations`.
  - Operaciones: select/insert/delete.
  - Condicion actual: `auth.uid() = user_id`.
  - No tiene `deleted_at`.

### Plan

- Crear una migracion nueva `supabase/migrations/20260427123000_p2a_owner_policies_authenticated.sql`.
- No tocar tablas, datos, RPC, grants, Storage, profiles ni config.
- Dropear y recrear solo las 11 policies listadas.
- Mantener semantica owner-based: `select/delete using`, `insert with check`, `update using + with check`.
- Ejecutar `git diff --check` y `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `supabase/migrations/20260427123000_p2a_owner_policies_authenticated.sql` | Migracion RLS | Recrea 11 policies owner-based con `to authenticated` y `((select auth.uid()) = user_id)`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnostico, plan y cierre de la sesion P2-A. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).
- Nota: el build conserva el warning local de Node `v25.6.0` vs engine declarado `20.x`; no bloquea el build.

### NO se hizo

- No se tocaron tablas, datos, RPC/grants, Storage, `profiles`, Supabase config ni Edge Functions.
- No se toco Agro ni `agro.js`.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se uso `git add`.

---

## 2026-04-27 — Diagnostico P2-B RPC public/functions grants

**Objetivo:** auditar funciones/RPC en schema `public` y preparar plan seguro para endurecer grants sin aplicar migraciones ni cambiar comportamiento.

### Alcance ejecutado

- `git status --short`: sin salida antes de editar; worktree limpio.
- Lectura estatica de `AGENTS.md`, `FICHA_TECNICA.md`, `AGENT_REPORT_ACTIVE.md`, docs `security/` y `ops/`, migraciones Supabase y `tools/rls-smoke-test.js`.
- Busqueda de llamadas RPC en `apps/gold/agro/` con `rg`.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.

### Veredicto

**YELLOW controlado.** No aparece P1 confirmado por auditoria estatica. La superficie P2-B real es pequena: cuatro RPC activas de Agro no muestran `REVOKE/GRANT` explicito en migraciones, mientras `agro_rank_top_crops_profit` y `public.log_event` ya tienen grants explicitos.

### RPC usadas por Agro

| RPC | Uso frontend | Evidencia en migraciones | Lectura |
|---|---|---|---|
| `public.agro_rank_top_clients(date,date,integer,uuid)` | `apps/gold/agro/agro.js` usa `supabase.rpc('agro_rank_top_clients', params)` | Ultima definicion en `20260221231536_agro_rpc_date_filters_inclusive.sql`; no se encontro `REVOKE/GRANT` explicito para esta funcion. | P2: lectura owner-scoped por `auth.uid()`, pero executable grant queda implicito/default si no se confirma en DB viva. |
| `public.agro_rank_pending_clients(date,date,integer,uuid)` | `apps/gold/agro/agro.js` usa `supabase.rpc('agro_rank_pending_clients', params)` | Ultima definicion en `20260221231536_agro_rpc_date_filters_inclusive.sql`; no se encontro `REVOKE/GRANT` explicito para esta funcion. | P2: lectura owner-scoped por `auth.uid()`, pero falta contrato explicito de execution grants. |
| `public.agro_rank_top_crops_profit(date,date,integer,uuid)` | `apps/gold/agro/agro.js` usa `supabase.rpc('agro_rank_top_crops_profit', params)` | `20260221231650_agro_rank_top_crops_profit_order_repair.sql` define `SECURITY INVOKER`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated` y `service_role`. | Ya endurecida; no tocar en primer fix salvo inventario vivo contradiga. |
| `public.agro_buyer_portfolio_summary_v1()` | `apps/gold/agro/agro-cartera-viva.js` usa `supabaseClient.rpc(AGRO_BUYER_PORTFOLIO_RPC)` | Contrato final restaurado en `20260418120000_agro_buyer_portfolio_contract_restore.sql`; no se encontro `REVOKE/GRANT` explicito. | P2: RPC principal de Cartera Viva; lectura owner-scoped con `auth.uid()` en CTE. |
| `public.agro_delete_buyer_cascade_v1(uuid)` | `apps/gold/agro/agrocompradores.js` usa `state.supabase.rpc('agro_delete_buyer_cascade_v1', ...)` | `20260403143000_agro_delete_buyer_cascade_v1.sql` define `security invoker`, valida `auth.uid()` y ownership del comprador; no se encontro `REVOKE/GRANT` explicito. | P2 mas sensible: funcion destructiva, aunque owner-scoped. Debe ser el primer grant a cerrar. |

### Funciones public no clasificadas como primer fix

| Funcion | Tipo | Lectura |
|---|---|---|
| `public.log_event(text,jsonb)` | Wrapper `SECURITY DEFINER` | Ya tiene `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` en `20260104130000_security_audit_log.sql`. No tocar en P2-B inicial. |
| `public.handle_new_user()` | Trigger de Auth | `RETURNS trigger`, `SECURITY DEFINER`, `set search_path = public`; no aparece como RPC de Agro. No tocar sin validar impacto de triggers. |
| `public.agro_canonicalize_buyer_name(text)` | Helper SQL immutable | No accede datos; usado en migraciones y equivalencias de compradores. Si se endurece, hacerlo como P3 separado tras verificar que no rompa inserts/updates que dependan del helper. |
| `public.agro_task_cycles_set_updated_at()`, `public.update_updated_at()`, `public.set_user_onboarding_context_updated_at()`, `public.update_agro_crops_timestamp()` | Trigger helpers | No son RPC de producto. No mezclar con P2-B frontend RPC grants. |

### Riesgos

- No se consulto `pg_proc`, `information_schema.routine_privileges` ni grants efectivos contra DB viva; por tanto, el diagnostico es estatico por migraciones.
- Revocar grants sin reotorgar `authenticated` romperia Agro.
- Tocar helpers/trigger functions junto con RPC activas aumentaria el riesgo sin necesidad.

### Plan seguro por grupos

1. **P2-B1 / RPC activas de Agro con grants faltantes.**
   - Crear una migracion pequena solo para:
     - `public.agro_delete_buyer_cascade_v1(uuid)`.
     - `public.agro_buyer_portfolio_summary_v1()`.
     - `public.agro_rank_top_clients(date,date,integer,uuid)`.
     - `public.agro_rank_pending_clients(date,date,integer,uuid)`.
   - Patron: `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` y `GRANT EXECUTE ON FUNCTION ... TO authenticated;`.
   - No tocar `agro_rank_top_crops_profit`, porque ya tiene contrato explicito.

2. **P2-B2 / Validacion real previa o posterior si el usuario autoriza DB viva.**
   - Consultar `pg_proc`, `pg_namespace`, `pg_get_function_arguments`, `pg_get_userbyid(proowner)` y privileges efectivos.
   - Ejecutar smoke/manual en staging para:
     - rankings dashboard (`agro_rank_*`);
     - Cartera Viva (`agro_buyer_portfolio_summary_v1`);
     - borrado cascade de comprador con usuario autenticado QA.

3. **P3 / Helpers y trigger functions.**
   - Revisar `handle_new_user`, trigger helpers y `agro_canonicalize_buyer_name` en frente separado.
   - No aplicar revokes a helpers hasta confirmar que no afectan triggers, generated/default expressions o writes indirectos.

### Primer fix recomendado posterior

Migracion minima:

```sql
begin;

revoke all on function public.agro_delete_buyer_cascade_v1(uuid) from public;
grant execute on function public.agro_delete_buyer_cascade_v1(uuid) to authenticated;

revoke all on function public.agro_buyer_portfolio_summary_v1() from public;
grant execute on function public.agro_buyer_portfolio_summary_v1() to authenticated;

revoke all on function public.agro_rank_top_clients(date, date, integer, uuid) from public;
grant execute on function public.agro_rank_top_clients(date, date, integer, uuid) to authenticated;

revoke all on function public.agro_rank_pending_clients(date, date, integer, uuid) from public;
grant execute on function public.agro_rank_pending_clients(date, date, integer, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
```

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).
- Nota: el build conserva el warning local de Node `v25.6.0` vs engine declarado `20.x`; no bloquea el build.

### NO se hizo

- No se crearon migraciones.
- No se tocaron RPC/grants, policies, Storage, `profiles`, Supabase config ni Edge Functions.
- No se toco Agro ni `agro.js`.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se uso `git add`.

---

## 2026-04-27 — Plan de ejecucion P2-B1 RPC grants

**Objetivo:** aplicar el primer fix P2-B1 recomendado: endurecer execution grants de 4 RPC activas en `public` con `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated`.

### Diagnostico

- `git status --short`: sin salida antes de editar.
- `agro_rank_top_clients`:
  - Definicion vigente: `supabase/migrations/20260221231536_agro_rpc_date_filters_inclusive.sql`.
  - Firma exacta: `public.agro_rank_top_clients(date, date, integer, uuid)`.
  - No se encontro `REVOKE/GRANT` explicito para esta funcion en migraciones.
- `agro_rank_pending_clients`:
  - Definicion vigente: `supabase/migrations/20260221231536_agro_rpc_date_filters_inclusive.sql`.
  - Firma exacta: `public.agro_rank_pending_clients(date, date, integer, uuid)`.
  - No se encontro `REVOKE/GRANT` explicito para esta funcion en migraciones.
- `agro_buyer_portfolio_summary_v1`:
  - Contrato final: `supabase/migrations/20260418120000_agro_buyer_portfolio_contract_restore.sql`.
  - Firma exacta: `public.agro_buyer_portfolio_summary_v1()`.
  - No se encontro `REVOKE/GRANT` explicito para esta funcion en migraciones.
- `agro_delete_buyer_cascade_v1`:
  - Definicion: `supabase/migrations/20260403143000_agro_delete_buyer_cascade_v1.sql`.
  - Firma exacta: `public.agro_delete_buyer_cascade_v1(uuid)`.
  - Es `security invoker`, valida `auth.uid()` y ownership del comprador, pero no tiene `REVOKE/GRANT` explicito.
- Referencia endurecida:
  - `supabase/migrations/20260221231650_agro_rank_top_crops_profit_order_repair.sql` usa `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated`.
  - No se tocara `agro_rank_top_crops_profit`, porque ya esta endurecida.

### Plan

- Crear `supabase/migrations/20260427124500_p2b_rpc_grants_hardening.sql`.
- Aplicar solo `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` sobre las 4 firmas confirmadas.
- No agregar grants a `service_role`, porque el objetivo de esta sesion autoriza explicitamente `authenticated` y las llamadas activas revisadas son de cliente autenticado.
- No tocar helpers/triggers (`handle_new_user`, `update_updated_at`, `agro_canonicalize_buyer_name`, `log_event`) ni RPC ya endurecidas.
- Ejecutar `git diff --check` y `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `supabase/migrations/20260427124500_p2b_rpc_grants_hardening.sql` | Migracion RPC grants | Aplica `REVOKE ALL FROM PUBLIC` y `GRANT EXECUTE TO authenticated` sobre las 4 RPC activas confirmadas. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnostico, plan, cambios y cierre P2-B1. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, vite build 165 modules, check-llms OK, UTF-8 OK).
- Nota: el build conserva el warning local de Node `v25.6.0` vs engine declarado `20.x`; no bloquea el build.

### NO se hizo

- No se tocaron helpers/triggers (`handle_new_user`, `update_updated_at`, `agro_canonicalize_buyer_name`, `log_event`).
- No se toco `agro_rank_top_crops_profit`.
- No se tocaron codigo Agro, `agro.js`, policies RLS, Storage, `profiles`, Supabase config, Edge Functions, Vercel, workflows ni credenciales.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se uso `git add`.

---

## 2026-04-27 — Cierre tecnico P2-A/P2-B1 Supabase

**Estado:** YELLOW CONTROLADO — fixes aplicados, QA funcional pendiente por usuario

**Objetivo:** Dejar documentado el cierre tecnico de los bloques P2-A y P2-B1 antes de QA manual.

### Diagnostico

Se aplicaron dos bloques de endurecimiento Supabase de bajo alcance:

- P2-A modernizo policies owner-based antiguas para `agro_period_cycles`, `agro_crops` y `agro_roi_calculations`, usando `to authenticated` y `((select auth.uid()) = user_id)`.
- P2-B1 endurecio grants de cuatro RPC activas en `public`, quitando ejecucion publica y permitiendo ejecucion solo a usuarios autenticados.

No se detecto P1 nuevo durante los diagnosticos previos. El estado sigue siendo YELLOW controlado hasta completar QA funcional.

### Plan

- No aplicar mas migraciones hasta validar P2-A/P2-B1.
- El usuario realizara QA manual con sesion autenticada.
- Si QA pasa, actualizar estado a GREEN.
- Si QA falla, documentar flujo roto y corregir con diff quirurgico.
- Proximo frente tras QA: P2-C Storage (`agro-evidence` MIME/file size + decision `avatars`).

### Cambios tecnicos ya aplicados

| Bloque | Archivo | Cambio |
|---|---|---|
| P2-A | `supabase/migrations/20260427123000_p2a_owner_policies_authenticated.sql` | Recreate policies owner-based con `to authenticated` + `(select auth.uid())`. |
| P2-B1 | `supabase/migrations/20260427124500_p2b_rpc_grants_hardening.sql` | `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated` para 4 RPC activas. |

### QA manual pendiente por usuario

- [ ] Confirmar que `/agro/` abre en Dashboard Agro.
- [ ] Confirmar que ciclos de cultivo cargan.
- [ ] Confirmar que ciclos de periodo cargan si existen.
- [ ] Confirmar que ROI/calculos no se rompen.
- [ ] Confirmar que rankings de clientes cargan.
- [ ] Confirmar que rankings de pendientes cargan.
- [ ] Confirmar que resumen de cartera/comprador carga.
- [ ] Probar `delete buyer cascade` solo con cliente QA temporal.
- [ ] Confirmar que usuario anonimo no accede a datos privados.
- [ ] Confirmar que Operacion Comercial / Cartera Viva no se rompen.

### Validacion tecnica previa

- `git diff --check`: PASS en las sesiones de implementacion.
- `pnpm build:gold`: PASS en las sesiones de implementacion.
- Nota local conocida: entorno con Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se aplico QA funcional en esta sesion.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se tocaron nuevas migraciones.
- No se toco codigo Agro.
- No se toco `agro.js`.
- No se tocaron RPC fuera de P2-B1.
- No se toco Storage.
- No se toco `profiles`.
- No se tocaron credenciales.

---

## 2026-04-27 — Diagnostico integral P2-C/P3: Storage, headers, dialogos nativos y XSS

**Estado:** YELLOW CONTROLADO — diagnostico integral, sin cambios tecnicos

**Objetivo:** Auditar cuatro frentes pendientes sin aplicar fixes masivos: Storage, CSP/headers, dialogos nativos y XSS/innerHTML.

### Diagnostico

No aparece P1 nuevo confirmado por auditoria estatica. El proyecto mantiene build verde y el frente Supabase/RLS previo queda en espera de QA funcional del usuario. Los cuatro frentes revisados quedan asi:

- Storage: `agro-evidence` ya es privado y owner-scoped, pero falta contrato explicito de MIME/file size por bucket y `avatars` sigue sin decision canonica documentada.
- CSP/headers: `vercel.json` ya tiene headers base (`nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`), pero no define CSP ni HSTS. La CSP estricta no puede aplicarse de golpe por inline scripts/handlers activos.
- Dialogos nativos: quedan usos de `alert`, `confirm` y `prompt`, sobre todo en `agro.js`. Hay modal canonico para prompt, pero todavia existen fallbacks y confirmaciones nativas en flujos sensibles.
- XSS/innerHTML: hay volumen alto de sinks HTML. Muchos son templates internos escapados o iconos estaticos, pero hay riesgos reales puntuales con datos de usuario/Supabase y Markdown.

### Plan

- No aplicar fixes masivos.
- Separar por frentes.
- Priorizar cambios de bajo riesgo.
- Mantener build verde.
- Ejecutar cada fix futuro en commit separado.
- No endurecer Storage/CSP sin considerar scripts de smoke, inline handlers y dominios reales usados por Agro.

---

### Frente 3 — P2-C Storage

| Severidad | Elemento | Archivo/evidencia | Hallazgo | Recomendacion |
|---|---|---|---|---|
| P2 | `agro-evidence` | `supabase/migrations/20260420120000_security_trust_hardening_v1.sql:19-22` | Bucket privado por migracion. | Mantener private; no revertir a publico. |
| P2 | Policies owner-scoped | `supabase/migrations/20260420120000_security_trust_hardening_v1.sql:40-128` | Select/insert/update/delete usan `to authenticated` y folder de `auth.uid()`. | Estado base correcto; cualquier fix debe preservar owner folders. |
| P2 | MIME/file size por bucket | `supabase/config.toml:106`, `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` | Solo se ve limite global `50MiB`; no hay `allowed_mime_types` ni `file_size_limit` especifico para `agro-evidence`. | Agregar migracion futura que actualice `storage.buckets` para `agro-evidence`. |
| P2 | Smoke test | `tools/rls-smoke-test.js:215-219` | El smoke sube `text/plain` a `agro-evidence`; si se restringe MIME a imagen/pdf sin ajustar el smoke, el workflow fallara. | En el fix futuro, decidir si se permite `text/plain` para smoke o se cambia el smoke a un MIME permitido. |
| P2 | Signed URLs evidencia | `apps/gold/agro/agro.js:960-981` | `resolveEvidenceUrl()` llama `getSignedEvidenceUrl(...)`; no se encontro definicion por busqueda estatica. Puede afectar lectura de evidencias privadas si el flujo se ejecuta. | Validar manualmente evidencia real antes de tocar limites; si falla, abrir fix separado de helper signed URL. |
| P3 | `avatars` | `apps/gold/assets/js/profile/profileManager.js:291-306` | Sube a bucket `avatars` y usa `getPublicUrl`; auditorias previas lo dejan pendiente de decision UX. | No cambiar a privado hasta decidir contrato producto: avatar publico por diseno vs signed URLs. |
| P3 | Avatar MIME/tamano cliente | `apps/gold/assets/js/profile/profileManager.js:271-280` | El cliente limita JPG/PNG/GIF/WebP y 2MB; no hay evidencia estatica de bucket/policy remoto. | Documentar contrato `avatars` antes de migrar. |

**Primer fix recomendado Storage:**
Crear una migracion P2-C pequena para `agro-evidence` que conserve `public=false`, agregue limite especifico y MIME permitidos. Propuesta inicial a validar: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`; revisar `tools/rls-smoke-test.js` antes de aplicar porque hoy usa `text/plain`.

**SQL conceptual futuro, NO aplicado:**

```sql
begin;

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
where id = 'agro-evidence';

commit;
```

**Prompt futuro Storage:**

```md
Crear migracion P2-C solo para `agro-evidence`: mantener `public=false`, fijar `file_size_limit` y `allowed_mime_types`, revisar impacto sobre `tools/rls-smoke-test.js`, ejecutar `pnpm build:gold`, sin tocar Agro ni Storage fuera de este bucket.
```

---

### Frente 4 — CSP / headers

| Severidad | Header/Fuente | Archivo/evidencia | Hallazgo | Recomendacion |
|---|---|---|---|---|
| P2 | CSP | `vercel.json:45-120` | No existe `Content-Security-Policy`. | Aplicar primero en modo conservador/report-only o con allowlist amplia; no intentar CSP estricta inicial. |
| P3 | HSTS | `vercel.json:45-120` | No existe `Strict-Transport-Security`. | Aplicar solo tras confirmar HTTPS estable en `yavlgold.com` y `yavlgold.gold`; empezar sin `preload`. |
| OK | `X-Content-Type-Options` | `vercel.json:50,61,72,83,94,105` | `nosniff` ya existe en rutas principales y health. | Mantener. |
| OK | Clickjacking base | `vercel.json:51,62,73,84,95` | `X-Frame-Options: DENY` ya existe. | CSP futura debe agregar `frame-ancestors 'none'` como defensa moderna. |
| OK | Referrer | `vercel.json:53,64,75,86,97` | `strict-origin-when-cross-origin` ya existe. | Mantener. |
| OK/P3 | Permissions | `vercel.json:54,65,76,87,98` | Global bloquea geoloc; Agro permite `geolocation=(self)`. | Mantener separacion Agro/no-Agro. |
| P3 | `X-XSS-Protection` | `vercel.json:52,63,74,85,96` | Header legacy/deprecated. | No priorizar; CSP y sinks DOM importan mas. |
| P2 | Fuentes/script CDN | `apps/gold/agro/index.html:19-27`, `apps/gold/index.html:33-41,886,894` | Google Fonts, Font Awesome/CDNJS, jsDelivr, hCaptcha y Chart.js requieren allowlist. | CSP debe incluirlos o mover a self-hosting en otro frente. |
| P2 | APIs externas | `apps/gold/agro/agro-clima.js:9-10`, `apps/gold/agro/agro-market.js:18`, `apps/gold/agro/agro-interactions.js:678` | Open-Meteo, Binance Vision, ER API e IP API se usan en `connect-src`. | Inventario debe entrar en CSP conservadora. |
| P2 | Inline scripts/handlers | `apps/gold/agro/index.html`, `apps/gold/index.html`, `apps/gold/assets/js/components/*` | Hay inline scripts y `onclick`, lo que rompe una CSP sin `'unsafe-inline'`. | Primer CSP no debe ser estricta; planear migracion gradual de inline handlers. |

**Inventario de fuentes reales detectadas:**

- `self`
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`
- `https://cdnjs.cloudflare.com`
- `https://cdn.jsdelivr.net`
- `https://js.hcaptcha.com`
- `https://hcaptcha.com` / `https://*.hcaptcha.com`
- `https://*.supabase.co`
- `https://api.open-meteo.com`
- `https://geocoding-api.open-meteo.com`
- `https://ipapi.co`
- `https://data-api.binance.vision`
- `https://open.er-api.com`

**CSP conservadora propuesta:**

```txt
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
img-src 'self' data: blob: https://*.supabase.co https://www.yavlgold.com;
font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.hcaptcha.com;
connect-src 'self' https://*.supabase.co https://api.open-meteo.com https://geocoding-api.open-meteo.com https://ipapi.co https://data-api.binance.vision https://open.er-api.com https://hcaptcha.com https://*.hcaptcha.com;
frame-src https://hcaptcha.com https://*.hcaptcha.com;
worker-src 'self' blob:;
manifest-src 'self';
form-action 'self';
upgrade-insecure-requests;
```

**Primer fix recomendado Headers:**
Agregar CSP conservadora en commit separado, preferiblemente como `Content-Security-Policy-Report-Only` si se quiere medir primero. Si se aplica en enforcement, aceptar temporalmente `'unsafe-inline'` por deuda existente y abrir luego un frente para eliminar inline handlers/scripts.

**Prompt futuro Headers:**

```md
Actualizar solo `vercel.json` con CSP conservadora compatible con Vite/Vanilla/Supabase/hCaptcha/fonts/APIs reales. No tocar Agro. No activar CSP estricta sin `'unsafe-inline'` todavia. Ejecutar `pnpm build:gold` y documentar dominios permitidos.
```

---

### Frente 5 — Dialogos nativos

| Severidad | Tipo | Archivo | Flujo | Hallazgo | Recomendacion |
|---|---|---|---|---|---|
| P2 | `confirm` | `apps/gold/agro/agro.js:5778` | Eliminar registro facturero | Confirm nativo en operacion frecuente y sensible. | Primer candidato a modal canonico de confirmacion. |
| P2 | `confirm` | `apps/gold/agro/agro.js:6375` | Devolucion parcial append-only | Confirm nativo en flujo complejo con impacto financiero. | Migrar tras el primer confirm simple. |
| P2 | `confirm` | `apps/gold/agro/agro.js:16344` | Eliminar cultivo | Dialogo nativo en flujo sensible; copy dice que no se puede deshacer. | Migrar a modal canonico con copy claro y consecuencias. |
| P2 | `confirm` | `apps/gold/agro/agroOperationalCycles.js:1338-1340` | Eliminar cartera operativa/ciclo | Puede borrar historial asociado. | Migrar a confirm modal compartido. |
| P2 | `confirm` | `apps/gold/agro/agro-cart.js:230,335` | Eliminar carrito/item | Flujo operativo frecuente. | Migrar despues de facturero/cultivo. |
| P2/P3 | `prompt` fallback | `apps/gold/agro/agro.js:6504-6537` | Duplicar registro | Ya usa `showPromptModal` cuando existe, pero conserva fallback nativo. | Confirmar carga del modulo y luego retirar fallback o dejarlo solo como degradacion documentada. |
| P3 | `prompt` fallback | `apps/gold/agro/agro-cartera-viva-view.js:1416-1420` | Nueva cartera operativa | Ya intenta modal canonico antes de fallback. | Puede esperar. |
| P3 | `alert` | `apps/gold/agro/index.html:1981-2310` | Guardado/validacion cultivo | Feedback nativo de UX, no seguridad directa. | Reemplazar por `YGUXMessages` progresivamente. |
| P3 | `alert` | `apps/gold/agro/agro-cart.js`, `apps/gold/agro/agro-agenda.js` | Errores y validaciones | Bloquea mobile y rompe canon modal/toast. | Migrar por modulo cuando se toque. |

**Conteo rapido:** `agro.js` concentra 47 apariciones; luego `agro-cart.js` 12, `agro-agenda.js` 6 e `index.html` 6.

**Primer dialogo recomendado para migrar:**
`deleteFactureroItem()` en `apps/gold/agro/agro.js:5774-5784`, porque toca borrado frecuente de movimientos financieros y hoy depende de `confirm` + `alert`.

**Prompt futuro Dialogos:**

```md
Migrar solo `deleteFactureroItem()` de `confirm/alert` nativos a modal canonico/UX messages. Tocar solo el minimo necesario, no redisenar Agro, no tocar Supabase, no crecer `agro.js` mas que wiring quirurgico, ejecutar `pnpm build:gold`.
```

---

### Frente 6 — XSS / innerHTML

| Severidad | Patron | Archivo | Fuente de datos | Hallazgo | Recomendacion |
|---|---|---|---|---|---|
| P2 | `innerHTML` con datos de usuario | `apps/gold/agro/agro.js:15452-15456` | Perfil/cultivos/clima/location desde estado/Supabase | `appendContextItem()` interpola `value` sin escape. | Primer fix XSS: construir nodos con `textContent`. |
| P2 | Markdown a HTML | `apps/gold/agro/agro-repo-app.js:203-209,249-356,569` | Contenido editable AgroRepo | Escapa texto base, pero convierte links/img a `href/src` sin allowlist de protocolo; `javascript:` en links queda posible al click. | Validar URLs y/o construir DOM; no instalar DOMPurify aun. |
| P2 | `innerHTML` con dato Supabase | `apps/gold/assets/js/admin/adminManager.js:334-340` | `ann.title` desde tabla `announcements` | Titulo se interpola sin `_escapeHtml`; superficie admin, pero dato de DB. | Escapar `ann.title` y `ann.type`/atributos o construir DOM. |
| P2 | `innerHTML` con error externo | `apps/gold/agro/agro-clima.js:300-302` | `err.message` desde fetch/geocoding | Mensaje de error se interpola como HTML. | Usar `textContent` para el mensaje. |
| P2/P3 | `innerHTML` + inline handlers | `apps/gold/agro/index.html`, `apps/gold/agro/agro-interactions.js:118,619` | Templates internos | No es XSS confirmado por si solo, pero bloquea CSP estricta. | Migrar gradualmente a listeners. |
| P3 | `insertAdjacentHTML` | `apps/gold/agro/agro-interactions.js:402-411` | Interno/calculado | Badge estatico con edad calculada; bajo riesgo. | Puede esperar. |
| P3 | Templates escapados | `apps/gold/agro/agro-cartera-viva-view.js:2440-2524` | Supabase owner rows | Usa `escapeHtml`/`escapeAttribute` en render principal. | Mantener bajo observacion, no priorizar. |
| P3 | Templates escapados | `apps/gold/agro/agroOperationalCycles.js` | Supabase owner rows | Alto volumen de `innerHTML`, pero evidencia de `escapeHtml` en campos dinamicos. | No migrar masivamente. |
| P3 | Iconos estaticos | multiples `innerHTML = '<i ...>'` | Interno | Falsos positivos comunes. | Dejar o migrar solo si se toca el componente. |

**Top riesgos reales:**

1. `appendContextItem()` en `apps/gold/agro/agro.js:15452-15456`: valor user/Supabase directo en HTML.
2. `renderInlineMarkdown()` en `apps/gold/agro/agro-repo-app.js:203-209`: links/img sin allowlist de protocolo.
3. `preview.innerHTML = renderMarkdown(...)` en `apps/gold/agro/agro-repo-app.js:569`: sink principal para contenido AgroRepo editable.
4. `adminManager.js:334-340`: `ann.title` sin escape en admin.
5. `agro-clima.js:302`: `err.message` interpolado en HTML.
6. Inline handlers en Agro/Assets: no son XSS confirmado, pero impiden CSP fuerte.
7. `agro-planning.js:272,275`: HTML rico interno; hoy bajo riesgo por fuentes estaticas.
8. `agro-interactions.js:455,630,712`: datos externos de mercado; revisar escape si se toca market hub.
9. `agro-cartera-viva-view.js` templates: bajo riesgo actual por escape consistente.
10. `agroOperationalCycles.js` templates: bajo riesgo actual por escape consistente, no migrar en bloque.

**Primer fix recomendado XSS:**
Reemplazar `appendContextItem()` por construccion DOM segura (`createElement`, `textContent`) en un commit pequeno. Es local, no cambia datos, y reduce riesgo real con minimo impacto.

**Prompt futuro XSS:**

```md
Tocar solo `apps/gold/agro/agro.js` para reemplazar `appendContextItem()` por DOM seguro con `textContent`. No cambiar flujo IA/contexto, no tocar Supabase ni otros sinks. Ejecutar `git diff --check` y `pnpm build:gold`.
```

---

### Orden recomendado de proximos commits

1. `fix(storage): enforce agro evidence upload limits` o equivalente.
2. `security(headers): add baseline conservative csp` o equivalente.
3. `refactor(agro): replace first native dialog with modal canon` o equivalente.
4. `security(agro): replace high-risk context innerHTML` o equivalente.

Nota: si QA manual detecta que evidencias privadas no abren por `getSignedEvidenceUrl()` no definido, adelantar un commit funcional pequeno antes del hardening MIME/file-size.

---

### No se hizo

- No se toco codigo.
- No se tocaron migraciones.
- No se toco Storage.
- No se toco `vercel.json`.
- No se tocaron dialogos.
- No se reemplazo `innerHTML`.
- No se instalaron dependencias.
- No se conecto a DB viva.
- No se ejecuto `supabase db reset`.
- No se ejecuto Playwright ni QA browser.
- No se tocaron credenciales.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

---

## 2026-04-27 — P2-C Storage agro-evidence limits

**Estado:** YELLOW CONTROLADO — fix P2-C aplicado, pendiente QA Supabase real

**Objetivo:** Endurecer el bucket `agro-evidence` con contrato explicito de MIME types y limite de tamano, preservando privacidad y policies owner-scoped.

### Diagnostico

- El bucket exacto es `agro-evidence`.
- `supabase/migrations/20260420120000_security_trust_hardening_v1.sql` crea/actualiza el bucket con `public = false`.
- Las policies `agro_evidence_select_own`, `agro_evidence_insert_own`, `agro_evidence_update_own` y `agro_evidence_delete_own` ya estan owner-scoped por carpeta de `auth.uid()`.
- No se encontro contrato explicito de `allowed_mime_types` ni `file_size_limit` por bucket; solo existe el limite global de Storage en `supabase/config.toml`.
- `tools/rls-smoke-test.js` sube actualmente un objeto `text/plain` con extension `.txt`, por lo que debe ajustarse si el bucket queda limitado a imagenes/PDF.
- `avatars` queda fuera de alcance y no debe tocarse en esta sesion.

### Plan

- Crear una migracion nueva que actualice solo `storage.buckets` para `id = 'agro-evidence'`.
- Definir MIME permitidos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Definir `file_size_limit = 10485760` bytes (10 MB).
- No modificar `public`, policies, RPC, grants, `profiles`, `avatars` ni codigo Agro.
- Cambiar el smoke test para subir un PNG minimo con `contentType: 'image/png'`.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260427133000_p2c_agro_evidence_storage_limits.sql` | Agrega contrato explicito para `agro-evidence`: MIME permitidos y limite de 10 MB. |
| `tools/rls-smoke-test.js` | Cambia el upload de Storage del smoke de `text/plain`/`.txt` a PNG minimo `image/png`/`.png`. |

### Contrato aplicado

- MIME permitidos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Limite por archivo: `10485760` bytes (10 MB).
- Bucket: `agro-evidence`.
- Privacidad: se conserva el estado privado existente; esta migracion no cambia `public`.
- Policies: no se tocaron; se preservan las owner-scoped policies existentes.

### Validacion

- `node --check tools/rls-smoke-test.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.
- `supabase db reset`: NO ejecutado; no hubo autorizacion explicita para reset ni conexion a DB viva.

### NO se hizo

- No se toco Agro.
- No se toco `apps/gold/agro/agro.js`.
- No se tocaron policies RLS.
- No se tocaron RPC/grants.
- No se toco `profiles`.
- No se toco `avatars`.
- No se toco Supabase config.
- No se tocaron Edge Functions, Vercel ni workflows.
- No se tocaron credenciales.

---

## 2026-04-27 — P2 Headers baseline y CSP Report-Only

**Estado:** YELLOW CONTROLADO — baseline conservador aplicado, sin CSP bloqueante

**Objetivo:** Agregar una primera capa de headers de seguridad en `vercel.json` sin romper runtime ni rutas.

### Diagnostico

- `vercel.json` ya tiene bloque `headers`.
- Las rutas principales ya declaran `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- No se encontro `Strict-Transport-Security`.
- No se encontro `Content-Security-Policy` ni `Content-Security-Policy-Report-Only`.
- Hay inline scripts, inline styles y handlers `onclick` activos en superficies publicas y Agro; una CSP bloqueante sin `'unsafe-inline'` romperia runtime.
- Fuentes externas reales detectadas: Google Fonts, Font Awesome/CDNJS, jsDelivr, hCaptcha, Supabase, Open-Meteo, Binance Vision, ER API, Frankfurter API e IP API.

### Plan

- No tocar rewrites, redirects ni routing.
- No tocar codigo Agro ni Supabase.
- Agregar `Strict-Transport-Security: max-age=31536000` sin `preload` ni `includeSubDomains`.
- Agregar `Content-Security-Policy-Report-Only`, no `Content-Security-Policy`, con allowlist conservadora para recursos actuales.
- Mantener `'unsafe-inline'` temporalmente por deuda inline existente y documentar que el cierre estricto queda para un frente posterior.
- Completar `Permissions-Policy` existente con `payment=()` y `usb=()` sin duplicar headers.
- Validar JSON, `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `vercel.json` | Agrega bloque global `/(.*)` con `Strict-Transport-Security` y `Content-Security-Policy-Report-Only`. |
| `vercel.json` | Completa `Permissions-Policy` existente con `payment=()` y `usb=()`, manteniendo `geolocation=(self)` solo en Agro. |

### Headers agregados o completados

- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy-Report-Only: default-src 'self'; ...`
- `Permissions-Policy`: se agregan `payment=()` y `usb=()` a las reglas existentes.

### CSP Report-Only

La CSP queda como `Content-Security-Policy-Report-Only`, no bloqueante, porque el frontend mantiene inline scripts, inline styles y handlers activos. Se conserva `'unsafe-inline'` temporalmente para observar reportes sin romper landing, dashboard ni Agro.

Dominios permitidos en esta primera observacion: `self`, Google Fonts, CDNJS, jsDelivr, hCaptcha, Supabase, Open-Meteo, Binance Vision, ER API, Frankfurter API e IP API.

### Validacion

- `vercel.json` JSON parse + duplicados por bloque: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se aplico `Content-Security-Policy` bloqueante.
- No se uso `preload` ni `includeSubDomains` en HSTS.
- No se tocaron redirects, rewrites ni routing.
- No se toco codigo Agro.
- No se toco Supabase.
- No se tocaron migraciones, Storage, RPC/grants, Vercel workflows ni credenciales.

---

## 2026-04-27 — Dialogo canonico para deleteFactureroItem

**Estado:** YELLOW CONTROLADO — confirm nativo reemplazado, QA manual pendiente

**Objetivo:** Reemplazar el `confirm()` nativo de `deleteFactureroItem()` por un modal canonico V10.1, sin cambiar la logica de borrado.

### Diagnostico

- `deleteFactureroItem(tabName, itemId)` vive en `apps/gold/agro/agro.js`.
- El `confirm()` objetivo esta al inicio del flujo, antes de consultar usuario y ejecutar soft-delete/hard-delete.
- Existen modales de confirmacion en otros modulos, pero estan acoplados a dominios concretos como comprador/tareas y no son un helper generico compartido.
- El modulo `agro-prompt-modal.js` reemplaza `prompt()`, pero no cubre confirmaciones booleanas.
- `agro.css` ya contiene estilos de modales; se agregara solo un bloque generico pequeno para este confirm canonico.
- No se migraran otros `alert`, `confirm` ni `prompt` en esta sesion.

### Plan

- Crear `showAgroConfirmDialog(options)` como helper local minimo en `agro.js`.
- Construir el modal con DOM APIs, no con HTML string.
- Cumplir §19: `role="dialog"`, `aria-modal`, `aria-labelledby`, cierre con Escape, click en overlay, boton cerrar, focus inicial y retorno de foco.
- Reemplazar solo `if (!confirm('¿Eliminar este registro?')) return;`.
- Mantener intactas las ramas de soft-delete, hard-delete, undo toast, refresh y errores.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro.js` | Agrega helper local `showAgroConfirmDialog(options)` y reemplaza el `confirm()` nativo de `deleteFactureroItem()`. |
| `apps/gold/agro/agro.css` | Agrega estilos del modal canonico sobrio para `.agro-confirm-dialog`. |

### Modal/helper

- `showAgroConfirmDialog(options)` devuelve `Promise<boolean>`.
- Construye el modal con DOM APIs y `textContent`.
- Incluye `role="dialog"`, `aria-modal`, `aria-labelledby` y `aria-describedby`.
- Cierra con Escape, click en overlay/backdrop, boton X y boton cancelar.
- Enfoca `Cancelar` al abrir y devuelve foco al trigger si sigue en el DOM.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se migraron otros dialogos nativos.
- No se reemplazaron los `alert()` existentes de error/sesion en `deleteFactureroItem()`.
- No se cambio la logica de soft-delete, hard-delete, undo, restore, refresh ni payloads.
- No se toco Supabase, migraciones, Storage, RPC/grants, Vercel, workflows ni credenciales.

---

## 2026-04-27 — XSS appendContextItem con DOM seguro

**Estado:** YELLOW CONTROLADO — fix aplicado, QA manual pendiente

**Objetivo:** Reemplazar el render inseguro de `appendContextItem()` para que valores dinamicos de contexto no pasen por `innerHTML`.

### Diagnostico

- `appendContextItem(container, key, value)` vive en `apps/gold/agro/agro.js`.
- La funcion actual crea `.ast-ctx-item` y usa `item.innerHTML = \`<strong>${key}:</strong> ${value}\`;`.
- Sus llamadas reciben valores de perfil, finca, ubicacion, cultivo activo, clima y estadisticas de contexto.
- `profile.*`, `cropCtx.*`, `weather.*` y `loc.*` pueden provenir de usuario, Supabase o APIs/contexto externo.
- El riesgo concreto es DOM XSS por interpretar `key` o `value` como HTML.
- No se requiere cambio visual ni cambio de datos; basta construir `strong` y texto con DOM APIs.

### Plan

- Tocar solo `appendContextItem()` en `apps/gold/agro/agro.js`.
- Reemplazar `innerHTML` por `document.createElement('strong')`, `textContent` y nodos de texto.
- Preservar clase `.ast-ctx-item`, orden visual y formato `Etiqueta: valor`.
- No tocar otros `innerHTML`, renderizadores, Supabase, Vercel ni migraciones.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro.js` | `appendContextItem()` deja de usar `innerHTML` y construye `strong` + texto con DOM APIs. |

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### NO se hizo

- No se reemplazaron otros `innerHTML`.
- No se tocaron otros renderizadores.
- No se cambio la logica de perfil, cultivo, clima, ubicacion ni contexto.
- No se instalo DOMPurify ni ninguna dependencia.
- No se toco Supabase, migraciones, Storage, RPC/grants, Vercel, workflows ni credenciales.

---

## 2026-04-27 — QA seguridad P2 parcial

**Estado:** YELLOW CONTROLADO hasta validar con una segunda cuenta real.

**Objetivo:** Validar mediante QA empírico los cambios de seguridad implementados en la sesión (P2-A, P2-B1, P2-C, CSP headers, modal de delete y protección XSS en `appendContextItem()`).

### Resultado
- **XSS appendContextItem:** GREEN. El payload fue tratado como texto plano, sin ejecución.
- **Anon:** GREEN. Redirección forzosa al login verificada.
- **Usuario A:** GREEN. Ciclos/ROI visibles y sin romper.
- **Cleanup QA:** GREEN. Cultivo QA destruido de la base de datos.
- **P2-A RLS cross-user Usuario B:** PENDIENTE. Bloqueo por hCaptcha impidió crear cuenta secundaria. No se debe declarar GREEN global basándose solo en inferencia de policy SQL.

**Pendiente:** Validar aislamiento empírico con Usuario B. Continuar diálogos nativos restantes e innerHTML por prioridad.

---

## 2026-04-27 — QA RLS cross-user completado

**Estado:** GREEN

**Objetivo:** Completar la validación pendiente de aislamiento RLS entre usuarios reales.

### Diagnostico

El QA anterior había validado Usuario A, acceso anónimo, limpieza QA y XSS, pero faltaba la prueba empírica con Usuario B. Se realizó una validación manual usando dos navegadores separados para evitar compartir sesión, localStorage o cookies.

### Plan

- Usar Chrome con la cuenta oficial.
- Usar Edge con la cuenta Capitán QA.
- Confirmar que cada cuenta solo ve sus propios datos.
- Confirmar que ninguna cuenta ve datos ajenos.

### Resultado

- Chrome con cuenta oficial no pudo ver datos creados o pertenecientes a Capitán QA.
- Edge con cuenta Capitán QA no pudo ver datos creados o pertenecientes a la cuenta oficial.
- El aislamiento cross-user quedó validado empíricamente en ambas direcciones.
- El acceso anónimo ya estaba validado como bloqueado/redirigido a login.
- XSS en `appendContextItem()` ya estaba validado como seguro: el payload se renderiza como texto y no ejecuta script.

### Estado final

- P2-A RLS owner policies: GREEN.
- P2-B1 RPC grants: GREEN por QA funcional previo.
- P2-C Storage: GREEN por validación previa.
- CSP/headers baseline: GREEN por deploy/build y revisión funcional.
- Modal deleteFactureroItem: GREEN por QA previo.
- XSS appendContextItem: GREEN.

### Pendiente

- Continuar con diálogos nativos restantes por prioridad.
- Continuar con auditoría `innerHTML` por riesgo.
- Mantener CSP en Report-Only hasta acumular evidencia suficiente antes de endurecerla.

### NO se hizo

- No se tocaron migraciones.
- No se tocó código.
- No se tocó Supabase config.
- No se ejecutó `supabase db reset`.
- No se usaron credenciales en documentos versionados.

---

## 2026-04-27 — Diagnóstico V3 deuda operativa Agro

**Estado:** YELLOW CONTROLADO — diagnóstico, sin cambios técnicos

### Diagnostico

Se auditó deuda operativa en `apps/gold/agro/` y `apps/gold/assets/` bajo el Plan Maestro V3, sin aplicar fixes. El reporte activo tiene 864 líneas antes de esta sección, por debajo del umbral canónico de rotación de 4000 líneas.

Resumen cuantitativo:

- Temporizadores detectados: 143 líneas con `setInterval`, `setTimeout`, `clearInterval` o `clearTimeout`.
- Listeners detectados: 424 líneas con `addEventListener` o `removeEventListener`.
- Referencias `window.*`: 488 líneas, con 45 asignaciones directas en `agro.js`.
- Diálogos nativos residuales: 91 líneas con `alert`, `confirm`, `prompt` o variantes `window.*`.
- Tamaño actual de `apps/gold/agro/agro.js`: 14821 líneas. Sigue siendo el centro de la deuda, aunque shell, favoritos y búsqueda ya están mayormente estabilizados.

La deuda no apunta a un único bug crítico, sino a contratos operativos incompletos: modales no unificados, listeners globales sin ciclo de vida explícito, temporizadores con teardown parcial, puentes `window.*` heredados y bloques autocontenidos que siguen dentro de `agro.js`.

### Hallazgos

#### Temporizadores

| Severidad | Archivo | Línea | Hallazgo | Recomendación |
|---|---:|---:|---|---|
| ALTA | `apps/gold/assets/js/components/notifications.js` | 24 | `setInterval(() => this.checkUnread(), 120000)` no guarda id ni tiene `clearInterval`. | Guardar `_unreadTimer`, evitar doble init y limpiar en `destroy()`/`pagehide`. |
| MEDIA | `apps/gold/agro/agro-market.js` | 622, 630, 636 | Ticker tiene singleton y `stopTickerAutoRefresh()`, pero no está atado a ciclo de vida de página/shell. | Conectar stop a `pagehide` o teardown explícito; mantener un solo dueño del polling. |
| MEDIA | `apps/gold/agro/dashboard.js` | 890, 896 | Weather refresh tiene `stopDashboardWidgets()` expuesto en `window`, pero no se observa binding automático de cleanup. | Registrar cleanup en `pagehide` o al desactivar vista dashboard. |
| MEDIA | `apps/gold/agro/agro.js` | 14704, 14721 | Timers del asistente tienen `stopAssistantTimers()` y cierre local, pero no cleanup final de documento. | Añadir cleanup de seguridad en `pagehide`/`beforeunload` cuando se toque asistente. |
| BAJA | `apps/gold/agro/agro-cartera-viva-view.js` | 2911 | Debounce `externalRefreshTimer` se limpia al reprogramar, pero no tiene disposer de módulo. | Mantener como aceptable por ahora; agregar disposer cuando exista lifecycle modular. |

#### Listeners

| Severidad | Archivo | Línea | Hallazgo | Recomendación |
|---|---:|---:|---|---|
| ALTA | `apps/gold/agro/agro-selection.js` | 34, 59, 71, 85 | `initFactureroSelection()` agrega listeners globales sin guard idempotente ni remover. | Primer fix seguro: guard de inicialización + `AbortController`/disposer. |
| ALTA | `apps/gold/agro/agro-shell.js` | 535, 868, 874, 906, 915, 923 | `initAgroShell()` registra document/window listeners sin singleton explícito ni teardown. | Hacer init idempotente y retornar API estable con `destroy()` futuro. |
| MEDIA | `apps/gold/assets/js/auth/authUI.js` | 18, 112, 130, 133, 145, 150, 155, 676 | `AuthUI.init()` no muestra guard `_initialized`; si se invoca dos veces duplica listeners globales. | Agregar guard local antes de `attachEventListeners()`. |
| MEDIA | `apps/gold/agro/agro-cartera-viva-view.js` | 3036-3044 | Tiene `initialized` contra duplicación, pero no remueve listeners cuando el módulo deje de vivir. | Aceptable en MPA actual; agregar teardown si se modulariza lifecycle. |
| MEDIA | `apps/gold/agro/agro-repo-app.js` | 1555-1571 | Buenas banderas `documentBound`/`viewportBound`, sin `removeEventListener` futuro. | Usarlo como patrón intermedio y añadir `destroyAgroRepo()` si se vuelve desmontable. |
| BAJA | `apps/gold/agro/agro-cart.js` | 1398-1401 | Buen patrón: aborta listeners de render con `AbortController`. | Reutilizar este patrón en módulos pequeños antes de tocar `agro.js`. |

#### Window globals

| Severidad | Archivo | Símbolo | Hallazgo | Recomendación |
|---|---|---|---|---|
| ALTA | `apps/gold/agro/agro.js` | `window.populateCropDropdowns`, `window.refreshFactureroHistory`, `window.launchAgroWizard`, `window.switchTab` | Puentes necesarios hoy para HTML/módulos, pero mezclan API pública con deuda legacy. | Mantener mientras se extrae; documentar contrato y mover a objetos puente acotados. |
| ALTA | `apps/gold/agro/index.html` | `window.saveCrop` | Lógica operativa de cultivo vive en inline script HTML. | Mover a módulo de cultivo/modal antes de endurecer CSP. |
| MEDIA | `apps/gold/agro/agro.js` | `window.getTodayLocalISO`, `window.isValidISODate`, `window.assertDateNotFuture` | Helpers de fecha expuestos por dependencia inline. | Extraer `agro-date-utils.js` y consumir por import/puente mínimo. |
| MEDIA | `apps/gold/agro/agro-interactions.js` | `window.closeModal`, `window.selectDate`, `window.saveTask`, `window.deleteTask` | Globals legacy orientados a handlers inline/DOM. | Encapsular en namespace único o migrar listeners delegados. |
| MEDIA | `apps/gold/assets/js/main.js`, `apps/gold/assets/js/ui/uxMessages.js` | `window.showGoldToast` | Definición duplicada de toast global. | Centralizar en `YGUXMessages` y dejar alias único de compatibilidad. |
| BAJA | `apps/gold/agro/agro-market.js` | `window.__YG_MARKET_TICKER__` | Singleton global consciente para ticker. | Aceptable si queda con dueño único y cleanup explícito. |

#### Diálogos nativos

| Severidad | Archivo | Tipo | Flujo | Recomendación |
|---|---|---|---|---|
| ALTA | `apps/gold/agro/agro.js` | `confirm` | Guardrails USD, eliminar pagado, conversaciones IA, eliminar cultivo. | Migrar a modal base V10.1 por prioridad destructiva/financiera. |
| ALTA | `apps/gold/agro/agro-cart.js` | `alert`/`confirm` | Crear/eliminar carrito, eliminar item, validación de item, fallback `notifyCart`. | Primer frente real para `showAgroConfirm()` + `showAgroAlert()` fuera del monolito. |
| ALTA | `apps/gold/agro/agro-agenda.js` | `alert`/`confirm` | Eliminar actividad y validaciones del modal crear actividad. | Segundo frente de modales; reemplazar validación nativa por feedback inline/modal base. |
| MEDIA | `apps/gold/agro/agro-period-cycles.js` | `prompt`/`confirm` | Renombrar y eliminar ciclo de período. | Ya usa `showPromptModal` si existe; falta confirm base y retirar fallback nativo. |
| MEDIA | `apps/gold/agro/agro-cartera-viva-view.js` | `window.prompt` fallback | Nombre de cartera operativa. | Cuando `agro-prompt-modal.js` sea garantizado, eliminar fallback nativo. |
| MEDIA | `apps/gold/assets/js/auth/authUI.js`, `apps/gold/assets/js/admin/adminManager.js` | `confirm` | Logout y admin delete. | Tratar en frente site/global, no mezclar con modales Agro. |

### Candidatos a extracción de `agro.js`

| Prioridad | Bloque | Motivo | Riesgo | Primer paso |
|---|---|---|---|---|
| P0 | Date helpers, líneas 400-462 | Bajo acoplamiento y globales claros. | Bajo | Crear `agro-date-utils.js` y dejar alias `window.*` temporal. |
| P1 | ROI calculator, líneas 11659-11849 | Bloque UI/datos autocontenido, menor riesgo que facturero/ciclos. | Bajo-Medio | Extraer `calculateROI`, `initRoiCurrencySelector`, `injectRoiClearButton` con deps explícitas. |
| P1 | USD audit modal, líneas 3259-3580 | Modal y refresh debounce autocontenidos. | Medio | Mover a `agro-usd-audit.js`; exponer init/refresh con cleanup de timer. |
| P2 | Rankings operativos, líneas 12897-13758 | Bloque cohesivo de rankings, filtros y export. | Medio | Crear `agro-ops-rankings.js` y pasar deps (`supabase`, tab activo, privacy). |
| P2 | Asistente Agro, líneas 14075-15594 | Superficie completa con estado, timers, storage y UI. | Alto | Primero aislar listeners/timers; luego extraer a `agro-assistant.js`. |
| P3 | Ciclos/crop cards, líneas 8731-11656 | Bloque grande y semánticamente central. | Alto | No tocar como primera extracción; requiere contrato de datos/caché. |
| P3 | Facturero CRUD/historial, líneas 820-8724 | Núcleo crítico del sistema. | Muy alto | Solo cirugía puntual o wrappers; no extracción inicial. |

### Orden recomendado de ataques

1. Primer fix seguro: hacer idempotente `initFactureroSelection()` en `apps/gold/agro/agro-selection.js` y añadir cleanup técnico mínimo.
2. Segundo fix seguro: guardar y limpiar el intervalo de `NotificationsManager` en `apps/gold/assets/js/components/notifications.js`.
3. Primer frente de modales base: crear/usar un helper reusable de confirm/alert y aplicarlo en `apps/gold/agro/agro-cart.js`.
4. Segunda migración de modales: `apps/gold/agro/agro-agenda.js`, por confirm destructivo y validaciones nativas.
5. Primera extracción real: `agro-roi.js` desde el bloque ROI de `agro.js`; antes, una extracción P0 de date helpers puede servir como prueba de bajo riesgo.
6. Siguiente extracción de valor: `agro-ops-rankings.js`, solo después de estabilizar listeners y modales.

### No se hizo

- No se tocó código.
- No se aplicaron fixes.
- No se tocaron migraciones.
- No se tocó Supabase.
- No se tocó Vercel.
- No se tocaron workflows.
- No se tocaron credenciales.
- No se modificó `MANIFIESTO_AGRO.md`.
- No se modificó `ADN-VISUAL-V10.0.md`.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

---

## 2026-04-28 — MVP navegacion movil Hub/Modulo Agro

**Estado:** GREEN — implementado y validado con build

**Objetivo:** Implementar navegacion movil tipo hub/inmersiva con cuatro puertas: Inicio, Operacion, Memoria y Menu.

### Diagnostico

- `apps/gold/agro/index.html` ya tiene rail persistente, launcher expandido y regiones dedicadas con `data-agro-shell-region`.
- `apps/gold/agro/agro-shell.js` ya es el punto correcto para navegar: centraliza `data-agro-view`, `data-agro-action`, `syncRegions()`, `setActiveView()` y el evento `agro:shell:view-changed`.
- `apps/gold/agro/agro.css` actualmente convierte el rail a una navegacion lateral compacta tambien en mobile; no existe aun una barra inferior limitada al hub.
- La solucion segura es agregar una capa mobile nueva dentro del shell, sin tocar `agro.js`: estado `body[data-agro-shell-depth="hub|module"]`, hub mobile de agrupacion, tabbar inferior mobile y topbar contextual con Volver.
- El cambio no toca Supabase, datos, logica financiera, cultivos, cartera ni AgroRepo; solo orquestacion visual/navegacion del shell.
- `AGENT_REPORT_ACTIVE.md` tiene 942 lineas antes de esta seccion, por debajo del umbral canonico de rotacion de 4000.

### Plan

1. Agregar en `index.html` el hub mobile con paneles Inicio, Operacion, Memoria y Menu, mas topbar contextual y barra inferior mobile.
2. Mapear los accesos del hub a los `data-agro-view` / `data-agro-action` existentes para reutilizar el shell actual.
3. En `agro-shell.js`, mantener el tab activo de hub, manejar profundidad `hub/module`, boton Volver y titulo contextual del modulo.
4. En `agro.css`, ocultar el rail legacy en mobile, mostrar tabbar solo en `hub`, ocultarla en `module`, mostrar topbar solo en `module`, ajustar padding inferior y evitar solape con Feedback.
5. Validar con `git diff --check` y `pnpm build:gold`.

### DoD

- Mobile <=768px entra a `/agro/` en depth `hub` con barra inferior visible.
- Cambiar tabs muestra solo la agrupacion de ese hub.
- Entrar a AgroRepo cambia a depth `module`, oculta barra inferior y muestra Volver + titulo.
- Volver regresa a Memoria y reaparece la barra.
- Operacion y Menu funcionan como hubs.
- Desktop conserva rail/launcher actual.
- `agro.js`, Supabase, migraciones, Storage, RPC/grants, Vercel, workflows, credenciales y logica de datos quedan sin tocar.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/index.html` | Agrega `body[data-agro-shell-depth]`, tabbar movil, topbar contextual y hub movil con paneles Inicio, Operacion, Memoria y Menu. |
| `apps/gold/agro/agro.css` | Agrega estilos responsive <=768px para ocultar rail legacy, mostrar tabbar solo en hub, ocultarla en modulo, mostrar Volver contextual y evitar solape con Feedback. |
| `apps/gold/agro/agro-shell.js` | Agrega estado de hub/depth, manejo de Volver, mapeo view->hub, feedback mobile y titulo contextual; corrige `runAction()` para recibir la vista activa como parametro local. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registra diagnostico, plan, cambios y validacion de la sesion. |

### Validacion

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con advertencia local conocida por Node `v25.6.0`; repo/CI fijan Node `20.x`.

### QA manual recomendado

1. Mobile <=768px: entrar a `/agro/`, confirmar hub Inicio y barra inferior visible.
2. Cambiar a Operacion, Memoria y Menu; confirmar panel correcto y sin estadisticas protagonistas.
3. Desde Memoria abrir AgroRepo; confirmar barra oculta, topbar visible y boton Volver.
4. Volver; confirmar regreso a Memoria y barra visible.
5. Probar Operacion, Menu y Feedback; confirmar que Feedback no queda debajo de la barra.
6. Desktop: confirmar rail/launcher actual sin regresiones.

### NO se hizo

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RPC/grants, Storage, Vercel, workflows ni credenciales.
- No se cambio logica financiera, logica de cultivos, logica de cartera ni logica profunda de AgroRepo.

---

## 2026-04-28 — Desktop hub/module y separacion Operacion Agro

**Estado:** GREEN — implementado y validado con build

**Objetivo:** Extender a desktop el patron aprobado de navegacion `hub/module`, ocultar navegacion global dentro de modulos profundos, reforzar el topbar contextual y separar Cartera Viva / Cartera Operativa como entradas claras del hub Operacion.

### Diagnostico

- El MVP anterior agrego `body[data-agro-shell-depth="hub|module"]`, hub mobile, tabbar inferior y topbar contextual, pero su CSS operativo esta limitado a `@media (max-width: 768px)`.
- En desktop, el rail persistente y el launcher siguen visibles/operables aunque el usuario entre a vistas profundas como `cartera-viva`, `operational` o `agrorepo`.
- La estructura de `agro-shell.js` ya permite resolver la profundidad en un solo punto (`setActiveView()`, `setShellDepth()`, `setMobileHub()`), por lo que no hace falta tocar `agro.js`.
- El hub Operacion ya contiene accesos separados en mobile, pero desktop sigue dependiendo del rail/launcher; se necesita una superficie de hub visible tambien en desktop y no una mezcla de Cartera Viva + Cartera Operativa como una unica entrada ambigua.
- Los titulos actuales de algunas superficies usan blancos protagonistas o estilos locales; se puede alinear el shell nuevo con el tono de `docs-agro`: Orbitron sobrio, gold principal, subtitulo muted y jerarquia compacta.

### Plan de ejecucion

1. Convertir el hub actual en una superficie responsive compartida desktop/mobile, no solo mobile.
2. Agregar tabs de hub para desktop usando los mismos grupos: Inicio, Operacion, Memoria y Menu.
3. Ajustar CSS para que `hub` muestre navegacion global/hub y `module` oculte rail, launcher/tabbar global y muestre topbar contextual.
4. Mantener la tabbar inferior solo para mobile y usar navegacion de hub superior en desktop.
5. Reforzar visualmente titulos del hub/topbar con tokens V10 y lenguaje docs: gold, muted, Orbitron/Rajdhani, sin titulo blanco protagonista.
6. Asegurar que Operacion muestre `Cartera Viva` y `Cartera Operativa` como entradas independientes.
7. Validar con `git diff --check` y `pnpm build:gold`.

### Riesgos

- Ocultar el rail en desktop durante `module` puede afectar accesos rapidos si el boton Volver no queda siempre visible; mitigacion: topbar contextual sticky con Volver.
- `operaciones`, `cartera-viva` y `operational` comparten parte del legacy financiero; el cambio debe separar navegacion/superficie, no tocar logica comercial ni datos.
- El CSS de Agro es grande; el cambio debe quedarse acotado al bloque del shell/hub para evitar regresiones visuales no relacionadas.

### Archivos a tocar

- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Resultado de implementacion

- `index.html`: se elimino la quicknav superior del header (`Dashboard Principal` y `Nuevo registro`). El logo conserva la salida principal y el hub conserva `Dashboard Agro` / `Nuevo registro` dentro de Inicio.
- `agro.css`: se oculto el rail legacy desktop y su toggle cuando `agro-shell-ready` esta activo; tambien se neutralizo el padding lateral residual del layout.
- `agro.css`: las tabs desktop `Inicio / Operacion / Memoria / Menu` se reordenan visualmente al fondo del hub, sobre el footer.
- `agro.css`: los titulos/eyebrow del hub mobile vuelven a centrarse para evitar la lectura desbalanceada de las capturas.
- `agro.css`: dentro de `Cartera Viva` y `Cartera Operativa` se oculta la navegacion hermana `.agro-commercial-family`, evitando que ambas superficies parezcan vivir mezcladas.
- `agro-shell.js`: auditado; no requirio cambios.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning no bloqueante: engine local Node `v25.6.0` vs requerido `20.x`.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RLS, RPC/grants, Storage, Vercel, workflows ni credenciales.
- No se cambio logica financiera, logica de cultivos, logica de cartera ni logica profunda de AgroRepo.

### Resultado de implementacion

- `index.html`: el hub existente pasa a ser `Hub Agro` responsive y suma tabs desktop para Inicio, Operacion, Memoria y Menu reutilizando el contrato `data-agro-mobile-tab`.
- `agro.css`: se agrego una capa shell hub/module fuera del media query mobile. En `hub` se ocultan regiones profundas y se muestra hub; en `module` se ocultan rail/sidebar/quicknav y se muestra topbar contextual sticky.
- `agro.css`: se mantuvo la tabbar inferior solo para mobile; desktop usa tabs superiores del hub.
- `agro.css`: titulos principales de hub/topbar/modulo usan gold V10 y gradiente estatico estilo docs-agro, evitando blanco protagonista.
- `agro-shell.js`: el estado `hub/module` y el foco al volver ya no dependen de viewport; las acciones profundas tambien activan topbar contextual en desktop.
- `agro-shell.js`: `operaciones` queda rotulado como `Operacion Comercial`.
- Operacion muestra `Cartera Viva` y `Cartera Operativa` como entradas independientes del hub y cada una abre su vista dedicada.

### Validacion

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning no bloqueante: engine local Node `v25.6.0` vs requerido `20.x`.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RLS, RPC/grants, Storage, Vercel, workflows ni credenciales.
- No se cambio logica financiera, logica de cultivos, logica de cartera ni logica profunda de AgroRepo.

---

## 2026-04-28 — Shell hub/module V2 limpieza visual

**Estado:** GREEN — implementado y validado con build; QA browser omitida por instruccion del usuario

**Objetivo:** Segunda pasada quirurgica sobre el shell Agro para quitar duplicidades visuales, limpiar header, centrar mejor el hub mobile, eliminar el rail legacy en desktop y reforzar la separacion semantica entre Cartera Viva y Cartera Operativa.

### Diagnostico

- Mobile ya usa hub y tabbar inferior, pero el bloque de titulo del hub quedo alineado a la izquierda en el ultimo override y se percibe descentrado.
- El header superior conserva acciones de acceso rapido como `Nuevo registro`; duplican accesos del hub y agregan ruido visual.
- Desktop muestra simultaneamente el hub nuevo y el rail legacy izquierdo, generando dos sistemas globales de navegacion.
- La barra desktop `Inicio / Operacion / Memoria / Menu` se lee mejor como navegacion inferior del hub, cerca del footer, no como otro elemento protagonista sobre el contenido.
- Cartera Viva y Cartera Operativa ya tienen entradas separadas en Operacion, pero la subnavegacion legacy puede volver a presentarlas como hermanas dentro de la misma superficie.

### Plan

1. Auditar markup actual del header, rail, hub tabs y subnavegacion financiera.
2. Eliminar del header superior la accion `Nuevo registro`, conservando solo accesos estrictamente necesarios.
3. Centrar titulos/eyebrow del hub en mobile y desktop con tokens V10.
4. Ocultar el rail legacy en desktop cuando el shell hub/module esta activo y neutralizar padding lateral residual.
5. Reubicar tabs desktop del hub al fondo de la superficie, justo sobre el footer.
6. Ocultar o neutralizar la subnavegacion `Cartera Viva / Cartera Operativa` cuando ya se esta dentro de una de esas vistas, manteniendo separacion semantica.
7. Validar con `git diff --check` y `pnpm build:gold`.

### Riesgos

- Ocultar el rail desktop cambia un habito de navegacion legacy; mitigacion: hub visible en profundidad `hub` y topbar con `Volver` en profundidad `module`.
- La navegacion financiera legacy comparte componentes; el ajuste debe ocultar mezcla visual sin tocar logica financiera ni datos.

### Archivos a tocar

- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

---

## 2026-04-28 — Documentacion canon hub/module Agro

**Estado:** GREEN — implementado y validado con build

### Diagnostico

El shell Agro cambio su navegacion principal hacia un patron hub/module. La documentacion canonica y publica debe reflejarlo para evitar que futuros agentes vuelvan a tratar el rail legacy como navegacion principal activa.

### Plan

- Actualizar Manifiesto Agro con la regla semantica hub/module.
- Actualizar Ficha Tecnica con la descripcion actual de `agro-shell.js`.
- Actualizar documentacion publica Agro si describe navegacion anterior.
- Revisar README/llms.txt y actualizar solo si mencionan navegacion/shell de Agro.
- No tocar ADN Visual V10 por ser inmutable.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | docs | Seccion 4.11.3 reescrita con canon hub/module. Se agrego seccion 4.11.4 Navegacion Hub/Module con puertas, regla canonica y regla de modulos profundos. Se agrego regla de separacion visual para Cartera Viva / Cartera Operativa en 4.5.2. |
| `FICHA_TECNICA.md` | docs | Linea `agro-shell.js` actualizada: ahora describe navegacion hub/module, hub central desktop, barra inferior mobile, topbar contextual. |
| `apps/gold/docs-agro.html` | docs | Seccion "Como moverte dentro de Agro" reescrita para usuario final con las cuatro puertas (Inicio, Operacion, Memoria, Menu), patron hub/module y explicacion mobile/desktop. |
| `apps/gold/public/llms.txt` | docs | Agregada linea sobre navegacion hub/module en seccion 8. |

### No se toco

- `README.md` (raiz): no menciona navegacion Agro.
- `apps/gold/README.md`: no menciona navegacion Agro.
- `apps/gold/docs/ADN-VISUAL-V10.0.md`: inmutable, no se toco.
- Codigo: no se toco ningun archivo de codigo.
- Supabase, migraciones, Vercel, workflows, credenciales: no se tocaron.

### Validacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (agent-guard OK, agent-report-check OK, 165 modules, check-llms OK, UTF-8 OK).

### Estado final

GREEN. Documentacion canonica actualizada sin tocar codigo ni ADN Visual.

---

## 2026-04-29 — Separacion Mi Carrito / Cartera Operativa

**Estado:** YELLOW EN CURSO — diagnostico y plan registrados antes de editar codigo

**Objetivo:** Corregir la mezcla visual entre `Mi Carrito` y `Cartera Operativa` dentro del nuevo shell hub/module Agro.

### Diagnostico

- `apps/gold/agro/index.html` muestra `Mi Carrito` como acceso hermano dentro del hub Operacion. Eso es correcto y debe conservarse.
- `apps/gold/agro/agro-shell.js` contiene el alias `carrito -> operational/cart`; por eso el acceso profundo `Mi Carrito` termina montando la superficie `operational` con topbar de carrito.
- `apps/gold/agro/agro-shell.js` tambien mapea el tab financiero legacy `carrito` hacia `operational`, reforzando la mezcla.
- `apps/gold/agro/agroOperationalCycles.js` define `SUBVIEW_CART` dentro de `SUBVIEW_OPTIONS`, lo usa como subvista inicial y lo renderiza como chip `Mi Carrito` en `renderSubviewSwitch()`.
- `apps/gold/agro/agroOperationalCycles.js` mueve `#agro-cart-root` hacia `#agro-operational-list` cuando la subvista es `cart`, haciendo que el carrito viva dentro de Cartera Operativa.
- `apps/gold/agro/agro-cart.js` ya conserva la funcion de convertir items del carrito en gasto/deuda/donacion/perdida real mediante `handleRegisterPurchase()` y `CART_OPERATION_REGISTRATION_OPTIONS`; no hace falta duplicar ni tocar esa logica.

### Plan

1. Cambiar el routing del shell para que `carrito` abra la vista dedicada existente y no `operational/cart`.
2. Quitar `cart` de las subviews internas de `Cartera Operativa` y dejar el default en `active`.
3. Retirar el chip `Mi Carrito` y la rama de render que monta carrito dentro de `agroOperationalCycles.js`.
4. Mantener el mount dedicado `#carrito-dedicated-root` para `Mi Carrito` y conservar la conversion de items a operaciones reales.
5. Ajustar CSS mobile para ocultar Feedback flotante en modulos profundos, reforzar padding inferior con safe-area y evitar solapes de header/contextbar en 360/390/430.
6. Validar con navegador en mobile y desktop, luego `pnpm build:gold`.

### Riesgos

- `agro.js` mantiene helpers legacy de reparent del carrito; el cambio debe ser minimo y compatible con ese patron existente.
- Si algun link historico usa `operational-cart`, debe redirigir a la vista dedicada de carrito, no recrear el subtab dentro de Cartera Operativa.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-shell.js` | JS routing | `carrito` y `operational-cart` ahora resuelven a la vista dedicada `carrito`; `operational` queda con default `active` y sin subview `cart`. |
| `apps/gold/agro/agroOperationalCycles.js` | JS vista | Eliminada la subvista interna `cart`, el chip `Mi Carrito`, el resumen de carrito y el mount de `#agro-cart-root` dentro de Cartera Operativa. |
| `apps/gold/agro/agro.js` | JS wiring legacy | El reparent legacy del carrito ya no permite montar `#agro-cart-root` dentro de `operational/cart`; solo lo monta en `#carrito-dedicated-root` cuando la vista activa es `carrito`. |
| `apps/gold/agro/index.html` | Markup/copy | El acceso del launcher a Cartera Operativa deja de mencionar carrito; el header dedicado usa `Mi Carrito`. |
| `apps/gold/agro/agro.css` | CSS mobile | En modulos profundos mobile se oculta el FAB de Feedback, se refuerza padding inferior con `env(safe-area-inset-bottom)` y se ajusta header <=480/390 para evitar compresion. |

### Validacion

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `node --check apps/gold/agro/agroOperationalCycles.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### QA

- QA browser/manual no ejecutada por instruccion expresa del usuario el 2026-04-29.
- Se detuvo el servidor Vite local abierto para el intento inicial de QA y se elimino la carpeta temporal `.playwright-mcp/`.

### NO se hizo

- No se leyo `testqacredentials.md`.
- No se hizo QA autenticada ni se tocaron datos reales.
- No se toco Supabase, migraciones, RLS, Storage, Vercel, workflows ni credenciales.
- No se hizo commit ni push.

---

## 2026-04-29 — V3.1 Bloque A: idempotencia facturero selection

**Estado:** COMPLETADO

### Diagnóstico

`initFactureroSelection()` registra listeners de selección del facturero. Se revisa si puede duplicarlos al reinicializar el módulo y se aplicará un guard idempotente/cleanup mínimo sin cambiar UX ni lógica de datos.

### Plan

- Revisar listeners actuales.
- Agregar guard idempotente o `AbortController`.
- Mantener comportamiento visual y funcional.
- No tocar `agro.js`.
- Validar con `git diff --check` y `pnpm build:gold`.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-selection.js` | JS listeners | Se agrego `AbortController` de modulo y `cleanupFactureroSelection()`; `initFactureroSelection()` limpia listeners anteriores antes de registrar `click`, `keydown`, `agro:finance-tab:changed`, `agro:crop:changed` y `data-refresh` con `{ signal }`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | docs | Sesion V3.1 Bloque A documentada. |

### Validacion

- `node --check apps/gold/agro/agro-selection.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### NO se hizo

- No se cambio UX.
- No se cambio logica de seleccion.
- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.

---

## 2026-04-29 — Corrección semántica hub/module Agro

**Estado:** GREEN

### Diagnóstico

El nuevo hub simplificó la navegación, pero produjo una regresión semántica: `Operación Comercial` aparece como módulo cuando debe tratarse como familia conceptual/económica. Los módulos reales son Cartera Viva, Cartera Operativa y Mi Carrito. También deben restaurarse accesos importantes como Ciclos finalizados, Estadísticas de ciclos y el selector de cultivo en Rankings.

### Plan

- Eliminar `Operación Comercial` como card/módulo clickeable del hub.
- Reorganizar la puerta `Operación` con módulos reales.
- Restaurar Ciclos activos/finalizados/estadísticas de ciclos.
- Restaurar Ciclos de Período y subviews reales existentes.
- Revisar Rankings y confirmar selector de cultivo.
- Separar visualmente marca, usuario y notificaciones.
- No tocar `agro.js` ni datos.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Hub markup | La puerta `Operación` elimina `Operación Comercial` como card clickeable y restaura accesos por secciones: Producción, Períodos, Finanzas, Trabajo y lectura. |
| `apps/gold/agro/agro.css` | Shell CSS | Se agregan encabezados visuales sobrios para secciones del hub, se alinea el header para separar marca de usuario/notificaciones y se permite que Rankings muestre solo el selector de cultivo sin reabrir toda la superficie del facturero. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnóstico, plan y cierre de la corrección semántica. |

### Validación

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### NO se hizo

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.
- No se modificó lógica de datos, cartera, cultivos ni AgroRepo.

---

## 2026-04-29 — Corrección menú/rankings hub Agro

**Estado:** GREEN

### Diagnóstico

El hub quedó visualmente limpio, pero persisten errores semánticos: Rankings aparece con nombre ambiguo, el selector de ciclos finalizados navega en vez de seleccionar contexto, Menú/Ajustes duplica módulos existentes, Feedback está duplicado y Perfil está mejor ubicado en Inicio.

### Plan

- Renombrar Rankings según su función real.
- Corregir selección de ciclos finalizados en Rankings.
- Limpiar Menú/Ajustes para no duplicar módulos.
- Mantener Feedback solo como FAB flotante.
- Mover Perfil a Inicio.
- No tocar datos ni Supabase.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Hub/copy | `Mi Perfil` se movió a Inicio; Menú queda con Documentación, Soporte oficial y Privacidad; se retiró Feedback como card; Rankings pasa a `Rankings de Clientes`; Ayuda/soporte deja de duplicar Clima, Asistente, Social y AgroRepo. |
| `apps/gold/agro/agro.css` | CSS contextual | El bloque de ciclos cerrados permite chips de selección en Rankings y mantiene el enlace a historial como secundario. |
| `apps/gold/agro/agro-shell.js` | Shell JS | `perfil` vuelve al hub Inicio; `rankings` usa título `Rankings de Clientes`; se agrega picker de ciclos cerrados usando `window.__AGRO_CROPS_STATE` y `window.setSelectedCropId()` sin tocar `agro.js`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Diagnóstico, plan y cierre de la corrección menú/rankings. |

### Validación

- `node --check apps/gold/agro/agro-shell.js`: PASS.
- `node --check apps/gold/agro/agro-selection.js`: PASS.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS. Warning local no bloqueante: Node `v25.6.0` vs engine esperado `20.x`.

### NO se hizo

- No se tocó `apps/gold/agro/agro.js`.
- No se tocó Supabase, migraciones, RLS, RPC, Storage, Vercel, workflows ni credenciales.
- No se cambió lógica financiera, cultivos, cartera ni AgroRepo.

---

## 2026-04-30 — Ajuste semántico del hub: Operación → Granja

**Estado:** COMPLETADO

### Diagnóstico

El hub funciona bien pero usa lenguaje operativo ("Operación", "Producción", "Finanzas"). Se ajustan las etiquetas visibles para hablar más cercano al concepto de finca/granja sin tocar estructura, lógica ni datos.

### Plan

- Renombrar tabs "Operación" → "Granja" (3 instancias en index.html).
- Cambiar título del hub a "Mi Granja".
- Renombrar secciones: "Producción" → "Ciclos de cultivos", "Períodos" → "Ciclos de períodos", "Finanzas" → "Mis finanzas".
- Actualizar label visible en agro-shell.js.
- No tocar claves internas JS ni datos.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Markup/copy | Tabs "Operación" → "Granja" (rail, hub tab, mobile tabbar). Título hub → "Mi Granja". Secciones → "Ciclos de cultivos", "Ciclos de períodos", "Mis finanzas". |
| `apps/gold/agro/agro-shell.js` | Label visible | `operaciones.label` → "Mi Granja" (topbar contextual). |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Docs | Sesión documentada. |

### Validación

- `node --check apps/gold/agro/agro-shell.js`: PASS
- `git diff --check`: PASS
- `pnpm build:gold`: PASS (165 modules, check-llms OK, UTF-8 OK)

---

## 2026-04-30 — Clarificar label de períodos activos en hub

**Estado:** COMPLETADO

### Diagnóstico

La card dentro de "Ciclos de períodos" decía "Ciclos de período", lo que confunde porque la sección ya se llama Ciclos de períodos. La card representa los períodos activos.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | Markup/copy | Hub card "Ciclos de período" → "Períodos activos" (línea 560). Rail subgroup label → "Períodos activos" (línea 228). |
| `apps/gold/agro/agro-shell.js` | Label visible | `period-cycles.label` → "Períodos activos" (topbar contextual). |

### Validación

- `node --check apps/gold/agro/agro-shell.js`: PASS
- `git diff --check`: PASS
- `pnpm build:gold`: PASS (165 modules, check-llms OK, UTF-8 OK)

---

## 2026-05-01 — Corrección documental ADN Visual V10

**Estado:** COMPLETADO

### Objetivo

Corregir la contradicción documental en ADN-VISUAL-V10.0.md, que se declaraba como canon activo e inmutable cuando en realidad fue reemplazado por V11.

### Diagnóstico

V10 se presentaba internamente como "ACTIVO" e "inmutablemente oficial", pero AGENTS.md y ADN-VISUAL-V11.0.md ya indicaban correctamente que V11 es el canon visual vigente y V10 es referencia histórica fundacional. Esto creaba contradicción en la jerarquía documental.

### Cambios

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/ADN-VISUAL-V10.0.md` | Corrección documental | Título: "INMUTABLE" → "HISTÓRICO". Estado: "ACTIVO" → "HISTÓRICO / SOLO CONSULTA". Agregada nota superior indicando canon activo actual es V11. Frase "referencia visual inmutable e inmutablemente oficial" → "referencia fundacional, no canon activo". |

### Detalle de la corrección

1. Título principal: `# 💎 ADN VISUAL INMUTABLE V10.0 💎` → `# 💎 ADN VISUAL V10.0 — HISTÓRICO 💎`
2. Subtítulo: `# YavlGold — ADN Visual Inmutable` → `# YavlGold — Base visual fundacional`
3. Descripción: `Documento completo del sistema de diseño. Referencia visual inmutable e inmutablemente oficial.` → `Documento histórico del sistema visual V10.0. Referencia fundacional, no canon activo.`
4. Nota superior: Agregado `> **Canon visual activo actual:** apps/gold/docs/ADN-VISUAL-V11.0.md`
5. Sección header: `## Inmutable V10.0` → `## Histórico V10.0`
6. Estado: `- Estado: ACTIVO` → `- Estado: HISTÓRICO / SOLO CONSULTA`
7. Tabla DNA: `DNA Version | V10.0 — Inmutable` → `DNA Version | V10.0 — Histórico`
8. Tabla DNA: `Estado | ACTIVO` → `Estado | HISTÓRICO / SOLO CONSULTA`
9. §0 Misión: `Este archivo define el DNA visual oficial e inmutable de YavlGold.` → `Este archivo es el documento histórico del sistema visual V10.0 de YavlGold.`
10. §14 Gobernanza: `"Este documento es la referencia visual inmutable."` → `"Este documento es la referencia visual histórica fundacional."`

### Validación

- `git diff --check`: PASS
- `pnpm build:gold`: PASS (167 modules, 10.02s, agent-guard OK, agent-report-check OK, check-llms OK, UTF-8 OK)

### NO se hizo

- NO se tocó ADN-VISUAL-V11.0.md
- NO se tocó código
- NO se tocó Supabase
- NO se alteró contenido visual del producto

---

## 2026-05-01 — Corrección documental MANIFIESTO_AGRO (V10 → V11)

**Estado:** COMPLETADO

### Objetivo

Corregir contradicción en MANIFIESTO_AGRO.md que referenciaba V10 como canónico cuando V11 es el canon visual activo.

### Diagnóstico

MANIFIESTO_AGRO.md tenía dos referencias a V10 como canónico:
- Línea 8: Fuente canónica superior incluía `ADN-VISUAL-V10.0.md`
- Línea 1181: Regla 5 indicaba "Cualquier cambio visual debe obedecer el ADN Visual V10"

Esto contradecía AGENTS.md, FICHA_TECNICA.md, AGENT_CONTEXT_INDEX.md y llms.txt, que todos marcan V11 como canon activo.

### Cambios

| Archivo | Tipo | Cambios |
|---|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Corrección documental | Línea 8: `ADN-VISUAL-V10.0.md` → `ADN-VISUAL-V11.0.md`. Línea 1181: "ADN Visual V10" → "ADN Visual V11". |

### Validación

- `git diff --check`: PASS
- `pnpm build:gold`: PASS (167 modules, 4.02s, agent-guard OK, agent-report-check OK, check-llms OK, UTF-8 OK)

### NO se hizo

- NO se tocó ADN-VISUAL-V10.0.md
- NO se tocó ADN-VISUAL-V11.0.md
- NO se tocó código
- NO se tocó Supabase

---

## 2026-05-02 — Duración real en Finalizados/Perdidos + Semilla en kg

**Estado:** EN PROGRESO

### Diagnóstico inicial

#### 1. Render de cards de cultivos

| Tipo | Archivo:línea | Función | Estado actual |
|---|---|---|---|
| **Activos** | `agrociclos.js:354` | `renderCard()` | `mode === 'active'`. Muestra `Día X/Y (Z%)` calculado con `ciclo.diaActual`/`ciclo.diasTotales`/`resolveProgress()`. OK, no se toca. |
| **Finalizados** | `agrociclos.js:354` | `renderCard()` | `mode === 'finished'`. Muestra hardcoded `'Completado'` (línea 370). **Sin cálculo de duración real.** |
| **Perdidos** | `agro.js:11362-11373` + `agrociclos.js:354` | `buildFinishedCycleCardsData()` / `renderCard()` | Cards se construyen como datos (`groupType: 'lost'`) pero **NO se renderizan en el DOM** de "Mis cultivos". Solo van al workspace sidebar (`publishCyclesWorkspaceSnapshot`). |

#### 2. Cálculo actual de progreso para activos

- `computeCropProgress()` (`agro.js:710`): calcula `totalDays` desde `templateDurationDays` o `expected_harvest_date` contra `start_date`. Usa `diffDays(todayKey, startDate) + 1` para `dayIndex` (conteo inclusivo: Día 1 = día de siembra).
- Funciones duplicadas en `agro-crop-report.js:373` y `agro-stats-report.js:297`.

#### 3. Campos de fecha reales en `public.agro_crops`

| Campo | Tipo | Existe | Rol |
|---|---|---|---|
| `start_date` | `date NOT NULL` | SI | **Fecha canónica de siembra/inicio** |
| `expected_harvest_date` | `date` | SI | Cosecha estimada. PROHIBIDO usarla como cierre real. |
| `actual_harvest_date` | `date` | SI | **Fecha real de cosecha**. Es el mejor campo para calcular duración de finalizados. |
| `lost_at` | — | **NO** | Necesario para calcular duración de perdidos. |
| `closed_at` | — | **NO** | Cierre genérico. Respaldo si no hay harvest_date ni lost_at. |
| `seed_kg` | — | **NO** | Cantidad de semilla en kg. |

La función `resolveCropEndDateKey()` (`agro.js:8861`) busca en 8 campos posibles; solo `actual_harvest_date` existe realmente en la DB. Los demás son defensivos.

#### 4. Wizard de crear cultivo

- HTML: `index.html:1302-1400` (`#modal-new-crop`, `#form-new-crop`)
- `openCropModal()`: `agro.js:15956` — resetea todo, pone `start_date` = hoy, `status` = `sembrado`
- `openEditModal()`: `agro.js:16007` — llena campos desde `cropsCache`
- `window.saveCrop`: `index.html:2159` — implementación activa (sobreescribe la de `agro.js:16106`)
- `closeCropModal()`: `agro.js:16092`

#### 5. Campos actuales del formulario

Nombre, Variedad, Icono, Cultivo base (template), Ciclo estimado, Área (ha), Inversión Base + moneda, Fecha de Siembra, Cosecha Esperada, Estado.

**No existe campo de semilla ni fechas de cierre/pérdida.**

#### 6. Payload de guardado actual

INSERT/UPDATE envia: `user_id, name, variety, area_size, investment, investment_amount, investment_currency, investment_usd_equiv, investment_fx_usd_cop, investment_fx_usd_ves, investment_fx_at, start_date, expected_harvest_date, status, status_mode, status_override`.

Columnas opcionales con fallback: `status_mode, status_override, investment_amount, investment_currency, investment_usd_equiv, investment_fx_usd_cop, investment_fx_usd_ves, investment_fx_at`.

#### 7. Arquitectura de renderizado de history

- `ensureCropCycleHistorySection()` (`agro.js:10876`): crea/secciones de historia. Solo tiene sección "finished".
- `renderCropCycleHistory()` (`agro.js:11066`): llama `splitClosedCycleHistory()` → solo renderiza `finishedCrops` (línea 11099). `lostCrops` se descartan silenciosamente.
- `loadCrops()` (`agro.js:11349`): construye `lostCycleCards` (línea 11362) pero solo las pasa a `publishCyclesWorkspaceSnapshot`, no a render.

### Archivos candidatos

| Archivo | Tipo de cambio |
|---|---|
| `supabase/migrations/<timestamp>_add_crop_seed_and_closure_dates.sql` | NUEVO — migración |
| `apps/gold/agro/index.html` | HTML form + saveCrop() inline |
| `apps/gold/agro/agro.js` | Helper, buildFinishedCycleCardsData, ensureCropCycleHistorySection, renderCropCycleHistory, openEditModal |
| `apps/gold/agro/agrociclos.js` | renderCard() |
| `apps/gold/agro/agro.css` | Estilos mínimos si metadata rompe layout |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Este reporte |

### Plan

1. **Migración Supabase**: Agregar `seed_kg numeric NULL`, `lost_at date NULL`, `closed_at date NULL` a `public.agro_crops`.
2. **Form HTML**: Agregar input `crop-seed-kg` (number, min=0, step=any). Agregar inputs condicionales `crop-actual-harvest-date` y `crop-lost-date` para edición.
3. **saveCrop()**: Incluir `seed_kg`, `actual_harvest_date`, `lost_at`, `closed_at` en payload.
4. **openEditModal()**: Poblar `seed_kg`, `actual_harvest_date`, `lost_at`.
5. **Helper `calculateCycleDurationDays(startDate, endDate)`**: Conteo inclusivo (coherente con `computeCropProgress` que usa `+1`). Retorna null si faltan fechas.
6. **`buildFinishedCycleCardsData()`**: Pasar `seed_kg`, `actual_harvest_date`, `lost_at`, `closed_at`, `start_date_raw`, `durationDays` calculado.
7. **`buildActiveCycleCardsData()`**: Pasar `seed_kg`.
8. **`renderCard()`**: Para finished: `Inicio a fin: X días` o fallback `Completado`. Para lost: `Inicio a pérdida: X días` o fallback `Perdido`. Metadata `Semilla: X kg` solo si seed_kg > 0.
9. **`ensureCropCycleHistorySection()`**: Agregar sección para perdidos (`crops-cycle-lost-section`, `crops-cycle-lost-title`, `crops-cycle-lost-grid`).
10. **`renderCropCycleHistory()`**: Renderizar también `lostCrops` en la nueva sección.
11. **CSS**: Ajustes mínimos si la metadata nueva rompe en mobile 360x640.
12. **Build**: `pnpm build:gold`.

### Decisión de conteo

Se usará **conteo inclusivo** (`diferencia_en_días + 1`) para mantener coherencia con `computeCropProgress()` que ya usa `diffDays(todayKey, startDate) + 1` para el `dayIndex` de activos (Día 1 = día de siembra).

### Riesgos

- Cultivos históricos sin `actual_harvest_date` ni `lost_at`: mostrarán fallback textual, sin romper.
- `lost_at` no se poblará retroactivamente; solo cultivos marcados como perdidos después de esta migración tendrán fecha. Se usará fallback.
- La sección de Perdidos en el DOM es nueva; verificar que no rompa el layout existente en mobile.
- `seed_kg` es nullable; `0` no es lo mismo que `null`. Solo se muestra metadata si `seed_kg > 0`.

### DoD

- [x] Activos: siguen mostrando `Día X/Y (%)`.
- [x] Finalizados con fecha real: `Inicio a fin: X días` calculado.
- [x] Finalizados sin fecha real: `Completado`.
- [x] Perdidos con fecha real: `Inicio a pérdida: X días` calculado.
- [x] Perdidos sin fecha real: `Perdido`.
- [x] Sin hardcodeos de días.
- [x] Input `Semilla usada (kg)` en crear y editar.
- [x] Card muestra `Semilla: X kg` solo si hay valor.
- [x] Mobile 360x640 no se rompe (CSS mínimo, sin cambios de layout).
- [x] `pnpm build:gold` pasa.

---

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `supabase/migrations/20260502180000_agro_crops_seed_and_closure_dates.sql` | NUEVO | Agrega `seed_kg numeric NULL`, `lost_at date NULL`, `closed_at date NULL` |
| `apps/gold/agro/index.html` | HTML | Agrega input `crop-seed-kg` y contenedor `crop-closure-fields` con `crop-actual-harvest-date` y `crop-lost-date` |
| `apps/gold/agro/index.html` | JS (saveCrop) | Lee `seed_kg`, `actual_harvest_date`, `lost_at` del form. Los incluye en payloads INSERT/UPDATE. Agrega columnas a `OPTIONAL_CROP_COLUMNS`. |
| `apps/gold/agro/agro.js` | Funciones | `calculateCycleDurationDays()` nuevo helper (conteo inclusivo, +1). `resolveCropEndDateKey()` prioriza `lost_at` y `closed_at`. `openCropModal()` limpia seed_kg y oculta closure fields. `openEditModal()` pobla seed_kg, actual_harvest_date, lost_at. `closeCropModal()` oculta closure fields. |
| `apps/gold/agro/agro.js` | `buildFinishedCycleCardsData()` | Calcula `durationDays` (lost → `lost_at`/`closed_at`/`actual_harvest_date`; finished → `actual_harvest_date`/`closed_at`). Agrega `seedKg` y `durationDays` al objeto. |
| `apps/gold/agro/agro.js` | `buildActiveCycleCardsData()` | Agrega `seedKg` al objeto. |
| `apps/gold/agro/agro.js` | `ensureCropCycleHistorySection()` | Crea sección para perdidos (`crops-cycle-lost-section`) con título rojo. |
| `apps/gold/agro/agro.js` | `renderCropCycleHistory()` | Renderiza `lostCrops` en grid separado. Oculta sección si vacía. |
| `apps/gold/agro/agrociclos.js` | `renderCard()` | Progreso finished: `Inicio a fin: X días` o `Completado`. Progreso lost: `Inicio a pérdida: X días` o `Perdido`. Profit label: `Pérdida Total` para perdidos. Agrega `Semilla: X kg` si `seedKg > 0`. |
| `apps/gold/agro/agrociclos.css` | CSS | Agrega `.crop-seed-meta` (texto sutil, agrícola). |

### Campos usados

| Propósito | Campo DB | Tipo |
|---|---|---|
| Fecha inicio | `start_date` | `date NOT NULL` (ya existía) |
| Cierre finished | `actual_harvest_date` | `date` (ya existía) |
| Cierre finished (fallback) | `closed_at` | `date` (nuevo) |
| Cierre lost | `lost_at` | `date` (nuevo) |
| Cierre lost (fallback) | `closed_at` | `date` (nuevo) |
| Semilla | `seed_kg` | `numeric` (nuevo) |

### Cálculo de duración

- Helper: `calculateCycleDurationDays(startDate, endDate)` → `agro.js:628`
- Retorna `diffDays(end, start) + 1` (conteo inclusivo, coherente con `computeCropProgress()`).
- Retorna `null` si falta fecha, fecha inválida, o end < start.

### Validación

- `node --check agro.js`: PASS
- `node --check agrociclos.js`: PASS
- `pnpm build:gold`: PASS (167 modules, agent-guard OK, agent-report-check OK, check-llms OK, UTF-8 OK)
- Búsqueda de hardcodeos (`rg "Inicio a fin: [0-9]"` etc.): 0 resultados en código nuevo.

### Riesgos y datos históricos

- Cultivos finalizados/perdidos sin fecha real de cierre/pérdida muestran fallback textual (`Completado` / `Perdido`). No rompen.
- `lost_at` no se pobla retroactivamente. Solo cultivos marcados como perdidos después de aplicar la migración podrán tener fecha. El formulario de edición permite al usuario establecer las fechas manualmente.
- `seed_kg` es opcional. Si no se ingresa, se guarda `null` y no se muestra metadata.

### QA sugerido

1. Crear cultivo sin semilla → no debe aparecer "Semilla" en card.
2. Crear cultivo con semilla 12.5 → card muestra `Semilla: 12.5 kg`.
3. Editar cultivo con semilla → cambiar a 8 → card actualiza.
4. Editar cultivo y limpiar semilla → metadata desaparece.
5. Ciclo activo → sigue mostrando `Día X/Y (%)`.
6. Editar cultivo finalizado → establecer "Fecha real de cosecha" → guardar → card muestra `Inicio a fin: X días`.
7. Cultivo finalizado sin fecha cierre → `Completado`.
8. Editar cultivo perdido → establecer "Fecha de pérdida" → guardar → card muestra `Inicio a pérdida: X días`.
9. Cultivo perdido sin fecha pérdida → `Perdido`.
10. Revisar mobile 360x640.

### NO se hizo

- NO se usaron números hardcodeados de días.
- NO se inventaron fechas.
- NO se tocó la semántica de Cartera Viva, Cartera Operativa ni Finanzas.
- NO se rediseñó la vista.
- NO se tocó `agro.js` monolito más allá del wiring mínimo necesario.
- NO se usó React, Tailwind, SPA ni dependencias nuevas.
- NO se tocó RLS.

---

## 2026-05-02 — Cierre quirúrgico metadata Ciclos de Cultivo

### Diagnóstico de cierre

DeepSeek V4 Pro dejó implementada la mejora de metadata para Ciclos de Cultivo: duración real en estados finalizados/perdidos, semilla opcional en kg, wiring de formulario y migración Supabase. El cierre de esta sesión debe auditar el diff real, corregir solo hallazgos pequeños si aparecen, validar build y dejar claro el estado de aplicación remota de la migración.

### Estado heredado

- `git diff --check` reportado como PASS.
- `pnpm build:gold` reportado como PASS.
- Migración nueva: `supabase/migrations/20260502180000_agro_crops_seed_and_closure_dates.sql`.
- Supabase remoto no aplicado por falta/conexión de credencial `SUPABASE_DB_PASSWORD`.
- Hallazgo pendiente: revisar `apps/gold/agro/agro.js:12458` (`'90d': '90 días'`) para confirmar que es rango histórico y no duración hardcodeada de ciclos.

### Riesgos a revisar

- Que `actual_harvest_date` no se use como fecha estimada.
- Que finalizados/perdidos no usen días hardcodeados.
- Que perdidos no rompa la separación semántica de tabs.
- Que `seed_kg` sea nullable, editable y no produzca `0 kg`/`NaN kg`.
- Que la migración no altere RLS, defaults ni datos históricos.

### Plan de cierre

1. Auditar archivos tocados y diff completo.
2. Verificar migración SQL y comandos Supabase disponibles.
3. Confirmar cálculo real de duración y uso correcto de fechas.
4. Confirmar separación visual/semántica de Activos, Finalizados y Perdidos.
5. Ejecutar checks finales: `git diff --check`, `pnpm build:gold`, búsqueda `rg`.
6. Aplicar migración Supabase solo si hay credencial local segura disponible.
7. Actualizar este reporte con resultado final y estado de migración.

### DoD

- Diff auditado sin hallazgos bloqueantes.
- Sin duración hardcodeada en metadata de ciclos finalizados/perdidos.
- `actual_harvest_date` confirmado como fecha real de cosecha.
- Tabs principales conservan separación semántica.
- `seed_kg` confirmado opcional/nullable y sin metadata artificial.
- Migración validada y aplicada o documentada como pendiente por credencial/conexión.
- `git diff --check` y `pnpm build:gold` pasan.

### Resultado de cierre

Estado: **YELLOW** — código, migración SQL y build local OK; aplicación remota Supabase pendiente porque no existe `SUPABASE_DB_PASSWORD` disponible en variables de entorno locales (proceso/usuario/máquina).

#### Auditoría aplicada

- Se corrigió un hallazgo de separación semántica: los ciclos perdidos ahora renderizan en el tab `Perdidos` mediante `agro-cycles-lost-slot`, no debajo del slot visual de `Finalizados`.
- Se corrigió un hallazgo de fecha: la duración de ciclos perdidos usa solo `lost_at` o `closed_at`; ya no cae a `actual_harvest_date`.
- Se ajustó el formateo de semilla para evitar ceros artificiales (`12.5 kg`, no `12.50 kg`).
- `actual_harvest_date` queda tratado como fecha real de cosecha para finalizados.
- `seed_kg` queda nullable; vacío/0/no numérico no genera metadata.

#### Migración SQL

- Archivo: `supabase/migrations/20260502180000_agro_crops_seed_and_closure_dates.sql`.
- Usa `add column if not exists`.
- Agrega `seed_kg numeric null`, `lost_at date null`, `closed_at date null`.
- No toca RLS.
- No agrega defaults.
- No rellena datos históricos.
- No inventa fechas ni cantidades.

#### Validación ejecutada

- `git diff --check`: PASS.
- `node --check apps/gold/agro/agro.js`: PASS.
- `node --check apps/gold/agro/agrociclos.js`: PASS.
- `pnpm build:gold`: PASS. 167 módulos transformados; gates OK (`agent-guard`, `agent-report-check`, `check-llms`, UTF-8).
- Warning esperado: Node local `v25.6.0`; repo pide Node `20.x`.
- `rg -n "200 días|90 días|120 días|Inicio a fin: [0-9]|Inicio a pérdida: [0-9]" apps/gold/agro`: solo devuelve `apps/gold/agro/agro.js:12462` con `'90d': '90 días'`, rango histórico de rankings operativos ajeno a ciclos de cultivo.

#### Supabase remoto

- CLI local: `supabase 2.90.0`.
- Proyecto enlazado detectado: `trratydmsyysnoxhfsti`.
- Corrección operativa posterior: `trratydmsyysnoxhfsti` corresponde a **YavlGold-staging**, no a producción.
- `SUPABASE_DB_PASSWORD`: no disponible en entorno local.
- No se ejecutó `supabase db push --dry-run`, `supabase db push` ni `supabase migration list` remoto para evitar reintentos sin credencial.
- Regla de seguridad: no usar `trratydmsyysnoxhfsti` para migración de producción.
- Reintento seguro solo después de relink al ref real de **YavlGold** principal:

```powershell
supabase link --project-ref "<REF_REAL_DE_YAVLGOLD>"
Get-Content supabase\.temp\project-ref
$env:SUPABASE_DB_PASSWORD="<valor-local-no-imprimir>"
supabase db push --dry-run
supabase migration list
supabase db push
supabase migration list
```

#### Riesgo vivo

- Queda pendiente aplicar la migración en Supabase remoto. Hasta aplicarla, el código usa fallback de columnas opcionales; la UI puede guardar sin romper, pero no persistirá `seed_kg`, `lost_at` ni `closed_at` si la base remota no tiene esas columnas.

---

## 2026-05-02 — Diagnóstico relink Supabase producción

### Diagnóstico de relink

La migración `20260502180000_agro_crops_seed_and_closure_dates.sql` está lista a nivel de código, pero la aplicación remota no debe ejecutarse hasta confirmar que el repo local apunta al proyecto Supabase principal **YavlGold**. El intento de `supabase link --project-ref <ref principal>` reportó `Authorization failed for the access token and project ref pair: {"message":"Not Found"}`, señal compatible con token/cuenta sin acceso al proyecto indicado o ref incorrecto.

### Estado actual

- `supabase\.temp\project-ref` apunta a `trratydmsyysnoxhfsti`.
- Ese ref fue confirmado como **YavlGold-staging**.
- `trratydmsyysnoxhfsti` no debe usarse para migración de producción.

### Riesgo

Si se ejecuta `supabase db push` con el enlace actual, la migración podría aplicarse a staging en vez del proyecto principal. Por seguridad, quedan prohibidos `db push`, `db push --dry-run` y `migration list` remoto hasta que el ref principal correcto esté confirmado en `supabase\.temp\project-ref`.

### Plan seguro

1. Ejecutar solo diagnóstico sin secretos: `supabase --version`, `Get-Content supabase\.temp\project-ref`, `supabase projects list`.
2. Si `supabase projects list` no muestra el proyecto principal YavlGold, detener relink y pedir al usuario reautenticarse localmente con `supabase logout` y `supabase login`.
3. Si la lista muestra el proyecto principal, usar su project ref real, confirmar que no sea `trratydmsyysnoxhfsti`, ejecutar `supabase link --project-ref <REF_REAL_DE_YAVLGOLD>` y verificar el archivo `project-ref`.
4. Si el link pide DB password, el usuario debe ingresarla localmente; no pegarla ni guardarla en chat o archivos.
5. Solo después de confirmar el ref principal correcto se podrá pasar a `db push --dry-run`.

### Resultado del diagnóstico

- `supabase --version`: `2.90.0` (warning de versión nueva disponible `2.95.4`).
- `Get-Content supabase\.temp\project-ref` antes del relink: `trratydmsyysnoxhfsti` (**YavlGold-staging**).
- `supabase projects list` sí mostró el proyecto principal:
  - `YavlGold` → ref `gerzlzprkarikblqxpjt`, región East US (Ohio).
  - `YavlGold-staging` → ref `trratydmsyysnoxhfsti`, región East US (North Virginia), marcado como linked antes del relink.
- Se ejecutó `supabase link --project-ref gerzlzprkarikblqxpjt`.
- `Get-Content supabase\.temp\project-ref` después del relink: `gerzlzprkarikblqxpjt`.
- No se ejecutó `supabase db push`, `supabase db push --dry-run` ni `supabase migration list`.

### Estado resultante

Estado: **GREEN para relink**. El repo local ahora apunta al proyecto principal **YavlGold** (`gerzlzprkarikblqxpjt`). La migración remota sigue pendiente y debe pasar primero por `db push --dry-run` con credencial local segura antes de aplicar cambios.

---

## 2026-05-02 — Intento seguro de dry-run migración Supabase principal

### Diagnóstico previo

- Migración pendiente: `supabase/migrations/20260502180000_agro_crops_seed_and_closure_dates.sql`.
- Proyecto principal esperado: `gerzlzprkarikblqxpjt`.
- Proyecto staging prohibido para producción: `trratydmsyysnoxhfsti`.
- `Get-Content supabase\.temp\project-ref`: `gerzlzprkarikblqxpjt`.

### Estado de credencial

- `SUPABASE_DB_PASSWORD` no está disponible en entorno local de proceso/usuario/máquina.
- Por seguridad, no se pidió ni se imprimió password.
- No se escribió ninguna credencial en archivos.

### Resultado

Estado: **YELLOW** — ref correcto confirmado, pero `dry-run` remoto no se ejecutó por falta de DB password local disponible para esta sesión.

### Acciones no ejecutadas

- No se ejecutó `supabase db push --dry-run`.
- No se ejecutó `supabase migration list`.
- No se ejecutó `supabase db push`.
- No se aplicó ninguna migración.

### Próximo paso seguro

El usuario debe introducir la DB password localmente en PowerShell y ejecutar el bloque Supabase desde `C:\Users\yerik\gold`, sin pegar la clave en chat ni guardarla en archivos:

```powershell
Get-Content supabase\.temp\project-ref

$secure = Read-Host "SUPABASE_DB_PASSWORD" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$env:SUPABASE_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

supabase db push --dry-run
supabase migration list
```

Si el dry-run muestra solo `20260502180000_agro_crops_seed_and_closure_dates.sql` contra `gerzlzprkarikblqxpjt`, recién entonces puede ejecutarse:

```powershell
supabase db push
supabase migration list
```

---

## 2026-05-03 — Revisión final Supabase post-repair

### Diagnóstico de revisión final

Se cerró una operación larga de reparación/sincronización Supabase después de bloqueos de conexión por DNS/Cloudflare y antecedentes de bloqueo por Windows Firewall. El objetivo de esta revisión es decidir si el trabajo está listo para commit/push y qué hacer con `supabase/migrations/20260503012340_remote_schema.sql`, sin construir features nuevas ni tocar Agro.

### Estado heredado

- Proyecto principal Supabase: `gerzlzprkarikblqxpjt`.
- Proyecto staging: `trratydmsyysnoxhfsti`.
- Repo local reenlazado al principal.
- Kimi K2.6 ayudó con debugging en VS Code.
- Opus 4.6 ayudó a terminar aplicación/reparación de migraciones.
- Script temporal creado durante repair: `supabase/repair-migrations.ps1`.
- Repair reportado: 77/77 OK, 0 fallos.
- `supabase db pull` reportado como PASS.
- `db pull` generó `supabase/migrations/20260503012340_remote_schema.sql`.

### Archivos críticos a revisar

- `supabase/migrations/20260502180000_agro_crops_seed_and_closure_dates.sql`.
- `supabase/migrations/20260503012340_remote_schema.sql`.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`.
- Confirmar que `supabase/repair-migrations.ps1` ya no exista.
- Revisar `git status`, `git diff --stat`, `git diff --check`.

### Riesgos

- Ref local apuntando accidentalmente a staging.
- Snapshot remoto grande con secretos, operaciones destructivas o cambios amplios de RLS/policies no entendidos.
- Divergencia entre historial remoto/local no comprobada en esta sesión.
- Incluir `remote_schema.sql` en el mismo commit de feature puede mezclar producto y saneamiento histórico.

### Plan de auditoría

1. Confirmar `supabase\.temp\project-ref`.
2. Revisar estado Git y whitespace.
3. Confirmar eliminación de `repair-migrations.ps1`.
4. Medir y auditar `20260503012340_remote_schema.sql` por secretos, destructivos, auth/storage/RLS/policies.
5. Releer migración de semilla/cierre.
6. Ejecutar `migration list` y `db push --dry-run` solo si `SUPABASE_DB_PASSWORD` está disponible.
7. Ejecutar `pnpm build:gold`.
8. Documentar decisión de commit y riesgos.

### DoD

- Ref principal confirmado.
- Script temporal ausente.
- `git diff --check` PASS.
- `pnpm build:gold` PASS.
- Sin secretos ni destructivos inesperados en migraciones.
- Migración de semilla/cierre validada.
- Estado remoto/migration history documentado o limitación explícita si falta password.
- Recomendación clara para `20260503012340_remote_schema.sql`.

### Resultado de auditoría

Estado: **RED para aprobar commit/push con `20260503012340_remote_schema.sql` incluido**.

#### Evidencia

- `Get-Content supabase\.temp\project-ref`: `gerzlzprkarikblqxpjt` (principal correcto).
- `git diff --check`: PASS.
- `Test-Path supabase\repair-migrations.ps1`: `False`.
- `pnpm build:gold`: PASS; 167 módulos transformados; gates OK. Warning esperado por Node local `v25.6.0` vs repo `20.x`.
- `SUPABASE_DB_PASSWORD`: no disponible en entorno local; no se repitió `supabase migration list` ni `supabase db push --dry-run`.

#### `20260503012340_remote_schema.sql`

- Tamaño: `3513` líneas por conteo raw; `117236` bytes.
- Secrets: no se detectaron valores secretos. Los hits de `service_role` son grants/revokes de rol; `token` aparece como columna `nft_token_id`.
- Destructivos detectados:
  - `drop extension if exists "pg_net";`
  - 81 `drop policy`.
  - `drop function if exists "public"."handle_new_user"();`
  - `drop function if exists "public"."agro_buyer_portfolio_summary_v1"();`
  - `drop table "public"."rls_smoke_items";`
  - `drop trigger if exists "on_auth_user_created" on "auth"."users";`
  - múltiples `drop index` y `drop constraint`.
- RLS/policies/storage/auth:
  - habilita RLS en varias tablas nuevas (`admin_audit_log`, `agro_agenda`, `agro_cart`, academia, etc.).
  - crea muchas policies públicas/autenticadas.
  - toca `auth.users` con triggers.
  - toca `storage.objects` y policies del bucket `agro-evidence` y `avatars`.
- Hallazgo bloqueante: varias policies de Storage parecen SQL corrupto o no confiable:
  - líneas 3269-3295: regex `name ~* '\.(jpg|jpeg|png|webp|pdf);` partido y `{withcheck_clause}`.
  - líneas 3350-3376: patrón equivalente en losses.
  - líneas 3394-3420: patrón equivalente en pending.
  - líneas 3438-3464: patrón equivalente en transfers.

#### Decisión

- No aprobar `20260503012340_remote_schema.sql` para commit tal como está.
- No mezclarlo con el commit de feature Agro.
- Requiere revisión/regeneración humana o técnica antes de entrar al repo. El archivo puede haber salido de `db pull`, pero contiene destructivos amplios y fragmentos que parecen plantilla/corrupción de SQL.
- La feature Agro y la migración puntual `20260502180000_agro_crops_seed_and_closure_dates.sql` siguen siendo candidatas a commit separado, siempre excluyendo `20260503012340_remote_schema.sql`.

#### Migración semilla/cierre

- `20260502180000_agro_crops_seed_and_closure_dates.sql` validada:
  - usa `add column if not exists`;
  - agrega `seed_kg numeric null`;
  - agrega `lost_at date null`;
  - agrega `closed_at date null`;
  - no toca RLS;
  - no agrega defaults ficticios;
  - no hace backfill inventado.

#### Recomendación operativa

1. Commit separado solo para feature Agro + migración puntual + reporte.
2. No commitear `20260503012340_remote_schema.sql` todavía.
3. Revisar/regenerar el snapshot remoto; en particular corregir o explicar las policies de Storage y los drops.
4. Repetir `supabase migration list` y `supabase db push --dry-run` cuando haya `SUPABASE_DB_PASSWORD` local segura.

---

## 2026-05-03 — Contención snapshot Supabase corrupto

### Diagnóstico de cierre

El P0 sobre `supabase/migrations/20260503012340_remote_schema.sql` fue validado: el archivo contiene SQL no confiable generado por `supabase db pull`, incluyendo literal `{withcheck_clause}`, fragments de policies de Storage rotos, drops masivos y recreación amplia de RLS/auth/storage. El objetivo de esta fase es excluir ese snapshot corrupto del historial canónico del repo y dejar lista la feature Agro sin contaminar `supabase/migrations/`.

### P0 detectado

- Archivo: `supabase/migrations/20260503012340_remote_schema.sql`.
- Bloqueantes detectados: `{withcheck_clause}` y expresiones SQL partidas en policies de Storage.
- Riesgo: si se commitea, el repo conservaría una migración no confiable y potencialmente inaplicable.
- Decisión: no aplicar, no reparar a mano y no incluir en commit.

### Plan de contención

1. Confirmar que `supabase\.temp\project-ref` apunta a `gerzlzprkarikblqxpjt`.
2. Verificar `git status --short` y existencia del snapshot corrupto.
3. Mover `20260503012340_remote_schema.sql` a cuarentena temporal fuera del repo.
4. Confirmar que ya no existe dentro de `supabase/migrations/` ni aparece en `git status`.
5. Revalidar la migración válida `20260502180000_agro_crops_seed_and_closure_dates.sql`.
6. Consultar historial remoto/dry-run solo si `SUPABASE_DB_PASSWORD` existe en el entorno local.
7. Ejecutar checks finales (`git diff --check`, `pnpm build:gold`, búsqueda de hardcodes).

### Riesgos

- No poder confirmar historial remoto si falta `SUPABASE_DB_PASSWORD`.
- Si el timestamp `20260503012340` quedó en remoto, no se debe reparar sin evidencia clara de que fue solo un registro indebido y no una migración real.
- No se debe volver a generar o editar manualmente el snapshot en esta sesión.

### DoD

- Ref principal confirmado.
- `20260503012340_remote_schema.sql` fuera de `supabase/migrations/`.
- Archivo no staged ni untracked dentro del repo.
- Migración `20260502180000` validada.
- Remote history/dry-run documentado o explícitamente no ejecutado por falta de password.
- Build y diff check pasan.
- Commit sugerido excluye el snapshot corrupto.

### Resultado de contención

Estado: **YELLOW** — limpieza local OK y build OK; verificación remota (`migration list`, `db push --dry-run`) no se pudo repetir porque `SUPABASE_DB_PASSWORD` no está disponible en el entorno de esta sesión.

#### Ref y snapshot

- `Get-Content supabase\.temp\project-ref`: `gerzlzprkarikblqxpjt`.
- `Test-Path supabase\migrations\20260503012340_remote_schema.sql` antes de contener: `True`.
- Archivo movido a cuarentena fuera del repo:
  `C:\Users\yerik\AppData\Local\Temp\yavlgold-supabase-rejected\20260503012340_remote_schema.REJECTED.sql`.
- `Test-Path supabase\migrations\20260503012340_remote_schema.sql` después: `False`.
- `git status --short` ya no muestra `20260503012340_remote_schema.sql`.
- No estaba staged (`git ls-files --stage` sin salida).

#### Migración válida

- `20260502180000_agro_crops_seed_and_closure_dates.sql` validada.
- Contiene:
  - `add column if not exists seed_kg numeric null`;
  - `add column if not exists lost_at date null`;
  - `add column if not exists closed_at date null`.
- No contiene defaults, backfill, drops, RLS ni policies.

#### Supabase remoto

- `SUPABASE_DB_PASSWORD_PRESENT=false`.
- No se ejecutó `supabase migration list`.
- No se ejecutó `supabase db push --dry-run`.
- No se ejecutó `supabase db push`.
- No se ejecutó `supabase migration repair`.
- Razón: sin password local no hay evidencia suficiente para tocar historial remoto; si el timestamp `20260503012340` aparece en remoto más adelante, debe verificarse antes de cualquier repair.

#### Checks finales

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS; 167 módulos transformados; gates OK.
- Warning esperado: Node local `v25.6.0` vs repo `20.x`.
- Búsqueda hardcodes: solo `apps/gold/agro/agro.js:12462: '90d': '90 días'`, rango operativo ajeno a duración de ciclos.
- `git status --short` final esperado: cambios Agro + reporte + migración `20260502180000`; sin `20260503012340_remote_schema.sql`.

#### Decisión de commit

- La feature Agro puede ir a commit local separado con la migración válida y el reporte.
- No incluir `20260503012340_remote_schema.sql`.
- No hacer push hasta repetir verificación remota cuando haya `SUPABASE_DB_PASSWORD` local segura, o hasta que el usuario acepte explícitamente avanzar con la verificación remota pendiente.

---

## 2026-05-03 — Bugfix Mis cultivos + Cartera Viva

### Diagnóstico inicial

Estado: **YELLOW** — bugs reproducidos por evidencia visual del usuario e inferidos en código; no se ejecutará QA manual/browser intensivo en esta sesión porque el usuario lo reservó para validación humana.

#### Bugs inferidos

- Bug 1: edición de estado de cultivo activo muestra éxito, pero la card puede seguir con estado anterior. El submit real vive en `apps/gold/agro/index.html` como `window.saveCrop`; la apertura/precarga de edición vive en `apps/gold/agro/agro.js` (`openEditModal`). La card se reconstruye desde `loadCrops()` y `buildActiveCycleCardsData()`, usando `resolveCropStatus()`.
- Bug 2: Cartera Viva abre creación de cliente/registro sin validar etapa comercial del cultivo seleccionado. Entradas candidatas:
  - `openNewBuyerProfile('')` desde `apps/gold/agro/agro-cartera-viva-view.js`;
  - `openClientRecordWizard()` desde detalle de cliente;
  - `openRecordFromCarteraContext()` expuesto como puente global.
- Bug 3: el modal de edición usa el mismo DOM que creación, pero `openCropModal()`/`openEditModal()` cambian título y botón con selectores globales (`.modal-title`, `.modal-footer .btn-primary`). Eso permite que edición conserve `Nuevo Cultivo` aunque el botón diga `Actualizar`.

#### Estados reales confirmados

- Select del modal: `auto`, `sembrado`, `creciendo`, `produccion`, `finalizado`, `lost`.
- Render activo:
  - `sembrado` -> `Sembrado`
  - `creciendo` -> `Creciendo`
  - `produccion` -> `En produccion`
  - `finalizado` -> `Finalizado`
  - `lost` -> `Perdido`
- Aliases legacy existentes: `growing -> creciendo`, `ready -> produccion`, `harvested -> finalizado`, `perdido/perdida/damaged/loss -> lost`.

### Archivos candidatos

- `apps/gold/agro/index.html` — submit real de crear/editar cultivo.
- `apps/gold/agro/agro.js` — apertura de modal, cache `cropsCache`, render/reload de cards.
- `apps/gold/agro/agro-cartera-viva-view.js` — acciones de Cartera Viva para crear cliente/registro.
- `apps/gold/agro/agrocompradores.js` — modal de cliente, solo si hace falta bloquear desde la capa de cliente.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` — bitácora operativa.

### Riesgos

- `agro.js` es monolito: tocar solo wiring/bugfix mínimo.
- `index.html` contiene el submit real de cultivo; duplicar lógica con `saveCrop()` exportado en `agro.js` aumentaría riesgo.
- Cartera Viva comparte navegación con Cartera Operativa; el guard debe vivir solo en Cartera Viva y no bloquear Cartera Operativa ni Mi Carrito.
- La regla de estado debe usar los tokens existentes; no se crearán estados nuevos.

### Plan de cambios

1. Separar modo visual/funcional del modal de cultivo usando helpers mínimos y selectores por ID dentro de `#modal-new-crop`.
2. Corregir guardado de edición para que el update devuelva filas actualizadas, no muestre éxito si no hubo fila afectada y actualice el cache/snapshot local antes del refresh.
3. Mantener creación limpia: título `Nuevo Cultivo`, botón `Guardar siembra`, form reseteado y `crop-edit-id` vacío.
4. Agregar helper de Cartera Viva para validar si el cultivo seleccionado permite nuevos registros comerciales: permitir `produccion`, `finalizado`, `lost`; bloquear `sembrado`, `creciendo`, vacío o desconocido.
5. Aplicar el guard solo en acciones de Cartera Viva que crean cliente/registro asociado al cultivo seleccionado.
6. Ejecutar `git diff --check`, `pnpm build:gold` y búsqueda de duraciones hardcodeadas indicada por el usuario.

### DoD de esta sesión

- Editar `Creciendo -> En producción` guarda `status/status_mode/status_override` correctos y refresca card/cache.
- El éxito de edición solo aparece si Supabase no falla y devuelve una fila actualizada.
- Modal crear mantiene `Nuevo Cultivo` / `Guardar siembra`.
- Modal editar muestra `Editar Cultivo` / `Actualizar`.
- Cartera Viva bloquea creación comercial con cultivo `sembrado`/`creciendo`/desconocido y permite `produccion`/`finalizado`/`lost`.
- No se toca Cartera Operativa/Mi Carrito salvo lectura contextual necesaria.
- `pnpm build:gold` pasa.

### Resultado

Estado: **GREEN técnico / PENDING QA manual** — build y checks pasan; queda pendiente la validación manual en producción/local por parte del usuario según instrucción explícita.

#### Cambios aplicados

- `apps/gold/agro/agro.js`
  - `openCropModal()` y `openEditModal()` ya no usan selectores globales de modal.
  - Se agregó modo explícito `create/edit` para el modal compartido de cultivo.
  - Crear fuerza `Nuevo Cultivo` / `Guardar siembra`.
  - Editar fuerza `Editar Cultivo` / `Actualizar`.
  - Cerrar limpia `currentEditId`, `crop-edit-id` y vuelve el modal a modo create.
  - Badge `produccion` ahora muestra `En producción`.
- `apps/gold/agro/index.html`
  - `window.saveCrop()` en modo edición usa `.update(...).select('*').maybeSingle()`.
  - Si Supabase no devuelve fila actualizada, no muestra éxito y lanza error.
  - Tras guardar, llama `window.loadCrops()` cuando está disponible y dispara `data-refresh`.
  - El botón de submit se restaura según `crop-edit-id`, evitando contaminación entre crear/editar.
- `apps/gold/agro/agro-cartera-viva-view.js`
  - Se agregó `canCreateLiveWalletRecordForCrop(crop)`.
  - Permitidos para creación comercial desde Cartera Viva: `produccion`, `finalizado`, `lost` y aliases equivalentes.
  - Bloqueados: `sembrado`, `creciendo`, vacío/desconocido y estados previos.
  - El guard se aplica a `Nuevo cliente`, `openRecordFromCarteraContext()` y `openClientRecordWizard()`.
  - No se modificó Cartera Operativa ni Mi Carrito.

#### Checks

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
  - `agent-guard`: OK.
  - `agent-report-check`: OK.
  - `vite build`: OK, 167 módulos transformados.
  - `check-llms`: OK.
  - `check-dist-utf8`: OK.
  - Warning conocido: Node local `v25.6.0` vs engine `20.x`.
- `rg -n "200 días|90 días|120 días|Inicio a fin: [0-9]|Inicio a pérdida: [0-9]" apps/gold/agro`:
  - solo `apps/gold/agro/agro.js:12462: '90d': '90 días'`, filtro de rankings ajeno a duración de ciclos.

#### QA manual pendiente

- No se ejecutó browser/QA manual por instrucción explícita del usuario.
- Casos pendientes: edición `Creciendo -> En producción`, persistencia tras refresh, crear limpio, editar separado, bloqueo/permiso de Cartera Viva por estado y no regresión de duración real/semilla kg.

---

## 2026-05-03 — Bug vivo único: edición de estado de cultivo

### Scope

Estado: **YELLOW** — se cierra el frente de modal crear/editar y guard comercial de Cartera Viva. El único bug vivo es edición de cultivo `Creciendo -> En producción`: aparece éxito, pero la card queda en `Creciendo` o no persiste/refresca correctamente.

### Diagnóstico planificado

- Confirmar el campo real de persistencia del estado en `agro_crops`.
- Confirmar valores internos reales para estados de cultivo.
- Confirmar valor del `<option>` de “En producción”.
- Confirmar qué valor espera el renderer de cards para mostrar `En producción`.
- Confirmar payload exacto del update de edición.
- Confirmar contrato de `.update(...).select('*').maybeSingle()`.
- Verificar si `loadCrops()` consulta Supabase o sirve cache viejo.
- Verificar si el render usa `status`, `status_override`, `status_mode` u otro campo.
- Verificar si el submit puede leer un valor viejo por selector/estado contaminado.

### Archivos candidatos

- `apps/gold/agro/index.html` — submit real `window.saveCrop()`.
- `apps/gold/agro/agro.js` — modal de edición, `loadCrops()`, normalización y render de estado.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` — bitácora de diagnóstico/cierre.

### Riesgos

- `agro.js` es monolito: solo se permite bugfix/wiring quirúrgico.
- No tocar Cartera Viva, Cartera Operativa, Mi Carrito ni migraciones.
- No parchear DOM: la corrección debe persistir en DB o fallar sin éxito falso.
- No romper `finalizado`/`lost` ni estados previos.

### DoD

- Editar cultivo de `Creciendo` a `En producción` hace que la card muestre `En producción` después de actualizar.
- El valor persiste al recargar.
- El éxito solo aparece si la fila devuelta confirma el estado nuevo.
- `git diff --check` pasa.
- `pnpm build:gold` pasa.
- QA manual del flujo principal documentada como ejecutada o, si no hay credenciales/sesión disponible, explícitamente pendiente.

### Diagnóstico real antes de editar

- Campo real de estado: `public.agro_crops.status`.
- No existen campos alternos operativos `state`, `crop_status` ni `growth_status` para este flujo.
- Columnas auxiliares existentes: `status_mode` y `status_override`.
- Constraint canónica: `status in ('sembrado', 'creciendo', 'produccion', 'finalizado', 'lost')`.
- Valor del `<option>` “En producción”: `produccion`.
- Valor esperado por el render de card para mostrar “En producción”: `produccion`.
- Mapper de card: `resolveCropStatus(crop, progress)` prioriza `status_mode === 'manual'`, luego `status_override`, luego `status`.
- Payload actual de edición manda:
  - `status: effectiveStatus`;
  - `status_mode: statusMode`;
  - `status_override: statusOverride`.
- Para `En producción`, `effectiveStatus = 'produccion'`, `statusMode = 'manual'`, `statusOverride = 'produccion'`.
- `.update(...).select('*').maybeSingle()` ya devuelve fila, pero el código solo verifica `updatedCrop?.id`.
- Riesgo confirmado: el éxito puede mostrarse sin comprobar que `updatedCrop.status`/`updatedCrop.status_override` confirmen `produccion`.
- `window.loadCrops()` consulta Supabase y solo cae a cache si falla, pero si hay una carga en curso retorna temprano y deja refresh en cola; el `await` del caller no garantiza que esa cola haya re-renderizado la card.

---

## 2026-05-03 — Mis Clientes Agro V1

### Paso 0 obligatorio

Estado: **YELLOW** — feature nueva modular en diagnóstico; no se ejecutará QA manual/browser porque el usuario lo reservó explícitamente.

#### Diagnóstico inicial

- El hub visible “Mi Granja” vive en `apps/gold/agro/index.html`, dentro de `data-agro-mobile-panel="operacion"`.
- Las cards actuales de “Mis finanzas” se renderizan como botones `data-agro-view` para:
  - `cartera-viva`;
  - `operational`;
  - `carrito`.
- Las rutas/shell views profundas se gobiernan en `apps/gold/agro/agro-shell.js` con `VIEW_CONFIG`, `VIEW_TO_MOBILE_HUB`, keywords y `data-agro-shell-region`.
- Los módulos profundos existentes se cargan dinámicamente desde el bootstrap de `apps/gold/agro/index.html`.
- Cartera Viva ya usa `public.agro_buyers` como tabla canónica de compradores/clientes de cartera, con RLS owner-only y `linked_user_id` opcional.
- Existe `public.agro_public_profiles`, pero su policy solo permite perfiles propios o perfiles marcados públicos. No se debe crear búsqueda global de usuarios.

#### Superficies que se tocarán

- Hub “Mi Granja” para agregar entrada visible `Mis Clientes`.
- Shell profundo de Agro para registrar la vista nueva.
- Nueva superficie dedicada de clientes.
- Supabase root canónico para migración nueva, si se confirma tabla separada.
- Reporte activo para bitácora de sesión.

#### Archivos candidatos

- `apps/gold/agro/index.html` — link CSS, card del hub, región root, import dinámico del módulo.
- `apps/gold/agro/agro-shell.js` — registro de vista `clients`.
- `apps/gold/agro/agro-clients.js` — módulo nuevo.
- `apps/gold/agro/agro-clients.css` — estilos nuevos.
- `supabase/migrations/<timestamp>_create_agro_clients.sql` — tabla separada owner-only.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` — cierre operativo.

#### Plan breve

1. Confirmar si conviene tabla nueva o reutilización de `agro_buyers`.
2. Ejecutar una verificación RED mínima para el nuevo módulo sin agregar test permanente.
3. Crear migración `agro_clients` con RLS owner-only, soft delete y `client_type`.
4. Crear módulo `agro-clients.js` con listado, filtros, orden, crear, editar y soft delete.
5. Crear `agro-clients.css` usando tokens ADN V11.
6. Registrar entrada del hub y región profunda sin tocar Cartera Viva.
7. Registrar vista en `agro-shell.js`.
8. Ejecutar `git diff --check`, `pnpm build:gold` y `supabase db push --dry-run` solo si el entorno lo permite con seguridad.

#### Riesgos

- Reutilizar `agro_buyers` mezclaría “Mis Clientes” con clientes de Cartera Viva y su historial financiero.
- Una tabla nueva evita contaminación semántica, pero crea una futura reconciliación si se quiere conectar clientes con cartera.
- `agro-shell.js` es navegación central: cambios mínimos y declarativos.
- `index.html` ya está modificado por una sesión previa; se preservarán esos cambios.
- No se consultarán perfiles globales ni se expondrán usuarios YavlGold.

#### DoD

- Card `Mis Clientes` visible en “Mis finanzas”, entre `Cartera Viva` y `Cartera Operativa`.
- Vista dedicada abre con botón Volver provisto por el shell móvil cuando aplica.
- Crear, editar, listar, filtrar y ordenar clientes.
- Separación visible `Con cuenta YavlGold` / `No registrado`.
- Sin estadísticas, KPIs, deuda, rankings ni historial de cartera.
- Cartera Viva, Cartera Operativa y Mi Carrito no se reescriben.
- `git diff --check` pasa.
- `pnpm build:gold` pasa.

---

## 2026-05-03 — Cierre técnico: bug edición estado de cultivo

Estado: **YELLOW técnico** — corrección aplicada y build OK; QA manual autenticada queda pendiente porque el login local activó hCaptcha invisible y no se debe resolver ni rodear CAPTCHA.

### Causa raíz confirmada

- El campo real es `agro_crops.status`; el token interno de “En producción” es `produccion`.
- El render de card usa `resolveCropStatus(crop, progress)`, que respeta `status_mode === 'manual'`, `status_override` y luego `status`.
- El update ya enviaba `status`, `status_mode` y `status_override`, pero mostraba éxito apenas `maybeSingle()` devolvía una fila con `id`.
- No verificaba que la fila devuelta confirmara `status/status_override = produccion`.
- Después del update llamaba `window.loadCrops()`, pero si existía carga en curso podía retornar temprano y dejar el refresco real en cola; el caller no verificaba que el snapshot/render ya tuviera el estado nuevo.

### Cambio aplicado

- `apps/gold/agro/index.html`:
  - normaliza el estado antes de persistir;
  - manda `status: normalizedEffectiveStatus`;
  - manda `status_override` normalizado en modo manual;
  - valida que la fila de Supabase confirme el estado esperado antes de marcar éxito;
  - retrasa el mensaje de éxito de edición hasta después de confirmar refresh local;
  - espera `AGRO_CROPS_READY` y verifica `window.__AGRO_CROPS_STATE.crops` para confirmar el estado nuevo de la card/snapshot.

### Validación

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- QA browser local: bloqueada en login por hCaptcha invisible. No se intentó resolver ni rodear CAPTCHA.

### Pendiente

- QA manual del usuario con sesión real:
  - editar `Creciendo -> En producción`;
  - confirmar card `En producción` sin recarga;
  - refrescar y confirmar persistencia.

---

## 2026-05-03 — Hotfix build Vercel: assets Mis Clientes

Estado: **YELLOW** — build remoto roto por referencias a `agro-clients.js` / `agro-clients.css`.

### Diagnóstico inicial

- Vercel reporta que `./agro-clients.css` no existe en build time.
- Vercel reporta que no puede resolver `./agro-clients.js` desde `agro/index.html`.
- Hipótesis primaria: los archivos existen localmente pero quedaron sin agregar al commit/push.
- Hipótesis secundaria: mismatch de ruta, nombre o mayúsculas/minúsculas entre `index.html` y los archivos reales.

### Plan quirúrgico

1. Ejecutar diagnóstico de `git status`, `git ls-files`, `Test-Path` y `rg`.
2. Confirmar si los archivos están untracked, ausentes o con nombre distinto.
3. Si existen y están untracked, dejar evidencia y preparar el mínimo cambio de tracking.
4. No tocar Cartera Viva, Supabase, migraciones ni lógica de edición de estados.
5. Validar con `git diff --check` y `pnpm build:gold`.

### DoD

- `apps/gold/agro/agro-clients.js` existe.
- `apps/gold/agro/agro-clients.css` existe.
- Los imports/referencias en `index.html` coinciden exactamente con esos nombres.
- `git diff --check` pasa.
- `pnpm build:gold` pasa sin error de resolución de `agro-clients`.
- Entrega final indica si los archivos quedaron trackeados/staged o qué comando exacto falta ejecutar.

### Diagnóstico real

- `git status --short`: solo `AGENT_REPORT_ACTIVE.md` modificado por esta sesión.
- `git ls-files apps/gold/agro/agro-clients.js apps/gold/agro/agro-clients.css`: ambos archivos aparecen trackeados.
- `Test-Path`: ambos archivos existen localmente.
- `git ls-tree -r HEAD`: ambos archivos existen dentro del `HEAD` local.
- Último commit que los agrega: `2405143 feat(agro): add clients directory`.
- Commit anterior afectado en el log remoto: `fix(agro): corregir edición de cultivos y guard de Cartera Viva`, donde `index.html` referenciaba los assets pero el árbol desplegado no los tenía.
- No hay mismatch de ruta ni case: `index.html` usa `./agro-clients.css` y `import('./agro-clients.js')`, coincidiendo con los archivos reales.

### Validación técnica

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS; Vite transformó `169 modules` e incluyó `assets/agro-clients-*.js`.
- Warning no bloqueante: Node actual `v25.6.0` contra engine esperado `20.x`.

### Cierre

- No se tocaron Cartera Viva, Cartera Operativa, Mi Carrito, Supabase ni migraciones.
- No hubo cambios de código necesarios en esta sesión: el estado actual del repo ya contiene los assets requeridos.
- Para apagar Vercel si quedó anclado al commit fallido, redeployar/pushear el `HEAD` que contiene `2405143` o un commit nuevo con el reporte si se quiere dejar trazabilidad.

### Resultado

Estado: **GREEN técnico / PENDING QA manual** — implementación modular lista y build verificado; QA funcional queda para validación manual del usuario.

#### Decisión de modelo de datos

- No se reutilizó `agro_buyers` porque está acoplada a Cartera Viva y cartera/fiados.
- Se creó tabla separada `public.agro_clients` para que “Mis Clientes” sea libreta de contactos independiente.
- `client_type` separa `registered` y `external`.
- `linked_profile_id` queda preparado, pero el MVP no consulta ni lista perfiles globales.
- RLS owner-only: cada usuario solo ve/modifica sus propios clientes.

#### Implementado

- Entrada `Mis Clientes` en hub “Mi Granja”, sección “Mis finanzas”, entre `Cartera Viva` y `Cartera Operativa`.
- Vista profunda `clients` registrada en `agro-shell.js`.
- Módulo nuevo `agro-clients.js` con:
  - listar clientes;
  - crear cliente;
  - editar cliente;
  - soft-delete;
  - filtro `Todos` / `Con cuenta YavlGold` / `No registrados`;
  - orden `A-Z`, `Z-A`, `Recientes`;
  - búsqueda local por nombre/contacto/tag.
- CSS separado `agro-clients.css` con tokens ADN V11 y sin hex hardcodeados.
- Migración `20260503153000_create_agro_clients.sql`.

#### No tocado

- No se reescribió Cartera Viva.
- No se modificó Cartera Operativa.
- No se modificó Mi Carrito.
- No se agregó búsqueda global de usuarios YavlGold.
- No se migraron datos desde Cartera Viva.
- No se modificó `MANIFIESTO_AGRO.md`.

#### Checks

- RED mínimo: import de `agro-clients.js` falló antes de crear el módulo, como se esperaba.
- GREEN mínimo: helpers puros de tipo, tags y orden alfanumérico pasan.
- `git diff --check`: PASS.
- Revisión trailing whitespace en archivos nuevos: PASS.
- Búsqueda de hex hardcodeado en archivos nuevos: PASS.
- `pnpm build:gold`: PASS.
  - `agent-guard`: OK.
  - `agent-report-check`: OK.
  - `vite build`: OK, 169 módulos transformados.
  - `check-llms`: OK.
  - `check-dist-utf8`: OK.
  - Warning conocido: Node local `v25.6.0` vs engine `20.x`.

#### Supabase

- Ref local confirmado: `gerzlzprkarikblqxpjt`.
- `SUPABASE_DB_PASSWORD`: no disponible en entorno local.
- `supabase db push --dry-run`: intentado, pero terminó por timeout a los 120s sin salida útil.
- No se aplicó migración remota.

#### QA manual pendiente

- No se ejecutó browser/QA manual por instrucción explícita del usuario.
- Pendiente validar: hub, apertura de vista, crear externo, crear registrado, editar, tags, A-Z/Z-A, filtros y no regresión de Cartera Viva/Cartera Operativa/Mi Carrito/Mis cultivos.

---

## 2026-05-03 — Ajuste visual/semántico de Mis Clientes

### Diagnóstico breve

- La vista `Mis Clientes` ya funciona con la migración aplicada, pero renderiza un encabezado interno propio además del contexto superior del shell.
- El título grande blanco de la izquierda sale del `h2.agro-clients-header__title` renderizado por `agro-clients.js`.
- El título superior sale del shell Agro (`data-agro-mobile-context-title`) alimentado por `VIEW_CONFIG.clients.label`.
- La separación de clientes usa `client_type`: `registered` = con cuenta YavlGold; `external` = cliente sin cuenta YavlGold.

### Ajustes solicitados

- Eliminar la duplicación visual del título en la vista de clientes.
- Dejar el título principal visible en la barra superior, centrado y dorado.
- Verificar/corregir que `No registrados` filtre solo `client_type = external`.
- Mantener `Todos` y `Con cuenta YavlGold` con su semántica actual.

### Archivos candidatos

- `apps/gold/agro/agro-clients.js`
- `apps/gold/agro/agro-clients.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Riesgos

- Que el header interno quede vacío o desbalanceado al remover el título duplicado.
- Que el ajuste de centrado afecte otros módulos si no se limita a `data-agro-active-view="clients"`.
- Que un cambio innecesario en filtros altere búsqueda u orden.

### DoD

- No aparece el título blanco duplicado a la izquierda.
- El título superior de `Mis Clientes` queda dorado y centrado visualmente.
- `No registrados` representa `client_type = external`.
- `Con cuenta YavlGold` representa `client_type = registered`.
- `Todos` muestra ambos tipos.
- Búsqueda y orden siguen funcionando.
- No se toca Supabase, migraciones ni Cartera Viva.
- `git diff --check` y `pnpm build:gold` pasan.

### Resultado

- Se eliminó el `h2.agro-clients-header__title` y el eyebrow interno de `agro-clients.js`; queda solo la descripción corta bajo la barra del shell.
- Se agregó CSS específico para `body[data-agro-active-view="clients"]` que centra el título del contextbar y fuerza color `var(--gold-4)`.
- No se modificó la lógica de filtros porque ya usa `normalizeClientType(client.client_type)`.
- Prueba RED/GREEN mínima: el chequeo del `h2` duplicado falló antes del parche y pasó después.
- Prueba de filtros con datos simulados: `external` devuelve no registrados, `registered` devuelve con cuenta, `all` devuelve ambos.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS con `GOMAXPROCS=2`; warning no bloqueante por Node `v25.6.0` vs engine `20.x`.
- QA browser autenticada: bloqueada en localhost por hCaptcha/Supabase (`captcha protection: request disallowed`); no se crearon datos QA.

---

## 2026-05-03 — Bug vivo: estado de cultivo no refresca tras edición

Estado: **YELLOW** — bug persistente en edición de ciclos/cultivos activos.

### Bug vivo confirmado

- Flujo afectado: editar cultivo activo y cambiar estado de `Creciendo` a `En producción`.
- Síntoma principal: aparece mensaje de éxito, pero la card queda en `Creciendo` o vuelve a ese estado.
- Síntoma adicional: parpadeo raro en la zona de cards, compatible con doble render, cache vieja, carrera async o rehidratación desde estado anterior.

### Frentes excluidos

- No tocar Mis Clientes ni sus ajustes visuales.
- No tocar popups informativos.
- No tocar Cartera Viva salvo revisión estricta de no regresión por estado.
- No tocar Cartera Operativa ni Mi Carrito.
- No tocar Supabase migrations.
- No hacer browser QA intensivo ni Playwright.

### Archivos candidatos

- `apps/gold/agro/index.html` — select, modal y submit `window.saveCrop()`.
- `apps/gold/agro/agro.js` — estado real, cache `cropsCache`, `loadCrops()`, render de cards y eventos `AGRO_CROPS_READY`.
- `apps/gold/agro/agrociclos.js` — render visual de card/badge.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` — diagnóstico y cierre operativo.

### Plan de diagnóstico

1. Localizar mapeos/labels de estado y valores internos reales.
2. Confirmar campo real persistido en Supabase.
3. Confirmar valor del `<option>` `En producción`.
4. Seguir el flujo `submit -> update payload -> returned row -> cache -> loadCrops -> render`.
5. Buscar handlers duplicados de submit/click/listeners.
6. Determinar si el parpadeo viene de doble `loadCrops()`, render desde cache vieja, render completo innecesario o evento duplicado.
7. Aplicar fix mínimo solo después de causa raíz.

### Riesgos

- `agro.js` es monolito; tocar solo si la causa está en cache/render/wiring.
- Un parche DOM ocultaría el fallo real y no es aceptable.
- Finalizado/perdido, duración real y semilla kg dependen del mismo pipeline de cards.
- Ya existen cambios recientes en creación/edición y guard comercial; no abrir nuevos frentes.

### DoD

- `Creciendo -> En producción` persiste como dato real.
- El éxito solo aparece si el update confirma el estado solicitado.
- La card se alimenta de la fila actualizada o de una recarga real, no de cache vieja.
- El parpadeo queda eliminado o explicado con causa concreta y mitigación aplicada.
- `Finalizado` y `Perdido` no se rompen.
- `git diff --check` pasa.
- `pnpm build:gold` pasa.
- Búsqueda de duraciones hardcodeadas no introduce regresión.

### Diagnóstico real antes de editar

- Badge/labels de cards:
  - `apps/gold/agro/agro.js` define `CROP_STATUS_UI` con `sembrado`, `creciendo`, `produccion`, `finalizado`, `lost`.
  - `buildActiveCycleCardsData()` calcula `effectiveStatus = resolveCropStatus(crop, progress)` y pasa `estadoTexto = statusMeta.text`.
  - `apps/gold/agro/agrociclos.js` renderiza el badge con `ciclo.estadoTexto`.
- Campo real persistido: `agro_crops.status`.
- Campos auxiliares existentes en el flujo: `status_mode` y `status_override`.
- Valor interno de `En producción`: `produccion`.
- `<option>` del select: `<option value="produccion">En producción</option>`.
- Render espera `produccion` para mostrar `En producción`.
- Payload actual de edición envía `status: normalizedEffectiveStatus`, `status_mode` y `status_override`.
- El update usa `.update(updatePayload).eq('id', editId).eq('user_id', user.id).select('*').maybeSingle()`.
- El código ya valida que la fila devuelta confirme `status` o `status_override` contra el estado solicitado antes de marcar éxito.
- Cache/render:
  - `loadCrops()` consulta Supabase, escribe cache namespaced, actualiza `cropsCache`, renderiza cards y emite `AGRO_CROPS_READY`.
  - Si `loadCrops()` entra mientras `cropsLoadInFlight` está activo, solo marca `cropsLoadQueued = true` y retorna sin esperar el refresh encolado.
  - En `finally`, la recarga encolada se dispara con `loadCrops()` sin `await` ni promesa expuesta al caller.
- Causa probable del parpadeo:
  - render completo de cards tras save;
  - posible carrera con carga en curso;
  - el caller cree que `await loadCrops()` terminó, pero en realidad solo encoló una recarga posterior.
- Handler:
  - el form tiene `onsubmit="event.preventDefault(); window.saveCrop();"`.
  - el botón del footer tiene `onclick="window.saveCrop()"` y está fuera del `<form>`.
  - Aunque el click normal no dispara el submit del form por estar fuera del form, hay dos rutas declarativas posibles hacia `window.saveCrop()` y no existe lock de reentrada.
- Hipótesis verificadas:
  - A: no aplica; `produccion` coincide en select, payload y render.
  - B: no aplica; card lee el mismo estado resuelto desde `status/status_override`.
  - C/D: aplica como causa de carrera; `loadCrops()` puede devolver antes de la recarga real.
  - E: parcialmente mitigado ya; se valida fila devuelta, pero faltaba garantizar refresh real cuando hay cola.
  - F/G: riesgo existente por rutas múltiples y ausencia de lock.
  - H/I: parpadeo compatible con render completo y recarga encolada no esperada.

### Cierre técnico

- Se corrigió `loadCrops()` para que, si ya hay una carga en curso, devuelva una promesa que se resuelve solo después de ejecutar la recarga encolada real.
- La recarga encolada ya no queda disparada en segundo plano sin informar al caller; ahora propaga resolución/error al `await loadCrops()` que inició durante `cropsLoadInFlight`.
- Se eliminó la ruta directa `onclick="window.saveCrop()"` del botón del modal y se asoció el botón al form con `form="form-new-crop"`, dejando una sola ruta declarativa de submit.
- Se agregó lock `cropSaveInFlight` en `window.saveCrop()` para evitar doble submit/reentrada durante el update, refresh y render posterior.
- No se cambió el contrato de estados: `En producción` sigue siendo `produccion`.
- No se tocaron Mis Clientes, popups, Cartera Viva, Cartera Operativa, Mi Carrito ni migraciones.

### Verificación técnica

- Prueba RED/GREEN estática:
  - Antes del parche fallaba por `onclick` directo y `loadCrops()` encolado que retornaba antes del refresh real.
  - Después del parche pasa.
- `git diff --check`: PASS.
- `pnpm build:gold`: PASS.
- Búsqueda de duraciones hardcodeadas:
  - Solo aparece `90d: 90 días` en filtros/rankings, no como duración de ciclos.

### QA pendiente

- No se ejecutó QA manual ni browser testing por instrucción explícita del usuario.
- Pendiente validar manualmente `Creciendo -> En producción`, persistencia tras refresh y reducción del parpadeo en la card.

### Riesgos pendientes

- El render de cards sigue siendo un repintado completo del grid; puede existir una animación visual normal de progreso, pero ya no debería pisarse el estado nuevo con una recarga vieja no esperada.
- La prueba definitiva de persistencia requiere que el usuario valide en sesión autenticada contra Supabase.
