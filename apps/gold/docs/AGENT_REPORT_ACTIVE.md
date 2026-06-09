# AGENT_REPORT_ACTIVE.md — YavlGold

Estado: ACTIVO
Fecha de apertura: 2026-06-03
Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-05-05__2026-06-03.md`

---

## Estado vivo del proyecto

- Release visible activa: `V1`.
- Canon operativo superior: `AGENTS.md`.
- Canon visual activo: `apps/gold/docs/ADN-VISUAL-V11.0.md`.
- Canon semántico Agro: `apps/gold/docs/MANIFIESTO_AGRO.md` (solo con autorización expresa).
- Ficha técnica disponible en: `apps/gold/docs/FICHA_TECNICA.md`.
- Supabase canónico: `supabase/` en raíz.
- Fase actual aprobada: **Fase 1 COMPLETADA y validada en producción**; **Fase 2 pendiente**.

## Frentes abiertos

- Agro V1: mantener separación semántica entre Facturero de Clientes, Facturero de la Finca y Mis Clientes.
- Facturero de Clientes: corregir UX de creación/vinculación de clientes sin mezclar intención del usuario.
- Agro V1: diseñar/implementar Fase 2 — Dashboard de Finca con 3 métricas críticas (inversión histórica, ingresos totales, balance + gastos generales).
- Agro V1: preparar Fase 3 — Comparación de fincas.
- Agro V1: definir alcance de Fase 4 — Informes MD de finca.
- Documentación viva: registrar sesiones en este archivo; rotar de nuevo al alcanzar 4000 líneas.

## Decisiones canónicas vigentes

- No agregar features nuevas en `apps/gold/agro/agro.js`; solo wiring quirúrgico si es inevitable.
- Nuevas piezas Agro deben vivir como módulos `agro-*.js` o CSS dedicado.
- Mis Clientes es libreta de contactos; Facturero de Clientes es seguimiento de créditos/deudas.
- No exponer lenguaje de base de datos en UI cuando exista una formulación humana equivalente.
- Build gate obligatorio tras cambios de código: `pnpm build:gold`.
- Fincas evolucionan a entidades vivas; movimiento general de finca se separa visualmente del movimiento de cultivo.

## Deuda técnica viva

- `agro.js` sigue siendo monolito legacy; evitar crecimiento (excepción justificada del 4 de junio: fix de loop infinito).
- `agrocompradores.js` contiene el wizard/ficha de compradores de Cartera Viva y requiere cirugía localizada.
- `index.html` conserva markup legacy del modal de buyer; cualquier copy visible ahí debe seguir humano aunque el wizard lo reemplace dinámicamente.
- `linked_user_id` existe como campo interno opcional; no se debe guardar correo/nombre/finca en una columna UUID.
- MutationObservers y listeners en módulos Agro deben revisarse para evitar acumulación en navegación repetida (documentado en Fase 1).
- CSS de facturero de finca debería migrarse a archivo propio en vez de crecer en `agro-facturero-finca.css`.

## Últimos cambios importantes todavía relevantes

- **2026-06-04**: Fase 1 COMPLETADA y validada en producción con 5 commits pusheados a main.
- **2026-06-04**: Fix de migración fantasma: nueva migración SQL para ciclos operativos.
- **2026-06-04**: Rediseño de Facturero: 4 filtros de asociación + 3 badges semánticos + limpieza terminológica.
- **2026-06-04**: Fix de loop infinito en `bindCropRefreshEvents` (excepción justificada a §3.1 AGENTS.md).
- **2026-06-03**: Fase 1 implementada inicialmente: movimientos generales de finca con badge `🏠 Finca: {name}`.
- Build gate verificado tras todos los cambios de Fase 1.

## Referencias a archivos archivados relevantes

- `AGENT_LEGACY_CONTEXT__2026-05-05__2026-06-03.md`
- `apps/gold/docs/chronicles/2026-05.md` — Crónica de mayo 2026
- `apps/gold/docs/AGENT_REPORT.md`
- `apps/gold/docs/ops/` — logs diarios de mayo purgados tras consolidación de crónica

---

## Sesión 2026-06-03 — Fase 1: Fincas como Entidades Vivas (Movimientos Generales)

### Objetivo
Evolucionar las fincas de "agrupadores de cultivos" a "entidades vivas con operatividad completa". Implementar Fase 1: Movimientos Generales de Finca.

### Contexto del problema
El usuario identificó que las fincas actualmente son solo contenedores de cultivos, no entidades vivas con operatividad completa. Diagnóstico reveló 4 brechas funcionales:

1. **Movimientos generales de finca** (ALTA prioridad): No se pueden registrar gastos que pertenecen a la finca como entidad (manguera 200m, aspersores, obrero de mantenimiento) sin forzarlos a un cultivo específico.
2. **Estadísticas completas por finca** (ALTA prioridad): Faltan 3 métricas críticas: inversión total histórica, ingresos totales, balance + gastos generales.
3. **Comparación de fincas** (URGENTE): El usuario tiene 2 fincas activas y necesita ver lado a lado cuál rinde más.
4. **Informes MD de finca** (MEDIA prioridad): Faltan exportes en Markdown del facturero y estadísticas por finca.

### Decisiones del usuario (guardadas en memoria del proyecto)
- Movimientos generales **separados visualmente** de los movimientos de cultivo
- Dashboard con **las 3 métricas críticas** (inversión histórica, ingresos totales, balance + gastos generales)
- Comparación de fincas es **urgente** (2 fincas activas actualmente)
- Informes MD **después** de la UI, paso a paso
- Módulos nuevos en `agro-farm-*.js` (NO hacer crecer `agro.js`)

### Plan estratégico de 4 fases aprobado
1. **Fase 1**: Movimientos generales de finca (separados visualmente) ✅ IMPLEMENTADA
2. **Fase 2**: Dashboard de finca como entidad viva (3 métricas críticas)
3. **Fase 3**: Comparación entre fincas (lado a lado)
4. **Fase 4**: Informes MD de finca

### Implementación

#### Archivos creados (2)
| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `supabase/migrations/20260603120000_agro_farm_movements.sql` | 2.8 KB | Migra 5 tablas de movimientos agregando `farm_id` UUID nullable + índices parciales |
| `apps/gold/agro/agro-farm-movements.js` | 9 KB | Post-procesa filas del Facturero para inyectar badges 🏠 Finca: {name} |

#### Archivos modificados (3)
| Archivo | Cambios | Propósito |
|---------|---------|-----------|
| `apps/gold/agro/agro-wizard.js` | +96/-5 líneas | Picker de fincas en Step 1, farm_id en insertData, resumen con finca, auto-resolve desde cultivo |
| `apps/gold/agro/agro-facturero-finca.css` | +104 líneas | `.tx-farm-badge`, `.wiz-farm-btn`, `.agro-farm-section-divider`, responsive ≤480px |
| `apps/gold/agro/index.html` | +7 líneas | Import lazy-load del módulo nuevo |

#### NO modificado
- ❌ `agro.js` — cero cambios (verificado con `git diff`)

### Bugs encontrados y corregidos
1. **farmId no se limpiaba al cambiar a "General"** — Corregido en 2 code paths.
2. **Picker sin fincas mostraba titular sin opciones** — Ahora muestra texto informativo cuando no hay fincas.

### Cómo funciona la implementación
1. **Wizard Step 1**: Cuando el usuario selecciona "General / Sin cultivo", aparece un grid de fincas debajo del grid de cultivos. Seleccionar una finca establece `state.farmId`.
2. **handleSubmit**: El `farm_id` se incluye en `insertData` y se inserta en Supabase. Si se selecciona un cultivo, farmId se auto-resuelve desde `crop.farm_id`.
3. **Badge display**: `agro-farm-movements.js` escucha eventos DOM (`agro:pending:refreshed`, etc.) y MutationObserver en gastos/ingresos, hace una query complementaria `SELECT id, farm_id WHERE farm_id IS NOT NULL`, y crea un badge junto al `.tx-crop` de cada fila renderizada.
4. **CSS**: Usa tokens ADN V11 (`var(--gold-4)`, `color-mix()`, `var(--radius-xs)`) — sin hex hardcodeados.

### Migración SQL ejecutada
- **Comando**: `npx supabase db push`
- **Resultado**: Success con NOTICES idempotentes
- **Tablas afectadas**: `agro_expenses`, `agro_income`, `agro_pending`, `agro_losses`, `agro_transfers`
- **Campo agregado**: `farm_id UUID REFERENCES agro_farms(id) ON DELETE SET NULL`
- **Índices creados**: `agro_expenses_user_farm_idx`, `agro_income_user_farm_idx`, `agro_pending_user_farm_idx`, `agro_losses_user_farm_idx`, `agro_transfers_user_farm_idx`

### Build
- ✅ `pnpm build:gold` pasa sin errores (3.24s)
- ✅ Módulo aparece en output: `agro-farm-movements-B9qz0lyr.js` (2.87 kB)
- ✅ UTF-8 check pasa

### Commit
feat(agro): Fase 1 - Movimientos generales de finca

- Nuevo módulo agro-farm-movements.js para post-procesamiento de badges
- Migración SQL agrega farm_id a 5 tablas de movimientos
- Picker de fincas en wizard Step 1 para gastos generales
- Badge 🏠 Finca: {name} en historial de Facturero de la Finca
- Separación visual de movimientos generales vs cultivos
- NO modifica agro.js (regla canónica §3.1 AGENTS.md)
Commit: `a47f3b2` — pusheado a `origin/main`

### QA sugerido (pendiente)
1. Abrir **Facturero de la Finca** → click "Nuevo Gasto"
2. **Step 1**: Seleccionar "General / Sin cultivo" → debe aparecer el picker de fincas
3. Seleccionar una finca → completar el wizard → el gasto se guarda con `farm_id`
4. En el historial, la fila debe mostrar badge **🏠 Finca: {name}**
5. Probar también con un cultivo específico (regresión) → no debe aparecer picker de fincas, farmId se auto-resuelve

### Deuda técnica documentada
1. **MutationObservers sin cleanup** — Riesgo de memory leak si el usuario navega entre vistas múltiples veces.
2. **Event listeners sin removeEventListener** — Si el módulo se reinicializa, los listeners se acumulan.
3. **setTimeout mágico de 100ms** — Workaround frágil para esperar a que `agro.js` termine de renderizar.
4. **CSS agregado a archivo CSS grande** — Debería estar en archivo separado según regla anti-monolito.

### Problemas operativos documentados
- **Tokens de GLM 5.1 se agotan rápido** — El usuario reporta que los tokens se acabaron después de 1 commit + 2 mensajes.
- **VPN desactivada para migración** — El usuario tuvo que desactivar VPN para ejecutar `npx supabase db push`.

### Estado final
**YELLOW** — Fase 1 técnicamente completa (GREEN), QA manual pendiente

### Próximos pasos
1. **Inmediato**: QA manual del usuario en producción.
2. **Si QA pasa**: Armar prompt para Fase 2 (Dashboard de Finca con 3 métricas críticas).
3. **Si QA falla**: Corregir bugs antes de Fase 2.
4. **Continuo**: Monitorear consumo de tokens de GLM 5.1.

### Lecciones aprendidas
1. **Diagnóstico antes de implementación**: Identificar las 4 brechas funcionales antes de tocar código evitó soluciones parciales.
2. **QA activo**: Encontró y corrigió 2 bugs reales durante la implementación.
3. **Deuda técnica controlada**: Documentar riesgos sin bloquear avance.
4. **Verificación de migración**: Usar query SQL para verificar la migración evita asumir que `db push` funcionó.
5. **Separación de concerns**: Movimientos generales de finca viven en Facturero de la Finca (MANIFIESTO §4.5.2), NO en Mi Granja.

### Archivos relevantes para Fase 2
- `apps/gold/agro/agro-farms.js` — CRUD actual de fincas
- `apps/gold/agro/agro-farm-movements.js` — Módulo nuevo de Fase 1
- `apps/gold/agro/agro-facturero-finca.css` — Estilos del facturero
- `supabase/migrations/20260603120000_agro_farm_movements.sql` — Migración de Fase 1

### Nota para agentes futuros
Fase 1 está técnicamente completa pero **NO está validada en producción**. Antes de arrancar Fase 2, el usuario debe crear un movimiento general de finca en producción y verificar el badge. Si el usuario no hizo QA manual, consultar primero.

---

## Resumen ejecutivo del día

✅ Lo que se logró:
- Diagnóstico completo de 4 brechas funcionales en fincas
- Plan estratégico de 4 fases aprobado por el usuario
- Fase 1 implementada con QA activo
- Migración SQL ejecutada y verificada
- Build pasa sin errores
- Commit pusheado a main

⚠️ Lo que preocupa:
- Tokens de GLM 5.1 se agotaron rápido (necesita monitoreo)
- QA manual pendiente de Fase 1
- Deuda técnica documentada

📋 Plan para mañana:
1. QA manual de Fase 1 en producción
2. Si funciona, arrancar Fase 2 (Dashboard de Finca)
3. Monitorear consumo de tokens de GLM 5.1

---

## Sesión 2026-06-04 — Fase 1 Completada: Fincas como Entidades Vivas

### Objetivo
Cerrar definitivamente la Fase 1 del plan estratégico de fincas, resolviendo todos los bugs identificados y validando en producción.

### Contexto del día
El usuario reportó que en "Mis Fincas", la finca "finca la ladera" mostraba $0.00 en gastos a pesar de tener un ciclo operativo de "kit de sistema para regar" por $220.000. Esto reveló que Fase 1 estaba técnicamente completa pero con bugs de persistencia y loop infinito.

### Problemas identificados y resueltos

#### 1. Migración fantasma (GLM 5.1 en Claude Code)
**Problema**: La migración original `20260603120000_agro_farm_movements.sql` fue modificada después de haber sido aplicada. Supabase asumió que ya estaba aplicada por su nombre y omitió los nuevos cambios.

**Solución**: Crear nueva migración `20260604120000_agro_operational_farm_id.sql` con fecha actual.

**Lección aprendida**: Nunca editar migraciones ya aplicadas. Si GLM/Gemini necesita ampliar una migración, crear archivo nuevo con fecha actual.

#### 2. Selector de finca en Ciclos Operativos (GLM 5.1)
**Problema**: Los ciclos operativos no tenían selector de finca asociada.

**Solución**:
- Agregado selector "Finca asociada" en formulario de ciclos operativos (+55 líneas en `agroOperationalCycles.js`)
- `farm_id` en payloads create/update/movement
- Label en confirmación del wizard
- Migración SQL ampliada: `farm_id` en `agro_operational_cycles` y `agro_operational_movements`

#### 3. Bug de persistencia de farm_id (Gemini 3.5 Flash)
**Problema**: Al editar un ciclo operativo y seleccionar "Finca asociada", el cambio no persistía al reabrir el modal.

**Diagnóstico inicial (incorrecto)**: El UPDATE no incluía `farm_id` en el payload.

**Diagnóstico real (correcto)**: El UPDATE sí incluía `farm_id`, pero el SELECT no lo traía desde Supabase. El view model no exponía `farm_id`.

**Solución**:
- Agregado `farm_id` al SELECT de `agro_operational_cycles`
- Agregado `farm_id` al view model
- Fallback corregido para evitar "Finca no válida" si catálogo aún no carga

#### 4. Rediseño completo de Facturero (Gemini 3.5 Flash)
**Problema**: UI solo distinguía 2 estados (con cultivo / sin cultivo), faltaba el estado intermedio (con finca pero sin cultivo específico).

**Solución**:
- **4 filtros de asociación**: Todos, 🌱 Por cultivo, 🏠 Por finca, ⚠️ Sin asociar (con contadores dinámicos)
- **3 badges semánticos** con colores ADN V11:
  - 🌱 Badge verde (success): "Cultivo: [nombre]"
  - 🏠 Badge dorado (gold-4): "Finca: [nombre]"
  - ⚠️ Badge ámbar (warning): "Sin asociar"
- **Limpieza terminológica**: "cartera operativa" → "ciclo operativo" / "Facturero de la Finca"

**Archivos modificados**:
- `agroOperationalCycles.js` (+168/-96 líneas)
- `agro-operational-cycles.css` (+56/-11 líneas)
- `agro-facturero-finca.css` (+13/-13 líneas)
- `agro-farm-movements.js` (+2/-2 líneas)

#### 5. Loop infinito en bindCropRefreshEvents (KiroCode Free)
**Problema**: Logs mostraban loop de 15+ iteraciones de inicialización del módulo Agro, causando `ERR_INSUFFICIENT_RESOURCES` y saturación de navegador.

**Causa raíz**:
```javascript
// Listener en bindCropRefreshEvents escuchaba agro:operational-portfolio-updated
// para llamar scheduleCyclesRefresh() → loadCrops()
// Pero agroOperationalCycles emitía ese evento DESPUÉS de procesar datos de loadCrops()
// Resultado: loadCrops → dispatchCropsReady → refreshData → emitPortfolioSnapshot
//            → scheduleCyclesRefresh → loadCrops → ∞
```

**Solución** (excepción justificada a §3.1 AGENTS.md):
- Eliminar listener específico de `bindCropRefreshEvents` en `agro.js` (3 líneas)
- El evento `agro:operational-portfolio-updated` sigue existiendo
- Consumidores reales (`refreshOpsRankingsIfVisible`) lo escuchan directamente
- Triggers legítimos intactos: `agro:crops:refresh`, `agro:income:changed`, `agro:losses:changed`

**Resultado**: Logs limpios, inicialización única, performance restaurada.

### QA manual exitoso
Usuario validó en producción:
- ✅ Persistencia de `farm_id` al editar ciclos operativos
- ✅ 4 filtros funcionales con contadores dinámicos
- ✅ 3 badges semánticos visibles (verde/dorado/ámbar)
- ✅ Limpieza terminológica completa
- ✅ Sin loops en logs de consola
- ✅ Build pasa sin errores

### Commits del 4 de junio
1. `feat(db): nueva migración farm_id en ciclos operativos` (GLM 5.1)
2. `feat(agro): selector de finca en Ciclos Operativos` (GLM 5.1)
3. `docs: actualizar reportes de sesión 4 de junio`
4. `feat(agro): Fase 1 completa - Rediseño de Facturero de la Finca` (Gemini 3.5 Flash)
5. `fix(agro): eliminar loop infinito en bindCropRefreshEvents` (KiroCode Free)
6. Merge PR #91 de dependabot

### Estado final
**GREEN** — Fase 1 completamente cerrada y validada en producción.

### Consumo de créditos de agentes
| Agente | Uso | Eficiencia | Observaciones |
|--------|-----|------------|---------------|
| GLM 5.1 | Alto | Baja | ~44% créditos por interacción compleja |
| Gemini 3.5 Flash | Moderado | Media | Mejor que GLM pero aún consume bastante |
| KiroCode Free | Bajo | Alta | Diagnóstico preciso + fix quirúrgico en 4 min (3.97 créditos) |
| Qwen (diagnóstico) | N/A | N/A | No consume créditos de coding agent |

**Estrategia optimizada para Fase 2**:
- Qwen → Diagnóstico + diseño (no consume créditos)
- KiroCode → Implementación quirúrgica (eficiente en créditos)
- GLM/Gemini → Solo si KiroCode no puede resolver

### Lecciones aprendidas
1. **Migraciones SQL**: Nunca editar archivos ya aplicados. Crear archivo nuevo con fecha actual.
2. **Diagnóstico real > hipótesis**: El bug no estaba en el UPDATE (que sí incluía `farm_id`), sino en el SELECT que no lo traía.
3. **Loop infinito**: Evento que dispara función que emite evento = loop infinito.
4. **KiroCode eficiente**: Diagnóstico preciso + fix quirúrgico en 4 minutos (3.97 créditos).
5. **Estrategia de créditos**: Qwen (diagnóstico) + KiroCode (cirugía) = optimización.

### Próximos pasos
1. **Arrancar Fase 2**: Dashboard de Finca como Entidad Viva con 3 métricas críticas
2. **Consolidar estadísticas**: cultivos + ciclos operativos + gastos generales por finca
3. **Vista de Mis Fincas** con datos completos (ej: "finca la ladera" debe mostrar $220.000 del kit de riego)

### Archivos relevantes para Fase 2
- `apps/gold/agro/agro-farms.js` — CRUD actual de fincas (base para dashboard)
- `apps/gold/agro/agro-farm-movements.js` — Módulo de Fase 1 (puede extenderse)
- `apps/gold/agro/agro-operational-cycles.js` — Ciclos operativos con `farm_id`
- `supabase/migrations/20260604120000_agro_operational_farm_id.sql` — Migración de Fase 1

### Nota para agentes futuros
Fase 1 está **completamente cerrada y validada en producción**. El usuario ya hizo QA manual y confirmó que todo funciona. Antes de arrancar Fase 2, leer este reporte para entender la estrategia de créditos optimizada.

---

## Sesión 2026-06-05 — Plan Estratégico Completo + Auditoría de Informes

### Objetivo
Completar el plan estratégico de 4 fases para evolucionar las fincas de "agrupadores de cultivos" a "entidades vivas con operatividad completa", y auditar los 9-10 informes MD generados el mismo día.

### Entregables del día

#### Fase 2: Dashboard de Finca como Entidad Viva ✅
**Commit:** `feat(agro): Fase 2 completa - Dashboard de Finca como Entidad Viva`
- Consolidación de estadísticas por finca: cultivos + ciclos operativos + gastos generales
- 5 queries optimizadas para consolidación completa
- Desglose visual de gastos generales en Mis Fincas
- "Finca la Ladera" muestra $61.66 del kit de riego
- "Los Higuerones" muestra 2 ciclos operativos + $8.41 gastos generales

#### Fase 3: Comparación de Fincas lado a lado ✅
**Commit:** `feat(agro): Fase 3 - Comparación de Fincas lado a lado`
- Botón "Comparar fincas" en Mis Fincas
- Módulo `agro-farm-compare.js` (~330 líneas) + CSS (~250 líneas)
- Tabla comparativa con 8 métricas consolidadas
- Highlight visual (verde=ganador, rojo=perdedor)
- Lectura humana automática (ROI, ingresos, balance, ciclos)
- Lazy-load via `import()` solo al hacer clic

#### Fase 4: Informes MD de Finca ✅
**Commit:** `feat(agro): Fase 4 — Informe MD de Finca (cierre del plan estratégico)`
- Botón "Informe" en cada card de finca
- Módulo `agro-farm-report.js` (~400 líneas)
- 8 queries por finca (cultivos, gastos, ingresos, ciclos operativos, movimientos)
- Resumen ejecutivo con métricas consolidadas
- Historia productiva completa (activos/finalizados/perdidos — MANIFIESTO §4.13)
- Lectura del negocio automática
- Descarga directa sin modal previo
- NO agregado al Centro de Reportes (respetando MANIFIESTO §4.9)

### Auditoría de 10 informes MD (cruzada entre informes)

**Informes analizados:**
- 3 globales (Rankings, Perfil Global, Estadísticas)
- 3 de fincas (Los Higuerones, finca la ladera, finca la vega)
- 4 de cultivos (Batata amarilla 2, batata, caraota roja, Maíz mio)

**8 problemas detectados, 7 resueltos:**

| # | Severidad | Problema | Estado |
|---|-----------|----------|--------|
| 1 | 🔴 Crítico | Fiados huérfanos en Perfil Global ($125.11 fantasma del cultivo de pepino eliminado) | ✅ Resuelto |
| 2 | 🔴 Crítico | ROI mal calculado en informes de finca (547.3% vs 447.3% canónico) | ✅ Resuelto |
| 3 | 🔴 Crítico | Inversión total histórica mezcla conceptos (cultivos + generales) | ✅ Resuelto |
| 4 | 🟡 Medio | Cultivo fantasma "Cultivo" en Rankings | ⚠️ Limitación técnica |
| 5 | 🟡 Medio | 11 sacos sin explicar en unidades globales | ✅ Resuelto |
| 6 | 🟡 Medio | Capitalización inconsistente (Tito vs tito) | ✅ Resuelto (parcial) |
| 7 | 🟡 Medio | Emojis 🌱 acumulándose (🌱🌱🌱 batata) | ✅ Resuelto |
| 8 | 🟢 Menor | Off-by-one en días de progreso | ❌ No era bug |

**Fix adicional detectado en QA:**
- Eliminar `concept` de query a `agro_income` (columna no existe en esa tabla)
- Usar columnas reales `actual_harvest_date` y `lost_at` en informe de finca
- Unificar estilo del botón "Comparar fincas" con "Nueva Finca"

### Helpers creados
- `normalizeReportClientName(name)` — en `agro-report-format.js` — "tito" → "Tito"
- `sanitizeCropDisplayName(rawName)` — en `agro-report-format.js` — "🌱🌱🌱 batata" → "batata"
- `cleanCropName(raw)` — local en `agro-farm-report.js` (pendiente unificar)

### Limitación técnica conocida
**Rankings vive en `agro.js`** (~líneas 13990-14133). Por regla §3.1 de AGENTS.md no se puede modificar el monolito. El cultivo fantasma "🌱 Cultivo" y la capitalización inconsistente siguen apareciendo en `AgroRankings_*.md` hasta extracción futura a `agro-rankings.js`.

### Deuda técnica identificada
1. **Extracción de Rankings** a `agro-rankings.js` — refactor estructural pendiente
2. **Unificación de helpers de sanitize** — dos implementaciones de la misma lógica
3. **Umbrales de interpretación del ROI** — con la nueva fórmula canónica, >0 ya es rentable; umbral de 100% significa duplicar inversión
4. **Filtro simétrico validCropIds** — pendiente aplicar a todas las queries de facturero para consistencia total

### Consumo de créditos
- GLM 5.1: 100% del día rendido en 8 commits + auditoría completa
- Patrón de consumo normalizado: 7-10% por tarea quirúrgica (vs 44% ayer con contexto pesado)
- Estrategia validada: Qwen (diagnóstico + auditoría) + GLM (implementación quirúrgica)

### Commits pusheados (8 total)
1. `feat(agro): Fase 2 completa - Dashboard de Finca como Entidad Viva`
2. `fix(agro): consolidar estadísticas de Mis Fincas con ciclos operativos y movimientos generales`
3. `feat(agro): Fase 3 - Comparación de Fincas lado a lado`
4. `fix(agro): unificar estilo del botón Comparar fincas con Nueva Finca`
5. `feat(agro): Fase 4 — Informe MD de Finca (cierre del plan estratégico)`
6. `fix(agro): usar columnas reales actual_harvest_date y lost_at en informe de finca`
7. `fix(agro): eliminar concept inexistente de query a agro_income`
8. `fix(agro): resolver 4 problemas medios de auditoría de informes`

### Estado final del proyecto
**GREEN** ✅ — Plan estratégico de 4 fases completamente cerrado y validado en producción. Auditoría de informes resuelta (7/8 problemas, 1 limitación técnica documentada). Sistema de informes saludable con datos consistentes entre informes globales e individuales.

### Próximos pasos (pendientes para siguiente sesión)
1. Extraer Rankings a módulo propio `agro-rankings.js` (deuda técnica)
2. Unificar helpers de sanitize en `agro-report-format.js`
3. Ajustar umbrales de interpretación del ROI con fórmula canónica
4. Investigar off-by-one menor en días de progreso (prioridad baja)

### Lecciones aprendidas del día
1. **Prompts quirúrgicos rinden más** — Contexto mínimo + tarea atómica = 7-10% de créditos por fix
2. **Auditoría cruzada entre informes** revela inconsistencias invisibles en QA aislado
3. **Helpers centralizados evitan duplicación** — pero requieren refactor posterior si se crearon locales
4. **Limitaciones técnicas documentadas > fixes forzados** — Rankings en agro.js es mejor dejarlo documentado que romper §3.1
5. **Fases consecutivas en un mismo día** son viables con prompts bien estructurados y QA incremental

---
*Reporte generado por Qwen (diagnóstico) + GLM 5.1 (implementación) en sesión del 5 de junio 2026.*

## Sesión 2026-06-05 — Cierre del Plan Estratégico de Fincas + Auditoría de Informes MD

### Objetivo
Completar el plan estratégico de 4 fases para evolucionar las fincas de "agrupadores de cultivos" a "entidades vivas con operatividad completa", y auditar los 10 informes MD generados en la sesión para validar integridad de datos.

### Contexto
Al iniciar la sesión, las fincas solo eran contenedores de cultivos. Las estadísticas de Mis Fincas solo consultaban `agro_crops`, ignorando ciclos operativos y gastos generales. No existía comparación entre fincas ni informes individuales descargables.

### Diagnóstico inicial
- Mis Fincas mostraba $0.00 en fincas con actividad operativa (ej: "finca la ladera" con kit de riego de $61.66)
- No existía mecanismo para comparar fincas lado a lado
- No existía exportación de historia productiva por finca
- Los 10 informes MD del día tenían inconsistencias cruzadas (8 problemas detectados)

---

### Plan estratégico ejecutado (4 fases en 1 día)

#### Fase 2: Dashboard de Finca como Entidad Viva ✅
- Consolidación de estadísticas: cultivos + ciclos operativos + gastos generales
- 5 queries optimizadas para consolidación completa
- Desglose visual: gastos totales + gastos generales
- Fix aplicado: eliminar `.is('deleted_at', null)` en tablas de hard delete (`agro_operational_cycles`, `agro_operational_movements`)

#### Fase 3: Comparación de Fincas lado a lado ✅
- Módulo `agro-farm-compare.js` (~330 líneas) + CSS (~250 líneas)
- Tabla comparativa con 8 métricas consolidadas
- Highlight visual (verde=ganador, rojo=perdedor)
- Lectura humana automática (ROI, ingresos, balance, ciclos)
- Lazy-load via `import()` solo al hacer clic

#### Fase 4: Informes MD de Finca ✅
- Módulo `agro-farm-report.js` (~400 líneas)
- 8 queries por finca (cultivos, gastos, ingresos, ciclos operativos, movimientos)
- Historia productiva completa (activos/finalizados/perdidos — MANIFIESTO §4.13)
- Lectura del negocio automática
- Descarga directa sin modal previo
- NO agregado al Centro de Reportes (respetando MANIFIESTO §4.9)

---

### Auditoría de 10 informes MD (cruzada)

Informes analizados:
- 3 globales (Rankings, Perfil Global, Estadísticas)
- 3 de fincas (Los Higuerones, finca la ladera, finca la vega)
- 4 de cultivos (Batata amarilla 2, batata, caraota roja, Maíz mio)

8 problemas detectados, 7 resueltos:

| # | Severidad | Problema | Estado |
|---|-----------|----------|--------|
| 1 | Crítico | Fiados huérfanos en Perfil Global ($125.11 fantasma del cultivo de pepino eliminado) | Resuelto |
| 2 | Crítico | ROI mal calculado en informes de finca (547.3% vs 447.3% canónico) | Resuelto |
| 3 | Crítico | Inversión total histórica mezcla conceptos (cultivos + generales) | Resuelto |
| 4 | Medio | Cultivo fantasma "Cultivo" en Rankings | Limitación técnica |
| 5 | Medio | 11 sacos sin explicar en unidades globales | Resuelto |
| 6 | Medio | Capitalización inconsistente (Tito vs tito) | Resuelto (parcial) |
| 7 | Medio | Emojis acumulándose en nombres de cultivo | Resuelto |
| 8 | Menor | Off-by-one en días de progreso | No era bug |

Fix adicional detectado en QA:
- Eliminar `concept` de query a `agro_income` (columna no existe en esa tabla)
- Usar columnas reales `actual_harvest_date` y `lost_at` en informe de finca
- Unificar estilo del botón "Comparar fincas" con "Nueva Finca"

---

### Cambios realizados
| Archivo | Líneas +/- | Propósito |
|---------|-----------|-----------|
| `apps/gold/agro/agro-farms.js` | +105 / -5 | Consolidación de estadísticas por finca |
| `apps/gold/agro/agro-farm-compare.js` | ~330 (nuevo) | Comparación de fincas lado a lado |
| `apps/gold/agro/agro-farm-compare.css` | ~250 (nuevo) | Estilos de comparación con tokens ADN V11 |
| `apps/gold/agro/agro-farm-report.js` | ~400 (nuevo) | Informes MD por finca |
| `apps/gold/agro/agro-report-format.js` | +28 | Helpers `normalizeReportClientName` + `sanitizeCropDisplayName` |
| `apps/gold/agro/agroestadistica.js` | +7 mod | Filtro simétrico `validCropIds` + normalización |
| `apps/gold/agro/agroperfil.js` | +18 mod | Filtro `validCropIds` en unit totals |
| `apps/gold/agro/agro-stats-report.js` | +2 mod | Import helpers + normalización |
| `apps/gold/agro/agro-crop-report.js` | +5 mod | Sanitizar nombres + normalizar clientes |
| `apps/gold/agro/agro-farms.css` | +11 | Estilo botón "Informe" |
| `apps/gold/index.html` | +1 | CSS link para `agro-farm-compare.css` |

Archivos NO modificados:
- `apps/gold/agro/agro.js` — intacto (regla §3.1 AGENTS.md respetada)

---

### Resultado de build
- `pnpm build:gold` pasa sin errores
- UTF-8 verification passed
- 184 módulos transformados

### QA realizado
- Mis Fincas muestra estadísticas consolidadas
- "Finca la Ladera" muestra $61.66 del kit de riego
- "Los Higuerones" muestra 2 ciclos operativos + $8.41 gastos generales
- Comparación de fincas funcional con highlight visual
- Informes MD descargados con datos correctos
- ROI corregido a fórmula canónica MANIFIESTO §7
- Inversión separada de gastos generales en informes
- Fiados $0.00 en ambos informes globales (consistencia)
- Totales de sacos cuadran entre globales e individuales

---

### Limitación técnica conocida
Rankings vive en `agro.js` (~líneas 13990-14133). Por regla §3.1 de AGENTS.md no se puede modificar el monolito. El cultivo fantasma y la capitalización inconsistente siguen apareciendo hasta extracción futura a `agro-rankings.js`.

### Deuda técnica identificada
1. Extracción de Rankings a módulo propio `agro-rankings.js`
2. Unificación de helpers de sanitize en `agro-report-format.js`
3. Ajuste de umbrales de interpretación del ROI
4. Aplicar filtro simétrico `validCropIds` a todas las queries de facturero

---

### Estado final del proyecto
GREEN ✅ — Plan estratégico de 4 fases completamente cerrado y validado en producción. Auditoría de informes resuelta (7/8 problemas, 1 limitación técnica documentada). Sistema de informes saludable con datos consistentes entre informes globales e individuales.

### Próximos pasos
1. Extraer Rankings a módulo propio `agro-rankings.js`
2. Unificar helpers de sanitize en `agro-report-format.js`
3. Ajustar umbrales de interpretación del ROI
4. Investigar off-by-one menor en días de progreso (prioridad baja)

## Sesión 2026-06-06 — Auditoría Cruzada de 9 Reportes Exportados

### Estado: 🟡 YELLOW — 8 áreas verdes, 2 hallazgos rojos

### Objetivo
Auditoría completa cruzada de los 9 informes MD generados el 6 de junio contra los documentos canónicos (MANIFIESTO_AGRO, AGENTS, ADN-VISUAL-V11, FICHA_TECNICA, ROADMAP) y contra los bugs cerrados en sesiones previas.

### Informes auditados (9)
- 3 globales: `AgroRankings_2026-06-06.md`, `Estadisticas_YavlGold_2026-06-06.md`, `agro_perfil_global_2026-06-06.md`
- 4 de cultivos: `Informe_batata_amarilla_2_2026-06-06.md`, `Informe_batata_2026-06-06.md`, `Informe_caraota_roja_2026-06-06.md`, `Informe_maiz_2026-06-06.md`
- 2 de fincas: `Informe_Finca_Los_Higuerones_2026-06-06.md`, `Informe_Finca_la_ladera_2026-06-06.md`

---

### Aciertos verificados (8 áreas GREEN)

| # | Área | Evidencia |
|---|------|-----------|
| 1 | Limpieza de emojis duplicados | Todos los cultivos sin duplicados tras fix de SQL del 6/06 |
| 2 | Formato monetario | `$1,263.25 USD` — punto decimal, moneda explícita, cero coma decimal |
| 3 | Semántica de costos | Fórmula canónica `costosTotales = inversión + gastos + pérdidas` respetada |
| 4 | Purga QA | Cero registros de prueba en los 9 informes |
| 5 | Estados de cartera | `🔔 Mixto` / `⏳ Debe` / `✅ Pagado` correctamente aplicados |
| 6 | caraota roja | Estado `🌿 Creciendo`, día 13/92 (14%), balance -$22.03 — semántica §4.3 canónica |
| 7 | Toggles de privacidad | No aparecen en exportes MD (no se filtran a Markdown) |
| 8 | Refactor de helpers | Output byte-equivalente post-consolidación de `agro-report-format.js` |

---

### Hallazgos rojos (2 — requieren acción)

#### 🔴 Hallazgo #1 — Cultivo fantasma "🌱 Cultivo" en AgroRankings (Top Cultivos #4)
- **Evidencia**: Fila `4. 🌱 Cultivo · Rentabilidad real $0.00 USD · Ingresos $0.00 · Inversión $0.00` en `AgroRankings_2026-06-06.md`
- **No aparece** en Estadísticas, Perfil Global ni en ninguno de los 4 informes individuales de cultivo
- **Diagnóstico probable**: Placeholder legacy — registro creado sin nombre o cultivo soft-deleted omitido por la query de Rankings
- **Canon violado**: MANIFIESTO_AGRO §7 (honestidad documental — cero placeholders)
- **Contexto previo**: Documentado el 2026-06-05 como "limitación técnica" porque Rankings vive en `agro.js` (§3.1)
- **Query SQL de diagnóstico pendiente** (solo lectura, sin riesgo):

```sql
SELECT id, name, farm_id, status, created_at::date, deleted_at
FROM agro_crops
WHERE user_id = '6b2b81ba-1233-49a8-8fe8-bac4eec963dc'
  AND (LOWER(TRIM(name)) = 'cultivo' OR LOWER(TRIM(name)) LIKE '%cultivo%')
