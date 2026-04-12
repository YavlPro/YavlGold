# Agro Module — Visual Audit V1

**Fecha:** 2025-01-XX  
**Referencia inmutable:** ADN Visual V10.0  
**Stack auditado:** Vanilla JS + Vite MPA + CSS Custom Properties  
**Superficie auditada:** 11 vistas / 16 archivos CSS / ~14k lineas de estilo

---

## 1. Diagnostico Visual Integral

### 1.1 Fortalezas actuales

- **Paleta metalica aplicada consistentemente.** Los 5 tonos del metallic system (`--gold-1` a `--gold-5`) se usan en la gran mayoria de superficies. No hay desvios de color brand criticos.
- **Tipografia correcta.** Orbitron (headings/labels), Rajdhani (body/UI), Playfair Display (disponible pero subutilizada). Las tres familias estan cargadas y se usan donde corresponde.
- **Dark-first respetado.** `--bg-1: #0a0a0a` como fondo base, gradientes sutiles de cards con `bg-3`/`bg-4`. No hay fondos claros fuera de lugar.
- **Animaciones con sentido.** `borderShimmer`, `metallicShift`, `breathe`, `fadeInUp` son correctas en duracion (3-6s), usan `transform`/`opacity`, y todas tienen `prefers-reduced-motion: reduce`.
- **Ghost emoji presente.** `body::after` con wheat emoji a opacity 0.03, pointer-events none. Cumple la especificacion.
- **Responsive breakpoints alineados.** Se usan consistentemente 900px, 768px, 480px en todas las familias CSS.
- **Cards con metallic border shimmer.** Las `::before` con gradiente metalico animado estan presentes en cycle cards, task cards, period cards, operational cards y tx-cards.
- **Tokens centralizados.** `agro-tokens.css` define la fuente canonica de color, tipografia, sombras y radios.

### 1.2 Debilidades criticas

| # | Problema | Severidad | Superficie afectada |
|---|---------|-----------|-------------------|
| D1 | **Tokens duplicados en agrociclos.css** | Alta | Ciclos de cultivos |
| D2 | **Inconsistencia de spacing tokens** | Alta | Todas las vistas |
| D3 | **Densidad excesiva en Operacion Comercial** | Alta | Operations, financial tabs |
| D4 | **Cards sin jerarquia visual clara** | Media-Alta | Dashboard, ciclos, stats |
| D5 | **Modales con estilos legacy heterogeneos** | Media | Lunar, Market, New Crop |
| D6 | **Header shell demasiado denso en mobile** | Media | Shell header global |
| D7 | **Overflow de contenido en cards financieras** | Media | TX cards, financial tabs |
| D8 | **Falta de consistencia en padding de cards** | Media | Cross-module |
| D9 | **Animaciones redundantes y superpuestas** | Baja-Media | Dashboard, ciclos |
| D10 | **Playfair Display completamente ausente** | Baja | Toda la app |

### 1.3 Incoherencias entre superficies

- **agrociclos.css redefine toda la paleta** (`--gold-1` a `--gold-5`, backgrounds, typography, borders, radius, shadows, metallic gradients) dentro de `.agro-cycles`, duplicando exactamente lo que `agro-tokens.css` ya define. Esto crea un island of tokens que no heredara cambios globales.
- **Spacing inconsistente:** `agro-index-critical.css` define `--spacing-xs: 0.5rem` a `--spacing-2xl: 3rem`, pero los modulos nuevos (period-cycles, task-cycles, operational-cycles, cartera-viva) usan valores hardcodeados (`0.85rem`, `0.95rem`, `0.72rem`, etc.) sin mapear a tokens.
- **Radius inconsistente:** Tokens definen `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-pill: 9999px`. Pero `agro-task-cycles.css` usa `18px` y `14px` hardcodeados. `agro-operations.css` usa `14px` y `18px` directamente.
- **Tres sistemas de cards coexisten:**
  1. `.card` en `agro-index-critical.css` (glassmorphism, blur, hover translateY -4px)
  2. `.agro-dash-card` en `agro-dashboard.css` (grid layout, specific padding, no blur)
  3. `.agro-*-panel` / `.agro-*-card` en modulos nuevos (consistent subtle gradient, gold border, box-shadow stack)
- **Dos sistemas de botones:**
  1. `.btn` / `.btn-primary` / `.btn-outline` / `.btn-gold` en critical CSS
  2. Botones custom inline en cada modulo (`.agro-task-refresh-btn`, `.ops-cultivo-chip`, `.financial-tab-btn`)

---

## 2. Taxonomia de Problemas

### 2.1 Densidad y respiracion visual

**Diagnostico:** Los modulos mas nuevos (Operational Cycles, Task Cycles, Period Cycles, Cartera Viva) tienen una densidad de informacion correcta gracias a gaps sistematizados. El problema esta en las zonas legacy del monolito: la seccion de Operacion Comercial dentro del facturero acumula header + crop chips + financial tabs + tx-cards + totales en un espacio vertical muy comprimido.

**Evidencia concreta:**
- `agro-operations.css` L202-216: `.financial-operations-card` tiene padding `0.84rem 0.92rem 0.94rem` y gap `0.66rem` — correcto pero las subsecciones internas (`.ops-context-steps`, `.ops-cultivos-panel`) usan padding tan bajo como `0.42rem 0.54rem`.
- `tx-cards-v2.css` L56: `.tx-card` padding `0.875rem 1rem` con margin-bottom `0.5rem` — demasiado apretado para el volumen de informacion que contiene (avatar + body + amount + footer + actions).
- `agro-index-critical.css` L776: `.financial-operations-card` margin-top `0.75rem` — insuficiente separacion del header del modulo.

**Donde respira bien:**
- Dashboard guide card: padding `var(--spacing-lg)` = `1.5rem`, gaps claros.
- Period cycles: gap `1rem` entre cards, padding `1rem` interno.
- Task cycles panels: gap `0.95rem`, padding `0.95rem`.

