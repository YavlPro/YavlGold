# SPEC — Export y filtrado por finca en Facturero de Clientes

## Metadatos

| Campo | Valor |
|---|---|
| Archivo | `apps/gold/docs/AGENT_SPEC__CLIENTES_FINCA_EXPORT__2026-08-05.md` |
| Redactada | 2026-08-05 |
| Diagnóstico base | 2026-08-05 (auditoría de Kiro, solo lectura) |
| Estado | Lista para revisión — **no implementar hasta aprobación** |
| Módulo | `apps/gold/agro` — Facturero de Clientes |
| Archivos principales | `agro-facturero-clientes-view.js`, `agro-facturero-clientes.js`, `agro-facturero-clientes-export.js` |

---

## 0. Principio rector

Mismo que los factureros operativos: **el export es un snapshot de la vista filtrada. Lista y MD cuentan la misma historia.**

Reglas de borde fijadas por el usuario:
- Un cultivo sin finca no existe. Cada cultivo pertenece a una finca específica.
- Movimientos sin `crop_id` (legacy huérfanos) aparecen **solo en Vista general**, nunca en vista por finca.
- Clientes "Sin registro" no aparecen en vistas por finca (no tienen movimientos de esa finca).
- La suma de las vistas por finca puede no igualar a Vista general; el MD lo declara en nota de pie.

---

## 1. Verificaciones técnicas (confirmadas en código antes de specar)

| # | Verificación | Resultado |
|---|---|---|
| V1 | Los movimientos de cliente cargan `crop_id` | ✅ Confirmado — `fetchOperationalProgressMap` selecciona `crop_id` en `agro_pending/income/losses` |
| V2 | El filtrado por finca via `cropIds` ya existe | ✅ Confirmado — `fetchOperationalProgressMap` acepta `{ cropIds }` y usa `.in('crop_id', cropIds)` |
| V3 | El patrón de scope keys por cultivo es extensible | ✅ Confirmado — `fetchBuyerPortfolioCropScopeKeys` hace `.eq('crop_id', id)`; extensión es `.in('crop_id', ids)` |
| V4 | La RPC global no necesita cambios | ✅ Confirmado — `agro_buyer_portfolio_summary_v1` carga todos los clientes; el filtrado es client-side |

---

## 2. Resumen de los dos cambios

| Feature | Qué hace | Archivos tocados |
|---|---|---|
| **F1 — Filtrar lista por finca** | Con finca seleccionada, la lista muestra solo clientes con ≥1 movimiento en cultivos de esa finca; cifras scoped a esa finca | `agro-facturero-clientes.js` (nueva función), `agro-facturero-clientes-view.js` |
| **F2 — Export global de la lista** | Botón "Exportar lista" en el header; genera MD tabla resumen de clientes visibles respetando filtros activos | `agro-facturero-clientes-view.js`, `agro-facturero-clientes-export.js` |

**P3 fuera de alcance:** export individual desde tarjeta de lista — se queda solo en el detalle del cliente.

---

## 3. F1 — Filtrar lista por finca

### 3.1 Problema actual

`getCropScopedRows()` filtra la lista cuando hay un **cultivo** seleccionado usando `visibleCropScopeKeys`. Cuando solo hay **finca** seleccionada (sin cultivo), devuelve todos los clientes con overlay de datos — pero **no elimina** a los que no tienen movimientos en esa finca.

### 3.2 Nueva función en `agro-facturero-clientes.js`

```js
// Patrón idéntico a fetchBuyerPortfolioCropScopeKeys pero con .in('crop_id', cropIds)
async function fetchBuyerPortfolioFarmScopeKeys(supabaseClient, cropIds)
```

- Recibe el array de `cropIds` de la finca (disponible via `getCropIdsForSelectedFarm()`)
- 3 queries en paralelo sobre `agro_pending / agro_income / agro_losses`:
  `.in('crop_id', cropIds)` + `.is('deleted_at', null)` + `.is('reverted_at', null)`
- Selecciona solo `id, buyer_id, buyer_group_key` (mínimo necesario)
- Devuelve `Set<string>` de scope keys (mismo formato que `visibleCropScopeKeys`)
- Si `cropIds` vacío → devuelve `new Set()` (finca sin cultivos = sin clientes)

### 3.3 Nuevas variables de estado en `agro-facturero-clientes-view.js`

