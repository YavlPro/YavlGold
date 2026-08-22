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
- Estado del mes: agosto 2026 en curso (día 5).

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
- Dashboard Agro balance finca: RPC `get_farm_balance(p_farm_id)` ya implementada (26-jun-2026). `computeFarmStats` queda como fallback de comparación de fincas, no como cálculo del Bloque 3.
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

**QA profundo pendiente (verde provisional, tests de la spec §7):**
- F1-1 a F1-5: filtrado por finca — "Vista general" vs fincas específicas, clientes "Sin registro", cifras scoped por finca
- F2-1 a F2-4: export global — MD declara finca/alcance, tabla, coincidencia exacta lista ↔ MD, export individual intacto
- NR-1 a NR-2: no regresión — filtro por cultivo intacto; vista general como antes

**Deuda abierta:** QA profundo de clientes (F1/F2/NR) **pendiente** — frente Verde provisional. NO es verde definitivo hasta que el usuario confirme QA real.

> **Actualización (2026-08-05):** Verde provisional. Una sola deuda viva: el QA profundo de clientes.

---

## Sesión 2026-08-05 — Cierre factureros operativos (frente del 2026-08-02): VERDE DEFINITIVO

**Objetivo:** Cerrar el frente de factureros operativos con QA real confirmado por el usuario.

**Estado:** ✅ **VERDE DEFINITIVO — frente cerrado. Ya no es deuda abierta.**

**QA real confirmado:** El usuario confirmó que los tests 1–7 de `AGENT_SPEC__REPORTES_POR_FINCA__2026-08-03.md` pasaron en QA real.

**Commits de cierre (2026-08-05):**
- `fix(agro): vista de factureros aplica filtro de familia por preset (Capa 2)` — `87b18bf2`
- `hotfix(agro): restaurar isDonationCycle e isLossCycle borradas por str_replace` — `f68cf384`

**QA sugerido adicional:** Ninguno — frente cerrado con QA real. Mantener monitoreo de no-regresión al tocar zona de factureros en el futuro.

**NO se hizo:** No se tocó código en esta sesión de documentación. No se modificaron specs ni documentos canónicos.

---

## Sesión 2026-08-05 — Auditoría y corrección de coherencia documental (lectura + cirugía de docs)

**Objetivo:** Leer la documentación canónica del proyecto, detectar incoherencias entre capas documentales y corregir cada una en el documento que corresponde según su misión.

**Diagnóstico:** Se revisaron completos: `MANIFIESTO_AGRO.md` (1,733L), `FICHA_TECNICA.md` (464L), `llms.txt` (116L), `AGENT_CONTEXT_INDEX.md`, `ROADMAP_VISION_YAVLGOLD.md`, `LOCAL_FIRST.md`, `LEGACY_SURFACES.md`, `AGRO_V1_BASELINE.md`, `SPECS_crop-financials.md`, `DEUDA-TIPOGRAFICA-V12.md`, `DEUDA_TIPOGRAFIA_JS.md`, `AGENT_HANDOFF__FACTUREROS` y `apps/gold/agro/README.md`.

Se confirmaron incoherencias con evidencia en código y migraciones (`get_farm_balance` ya implementado en `agro-dashboard-v11.js:299` + migración `20260625120000_agro_get_farm_balance_rpc.sql`).

**Criterio de misión por capa (regla operativa reforzada):**
- MANIFIESTO_AGRO = semántica, sin datos técnicos.
- FICHA_TECNICA = todo lo técnico.
- llms.txt = resumen operativo servido en producción.
- AGENT_CONTEXT_INDEX = mapa documental.

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | fix | §4.2: eliminada deuda técnica del RPC `get_farm_balance` / "N queries" (fuga técnica que pertenece a la ficha) |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | fix | §9.28 FAQ alineado a §4.12.5: confirmaciones destructivas usan `showAgroConfirmDialog()` (corregido antes de esta sesión) |
| `apps/gold/docs/FICHA_TECNICA.md` | fix | Lista de módulos JS: añadidos `agro-facturero-clientes-detail.js` y `agro-facturero-clientes-export.js` |
| `apps/gold/docs/FICHA_TECNICA.md` | fix | Deuda del Bloque 3: RPC `get_farm_balance` reflejada como implementada (26-jun-2026) |
| `apps/gold/public/llms.txt` | fix | Estados de ciclo de cultivo alineados al canon semántico de MANIFIESTO §4.3 (rentabilidadReal/fiadosPendientes) |
| `apps/gold/public/llms.txt` | fix | Contradicción interna resuelta: confirmaciones destructivas usan `showAgroConfirmDialog()`, no `window.confirm()` |
| `apps/gold/docs/DEUDA-TIPOGRAFICA-V12.md` | fix | Eliminada sección "Módulos Agro ya migrados a V12" duplicada |
| `apps/gold/docs/AGENT_CONTEXT_INDEX.md` | fix | Enlace roto `AGRO-VISUAL-AUDIT-V1.md` eliminado; lista de crónicas mensuales completada (01–07); fecha actualizada a 2026-08-05 |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | fix | Deuda de balance de finca corregida (RPC resuelto); fecha del mes actualizada a día 5 |

**Resultado del build:** `pnpm build:gold` → ✅ Exit 0 (agent-guard OK, agent-report-check OK, vite 187 modules, check-llms OK, UTF-8 OK).

**QA sugerido:** Ninguno funcional — cambios solo documentales. Verificar visualmente en navegador solo si se desea confirmar que no hubo impacto (no lo hubo: no se tocó código).

**NO se hizo:** No se modificó código del producto. No se tocó el README público de `agro/` (capa pública, se mantiene simplificada a propósito). No se modificaron specs ni documentos canónicos superiores a los listados.

---

## Sesión 2026-08-06 — Auditoría de exportes (17 MDs), fixes de honestidad y ola UI de factureros

**Objetivo:** Cierre documental del 6 de agosto: auditoría de exportes, dos fixes de honestidad del export y ola visual M1-M6.

**Diagnóstico (evidencia):** Auditoría de 17 MDs exportados leídos íntegros. Capa de export VERDE PROBADA POR DOCUMENTO: factureros operativos con filtro de familia correcto (cultivo muestra solo sus ciclos, personal solo huérfanos), 5 informes de cultivo declarando su finca (H10), perfil global declarando "Todas las fincas" (D3), Rankings con nombres normalizados (D4), títulos y filenames por contexto (H1/H3), encabezados coherentes con cuerpo (H7).

**Cambios realizados (commits del 6 de agosto):**
- `9660be2` fix(clientes): normalizar nombres en export de lista (D4 extendido)
- `7b737cd` feat(agro): aviso de filtros activos en panel de export de factureros
- `b5e3a76` feat(agro): ola UI factureros — jerarquía de títulos, balance protagonista y botones (M1-M6)

**Build:** `pnpm build:gold` exit 0 en cada commit; Vercel deployment completed (check verde).

**CI:** CodeQL Analyze (python) falló por infraestructura de GitHub ("hosted runner lost communication" + "Internal server error", correlation ID `e872ae4e-de44-478c-9b6c-c22a4bc8b55d`). Declarado ruido por el usuario: no es veredicto sobre el código; el check válido de deploy es Vercel. Los analizadores de actions y javascript-typescript fueron cancelados como daño colateral. Higiene pendiente: re-run o ajuste de matriz (fail-fast false / evaluar quitar python).

**Estado de QA (honesto, sin verdes regalados):** Frentes previos (factureros operativos 2026-08-02 y clientes 2026-08-05) VERDE definitivo confirmado por el usuario; capa de export VERDE probada por documento (auditoría de 17 MDs de hoy); ola UI M1-M6 + aviso de filtros + normalización cartera-lista VERDE PROVISIONAL, pendiente de QA profundo online (el usuario solo hace QA online, post-deploy).

**QA pendiente (próxima sesión online):** Ola UI (copy visible bajo los tabs, balance con color por estado semántico según Caso 10 —Invirtiendo gris, nunca rojo por signo—, jerarquía de botones comparada con superficies hermanas, no-regresión de tabs/chips/aviso de filtros/privacidad/Volver) y tests F1/F2/NR de clientes si no se corrieron.