ORDER BY created_at DESC;
```

Si aparece un registro con `deleted_at IS NULL` y nombre literal "Cultivo", corresponde soft-delete manual con `UPDATE agro_crops SET deleted_at = NOW() WHERE id = '<id>';`

#### 🔴 Hallazgo #2 — Capitalización inconsistente entre Rankings y Estadísticas
- **Evidencia**: `AgroRankings` usa `jose luis`, `Yony chupeto`, `Jesús berraco`; `Estadisticas` usa `Jose Luis`, `Yony Chupeto`, `Jesús Berraco` (32 clientes afectados)
- **Montos idénticos** — es cosmético, no funcional
- **Causa raíz**: Dos builders diferentes o rutas de normalización distintas entre el módulo de Rankings (`agro.js`) y el de Estadísticas
- **Pendiente #9** documentado en sesión 2026-06-05
- **Resolución**: Requiere extracción de Rankings a `agro-rankings.js` + unificación del normalizador de nombres (Pendiente de refactor estructural)

---

### Hallazgos amarillos (3 — no bloquean, baja prioridad)

| # | Hallazgo | Naturaleza |
|---|----------|------------|
| A | Fragmentación "Yony" vs "Yony Chupeto" | Pendiente #8 de sesión 2026-06-05 — deduplicación de cliente canónico |
| B | "caraota roja (roja)" en Estadísticas vs "caraota roja" en Rankings | Cosmético — variedad entre paréntesis no se muestra en Rankings |
| C | Diferencia $0.01 entre Estadísticas ($706.59) y Perfil Global ($706.60) | Ruido de redondeo, dentro de EPSILON $1 establecido |

---

### Cambios realizados en esta sesión
- Ninguno — sesión de auditoría / diagnóstico (read-only)

### QA realizado
- Lectura cruzada de los 9 informes contra canónicos
- Verificación de aciertos de las sesiones 2026-06-04 y 2026-06-05

### Próximas acciones priorizadas

1. **✅ RESUELTO (Fix 1)**: `agro.js` — `ensureBucket` retorna `null` para crop_id sin cultivo activo → fantasma "Cultivo" en Rankings eliminado
2. **✅ RESUELTO (Fix 2)**: `agro-section-stats.js` — filtro `validCropIds` aplicado sobre filas antes de `computeStats`
3. **✅ RESUELTO (Fix 3)**: `agro-facturero-clientes-view.js` — filtro `isOrphan` en `fetchOperationalProgressMap` para pending, income y loss
4. **🟡 Próxima sesión**: Extraer Rankings a `agro-rankings.js` + unificar normalizador de nombres (resuelve capitalización inconsistente — Hallazgo #2)
5. **🟡 Próxima sesión**: Unificar helpers de sanitize y deduplicación de clientes canónicos
6. **🟢 Aceptado**: Diferencia $0.01 — ruido dentro de tolerancia establecida

---

*Auditoría realizada por Kiro (sesión 2026-06-06). Método: lectura cruzada de 9 informes + contraste con MANIFIESTO_AGRO, AGENTS, ADN-VISUAL-V11, FICHA_TECNICA y reportes de sesiones previas.*

## Sesión 2026-06-06 (continuación) — Fix de integridad: movimientos huérfanos de cultivos eliminados

### Estado: ✅ GREEN

### Diagnóstico
Confirmada la raíz de los fantasmas "David", "Reyes" y "🌱 Cultivo" en Rankings/Facturero:

1. **Bug de integridad estructural**: `agro_pending` (y otras tablas de movimientos) conserva filas con `crop_id` de cultivos que tienen `deleted_at IS NOT NULL`. Esto es correcto para auditoría, pero esas filas no deben participar en operación diaria.

2. **Mecanismo del fantasma**: En `agro.js`, `ensureBucket(crop_id)` creaba un bucket con `crop_name: 'Cultivo'` para cualquier `crop_id` que no estuviera en `cropMap` (incluyendo cultivos eliminados). Esto generaba la fila `🌱 Cultivo · $0.00` en Rankings.

3. **Superficies sin filtro**: `agro-section-stats.js` y `agro-facturero-clientes-view.js` no cruzaban movimientos contra `agro_crops.deleted_at`.

### Módulos auditados (15 archivos con agro_pending)
| Módulo | Estado previo | Acción |
|--------|--------------|--------|
| `agroestadistica.js` | ✅ Ya tenía `filterByValidCrop` | Sin cambios |
| `agroperfil.js` | ✅ Ya tenía `filterByValidCrop` | Sin cambios |
| `agro-stats-report.js` | ✅ Movimientos huérfanos van a `unassigned` (descartados) | Sin cambios |
| `agro.js` (Rankings) | ❌ `ensureBucket` creaba bucket fantasma | Fix 1 |
| `agro-section-stats.js` | ❌ Sin filtro de cultivos eliminados | Fix 2 |
| `agro-facturero-clientes-view.js` | ❌ Sin filtro en `fetchOperationalProgressMap` | Fix 3 |
| Resto (reportes por cultivo, wizard, etc.) | ✅ No aplica — scoped por crop_id específico | Sin cambios |

### Cambios realizados

#### Fix 1 — `apps/gold/agro/agro.js` (+1 línea)
```javascript
// En ensureBucket, antes de crear el bucket:
const crop = cropMap.get(key) || null;
// Discard movements from deleted/unknown crops — they must not appear in rankings.
if (!crop) return null;
```
Excepción justificada a §3.1 AGENTS.md: bugfix quirúrgico de 1 línea. La regla de cirugía sí aplica.

#### Fix 2 — `apps/gold/agro/agro-section-stats.js` (+6 líneas)
```javascript
// En loadSectionStats, después de getCropsMap():
const validCropIds = new Set(Object.keys(cropsMap));
const filteredRows = rows.filter((row) => {
    const cid = String(row?.crop_id || '').trim();
    return !cid || validCropIds.has(cid);
});
// computeStats(sectionKey, filteredRows, cropsMap) — usa filteredRows
```
Usa `getCropsMap()` que ya existía. Cero queries adicionales.

#### Fix 3 — `apps/gold/agro/agro-facturero-clientes-view.js` (+8 líneas)
```javascript
// En fetchOperationalProgressMap, al inicio:
const { data: activeCropRows } = await supabaseClient.from('agro_crops').select('id').is('deleted_at', null);
const validCropIds = new Set((activeCropRows || []).map((r) => String(r.id || '').trim()).filter(Boolean));
const isOrphan = (row) => { const cid = String(row?.crop_id || '').trim(); return cid && !validCropIds.has(cid); };
// Aplicado en los 3 forEach: pendingResult, incomeResult, lossResult
```

### Resultado de build
- ✅ `pnpm build:gold` pasa sin errores (3.18s, 185 módulos)
- ✅ UTF-8 verification passed
- ✅ agent-guard OK, agent-report-check OK

### QA sugerido
1. Abrir **Rankings** → Top Cultivos — no debe aparecer `🌱 Cultivo` con $0.00
2. Abrir **Facturero de Clientes** → no deben aparecer "David" ni "Reyes" (huérfanos de Pepino)
3. Abrir **Sección Stats** (Pendientes/Fiados) → no deben aparecer montos del Pepino eliminado
4. Abrir Rankings Top Clientes → Wilmer Chapeton y Orlando Pineda deben seguir igual (datos válidos)

### Canon reforzado (propuesta para AGENTS.md o MANIFIESTO)
> Ninguna consulta de negocio puede considerar movimientos con `crop_id` de cultivos con `deleted_at IS NOT NULL`, salvo superficies explícitas de auditoría o histórico.

Esta regla, si se aprueba, debe registrarse en `MANIFIESTO_AGRO.md §7` o en `AGENTS.md §6`.

### BUG B — Orlando / Orlando Pineda (pendiente)
Confirmado que son la misma persona. Requiere consolidación de identidad comercial vía `buyer_group_key` o modal de unificación (mismo mecanismo que Yony ↔ Yony Chupeto). **No hay que borrar nada** — solo merge de cliente. Pendiente de próxima sesión.

### Deuda técnica documentada
- Extracción de Rankings a `agro-rankings.js` eliminaría la necesidad del fix quirúrgico en `agro.js` y resolvería la capitalización inconsistente (Hallazgo #2 de auditoría)

### Acciones manuales del usuario (6 de junio)
- ✅ **Orlando → Orlando Pineda**: unificación de identidad comercial realizada directamente en Facturero de Clientes
- ✅ **Fiados de Orlando movidos a Pagados**: saldados manualmente en producción
- ✅ **Migración `20260606120000` aplicada**: `npx supabase db push` ejecutado por el usuario

### Commit
`fix(agro): excluir movimientos de cultivos eliminados en toda la capa operativa`
Commit: `6731d3a6` — pusheado a `origin/main`

### Estado final del día
**GREEN** ✅ — Bug de integridad de huérfanos completamente cerrado en todas las capas (JS + RPC).

*Fix realizado por Kiro — sesión 2026-06-06.*

## Sesión 2026-06-06 (noche) — Validación final post-limpieza de clientes fantasma

### Estado: ✅ GREEN

### Acciones manuales del usuario
- **David** (cliente vacío, huérfano de Pepino eliminado) → eliminado desde Facturero de Clientes ✅
- **Reyes** (cliente vacío, huérfano de Pepino eliminado) → eliminado desde Facturero de Clientes ✅
- **Orlando** (duplicado vacío sin registros, diferente de "Orlando Pineda") → eliminado ✅
- **Orlando → Orlando Pineda** (unificación de identidad comercial) → realizado en sesión anterior ✅

### Auditoría de 9 reportes del 7 de junio

| Área | Estado |
|------|--------|
| David / Reyes en rankings | ✅ ELIMINADOS |
| Fantasma "🌱 Cultivo" en Top Cultivos | ✅ AUSENTE |
| Fiados globales | ✅ $0.00 en los 3 reportes globales |
| Totales financieros | ✅ $2,742.35 · $706.59 · $2,035.75 estables |
| Unidades 222.5 sacos | ✅ Cuadran entre Perfil Global e individuales |
| Orlando Pineda (real, 5 compras) | ✅ Presente y correcto |
| Capitalización Rankings vs Estadísticas | 🟡 Pendiente #9 — deuda técnica conocida |
| Yony / Yony Chupeto (legacy) | 🟡 Pendiente #8 — cosmético en informe batata |

### Cierre definitivo del BUG A — Huérfanos de Pepino
El ciclo completo del bug quedó resuelto en 3 capas:
1. JS (Rankings, section-stats, fetchOperationalProgressMap) — commit `6731d3a6`
2. RPC Supabase (agro_buyer_portfolio_summary_v1) — migración `20260606120000`
3. Guard del informe estadístico (guardIncomeRows) — commit `ca1cf7f5`
4. Limpieza manual de registros vacíos en `agro_buyers` — acción del usuario

### Pendientes documentados (no bloquean operación)
- **Pendiente #8**: "Yony" (legacy) vs "Yony Chupeto" (canónico) — fragmentación cosmética en informe de cultivo batata
- **Pendiente #9**: Capitalización inconsistente entre AgroRankings y Estadísticas — requiere extracción de Rankings a `agro-rankings.js`

*Validación realizada por Kiro — sesión 2026-06-06 (noche).*

## Cierre formal 2026-06-06 (noche)

### Estado: ✅ GREEN — Paridad UI ↔ Reportes ↔ Realidad operativa restaurada

### Frentes cerrados (4)
1. **Huérfanos de Pepino** (David/Reyes) — Kiro, commits `6731d3a6` + `ca1cf7f5`, 4 capas JS + migración SQL `20260606120000`
2. **Guard de reportes asimétrico** — Kiro, commit `ca1cf7f5`, alineación `guardIncomeRows` con `buildPerCropTable`
3. **Unificación Orlando → Orlando Pineda** — usuario (modal Facturero de Clientes)
4. **Limpieza de clientes vacíos** (David, Reyes, Orlando vacío) — usuario (UI Mis Clientes)

### Canon reforzado
- `MANIFIESTO_AGRO.md §7` actualizado con regla de cascada al eliminar cultivos:
  movimientos preservados para auditoría, excluidos de todas las superficies operativas.

### Métricas del día
- Commits: 2 (`6731d3a6`, `ca1cf7f5`)
- Migraciones SQL: 1 (`20260606120000_agro_buyer_portfolio_exclude_deleted_crops.sql`)
- Reportes auditados: 9 (13 áreas verdes, 3 amarillas — cosméticas, 0 rojas)

### Lección operativa registrada
Kiro mostró comportamiento clase-Opus con consumo eficiente (~2 créditos/sesión).
Óptimo para cirugía técnica multi-capa, migraciones SQL y fixes de integridad.
Posición en orquestación: primera línea para cirugía técnica.

### Pendientes cosméticos (no bloquean)
- **#8**: "Yony" legacy vs "Yony Chupeto" canónico — fragmentación en informe individual de batata
- **#9**: Capitalización inconsistente Rankings vs Estadísticas — se resuelve al extraer Rankings a `agro-rankings.js`
- **Redondeo $0.01** cross-reporte — dentro de EPSILON $1, aceptado permanentemente

---

## Sesión 2026-06-07 — Consolidación de Crónica Mayo 2026 y Blindaje Documental

### Estado: ✅ GREEN

### Objetivo
Consolidar la memoria histórica del mes de mayo 2026, purgar logs diarios temporales y blindar la convención de nombres para evitar residuos futuros.

### Contexto
El sistema de bitácora operativa diaria (§4.3 AGENTS.md) establece que los `daily-log-YYYY-MM-DD.md` son archivos temporales que deben eliminarse tras validación de la crónica mensual. Al iniciar la sesión existían múltiples logs de mayo pendientes de consolidación.

---

### Acciones realizadas

#### 1. Consolidación de Crónica Mayo 2026
- **Archivo creado**: `apps/gold/docs/chronicles/2026-05.md`
- **Contenido**: Hitos principales, decisiones arquitectónicas, estado de módulos, deuda técnica
- **Hitos documentados**: Calculador canónico unificado, 7 bugs críticos resueltos, auditoría cruzada de informes, normalización de nombres de clientes

#### 2. Addendum a Crónica General
- **Archivo modificado**: `apps/gold/docs/chronicles/CRONICA-YAVLGOLD.md`
- **Contenido agregado**: Resumen Ejecutivo Mayo 2026 con 8 hitos principales y referencia al archivo mensual

#### 3. Blindaje de AGENTS.md §4.3.1
- **Problema detectado**: 2 archivos residuales con nombres en mayúsculas (`DAILY_LOG_2026-05-22.md`, `DAILY_LOG_2026-05-25.md`) no fueron detectados por la purga automática que usaba patrón `daily-log-2026-05-*.md` (minúsculas)
- **Solución**: Nueva sección §4.3.1 con:
  - Convención estricta de nombres: siempre minúsculas, formato exacto `daily-log-YYYY-MM-DD.md`
  - Anti-patrones prohibidos documentados
  - Regla de purga robusta: buscar todas las variaciones posibles de nombres
  - Lección aprendida registrada

#### 4. Reorganización Documental
- **Archivo movido**: `FICHA_TECNICA.md` desde raíz del repo a `apps/gold/docs/FICHA_TECNICA.md`
- **Archivos actualizados** (referencias corregidas):
  - `AGENTS.md` — Tabla §4, §4.2, §11.X, ROADMAP
  - `MANIFIESTO_AGRO.md` — Fuente canónica superior y jerarquía de precedencia
  - `ROADMAP_VISION_YAVLGOLD.md` — Referencia en §0
  - `AGENT_CONTEXT_INDEX.md` — Tabla de capas y link relativo

#### 5. Purga de Logs Diarios de Mayo
- **Archivos eliminados**: Todos los `daily-log-2026-05-*.md` tras validación de crónica
- **Archivos residuales procesados**: `DAILY_LOG_2026-05-22.md` y `DAILY_LOG_2026-05-25.md` (contenido consolidado en crónica antes de eliminación)

#### 6. Eliminación de Duplicado
- **Archivo eliminado**: `FICHA_TECNICA.md` duplicado en raíz (commit separado)

---

### Commits del día
1. `docs: mover FICHA_TECNICA.md a apps/gold/docs/ y actualizar referencias canonicas` (512aad2)
2. `docs: eliminar FICHA_TECNICA.md duplicado de raiz` (pendiente push)
3. `docs: consolidacion cronica mayo 2026 y actualizacion reporte activo` (pendiente push)
4. `docs: addendum mayo 2026 a cronica general` (pendiente push)

### Resultado de build
- ✅ `pnpm build:gold` pasa sin errores
- ✅ UTF-8 verification passed

### Lección operativa registrada
Los agentes que crean archivos con nombres inconsistentes (mayúsculas vs minúsculas) pueden generar residuos que pasan por alto en procesos automatizados. La regla de purga debe ser defensiva: buscar todas las variaciones posibles de nombres, no solo el patrón canónico.

### Estado final del proyecto
**GREEN** ✅ — Memoria histórica de mayo consolidada, logs diarios purgados, convención de nombres blindada para futuras sesiones.

---

## Auditoría Qwen 3.7 Max — Cierre de sesión 2026-06-07

### Resumen de trabajos ejecutados

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Consolidación Crónica Mayo 2026 (`chronicles/2026-05.md`) | COMPLETADO |
| 2 | Addendum Mayo 2026 a `CRONICA-YAVLGOLD.md` | COMPLETADO |
| 3 | Blindaje AGENTS.md §4.3.1 — convención estricta de nombres daily-logs | COMPLETADO |
| 4 | Movimiento de `FICHA_TECNICA.md` a `apps/gold/docs/` | COMPLETADO |
| 5 | Actualización de referencias canónicas (AGENTS.md, MANIFIESTO, ROADMAP, AGENT_CONTEXT_INDEX) | COMPLETADO |
| 6 | Purga de logs diarios de mayo (incluyendo 2 residuales en mayúsculas) | COMPLETADO |
| 7 | Eliminación de `FICHA_TECNICA.md` duplicado de raíz | COMPLETADO |

### Commits pusheados a main
1. `docs: mover FICHA_TECNICA.md a apps/gold/docs/ y actualizar referencias canonicas` — 512aad2
2. `docs: eliminar FICHA_TECNICA.md duplicado de raiz`
3. `docs: consolidacion cronica mayo 2026 y actualizacion reporte activo`
4. `docs: actualizar reporte activo sesion 2026-06-07 el trabajo de los agentes fin.`

### Archivos residuales eliminados
- `apps/gold/docs/ops/DAILY_LOG_2026-05-22.md` — eliminado (contenido consolidado en crónica)
- `apps/gold/docs/ops/DAILY_LOG_2026-05-25.md` — eliminado (contenido consolidado en crónica)

### Reglas operativas confirmadas
- Los `daily-log-YYYY-MM-DD.md` en `apps/gold/docs/ops/` NUNCA se suben a GitHub
- Solo la Crónica mensual consolidada (`chronicles/YYYY-MM.md`) se versiona en el repo
- La carpeta `ops/` está en `.gitignore`
- Convención estricta de nombres: siempre minúsculas, formato exacto `daily-log-YYYY-MM-DD.md`

### Lección operativa registrada
Agentes que crean archivos con nombres inconsistentes (mayúsculas vs minúsculas) generan residuos que pasan por alto en procesos automatizados. La regla de purga debe ser defensiva: buscar todas las variaciones posibles de nombres, no solo el patrón canónico. Documentado en AGENTS.md §4.3.1.

### Estado final validado
**GREEN** — Memoria histórica de mayo consolidada, logs diarios purgados, convención de nombres blindada, referencias canónicas actualizadas. Sesión cerrada limpia.

*Auditoría realizada por Qwen 3.7 Max — sesión 2026-06-07.*

---

## Sesión 2026-06-08 — Auditoría Técnica, Índices de Performance y Hardening de Seguridad

### Estado: ✅ GREEN

### Objetivo
Resolver los hallazgos de la auditoría técnica de la base de datos de producción y Edge Functions, optimizando el rendimiento de claves foráneas y endureciendo la seguridad de funciones `SECURITY DEFINER`.

### Diagnóstico
1. **Performance**: Existen 25 claves foráneas en el módulo Agro (relacionadas con Fincas, Cultivos, Compradores y Ciclos) sin índices de cobertura eficaces (los índices existentes eran compuestos comenzando por `user_id`, lo cual no sirve para constreñir las comprobaciones referenciales o consultas que no involucran `user_id` al inicio).
2. **Seguridad en Funciones**:
   - `public.log_event(...)` permitía ejecución pública (rol `anon`), lo que exponía la base a inundación de logs.
   - Las funciones ejecutadas por triggers (`distribute_announcement_to_notifications`, `ensure_profile_exists`, `audit_admin_changes`) carecían de `search_path` explícito y permitían su ejecución a `PUBLIC`.
3. **Edge Functions**: `agro-assistant` con `verify_jwt = false` es seguro e intencional para permitir solicitudes de preflight OPTIONS de CORS; las llamadas reales son verificadas a mano a nivel de código TypeScript.

### Acciones Realizadas

#### 1. Creación de la Migración
- **Archivo**: [20260608214500_agro_performance_security_hardening.sql](file:///c:/Users/yerik/gold/supabase/migrations/20260608214500_agro_performance_security_hardening.sql)
- **Índices de Performance**: Creados 25 índices para todas las FKs de `agro_*` (incluyendo `farm_id`, `crop_id`, `buyer_id`, `cycle_id`).
- **Hardening de Funciones**:
  - Recreadas las 5 funciones `SECURITY DEFINER` aplicando `SET search_path = ''` y calificando todas las referencias.
  - Revocados privilegios de ejecución de `public.log_event` del rol público (`anon` / `PUBLIC`), limitando solo a `authenticated` y `service_role`.
  - Revocados privilegios de ejecución pública en funciones exclusivas de triggers.

#### 2. Validación y Build
- **SQL Dry-Run**: Validada la migración en la base activa con un bloque `BEGIN ... ROLLBACK`. Resultado conforme (0 errores).
- **Vite Build**: Ejecutado `pnpm build:gold` con paso exitoso de todas las comprobaciones y guardrails de UTF-8.

### Commits
- `feat(db): migración de índices de performance y hardening de seguridad` (creación de la migración `20260608214500_agro_performance_security_hardening.sql`)

### Estado final del proyecto
**GREEN** ✅ — Optimización de consultas lista y seguridad de la base de datos blindada contra secuestro de ruta de búsqueda.

*Auditoría y corrección realizada por Antigravity — sesión 2026-06-08.*

---

## Sesión 2026-06-08 — Fase 1: Reorganización Navegación Hub

**Objetivo**: Reforzar jerarquía canónica Finca → Cultivos removiendo "Mis Cultivos" como acceso directo del hub "Mi Granja".

### Diagnóstico
- **Hallazgo crítico**: El prompt original apuntaba a `agro-shell.js`, pero las cards del hub son HTML estático en `index.html` (líneas 579-598). `agro-shell.js` es solo router — no necesita cambios.
- Función que renderiza el hub: HTML estático en `<div data-agro-mobile-panel="operacion">` (index.html línea 572).
- Líneas modificadas: 579-584 (título + card eliminada).

### Archivos modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/agro/index.html` | edición | Título sección "Ciclos de cultivos" → "Mis fincas y cultivos". Eliminada card hub "Mis cultivos" (5 líneas). Sidebar intacto. |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | edición | §3.1 actualizado (eliminado "Mis cultivos" de lista hub). Caso 9 actualizado (navegación principal ahora entra por "Mis Fincas"). |
| `apps/gold/docs-agro.html` | edición | Sección "Dentro de Granja encuentras": reemplazado "Mis cultivos" por "Mis Fincas" como entrada principal con acceso a cultivos desde cada finca. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | adición | Documentación de esta sesión. |

