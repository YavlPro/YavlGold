# SPEC — Reportes del Agro con la Finca como Entidad Raíz

## Metadatos

| Campo | Valor |
|---|---|
| Nombre de archivo sugerido | `apps/gold/docs/AGENT_SPEC__REPORTES_POR_FINCA__2026-08-03.md` |
| Redactada | 2026-08-03 |
| Diagnóstico base | 2026-08-02 (auditoría de Kiro, solo lectura) |
| Estado | Lista para implementación |
| Rama | `main` |
| Módulo | `apps/gold/agro` (Agro V1) |
| Quién implementa | Kiro Code (turno posterior) |
| Quién valida | Yerikson (QA real en navegador y móvil) |

---

## 0. Principio rector (criterio ontológico de aceptación)

> La **finca es la entidad raíz**. Un cultivo sin finca **no es cultivo**; una finca sin cultivo **sigue siendo finca**.

Todo cambio de esta spec se juzga contra este principio. Si un MD exportado muestra un cultivo sin declarar su finca, o mezcla fincas sin avisar, **no está terminado** aunque compile. El selector de finca es el eje primario; el cultivo es un sub-eje que vive dentro.

---

## 1. Resumen ejecutivo

La causa raíz de casi todos los defectos es **una sola**: el generador de export de los factureros lee el dataset global crudo, mientras la vista activa lee ese mismo dataset **filtrado por contexto**. El fix es hacer que el export construya un **snapshot filtrado** con el mismo filtro que ya usa la vista, **sin mutar el estado global** que alimenta al portafolio y a los analytics.

| Qué se arregla | Dónde | Hallazgos |
|---|---|---|
| Título, filename y dataset del export de factureros | `agroOperationalCycles.js` | H1, H2, H3, H6, H7 |
| Color de botones de acción (dorado canónico) | `agroOperationalCycles.js` + CSS | H5 |
| Finca declarada en MD de cultivo y alcance en perfil global | `agro-crop-report.js`, `agro-reports-center.js` | H10, D3 |
| Normalización de nombres en Rankings | `agro-reports-center.js` | D4 |
| Regla de dominio del Personal (documentada) | `agroOperationalCycles.js` | D1 (ex H8) |

**Qué NO se toca:** `state.datasets`, `rebuildPortfolioByCrop()`, `emitPortfolioSnapshot()`, `agro-farm-report.js`, `agro-crop-report.js` (salvo H10 puntual). Ver sección 5.

---

## 2. Causa raíz unificada

En una frase: **`buildExportMarkdown()` consume `state.datasets` directamente y se salta `filterCyclesByContext()`, que es el filtro que la vista sí aplica.**

Cadena rota (del diagnóstico):

- El chip de finca/cultivo actualiza `state.selectedContextFarmId` / `state.selectedContextCropId` y la vista re-filtra con `filterCyclesByContext()` (L2082). Correcto.
- El botón *Exportar MD* llama `buildExportMarkdown()` → `buildMarkdownSection()` → `getDataset()`, que devuelve `state.datasets[key]` **crudo**, sin filtro. Ahí se rompe.
- `state.datasets` se pobló en `refreshData()` (L3385–3485) con **todos** los ciclos del usuario, sin filtro de finca ni cultivo.

Consecuencia visible: los tres factureros exportan el mismo `14 ciclos / −$ 811.000`, con título hardcodeado `# Facturero de la Finca` y filename `ciclos-operativos-2026-08.md`, sin importar el contexto activo.

---

## 3. Reglas de dominio fijadas (defaults confirmados)

| ID | Decisión | Regla fijada |
|---|---|---|
| **D1** | Semántica del Personal | **Personal = solo huérfanos totales** (`!farm_id && !crop_id`). Un ciclo con `farm_id` pero sin `crop_id` **es de finca**, no personal. El filtro `FAMILY_ORPHAN` (L2114) ya coincide; verificar en implementación que el tab *Pagados* del Personal no muestra ciclos con `farm_id`. |
| **D2** | Export de clientes | **Se deja como está**: el botón *Exportar* vive en el **detalle** del cliente individual (`exportBuyerDetail()`), no en la lista. Es intencional. Documentar, no cambiar. Un export masivo se agenda aparte si se desea. |
| **D3** | Alcance del perfil global | El perfil global debe declarar **"Todas las fincas"** y listar las incluidas, no la finca del perfil como si fuera el alcance. |
| **D4** | Nombres en Rankings | **Activar** `normalizeReportClientName()` (de `agro-report-format.js`) en el path de `exportRankings()`. La función ya existe; falta la llamada. |

---

## 4. Cambios por bloque

### Bloque 1 — Generador de factureros (`agroOperationalCycles.js`)

Es el corazón. Toca tres funciones: `buildExportMarkdown()`, `buildMarkdownSection()`, `buildExportFileName()`.

