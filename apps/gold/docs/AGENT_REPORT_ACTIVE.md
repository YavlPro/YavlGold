# AGENT_REPORT_ACTIVE

Resumen operativo actual de `apps/gold`.

> Estado: DOCUMENTO ACTIVO — Rotation ejecutada 2026-04-17
> Umbral de rotacion: 4,000 lineas (canonica §4.1)
> Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md`

---

## Estado actual del proyecto

**Release visible: V1**
YavlGold Agro es el unico modulo activo y released. Academia, Social, Tecnologia y Crypto son placeholders "no disponible". Dashboard es app secundaria con utilidad interna (auth, perfil, configuracion, music).

El trabajo documentado en el archivo archivado se centro en:
- Alineacion visual del sidebar shell al ADN V10
- Splash loader de marca para entrada a Agro
- Rediseño de vista detalle Cartera Viva (cabecera compacta)
- Canon de modales §19 (Modal Wizard como referencia)
- Reemplazo de prompt() nativos por showPromptModal()
- Diagnostico baseline Supabase (deuda documentada)

---

## Frentes abiertos

1. **Supabase baseline pendiente**: El documento `PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md` identifica que `apps/gold/supabase/agro_schema.sql` es snapshot obsoleto. Las migraciones de raiz presuponen tablas que ninguna migracion crea. Requiere creacion de migracion baseline forward-only.

2. **Migracion progresiva de modales legacy**: §19 canon de modales fue aprobado. La migracion de modales existentes (editar cliente, facturero, nuevo cultivo, carrito, tarea) es deuda pendiente priorizada.

3. **Polling duplicado market/interactions**: `agro-market.js` y `agro-interactions.js` hacen polling independiente de Binance. Consolidacion en singleton pendiente.

4. **CSS inline heredado**: `index.html` de apps/gold (~1,144L) tiene CSS inline con hex hardcodeados. Migracion progresiva a tokens `--gold-*`, `--bg-*` segun politica §11.3.

---

## Decisiones canonicas vigentes

- **Stack**: Vanilla JS ES6+ / Vite MPA / Supabase / Vercel. Prohibido: React, Vue, Svelte, Tailwind, SPA.
- **ADN Visual V10.0** inmutable + §19 Canon de Modales V10.1 (modal wizard como referencia).
- **agro.js NO crece**: features nuevas en `agro-*.js` separados, importados dinamicamente.
- **Supabase unico canonico**: `supabase/` en raiz. `apps/gold/supabase/` NO es canonico.
- **soft-delete** obligatorio con `deleted_at`, RLS filtrado por `user_id`.
- **Monedas**: COP, USD, VES.
- **Build gate**: `pnpm build:gold` obligatorio tras cualquier intervencion.
- **Regla Boy Scout**: cada commit deja el codigo ligeramente mas limpio.
- **window.XXX bridge**: 104+ asignaciones pendientes de migrar a imports ES6 (solo cuando se toquen esos bloques).

---

## Deuda tecnica viva

| # | Item | Ubicacion | Estado |
|---|---|---|---|
| 1 | agro.js monotono (~640KB) | `apps/gold/agro/agro.js` | Reconocido, gestionado con politica de no crecimiento |
| 2 | window.XXX (104+ asignaciones) | `agro.js` | Migracion gradual cuando se toquen bloques |
| 3 | Dualidad Supabase | `supabase/` vs `apps/gold/supabase/` | Diagnostico hecho, plan existe, ejecucion pendiente |
| 4 | Polling duplicado market | `agro-market.js` + `agro-interactions.js` | Plan de consolidacion pendiente |
| 5 | CSS inline heredado | `apps/gold/index.html` ~1,144L | Migracion progresiva, no refactor masivo |

---

## Ultimos cambios relevantes (desde archivo archivado)

- **Sidebar shell alineado al ADN V10**: 8 correcciones de color hardcodeado → tokens.
- **Splash loader de marca**: nuevo div.agro-splash con logo, barra de progreso, fade-out sobre `agro-shell-ready`.
- **Cartera Viva detail rediseñado**: cabecera compacta, historial como protagonista, boton Volver sticky.
- **prompt() nativos eliminados**: 5 usages reemplazados por `showPromptModal()` en `agro-prompt-modal.js`.
- **Canal §19 Modales canonizado**: Modal wizard como referencia visual para todos los modales funcionales.

---

## Referencia a archivos archivados

- `AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md` — Contexto operativo completo del ciclo anterior (sesiones 2026-04-14 a 2026-04-17).
- `AGENT_REPORT.md` — Historico legacy solo consulta (no es fuente activa).
- `PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md` — Plan de baseline Supabase pendiente de ejecutar.

---

## Sesion activa: Incorporacion canon §4.1 — Rotacion de AGENT_REPORT_ACTIVE.md (2026-04-17)

### Objetivo

Incorporar la nueva regla de rotacion §4.1 al documento canónico AGENTS.md y ejecutar la rotación obligatoria del reporte activo dado que el archivo supero las 17,610 líneas (muy por encima del umbral de 4,000).

### Diagnostico previo

El archivo `apps/gold/docs/AGENT_REPORT_ACTIVE.md` tiene **17,610 líneas** — 4.4x por encima del umbral de 4,000. El contenido acumulado desde 2026-04-16 incluye múltiples sesiones de trabajo real sobre Agro, todas documentadas con evidencia verificable. El archivo debe archivarse para mantener el reporte activo útil y operativo.

### Cambios realizados

| Archivo | Tipo | Cambios |
|---|---|---|
| `AGENTS.md` | Nueva seccion | §4.1 — Rotacion canonica de AGENT_REPORT_ACTIVE.md (~70 lineas) |
| `AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md` | Creado | Archivo archivado con todo el contenido previo |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Nuevo | Archivo limpio con contenido mínimo requerido por §4.1 |

### Detalle de la rotacion

1. Se incorporó §4.1 a AGENTS.md como nueva seccion entre §4 y §5
2. Se creó `AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md` con el contenido íntegro del reporte anterior (17,610 líneas, fecha de inicio 2026-04-16, fecha de cierre 2026-04-17)
3. Se creó nuevo `AGENT_REPORT_ACTIVE.md` con:
   - Estado actual del proyecto
   - Frentes abiertos
   - Decisiones canónicas vigentes
   - Deuda técnica viva
   - Últimos cambios relevantes
   - Referencias a archivos archivados

### Resultado build
`pnpm build:gold` — OK. 160 modules, 4.57s.
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK (160 modules transformed)
- `check-llms`: OK
- `check-dist-utf8`: OK

### QA manual sugerido
1. Verificar que el nuevo AGENT_REPORT_ACTIVE.md se abre correctamente y tiene el contenido mínimo
2. Verificar que AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md contiene el historial completo
3. Confirmar que agentes futuros reciben el contexto adecuado al leer el nuevo reporte activo
4. Confirmar que la referencia cruzada entre ambos archivos es clara

### No se hizo
- NO se modificó ninguna lógica de producto
- NO se tocaron módulos de Agro
- NO se alteró ninguna tabla Supabase ni migración
- NO se ejecutó el plan de baseline Supabase
- NO se migraron modales legacy

---

## Sesion activa: Cierre final de duplicacion Supabase (2026-04-17)

### Objetivo

Validar si `supabase/` raiz ya puede sostener por si solo el flujo canonico de Supabase y decidir con evidencia si se puede retirar `apps/gold/supabase/`.

### Diagnostico inicial de cierre

El canon documental ya dice que `supabase/` en raiz es la unica carpeta Supabase canonica. Los informes previos indican que `apps/gold/supabase/` era una duplicacion historica que no debia retirarse hasta cubrir piezas vivas y resolver baseline Agro. En sesiones posteriores se creo una consolidacion raiz para objetos legacy y se avanzo el baseline de `agro_crops`/`agro_roi_calculations`, pero la decision de cierre depende de validar que las migraciones raiz actuales son suficientes para un bootstrap local controlado y que no queda dependencia viva del arbol secundario.

### Archivos a inspeccionar

- `AGENTS.md`
- `FICHA_TECNICA.md`
- `apps/gold/docs/MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL.md`
- `apps/gold/docs/PLAN_CONSOLIDACION_SUPABASE_16_ABRIL.md`
- `apps/gold/docs/PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md`
- `package.json`
- `apps/gold/docs/LOCAL_FIRST.md`
- `apps/gold/public/llms.txt`
- `supabase/config.toml`
- `supabase/migrations/*`
- `apps/gold/supabase/*`
- referencias residuales a `apps/gold/supabase/`

### Criterio de decision

Se puede retirar `apps/gold/supabase/` solo si:

1. `supabase/` raiz contiene migraciones canonicas suficientes para representar las piezas vivas reconciliadas.
2. La validacion local/controlada de Supabase desde raiz no depende de `apps/gold/supabase/`.
3. No existen scripts o docs operativos vivos que indiquen usar `apps/gold/supabase/` como flujo activo.
4. La eliminacion del arbol secundario no borra la unica evidencia local de una pieza viva no representada.

No se puede retirar si:

1. `supabase db reset` o validacion equivalente falla por orden historico, baseline incompleto o DDL incompatible.
2. Queda una dependencia viva en scripts/docs/flujo local.
3. Aun hay piezas exclusivas del arbol secundario no cubiertas por raiz ni documentadas.
4. La evidencia no es concluyente.

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Se documento Paso 0, validacion controlada, resultado fallido y decision de NO retirar `apps/gold/supabase/` |

No se eliminaron carpetas, no se movieron migraciones y no se modifico `supabase/` remoto.

### Validacion ejecutada

Comandos y evidencia:

1. `supabase --version`: CLI local `2.72.7`.
2. `supabase status --workdir .`: fallo inicialmente porque Docker Desktop no estaba corriendo.
3. Se inicio Docker Desktop localmente para permitir validacion controlada.
4. `supabase db reset --workdir . --local --no-seed --debug`: no pudo correr porque el proyecto local raiz aun no estaba iniciado.
5. `supabase start --workdir . -x studio,imgproxy,vector,logflare,edge-runtime,supavisor,postgres-meta,mailpit --debug`: primer intento bloqueado por puerto `54322` ocupado.
6. `docker ps` y `supabase status --workdir .\apps\gold --debug`: confirmaron que estaba corriendo el proyecto local secundario `gold` (`apps/gold/supabase`) ocupando `54321/54322`.
7. `supabase stop --project-id gold --debug`: se detuvo el proyecto local secundario; la CLI dejo backup local en volumen Docker.
8. `supabase stop --project-id YavlGold --no-backup --debug`: se limpio estado local parcial de raiz.
9. Nuevo `supabase start --workdir . ... --debug`: llego a aplicar migraciones raiz, pero fallo en `20260221231722_agro_profit_date_filters_inclusive.sql`.

Error bloqueante exacto:

```text
ERROR: function "public.agro_rank_top_crops_profit(date,date,integer,uuid)" does not exist (SQLSTATE 42883)
At statement: 0
v_profit := pg_get_functiondef('public.agro_rank_top_crops_profit(date,date,integer,uuid)'::regprocedure);
```

Lectura tecnica:

- La migracion `20260221231722_agro_profit_date_filters_inclusive.sql` asume que la funcion `public.agro_rank_top_crops_profit(date,date,integer,uuid)` ya existe.
- En el set canonico raiz actual, esa funcion existe como SQL auxiliar en `supabase/sql/agro_rankings_rpc_v1.sql`, pero no queda creada por una migracion anterior antes de `20260221231722`.
- Por tanto, un bootstrap limpio desde `supabase/` raiz todavia no es confiable.
- La falla ocurre antes de llegar a validar completamente las migraciones de consolidacion/baseline nuevas.

### Decision de cierre

La validacion NO permite retirar `apps/gold/supabase/` en esta sesion.

Bloqueo exacto:

- Tipo: orden historico / representacion incompleta de migraciones raiz.
- Archivo bloqueante: `supabase/migrations/20260221231722_agro_profit_date_filters_inclusive.sql`.
- Dependencia faltante: una migracion previa que cree o represente `public.agro_rank_top_crops_profit(date,date,integer,uuid)` antes de intentar modificarla.
- Riesgo si se retirara ahora: se perderia el arbol secundario sin haber demostrado que raiz reconstruye localmente el stack Supabase; eso violaria el criterio de cierre.

### Referencias residuales

Se buscaron referencias a `apps/gold/supabase/` en scripts y docs operativos. Hallazgos:

- `package.json`: los scripts `sb:*` ya usan `--workdir .` y apuntan a raiz.
- `LOCAL_FIRST.md`: mantiene una nota correcta de no canonicidad y deuda pendiente.
- `AGENTS.md` y `llms.txt`: mantienen la regla de no usar `apps/gold/supabase` como canon.
- Los documentos de diagnostico/reconciliacion contienen referencias historicas necesarias y no se tocaron.

### Build status

`pnpm build:gold` - OK.

Notas:
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK, 160 modules transformed
- `check-llms`: OK
- `check-dist-utf8`: OK
- Advertencia no bloqueante: Node actual `v25.6.0` no coincide con engine esperado `20.x`.

---

## Sesion activa: Repair de orden baseline facturero/Cartera Viva (2026-04-17)

### Objetivo

Resolver el tercer bloqueo exacto de bootstrap canonico raiz:

```text
ERROR: relation "public.agro_pending" does not exist
create index if not exists agro_pending_user_buyer_id_idx
    on public.agro_pending (user_id, buyer_id)
```

Archivo bloqueante:

- `supabase/migrations/20260327001037_agro_buyer_foundation_v4.sql`

### Archivos inspeccionados

- `AGENTS.md`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `supabase/migrations/20260327001037_agro_buyer_foundation_v4.sql`
- `supabase/migrations/20260225162000_agro_facturero_split_meta_v1.sql`
- `supabase/migrations/20260226204000_agro_movements_currency_backfill.sql`
- `supabase/migrations/20260226211000_agro_movements_currency_check.sql`
- `supabase/migrations/20260227213000_agro_income_split_meta.sql`
- `supabase/migrations/20260328005620_agro_buyer_portfolio_summary_v1.sql`
- `supabase/migrations/20260330173000_agro_clients_master_equivalent_v1.sql`
- `supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql`
- `supabase/migrations/20260403143000_agro_delete_buyer_cascade_v1.sql`
- `supabase/migrations/20260417113444_agro_buyer_portfolio_transfer_markers.sql`
- `supabase/sql/agro_facturero_transfer_meta_v2.sql`
- `supabase/sql/agro_pending_transfer_v1.sql`
- `supabase/sql/agro_units_facturero_v1.sql`
- `supabase/sql/agro_income_units_v1.sql`
- referencias de lectura en `apps/gold/agro/agro-wizard.js`, `apps/gold/agro/agro-cartera-viva-view.js`, `apps/gold/agro/agro-stats.js`, `apps/gold/agro/agro-crop-report.js` y `apps/gold/agro/agro.js`

### Diagnostico tecnico

El bloqueo no era solo un indice faltante.

La migracion `20260327001037_agro_buyer_foundation_v4.sql` presupone que ya existen:

- `public.agro_pending`
- `public.agro_income`
- `public.agro_losses`

Esa migracion:

- agrega columnas buyer con `alter table if exists`;
- crea indices sin guarda de existencia de tabla;
- lee y actualiza las tres tablas;
- depende de columnas como `id`, `user_id`, `cliente`, `concepto`, `causa`, `origin_table`, `buyer_id`, `buyer_group_key` y `buyer_match_status`.

Tambien se confirmo que migraciones previas de facturero ya habian intentado parchear, de forma defensiva, tablas que todavia no existian en el reset limpio:

- `agro_income`
- `agro_pending`
- `agro_losses`
- `agro_expenses`
- `agro_transfers`

Por eso una repair que creara solo `agro_pending` habria sido demasiado pobre: destrabaria el primer indice, pero dejaria el baseline de Cartera Viva/facturero incompleto frente a los RPC y flujos posteriores.

### Decision de migracion

Se creo una unica repair migration de orden:

- `supabase/migrations/20260327001000_agro_facturero_base_order_repair.sql`

La migracion queda documentada dentro del archivo como:

- `REPAIR MIGRATION`
- creada el `2026-04-17`
- versionada antes de `20260327001037` solo para reparar el orden de bootstrap
- sin usar `apps/gold/supabase/` como canon
- sin editar migraciones antiguas

La repair crea el baseline raiz de las tablas base de facturero/Cartera Viva:

- `public.agro_pending`
- `public.agro_income`
- `public.agro_losses`
- `public.agro_expenses`
- `public.agro_transfers`

Incluye columnas necesarias para:

- montos USD/multimoneda (`monto_usd`, `currency`, `exchange_rate`);
- unidades (`unit_type`, `unit_qty`, `quantity_kg`);
- cultivo asociado (`crop_id`);
- soft-delete (`deleted_at`);
- trazabilidad de transferencias (`origin_table`, `origin_id`, `transfer_state`, `transferred_*`);
- splits parciales (`split_from_id`, `split_meta`);
- identidad buyer (`buyer_id`, `buyer_group_key`, `buyer_match_status`);
- RLS owner-only por `user_id`.

### Validacion Supabase

Comando ejecutado:

```bash
supabase start --workdir .
```

Resultado:

- La secuencia avanzo correctamente por `20260327001000_agro_facturero_base_order_repair.sql`.
- La migracion `20260327001037_agro_buyer_foundation_v4.sql` ya no fallo por `public.agro_pending`.
- Tambien pasaron:
  - `20260327001106_agro_buyer_foundation_v4_search_path_fix.sql`
  - `20260328005620_agro_buyer_portfolio_summary_v1.sql`
  - `20260330173000_agro_clients_master_equivalent_v1.sql`

Nuevo bloqueo posterior:

```text
ERROR: cannot change return type of existing function (SQLSTATE 42P13)
Row type defined by OUT parameters is different.
```

Archivo bloqueante nuevo:

- `supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql`

Causa precisa:

- `20260330173000_agro_clients_master_equivalent_v1.sql` crea `public.agro_buyer_portfolio_summary_v1()` con retorno extendido:
  - `canonical_name text`
  - `client_status text`
- `20260331000000_agro_buyer_portfolio_include_zero_buyers.sql` intenta `create or replace function` con una firma de retorno mas corta, sin esas dos columnas.
- PostgreSQL no permite cambiar el row type de salida de una funcion existente usando solo `create or replace function`.

### Reset local

Comando ejecutado:

```bash
supabase db reset --workdir . --local --no-seed
```

Resultado:

```text
supabase start is not running.
```

Motivo: `supabase start` fallo durante la migracion `20260331000000` y detuvo los contenedores. Por eso el reset local no pudo ejecutarse.

### Decision de cierre

No se hicieron reparaciones adicionales en cadena.

Motivo: el bloqueo solicitado sobre `agro_pending`/baseline facturero quedo resuelto. El nuevo bloqueo pertenece a otro contrato migratorio: incompatibilidad de firma de retorno entre dos versiones de `agro_buyer_portfolio_summary_v1()`.

`apps/gold/supabase/` NO se retiro.

### Estado actual del frente Supabase

Avance logrado:

- El tercer bloqueo de orden quedo destrabado.
- El canon raiz ya tiene baseline de tablas base de facturero/Cartera Viva antes de `20260327001037`.
- La secuencia canonica avanzo hasta `20260331000000`.

Bloqueo vigente:

- `supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql`
- Tipo: contrato incompatible de funcion SQL.
- Objeto: `public.agro_buyer_portfolio_summary_v1()`.
- Causa: `create or replace function` intenta reemplazar una funcion con OUT parameters distintos.

Proxima fase sugerida:

- resolver el contrato de `agro_buyer_portfolio_summary_v1()` sin editar migraciones antiguas;
- probablemente crear una repair de orden o una migracion correctiva que elimine/recree la funcion antes del reemplazo incompatible, si la evidencia lo justifica;
- repetir `supabase start --workdir .`;
- solo ejecutar `supabase db reset --workdir . --local --no-seed` si `supabase start` completa.

### Build status

`pnpm build:gold` - OK.

Notas:
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK, 160 modules transformed
- `check-llms`: OK
- `check-dist-utf8`: OK
- Advertencia no bloqueante: Node actual `v25.6.0` no coincide con engine esperado `20.x`.

---

## Sesion activa: Repair de orden para `agro_crops` antes de status patch (2026-04-17)

### Objetivo

Resolver el segundo bloqueo exacto de orden migratorio en `supabase/` raiz:

`supabase/migrations/20260224200000_agro_crops_status_allow_lost.sql`

Ese archivo intentaba ejecutar `ALTER TABLE public.agro_crops` antes de que `public.agro_crops` existiera en la secuencia canonica raiz.

### Archivos inspeccionados

- `AGENTS.md`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/docs/PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md`
- `supabase/migrations/20260224200000_agro_crops_status_allow_lost.sql`
- `supabase/migrations/20260226190000_agro_crops_investment_multicurrency.sql`
- `supabase/migrations/20260404120000_agro_task_cycles_v1.sql`
- `supabase/migrations/20260416190000_consolidate_legacy_app_supabase_objects.sql`
- `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql`
- `supabase/sql/agro_crops_status_override_v1.sql`

### Diagnostico tecnico

`20260224200000_agro_crops_status_allow_lost.sql` solo necesita que exista:

- `public.agro_crops`
- columna `status`
- constraint `agro_crops_status_check` opcional, porque el patch la elimina si existe y la crea de nuevo.

Pero crear una tabla demasiado minima seria riesgoso porque `20260417104335_agro_crops_roi_baseline.sql` usa `CREATE TABLE IF NOT EXISTS`. Si una repair temprana creara una tabla parcial, el baseline posterior no recrearia las columnas base faltantes.

Por eso el baseline minimo seguro para esta repair no es solo `id/status`; debe incluir la estructura base de `agro_crops` que el baseline posterior asume creada:

- `id`, `user_id`, `name`, `variety`, `icon`
- `status`, `progress`
- `area_size`, `investment`
- fechas de ciclo
- notas
- `created_at`, `updated_at`
- `revenue_projected`, `deleted_at`
- `status_mode`, `status_override`
- columnas de inversion multi-moneda usadas por el patch posterior `20260226190000`

`agro_roi_calculations` no se creo en esta repair porque no es requerido antes de `20260224200000` y sigue cubierto por el baseline de abril.

### Migracion creada

Se creo:

`supabase/migrations/20260224195900_agro_crops_order_repair.sql`

Caracteristicas:

- versionada antes de `20260224200000` por necesidad de orden;
- documentada dentro del archivo como `REPAIR MIGRATION`;
- fecha real de creacion declarada: `2026-04-17`;
- no edita migraciones antiguas;
- no usa `apps/gold/supabase/` como canon;
- crea solo `public.agro_crops`;
- no crea `public.agro_roi_calculations`;
- mantiene `status` con default `sembrado`, compatible con el check posterior de estados actuales;
- incluye columnas base y multi-moneda para no dejar una tabla parcial antes del baseline de abril.

### Validacion ejecutada

1. `docker info`

Resultado: Docker disponible.

2. `supabase status --workdir .`

Resultado: no habia contenedor sano de raiz (`supabase_db_YavlGold`) tras el fallo anterior.

3. `supabase start --workdir .`

Resultado:

- `20260224195900_agro_crops_order_repair.sql` se aplico.
- `20260224200000_agro_crops_status_allow_lost.sql` se aplico.
- `20260226190000_agro_crops_investment_multicurrency.sql` se aplico; las columnas multi-moneda ya existian y el patch continuo.
- La secuencia avanzo hasta `20260327001037_agro_buyer_foundation_v4.sql`.

Nuevo bloqueo posterior detectado:

```text
ERROR: relation "public.agro_pending" does not exist (SQLSTATE 42P01)
At statement: 6
create index if not exists agro_pending_user_buyer_id_idx
    on public.agro_pending (user_id, buyer_id)
```

Archivo bloqueante nuevo:

`supabase/migrations/20260327001037_agro_buyer_foundation_v4.sql`

Lectura tecnica:

- Esa migracion usa `ALTER TABLE IF EXISTS` para `agro_pending`, `agro_income` y `agro_losses`.
- Pero luego crea indices sin guardar si esas tablas existen.
- En un reset limpio desde raiz, `public.agro_pending` todavia no existe cuando intenta crear el indice.
- Es un nuevo bloqueo de baseline/orden, ahora sobre tablas base de Cartera Viva/facturero legacy.

4. `supabase db reset --workdir . --local --no-seed`

Resultado:

```text
supabase start is not running.
```

Motivo:

- `supabase start` fallo durante migraciones y detuvo los contenedores.
- No quedo proyecto local corriendo para ejecutar reset.

### Decision

No se hicieron reparaciones adicionales en cadena.

Motivo: la tarea autorizaba resolver el bloqueo exacto de `agro_crops`. Ese bloqueo quedo superado, pero aparecio un bloqueo posterior distinto sobre `agro_pending`. Requiere una revision especifica de las tablas base de Cartera Viva/facturero antes de crear otra repair.

`apps/gold/supabase/` NO se retiro.

### Estado actual del frente Supabase

Avance logrado:

- `20260224200000_agro_crops_status_allow_lost.sql` ya puede correr.
- El patch multi-moneda de `agro_crops` tambien avanzo.

Bloqueo vigente:

- `supabase/migrations/20260327001037_agro_buyer_foundation_v4.sql`
- Causa: intenta crear indices sobre `public.agro_pending` antes de que exista.
- Tipo: baseline ausente / orden historico de tablas base de Cartera Viva y facturero.

Proxima fase sugerida:

- auditar en raiz y remoto el baseline real de `agro_pending`, `agro_income` y `agro_losses`;
- decidir si corresponde una repair de orden para esas tablas antes de `20260327001037`;
- no retirar `apps/gold/supabase/` hasta que el reset raiz pase completo.

### Build status

`pnpm build:gold` - OK.

Notas:
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK, 160 modules transformed
- `check-llms`: OK
- `check-dist-utf8`: OK
- Advertencia no bloqueante: Node actual `v25.6.0` no coincide con engine esperado `20.x`.

---

## Sesion activa: Repair de orden para `agro_rank_top_crops_profit` (2026-04-17)

### Objetivo

Crear una migracion de reparacion de orden, autorizada explicitamente por el usuario, para que el canon `supabase/` raiz cree `public.agro_rank_top_crops_profit(date,date,integer,uuid)` antes de que `20260221231722_agro_profit_date_filters_inclusive.sql` intente leerla y parchearla.

### Archivos inspeccionados

- `AGENTS.md`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `supabase/migrations/20260221231722_agro_profit_date_filters_inclusive.sql`
- `supabase/migrations/20260221231536_agro_rpc_date_filters_inclusive.sql`
- `supabase/sql/agro_rankings_rpc_v1.sql`
- `supabase/migrations/20260224200000_agro_crops_status_allow_lost.sql`
- `supabase/migrations/20260417104335_agro_crops_roi_baseline.sql`

### Migracion creada

Se creo:

`supabase/migrations/20260221231650_agro_rank_top_crops_profit_order_repair.sql`

Caracteristicas:

- versionada antes de `20260221231722` por necesidad de orden;
- documentada dentro del archivo como `REPAIR MIGRATION`;
- fecha real de creacion declarada: `2026-04-17`;
- no edita migraciones antiguas;
- no usa `apps/gold/supabase/` como canon;
- crea `public.agro_rank_top_crops_profit(date,date,integer,uuid)`;
- replica la definicion funcional existente en `supabase/sql/agro_rankings_rpc_v1.sql`;
- aplica `REVOKE`/`GRANT` solo sobre esa funcion.

Firma representada:

```sql
public.agro_rank_top_crops_profit(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_limit integer DEFAULT 5,
  p_crop_id uuid DEFAULT NULL
)
```

Retorno:

```sql
TABLE (
  crop_id uuid,
  crop_name text,
  ingresos numeric,
  gastos numeric,
  profit numeric
)
```

### Validacion ejecutada

1. `supabase start --workdir .`

Resultado:

- Docker Desktop no estaba disponible inicialmente.
- Se inicio Docker Desktop localmente.
- El daemon Docker quedo disponible.
- Se repitio `supabase start --workdir .`.
- La migracion repair `20260221231650_agro_rank_top_crops_profit_order_repair.sql` se aplico.
- La migracion previamente bloqueante `20260221231722_agro_profit_date_filters_inclusive.sql` tambien se aplico.

Esto confirma que el bloqueo de `agro_rank_top_crops_profit` quedo destrabado.

Nuevo bloqueo posterior detectado:

```text
ERROR: relation "public.agro_crops" does not exist (SQLSTATE 42P01)
At statement: 1
alter table public.agro_crops
drop constraint if exists agro_crops_status_check
```

Archivo bloqueante nuevo:

`supabase/migrations/20260224200000_agro_crops_status_allow_lost.sql`

Lectura tecnica:

- `20260224200000_agro_crops_status_allow_lost.sql` intenta ejecutar `ALTER TABLE public.agro_crops`.
- En la secuencia actual de raiz, `public.agro_crops` se crea recien en `20260417104335_agro_crops_roi_baseline.sql`.
- Por tanto, el siguiente bloqueo tambien es de orden historico: un ALTER antiguo corre antes del baseline canonico que crea la tabla.

2. `supabase db reset --workdir . --local --no-seed`

Resultado:

```text
supabase start is not running.
```

Motivo:

- `supabase start` fallo durante aplicacion de migraciones y detuvo los contenedores.
- El reset local no pudo ejecutarse porque no quedo un proyecto local corriendo.

### Decision

No se hicieron reparaciones adicionales en cadena.

Motivo: la tarea autorizaba resolver el bloqueo exacto de `agro_rank_top_crops_profit`. Ese bloqueo quedo superado, pero aparecio un bloqueo posterior distinto sobre `public.agro_crops`. Seguir creando repairs sin una revision explicita del orden de `agro_crops` repetiria el mismo patron de riesgo.

`apps/gold/supabase/` NO se retiro.

### Estado actual del frente Supabase

Avance logrado:

- `20260221231722_agro_profit_date_filters_inclusive.sql` ya encuentra la funcion que necesitaba.
- El canon raiz avanzo un paso real en capacidad de bootstrap.

Bloqueo vigente:

- `supabase/migrations/20260224200000_agro_crops_status_allow_lost.sql`
- Causa: intenta alterar `public.agro_crops` antes de que exista.
- Tipo: orden historico de baseline `agro_crops`.

Proxima fase sugerida:

- evaluar una reparacion de orden para `public.agro_crops` antes de `20260224200000`, o convertir ese ALTER en una forma segura sin editar la migracion antigua;
- validar luego `supabase start --workdir .` y `supabase db reset --workdir . --local --no-seed`;
- no retirar `apps/gold/supabase/` hasta que el reset raiz pase completo.

### Build status

`pnpm build:gold` - OK.

Notas:
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK, 160 modules transformed
- `check-llms`: OK
- `check-dist-utf8`: OK
- Advertencia no bloqueante: Node actual `v25.6.0` no coincide con engine esperado `20.x`.

### QA sugerido

- No retirar `apps/gold/supabase/` hasta resolver la migracion bloqueante de rankings/profit en raiz y repetir `supabase start`/`db reset`.
- En una siguiente fase, crear una migracion raiz forward-only/idempotente que represente `agro_rank_top_crops_profit` antes del patch que la modifica, sin reescribir migraciones viejas ni falsificar timestamps.
- Repetir validacion local desde cero: detener/limpiar `YavlGold`, iniciar desde `supabase/` raiz, ejecutar `supabase db reset --workdir . --local --no-seed`.
- Mantener `apps/gold/supabase/` como evidencia historica temporal hasta que el reset raiz pase.

---

## Sesion activa: Bloqueo de orden RPC `agro_rank_top_crops_profit` (2026-04-17)

### Objetivo

Resolver el bloqueo exacto detectado en `supabase/migrations/20260221231722_agro_profit_date_filters_inclusive.sql`, donde el reset limpio falla porque intenta parchear `public.agro_rank_top_crops_profit(date,date,integer,uuid)` antes de que esa funcion exista en la secuencia canonica de migraciones raiz.

### Archivos inspeccionados

- `AGENTS.md`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `supabase/migrations/20260221231722_agro_profit_date_filters_inclusive.sql`
- `supabase/migrations/20260221231536_agro_rpc_date_filters_inclusive.sql`
- `supabase/sql/agro_rankings_rpc_v1.sql`
- listado completo de `supabase/migrations/*.sql`
- busqueda relacionada en `supabase/migrations` y `supabase/sql`

### Diagnostico tecnico

La funcion faltante existe como SQL auxiliar en `supabase/sql/agro_rankings_rpc_v1.sql` con esta firma:

```sql
public.agro_rank_top_crops_profit(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_limit integer DEFAULT 5,
  p_crop_id uuid DEFAULT NULL
)
```

Retorna:

```sql
TABLE (
  crop_id uuid,
  crop_name text,
  ingresos numeric,
  gastos numeric,
  profit numeric
)
```

La migracion `20260221231722_agro_profit_date_filters_inclusive.sql` espera exactamente la firma `public.agro_rank_top_crops_profit(date,date,integer,uuid)` y llama:

```sql
pg_get_functiondef('public.agro_rank_top_crops_profit(date,date,integer,uuid)'::regprocedure)
```

Eso falla en un reset limpio porque ninguna migracion anterior de `supabase/` raiz crea esa funcion. Las migraciones previas de rankings crean/parchean `agro_rank_top_clients` y `agro_rank_pending_clients`, pero no `agro_rank_top_crops_profit`.

### Dependencias revisadas

La definicion de `agro_rank_top_crops_profit` usa:

- `auth.uid()`
- `public.agro_income`
- `public.agro_operational_cycles`
- `public.agro_operational_movements`
- `public.agro_crops`
- `information_schema.columns`
- SQL dinamico con guardas `to_regclass(...)`

La funcion es razonablemente apta para creacion temprana porque retorna sin operar si faltan tablas base como `agro_income`, y arma SQL dinamico solo despues de validar presencia de tablas/columnas. El problema no es su DDL, sino el orden de aplicacion.

### Decision de migracion

No se creo migracion nueva en esta sesion.

Motivo: una migracion con timestamp actual de 2026-04-17 correria despues de `20260221231722_agro_profit_date_filters_inclusive.sql`, por lo que no puede hacer que esa migracion antigua encuentre la funcion durante un `supabase db reset` limpio.

Crear una migracion actual que defina la funcion seria util para estados forward ya aplicados, pero no resolveria el bloqueo confirmado de bootstrap/reset. Eso dejaria una falsa sensacion de cierre.

Para destrabar el reset sin editar migraciones antiguas, la unica alternativa tecnica viable es una migracion de reparacion de orden que se aplique antes de `20260221231722`. Eso exige una version anterior a `20260221231722`, documentada explicitamente como reparacion de orden creada el 2026-04-17. Esa decision requiere autorizacion explicita porque entra en tension con la regla pedida de usar timestamp actual y no falsificar historia.

### Validacion Supabase

No se reejecuto `supabase start` ni `supabase db reset` en esta sesion porque no se aplico ningun cambio capaz de modificar el resultado. La validacion previa ya demostro el fallo exacto y una migracion actual no cambiaria el orden que lo provoca.

### Estado de cierre

El frente Supabase sigue bloqueado.

Bloqueo exacto vigente:

- Tipo: orden historico de migraciones.
- Funcion faltante antes del parche: `public.agro_rank_top_crops_profit(date,date,integer,uuid)`.
- Archivo que falla: `supabase/migrations/20260221231722_agro_profit_date_filters_inclusive.sql`.
- Causa: la definicion vive en `supabase/sql/agro_rankings_rpc_v1.sql`, pero no en una migracion previa.

`apps/gold/supabase/` NO se retiro y debe seguir conservandose como arbol secundario hasta que el reset canonico raiz pase.

### Build status

`pnpm build:gold` - OK.

Notas:
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK, 160 modules transformed
- `check-llms`: OK
- `check-dist-utf8`: OK
- Advertencia no bloqueante: Node actual `v25.6.0` no coincide con engine esperado `20.x`.