### 2.2 Jerarquia de informacion

**Diagnostico:** La jerarquia tipografica esta parcialmente definida pero no hay un sistema maestro documentado. Cada modulo recrea su propia escala de eyebrows, titles, subtitles y labels.

**Evidencia:**
- Eyebrow font-size varia: `0.54rem` (ops), `0.66rem` (task-cycles), `0.68rem` (period-cycles), `0.72rem` (cartera-viva).
- Title clamp varia: `clamp(1.05rem, 2.2vw, 1.35rem)` (period), `clamp(1rem, 2.2vw, 1.25rem)` (task), `clamp(1.2rem, 3vw, 1.6rem)` (ops module), `clamp(1.15rem, 2.2vw, 1.65rem)` (cartera-viva).
- No hay un "heading level system" que mapee H1-H4 a tamanios concretos. Cada modulo inventa su escala.

### 2.3 Sistema de cards

**Diagnostico:** Existen al menos 5 familias de cards sin un contrato visual unificado.

| Familia | Archivo | Background | Border | Padding | Shadow | Hover |
|---------|---------|-----------|--------|---------|--------|-------|
| `.card` (legacy) | critical.css | rgba(26,26,26,0.7) + blur | `--border-subtle` | `var(--spacing-lg)` | Hover stack | translateY(-4px) |
| `.agro-dash-card` | dashboard.css | Gradient gold 6% + bg-3 | `--border-gold` | Varies | 0 16px 32px | translateY(-2px) |
| `.agro-*-panel` | task/period/ops | Gradient gold 6% + 135deg glass + bg-3 | `--border-gold` | 0.85-0.95rem | 0 16px 32px + inset | border-color change |
| `.tx-card` | tx-cards-v2.css | bg-3 | `--border-neutral` | 0.875rem 1rem | Hover gold-xs | border-color change |
| `.cycle-card` | agrociclos.css | bg-4 | color-mix gold 16% | 0.65rem header | fadeInUp + hover | translateY(-1px) |

**Problema central:** El usuario no percibe "familia" entre estas cards. Vistas distintas parecen apps distintas.

### 2.4 Headers de seccion

**Diagnostico:** Cuatro patrones de header coexisten:

1. **Dashboard header** (`agro-dash-header`): Kicker + title (section-title with ::before bar) + subtitle + controls. Ancho, con separator metalico.
2. **Module header** (`.module-header` en ops): Icon box 42px + title (metallic gradient text) + subtitle + actions. Compacto.
3. **Panel head** (task/period/operational): Eyebrow + title + copy. Sin icon box, sin decoracion metalica.
4. **Cartera Viva header** (`cartera-viva-view__header`): Eyebrow + title + subtitle + actions. Grid-based.

No existe un componente `<SectionHeader>` reutilizable.

### 2.5 Navegacion y sidebar

**Diagnostico:** El sidebar es visualmente solido. Links con metallic active state, sublinks con nested indentation, focus-visible con focus-ring correcto, accordion toggle con chevron animado. Funciona bien en mobile con overlay transform.

**Problema menor:** El toggle button (46x46px) cumple touch target minimo, pero el sidebar backdrop no tiene transicion de opacidad documentada en la CSS visible (podria estar en JS).

### 2.6 Experiencia mobile

**Diagnostico parcial:**
- **Breakpoints correctos:** 900px, 768px, 480px aplicados en todos los modulos.
- **Grids collapsan:** 4-col -> 2-col -> 1-col en stats, summary cells, filters.
- **Header mobile:** Fix reciente documentado en AGENT_REPORT_ACTIVE para flex-wrap en Cartera Operativa.
- **Font sizes:** Los clamp() values aseguran legibilidad minima en mobile.
- **Gaps no se reducen en mobile:** La mayoria de modulos mantienen los mismos gaps en todos los breakpoints. En pantallas de 320-375px, gaps de 1rem pueden ser excesivos para la relacion contenido/viewport.

**Problema critico mobile:** El `.financial-operations-card` y sus financial-tabs no tienen scroll-snap styling en mobile real (el scrollbar es custom pero el snapping no funciona consistentemente).

### 2.7 Exposicion y curacion de contenido

**Diagnostico:** El dashboard muestra demasiada informacion sin priorizar. La seccion "Pulso del dia" tiene solo 2 nav-cards (Clima y Mercados) pero conceptualmente podria incluir un snapshot de cultivos activos y tareas pendientes. En cambio, la seccion de estadisticas globales tiene un toggle colapsable (`gstats-toggle-btn`) que esconde toda la informacion financiera — buena decision de curacion.

**Problema:** El "Arranque rapido del dia" (guide card) tiene 5 pasos como botones horizontales que en mobile se wrappean a multiples lineas. No hay priorizacion visual de cual paso es mas relevante.

---

## 3. Auditoria Pantalla por Pantalla

### 3.1 Dashboard Agro

**Archivo:** `agro-dashboard.css` + seccion en `index.html` L489-589  
**Prioridad de intervencion:** Media

**Estado actual:**
- Header con kicker/title/subtitle bien jerarquizado.
- Guide card ("Arranque rapido") funcional pero visualmente plano.
- 2 nav-cards (Clima, Mercados) como botones de navegacion con arrow.
- Modales legacy para Lunar y Market en `agro-index-critical.css`.

**Problemas especificos:**
1. **Guide steps sin diferenciacion visual.** Los 5 botones `.agro-guide-step` son identicos visualmente. El step 1 (Crear cultivo) deberia tener mas prominencia como CTA principal.
2. **Boardline separator vacio.** La seccion "Pulso del dia" / "Resumen rapido" es solo texto sin contenido dinamico real visible en el HTML.
3. **Nav-cards limitadas.** Solo 2 cards (Clima, Mercados). Faltan snapshots de cultivos activos, tareas pendientes, o balance rapido.
4. **Hidden containers.** `weather-conditions`, `weather-humidity`, `moon-phase`, `market-ticker-track`, `clima-weekly-host` estan `hidden`. No claro si son rendered en algun punto.

