# PLAN BASELINE AGRO — Supabase canónico raíz

## 1. Resumen ejecutivo

Se diagnosticó el estado de los objetos Agro definidos en `apps/gold/supabase/agro_schema.sql` contra el remoto real y las migraciones raíz actuales.

**Conclusión principal**: `agro_schema.sql` es un **snapshot histórico obsoleto** de `agro_crops` y `agro_roi_calculations`. El remoto ya superó ese contrato. La raíz tiene parches posteriores que presuponen la existencia de ambas tablas pero no contiene una base inicial equivalente. El bloqueo actual no es funcional (producción funciona) sino de trazabilidad local: la raíz no puede reconstruir `agro_crops` ni `agro_roi_calculations` desde cero sin una base canónica explícita.

**Recomendación**: crear una migración baseline forward-only que represente el estado actual real del remoto para `agro_crops` y `agro_roi_calculations`, sin copiar `agro_schema.sql` tal cual.

---

## 2. Qué representa hoy agro_schema.sql

**Veredicto: snapshot histórico obsoleto.**

`agro_schema.sql` fue escrito el 2026-01-10 (YavlGold V9.4). Define:

- **Tabla `agro_crops`** con 13 columnas, estados `growing/ready/attention/harvested`, índices por `user_id` y `status`, trigger `updated_at`, RLS con 4 políticas CRUD por usuario.
- **Tabla `agro_roi_calculations`** con 9 columnas, índices por `user_id` y `created_at`, RLS con 3 políticas (SELECT, INSERT, DELETE).
- **Comentarios de documentación** en tablas y columnas.
- **Datos de ejemplo** comentados (no funcionales).

Razones por las que **no es baseline útil**:

1. Los estados de `agro_crops` (`growing`, `ready`, `attention`, `harvested`) ya fueron reemplazados. La migración raíz `20260224200000_agro_crops_status_allow_lost.sql` cambió el check a `sembrado/creciendo/produccion/finalizado/lost`.
2. El remoto tiene 19 columnas en `agro_crops`, no 13. Incluye `revenue_projected`, `deleted_at`, `status_mode`, `status_override` y columnas multi-moneda que no existen en `agro_schema.sql`.
3. La migración `20260226190000_agro_crops_investment_multicurrency.sql` añadió 6 columnas de inversión multi-moneda.
4. El patch `supabase/sql/agro_crops_status_override_v1.sql` añadió `status_mode` y `status_override`.
5. El remoto registró `20260110152501 agro_module_schema` como la migración que creó las tablas, no este archivo.

Razones por las que **no es evidencia histórica pura**:

- Documenta el origen conceptual del módulo Agro.
- Muestra el contrato inicial pensado para cultivos y ROI.
- Pero no coincide con el estado real ni con el orden histórico del remoto.

**Clasificación final: mezcla ambigua que tiende a snapshot viejo. No debe usarse como canon, pero tampoco debe descartarse sin reemplazo.**

---

## 3. Comparación contra remoto

### 3.1 agro_crops

| Aspecto | agro_schema.sql | Remoto real |
|---|---|---|
| Columnas | 13 (id, user_id, name, variety, icon, status, progress, area_size, investment, start_date, expected_harvest_date, actual_harvest_date, notes, created_at, updated_at) | 19+ (incluye revenue_projected, deleted_at, status_mode, status_override, investment_amount, investment_currency, investment_usd_equiv, investment_fx_usd_cop, investment_fx_usd_ves, investment_fx_at) |
| Status check | `growing, ready, attention, harvested` | `sembrado, creciendo, produccion, finalizado, lost` |
| Índices | user_id, status | user_id, status + otros derivados de parches |
| Trigger | `update_agro_crops_timestamp()` | Existe trigger updated_at |
| RLS | Habilitado, 4 políticas propias | Habilitado, políticas pueden diferir en nombre |
| FK a auth.users | ON DELETE CASCADE | Presumiblemente igual |
| Migración remota origen | No coincide; remoto usa `20260110152501 agro_module_schema` | Registrada en `schema_migrations` |

