# Auditoría de Precisión Quirúrgica — 2026-05-10

**Agente:** GLM 5.1 (Arquitecto Semántico)  
**Modo:** Diagnóstico puro. Sin editar archivos.  
**Misión:** Preparar la ofensiva "Purga QA y Unificación Monetaria" (12 de mayo 2026).

---

## PARTE 1: Auditoría del Filtro QA

### 1.1 Flujo de datos — Reporte Individual (`agro-crop-report.js`)

El flujo para un reporte de cultivo individual sigue esta cadena:

```
exportCropReportMarkdown(cropId)
  └─ fetchTabData(userId, cropId, tabName)  ← PUNTO DE INTERCEPCIÓN
       └─ supabase.from(TABLE).select(...).eq('user_id').eq('crop_id').is('deleted_at', null)
           └─ Filtro post-fetch: split semántico de fiados (transferred/deleted/active)
               └─ Cómputo de totales en cents (toCents)
                   └─ Serialización a Markdown
```

**Punto exacto de intercepción:**  
- `fetchTabData()` en `agro-crop-report.js` (líneas ~159-330). Es la función que resuelve las queries por tab (`ingresos`, `gastos`, `pendientes`, `perdidas`, `transferencias`).
- Los datos retornados son arrays de filas Supabase sin ningún filtro QA.

### 1.2 Flujo de datos — Reporte Global (`agro-stats-report.js`)

```
exportStatsReport()
  ├─ fetchCrops(userId)        ← PUNTO DE INTERCEPCIÓN
  ├─ fetchIncome(userId)       ← PUNTO DE INTERCEPCIÓN
  ├─ fetchExpenses(userId)     ← PUNTO DE INTERCEPCIÓN
  ├─ fetchPending(userId)      ← PUNTO DE INTERCEPCIÓN
  └─ fetchLosses(userId)       ← PUNTO DE INTERCEPCIÓN
       └─ buildPerCropTable(crops, income, expenses, pending, losses)
           └─ Cómputo de totales (costCents, profitCents)
               └─ Serialización a Markdown con centsToStr()
```

**Puntos de intercepción:**  
- `fetchCrops()` → línea ~385
- `fetchIncome()` → línea ~395
- `fetchExpenses()` → línea ~432
- `fetchPending()` → línea ~453
- `fetchLosses()` → línea ~476

### 1.3 Flujo de datos — Rankings (`agro.js` monolito)

```
refreshOpsRankings()
  └─ fetchOpsRankingsData()  ← línea ~13530
       └─ supabase.rpc('agro_rank_top_clients', params)
       └─ supabase.rpc('agro_rank_pending_clients', params)
       └─ supabase.rpc('agro_rank_top_crops_profit', params)
           └─ renderOpsRankings() / exportOpsRankingsMarkdown()
```

**Nota:** Los rankings usan RPCs de Supabase (`agro_rankings_rpc_v1.sql`), por lo que el filtro QA debe aplicarse **también a nivel SQL** si se quiere limpieza total. La alternativa es filtrar post-RPC en `fetchOpsRankingsData()`.

### 1.4 Flujo de datos — Estadísticas globales (`agroestadistica.js`)

```
getGlobalStats({ supabase, userId, range })
  └─ fetchRowsWithFallback(supabaseClient, table, userId, columnVariants)  ← PUNTO DE INTERCEPCIÓN
       └─ evaluateUsdAmount(row, amountFields)
           └─ sumRowsUsd()
               └─ return { money: { incomeUsd, costUsd, profitUsd, ... } }
```

### 1.5 Flujo de datos — Estadísticas por sección (`agro-section-stats.js`)

```
fetchSectionRows(sectionKey, rangeDays, options)
  └─ supabase.from(TABLE).select(...).eq('user_id')  ← PUNTO DE INTERCEPCIÓN
       └─ computeStats(sectionKey, rows, cropsMap)
           └─ renderPanel() / buildSectionMD()
```

### 1.6 Funciones a interceptar por `agro-report-guard.js`

| # | Archivo | Función | Línea aprox. | Rol |
|---|---------|---------|-------------|-----|
| 1 | `agro-crop-report.js` | `fetchTabData()` | ~159 | Fetch individual por tab/cultivo |
| 2 | `agro-stats-report.js` | `fetchCrops()` | ~385 | Lista de cultivos para reporte global |
| 3 | `agro-stats-report.js` | `fetchIncome()` | ~395 | Ingresos globales |
| 4 | `agro-stats-report.js` | `fetchExpenses()` | ~432 | Gastos globales |
| 5 | `agro-stats-report.js` | `fetchPending()` | ~453 | Fiados globales |
| 6 | `agro-stats-report.js` | `fetchLosses()` | ~476 | Pérdidas globales |
| 7 | `agroestadistica.js` | `fetchRowsWithFallback()` | ~160 | Fetch genérico para estadísticas |
| 8 | `agro-section-stats.js` | `fetchSectionRows()` | ~115 | Fetch por sección individual |
| 9 | `agro.js` | `fetchOpsRankingsData()` | ~13530 | Rankings (post-RPC) |

