# AGENTS.md — Instrucciones Canónicas para Agentes IA

Fuente única de verdad para cualquier agente (Cascade, Codex, Copilot, etc.) que trabaje en este repo.
Release visible activa del producto: `V1`.
Las referencias a `V9.8` solo se conservan cuando están marcadas como históricas o cronológicas.

---

## §1 — Stack tecnológico obligatorio

| Capa | Definición | Prohibido |
| --- | --- | --- |
| Frontend | Vanilla JS (ES6+ Modules) | React, Vue, Svelte, Angular, Next, Nuxt, Astro |
| Build | Vite MPA | Webpack, Turbopack, migración a SPA |
| Backend | Supabase (Auth, DB, Storage, Edge Functions) | Firebase, otro BaaS sin aprobación |
| Estilo | CSS Custom Properties + clases utilitarias ligeras | Tailwind, CSS-in-JS, Styled Components |
| Tipografía | Google Fonts: Orbitron, Rajdhani, Playfair Display | Cambiar familias sin aprobación |
| Iconos | Font Awesome 6.5 | Otras librerías de iconos sin aprobación |

El script `agent-guard.mjs` bloquea React, Vue, Svelte, Angular, Next, Nuxt y Astro en el build. Si un agente instala alguno, el build fallará.

---

## §2 — ADN Visual V10.0 (referencia inmutable)

El sistema de diseño completo vive en `apps/gold/docs/ADN-VISUAL-V10.0.md`. Es **inmutable y obligatorio**.

### Reglas clave que NUNCA se violan

1. **Paleta**: 5-Tone Metallic System. Brand primary = `#C8A752` (`--gold-4`).
2. **Fondos**: Dark por defecto (`--bg-1: #0a0a0a`). Light mode por override de tokens.
3. **Tipografía**: Orbitron (headings), Rajdhani (body/UI), Playfair Display (quotes).
4. **Tokens antes de hardcode**: siempre `var(--token)`, nunca hex directo sin justificación.
5. **Sin acento azul/morado como brand**: azul solo para estado semántico `info`.
6. **Interacciones UI**: 120ms–220ms. Usar `opacity` y `transform`.
7. **`prefers-reduced-motion`**: siempre respetado.
8. **Ghost emojis**: opacity `0.02–0.05`, `pointer-events: none`.
9. **Breakpoints**: Desktop >900px, Tablet ≤900px, Mobile ≤768px, Small ≤480px.

### Anti-patrones prohibidos (§11 del ADN)

- Usar acento morado/azul como brand principal.
- Duplicar paletas por módulo.
- Romper jerarquía tipográfica sin motivo funcional.
- Usar componentes React/TSX.
- Introducir dependencias visuales pesadas.
- Hardcodear colores fuera de tokens.

---

## §3 — Arquitectura y organización de código

### 3.1 — Monolito Agro

- `apps/gold/agro/agro.js` es el monolito principal (~18k líneas). **No agregar features nuevas aquí**; crear módulos separados (`agro-*.js`) e importarlos dinámicamente.
- Ediciones quirúrgicas al monolito (bugfixes, 1–5 líneas de wiring) SÍ están permitidas.

### 3.2 — Módulos Agro existentes

```
agro.js              — monolito principal (facturero, CRUD, historial)
agro-feedback.js     — feedback y encuestas
agro-market.js       — inteligencia de mercado
agro-planning.js     — planificación
agro-interactions.js — interacciones
agro-stats.js        — estadísticas financieras
agro-notifications.js — notificaciones
agro-trash.js        — papelera de eliminados
agro-cart.js         — carrito
```

### 3.3 — Regla de imports

- Los módulos se importan dinámicamente en `agro/index.html` bootstrap.
- Para compartir funciones del monolito con módulos externos, usar `window._agroXxx` como puente.
- Imports deben ser siempre al inicio del archivo.

### 3.4 — CSS

- Estilos en archivos CSS separados (`agro.css`, `agro-dashboard.css`, etc.).
- Usar tokens del ADN Visual V10 (`--gold-4`, `--bg-1`, `--v10-*`, etc.).
- No inline styles masivos; preferir clases CSS.

