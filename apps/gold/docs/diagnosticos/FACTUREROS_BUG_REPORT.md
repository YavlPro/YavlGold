# FACTUREROS_BUG_REPORT.md

**Fecha:** 2026-06-26
**Tipo:** Reporte de diagnóstico (FASE 0 — solo lectura, sin cambios de código)
**Alcance:** Facturero de la Finca · Facturero del Cultivo · Facturero Personal
**Excluido explícitamente:** Facturero de Clientes (no tocar — funciona OK)

---

## Resumen ejecutivo

Los 3 factureros **no son 3 módulos separados**. Son **una sola vista** (`agroOperationalCycles.js`) que comparte **un único objeto `state`** y discrimina entre finca/cultivo/personal por una variable llamada `state.familyFilter`. La separación estructural entre los tres es **100% frontend** (la query a Supabase NO filtra por `farm_id`/`crop_id`), por lo que **cualquier estado que corrompa `familyFilter` o el contexto seleccionado produce mezcla total o cero registros**.

Se confirman **5 causas raíz** distintas que explican los síntomas reportados.

---

## Bugs confirmados

### Bug 1 — "Vista general" mezcla registros de finca y cultivo en ambos factureros

**Síntoma reportado:** Al seleccionar Vista General en Facturero de Cultivos y Facturero de la Finca aparecen registros mezclados de la finca y los cultivos.

**Causa raíz:** El handler `MODE_CHANGE_EVENT` (`agroOperationalCycles.js:3735-3745`) **sobreescribe `state.familyFilter` a `FAMILY_ALL`** sin respetar el facturero activo:

```js
window.addEventListener(MODE_CHANGE_EVENT, (event) => {
    const mode = normalizeToken(event?.detail?.mode);
    if (mode === 'cultivo') state.familyFilter = FAMILY_LINKED;
    else if (mode === 'no-cultivo') state.familyFilter = FAMILY_ALL;
    else state.familyFilter = FAMILY_ALL;   // ← modo "general" → FAMILY_ALL
    ...
});
```

Cuando `familyFilter === FAMILY_ALL`, la función `filterCyclesByFamily` (líneas 2092-2101) **no aplica ningún filtro de familia** (solo filtra si es LINKED/FARM/ORPHAN), devolviendo **todos los ciclos sin discriminación**. Por eso Vista General muestra finca + cultivo + personal mezclados.

Este evento se dispara en cada carga (`agro-mode.js:183` al inicializar el switch de modo) y cada vez que el usuario cambia el switch global General/Cultivo/No cultivo/Herramientas, pisando la separación estructural que `viewContext` intenta mantener.

**Archivo/función/línea:** `agroOperationalCycles.js` · handler `MODE_CHANGE_EVENT` · 3735-3745
**Tipo:** Bug lógico — `familyFilter` no respeta `viewContext.family`.

---

### Bug 2 — Seleccionar finca específica + cultivo específico muestra todo en cero

**Síntoma reportado:** Si selecciono Los Higuerones + un cultivo específico, me aparece en cero todo.

**Causa raíz:** La función `filterCyclesByContext` (líneas 2080-2090) aplica un filtro **AND estricto** entre finca y cultivo:

```js
function filterCyclesByContext(cycles) {
    const farmId = normalizeId(state.selectedContextFarmId);
    const cropId = normalizeId(state.selectedContextCropId);
    if (!farmId && !cropId) return cycles;
    return cycles.filter((cycle) => {
        const matchesFarm = !farmId || normalizeId(cycle?.farm_id) === farmId;
        const matchesCrop = !cropId || normalizeId(cycle?.crop_id) === cropId;
        return matchesFarm && matchesCrop;   // ← AND: exige AMBOS
    });
}
```

Un ciclo de **finca** tiene `crop_id = null` (por definición canónica). Al exigir `crop_id === X` Y `farm_id === Y`, **todos los ciclos de finca quedan excluidos** porque su `crop_id` es null. Igualmente, los ciclos de cultivo que no coinciden con esa finca exacta quedan fuera. Resultado: cero registros.