### 1.7 Patrones de datos QA identificados

**Patrones buscados y resultado:**

| Patrón | Encontrado en código | Notas |
|--------|---------------------|-------|
| `QA_` | ❌ No hardcoded | Solo existiría como dato en DB |
| `test_` | ❌ No hardcoded | Solo existiría como dato en DB |
| `prueba` | ❌ No hardcoded | Solo existiría como dato en DB |
| `admin_test` | ❌ No encontrado | No hay referencias en el código |
| `borrador` | ❌ No encontrado | No hay referencias en el código |
| `demo` | ❌ No encontrado | No hay filtros de demo activos |

**Diagnóstico:** No existe ningún filtro QA activo en el código. No hay regex, string matching, ni constantes que filtren datos de prueba. Esto confirma que **cualquier dato QA insertado en Supabase pasa directo a reportes y exportaciones sin ninguna barrera**.

### 1.8 Diseño recomendado para `agro-report-guard.js`

```
// Contrato propuesto:
export function filterQARows(rows, options = {}) {
  // Filtra filas cuyo concepto/concept/name contenga patrones QA
  // Patrones: /^(QA_|test_|prueba|admin_test|borrador|demo)/i
  // Retorna: array limpio
}

export function isQARow(row) {
  // Inspecciona campos: concepto, concept, name, description
  // Retorna: boolean
}
```

**Punto de inyección:** Después de cada `fetch` y antes de cualquier `toCents()` o `reduce()`.

---

## PARTE 2: Auditoría de Costos y Pérdidas

### 2.1 Cálculo de `costosTotales` — Reporte Individual

**Archivo:** `agro-crop-report.js`  
**Línea exacta:** 771

```javascript
const totalCostWithInvestmentCents = totalExpensesCents + initialInvestmentCents;
const profitCents = totalIncomeCents - totalCostWithInvestmentCents;
```

> [!CAUTION]
> **BUG CONFIRMADO:** `totalLossesCents` está calculado (línea 767) pero **NO se suma** a `totalCostWithInvestmentCents`. La línea debería ser:
> ```javascript
> const totalCostWithInvestmentCents = totalExpensesCents + initialInvestmentCents + totalLossesCents;
> ```

**Impacto:** La rentabilidad en reportes individuales ignora las pérdidas, inflando artificialmente el beneficio reportado. Esto viola `MANIFIESTO_AGRO.md §4.3`: `costosTotales = inversión + gastos + pérdidas`.

### 2.2 Cálculo de costos — Reporte Global (`agro-stats-report.js`)

**Archivo:** `agro-stats-report.js`  
**Línea exacta:** 614 (per-crop) y 629 (totals)

```javascript
// Per-crop (línea 614):
const costCents = c.investmentCents + c.expenseCents + c.lossesCents;  // ✅ CORRECTO

// Totals (línea 629):
totals.costCents = totals.investmentCents + totals.expenseCents + totals.lossesCents;  // ✅ CORRECTO
```

> [!NOTE]
> El reporte global **SÍ incluye pérdidas** correctamente en los costos. La inconsistencia existe **solo en el reporte individual**.

### 2.3 Cálculo de costos — Estadísticas (`agroestadistica.js`)

**Archivo:** `agroestadistica.js`  
**Línea exacta:** 565-566

```javascript
const costUsd = investmentUsd + expenseUsd + lossesUsd;  // ✅ CORRECTO
const profitUsd = incomeUsd - costUsd;                     // ✅ CORRECTO
```

### 2.4 Cálculo de costos — Dashboard (`agro-stats.js`)

**Archivo:** `agro-stats.js`  
**Línea exacta:** 798

```javascript
const costTotal = cropsInvestmentTotal + expenseTotal + lossesTotal;  // ✅ CORRECTO
const profitNet = incomeTotal - costTotal;                              // ✅ CORRECTO
```

### 2.5 Verificación de doble sustracción

| Archivo | Pérdidas en costo | Pérdidas substraídas separado | Doble sustracción |
|---------|-------------------|-------------------------------|-------------------|
| `agro-crop-report.js` | ❌ NO incluidas | No | N/A (pérdidas ignoradas) |
| `agro-stats-report.js` | ✅ Incluidas | No | ❌ No hay doble |
| `agroestadistica.js` | ✅ Incluidas | No | ❌ No hay doble |
| `agro-stats.js` | ✅ Incluidas | No | ❌ No hay doble |