**Veredicto:** El dashboard cumple su rol de landing, pero es subutilizado como centro de control. No hay KPIs visibles al llegar.

### 3.2 Mi Perfil

**Archivo:** `agro.css` (secciones perfil-*) + `index.html` L239-487  
**Prioridad de intervencion:** Baja-Media

**Estado actual:**
- Hero section con avatar, greeting, name, email y edit button.
- Privacy strip con toggle.
- Grid de 6 profile cards (Finca, Ubicacion, Telefono, WhatsApp, Instagram, Facebook).
- Bio section colapsable.
- Inline form con editor guiado wizard + legacy fallback `<details>`.
- Public profile opt-in section.
- Quick navigation buttons (Dashboard, Mis Cultivos, Finalizados).

**Problemas especificos:**
1. **Doble editor.** El wizard guiado y el "editor clasico temporal" dentro de `<details>` son redundantes. El legacy deberia eliminarse o marcarse como deprecated.
2. **Profile cards sin hover state documentado en CSS.** Las `.perfil-card` no tienen hover definido en los archivos CSS visibles (podria estar en `agro.css` main body).
3. **Action buttons al final.** Los 3 botones de navegacion rapida son utiles pero estan al final de un scroll largo con el formulario.

**Veredicto:** Funcionalmente completo. El wizard es un buen patron. La solucion dual (wizard + legacy) crea ruido visual.

### 3.3 Ciclos de Cultivos — Activos

**Archivo:** `agrociclos.css` + `agro-index-critical.css` (crops-grid, crop-card-*) + `index.html` L618-641  
**Prioridad de intervencion:** Alta

**Estado actual:**
- Module header con icon (seedling emoji), title "Ciclos de cultivos", subtitle, "+ Nuevo Cultivo" button.
- Privacy strip con 2 toggles (Ocultar nombres, Ocultar montos).
- Grid de crop cards con responsive 1-2-3 columns.
- Each card: header (icon + name + variety + status badge), progress bar, meta grid (2x2).

**Problemas especificos:**
1. **Token island en agrociclos.css.** Lineas 28-71 redefinen TODA la paleta (gold-1 a gold-5, bg-0 a bg-4, text-*, border-*, radius-*, shadow-*, text scale, metallic gradients) dentro de `.agro-cycles`. Esto es un **anti-patron critico**: si los tokens globales cambian, esta vista no se actualiza.
2. **Dos sistemas de cycle cards.** `agrociclos.css` define `.cycle-card` con su propio sistema (card-header, card-body, crop-info, status-badge, etc.). `agro-index-critical.css` define `.crop-card-header`, `.crop-info`, `.crop-icon`, `.crop-name`, `.crop-status` con diferente naming y estructura. No es claro cual se renderiza.
3. **Progress bar shimmer excesivo.** `.progress-fill::after` tiene una animacion `shimmer 2.5s infinite` que es visualmente agresiva para un elemento que podria ser estatico la mayor parte del tiempo.
4. **Cards con max-width implicito.** `.cycles-list` en agrociclos.css tiene `max-width: 960px` + `margin-inline: auto` lo que centra el grid pero puede crear espacios vacios laterales en viewports anchos.

**Veredicto:** Vista funcional pero con deuda tecnica critica en tokens. Necesita consolidacion urgente.

### 3.4 Ciclos de Cultivos — Finalizados

**Archivo:** `index.html` L643-668  
**Prioridad de intervencion:** Media

**Estado actual:**
- Overview card con eyebrow "Lectura de cierre", title, subtitle.
- 3 overview stat cards: Finalizados, Perdidos, Auditoria.
- Slot `#agro-cycles-history-slot` para JS-rendered content.

**Problemas especificos:**
1. **Overview card styling.** Las `.agro-cycle-overview__card` no tienen CSS visible en los archivos leidos. Probablemente en `agro.css` o rendered by JS.
2. **"Perdidos" card.** `.agro-cycle-overview__card--lost` modifier — good pattern but styling not confirmed.
3. **Empty slot.** Si no hay ciclos finalizados, el slot queda vacio sin empty state documentado en HTML.

**Veredicto:** Estructura correcta, necesita verificar rendering de cards y empty state.

### 3.5 Ciclos de Cultivos — Comparar y Estadisticas

**Archivo:** `index.html` L670-804  
**Prioridad de intervencion:** Media

**Estado actual:**
- **Comparar:** Empty state con title "Comparar ciclos" y loading copy. Root `#agro-cycle-compare-root` — JS rendered.
- **Estadisticas:** Collapsible panel con toggle button. Inside: crops grid (4 stat cards: Activos, Finalizados, Perdidos, Total), financial summary (8 money rows), top buyers/crops lists, export buttons.

**Problemas especificos:**
1. **Stats panel collapsible by default.** El `gstats-body` esta `hidden`. Esto es una buena decision de curacion, pero el toggle button deberia tener una indicator visual clara de que hay contenido dentro.
2. **Money grid es un list layout, no un grid.** Las `.gstats-money-row` son flex rows — correcto para esta data, pero el nombre sugiere grid.
3. **Export buttons.** Dos export buttons (Global MD, Detailed MD) — buena funcionalidad, styling deberia ser secondary/outline.

**Veredicto:** Bien curado. El toggle pattern es correcto. Las stats internas son densas pero apropiadas para un panel expanded.

### 3.6 Operacion Comercial (Facturero)

**Archivo:** `agro-operations.css` + `tx-cards-v2.css` + `agro-index-critical.css` (financial-*)  
**Prioridad de intervencion:** Alta