**H1 — Título dinámico.** En `buildExportMarkdown()` (L3067) se escribe el literal `'# Facturero de la Finca'`. Reemplazarlo por el título del contexto de vista **ya disponible** en `state.viewContext.title` (definido en `VIEW_CONTEXTS`, L22–26, y usado en `renderShell` L1448 y `syncHeaderTitle` L1527). No hay que crear nada; hay que leer una variable que ya existe.

**H2 + H7 — Snapshot filtrado (el cambio central).** El export debe construir un **dataset local filtrado** aplicando `filterCyclesByContext()` sobre `state.datasets[key].cycles` en el momento del export, y computar el resumen (`count`, `balance`) sobre **ese snapshot**, no sobre el dataset global. Esto arregla a la vez:

- H2: cada facturero exportará solo sus ciclos (balance y conteo propios, no el global 14/−811.000).
- H7: encabezado y cuerpo del MD pasarán a ser **coherentes** (si el Personal está vacío, dirá 0 arriba y 0 abajo, no 14 arriba y 0 abajo).

**Restricción dura:** no mutar `state.datasets`. El snapshot es local al export y se descarta. Ver sección 5.

**H3 — Filename con entidad y scope.** En `buildExportFileName()` (L3018–3020) se hardcodea `ciclos-operativos-${mes}.md`. Derivar el nombre del contexto activo: entidad (finca/cultivo/personal) + finca/cultivo seleccionado + mes. Modelo de referencia: `agro-crop-report.js` (L1001) compone `Informe_${fileLabel}_${dateStr}.md` con `sanitizeFilename(cropName)`. Reusar ese patrón de sanitización.

**H6 — Cae solo.** Al aplicar el snapshot filtrado (H2), el export mostrará el mismo conteo que la vista (12 en el ejemplo), porque ambos usan `filterCyclesByContext()`. No requiere cambio propio; se verifica en el test.

**Criterio de done del Bloque 1:** con un filtro activo, descargar el MD del Cultivo y el de la Finca produce **título, balance, conteo y filename distintos** entre sí, y el encabezado de cada MD concuerda con su cuerpo.

---

### Bloque 2 — Consistencia visual (H5)

Los botones *Nuevo registro*, *Ver períodos* y *Exportar MD* salen oscuros porque usan `btn btn-primary` (y *Ver períodos* solo `btn`), pero **`.btn-primary` no define `background`**; el dorado vive en la clase **`.btn-gold`**, que no se les aplica. El token dorado ya existe en `agro-tokens.css` (`--gold-4: #C8A752`) y el chip *Exportar N* ya lo usa, prueba de que el estilo está disponible en este mismo módulo.

**Cambio:** en `renderShell()` (L1449–1453) y `renderExportView()` (L3103), aplicar la clase dorada canónica (`btn-gold` o equivalente de tokens ADN V12) a los tres botones de acción. No diseñar color nuevo; reusar el token.

**Criterio de done del Bloque 2:** en móvil y escritorio, los tres botones se ven dorados con contraste legible, consistentes con el resto de módulos y con el chip *Exportar N*.

---

### Bloque 3 — Entidad en MD ajenos al generador (H10 + D3)

**H10 — El MD de cultivo declara su finca padre.** Hoy `agro-crop-report.js` genera el informe con `cropId` explícito y datos filtrados por cultivo (correcto en número), pero el MD **no declara la finca** a la que pertenece el cultivo. Eso deja al cultivo huérfano en el archivo y viola el principio rector. **Cambio:** añadir una línea `Finca: <nombre>` al MD del cultivo. **Verificar en implementación** que el dato de finca esté disponible en el path de `agro-crop-report.js` (probablemente vía el objeto cultivo que trae `farm_id`, o vía join); si no lo está, obtenerlo sin romper el filtrado por `cropId`.

**D3 — Alcance real del perfil global.** En `agro-reports-center.js` → `exportGlobalAgro()`, el MD declara `Finca: Los higuerones` pero consolida datos de **ambas** fincas. **Cambio:** declarar alcance **"Todas las fincas"** y listar las fincas incluidas, en lugar de la finca del perfil.

**Criterio de done del Bloque 3:** todo MD de cultivo lleva su finca; el perfil global declara su alcance multi-finca sin ambigüedad.

---

### Bloque 4 — Normalización de nombres (D4)

En `agro-reports-center.js` → `exportRankings()`, los nombres de clientes salen con capitalización inconsistente (`jose luis` vs `Jose Luis`). La función `normalizeReportClientName()` **ya existe** en `agro-report-format.js` pero no se invoca en este path. **Cambio:** invocarla sobre los nombres antes de renderizar el MD de Rankings.

**Criterio de done del Bloque 4:** el MD de Rankings muestra nombres normalizados, sin duplicados por capitalización.