**Deuda viva:** Split de `agro-operational-cycles.css` (2,099 líneas, zona roja §11.X, congelado hasta plan de separación); M4 (menú de 3 puntos) diferido a segunda ola; Node 25 vs requerido 20.x (warn de engine).

**NO se hizo:** No se tocó lógica de filtrado, `state.datasets`, RPC ni export individual del detalle; no se crearon clases de botón nuevas (se reusó `btn-outline-gold` del ADN §7); no se modificaron documentos canónicos.

---

## Sesión 2026-08-07 — Cierre ola UI factureros M1-M6: VERDE DEFINITIVO

**Objetivo:** Cerrar el frente de la ola UI de factureros operativos (commit `b5e3a76`) con QA real confirmado por el usuario.

**Estado:** ✅ **VERDE DEFINITIVO — frente cerrado. Ya no es deuda abierta.**

**QA real confirmado por el usuario (2026-08-07):** Todos los puntos de la checklist pasaron en producción:
- M1: eyebrow + título h3 ocultos en factureros específicos; copy atenuado visible bajo los tabs. ✅
- M2: resumen en línea compacta (`N ciclos · M movimientos · Balance`) en lugar de cuadrícula de 3 tarjetas. ✅
- M3: chips de asociación con color semántico (cultivo/finca/huérfano). ✅
- M5: balance protagonista (primera métrica destacada) con color por estado semántico — Caso 10: Invirtiendo en gris, nunca rojo por signo. ✅
- M6: jerarquía de botones — `Nuevo registro` dorado primario, `Ver períodos` outline secundario. ✅
- NR-1..NR-5: no-regresión de tabs, chips de filtro, aviso de filtros activos, Volver/privacidad y consola sin errores. ✅

**Nota operativa de QA automatizado:** El intento de QA con browser automation quedó bloqueado por hCaptcha en login de producción (no forzado, conforme política anti-mock). Sin errores de consola en el intento; la validación real la realizó el usuario en navegador post-deploy.

**Build:** `pnpm build:gold` exit 0 (agent-guard OK, agent-report-check OK, vite OK, UTF-8 OK).

**QA sugerido adicional:** Ninguno — frente cerrado con QA real. Mantener monitoreo de no-regresión al tocar zona de factureros en el futuro.

**Deuda viva restante (sin cambios):** Split de `agro-operational-cycles.css` (2,099 líneas, congelado hasta plan); M4 (menú de 3 puntos) diferido a segunda ola; Node 25 vs requerido 20.x (warn de engine); higiene de CI CodeQL python pendiente; limpieza de residuos de `docs/` y archivo de frente de abril pendiente.

**NO se hizo:** No se tocó código; no se modificaron documentos canónicos; no se ejecutó limpieza de ramas remotas (solo locales, conforme instrucción del usuario).

## Sesión 2026-08-08 — Centro de Reportes Generales + Selector de Finca

**Objetivo:** Renombrar "Centro de Reportes" → "Centro de Reportes Generales" y agregar selector de finca con filtrado real en los dos reportes filtrables (Stats, Rankings). Opción C extendida del plan autorizado.

**Diagnóstico realizado:**
- Confirmado patrón canónico `window._agroFarms.getFarms()` con guard de seguridad — usado en 8 módulos, fuente única: `agro-farms.js`.
- Confirmado que los 3 exportadores (exportStatsReport, exportOpsRankingsMarkdown, exportAgroGlobalMd) no aceptaban farmId — alcance siempre global.
- `agro_crops` tiene columna `farm_id` — permite post-filtrado sin queries extra.
- `agro_income`, `agro_pending`, `agro_expenses`, `agro_losses` tienen `crop_id` — filtrado por cropIds derivados de la finca.
- Label "Centro de Reportes" en `VIEW_CONFIG` de `agro-shell.js` — único punto de wiring de la navegación.

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---|---|---|
| `agro-shell.js` | Commit 1 | `VIEW_CONFIG.reportes.label`: "Centro de Reportes" → "Centro de Reportes Generales" |
| `agro-reports-center.js` | Commit 1 | `FARMS_LOADED_EVENT`, `GENERAL_FARM_VALUE`, `selectedFarmId` en state; funciones `getAvailableFarms()`, `getSelectedFarmId()`, `getSelectedFarmName()`, `renderFarmSelector()`; selector en `renderOverview()`; listener `change` en `bindRootEvents()`; listener `agro:farms-loaded`; `exportGlobalStats`/`exportRankings` pasan `selectedFarmId`; nota global en descripción de Informe Global Agro |
| `agro-reports-center.css` | Commit 1 | Nuevas clases `.agro-reports-farm-filter`, `.agro-reports-farm-filter__label`, `.agro-reports-farm-filter__select` — solo tokens ADN V12, sin hex hardcodeados |
| `agro-stats-report.js` | Commit 2 | `exportStatsReport(farmId='')`: resolución de nombre de finca vía `window._agroFarms`, post-filtrado de crops/income/expenses/pending/losses por `farm_id` del crop, alcance en header del MD, slug de finca en nombre de archivo |
| `agro.js` | Commit 3 | `exportOpsRankingsMarkdown(farmId='')`: resolución de finca vía `window._agroFarms`, fetch quirúrgico de `agro_crops` por `farm_id` para construir `scopedCropIds`, post-filtrado de income/pending, alcance en header del MD, slug en nombre de archivo |

**Restricciones respetadas:**
- `exportAgroGlobalMd` queda global siempre (nota visible en UI y en MD).
- No se tocó `state.datasets`.
- No se tocaron `agro-facturero-clientes-export.js` ni los factureros operativos.
- No se crearon clases CSS fuera de tokens ADN V12.
- No se modificó el hash `#view=reportes` ni los aliases de navegación.
- Hash `#view=reportes` preservado; el renombrado es solo del label visible.
- Edición al monolito `agro.js` quirúrgica: solo la función `exportOpsRankingsMarkdown` (~60 líneas de adición de lógica de scope, sin tocar el resto del monolito).

**Resultado de build:** ✅ 3 builds consecutivos exitosos — `pnpm build:gold` sin errores ni warnings nuevos. 187 módulos transformados.

**QA sugerido (Yerikson en producción yavlgold.com):**
1. Navegar a Centro de Reportes → verificar label "Centro de Reportes Generales" en la vista y en la navegación del hub.
2. Verificar que aparece el selector "Finca" con "Vista general" preseleccionado.
3. Verificar que si solo hay una finca cargada, el selector muestra esa finca como opción adicional.
4. Exportar "Informe estadístico global" con "Vista general" → debe ser idéntico al comportamiento anterior.
5. Exportar con "Los Higuerones" → MD debe mostrar `Alcance: Finca — Los Higuerones` y solo los cultivos de esa finca.
6. Exportar con "finca la ladera" → mismo comportamiento.
7. Repetir pasos 4-6 con "Rankings de clientes".
8. Exportar "Informe Global Agro" con cualquier finca → debe exportar igual (global siempre) y mostrar nota en la descripción de la card.
9. Verificar en mobile (≤480px) que el selector se ve correctamente.

**NO se hizo:** push a git (pendiente QA confirmado en producción por Yerikson).

### Fix bugs post-QA (2026-08-08 — misma sesión)

QA en producción detectó dos filtros rotos. Diagnóstico y fix quirúrgico:

**Bug 1 — Stats devolvía vacío por finca**
Causa raíz: `fetchCrops()` en `agro-stats-report.js` no incluía `farm_id` en el `select` de `agro_crops`. El post-filtro `allCrops.filter(c => c.farm_id === activeFarmId)` siempre retornaba `[]` porque `c.farm_id` era `undefined` en todos los intentos.
Fix: Agregar `farm_id` al attempt primario del select (con fallback al attempt anterior sin `farm_id` si la columna no existe en el schema — patrón defensivo H10 ya usado en `agro-crop-report.js`).