```js
let visibleFarmScopeKeys = null;       // Set<string> | null
let visibleFarmScopeId = '';           // farmId activo cuando se cargaron las keys
let visibleFarmScopeLoading = false;
let visibleFarmScopeError = '';
let visibleFarmScopeRequestId = 0;
```

### 3.4 Nueva función `syncVisibleFarmScope()`

Análoga a `syncVisibleCropScope()`:
- Si no hay finca seleccionada → reset `visibleFarmScopeKeys = null`, `visibleFarmScopeId = ''`
- Si hay finca → llama `fetchBuyerPortfolioFarmScopeKeys(supabase, Array.from(getCropIdsForSelectedFarm()))`
- Maneja race conditions con `requestId` (mismo patrón)
- Al terminar: `renderView()`

### 3.5 Modificar `loadSummary()`

Después de `await syncVisibleCropScope({ render: false })`, añadir:
```js
await syncVisibleFarmScope({ render: false });
```

Y en el handler del chip de finca (`data-cartera-farm`), después de `void loadSummary()`:
el `loadSummary` ya llama a `syncVisibleFarmScope`, no hace falta llamada extra.

### 3.6 Modificar `getCropScopedRows()`

```js
function getCropScopedRows(rows) {
    const safeRows = Array.isArray(rows) ? rows.slice() : [];
    const selectedCropId = getSelectedCropId();
    const selectedFarmId = getSelectedFarmId();

    // Caso 1: cultivo específico — comportamiento existente, sin cambio
    if (selectedCropId) { /* ... código actual sin cambio ... */ }

    // Caso 2: finca seleccionada sin cultivo específico (NUEVO)
    // Regla: mostrar solo clientes con movimientos en cultivos de esa finca.
    // "Sin registro" excluidos (no tienen movimientos de esa finca).
    // Cifras scoped via cropScopedSummaryMap (ya poblado por fetchOperationalProgressMap).
    if (selectedFarmId) {
        if (!(visibleFarmScopeKeys instanceof Set) || visibleFarmScopeId !== selectedFarmId) {
            return []; // scope keys aún no cargadas
        }
        return safeRows.flatMap((row) => {
            if (!hasBuyerPortfolioHistory(row)) return []; // "Sin registro" → oculto en finca
            const scopeKey = buildBuyerPortfolioScopeKey(row);
            if (!scopeKey || !visibleFarmScopeKeys.has(scopeKey)) return [];
            return [buildCropScopedSummaryOverlay(row, cropScopedSummaryMap.get(scopeKey))];
        });
    }

    // Caso 3: Vista general — comportamiento existente, sin cambio
    return safeRows.map((row) => { /* ... código actual sin cambio ... */ });
}
```

**Restricción:** no tocar las variables `visibleCropScopeKeys`, `visibleCropScopeId` ni la rama del cultivo.

### 3.7 Estado de carga para finca en `getListViewState()`

Añadir caso análogo a `visibleCropScopeLoading`:
```js
if (visibleFarmScopeLoading && selectedFarmId) {
    bodyMode = 'farm-loading';
    bodyContent = renderEmptyState({
        title: 'Cargando clientes de la finca',
        copy: 'Buscando movimientos visibles para esta finca.'
    });
}
```

---

## 4. F2 — Export global de la lista

### 4.1 Nueva función en `agro-facturero-clientes-export.js`

```js
export function buildBuyerListExportMarkdown({ rows, farmName, cropName, activeCategory, exportedAt })
```

Estructura del MD:
- Título: `# Cartera de Clientes — {alcance}` donde alcance es "Vista general", "Finca: {nombre}" o "Cultivo: {nombre}"
- Fecha de exportación
- Alcance declarado explícitamente
- Tabla resumen: `| Cliente | Categoría | Fiado | Cobrado | Pérdida | Cumplimiento |`
- Fila por cada cliente visible en `rows`
- Totales al pie (suma de fiado, cobrado, pérdida)
- Nota de pie obligatoria: `"Para el historial detallado de cada cliente, usa el export individual en el detalle del cliente."`
- Si hay finca: nota adicional: `"Esta vista incluye solo movimientos asociados a cultivos de {finca}. La Vista general incluye movimientos sin asociar (legacy)."`

```js
export function buildBuyerListExportFilename({ farmName, cropName, exportedAt })
// Produce: cartera-lista-global-YYYY-MM-DD.md
//          cartera-lista-finca-los-higuerones-YYYY-MM-DD.md
//          cartera-lista-cultivo-batata-YYYY-MM-DD.md
```

