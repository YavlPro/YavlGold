# AGENT_REPORT_ACTIVE.md — YavlGold

Estado: ACTIVO
Fecha de apertura: 2026-08-01
Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md`

> **Constancia de rotación (2026-08-01)**: Se archivó el reporte activo previo (3,884 líneas, 2026-06-03 → 2026-07-31) al superar el umbral de 4,000 líneas de la ley canónica §4.1. Este archivo es la única fuente activa de reportes de sesión. El archivo archivado conserva íntegro el contexto de junio-julio 2026.

---

## Estado vivo del proyecto

- Release visible activa: `V1`.
- Canon operativo superior: `AGENTS.md`.
- Canon visual activo: `apps/gold/docs/ADN-VISUAL-V12.0.md`.
- Canon semántico Agro: `apps/gold/docs/MANIFIESTO_AGRO.md` (solo con autorización expresa).
- Ficha técnica disponible en: `apps/gold/docs/FICHA_TECNICA.md`.
- Supabase canónico: `supabase/` en raíz.
- Crónicas mensuales vigentes: mayo, junio y julio 2026 consolidadas y anexadas en `CRONICA-YAVLGOLD-2026-ACTIVA.md`.
- Estado del mes: agosto 2026 en curso (día 1).

## Frentes abiertos

- **Agro V1**: mantener separación semántica entre Facturero de Clientes, Facturero de la Finca y Mis Clientes.
- **AgroRepo**: QA pendiente de sistema roots (renombrar/eliminar), drag&drop con ciclo-guard y duplicar con mismo nombre.
- **Dashboard Agro v11**: QA visual pendiente del Product Owner en producción (balance real, mercados, velocímetro, selector finca).
- **Onboarding**: QA pendiente con cuenta nueva (verificar que wizard no se auto-abre).
- **Deuda técnica viva de junio**: extracción Rankings a `agro-rankings.js`, split `agro-facturero-finca.css` (>3,400L), extracción `agroOperationalCycles.js` (>4,000L), polling duplicado Binance (§11.5), `agro-planning.js` posible zombie, `agro.css` hex hardcodeados.
- **Documentación**: registrar sesiones en este archivo; rotar de nuevo al alcanzar 4,000 líneas.

## Decisiones canónicas vigentes

- No agregar features nuevas en `apps/gold/agro/agro.js`; solo wiring quirúrgico si es inevitable (§3.1).
- Nuevas piezas Agro deben vivir como módulos `agro-*.js` o CSS dedicado.
- Mis Clientes es libreta de contactos; Facturero de Clientes es seguimiento de créditos/deudas.
- Agro siempre arranca en el Hub/Dashboard, nunca restaura la última vista (`resolveInitialView()` sin storedView).
- `inversionUSD = baseInvestment + expenseInvestment` — el campo visible de inversión suma inversión base + gastos operativos reales.
- ADN Visual V12.0 es canon visual activo; V11 solo referencia histórica.
- Build gate obligatorio tras cambios de código: `pnpm build:gold`.

## Deuda técnica viva

- `agro.js` sigue siendo monolito legacy; evitar crecimiento.
- `agro-facturero-finca.css` > 3,400L — requiere split por superficie/módulo.
- `agroOperationalCycles.js` > 4,000L — requiere extracción modular.
- Rankings vive en `agro.js` — extracción a `agro-rankings.js` pendiente.
- Polling duplicado Binance en `agro-market.js` y `agro-interactions.js` — singleton centralizado pendiente (§11.5).
- `agro-planning.js` posible zombie — verificar import dinámico en `agro/index.html`.
- `agro.css` con 310 hex hardcodeados — migración progresiva a tokens.
- Dashboard Agro balance finca: solución client-side temporal (`computeFarmStats`) — requiere RPC definitiva.
- `agro.js` aún tiene `formatCurrency`/`formatMoneyByCode` delegando a `es-VE` — migrar a `agro-format.js`.

## Últimos cambios importantes todavía relevantes

- **2026-08-01**: Consolidación de crónicas de junio y julio 2026 (`chronicles/2026-06.md`, `chronicles/2026-07.md`) con addendums en `CRONICA-YAVLGOLD-2026-ACTIVA.md`. Purga de daily logs de ambos meses (23 archivos: 22 junio + 1 julio). Rotación de `AGENT_REPORT_ACTIVE.md` a 3,884L → archivado como `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md`. División de crónica general: contenido 2025 movido a `cronica yavlgold general 2025 historica no modificar.md`; crónica activa renombrada a `CRONICA-YAVLGOLD-2026-ACTIVA.md` (solo 2026).
- **2026-07-31**: Reincorporación tras pausa por hardware. 7 commits: botón eliminar repo móvil, scroll IA mobile, inversión USD real (base + gastos), responsive ciclos/headers, hub al entrar, 3 CVEs cerradas (brace-expansion, postcss), plan de 14 prioridades documental.
- **2026-07-07**: Sincronización canónica V12 (`llms.txt`, `AGENTS.md`, `FICHA_TECNICA.md`).
- **2026-06-28**: Migración tipográfica V12 COMPLETADA en toda la plataforma — Orbitron/Rajdhani erradicadas.
- **2026-06-27**: Factureros Fase 1 CERRADO — 6 bugs corregidos, QA producción GREEN.
- **2026-06-24**: Dashboard Agro v11 (6 bloques, ES6 module).
- **2026-06-10**: Skill Universal creada `SKILLS/2026-06-11-PATRONES-ERROR-YAVLGOLD.md`.
- **2026-06-05**: Plan estratégico de 4 fases de Fincas completado (Movimientos Generales, Dashboard, Comparación, Informes MD).

## Referencias a archivos archivados relevantes

- `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md` — contexto activo previo (junio-julio 2026)
- `AGENT_LEGACY_CONTEXT__2026-05-05__2026-06-03.md`
- `AGENT_LEGACY_CONTEXT__2026-04-17__2026-04-27.md`
- `apps/gold/docs/chronicles/2026-06.md` — Crónica de junio 2026
- `apps/gold/docs/chronicles/2026-07.md` — Crónica de julio 2026
- `apps/gold/docs/AGENT_REPORT.md` — histórico legacy (solo consulta)
- `apps/gold/docs/ops/` — daily logs de junio/julio purgados tras consolidación de crónicas

---

## Sesión 2026-08-01 — Consolidación de crónicas junio/julio y rotación del reporte activo

### Objetivo
Verificar la existencia de las crónicas de mayo/junio/julio 2026, crear las que faltaban y ejecutar la rotación canónica de `AGENT_REPORT_ACTIVE.md`. Separar la crónica general: 2025 → histórica cerrada; 2026 → activa.

### Diagnóstico
- Mayo 2026: crónica existente y anexada en `CRONICA-YAVLGOLD-2026-ACTIVA.md` (verificado).
- Junio 2026: crónica NO existente; 22 daily logs en `docs/ops/` (21 canónicos + 1 no canónico `DAILY_LOG_2026-06-03.md`).
- Julio 2026: crónica NO existente; 1 daily log canónico + sesiones del 7 y 31 de julio en el reporte activo previo.
- `AGENT_REPORT_ACTIVE.md`: 3,884 líneas — candidato a rotación.
- `CRONICA-YAVLGOLD.md`: mezclaba 2025 (líneas 1-408) con addendums 2026 (410-707) — candidato a división anual.

### Cambios realizados
| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/docs/chronicles/2026-06.md` | CREADO | Crónica completa de junio (hitos, decisiones, módulos, deuda técnica). |
| `apps/gold/docs/chronicles/2026-07.md` | CREADO | Crónica completa de julio (pausa por hardware + reincorporación 31). |
| `apps/gold/docs/chronicles/CRONICA-YAVLGOLD-2026-ACTIVA.md` | CREADO | Crónica activa renombrada con solo contenido 2026 (7 addendums Ene→Jul). |
| `apps/gold/docs/chronicles/cronica yavlgold general 2025 historica no modificar.md` | CREADO | Memoria histórica 2025 cerrada (líneas 1-408 originales + banner NO MODIFICAR). |
| `apps/gold/docs/ops/` | PURGADO | 23 daily logs de junio/julio eliminados (incluido 1 no canónico). |
| `apps/gold/docs/AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md` | CREADO | Reporte activo previo archivado íntegro. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | REEMPLAZADO | Nuevo reporte activo limpio con contexto vivo + sesión actual. |