**Estado actual:**
- Module header con icon, metallic gradient title, subtitle, actions.
- Financial operations card container with: kicker, title, subtitle, total display, toolbar with actions.
- Context steps (2-column grid): crop selector + viewer panel.
- Financial tabs (horizontal pill scroll).
- TX cards (avatar + body + amount + footer + actions trigger).
- Header swap for Carrito and Rankings views.

**Problemas especificos:**
1. **Extrema densidad.** La financial-operations-card empaqueta: header (eyebrow + title + subtitle + total), toolbar (label + actions row), context steps (2 blocks with crop chips and viewer), financial tabs, y tx-card list. Todo en padding ~0.84rem.
2. **Font sizes microscropicas.** Kicker `0.54rem`, toolbar-label `0.52rem`, step-label `0.54rem`. En pantallas reales, esto esta al limite de legibilidad.
3. **`!important` cascade.** `tx-cards-v2.css` usa `overflow: visible !important` en 6 selectores. Esto sugiere un conflicto de cascade que se resolvio con fuerza bruta en lugar de arreglar la especificidad.
4. **Crop chips con scroll horizontal.** `.ops-cultivos-chip-row` tiene `overflow-x: auto` lo cual es correcto para muchos cultivos, pero no hay indicadores visuales de que hay mas chips fuera del viewport.
5. **Two-column context steps.** En desktop (>768px), la grid `minmax(0, 1.08fr) minmax(0, 0.92fr)` funciona. En mobile, deberia colapsar a 1 columna — verificar si `@media (max-width: 768px)` existe para esto.

**Veredicto:** La vista mas densa y compleja de todo Agro. Necesita intervencion de respiracion urgente. Funcionalidad rica pero la presentacion esta comprimida.

### 3.7 Ciclos de Periodo

**Archivo:** `agro-period-cycles.css`  
**Prioridad de intervencion:** Baja

**Estado actual:**
- Module header (reuses `.module-header` from ops).
- Family overview: 2-column grid (copy + stat cards grid).
- Period cycle cards: head (title + badges), progress bar, snapshot (2-col), summary (4-col), groups (2-col), movement list.
- Empty/loading states.
- Modal dialog.
- All responsive breakpoints present.
- `prefers-reduced-motion` respected.

**Problemas especificos:**
1. **Correct implementation.** Este es el modulo mas visualmente coherente. Usa tokens globales, tiene responsive correcto, cards con estructura consistente.
2. **Padding variance.** Cards: `1rem`, dialog: `1.15rem`, overview copy: `1rem 1.05rem` — minor inconsistency.
3. **Status badges use color-mix.** Good modern CSS, but not available in Safari <15. Verify target browser support.

**Veredicto:** Modelo a seguir para el resto de modulos. Minima intervencion necesaria.

### 3.8 Ciclos de Tareas

**Archivo:** `agro-task-cycles.css`  
**Prioridad de intervencion:** Baja

**Estado actual:**
- Shell header with eyebrow, tabs.
- Stats grid (4 columns).
- Filter stack with range pills (module + status).
- Day-grouped task cards.
- Task card: head (title + eyebrow), pills, body (fact cards), notes, actions.
- Breakdown cards.
- Impact grid.
- Form modal with grid layout.
- All responsive, prefers-reduced-motion.

**Problemas especificos:**
1. **Hardcoded radius.** `18px` and `14px` used directly instead of `--radius-lg` (16px) or `--radius-md` (12px). Minor visual drift.
2. **Feedback component.** `.agro-task-feedback` uses `16px` radius directly. Should use token.
3. **Loading shimmer well-implemented.** `agroTaskShimmer` animation is clean.

**Veredicto:** Solido. Same family visual as Period Cycles. Necesita alineacion menor de radius tokens.

### 3.9 Clima Agro

**Archivo:** No tiene CSS propio visible. Rendered by `agro-clima.js` into `#agro-clima-root`.  
**Prioridad de intervencion:** Requiere inspeccion de JS rendering.

**Estado actual:** Empty container `<div id="agro-clima-root" class="agro-clima-root">` — all content JS-rendered.

**Problemas potenciales:**
- Sin CSS dedicado visible, los estilos podrian estar inline o en `agro.css` (file is very large, ~8000+ lines).
- Dependencia en estilos globales del critical CSS para cards y grids.

**Veredicto:** No auditable completamente sin ver el rendered output. Necesita inspeccion en runtime.

### 3.10 Herramientas

**Archivo:** Secciones en `agro.css` (tool cards), rendered dynamically.  
**Prioridad de intervencion:** Baja-Media

**Estado actual:** `.agro-tool-card__eyebrow`, `.agro-tool-card__title`, `.agro-tool-card__copy` share styling with sidebar via grouped selectors in `agro.css`.

**Veredicto:** Limited audit without runtime. Follows shared patterns.

### 3.11 Bitacora (Repo)

**Archivo:** `agro-repo.css`  
**Prioridad de intervencion:** Baja

**Estado actual:**
- Self-contained widget (`#agro-widget-root`) with own token aliases (`--agrp-*`).
- Full app layout: sidebar (300px) + main + editor.
- Diamond background decoration.
- Glass backdrop filter.
- Mobile responsive with sidebar overlay.

**Problemas especificos:**
1. **Token aliasing is excessive.** 20+ custom properties (`--agrp-gold`, `--agrp-text`, `--agrp-border`, etc.) that just map to global tokens. This adds a layer of indirection without clear benefit.
2. **App height is fixed.** `min-height: 680px; height: min(82vh, 860px)` — this creates a fixed-height widget that doesn't flow with the page. May cause double scrollbars.

**Veredicto:** Self-contained and visually consistent. The token aliasing could be simplified.

### 3.12 Modales Legacy (Lunar, Market, New Crop)

**Archivo:** `agro-index-critical.css` L436-696  
**Prioridad de intervencion:** Media

**Estado actual:**
- Lunar modal: Split view (calendar grid + side panel). Full `agro-inline-modal-surface` with metallic borders.
- Market modal: Header + tabs (Crypto/Fiat) + scrollable content.
- New Crop modal: Standard form with field blocks, currency row, icon input.