> **Veredicto:** No hay doble sustracción en ningún módulo. El único problema es la **omisión** de pérdidas en `agro-crop-report.js`.

---

## PARTE 3: Mapa de Formateadores Monetarios

### 3.1 Inventario completo de formateadores

| # | Archivo | Función | Locale | Formato | Línea |
|---|---------|---------|--------|---------|-------|
| 1 | `agro-crop-report.js` | `centsToStr()` | `en-US` | `$X.XX` (currency style) | ~168 |
| 2 | `agro-stats-report.js` | `centsToStr()` | `en-US` | `$X.XX` (currency style) | ~57 |
| 3 | `agroestadistica.js` | `formatUsd()` | `en-US` | `$X.XX` (2 decimales fijos) | ~368 |
| 4 | `agro.js` (monolito) | `formatCurrency()` | `en-US` | `$X` (0 decimales, currency style) | ~9102 |
| 5 | `agro.js` (monolito) | `formatMoneyByCode()` | `en-US`/`es-CO`/`es-VE` | USD/COP/VES | ~10111 |
| 6 | `agro.js` (monolito) | `formatInvestmentTriplet()` | mixto | `USD · COP · VES` | ~10134 |
| 7 | `agro.js` (monolito) | `formatFxRateLabel()` | `es-CO`/`es-VE` | Rate numérico | ~10141 |
| 8 | `agro.js` (monolito) | `formatOpsRankingCurrency()` | `es-VE` | `$X` o `$X.XX` | ~13148 |
| 9 | `agro-section-stats.js` | `fmtUSD()` | `en-US` | `$X.XX` | ~365 |
| 10 | `agro-section-stats.js` | `fmtBs()` | `es-VE` | `Bs X.XX` | ~370 |
| 11 | `agro-section-stats.js` | `fmtCOP()` | `es-CO` | `COP X` | ~375 |
| 12 | `agro-display-currency.js` | `formatUnsignedAmount()` | `es-CO`/`es-VE` | COP/VES/USD | ~59 |
| 13 | `agro-display-currency.js` | `formatCycleDisplayMoneyFromUsd()` | (delegado) | Conversión visual | ~127 |
| 14 | `agro-display-currency.js` | `formatSignedCycleDisplayMoneyFromUsd()` | (delegado) | Con signo +/- | ~143 |
| 15 | `agro-cycles-workspace.js` | `formatUsd()` | `en-US` | `$X.XX` (currency style) | ~164 |
| 16 | `agrociclos.js` | `formatUsdCompact()` | (delegado a display-currency) | Multimoneda | ~130 |
| 17 | `agrociclos.js` | `formatSignedUsd()` | (delegado a display-currency) | Con signo | ~134 |
| 18 | `agro-stats.js` | `formatCurrency()` (inline) | `en-US` | `$X.XX` | ~887 |
| 19 | `agro-stats.js` | `formatK()` (inline) | `en-US` | `$X.Xk` | ~892 |
| 20 | `@yavl/utils` | `formatCurrency()` | `en-US` | `Intl.NumberFormat` genérico | formatters.js:9 |

### 3.2 Problemas detectados

> [!WARNING]
> **Fragmentación crítica:** 20 formateadores distintos en 9 archivos con al menos 3 locales diferentes (`en-US`, `es-VE`, `es-CO`).

| Problema | Detalle |
|----------|---------|
| **Locale inconsistente** | `formatOpsRankingCurrency()` usa `es-VE` (coma como separador de miles: `$1.234,56`). El resto del sistema usa `en-US` (punto: `$1,234.56`). Esto genera exportes con mezcla de formatos. |
| **Separador decimal mixto** | Rankings exportan con `,` decimal. Reportes exportan con `.` decimal. Un mismo PDF puede contener ambos formatos. |
| **Sin código de moneda explícito** | La mayoría de los formateadores producen `$193.67` sin especificar `USD`, `COP` o `VES`. Solo `formatMoneyByCode()` agrega el código explícito. |
| **Duplicación de funciones** | `centsToStr()` está **duplicada** en `agro-crop-report.js` (línea ~168) y `agro-stats-report.js` (línea ~57). Son idénticas. |
| **`formatUsd()` duplicada** | Existe en `agroestadistica.js:368` y `agro-cycles-workspace.js:164` con implementaciones similares pero diferente firma. |
| **Inline formatters** | `agro-stats.js` define `formatCurrency()` y `formatK()` como closures inline dentro de `updateUIFromSummary()` (línea ~887). |
| **Precisión inconsistente** | `agro.js:formatCurrency()` usa 0 decimales. `agroestadistica.js:formatUsd()` usa 2 fijos. `formatOpsRankingCurrency()` usa 0 o 2 dinámicamente. |

