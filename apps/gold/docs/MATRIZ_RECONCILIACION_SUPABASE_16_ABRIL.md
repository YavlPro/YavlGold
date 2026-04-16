# MATRIZ DE RECONCILIACIÓN — Supabase raíz vs apps/gold/supabase vs remoto

## 1. Resumen ejecutivo

La reconciliación confirma el canon vigente: `supabase/` en la raíz debe seguir siendo la única carpeta Supabase canónica del repo.

Pero también confirma que `apps/gold/supabase/` no puede borrarse todavía sin una fase corta de preservación técnica. La carpeta secundaria contiene 8 migraciones, un `agro_schema.sql`, configuración local y metadata de CLI. De esas 8 migraciones, solo una está ya copiada en `supabase/` raíz con el mismo nombre y el mismo hash: `20260411130000_create_agro_period_cycles.sql`.

Las otras 7 migraciones existen solo en `apps/gold/supabase/migrations/` por nombre y por hash. Varias de sus tablas ya existen en el remoto real, y algunas aparecen en `supabase_migrations.schema_migrations` con otro timestamp o por otra vía. Eso significa que el problema principal no es que falte todo en producción; el problema es la trazabilidad y la reproducibilidad local desde el canon raíz.

Estado resumido:

- `apps/gold/supabase/`: árbol secundario no canónico, con piezas históricas todavía útiles como evidencia.
- `supabase/` raíz: canon operativo del repo, con `project-ref`, Edge Function real y migraciones actuales, pero no contiene todas las migraciones históricas que viven en el remoto o en el árbol secundario.
- Remoto `gerzlzprkarikblqxpjt`: contiene tablas y políticas relacionadas con varias piezas del árbol secundario, pero su historial de migraciones no calza uno a uno con los archivos locales secundarios.

Conclusión: no ejecutar saneamiento final todavía. La próxima fase debe convertir las piezas útiles de `apps/gold/supabase/` en evidencia reconciliada, migraciones canónicas idempotentes o documentación de descarte antes de archivar o eliminar el árbol secundario.

## 2. Criterio de comparación

Se comparó:

- Inventario completo de `apps/gold/supabase/`.
- Inventario relevante de `supabase/` raíz: `config.toml`, `.temp`, `migrations/`, `functions/`, `sql/`.
- Hash y nombre de migraciones entre ambos árboles.
- Estado remoto real del proyecto Supabase `gerzlzprkarikblqxpjt`.
- `supabase_migrations.schema_migrations` remoto.
- Existencia de tablas, columnas y políticas RLS remotas.
- Edge Functions remotas.
- Referencias vivas en frontend y documentación operativa.

Consultas remotas realizadas solo en modo lectura:

- listado de migraciones remotas;
- listado de Edge Functions;
- `information_schema.columns` para tablas relevantes;
- `pg_policies` para políticas RLS relevantes.

No se ejecutó `db push`, `db reset`, deploy de funciones, creación de migraciones ni modificación de datos.

## 3. Matriz de reconciliación