### 3.2 agro_roi_calculations

| Aspecto | agro_schema.sql | Remoto real |
|---|---|---|
| Columnas | 9 (id, user_id, investment_amount, projected_revenue, quantity_kg, calculated_profit, roi_percentage, crop_id, notes, created_at) | Existe en remoto con estructura similar |
| Índices | user_id, created_at DESC | Presumiblemente presentes |
| RLS | Habilitado, 3 políticas (SELECT, INSERT, DELETE) | Habilitado |
| FK a agro_crops | ON DELETE SET NULL | Presumiblemente igual |

### 3.3 Objetos auxiliares

| Objeto | agro_schema.sql | Remoto |
|---|---|---|
| Función `update_agro_crops_timestamp()` | Definida | Existe; puede tener otro nombre o firma |
| Trigger `trigger_agro_crops_updated` | Definido | Existe |

---

## 4. Comparación contra migraciones raíz

### Migraciones raíz que alteran agro_crops

| Migración | Cambio sobre agro_crops |
|---|---|
| `20260224200000_agro_crops_status_allow_lost.sql` | Reemplaza check de status a `sembrado/creciendo/produccion/finalizado/lost` |
| `20260226190000_agro_crops_investment_multicurrency.sql` | Añade 6 columnas de inversión multi-moneda + backfill |
| `20260416190000_consolidate_legacy_app_supabase_objects.sql` | Crea `agro_operational_cycles` y `agro_operational_movements` **condicionado a que `agro_crops` exista** |
| `20260404120000_agro_task_cycles_v1.sql` | Crea `agro_task_cycles` con FK a `agro_crops(id)` |

### Parches SQL auxiliares que alteran agro_crops

| Archivo | Cambio |
|---|---|
| `supabase/sql/agro_crops_status_override_v1.sql` | Añade columnas `status_mode` y `status_override` |
| `supabase/sql/agro_rankings_rpc_v1.sql` | Asegura RLS en `agro_crops` (no altera estructura) |

### Migraciones raíz que referencian agro_roi_calculations

**Ninguna.** `agro_roi_calculations` no aparece en ninguna migración raíz. Solo existe en `agro_schema.sql` y en el remoto.

### Gap identificado

Las migraciones raíz presuponen que `agro_crops` ya existe (ALTER TABLE, FK references), pero **ninguna migración raíz crea `agro_crops` ni `agro_roi_calculations`**. Esto significa que un `supabase db reset` desde raíz fallaría al intentar alterar o referenciar tablas que no existen.

---

## 5. Piezas aún no bien representadas

### 5.1 Tabla `agro_crops` — base faltante

La raíz no tiene una migración que haga `CREATE TABLE agro_crops`. Las migraciones existentes solo hacen `ALTER TABLE` o `REFERENCES`. Esto es el **gap principal**.

**Qué falta**:
- Creación de la tabla con las columnas base actuales (no las de `agro_schema.sql` sino las del remoto real).
- Status check actual (`sembrado/creciendo/produccion/finalizado/lost`).
- Columnas multi-moneda ya incluidas.
- Columnas `revenue_projected`, `deleted_at`, `status_mode`, `status_override`.
- Índices actuales.
- Trigger `updated_at`.
- RLS y políticas.

### 5.2 Tabla `agro_roi_calculations` — base faltante

La raíz no tiene ninguna migración que cree esta tabla. Solo existe en `agro_schema.sql` y en el remoto.

**Qué falta**:
- `CREATE TABLE IF NOT EXISTS` con las columnas actuales del remoto.
- Índices.
- RLS y políticas.

### 5.3 Función `update_agro_crops_timestamp()` — puede estar cubierta

La migración de consolidación `20260416190000` define `update_updated_at()` como función genérica. Pero `agro_schema.sql` define `update_agro_crops_timestamp()` como función específica. Si el remoto usa la función específica, la base necesita crear esa función también.

---