**Problemas especificos:**
1. **Legacy naming.** Comments say "DNA Visual V9.8" — these haven't been updated to V10 nomenclature.
2. **Fixed heights.** Lunar modal `height: 85vh`, Market content `height: 400px` — rigid layouts.
3. **Close buttons inconsistent.** `.agro-modal-inline-close` vs `.modal-close` vs `.agro-new-crop-modal__close`.
4. **Lunar modal not responsive.** The split view (calendar + side panel) doesn't have a mobile collapse visible in the CSS.

**Veredicto:** Functional but architecturally dated. Need responsive treatment for Lunar modal especially.

---

## 4. Sistema Maestro de Jerarquia

### 4.1 Escala tipografica propuesta

Basada en los tamanios existentes que mejor funcionan, consolidados en un sistema coherente:

| Token | Size | Use | Font |
|-------|------|-----|------|
| `--type-page-title` | `clamp(1.3rem, 3vw, 1.65rem)` | Page-level headings (Dashboard Agro, Ciclos de Cultivos) | Orbitron 900 |
| `--type-section-title` | `clamp(1.05rem, 2.2vw, 1.35rem)` | Section titles within a page (Arranque rapido, Resumen) | Orbitron 700 |
| `--type-card-title` | `clamp(0.95rem, 2vw, 1.1rem)` | Card-level titles | Orbitron 700 |
| `--type-eyebrow` | `0.66rem` | All eyebrow/kicker labels | Orbitron 700, letter-spacing 0.14em, uppercase |
| `--type-body` | `0.92rem` | Body text, descriptions | Rajdhani 400/600 |
| `--type-body-sm` | `0.82rem` | Secondary descriptions, meta | Rajdhani 400 |
| `--type-label` | `0.72rem` | Form labels, stat labels, small meta | Orbitron 700, letter-spacing 0.08em, uppercase |
| `--type-caption` | `0.68rem` | Badges, pills, timestamps | Orbitron 600 |
| `--type-quote` | `1.05rem` | Blockquotes, highlight copy | Playfair Display 400 italic |

### 4.2 Reglas de spacing

| Token | Value | Use |
|-------|-------|-----|
| `--gap-section` | `1.5rem` | Between major page sections |
| `--gap-card` | `1rem` | Between cards in a grid |
| `--gap-internal` | `0.75rem` | Between elements inside a card |
| `--gap-tight` | `0.45rem` | Between closely related elements (label + value) |
| `--pad-card` | `1rem` | Card internal padding |
| `--pad-card-compact` | `0.85rem` | Compact card padding (lists, sub-panels) |
| `--pad-section` | `1.25rem` | Section/panel padding |
| `--pad-modal` | `1.35rem` | Modal dialog padding |

### 4.3 Jerarquia de prominencia de cards

| Nivel | Nombre | Uso | Visual |
|-------|--------|-----|--------|
| **P1 — Hero** | Unique per page | Overview panels, main summary | Gold border, gold gradient top, shadow-lg, metallic shimmer |
| **P2 — Primary** | Key actionable cards | Cycle cards, task cards, Cartera buyers | Gold border, subtle gradient, shadow-md, hover translate |
| **P3 — Secondary** | Stats, metrics, facts | Summary cells, stat cards, fact cards | Neutral border, bg-3, no gradient, shadow-sm |
| **P4 — Inline** | Embedded content | Movement items, breakdown rows, chip rows | Neutral border, transparent bg, no shadow |

### 4.4 CTAs y acciones

| Tipo | Uso | Visual |
|------|-----|--------|
| **Primary CTA** | "Nuevo Cultivo", "Guardar", "Crear" | Gold gradient bg, dark text, pill radius, shadow, hover glow |
| **Secondary CTA** | "Exportar", "Ver mas", filter toggles | Gold outline border, gold text, transparent bg |
| **Ghost CTA** | "Limpiar", "Cancelar", navigation pills | Subtle border, muted text, hover gold tint |
| **Destructive** | "Eliminar", "Finalizar ciclo" | Error border, error text on hover, confirm dialog |

### 4.5 Badges y status chips

| Estado | Background | Border | Text |
|--------|-----------|--------|------|
| Active / Growing | success 14% | success border | success color |
| Finalized / Closed | gold-4 14% | gold border | gold-5 |
| Warning / Pending | warning 14% | warning border | warning color |
| Error / Lost | error 16% | error border | error color |
| Income | success 15% | success border | success color |
| Expense | warning 15% | warning border | warning color |
| Neutral / Draft | neutral 8% | neutral border | text-secondary |

---

## 5. Familia Canonica de Cards

### 5.1 Card Base (contrato minimo)

```
Selector pattern: .agro-[module]-card, .agro-[module]-panel
Border-radius: var(--radius-lg) = 16px
Border: 1px solid var(--border-gold)
Background:
  linear-gradient(180deg, color-mix(in srgb, var(--gold-4) 6%, transparent), transparent 20%),
  linear-gradient(135deg, rgba(255,255,255,0.018), transparent 60%),
  var(--bg-3)
Box-shadow:
  0 16px 32px rgba(0,0,0,0.26),
  inset 0 1px 0 rgba(255,255,255,0.02)
Overflow: hidden
Padding: var(--pad-card) = 1rem
```

**Shimmer bar (opcional, solo P1 y P2):**
```
::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px (P1) o 1px (P2);
  background: var(--metallic-border);
  background-size: 200% 100%;
  opacity: 0.75;
  animation: borderShimmer 4-5s linear infinite;
  pointer-events: none;
}
```

**Hover (solo P1 y P2):**
```
:hover {
  border-color: color-mix(in srgb, var(--gold-4) 34%, rgba(255,255,255,0.08));
  transform: translateY(-1px);
  box-shadow: 0 18px 36px rgba(0,0,0,0.28), 0 0 0 1px rgba(200,167,82,0.06);
}
```

