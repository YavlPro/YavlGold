# Deuda Tipográfica V12 — Migración Pendiente

**Fecha de diagnóstico:** 2026-06-28
**Estado:** ACTIVO — documentación de deuda
**Canónico:** ADN Visual V12.0 §5

---

## Resumen

La landing page principal (`apps/gold/index.html`) fue migrada a la tipografía V12
(Plus Jakarta Sans + Inter) el 2026-06-28. Los archivos listados abajo **aún usan
Orbitron y Rajdhani** (fuentes deprecated según ADN V12 §5) y requieren migración
futura por módulo.

---

## Archivos con deuda tipográfica

### tokens.css
- **Ruta:** `apps/gold/assets/css/tokens.css`
- **Líneas:** 95, 98, 397
- **Tokens afectados:** `--font-heading` (Orbitron), `--font-body` (Rajdhani)
- **Nota:** La landing no usa estos tokens (usa `--font-brand`/`--font-ui` de landing-v10.css),
  pero deben actualizarse para consistencia global del proyecto.

### unificacion.css
- **Ruta:** `apps/gold/assets/css/unificacion.css`
- **Líneas:** 11, 12
- **Tokens afectados:** `--font-heading` (Orbitron), `--font-body` (Rajdhani)
- **Uso:** CSS compartido del dashboard principal. Cambiar afecta `dashboard/index.html`.

### dashboard.css
- **Ruta:** `apps/gold/assets/css/dashboard.css`
- **Líneas:** 165, 182, 197, 297, 306, 321, 366, 389, 471, 668
- **Tipo:** Hardcoded `'Orbitron'` y `'Rajdhani'` directamente en reglas CSS
- **Uso:** Estilos del dashboard general (no Agro).

### dashboard-v1.css
- **Ruta:** `apps/gold/assets/css/dashboard-v1.css`
- **Líneas:** 77, 78
- **Tokens afectados:** `--font-titulo` (Orbitron), `--font-cuerpo` (Rajdhani)
- **Uso:** Dashboard del usuario.

### docs-agro.css
- **Ruta:** `apps/gold/assets/css/docs-agro.css`
- **Líneas:** 33, 34
- **Tokens afectados:** `--font-heading` (Orbitron), `--font-body` (Rajdhani)
- **Uso:** Página de documentación de Agro.

### module-unavailable.css
- **Ruta:** `apps/gold/assets/css/module-unavailable.css`
- **Líneas:** 21, 66, 82, 115
- **Tipo:** Hardcoded `'Orbitron'` y `'Rajdhani'` en reglas de placeholder
- **Uso:** Módulos no disponibles (crypto, social, tecnología, academia).

### style.css
- **Ruta:** `apps/gold/assets/css/style.css`
- **Estado:** ✅ Migrado a Inter (body) el 2026-06-28
- **Nota:** Solo tiene hardcoded en body. El resto del archivo es trivial.

---

## Módulos Agro (ya migrados a V12)

Los siguientes archivos **ya usan Plus Jakarta Sans + Inter** correctamente:

| Archivo | Estado |
|---|---|
| `agro/index.html` | ✅ Google Fonts carga PJS + Inter |
| `agro/agro-dashboard-v11.css` | ✅ Usa Plus Jakarta Sans e Inter (26+ refs) |

---

## Criterio de migración

Migrar por módulo cuando se toque ese módulo por otros motivos.
No migrar en bloque para evitar regresiones visuales.
Prioridad: módulos visibles en producción > placeholders > archivos legacy.

---

## Regla canónica

Según ADN Visual V12.0 §5:

- **Plus Jakarta Sans** → títulos, eyebrows, labels, nombres de cultivo, chips de navegación, headers de bienvenida
- **Inter** → cuerpo, descripciones, datos numéricos, badges, botones, texto muted
- **Playfair Display** → citas editoriales únicamente
- **Orbitron** → DEPRECADA, prohibida en código nuevo
- **Rajdhani** → DEPRECADA, prohibida en código nuevo

---

© 2026 YavlGold · Deuda Tipográfica V12
