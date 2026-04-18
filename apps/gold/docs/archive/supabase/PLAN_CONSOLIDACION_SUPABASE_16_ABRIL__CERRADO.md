# PLAN DE CONSOLIDACIÓN — Supabase canónico raíz

## 1. Resumen ejecutivo

Se entró en fase de consolidación canónica sin retirar el árbol secundario `apps/gold/supabase/`.

Resultado: se creó una migración nueva en el canon raíz:

`supabase/migrations/20260416190000_consolidate_legacy_app_supabase_objects.sql`

La migración no reescribe historia vieja ni copia timestamps legacy. Representa en `supabase/` raíz objetos vivos que nacieron en `apps/gold/supabase/` o que ya existen en remoto por otra vía. Está diseñada como forward-only e idempotente: usa `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, creación condicionada de políticas y checks protegidos cuando aplica.

No se borró, movió, archivó ni fusionó `apps/gold/supabase/`.

La consolidación cubre estas piezas vivas:

- `announcements`
- `app_admins`
- `notifications`
- `feedback`
- `user_favorites`
- `user_onboarding_context`
- columnas IA de `agro_farmer_profile`
- `agro_operational_cycles`
- `agro_operational_movements`

No se consolidó `agro_schema.sql` como migración directa porque representa una base histórica de `agro_crops` y `agro_roi_calculations` ya superada por el remoto. Además, el problema de base Agro en raíz requiere una estrategia de baseline/historial más cuidadosa: una migración nueva con timestamp actual no corrige por sí sola el orden histórico de migraciones previas que ya presuponen `agro_crops`.

## 2. Piezas evaluadas

Se evaluaron las 7 migraciones vivas exclusivas detectadas en `apps/gold/supabase/migrations/`, más `agro_schema.sql` y la migración de ciclos de período ya copiada a raíz.

Piezas leídas:

- `apps/gold/supabase/migrations/20260108100000_create_announcements.sql`
- `apps/gold/supabase/migrations/20260108100500_create_app_admins.sql`
- `apps/gold/supabase/migrations/20260108101000_create_notifications_feedback.sql`
- `apps/gold/supabase/migrations/20260108101500_create_user_favorites.sql`
- `apps/gold/supabase/migrations/20260311113000_create_user_onboarding_context.sql`
- `apps/gold/supabase/migrations/20260313170000_add_ia_context_to_farmer_profile.sql`
- `apps/gold/supabase/migrations/20260318120000_create_agro_operational_cycles.sql`
- `apps/gold/supabase/migrations/20260411130000_create_agro_period_cycles.sql`
- `apps/gold/supabase/agro_schema.sql`

Evidencia remota relevante:

- Todas las tablas vivas consultadas tienen RLS habilitado.
- No se detectaron filas inválidas para checks de tipos, roles, onboarding, favoritos duplicados ni ciclos operativos.
- `app_admins` existe en remoto sin el check `app_admins_role_check`; la nueva migración lo agrega de forma protegida si falta.
- `announcements` existe en remoto, pero no se observaron los índices `idx_announcements_active` ni `idx_announcements_created`; la nueva migración los agrega si faltan.
- `notifications` tiene políticas duplicadas de lectura en remoto; la migración raíz crea solo la política canónica si falta, sin borrar las existentes.
- `feedback` y `agro_feedback` son tablas distintas. La consolidación cubre `feedback`; no mezcla ni reemplaza `agro_feedback`.
- `agro_period_cycles` ya tiene archivo raíz con mismo hash que el secundario.

## 3. Tabla de decisión por pieza

| Pieza | Define | Estado remoto | Estado en raíz | Acción | ¿Migración nueva? | Riesgo |
|---|---|---|---|---|---|---|
| `20260108100000_create_announcements.sql` | Tabla `announcements`, RLS, lectura de anuncios activos, índices `is_active` y `created_at` | Tabla y políticas existen; índices legacy no observados; política remota usa nombre distinto al archivo viejo | No estaba representada como migración raíz | `add_root_idempotent_migration` | Sí, en `20260416190000_consolidate_legacy_app_supabase_objects.sql` | Medio |
| `20260108100500_create_app_admins.sql` | Tabla `app_admins`, RLS, lectura propia de rol admin, política admin sobre `announcements` | Tabla existe; política existe; no se observó check de `role`; no hay roles inválidos | No estaba representada como migración raíz | `add_root_idempotent_migration` | Sí | Medio |
| `20260108101000_create_notifications_feedback.sql` | Tablas `notifications` y `feedback`, RLS, índices, checks de tipo | Tablas, checks, índices y políticas existen; hay una política de lectura duplicada en `notifications` | Raíz solo tenía `agro_feedback`, no `feedback` ni `notifications` | `add_root_idempotent_migration` | Sí | Medio |
| `20260108101500_create_user_favorites.sql` | Tabla `user_favorites`, unique `(user_id, module_key)`, RLS, índices | Tabla, unique, índices y política existen; no hay duplicados | No estaba representada como migración raíz | `add_root_idempotent_migration` | Sí | Bajo |
| `20260311113000_create_user_onboarding_context.sql` | Tabla `user_onboarding_context`, checks, trigger `updated_at`, RLS | Tabla, checks, trigger y políticas existen; aparece en remoto con otro timestamp | No estaba representada como migración raíz | `add_root_idempotent_migration` | Sí | Bajo |
| `20260313170000_add_ia_context_to_farmer_profile.sql` | Columnas `experience_level`, `farm_type`, `assistant_goals` y checks en `agro_farmer_profile` | Columnas y checks existen; aparece en remoto con otro timestamp | `agro_farmer_profile` base existe en raíz, pero estas columnas no estaban representadas ahí | `add_root_idempotent_migration` | Sí | Bajo |
| `20260318120000_create_agro_operational_cycles.sql` | Tablas `agro_operational_cycles` y `agro_operational_movements`, checks, trigger, RLS | Tablas, checks, trigger y políticas existen; aparece en remoto con otro timestamp | No estaba representada como migración raíz; SQL auxiliar raíz ya las menciona como opcionales | `add_root_idempotent_migration` | Sí, con guard si falta `agro_crops` | Medio |
| `20260411130000_create_agro_period_cycles.sql` | Tabla `agro_period_cycles`, unique parcial, trigger, RLS | Tabla existe; no apareció en `schema_migrations` remoto consultado | Ya existe en raíz con mismo nombre y hash | `document_equivalence` | No | Bajo |
| `agro_schema.sql` | Base histórica `agro_crops` y `agro_roi_calculations`, RLS, índices, trigger de cultivos | Ambas tablas existen; `agro_crops` remoto está más avanzado que el schema histórico | Raíz tiene parches posteriores que presuponen `agro_crops`, pero no una base equivalente clara | `manual_review_required` | No en esta fase | Alto |

## 4. Migraciones nuevas propuestas o creadas

Se creó:

`supabase/migrations/20260416190000_consolidate_legacy_app_supabase_objects.sql`

Contenido funcional:

- Crea o preserva `announcements`.
- Crea índices faltantes de `announcements`.
- Crea o preserva `app_admins`.
- Agrega `app_admins_role_check` si falta, de forma protegida.
- Crea o preserva `notifications`.
- Crea o preserva `feedback`.
- Crea o preserva `user_favorites`.
- Crea o preserva `user_onboarding_context` y su trigger `updated_at`.
- Agrega columnas IA a `agro_farmer_profile` si existen las condiciones.
- Crea o preserva ciclos operativos y movimientos si `agro_crops` existe.
- Crea políticas RLS solo cuando no existe la política con el nombre canónico elegido.

No se ejecutó esta migración contra remoto desde esta sesión. Solo quedó versionada en `supabase/` raíz para revisión/aplicación posterior.

### Por qué no se copiaron los SQL antiguos

Copiar los archivos legacy tal cual habría creado una historia falsa:

- timestamps viejos dentro del árbol raíz;
- políticas con nombres que no siempre coinciden con remoto;
- diferencias como `app_admins` sin check remoto o `announcements` con índices faltantes;
- posible confusión entre `feedback` y `agro_feedback`.

La opción correcta fue crear una migración nueva, explícita y de consolidación.

## 5. Piezas que requieren revisión manual

### `agro_schema.sql`

No debe migrarse tal cual.

Razones:

- define una versión antigua de `agro_crops` con estados históricos (`growing`, `ready`, `attention`, `harvested`);
- el remoto actual usa un contrato más avanzado para `agro_crops`;
- `agro_crops` remoto tiene columnas adicionales como `revenue_projected`, `deleted_at`, `status_mode`, `status_override`;
- raíz ya tiene migraciones posteriores que alteran `agro_crops`, pero no contiene una base inicial clara equivalente a `agro_module_schema`;
- una migración nueva con timestamp actual no arregla el orden histórico si se pretende reconstruir desde cero con todas las migraciones raíz.

Acción recomendada: diseñar una estrategia de baseline canónico para Agro base. Puede ser una migración forward-only para proyectos existentes o una decisión formal de snapshot/baseline, pero no debe hacerse copiando `agro_schema.sql`.

### Drift de `schema_migrations`

El remoto tiene registros de migración que no existen como archivos raíz locales, y varios objetos vivos aparecen con timestamps distintos a los archivos secundarios.

No se debe “arreglar” esto inventando archivos viejos. Se debe documentar equivalencia o crear migraciones actuales idempotentes, como se hizo en esta fase.

## 6. Qué faltaría antes de retirar apps/gold/supabase

Antes de retirar el árbol secundario falta:

1. Revisar manualmente `agro_schema.sql` y decidir baseline de `agro_crops` / `agro_roi_calculations`.
2. Revisar si el repo debe conservar un documento de equivalencia entre migraciones remotas históricas y archivos actuales.
3. Aplicar o validar la migración de consolidación en un entorno controlado antes de producción.
4. Confirmar que `pnpm sb:*` y cualquier flujo local ya usan solo `supabase/` raíz.
5. Confirmar que ningún documento operativo vivo sigue instruyendo crear migraciones en `apps/gold/supabase/`.
6. Recién después archivar o eliminar `apps/gold/supabase/`.

## 7. Recomendación explícita

La consolidación correcta ya puede empezar desde raíz, pero el retiro del árbol secundario todavía debe esperar.

Recomendación:

- Mantener `supabase/` raíz como único canon.
- Revisar y aplicar la nueva migración de consolidación en un entorno controlado.
- No tocar ni borrar `apps/gold/supabase/` hasta resolver el baseline de `agro_schema.sql`.
- Tratar `apps/gold/supabase/` como evidencia histórica temporal.
- En la próxima fase, decidir formalmente cómo representar `agro_crops` y `agro_roi_calculations` en el canon raíz sin romper el historial existente.