### 5.2 Card Secundaria (P3 — stats, facts)

```
Border-radius: var(--radius-md) = 12px
Border: 1px solid rgba(255,255,255,0.06)
Background: rgba(255,255,255,0.02)
Padding: var(--pad-card-compact) = 0.85rem
No shadow. No gradient. No shimmer.
```

### 5.3 Card Inline (P4 — rows, items)

```
Border-radius: var(--radius-md) = 12px
Border: 1px solid rgba(255,255,255,0.05)
Background: rgba(255,255,255,0.02)
Padding: 0.72rem
No shadow. No pseudo-elements.
```

### 5.4 Aplicacion por superficie

| Superficie | P1 | P2 | P3 | P4 |
|-----------|----|----|----|----|
| Dashboard | Guide card | Nav-cards | — | — |
| Mi Perfil | Hero section | Profile cards | — | — |
| Ciclos Activos | — | Cycle cards | Meta grid cells | — |
| Finalizados | Overview section | History cards | Stat cards | — |
| Estadisticas | Stats toggle panel | Top cards | Money rows, crop cards | — |
| Operacion Comercial | Financial ops container | TX cards | Step blocks | Chip rows |
| Period Cycles | Family overview | Period cards | Summary cells | Movement items |
| Task Cycles | Stats panel | Task cards | Stat cards, fact cards | Breakdown items |
| Cartera Viva | Header panel | Buyer cards | Metric cells | History items |
| Clima | Weather panel | Forecast cards | Detail cells | — |

### 5.5 Errores a evitar en cards

1. **No usar `backdrop-filter: blur()` en cards dentro de grids.** El blur es costoso y causa repaint en scroll. Reservar solo para overlays y modals.
2. **No mezclar `.card` legacy con `.agro-*-card` nuevos.** Migrar gradualmente las instancias de `.card` a la familia canonica.
3. **No hardcodear colores de fondo.** Siempre usar tokens (`var(--bg-3)`, `var(--bg-4)`) para que hereden modo.
4. **No poner `overflow: hidden` en cards que contienen action menus floating.** Usar `overflow: visible` selectivamente.
5. **No animar `box-shadow` en hover.** Preferir animar `border-color` y usar una shadow fija. La excepcion es el CTA primary button.

---

## 6. Parentesco Visual entre Modulos

### 6.1 Familia "Ciclos" (Cultivos + Periodos + Operacional)

Estos tres modulos comparten la misma logica: un ciclo agricola tiene fases, movimientos financieros, y progreso temporal. Deben verse como variaciones de un mismo sistema.

**Reglas de parentesco:**
- **Misma card base** (P2 con shimmer bar).
- **Mismo header pattern** (eyebrow + title + subtitle).
- **Mismos badges** (active/finalized/lost con semantic colors).
- **Mismo progress bar** (track bg-2, fill metallic gradient, dot gold-5).
- **Period Cycles es la referencia** — los otros dos deben alinearse visualmente a el.

### 6.2 Familia "Control" (Dashboard + Estadisticas)

Superficies de lectura rapida y resumen. No son de operacion directa.

**Reglas de parentesco:**
- **Cards de navegacion** (P2) como puntos de entrada a otras vistas.
- **Stat cards** (P3) para KPIs numericos.
- **Collapsible sections** para contenido denso secundario.
- **Export buttons** como acciones de salida.

### 6.3 Familia "Operacion" (Facturero + Cartera Viva + Tareas)

Superficies de accion directa donde el usuario crea, edita, registra.

**Reglas de parentesco:**
- **Headers compactos** con toolbar integrado.
- **Filter/sort controls** prominentes.
- **Cards de contenido** (P2) con footer de acciones.
- **Modals de formulario** para create/edit flows.
- **Privacy toggles** para datos sensibles.

### 6.4 Familia "Herramientas" (Clima + Bitacora + Asistente IA)

Superficies complementarias que no son CRUD core.

**Reglas de parentesco:**
- **Self-contained widgets** con su propio layout interno.
- **Pueden tener sidebar propia** (Bitacora, Asistente).
- **Visual autonomy** — pueden diferir mas en layout pero deben mantener paleta y tipografia.

---

## 7. Plan de Intervencion Priorizado

### Sprint 1 — Consolidacion de Tokens (Impacto: Alto, Riesgo: Bajo)

| # | Accion | Archivo(s) | Cambio |
|---|--------|-----------|--------|
| 1.1 | **Eliminar token island en agrociclos.css** | `agrociclos.css` L28-71 | Borrar las 43 lineas de redefinicion de variables dentro de `.agro-cycles`. Las variables ya vienen de `agro-tokens.css` via cascade. Verificar que `.agro-cycles` no esta scoped de forma que pierda herencia. |
| 1.2 | **Crear tokens de spacing canonicos** | `agro-tokens.css` | Agregar `--gap-section`, `--gap-card`, `--gap-internal`, `--gap-tight`, `--pad-card`, `--pad-card-compact`, `--pad-section`, `--pad-modal` al final de `:root`. |
| 1.3 | **Crear tokens tipograficos** | `agro-tokens.css` | Agregar `--type-page-title`, `--type-section-title`, `--type-card-title`, `--type-eyebrow`, `--type-body`, `--type-body-sm`, `--type-label`, `--type-caption` como font-size tokens. |
| 1.4 | **Normalizar radius hardcodeados** | `agro-task-cycles.css`, `agro-operations.css` | Reemplazar `18px` -> `var(--radius-lg)` y `14px` -> `var(--radius-md)` en todos los hardcodes. |

**Riesgo:** Bajo. Cambios de tokens no afectan funcionalidad. La eliminacion del token island en agrociclos.css necesita verificar que `.agro-cycles` hereda correctamente de `:root`.

**Impacto esperado:** Coherencia total de tokens. Cambios futuros de paleta o spacing se propagan automaticamente.

