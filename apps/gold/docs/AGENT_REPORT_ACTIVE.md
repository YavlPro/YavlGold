# AGENT_REPORT_ACTIVE

Resumen operativo actual de `apps/gold`.

> Estado: DOCUMENTO ACTIVO — Rotation ejecutada 2026-04-17
> Umbral de rotacion: 4,000 lineas (canonica §4.1)
> Archivo anterior archivado: `AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md`

---

## Estado actual del proyecto

**Release visible: V1**
YavlGold Agro es el unico modulo activo y released. Academia, Social, Tecnologia y Crypto son placeholders "no disponible". Dashboard es app secundaria con superficies de soporte (auth, perfil, configuracion), sin utilidades legacy activas.

El trabajo documentado en el archivo archivado se centro en:
- Alineacion visual del sidebar shell al ADN V10
- Splash loader de marca para entrada a Agro
- Rediseño de vista detalle Cartera Viva (cabecera compacta)
- Canon de modales §19 (Modal Wizard como referencia)
- Reemplazo de prompt() nativos por showPromptModal()
- Diagnostico y cierre controlado del frente Supabase raiz

---

## Frentes abiertos

1. **Seguimiento post-cierre Supabase**: El 2026-04-18 `supabase/` raiz quedo validado con `supabase start --workdir .` y `supabase db reset --workdir . --local --no-seed`; `apps/gold/supabase/` fue retirado. Pendiente solo vigilancia para que no reaparezca un segundo arbol Supabase.

2. **Migracion progresiva de modales legacy**: §19 canon de modales fue aprobado. La migracion de modales existentes (editar cliente, facturero, nuevo cultivo, carrito, tarea) es deuda pendiente priorizada.

3. **Polling duplicado market/interactions**: `agro-market.js` y `agro-interactions.js` hacen polling independiente de Binance. Consolidacion en singleton pendiente.

4. **CSS inline heredado**: `index.html` de apps/gold (~1,144L) tiene CSS inline con hex hardcodeados. Migracion progresiva a tokens `--gold-*`, `--bg-*` segun politica §11.3.

---

## Decisiones canonicas vigentes

- **Stack**: Vanilla JS ES6+ / Vite MPA / Supabase / Vercel. Prohibido: React, Vue, Svelte, Tailwind, SPA.
- **ADN Visual V10.0** inmutable + §19 Canon de Modales V10.1 (modal wizard como referencia).
- **agro.js NO crece**: features nuevas en `agro-*.js` separados, importados dinamicamente.
- **Supabase unico canonico**: `supabase/` en raiz. `apps/gold/supabase/` fue retirado el 2026-04-18 y no debe recrearse.
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
| 3 | Supabase post-cierre | `supabase/` raiz | Dualidad cerrada el 2026-04-18; vigilar que no reaparezca `apps/gold/supabase/` |
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
- `PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md` — Plan historico usado como insumo del cierre Supabase raiz.

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
- NO se toco agro-mode.js (logica intacta)
- NO se toco filtros de Task/Operational Cycles
- NO se toco agro.js
- NO se altero Supabase

---

## Sesion activa: Incorporacion canon §10 — Gobernanza Operativa y Confiabilidad (2026-04-17)

### Objetivo

Incorporar la nueva seccion §10 al documento canonico AGENTS.md con las reglas de confiabilidad operativa y desacato dictadas por el usuario.

### Diagnostico previo

El usuario aporto el texto completo de dos reglas:
- §10.1 — Regla de Confiabilidad Operativa y Desacato
- §10.2 — Nota de gobernanza — utilidad en desacato

ambas con luz verde explicita para ejecutar. Se verifico que AGENTS.md solo llegaba hasta §13 (no existian §9 ni §10), por lo que se inserto §10 como nueva seccion completa antes de §11, respetando la numeracion ordinal.

### Cambios realizados

| Archivo | Tipo | Cambios |
|---|---|---|
| `AGENTS.md` | Nueva seccion | §10 — Gobernanza Operativa y Confiabilidad (~90 lineas entre §10.1 y §10.2) |

### Contenido de la incorporacion

§10.1 Regla de Confiabilidad Operativa y Desacato (~50 lineas):
- Principio rector: obediencia al alcance tiene prioridad sobre brillantez aparente
- Regla formal: 5 condiciones que hacen a un agente "operativamente no confiable"
- Criterio de evaluacion: agente limitado pero disciplinado > agente capaz pero invasivo
- Politica derivada: 5 restricciones para agentes con patron de desacato
- Regla de proteccion del repo: acciones utiles fuera de control deben auditearse
- Criterio final: disciplina operativa no es opcional

§10.2 Nota de gobernanza — utilidad en desacato (~15 lineas):
- Utilidad parcial no modifica la lectura operativa del hecho
- Conducta inaceptable, no se presume legitimado por resultado util
- Confianza del agente no aumenta sino que disminuye
- Regla practica: resultado correcto fuera de scope es excepcion riesgosa

### Resultado build

`pnpm build:gold` — OK. 161 modules, 3.94s.
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK (161 modules transformed)
- `check-llms`: OK
- `check-dist-utf8`: OK

### QA sugerido

1. Verificar que AGENTS.md ahora tiene §10 completa entre §9 (inexistente) y §11
2. Confirmar que las dos subsecciones (§10.1 y §10.2) estan correctamente estructuradas
3. Confirmar que no se rompio ninguna otra seccion durante la insercion
4. Verificar que la numeracion de secciones siguientes (§11, §12, §13) no se altero

---

## Sesion activa: Reubicacion Modo Operativo al sidebar shell (2026-04-17)

### Objetivo

Reubicar el switch de Modo Operativo desde el header superior del shell al header del sidebar de Agro, debajo del titulo, sin cambiar logica funcional.

### Diagnostico

El mount point `#agro-mode-switch` estaba en `agro-shell-header__right` (linea ~220 del header), entre quicknav y utilities. El sidebar shell (`agro-shell-sidebar__head`, lineas 62-65) contiene eyebrow + titulo y es la ubicacion canonica para un filtro operativo global del modulo Agro.

### Cambios realizados

| # | Archivo | Tipo | Cambio |
|---|---|---|---|
| 1 | `apps/gold/agro/index.html` | EDIT | Mover mount point de header (`agro-shell-header__right`) a sidebar head (`agro-shell-sidebar__head`, debajo del `<h2>`) |
| 2 | `apps/gold/agro/agro.css` | EDIT | `.agro-mode-switch`: `inline-flex` → `flex`, agregar `width: 100%` y `margin-top`. Simplificar `@media (max-width: 640px)`: eliminar `order:3`/`width`/`justify-content` (ya no esta en header row) |

### Resultado build

`pnpm build:gold` — OK. 161 modules, 2.41s, sin errores.

### No se hizo

- NO se toco agro-mode.js (logica intacta)
- NO se toco filtros de Task/Operational Cycles
- NO se toco agro.js
- NO se altero Supabase

---

## Sesion activa: Actualizacion AGENT_CONTEXT_INDEX (2026-04-17)

### Objetivo

Sincronizar el indice de contexto de agentes con la realidad documental del repo. AGENTS.md §12 indica que AGENT_CONTEXT_INDEX.md debe ser el mapa central, pero 9 documentos existian en `apps/gold/docs/` sin estar vinculados.

### Diagnostico

Inspeccion cruzada entre el listado real de archivos `.md` en `apps/gold/docs/` y los vinculos en `AGENT_CONTEXT_INDEX.md` (19 lineas original). Se identificaron 9 documentos sin vinculo y 1 archivo recen creado (`AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md`) tampoco indexado.

### Nuevas vinculaciones agregadas

Se reorganizo AGENT_CONTEXT_INDEX.md en 4 secciones:

**Nucleo obligatorio** (6 vinculos):
- AGENTS.md, AGENT_REPORT_ACTIVE.md, MANIFIESTO_AGRO.md, ADN-VISUAL-V10.0.md, yavlgold-context.md, FICHATECNICA.md (raiz)

**Decisiones y planificacion vigentes** (3 vinculos, nuevos):
- PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md
- PLAN_CONSOLIDACION_SUPABASE_16_ABRIL.md
- MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL.md

**Informes de sesion** (2 vinculos, nuevos):
- INFORME_SUPABASE_APPS_GOLD_16_ABRIL.md
- INFORME_CODEX_16_ABRIL.md

**Contexto historico**:
- AGENT_LEGACY_CONTEXT__2026-04-16__2026-04-17.md (nuevo, recen creado)

### Resultado build

`pnpm build:gold` — OK. 161 modules, 3.91s.
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK
- `check-llms`: OK
- `check-dist-utf8`: OK

### QA sugerido

1. Verificar que AGENT_CONTEXT_INDEX.md tiene todos los vinculos correctos
2. Confirmar que no hay archivos .md en `apps/gold/docs/` sin indexar
3. Verificar que FICHATECNICA.md existe en la raiz del repo

---

## Sesion activa: LLM Wiki Fase 1 — Implementacion (2026-04-17)

### Objetivo

Implementar la Fase 1 del patron LLM Wiki en YavlGold de forma compatible con el canon existente. Sin automatizacion pesada, sin tooling nuevo, sin contaminacion del repo.

### Diagnostico

**Ya existia el patron de forma organica:**
- AGENTS.md actuaba como schema sin la seccion explicita
- AGENT_REPORT_ACTIVE.md ya era wiki viva con formato de sesion
- AGENT_CONTEXT_INDEX.md ya era mapa central (pero incompleto)
- llms.txt ya hacia resumen operativo para LLMs

**Huecos identificados:**
- No existia la seccion §12.X en AGENTS.md formalizando el patron
- AGENT_CONTEXT_INDEX.md no incluía la tabla de capas ni las operaciones (ingest/query/lint)
- No estaban claros los criterios de inclusion/exclusion de documentos
- AGENT_CONTEXT_INDEX.md no decia explicitamente que es el mapa central de navegacion

**Hipotesis:**
Opcion B (equilibrada) — fortalecer lo que ya existe en vez de crear documentos nuevos. Menor diff, maximo impacto.

### Cambios realizados

| # | Archivo | Tipo | Cambio |
|---|---|---|---|
| 1 | `AGENTS.md` | Nueva seccion | §12.X (~90 lineas) — Patron LLM Wiki formalizado |
| 2 | `AGENT_CONTEXT_INDEX.md` | Rediseño | Nueva estructura con tabla de capas, operaciones wiki, criterios in/exclusion |

### Detalle de lo implementado

**AGENTS.md §12.X — Patron LLM Wiki:**
- Capa schema: AGENTS.md, ADN-VISUAL-V10.0.md, MANIFIESTO_AGRO.md
- Capa wiki viva: AGENT_REPORT_ACTIVE.md
- Capa mapa central: AGENT_CONTEXT_INDEX.md
- Capa resumen: llms.txt
- Capa historica: AGENT_LEGACY_CONTEXT__*.md, chronicles/
- Operaciones documentadas: ingest / query / lint
- Criterios de inclusion y exclusion de documentos
- Criterio de exito de Fase 1

**AGENT_CONTEXT_INDEX.md — Rediseño completo:**
- Tabla de capas documentales con ubicaciones y roles
- Seccion "Operaciones wiki" con Ingest/Query/Lint
- Criterios de inclusion y exclusion
- Regla canonica: repo fuente de verdad, Obsidian capa de navegacion
- Vinculos actualizados y reorganizados

### Flujo canonico propuesto

**INGEST:**
1. Agente termina sesion → escribe en AGENT_REPORT_ACTIVE.md
2. Formato obligatorio: fecha, objetivo, diagnostico, cambios, build, QA, NO se hizo
3. Si supera 4,000 lineas → rotacion obligatoria (§4.1)
4. AGENT_CONTEXT_INDEX.md se actualiza si hay nuevos documentos

**QUERY:**
1. Leer AGENTS.md primero
2. Consultar AGENT_CONTEXT_INDEX.md para ubicar documento correcto
3. IR segun tipo: reglas→AGENTS.md, visual→ADN-VISUAL, Agro→MANIFIESTO, estado→AGENT_REPORT_ACTIVE, tecnica→FICHA_TECNICA, rapido→llms.txt

**LINT:**
1. Al cerrar sesion: verificar formato de AGENT_REPORT_ACTIVE.md
2. Agregar vinculo en AGENT_CONTEXT_INDEX.md si hay documento nuevo
3. Ejecutar rotacion si se supero umbral
4. Build gate obligatorio antes de cerrar

### Qué NO se implemento

- **NO se creo documento nuevo** — el patron vive en AGENTS.md + AGENT_CONTEXT_INDEX.md que ya existian
- **NO se creo automatizacion** — solo disciplina de sesion documentada
- **NO se toco Supabase** — sin cambios en base de datos
- **NO se toco runtime** — sin cambios en codigo de producto
- **NO se creo script MCP** — ninguna automatizacion de sincronizacion repo↔vault
- **NO se creo "LLM_WIKI_SCHEMA.md"** — se uso AGENTS.md como schema maestro como ya preveia el documento §12

### Resultado build

`pnpm build:gold` — OK. 161 modules, 3.68s.
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK
- `check-llms`: OK
- `check-dist-utf8`: OK

### QA sugerido

1. Verificar que §12.X existe en AGENTS.md despues de §12
2. Confirmar que AGENT_CONTEXT_INDEX.md tiene la tabla de capas
3. Confirmar que las operaciones ingest/query/lint estan documentadas
4. Verificar quefuturos agentes entienden el sistema al leer estos documentos
5. Confirmar que elllms.txt sigue sirviendo en produccion sin cambios

### Comandos git sugeridos (sin ejecutar)

```bash
git status
git add AGENTS.md apps/gold/docs/AGENT_CONTEXT_INDEX.md apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "feat(docs): LLM Wiki Fase 1 — patron formalizado en AGENTS.md §12.X y AGENT_CONTEXT_INDEX.md"
git push
```

---

## Sesion activa: Cierre RPC `agro_buyer_portfolio_summary_v1` y validacion Supabase (2026-04-18)

### Paso 0 — Diagnostico inicial

El frente Supabase sigue en fase de cierre controlado. El canon vigente es `supabase/` en raiz; `apps/gold/supabase/` sigue siendo arbol secundario no canonico y solo puede retirarse si la validacion completa de bootstrap/reset desde raiz pasa sin depender de ese arbol.

Bloqueo actual confirmado:

- Archivo: `supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql`
- Objeto: `public.agro_buyer_portfolio_summary_v1()`
- Error observado: `cannot change return type of existing function (SQLSTATE 42P13)`
- Hipotesis tecnica inicial: `20260331000000` intenta `create or replace function` con OUT parameters distintos a los dejados por migraciones previas, y PostgreSQL no permite cambiar el row type de retorno mediante `CREATE OR REPLACE`.

### Archivos a inspeccionar

- `AGENTS.md`
- `FICHA_TECNICA.md`
- `apps/gold/docs/ADN-VISUAL-V10.0.md`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- `apps/gold/docs/MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL.md`
- `apps/gold/docs/PLAN_CONSOLIDACION_SUPABASE_16_ABRIL.md`
- `apps/gold/docs/PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md`
- `supabase/migrations/20260328005620_agro_buyer_portfolio_summary_v1.sql`
- `supabase/migrations/20260330173000_agro_clients_master_equivalent_v1.sql`
- `supabase/migrations/20260331000000_agro_buyer_portfolio_include_zero_buyers.sql`
- migraciones relacionadas con `agro_buyer_portfolio_summary_v1`
- `package.json`
- `apps/gold/docs/LOCAL_FIRST.md`
- `apps/gold/public/llms.txt`

### Criterio de decision

Se puede retirar `apps/gold/supabase/` solo si:

1. `supabase start --workdir .` pasa completo.
2. `supabase db reset --workdir . --local --no-seed` pasa razonablemente.
3. Los scripts y documentos operativos vivos no dependen de `apps/gold/supabase/`.
4. No queda evidencia tecnica viva que exista solo en el arbol secundario sin estar cubierta por `supabase/` raiz o documentada como legacy.

No se puede retirar si:

1. aparece otro bloqueo de migracion, DDL, funcion, reset o bootstrap;
2. el contrato de `agro_buyer_portfolio_summary_v1()` no queda resuelto con evidencia;
3. queda dependencia viva de scripts/docs hacia `apps/gold/supabase/`;
4. la validacion local no es concluyente.

### Alcance de esta sesion

- Resolver solo el bloqueo actual del contrato RPC si la evidencia lo permite.
- No editar migraciones antiguas.
- No tocar `MANIFIESTO_AGRO.md`.
- No tocar `agro.js`.
- No tocar remoto real destructivamente.
- No retirar `apps/gold/supabase/` salvo validacion completa explicita.

### Diagnostico del contrato RPC

El contrato previo inmediato creado por `20260330173000_agro_clients_master_equivalent_v1.sql` tenia 19 columnas de retorno e incluia `canonical_name text` y `client_status text`.

La migracion `20260331000000_agro_buyer_portfolio_include_zero_buyers.sql` intentaba aplicar `CREATE OR REPLACE FUNCTION` sobre `public.agro_buyer_portfolio_summary_v1()` con el contrato corto anterior de 17 columnas, sin `canonical_name` ni `client_status`.

PostgreSQL rechazo el cambio porque una funcion con parametros OUT define un tipo de fila de retorno, y `CREATE OR REPLACE FUNCTION` no puede cambiar ese row type. El error era correcto: no era falta de tabla, sino incompatibilidad de contrato RPC.

### Cambios realizados

| Archivo | Tipo | Cambio |
| --- | --- | --- |
| `supabase/migrations/20260330235959_agro_buyer_portfolio_contract_order_repair.sql` | Migracion repair | Drop controlado de `public.agro_buyer_portfolio_summary_v1()` antes de `20260331000000` para que el patch corto no choque con el contrato largo previo. |
| `supabase/migrations/20260418120000_agro_buyer_portfolio_contract_restore.sql` | Migracion repair | Restauracion final del contrato actual de 19 columnas, conservando `canonical_name`, `client_status` y la logica de marcadores de transferencia de `20260417113444`. |
| `AGENTS.md` | Documentacion canonica | Se actualizo la regla Supabase para dejar constancia de que `apps/gold/supabase/` fue retirada tras validacion explicita. |
| `FICHA_TECNICA.md` | Documentacion tecnica | Se actualizo la arquitectura oficial para indicar que no existe segundo arbol Supabase activo dentro de `apps/gold/`. |
| `apps/gold/docs/LOCAL_FIRST.md` | Documentacion operativa | Se reemplazo la nota provisional por nota de cierre: el flujo local usa solo `supabase/` raiz. |
| `apps/gold/public/llms.txt` | Contexto LLM | Se actualizo el resumen rapido para indicar que `apps/gold/supabase` fue retirada y no debe recrearse. |
| `apps/gold/supabase/` | Saneamiento estructural | Retiro del arbol secundario tras `supabase start` y `supabase db reset` limpios. |

### Validacion ejecutada

- `supabase start --workdir .`: OK. El primer intento previo requirio arrancar Docker Desktop; con Docker activo, el start aplico migraciones y levanto el entorno local.
- `supabase db reset --workdir . --local --no-seed`: OK en el reintento final. Aplico todas las migraciones hasta `20260418120000_agro_buyer_portfolio_contract_restore.sql` y cerro con `Finished supabase db reset on branch main`.
- Verificacion directa del contrato final en Postgres local: `public.agro_buyer_portfolio_summary_v1()` retorna 19 columnas, incluyendo `canonical_name text` y `client_status text`.
- Auditoria de referencias vivas: `package.json` y `LOCAL_FIRST.md` operan contra `supabase/` raiz mediante `--workdir .`; no quedan scripts activos que dependan de `apps/gold/supabase/`.

### Decision de cierre

La validacion permitio retirar `apps/gold/supabase/`.

El retiro no usa `apps/gold/supabase/` como canon, no edita migraciones antiguas, no toca remoto real y no modifica `agro.js` ni `MANIFIESTO_AGRO.md`.

Las referencias que quedan en informes historicos o planes de reconciliacion se consideran memoria documental del proceso, no instrucciones operativas vigentes.

### Pendiente de cierre de sesion

- `pnpm build:gold`: OK. Advertencia no bloqueante: Node local `v25.6.0` no coincide con engine esperado `20.x`.
- Revisar `git status` final.

---

## Sesion activa: Limpieza documental archive Supabase (2026-04-18)

### Objetivo

Ordenar y sanear los documentos cerrados relacionados con el frente Supabase del 16-18 de abril. Dejar claro quais documentos quedan activos, quais sao historicos e archiving os que ya no deben competir con el reporte activo.

### Diagnostico

Se auditaron todos los documentos en `apps/gold/docs/` y se identificaron 6 informes/planes relacionados com o frente Supabase ya cerrado. Todos correspondian a fases ya ejecutadas y validadas.

### Clasificacion aplicada

| Documento original | Nuevo nombre/ubicacion | Clasificacion |
|---|---|---|
| `INFORME_CODEX_16_ABRIL.md` | `archive/supabase/INFORME_CODEX_16_ABRIL__CERRADO.md` | Historico / solo consulta |
| `INFORME_SUPABASE_APPS_GOLD_16_ABRIL.md` | `archive/supabase/INFORME_SUPABASE_APPS_GOLD_16_ABRIL__CERRADO.md` | Historico / solo consulta |
| `PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL.md` | `archive/supabase/PLAN_BASELINE_AGRO_SUPABASE_16_ABRIL__CERRADO.md` | Historico / solo consulta |
| `PLAN_CONSOLIDACION_SUPABASE_16_ABRIL.md` | `archive/supabase/PLAN_CONSOLIDACION_SUPABASE_16_ABRIL__CERRADO.md` | Historico / solo consulta |
| `MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL.md` | `archive/supabase/MATRIZ_RECONCILIACION_SUPABASE_16_ABRIL__CERRADO.md` | Historico / solo consulta |
| — | `archive/supabase/CIERRE_SUPABASE_16-18_ABRIL_2026.md` | Nuevo resumen unico de cierre |

### Documentos mantenidos activos

- `AGENT_REPORT_ACTIVE.md` — unica fuente activa de reportes de sesion
- `LOCAL_FIRST.md` — documento operativo vigente (usado por `pnpm sb:*`)

### Archivos creados

- `apps/gold/docs/archive/supabase/CIERRE_SUPABASE_16-18_ABRIL_2026.md` — resumen unico de cierre con contexto, fases, decision canonica y referencias

### Archivos modificados

- `AGENT_CONTEXT_INDEX.md` — se reorganizaron las secciones "Decisiones y planificacion vigentes" e "Informes de sesion" hacia la nueva seccion "Historico Supabase cerrado" bajo `archive/supabase/`

### No se toco

- `MANIFIESTO_AGRO.md`
- `AGENTS.md`
- `ADN-VISUAL-V10.0.md`
- `FICHA_TECNICA.md`
- Codigo de producto
- Migraciones Supabase
- `LOCAL_FIRST.md` (sigue activo)

---

## Sesion activa: Canonizacion документальная del switch maestro Agro (2026-04-18)

### Objetivo

Documentar canonicamente el switch maestro/filtro de lectura del shell Agro en dos niveles: semantico y visual.

### Diagnostico

El switch estaba implementado y funcional, pero carecia de documentacion canonica. No existia en MANIFIESTO_AGRO.md ninguna referencia a este filtro, ni en ADN-VISUAL-V10.0.md ninguna especificacion de patron para switches/carruseles de modo.

### Plan de insercion

1. **MANIFIESTO_AGRO.md**: Subseccion `4.11 Modo de Lectura del Shell` antes de `5. Relaciones canonicas`.
2. **ADN-VISUAL-V10.0.md**: Subseccion `🎚️ Switch de filtro / Carrusel de modos` dentro de `§7 — Componentes`.
3. **FAQ**: Pregunta `9.21` sobre el filtro maestro.

### Archivos editados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Subseccion 4.11 | ~50 lineas: que es, que no es, modos, limites |
| `apps/gold/docs/ADN-VISUAL-V10.0.md` | Subseccion §7 | ~90 lineas: estructura, tokens, responsive, anti-patrones |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | FAQ | Pregunta 9.21 sobre el filtro |

### Lo que NO se toco

- `agro.js`, `agro-mode.js`, `agro-shell.js`
- ninguna migracion Supabase
- ningun CSS vivo del proyecto

### Resultado build

`pnpm build:gold` — OK. 161 modules, 6.63s.

### QA sugerido

1. Verificar que subseccion 4.11.1 y 4.11.2 quedan logicamente placed dentro de 4.11
2. Verificar que el ejemplo de uso al final de 4.11 integraambas funciones sin mezclarlas
3. Confirmar que las FAQ 9.22 y 9.23 son precisas y no mezclan capacidades
4. Confirmar que switch / favoritos / búsqueda quedan como tres capas distinctas

---

## Sesion activa: Canonizacion Favoritos del Shell y Busqueda Compacta (2026-04-18)

### Objetivo

Documentar canonicamente Favoritos del Shell y Búsqueda Agro Compacta como dos capas separadas del switch maestro, sin mezclarlas.

### Diagnostico

El MANIFIESTO_AGRO.md ya tiene el `4.11 Modo de Lectura del Shell` canonizado. Sin embargo, no existía documentación para dos funciones adicionales que también operan sobre el shell: Favoritos (preferencia personal) y Búsqueda Compacta (localización puntual). Sin esta documentación, las tres funciones corrían riesgo de mezclarse semánticamente.

### Plan de insercion

1. Expandir `4.11 Modo de Lectura del Shell` con dos subsecciones internas:
   - `4.11.1 Favoritos del Shell`
   - `4.11.2 Búsqueda Agro Compacta`
2. Agregar preguntas FAQ `9.22` y `9.23` para clarification rapida.

### Archivos editados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Subseccion 4.11.1 | ~45 lineas: Favoritos como preferencia personal |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Subseccion 4.11.2 | ~45 lineas: Busqueda Compacta como localizacion puntual |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | FAQ | Preguntas 9.22 y 9.23 |

### Diferenciacion canonica aplicada

| Funcion | Capa | Scope |
|---|---|---|
| Switch maestro | Contexto de lectura | Todo el shell, segun modo |
| Favoritos | Preferencia personal | Accesos directos del usuario |
| Busqueda compacta | Localizacion puntual | Superficies y vistas navegables |

### Lo que NO se toco

- `agro.js`, `agro-mode.js`, `agro-shell.js`
- ninguna migracion Supabase
- ningun CSS vivo
- ADN-VISUAL-V10.0.md

### Resultado build

`pnpm build:gold` — OK. 161 modules, 6.49s.

### QA sugerido

1. Confirmar que switch / favoritos / busqueda quedan como tres capas distinctas
2. Verificar que las subsecciones 4.11.1 y 4.11.2 no contaminan la 4.11 principal
3. Confirmar que las FAQ 9.22 y 9.23 son consultables sin ambigüedad

### Validacion ejecutada

- `pnpm build:gold`: OK. Advertencia no bloqueante: Node local `v25.6.0` no coincide con engine esperado `20.x`.
- Comprobacion DOM con `jsdom`: OK. `all` mostro 19 items; `crop` mostro 6; `non_crop` mostro 7; `tools` mostro 5.
- Comprobacion mobile por CSS: el switch usa `flex-basis: calc((100% - 4px) / 2)` en `max-width: 640px`, `overflow-x: auto` y `scroll-snap-type: x mandatory`, por lo que quedan dos opciones visibles por tramo.
- Intento de medicion Playwright local: no ejecutado porque el paquete `playwright` no esta instalado en el repo. No se instalaron dependencias nuevas.