```js
export function downloadBuyerListExport({ rows, farmName, cropName, activeCategory, exportedAt })
// Mismo patrón: Blob UTF-8 BOM + link.click() + URL.revokeObjectURL
```

### 4.2 Nueva función `exportBuyerList()` en `agro-facturero-clientes-view.js`

```js
function exportBuyerList() {
    const listState = getListViewState();
    const rows = listState.filteredRows;
    if (!rows.length) return; // nada que exportar
    const selectedFarmId = getSelectedFarmId();
    const farmName = selectedFarmId
        ? getAvailableFarms().find((f) => normalizeFarmId(f?.id) === selectedFarmId)?.name || 'Finca'
        : null;
    const selectedCropId = getSelectedCropId();
    const cropDisplay = selectedCropId
        ? resolveCropDisplay(getAvailableCrops().find((c) => normalizeCropId(c?.id) === selectedCropId))
        : null;
    const cropName = cropDisplay?.shortLabel || null;
    downloadBuyerListExport({ rows, farmName, cropName, activeCategory, exportedAt: new Date() });
}
```

### 4.3 Botón en `renderListViewMarkup()`

En `cartera-viva-view__actions`, añadir el botón "Exportar lista" junto a "Actualizar":

```html
<button type="button"
        class="cartera-viva-refresh cartera-viva-refresh--secondary"
        data-cartera-export-list
        ${rows.length === 0 ? 'disabled' : ''}>
    Exportar lista
</button>
```

El botón se deshabilita si no hay filas visibles.

### 4.4 Handler en `bindListViewEvents()`

El módulo ya usa delegación de eventos (`root.addEventListener('click', ...)`). Añadir:
```js
const exportListButton = event.target.closest('[data-cartera-export-list]');
if (exportListButton && !exportListButton.disabled) {
    exportBuyerList();
    return;
}
```

También en `patchListView()`: actualizar el estado `disabled` del botón si ya existe en el DOM.

---

## 5. Qué NO tocar

- `fetchBuyerPortfolioSummary` y la RPC `agro_buyer_portfolio_summary_v1`
- `visibleCropScopeKeys`, `visibleCropScopeId`, `syncVisibleCropScope()`
- `fetchBuyerPortfolioCropScopeKeys` — no modificar; crear función análoga separada
- `agro-facturero-clientes-detail.js` — export individual por cliente sin cambio
- `downloadBuyerPortfolioExport` — no tocar

---

## 6. Orden de implementación

| Orden | Commit | Contenido | Riesgo |
|---|---|---|---|
| 1 | `feat(clientes): filtrar lista por finca` | `fetchBuyerPortfolioFarmScopeKeys` + `syncVisibleFarmScope` + modificar `getCropScopedRows` | Medio — no toca rama cultivo ni RPC |
| 2 | `feat(clientes): export global de la lista` | `buildBuyerListExportMarkdown` + botón + handler | Bajo — additive |

QA real antes de pasar del commit 1 al 2.

---

## 7. Tests de aceptación

**F1 — Filtrado por finca:**
- Seleccionar "Los higuerones" → solo clientes con movimientos en cultivos de esa finca; clientes exclusivos de otra finca desaparecen de la lista
- Seleccionar "finca la ladera" → solo sus clientes
- Volver a "Vista general" → todos los clientes como antes
- Clientes "Sin registro" desaparecen al seleccionar finca
- Cifras (fiado/cobrado/pérdida) de cada cliente reflejan solo movimientos de esa finca

**F2 — Export global:**
- Con "Los higuerones": exportar lista → MD declara finca, tabla con esos clientes, nota de pie
- Con Vista general: MD declara alcance global, todos los clientes visibles
- Lista y MD muestran exactamente los mismos clientes y cifras (test principal)
- El export individual en el detalle del cliente sigue funcionando sin cambio

**No regresión:**
- Seleccionar cultivo específico sigue funcionando igual que antes (rama `visibleCropScopeKeys` intacta)
- Vista general muestra todos los clientes como antes del cambio

---

## 8. Deuda abierta

Verde provisional del frente anterior (factureros operativos, 2026-08-02). Tests 1–7 de `AGENT_SPEC__REPORTES_POR_FINCA__2026-08-03.md` no han sido ejecutados a fondo. Cerrar antes de marcar ese frente como verde definitivo.
