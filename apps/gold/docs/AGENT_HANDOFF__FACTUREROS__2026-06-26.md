# AGENT_HANDOFF — Factureros Bug Fix
**Proyecto:** YavlGold Agro V1
**Fecha de sesión:** 2026-06-26
**Estado:** ⏸️ EN PAUSA — diagnóstico completo, corrección pendiente
**Documento producido por:** Claude Sonnet 4.6 (sesión de planificación)
**Diagnóstico producido por:** GLM 5.2 (sesión de ejecución técnica)

---

## Qué pasó en esta sesión

El usuario (Yerikson, creador y director técnico de YavlGold) reportó un conjunto de bugs críticos en los tres factureros del módulo Agro V1:

- **Facturero de la Finca** (`#view=facturero-finca`)
- **Facturero del Cultivo** (`#view=facturero-cultivo`)
- **Facturero Personal** (`#view=facturero-personal`)

Se ejecutó el proceso completo de diagnóstico en dos etapas:

1. **Claude** elaboró el plan de Fase 0 (diagnóstico) con los 6 pasos de auditoría, entregables esperados y restricciones de scope.
2. **GLM 5.2** ejecutó el diagnóstico técnico real sobre el código fuente, auditó `agroOperationalCycles.js` y produjo el reporte `FACTUREROS_BUG_REPORT.md`.

El diagnóstico está **100% completo**. Se identificaron **6 bugs** con causa raíz, líneas exactas, funciones afectadas y plan de corrección. **No se modificó ningún archivo de código.**

---

## Causa de la pausa

El plan de GLM 5.2 (agente ejecutor) venció durante esta sesión. Yerikson no tiene fondos disponibles en este momento para renovarlo. La pausa es económica, no técnica. El trabajo retomará cuando se renueve el acceso al agente.

---

## Estado exacto al momento de la pausa

| Fase | Estado |
|---|---|
| Fase 0 — Diagnóstico | ✅ Completo |
| Fase 1 — Corrección quirúrgica | ⏸️ Pendiente — plan listo, no iniciado |
| Fase 2 — Build y QA | ⏸️ Pendiente |

**No se tocó ningún archivo.** El repositorio está limpio.

---

## Documento de referencia obligatorio

Antes de ejecutar cualquier corrección, leer completo:

```
apps/gold/docs/FACTUREROS_BUG_REPORT.md
```

Este archivo contiene:
- los 6 bugs confirmados con número de línea exacto en `agroOperationalCycles.js`
- causas raíz
- tabla de trazado de funciones (líneas 21, 154-186, 174, 177-178, 1059-1091, etc.)
- alcance exacto de lo que sí y no debe tocarse

---

## Resumen de los 6 bugs confirmados

### Bug 1 — Mezcla en Vista General (🔴 crítico)
**Archivo:** `agroOperationalCycles.js` · líneas 3735-3745
**Función:** handler `MODE_CHANGE_EVENT`
**Causa:** Sobreescribe `state.familyFilter` a `FAMILY_ALL` sin respetar el `viewContext` del facturero activo. Cuando `familyFilter === FAMILY_ALL`, `filterCyclesByFamily` no filtra nada → todos los ciclos (finca + cultivo + personal) aparecen mezclados.

### Bug 2 — Cero registros al seleccionar finca + cultivo específico (🔴 crítico)
**Archivo:** `agroOperationalCycles.js` · líneas 2080-2090
**Función:** `filterCyclesByContext`
**Causa:** Filtro AND estricto (`matchesFarm && matchesCrop`) incompatible con el modelo de datos. Los ciclos de finca tienen `crop_id = null` por definición canónica → el AND siempre falla → cero registros.

### Bug 3 — Crear registro nuevo salta a Vista General mezclada (🔴 crítico)
**Archivo:** `agroOperationalCycles.js` · líneas 3217-3229 · 1205-1206 · 3507-3511
**Funciones:** `resetForm` · `normalizePayload` · handler `new-cycle`
**Causa:** El wizard no pre-carga el preset del facturero activo al crear. `createDraftValues` siempre inicializa `cropId: ''` y `farmId: ''`. El registro se guarda sin la asociación correcta y queda visible en todos los factureros por el Bug 1.

### Bug 4 — Facturero Personal en cero y mezclado al crear (🟠 derivado)
**Causa:** Confluencia de Bug 1 + Bug 3. El Personal debería mostrar solo `FAMILY_ORPHAN` pero `MODE_CHANGE` pisa `familyFilter` a `FAMILY_ALL`. No tiene root cause independiente; se resuelve al corregir los bugs 1 y 3.

### Bug 5 — Cero registros al recargar (F5) en cualquier facturero (🟠 alto)
**Archivo:** `agroOperationalCycles.js` · líneas 3883-3937 · 3409-3422; `agro.js:11364-11374`
**Causa doble:**
- **(5a)** Race condition: `VIEW_CHANGED_EVENT` se dispara antes de que el listener esté registrado (carga bajo demanda).
- **(5b)** Reset destructivo: cualquier error en `refreshData` vacía `state.datasets` completamente.

