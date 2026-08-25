# SKILL — Formatter como última milla y artefactos de medición

**Fecha de creación:** 2026-08-25
**Última actualización:** 2026-08-25
**Autor:** Sesión BUG 3 (11 rondas + cierre en ronda 3)
**Alcance:** Universal para todo el proyecto YavlGold
**Modelo destacado:** ox alpha (OpenRouter, desconocido) — cerró causa raíz tras 11 rondas acumuladas

## Cuándo usar esta skill

- Cuando **todas las fuentes de datos leen bien** (fila SQL sana, bundle servido contiene los fixes, click log dispara, id correcto) pero la **pantalla miente** (label, default, resumen, blur muestran valor distinto).
- Cuando un bug sobrevive múltiples rondas de fixes sobre datos, deploy, cache y objeto-en-memoria.
- Cuando el repro del usuario describe comportamiento de **renderer** ("el cero se borra solo al hacer blur", "el valor cambia al salir del input", "el label no coincide con el campo superior").
- Cuando sospechas de un **formatter, clamp o writer** entre el valor y el DOM.

## Cuándo NO usar esta skill

- Cuando el dato en la base de datos está mal (eso es bug de datos, no de render).
- Cuando el bundle servido no contiene los fixes (eso es deploy-lag).
- Cuando el objeto que llega al handler no trae los campos (eso es bug de cache/query).
- Cuando el problema es de infraestructura (Vercel, Supabase, DNS).

## Contexto de origen

Esta skill nace del BUG 3 (modal "DE 1 KG" en fiado de 10 kg), que sobrevivió **11 rondas** de diagnóstico antes de cerrar. Cada ronda curaba una hipótesis plausible pero insuficiente:

| Ronda | Hipótesis curada | Resultado |
|---|---|---|
| 1 | Clamp en input | Insuficiente |
| 2 | Prioridad kg en `resolvePendingQuantity` | Insuficiente |
| 3 | Espejo de revert | Insuficiente |
| 4 | Deploy-lag (bundle viejo) | Refutado por extracción directa |
| 5 | Consola filtrada | Cazado como artefacto |
| 6 | Fetch-check al archivo equivocado | Cazado como artefacto (entry vs monolito) |
| 7 | Objeto cacheado incompleto | Curado con refetch defensivo, insuficiente |
| 8 | Drift de entorno (Node 25 vs 20) | Refutado por ejecución: hashes idénticos |
| 9 | Divergencia de fuentes del modal | Curada, insuficiente |
| 10 | Guard inerte del refetch | Ampliado |
| 11 | **Formatter `\.?0+$` como causa raíz** | **CERRADO** |

## Causa raíz final

**Archivo:** `agro.js:3777`
**Código corrupto:** `fixed.replace(/\.?0+$/, '')`
**Problema:** El `\.?` opcional se comía ceros significativos de enteros.
**Efecto:** 10→"1", 100→"1", 20→"2"
**Fix:** +3/−1 para recortar solo si hay punto decimal
**Validación por ejecución:** 10→"10", 100→"100", 2.50→"2.5", 0.5→"0.5"

## Las cuatro fuentes del modal de transferencia

Antes de fijar cualquier campo, trazar las cuatro fuentes y confirmar que leen el mismo valor:

| # | Fuente | Ubicación típica |
|---|---|---|
| (a) | Prefill del campo "CANTIDAD TOTAL FIADA" | `buildTransferMetaModal` |
| (b) | Label "(DE X)" runtime | `updateSplitPreview` vía `resolveQtyTotalDraft` |
| (c) | Default del input de cantidad | `buildTransferMetaModal` / `openTransferMetaModal` |
| (d) | Resumen / confirmación | `updateSplitPreview` → `computePendingSplitDraft` |

**Si tres fuentes leen 10 y una lee 1, el bug vive en la cuarta.** En el BUG 3, las tres primeras ya leían 10 correctamente tras la ronda 9; la cuarta caía al fallback `resolvePendingQuantity` que priorizaba `unit_qty` sobre `quantity_kg`.

## El renderer como última milla

**Regla central:** Trazar fuentes sin trazar el renderer es trazar la mitad del camino.

El formatter/corruptor puede estar en tres lugares:
1. **Al pintar:** convierte el valor sano en texto malo antes de escribirlo al DOM.
2. **Al re-parsear:** lee el DOM ya pintado y lo convierte de vuelta a número malo.
3. **Al clamppear:** un listener de blur/change reescribe el input con el valor ya corrupto.

En el BUG 3, el formatter estaba en los tres lugares: prefill pintaba "1", blur re-pintaba "1" vía el mismo formatter, y el resumen leía "1".

## Los tres artefactos de medición cazados

### 1. Fetch-check al archivo equivocado

**Síntoma:** El fetch-check reportaba `log: false | kg: false` aunque el bundle tenía los fixes.
**Causa:** `querySelector('script[src*="assets/agro-"]')` devolvía el **entry chunk** (21 KB) en vez del **monolito** (520 KB) importado dinámicamente.
**Lección:** En MPA con imports dinámicos, verifica qué archivo lee tu instrumentación. Entry ≠ monolito.

### 2. Consola filtrada

**Síntoma:** "El log no apareció" tras el click.
**Causa:** Filtro de consola activo con "51/52 hidden".
**Lección:** Consola filtrada = evidencia nula. QA de bugs con consola en "Default levels" y sin filtros.

### 3. Hash distinto ≠ código viejo

**Síntoma:** Hashes locales ≠ hashes servidos, asumido como "bundle viejo".
**Causa:** Drift de entorno de build (Node versión, timestamp, path absolutos).
**Lección:** Verifica por contenido, no por nombre ni hash. Extracción directa del chunk servido + comparación carácter por carácter con HEAD.

## El repro del usuario como arma

El descubrimiento decisivo del BUG 3 fue una observación de usuario de dos segundos:

> "Tipo 10, click afuera del input, y queda 1."

Ese gesto (blur del input) era el momento exacto en que el formatter corrupto ganaba. Ningún agente lo había trazado porque todos miraban las fuentes, no el renderer.

**Lección:** Cuando el bug sobrevive múltiples rondas, pide al usuario el gesto mínimo que lo reproduce. Su ojo ve lo que ocho rondas de hipótesis no vieron.

## Checklist defensivo para bugs de render

Antes de declarar un bug de cantidad/monto/label como "cerrado":

- [ ] ¿Las cuatro fuentes del modal leen el mismo valor?
- [ ] ¿El formatter entre el valor y el DOM recorta/redondea/clampea?
- [ ] ¿Existe un listener de blur/change que reescribe el input?
- [ ] ¿El repro del usuario incluye un gesto (blur, hover, focus) que dispare el writer?
- [ ] ¿Hay un segundo input oculto con valor distinto al visible?
- [ ] ¿El valor sano llega al DOM pero se corrompe al re-parsear?

## Lección reutilizable final

**Tratar fuentes sin tratar el renderer es tratar la mitad del camino.**

Cuando dato, id, bundle y objeto están sanos, el defecto vive en la última milla: el render que nadie trazó. Y esa última milla se caza con una línea de regex, no con ocho rondas de hipótesis.

## Referencias cruzadas

- BUG 3 cerrado en `AGENT_REPORT_ACTIVE.md` sección correspondiente al 2026-08-23
- Commit de cierre: `fix(clientes): formatter de cantidades conserva ceros significativos de enteros (BUG 3 causa raiz)`
- Skill relacionada: `SKILLS/2026-06-11-PATRONES-ERROR-YAVLGOLD.md` (patrones generales de error)

© 2026 YavlGold · Skill universal del proyecto