### Sprint 2 — Respiracion en Operacion Comercial (Impacto: Alto, Riesgo: Medio)

| # | Accion | Archivo(s) | Cambio |
|---|--------|-----------|--------|
| 2.1 | **Aumentar padding de financial-operations-card** | `agro-operations.css` | Padding de `0.84rem 0.92rem 0.94rem` -> `1rem 1.1rem 1.1rem`. Gap de `0.66rem` -> `0.85rem`. |
| 2.2 | **Aumentar font-size de micro-labels** | `agro-operations.css` | Kicker `0.54rem` -> `0.62rem`. Toolbar-label `0.52rem` -> `0.62rem`. Step-label `0.54rem` -> `0.62rem`. |
| 2.3 | **Agregar scroll indicator para crop chips** | `agro-operations.css` | Agregar gradient fade en los bordes de `.ops-cultivos-chip-row` usando `mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent)` cuando overflow activo. |
| 2.4 | **Reducir `!important` en tx-cards-v2.css** | `tx-cards-v2.css` | Identificar el conflicto de cascade raiz y resolver con especificidad correcta en lugar de `!important`. |
| 2.5 | **Aumentar tx-card spacing** | `tx-cards-v2.css` | Padding de `0.875rem 1rem` -> `1rem 1.1rem`. Margin-bottom de `0.5rem` -> `0.75rem`. |

**Riesgo:** Medio. Los cambios de padding y font-size pueden afectar layouts existentes. Necesita QA visual en desktop y mobile.

**Impacto esperado:** La vista mas densa del sistema gana respiracion visible sin perder funcionalidad.

### Sprint 3 — Unificacion de Card System (Impacto: Alto, Riesgo: Medio)

| # | Accion | Archivo(s) | Cambio |
|---|--------|-----------|--------|
| 3.1 | **Documentar card family en agro-tokens.css** | `agro-tokens.css` | Agregar comentario-bloque con la definicion canonica de P1-P4 cards. |
| 3.2 | **Migrar `.card` legacy a `.agro-card-base`** | `agro-index-critical.css`, `agro-dashboard.css` | Crear `.agro-card-base` con el contrato P2 definido en seccion 5. Aplicar a `.agro-dash-guide.card` y cualquier otra instancia. |
| 3.3 | **Crear clases utilitarias de card** | `agro-tokens.css` o nuevo `agro-cards.css` | `.agro-card--hero` (P1), `.agro-card--primary` (P2), `.agro-card--secondary` (P3), `.agro-card--inline` (P4). |
| 3.4 | **Alinear cycle-card con card canonica** | `agrociclos.css` | Ajustar `.cycle-card` para usar background, border y shadow del contrato P2. |

**Riesgo:** Medio. Requiere verificar que los cambios no rompen JS que depende de clases CSS especificas.

### Sprint 4 — Header Unificado y Dashboard Enhancement (Impacto: Medio, Riesgo: Bajo)

| # | Accion | Archivo(s) | Cambio |
|---|--------|-----------|--------|
| 4.1 | **Crear patron de section-header reutilizable** | `agro-tokens.css` o nuevo CSS | `.agro-section-head` con subclases para icon, no-icon, compact. Patterns: eyebrow + title + subtitle + actions. |
| 4.2 | **Diferenciar guide step #1** | `agro-dashboard.css` | Agregar `.agro-guide-step--primary` con gold gradient background al primer step (Crear cultivo). |
| 4.3 | **Evaluar agregar snapshot cards al dashboard** | Requiere JS + CSS | Agregar 2 mini-cards: "Cultivos activos (N)" y "Tareas pendientes (N)" como nav-cards adicionales. |

### Sprint 5 — Responsive y Mobile Polish (Impacto: Medio, Riesgo: Bajo)

| # | Accion | Archivo(s) | Cambio |
|---|--------|-----------|--------|
| 5.1 | **Agregar mobile collapse a Lunar modal** | `agro-index-critical.css` | `@media (max-width: 768px)` para `.agro-lunar-modal__dialog`: cambiar a flex-direction column, side panel debajo. |
| 5.2 | **Reducir gaps en breakpoint 480px** | Todos los modulos | En `@media (max-width: 480px)`, reducir gaps de `1rem` -> `0.75rem` y padding de `1rem` -> `0.85rem`. |
| 5.3 | **Financial tabs mobile improvement** | `agro-index-critical.css`, `agro-operations.css` | Agregar `scroll-snap-align: start` efectivo y fade indicators. |

### Sprint 6 — Cleanup Legacy (Impacto: Bajo, Riesgo: Bajo)

| # | Accion | Archivo(s) | Cambio |
|---|--------|-----------|--------|
| 6.1 | **Remover editor clasico temporal de perfil** | `index.html` | Eliminar el `<details class="agro-profile-legacy-fallback">` y su contenido. |
| 6.2 | **Actualizar comentarios V9.8 a V10** | Multiple files | Search & replace "V9.8" por "V10.0" en comentarios CSS. |
| 6.3 | **Simplificar token aliases en agro-repo.css** | `agro-repo.css` | Reducir las 20+ `--agrp-*` variables a solo las que difieren realmente de tokens globales. |
| 6.4 | **Introducir Playfair Display** | `agro-dashboard.css` o global | Usar Playfair Display italic para al menos un elemento visible: quote/insight en dashboard o empty states. |

---

## 8. Instrucciones para Implementadores

### Instruccion 1 — Eliminar Token Island (Sprint 1.1)

**Objetivo:** Eliminar la redefinicion completa de tokens dentro de `.agro-cycles` en `agrociclos.css`.