## 6. Recomendación de baseline canónico

### Estrategia: migración baseline forward-only

Crear una migración raíz nueva con timestamp posterior a todas las existentes:

`supabase/migrations/20260417000000_agro_crops_and_roi_baseline.sql`

**Principios**:
1. Forward-only: no intenta reproducir historia vieja.
2. Idempotente: `CREATE TABLE IF NOT EXISTS`, creación condicionada de índices/constraints/políticas.
3. Representa el estado **actual** del remoto, no el estado histórico de `agro_schema.sql`.
4. No altera datos existentes.
5. No reemplaza las migraciones ALTER existentes que ya corren sobre la tabla.

**Contenido propuesto**:

1. `CREATE TABLE IF NOT EXISTS public.agro_crops (...)` con TODAS las columnas actuales del remoto.
2. Status check actual: `sembrado/creciendo/produccion/finalizado/lost`.
3. Columnas multi-moneda incluidas desde la base.
4. `CREATE TABLE IF NOT EXISTS public.agro_roi_calculations (...)`.
5. Índices si no existen.
6. Función trigger si no existe.
7. RLS + políticas solo si no existen.
8. Guard global: si la tabla ya existe (remoto), todo se salta limpiamente.

**Qué NO debe hacer esta migración**:
- No copiar `agro_schema.sql` tal cual.
- No usar estados viejos (`growing/ready/attention/harvested`).
- No hacer backfill de datos.
- No borrar ni reemplazar políticas existentes.

### Dependencias

Antes de crear esta migración, se necesita:
1. Consultar el DDL exacto del remoto para `agro_crops` y `agro_roi_calculations` (columnas, tipos, constraints, índices, triggers, políticas).
2. Verificar que las migraciones ALTER posteriores sean compatibles con la base propuesta (idempotentes con `IF NOT EXISTS`).
3. Confirmar que `agro_roi_calculations` no tiene columnas adicionales en remoto vs `agro_schema.sql`.

---

## 7. Qué faltaría para retirar apps/gold/supabase

Antes de poder eliminar o archivar `apps/gold/supabase/`:

1. **Baseline de `agro_crops` y `agro_roi_calculations` en raíz**: la migración propuesta arriba.
2. **Verificar que las 7 migraciones legacy restantes ya están cubiertas**: la consolidación `20260416190000` ya cubre announcements, app_admins, notifications, feedback, user_favorites, user_onboarding_context, columnas IA de farmer_profile, operational cycles y movements.
3. **Verificar `agro_period_cycles`**: ya existe en raíz con mismo nombre y hash.
4. **Verificar `agro_schema.sql`**: una vez que el baseline cubra `agro_crops` y `agro_roi_calculations`, este archivo queda como evidencia histórica pura y puede archivarse.
5. **Validar la migración de consolidación** en un entorno controlado antes de producción.
6. **Confirmar que ningún flujo operativo** (scripts, agentes, documentación) instruye crear migraciones en `apps/gold/supabase/`.
7. **Confirmar que `pnpm sb:*` y flujos locales** ya usan solo `supabase/` raíz.

Solo después de todo lo anterior se puede archivar o eliminar `apps/gold/supabase/`.

---

## 8. Veredicto final

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Qué representa hoy `agro_schema.sql`? | Snapshot histórico obsoleto. Define un contrato de `agro_crops` y `agro_roi_calculations` que ya fue superado por el remoto. No es baseline útil ni evidencia histórica pura. |
| 2 | ¿Qué objetos define que aún importan? | `agro_crops` (tabla base), `agro_roi_calculations` (tabla), `update_agro_crops_timestamp()` (función), `trigger_agro_crops_updated` (trigger), 7 políticas RLS, 4 índices. |
| 3 | ¿Qué parte ya está cubierta por remoto? | Ambas tablas existen. `agro_crops` remoto tiene 19+ columnas (vs 13 del schema). `agro_roi_calculations` existe. RLS habilitado en ambas. |
| 4 | ¿Qué parte ya está cubierta por migraciones raíz? | Alteraciones posteriores: status check, multi-moneda, status_override. Pero NINGUNA migración raíz crea las tablas base. |
| 5 | ¿Qué parte no está bien representada en el canon? | La creación base de `agro_crops` y `agro_roi_calculations`. Un `db reset` desde raíz fallaría. |
| 6 | ¿Cuál debe ser el baseline canónico hacia adelante? | Una migración baseline forward-only e idempotente que represente el estado actual del remoto, con todas las columnas actuales, no las históricas de `agro_schema.sql`. |
| 7 | ¿Qué falta antes de retirar `apps/gold/supabase/`? | Baseline de Agro (esta migración), validación de consolidación en entorno controlado, confirmación de flujos operativos. |