Adicionalmente, la mayoría de ciclos de finca **no llevan `crop_id`**, y la mayoría de ciclos de cultivo **no llevan `farm_id`** directo (la finca se infiere del cultivo, no se guarda en el ciclo). El AND estricto es incompatible con el modelo de datos real.

**Archivo/función/línea:** `agroOperationalCycles.js` · `filterCyclesByContext` · 2080-2090
**Tipo:** Bug lógico — filtro AND incompatible con el discriminador canónico (`crop_id` null en ciclos de finca).

---

### Bug 3 — Crear un registro nuevo hace "saltar a Vista General" y todo se mezcla

**Síntoma reportado:** Si creo un nuevo registro me salta a vista general y aparece todo mezclado.

**Causa raíz:** `resetForm()` (líneas 3217-3229) **no aplica el preset del facturero activo** al crear el draft:

```js
function resetForm() {
    state.editId = '';
    state.form = createFormState({
        values: createDraftValues({   // ← cropId: '', farmId: '' siempre
            economicType: ...,
            category: ...,
            currency: ...,
            movementDate: todayLocalIso()
        })
    });
    ...
}
```

`createDraftValues` (391-409) siempre inicializa `cropId: ''` y `farmId: ''`. El wizard **no pre-selecciona** la finca/cultivo desde `state.selectedContextFarmId`/`selectedContextCropId` ni desde el `viewContext.preset`. El usuario debe elegir manualmente, y si no lo hace (o lo hace mal), el registro se guarda con la asociación incorrecta.

El `readFormPayload → normalizePayload` (líneas 1205-1206) toma `cropId`/`farmId` **directamente del form state sin aplicar el preset del facturero**:

```js
cropId: ensureLocalCropSelection(source.cropId || source.crop_id),
farmId: normalizeId(source.farmId || source.farm_id),
```

Combinado con el **Bug 1** (`familyFilter = FAMILY_ALL`), el registro recién creado —sin importar en qué facturero se haya creado— aparece visible en Vista General de **todos** los factureros, dando la impresión de "saltar a Vista General y mezclarse". No hay redirect explícito a Vista General; el registro simplemente se vuelve visible en todas partes porque la separación estructural está rota.

**Archivo/función/línea:** `agroOperationalCycles.js` · `resetForm` (3217) + `normalizePayload` (1205-1206) + handler `new-cycle` (3507-3511)
**Tipo:** Bug lógico — el wizard no respeta el contexto/preset del facturero activo.

---

### Bug 4 — Facturero Personal aparece en cero y al crear se mezcla todo

**Síntoma reportado:** Facturero Personal en primera instancia aparece todo en cero; al crear un registro se mezclan los registros de finca y cultivo.

**Causa raíz:** Confluencia de los Bugs 1 y 3:
- El Personal debería mostrar solo `FAMILY_ORPHAN` (`farm_id IS NULL AND crop_id IS NULL`).
- Pero si `familyFilter` fue pisado a `FAMILY_ALL` por `MODE_CHANGE`, `filterCyclesByFamily` devuelve **todos** los ciclos en lugar de solo los huérfanos → aparecen mezclados registros de finca y cultivo dentro del Personal.
- El "cero inicial" se debe a que al cargar, el contexto seleccionado (`selectedContextFarmId`/`cropId`) puede heredarse o el `familyFilter` quedar mal, dejando fuera todos los registros huérfanos.

**Archivo/función/línea:** `agroOperationalCycles.js` · confluencia Bug 1 (3735-3745) + Bug 3 (3217-3229)
**Tipo:** Bug lógico derivado.

---

### Bug 5 — Al actualizar la página (F5) en cualquier facturero quedan cero registros

**Síntoma reportado:** Si actualizo la página en cualquier facturero (finca, cultivo o personal) quedan cero registros.

**Causa raíz (doble):**

**(5a) Race condition de inicialización bajo demanda.** `initAgroOperationalCycles` se invoca **bajo demanda dentro de `loadCrops`** (`agro.js:11364-11374`), no en el bootstrap directo. La secuencia al recargar es:

1. El shell dispara `view-changed` con el facturero (`agro-shell.js:1578`) **antes** de que el módulo operativo esté importado.
2. El listener `VIEW_CHANGED_EVENT` (`agroOperationalCycles.js:3691`) **todavía no está registrado** → el evento inicial se pierde.
3. Cuando `loadCrops` finalmente importa el módulo y llama `init`, este lee `document.body.dataset.agroActiveView` (línea 3902) para reconstruir el contexto. Si por timing ese dataset no refleja aún el facturero correcto, o si el modo global fuerza `FAMILY_ALL` (Bug 1), la partición queda mal.

**(5b) Reset destructivo en caso de error de fetch.** En `refreshData` (líneas 3409-3422), cualquier error —transitorio o permanente— ejecuta:

```js
catch (error) {
    state.schemaMissing = isSchemaMissingError(error);
    state.crops = [];
    state.datasets = createDatasetsState();   // ← datasets VACÍOS
    ...
}
```

Esto deja `state.datasets` completamente vacío → **cero registros en todos los tabs**, y el usuario solo ve el mensaje de error en feedback. Si el error es transitorio (token de sesión expirado, blip de red, RLS), recargar no recupera los datos hasta que el fetch vuelva a tener éxito.

**Archivo/función/línea:** `agroOperationalCycles.js` · `initAgroOperationalCycles` (3883, especialmente 3891 vs 3902) + `refreshData` catch (3409-3422); `agro.js:11364-11374` (punto de carga bajo demanda)
**Tipo:** Bug de timing (5a) + bug de resiliencia (5b).

---

### Bug 6 (menor) — Donaciones y Pérdidas cruzan la frontera activos/cerrados

**Síntoma:** Posibles conteos inconsistentes en tabs Donaciones/Pérdidas respecto a No pagados/Pagados.

**Causa:** La partición No pagados/Pagados se hace **a nivel de query DB** (`ACTIVE_STATUS_VALUES` vs `FINISHED_STATUS_VALUES` en `refreshData:3357-3358`). Pero Donaciones (2298) y Pérdidas (2321) se computan desde `getAllCycles()`, que combina AMBOS datasets. Una donación en estado `open` vive en el dataset `SUBVIEW_ACTIVE`, pero también aparece en el tab Donaciones vía `getAllCycles()`. Esto no es el bug principal reportado, pero explica conteos que no cuadran entre tabs.

**Archivo/función/línea:** `agroOperationalCycles.js` · `getDonationCycles` (2298), `getLossCycles` (2321), `getCyclesForSubview` (2325)
**Tipo:** Bug lógico menor de partición de datasets.

---

## Causa raíz probable (resumen cruzado)

Los síntomas (mezcla, cero al seleccionar, salto a Vista General, cero al recargar) **no son 4 bugs independientes**. Son manifestaciones de **dos defectos arquitectónicos centrales**:

1. **El handler `MODE_CHANGE` pisando `familyFilter` a `FAMILY_ALL`** ignora la separación estructural que `viewContext` define. Esto es la causa raíz de la **mezcla** (Bugs 1, 3, 4).

2. **El wizard no aplica el preset del facturero activo al crear**, combinado con el filtro AND estricto en `filterCyclesByContext` incompatible con el modelo de datos (`crop_id` null en fincas). Esto es la causa raíz del **cero al seleccionar contexto** y del **registro mal asociado al crear** (Bugs 2, 3).

3. **Inicialización bajo demanda + reset destructivo en catch** causan el **cero al recargar** (Bug 5).

La separación entre factureros **es estructural y debe vivir en el código frontend** (porque la DB no discrimina), pero el código actual permite que `FAMILY_ALL` la desactive en cualquier momento.

---

## Archivos afectados (solo los que necesitan cambio)

| Archivo | Razón |
|---|---|
| `apps/gold/agro/agroOperationalCycles.js` | Contiene los 6 puntos de bug. Es el único archivo de lógica que requiere cirugía. |

