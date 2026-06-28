# Deuda Tipográfica JS — Migración Pendiente

**Fecha de creación:** 2026-06-28
**Estado:** ACTIVO — documentación de deuda
**Canónico:** ADN Visual V12.0 §5
**Relacionado:** Migración CSS completada en commit `713f0e10`

---

## Resumen

Los 5 archivos CSS del hub de Agro fueron migrados a V12 (Plus Jakarta Sans + Inter).
Quedan **59 refs de Orbitron/Rajdhani** hardcodeadas en **11 archivos JS** como
inline styles (`style.cssText`, template literals). Estas refs no reciben el cambio
automático de los tokens CSS.

**Total de refs JS con Orbitron/Rajdhani:** 59
**Refs `font-family: inherit` (no requieren migración):** 19
**Refs `font-family: 'Courier New'` (monospace, no requieren migración):** 2

---

## Archivos afectados (por cantidad de refs)

| Archivo | Refs Orbitron/Rajdhani | Nota |
|---|---|---|
| `agro-clima.js` | 19 | Widget de clima — inline styles |
| `agro-agenda.js` | 13 | Agenda de tareas — inline styles |
| `agro-ia-wizard.js` | 9 | Wizard IA — algunos ya usan `var(--font-heading)` con fallback |
| `agro-wizard.js` | 4 | Wizard general — inline styles |
| `agro.js` | 4 | **MONOLITO** — requiere manejo estricto aparte (§3.1 AGENTS.md) |
| `agro-cart.js` | 2 | Carrito — inline styles |
| `agro-interactions.js` | 2 | Interacciones — inline styles |
| `agro-market.js` | 2 | Market ticker — inline styles |
| `dashboard.js` | 2 | Dashboard principal — inline styles |
| `agro-planning.js` | 1 | Planificación — inline styles |
| `agro-section-stats.js` | 1 | Stats — Chart.js font config |

**Total:** 59 refs en 11 archivos

---

## Detalle por archivo

### agro-clima.js (19 refs)
- Líneas: 347, 357, 375, 418, 428, 451, 457, 469, 489, 507, 540, 562, 570, 586, 607, 612, 652, 673, 694
- Tipo: `style="font-family: 'Orbitron', sans-serif"` y `font-family: 'Rajdhani', sans-serif`
- Fix: Reemplazar por `var(--font-heading)` / `var(--font-body)`

### agro-agenda.js (13 refs)
- Líneas: 1547, 1560, 1648, 1690, 1740, 1879, 2084, 2096, 2154, 2161, 2224, 2245, 2363
- Tipo: Inline styles en `style.cssText`
- Fix: Reemplazar por `var(--font-heading)` / `var(--font-body)`

### agro-ia-wizard.js (9 refs)
- Líneas: 362, 381, 387, 405, 433, 444, 465, 485, 531
- Tipo: `font-family: var(--font-heading, 'Orbitron', sans-serif)` — ya parcialmente mitigable
- Fix: Simplificar a `var(--font-heading)` / `var(--font-body)` (quitar fallback hardcoded)

### agro-wizard.js (4 refs)
- Líneas: 330, 536, 569, 645
- Tipo: Inline styles en template literals
- Fix: Reemplazar por `var(--font-heading)` / `var(--font-body)`

### agro.js — MONOLITO (4 refs)
- Líneas: 5368, 11910, 16573, 16611
- Tipo: Inline styles en `style.cssText`
- **⚠️ RESTRICCIÓN:** Ediciones quirúrgicas solamente (§3.1 AGENTS.md). Máximo 1-5 líneas por intervención.
- Fix: Reemplazar `'Rajdhani'` → `var(--font-body)` y `'Orbitron'` → `var(--font-heading)`

### agro-cart.js (2 refs)
- Líneas: 1706, 1715
- Tipo: Inline styles
- Fix: Reemplazar por `var(--font-heading)`

### agro-interactions.js (2 refs)
- Líneas: 259, 270
- Tipo: Template literals HTML
- Fix: Reemplazar `'Orbitron'` → `var(--font-heading)` y `'Rajdhani'` → `var(--font-body)`

### agro-market.js (2 refs)
- Líneas: 462, 466
- Tipo: Inline styles
- Fix: Reemplazar por `var(--font-body)` / `var(--font-heading)`

### dashboard.js (2 refs)
- Líneas: 132, 458
- Tipo: Inline styles
- Fix: Reemplazar `'Rajdhani'` → `var(--font-body)` y `'Orbitron'` → `var(--font-heading)`

### agro-planning.js (1 ref)
- Línea: 380
- Tipo: Inline style
- Fix: Reemplazar `'Orbitron'` → `var(--font-heading)`

### agro-section-stats.js (1 ref)
- Línea: 704
- Tipo: Chart.js font config `font: { family: 'Rajdhani', size: 12 }`
- Fix: Reemplazar `'Rajdhani'` → `'Inter'` (Chart.js no soporta var())

---

## Notas para migración futura

1. **agro.js (monolito):** Requiere ediciones quirúrgicas. No reescribir funciones completas.
   Máximo 1-5 líneas por intervención. Preferir hacerlo en una sesión dedicada.

2. **agro-ia-wizard.js:** Ya usa `var(--font-heading, 'Orbitron', sans-serif)` con fallback.
   Si se quita el fallback hardcoded, el JS hereda automáticamente de los tokens CSS.

3. **Chart.js (agro-section-stats.js):** Chart.js no soporta CSS custom properties.
   Requiere hardcodear `'Inter'` directamente.

4. **`font-family: inherit` (19 refs):** No requieren migración. Heredan del CSS padre.

5. **`font-family: 'Courier New'` (2 refs):** Monospace para precios/código. No migrar.

---

## Criterio de cierre

La deuda queda cerrada cuando:
- Todos los archivos JS migrados a `var(--font-heading)` / `var(--font-body)`
- agro.js migrado con ediciones quirúrgicas (no reescritura masiva)
- Build limpio después de cada migración parcial
- QA visual confirmado por Yerikson en producción

---

© 2026 YavlGold · Deuda Tipográfica JS