**Bug 2 — Top Cultivos de Rankings no filtraba**
Causa raíz: `exportOpsRankingsMarkdown` llamaba `fetchOpsRankingsData({ cropId: null })` que internamente usa `opsRankingsState.selectedFarmId` (filtro de la UI del panel Rankings) — ignorando el `farmId` recibido como parámetro. `fetchOpsTopCropsCanonical` ya acepta y aplica `farmId` correctamente; el bug era que no se le pasaba.
Fix: Reemplazar la llamada a `fetchOpsRankingsData` por llamada directa a `fetchOpsTopCropsCanonical` con `farmId: activeFarmId || null`. Una sola línea de diferencia real.

| Archivo | Cambio |
|---|---|
| `agro-stats-report.js` | Agrega `farm_id` al attempt primario de `fetchCrops()` con fallback defensivo |
| `agro.js` | `exportOpsRankingsMarkdown`: reemplaza `fetchOpsRankingsData()` por `fetchOpsTopCropsCanonical()` directo con `farmId` correcto |

**Resultado de build:** ✅ Limpio — 187 módulos, sin errores.

**Números esperados en re-QA:**

| Métrica | Los higuerones | finca la ladera | Prueba aditividad |
|---|---|---|---|
| Cultivos activos (Stats) | 1 | 1 | — |
| Cultivos en tabla | 4 (sin Caraota negra) | 1 (solo Caraota negra) | — |
| Total pagados | $2,742.35 | $0.00 | — |
| Total costos | $734.70 | $30.54 | — |
| Ganancia neta | $2,007.65 | −$30.54 | 1,977.11 = global ✓ |
| Top Cultivos Rankings (higuerones) | 4 cultivos sin Caraota negra | — | — |
| Top Cultivos Rankings (ladera) | — | 1: solo Caraota negra | — |

**NO se hizo:** push — pendiente re-QA de Yerikson en producción.

### Cierre de QA y deuda documentada (2026-08-08)

**Resultado del re-QA completo (9 exports + 3 perfiles):**

| Alcance | Stats cultivos | Stats totales | Rankings clientes | Rankings cultivos | Aditividad |
|---|---|---|---|---|---|
| Vista general | ✅ 5 cultivos | ✅ 2,742.35 / 765.24 / 1,977.11 | ✅ 30 clientes | ✅ 5 cultivos | — |
| Los Higuerones | ✅ 4 cultivos | ✅ 2,742.35 / 734.70 / 2,007.65 | ✅ 30 clientes $2,742.35 | ✅ 4 cultivos (sin Caraota negra) | 2,007.65 |
| finca la ladera | ✅ 1 cultivo (Caraota negra) | ✅ $0 pagados / $30.54 costos / −$30.54 | ✅ Sin clientes | ✅ 1 cultivo (solo Caraota negra) | −30.54 |
| **Prueba aditividad** | — | — | — | — | **2,007.65 − 30.54 = 1,977.11 ✅** |

**Nota perfil global en UI:** Confirmada — aparece en la card del Centro como `<p class="agro-report-card__copy">` visible antes de exportar. No aparece en el archivo exportado porque es intencional por diseño (el archivo es responsabilidad de `agroperfil.js`, fuera del alcance de este plan).

**Deuda preexistente documentada — $47.22 en ranking global:**
- Causa raíz: en el ranking de clientes de la vista global, `buildBuyerRanking` procesa todos los `incomeRows` incluyendo movimientos con `crop_id = null` o cultivo sin finca asignada. Esos movimientos tienen nombre de cliente resuelto (Wilmer Chapeton, Orlando Pineda) por `resolveBuyerName`, pero no pertenecen a ningún cultivo concreto. Aparecen sumados al cliente en el ranking, pero el "Total pagados" del Resumen Global también los incluye (vía `unassigned.incomeCents` en `buildPerCropTable`). No hay doble conteo — los $47.22 están en el total — pero la tabla de clientes los acumula a un cliente mientras "Sin cultivo asociado" no los muestra como ingresos, creando una inconsistencia aparente.
- Este comportamiento es preexistente al selector de finca. El selector lo hace visible al comparar global vs filtrado lado a lado.
- El filtrado por finca excluye estos movimientos limpiamente (correcto — no tienen `crop_id` en ninguna finca).
- Magnitud exacta: $47.22 (Wilmer Chapeton: $33.52 extra en global; Orlando Pineda: $13.70 extra en global).
- No bloquea el verde del frente. Se documenta como deuda acotada para sesión futura si se decide corregir.

**Estado del frente: 🟢 VERDE** — Centro de Reportes Generales + Selector de Finca operativo y validado en producción.
**Pendiente antes de push:** autorización explícita de Yerikson.

---

## Sesión 2026-08-08 — Fix: cultivos eliminados en reportes globales

**Agente:** Kiro
**Objetivo:** Corregir bug crítico — ventas de cultivos eliminados (deleted_at IS NOT NULL en agro_crops) aparecían en el Ranking de Clientes global y en Estadísticas Global, generando una discrepancia de $47.22 USD.

### Diagnóstico

Causa raíz confirmada con evidencia directa en código (sin suposiciones):

- `fetchCrops()` en `agro-stats-report.js` ya filtra `deleted_at IS NULL` → `allCrops` nunca incluye el Pepino eliminado.
- `fetchIncome()` trae todas las ventas no eliminadas de `agro_income` → incluye ventas cuyo `crop_id` apunta a cultivos ya eliminados (las *ventas* no están eliminadas, solo el *cultivo*).
- En el path **por finca** (`activeFarmId` presente): `scopedCropIds` se construye desde cultivos activos de esa finca → el filtro por coincidencia excluía el Pepino. Correcto.
- En el path **global** (`activeFarmId` vacío): `incomeRows = allIncomeRows` sin ningún cruce → las ventas del Pepino (crop_id eliminado) pasaban directamente a `buildBuyerRanking`. Bug confirmado.
- Mismo patrón en `exportOpsRankingsMarkdown` (agro.js).
- La regla `validCropIds` del MANIFIESTO_AGRO.md §1378-1392 ya exigía este filtro y no estaba implementada en el path global de ninguna de las dos funciones.

### Archivos modificados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-stats-report.js` | fix | Se agregó bloque `else` al `if (activeFarmId)` — en path global, construir `validCropIds` desde `allCrops` (ya filtrado con `deleted_at IS NULL`) y post-filtrar `incomeRows`, `expenseRows`, `pendingRows`, `lossesRows` contra ese Set. Rows sin `crop_id` (no asignados) pasan. |
| `apps/gold/agro/agro.js` | fix | Mismo patrón en `exportOpsRankingsMarkdown` — bloque `else` que hace un query adicional a `agro_crops` con `.is('deleted_at', null)` para construir `validCropIds` global y filtrar `incomeRows` y `pendingRowsRaw`. |

### Resultado de build

```
agent-guard: OK
agent-report-check: OK
vite build ✓ (187 modules, 3.64s)
check-llms: OK
UTF-8: ✓
Exit Code: 0
```

### QA requerido

Yerikson debe verificar en producción (yavlgold.com):
1. Exportar Estadísticas Global (sin filtro de finca) — confirmar que la discrepancia de $47.22 ya no existe en el Ranking de Clientes (Wilmer Chapeton y Orlando Pineda deben bajar ese monto).
2. Exportar Rankings Global — confirmar mismo resultado limpio.
3. Exportar ambos con filtro por finca — confirmar que los resultados filtrados no cambiaron.
4. Aditividad: Higuerones + La Ladera debe seguir igual a Global (ahora correctamente sin el Pepino en ninguno).

### No se hizo

- No se tocó `agro_income`, `agro_crops` ni ninguna tabla en Supabase.
- No se tocó `agro-facturero-clientes-export.js` ni factureros operativos.
- No se tocó `state.datasets`.
- No se crearon clases CSS nuevas.
- No se actualizaron MANIFIESTO_AGRO.md ni FICHA_TECNICA.md — pendiente de QA verde confirmado por Yerikson.

---