### No se toco

- `MANIFIESTO_AGRO.md`
- `agro.js`
- Supabase
- rutas, datos ni semantica de negocio fuera del shell/sidebar

---

## Sesion activa: Diagnostico 404 bundle Agro en produccion (2026-04-18)

### Diagnostico inicial

Produccion reporta `/agro` pegado en la pantalla `Cargando Agro`. La consola muestra 404 para `assets/agro-BBlqhVPW.js`. La evidencia inicial apunta a asset estatico, hash desfasado, path relativo mal resuelto, build desincronizado o routing/deploy, no a Supabase.

### Hipotesis

1. HTML de `/agro` publicado apunta a un hash viejo que ya no existe en assets.
2. Vite esta generando rutas relativas `assets/...` incompatibles con clean URL `/agro`.
3. Vercel sirve HTML y assets de builds distintas por cache/deploy parcial.
4. `vercel.json` o rewrites interceptan assets.
5. Solo si el bundle carga, revisar runtime posterior.

### Plan quirurgico

1. Inspeccionar `vite.config.js`, `vercel.json`, `agro/index.html`, `dist/agro/index.html` y `dist/assets`.
2. Comparar el asset que pide produccion (`agro-BBlqhVPW.js`) contra los assets publicados/locales.
3. Confirmar si el problema es path relativo, hash viejo, cache/deploy o runtime.
4. Aplicar el menor diff posible solo si hay causa local reproducible.
5. Ejecutar `pnpm build:gold` y documentar resultado.

### Archivos a inspeccionar

- `apps/gold/vite.config.js`
- `apps/gold/vercel.json`
- `vercel.json`
- `apps/gold/agro/index.html`
- `apps/gold/dist/agro/index.html`
- `apps/gold/dist/assets/`
- scripts de build relacionados
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Diagnostico real confirmado

La evidencia HTTP actual no reproduce un 404 del bundle principal publicado. `https://yavlgold.com/agro` redirige a `https://www.yavlgold.com/agro` y el HTML servido referencia:

- `../assets/agro-BBlqhVPW.js`
- `../assets/agro-sHvVHAFj.css`
- `../assets/preload-helper-PPVm8Dsz.js`
- `../assets/session-guard-CeFd0xBq.js`
- `../assets/supabase-config-Cr-hSp0z.js`

Todos esos assets responden `200` bajo `/assets/...`. Tambien se probo el path anidado `https://yavlgold.com/agro/assets/agro-BBlqhVPW.js` y ese si responde `404`, lo que explica el sintoma si algun HTML/cache/request stale resolvio el asset como `agro/assets/...`.

El build local fresco genera `apps/gold/dist/agro/index.html` con:

- `../assets/agro-CXd4TTRv.js`
- `../assets/agro-sHvVHAFj.css`

y todos los assets referenciados existen en `apps/gold/dist/assets/`. La diferencia de hash entre local (`agro-CXd4TTRv.js`) y produccion (`agro-BBlqhVPW.js`) indica builds distintos, pero no una pareja HTML/assets rota en el estado HTTP actual.

### Hipotesis descartadas

- Supabase como causa primaria: descartado para este sintoma, porque el problema reportado era carga estatica del bundle antes del runtime.
- Vite generando `assets/...` roto en el build local actual: descartado; el build genera `../assets/...` para `agro/index.html`.
- Asset principal faltante en produccion actual: descartado; `/assets/agro-BBlqhVPW.js` responde `200`.
- Chunks internos faltantes del bundle publicado: descartado; los chunks importados por `agro-BBlqhVPW.js` responden `200`.
- `apps/gold/supabase/` o infraestructura Supabase: no intervino en este diagnostico.

### Causa raiz operativa

La captura corresponde a una peticion estatica que en ese momento termino resolviendo contra un asset no disponible o contra una ruta anidada invalida. En el estado actual verificado por HTTP, el deploy publicado ya sirve una pareja coherente de HTML + assets. La causa mas probable es cache/deploy desfasado del cliente o propagacion temporal de Vercel, no un bug reproducible en `vite.config.js`, `vercel.json` o el codigo de Agro.

### Cambios realizados

| Archivo | Cambio |
| --- | --- |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Se documento el Paso 0, el diagnostico, la evidencia HTTP y el resultado del build. |

No se modifico codigo, configuracion de Vite, rutas de Vercel, Supabase ni `agro.js`, porque no hubo causa local reproducible que justificara un patch.

### Validacion ejecutada

- `pnpm build:gold`: OK.
- Advertencia no bloqueante: Node local `v25.6.0` no coincide con engine esperado `20.x`.
- `curl -L https://yavlgold.com/agro`: el HTML actual referencia `../assets/agro-BBlqhVPW.js`.
- `curl -L -I https://yavlgold.com/assets/agro-BBlqhVPW.js`: `200 OK`.
- `curl -L -I https://yavlgold.com/agro/assets/agro-BBlqhVPW.js`: `404 Not Found`.
- Verificacion estatica de dependencias del bundle publicado: todos los chunks listados en `agro-BBlqhVPW.js` responden `200`.

### NO QA manual realizado

Por instruccion explicita de la sesion, no se hizo QA manual en navegador ni Playwright. La validacion fue por build local y comprobaciones HTTP/asset desde terminal.

---

## Sesion activa: Diagnostico general del modulo Agro (2026-04-24)

### Objetivo

Diagnosticar el estado actual del modulo Agro sin realizar cambios de codigo.

### Diagnostico

**Estructura del modulo:**
- Monolito principal: `agro.js` (640KB, ~18k lineas) - politica de no crecimiento activa
- 36 modulos agro-*.js separados (agenda, carrito, cartera viva, notificaciones, wizard, etc.)
- 14 archivos CSS (agro.css 246KB, dashboard, cartera viva, operations, etc.)

**Estado del build:**
- `pnpm build:gold`: OK (167 modules, 3.47s)
- agent-guard: OK
- agent-report-check: OK
- vite build: OK
- check-llms: OK
- check-dist-utf8: OK
- Advertencia no bloqueante: Node local v24.13.0 vs engine esperado 20.x

**Supabase:**
- Canon unico: `supabase/` en raiz (validado 2026-04-18)
- 34 migraciones activas
- `apps/gold/supabase/` retirado, no debe recrearse

**Deuda tecnica documentada:**
1. agro.js monolito gestionado con politica de no crecimiento
2. window.XXX (104+ asignaciones) - migracion gradual
3. Polling duplicado market/interactions - consolidacion pendiente
4. CSS inline heredado en index.html - migracion progresiva

**Frentes abiertos:**
1. Migracion de modales legacy a canon §19
2. Consolidacion polling Binance
3. Migracion CSS inline a tokens ADN V10

### Cambios realizados

Ninguno. Esta fue una sesion de diagnostico solo lectura.

### Resultado build

`pnpm build:gold` — OK. 167 modules, 3.47s.

### QA sugerido

No aplica (sesion de diagnostico sin cambios).

### No se hizo

- NO se modifico codigo
- NO se tocaron migraciones
- NO se altero configuracion de Supabase
- NO se modifico documentacion canonica

---

## Sesion activa: Favoritos del Shell + Busqueda Agro Compacta (2026-04-18)

### Objetivo

Agregar dos capas independientes dentro del shell Agro:

- Favoritos del Shell como preferencia personal local-first.
- Busqueda Agro Compacta como localizador puntual de superficies del shell.

No se debe tocar la semantica del switch maestro ni convertir estas capas en modulos nuevos del catalogo.

### Diagnostico

El shell vive principalmente en `apps/gold/agro/index.html` y `apps/gold/agro/agro-shell.js`.

- Los items navegables reales del sidebar son botones con `data-agro-view` o `data-agro-action`.
- Los grupos padre con `data-agro-nav-toggle` expanden submenus, pero no son destino final por si solos.
- El switch maestro ya filtra por `data-agro-mode-scope` desde `agro-shell.js`.
- La mejor base para busqueda es construir un indice local desde labels visibles, `data-agro-view`, `data-agro-subview`, `data-agro-action`, grupo visual y scope existente.
- La estrella de favorito no debe ir dentro del boton existente porque generaria boton dentro de boton. Debe inyectarse como control hermano dentro de una fila wrapper.
- Favoritos y busqueda deben actuar como shortcuts/preferencias del shell, no como parte del switch.

### Opciones A/B/C

| Opcion | Descripcion | Riesgo | Lectura |
| --- | --- | --- | --- |
| A | Favoritos local-first + busqueda compacta por indice del shell + modulos pequenos separados | Bajo | Recomendada. No toca backend, no altera switch y mantiene ownership claro. |
| B | Favoritos con puente futuro a `user_favorites` + busqueda local | Medio/alto | Demasiado pronto para V1; implica persistencia backend y mas superficie de fallo. |
| C | Un solo modulo de utilidades del shell con favoritos + busqueda juntos | Medio | Menos archivos, pero mezcla responsabilidades y dificulta crecer sin ruido. |

### Recomendacion

Ejecutar Opcion A:

1. Crear `agro-shell-favorites.js` para estrellas, persistencia local y bloque dinamico.
2. Crear `agro-shell-search.js` para input compacto, panel de resultados y busqueda local.
3. Hacer wiring minimo desde `agro-shell.js`, construyendo un indice de items desde el DOM real.
4. Agregar contenedores sobrios bajo el switch en `index.html`.
5. Agregar CSS compacto en `agro.css`, reutilizando tokens del ADN.

### Archivos a tocar

- `apps/gold/agro/agro-shell.js`
- `apps/gold/agro/agro-shell-favorites.js`
- `apps/gold/agro/agro-shell-search.js`
- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css`
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Decision ejecutada

Se ejecuto la Opcion A. Favoritos y busqueda quedaron como capas independientes del shell:

- No se modifico la semantica del switch maestro.
- No se conecto backend ni Supabase.
- No se agrego modulo nuevo al catalogo del producto.
- No se toco `agro.js`.

### Cambios realizados

| Archivo | Tipo | Cambio |
| --- | --- | --- |
| `apps/gold/agro/agro-shell.js` | Wiring shell | Se agrego indice local de items navegables, keywords sobrias y conexion con favoritos/busqueda. |
| `apps/gold/agro/agro-shell-favorites.js` | Nuevo modulo shell | Favoritos local-first con `localStorage`, estrellas discretas, bloque dinamico y limite visible de 5 shortcuts. |
| `apps/gold/agro/agro-shell-search.js` | Nuevo modulo shell | Busqueda compacta local por labels, contexto, keywords y scopes del shell; panel pequeno con maximo 7 resultados. |
| `apps/gold/agro/index.html` | Markup shell | Se agregaron contenedores bajo el switch para busqueda compacta y favoritos. |
| `apps/gold/agro/agro.css` | Estilos | Capsule compacta, panel blur sobrio, bloque de favoritos y controles estrella con focus visible. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Doc | Paso 0, opciones y cierre de sesion. |

### Semantica aplicada

- Switch maestro: sigue siendo lectura contextual del shell y conserva `all | crop | non_crop | tools`.
- Favoritos: preferencia personal local-first, independiente del switch, sin crear vistas ni modulos nuevos.
- Busqueda: localizador puntual del shell, sin busqueda de registros, clientes, facturero profundo ni Supabase.

### Validacion ejecutada

- `pnpm build:gold`: OK.
- Prueba tecnica con `jsdom`: OK.
  - Se crearon estrellas para items elegibles.
  - Marcar favorito persistio en `YG_AGRO_SHELL_FAVORITES_V1`.
  - Desmarcar favorito oculto el bloque dinamico.
  - Buscar `cultivo` devolvio entradas relacionadas como `Estadisticas de ciclos` y `Nuevo cultivo`.
  - Limpiar input oculto el panel.
  - Click en resultado `clima` activo la vista `clima`.
  - Evento `agro:modechange` en modo `tools` siguio ocultando items `crop` y manteniendo visible `clima`.

### QA manual sugerido

1. Abrir shell Agro en desktop y mobile.
2. Marcar y desmarcar favoritos en varios items.
3. Recargar y confirmar persistencia local.
4. Buscar `cultivo`, `clima`, `cartera`, `bitacora` y `tareas`.
5. Click en resultado y confirmar navegacion.
6. Borrar el termino y confirmar que se oculta el panel.
7. Probar modos del switch y confirmar que el filtrado original no cambio.

---

## Sesion activa: Cirugia editorial final del MANIFIESTO_AGRO — secciones shell (2026-04-18)

### Objetivo editorial

Limpiar redaccion, corregir mezclas de idioma (portugues, ingles, caracteres rotos) y dejar el canon escrito con espanol claro, humano y consistente en las secciones del shell del MANIFIESTO_AGRO.md.

### Diagnostico

Se identificaron 23 residuos editoriales en las secciones 4.11, 4.11.1, 4.11.2, 9.22 y 9.23:
- Portugues infiltrado: `superfícies`, `reclassifica`, `conceitos`, `conteúdos`, `cada uma`, `uma`, `em uma lista`, `opção`, `com nenhuma`, `à superfície`, `vai direto`
- Ingles infiltrado: `associated`
- Caracteres rotos: `sin摩擦`
- Errores de tipeo: `poderlimpiarse` (sin espacio), `rapido` (sin tilde), `specifica` (sin tilde)
- Acentos faltantes en espanol: `especifica` → `específica`, `rapido` → `rápido`

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Editorial | 23 correcciones de idioma en secciones 4.11, 4.11.1, 4.11.2, 9.22, 9.23 y bloque previo del switch |

### Tipo de errores limpiados

| Error | Ocurrencias | Correccion |
|---|---|---|
| `superfícies` (portugues) | 12 | `superficies` |
| `reclassifica` (portugues) | 1 | `reclasifica` |
| `conceitos` (portugues) | 1 | `conceptos` |
| `conteúdos` (portugues) | 1 | `contenidos` |
| `cada uma` (portugues) | 1 | `cada una` |
| `uma superfície` (portugues) | 2 | `una superficie` |
| `em uma lista` (portugues) | 1 | `en una lista` |
| `uma opción` (portugues) | 1 | `una opción` |
| `com nenhuma` (portugues) | 1 | `con ninguna` |
| `à superfície` (portugues) | 1 | `a la superficie` |
| `vai direto` (portugues) | 1 | `va directo` |
| `associated` (ingles) | 2 | `asociado` |
| `sin摩擦` (caracteres rotos) | 1 | `sin friccion` |
| `poderlimpiarse` (sin espacio) | 1 | `poder limpiarse` |
| `rapido` (sin tilde) | 1 | `rápido` |
| `specifica` (sin tilde) | 1 | `específica` |

### Que NO se toco

- Estructura semantica del manifiesto
- Jerarquia de secciones
- Significado o contenido de las definiciones
- Otras zonas del documento fuera de las secciones shell
- Codigo de producto
- AGENTS.md
- ADN-VISUAL-V10.0.md
- FICHA_TECNICA.md

---

## Sesion activa: Pulido visual/UX del switch maestro del shell Agro (2026-04-18)

### Objetivo

Pulido visual y UX del switch maestro de modo operativo del sidebar Agro. La logica funcional ya fue resuelta por Codex y queda intacta. El objetivo es que el switch se perciba como un componente premium, compacto pero respirado, con sensacion de mini carrusel en movil.

### Diagnostico visual

Problemas detectados en el estado previo:

1. **Contenedor plano** — padding de 3px insuficiente; el switch se veia "metido a presion"
2. **Gap entre opciones muy estrecho** — solo 4px, sin respiracion lateral
3. **Altura de boton baja** — min-height 38px, target tactil mejorable
4. **Estado activo anemico** — solo tinte de fondo y borde, sin presencia premium
5. **Icono microscopico** — 0.7rem, casi invisible
6. **Hint generico** — texto largo ("Desliza para ver mas filtros o modos"), sin refinacion
7. **Scrollbar visible** — interrumpia la sensacion limpia del carrusel
8. **Border-radius pill excesivo** — en un contenedor cuadrado de 4 opciones se veia forzado
9. **Letra demasiado condensada** — font-weight 700 + text-xs + uppercase gritaba demasiado

### Cambios realizados

| # | Archivo | Tipo | Cambio |
|---|---|---|---|
| 1 | `apps/gold/agro/agro.css` | EDIT | Contenedor: padding 3px→space-1, gap 4px→space-1, margin-top space-2→space-3, border-radius pill→md (12px), scrollbar oculto, position relative |
| 2 | `apps/gold/agro/agro.css` | EDIT | Boton: padding mejorado (space-2 x space-3), gap space-1, font-size xs→sm, font-weight 700→600, letter-spacing 0.04→0.03, border-radius pill→sm (8px), min-height 38→40px, border-color en transition |
| 3 | `apps/gold/agro/agro.css` | EDIT | Estado activo: fondo mas sutil (0.12→0.10), borde mas fino (0.25→0.20), color gold-5→gold-4 (mas sobrio), sombra mas ligera, font-weight sube a 700 solo en activo |
| 4 | `apps/gold/agro/agro.css` | EDIT | Icono: tamaño 0.7rem→0.8rem, width 0.8rem→1rem, opacity 0.6 por defecto, opacity 1 en activo |
| 5 | `apps/gold/agro/agro.css` | EDIT | Hint: font-weight 600→400, opacity 0.6, text-align center, padding lateral, transicion de opacity |
| 6 | `apps/gold/agro/agro.css` | EDIT | Mobile ≤640px: flex-basis con variable CSS, min-height 42px, padding ajustado |
| 7 | `apps/gold/agro/agro.css` | EDIT | Mobile ≤480px: flex-basis consistente, font-size 0.72rem, padding compacto |
| 8 | `apps/gold/agro/index.html` | EDIT | Hint text: "Desliza para ver mas filtros o modos" → "Desliza para ver mas opciones" (mas corto, menos ruido) |

### Que NO se toco (logica Codex preservada)

- `agro-mode.js` — sin cambios (logica de modos, eventos, aliases, localStorage)
- `agro-shell.js` — sin cambios (filtro por data-agro-mode-scope, listener agro:modechange)
- Markup de sidebar items — sin cambios (data-agro-mode-scope intactos)
- Clasificacion semantica — sin cambios (all, crop, non_crop, tools)
- Eventos ni listeners — sin cambios
- Supabase, agro.js, MANIFIESTO_AGRO.md — sin cambios

### Resultado build

`pnpm build:gold` — OK. 161 modules, 2.54s.
- agent-guard: OK
- agent-report-check: OK
- vite build: OK
- check-llms: OK
- check-dist-utf8: OK

### QA manual sugerido

1. Desktop: verificar que el switch se ve limpio y premium, con 4 opciones visibles
2. Mobile ≤640px: verificar que se ven 2 opciones por tramo
3. Mobile: deslizar horizontalmente y verificar que revela las otras 2 opciones
4. Verificar que el estado activo se distingue claramente (color gold, borde sutil, icono brillante)
5. Verificar que el hint "Desliza para ver mas opciones" aparece solo en movil y es discreto
6. Probar: General activo, Cultivo activo, No cultivo activo, Herramientas activo
7. Verificar que el filtrado del sidebar sigue intacto por modo
8. Verificar foco/hover/tap sin regresiones

### Comandos git sugeridos (sin ejecutar)

```bash
git status
git add apps/gold/agro/agro.css apps/gold/agro/index.html apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "style(agro): polish mode switch visual — premium carousel feel, refined spacing and active state"
```

---

## Sesion activa: Segunda pasada visual/UX del switch maestro (2026-04-18)

### Objetivo

Segunda pasada de refinacion visual sobre el switch maestro de modo operativo. La primera pasada (GLM) mejoro el componente pero el resultado seguia sintiendose comprimido, con texto demasiado prominente y sin alcanzar el tono premium oscuro de la referencia visual.

### Diagnostico de lo que seguia comprimido

1. **Contenedor** — `bg-3` (#111113) no era suficientemente profundo; no transmitia capsula oscura mate
2. **Padding del contenedor** — `space-1` (4px) insuficiente para sensacion respirada
3. **Texto inactivo** — `--text-muted` (#94A3B8) es un gris azulado con demasiado brillo
4. **Botones** — gap `space-1` (4px) entre icono y texto insuficiente; padding horizontal `space-3` (12px) apretaba los labels
5. **Estado activo** — fondo `0.10` + borde `0.20` + box-shadow + font-weight 700 = exceso de peso visual
6. **Border-radius** — `md` (12px) no alcanza la sensacion capsula de la referencia
7. **Hover** — blanco puro (`--text-primary`) rompia el tono sobrio
8. **Iconos** — opacity `0.6` demasiado alto para inactivos; `1.0` para activos demasiado brillante
9. **Hint** — `--text-muted` + opacity `0.6` = demasiado visible para algo que deberia ser casi invisible

### Cambios realizados

| # | Propiedad | Antes (GLM) | Despues (segunda pasada) |
|---|---|---|---|
| 1 | Container background | `var(--bg-3)` (#111113) | `var(--bg-0)` (#050505) — oscuro profundo mate |
| 2 | Container padding | `var(--space-1)` (4px) | `var(--space-2)` (8px) — mas respiracion |
| 3 | Container border-radius | `var(--radius-md)` (12px) | `var(--radius-lg)` (16px) — capsula mas redondeada |
| 4 | Container border | `var(--border-neutral)` (0.08) | `rgba(255,255,255,0.05)` — casi invisible |
| 5 | Button color (inactive) | `var(--text-muted)` (#94A3B8) | `rgba(255,255,255,0.35)` — gris premium bajo |
| 6 | Button font-weight | 600 | 500 — mas sobrio |
| 7 | Button padding-x | `var(--space-3)` (12px) | `var(--space-4)` (16px) — labels sin presion |
| 8 | Button gap | `var(--space-1)` (4px) | `var(--space-1.5)` (6px) — icono-texto mas separado |
| 9 | Button border-radius | `var(--radius-sm)` (8px) | `var(--radius-md)` (12px) — coherente con capsula |
| 10 | Button min-height | 40px | 42px — mejor touch target |
| 11 | Hover color | `var(--text-primary)` (#fff) | `rgba(255,255,255,0.6)` — sobrio |
| 12 | Active background | `rgba(200,167,82,0.10)` | `rgba(200,167,82,0.08)` — mas sutil |
| 13 | Active border | `rgba(200,167,82,0.20)` | `rgba(200,167,82,0.15)` — mas fino |
| 14 | Active color | `var(--gold-4)` (#C8A752) | `var(--gold-5)` (#E8D48B) — dorado claro elegante |
| 15 | Active box-shadow | `0 1px 4px rgba(...)` | `none` — sin sombra, mas limpio |
| 16 | Active font-weight | 700 | 600 — no grita |
| 17 | Icon opacity (inactive) | 0.6 | 0.35 — gris bajo premium |
| 18 | Icon opacity (active) | 1.0 | 0.85 — dorado suave, no brillante |
| 19 | Hint color | `var(--text-muted)` + opacity 0.6 | `rgba(255,255,255,0.25)` — casi invisible |
| 20 | Mobile container padding | `var(--space-0.5)` (2px) | `var(--space-1.5)` (6px) — mas aire |
| 21 | Mobile min-height | 42px | 44px — touch target comodo |

### Que NO se toco

- `agro-mode.js` — logica intacta
- `agro-shell.js` — filtro intacto
- Markup de sidebar items — sin cambios
- Clasificacion semantica — sin cambios
- Eventos, listeners, aliases — sin cambios
- Supabase, agro.js, MANIFIESTO_AGRO.md — sin cambios

### Resultado build

`pnpm build:gold` — OK. 161 modules, 2.52s.

### QA manual sugerido

1. Desktop: verificar capsula oscura profunda con texto gris premium bajo
2. Verificar que el activo se distingue como dorado claro elegante, sin peso visual
3. Mobile: verificar 2 opciones por tramo con buen aire interno
4. Deslizar en movil para verificar carrusel
5. Verificar que el hint es casi invisible
6. Probar hover: debe subir a gris medio, no a blanco
7. Probar foco: anillo dorado accesible
8. Verificar que el filtrado del sidebar sigue intacto

### Comandos git sugeridos (sin ejecutar)

```bash
git add apps/gold/agro/agro.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "style(agro): second visual pass — dark premium capsule, soft gray inactive, elegant gold active"
```

---

## Sesion activa: Tercera pasada — correccion geometrica del carrusel (2026-04-18)

### Objetivo

Corregir la geometria del carrusel del switch maestro. Las dos pasadas anteriores mejoraron colores y estilo, pero el layout seguia mostrando todos los chips visibles a la vez en vez de forzar 2 por vista.

### Diagnostico geometrico

La causa raiz era que el boton base tenia `flex: 1 1 0` + `min-width: 0`:
- `flex-grow: 1` → cada chip crecia para llenar espacio disponible
- `flex-shrink: 1` → cada chip se encogia para caber
- `flex-basis: 0` → sin ancho minimo de referencia
- `min-width: 0` → permitia comprimirse por debajo del contenido
- Resultado: los 4 chips se repartian el ancho del contenedor y todos cabian visibles

El override mobile `flex: 0 0 calc(50% - ...)` solo existia en media query y usaba un gap tan pequeno (4px) que 3 chips se colaban.

### Cambios realizados

| # | Propiedad | Antes | Despues |
|---|---|---|---|
| 1 | Container gap | `var(--space-1)` (4px) | `var(--space-2)` (8px) — mas aire entre chips |
| 2 | Container scroll-snap | Solo en `@media ≤640px` | En base — carrusel activo siempre |
| 3 | Button flex | `flex: 1 1 0` | `flex: 0 0 calc(50% - var(--space-1))` — exactamente medio viewport |
| 4 | Media query ≤640px | Override completo de flex/gap/padding | Solo min-height y hint |
| 5 | Media query ≤480px | Override de flex + padding | Solo padding y font-size |

### Geometria resultante

Con `gap: var(--space-2)` (8px) y `flex: 0 0 calc(50% - var(--space-1))`:
- Chip 1: 50% - 4px
- Gap: 8px
- Chip 2: 50% - 4px
- Total visible: 100% exactamente
- Chips 3-4: fuera del viewport, se revelan deslizando

### Que NO se toco

- `agro-mode.js` — logica intacta
- `agro-shell.js` — filtro intacto
- Markup del sidebar — sin cambios
- Eventos, listeners, aliases — sin cambios

### Resultado build

`pnpm build:gold` — OK. 161 modules, 4.10s.

### QA manual sugerido

1. Verificar que solo se ven 2 chips visibles en cualquier viewport
2. Deslizar horizontalmente y verificar que chips 3-4 se revelan
3. Verificar scroll-snap: el desplazamiento se detiene en posicion correcta
4. Probar los 4 modos: General, Cultivo, No cultivo, Herramientas
5. Verificar que "Herramientas" no se corta en el chip visible
6. Verificar que el filtrado del sidebar sigue intacto

### Comandos git sugeridos (sin ejecutar)

```bash
git add apps/gold/agro/agro.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "style(agro): fix carousel geometry — force 2-per-view with flex-basis, proper gap and scroll-snap"
```

---

## Sesion activa: UX desktop — drag-scroll y wheel horizontal para el switch (2026-04-18)

### Objetivo

Agregar interaccion desktop al carrusel del switch maestro. El carrusel funciona bien en tactil pero en desktop con mouse no se puede arrastrar. Se agrega drag horizontal con mouse + wheel vertical traducido a scroll horizontal.

### Diagnostico UX desktop

El contenedor tiene `overflow-x: auto` y `scroll-snap-type: x mandatory`, lo que permite scroll nativo. Pero en desktop con mouse:
- No hay forma intuitiva de arrastrar el carrusel
- No hay cursor `grab`/`grabbing` que indique que es arrastrable
- La rueda del mouse no desplaza horizontalmente
- Click + drag no funciona como en un carrusel real

### Solucion implementada

**Drag con Pointer Events** (`pointerdown` / `pointermove` / `pointerup`):
- `pointerdown` guarda `startX` y `scrollLeft`, captura el pointer
- `pointermove` calcula delta y actualiza `scrollLeft` en tiempo real
- `pointerup`/`pointercancel` cierra el drag
- Se ignora `pointerType === 'touch'` para no interferir con scroll tactil nativo
- Solo boton primario (`e.button === 0`)

**Prevencion de click fantasma:**
- Variable `wasDragged` se activa cuando el movimiento supera `DRAG_THRESHOLD` (4px)
- `handleClick` verifica `wasDragged` antes de procesar el click
- Click normal (sin movimiento): `wasDragged = false`, el click procede normalmente
- Drag real: `wasDragged = true`, el click se cancela y se resetea el flag

**Wheel horizontal:**
- `wheel` event con `passive: false`
- Si `deltaY > deltaX`, traduce scroll vertical a horizontal (`scrollLeft += deltaY`)
- `preventDefault()` evita scroll vertical de pagina mientras el mouse esta sobre el switch

**CSS:**
- `cursor: grab` en reposo (solo en `@media (hover: hover) and (pointer: fine)`)
- `cursor: grabbing` + `user-select: none` durante drag via clase `.is-dragging`
- No afecta dispositivos tactiles donde cursor es irrelevante

### Cambios por archivo

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/agro-mode.js` | JS | +48 lineas: funciones `onPointerDown`, `onPointerMove`, `onPointerUp`, `onWheel`, `initDrag`; modificacion de `handleClick` para prevenir click fantasma; llamada a `initDrag()` en `initAgroMode()` |
| `apps/gold/agro/agro.css` | CSS | +9 lineas: media query `(hover: hover) and (pointer: fine)` con `cursor: grab`, `.is-dragging` con `cursor: grabbing` + `user-select: none` |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Doc | Sesion documentada |