### 3.3 Diseño objetivo para `agro-format.js`

El centralizador debe resolver:

```javascript
// agro-format.js — Formatter unificado

// 1. Trabaja internamente en cents (int) o float64
// 2. Difiere redondeo hasta render final
// 3. Siempre usa '.' como separador decimal
// 4. Siempre incluye código de moneda explícito

export function formatMoney(cents, currency = 'USD', options = {}) { ... }
// → "$193.67 USD"  |  "COP 750,000"  |  "Bs 1,234.56"

export function formatMoneyFromFloat(amount, currency = 'USD', options = {}) { ... }
// Wrapper para valores ya en float

export function formatSignedMoney(cents, currency = 'USD') { ... }
// → "+$193.67 USD"  |  "-$50.00 USD"

export function toCents(value) { ... }
// Centraliza la conversión a cents

export function centsToFloat(cents) { ... }
// Centraliza la conversión de cents a float
```

### 3.4 Mapa de reemplazo para la ofensiva

| Formateador actual | Archivo(s) | Reemplazo con `agro-format.js` |
|-------------------|------------|-------------------------------|
| `centsToStr()` | crop-report, stats-report | `formatMoney(cents)` |
| `formatUsd()` | agroestadistica, cycles-workspace | `formatMoney(toCents(amount))` |
| `formatCurrency()` | agro.js:9102 | `formatMoney(toCents(value))` |
| `formatOpsRankingCurrency()` | agro.js:13148 | `formatMoney(toCents(value))` |
| `fmtUSD()`, `fmtBs()`, `fmtCOP()` | section-stats | `formatMoney(toCents(n), 'USD'/'VES'/'COP')` |
| `formatMoneyByCode()` | agro.js:10111 | `formatMoney(toCents(value), code)` |
| `formatCurrency()` inline | agro-stats.js:887 | `formatMoney(toCents(num))` |
| `formatK()` inline | agro-stats.js:892 | `formatCompactMoney(toCents(num))` |

---

## Resumen Ejecutivo

### Hallazgos críticos

| Severidad | Hallazgo | Ubicación |
|-----------|----------|-----------|
| 🔴 **CRÍTICO** | Pérdidas omitidas en costos del reporte individual | `agro-crop-report.js:771` |
| 🟡 **ALTO** | 0 filtros QA en toda la cadena de datos | Todos los fetch |
| 🟡 **ALTO** | 20 formateadores monetarios fragmentados en 9 archivos | Ver tabla §3.1 |
| 🟠 **MEDIO** | Locale `es-VE` en rankings vs `en-US` en reportes | `agro.js:13154` vs `agro-crop-report.js:168` |
| 🟠 **MEDIO** | `centsToStr()` duplicada identicamente en 2 archivos | crop-report + stats-report |
| 🟢 **BAJO** | `@yavl/utils/formatCurrency()` no se usa en Agro | Solo existe como infraestructura muerta |

### Archivos que la ofensiva del 12 de mayo debe tocar

| Archivo | Acción |
|---------|--------|
| **[NEW]** `agro-report-guard.js` | Helper de filtro QA (patrones configurables) |
| **[NEW]** `agro-format.js` | Formatter centralizado con API unificada |
| `agro-crop-report.js` | Fix pérdidas L771 + inyectar guard + reemplazar `centsToStr` |
| `agro-stats-report.js` | Inyectar guard + reemplazar `centsToStr` |
| `agro.js` | Reemplazar `formatOpsRankingCurrency` + inyectar guard en rankings |
| `agro-section-stats.js` | Reemplazar `fmtUSD`/`fmtBs`/`fmtCOP` |
| `agroestadistica.js` | Reemplazar `formatUsd` + inyectar guard en `fetchRowsWithFallback` |

### Priorización recomendada para el 12 de mayo

1. **Primero:** Crear `agro-format.js` (es dependencia de todo lo demás)
2. **Segundo:** Crear `agro-report-guard.js` 
3. **Tercero:** Fix `agro-crop-report.js:771` (pérdidas en costos) — **1 línea**
4. **Cuarto:** Reemplazar formateadores progresivamente (de menor a mayor riesgo)
5. **Quinto:** `pnpm build:gold` + QA de reportes exportados

---

> **Este documento es diagnóstico puro. Ningún archivo de código fue editado.**  
> Generado por GLM 5.1 · Auditoría preparatoria para ofensiva del 12 de mayo 2026.