## Sesión 2026-08-08 — Cierre documental: Centro de Reportes Generales + selector de finca

**Objetivo:** Cierre documental del frente "Centro de Reportes Generales": actualizar manifiesto, ficha técnica, crónica y reporte operativo para reflejar el selector de finca y la corrección del bug de cultivos eliminados en reportes globales.

**Alcance:** SOLO documentación. No se tocó código de producto.

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/chronicles/CRONICA-YAVLGOLD-2026-ACTIVA.md` | edit | Agregado ADDENDUM Agosto 2026 con resumen del frente |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | edit | Esta entrada de cierre documental |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | edit | §4.9: agregado párrafo sobre selector de finca (comportamiento "Todas las fincas", filtrado Stats/Rankings, Perfil Global global con nota) |
| `apps/gold/docs/FICHA_TECNICA.md` | edit | Actualizada descripción funcional del Centro de Reportes para incluir selector de finca |

**Restricciones respetadas:**
- No se modificó el nombre "Centro de Reportes" → "Centro de Reportes Generales" en `MANIFIESTO_AGRO.md` porque Yerikson aún no confirmó visualmente el renombrado en producción.
- No se tocó código `.js` ni `.css`.
- No se ejecutó push ni commit a GitHub.
- No se marcó el frente como cerrado/verde sin la confirmación visual pendiente.

**Pendiente:** Confirmación visual de Yerikson del label "Centro de Reportes Generales" en producción. Una vez confirmada, completar renombrado en `MANIFIESTO_AGRO.md`, `docs-agro.html` y `llms.txt`.

**NO se hizo:** No se tocó código del producto; no se ejecutó push/commit; no se marcó nada como verde sin confirmación visual.

---

## Sesión 2026-08-08 — Auditoría de consistencia documental

**Agente:** Kiro
**Objetivo:** Auditoría cruzada de AGENTS.md, FICHA_TECNICA.md y MANIFIESTO_AGRO.md. Corrección de inconsistencias confirmadas por Yerikson contra el repo real.

### Diagnóstico previo a correcciones

Se generó un reporte de 10 hallazgos. Yerikson lo verificó línea por línea contra el repo real y confirmó:

- **Hallazgo 4 cancelado:** `dashboard.js` sí existe (904 líneas), está activo e importado en `index.html`. La referencia en FICHA_TECNICA.md §11 estaba correcta — no se tocó.
- **Hallazgo 8 corregido:** la tabla que escribe `log_event` es `agro_events`, no `agro_crop_events` (0 coincidencias en el repo). El reporte original tenía el nombre equivocado.
- Todo lo demás del reporte fue confirmado exacto.

### Archivos modificados

| Archivo | Sección | Cambio |
|---|---|---|
| `AGENTS.md` | `§3.2 — Módulos Agro existentes` | Listado actualizado de 9 entradas a 51 módulos reales con descripción de cada uno |
| `FICHA_TECNICA.md` | `§2 — APIs Externas` | Agregada Google Gemini API (`gemini-2.5-flash-lite` primario, `gemini-3-flash` fallback) |
| `FICHA_TECNICA.md` | `§4.2 — LocalStorage Keys` | Agregadas 5 claves `YG_AGRO_ASSISTANT_*` del Asistente IA |
| `FICHA_TECNICA.md` | `§5 — Usuarios y Perfiles` | Agregadas `agro_farmer_profile` y `user_onboarding_context` |
| `FICHA_TECNICA.md` | `§5 — Agro — Cultivos` | Agregada tabla `agro_events` (eventos agrícolas, escritura vía `log_event`) |
| `FICHA_TECNICA.md` | `§5 — Agro — Facturero` | Corregido typo `agro_incomes` → `agro_income` |
| `FICHA_TECNICA.md` | `§11 — Referencias Internas` | Agregada referencia a `supabase/functions/agro-assistant/index.ts` |

### Resultado de build

```
agent-guard: OK
agent-report-check: OK
vite build ✓ (187 modules, 4.04s)
check-llms: OK
UTF-8: ✓
Exit Code: 0
```

### No se hizo

- No se tocó MANIFIESTO_AGRO.md (no tenía inconsistencias que le correspondan — su rol es semántico y está correctamente separado de la implementación técnica).
- No se modificó la referencia a `dashboard.js` en FICHA_TECNICA.md §11 (Yerikson confirmó que está correcta).
- No se tocó ningún archivo de código.

---

## Sesión 2026-08-16 — UX: Días en proyecto + Ticker cotizaciones + Canal WhatsApp + Espaciado botones header

**Agente:** Kiro
**Objetivo:** Cinco mejoras de experiencia de usuario. QA green confirmado por Yerikson. Cambios commiteados y pusheados a main.

### Diagnóstico
- `user.created_at` disponible en `supabase.auth.getSession()` (ambos dashboards). Ninguno lo leía.
- `agro-market.js` ya tenía ticker completo (BTC, COP, VES) con `initMarketIntelligence()`, pero no se montaba en Dashboard Agro: faltaba el elemento `#market-ticker-track` en el HTML del bloque v11 y la llamada de init.
- `official-socials__actions` en landing con 3 botones (X, YouTube, LinkedIn). Canal WhatsApp ausente.
- Botones "Iniciar Sesión" / "Registrarse" en header de landing visualmente pegados: gap heredado de `.header-actions` era `var(--space-3)` (12px). El div `#auth-buttons` no tenía gap propio.

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/index.html` | HTML | Nuevo botón WhatsApp Canal en `official-socials__actions` (patrón visual idéntico a los existentes, icono `fa-brands fa-whatsapp`) |
| `apps/gold/dashboard/index.html` | HTML | Nueva stat card `#stat-member-days` "Días contigo" en `stats-section` |
| `apps/gold/dashboard/index.html` | JS | Cálculo de días con `session.user.created_at` en `initDashboard()` — sin query extra |
| `apps/gold/agro/index.html` | HTML | Bloque `.ygd-ticker-bar` con `#market-ticker-track` antes del BLOQUE 0; `#ygd-greeting-days` bajo el título de saludo |
| `apps/gold/agro/agro-dashboard-v11.css` | CSS | Estilos `.ygd-ticker-bar`, `.ygd-ticker-track`, `.ygd-header-days`; `prefers-reduced-motion` respetado |
| `apps/gold/agro/agro-dashboard-v11.js` | JS | Import de `initMarketIntelligence`; llamada en `initDashboardV11()`; PASO 4 en `renderGreeting()` para días ("Tu primer día" vs "X días") |
| `apps/gold/assets/css/landing-v10.css` | CSS | `#auth-buttons { gap: var(--space-5) }` — 20px entre botones de auth en desktop; no afecta mobile (ya ocultos por regla preexistente) |

### Resultado de build
`pnpm build:gold` — ✅ verde, 0 errores, 0 warnings de código. Confirmado en todas las mejoras.

### QA — estado: 🟢 VERDE (confirmado por Yerikson)
- ✅ Landing: botón WhatsApp visible y funcional en sección de redes sociales.
- ✅ Dashboard principal: card "Días contigo" muestra número correcto según fecha de registro.
- ✅ Dashboard Agro: cinta animada de cotizaciones COP/VES/BTC en parte superior del dashboard.
- ✅ Dashboard Agro: subtexto de días bajo el saludo.
- ✅ Landing header: botones "Iniciar Sesión" y "Registrarse" con espaciado correcto en desktop, mobile no afectado.

### NO se hizo
- No se tocó `agro.js` ni módulos fuera del scope.
- No se modificaron contratos de DB, migraciones ni RLS.
- No se alteró el comportamiento mobile de ningún componente.

---

## Sesión 2026-08-18 — Fix bug identidad duplicada en renombrado de cliente (Facturero de Clientes)

**Objetivo:** Corregir tres bugs relacionados con la propagación incompleta del rename de un cliente en el Facturero de Clientes Agro.

### Diagnóstico confirmado

Causa raíz única: cuando un cliente era renombrado (ej. "Carlos" → "José"), los movimientos legacy (con `buyer_id = NULL`, identificados solo por `buyer_group_key`) no se actualizaban correctamente. Esto generaba tres síntomas:

| # | Síntoma | Causa específica |
|---|---------|-----------------|
| 1 | Cliente desaparece del cultivo tras rename | `previousGroupKey` vacío causaba que `updateMovementLinks` saltara la rama de movimientos legacy |
| 2 | Nombre viejo sin datos + nombre nuevo con datos en "Sin registro" | El RPC generaba fila fantasma con `group_key` viejo (movimientos sin actualizar), que no hacía match en `mergeSummaryRowsWithBuyerDirectory` → dos entradas separadas |
| 3 | Transferencia fiado→pagado se pierde tras rename | `executeCompensationRevertToPending` no propagaba `buyer_id` del `sourceRow` al nuevo `pendingPayload` → `enrichBuyerIdentityPayload` re-derivaba identidad desde el concepto con el nombre viejo → creaba cliente fantasma nuevo |

### Cambios realizados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/agro/agro.js` | Bugfix | `enrichBuyerIdentityPayload`: early return si `payload.buyer_id` ya existe (protección global contra re-derivación de identidad) |
| `apps/gold/agro/agro.js` | Bugfix | `executeCompensationRevertToPending`: propagar `buyer_id` + `buyer_group_key` del `sourceRow` al `pendingPayload` y al `remainderPayload` en splits parciales |
| `apps/gold/agro/agrocompradores.js` | Bugfix | `updateMovementLinks`: fallback defensivo — si `safeOldGroupKey` está vacío, hacer lookup en `agro_buyers` por `buyer_id` antes de abortar la rama legacy |
| `apps/gold/agro/agro-facturero-clientes-view.js` | Bugfix | `mergeSummaryRowsWithBuyerDirectory`: paso de limpieza post-merge que filtra filas del RPC sin `buyer_id` cuyo `group_key` no tenga contraparte en el directorio activo (elimina fantasmas) |

### Resultado del build

```
agent-guard: OK
agent-report-check: OK
vite build: ✓ built in 2.89s — sin errores
check-dist-utf8: ✓ passed
```

### QA sugerido

1. Crear cliente "Carlos" con un fiado bajo un cultivo activo
2. Transferir el fiado a pagado
3. Renombrar "Carlos" → "José"
4. Verificar que "José" aparece bajo el cultivo con sus datos reales
5. Verificar que "Carlos" NO aparece como entrada separada en ninguna categoría
6. Transferir el pagado de "José" de vuelta a fiado
7. Verificar que la transacción queda en "José", no en un fantasma "Carlos"
8. Verificar que no aparece cliente nuevo con nombre viejo en "Sin registro"

### NO se hizo (scope respetado)

- No se ejecutó limpieza automática de datos fantasma existentes en producción (frente separado)
- No se refactorizaron zonas estables
- No se agregaron features nuevas
- No se tocó el monolito más allá de las dos funciones afectadas

---

## Sesión 2026-08-18 (addendum) — Fix residual: nombre viejo en fiado al transferir Pagados → Fiados

**Objetivo:** Corregir que el nuevo fiado creado al revertir un income mostrara el nombre viejo del cliente en título y concepto.

### Causa raíz confirmada

`executeCompensationRevertToPending` construía el nuevo `pendingPayload` copiando `concepto` y `cliente` directamente del `sourceRow` (income original). Si ese income fue creado antes del rename (concepto = `"Venta a Carlos - ..."`, cliente = `"Carlos"`), el nuevo fiado heredaba el texto stale. La vista de Fiados renderiza el título como `"Fiado a ${row.cliente}"`, así que el nombre viejo era visible directamente en la UI.

### Cambios realizados

| Archivo | Zona | Cambio |
|---------|------|--------|
| `apps/gold/agro/agro.js` | `executeCompensationRevertToPending` | Lookup defensivo a `agro_buyers` por `buyer_id` del sourceRow para resolver el `display_name` actual antes de construir `pendingPayload`. Reemplaza `cliente`, `concepto` y (en splits parciales) el `concepto` del `remainderPayload` con el nombre actualizado |

### Comportamiento post-fix

- El nuevo pending muestra `"Fiado a José"` (nombre actual) aunque el income original diga `"Venta a Carlos"`.
- El concepto del nuevo pending también refleja el nombre actual si contiene el nombre viejo.
- Si el lookup falla (error de red), cae silenciosamente al texto del sourceRow (no rompe el flujo).
- En splits parciales, el remainder income/loss también tiene el concepto actualizado.

### Resultado del build

```
agent-guard: OK — agent-report-check: OK — vite build: ✓ built in 3.49s — UTF-8: ✓
```

### QA sugerido

1. Crear cliente "Carlos", registrar fiado, transferir a pagado (income `"Venta a Carlos - ..."`)
2. Renombrar "Carlos" → "José"
3. Desde Pagados, transferir ese income de vuelta a Fiados
4. Verificar que el nuevo fiado dice `"Fiado a José"` (no `"Fiado a Carlos"`)
5. Verificar que el concepto del nuevo fiado también dice `"José"` si aplica

---

## Sesión 2026-08-18 (análisis exhaustivo) — Fix raíz real: buyer_id no viajaba en ninguna transferencia

**Objetivo:** Resolver por qué el bug de nombre viejo persistía tras los fixes anteriores.

### Diagnóstico profundo

Los fixes anteriores funcionaban sobre `executeCompensationRevertToPending` asumiendo que el `sourceRow` (income) ya tendría `buyer_id`. El bug raíz real estaba más arriba en la cadena: **`buyer_id` nunca viajaba desde el pending al income en la transferencia original Fiado→Pagado** porque los payloads de destino no lo incluían, y las constantes de columnas de select tampoco lo pedían.

#### Causas raíz confirmadas

| Causa | Archivo | Línea |
|-------|---------|-------|
| `AGRO_INCOME_TRANSFER_COLUMNS` sin `buyer_id/buyer_group_key` | `agro.js` | ~196 |
| `AGRO_PENDING_TRANSFER_COLUMNS` sin `buyer_id/buyer_group_key` | `agro.js` | ~195 |
| `AGRO_INCOME_REVERT_COLUMNS` sin `buyer_id/buyer_group_key` | `agro.js` | ~198 |
| `AGRO_LOSS_TRANSFER_COLUMNS` sin `buyer_id/buyer_group_key` | `agro.js` | ~197 |
| `AGRO_LOSS_REVERT_COLUMNS` sin `buyer_id/buyer_group_key` | `agro.js` | ~199 |
| `incomePayload` (Fiado→Pagado) sin `buyer_id` | `agro.js` | ~7688 |
| `lossPayload` (Fiado→Pérdida) sin `buyer_id` | `agro.js` | ~7866 |
| `pendingPayload` en `handleIncomeTransfer` directa sin `buyer_id` | `agro.js` | ~8143 |
| `lossPayload` en `handleIncomeTransfer` directa sin `buyer_id` | `agro.js` | ~8224 |
| `pendingPayload` en `handleLossTransfer` directa sin `buyer_id` | `agro.js` | ~8340 |
| `incomePayload` en `handleLossTransfer→income` sin `buyer_id` | `agro.js` | ~8444 |

#### Por qué el fix anterior no fue suficiente

El lookup en `executeCompensationRevertToPending` buscaba `sourceRow.buyer_id`, pero como el income fue creado sin `buyer_id` (columnas de select incompletas + payload sin el campo), `sourceBuyerId` siempre era vacío y el lookup fallaba silenciosamente.

### Cambios realizados (esta sesión)