> **Nota sobre Bug 5:** `agro.js` se cita solo como fuente emisora del evento / contexto de carga. La corrección autorizada debe resolverse únicamente en `agroOperationalCycles.js` (hidratación, fallback, listener timing o relectura de estado), sin modificar `agro.js`.

### Bug 6 — Donaciones/Pérdidas cruzan frontera activos/cerrados (🟢 menor)
**Archivo:** `agroOperationalCycles.js` · líneas 2298 · 2321 · 2325
**Funciones:** `getDonationCycles` · `getLossCycles` · `getCyclesForSubview`
**Causa:** Consultan `getAllCycles()` (ambos datasets) en lugar del dataset correspondiente al subview activo.

---

## Plan de Fase 1 (listo para ejecutar)

El agente entrante debe aplicar los fixes en este orden estricto, con `pnpm build:gold` entre cada tramo:

- `Fix 1 → Build → QA mezcla Vista General`
- `Fix 2 → Build → QA cero al seleccionar finca + cultivo`
- `Fix 3 → Build → QA nuevo registro con preset correcto`
- `Verificación 4 → QA Facturero Personal aislado (bug derivado de 1 + 3)`
- `Fix 5 → Build → QA recarga F5 en los tres factureros`
- `Fix 6 → Build → QA tabs Donaciones/Pérdidas`

> **Nota sobre Bug 5:** aunque parte del diagnóstico menciona `agro.js` como emisor/contexto del evento, la corrección autorizada debe resolverse únicamente en `agroOperationalCycles.js`. No tocar `agro.js`.

**Archivo único a modificar:** `agroOperationalCycles.js`
**No modificar:** `agro.js` · `agro-shell.js` · `agro-mode.js` · `agro-facturero-clientes-*.js` · nada en `supabase/`
**No se requieren migraciones de base de datos.**

---

## Definición de cierre de Fase 1

La Fase 1 se considera cerrada solo si:

- los 6 bugs confirmados quedan corregidos o verificados como derivados
- `pnpm build:gold` pasa después de cada tramo relevante
- QA manual confirma:
  - Vista General no mezcla familias
  - seleccionar finca + cultivo no deja cero falsos
  - nuevo registro hereda preset correcto
  - Facturero Personal queda aislado
  - F5 restaura correctamente los tres factureros
  - Donaciones/Pérdidas respetan el subview activo

---

## Primeros pasos al retomar

1. Leer `apps/gold/docs/FACTUREROS_BUG_REPORT.md` completo
2. Leer `apps/gold/docs/MANIFIESTO_AGRO.md` §4.5
3. Leer `apps/gold/docs/FICHA_TECNICA.md` §7
4. Confirmar que el working tree sigue limpio
5. Empezar por **Bug 1** en `agroOperationalCycles.js` y correr `pnpm build:gold`

---

## Reglas críticas que el agente entrante debe respetar

1. Leer `FACTUREROS_BUG_REPORT.md` completo antes de editar.
2. Leer `MANIFIESTO_AGRO.md` §4.5 (separación estructural de factureros).
3. Leer `FICHA_TECNICA.md` §7 (reglas de desarrollo).
4. **`agro.js` está frozen para nuevas features** — los fixes van en `agroOperationalCycles.js`.
5. No tocar el **Facturero de Clientes** — está funcionando correctamente.
6. Ejecutar `pnpm build:gold` después de cada fix. Un build roto detiene la secuencia.
7. Reportar cada fix completado en `AGENT_REPORT_ACTIVE.md` con: líneas modificadas · qué cambió · resultado del build · resultado del QA.
8. Si aparece un bug nuevo no documentado en el reporte, detener y notificar al usuario antes de continuar.
9. No git automático — sugerir los comandos al final.

---

## Contexto del usuario

- **Usuario:** Yerikson — desarrollador y director creativo, La Grita, Táchira, Venezuela.
- **Rol del usuario en este proyecto:** propietario del ecosistema YavlGold, toma todas las decisiones arquitectónicas y semánticas.
- **Pipeline de trabajo habitual:** Claude (planificación + elicitación) → GLM 5.2 (ejecución) → validación manual del usuario.
- **Tono esperado:** directo, sin humo, sin inventar información. Si no sabes algo, decirlo.

---

## Lo que NO ocurrió en esta sesión (para evitar confusión)

- No se ejecutó ningún fix de código.
- No se hizo commit ni push.
- No se modificaron archivos de Supabase.
- No se tocó el Facturero de Clientes.
- No se crearon módulos nuevos.

---

*Documento generado al cierre de sesión 2026-06-26. Retomar desde aquí cuando el agente ejecutor esté disponible.*
