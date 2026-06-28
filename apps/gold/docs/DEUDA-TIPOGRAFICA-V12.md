# Deuda Tipográfica V12 — Migración Pendiente

**Fecha de diagnóstico:** 2026-06-28
**Última actualización:** 2026-06-28
**Estado:** ACTIVO — documentación de deuda
**Canónico:** ADN Visual V12.0 §5

---

## Resumen

Landing, páginas de footer, y Dashboard fueron migrados a la tipografía V12
(Plus Jakarta Sans + Inter) el 2026-06-28. El único archivo con deuda restante
es `module-unavailable.css`.

---

## Archivos con deuda tipográfica

### module-unavailable.css
- **Ruta:** `apps/gold/assets/css/module-unavailable.css`
- **Líneas:** 21, 66, 82, 115
- **Tipo:** Hardcoded `'Orbitron'` y `'Rajdhani'` en reglas de placeholder
- **Uso:** Módulos no disponibles (crypto, social, tecnología, academia).
- **Prioridad:** Baja — solo afecta páginas de placeholder, no producción activa.

---

## Archivos migrados (2026-06-28)

| Archivo | Commit | Nota |
|---|---|---|
| `index.html` (landing) | `449279e6` | Google Fonts + body |
| `landing-v10.css` | `449279e6` | Tokens `--font-brand`/`--font-ui` |
| `style.css` | `449279e6` | Body Inter |
| `tokens.css` | `fcf344f2` | `--font-heading`/`--font-body` |
| `trust-pages.css` (6 pages) | `fcf344f2` | Hereda de tokens.css |
| `docs-agro.css` | `fcf344f2` | Tokens propios |
| `unificacion.css` | `713f0e10` | `--font-heading`/`--font-body` |
| `dashboard-v1.css` | `713f0e10` | `--font-titulo`/`--font-cuerpo` |
| `dashboard.css` | `713f0e10` | 10 refs hardcoded |
| `dashboard/index.html` | `713f0e10` | Google Fonts + CSS vars + 12 refs inline |

---

## Módulos Agro (ya migrados a V12)

Los siguientes archivos **ya usan Plus Jakarta Sans + Inter** correctamente:

| Archivo | Estado |
|---|---|
| `agro/index.html` | ✅ Google Fonts carga PJS + Inter |
| `agro/agro-dashboard-v11.css` | ✅ Usa Plus Jakarta Sans e Inter (26+ refs) |

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