| Archivo | Cambio |
|---------|--------|
| `apps/gold/agro/agro.js` | `AGRO_PENDING_TRANSFER_COLUMNS`: agrega `buyer_id,buyer_group_key,buyer_match_status,cliente` |
| `apps/gold/agro/agro.js` | `AGRO_INCOME_TRANSFER_COLUMNS`: agrega `buyer_id,buyer_group_key,buyer_match_status,comprador` |
| `apps/gold/agro/agro.js` | `AGRO_LOSS_TRANSFER_COLUMNS`: agrega `buyer_id,buyer_group_key,buyer_match_status` |
| `apps/gold/agro/agro.js` | `AGRO_INCOME_REVERT_COLUMNS`: agrega `buyer_id,buyer_group_key,buyer_match_status,comprador` |
| `apps/gold/agro/agro.js` | `AGRO_LOSS_REVERT_COLUMNS`: agrega `buyer_id,buyer_group_key,buyer_match_status` |
| `apps/gold/agro/agro.js` | `incomePayload` Fiado→Pagado: propaga `buyer_id` del pending |
| `apps/gold/agro/agro.js` | `lossPayload` Fiado→Pérdida: propaga `buyer_id` del pending |
| `apps/gold/agro/agro.js` | `pendingPayload` `handleIncomeTransfer` directa: propaga `buyer_id` del income |
| `apps/gold/agro/agro.js` | `lossPayload` `handleIncomeTransfer` directa: propaga `buyer_id` del income |
| `apps/gold/agro/agro.js` | `pendingPayload` `handleLossTransfer` directa: propaga `buyer_id` del loss |
| `apps/gold/agro/agro.js` | `incomePayload` `handleLossTransfer→income`: propaga `buyer_id` del loss |

### Resultado del build

```
agent-guard: OK — agent-report-check: OK — vite build: ✓ built in 3.55s — UTF-8: ✓
```

### QA crítico

El escenario que prueba la cadena completa:
1. Crear cliente "Carlos" → registrar fiado (nuevo pending con `buyer_id`)
2. Transferir fiado → pagado (income debe recibir `buyer_id` ← este era el eslabón roto)
3. Renombrar "Carlos" → "José"
4. Transferir pagado → fiado (nuevo pending debe tener `buyer_id` + nombre "José")
5. Verificar que el nuevo fiado dice `"Fiado a José"` y tiene `buyer_id` correcto
6. Verificar que NO aparece "Carlos" como cliente separado en ninguna categoría

Para movimientos legacy (creados antes de este fix) que no tienen `buyer_id` en el income, `updateMovementLinks` del rename debe actualizarlos. Si el income fue creado antes de este fix, ejecutar el rename del cliente desde la ficha para forzar la propagación.

---

## Sesión 2026-08-18 (fix post-rename) — "No se encontró el pagado" + redirige a creación de clientes

**Objetivo:** Corregir dos bugs nuevos causados por un rename de cliente (qa pro → qa pro test) en producción.

### Síntomas reportados

1. Al intentar Transferir/Revertir un cobro desde la vista de detalle → toast "No se encontró el pagado seleccionado"
2. Al dar "Actualizar" en el detalle → redirige a la vista de lista/creación de clientes

### Diagnóstico

**Bug 1 — Toast "No se encontró":**
La columna `comprador` fue introducida por error en `AGRO_INCOME_TRANSFER_COLUMNS` y `AGRO_INCOME_REVERT_COLUMNS` en la sesión anterior. `agro_income` no tiene esa columna. Aunque `selectSingleWithMissingColumnFallback` tiene retry para columnas faltantes, la primera query fallaba con error y en algunos casos el retry no alcanzaba a limpiar el campo antes de que se propagara el error a `fetchRevertSourceRecord`.

**Bug 2 — Redirige a lista:**
`getSelectedBuyerRow()` buscaba el buyer en `getCropScopedRows(summaryRows)`. Con cultivo "caraota roja" seleccionado, `getCropScopedRows` filtra por `visibleCropScopeKeys`. Los movimientos legacy del cliente (creados antes del fix de propagación de buyer_id) aún tienen `buyer_group_key = "qa pro"` (nombre viejo) y no `buyer_id`. El scope key generado era `group:qa pro` pero el del buyer en el RPC era `buyer:X` → no había match → el buyer no estaba en `cropScopedRows` → `getSelectedBuyerRow()` retornaba `null` → `renderBuyerHistoryDetail` con `buyerRow = null` mostraba "Cliente no encontrado" → el usuario clickaba "Volver" → lista → botón "Crear cliente".

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `apps/gold/agro/agro.js` | Quitar `comprador` de `AGRO_INCOME_TRANSFER_COLUMNS` y `AGRO_INCOME_REVERT_COLUMNS` (no existe en `agro_income`) |
| `apps/gold/agro/agro.js` | Exponer `handleRevertIncome`, `handleRevertLoss`, `handleIncomeTransfer`, `handleLossTransfer` en `window._agroFactureroBridge` para uso desde el módulo de Cartera Viva |
| `apps/gold/agro/agro-facturero-clientes-view.js` | `getSelectedBuyerRow()`: fallback a `summaryRows` completo cuando el buyer no está en `cropScopedRows` (scope keys stale por movimientos legacy sin buyer_id) |
| `apps/gold/agro/agro-facturero-clientes-view.js` | `initAgroCarteraVivaView()`: listener de captura que intercepta clicks de `btn-transfer-income`, `btn-revert-income`, `btn-transfer-loss`, `btn-revert-loss` dentro del root del Facturero de Clientes y los delega via bridge |

### Resultado del build

```
agent-guard: OK — agent-report-check: OK — vite build: ✓ built in 3.56s — UTF-8: ✓
```

### QA sugerido

1. Abrir Facturero de Clientes con filtro "caraota roja" seleccionado
2. Buscar cliente "qa pro test" en Pagados
3. Abrir detalle → verificar que carga historial correcto (no "Cliente no encontrado")
4. Dar "Actualizar" → verificar que permanece en el detalle del cliente
5. En el cobro visible, abrir menú → "Revertir" → debe abrir wizard de reversión correctamente
6. Completar la reversión → verificar que el cobro pasa a Fiados con nombre "qa pro test"

## Sesión — 17 de agosto de 2026 — Fix identidad duplicada en renombrado de cliente (Facturero de Clientes)

**Estado del frente:** YELLOW — Mejorado pero no resuelto completamente. Se introdujeron bugs nuevos.

**Condiciones de la sesión:** Trabajo sin electricidad. Día dificultoso. Créditos de agente limitados. Sin agentes adicionales disponibles.

**Objetivo:** Corregir bug donde renombrar cliente (Carlos→José) resucitaba el nombre viejo como fantasma en Sin Registro, y transferencias Pagados→Fiados perdían la transacción hacia el nombre viejo.

**Diagnóstico (causa raíz confirmada):**
- `buyer_id` nunca viajaba en ninguna transferencia: las constantes de columnas de select no pedían esos campos a Supabase
- `enrichBuyerIdentityPayload` re-derivaba identidad desde texto viejo (`cliente`/`concepto`), creando buyers fantasma
- `updateMovementLinks` no propagaba correctamente a movimientos legacy (sin `buyer_id`)
- `comprador` fue agregado por error a constantes de `agro_income` (esa columna no existe en esa tabla)