---

## §4 — Documentación y reportes

| Archivo | Rol | Crece? |
| --- | --- | --- |
| `AGENTS.md` (este archivo) | Instrucciones canónicas para agentes | Solo con aprobación |
| `apps/gold/docs/AGENT_REPORT_ACTIVE.md` | Reporte operativo activo | Sí — cada sesión agrega sección |
| `apps/gold/docs/AGENT_REPORT.md` | Histórico legacy | No — solo consulta |
| `apps/gold/docs/ADN-VISUAL-V10.0.md` | Sistema de diseño inmutable | Solo con versionamiento formal |

### Jerarquía canónica obligatoria

- `AGENTS.md` es el único archivo canónico de instrucciones del repo.
- `AGENT.md` no debe existir ni recrearse.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md` es la única fuente activa de reportes de sesión.
- `apps/gold/docs/AGENT_REPORT.md` es solo histórico legacy.
- `AGENT_REPORT_ACTIVE.md` en la raíz, si existe, es solo un puntero de compatibilidad y no compite con la ruta activa.
- `global_rules.md` de Windsurf, si aparece, es solo copia operativa condensada y no fuente de verdad.

### Regla de cierre de sesión

Cada sesión de trabajo de un agente debe agregar una sección al final de `apps/gold/docs/AGENT_REPORT_ACTIVE.md` con:
- Fecha
- Diagnóstico
- Cambios aplicados (archivos + líneas)
- Build status
- QA sugerido

---

## §5 — Build y QA

### Build obligatorio

```bash
pnpm build:gold
```

Incluye: `agent-guard.mjs` (deps prohibidas) + `agent-report-check.mjs` (reporte activo) + `vite build` + `check-dist-utf8.mjs` (UTF-8).

### QA post-cambio

- Verificar que el build pasa sin errores.
- Para cambios de UI, probar en viewport desktop y mobile (≤480px).
- Para cambios de datos, verificar que estadísticas y exportes siguen correctos.
- Para cambios de auth/session, verificar login/logout flow.
- Si se usa Playwright para QA:
  - cerrar sesión/contexto/browser al terminar cada bloque de prueba;
  - borrar explícitamente la carpeta temporal usada por esa prueba en `%LOCALAPPDATA%\Temp\playwright-mcp-output\<session-id>`.

### Credenciales QA locales

- Para QA autenticada en produccion, los agentes pueden consultar `testqacredentials.md` en la raiz del repo **solo si existe localmente**.
- `testqacredentials.md` es un archivo local y sensible:
  - debe permanecer bajo `.gitignore`;
  - no debe copiarse a `AGENTS.md`, `AGENT_REPORT_ACTIVE.md`, issues, PRs ni otros archivos versionados;
  - se usa solo para pruebas reales de QA, nunca como credencial de desarrollo general.
- Si el archivo no existe o esta desactualizado, el agente debe pedir confirmacion al usuario antes de improvisar accesos o credenciales.

---

## §6 — Supabase

- Tablas usan soft-delete (`deleted_at` timestamp) como patrón estándar.
- Queries filtran `.is('deleted_at', null)` por defecto.
- RLS activo — siempre filtrar por `user_id`.
- Para cambios DDL, usar migraciones.
- Monedas soportadas: COP, USD, VES.

---

## §7 — Reglas de conducta del agente

1. **Leer antes de editar**: siempre leer el archivo antes de hacer cambios.
2. **Ediciones mínimas**: preferir cambios quirúrgicos. No reescribir funciones enteras para un bugfix.
3. **No crear archivos innecesarios**: no generar scripts temporales, tests sueltos, ni .md redundantes.
4. **No borrar comentarios existentes** salvo que el usuario lo pida.
5. **No agregar emojis al código** salvo que el usuario lo pida.
6. **Respetar el idioma**: UI en español. Código y logs en inglés o español según contexto existente.
7. **Build siempre al final**: cualquier sesión con cambios de código debe terminar con `pnpm build:gold`.

---

© 2026 YavlGold · AGENTS.md — Instrucciones Canónicas