### Tabla obligatoria de piezas Agro

| Pieza Agro | Estado en agro_schema.sql | Estado en remoto | Estado en raíz | Acción recomendada | Riesgo |
|---|---|---|---|---|---|
| `agro_crops` (CREATE TABLE base) | Define 13 columnas con status `growing/ready/attention/harvested` | Existe con 19+ columnas, status `sembrado/creciendo/produccion/finalizado/lost`, columnas multi-moneda, `revenue_projected`, `deleted_at`, `status_mode`, `status_override` | NO existe como CREATE TABLE; solo ALTER TABLE posteriores | Crear migración baseline con estado actual del remoto | **Alto** — sin esto, `db reset` falla |
| `agro_crops.status` check | `growing, ready, attention, harvested` | `sembrado, creciendo, produccion, finalizado, lost` | ALTER en `20260224200000` | Incluir en baseline con contrato actual | Medio |
| `agro_crops` columnas multi-moneda | No existen | Existen (6 columnas) | ALTER en `20260226190000` | Incluir en baseline | Medio |
| `agro_crops` columnas status override | No existen | Existen (`status_mode`, `status_override`) | Patch en `sql/agro_crops_status_override_v1.sql` | Incluir en baseline | Bajo |
| `agro_crops` columnas `revenue_projected`, `deleted_at` | No existen | Existen | No representadas en raíz | Incluir en baseline tras verificar remoto | Medio |
| `agro_crops` índice user_id | `idx_agro_crops_user_id` | Existe | No representado | Incluir en baseline si no existe | Bajo |
| `agro_crops` índice status | `idx_agro_crops_status` | Existe | No representado | Incluir en baseline si no existe | Bajo |
| `agro_crops` trigger updated_at | `update_agro_crops_timestamp()` | Existe | No representado (hay `update_updated_at()` genérica) | Incluir en baseline con verificación | Bajo |
| `agro_crops` RLS + políticas | 4 políticas (SELECT/INSERT/UPDATE/DELETE) | Habilitado con políticas | No representado | Incluir en baseline solo si no existen | Medio |
| `agro_roi_calculations` (CREATE TABLE base) | Define 9 columnas, FK a agro_crops | Existe | NO existe en raíz | Crear en baseline | **Alto** |
| `agro_roi_calculations` índices | user_id, created_at DESC | Presumiblemente existen | No representados | Incluir en baseline | Bajo |
| `agro_roi_calculations` RLS + políticas | 3 políticas (SELECT/INSERT/DELETE) | Habilitado | No representado | Incluir en baseline solo si no existen | Medio |
| `update_agro_crops_timestamp()` (función) | Definida | Existe | No representada (hay genérica) | Incluir en baseline | Bajo |
| Datos de ejemplo | Comentados (no funcionales) | No aplica | No aplica | No incluir | Nulo |
| Comentarios de documentación | Definidos | Presumiblemente existen | No representados | Incluir en baseline | Bajo |

---

*Documento generado: 2026-04-16*
*Sesión: diagnóstico y plan de baseline Agro Supabase — solo lectura, comparación y recomendación*
*No se retiró `apps/gold/supabase/`. No se crearon migraciones. No se hicieron cambios destructivos.*
