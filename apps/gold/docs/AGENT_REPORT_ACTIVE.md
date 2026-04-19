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
