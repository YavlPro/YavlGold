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