| Pieza | Tipo | apps/gold/supabase | supabase raíz | remoto | impacto | acción recomendada | riesgo |
|---|---|---|---|---|---|---|---|
| `apps/gold/supabase/config.toml` | config | Existe, `project_id = "gold"` | Existe otro config en raíz, `project_id = "YavlGold"` | No aplica como objeto remoto; raíz tiene vínculo operativo con project ref | CLI local, arranque Supabase, lectura de agentes | Archivar tras saneamiento; no migrar como canon | Medio |
| `apps/gold/supabase/.temp/project-ref` | metadata local | No existe | Existe en `supabase/.temp/project-ref`: `gerzlzprkarikblqxpjt` | Coincide con proyecto remoto consultado | Vínculo remoto y operaciones Supabase reales | Descartar ausencia como evidencia de no canonicidad | Alto |
| `apps/gold/supabase/.temp/cli-latest` | metadata local | Existe, versión CLI local secundaria | Existe en raíz con otra versión local | No aplica | Ruido operativo; puede confundir scripts/agentes | Descartar junto con árbol secundario | Bajo |
| `apps/gold/supabase/.branches/_current_branch` | metadata local | Existe, `main` | Existe, `main` | No aplica | Bajo; solo metadata CLI local | Descartar junto con árbol secundario | Bajo |
| `apps/gold/supabase/.gitignore` | metadata local | Existe | No relevante como canon | No aplica | Ninguno funcional | Descartar junto con árbol secundario | Bajo |
| `apps/gold/supabase/snippets/` | snippets | Existe vacío | No equivalente necesario | No aplica | Ninguno funcional detectado | Descartar | Bajo |
| `apps/gold/supabase/agro_schema.sql` | schema manual | Existe, define `agro_crops` y `agro_roi_calculations` en versión histórica | No existe archivo equivalente único; raíz contiene migraciones posteriores para Agro | `agro_crops` y `agro_roi_calculations` existen; `agro_crops` remoto tiene 19 columnas y estado más avanzado | Cultivos, ROI, estadísticas, reportes Agro | Archivar como evidencia histórica; no usar como schema canónico | Medio |
| `apps/gold/supabase/migrations/20260108100000_create_announcements.sql` | migración | Existe solo en árbol secundario | No existe por nombre ni hash | Tabla `announcements` existe; 2 políticas RLS; no hay entrada remota con ese nombre | Anuncios del dashboard / componentes de comunicación | Migrar al canon raíz en fase posterior como migración reconciliada o registrar como aplicada por otra vía; no reaplicar a ciegas | Alto |
| `apps/gold/supabase/migrations/20260108100500_create_app_admins.sql` | migración | Existe solo en árbol secundario | No existe por nombre ni hash | Tabla `app_admins` existe; 1 política RLS; no hay entrada remota con ese nombre | Gestión admin de anuncios | Migrar al canon raíz en fase posterior o documentar equivalencia remota; revisar políticas exactas | Alto |
| `apps/gold/supabase/migrations/20260108101000_create_notifications_feedback.sql` | migración | Existe solo en árbol secundario | No existe por nombre ni hash; raíz tiene `agro_feedback`, que no es equivalente a `feedback` | Tablas `notifications` y `feedback` existen; políticas RLS existen; remoto tiene `agro_feedback` como migración separada | Campana, notificaciones, feedback general del dashboard | Migrar al canon raíz como DDL reconciliado separado; revisar diferencia `feedback` vs `agro_feedback` | Alto |
| `apps/gold/supabase/migrations/20260108101500_create_user_favorites.sql` | migración | Existe solo en árbol secundario | No existe por nombre ni hash | Tabla `user_favorites` existe; 1 política RLS; no hay entrada remota con ese nombre | Favoritos de módulos y métricas del dashboard | Migrar al canon raíz o documentar como objeto remoto ya existente; revisar antes de retirar | Alto |
| `apps/gold/supabase/migrations/20260311113000_create_user_onboarding_context.sql` | migración | Existe solo en árbol secundario | No existe por nombre ni hash | Tabla `user_onboarding_context` existe; 3 políticas RLS; schema_migrations tiene `20260312002051 create_user_onboarding_context` | Onboarding, perfil Agro, contexto IA | Migrar al canon raíz como equivalencia reconciliada o preservar como fuente histórica antes de archivar | Medio |
| `apps/gold/supabase/migrations/20260313170000_add_ia_context_to_farmer_profile.sql` | migración | Existe solo en árbol secundario | No existe por nombre ni hash | Columnas `experience_level`, `farm_type`, `assistant_goals` existen en `agro_farmer_profile`; schema_migrations tiene `20260312210707 add_ia_context_to_farmer_profile` | Asistente IA y perfil del agricultor | Migrar al canon raíz como equivalencia reconciliada o registrar equivalencia remota | Medio |
| `apps/gold/supabase/migrations/20260318120000_create_agro_operational_cycles.sql` | migración | Existe solo en árbol secundario | No existe por nombre ni hash | Tablas `agro_operational_cycles` y `agro_operational_movements` existen; 4 políticas RLS por tabla; schema_migrations tiene `20260319004736 create_agro_operational_cycles` | Ciclos operativos, movimientos, cartera operativa | Migrar al canon raíz como DDL reconciliado antes de retirar el árbol secundario | Alto |
| `apps/gold/supabase/migrations/20260411130000_create_agro_period_cycles.sql` | migración | Existe | Existe en raíz con mismo nombre y mismo hash | Tabla `agro_period_cycles` existe; 4 políticas RLS; no aparece en `schema_migrations` remoto consultado | Ciclos de período Agro | Conservar en canon raíz; archivar copia secundaria tras revisar historial remoto | Medio |
| `supabase/functions/agro-assistant/index.ts` | función | No existe en árbol secundario | Existe solo en raíz | Edge Function `agro-assistant` activa, versión 11, `verify_jwt = false` | Asistente IA Agro | Conservar en raíz; no crear copia secundaria | Alto |
| `supabase/config.toml` sección `[functions.agro-assistant]` | config función | No existe en config secundario | Existe en raíz | Remoto confirma `verify_jwt = false` | Deploy/serve de Edge Function y CORS/auth | Conservar en raíz | Alto |
| `supabase/sql/` | SQL auxiliar | No existe | Existe en raíz | Varias piezas están aplicadas o representadas por remoto | Patches, RPCs, consultas auxiliares Agro | Conservar en raíz | Medio |
| `supabase/migrations/*.sql` raíz restantes | migraciones canónicas actuales | No existen en árbol secundario, salvo period cycles | 25 archivos en raíz | Remoto tiene 43 registros de migración; hay equivalencias con timestamps distintos y registros que no existen localmente | Facturero, multimoneda, perfiles, buyers, tareas, RPCs, cartera | Conservar raíz como canon futuro, pero auditar drift de historial remoto antes de saneamiento final | Medio |