### Resultado de build
`pnpm build:gold` → ✅ GREEN (agent-guard OK, agent-report-check OK, 187 módulos, 4.72s, check-llms OK, check-dist-utf8 OK).

### QA sugerido
- Verificar que `CRONICA-YAVLGOLD-2026-ACTIVA.md` mantiene addendums consecutivos Ene→Jul 2026.
- Verificar que `cronica yavlgold general 2025 historica no modificar.md` conserva el contenido 2025 íntegro y el banner de no modificar.
- Verificar que `AGENT_LEGACY_CONTEXT__2026-06-03__2026-07-31.md` conserva las 3,884 líneas íntegras.
- Confirmar que el puntero de raíz `AGENT_REPORT_ACTIVE.md` sigue apuntando al activo.

### NO se hizo
- No se crearon las crónicas de agosto 2026 (mes en curso, no corresponde).
- No se tocó código del producto.
- No se modificó `AGENT_LEGACY_CONTEXT` previo ni documentos canónicos superiores.

---

## Sesión 2026-08-01 — Mejoras visuales Dashboard principal

**Objetivo:** Eliminar animaciones prohibidas (saltarinas, glow, breathing), reducir espacios vacíos y corregir bugs visuales en `/dashboard`.

**Diagnóstico:**
- `module-card:hover` usaba `cubic-bezier(0.175, 0.885, 0.32, 1.275)` — curva con overshoot bounce prohibida
- `btn-modulo:hover` usaba `transform: scale(1.02)` — salto visual
- `hero-avatar` tenía `width: 72px`, `border: 2px solid`, sin `animation: none` — aparecía como logo grande con glow circular
- `stats-section` tenía `margin-bottom: 3rem`, `insights-section` gap de `1.5rem` y margin de `2.5rem` — espacios vacíos excesivos entre bloques
- `stat-number` en `font-size: 2.5rem` y `font-weight: 900` — números demasiado dominantes
- `insight-title` en `1.1rem` — demasiado grande para eyebrow
- `module-title` en `1.4rem` — desproporcionado al layout compacto
- `module-features li::before { content: '◆' }` — override del estilo chip de `dashboard-v1.css`
- `yg-reveal` tenía `transform: translateY(20px)` — salto al hacer scroll reveal

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/assets/css/dashboard-v1.css` | edit | `hero-avatar`: 72→56px, border 2px→1px, `animation: none !important`, `box-shadow: none` |
| `apps/gold/assets/css/dashboard-v1.css` | edit | `hero-welcome` padding: `40px 0 24px` → `24px 0 16px` |
| `apps/gold/assets/css/dashboard-v1.css` | edit | `hero-title` font-size reducido, font-weight 900→700 |
| `apps/gold/assets/css/dashboard-v1.css` | edit | `stat-number`: `text-2xl/900` → `text-xl/700` |
| `apps/gold/assets/css/dashboard-v1.css` | edit | `kpi-section/insight-card` padding y gap reducidos |
| `apps/gold/assets/css/dashboard-v1.css` | edit | `yg-reveal`: removido `translateY(20px)`, solo fade-in |
| `apps/gold/assets/css/dashboard-v1.css` | edit | `btn-modulo:hover`: `scale(1.02)` → `opacity: 0.92` |
| `apps/gold/dashboard/index.html` | edit | `module-card`: transition cubic-bezier saltarín → `border-color 200ms ease` |
| `apps/gold/dashboard/index.html` | edit | `module-card:hover`: border-color ahora más visible (dorado) en lugar de más opaco |
| `apps/gold/dashboard/index.html` | edit | `module-icon`: 50px→40px, border-radius 14px→10px, font-size 1.5→1.2rem |
| `apps/gold/dashboard/index.html` | edit | `module-title`: 1.4rem→1rem, letter-spacing 1px→0.5px |
| `apps/gold/dashboard/index.html` | edit | `module-features li`: chip limpio sin `◆`, padding reducido |
| `apps/gold/dashboard/index.html` | edit | `btn-modulo`: gradient removido → color plano `var(--dorado-yavl)`, padding reducido, hover con `opacity` |
| `apps/gold/dashboard/index.html` | edit | `stats-section`: margin-bottom `3rem` → `16px`, minmax `200px`→`160px` |
| `apps/gold/dashboard/index.html` | edit | `stat-card/number/label`: padding 1.5→1rem, size 2.5→1.6rem, weight 900→700 |
| `apps/gold/dashboard/index.html` | edit | `insights-section`: gap/margin reducidos, border-radius 16px→12px, padding 1.25→1rem |
| `apps/gold/dashboard/index.html` | edit | `insight-title`: 1.1rem→0.7rem eyebrow compacto |
| `apps/gold/dashboard/index.html` | edit | `dashboard-container` padding inline: `2rem` → `0 1.5rem 2.5rem` |
| `apps/gold/dashboard/index.html` | edit | responsive mobile: padding y columnas ajustados |

**Resultado build:** `✔ built in 3.50s` — sin errores ni warnings nuevos

**QA sugerido:** Revisar en browser `/dashboard` — verificar que el logo hero sea pequeño y sin glow, las tarjetas de stats compactas, las cards de módulo sin bounce al hover, y el scroll reveal sin salto.

---

## Sesión 2026-08-03 — Fix de reportes Agro: finca como entidad raíz

**Objetivo:** Implementar la spec `AGENT_SPEC__REPORTES_POR_FINCA__2026-08-03.md` — corregir los 6 bloques de hallazgos identificados en la auditoría del 2026-08-02.

**Diagnóstico (base):** Auditoría previa (solo lectura) confirmó causa raíz unificada: `buildExportMarkdown()` consumía `state.datasets` global sin pasar por `filterCyclesByContext()`, generando que los tres factureros (Finca, Cultivo, Personal) exportaran el mismo dataset, título hardcodeado y filename sin contexto.

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---|---|---|
| `agroOperationalCycles.js` | fix | `buildExportFileName()`: filename dinámico por preset (finca/cultivo/personal) + nombre entidad seleccionada (H3) |
| `agroOperationalCycles.js` | fix | `buildMarkdownSection()`: acepta `filteredCycles` y recalcula resumen sobre snapshot local (H2, H7) |
| `agroOperationalCycles.js` | fix | `buildExportMarkdown()`: título dinámico desde `state.viewContext.title`; pasa snapshots filtrados via `filterCyclesByContext()` sin mutar `state.datasets` (H1, H2, H7) |
| `agroOperationalCycles.js` | fix | `renderShell()` + `renderExportView()`: botones cambiados de `btn btn-primary` / `btn` a `btn btn-gold` (H5) |
| `agroOperationalCycles.js` | docs | `getCycleAssociationType()`: comentario canónico — Personal = huérfanos totales (`!crop_id && !farm_id`) (D1) |
| `agro-operational-cycles.css` | fix | Reglas de override extendidas a `.btn-gold` además de `.btn-primary` (H5) |
| `agro-crop-report.js` | fix | `CROP_REPORT_COLUMNS_FULL`: añadido `farm_id`; bloque de MD: inserta `> **Finca:** <nombre>` resolviendo vía `window._agroFarms` (H10) |
| `agroperfil.js` | fix | `buildProfileMarkdown()`: sección "Alcance del Informe" declara "Todas las fincas" y lista las incluidas en lugar de solo la finca del perfil (D3) |
| `agro.js` | fix | `exportOpsRankingsMarkdown()`: importa `normalizeReportClientName` y la aplica sobre nombres de clientes antes de escribir el MD (D4) |
| `apps/gold/docs/AGENT_SPEC__REPORTES_POR_FINCA__2026-08-03.md` | new | Spec guardada como documento canónico de referencia del frente |

**Restricciones respetadas:**
- `state.datasets[SUBVIEW_ACTIVE/FINISHED]` no se tocaron — los snapshots filtrados son locales al export.
- `rebuildPortfolioByCrop()` y `emitPortfolioSnapshot()` siguen consumiendo datos globales.
- `agro-farm-report.js` no se tocó (modelo correcto, referencia).

**Resultado del build:**
```
agent-guard: OK
agent-report-check: OK
vite build: ✓ 187 modules, sin errores
UTF-8 check: ✓ passed
Exit code: 0
```

**QA pendiente (Yerikson):** Ver §7 de la spec — pruebas funcionales en navegador y móvil real.

**No se hizo en esta sesión:** Export masivo de clientes (D2, fuera de alcance); split de `agroOperationalCycles.js` (deuda técnica preexistente).

---

## Sesión 2026-08-05 — Facturero de Clientes: filtrado por finca + export global

**Objetivo:** Implementar spec `AGENT_SPEC__CLIENTES_FINCA_EXPORT__2026-08-05.md` — F1 (filtrar lista por finca) y F2 (botón "Exportar lista").

**4 puntos de verificación resueltos antes de implementar:**
- V-A: `buildBuyerPortfolioScopeKey(row)` produce `"buyer:{id}"` o `"group:{key}"` — mismo formato que el Set de `fetchBuyerPortfolioFarmScopeKeys`. ✅
- V-B: `getCropIdsForSelectedFarm()` existe (línea 468), usa `getAvailableCrops()` filtrado por `crop.farm_id`. ✅
- V-C: `hasBuyerPortfolioHistory(row)` existe (línea 1283), devuelve `true` si cualquier campo numérico > 0. ✅
- V-D: `downloadBuyerPortfolioExport` usa `'\ufeff' + md`, `Blob utf-8`, `appendChild/click/removeChild/revokeObjectURL`. Reusado idéntico. ✅

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro-facturero-clientes.js` | feat | Nueva función `fetchBuyerPortfolioFarmScopeKeys(supabase, cropIds)` — análoga a CropScopeKeys con `.in()` |
| `agro-facturero-clientes-view.js` | feat | Import de `fetchBuyerPortfolioFarmScopeKeys` y `downloadBuyerListExport` |
| `agro-facturero-clientes-view.js` | feat | Variables de estado: `visibleFarmScopeKeys/Id/Loading/Error/RequestId` |
| `agro-facturero-clientes-view.js` | feat | `syncVisibleFarmScope()` — análoga a `syncVisibleCropScope` |
| `agro-facturero-clientes-view.js` | feat | `loadSummary()` llama `syncVisibleFarmScope` + reset en el catch |
| `agro-facturero-clientes-view.js` | feat | `getCropScopedRows()` — Caso 2 nuevo: finca sin cultivo filtra y scopa cifras por finca |
| `agro-facturero-clientes-view.js` | feat | `getListViewState()` — estados de carga y error para finca |
| `agro-facturero-clientes-view.js` | feat | `exportBuyerList()` — genera MD snapshot de `filteredRows` activos |
| `agro-facturero-clientes-view.js` | feat | Botón "Exportar lista" en `renderListViewMarkup` + handler en `bindListViewEvents` |
| `agro-facturero-clientes-export.js` | feat | `buildBuyerListExportMarkdown`, `buildBuyerListExportFilename`, `downloadBuyerListExport` |

**No tocado:** `visibleCropScopeKeys`, `syncVisibleCropScope`, `fetchBuyerPortfolioCropScopeKeys`, detalle individual, RPC `agro_buyer_portfolio_summary_v1`.

**Resultado del build:** `agent-guard: OK` · `agent-report-check: OK` · `187 modules, sin errores` · `UTF-8: OK` · Exit 0.

**QA pendiente (Yerikson — verde provisional):**
- F1: seleccionar finca → lista muestra solo clientes de esa finca con cifras scoped
- F2: "Exportar lista" → MD concuerda exactamente con la lista visible
- No regresión: filtrado por cultivo sigue igual; export individual del detalle sigue igual

**Deuda abierta:** Tests 1–7 del frente anterior (factureros operativos, 2026-08-02) en verde provisional — pendiente pasada profunda.