---

### Bloque 5 — Regla de dominio del Personal documentada (D1)

Fijar por escrito (comentario de código + esta spec) que **Personal = huérfanos totales** (`!farm_id && !crop_id`). El filtro `FAMILY_ORPHAN` (L2114) ya lo implementa. **Verificar en implementación** que el tab *Pagados* del Facturero Personal no esté mostrando ciclos con `farm_id`; si los muestra, aplicar el filtro de familia también en ese subview para que sea coherente con la regla.

**Criterio de done del Bloque 5:** el Facturero Personal solo muestra ciclos sin finca y sin cultivo; el conteo del tab *Pagados* concuerda con el resumen de la subvista *Sin asociar*.

---

## 5. Qué NO tocar (riesgos, con cita del diagnóstico)

- **`state.datasets[SUBVIEW_ACTIVE]` y `[SUBVIEW_FINISHED]`** — son fuente compartida. Portafolios y analytics dependen de verlos **globales**.
- **`rebuildPortfolioByCrop()` (L318) y `emitPortfolioSnapshot()` (L382)** — emiten `agro:operational-portfolio-updated` a otros módulos consumiendo `state.datasets`. Si se filtraran los datasets de estado, el portafolio emitido sería incorrecto.
- **`agro-farm-report.js` y `agro-crop-report.js`** — funcionan correctamente (salvo H10 puntual en cultivo). Son la **referencia del modelo bueno**; no romperlos.

**Enfoque seguro del fix:** no filtrar los datasets en memoria; construir un **snapshot filtrado local** solo para el export, usando `filterCyclesByContext()` sobre los ciclos del dataset, sin alterar el estado persistido.

---

## 6. Plan de implementación (orden y commits atómicos)

| Orden | Commit | Contenido | Riesgo |
|---|---|---|---|
| 1 | `fix(agro): título y filename del export según contexto` | H1 + H3 | Bajo (string/derivación) |
| 2 | `fix(agro): export usa snapshot filtrado por contexto` | H2 + H7 (+ H6 cae) | **Medio-alto** (no tocar `state.datasets`) |
| 3 | `fix(agro): botones de acción en dorado canónico` | H5 | Bajo (CSS/clases) |
| 4 | `fix(agro): MD de cultivo declara finca + alcance perfil global` | H10 + D3 | Bajo |
| 5 | `fix(agro): normalizar nombres en Rankings` | D4 | Bajo |
| 6 | `docs(agro): regla de dominio del Personal + verificación filtro` | D1 | Bajo |

Cada commit con su QA antes del siguiente. El commit 2 es el delicado; conviene aislarlo y probarlo solo antes de seguir.

---

## 7. Tests de aceptación (QA real — los corre Yerikson)

**Funcional (el principal):**
- Con el **mismo filtro activo**, descargar el MD del **Facturero del Cultivo** y el del **Facturero de la Finca**. Tras el fix deben diferir en: **título** (`# Facturero del Cultivo` vs `# Facturero de la Finca`), **balance**, **conteo** y **filename**.
- En el **Facturero Personal vacío**: encabezado y cuerpo del MD deben ser **coherentes** (0 y "sin balance" en ambos; nunca 14 arriba y 0 abajo).
- El MD de **cultivo** declara su **finca**; el **perfil global** declara "Todas las fincas".
- El MD de **Rankings** muestra nombres normalizados.

**No regresión (crítico por el riesgo del commit 2):**
- Tras el fix, el **portafolio y los analytics** siguen mostrando el **global** correcto (porque `state.datasets` no se tocó). Verificar que `agro:operational-portfolio-updated` sigue emitiendo los ciclos completos.
- Los informes de **Finca** (`agro-farm-report.js`) y de **Cultivo** (`agro-crop-report.js`) siguen correctos.

**Visual:**
- En **móvil y escritorio**, *Nuevo registro*, *Ver períodos* y *Exportar MD* se ven **dorados** con buen contraste, iguales al chip *Exportar N* y al resto de módulos.

---

## 8. Criterio de "verde"

Nada se marca en verde solo porque compila. Cada bloque se cierra **solo** cuando su test de aceptación de la sección 7 pasa en **navegador y móvil reales**. El commit 2, en particular, no es verde hasta confirmar que el portafolio **no** se rompió.

---

## 9. Fuera de alcance (se agenda aparte)

- **Export masivo de clientes** desde el Centro de Reportes o la lista (D2: hoy el export es por cliente, en el detalle; funciona y se deja así).
- **Reportes por finca dentro del Centro de Reportes** como capa separada de la capa consolidada: deseable según el principio rector, pero requiere diseño propio; no entra en este ciclo para no agrandar el commit 2.
- Cualquier cambio a `state.datasets` o a la emisión del portafolio.