### Lectura de la matriz

Hay tres situaciones distintas:

1. **Ya cubierto por raíz y remoto**: `agro_period_cycles` y `agro-assistant`.
2. **Cubierto por remoto, pero no por raíz local**: anuncios, admins, notificaciones, favoritos, onboarding, contexto IA y ciclos operativos.
3. **Legacy o metadata local**: `agro_schema.sql`, `.temp`, `.branches`, `.gitignore`, `snippets/`.

La situación 2 es la más delicada. No significa que producción esté rota; significa que el repo raíz todavía no reproduce de forma limpia todo lo que existe en remoto o todo lo que nació en `apps/gold/supabase/`.

## 4. Hallazgos críticos

### 4.1 Solo una migración secundaria coincide con el canon raíz

Comparación por nombre y hash:

| Migración secundaria | Coincide en raíz |
|---|---|
| `20260108100000_create_announcements.sql` | No |
| `20260108100500_create_app_admins.sql` | No |
| `20260108101000_create_notifications_feedback.sql` | No |
| `20260108101500_create_user_favorites.sql` | No |
| `20260311113000_create_user_onboarding_context.sql` | No |
| `20260313170000_add_ia_context_to_farmer_profile.sql` | No |
| `20260318120000_create_agro_operational_cycles.sql` | No |
| `20260411130000_create_agro_period_cycles.sql` | Sí, mismo nombre y mismo hash |

### 4.2 El remoto contiene objetos que no están representados claramente en raíz

El remoto contiene estas tablas relacionadas con el árbol secundario:

- `announcements`
- `app_admins`
- `notifications`
- `feedback`
- `user_favorites`
- `user_onboarding_context`
- `agro_operational_cycles`
- `agro_operational_movements`
- `agro_period_cycles`
- `agro_crops`
- `agro_roi_calculations`
- `agro_farmer_profile` con columnas de contexto IA

También existen políticas RLS para esas tablas. Esto reduce el riesgo de pérdida funcional inmediata, pero aumenta el riesgo de trazabilidad si se elimina el árbol secundario sin registrar equivalencias.

### 4.3 El historial remoto no calza uno a uno con archivos locales

El remoto registra, entre otras, estas migraciones semánticamente relacionadas:

- `20260110152501 agro_module_schema`
- `20260224001837 agro_feedback`
- `20260312002051 create_user_onboarding_context`
- `20260312210707 add_ia_context_to_farmer_profile`
- `20260319004736 create_agro_operational_cycles`

No aparecen entradas remotas con los nombres exactos de varias migraciones secundarias de enero, aunque sus tablas existen. Tampoco aparece `create_agro_period_cycles` en el listado remoto consultado, aunque la tabla existe y el archivo sí está en raíz.

