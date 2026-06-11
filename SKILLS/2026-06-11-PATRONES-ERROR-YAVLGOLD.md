# Skill: Patrones de Error Recurrentes en YavlGold
Fecha de creación: 2026-06-11
Última actualización: 2026-06-11
Autor: Sesión de reorganización de navegación Operaciones de la Finca
Alcance: Universal para todo el proyecto YavlGold

## Descripción

Esta skill documenta 10 patrones de error recurrentes identificados durante sesiones de trabajo en YavlGold. Su propósito es evitar que futuros agentes repitan estos errores. No es una guía de features ni de arquitectura — es una lista de verificación defensiva.

**Cuándo usar esta skill:**
- Antes de ejecutar un rename masivo
- Antes de reorganizar navegación del hub
- Antes de modificar botones de acción
- Antes de ajustar rutas hash o subvistas
- Después de cualquier cambio de UI

**Cuándo NO usar esta skill:**
- Para entender la arquitectura del proyecto (ver FICHA_TECNICA.md)
- Para entender la semántica de Agro (ver MANIFIESTO_AGRO.md)
- Para entender el sistema visual (ver ADN-VISUAL-V11.0.md)

---

## Lección 1: Detección de residuos de rename

### Problema
Residuos que cruzan múltiples líneas HTML no son detectados por `grep` simple.

### Ejemplo real
"Calendario operativo" quedó en el sidebar de index.html porque el texto cruzaba las líneas 254-255. Un `grep -i "Calendario operativo"` no lo encontró.

### Solución
Después de un rename masivo:
1. Hacer búsqueda con `grep` en todos los archivos
2. **Adicionalmente**, hacer inspección visual manual en archivos HTML estáticos (index.html, agro/index.html, docs-agro.html)
3. Verificar que el texto no esté partido en múltiples líneas

### Regla práctica
Si el texto a buscar tiene más de 2 palabras, verificar manualmente en HTML estáticos aunque `grep` no lo encuentre.

---

## Lección 2: Patrones de botones consistentes

### Problema
Botones outline vs solid inconsistentes entre superficies hermanas.

### Ejemplo real
Operaciones de la Finca tenía botones `btn-outline-gold` (borde dorado, fondo transparente), mientras Mis cultivos usaba `btn-gold` (fondo dorado sólido). Ambas superficies tienen estructura similar y deben usar el mismo patrón.

### Solución
Cuando hay superficies con estructura similar (Mis cultivos ↔ Operaciones de la Finca, Facturero de Clientes ↔ Facturero de la Finca):
1. Identificar la superficie de referencia (la más antigua o más usada)
2. Replicar exactamente el mismo patrón de botones
3. Usar las mismas clases CSS (`btn-gold`, `btn-outline-gold`, etc.)

### Regla práctica
Antes de crear un botón nuevo, buscar en superficies hermanas qué clase usan. Replicar, no inventar.

---

## Lección 3: Sincronización hash ↔ estado interno

### Problema
Módulos que cambian subview internamente pero no actualizan el hash → el shell queda con `activeSubview` estancado.

### Ejemplo real
`agro-period-cycles.js` cambiaba `state.currentSubview` internamente (calendario → estadisticas), pero el shell nunca se enteraba. Al presionar Volver, el shell leía `activeSubview = 'calendario'` y regresaba al hub en lugar de Operaciones de la Finca.

### Solución
Cuando un módulo cambia subview internamente:
1. Actualizar `history.replaceState` con el hash correcto (`#view=period-cycles&subview=estadisticas`)
2. Esto sincroniza la URL con el estado real sin crear entradas de historial innecesarias
3. El back handler del shell debe leer el subview actual del hash (`hashParams.get('subview')`), no del `activeSubview` estancado

### Regla práctica
Si un módulo tiene subvistas internas, siempre sincronizar el hash con `history.replaceState` al cambiar de subview.

---

## Lección 4: Falsa propiedad semántica en copy

### Problema
Copy visible que dice "el período es dueño del registro" cuando solo agrupa temporalmente.

### Ejemplo real
Operaciones de la Finca tenía copy: "El período es dueño del registro; el cultivo refleja el costo." Esto contradice MANIFIESTO_AGRO.md §4.5.2, que establece que los movimientos generales pertenecen al Facturero de la Finca, no al período.

### Solución
Revisar todo copy visible que use palabras como:
- "dueño", "pertenece exclusivamente", "contiene"
- "es responsable de", "maneja", "controla"

Verificar contra el modelo de datos real (MANIFIESTO_AGRO.md) y corregir si hay falsa propiedad semántica.

### Regla práctica
Si el copy dice "X es dueño de Y", verificar que X realmente sea propietario en el modelo de datos, no solo un agrupador temporal o una vista.

---

## Lección 5: Categorías vacías del hub

### Problema
Dejar categorías del hub con 0 items después de mover todo.

### Ejemplo real
Después de mover "Operaciones de la Finca", "Estadísticas de períodos" y "Comparar períodos" fuera de la categoría "Ciclos de períodos", esa categoría quedó vacía en el hub.