**Cambios realizados:**

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/agro/agro.js` | Fix | Propagación de `buyer_id` en 6 rutas de transferencia + lookup de `display_name` + eliminación de `comprador` de columnas |
| `apps/gold/agro/agrocompradores.js` | Fix | Lookup defensivo en `updateMovementLinks` cuando `previousGroupKey` vacío |
| `apps/gold/agro/agro-facturero-clientes-view.js` | Fix | Fallback en `getSelectedBuyerRow` + limpieza post-merge de filas fantasma + listener de captura en botones de transferencia |

**Resultado de build:** `pnpm build:gold` OK (agent-guard, agent-report-check, vite, check-dist-utf8)

**QA:** Pendiente. Local bloqueado. Solo se puede ejecutar post-deploy en producción.

**Bugs nuevos introducidos (sin resolver):**
1. `agro-dashboard-v11`: `user is not defined` (ReferenceError, línea 15)
2. `200.js`: `Cannot read properties of undefined (reading 'M_ID')` — loop repetitivo, probable ticker de agro-market
3. Limpieza de datos legacy: fantasmas existentes en producción no se limpian automáticamente

**Deuda técnica viva:**
- Los clientes ya contaminados antes del fix necesitan reconciliación de datos (SELECT diagnóstico → UPDATE controlado)
- El mecanismo `selectSingleWithMissingColumnFallback` no detecta confiablemente columnas faltantes en todos los formatos de error de PostgREST
- Se necesita una skill documentando la confusión de campos who por tabla (`cliente` en `agro_pending`, `comprador` NO existe en `agro_income`)

**Próximo paso:**
1. Ejecutar QA post-deploy en producción (escenario de rename + transferencia)
2. Diagnosticar y corregir `user is not defined` en agro-dashboard-v11
3. Diagnosticar y corregir `M_ID` en 200.js (loop de agro-market)
4. Planificar reconciliación de datos legacy (SELECT primero, sin escribir)

---

## Sesión 2026-08-20 — identidad canónica en transferencias y limpieza QA

**Objetivo:** Evitar que una transferencia de Facturero de Clientes mueva la cartera de un cliente canónico a “Sin registro”, y retirar los datos QA solicitados.

### Diagnóstico

La ruta Fiados → Pagados podía resolver correctamente el `buyer_id` de un fiado legado mediante `buyer_group_key`, pero ese identificador no se incorporaba al payload destino. Las demás rutas dependían del `buyer_id` ya presente. Cuando el origen era legado, el destino quedaba sin vínculo canónico y el resumen lo clasificaba como “Sin registro”.

### Cambios realizados

| Archivo | Cambio |
| --- | --- |
| `apps/gold/agro/agro.js` | Se añadió `resolveTransferBuyerIdentity`, que conserva la identidad existente o la recupera por `buyer_group_key` para el mismo usuario. |
| `apps/gold/agro/agro.js` | Las seis rutas directas de transferencia reutilizan ese vínculo: Fiados → Pagados/Pérdidas, Pagados → Fiados/Pérdidas y Pérdidas → Fiados/Pagados. |

### Limpieza QA en producción

- Se eliminaron los clientes canónicos `qa pro max` y `qa pro plus`.
- Se aplicó borrado lógico a sus movimientos relacionados: 2 fiados y 1 pagado; no había pérdidas ni hilos sociales asociados.
- Consulta de comprobación posterior: 0 clientes QA restantes y 0 movimientos activos para esos grupos.

### Verificación

`pnpm build:gold` aprobado: agent guard, validación del reporte activo, Vite, check-llms y UTF-8 pasaron correctamente. Solo permanece el warning ya conocido de tamaño del bundle.

### QA manual sugerido

1. En un cliente canónico con un fiado legado, transferir solo un registro a Pagados y confirmar que el cliente no aparece en “Sin registro”.
2. Repetir Pagados → Fiados y una ruta hacia Pérdidas; verificar que el destino conserva el mismo cliente canónico y que los demás registros no cambian de categoría.

---

## Sesión 2026-08-21

**Objetivo:** Corregir bug donde al renombrar un cliente en el Facturero de Clientes, los movimientos históricos (fiados) seguían mostrando el nombre antiguo.

**Diagnóstico:**
- El cliente canónico en `agro_buyers` se actualizaba correctamente (`display_name`, `group_key`).
- `updateMovementLinks` actualizaba `buyer_group_key` y `buyer_id` en las tablas de movimientos, pero **no** los campos de texto denormalizados.
- Campo `cliente` en `agro_pending`: almacena el display name textual al momento de crear el fiado → no se actualizaba.
- Campo `concepto` en `agro_pending`: almacena texto `"[base] - Cliente: [nombre]"` → no se actualizaba.
- El título `"Fiado a qa test 1234"` y el concepto `"fiado - Cliente: qa test 1234"` provenían de esos campos sin actualizar.

**Archivos modificados:**

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/agro/agrocompradores.js` | fix | `updateMovementLinks` extendida para recibir `oldDisplayName` / `newDisplayName` y actualizar `cliente` + `concepto` en `agro_pending` al renombrar |
| `apps/gold/agro/agrocompradores.js` | fix | `handleBuyerSave` captura `previousDisplayName = state.currentDisplayName` antes de guardar y lo pasa a `updateMovementLinks` |

**Detalles del fix:**
1. Se agrega `const previousDisplayName = state.currentDisplayName` en `handleBuyerSave` antes del upsert.
2. Se pasan `oldDisplayName` y `newDisplayName` como 5to y 6to parámetro a `updateMovementLinks`.
3. Al final de `updateMovementLinks`, si los display names difieren, se ejecuta:
   - Update directo de `cliente` en `agro_pending` donde `buyer_id` y `cliente = oldDisplay`.
   - Fetch de filas donde `concepto ILIKE %oldDisplay%` → replace string en JS → update por id.
4. Bloque try/catch no-blocking para que un fallo en el text-sync no rompa el rename principal.

**Resultado de build:** `pnpm build:gold` → ✅ sin errores.

**QA sugerido:**
- Renombrar un cliente existente con fiados históricos → verificar que el detalle del cliente muestra el nuevo nombre en título ("Fiado a [nuevo nombre]") y concepto ("... - Cliente: [nuevo nombre]").
- Crear un nuevo fiado → renombrar cliente → verificar que el nuevo fiado también refleja el nombre actualizado.
- Renombrar cliente sin cambiar el nombre (guardar igual) → verificar que no se hacen updates innecesarios.

**No se hizo:** no se modificaron `agro_income` ni `agro_losses` para text-sync (esos campos no tienen un `cliente` equivalente con el mismo patrón; solo `agro_pending` tiene el campo `cliente` + concepto con `- Cliente: [nombre]`).

---

## Sesión 2026-08-22 — Análisis post-fix rename + deuda estructural

**Revisión por:** usuario (análisis manual post-sesión 2026-08-21)

### Brecha 1 confirmada — Backfill pendiente de autorización

El fix del 21-ago previene divergencia **futura** pero no repara la existente. Las filas con "qa test 1234" tienen `buyer_id` correcto pero `cliente` y `concepto` congelados. El filtro `cliente = nombreAntiguo` no matchea porque `nombreAntiguo` capturado hoy es "qa test 1", no "qa test 1234".

**Acción requerida:** backfill puntual por `buyer_id` (no por nombre) que alinee `cliente` y `concepto` al `display_name` canónico actual. Requiere autorización expresa del usuario antes de ejecutarse — toca datos reales en producción.

### Brecha 2 — Deuda estructural registrada

La dualidad identidad canónica (`buyer_id`) vs campos de texto denormalizados (`cliente`, `concepto`) es la causa raíz estructural. Mientras la UI lea esos campos crudos en vez de resolver `display_name` desde `buyer_id` en lectura, cualquier superficie que consuma `concepto` crudo puede mostrar nombres congelados.

**Patrón recurrente:** 9-ago fue transferencias (texto congelado vs identidad canónica), 21-ago fue renombres. La cura estructural es resolver la identidad en lectura, no propagar en escritura.

**Deuda registrada:** resolver `display_name` desde `buyer_id` en `buildPendingLedgerRow()` y superficies equivalentes — candidato a sprint futuro, no urgencia hoy.

### Cobertura de tablas — Verificación pendiente

El fix cubre `agro_pending`. Verificar si `agro_income` y `agro_losses` embeben el nombre en `concepto` con el mismo patrón y necesitan propagación equivalente.

### Gobernanza QA

Cliente "qa test 1" / "qa test 1234" es data de prueba en cuenta real. Limpiar al cerrar este bloque de QA según §5 de `AGENTS.md`.

### Skill potencial

Este patrón tiene dos evidencias reales (9-ago transferencias, 21-ago renombres) y la forma reutilizable que §14 requiere. Candidato a `SKILLS/2026-08-22-DUALIDAD-CANONICO-DENORMALIZADO.md` — pendiente de autorización del usuario.

---

## Sesión 2026-08-22 — Fix BUG1 (Sin registro) + BUG2 (transferencia parcial)

**Objetivo:** Dos bugs en Facturero de Clientes. Diagnóstico obligatorio antes de editar (§8.2).

---

### BUG 1 — Tab "Sin registro" sigue mostrando nombre antiguo tras rename

