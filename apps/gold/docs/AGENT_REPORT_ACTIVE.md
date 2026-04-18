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