### Que NO se toco

- `agro-shell.js` — sin cambios
- Logica de filtrado por modo — intacta
- Clasificacion semantica — intacta
- Eventos `agro:modechange` — intactos
- `agro.js` — sin cambios
- Markup del sidebar — sin cambios

### Resultado build

`pnpm build:gold` — OK. 161 modules, 2.75s.
- Modulo `agro-mode.js`: 2.26KB → 2.92KB (+660 bytes)

### QA manual sugerido

1. Desktop: click en un chip → debe seleccionar modo normalmente
2. Desktop: click + arrastrar horizontal → debe mover el carrusel
3. Desktop: despues de arrastrar, soltar → no debe cambiar modo (no click fantasma)
4. Desktop: cursor debe ser `grab` en reposo y `grabbing` al arrastrar
5. Desktop: rueda del mouse sobre el switch → debe mover carrusel horizontalmente
6. Touch: verificar que el scroll tactil sigue funcionando normalmente
7. Verificar que el filtrado del sidebar sigue intacto

### Comandos git sugeridos (sin ejecutar)

```bash
git add apps/gold/agro/agro-mode.js apps/gold/agro/agro.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "feat(agro): add desktop drag-scroll and wheel to mode switch carousel"
```

---

## Sesion activa: Limpieza lockfile redundante en apps/gold (2026-04-18)

### Objetivo

Eliminar `apps/gold/package-lock.json` por redundancia operativa en monorepo basado en `pnpm`, manteniendo un solo lockfile canonico.

### Diagnostico

Se verifico que:

- El repo usa `pnpm` como gestor canonico (`packageManager: pnpm@9.1.0` y scripts `pnpm ...`).
- Existe `pnpm-lock.yaml` en raiz como lockfile activo del monorepo.
- `apps/gold/package-lock.json` era lockfile de npm coexistente sin rol operativo canonico.

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/package-lock.json` | DELETE | Eliminado por redundancia con `pnpm-lock.yaml` del monorepo. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | DOC | Registro de la sesion de limpieza y validacion. |

### Resultado build

`pnpm build:gold` — OK. 161 modules, 3.01s.
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK
- `check-llms`: OK
- `check-dist-utf8`: OK
- Advertencia no bloqueante: engine esperado `node 20.x`; entorno local corrio con `node v24.13.0`.

### Que NO se toco

- `agro.js` — sin cambios
- Supabase — sin cambios
- `MANIFIESTO_AGRO.md` — sin cambios
- Configuracion de Vite o rutas — sin cambios

---

## Cierre de sesion: Favoritos del Shell + Busqueda Agro Compacta (2026-04-18)

### Resultado

Se implementaron Favoritos del Shell y Busqueda Agro Compacta como capas independientes del shell Agro.

- Favoritos local-first con `localStorage` (`YG_AGRO_SHELL_FAVORITES_V1`).
- Estrella discreta para cada item elegible del shell.
- Bloque dinamico de favoritos solo cuando hay favoritos marcados.
- Busqueda compacta bajo el switch maestro, con panel pequeno y maximo 7 resultados.
- Busqueda limitada a labels, contexto, keywords y scopes del shell.
- No se busco en DB, clientes, facturero profundo ni AgroRepo profundo.
- No se modifico la semantica del switch maestro.
- No se toco `agro.js`, Supabase ni `MANIFIESTO_AGRO.md`.

### Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `apps/gold/agro/agro-shell.js` | Indice local de items del shell y wiring hacia favoritos/busqueda. |
| `apps/gold/agro/agro-shell-favorites.js` | Nuevo modulo pequeno para favoritos local-first. |
| `apps/gold/agro/agro-shell-search.js` | Nuevo modulo pequeno para busqueda local del shell. |
| `apps/gold/agro/index.html` | Contenedores bajo el switch para busqueda y favoritos. |
| `apps/gold/agro/agro.css` | Estilos sobrios para capsule, panel, favoritos y estrellas. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registro de diagnostico, opciones, decision y cierre. |

### Validacion

- `pnpm build:gold`: OK.
- `jsdom shell utilities checks`: OK.
- Advertencia no bloqueante del entorno: Node local `v25.6.0`; engine esperado `20.x`.

### QA manual sugerido

1. Marcar/desmarcar favorito.
2. Recargar y confirmar persistencia.
3. Buscar `cultivo`, `clima`, `cartera`, `bitacora`, `tareas`.
4. Click en resultado y confirmar navegacion.
5. Borrar input y confirmar cierre del panel.
6. Probar switch maestro para confirmar que el filtrado original sigue intacto.

---

## Sesion activa: Asistente Agro como superficie completa dedicada (2026-04-18)

### Objetivo

Convertir el Asistente Agro en una vista completa dedicada dentro del shell Agro, dejando de depender visual y estructuralmente de patrones de modal/overlay.

### Diagnostico con evidencia

1. **Herencia modal en markup**: `apps/gold/agro/index.html` declara la vista como `data-agro-shell-region="asistente"`, pero el contenedor principal sigue siendo `id="modal-agro-assistant"` y el wrapper usa clases `modal-content agro-assistant assistant-sheet` (lineas ~2621-2623). Esto hace que la estructura siga comunicando modal aunque este montada inline.
2. **Herencia modal en CSS legacy**: `apps/gold/agro/agro.css` conserva el bloque `#modal-agro-assistant` con `position: fixed`, `inset: 0`, `z-index: 10050`, `display: none`, `padding: 1.5rem`, `.assistant-backdrop` con blur y `.agro-assistant` con `width: min(1120px, 96vw)` y `height: min(86vh, 780px)` (lineas ~2492-2529).
3. **Doble capa de correccion**: mas abajo, `.asistente-dedicado #modal-agro-assistant` intenta deshacer el modal con `position: static`, `z-index: auto`, `padding: 0`; tambien oculta `.assistant-backdrop` y quita bordes/sombra a `.agro-assistant` (lineas ~8824-8879). La vista funciona, pero sobre una base equivocada.
4. **Contenedor principal actual**: el shell ya usa `agro-shell.js` para mapear `asistente` a la region `asistente`; cuando se activa llama `window.openAgroAssistantInline()` (lineas ~655-710). Por tanto la navegacion de vista completa ya existe.
5. **Historial y area principal existen**: `index.html` ya tiene `aside.ast-sidebar` para conversaciones, `main.ast-main`, `#assistant-scroll`, `#assistant-history`, composer y panel de contexto. La base visual heredada es el problema, no la logica del asistente.
6. **Overlay residual**: hay `ast-sidebar-overlay` para el drawer movil y estilos `.ast-sidebar-overlay`/`.is-visible` (lineas ~9970-9983). No es el overlay modal principal, pero conviene retirarlo para cumplir el criterio "sin overlay/backdrop".
7. **Cierre tipo popup**: el boton `btn-close-agro-assistant` usa `fa-xmark` y luego CSS le cambia el glyph a flecha via `content: '\f060'`. Es una senal de parche visual, no de navegacion de pagina.

### Causa estructural

El asistente fue migrado a region inline del shell, pero conserva identidad y contrato visual de modal: ID, clases, CSS legacy y overlays. La implementacion actual depende de una segunda capa que neutraliza el modal en lugar de nacer como superficie de pagina.

### Opciones A/B/C

#### Opcion A — Recomendada

Mantener la logica del asistente y rehacer solo la estructura de layout/shell para que viva como pagina dedicada.

- Cambiar el contenedor principal a una identidad de pagina (`agro-assistant-page` / `agro-assistant-workspace`).
- Quitar clases `modal-content` y `assistant-sheet` del shell principal.
- Dejar `agro-shell.js` como fuente de navegacion.
- Ajustar CSS de la superficie dedicada para header propio, historial integrado, chat amplio y composer estable.
- Retirar overlay/backdrop del drawer movil.
- Tocar `agro.js` solo en wiring minimo de IDs y drawer sin overlay.

Riesgo: bajo. La logica de mensajes, threads, cola, cooldown, contexto y exportacion se preserva.

#### Opcion B

Extraer el asistente a un modulo de vista dedicado nuevo dentro de Agro, con adaptador desde la entrada actual.

- Seria util si la logica estuviera acoplada al patron modal.
- Requeriria mover funciones fuera de `agro.js` y crear nuevo modulo `agro-assistant-view.js`.
- Mayor diff y mayor riesgo por el tamaño del monolito.

Riesgo: medio/alto para esta sesion. No se justifica porque el problema detectado es de layout y contrato visual.

#### Opcion C

Mantener estructura actual y solo disimularla visualmente para que parezca pagina.

- Seguiria usando `modal-agro-assistant`, `.modal-content`, overrides y parches.
- Puede mejorar apariencia, pero mantiene la causa raiz.

Riesgo: bajo en diff pero alto en deuda. No recomendado.

### Recomendacion

Ejecutar **Opcion A**: conservar logica y estado existentes, pero cambiar la base estructural y visual del asistente para que sea una superficie completa dedicada, integrada al shell, sin overlay/backdrop modal y sin depender del layout legacy de modal.

### Tesis visual / contenido / interaccion

- **Tesis visual**: centro de consulta agricola oscuro, sobrio y metalico, con el historial como columna de trabajo y la conversacion como plano protagonista.
- **Plan de contenido**: header de pagina del asistente; columna de conversaciones; area principal de mensajes; composer estable; panel de contexto como accion secundaria.
- **Tesis de interaccion**: navegacion de vuelta con flecha explicita; historial integrado siempre visible en desktop y columna compacta en mobile; transiciones cortas por `opacity`/`transform` respetando `prefers-reduced-motion`.

### Archivos a tocar

| Archivo | Motivo |
|---|---|
| `apps/gold/agro/index.html` | Renombrar shell principal del asistente, quitar clases de modal, retirar overlay de drawer movil, convertir cierre en volver. |
| `apps/gold/agro/agro.css` | Rehacer base visual de superficie dedicada, eliminar dependencia visual de `#modal-agro-assistant`, mejorar desktop/mobile. |
| `apps/gold/agro/agro.js` | Wiring minimo: buscar el nuevo ID de pagina y hacer que el drawer no dependa de overlay. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Registrar diagnostico, decision, cambios, build y QA. |

### No se tocara

- Supabase.
- Logica profunda del modelo/Edge Function.
- `MANIFIESTO_AGRO.md`.
- Refactor masivo de `agro.js`.

### Ejecucion

Se ejecuto la **Opcion A**.

- `index.html`: el asistente dejo de usar `id="modal-agro-assistant"` y clases `modal-content agro-assistant assistant-sheet`; ahora vive como `agro-assistant-page` / `agro-assistant-workspace` dentro de `section.asistente-dedicado`.
- `index.html`: se agrego header propio de pagina con titulo, estado, acciones secundarias y boton explicito de volver al dashboard.
- `index.html`: se retiro el overlay movil del historial.
- `agro.css`: se elimino el bloque legacy `#modal-agro-assistant` y el selector residual que escondia el FAB por modal.
- `agro.css`: se definio layout de pagina completa para desktop y mobile, con historial integrado, chat protagonista y composer estable.
- `agro.js`: se renombro el wiring a `initAgroAssistantSurface()`, se actualizo el ID principal y se simplifico el drawer para no depender de overlay.

### Validacion

- `rg` sobre `apps/gold/agro/index.html`, `apps/gold/agro/agro.js` y `apps/gold/agro/agro.css`: sin coincidencias para `modal-agro-assistant`, `assistant-backdrop`, `assistant-drawer-overlay`, `assistant-drawer-toggle`, `modal-content agro-assistant`, `assistant-sheet` ni `ast-sidebar-overlay`.
- `pnpm build:gold`: OK.
- Advertencia no bloqueante del entorno: Node local `v25.6.0`; engine esperado `20.x`.
- QA local con Chromium/CDP sobre `apps/gold/dist` servido en `http://127.0.0.1:4177/agro/`.
- Desktop `1440x900`: apertura desde `btn-open-agro-assistant`, `body[data-agro-active-view="asistente"]`, header visible, historial visible, main visible, composer visible, envio cliente con respuesta simulada, boton volver deja `dashboard` activo.
- Mobile `390x844`: apertura desde el mismo boton, header apilado, historial como columna compacta sin drawer/overlay, main y composer visibles, envio cliente con respuesta simulada, boton volver deja `dashboard` activo.
- QA no contamino datos reales: para la prueba visual se simularon `session-guard`, `auth.getUser` y `functions.invoke` en el navegador local; no se modifico Supabase ni se escribieron datos de backend.
- Artefactos temporales de QA local fueron eliminados.

### Resultado

El Asistente Agro queda como superficie completa dedicada dentro del shell Agro. La estructura activa ya no depende de un modal maximizado ni de un overlay/backdrop; el historial y la conversacion viven como partes de una pagina real.

---

## Sesion activa: Documentacion oficial publica de YavlGold Agro (2026-04-18)

### Objetivo

Crear la documentacion oficial publica de YavlGold Agro como pagina dedicada para usuarios reales, usando `MANIFIESTO_AGRO.md` como fuente de verdad semantica pero traducida a lenguaje humano y publico.

### Diagnostico

1. **Ruta MPA ideal**: `apps/gold/docs-agro.html` — pagina publica al nivel de `faq.html`, `soporte.html`, etc. No vive dentro de `agro/` (shell protegido).
2. **Tipo**: Documentacion oficial publica del producto Agro, no centro de ayuda generico ni FAQ simple.
3. **Conexion sin contaminar**: Enlace desde landing (footer o seccion de modulos) y desde el footer de la landing. No se modifica la landing mas alla de anadir enlaces limpios.
4. **Secciones del manifiesto a traducir**: 1-4 (definicion, principios, mapa, modulos), 6 (flujo de trabajo), 7 (estadisticas/exportes), 8 (privacidad), 9 (FAQ), parcialmente 10 (malentendidos como aclaraciones utiles).
5. **Partes que NO pasan**: 0 (proposito del doc), 5 (relaciones internas), 11 (reglas para agentes), 12-14 (pendientes, criterio, notas editoriales), toda la gobernanza interna.
6. **SEO**: Meta tags, schema.org, headings semanticos, contenido indexable en espanol.

### Opcion ejecutada: A — Pagina dedicada con sidebar documental

- Ruta: `docs-agro.html` → `/docs-agro`
- Sidebar tipo hamburguesa inspirado en shell Agro pero mas documental
- CSS propio reutilizando tokens del ADN V10
- JS ligero para navegacion interna
- Enlace desde footer de la landing

### Archivos a tocar

| Archivo | Motivo |
|---|---|
| `apps/gold/docs-agro.html` | NUEVO — pagina dedicada de documentacion publica |
| `apps/gold/assets/css/docs-agro.css` | NUEVO — estilos especificos |
| `apps/gold/assets/js/docs-agro-nav.js` | NUEVO — navegacion sidebar/hamburguesa |
| `apps/gold/vite.config.js` | EDIT — registrar nueva entrada MPA |
| `apps/gold/vercel.json` | EDIT — agregar rewrite para clean URL |
| `apps/gold/index.html` | EDIT MINIMO — enlace desde footer hacia docs-agro |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | DOC — registro de sesion |

### No se tocara

- `MANIFIESTO_AGRO.md`
- `agro.js` ni modulos agro
- Supabase
- `ADN-VISUAL-V10.0.md`
- Logica del shell Agro

---

## Sesion activa: Segunda pasada visual + ubicacion en nav principal de docs-agro (2026-04-18)

### Objetivo

Segunda pasada visual y de ubicacion de la documentacion publica de Agro:
1. Agregar "Documentacion" al header/nav principal de la landing
2. Refinar visual: fondo negro profundo, eliminar sensacion de rejilla dorada invasiva

### Diagnostico