**Pasos:**
1. Abrir `agrociclos.css`.
2. Localizar el bloque `.agro-cycles { --gold-1: ... }` (lineas ~28-71).
3. Verificar que `agro-tokens.css` se carga ANTES de `agrociclos.css` en `index.html` (confirmar orden de `<link>`).
4. Verificar que `.agro-cycles` no esta dentro de un Shadow DOM o iframe que impida herencia.
5. Si la herencia funciona: eliminar todas las redefiniciones de variables CSS dentro de `.agro-cycles`.
6. Si la herencia NO funciona (e.g., el elemento tiene un scope custom): mantener solo las variables que DIFIEREN del global y agregar un comentario explicando por que.
7. Build y verificar visualmente que los cycle cards mantienen su apariencia.

**QA:** Comparar visualmente antes/despues de los cycle cards en desktop y mobile. Los colores, bordes, sombras y tipografia deben ser identicos.

### Instruccion 2 — Tokens de Spacing (Sprint 1.2)

**Objetivo:** Agregar tokens de spacing canonicos a `agro-tokens.css`.

**Pasos:**
1. Al final de la seccion `:root` en `agro-tokens.css`, agregar:
```css
/* Spacing System — Canonical */
--gap-section: 1.5rem;
--gap-card: 1rem;
--gap-internal: 0.75rem;
--gap-tight: 0.45rem;
--pad-card: 1rem;
--pad-card-compact: 0.85rem;
--pad-section: 1.25rem;
--pad-modal: 1.35rem;
```
2. NO reemplazar los valores hardcodeados todavia. Este paso solo define los tokens.
3. En sprints posteriores, migrar gradualmente los hardcodes a estos tokens.

### Instruccion 3 — Respiracion en Financial Operations (Sprint 2.1-2.2)

**Objetivo:** Aumentar padding, gap y font-size minima en la vista de Operacion Comercial.

**Pasos:**
1. En `agro-operations.css`, selector `.agro-ops-v10 .financial-operations-card`:
   - Cambiar `padding: 0.84rem 0.92rem 0.94rem` -> `padding: 1rem 1.1rem`
   - Cambiar `gap: 0.66rem` -> `gap: 0.85rem`
2. En `.agro-ops-v10 .financial-operations-kicker`:
   - Cambiar `font-size: 0.54rem` -> `font-size: 0.62rem`
3. En `.agro-ops-v10 .financial-operations-toolbar-label`:
   - Cambiar `font-size: 0.52rem` -> `font-size: 0.62rem`
4. En `.agro-ops-v10 .ops-step-label`:
   - Cambiar `font-size: 0.54rem` -> `font-size: 0.62rem`
5. Build y QA en desktop y mobile (768px, 480px).

**QA:** La vista debe respirar mas sin que ningun elemento se desborde. Los textos deben ser legibles sin zoom. Verificar que los financial tabs no se rompan.

### Instruccion 4 — Card System Documentation (Sprint 3.1)

**Objetivo:** Documentar el contrato visual de cards en el CSS.

**Pasos:**
1. Al final de `agro-tokens.css`, antes del cierre de `:root`, agregar un bloque de comentario:
```css
/* ============================================
   CARD SYSTEM — Canonical Visual Contracts
   
   P1 Hero:    border-gold, gradient-gold-6%, shadow-lg, shimmer-2px, hover-translate
   P2 Primary: border-gold, gradient-gold-6%, shadow-md, shimmer-1px, hover-translate
   P3 Secondary: border-neutral-06, bg-002, no-shadow, no-gradient, no-shimmer
   P4 Inline:   border-neutral-05, bg-002, no-shadow, no-pseudo, tight-padding
   ============================================ */
```

---

## Apendice A — Inventario de Archivos CSS

| Archivo | Lineas | Rol | Salud |
|---------|--------|-----|-------|
| `agro-tokens.css` | 111 | Token foundation | Buena — necesita spacing/type tokens |
| `agro-index-critical.css` | 1545 | Shell, legacy cards, inputs, buttons | Mixta — contiene legacy + modern |
| `agro-dashboard.css` | 727 | Dashboard cards, grid, animations | Buena |
| `agrociclos.css` | 1072 | Cycle cards | Token island critico |
| `agro-operations.css` | 3313 | Facturero, operations | Densa, micro-fonts |
| `agro-operational-cycles.css` | 1722 | Operational cycles modal, panels | Buena |
| `agro-period-cycles.css` | 537 | Period cycles | Excelente — modelo |
| `agro-task-cycles.css` | 751 | Task cycles | Buena — radius minor |
| `agro-cartera-viva.css` | 2084 | Cartera Viva | Buena |
| `tx-cards-v2.css` | 865 | Transaction cards | !important debt |
| `agro-repo.css` | 1040 | Bitacora widget | Excessive aliases |
| `agro.css` | ~8000+ | Monolito CSS (shell, sidebar, profile, assistant, tools, clima, etc.) | Legacy mix |
| `agro-agenda.css` | ? | Agenda/calendar | Not audited |

## Apendice B — Tokens Existentes vs Recomendados

### Color tokens (OK — no changes needed)
- `--gold-1` through `--gold-5`: Correct
- `--bg-0` through `--bg-4`: Correct
- `--text-primary`, `--text-secondary`, `--text-muted`: Correct
- Semantic colors: Correct

### Radius tokens (minor fix needed)
- Existing: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-pill: 9999px`
- **Issue:** `18px` and `14px` hardcoded in task-cycles and operations. Map to `--radius-lg` (round to 16px) or create `--radius-lg-plus: 18px` if the 2px difference is intentional.

### Shadow tokens (OK — but document levels)
- Existing: `--shadow-gold-xs`, `--shadow-gold-sm`, `--shadow-gold-md`, `--shadow-metallic`
- **Recommendation:** Document which shadow level maps to which card prominence level.

### Animation tokens (OK)
- All use `transform` + `opacity`
- All respect `prefers-reduced-motion`
- Duration range 120ms-6s: correct per V10 spec

---

*Este documento es un entregable de auditoria. No contiene codigo ejecutable. Las instrucciones de implementacion son guias para el agente ejecutor, que debe seguir las reglas de AGENTS.md al aplicar cambios.*