**No se requieren cambios en:**
- `agro-mode.js` (emite el evento correctamente; el bug es quien lo consume)
- `agro-shell.js` (persistencia de hash y `agroActiveView` funcionan OK)
- `agro.js` (el punto de carga bajo demanda es un tema de timing, no de sintaxis)
- `supabase/` (la separación es intencionalmente frontend; no hay migración DDL que arregle esto)
- `agro-facturero-clientes-*.js` (excluido explícitamente — funciona OK)

---

## Requiere módulo nuevo (agro-*.js)?

**No.** `agroOperationalCycles.js` es el módulo operativo dedicado (no es el monolito `agro.js`); su propósito es exactamente este dominio. Las correcciones son **cirugía dentro del módulo existente**, no features nuevas. Esto respeta la regla §3.1 (no agregar features al monolito) y §11.6 (cirugía quirúrgica acumulativa).

---

## Cambios de base de datos requeridos

**Ninguno.** El modelo de datos es correcto:
- `agro_operational_cycles` tiene `farm_id` (nullable) y `crop_id` (nullable).
- El discriminador canónico (`getCycleAssociationType`, líneas 2074-2078) ya define correctamente: `crop_id` presente → cultivo; `farm_id` presente sin `crop_id` → finca; ambos null → personal.

El bug es de **lógica de filtrado frontend**, no de schema.

---

## Evidencia de trazado (referencias rápidas)

| Función | Línea | Rol |
|---|---|---|
| `VIEW_CONTEXTS` | 21-25 | Define `family` por facturero (FARM/LINKED/ORPHAN) |
| `state` (objeto único) | 154-186 | Estado compartido por los 3 factureros |
| `state.familyFilter` | 174 | Variable crítica de separación |
| `state.selectedContextFarmId/CropId` | 177-178 | Contexto de chips (finca/cultivo específico) |
| `fetchCycles` | 1059-1091 | Query DB — NO filtra farm/crop |
| `filterCyclesByFamily` | 2092-2102 | Partición por familia (defectuosa si FAMILY_ALL) |
| `filterCyclesByContext` | 2080-2090 | Filtro AND estricto (Bug 2) |
| `createCycleRecord` | 1284-1334 | Guarda `farm_id`/`crop_id` del payload |
| `normalizePayload` | 1148-1215 | Lee cropId/farmId del form sin preset (Bug 3) |
| `resetForm` | 3217-3229 | No aplica preset al crear (Bug 3) |
| `refreshData` catch | 3409-3422 | Reset destructivo (Bug 5b) |
| `initAgroOperationalCycles` | 3883-3937 | Race condition (Bug 5a) |
| handler `VIEW_CHANGED` | 3691-3727 | Setea viewContext correctamente |
| handler `MODE_CHANGE` | 3735-3745 | **Pisa familyFilter a FAMILY_ALL (Bug 1)** |
| punto de carga | `agro.js:11364-11374` | `initAgroOperationalCycles` bajo demanda en `loadCrops` |

---

## Lo que NO se hizo (scope respetado)

- No se editó ningún archivo.
- No se propuso solución de implementación antes de cerrar el diagnóstico.
- No se tocó `agro-facturero-clientes-view.js` ni nada del Facturero de Clientes.
- No se asumió que el bug era CSS.
- No se inventaron queries correctas sin ver las incorrectas.

---

## Próximo paso sugerido (FASE 1 — pendiente de aprobación)

Pasar a plan de corrección quirúrgica sobre `agroOperationalCycles.js` priorizando:

1. **Bug 1** (mezcla): el handler `MODE_CHANGE` debe respetar `viewContext.family` cuando el facturero activo es uno de los tres (no pisar `familyFilter`).
2. **Bug 2** (cero al seleccionar): revisar el filtro AND de `filterCyclesByContext` para que sea coherente con el discriminador canónico.
3. **Bug 3** (crear sin preset): `resetForm`/`normalizePayload` deben aplicar el preset del facturero activo.
4. **Bug 5** (recargar): revisar el race de init y hacer el catch de `refreshData` no destructivo.

Cada fix debe validarse con build gate (`pnpm build:gold`) y QA dirigida por facturero.