### Build
✅ `pnpm build:gold` — OK (agent-guard OK, agent-report-check OK, vite build OK en 5.13s, UTF-8 OK)

### QA sugerido
1. Navegar a `yavlgold.com/agro#view=granja` → verificar que NO aparece card "Mis Cultivos" en el hub.
2. Verificar que la sección se llama "Mis fincas y cultivos".
3. Verificar que "Mis Fincas", "Estadísticas de ciclos", "Comparar ciclos" están presentes en el hub.
4. En el sidebar, verificar que "Mis cultivos" sigue como enlace directo.
5. Navegar a `#view=ciclos&subview=mis-cultivos` → verificar que la vista carga correctamente.
6. Entrar a una finca y verificar que "Ver cultivos" funciona.

### Scope respetado
- No se tocaron: `agro-shell.js`, `agro.js`, `agro-farms.js`, `ADN-VISUAL-V11.0.md`, `FICHA_TECNICA.md`.
- Sidebar "Mis cultivos" intacto (no estaba en scope).
- Ruta `#view=ciclos&subview=mis-cultivos` sigue operativa (router sin cambios).

---

## Sesión 2026-06-08 — Fase 2: Reorganización Mis Cultivos y Mis Fincas

**Objetivo**: Mover acciones estadísticas/comparación al interior de Mis Cultivos, corregir duplicados en Mis Fincas, ajustar Volver para jerarquía Finca → Cultivos.