**Diagnóstico:**
- `openBuyerProfileInternal` (`agrocompradores.js` línea 1569) carga `state.currentGroupKey` desde `agro_buyers.group_key` — el nombre **ya actualizado**.
- En `handleBuyerSave`, `previousGroupKey = state.currentGroupKey` captura el key actual, no el original.
- `updateMovementLinks` recibe `oldGroupKey = "qa test 1"` (actual) y busca filas legacy con `.eq('buyer_group_key', 'qa test 1')`. Las filas congeladas del primer rename tienen `buyer_group_key = 'qa test 1234'` — nunca matcheadas.
- El RPC devuelve esas filas fantasma que `mergeSummaryRowsWithBuyerDirectory` no puede fusionar con el buyer actual (keys distintos) y pasan el ghost-cleanup porque tienen totales > 0.

**Causa raíz exacta:** `agrocompradores.js` → `updateMovementLinks` → la pasada `linkedResult` (Pass 1) ya tenía el filtro `.eq('buyer_id', safeBuyerId)` pero **solo actualizaba `buyer_group_key` de las filas ya vinculadas** — no tocaba filas con stale group_key de renombres anteriores. La pasada legacy no alcanzaba el key `"qa test 1234"` porque `safeOldGroupKey` era `"qa test 1"`.

**Fix:** `agrocompradores.js` → `updateMovementLinks`.
- Pass 1 reescrito: elimina el filtro por `buyer_group_key` — actualiza **todas** las filas con `buyer_id = safeBuyerId` al nuevo `safeNextGroupKey`, sin importar qué key stale tengan. Esto cierra el loop para cualquier rename previo que haya quedado incompleto.
- Pass 2 (legacy, sin `buyer_id`) sin cambios estructurales.

---

### BUG 2 — Transferencia fiado→pagado con monto total mueve solo N unidades y deja residuo

**Diagnóstico:**
- `agro.js` → `computePendingSplitDraft` → cuando el usuario pone monto total en `transferTotal` pero `qtyTransfer < qtyTotal` (ej: qty=1 de total=10), `qtyLeft = 9 > 0` → `isPartial = true`.
- El pending se actualiza con `monto = remainingAmount = 0` (correcto: sourceAmount - sourceAmount = 0) **pero** `unit_qty = 9` y `transfer_state` no se marca como `'transferred'` — queda visible en Fiados con 9 unidades y USD 0.
- `isMonetaryComplete` nunca se evaluaba: la lógica veía `qtyLeft > 0` y declaraba parcial sin verificar si el dinero estaba agotado.

**Causa raíz exacta:** `agro.js` → `computePendingSplitDraft` → `return` final: `isPartial: qtyLeft > 0` — sin blindaje para el caso "monto agotado pero unidades restantes".

**Fix:** `agro.js` → `computePendingSplitDraft`.
- Después de calcular `remainingAmount`, se evalúa `isMonetaryComplete = transferAmount >= sourceAmount - 1e-9`.
- Si `isMonetaryComplete`, se fuerzan `effectiveQtyLeft = 0`, `effectiveRemainingAmount = 0`, `remainingKgQty = 0`.
- El `return` usa `effectiveQtyLeft` e `isPartial: effectiveQtyLeft > 0` → `false` → el pending recibe `transfer_state: 'transferred'` y desaparece de Fiados correctamente.
- Conserva: `monto_cobro + monto_fiado_restante == monto_fiado_original` ✓, `unit_qty` del income = `qtyTransfer` ✓.

---

**Archivos modificados:**

| Archivo | Función | Cambio |
|---------|---------|--------|
| `apps/gold/agro/agrocompradores.js` | `updateMovementLinks` | Pass 1 elimina filtro por `buyer_group_key` — cubre stale keys de renombres anteriores |
| `apps/gold/agro/agro.js` | `computePendingSplitDraft` | `isMonetaryComplete` fuerza `isPartial = false` cuando monto agotado |

**Resultado de build:** `pnpm build:gold` → ✅ sin errores.

**No se hizo:** no se tocó nada fuera del alcance; no se crearon clases CSS; no se añadió try/catch a la transferencia (falla atómica por diseño).

---

## Sesión 2026-08-22 — Fix BUG3: modal transferencia label "(DE 1 KG)" y clamp incorrecto

**Objetivo:** El modal "Transferir a Pagados" muestra "(DE 1 KG)" cuando el fiado tiene 10 kg, pre-rellena el qty input con 1, y el clamp impide escribir 10.

### Diagnóstico §8.2

**H2 descartada:** el campo `CANTIDAD TOTAL FIADA` muestra el valor correcto desde DB (`qtyTotalInitial` lee `configuredQtyTotal = splitOptions.qtyTotal`). El dato en DB está bien.

**Causa raíz — dos fuentes de verdad en conflicto:**

`agro.js` → `buildTransferMetaModal` → bloque del `qtyInput` (antes del fix, línea ~7148):

```js
// Fuente 1: effectiveQtyTotal = configuredQtyTotal = splitOptions.qtyTotal
//           → valor estático resuelto ANTES de que el usuario toque el modal
qtyInput.max = String(roundNumeric(effectiveQtyTotal, 2));  // fija max en HTML inicial
qtyLabel.textContent = `... (de ${formatSplitQuantity(effectiveQtyTotal, ...)})`;  // label estático
```

```js
// Fuente 2: resolveQtyTotalDraft() en updateSplitPreview
//           → lee qtyTotalInput.value (campo editable) en tiempo de ejecución
const { qtyTotalRaw } = resolveQtyTotalDraft();  // valor dinámico, solo corre tras interacción
```

Cuando `forceQtyTotalInput = true` (siempre en transferencia a Pagados), el campo `qty-total` es editable. El usuario puede teclear el total real. Pero el `qtyInput.max` y el label ya fueron fijados con `effectiveQtyTotal` (la fuente estática) al construir el HTML. Si `effectiveQtyTotal = 1` (porque `pending.unit_qty = 1` aunque `quantity_kg = 10`), el label muestra "(DE 1 KG)" y el navegador clampea cualquier valor > 1 en el `qtyInput` al máximo permitido = 1.

`updateSplitPreview` actualizaría el `qtyInput.max` correctamente al dispararse — pero solo se dispara por eventos `input`/`blur` del `qtyTotalInput`. Hasta que el usuario toca ese campo, el clamp estático de `1` bloquea la edición del qty input.

**Archivo / función / línea:**
- `agro.js` → `buildTransferMetaModal` → `qtyInput.max = String(roundNumeric(effectiveQtyTotal, 2))` (antes del fix ~línea 7157)
- `agro.js` → `buildTransferMetaModal` → label con `formatSplitQuantity(effectiveQtyTotal, ...)` (antes del fix ~línea 7138)

### Fix

`agro.js` → `buildTransferMetaModal` — introducida variable `qtyTotalIsEditable`:

- Si `qtyTotalIsEditable = forceQtyTotalInput || needsQtyTotalInput` → **no se fija `qtyInput.max`** en la construcción del HTML ni se escribe el label con el valor estático.
- El `qtyInput.value` se pre-rellena con `defaultQty` (o `effectiveQtyTotal` como fallback) **sin clamp de max** — permite al usuario escribir el valor real.
- El label se inicializa sin total ("Cantidad a transferir") — `updateSplitPreview` lo actualiza correctamente en cuanto lee el `qtyTotalInput`.
- Si `qtyTotalIsEditable = false` (total fijo, no editable): comportamiento anterior sin cambios.
- `isMonetaryComplete` y lógica de montos no tocadas.

**Archivos modificados:**

| Archivo | Función | Cambio |
|---------|---------|--------|
| `apps/gold/agro/agro.js` | `buildTransferMetaModal` | `qtyInput.max` y label no se fijan con `effectiveQtyTotal` cuando el qty-total es editable |

**Resultado de build:** `pnpm build:gold` → ✅ sin errores.

**No se hizo:** no se tocó `agrocompradores.js`, la lógica de montos (`isMonetaryComplete`), ni ningún otro flujo.