Esto indica aplicación por otra vía, timestamps distintos, consolidaciones manuales o historial de migración no perfectamente reflejado en el repo.

### 4.4 El árbol secundario no sirve como proyecto Supabase completo

`apps/gold/supabase/` no tiene:

- `.temp/project-ref`;
- `functions/agro-assistant/`;
- configuración `[functions.agro-assistant]`;
- `sql/` auxiliar del canon raíz;
- el set completo de migraciones actuales.

Usarlo como proyecto Supabase activo puede dejar fuera funciones, vínculo remoto y patches actuales.

### 4.5 El canon raíz tampoco es todavía un espejo completo del remoto

`supabase/` raíz es el canon correcto para operar hacia adelante, pero no es una reconstrucción completa del historial remoto. Tiene 25 migraciones locales contra 43 registros remotos consultados, con timestamps distintos en varias equivalencias.

Esto no invalida el canon raíz. Sí obliga a una fase de reconciliación de historial antes de borrar la única copia local de ciertos DDL históricos.

## 5. Qué bloquea el saneamiento final

Hoy bloquean archivar o eliminar `apps/gold/supabase/` estos puntos:

1. **Siete migraciones secundarias no existen en raíz por nombre ni hash.**
2. **Varias tablas remotas existen sin una migración raíz equivalente clara.**
3. **`notifications`, `feedback`, `user_favorites`, `announcements` y `app_admins` tienen uso vivo en dashboard o componentes.**
4. **`agro_operational_cycles` y `agro_operational_movements` tienen uso vivo en Agro.**
5. **`user_onboarding_context` y las columnas IA de `agro_farmer_profile` alimentan perfil/onboarding/asistente.**
6. **`agro_schema.sql` parece histórico y parcialmente obsoleto, pero todavía documenta el origen de `agro_crops` y ROI.**
7. **El historial remoto tiene timestamps y nombres distintos a los archivos locales.**

El bloqueo no es mantener producción funcionando hoy. El bloqueo es no perder trazabilidad ni romper la capacidad de reconstrucción local/canónica mañana.

## 6. Recomendación explícita

Recomendación: **no eliminar ni archivar `apps/gold/supabase/` todavía.**

La siguiente fase debe ser una reconciliación ejecutiva corta con este orden:

1. Crear, en `supabase/` raíz, migraciones canónicas reconciliadas o archivos de baseline idempotentes para las piezas vivas que hoy solo están en `apps/gold/supabase/`.
2. No copiar migraciones crudas si el remoto ya tiene los objetos; primero comparar DDL real, políticas, índices y constraints.
3. Para cada pieza ya aplicada en remoto con otro timestamp, decidir entre:
   - migración idempotente de respaldo para reconstrucción local;
   - documentación de equivalencia remota;
   - reparación controlada de historial de migraciones solo si se justifica.
4. Marcar `agro_schema.sql` como histórico/legacy y no como schema activo.
5. Cuando todo lo vivo esté cubierto por raíz/remoto/documentación, archivar o eliminar `apps/gold/supabase/` como saneamiento final.

Postura explícita: **conviene retirar `apps/gold/supabase/` en una fase posterior, pero solo después de migrar o registrar las piezas vivas que todavía existen únicamente allí.**

## 7. Próxima fase sugerida

Fase siguiente recomendada:

1. Comparar DDL exacto remoto vs cada migración secundaria viva.
2. Crear una lista de migraciones raíz candidatas, idempotentes y no destructivas.
3. Ejecutar una revisión manual de:
   - políticas RLS;
   - índices;
   - constraints;
   - triggers;
   - nombres de columnas;
   - compatibilidad con frontend actual.
4. Definir qué hacer con el drift de `schema_migrations` remoto:
   - dejar como histórico aceptado;
   - documentar equivalencias;
   - o reparar con procedimiento formal si el flujo CLI lo exige.
5. Solo después, archivar o eliminar `apps/gold/supabase/`.

No se recomienda usar `apps/gold/supabase/` como sandbox local permanente. Mantenerlo vivo como segundo árbol prolonga el riesgo original: agentes, scripts o humanos pueden volver a escribir migraciones en el lugar equivocado.