### Solución
Eliminar completamente la categoría vacía, no dejar placeholder ni categoría con 0 items.

### Regla práctica
Si una categoría del hub tiene 0 items después de una reorganización, eliminarla por completo.

---

## Lección 6: Verificación de AGENT_REPORT_ACTIVE.md

### Problema
AGENT_REPORT_ACTIVE.md aparece en git status como modificado, pero no siempre es claro si es bitácora legítima o modificación indebida.

### Ejemplo real
En una sesión, AGENT_REPORT_ACTIVE.md apareció modificado. Al inspeccionar el diff, se encontró que era una entrada de bitácora del 2026-06-08 (sesión previa), no modificación de contenido preexistente.

### Solución
Antes de hacer commit:
1. Ejecutar `git diff apps/gold/docs/AGENT_REPORT_ACTIVE.md`
2. Si es una entrada de bitácora nueva al final del archivo → aceptar
3. Si es modificación de contenido preexistente → revertir con `git restore`

### Regla práctica
AGENT_REPORT_ACTIVE.md solo debe crecer por adición de entradas al final. Cualquier modificación de contenido preexistente debe revertirse.

---

## Lección 7: Asunciones sobre estructura de archivos

### Problema
Asumir que existen archivos separados cuando son subvistas internas.

### Ejemplo real
Se asumió que existían `agro-period-stats.js` y `agro-compare-periods.js` como archivos separados, pero en realidad eran subvistas internas de `agro-period-cycles.js`.

### Solución
Antes de planificar cambios:
1. Explorar el código real
2. Verificar qué archivos existen realmente
3. No asumir estructura basada en nombres de superficies

### Regla práctica
Siempre explorar el código antes de planificar cambios. Verificar qué archivos realmente existen, no asumir.

---

## Lección 8: Build gate obligatorio

### Problema
Commits sin build pasan código roto a producción.

### Ejemplo real
En sesiones previas, cambios que rompían el build fueron commiteados sin verificación, causando problemas en producción.

### Solución
Siempre ejecutar `pnpm build:gold` después de cambios, antes de commit.

### Regla práctica
Build fallido = no commit. Sin excepciones.

---

## Lección 9: Respeto de rutas hash

### Problema
Renombrar rutas hash rompe URLs existentes y favoritos.

### Ejemplo real
Al renombrar "Calendario operativo" a "Operaciones de la Finca", la ruta hash `#view=period-cycles` se preservó intacta. Solo cambió el label visible.

### Solución
Solo cambiar labels visibles, nunca la ruta hash en sí.

### Regla práctica
El nombre visible puede cambiar, la ruta hash no. Preservar `#view=period-cycles` aunque el label sea "Operaciones de la Finca".

---

## Lección 10: Verificación de navegación post-cambio

### Problema
Botones "Volver" que regresan al hub en lugar de la superficie padre.

### Ejemplo real
Después de reorganizar Operaciones de la Finca, los botones Volver en Estadísticas y Comparar períodos regresaban al hub (`#view=granja`) en lugar de Operaciones de la Finca (`#view=period-cycles&subview=calendario`).

### Solución
Después de reorganización de navegación:
1. Verificar manualmente que todos los botones Volver van a la superficie correcta
2. Probar el flujo completo: Superficie padre → Subvista → Volver → Superficie padre
3. Verificar tanto en desktop como en mobile

### Regla práctica
Después de cualquier cambio de navegación, probar manualmente el flujo Volver en todas las subvistas afectadas.

---

## Checklist rápido

Antes de cerrar cualquier sesión de trabajo en YavlGold, verificar:

- [ ] ¿Hice rename masivo? → Verificar residuos en HTML estáticos (Lección 1)
- [ ] ¿Creé botones nuevos? → Replicar patrón de superficies hermanas (Lección 2)
- [ ] ¿Cambió subview interna? → Sincronizar hash con `history.replaceState` (Lección 3)
- [ ] ¿Escribí copy nuevo? → Verificar falsa propiedad semántica (Lección 4)
- [ ] ¿Reorganicé el hub? → Eliminar categorías vacías (Lección 5)
- [ ] ¿AGENT_REPORT_ACTIVE.md aparece modificado? → Inspeccionar diff (Lección 6)
- [ ] ¿Planifiqué cambios sin explorar código? → Explorar primero (Lección 7)
- [ ] ¿Hice cambios de código? → Ejecutar `pnpm build:gold` antes de commit (Lección 8)
- [ ] ¿Cambié nombres de superficies? → Preservar rutas hash (Lección 9)
- [ ] ¿Reorganicé navegación? → Probar manualmente botones Volver (Lección 10)

---

## Origen de esta skill

Esta skill fue creada el 2026-06-11 durante una sesión de reorganización de navegación donde se movió "Operaciones de la Finca" bajo "Mis fincas y cultivos" en el hub Mi Granja. Durante esa sesión, se identificaron y corrigieron los 10 patrones de error documentados aquí.

El propósito es evitar que futuros agentes tropiecen con estos mismos errores.

---

© 2026 YavlGold · Skill: Patrones de Error Recurrentes