### Diagnóstico
- **Hub cards**: "Estadísticas de ciclos" y "Comparar ciclos" eran HTML estático en index.html (ex-líneas 585-594).
- **Botones header**: El `<div class="header-actions">` (línea 1090) es compartido por todas las subvistas de ciclos. Visibilidad controlada por `syncCultivosSubview`.
- **Volver**: Handler en agro-shell.js (línea 1372) siempre navegaba al hub. Modificado para subview-aware back (mis-cultivos → mis-fincas).
- **Duplicados Mis Fincas**: `renderFarmsView` en agro-farms.js (líneas 380-395) renderizaba header bar EXTRA con título/subtítulo/botón duplicados. El shell ya proveía estos elementos.

### Archivos modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `apps/gold/agro/index.html` | edición | Eliminadas cards "Estadísticas" y "Comparar" del hub. Agregados botones "Estadísticas de cultivos", "Comparar cultivos" y "Comparar fincas" en header compartido. |
| `apps/gold/agro/agro-shell.js` | edición | `syncCultivosSubview`: visibilidad de nuevos botones según subview activa. Handler Volver: desde mis-cultivos navega a mis-fincas. |
| `apps/gold/agro/agro-farms.js` | edición | Eliminado header bar duplicado en `renderFarmsView`. Expuesto `compareFarms()` en `window._agroFarms`. |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | edición | §3.1 reestructurado con Mis Cultivos conteniendo botones de acción. §4.3 renombrado a "Estadísticas/Comparar cultivos". Caso 9 actualizado. |
| `apps/gold/docs-agro.html` | edición | Referencia "Estadisticas y comparadores" actualizada para reflejar nueva ubicación. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | adición | Documentación de esta sesión. |

### Build
✅ `pnpm build:gold` — OK (agent-guard OK, agent-report-check OK, vite build OK en 3.63s, UTF-8 OK)

### QA sugerido
1. Navegar a `yavlgold.com/agro#view=granja` → sección "Mis fincas y cultivos" solo tiene card "Mis Fincas".
2. Navegar a mis-cultivos → verificar 3 botones: "+ Nuevo Cultivo", "Estadísticas de cultivos", "Comparar cultivos".
3. Click "Estadísticas de cultivos" → subview estadísticas carga correctamente.
4. Click "Comparar cultivos" → subview comparar carga correctamente.
5. Click "Volver" desde mis-cultivos → llega a mis-fincas (NO al hub).
6. Navegar a mis-fincas → verificar UN solo título, UN solo "Nueva Finca", botón "Comparar fincas" visible.
7. Sidebar mantiene enlaces a todas las subvistas incluyendo mis-cultivos.

### Scope respetado
- No se tocaron: `agro.js`, `ADN-VISUAL-V11.0.md`, `FICHA_TECNICA.md`.
- Sidebar mantiene enlaces a todas las subvistas.
- Rutas `#view=ciclos&subview=estadisticas` y `#view=ciclos&subview=comparar` siguen operativas.