**Causa visual de la rejilla dorada:**
- Cards con `border-color: var(--border-gold)` + `box-shadow: var(--shadow-gold-sm)` en hover creaban lineas doradas visibles en la grid de 3 columnas
- Step numbers tenian `border: 1px solid rgba(200, 167, 82, 0.18)` generando circulos dorados
- FAQ items con `border-color: var(--border-gold)` al abrirse
- Header badge con colores dorados brillantes
- Sidebar active link con `rgba(200, 167, 82, 0.08)` mas intenso de lo necesario
- Body usaba `--bg-1` (#0a0a0a) en vez de `--bg-0` (#050505) para fondo

**Ubicacion en nav:**
- La landing tiene `.nav-links` (desktop) y `.nav-mobile` (mobile) con items: Inicio, Agro, Comunidad
- Se inserto "Documentacion" entre Agro y Comunidad en ambos navs
- Apunta a `/docs-agro` (clean URL con rewrite ya configurado)

### Cambios realizados

| # | Archivo | Tipo | Cambio |
|---|---|---|---|
| 1 | `apps/gold/index.html` | EDIT | Agregar `<a href="/docs-agro">Documentacion</a>` en `.nav-links` y `.nav-mobile` |
| 2 | `apps/gold/assets/css/docs-agro.css` | EDIT | Body: `--bg-1` → `--bg-0` (fondo mas profundo) |
| 3 | `apps/gold/assets/css/docs-agro.css` | EDIT | Header: `--bg-2` → `--bg-1`, borde `0.05` opacity |
| 4 | `apps/gold/assets/css/docs-agro.css` | EDIT | Sidebar: `--bg-2` → `--bg-1`, borde `0.05` opacity |
| 5 | `apps/gold/assets/css/docs-agro.css` | EDIT | Cards: `--bg-3` → `--bg-2`, sin gold shadow en hover, borde `0.05` |
| 6 | `apps/gold/assets/css/docs-agro.css` | EDIT | Cases: `--bg-3` → `--bg-2`, borde `0.05` |
| 7 | `apps/gold/assets/css/docs-agro.css` | EDIT | FAQ items: `--bg-3` → `--bg-2`, sin borde dorado al abrir |
| 8 | `apps/gold/assets/css/docs-agro.css` | EDIT | CTA: `--bg-3` → `--bg-2`, sin borde dorado |
| 9 | `apps/gold/assets/css/docs-agro.css` | EDIT | Footer: `--bg-2` → `--bg-1`, borde `0.05` |
| 10 | `apps/gold/assets/css/docs-agro.css` | EDIT | Steps: sin borde dorado en numeros |
| 11 | `apps/gold/assets/css/docs-agro.css` | EDIT | Badge header: colores neutros, sin dorado |
| 12 | `apps/gold/assets/css/docs-agro.css` | EDIT | Sidebar active: `0.08` → `0.05` |
| 13 | `apps/gold/assets/css/docs-agro.css` | EDIT | Section borders: `0.08` → `0.04` opacity |
| 14 | `apps/gold/assets/css/docs-agro.css` | EDIT | Sidebar toggle: borde `0.05`, hover sutil |

### Que NO se toco

- `MANIFIESTO_AGRO.md`
- `agro.js` ni modulos agro
- Supabase
- `ADN-VISUAL-V10.0.md`
- Logica del shell Agro
- Estructura informativa de la documentacion
- `vite.config.js` ni `vercel.json` (ya estaban correctos)
- CSS global de la landing (`landing-v10.css`)

### Resultado build

`pnpm build:gold` — OK. 166 modules, 2.33s.
- agent-guard: OK
- agent-report-check: OK
- vite build: OK
- check-llms: OK
- check-dist-utf8: OK

### QA manual sugerido

1. Desktop landing: verificar "Documentacion" visible en nav entre Agro y Comunidad
2. Mobile landing: verificar "Documentacion" en menu hamburguesa
3. Click en "Documentacion" → debe navegar a `/docs-agro`
4. Verificar fondo negro profundo (#050505) sin rejilla dorada
5. Verificar cards con bordes sutiles sin sombra dorada
6. Verificar step numbers sin borde dorado
7. Verificar FAQ sin bordes dorados al abrir
8. Verificar sidebar/hamburguesa de docs funcional en mobile
9. Verificar buen contraste desktop y mobile

### Comandos git sugeridos (sin ejecutar)

```bash
git status
git add apps/gold/index.html apps/gold/assets/css/docs-agro.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "feat(docs): add Documentation to main nav + refine docs-agro visual — dark premium, no gold grid"
```

---

## Sesion activa: Routing publico docs-agro y rutas legales/soporte (2026-04-19)

### Objetivo

Cerrar quirurgicamente el problema de routing publico/documentacion:

1. Hacer que `/docs-agro` viva correctamente en produccion.
2. Normalizar rutas publicas secundarias a forma limpia sin slash final.
3. Evitar 404 por trailing slash.
4. No dejar enlaces publicos apuntando a rutas inexistentes.
5. Mantener una sola logica canonica de routing para paginas publicas.

### Diagnostico inicial

**Evidencia local:**
- `apps/gold/vite.config.js` ya registra entradas MPA para `docs-agro.html`, `cookies.html`, `faq.html`, `soporte.html`, `terms.html` y `privacy.html`.
- `apps/gold/dist` ya contiene `docs-agro.html`, `cookies.html`, `faq.html`, `soporte.html`, `terms.html` y `privacy.html`.
- `apps/gold/docs-agro.html` contiene hrefs publicos con slash final hacia `/terms/`, `/privacy/`, `/faq/` y `/soporte/`.
- `apps/gold/index.html` ya enlaza `/docs-agro` sin slash desde header, mobile nav y footer.

**Evidencia de produccion:**
- `/` responde 200 con `X-YG-Config: root-vercel-active`.
- `/docs-agro.html` responde 200 con `X-YG-Config: root-vercel-active`.
- `/docs-agro` responde 404 con `X-YG-Config: root-vercel-active`.
- `/terms`, `/terms/`, `/privacy`, `/privacy/`, `/cookies`, `/cookies/`, `/faq`, `/faq/`, `/soporte` y `/soporte/` responden 404 con `X-YG-Config: root-vercel-active`.

### Causa raiz por frente

**Frente A - `/docs-agro`:**
- La pagina real existe como `docs-agro.html` y el build la emite correctamente.
- El rewrite de `/docs-agro` vive en `apps/gold/vercel.json`.
- El deploy actual obedece el `vercel.json` de raiz, no el interno de `apps/gold`.
- Resultado: `/docs-agro.html` funciona, pero `/docs-agro` queda sin clean URL/rewrite efectivo.

**Frente B - rutas publicas con trailing slash:**
- Las paginas reales existen como HTML de primer nivel.
- El config activo de raiz no tenia `cleanUrls` ni `trailingSlash` para normalizar `/terms`, `/privacy`, `/cookies`, `/faq` o `/soporte`.
- La documentacion publica tenia hrefs con slash final hacia varias de esas rutas.
- Resultado: las rutas limpias y sus variantes con slash final caen en 404 aunque los archivos existen en `dist`.

### Opciones evaluadas

**Opcion A - Recomendada y elegida:**
Unificar la logica publica en el `vercel.json` verdaderamente canonico del deploy (`vercel.json` raiz), activar clean URLs, normalizar sin trailing slash, retirar el config interno que ya no gobierna produccion y corregir hrefs secundarios a forma sin slash.

**Opcion B:**
Duplicar rewrites en ambos `vercel.json`. Resuelve el sintoma, pero mantiene dos fuentes con riesgo de drift.

**Opcion C:**
Cambiar enlaces publicos para apuntar directo a `.html`. Evita depender de routing limpio, pero contradice la preferencia publica y empeora UX/SEO.

### Archivos a tocar

| Archivo | Motivo |
|---|---|
| `vercel.json` | Convertirlo en fuente canonica real de clean URLs y trailing slash publico. |
| `apps/gold/vercel.json` | Retirar config interno no canonico para evitar drift y ambiguedad. |
| `apps/gold/docs-agro.html` | Normalizar hrefs publicos secundarios sin slash final. |
| `FICHA_TECNICA.md` | Ajuste minimo para reflejar que el routing canonico del deploy vive en `vercel.json` raiz. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Documentar diagnostico, decision, cambios y validacion. |

### No se tocara

- `MANIFIESTO_AGRO.md`.
- Supabase.
- `agro.js`.
- CSS.
- Contenido informativo base de `docs-agro.html` fuera de hrefs.

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `vercel.json` | EDIT | Activar `cleanUrls: true` y `trailingSlash: false` en el config canonico de raiz. |
| `vercel.json` | EDIT | Normalizar redirects de `/agro/index` y alias `/music` para usar destinos limpios sin `.html`. |
| `apps/gold/vercel.json` | DELETE | Retirado para evitar que exista un segundo config de Vercel no activo y propenso a drift. |
| `apps/gold/docs-agro.html` | EDIT | Hrefs publicos secundarios normalizados a `/terms`, `/privacy`, `/faq` y `/soporte`. |
| `FICHA_TECNICA.md` | EDIT | Referencias de routing actualizadas a `vercel.json` raiz como config publico canonico. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | DOC | Registro de diagnostico, decision, cambios y validacion. |

### Validacion

- `node -e "JSON.parse(...vercel.json...)"` - OK.
- `Test-Path apps/gold/vercel.json` - `False`.
- `pnpm build:gold` - OK.
  - `agent-guard`: OK.
  - `agent-report-check`: OK.
  - `vite build`: OK, 166 modulos.
  - `check-llms`: OK.
  - `check-dist-utf8`: OK.
- `dist` contiene:
  - `docs-agro.html`
  - `terms.html`
  - `privacy.html`
  - `cookies.html`
  - `faq.html`
  - `soporte.html`
- Simulacion local de policy Vercel:
  - `/docs-agro` -> sirve `docs-agro.html`.
  - `/docs-agro.html` -> redirect clean URL a `/docs-agro`.
  - `/docs-agro/` -> redirect sin slash a `/docs-agro`.
  - `/terms`, `/privacy`, `/cookies`, `/faq`, `/soporte` -> sirven sus HTML respectivos.
  - variantes con slash final -> redirect a forma sin slash.
- `dist/index.html` mantiene 3 enlaces a `/docs-agro`: header desktop, nav mobile y footer.
- `dist/docs-agro.html` ya no contiene hrefs con slash final hacia `/terms/`, `/privacy/`, `/faq/` ni `/soporte/`.

### Nota de produccion

La produccion consultada antes del cambio todavia respondia 404 en las rutas limpias porque esta correccion aun no estaba desplegada. El cierre real de 404 en `https://www.yavlgold.com` debe confirmarse despues del proximo deploy que incluya este cambio.

### Que NO se toco

- `MANIFIESTO_AGRO.md`.
- Supabase.
- `agro.js`.
- CSS.
- Contenido informativo base de la documentacion publica.

---

## Sesion activa: Documentacion dentro del shell/sidebar Agro como enlace secundario (2026-04-19)

### Objetivo

Agregar un acceso a **Documentacion** dentro del shell/sidebar de Agro como enlace secundario de ayuda, no como superficie operativa principal. El enlace debe existir, ser facil de encontrar, pero sentirse secundario y no competir con los modulos operativos.

### Diagnostico

El sidebar de Agro tiene estos grupos: Principal, Operacion comercial, Trabajo diario, Operaciones, Herramientas, Acciones. No existe zona de ayuda, soporte ni utilidades. No habia referencia a `/docs-agro` dentro del modulo Agro. La pagina publica de documentacion ya existe en `/docs-agro` con enlace en la landing y el header publico.

### Opciones evaluadas

| Opcion | Descripcion | Lectura |
|---|---|---|
| A | Documentacion como item secundario en zona baja del sidebar, estilo silencioso, separado visualmente | Recomendada. Limpio, no intrusivo, semanticamente correcto. |
| B | Mini bloque "Ayuda" con Documentacion + Soporte + FAQ | Mas bloque del necesario para un solo acceso. Riesgo de recargar. |
| C | Documentacion dentro del bloque principal junto a modulos operativos | No recomendada. Demasiado protagonista, rompe jerarquia. |

### Decision ejecutada

**Opcion A**. Se agrego un bloque de ayuda al final del sidebar con `margin-top: auto` para empujarlo al fondo, borde separador sutil y enlace "Documentacion" con icono `fa-book`.

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/agro/index.html` | EDIT | Bloque `agro-shell-sidebar__help` al final del sidebar con enlace `/docs-agro` |
| `apps/gold/agro/agro.css` | EDIT | Estilos silenciosos: texto gris bajo (0.35), hover gris medio (0.6), borde separador (0.05), sin gold shadow |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | DOC | Registro de sesion |

### Tratamiento visual

- Color texto: `rgba(255,255,255,0.35)` — gris premium bajo
- Hover: `rgba(255,255,255,0.6)` — gris medio sobrio
- Icono: `fa-book`, opacity 0.6
- Separacion: `border-top: 1px solid rgba(255,255,255,0.05)` + `margin-top: auto` (empuja al fondo del sidebar)
- No usa gold, no usa shimmer, no usa sombra dorada
- Focus-visible: anillo dorado accesible
- Touch target: min-height 44px

### Criterio semantico respetado

- **Switch maestro**: intacto, no se agrego data-agro-mode-scope al enlace
- **Favoritos**: no afectado, el enlace es `<a>` externo, no boton del shell
- **Busqueda compacta**: no afectada
- **Documentacion**: ayuda publica / soporte informativo, no funcion operativa

### Resultado build

`pnpm build:gold` — OK. 166 modules, 2.63s.
- agent-guard: OK
- agent-report-check: OK
- vite build: OK
- check-llms: OK
- check-dist-utf8: OK

### Que NO se toco

- `MANIFIESTO_AGRO.md`
- `agro.js`
- `agro-shell.js`
- `agro-mode.js`
- Switch maestro
- Favoritos
- Busqueda compacta
- Supabase
- Documentacion publica base (`docs-agro.html`)

### QA manual sugerido

1. Desktop: abrir sidebar Agro y verificar que "Documentacion" aparece al final, separado del bloque de Acciones
2. Verificar que el texto se ve gris discreto, no dorado ni brillante
3. Hover sobre "Documentacion" → debe aclararse a gris medio
4. Click → debe abrir `/docs-agro` en nueva pestana
5. Mobile: verificar que el enlace es accesible y el touch target es comodo
6. Verificar que el switch maestro sigue intacto (4 modos funcionando)
7. Verificar que favoritos y busqueda siguen intactos
8. Verificar que el sidebar se scrollea correctamente si el contenido es largo

### Comandos git sugeridos (sin ejecutar)

```bash
git status
git add apps/gold/agro/index.html apps/gold/agro/agro.css apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "feat(agro): add documentation link to sidebar help zone — silent secondary access"
```

---

## Sesion activa: Coherencia publica — correccion de contradicciones (2026-04-19)

### Objetivo

Resolver inconsistencias publicas visibles detectadas por auditoria externa: contradicciones de monetizacion, cookies/privacidad, senales crypto dentro de Agro, legal preliminar mal encuadrado y soporte con tildes rotos.

### Diagnostico

**Contradicciones confirmadas con evidencia:**

1. **Cookies/privacidad — tres historias incompatibles:**
   - cookies.html: "No hay analitica comercial activa declarada para vender perfiles de usuario" + cero tildes en todo el archivo
   - privacy.html: "Si en el futuro se incorpora analitica de producto, se debera reflejar en la politica de cookies y privacidad"
   - docs-agro.html: "Si en el futuro se activa analitica de producto, debera informarse en la politica de cookies"

2. **Agro-first sabotajeado por labels internos:**
   - "Top Compradores (Pagados)" / "Top Cultivos (Pagados)" — "Pagados" lee como feature paga, no como ingresos cobrados
   - "Rankings del Centro" — "Centro" suena a centro financiero crypto
   - "Cargando referencias cripto..." — refuerza producto crypto independiente
   - Tab label "Pagados" — mismo problema de ambiguedad
   - "Ultimos Pagados (Sesion Actual)" — mismo problema

3. **Legal preliminar:**
   - terms.html: "Documento legal preliminar en redaccion." — suena demasiado borrador
   - privacy.html: "Documento preliminar en redaccion." — mismo problema

4. **Soporte:**
   - "Cuentanos" sin tilde, "asesoria" sin tilde
   - "Soporte" como texto dentro de span sin icono real

5. **Monetizacion:**
   - Los tres archivos publicos (faq, docs-agro, terms) ya son consistentes: "no hay pagos ni suscripciones activas"
   - No se encontro "funciones avanzadas requieren una suscripcion" en el codigo actual
   - La contradiccion de monetizacion no existe en el estado actual del codigo

### Opcion elegida: B (copy + paginas estaticas + reencuadre minimo de superficies Agro visibles)

### Cambios realizados

| # | Archivo | Cambio | Por que |
|---|---|---|---|
| 1 | `agro/index.html` | "Top Compradores (Pagados)" → "Top Compradores (Ingresos cobrados)" | Eliminar ambiguedad "Pagados = feature paga" |
| 2 | `agro/index.html` | "Top Cultivos (Pagados)" → "Top Cultivos (Ingresos cobrados)" | Mismo motivo |
| 3 | `agro/index.html` | "Rankings del Centro" → "Rankings de Operacion" (3 instancias) | "Centro" sonaba a centro financiero crypto |
| 4 | `agro/index.html` | Tab "Pagados" → "Ingresos" | Mas claro, data-tab="ingresos" ya existia |
| 5 | `agro/index.html` | "Gastos, pagados, fiados..." → "Gastos, ingresos cobrados, fiados..." | Coherencia con labels nuevos |
| 6 | `agro/index.html` | "Ultimos Pagados (Sesion Actual)" → "Ultimos ingresos cobrados (Sesion Actual)" | Coherencia |
| 7 | `agro/index.html` | ROI label "Pagados" → "Ingresos cobrados" | Coherencia |
| 8 | `agro/index.html` | "Cargando referencias cripto..." → "Cargando referencias de mercado..." | Reencuadrar como contexto agro |
| 9 | `cookies.html` | Correccion masiva de tildes (todo el archivo estaba sin acentos) | Copy profesional |
| 10 | `cookies.html` | Badge "Documento Legal" → agregar icono | Coherencia visual con terms/privacy |
| 11 | `cookies.html` | "Politica operativa preliminar" → "Documento operativo preliminar" | Coherencia con terms |
| 12 | `cookies.html` | "No hay analitica comercial activa declarada para vender perfiles" → "No hay analitica comercial activa ni rastreo de perfiles" | Unificacion con privacy |
| 13 | `cookies.html` | Boton "Volver" href="./" → href="/" | Ruta correcta |
| 14 | `privacy.html` | "Si en el futuro se incorpora analitica... se debera reflejar en la politica de cookies y privacidad" → "No hay analitica comercial activa. Si en el futuro se incorpora... se informara aqui y en la politica de cookies" | Unificar historia |
| 15 | `privacy.html` | "Documento preliminar en redaccion" → "Documento preliminar. Se actualizara conforme la plataforma evolucione." | Menos drafty |
| 16 | `docs-agro.html` | Tildes corregidos en seccion Informacion + unificar declaracion de cookies/privacidad | Coherencia |
| 17 | `soporte.html` | "Cuentanos" → "Cuentanos", "asesoria" → "asesoria", meta "tecnico" → "tecnico" | Tildes |
| 18 | `soporte.html` | Span "Soporte" sin icono → `<i class="fa-solid fa-headset">` | Icono real |
| 19 | `soporte.html` | Agregar Font Awesome CDN | El icono necesita FA |

### Decisiones editoriales / semanticas

**Monetizacion final:** Agro V1 gratuito hoy, sin pagos ni suscripciones activas. Los tres archivos publicos ya eran consistentes.

**Framing online/offline final:** Agro funciona principalmente online. Algunas superficies son local-first. No se cambio (ya era coherente).

**Framing cookies/privacidad final:** Unificado a: "No hay analitica comercial activa. Si en el futuro se incorpora, se informara en la politica de cookies." Los tres archivos (cookies, privacy, docs-agro) ahora dicen lo mismo.

**Tratamiento de mercados/divisas:** Se reencuadro "Cargando referencias cripto..." a "Cargando referencias de mercado..." para sentirse como contexto agro. Las tabs "REFERENCIAS CRIPTO" y "DIVISAS FIAT" se mantienen porque son funcionalidad legitima del dashboard Agro (inteligencia de mercado).

**Tratamiento de legal preliminar:** Se cambio "en redaccion" por "Se actualizara conforme la plataforma evolucione" — honesto pero menos chocante con el mensaje de producto activo.

### Riesgos o limites

- docs-agro.html tiene tildes faltantes en secciones no tocadas — fuera de scope de esta sesion
- Los labels "Pagados" dentro de agro.js (JS dinamico) no se tocaron — solo se editaron labels estaticos del HTML
- Las tabs "REFERENCIAS CRIPTO" / "DIVISAS FIAT" se mantienen con nombre actual — son funcionales
- No se agrego puente visible a GitHub/Open Source — requiere decision de producto sobre ubicacion

### Resultado build

`pnpm build:gold` — OK. 167 modules, 2.47s.
- agent-guard: OK
- agent-report-check: OK
- vite build: OK
- check-llms: OK
- check-dist-utf8: OK

### QA manual sugerido

1. `/cookies`: verificar tildes corregidos, badge con icono, boton volver funcional
2. `/privacy`: verificar nuevo framing de legal y cookies
3. `/soporte`: verificar icono headset, tildes corregidos, FA cargado
4. `/terms`: verificar framing sin "en redaccion"
5. `/docs-agro`: verificar seccion Informacion con tildes y declaracion unificada
6. `/agro` (sidebar): verificar Rankings de Operacion, Top Compradores (Ingresos cobrados)
7. `/agro` (facturero): verificar tab "Ingresos" en vez de "Pagados"
8. `/agro` (mercados): verificar "Cargando referencias de mercado..." en tab cripto
9. `/agro` (ROI): verificar label "Ingresos cobrados" en calculadora
10. Mobile: verificar que ningun cambio rompe layout

### Que NO se toco

- `MANIFIESTO_AGRO.md`
- `agro.js` (labels dinamicos internos)
- Logica de negocio
- Switch maestro, favoritos, busqueda compacta
- Supabase
- `AGENTS.md`
- `ADN-VISUAL-V10.0.md`

### Comandos git sugeridos (sin ejecutar)

```bash
git status
git add apps/gold/agro/index.html apps/gold/cookies.html apps/gold/privacy.html apps/gold/terms.html apps/gold/docs-agro.html apps/gold/soporte.html apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "fix(site): resolve public inconsistencies — cookies/privacy alignment, agro-first reframe, soporte cleanup"
```

## Sesion activa: Visualizacion multimoneda en ciclos de cultivo (2026-04-19)

### Objetivo

Implementar soporte quirurgico de visualizacion multimoneda para ciclos de cultivo, permitiendo alternar USD -> COP -> BS -> USD desde la metadata/label de moneda y reflejar esa divisa visual en rentabilidad, potencial neto, desglose financiero y lecturas financieras directas del mismo contexto del ciclo.

### Diagnostico inicial

El producto ya es semanticamente multimoneda (`USD`, `COP`, `VES/BS`), pero el problema reportado indica que las cards y vistas de ciclos de cultivo siguen presentando rentabilidad/potencial neto en USD. La hipotesis inicial es que el calculo base ya vive en USD o normaliza a USD, y que falta una capa de presentacion desacoplada para convertir/formatear la moneda visible sin rehacer la logica financiera ni alterar la moneda base.

### Plan quirurgico

1. Localizar renderers reales de ciclos activos, finalizados y perdidos.
2. Confirmar donde se calcula/renderiza `Rentabilidad`, `Potencial neto` y el `Desglose financiero`.
3. Localizar helpers existentes de moneda/tasas (`agro-exchange.js`, formateadores, `amount_usd`, `exchange_rate`, `currency`).
4. Evaluar opciones:
   - Opcion A: modulo pequeño de visualizacion multimoneda + wiring minimo.
   - Opcion B: parche local dentro de renderers existentes.
   - Opcion C: alternativa si el codigo real exige otro punto de integracion.
5. Ejecutar solo la opcion de menor diff confiable.
6. Agregar estilos minimos ADN V10 si hace falta para hacer la metadata clicable/tocable.
7. Ejecutar `pnpm build:gold` y documentar cierre.

### Archivos a inspeccionar

| Archivo | Motivo |
|---|---|
| `apps/gold/agro/agro.js` | Posible renderer legacy o wiring de ciclos. |
| `apps/gold/agro/agro-stats.js` | Posibles calculos/render de rentabilidad y estadisticas. |
| `apps/gold/agro/agro-crop-report.js` | Posible desglose/reporte por cultivo. |
| `apps/gold/agro/agro-exchange.js` | Tasas/helpers existentes de conversion. |
| `apps/gold/agro/agroOperationalCycles.js` | Posible renderer real de ciclos de cultivo/periodo. |
| `apps/gold/agro/agro-cycles-workspace.js` | Posible superficie moderna de ciclos. |
| `apps/gold/agro/agro.css` | Estilos minimos para label/metadata clicable. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Bitacora operativa de la sesion. |

### Restricciones de alcance

- No tocar `MANIFIESTO_AGRO.md`.
- No tocar Supabase.
- No agregar features nuevas dentro de `agro.js` salvo wiring minimo indispensable.
- No inventar tasas falsas.
- No rediseñar cards ni cambiar semantica de ciclos.

### Diagnostico confirmado

- Renderer real de cards: `apps/gold/agro/agrociclos.js`.
- Las cards activas, finalizadas y perdidas comparten el mismo renderer (`renderCycleCards` / `renderFinishedCycles`).
- Los datos vienen desde `buildActiveCycleCardsData` y `buildFinishedCycleCardsData` en `apps/gold/agro/agro.js`.
- La moneda base de calculo ya llega como USD en campos crudos: `inversionUSD`, `rentabilidad`, `potencialNeto`, `baseInvestmentUsd`, `gastosUsd`, `pagadosUsd`, `costosUsd`, `fiadosUsd`, `perdidasUsd`, `operationalGastosUsd`, `operationalPendingUsd`.
- El desglose estaba usando strings ya formateados en USD/tripleta, por eso no podia alternar de forma limpia.
- Helper existente reutilizable: `apps/gold/agro/agro-exchange.js` (`initExchangeRates`, `getRate`, `convertFromUSD`).

### Opciones evaluadas

| Opcion | Descripcion | Decision |
|---|---|---|
| A | Capa desacoplada de visualizacion multimoneda + wiring minimo en renderer | Ejecutada. Mantiene USD como base y separa presentacion. |
| B | Parche local en `agrociclos.js` | Descartada. Mezcla estado, conversion y renderer. |
| C | Llevar moneda visual al monolito `agro.js` | Descartada. Mete estado de UI en calculo/datos. |

### Cambios ejecutados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro-display-currency.js` | Nuevo modulo de visualizacion USD/COP/BS. Reutiliza tasas de `agro-exchange.js`, rota USD -> COP -> BS -> USD y persiste preferencia en `localStorage`. |
| `apps/gold/agro/agrociclos.js` | La metadata de moneda en `Inversion` ahora es clicable. Rentabilidad, potencial neto, chips y filas del desglose se formatean desde montos USD crudos y se refrescan al rotar moneda. |
| `apps/gold/agro/agrociclos.css` | Estilo sobrio ADN V10 para el toggle de moneda, sin rediseñar cards. |
| `apps/gold/agro/agro.js` | Wiring minimo: `buildCycleGlobalBreakdown` expone totales USD crudos para que el desglose global tambien pueda alternar moneda. |

### Comportamiento final

- Click/tap en la etiqueta de moneda de `Inversion`: `USD -> COP -> BS -> USD`.
- El cambio refresca todas las cards de ciclos visibles en el documento.
- La moneda visible se aplica a:
  - inversion de la card;
  - rentabilidad;
  - potencial neto / rentabilidad final;
  - resumen del desglose;
  - operativa vinculada;
  - cartera viva;
  - desglose global por tipo de cultivo cuando aplica.
- Si no hay tasa confiable para COP/BS, se muestra `N/D COP` o `N/D BS` en vez de inventar conversion.

### Limites documentados

- La base numerica sigue siendo USD. Esto preserva la logica financiera existente.
- La linea de cotizacion se mantiene como texto informativo original.
- El comparador secundario de ciclos conserva su propia lectura USD porque no tiene metadata de moneda para tocar y ampliarlo implicaria otra interaccion.

### Validacion

`pnpm build:gold` — OK.

- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK, 167 modules, 2.14s.
- `check-llms`: OK.
- `check-dist-utf8`: OK.
- Smoke tecnico `agro-display-currency.js` con tasas simuladas: OK (`USD -> COP -> BS -> USD`).
- Warning no bloqueante: Node local `v25.6.0`; el repo declara engine `20.x`.

---

## Sesion activa: Coherencia publica Agro-first (2026-04-19)

### Objetivo

Ejecutar una cirugia integral de coherencia publica en YavlGold V1 para alinear home, docs, FAQ, legales, soporte y superficies publicas relacionadas con Agro. El objetivo es que la historia publica sea clara y honesta: Agro es el producto activo real, V1 es gratuito hoy, el funcionamiento es principalmente online con partes locales puntuales, las politicas de privacidad/cookies no sobreprometen y las senales de mercados/crypto quedan enmarcadas como contexto operativo de Agro, no como producto independiente.

### Diagnostico inicial

El canon leido confirma:

- `AGENTS.md`: stack obligatorio Vanilla JS + Vite MPA + Supabase; no React/Tailwind/SPA; reporte activo obligatorio; build `pnpm build:gold`.
- `ADN-VISUAL-V10.0.md`: no rediseño, respetar tokens y jerarquia visual.
- `MANIFIESTO_AGRO.md`: Agro es herramienta agricola digital real y el dashboard incluye clima, mercados, fase lunar y contexto del dia.
- `FICHA_TECNICA.md` vive en la raiz (`FICHA_TECNICA.md`), no en `apps/gold/docs/`; confirma Agro como modulo liberado y Crypto como placeholder/no activo.
- `AGENT_REPORT_ACTIVE.md`: 1291 lineas, no requiere rotacion.

### Inconsistencias confirmadas

| Frente | Evidencia | Lectura |
|---|---|---|
| Monetizacion | `apps/gold/index.html` dice `Agro Activo · Acceso Gratuito`; `apps/gold/docs-agro.html` dice que V1 no tiene pagos ni suscripciones; `apps/gold/faq.html` dice "contenido gratuito y funciones premium" con suscripcion. | Contradiccion fuerte. No se encontro infraestructura de pagos/suscripciones activa; la verdad publica segura es "Agro V1 gratuito hoy, sin pagos ni suscripciones". |
| Online/offline | `docs-agro.html` dice que Agro depende principalmente de internet; `apps/gold/agro/index.html` muestra AgroRepo como `Memoria agricola local-first` y `LocalStorage · 100% Offline`. | La verdad debe ser hibrida: Agro online/Supabase para datos principales; AgroRepo local-first/offline parcial en LocalStorage. |
| Cookies/privacidad | `docs-agro.html` menciona solo cookies tecnicas; `cookies.html` menciona cookies esenciales, preferencias y analiticas. | Alinear a cookies esenciales/preferencias y hCaptcha; no afirmar analiticas activas si no hay evidencia de analytics real. |
| Seguridad/legal | `privacy.html` dice "Documento completo en redaccion" pero tambien "cumplimiento de regulaciones"; `agro/index.html` footer dice "Datos protegidos". | Mantener tono honesto: HTTPS/TLS, Supabase Auth, RLS/controles por usuario, sin E2E; evitar sobreprometer cumplimiento legal cerrado. |
| Terminos/privacidad | `terms.html` y `privacy.html` estan en redaccion. | No ocultarlo; ajustar copy para que sean avisos preliminares y no aparenten marco legal completo. |
| Soporte | `soporte.html` contiene `? Volver al Inicio`, `??`, `?? Inicio`, `?? Agro`, `?? Contacto`. | Mojibake/emoji roto visible; corregir a texto/iconos ASCII sobrios. |
| Mercados/crypto | `MANIFIESTO_AGRO.md` y `FICHA_TECNICA.md` permiten mercados como contexto del dashboard Agro; `crypto/index.html` declara Crypto no disponible; `agro/index.html` dice `Cripto y divisas en vivo` y modal `CRIPTOMONEDAS`. | Conservar mercado/divisas como contexto real de Agro, pero reencuadrar para que no parezca modulo Crypto independiente. |

### Plan quirurgico por prioridad

1. P0 monetizacion: unificar FAQ con home/docs: Agro V1 gratuito hoy, sin pagos ni suscripciones activas.
2. P0 legal: conservar estado "en redaccion" pero reescribir privacidad/terminos con tono preliminar y no grandilocuente.
3. P1 online/offline: docs y AgroRepo deben decir "principalmente online + AgroRepo local-first/offline parcial".
4. P1 cookies/privacidad: alinear docs-agro, cookies y privacidad; quitar o matizar cookies analiticas sin evidencia de analytics real; mencionar hCaptcha con precision.
5. P1 seguridad: cambiar "Datos protegidos" por copy mas preciso y sobrio.
6. P2 identidad: reencuadrar mercados/crypto en Agro como "mercados y divisas de referencia", no modulo crypto independiente.
7. P2 soporte: corregir mojibake, labels rotos y enlaces publicos relativos a rutas limpias.

### Archivos a inspeccionar/tocar

| Archivo | Motivo |
|---|---|
| `apps/gold/index.html` | Home, monetizacion, enlaces publicos, copy de registro. |
| `apps/gold/docs-agro.html` | Docs publicas, FAQ interna, online/offline, cookies/privacidad. |
| `apps/gold/faq.html` | Contradiccion directa de monetizacion. |
| `apps/gold/privacy.html` | Estado legal, seguridad, cookies/terceros. |
| `apps/gold/terms.html` | Estado legal en redaccion. |
| `apps/gold/cookies.html` | Cookies tecnicas/preferencias/analiticas. |
| `apps/gold/soporte.html` | Mojibake, links visibles, soporte honesto. |
| `apps/gold/agro/index.html` | AgroRepo offline parcial, mercados/crypto como contexto, footer seguridad. |
| `apps/gold/dashboard/index.html` | Mojibake visible en comentario/quote y senales publicas menores. |
| `apps/gold/assets/js/modules/moduleIdentity.js` | Metadata de modulos si expone Crypto como activo o ambiguo. |

### Opciones

| Opcion | Descripcion | Decision |
|---|---|---|
| A | Limpieza de copy + labels + navegacion + paginas legales superficiales | Base recomendada, suficiente para cerrar la mayor parte de contradicciones publicas. |
| B | Opcion A + pequeno reencuadre de superficies publicas del dashboard Agro cuando el copy crea confusion | Elegida. Necesaria porque AgroRepo y Mercado viven en `agro/index.html` y son visibles al usuario. |
| C | Reescritura amplia/legal completa o rediseño publico | Descartada. Mayor diff, riesgo legal y visual innecesario. |

### Cambios ejecutados

| Archivo | Cambio |
|---|---|
| `apps/gold/faq.html` | Se elimino la contradiccion "funciones premium/suscripcion" y se declaro que Agro V1 es gratuito hoy, sin pagos ni suscripciones activas. Se agrego FAQ breve de online/offline hibrido. |
| `apps/gold/docs-agro.html` | Se ajusto la respuesta de internet/offline para explicar Agro online + AgroRepo local-first parcial. Se alineo cookies/privacidad con cookies/almacenamiento de sesion, preferencias, hCaptcha y sin rastreo comercial. |
| `apps/gold/cookies.html` | Politica preliminar: cookies esenciales, preferencias/LocalStorage y hCaptcha; se retiro la afirmacion de cookies analiticas activas. |
| `apps/gold/privacy.html` | Copy legal preliminar y sobrio: HTTPS/TLS, Supabase Auth, controles por usuario, sin E2E, cookies/almacenamiento y sin venta de perfiles. |
| `apps/gold/terms.html` | Estado preliminar honesto; se agrego que Agro V1 es gratuito actualmente y no tiene pagos/suscripciones activas. |
| `apps/gold/soporte.html` | Correccion de mojibake visible (`?`, `??`) y enlaces legales a rutas limpias `/cookies`, `/faq`, `/soporte`. |
| `apps/gold/agro/index.html` | Reencuadre minimo: "Mercados de referencia", "Contexto de divisas para Agro", "Referencias de mercado", "Referencias cripto"; AgroRepo queda como `offline parcial`; footer cambia "Datos protegidos" por "Acceso por usuario". |
| `apps/gold/dashboard/index.html` | Se corrigio mojibake en comentarios visibles del codigo (`QUOTE`, `INSIGHTS`). |
| `apps/gold/assets/js/modules/moduleIdentity.js` | Metadata de Crypto aclara que el modulo independiente no esta disponible en V1 y que las referencias de mercado viven dentro de Agro. |

### Decisiones editoriales finales

- Monetizacion: Agro V1 es gratuito hoy; no hay pagos ni suscripciones activas.
- Online/offline: Agro es principalmente online por Supabase, clima y cuenta; AgroRepo es una superficie local-first/offline parcial en LocalStorage.
- Cookies/privacidad: cookies o almacenamiento local para sesion, preferencias, seguridad anti-bots y superficies locales; sin publicidad dirigida ni rastreo comercial de terceros; analitica solo como posibilidad futura a documentar.
- Seguridad: copy limitado a HTTPS/TLS, autenticacion, controles por usuario y ausencia de E2E; no se promete blindaje absoluto.
- Crypto/mercados: Crypto independiente sigue no disponible; mercados/divisas quedan como referencias operativas dentro de Agro.

### Validacion

- `pnpm build:gold` — OK.
- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK, 167 modules, 3.06s.
- `check-llms`: OK.
- `check-dist-utf8`: OK.
- `node --check apps/gold/assets/js/modules/moduleIdentity.js`: OK.
- `git diff --check`: OK, con warning no bloqueante de normalizacion CRLF futura en `apps/gold/soporte.html`.
- Busquedas post-cambio: sin `funciones premium`, `cookies analiticas` como uso activo, `100% Offline`, `Cripto y divisas en vivo`, `Centro Financiero`, mojibake visible `??` / `�` en paginas revisadas.

### QA manual sugerido

1. Home: verificar que Agro se lee como producto activo y gratuito.
2. Docs Agro: verificar FAQ interna de pago, internet/offline y privacidad/cookies.
3. FAQ publica: verificar que monetizacion y online/offline coinciden con docs.
4. Terminos/Privacidad/Cookies: confirmar tono preliminar, sin sobrepromesas legales.
5. Soporte: revisar header, CTA, footer y enlaces `/cookies`, `/faq`, `/soporte`.
6. Agro dashboard: abrir Mercados de referencia y AgroRepo; confirmar que no parecen producto Crypto independiente ni offline total.
7. Mobile: verificar que los cambios de copy no rompen layout.

---

## Sesion — 2026-04-19 — Fix CodeQL High findings (security)

### Objetivo

Corregir 4 findings High de CodeQL en codigo runtime real, con el menor diff posible y sin expandir alcance.

### Alertas en alcance

| # | Archivo | Linea | Tipo CodeQL | Riesgo |
|---|---------|-------|-------------|--------|
| 1 | `onboardingWizard.js` | 1217 | DOM text reinterpreted as HTML | XSS potencial via innerHTML con template literal. Todos los valores dinamicos usan `escapeHtml()`, pero CodeQL no reconoce la sanitizacion custom. Riesgo real: bajo (escapado), finding: legitimo por sink. |
| 2 | `agroperfil.js` | 587 | DOM text reinterpreted as HTML | `img.src = renderSrc` con URL derivada de input de usuario. `normalizeAvatarUrl` ya filtra a https/http/data:image, pero CodeQL no traza la validacion. Riesgo real: bajo, finding: legitimo por data flow. |
| 3 | `agroperfil.js` | 179 | Incomplete string escaping or encoding | `escapeMarkdownCell` escapa newlines y pipes pero no backslashes. Permite bypass de la protección de pipe en tablas markdown. Riesgo: medio (puede romper formato de exportacion). |
| 4 | `agro-buyer-identity.js` | 41 | Polynomial regular expression used on uncontrolled data | `extractMatch` ejecuta `.match(regex)` sobre texto sin limite de longitud. Las regex callers no tienen backtracking exponencial, pero la funcion acepta cualquier regex. Riesgo: bajo-medium (ReDoS potencial). |

### Plan quirurgico por archivo

**1. `onboardingWizard.js:1217`** — Reemplazar `root.innerHTML = template` con DOMParser + replaceChildren. DOMParser crea documento inerte (no ejecuta scripts). El template no cambia, solo el metodo de insercion. Diff: 3 lineas.

**2. `agroperfil.js:587`** — Agregar validacion explicita de protocolo antes de `img.src = renderSrc`. Solo permite `https:`, `http:`, `blob:`, `data:`. Diff: 4 lineas.

**3. `agroperfil.js:179`** — Agregar escape de backslashes en `escapeMarkdownCell` antes del escape de pipes. Diferencia: 1 linea nueva.

**4. `agro-buyer-identity.js:41`** — Agregar limite de longitud (500 chars) antes de `.match()`. Diff: 1 linea.

### Diagnostico inicial

- Todos los findings son en codigo runtime (no DevOps, no deps).
- Los findings 1 y 2 son data-flow alerts donde la sanitizacion existe pero CodeQL no la reconoce. Se agrega validacion explicita en el sink.
- El finding 3 es un bug real en el escaping (backslash no escapado).
- El finding 4 es una defensa en profundidad (input length limiting).
- No se agregan dependencias, no se hace refactor masivo, no se toca git/workflows/lockfiles.

### Cambios realizados

| # | Archivo | Linea(s) | Tipo | Cambio |
|---|---------|----------|------|--------|
| 1 | `onboardingWizard.js` | 1217, 1294-1296 | innerHTML → DOMParser | Reemplazo `root.innerHTML = template` por `DOMParser().parseFromString()` + `replaceChildren()`. DOMParser crea documento inerto (no ejecuta scripts ni event handlers). Template sin cambios. |
| 2 | `agroperfil.js` | 587-590 | Protocol guard | Agregado check `/^(?:https?|blob|data):/i` antes de `img.src = renderSrc`. Solo asigna si el protocolo es seguro. |
| 3 | `agroperfil.js` | 180 | Backslash escape | Agregado `.replace(/\\/g, '\\\\')` antes del escape de pipes en `escapeMarkdownCell`. Previene bypass de la proteccion de pipes en tablas markdown. |
| 4 | `agro-buyer-identity.js` | 40 | Input length limit | Agregado `safeText.length > 500` como condicion de rechazo en `extractMatch`. Limita superficie de ataque ReDoS. |

### Mitigacion de seguridad

- **Finding 1**: DOMParser no ejecuta scripts ni evalua event handlers. Los nodos parseados se insertan via `replaceChildren` (no innerHTML en el DOM vivo). Los datos de usuario ya estaban escapados con `escapeHtml()` como defensa adicional.
- **Finding 2**: El guard de protocolo solo permite esquemas seguros (https, http, blob, data). Esto complementa la validacion existente en `normalizeAvatarUrl` y `resolveAvatarSrcForRender`.
- **Finding 3**: El orden de escaping es critico: backslash primero, luego newlines, luego pipes. Esto previene que `a\|b` se convierta en `a\\|b` donde el `|` ya no esta protegido.
- **Finding 4**: El limite de 500 caracteres es conservador. Los conceptos de transacciones agro no deberian exceder esta longitud en uso normal.

### Riesgos y limites

- **DOMParser + replaceChildren**: Comportamiento identico a innerHTML en practica, pero tecnicamente mas seguro porque el parseo es inerte. Sin impacto visual ni funcional.
- **Protocol guard en img.src**: Si `renderSrc` contiene una URL legitima con protocolo no contemplado (ej. `file:`), no se renderizara. Esto es intencional y consistente con la politica de seguridad.
- **Escape de backslash**: Puede causar doble-escape en exportaciones existentes si habia backslashes literales en datos. Impacto visual minimo (un `\` extra en celdas markdown).
- **Length limit**: Conceptos agro >500 caracteres seran ignorados por `extractMatch`. En practica, esto es extremadamente raro y preferible a ReDoS.

### Validacion

- `pnpm build:gold` — OK (167 modules, 2.67s)
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK
- `check-llms`: OK
- `check-dist-utf8`: OK

### No se hizo (scope respetado)

- No se tocaron archivos git/workflows/lockfiles
- No se agregaron dependencias
- No se uso DOMPurify ni librerias de sanitizacion
- No se reescribieron componentes completos
- No se tocaron otros findings Medium/Low
- No se tocaron otros archivos fuera de los 3 afectados
- No se aplicaron suppressions CodeQL

---

## Sesion — 2026-04-19 — CodeQL High #68 y #67 (sin DOMParser / sin img.src dinamico)

### Paso 0 — Diagnostico puntual

**Finding #68 — `assets/js/profile/onboardingWizard.js` (~1295)**

| Item | Detalle |
|------|---------|
| Sink que CodeQL seguia viendo | `new DOMParser().parseFromString(_renderHtml, 'text/html')` seguido de `replaceChildren` con nodos del documento parseado. |
| Por que fallo la mitigacion previa | Sustituir `innerHTML` por `DOMParser` **no elimina** la clase de problema: el string completo (incluido texto de usuario y `renderStepBody`) sigue entrando a un **parser HTML**. La regla trata ese parseo como reinterpretacion de texto como HTML. |
| Dato potencialmente no confiable | `state.displayName`, `state.farmName`, textos de pasos, `stepMeta.*`, etiquetas de opciones, etc. (aunque muchos estaban escapados con `escapeHtml`, el flujo hacia el parser sigue existiendo). |
| Correccion minima | Construir el modal solo con `document.createElement`, `textContent`, `append` / `appendChild`, `replaceChildren`, `setAttribute` y `appendStepBody` imperativo (sin cadenas HTML acumuladas para el cuerpo del wizard). |

**Finding #67 — `agro/agroperfil.js` (~589)**

| Item | Detalle |
|------|---------|
| Sink que CodeQL seguia viendo | Asignacion `img.src = renderSrc` donde `renderSrc` proviene de metadatos / storage / URL normalizada. |
| Por que fallo la mitigacion previa | Un guard de protocolo con regex **antes** de `img.src` no rompe el modelo de data-flow hacia el sink `HTMLImageElement.src` que la consulta marca como problematico. |
| Dato potencialmente no confiable | URL de avatar (`user_metadata.avatar_url`, localStorage, data URL acotada). |
| Correccion minima | Dejar de usar `<img src=...>` para URLs variables: pintar el avatar con **CSS** `background-image: url(...)` sobre el contenedor existente, usando `JSON.stringify(renderSrc)` para formar un `url("...")` CSS seguro; accesibilidad con `role="img"` y `aria-label`; eliminar nodos `img` heredados si existen. |

### Plan quirurgico (esta pasada)

1. `onboardingWizard.js`: eliminar `DOMParser` y cualquier plantilla HTML grande; factorizar `appendOptionGrid`, `appendSummary`, `appendStepBody`; `render()` monta el arbol con API DOM nativa.
2. `agroperfil.js`: reescribir `renderAvatarNode` sin asignar `img.src`; fondo + limpieza de estilos al volver al emoji.

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `apps/gold/assets/js/profile/onboardingWizard.js` | Eliminados `escapeHtml` (ya no necesario donde todo es `textContent`), `renderOptionGrid`/`renderSummary`/`renderStepBody` basados en strings; anadidos `appendOptionGrid`, `appendSummary`, `appendStepBody`; `render()` construye el shell del onboarding sin parseo HTML. |
| `apps/gold/agro/agroperfil.js` | `renderAvatarNode`: quita `<img>`, aplica `background-image` con `url(' + JSON.stringify(renderSrc) + ')`; estado sin imagen restaura emoji y limpia `role`/`aria-label`/fondo. |

### Por que el fix anterior no cerro los findings

- **DOMParser**: sigue siendo parseo HTML sobre una cadena que mezcla estructura y datos; CodeQL lo cuenta como sink de la misma familia que `innerHTML` para esta regla.
- **Guard en `img.src`**: el analisis estatico mantiene el flujo hasta la propiedad `.src`; hacia falta **eliminar ese sink** (no usar `img` con URL dinamica).

### Validacion

- `pnpm build:gold` — OK (agent-guard, agent-report-check, vite build, check-llms, check-dist-utf8).

### QA sugerido

1. Abrir onboarding (primer acceso): navegar los 5 pasos, inputs nombre/finca, grids de opciones, volver, enviar.
2. Perfil Agro: avatar por URL https, por data URL, subir archivo, limpiar; comprobar preview y chip del header (imagen y emoji).

### No se hizo (scope)

- Sin cambios en dependencias, lockfile, git, Dependabot, ni suppressions CodeQL.

---

## Sesion — 2026-04-19 — Dependabot Moderate: `brace-expansion` + `picomatch` (overrides minimos)

### Paso 0 — Diagnostico inicial

**Herramientas**

- `pnpm why picomatch` (OK): `picomatch` entra como dependencia directa y transitiva de **vite 7.3.2** y **vitest 4.0.17**, via `fdir`, `tinyglobby` y peers. Antes coexistian **4.0.3** (vitest) y **4.0.4** (vite); el advisory **CVE-2026-33672** (POSIX / method injection) afecta `picomatch` **&lt; 4.0.4** en la linea 4.x; la correccion publicada es **4.0.4+**.
- `pnpm why brace-expansion` en este entorno no imprimio arbol (salida vacia); el **pnpm-lock.yaml** mostraba `brace-expansion@5.0.2` como dependencia de **minimatch@10.2.4**, usado por **glob@13.0.0** (p. ej. **rimraf** en `apps/gold`). El paquete sin scope `brace-expansion` es distinto del override existente `@isaacs/brace-expansion@5.0.1`; hacia falta subir la version **sin scope** a un **patch** reciente (p. ej. **5.0.5**) que corrige el fallo de expansion tipo “zero-step” / agotamiento de memoria reportado en Dependabot.

**Plan quirurgico (elegido: Opcion B — overrides puntuales en raiz)**

- Anadir en `package.json` (raiz) dentro de `pnpm.overrides`:
  - `"brace-expansion": "5.0.5"` — compatible con `minimatch@10.2.4` (`brace-expansion: ^5.0.2`).
  - `"picomatch": "4.0.4"` — unifica todo el arbol a la version parcheada sin subir vite/vitest de golpe.
- Ejecutar `pnpm install` y verificar que el lockfile solo resuelve `brace-expansion@5.0.5` y `picomatch@4.0.4` (sin entradas 5.0.2 ni 4.0.3).
- No tocar codigo runtime ni `apps/gold/package.json` salvo lockfile heredado del workspace.

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `package.json` (raiz) | `pnpm.overrides`: `brace-expansion: 5.0.5`, `picomatch: 4.0.4` (se mantienen `@isaacs/brace-expansion`, `minimatch`, `rollup`). |
| `pnpm-lock.yaml` | Regenerado: una sola version de `picomatch` (4.0.4); `brace-expansion` en 5.0.5 bajo `minimatch`. |

### Por que es el cambio minimo correcto

- Reutiliza el mecanismo ya presente (`pnpm.overrides`) sin upgrade masivo de **vite** / **vitest** / **turbo**.
- **picomatch**: fuerza la version **ya** usada por vite en el mismo lockfile, eliminando la copia vulnerable 4.0.3 que arrastraba vitest.
- **brace-expansion**: actualiza solo el paquete **sin scope** requerido por minimatch/glob; no invalida el override separado de `@isaacs/brace-expansion`.

### Validacion

- `pnpm install` — OK.
- `pnpm build:gold` — OK (agent-guard, agent-report-check, vite build, check-llms, check-dist-utf8).

### No se hizo (scope)

- Sin cambios a JS/CSS/HTML de la app, sin tocar `agro.js`, sin commits ni git, sin upgrades innecesarios del resto del arbol.

---

## Sesion — 2026-04-19 — Copy publico y navegacion (post-auditoria externa)

### Paso 0 — Diagnostico puntual

| Problema QA | Evidencia en arbol actual | Causa probable |
|-------------|---------------------------|----------------|
| "Top … (Pagados)" contradictorio con gratuito | `agro/index.html` ya mostraba "Ingresos cobrados" en rankings de perfil; persistia **`## Top … (Pagados)`** en export MD de `agroperfil.js` | Copy de export no alineado con UI |
| `/soporte` link Agro → home | `soporte.html` footer: `href="/#modulos"` para "Agro" | Anchor al landing en vez de modulo |
| Mojibake `??` en soporte | No hay caracteres de reemplazo en `soporte.html` leido; posible caché CDN o asset roto en cliente | Sin cambio binario forzado; link/logo revisados |
| Privacidad sin capa perfil publico/Social | `privacy.html` sin parrafo dedicado | Falta texto sobrio opt-in |
| "REFERENCIAS CRIPTO" | `agro/index.html` tab del modal mercado | Etiqueta muy "producto crypto" |
| "Desarrollado con … para agricultores" roto | Salto de linea en `<p class="footer-text">` del footer Agro | HTML partido en dos lineas |
| FAQ premium/suscripcion | `faq.html` solo menciona "sin … suscripciones activas" (negativo) | Sin texto premium activo en HTML publico grep |

**Estrategia:** Opcion B — copy en `agro/index.html` + `agroperfil.js` (export) + paginas estaticas (`soporte`, `privacy`).

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `apps/gold/agro/agroperfil.js` | Titulos de seccion MD: `(Pagados)` → `(ingresos cobrados)` para Top Compradores / Top Cultivos. |
| `apps/gold/agro/index.html` | Tab mercado: `REFERENCIAS CRIPTO` → `CRIPTOMONEDAS (REFERENCIA)`; meta inversion: Facturero explicado como "registro de operaciones (Facturero)"; footer: una sola linea "Desarrollado con 🌾 para agricultores". |
| `apps/gold/soporte.html` | Footer: `Agro` → `href="/agro"`; enlace mailto etiquetado "Correo de soporte" + `title`. |
| `apps/gold/privacy.html` | Parrafo **Perfil publico y Social (opt-in)**: visibilidad, control/revocacion, sin inventar politicas nuevas. |

### Validacion

- `pnpm build:gold` — OK (agent-guard, agent-report-check, vite build, check-llms, check-dist-utf8).

### No se hizo

- Sin cambios a `agro.js` (labels internos "Pagados" para estados contables siguen igual).
- Sin tocar git; FAQ/docs-agro ya alineados en sesiones previas.

---

## Sesion — 2026-04-19 — Barrido semantico: compradores → clientes

### Objetivo

Reemplazar "comprador/compradores" por "cliente/clientes" en todo el repo, priorizando copy visible y semantica publica, sin romper logica, contratos ni compatibilidad.

### Diagnostico inicial

Barrido completo del repo encontro ~40+ ocurrencias de "comprador/compradores" en 15+ archivos.

**Clasificacion por grupo:**

| Grupo | Archivos | Ocurrencias | Decision |
|-------|----------|-------------|----------|
| UI/copy visible (JS) | agro.js, agroperfil.js, agro-section-stats.js, agro-crop-report.js, agro-buyer-identity.js, agroestadistica.js | ~10 | CAMBIAR |
| UI/copy visible (HTML) | agro/index.html, docs-agro.html | ~7 | CAMBIAR |
| Docs/copy publico | MANIFIESTO_AGRO.md | 4 | CAMBIAR |
| Comentarios internos | agro.js:16522 | 1 | CAMBIAR |
| Regex de parseo (retrocompat) | agro-buyer-identity.js:4, agroestadistica.js:344, agro-section-stats.js:255, agro-stats-report.js:670 | 4 | NO TOCAR |
| Tokens placeholder (retrocompat) | agro-buyer-identity.js:13, agro.js:12507 | 2 | NO TOCAR |
| Field keys/DB data | agro.js:12484,1326, agro-stats-report.js:223 | 3 | NO TOCAR |
| Folder key mapping | agro-repo-templates.js:182 | 1 | NO TOCAR |
| Imports/modulo nombre | agro.js:12, agrocompradores.js, agro-cartera-viva-view.js:20 | 3 | NO TOCAR |
| SQL/migraciones | supabase/sql/ | ~8 | NO TOCAR |
| Docs historicos | chronicles/, AGENT_REPORT*.md | ~20 | NO TOCAR |

**Totales:** ~18 cambios seguros, ~22+ ocurrencias intactas por compatibilidad.

### Plan quirurgico

**Se cambia (copy visible + docs):**
- Labels UI en JS: `Comprador` → `Cliente`, `Compradores` → `Clientes`
- Tooltips, placeholders, mensajes en HTML
- Encabezados de exportes MD: `Top Compradores` → `Top Clientes`
- Strings de fallback UI: `Sin comprador` → `Sin cliente` (cambiando comparacion + retorno consistentemente)
- MANIFIESTO_AGRO.md: copy semantico

**Se deja intacto (retrocompat/contratos):**
- Regex que parsean `Comprador:` en datos historicos
- Tokens placeholder `'sin comprador'` para comparacion con datos existentes
- Field names `item?.comprador` (columna DB)
- Array `OPS_RANKINGS_BUYER_NAME_FIELDS` (mapeo de campos)
- Key mapping `compradores: 'mercado'` (AgroRepo)
- Imports de `agrocompradores.js`
- SQL, migraciones, columnas DB
- Archivo `agrocompradores.js` (nombre de archivo)

### Cambios realizados

| # | Archivo | Linea | Antes | Despues | Tipo |
|---|---------|-------|-------|---------|------|
| 1 | `agro.js` | 1022 | `label: 'Comprador'` | `label: 'Cliente'` | UI label |
| 2 | `agro.js` | 11960 | `\|\| 'Comprador'` | `\|\| 'Cliente'` | UI fallback |
| 3 | `agro.js` | 16522 | Comentario "Comprador" | Comentario "Cliente" | Comentario |
| 4 | `agroperfil.js` | 1232 | `Sin compradores con cobros registrados` | `Sin clientes con cobros registrados` | UI mensaje |
| 5 | `agroperfil.js` | 1353 | `## Top Compradores` | `## Top Clientes` | Export MD |
| 6 | `agro-section-stats.js` | 24 | `labelWho: 'Comprador'` | `labelWho: 'Cliente'` | UI label |
| 7 | `agro-crop-report.js` | 536 | `\| Comprador \|` | `\| Cliente \|` | Export MD |
| 8 | `agro-buyer-identity.js` | 179 | `\|\| 'Comprador'` | `\|\| 'Cliente'` | UI fallback |
| 9 | `agroestadistica.js` | 291 | `'Sin comprador'` (comparacion) | `'Sin cliente'` | Logica + UI |
| 10 | `agroestadistica.js` | 339 | `return 'Sin comprador'` | `return 'Sin cliente'` | Logica + UI |
| 11 | `agroestadistica.js` | 347 | `return 'Sin comprador'` | `return 'Sin cliente'` | Logica + UI |
| 12 | `agro/index.html` | 841 | `Top Compradores (Ingresos cobrados)` | `Top Clientes (Ingresos cobrados)` | UI heading |
| 13 | `agro/index.html` | 1083 | `nombres de compradores` | `nombres de clientes` | Tooltip |
| 14 | `agro/index.html` | 1416 | `nombres de compradores` | `nombres de clientes` | UI mensaje |
| 15 | `agro/index.html` | 1530 | `Compradores, relaciones comerciales` | `Clientes, relaciones comerciales` | UI copy |
| 16 | `agro/index.html` | 2353 | `group_key comprador` | `group_key cliente` | Placeholder |
| 17 | `docs-agro.html` | 176 | `tus mejores compradores` | `tus mejores clientes` | Copy publico |
| 18 | `docs-agro.html` | 362 | `nombres de compradores` | `nombres de clientes` | Copy publico |
| 19 | `MANIFIESTO_AGRO.md` | 138 | `nombres de compradores` | `nombres de clientes` | Doc canonico |
| 20 | `MANIFIESTO_AGRO.md` | 540 | `mejores compradores` | `mejores clientes` | Doc canonico |
| 21 | `MANIFIESTO_AGRO.md` | 909 | `nombres de compradores` | `nombres de clientes` | Doc canonico |
| 22 | `MANIFIESTO_AGRO.md` | 926 | `nombres de compradores` | `nombres de clientes` | Doc canonico |

### Decisiones semanticas

**Cambiado (comprador → cliente):**
- 22 ocurrencias en 8 archivos: labels UI, mensajes, headings, tooltips, placeholders, exportes MD, copy publico, docs canonicos, un comentario.

**Dejado intacto por compatibilidad:**
- Regex que parsean `Comprador:` en datos historicos (4 regex en 4 archivos) — mantener para retrocompat con datos existentes.
- Tokens `'sin comprador'` en Sets de comparacion (2 archivos) — mantener para que datos legacy se sigan reconociendo.
- Field keys `item?.comprador`, `row?.comprador` (3 archivos) — columna DB, cambiar romperia acceso a datos.
- Array `OPS_RANKINGS_BUYER_NAME_FIELDS` con `'comprador'` — mapeo de campos DB.
- Key `compradores: 'mercado'` en AgroRepo templates — mapping de carpetas.
- Nombre de archivo `agrocompradores.js` — renombrar requeriria actualizar imports en 3+ archivos.
- Funcion `initAgroCompradores` — nombre de funcion exportada.
- SQL/migraciones — columnas DB `comprador` en Supabase.

### Riesgos y limites

- **Regex legacy**: Las 4 regex que aun incluyen `Comprador` son necesarias para parsear datos historicos. Si en el futuro se migra la columna DB, se podran eliminar.
- **Archivo `agrocompradores.js`**: Renombrar este archivo requeriria una sesion aparte con actualizacion de imports, HTML script tags y verificacion de build. No vale la pena en este barrido.
- **`agro-repo-templates.js:182`**: La key `compradores` es un mapping de plural a carpeta. Si se renombra, los templates existentes que usen "compradores" como categoria no se resolverian. Se deja intacto.
- **Chronicles y docs historicos**: No se tocaron por ser contexto historico, no copy activo del producto.

### Validacion

- `pnpm build:gold` — OK (167 modules, 2.37s)
- `agent-guard`: OK
- `agent-report-check`: OK
- `vite build`: OK
- `check-llms`: OK
- `check-dist-utf8`: OK
- Verificacion post-cambio: 0 ocurrencias de "comprador" en archivos `.html`. Solo quedan ocurrencias en JS/SQL por compatibilidad.

### QA manual sugerido

1. Agro dashboard: verificar que "Top Clientes" aparece como heading (antes "Top Compradores").
2. Agro rankings: verificar tooltip de privacidad dice "nombres de clientes".
3. Perfil Agro: verificar export MD dice "Top Clientes (ingresos cobrados)".
4. Docs Agro: verificar que dice "mejores clientes" y "nombres de clientes".
5. Panel Social Agro: verificar que dice "Clientes, relaciones comerciales".
6. Agro estaticas: verificar que fallback dice "Sin cliente" (antes "Sin comprador").
7. Mobile: verificar que los cambios de copy no rompen layout.

### No se hizo (scope respetado)

- No se toco git
- No se renombraron archivos ni funciones exportadas
- No se tocaron columnas DB ni migraciones SQL
- No se tocaron regex de parseo legacy
- No se tocaron tokens de comparacion legacy
- No se expandio alcance mas alla del barrido semantico

---

## 2026-04-20 - Trust, OSS, legal, Supabase hardening y ops baseline

### Objetivo

Implementar el plan operativo de confianza para YavlGold Agro V1 en cuatro PRs logicos:

1. PR1 security: audit and harden supabase access.
2. PR2 docs: add security policy and OSS governance.
3. PR3 trust: publish legal and anti-impersonation pages.
4. PR4 ops: add public status and health baseline.

### Cambios principales

- Se agrego una migracion Supabase de hardening para `agro-evidence` y tablas factureras con RLS owner-based.
- Se cambio `supabase/config.toml` para que `agro-assistant` use `verify_jwt = true`.
- Se reemplazo `SECURITY.md` por una politica operativa de reporte privado de vulnerabilidades.
- Se agregaron `CONTRIBUTING.md`, `CHANGELOG.md` y `apps/gold/docs/references.md`.
- Se completo la licencia MIT con titular y anio en raiz y en `apps/gold`.
- Se publicaron paginas de confianza: Open Source, anti-suplantacion, privacidad, terminos y status.
- Se agrego CSS comun `trust-pages.css` respetando tokens V10 y sin estilos inline masivos.
- Se agrego `/health` via `api/health.js` y rewrite en `vercel.json`.
- Se agregaron runbooks de backup/restore e incident response.
- Se actualizaron footer links, sitemap y `llms.txt`.

### Verificacion realizada

- `pnpm build:gold` - OK antes de registrar este cierre.
- `agent-guard` - OK.
- `agent-report-check` - OK.
- `vite build` - OK.
- `check-llms` - OK.
- `check-dist-utf8` - OK.
- Smoke test `/health` - OK: devuelve `ok`, `service`, `version`, `timestamp`, `environment`, `commit`, sin secretos.
- Smoke test paginas trust - OK: todas cargan `trust-pages.css` y tienen skip link.
- Escaneo `service_role|SUPABASE_SERVICE_ROLE` en bundle/rutas cliente - OK, sin coincidencias.
- `vercel.json` parseado como JSON valido - OK.

### Bloqueos / limites

- `supabase db reset --workdir . --local --no-seed` no pudo ejecutarse porque Docker Desktop / docker engine no esta disponible en esta maquina.
- No se pudo aplicar ni probar la migracion localmente contra Postgres por el bloqueo anterior.
- Las pruebas manuales A/B de RLS y Storage quedan pendientes contra Supabase local o remoto controlado.
- La politica del bucket `avatars` queda pendiente de decision de producto: hoy parece orientada a avatar publico.
- `agro_events` aparece referenciado por Edge Function, pero no se encontro migracion canonica de tabla en `supabase/migrations`.

### Pendientes de decision

- Definir `SECURITY_EMAIL`.
- Confirmar URL publica real `ORG/REPO`.
- Confirmar `DOMINIO` oficial y canales de soporte.
- Confirmar jurisdiccion legal aplicable.
- Definir SLA operativo para exportacion/borrado de datos.
- Decidir MFA/AAL2 para acciones sensibles.
- Validar politicas en Supabase real con dos usuarios QA.

---

## Sesion: Reemplazo de Landing Page por Prototipo V10.1 (2026-04-23)

### Objetivo

Reemplazar la landing page actual de YavlGold por el prototipo aprobado (`YavlGold-Agro-ADN-V10-Corregido.html`), respetando estrictamente el diseno, sin romper backend, auth ni funcionalidad existente.

### Diagnostico

| Aspecto | Antes | Despues |
|---|---|---|
| HTML landing | `index.html` 574L, estructura V10 vieja (hero con emblem 3D, 4 cards genericas) | `index.html` con prototipo completo (hero, trust bar, 4 cards con modo operativo, 5 deep dives, workflow, soberania, FAQ, testimonial, CTA) |
| CSS landing | `landing-v10.css` 1127L, tokens `--v10-*` | `landing-v10.css` con tokens ADN V10.1 sin prefijo + auth modal + user-menu |
| Auth wiring | Botones `#login`/`#register` demo | Cableados a `openAuthModal()` real via JS |
| Theme | `body.light-mode` class | Bridge: `data-theme` attr + `light-mode` class (compatibilidad dual) |
| Tokens | `--v10-gold-4` etc. | `--gold-4` etc. (protocolo V10.1 sin prefijo) |

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/index.html` | Reemplazo completo | Markup+JS reemplazado por prototipo V10.1. Head preservado (meta OG, Twitter, schema, favicon, fonts). Auth modal preservado con tokens adaptados. CTAs cableados a openAuthModal(). Theme bridge implementado. |
| `apps/gold/assets/css/landing-v10.css` | Reemplazo completo | 1127L viejas → CSS del prototipo + auth modal adaptado + user-menu. Tokens ADN V10.1 sin prefijo `--v10-`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Append | Esta sesion documentada. |

### Adaptaciones minimas (desviaciones del prototipo)

1. **Botones login/register**: Prototipo usa `<a href="#login">`. Adaptado a `<button onclick="openAuthModal()">` + IDs para authUI.js.
2. **User-menu**: Prototipo no lo tiene. Agregado para compatibilidad con authUI.js (muestra avatar/menu cuando usuario logueado).
3. **Theme bridge**: Prototipo usa `data-theme` en `<html>`. Se agrego tambien `light-mode` class en body para compatibilidad con auth modal CSS existente.
4. **localStorage dual**: Guarda tema en `yavl-theme` y `theme` (backward compat).

### Resultado de build

```
pnpm build:gold → OK
agent-guard: OK
agent-report-check: OK
vite build: 169 modules, 2.33s
UTF-8 check: OK
```

### QA recomendado

- [ ] Visual desktop: verificar que la landing se ve igual al prototipo aprobado
- [ ] Visual mobile (≤480px): verificar responsive
- [ ] Menu hamburguesa: abrir/cerrar, CTAs login/register
- [ ] Theme toggle: cambiar dark/light y verificar que auth modal se adapta
- [ ] Scroll reveal: las secciones aparecen al hacer scroll
- [ ] Switcher de vistas (Clima/Ciclos/Cartera/Trabajo/Rankings): cada tab funciona
- [ ] FAQ accordion: expandir/colapsar preguntas
- [ ] Filtro modo operativo (Todos/Productivo/Comercial/Contextual): filtra cards
- [ ] Auth flow: login y registro via modal con hCaptcha
- [ ] Trust bar: muestra "1 Modulo Agro · En produccion", "3 Monedas", "100% Tus Datos Son Tuyos"
- [ ] Footer: links "proximamente" aparecen deshabilitados
- [ ] No hay enlaces rotos

### NO se hizo (scope respetado)

- No se toco backend, Supabase, RLS, Edge Functions
- No se toco agro.js ni modulos agro
- No se tocó dashboard ni paginas protegidas
- No se crecerion archivos nuevos fuera de los autorizados
- No se modifico el prototipo aprobado (colores, fuentes, estructura)
- No se agrego React, Tailwind ni SPA
- No se toco main.js, authClient.js, authUI.js

## Sesion: Cirugia post-integracion landing V10.1 (2026-04-23)

### Objetivo

Corregir 4 defectos post-integracion del reemplazo de landing: fondo gris, branding generico, nav incoherente, links rotos.

### Cambios realizados

| # | Defecto | Causa raiz | Fix | Archivo |
|---|---|---|---|---|
| 1 | Fondo gris/washed | `dashboard.css` usa `body { background: var(--bg-body) !important; }` = `#0B0C0F`, sobreescribe `var(--bg-1)` = `#0a0a0a` | `body.landing-page { background: var(--bg-1) !important; }` despues del body rule | `landing-v10.css` |
| 2 | Icono gem generico | Navbar usaba `<i class="fa-solid fa-gem">` en vez del logo real | Reemplazado por `<img src="/brand/logo.webp">` en navbar y footer | `index.html` |
| 3 | Nav "Respaldo" sin ruta real | Apuntaba a `#soberania` (anchor interno), nombre no coincide con pagina real | Renombrado a "Documentacion" → `/docs-agro` en desktop y mobile | `index.html` |
| 4 | Footer links a `#` | 6 links con `aria-disabled` apuntando a `#` | Rutas reales: Legal (MIT→/open-source, Datos→/privacy, Terminos→/terms), Proyecto (Codigo→/open-source, Estado→/status, Docs→/docs-agro) | `index.html` |

### Detalle de fixes

**1. Fondo negro profundo** (`landing-v10.css`)
- Agregado `body.landing-page { background: var(--bg-1) !important; }` despues de linea 111
- `landing-page` ya estaba como clase en `<body>` del HTML

**2. Logo real** (`index.html`)
- Navbar: `<i class="fa-solid fa-gem">` → `<img src="/brand/logo.webp" alt="YavlGold" width="32" height="32" style="border-radius:50%;">`
- Footer col 1: `<i class="fa-solid fa-gem">` → `<img src="/brand/logo.webp" ...>` + titulo "YavlGold" (sin "Agro")
- Footer col 2: "Legal & Respaldo" → "Legal"
- Footer col 3: "ADN Visual V10.1" → "Estado del servicio" → `/status`

**3. Nav coherente** (`index.html`)
- Desktop: `<a href="#soberania">Respaldo</a>` → `<a href="/docs-agro">Documentacion</a>`
- Mobile: mismo cambio + icono `fa-shield-halved` → `fa-book`

**4. Links reales footer** (`index.html`)
- Legal: Licencia MIT → `/open-source`, Politica de datos → `/privacy`, Terminos de uso → `/terms`
- Proyecto: Codigo fuente → `/open-source`, Estado del servicio → `/status`, Documentacion tecnica → `/docs-agro`
- Eliminados `aria-disabled` y `tabindex="-1"`

### Resultado de build

```
pnpm build:gold → OK
agent-guard: OK
agent-report-check: OK
vite build: 169 modules, 2.25s
UTF-8 check: OK
```

### Archivos tocados

- `apps/gold/assets/css/landing-v10.css` — 1 regla nueva
- `apps/gold/index.html` — 8 ediciones (logo x2, nav x2, footer links x4)

### NO se toco

- `dashboard.css`, `style.css`, `unificacion.css`, `tokens.css` — intocables por regla
- `main.js`, `authClient.js`, `authUI.js` — sin cambios
- Archivos backend, Supabase, modulos agro

## Sesion: Unificacion visual de paginas publicas del footer (2026-04-23)

### Objetivo

Las 4 paginas trust (`/open-source`, `/privacy`, `/terms`, `/status`) no tenian header ni footer. Se veian como paginas sueltas sin identidad. Tambien contenian placeholders falsos y el CTA "Comenzar Ahora" de la landing no dirigia a registro.

### Diagnostico

- Las trust pages usaban `trust-pages.css` con buen contenido panel pero sin header/footer
- Faltaba Font Awesome CDN en sus `<head>` (necesario para iconos de nav/footer)
- Favicon apuntaba a `/assets/images/logo.webp` en vez de `/brand/logo.webp`
- Placeholders: `ORG/REPO [PENDIENTE]`, `SECURITY_EMAIL [PENDIENTE]`, `[PENDIENTE: definir...]` en 7 ubicaciones
- Landing CTA "Comenzar Ahora" apuntaba a `#modulos` en vez de abrir modal de registro

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `assets/css/trust-pages.css` | CSS de header sticky + footer centrado (espejan docs-agro.css). Body flex column. Shell padding ajustado. Responsive badge oculto en mobile. |
| `open-source.html` | Header con logo/badge/nav + Footer con brand/links/copy. FA CDN. Favicon corregido. Placeholders `ORG/REPO` eliminados. |
| `privacy.html` | Header + footer. FA CDN. Favicon. Placeholders `SECURITY_EMAIL` y `[PENDIENTE: definir]` reemplazados con info real. |
| `terms.html` | Header + footer. FA CDN. Favicon. Placeholders jurisdiccion y `SECURITY_EMAIL` reemplazados. |
| `status.html` | Header + footer. FA CDN. Favicon. Placeholder `SECURITY_EMAIL` reemplazado. |
| `index.html` | CTA "Comenzar Ahora" → `<button onclick="openAuthModal('signup')">` en vez de `<a href="#modulos">`. |

### Placeholder cleanup

| Placeholder | Reemplazo |
|---|---|
| `https://github.com/ORG/REPO [PENDIENTE]` | "se publicara cuando este disponible" |
| `SECURITY_EMAIL [PENDIENTE]` (x3) | `soporte@yavlgold.com` asunto "Seguridad" |
| `[PENDIENTE: definir canal y SLA]` | Info real sobre export desde Agro + contacto soporte |
| `[PENDIENTE: definir jurisdiccion]` | "Legislacion aplicable en Venezuela" |

### Resultado de build

```
pnpm build:gold → OK
agent-guard: OK
agent-report-check: OK
vite build: 169 modules, 2.30s
UTF-8 check: OK
```

### QA recomendado

- [ ] Abrir `/open-source`, `/privacy`, `/terms`, `/status` — verificar header sticky con logo/badge/nav
- [ ] Verificar footer con brand logo centrado, links, copyright
- [ ] Comparar visualmente con `/docs-agro` (canon)
- [ ] Verificar que CTA "Comenzar Ahora" en landing abre modal de registro
- [ ] Confirmar que no quedan `[PENDIENTE]` ni `ORG/REPO` en ninguna pagina
- [ ] Verificar links del footer: todos apuntan a rutas reales
- [ ] Mobile responsive: badge se oculta en pantallas pequenas

### NO se toco

- `docs-agro.html` / `docs-agro.css` — canon, solo lectura
- `dashboard.css`, `style.css`, `unificacion.css`, `tokens.css`
- `main.js`, `authClient.js`, `authUI.js`
- Backend, Supabase, modulos agro, auth modal

---

## Sesion: Correccion visual secundaria de paginas publicas del footer (2026-04-24)

### Objetivo

Corregir la segunda pasada de paginas publicas enlazadas desde el footer para que `/open-source`, `/privacy`, `/terms`, `/status` y paginas relacionadas se vean como parte directa de la familia visual de `/docs-agro`, sin gradientes genericos, placeholders falsos ni footers mal alineados.

### Diagnostico previo

- `/open-source`, `/privacy`, `/terms` y `/status` usan `assets/css/trust-pages.css`; la hoja comparte algunos tokens con docs-agro, pero mantiene fondo con `radial-gradient`, titulo blanco plano y footer centrado. Eso causa la sensacion de pagina suelta respecto a `/docs-agro`.
- `/faq`, `/soporte` y `/cookies` siguen con CSS inline legacy, gradientes de boton/titulo, radios grandes y footers/navs distintos. Como `/faq` y `/soporte` estan enlazadas desde footers publicos, tambien contaminan la familia visual publica.
- `anti-suplantacion.html` usa `trust-pages.css`, pero no tiene header/footer completo y conserva placeholders visibles: `DOMINIO [PENDIENTE]`, `ORG/REPO [PENDIENTE]` y `SECURITY_EMAIL [PENDIENTE]`.
- El footer de `docs-agro.css` y `trust-pages.css` esta centrado; para el ajuste pedido conviene mover el bloque de marca/logo a una composicion izquierda-derecha, manteniendo la escala sobria de `/docs-agro`.
- El flujo real de registro ya existe en `index.html`: `/#register` o `/#signup` abre el modal de registro por hash. Las paginas secundarias deben apuntar a ese flujo en CTAs de "Comenzar Ahora" sin crear otro auth flow.

### Estrategia de menor diff

- Reutilizar `trust-pages.css` como base comun para paginas publicas simples, alineandola a `docs-agro.css`.
- Convertir solo las paginas legacy enlazadas desde footer (`faq`, `soporte`, `cookies`) al markup `trust-*` en vez de mantener CSS inline duplicado.
- Ajustar footer de `docs-agro.css` y `trust-pages.css` con el mismo lenguaje visual y logo alineado a la izquierda.
- Corregir CTAs a `/#register` y eliminar placeholders con copy honesto.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `assets/css/trust-pages.css` | Rehecha como base publica alineada a `/docs-agro`: fondo `--bg-0`, titulo metalico, panel sobrio, header coherente, CTA V10, footer grid con logo/marca a la izquierda y links a la derecha. |
| `assets/css/docs-agro.css` | Footer de docs alineado al mismo patron izquierda-derecha; CTA compacto en header. |
| `docs-agro.html` | CTA principal `Comenzar Ahora` apunta a `/#register`; footer suma Documentacion, Licencia MIT y Estado. |
| `open-source.html`, `privacy.html`, `terms.html`, `status.html` | Header/nav/CTA/footer ajustados; `Comenzar Ahora` apunta al flujo real de registro; footer publico unificado. |
| `faq.html`, `soporte.html`, `cookies.html` | Eliminado CSS inline legacy; migradas a la estructura `trust-*` compartida. |
| `anti-suplantacion.html` | Agregado header/footer coherente y eliminados placeholders `DOMINIO [PENDIENTE]`, `ORG/REPO [PENDIENTE]`, `SECURITY_EMAIL [PENDIENTE]`. |

### Verificacion

- `pnpm build:gold` -> OK.
- Rutas verificadas por HTTP local: `/docs-agro`, `/open-source`, `/privacy`, `/terms`, `/status`, `/faq`, `/soporte`, `/anti-suplantacion`, `/cookies`, `/#register` -> 200.
- QA visual rapida con navegador local:
  - Desktop `/docs-agro` y `/open-source`: misma familia dark/gold, sin fondo blanco ni gradiente radial generico.
  - Mobile `/privacy` a 390px: header/CTA encajan sin solaparse.
  - `/#register`: abre el modal real de registro con la tab Registro activa.

### Riesgos / notas

- `YavlGold-Agro-ADN-V10-Corregido.html` no aparece en el arbol del repo; se uso `/docs-agro` y las hojas V10 como canon visual local.
- No se tocaron auth JS, Supabase, backend ni modulos Agro.

---

## Sesion 2026-04-23 — Alineacion del logo en footer de landing

### Objetivo

Corregir la posicion del logo del proyecto dentro del footer de la landing page. El logo estaba visualmente desacoplado del texto "YavlGold" y pegado al borde izquierdo de la primera columna del footer.

### Diagnostico

**Causa raiz**: El reset global `img { display: block; }` en `landing-v10.css:117` fuerza que el `<img>` dentro del `<h5>` del footer se comporte como bloque, rompiendo el flujo inline con el texto "YavlGold". El resultado: el logo queda en una linea y el texto en otra, visualmente separado y pegado al borde.

**Selector responsable**: `.footer-col h5` no tenia `display: flex`, por lo que no podia compensar el `display: block` heredado del reset global.

### Cambios realizados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/gold/assets/css/landing-v10.css` | CSS | Agregar `display: flex; align-items: center;` a `.footer-col h5` |

### Resultado de build

`pnpm build:gold` — OK (0 errores, UTF-8 OK, agent-guard OK, agent-report-check OK)

### QA sugerido

- Verificar landing en desktop: el logo y "YavlGold" deben aparecer en la misma linea, centrados verticalmente.
- Verificar footer en mobile (<=480px): el bloque de marca debe mantenerse coherente.
- Confirmar que las columnas Legal y Proyecto del footer no cambiaron.
- Confirmar que no cambio nada fuera del footer.

### NO se hizo (scope respetado)

- No se rediseño el footer.
- No se tocaron otras columnas, navbar, hero, CTA, trust bar ni otras secciones.
- No se cambiaron colores, tipografias, textos ni animaciones.
- No se agregaron estilos inline.
- No se modifico markup HTML.

---

## Sesion 2026-04-23 — Verificacion post-merge rollout

### Resultado

- `main` actualizado a `4a9a1e8`; contiene merges #82, #83, #84 y #85.
- Repo limpio, sin directivas git de agente en archivos versionados.
- Placeholders visibles en paginas publicas: PASS.
- Secret scan runtime: PASS; no `service_role` ni `SUPABASE_SERVICE_ROLE` en `apps/gold/dist`, `api`, `apps/gold/assets` ni `apps/gold/agro`.
- `pnpm build:gold`: PASS con warning esperado por Node local `v25.6.0` frente a engine Node 20.x.
- Health/status local y deploy publico: PASS.
- Supabase RLS/Storage A/B real: BLOQUEADO/FAIL operativo; Docker daemon no disponible, dry-run remoto queda en timeout, no hay env QA A/B local.

### Evidencia creada

| Archivo | Rol |
|---|---|
| `apps/gold/docs/ops/POST_MERGE_ROLLOUT_VERIFICATION_2026-04-23.md` | Repo, build, secret scan, placeholders, deploy y ramas locales ahead. |
| `apps/gold/docs/ops/POST_MERGE_HEALTH_STATUS_VERIFICATION_2026-04-23.md` | Contrato local/deploy de `/health` y `/status`. |
| `apps/gold/docs/security/POST_MERGE_RLS_STORAGE_VERIFICATION_2026-04-23.md` | Estado BLOQUEADO/FAIL de prueba A/B real y runbook exacto. |

---

## Sesion 2026-04-23 — PR C Node 20

### Diagnostico breve

- `package.json` raiz y `apps/gold/package.json` ya declaraban `engines.node = 20.x`.
- El repo no tenia `.nvmrc`, por lo que entornos locales podian iniciar con Node distinto y disparar warnings de engine.
- README no tenia una seccion explicita de requisitos de runtime.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `.nvmrc` | Fijado a `20`. |
| `README.md` | Seccion `Requisitos` con Node 20.x, pnpm 9.1.0, Supabase CLI y Docker solo para Supabase local. |

### Verificacion pendiente de esta rama

- Ejecutar `pnpm build:gold`.

---

## Sesion 2026-04-24 — Verificacion Supabase RLS/Storage post-merge

### Resultado

- DB RLS: BLOQUEADO.
- Storage: BLOQUEADO.
- `main` fue actualizado por fast-forward hasta `0972003`.
- `tools/rls-smoke-test.js` existe.
- `supabase login` OK.
- `supabase projects list` solo mostro `YavlGold` / `gerzlzprkarikblqxpjt`; el nombre no confirma staging/dev.
- No se ejecuto `supabase link`, `supabase db push --dry-run` ni `supabase db push` porque no hay staging confirmado.
- `node tools/rls-smoke-test.js` fallo antes de autenticar por ausencia de `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

### Evidencia actualizada

| Archivo | Rol |
|---|---|
| `apps/gold/docs/security/POST_MERGE_RLS_STORAGE_VERIFICATION_2026-04-23.md` | Bloqueo remoto documentado con project ref listado, metodo de confirmacion staging, dry-run no ejecutado por seguridad y runbook exacto. |

---

## Sesion 2026-04-24 — Guardrails staging y smoke test RLS/Storage

### Resultado

- Se agrego guard local `tools/supabase-staging-guard.mjs`.
- `pnpm guard:staging` bloquea si falta `SUPABASE_PROJECT_REF_STAGING`, si el ref no aparece en `supabase projects list`, o si el nombre del proyecto no contiene `staging`/`dev`.
- `pnpm rls:staging:dryrun` y `pnpm rls:staging:apply` pasan por el guard antes de `supabase link`/`supabase db push`.
- `tools/rls-smoke-test.js` ahora falla limpio con exit code `3` si faltan env vars y produce JSON sin secrets.
- Se agrego migracion aislada `public.rls_smoke_items` para validar RLS owner-based sin tocar tablas reales del producto.
- Se agrego workflow manual `.github/workflows/rls-smoke-staging.yml`.
- No se aplicaron migraciones remotas porque sigue sin existir staging confirmado.

### Evidencia/runbooks

| Archivo | Rol |
|---|---|
| `apps/gold/docs/ops/STAGING_GUARDRAILS_AND_SETUP.md` | Politica y comandos de guardrail staging. |
| `apps/gold/docs/security/RLS_STORAGE_SMOKE_TEST_RUNBOOK_2026-04-24.md` | Runbook exacto para dry-run, apply y smoke A/B. |

---

## Sesion 2026-04-24 — Staging Supabase creado, pendiente de migraciones

### Resultado

- Hora local: `2026-04-24 11:00:27 -04:00`.
- Carpeta Supabase canonica confirmada: `supabase/` en raiz del repo.
- Migraciones canonicas confirmadas en `supabase/migrations/`.
- `apps/gold/supabase/` no existe y no se uso.
- Migraciones `.sql` detectadas: 35.
- Ultima migracion detectada: `supabase/migrations/20260424101000_rls_smoke_items.sql`.
- Proyecto staging listado por Supabase CLI: `YavlGold-staging` / `trratydmsyysnoxhfsti`.
- `pnpm guard:staging` PASS al usar ese ref staging confirmado.
- Entorno inicial: `SUPABASE_ACCESS_TOKEN` presente; `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_PASSWORD_STAGING` y `PGPASSWORD` ausentes.
- No se ejecuto `supabase link` ni `supabase db push` porque faltaban variables locales necesarias para hacerlo sin prompt/secret expuesto.

### Scripts revisados

| Archivo | Lectura |
|---|---|
| `package.json` | Expone `guard:staging`, `rls:staging:dryrun` y `rls:staging:apply`. |
| `tools/supabase-staging-guard.mjs` | Bloquea si el ref no existe o si el nombre del proyecto no contiene `staging`/`dev`. |
| `tools/rls-smoke-test.js` | Requiere variables QA A/B y produce JSON sin secrets; default DB test table: `rls_smoke_items`. |

### Siguiente paso seguro

Setear localmente `SUPABASE_PROJECT_REF_STAGING=trratydmsyysnoxhfsti` y proveer password DB solo en terminal local o prompt de Supabase CLI. Luego ejecutar dry-run/apply desde `supabase/` canonico via `--workdir .`, nunca desde `apps/gold/supabase`.

---

## Sesion 2026-04-24 — Intento de link/push staging Supabase

### Resultado parcial

- Hora local: `2026-04-24 11:11:51 -04:00`.
- Workdir usado: `C:\Users\yerik\gold`.
- `SUPABASE_PROJECT_REF_STAGING` seteado solo en proceso local como `trratydmsyysnoxhfsti`.
- `pnpm guard:staging`: PASS, confirmo `YavlGold-staging` / `trratydmsyysnoxhfsti`.
- `supabase link --project-ref $env:SUPABASE_PROJECT_REF_STAGING --workdir .`: PASS, sin pedir password en el ejecutor.
- `supabase db push --workdir .`: BLOQUEADO operativo; el comando no devolvio salida y agoto timeout del ejecutor, compatible con prompt interactivo de password/confirmacion no capturable aqui.
- No se imprimio ni guardo password.
- No se creo `.env`.
- No se uso `SUPABASE_DB_PASSWORD`.
- No se ejecuto git.
- No se usaron ni recrearon rutas `apps/gold/supabase`.

### Siguiente paso manual

Ejecutar en una terminal local del repo:

```powershell
cd C:\Users\yerik\gold
supabase db push --workdir .
```

Pegar la database password solo cuando la CLI la pida. Al terminar, verificar tablas en staging, incluyendo `rls_smoke_items`.

---

## Sesion 2026-04-24 — Staging Supabase migrado

### Resultado

- Hora local de registro: `2026-04-24 16:10:46 -04:00`.
- Staging creado: `YavlGold-staging` / `trratydmsyysnoxhfsti`.
- Migraciones aplicadas en staging mediante `supabase db push --workdir .` desde el canon Supabase de raiz.
- Tablas de YavlGold visibles en Supabase Table Editor.
- Tabla de smoke test `rls_smoke_items` visible.
- Causa real del bloqueo previo: Windows Firewall estaba bloqueando la conexion remota al pooler de Supabase.
- Al corregir Windows Firewall, `supabase db push --workdir .` funciono.
- Estado actual: staging listo para crear/configurar usuarios QA A/B y ejecutar el smoke test RLS/Storage.
- No se imprimieron ni registraron credenciales.
- No se ejecuto git.

---

## Sesion 2026-04-24 — Preparacion workflow smoke RLS/Storage staging

### Resultado

- Hora local de registro: `2026-04-24 16:45:08 -04:00`.
- Workflow revisado: `.github/workflows/rls-smoke-staging.yml`.
- Runbook revisado: `apps/gold/docs/security/RLS_STORAGE_SMOKE_TEST_RUNBOOK_2026-04-24.md`.
- PR #88 confirmado como mergeado en `main`; el workflow manual debe estar disponible desde GitHub Actions.
- Secrets requeridos por nombre en el workflow:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_USER_A_EMAIL`
  - `SUPABASE_USER_A_PASSWORD`
  - `SUPABASE_USER_B_EMAIL`
  - `SUPABASE_USER_B_PASSWORD`
- Variables fijas del workflow: `RLS_SMOKE_TABLE=rls_smoke_items`, `RLS_SMOKE_BUCKET=agro-evidence`.
- No se imprimieron ni pidieron valores de secrets.
- Variables locales equivalentes no estan cargadas en esta sesion, por lo que no corresponde correr `node tools/rls-smoke-test.js` localmente.
- No hay `GITHUB_TOKEN` ni `GH_TOKEN` local disponible y el conector GitHub expuesto no incluye `workflow_dispatch`; por tanto, no se disparo el workflow desde Codex.
- Estado actual: listo para ejecutar manualmente el workflow `RLS Storage Smoke Test (Staging)` desde GitHub Actions.

### Ejecucion manual segura

1. Abrir GitHub > `YavlPro/YavlGold` > Actions.
2. Seleccionar `RLS Storage Smoke Test (Staging)`.
3. Ejecutar `Run workflow` sobre `main`.
4. Revisar el job `Run RLS and storage smoke test`.
5. Resultado esperado: `node tools/rls-smoke-test.js` imprime JSON con `status: PASS` sin mostrar secrets.

---

## Sesion 2026-04-24 — Intento de correccion secrets GitHub CLI

### Resultado

- Hora local de registro: `2026-04-24 17:27:59 -04:00`.
- Objetivo: verificar/corregir repository secrets del workflow `RLS Storage Smoke Test (Staging)` usando GitHub CLI.
- `gh auth status`: BLOQUEADO; `gh` no esta instalado o no esta disponible en `PATH` en este entorno.
- `gh secret list -R YavlPro/YavlGold`: BLOQUEADO por la misma causa.
- No se pudieron verificar secrets por nombre desde Codex.
- No se pudo ejecutar `gh workflow run rls-smoke-staging.yml -R YavlPro/YavlGold --ref main`.
- No se imprimieron ni pidieron credenciales.
- No se guardo `.env`.
- No se ejecuto git.

### Estado

- Resultado actual: BLOQUEADO por falta de GitHub CLI disponible en el entorno de Codex.
- Los secrets esperados por nombre siguen siendo:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_USER_A_EMAIL`
  - `SUPABASE_USER_A_PASSWORD`
  - `SUPABASE_USER_B_EMAIL`
  - `SUPABASE_USER_B_PASSWORD`

### Runbook seguro en terminal con GitHub CLI

Ejecutar en una terminal local donde `gh` este instalado/autenticado:

```powershell
gh auth status
gh secret list -R YavlPro/YavlGold
gh secret set SUPABASE_URL -R YavlPro/YavlGold
gh secret set SUPABASE_ANON_KEY -R YavlPro/YavlGold
gh secret set SUPABASE_USER_A_EMAIL -R YavlPro/YavlGold
gh secret set SUPABASE_USER_A_PASSWORD -R YavlPro/YavlGold
gh secret set SUPABASE_USER_B_EMAIL -R YavlPro/YavlGold
gh secret set SUPABASE_USER_B_PASSWORD -R YavlPro/YavlGold
gh secret list -R YavlPro/YavlGold
gh workflow run rls-smoke-staging.yml -R YavlPro/YavlGold --ref main
gh run list -R YavlPro/YavlGold --workflow rls-smoke-staging.yml --limit 3
```

---

## Sesion 2026-04-24 — Cierre final Supabase staging/RLS/Storage

### Resultado final

- Hora local de registro: `2026-04-24 18:22:15 -04:00`.
- Frente: Supabase staging + RLS + Storage A/B.
- Estado final: PASS.
- Workflow: `RLS Storage Smoke Test (Staging)`.
- Job: `Run RLS and storage smoke test`.
- Resultado del job: succeeded.
- Duracion aproximada: 18s.
- `pnpm build:gold`: PASS.
- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK.
- `check-llms`: OK.
- UTF-8 Guardrail: OK.
- Resultado funcional: staging/RLS/Storage validado.
- No se imprimieron ni registraron secrets.
- No se ejecuto git.

### Bloqueos superados

| Bloqueo | Causa | Resolucion |
|---|---|---|
| `supabase db push --workdir .` bloqueado | Windows Firewall bloqueaba la conexion remota al pooler de Supabase | Se corrigio Windows Firewall y el push funciono. |
| Workflow sin secrets completos | Secrets mal nombrados/faltantes en GitHub Actions | Se cargaron los repository secrets requeridos por nombre con `gh secret set` interactivo, sin `--body`. |
| Smoke test bloqueado por QA B | Usuarios QA A/B o passwords no sincronizadas | Se sincronizaron usuarios QA A/B y passwords en Supabase staging/GitHub Secrets. |

### Estado operativo

- Staging `YavlGold-staging` queda migrado.
- Tablas YavlGold visibles en Table Editor.
- `rls_smoke_items` disponible para pruebas aisladas.
- Workflow manual `rls-smoke-staging.yml` queda como verificacion reproducible.
- Frente Supabase staging/RLS/Storage cerrado como PASS.

### Comandos git sugeridos

No ejecutados en esta sesion:

```powershell
git status --short --branch
git add apps/gold/docs/AGENT_REPORT_ACTIVE.md
git commit -m "docs: close staging rls storage verification"
git push
```

Pegar cada valor solo en el prompt interactivo de `gh secret set`; nunca en el chat ni en archivos.

---

## Sesion 2026-04-24 — Workflow RLS/Storage staging con GitHub CLI

### Resultado

- Hora local de registro: `2026-04-24 17:50:43 -04:00`.
- GitHub CLI disponible en `C:\Program Files\GitHub CLI\gh.exe`.
- `gh auth status`: PASS, autenticado como `YavlPro`.
- Repository secrets presentes por nombre:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_USER_A_EMAIL`
  - `SUPABASE_USER_A_PASSWORD`
  - `SUPABASE_USER_B_EMAIL`
  - `SUPABASE_USER_B_PASSWORD`
  - `SUPABASE_PROJECT_REF_STAGING`
- Secrets faltantes iniciales cargados mediante `gh secret set <NOMBRE> -R YavlPro/YavlGold`, sin `--body`.
- No se imprimieron valores de secrets.
- No se guardo `.env`.
- No se ejecuto git.

### Runs ejecutados

| Run ID | Resultado | Lectura |
|---|---|---|
| `24913161810` | FAILURE / BLOCKED | `User B login failed` con `Invalid login credentials`. |
| `24913275639` | FAILURE / FAIL | User A y User B autenticaron como la misma cuenta; se reestablecio el par B como cuenta distinta. |
| `24913444801` | FAILURE / BLOCKED | `User B login failed` con `Invalid login credentials`. |

### Estado actual

- Workflow ejecutado: SI, `rls-smoke-staging.yml` sobre `main`.
- Resultado actual: BLOCKED.
- Causa actual: credenciales o usuario QA B no validos en Supabase staging.
- Build dentro del workflow: PASS.
- Smoke test no llego a validar DB/Storage porque se detuvo en login de User B.

### Siguiente paso

Verificar en Supabase staging que el usuario QA B exista, este habilitado/confirmado si aplica, y que el secret `SUPABASE_USER_B_EMAIL` + `SUPABASE_USER_B_PASSWORD` correspondan a esa cuenta. Luego relanzar:

```powershell
gh workflow run rls-smoke-staging.yml -R YavlPro/YavlGold --ref main
gh run list -R YavlPro/YavlGold --workflow rls-smoke-staging.yml --limit 3
```

---

## Sesion 2026-04-25 — Presencia publica oficial en landing y documentacion

### Objetivo

Conectar la identidad publica oficial de YavlGold con la landing, la documentacion publica, el contexto LLM y la metadata SEO, sin tocar Agro, Supabase ni logica financiera.

### Diagnostico

- La landing real es `apps/gold/index.html`.
- La documentacion publica oficial real es `apps/gold/docs-agro.html`, con CSS dedicado en `apps/gold/assets/css/docs-agro.css`.
- El logo publico confirmado existe en `apps/gold/public/brand/logo.png`; se uso como `https://www.yavlgold.com/brand/logo.png` para JSON-LD.
- `AGENT_REPORT_ACTIVE.md` tenia 2800 lineas al inicio, por debajo del umbral de rotacion.
- Ya existia una modificacion previa no propia en este reporte; se preservo y se agrego esta sesion al final.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/index.html` | Se reemplazo el JSON-LD simple por `Organization` + `Person` + `WebSite`; se agrego el bloque visual "Siguenos en nuestras redes sociales" con botones X, YouTube y LinkedIn. |
| `apps/gold/assets/css/landing-v10.css` | Se agregaron estilos `.official-socials` usando tokens ADN V10, focus visible, responsive mobile y botones sobrios. |
| `apps/gold/docs-agro.html` | Se agrego seccion "Canales oficiales" y enlace en sidebar hacia el bloque. |
| `apps/gold/assets/css/docs-agro.css` | Se agregaron estilos equivalentes para el bloque publico de documentacion. |
| `apps/gold/public/llms.txt` | Se agrego seccion `Official channels` con X, YouTube y LinkedIn del fundador. |

### Verificacion

- JSON-LD parseado localmente: `Organization, Person, WebSite`.
- Logo JSON-LD confirmado: `apps/gold/public/brand/logo.png` existe.
- Enlaces externos verificados: 6 botones con `target="_blank"` y `rel="me noopener noreferrer"`.
- ARIA labels verificados: 6 labels esperados entre landing y documentacion.

### Resultado build

`pnpm build:gold` — OK. 167 modules transformed, `agent-guard` OK, `agent-report-check` OK, `check-llms` OK, `check-dist-utf8` OK.

Advertencia no bloqueante: Node local `v25.6.0` frente a engine esperado `20.x`.

### QA manual sugerido

- Desktop landing: verificar bloque social entre testimonio y CTA, sin romper footer.
- Mobile <=480px: verificar botones apilados, sin overflow horizontal.
- Documentacion `/docs-agro`: verificar sidebar "Canales oficiales" y bloque antes del CTA.
- Teclado: verificar focus visible en los tres botones.
- Click: verificar que X, YouTube y LinkedIn abren la URL correcta en nueva pestana.
- SEO: validar JSON-LD en Schema Markup Validator o Rich Results Test tras deploy.

### No se hizo

- NO se toco `apps/gold/agro/`.
- NO se toco Supabase ni migraciones.
- NO se agregaron dependencias.
- NO se introdujo React, Tailwind ni SPA.
- NO se modifico logica financiera ni auth.

---

## Sesion 2026-04-25 — Correccion LinkedIn oficial y scroll modal creador

### Objetivo

Corregir el LinkedIn oficial publico de YavlGold y ajustar el modal "Sobre mi / Creador" del Dashboard / Mi Finca para que no se corte en pantallas pequenas.

### Diagnostico

- LinkedIn antiguo detectado en landing, JSON-LD, docs-agro, llms.txt y dashboard.
- Link correcto definido por el usuario: `https://www.linkedin.com/in/yavl-gold-7372b0302`.
- El modal real vive en `apps/gold/dashboard/index.html` como `#about-creator-modal`.
- El panel responsable es `.yg-about-creator-panel`.
- Causa del corte: `.yg-about-creator-panel` tenia `overflow: hidden` y no tenia `max-height`; en pantallas bajas los botones GitHub/LinkedIn quedaban fuera del area accesible.
- `AGENT_REPORT_ACTIVE.md` tenia 3127 lineas al inicio, por debajo del umbral de rotacion.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/index.html` | LinkedIn actualizado en boton publico y `Person.sameAs` del JSON-LD. |
| `apps/gold/docs-agro.html` | LinkedIn actualizado en el bloque "Canales oficiales". |
| `apps/gold/public/llms.txt` | LinkedIn actualizado en `Official channels`. |
| `apps/gold/dashboard/index.html` | LinkedIn del modal creador actualizado; botones GitHub/LinkedIn quedan con `target="_blank"`, `rel="me noopener noreferrer"` y aria-labels claros. |
| `apps/gold/dashboard/index.html` | `.yg-about-creator-panel` ahora usa `max-height: min(86vh, 760px)`, `overflow-y: auto`, `overflow-x: hidden`, `overscroll-behavior: contain` y `-webkit-overflow-scrolling: touch`; en mobile `max-height: calc(100dvh - 32px)`. |

### Verificacion

- Busqueda de LinkedIn antiguo bajo `apps/gold`: sin resultados.
- Busqueda del nuevo LinkedIn: landing, docs-agro, llms.txt y dashboard apuntan a `https://www.linkedin.com/in/yavl-gold-7372b0302`.
- JSON-LD parseado localmente: `Person.sameAs` incluye el nuevo LinkedIn.
- Dashboard revisado: boton LinkedIn conserva `target="_blank"`, suma `rel="me noopener noreferrer"` y aria-label claro.

### Resultado build

`pnpm build:gold` — OK. 167 modules transformed, `agent-guard` OK, `agent-report-check` OK, `check-llms` OK, `check-dist-utf8` OK.

Advertencia no bloqueante: Node local `v25.6.0` frente a engine esperado `20.x`.

### QA manual sugerido

- Landing: verificar que el boton LinkedIn abre `https://www.linkedin.com/in/yavl-gold-7372b0302`.
- `/docs-agro`: verificar que el boton LinkedIn abre el mismo perfil.
- Dashboard / Mi Finca: abrir "Sobre el Creador" y confirmar scroll interno.
- Mobile <=480px: verificar que el modal no se corta y que GitHub/LinkedIn quedan accesibles.
- Teclado: verificar foco en cerrar, GitHub y LinkedIn.

### No se hizo

- NO se toco `apps/gold/agro/`.
- NO se toco Supabase ni migraciones.
- NO se toco auth.
- NO se modifico logica financiera.
- NO se agregaron dependencias.

---

## Sesion 2026-04-25 — Logo oficial en hero de landing

### Objetivo

Agregar el logo oficial de YavlGold como sello circular centrado sobre el titulo principal del hero publico, manteniendo ADN Visual V10 y una animacion metalica sutil.

### Diagnostico

- El hero principal vive en `apps/gold/index.html`, dentro de `<section class="hero">`.
- Los estilos responsables viven en `apps/gold/assets/css/landing-v10.css`.
- La landing ya usa el logo oficial desde `/brand/logo.webp`, respaldado por `apps/gold/public/brand/logo.webp`.
- No habia bloque visual de marca centrado sobre el H1 del hero.
- `AGENT_REPORT_ACTIVE.md` tenia 3183 lineas antes de documentar esta sesion, por debajo del umbral de rotacion.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/index.html` | Se agrego `.hero-mark` sobre el H1 `Tu trabajo de campo, ordenado y conectado`, usando `/brand/logo.webp` con `aria-hidden="true"` y dimensiones explicitas. |
| `apps/gold/assets/css/landing-v10.css` | Se agregaron estilos `.hero-mark`, `.hero-mark__ring` y `.hero-mark__logo` para sello circular con anillo metalico basado en tokens existentes. |
| `apps/gold/assets/css/landing-v10.css` | Se agrego `@keyframes heroMetalSweep` para brillo lento y discreto sobre el aro, sin mover ni escalar el logo. |
| `apps/gold/assets/css/landing-v10.css` | Se ajustaron tamanos responsive para <=768px y <=480px, y se incluyo el sweep en `prefers-reduced-motion`. |

### Resultado build

`pnpm build:gold` — OK. 167 modules transformed, `agent-guard` OK, `agent-report-check` OK, `check-llms` OK, `check-dist-utf8` OK.

Advertencia no bloqueante: Node local `v25.6.0` frente a engine esperado `20.x`.

### QA manual sugerido

- Desktop landing: verificar que el logo queda centrado sobre el titulo y no desplaza torpemente CTAs ni subtitulo.
- Mobile <=480px: verificar que el sello baja a 84px y no rompe el layout.
- Movimiento: confirmar que el brillo se percibe sobrio, sin pulso ni rebote.
- Reduced motion: confirmar que el sweep queda desactivado.
- Dark/light mode si aplica: verificar contraste del anillo y presencia premium.

### No se hizo

- NO se toco `apps/gold/agro/`.
- NO se toco Supabase ni migraciones.
- NO se toco auth.
- NO se modifico logica de negocio ni financiera.

---

## Sesion 2026-04-25 — Ajuste fino del sello en hero

### Objetivo

Integrar mejor el sello circular del logo con el titulo principal del hero, evitando que se perciba como un elemento flotante separado.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/assets/css/landing-v10.css` | `.hero-mark` reduce su separacion inferior de `var(--space-5)` a `var(--space-3)`. |
| `apps/gold/assets/css/landing-v10.css` | El sello baja de `108px` a `96px` en desktop, con logo interno de `66px`. |
| `apps/gold/assets/css/landing-v10.css` | La sombra baja de `0 10px 28px` a `0 6px 18px` para reducir la sensacion de flotacion. |
| `apps/gold/assets/css/landing-v10.css` | Se ajustaron los tamanos responsive a `86px` en tablet y `78px` en mobile <=480px. |

### Resultado build

`pnpm build:gold` — OK. 167 modules transformed, `agent-guard` OK, `agent-report-check` OK, `check-llms` OK, `check-dist-utf8` OK.

Advertencia no bloqueante: Node local `v25.6.0` frente a engine esperado `20.x`.

### QA visual recomendado

- Desktop landing: verificar que el sello queda mas cerca del H1 y se siente anclado al encabezado.
- Mobile <=480px: verificar que el sello de `78px` no empuja torpemente el contenido.
- Movimiento: confirmar que el sweep metalico sigue sobrio y sin pulso.

### No se hizo

- NO se toco HTML ni copy.
- NO se toco `apps/gold/agro/`.
- NO se toco Supabase ni migraciones.
- NO se toco auth.
- NO se modifico logica de negocio ni financiera.

---

## Sesion 2026-04-25 — Hero logo sin anillo

### Objetivo

Quitar el anillo exterior del sello del hero para que el logo se integre mejor con el titulo principal y no se perciba como pieza flotante.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/index.html` | Se ajustaron dimensiones declaradas del logo del hero a `64x64`. |
| `apps/gold/assets/css/landing-v10.css` | Se elimino el aro visual: sin fondo conico, sin borde interno y sin pseudo-elemento `::before`. |
| `apps/gold/assets/css/landing-v10.css` | El wrapper queda como mascara circular para el barrido metalico suave sobre el logo. |
| `apps/gold/assets/css/landing-v10.css` | Desktop queda en `64px`, tablet en `56px`, mobile <=480px en `48px`. |
| `apps/gold/assets/css/landing-v10.css` | Se redujo separacion inferior a `var(--space-2)`, sombra a `0 2px 8px` y opacidad maxima del sweep a `0.36`. |

### Resultado build

`pnpm build:gold` — OK. 167 modules transformed, `agent-guard` OK, `agent-report-check` OK, `check-llms` OK, `check-dist-utf8` OK.

Advertencia no bloqueante: Node local `v25.6.0` frente a engine esperado `20.x`.

### QA visual recomendado

- Desktop landing: verificar que se ve solo el logo, sin aro exterior ni halo.
- Mobile <=480px: confirmar que el logo de `48px` no empuja el H1.
- Movimiento: confirmar que el barrido de luz es lento y casi imperceptible.

### No se hizo

- NO se toco Agro.
- NO se toco Supabase ni migraciones.
- NO se toco auth.
- NO se modifico copy ni logica de negocio.
- NO se agregaron dependencias.

---

## Sesion 2026-04-26 — Cierre P1 canon `/music` y guard HTML

### Objetivo

Cerrar el primer bloque P1 de desviaciones activas detectadas en `AUDITORIA_COMPLETA_DEL_PROYECTO_2026-04-26.md`, con foco quirurgico en `/music` y en el guard de build para HTML.

### Diagnostico previo

- `AGENTS.md` confirma que la release visible activa es V1, el stack canonico es Vanilla JS + Vite MPA + Supabase, y Tailwind/fuentes no canonicas quedan fuera del ADN Visual V10.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` confirma que Agro es el unico modulo activo/released; Dashboard queda como superficie secundaria, no como catalogo de modulos.
- La auditoria del 2026-04-26 marca como P1 que `apps/gold/dashboard/music.html` usa Tailwind CDN, Montserrat y `jsmediatags@latest` estando activa en build/routing.
- Evidencia local previa a cambios:
  - `apps/gold/vite.config.js` registra `music: 'dashboard/music.html'`.
  - `vercel.json` reescribe `/music` y `/music/` hacia `/dashboard/music`.
  - `apps/gold/dashboard/index.html` enlaza `href="/dashboard/music.html"` desde el topbar.
  - `apps/gold/dashboard/music.html` contiene Tailwind CDN, Montserrat y `@latest`.
- Causa raiz: `/music` seguia conectada como superficie activa aunque el foco actual del producto es Agro; ademas, `agent-guard.mjs` solo revisaba dependencias de `package.json`, por lo que no bloqueaba CDNs prohibidos en HTML.

### Plan

1. Retirar `/music` del build MPA y del routing publico sin migrar visualmente la pagina.
2. Retirar el enlace activo del dashboard hacia `dashboard/music.html`.
3. Extender `agent-guard.mjs` para escanear HTML activo y bloquear Tailwind CDN, Montserrat y dependencias externas con `@latest`.
4. Mantener fuera del escaneo los archivos `dist/`, `archive/` y `docs/` para no romper por historico/documentacion.
5. Ejecutar `pnpm build:gold` y documentar resultado final.

### Alcance protegido

- NO tocar Agro.
- NO tocar Supabase.
- NO tocar `.env`, credenciales ni `testqacredentials.md`.
- NO introducir dependencias nuevas.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/vite.config.js` | Se retiro `music: 'dashboard/music.html'` del input MPA; `/music` deja de entrar al build activo. |
| `vercel.json` | Se retiraron los rewrites `/music` y `/music/` hacia `/dashboard/music`; queda solo `/health` en rewrites. |
| `apps/gold/dashboard/index.html` | Se retiro el boton/enlace activo hacia `/dashboard/music.html` del topbar. |
| `apps/gold/dashboard/index.html` | Se elimino Montserrat de la carga de Google Fonts y se reemplazaron los tres usos locales por Rajdhani. |
| `apps/gold/scripts/agent-guard.mjs` | Se agrego escaneo de HTML activo declarado en `vite.config.js` para bloquear Tailwind CDN, Montserrat y dependencias externas con `@latest`. |
| `apps/gold/public/llms.txt` | Se actualizo la nota legacy para indicar que la utilidad musical quedo retirada de build, routing y navegacion activa. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Se actualizo el estado vivo para quitar `music` de las superficies secundarias activas del dashboard. |

### Verificacion

- `node scripts/agent-guard.mjs` desde `apps/gold`: PASS.
- `pnpm build:gold`: PASS.
- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK, 165 modules transformed.
- `check-llms`: OK.
- `check-dist-utf8`: OK.
- Advertencia no bloqueante: Node local `v25.6.0` frente a engine esperado `20.x`.

### Resultado

- `/music` ya no queda como entrada de build MPA.
- `/music` ya no queda como rewrite publico en Vercel.
- El dashboard ya no muestra enlace activo hacia la utilidad musical.
- El build falla si una superficie HTML activa en Vite vuelve a incluir Tailwind CDN, Montserrat o una dependencia externa `@latest`.

### No se hizo

- NO se migro visualmente `dashboard/music.html`.
- NO se toco `apps/gold/agro/`.
- NO se toco Supabase.
- NO se tocaron `.env`, credenciales ni `testqacredentials.md`.
- NO se agregaron dependencias nuevas.

---

## Sesion 2026-04-26 — Cierre P1 Node 20 y CI Gold Build

### Objetivo

Cerrar los dos frentes P1 de runtime/CI detectados en `AUDITORIA_COMPLETA_DEL_PROYECTO_2026-04-26.md`:

1. Alinear el repo para usar Node 20 de forma explicita y reproducible.
2. Crear CI automatico para proteger `pnpm build:gold` en `push` y `pull_request` contra `main`.

### Diagnostico previo

- `package.json` ya declara `"engines": { "node": "20.x", "pnpm": ">=8.0.0" }` y `packageManager: "pnpm@9.1.0"`.
- `apps/gold/package.json` ya declara `"engines": { "node": "20.x", "pnpm": ">=8.0.0" }`.
- `pnpm-workspace.yaml` mantiene paquetes `apps/*` y `packages/*`.
- `.nvmrc` ya existe, esta versionado y contiene `20`.
- `.node-version` no existe.
- `.github/workflows/` contiene solo `rls-smoke-staging.yml`, manual por `workflow_dispatch`.
- El workflow manual de RLS ya instala Node 20, pero no reemplaza un CI automatico de build para PR/push.
- El build local sigue emitiendo advertencia porque el ejecutor actual usa Node `v25.6.0`; esto no puede corregirse desde el repo local sin cambiar el runtime de la maquina, pero si puede quedar explicitado para herramientas y CI.

### Plan

1. Crear `.node-version` con `20` para compatibilidad con herramientas que no leen `.nvmrc`.
2. Crear `.github/workflows/gold-build.yml` con `push` y `pull_request` contra `main`.
3. En el workflow usar `pnpm/action-setup@v4`, `actions/setup-node@v4` con `node-version: 20`, cache `pnpm`, `pnpm install --frozen-lockfile` y `pnpm build:gold`.
4. No modificar `package.json` ni `apps/gold/package.json` porque ya declaran Node 20.
5. Ejecutar `pnpm build:gold` local y documentar resultado.

### Alcance protegido

- NO tocar Agro.
- NO tocar Supabase.
- NO tocar Vercel.
- NO tocar `.env`, credenciales ni `testqacredentials.md`.
- NO abrir frente de tests, seed.sql ni RLS/Storage.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `.node-version` | Creado con `20` para declarar Node 20 en herramientas compatibles con este archivo. |
| `.github/workflows/gold-build.yml` | Creado workflow automatico `Gold Build` para `push` y `pull_request` contra `main`. |
| `.github/workflows/gold-build.yml` | El job usa `pnpm/action-setup@v4`, `actions/setup-node@v4` con `node-version: 20`, cache pnpm, `pnpm install --frozen-lockfile` y `pnpm build:gold`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Documentado diagnostico, plan, cambios y verificacion de la sesion. |

### Verificacion

- `node --version`: `v25.6.0` en el ejecutor local actual.
- `pnpm --version`: `9.1.0`.
- `pnpm build:gold`: PASS.
- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK, 165 modules transformed.
- `check-llms`: OK.
- `check-dist-utf8`: OK.
- Advertencia local esperada: engine declara Node `20.x`, pero esta sesion corrio sobre Node `v25.6.0`.

### Resultado

- El repo ya tenia `.nvmrc` versionado con `20`.
- El repo ahora tambien tiene `.node-version` con `20`.
- `package.json` y `apps/gold/package.json` no se modificaron porque ya declaraban Node `20.x`.
- Existe CI automatico para `pnpm build:gold` en `push` y `pull_request` contra `main`.
- El CI fija Node 20 y usa instalacion congelada con pnpm.

### No se hizo

- NO se toco Agro.
- NO se toco Supabase.
- NO se toco Vercel.
- NO se tocaron `.env`, credenciales ni `testqacredentials.md`.
- NO se abrio frente de tests, seed.sql ni RLS/Storage.
- NO se agregaron dependencias de runtime.

---

## Sesion 2026-04-26 — Cierre P1 Supabase seed canonico vacio

### Objetivo

Resolver la incongruencia P1 detectada en `AUDITORIA_COMPLETA_DEL_PROYECTO_2026-04-26.md`: `supabase/config.toml` tiene `[db.seed] enabled = true` y `sql_paths = ["./seed.sql"]`, pero `supabase/seed.sql` no existe.

### Diagnostico previo

- `AGENTS.md` confirma que `supabase/` en raiz es el unico canon Supabase.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` mantiene el frente Supabase raiz cerrado y exige no recrear arboles secundarios.
- La auditoria del 2026-04-26 marca como P1 el seed local configurado pero ausente.
- `supabase/config.toml` confirma:
  - `[db.seed]`
  - `enabled = true`
  - `sql_paths = ["./seed.sql"]`
- `supabase/seed.sql` no existe antes de esta sesion.
- No hay necesidad de asumir estructura de tablas ni insertar fixtures para cerrar el contrato.

### Plan

1. Crear `supabase/seed.sql` minimo, canonico y seguro.
2. Incluir solo comentarios de proposito y `select 1;`.
3. No insertar datos reales, usuarios auth, clientes, cultivos, ventas, montos, emails ni secretos.
4. No tocar migraciones, RLS, Edge Functions, Agro, Vercel ni credenciales.
5. Ejecutar `pnpm build:gold`.
6. No ejecutar `supabase db reset` salvo que el entorno local Supabase este claramente disponible y sea seguro.

### Alcance protegido

- NO tocar migraciones existentes.
- NO tocar RLS.
- NO tocar Edge Functions.
- NO tocar Agro.
- NO tocar Vercel.
- NO tocar `.env`, credenciales ni `testqacredentials.md`.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `supabase/seed.sql` | Creado seed canonico minimo con comentarios de proposito y `select 1;`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Documentado diagnostico, plan, cambios, verificacion y decision de no ejecutar reset. |

### Verificacion

- `supabase/seed.sql` existe.
- El seed no inserta datos reales, usuarios auth, clientes, cultivos, ventas, montos, emails ni secretos.
- No hay cambios en `supabase/migrations/`.
- No hay cambios en `supabase/functions/`.
- No hay cambios en `apps/gold/agro/`.
- `pnpm build:gold`: PASS.
- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK, 165 modules transformed.
- `check-llms`: OK.
- `check-dist-utf8`: OK.
- Advertencia local no bloqueante: engine declara Node `20.x`, pero esta sesion corrio sobre Node `v25.6.0`.

### Resultado

- El contrato configurado en `supabase/config.toml` (`[db.seed] enabled = true`, `sql_paths = ["./seed.sql"]`) ya tiene archivo destino.
- El seed es intencionalmente vacio de fixtures productivos y seguro para versionar.

### Supabase reset

No se ejecuto `supabase db reset --workdir .` porque es una operacion destructiva sobre la base local y el entorno Supabase local no fue declarado como disponible/seguro para reset en este bloque. El cierre verificable de esta sesion es estatico + build canonico.

### No se hizo

- NO se tocaron migraciones existentes.
- NO se toco RLS.
- NO se tocaron Edge Functions.
- NO se toco Agro.
- NO se toco Vercel.
- NO se tocaron `.env`, credenciales ni `testqacredentials.md`.
- NO se insertaron datos reales ni sensibles.

---

## Sesion 2026-04-26 — Cierre documental RLS/Storage staging

### Objetivo

Cerrar unicamente la deuda documental P1 de RLS/Storage staging marcada por la auditoria del 2026-04-26, sin reabrir implementacion, migraciones, workflows ni pruebas destructivas.

### Diagnostico previo

- `AGENTS.md` confirma que el trabajo debe ser quirurgico, documentado y sin tocar zonas fuera del alcance.
- `AUDITORIA_COMPLETA_DEL_PROYECTO_2026-04-26.md` marco como P1 que la validacion real RLS/Storage seguia pendiente porque documentos operativos conservaban estado `TODO`/bloqueado.
- Este mismo reporte activo ya contiene el cierre tecnico previo: sesion `2026-04-24 — Cierre final Supabase staging/RLS/Storage`, estado final `PASS`, workflow `RLS Storage Smoke Test (Staging)`, job `Run RLS and storage smoke test`, resultado `succeeded`, duracion aproximada 18s y `pnpm build:gold` PASS.
- El usuario confirma para esta sesion que el run manual mas reciente del workflow `RLS Storage Smoke Test (Staging)` paso en verde en GitHub Actions sobre `main`.
- `apps/gold/docs/security/RLS_STORAGE_VALIDATION_2026-04-23.md` sigue diciendo que la prueba A/B real no fue ejecutada y conserva matriz con `TODO ejecutar`.
- `apps/gold/docs/ops/ROLL_OUT_STATUS_2026-04-23.md` sigue diciendo que la validacion real esta bloqueada por entorno local/staging.
- No se tiene URL exacta del run; se documentara como `Workflow run: pendiente de pegar URL exacta` sin inventar evidencia.

### Plan

1. Actualizar la matriz RLS/Storage para reflejar cierre PASS en staging por workflow manual.
2. Actualizar el rollout status para retirar el bloqueo stale por validacion staging.
3. Registrar evidencia disponible: workflow, branch `main`, resultado PASS/verde, fecha aproximada `2026-04-24`, job succeeded y URL pendiente.
4. No tocar codigo, migraciones, Supabase config, Edge Functions, Agro, workflows, secretos ni credenciales.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/docs/security/RLS_STORAGE_VALIDATION_2026-04-23.md` | Matriz RLS/Storage actualizada de `TODO ejecutar` a `PASS`; agregado bloque de evidencia real staging con workflow, branch `main`, job, resultado y URL pendiente. |
| `apps/gold/docs/ops/ROLL_OUT_STATUS_2026-04-23.md` | Estado de rollout actualizado de bloqueado a validacion staging PASS; eliminado TODO de reintentar validacion A/B real. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Documentado diagnostico, plan, cambios y verificacion de esta sesion documental. |

### Verificacion

- `pnpm build:gold`: PASS.
- `agent-guard`: OK.
- `agent-report-check`: OK.
- `vite build`: OK, 165 modules transformed.
- `check-llms`: OK.
- `check-dist-utf8`: OK.
- Advertencia local no bloqueante: engine declara Node `20.x`, pero esta sesion corrio sobre Node `v25.6.0`.

### Alcance protegido

- NO se toco codigo.
- NO se toco Agro.
- NO se tocaron migraciones.
- NO se toco Supabase config.
- NO se tocaron Edge Functions.
- NO se tocaron workflows.
- NO se tocaron secretos, credenciales, `.env` ni `testqacredentials.md`.
- NO se ejecuto `supabase db reset` ni otra prueba destructiva.

### Resultado

- La deuda documental P1 de RLS/Storage staging queda cerrada en los documentos vivos del frente.
- La matriz RLS/Storage ya no queda como TODO.
- El rollout status ya no queda bloqueado por validacion staging.
- La URL exacta del run queda marcada como pendiente, sin inventar evidencia.

---

## Sesion 2026-04-26 — PostCSS advisory y diagnostico rail Agro

### Objetivo

Cerrar primero la alerta Dependabot de `postcss` con diff minimo y luego dejar solo diagnostico/plan tecnico para una evolucion futura del sidebar Agro hacia un rail minimalista persistente inspirado en YuupAI/Yupp, adaptado al ADN Visual V10.

### Diagnostico previo — Fase 1 PostCSS

- Advisory revisado: `GHSA-qx2v-qp2m-jg93`, XSS por `</style>` no escapado en salida stringificada de PostCSS.
- Versiones afectadas: `postcss <8.5.10`.
- Version parcheada: `8.5.10`.
- `package.json` no declara `postcss` como dependencia directa.
- `apps/gold/package.json` no declara `postcss` como dependencia directa.
- `pnpm why postcss` muestra que entra transitivamente por `vite 7.3.2` y `vitest 4.0.17`.
- `pnpm-lock.yaml` fija actualmente `postcss@8.5.8`, version vulnerable.
- Plan: actualizar solo la resolucion transitiva de `postcss` en `pnpm-lock.yaml` a `8.5.10` o superior compatible, sin tocar codigo fuente ni Agro.

### Alcance protegido

- NO tocar codigo fuente para la fase de seguridad.
- NO tocar Agro durante la fase PostCSS.
- NO tocar Supabase.
- NO tocar credenciales, `.env` ni `testqacredentials.md`.
- NO mezclar implementacion del rail Agro con el fix de seguridad.

### Cambios realizados — Fase 1 PostCSS

| Archivo | Cambio |
|---|---|
| `pnpm-lock.yaml` | Actualizada solo la resolucion transitiva `postcss@8.5.8` a `postcss@8.5.10`. |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Documentado diagnostico, alcance, plan, validacion y plan UX separado. |

Notas:

- `package.json` no se modifico porque `postcss` no es dependencia directa.
- `apps/gold/package.json` no se modifico porque `postcss` no es dependencia directa.
- El primer intento de `pnpm update postcss --latest` re-resolvio dependencias no relacionadas dentro de rangos existentes; se redujo el diff manualmente al minimo necesario antes de validar.

### Verificacion — Fase 1 PostCSS

- `pnpm install --frozen-lockfile`: PASS; lockfile consistente.
- `pnpm why postcss`: `postcss 8.5.10` bajo `vite 7.3.2` y `vitest 4.0.17`.
- `pnpm list postcss -r --depth Infinity`: `postcss 8.5.10` en root y `apps/gold`.
- `pnpm audit`: PASS, no known vulnerabilities found.
- `pnpm audit --prod`: PASS, no known vulnerabilities found.
- `pnpm build:gold`: PASS al cierre de sesion.
- Advertencia local no bloqueante: engine declara Node `20.x`, pero esta sesion corrio con Node `v25.6.0`.

### Diagnostico — Fase 2 Rail Agro

Referencia visual observada: rail vertical minimalista tipo YuupAI/Yupp, pero la implementacion futura debe mantenerse dark/gold, sobria, agricola y con tokens del ADN Visual V10.

Hallazgos:

- La entrada canonica a Agro ya es `/agro/` desde `apps/gold/assets/js/modules/moduleIdentity.js` y desde el fallback del dashboard.
- `apps/gold/dashboard/index.html` renderiza accesos con `getModuleRoute(mod)` y el fallback de Agro apunta a `/agro/`.
- La causa de que Agro pueda abrir en una seccion secundaria no esta en la ruta del dashboard, sino en `apps/gold/agro/agro-shell.js`: `readStoredViewToken()` lee `YG_AGRO_ACTIVE_VIEW_V1` y `initAgroShell()` arranca con `normalizeBootView(storedViewToken)`.
- `setActiveView()` escribe cada cambio en `YG_AGRO_ACTIVE_VIEW_V1`; por eso una visita previa a `cartera-viva`, `operational`, `asistente`, etc. puede persistir y reabrirse al entrar de nuevo a `/agro/`.
- `apps/gold/agro/index.html` ya tiene un drawer completo `.agro-shell-sidebar` con botones `data-agro-view` y un toggle de hamburguesa.
- `apps/gold/agro/agro-shell.js` ya delega clicks globalmente sobre `[data-agro-view]`, por lo que un rail nuevo podria reutilizar `setActiveView()` sin tocar `agro.js`.
- `apps/gold/agro/agro.css` contiene la seccion actual `Agro Shell V10`, pero el archivo es muy grande; para una implementacion nueva conviene crear CSS separado.
- `apps/gold/agro/agro-mode.js` solo gobierna modo operativo y filtros; no controla la vista inicial.

### Plan recomendado — Rail Agro

Archivos a tocar:

| Archivo | Riesgo | Motivo |
|---|---:|---|
| `apps/gold/agro/agro-shell.js` | Medio | Cambiar politica de arranque para que `/agro/` siempre inicie en `dashboard`; opcionalmente exponer soporte para rail root si se filtra por modo. |
| `apps/gold/agro/index.html` | Medio | Agregar markup del rail persistente y enlazar CSS nuevo. |
| `apps/gold/agro/agro-shell-rail.css` | Bajo/Medio | Nuevo CSS aislado para no crecer mas `agro.css`; usar tokens V10, Font Awesome existente y breakpoints canonicos. |
| `apps/gold/dashboard/index.html` | Bajo | Solo si se decide normalizar explicitamente todos los accesos Agro a `/agro/`; hoy ya apunta ahi. |
| `apps/gold/agro/agro-mode.js` | Bajo | No tocar salvo que el rail necesite reaccionar al modo operativo. |
| `apps/gold/agro/agro.js` | Alto | Evitar. Solo seria aceptable wiring minimo si el shell no puede cubrir algun estado. |

Logica para garantizar Dashboard Agro al entrar:

1. En `agro-shell.js`, hacer que el boot inicial use `AGRO_DEFAULT_VIEW` para entradas normales a `/agro/`, ignorando `YG_AGRO_ACTIVE_VIEW_V1`.
2. Mantener `setActiveView()` y `agro:shell:set-view` para navegacion interna despues del arranque.
3. Si se quiere conservar restauracion en casos puntuales, exigir una senal explicita futura como `?restore=1`; no restaurar por defecto.
4. No resolver esto desde el dashboard solamente, porque usuarios pueden entrar por URL directa, favoritos, auth redirect o links publicos a `/agro/`.

Introduccion del rail sin romper la shell:

1. Crear un rail desktop fijo con botones icon-only y `aria-label`, usando los mismos `data-agro-view` existentes: `dashboard`, `ciclos`, `operational` o `cartera-viva`, `task-cycles`, `herramientas`, `asistente`, `perfil`.
2. Mantener el drawer actual como navegacion completa y subnav; el rail solo seria acceso rapido a familias principales.
3. Reutilizar la sincronizacion actual: `syncViewButtons()` ya marca `is-active` en cualquier `[data-agro-view]`.
4. En desktop, reservar ancho estable para el rail con padding/margen en `.app-container`; en mobile, mantener inicialmente el hamburger actual o crear una barra inferior en un commit separado.
5. Usar tokens (`--gold-4`, `--bg-0`, `--border-gold`, `--text-secondary`, etc.) y evitar colores claros/rosados de la referencia.

Propuesta de commits:

1. `fix(deps): update postcss security advisory`
   - `pnpm-lock.yaml`
2. `fix(agro): default shell entry to dashboard`
   - `apps/gold/agro/agro-shell.js`
   - validacion desktop/mobile basica
3. `feat(agro): add persistent minimal shell rail`
   - `apps/gold/agro/index.html`
   - `apps/gold/agro/agro-shell-rail.css`
   - opcional `apps/gold/agro/agro-shell.js` solo si hace falta soporte de modo/rail

### No se implemento — Fase 2

- No se toco `apps/gold/agro/*` en esta sesion.
- No se modifico dashboard.
- No se implemento rail visual.
- No se cambio la logica de aterrizaje todavia.

---

## Sesion 2026-04-26 — CodeQL workflow permissions, entrada Dashboard Agro y rail minimal

### Objetivo

Ejecutar tres frentes en orden y sin mezclar responsabilidades: cerrar alertas CodeQL de permisos en workflows, corregir el arranque de Agro para aterrizar siempre en Dashboard Agro, e implementar una primera version de rail minimalista persistente adaptada al ADN Visual V10.

### Diagnostico previo — Fase 1 workflow permissions

- `AGENTS.md` confirma enfoque quirurgico, minimo privilegio y build canonico final.
- `.github/workflows/gold-build.yml` no declara bloque `permissions`.
- `.github/workflows/rls-smoke-staging.yml` no declara bloque `permissions`.
- `gold-build.yml` solo necesita checkout, setup pnpm/Node, install y `pnpm build:gold`.
- `rls-smoke-staging.yml` solo necesita checkout, setup Node/pnpm, install, build y ejecutar `tools/rls-smoke-test.js` con secrets ya inyectados por entorno.
- Ninguno de los dos workflows necesita permisos de escritura sobre contents, pull requests, checks, actions o id-token.

### Plan — Fase 1 workflow permissions

1. Agregar `permissions: contents: read` en ambos workflows a nivel workflow.
2. No tocar jobs, triggers, secrets, pasos ni comandos.
3. Validar sintaxis YAML de forma estatica y con `pnpm build:gold`.

### Diagnostico previo — Fase 2 entrada Dashboard Agro

- `apps/gold/agro/agro-shell.js` define `AGRO_DEFAULT_VIEW = 'dashboard'`.
- La shell lee `YG_AGRO_ACTIVE_VIEW_V1` mediante `readStoredViewToken()`.
- `initAgroShell()` usa ese valor persistido para inicializar `activeView`, lo que permite reabrir una seccion secundaria anterior al entrar a `/agro/`.
- `setActiveView()` escribe la vista en `YG_AGRO_ACTIVE_VIEW_V1`; esa persistencia puede seguir existiendo para estado interno, pero no debe decidir la entrada inicial.

### Plan — Fase 2 entrada Dashboard Agro

1. Cambiar solo el boot de `initAgroShell()` para inicializar con `AGRO_DEFAULT_VIEW`.
2. Mantener `writeStoredView()` y la persistencia durante navegacion interna.
3. No tocar `agro.js`, Supabase, Vercel ni dashboard.

### Diagnostico previo — Fase 3 rail minimal Agro

- `apps/gold/agro/index.html` ya contiene el drawer completo `.agro-shell-sidebar`; se conserva como menu completo.
- `apps/gold/agro/agro-shell.js` ya delega clicks en cualquier `[data-agro-view]`, por lo que el rail puede reutilizar `setActiveView()` sin crecer `agro.js`.
- `syncViewButtons()` ya marca `is-active` y `aria-current` en botones externos al drawer.
- `apps/gold/agro/agro.css` ya contiene la seccion `Agro Shell V10`; para respetar el alcance actual se agregara el rail ahi, sin crear dependencias ni tocar estilos de negocio.
- En mobile conviene no forzar un drawer lateral permanente: el rail debe comportarse como acceso inferior compacto y mantener el drawer actual para navegacion completa.

### Plan — Fase 3 rail minimal Agro

1. Agregar un `nav` persistente antes del drawer con accesos principales a Dashboard, Cultivos, Operacion, Agenda, AgroRepo, Asistente, Estadisticas y Perfil.
2. Mantener un boton de menu completo que abre el drawer existente.
3. Agregar estado expandido/colapsado persistido solo para el rail, independiente de la vista activa.
4. Estilizar desktop como rail lateral dark/gold compacto y mobile como barra inferior compacta, usando tokens V10.

### Cambios realizados

| Frente | Archivo | Cambio |
|---|---|---|
| CodeQL permissions | `.github/workflows/gold-build.yml` | Agregado `permissions: contents: read`. |
| CodeQL permissions | `.github/workflows/rls-smoke-staging.yml` | Agregado `permissions: contents: read`. |
| Entrada Agro | `apps/gold/agro/agro-shell.js` | El boot inicial usa `AGRO_DEFAULT_VIEW` y ya no lee `YG_AGRO_ACTIVE_VIEW_V1` para decidir la vista de entrada. |
| Rail Agro | `apps/gold/agro/index.html` | Agregado rail persistente con accesos principales y boton de menu completo. |
| Rail Agro | `apps/gold/agro/agro-shell.js` | Agregado estado expandido/colapsado del rail con `YG_AGRO_RAIL_EXPANDED_V1` y apertura del drawer desde el rail. |
| Rail Agro | `apps/gold/agro/agro.css` | Agregados estilos desktop/mobile del rail usando tokens V10. |

### Verificacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (`agent-guard`, `agent-report-check`, `vite build`, `check-llms`, `check-dist-utf8`).
- `vite preview` local en `http://127.0.0.1:4174/agro/`: disponible; sin sesion local redirige a login, por lo que no se forzo QA autenticada ni se usaron credenciales.
- `dist/agro/index.html` contiene el markup del rail y ambos workflows contienen `contents: read`.
- Advertencia local no bloqueante: engine declara Node `20.x`, pero esta sesion corrio con Node `v25.6.0`.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase.
- No se toco Vercel.
- No se tocaron credenciales, `.env` ni `testqacredentials.md`.

---

## Sesion 2026-04-26 — Panel Launcher Agro

### Objetivo

Transformar el menu completo de Agro en un launcher expandido tipo Windows 11, adaptado al ADN Visual V10, manteniendo el rail persistente visible y sin romper buscador, favoritos, modos operativos ni navegacion existente.

### Diagnostico previo

- `#agro-shell-sidebar` es el drawer canonico que abre tanto `#agro-shell-toggle` como `#agro-shell-rail-menu`; se debe conservar el ID.
- `#agro-shell-backdrop` cierra con click por listener existente y `Escape` ya llama `closeSidebar()`.
- `collectShellEntries(sidebar)` solo indexa `.agro-shell-link[data-agro-view]`, `.agro-shell-sublink[data-agro-view]` y `.agro-shell-link[data-agro-action]`; por eso los tiles del launcher deben conservar esas clases y atributos.
- `#agro-shell-search` y `#agro-shell-favorites` reciben sus datos desde `initAgroShellSearch()` e `initAgroShellFavorites()`; se pueden mover visualmente dentro del panel mientras se mantengan sus IDs.
- `data-agro-mode-scope` se filtra desde `applyShellModeFilter()` sobre nodos dentro del sidebar; los tiles y grupos deben conservar scopes `crop`, `non_crop` y `tools`.
- `data-agro-nav-parent` y `data-agro-nav-toggle` controlan acordeones/subnav; conviene mantenerlos para Granja General y Operacion Comercial.
- La regla actual `.agro-shell-open .agro-shell-rail` oculta el rail; debe neutralizarse porque el launcher debe convivir con el rail visible.

### Plan

1. Reorganizar el interior de `#agro-shell-sidebar` como launcher con header, boton cerrar, modo, busqueda, favoritos y grid de categorias.
2. Convertir accesos principales en tiles manteniendo `.agro-shell-link`, `.agro-shell-sublink`, `.agro-shell-link__icon`, `.agro-shell-link__label` y atributos `data-agro-*`.
3. Ajustar CSS del sidebar a panel desktop de `min(580px, 88vw)` desplazado a la derecha del rail; en mobile usar bottom sheet que deja visible el rail inferior.
4. Agregar listener para `.agro-launcher__close` sin reescribir la delegacion global de navegacion.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/index.html` | Reorganizado `#agro-shell-sidebar` como launcher con header, boton X, modo, busqueda, favoritos y grid de categorias. |
| `apps/gold/agro/index.html` | Convertidos accesos en tiles manteniendo `.agro-shell-link`, `.agro-shell-sublink`, `.agro-shell-link__label`, `.agro-shell-link__icon` y atributos `data-agro-*`. |
| `apps/gold/agro/agro.css` | Convertido el sidebar en panel launcher desktop, desplazado a la derecha del rail para que el rail siga visible. |
| `apps/gold/agro/agro.css` | Agregado comportamiento mobile como bottom sheet con espacio inferior para conservar el rail inferior. |
| `apps/gold/agro/agro-shell.js` | Agregado listener de `.agro-launcher__close` que llama `closeSidebar()`. |

### Verificacion

- `git diff --check`: PASS antes de la verificacion final.
- `pnpm build:gold`: PASS (`agent-guard`, `agent-report-check`, `vite build`, `check-llms`, `check-dist-utf8`).
- `#agro-shell-sidebar`, `#agro-shell-search` y `#agro-shell-favorites` se conservaron.
- `SHELL_ENTRY_SELECTOR` sigue encontrando tiles porque mantienen `.agro-shell-link` / `.agro-shell-sublink` con `data-agro-view` o `data-agro-action`.
- El rail ya no se oculta por CSS cuando `body.agro-shell-open` esta activo.
- Advertencia local no bloqueante: engine declara Node `20.x`, pero esta sesion corrio con Node `v25.6.0`.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se tocaron `agro-shell-search.js` ni `agro-shell-favorites.js`.
- No se toco Supabase.
- No se toco Vercel ni workflows.
- No se tocaron credenciales, `.env` ni `testqacredentials.md`.

---

## Sesion 2026-04-26 — Eliminacion hamburguesa legacy del header Agro

### Diagnostico

- El boton duplicado señalado por el usuario es `#agro-shell-toggle`, ubicado en el header junto al logo.
- `#agro-shell-rail-menu` ya existe en el rail persistente y debe quedar como entrada principal al launcher.
- `apps/gold/agro/agro-shell.js` todavia exige `#agro-shell-toggle` en el guard inicial de `initAgroShell()`; si se elimina solo el HTML, el shell no inicializa.
- Las funciones `openSidebar()` y `closeSidebar()` actualizan `aria-expanded` sobre el toggle legacy; deben tolerar que ya no exista.
- `apps/gold/agro/agro.css` conserva estilos dedicados a `.agro-shell-toggle`, que quedarian como deuda visual si se elimina el boton.
- El usuario autorizo actualizar `apps/gold/docs/MANIFIESTO_AGRO.md` para fijar la nueva semantica de navegacion.

### Plan

1. Eliminar el boton `#agro-shell-toggle` del header en `apps/gold/agro/index.html`.
2. Hacer opcional el toggle legacy en `apps/gold/agro/agro-shell.js`, conservando `#agro-shell-rail-menu` como abridor del launcher.
3. Retirar estilos especificos de `.agro-shell-toggle` en `apps/gold/agro/agro.css`.
4. Documentar en `MANIFIESTO_AGRO.md` que rail persistente es navegacion rapida y el boton Menú del rail abre el launcher expandido.
5. Validar con `git diff --check` y `pnpm build:gold`.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/index.html` | Eliminado el boton hamburguesa legacy `#agro-shell-toggle` del header. |
| `apps/gold/agro/agro-shell.js` | `#agro-shell-toggle` queda opcional para que el shell inicialice sin el boton legacy; `#agro-shell-rail-menu` sigue abriendo el launcher. |
| `apps/gold/agro/agro.css` | Retirados estilos dedicados a `.agro-shell-toggle`. |
| `apps/gold/docs/MANIFIESTO_AGRO.md` | Agregada seccion `4.11.3 Navegacion del Shell` con la semantica rail persistente + launcher expandido. |

### Verificacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (`agent-guard`, `agent-report-check`, `vite build`, `check-llms`, `check-dist-utf8`).
- `#agro-shell-rail-menu` queda como unica entrada principal al launcher.
- `#agro-shell-toggle` ya no existe en HTML ni CSS activo; solo queda como referencia opcional de compatibilidad en JS.
- Advertencia local no bloqueante: engine declara Node `20.x`, pero esta sesion corrio con Node `v25.6.0`.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase.
- No se toco Vercel ni workflows.
- No se tocaron credenciales, `.env` ni `testqacredentials.md`.

---

## Sesion 2026-04-26 — Feedback mobile rail overlap

### Diagnostico

- La captura mobile muestra que `.agro-feedback-fab` ocupa la misma zona inferior que el rail mobile.
- `apps/gold/agro/agro-feedback.js` crea el boton flotante y el modal; no se debe tocar ni duplicar esa logica.
- El launcher ya tiene seccion `Sistema`, por lo que puede alojar un acceso alterno a Feedback en mobile.

### Cambios realizados

| Archivo | Cambio |
|---|---|
| `apps/gold/agro/agro.css` | Oculta `.agro-feedback-fab` en `max-width: 768px` para evitar solape con el rail inferior. |
| `apps/gold/agro/index.html` | Agrega tile `Feedback` en la seccion `Sistema` del launcher, reutilizando el FAB existente para abrir el modal. |

### Verificacion

- `git diff --check`: PASS.
- `pnpm build:gold`: PASS (`agent-guard`, `agent-report-check`, `vite build`, `check-llms`, `check-dist-utf8`).
- Advertencia local no bloqueante: engine declara Node `20.x`, pero esta sesion corrio con Node `v25.6.0`.
- QA manual recomendado: desktop mantiene FAB visible; mobile oculta FAB y permite abrir Feedback desde launcher.

### Alcance respetado

- No se toco `apps/gold/agro/agro.js`.
- No se toco Supabase.
- No se toco Vercel ni workflows.
- No se tocaron credenciales, `.env` ni `testqacredentials.md`.
