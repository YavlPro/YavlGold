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

## Sesion activa: Switch maestro del shell Agro (2026-04-18)

### Diagnostico

Se inicia correccion quirurgica del switch maestro del shell/sidebar de Agro. El switch existe visualmente, pero la hipotesis inicial es que no esta conectado a la visibilidad real de los items del shell. La tarea debe confirmar si el problema vive en `agro-mode.js`, `agro-shell.js`, el markup del sidebar en `agro/index.html`, CSS responsive, o una combinacion de wiring + metadata faltante.

### Causa raiz probable

El control de modo parece publicar estado global (`agro:modechange` / `body[data-agro-mode]`), pero los nodos de navegacion del shell probablemente no tienen una clasificacion semantica consumible (`all`, `crop`, `non_crop`, `tools`) ni un listener que aplique show/hide sobre esos nodos. En mobile, el control tambien puede estar limitado por CSS de ancho/overflow y no por logica.

### Plan quirurgico

1. Inspeccionar donde se renderiza el switch y como se inicializa.
2. Inventariar items reales del sidebar/header y clasificar solo lo que ya existe, sin contradecir `MANIFIESTO_AGRO.md`.
3. Agregar metadata semantica reutilizable en el shell o una capa JS pequeña.
4. Conectar el modo activo a un filtro real de visibilidad, con fallback `all`.
5. Ajustar CSS mobile para strip horizontal deslizable, maximo dos opciones visibles y metadata discreta: "Desliza para ver mas filtros o modos".
6. Validar manualmente modos `all`, `crop`, `non_crop`, `tools` y ejecutar `pnpm build:gold`.

### Archivos a tocar

- `apps/gold/agro/agro-mode.js`
- `apps/gold/agro/agro-shell.js`
- `apps/gold/agro/index.html`
- `apps/gold/agro/agro.css` o CSS del shell existente, solo si hace falta para responsive/ADN
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`

### Causa raiz confirmada

`agro-mode.js` renderizaba el switch y actualizaba estado visual/localStorage, pero `agro-shell.js` no escuchaba `agro:modechange` para filtrar items reales del sidebar. El markup tampoco tenia metadata semantica por item, por lo que no existia una capa confiable para distinguir cultivo, no cultivo, herramientas o general. En mobile, el CSS compactaba ocultando labels, pero no convertia el control en un strip deslizable de dos opciones visibles.

### Cambios realizados

| Archivo | Cambio |
| --- | --- |
| `apps/gold/agro/agro-mode.js` | Se ampliaron los modos a `all`, `crop`, `non_crop`, `tools`; se conservaron aliases legacy (`general`, `cultivo`, `no-cultivo`) para no romper consumidores existentes. |
| `apps/gold/agro/agro-shell.js` | Se agrego filtro real por `data-agro-mode-scope`, listener de `agro:modechange`, ocultado con `hidden`/`inert` y fallback `all`. |
| `apps/gold/agro/index.html` | Se etiquetaron los items reales del sidebar con `general`, `crop`, `non_crop` o `tools`; se agrego hint mobile del switch. |
| `apps/gold/agro/agro.css` | Se ajusto el switch como strip horizontal, estado activo con fondo/borde/sombra, touch target mas comodo y mobile con dos opciones visibles por tramo. |

### Clasificacion semantica aplicada

- `all`: modo General, muestra todo.
- `crop`: ciclos de cultivo, tareas filtrables por cultivo y accion `Nuevo cultivo`.
- `non_crop`: ciclos de periodo, operacion comercial, Cartera Viva, Cartera Operativa y tareas filtrables sin cultivo.
- `tools`: rankings, clima, herramientas, bitacora y Asistente IA.

`Granja General` queda como agrupador navegacional mixto (`crop non_crop`), no como modulo financiero.

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
