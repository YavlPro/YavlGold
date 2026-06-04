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
- Ficha técnica disponible en raíz: `FICHA_TECNICA.md`.
- Supabase canónico: `supabase/` en raíz.
- Fase actual aprobada: **Fase 1 completada en código**; **QA manual pendiente**.

## Frentes abiertos

- Agro V1: mantener separación semántica entre Facturero de Clientes, Facturero de la Finca y Mis Clientes.
- Facturero de Clientes: corregir UX de creación/vinculación de clientes sin mezclar intención del usuario.
- Agro V1: validar Fase 1 en producción antes de avanzar a Fase 2.
- Agro V1: diseñar/implementar Fase 2 — Dashboard de Finca con 3 métricas críticas.
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

- `agro.js` sigue siendo monolito legacy; evitar crecimiento.
- `agrocompradores.js` contiene el wizard/ficha de compradores de Cartera Viva y requiere cirugía localizada.
- `index.html` conserva markup legacy del modal de buyer; cualquier copy visible ahí debe seguir humano aunque el wizard lo reemplace dinámicamente.
- `linked_user_id` existe como campo interno opcional; no se debe guardar correo/nombre/finca en una columna UUID.
- MutationObservers y listeners en módulos Agro deben revisarse para evitar acumulación en navegación repetida.
- CSS de facturero de finca debería migrarse a archivo propio en vez de crecer en `agro-facturero-finca.css`.

## Últimos cambios importantes todavía relevantes

- **2026-06-03**: Fase 1 completada en código: movimientos generales de finca con badge `🏠 Finca: {name}` en Facturero de la Finca.
- **2026-06-03**: Migración SQL agrega `farm_id UUID` en tablas de movimientos.
- **2026-06-03**: Build pasa; commit `a47f3b2` pusheado a `origin/main`.
- Build gate verificado tras cambios de Fase 1.

## Referencias a archivos archivados relevantes

- `AGENT_LEGACY_CONTEXT__2026-05-05__2026-06-03.md`
- `apps/gold/docs/AGENT_REPORT.md`

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

## Sesión 2026-06-04 — Fix de Migración Fantasma (Ciclos Operativos)

### Objetivo
Corregir la "migración fantasma" que causó que las columnas `farm_id` en las tablas `agro_operational_cycles` y `agro_operational_movements` no se crearan en la base de datos remota debido al tracking de checksums de Supabase.

### Diagnóstico
La migración original `20260603120000_agro_farm_movements.sql` fue modificada después de haber sido aplicada en producción. Supabase asumió que la migración ya estaba aplicada por su nombre y omitió los nuevos cambios (la adición de `farm_id` a los ciclos operativos).

### Acciones realizadas
1. **Creación de nueva migración**: Se creó el archivo [20260604120000_agro_operational_farm_id.sql](file:///C:/Users/yerik/gold/supabase/migrations/20260604120000_agro_operational_farm_id.sql) con la alteración explícita para las tablas `agro_operational_cycles` y `agro_operational_movements`.
2. **Ejecución**: Se corrió exitosamente `npx supabase db push`.
3. **Verificación**: Se ejecutó query SQL remota confirmando la creación exitosa del campo `farm_id` UUID en ambas tablas.
4. **Build**: Se ejecutó `pnpm build:gold` con éxito pasando todos los checks pre y post build.

### Estado final
**GREEN** — Fix aplicado y verificado. Columnas creadas en base de datos.
