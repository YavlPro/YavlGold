# 💎 ADN VISUAL V10.0 — HISTÓRICO 💎
# YavlGold — Base visual fundacional

Documento histórico del sistema visual V10.0. Referencia fundacional, no canon activo.

> **Canon visual activo actual:** `apps/gold/docs/ADN-VISUAL-V11.0.md`

---

## Histórico V10.0

- Estado: `HISTÓRICO / SOLO CONSULTA`
- Release activo del producto: `V1`
- Contexto historico de formalizacion: `V9.8`
- Stack visual: `Vanilla JS + Vite MPA`
- Paleta: `5-Tone Metallic`
- Ghost system: `10 Ghost Emojis`
- Tipografía: `Orbitron + Rajdhani`
- Modos: `Dark / Light`
- Restricción: `No React · No Tailwind`

---

## Exploración DNA

- Explorar DNA Completo
- Gobernanza del DNA
- §0-§1 — Misión e Identidad
- §15-§16 — Layout e Iconografía
- §17-§18 — Estados y Accesibilidad
- §19 — Canon de Modales
- §20 — Separación Semántica de Superficies

---

## 🧬 DNA del Proyecto

**YavlGold — Mision, No Negociables, Stack y Filosofia**

| Campo | Valor |
| --- | --- |
| Proyecto | YavlGold |
| Release visible actual | V1 |
| Contexto historico de formalizacion | V9.8 |
| DNA Version | V10.0 — Histórico |
| Estado | HISTÓRICO / SOLO CONSULTA |
| Autor | Yerikson Varela |
| Origen | Táchira, Venezuela 🇻🇪 |
| Fecha | 2026-02-18 |
| Licencia | MIT Open Source |

---

## 📋 §0 — Misión del Documento

Este archivo es el documento histórico del sistema visual V10.0 de YavlGold.

- SÍ adopta ideas visuales del ZIP revisado (`metallic gold system`, tokens, gradients, motion language).
- NO adopta su arquitectura React/Tailwind.
- SÍ preserva la arquitectura actual: Vanilla JS + Vite MPA + Supabase.

---

## 🔒 §1 — No Negociables

1. Stack: HTML por página + JS modular ES. CSS con variables y clases utilitarias ligeras.
2. Arquitectura: Vite en modo MPA. Sin migración SPA.
3. Brand: Fondo principal oscuro. Dorado `#C8A752` como acento principal.
4. Restricción: Sin acento azul/morado en UI principal. Azul solo para estado semántico `info`.

### ⚡ Stack Tecnológico

| Capa | Definición |
| --- | --- |
| Frontend | Vanilla JS (ES6+ Modules) |
| Build Tool | Vite (MPA) |
| Arquitectura | MPA — NO SPA |
| Backend | Supabase |
| Estilo | CSS Custom Properties |
| Tipografía | Google Fonts (3 familias) |
| Iconos | Font Awesome 6.5 |
| PWA | Service Worker |
| Monedas | COP · USD · VES |
| Scope DNA | Visual system only |

---

## §2 — Sistema de Color Canónico

## 🎨 5-Tone Metallic System

Escala Gold obligatoria de 5 tonos — Champagne Gold Metallic con tokens canónicos.

| Tono | Hex | Uso | Token |
| --- | --- | --- | --- |
| 🌑 Dark Bronze | `#2a2218` | Sombra profunda | `--gold-1` |
| 🌒 Burnished Bronze | `#3a3228` | Sombra media | `--gold-2` |
| 🌓 Antique Gold | `#6b5a3e` | Medio tono | `--gold-3` |
| 🌕 Champagne Gold | `#C8A752` | Brand primary | `--gold-4` |
| ✨ Light Gold | `#E8D48B` | Highlights | `--gold-5` |

### 🖤 §2.1 — Fondos (bg-0 → bg-4)

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg-0` | `#050505` | fondo más profundo |
| `--bg-1` | `#0a0a0a` | fondo principal |
| `--bg-2` | `#0B0C0F` | navbar / dark layer |
| `--bg-3` | `#111113` | paneles secundarios |
| `--bg-4` | `#1a1a1f` | cards elevadas |

### 🏷️ §2.3 — Alias Semánticos

| Token | Valor |
| --- | --- |
| `--gold-principal` | `var(--gold-4)` |
| `--gold-dark` | `#9D8040` |
| `--gold-light` | `#E4D08E` |
| `--gold-prestige` | `#E5D5A0` |
| `--metal-antique` | `var(--gold-3)` |
| `--metal-champagne` | `var(--gold-4)` |
| `--metal-highlight` | `var(--gold-5)` |

### 🔄 §2.4 — Compatibilidad Legacy

Para no romper CSS actual, mapear:

| Token legacy | Nuevo valor |
| --- | --- |
| `--gg-gold-primary` | `var(--gold-4)` |
| `--gg-gold-bright` | `#D4AF37` |
| `--gg-gold-dark` | `#8B7842` |
| `--gg-bg-primary` | `var(--bg-2)` |
| `--gg-bg-secondary` | `var(--bg-1)` |
| `--gg-bg-tertiary` | `var(--bg-0)` |

### 🔤 §2.5 — Texto

| Token | Valor |
| --- | --- |
| `--text-primary` | `#ffffff` |
| `--text-secondary` | `#cccccc` |
| `--text-muted` | `#94A3B8` |
| `--text-gold-prestige` | `#E5D5A0` |

### 🚦 §2.6 — Estados

| Token | Valor | Regla |
| --- | --- | --- |
| `--color-success` | `#10B981` | semántico |
| `--color-warning` | `#F59E0B` | semántico |
| `--color-error` | `#EF4444` | semántico |
| `--color-info` | `#3B82F6` | semántico, NO acento de marca |

---

## §3 — Gradientes

## ✨ Metallic Gradient System

7 gradientes metálicos para reflexión anisotrópica (inspiración Audemars Piguet / Rolex Everose).

| Nombre | Token | Definición |
| --- | --- | --- |
| Conic — Brushed Champagne | `--metallic-conic` | `conic-gradient(...)` |
| Linear — Flowing Reflection | `--metallic-linear` | `linear-gradient(135deg, ...)` |
| Text — Heading Gradient | `--metallic-text` | `linear-gradient(135deg, ...)` |
| Text SM — Smaller Text | `--metallic-text-sm` | `linear-gradient(135deg, ...)` |
| Border — Horizontal Lines | `--metallic-border` | `linear-gradient(90deg, ...)` |
| Button — CTA Actions | `--metallic-btn` | `linear-gradient(135deg, ...)` |
| Radial — Spherical Highlight | `--metallic-radial` | `radial-gradient(circle at 30% 30%, ...)` |

### 📖 Guía de uso

```css
/* Texto metálico */
.text-metallic {
  background: var(--metallic-text);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: metallicShift 6s ease-in-out infinite;
}

/* Botón metálico */
.btn-gold {
  background: var(--metallic-btn);
  background-size: 200% 100%;
  color: #0B0C0F;
  animation: metallicShift 5s ease-in-out infinite;
}

/* Borde metálico animado */
.element::before {
  background: var(--metallic-border);
  background-size: 200% 100%;
  animation: metallicShift 3s linear infinite;
}

/* Logo con gradiente cónico */
.logo {
  background: var(--metallic-conic);
}
```

---

## §4 — Tipografía

## 🔤 Sistema Tipográfico

3 familias tipográficas con roles definidos.

### 🏗️ Orbitron — Headings & Branding

- `font-family: 'Orbitron', sans-serif`
- Pesos: `700, 900`
- Uso: títulos, branding, h1-h3, labels, badges.

### 📝 Rajdhani — Body & UI

- `font-family: 'Rajdhani', sans-serif`
- Pesos: `400, 600, 700`
- Uso: párrafos, botones, navegación, UI general.

### ✒️ Playfair Display — Display & Quotes

- `font-family: 'Playfair Display', serif`
- Pesos: `400, 700, 400i`
- Uso: citas y bloques prestige.

### 📐 Escala Tipográfica

| Elemento | Familia | Tamaño | Peso |
| --- | --- | --- | --- |
| Hero H1 | Orbitron | `clamp(2.2rem, 5vw, 3.8rem)` | 900 |
| Section Title | Orbitron | `clamp(1.6rem, 3vw, 2.2rem)` | 900 |
| Card Title | Orbitron | `1rem` | 700 |
| Body Text | Rajdhani | `0.92rem` | 400-600 |
| Hero Subtitle | Playfair Display | `clamp(1rem, 2.2vw, 1.25rem)` | 400i |
| Quote | Playfair Display | `1.35rem` | 400i |

---

## §5 — Bordes, Radios y Sombras

## 📐 Design Tokens

### 📏 §5.1 — Bordes

```css
--border-neutral:  rgba(255,255,255,0.08);
--border-gold:     rgba(200,167,82,0.25);
--border-prestige: rgba(229,213,160,0.18);
```

### ⭕ §5.2 — Radios

```css
--radius-xs: 4px;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-pill: 9999px;
```

### 🌗 §5.3 — Sombras

```css
--shadow-gold-xs: 0 1px 6px rgba(200,167,82,0.10);
--shadow-gold-sm: 0 2px 10px rgba(200,167,82,0.15);
--shadow-gold-md: 0 5px 20px rgba(200,167,82,0.25);
--shadow-gold-lg: 0 10px 40px rgba(200,167,82,0.35);
--shadow-gold-xl: 0 20px 60px rgba(200,167,82,0.45);
--shadow-metallic: 0 4px 20px rgba(200,167,82,0.30), 0 0 40px rgba(200,167,82,0.08);
```

### GLASS

```css
--glass-bg: rgba(17, 17, 17, 0.9);
--backdrop-blur: blur(12px);
```

### 🔤 §3 — Escala Tipográfica (tokens)

```css
--text-xs: 0.70rem;
--text-sm: 0.80rem;
--text-base: 0.92rem;
--text-md: 1.00rem;
--text-lg: 1.10rem;
--text-xl: 1.30rem;
--text-2xl: 1.60rem;
--text-3xl: 2.20rem;
--text-4xl: 3.80rem;
```

---

## §6 — Animaciones

## 🎭 Sistema de Animaciones

11+ keyframes del lenguaje metálico.

| Keyframe | Propiedad | Duración | Timing | Uso |
| --- | --- | --- | --- | --- |
| `metallicShift` | background-position | 3-6s | ease-in-out | gradientes, texto, borders |
| `metallicRotate` | hue-rotate | 8-10s | linear | logo/orb |
| `logoSheen` | translateX + opacity | 3-4s | ease-in-out | brillo logo/cards |
| `badgeSheen` | translateX | 3s | ease-in-out | badges |
| `textGlow` | text-shadow | 3s | ease-in-out | hero glow |
| `breathe` | scale + drop-shadow | 4s | ease-in-out | iconos decorativos |
| `float` | translateY | 3-7s | ease-in-out | partículas |
| `pulseGlow` | box-shadow | 3s | ease-in-out | quote card |
| `ghostFloat` | translate + scale + opacity | 7-12s | ease-in-out | ghost emojis |
| `ghostSpin` | rotate | 20s | linear | ghost componentes |
| `ghostPulse` | scale + opacity | 6s | ease-in-out | ghost animaciones |
| `borderShimmer` | background-position | 2-3s | linear | top border cards |
| `btnShimmer` | rotate + translateX | 1.5s | linear | hover botones |
| `fadeInUp` | opacity + translateY | 0.5s | ease | scroll reveal |

Reglas:
- Interacciones UI: 120ms-220ms.
- Usar `opacity` y `transform` para estados.
- Evitar animar `top/left/width/height` en loops.

---

## §7 — Componentes

## 🧩 Biblioteca de Componentes

### 🔘 Botones
- `.btn-primary.btn-gold`
- `.btn-primary.btn-outline-gold`
- `.btn-nav.btn-nav-filled`
- `.btn-nav.btn-nav-outline`

### 🏷️ Badges y tags
- `.hero-badge`
- `.hero-tag`
- `.module-status` (`available`, `dev`, `soon`)

### 🃏 Cards
- Module card featured/normal.
- Quote card prestige.
- Progress bar lineal.

### ⚜️ Elementos metálicos
- `.nav-logo-icon`
- `.divider`
- `.theme-toggle`

### 🎚️ Switch de filtro / Carrusel de modos

Patrón de selección de modo de lectura para el shell Agro. Usa chips deslizantes dentro de una cápsula viewport. Diseñado para ser táctil, premium y sobrio.

#### Rol del componente

Permite cambiar el contexto de lectura del shell sin alterar la estructura de navegación. Solo filtra qué contenidos aparecen como relevantes en cada modo.

#### Estructura visual

```
┌─────────────────────────────────────────────────────┐
│  ┌─ cápsula exterior ─────────────────────────────┐  │
│  │  ┌─ rail/viewport ──────────────────────────┐ │  │
│  │  │  [General] [Cultivo] [No Cultivo] [Herram.]│ │  │
│  │  └───────────────────────────────────────────┘ │  │
│  │           ↑ hint / metadata opcional            │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

| Parte | Descripción |
|---|---|
| Cápsula exterior | Contenedor con borde sutil, fondo `bg-2`, radios suaves |
| Rail / viewport | Área scrolleable horizontal que contiene los chips |
| Chips / opciones | Cada modo es un chip con estado activo / inactivo |
| Hint / metadata | Texto auxiliar opcional debajo de los chips (ej: "4 surfaces") |

#### Estado inactivo

* Texto: `--text-muted` o gris premium (`#6b5a3e`)
* Fondo: transparente
* Sin glow ni sombra activa

#### Estado activo

* Texto: dorado fino (`--gold-4: #C8A752`)
* Fondo: `rgba(200,167,82,0.12)` — dorado sutil sin ser gritón
* Borde interior fino dorado o ausencia de borde con fondo
* Sin glow exagerado, sin sombra pronunciada

#### Tokens de estado

| Token | Valor | Aplicación |
|---|---|---|
| `--chip-inactive-text` | `#6b5a3e` | Texto inactivo |
| `--chip-active-text` | `#C8A752` | Texto activo |
| `--chip-active-bg` | `rgba(200,167,82,0.12)` | Fondo activo |
| `--chip-radius` | `999px` | Radios completamente redondeados |
| `--chip-padding` | `6px 14px` | Padding interno del chip |
| `--chip-gap` | `8px` | Espacio entre chips |
| `--switch-capsule-padding` | `4px` | Espacio interno de la cápsula |

#### Espaciado y medidas

* Gap entre chips: `8px`
* Padding de cada chip: `6px 14px`
* Radios de chip: `999px` (pill completo)
* Radios de cápsula: `12px`
* La cápsula tiene `overflow: hidden` en el eje horizontal y permite scroll

#### Comportamiento responsive

**Móvil (≤768px)**

* Solo 2 chips visibles por vista
* El resto queda oculto fuera del viewport
* Revelado por scroll horizontal (swipe o drag)
* No se comprimen los chips para mostrar todos

**Desktop (>768px)**

* Scroll horizontal usable con trackpad, mouse wheel o drag
* Soporte de navegación por teclado (flechas)
* Se pueden mostrar 3-4 chips visibles sin comprimir

#### Anti-patrones

* **No mostrar todos los chips a la vez** en un espacio compacto — fuerza scroll
* **No comprimir chips** — el texto debe ser legible sin reducir fuente
* **No usar texto brillante** (`--gold-5`) para inactivos — el contraste es ruido
* **No hacer el activo gritón** — `--gold-4` es suficiente como acento
* **No romper accesibilidad** — cada chip debe tener `role="tab"` y `aria-selected`
* **No animar con propiedades de layout** (`width/height/left/top`) — usar `transform` y `opacity`

#### Ejemplo de implementación CSS

```css
.agro-mode-switch {
  display: flex;
  width: 100%;
}

.agro-mode-switch__capsule {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: var(--chip-gap, 8px);
  padding: var(--switch-capsule-padding, 4px);
  background: var(--bg-2, #3a3228);
  border-radius: 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.agro-mode-switch__capsule::-webkit-scrollbar {
  display: none;
}

.agro-mode-switch__chip {
  scroll-snap-align: start;
  flex-shrink: 0;
  padding: var(--chip-padding, 6px 14px);
  border-radius: var(--chip-radius, 999px);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--chip-inactive-text, #6b5a3e);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease;
  white-space: nowrap;
  user-select: none;
}

.agro-mode-switch__chip[aria-selected="true"] {
  color: var(--chip-active-text, #C8A752);
  background: var(--chip-active-bg, rgba(200,167,82,0.12));
}

.agro-mode-switch__chip:focus-visible {
  outline: none;
  box-shadow: var(--state-focus-ring);
}
```

---

## §8 — Ghost Emojis

## 👻 Sistema de Ghost Emojis

Cada sección puede tener un emoji decorativo gigante semi-transparente.

### 📋 Reglas
- Opacidad entre `0.02` y `0.05`.
- `pointer-events: none`.
- `z-index` por debajo del contenido.
- No usar en formularios ni pantallas de alta densidad de datos.

### 📋 Lista Canónica Completa (10)

| Emoji | Sección | Clase CSS | Animación | Duración | Dirección |
| --- | --- | --- | --- | --- | --- |
| 💎 | Hero | `.hero::after` | `ghostFloat` | 8s | normal |
| 🌾 | Módulos | `.modules::before` | `ghostFloat` | 10s | normal |
| 🎓 | Academia | `.academy-ghost::before` | `ghostFloat` | 10s | normal |
| 🧬 | Tokens | `.tokens-ghost::before` | `ghostFloat` | 12s | reverse |
| ⚙️ | Componentes | `.components-ghost::before` | `ghostSpin` | 20s | normal |
| ✨ | Animaciones | `.animations-ghost::before` | `ghostPulse` | 6s | normal |
| 🅰 | Typography | `.typo-ghost::before` | `ghostFloat` | 9s | normal |
| 📜 | Quotes | `.quote-ghost::before` | `ghostFloat` | 7s | normal |
| 🌱 | Growing | `.growing-section::before` | `ghostFloat` | 10s | normal |
| 🌾 | CTA | `.cta-section::before` | `ghostFloat` | 9s | reverse |

Nota: la repetición de `🌾` en Módulos y CTA es intencional como marca visual del agro.

### 📖 Implementación base

```css
.hero::after {
  content: '💎';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(15rem, 30vw, 25rem);
  opacity: 0.04;
  z-index: 0;
  pointer-events: none;
  animation: ghostFloat 8s ease-in-out infinite;
  filter: sepia(100%) hue-rotate(5deg) saturate(500%) contrast(0.8);
  mix-blend-mode: overlay;
}
```

---

## §9 — Temas

## 🌓 Dark / Light Mode

Sistema dual de temas por override de tokens.

### 🌙 Dark Mode (default)
- Base: `#0B0C0F`, `#0a0a0a`, `#111113`, `#050505`
- Texto: `#ffffff`, `#cccccc`, `#94A3B8`
- Glass: `rgba(17,17,17,0.9)`
- Brand: `#C8A752`

### ☀️ Light Mode
- Base: `#f8f6f0`, `#fefcf7`, `#f0ede4`, `#e8e4d9`
- Texto: `#1a1a1a`, `#4a4a4a`, `#6b7280`
- Glass: `rgba(255,255,255,0.85)`
- Gold adaptado: `#B8972E`

### ⚙️ Implementación

```css
[data-theme="light"] {
  --bg-primary: #fefcf7;
  --text-primary: #1a1a1a;
  --glass-bg: rgba(255,255,255,0.85);
}
```

```js
const theme = localStorage.getItem('yavl-theme') || 'dark';
document.body.dataset.theme = theme;

function toggleTheme() {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  localStorage.setItem('yavl-theme', next);
}
```

---

## §10 — Responsive

## 📱 Breakpoints

| Breakpoint | Max-Width | Target |
| --- | --- | --- |
| Desktop | > 900px | full layout |
| Tablet | ≤ 900px | nav colapsa |
| Mobile | ≤ 768px | grid 1 col |
| Small | ≤ 480px | compact mode |

### 📖 Media queries base

```css
@media (max-width: 900px) {
  .nav-center, .nav-right { display: none; }
  .hamburger { display: block; }
  .footer-top { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .modules-grid { grid-template-columns: 1fr; }
  .hero-cta { flex-direction: column; }
  .hero-cta .btn-primary { width: 100%; }
}

@media (max-width: 480px) {
  .hero-tag { font-size: 0.72rem; }
  .metal-grid { grid-template-columns: 1fr 1fr; }
}
```

---

## §11-§12 — Reglas

## 🚫 §11 — Anti-Patrones Prohibidos

- Usar acento morado/azul como brand principal.
- Duplicar paletas por módulo.
- Romper jerarquía tipográfica base sin motivo funcional.
- Usar componentes dependientes de React/TSX del ZIP.
- Introducir dependencias visuales pesadas.
- Hardcodear colores fuera de tokens.

## ✅ §12 — Traducción ZIP → YavlGold

### Se adopta
- Escala metallic gold de 5 tonos.
- Gradientes metallic.
- Motion language (shift, rotate, sheen, reveal).
- Estructura visual hero / módulos / cta / footer.
- Ghost emoji system.

### No se adopta
- React, TSX, Tailwind y plugin chain.
- Flujo single-file del build de referencia.
- Arquitectura SPA.

Motivo: preservar plataforma actual y performance del entorno objetivo.

---

## §13-§18 — Gobernanza y Extensiones

## ✅ §13 — Checklist Rápido Completo

### Identidad

- [ ] Fondo principal en `#0a0a0a`
- [ ] Acento principal en `#C8A752`
- [ ] Tipografías: Orbitron + Rajdhani + Playfair Display
- [ ] Sin acento azul/morado en UI principal
- [ ] Sin cambio de arquitectura MPA/Vanilla

### Tokens

- [ ] Tokens antes de hardcode — siempre `var(--token)`
- [ ] Espaciado usa escala de §15 (múltiplos de 4px)
- [ ] Íconos siguen escala de §16
- [ ] Estados siguen tokens de §17
- [ ] Light mode vía override de tokens

### Interacción

- [ ] Motion <= 220ms en interacciones UI
- [ ] Hover siempre acompañado de focus-visible
- [ ] Disabled usa opacity 0.4 + cursor: not-allowed
- [ ] Transición estándar: 180ms ease

### Accesibilidad

- [ ] Focus ring visible en todos los interactivos
- [ ] Touch targets mínimo 44x44px
- [ ] prefers-reduced-motion respetado
- [ ] Contraste mínimo 4.5:1 en texto funcional
- [ ] aria-hidden en íconos decorativos
- [ ] Skip link como primer elemento del body
- [ ] `<html lang="es">` presente

### Visual

- [ ] Ghost emojis con opacity 0.02-0.05
- [ ] Íconos solo de Font Awesome 6.5
- [ ] Badges usan familia Orbitron

## ⚖️ §14 — Gobernanza del DNA

"Este documento es la referencia visual histórica fundacional."

Flujo obligatorio para cambios base:
1. Definir primero aquí.
2. Versionar el DNA.
3. Implementar después en CSS/HTML/JS.

### Scope del documento
- SÍ define: color, tipografía, gradientes, motion, componentes visuales, tokens.
- NO define: rutas, API, base de datos, lógica de negocio.

### Orden de prioridad de implementación

| Prioridad | Acción | Ubicación |
| --- | --- | --- |
| Alta | Reusar tokens existentes | `packages/themes/`, `apps/gold/assets/css/tokens.css` |
| Media | Agregar alias compatible si falta token | Sin romper nombres legacy |
| Baja | Evitar hardcode | Siempre `var(--token)` |
| Nunca | Importar React/Tailwind en UI principal | Mantener Vanilla JS + MPA |

---

## §15 — Spacing System

Escala de espaciado basada en incremento de 4px. Todo margen, padding y gap debe usar estos tokens.

### §15.1 — Escala Base (4px grid)

| Token | Valor | px | Uso principal |
|-------|-------|----|---------------|
| `--space-0` | `0` | 0 | Reset explícito |
| `--space-px` | `1px` | 1 | Bordes finos, separadores hairline |
| `--space-0.5` | `0.125rem` | 2 | Micro-ajuste interno |
| `--space-1` | `0.25rem` | 4 | Padding mínimo (badges, tags) |
| `--space-1.5` | `0.375rem` | 6 | Separación ícono-texto inline |
| `--space-2` | `0.5rem` | 8 | Padding interno compacto |
| `--space-3` | `0.75rem` | 12 | Gap entre elementos hermanos |
| `--space-4` | `1rem` | 16 | Padding estándar de componente |
| `--space-5` | `1.25rem` | 20 | Separación media entre grupos |
| `--space-6` | `1.5rem` | 24 | Gap de grid / padding de card |
| `--space-8` | `2rem` | 32 | Separación entre secciones internas |
| `--space-10` | `2.5rem` | 40 | Margen entre bloques de contenido |
| `--space-12` | `3rem` | 48 | Padding vertical de sección |
| `--space-16` | `4rem` | 64 | Separación entre secciones principales |
| `--space-20` | `5rem` | 80 | Espaciado hero / secciones grandes |
| `--space-24` | `6rem` | 96 | Máximo espaciado de sección |

### §15.2 — Alias de Layout

| Token alias | Valor | Contexto |
|-------------|-------|----------|
| `--layout-page-x` | `var(--space-4)` | Padding horizontal body mobile |
| `--layout-page-x-md` | `var(--space-6)` | Padding horizontal body tablet |
| `--layout-page-x-lg` | `var(--space-8)` | Padding horizontal body desktop |
| `--layout-section-y` | `var(--space-16)` | Separación vertical entre secciones |
| `--layout-card-padding` | `var(--space-6)` | Padding interno de cards |
| `--layout-card-gap` | `var(--space-6)` | Gap entre cards en grid |
| `--layout-navbar-h` | `3.5rem` | Altura fija del navbar |
| `--layout-footer-y` | `var(--space-12)` | Padding vertical del footer |

### §15.3 — Alias de Componente

| Token alias | Valor | Uso |
|-------------|-------|-----|
| `--comp-btn-px` | `var(--space-6)` | Padding horizontal botones |
| `--comp-btn-py` | `var(--space-3)` | Padding vertical botones |
| `--comp-badge-px` | `var(--space-3)` | Padding horizontal badges |
| `--comp-badge-py` | `var(--space-1)` | Padding vertical badges |
| `--comp-input-px` | `var(--space-4)` | Padding horizontal inputs |
| `--comp-input-py` | `var(--space-3)` | Padding vertical inputs |
| `--comp-icon-gap` | `var(--space-2)` | Gap entre ícono y texto |
| `--comp-stack-gap` | `var(--space-3)` | Gap vertical en listas apiladas |

### §15.4 — Implementación CSS

```css
:root {
  --space-0:    0;
  --space-px:   1px;
  --space-0\.5: 0.125rem;
  --space-1:    0.25rem;
  --space-1\.5: 0.375rem;
  --space-2:    0.5rem;
  --space-3:    0.75rem;
  --space-4:    1rem;
  --space-5:    1.25rem;
  --space-6:    1.5rem;
  --space-8:    2rem;
  --space-10:   2.5rem;
  --space-12:   3rem;
  --space-16:   4rem;
  --space-20:   5rem;
  --space-24:   6rem;

  --layout-page-x:       var(--space-4);
  --layout-section-y:    var(--space-16);
  --layout-card-padding: var(--space-6);
  --layout-card-gap:     var(--space-6);
  --layout-navbar-h:     3.5rem;

  --comp-btn-px:    var(--space-6);
  --comp-btn-py:    var(--space-3);
  --comp-badge-px:  var(--space-3);
  --comp-badge-py:  var(--space-1);
  --comp-input-px:  var(--space-4);
  --comp-input-py:  var(--space-3);
  --comp-icon-gap:  var(--space-2);
  --comp-stack-gap: var(--space-3);
}

@media (min-width: 768px) {
  :root { --layout-page-x: var(--space-6); }
}
@media (min-width: 900px) {
  :root { --layout-page-x: var(--space-8); }
}
```

### §15.5 — Ejemplo de uso

```css
/* CORRECTO */
.card {
  padding: var(--layout-card-padding);
  margin-bottom: var(--space-6);
}
.btn-gold {
  padding: var(--comp-btn-py) var(--comp-btn-px);
}

/* PROHIBIDO */
.card { padding: 24px; }
```

### §15.6 — Anti-Patrones de Espaciado

- No usar valores arbitrarios (margin: 13px, padding: 27px).
- No mezclar px y rem sin token intermedio.
- No usar margin-top en primer hijo de sección (usar gap o padding del padre).
- No crear tokens locales de espaciado fuera de este sistema.

---

## §16 — Iconografía

Proveedor único: Font Awesome 6.5 Free. Sin excepciones.

### §16.1 — Escala de Tamaños

| Token | Valor | Uso |
|-------|-------|-----|
| `--icon-xs` | `0.75rem` | Indicadores inline, badges |
| `--icon-sm` | `0.875rem` | Junto a texto de cuerpo |
| `--icon-base` | `1rem` | Botones, inputs, navegación |
| `--icon-md` | `1.25rem` | Headers de card, menú |
| `--icon-lg` | `1.5rem` | Destacados en secciones |
| `--icon-xl` | `2rem` | Feature icons, estados vacíos |
| `--icon-2xl` | `3rem` | Hero decorativo, onboarding |
| `--icon-display` | `4rem` | Páginas de estado (error, vacío) |

### §16.2 — Reglas de Color

| Contexto | Color del ícono | Token |
|----------|----------------|-------|
| Navegación activa | Gold principal | `var(--gold-4)` |
| Navegación inactiva | Texto muted | `var(--text-muted)` |
| Dentro de botón primario | Fondo oscuro | `var(--bg-2)` |
| Dentro de botón outline | Gold principal | `var(--gold-4)` |
| Header de card | Gold prestige | `var(--gold-prestige)` |
| Junto a texto de cuerpo | Mismo color | `inherit` |
| Estado éxito | Verde | `var(--color-success)` |
| Estado advertencia | Amarillo | `var(--color-warning)` |
| Estado error | Rojo | `var(--color-error)` |
| Estado info | Azul | `var(--color-info)` |
| Decorativo / hero | Gold light | `var(--gold-5)` |
| Deshabilitado | Muted 50% | `rgba(148,163,184,0.5)` |

### §16.3 — Espaciado Ícono + Texto

```css
.icon-text {
  display: inline-flex;
  align-items: center;
  gap: var(--comp-icon-gap);
}
.btn i, .btn svg {
  font-size: var(--icon-base);
  flex-shrink: 0;
}
.btn-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.btn-icon-sm {
  width: 2rem;
  height: 2rem;
  font-size: var(--icon-sm);
}
```

### §16.4 — Animación de Íconos

| Contexto | Animación | Duración |
|----------|-----------|----------|
| Hover botón con ícono | `translateX(2px)` | 180ms |
| Loading spinner | `rotate 360deg` | 1s linear infinite |
| Notificación nueva | `scale(1 → 1.2 → 1)` | 300ms una vez |
| Éxito de acción | `scale(0 → 1.1 → 1)` | 400ms una vez |
| Decorativo en hero | `breathe` (§6) | 4s |

```css
.btn:hover i {
  transform: translateX(2px);
  transition: transform 180ms ease;
}
.icon-decorative {
  font-size: var(--icon-xl);
  color: var(--gold-5);
  animation: breathe 4s ease-in-out infinite;
}
```

### §16.5 — Implementación CSS

```css
:root {
  --icon-xs:      0.75rem;
  --icon-sm:      0.875rem;
  --icon-base:    1rem;
  --icon-md:      1.25rem;
  --icon-lg:      1.5rem;
  --icon-xl:      2rem;
  --icon-2xl:     3rem;
  --icon-display: 4rem;
}
```

### §16.6 — Anti-Patrones de Iconografía

- No usar librerías de íconos distintas a Font Awesome 6.5 Free.
- No usar SVGs inline si existe el ícono en FA.
- No cambiar color con !important — usar tokens.
- No animar con propiedades que causen reflow.
- No usar íconos decorativos sin `aria-hidden="true"`.
- No usar tamaños fuera de la escala.

---

## §17 — Estados de Componentes

Tokens y reglas para los 5 estados visuales de todo componente interactivo.

### §17.1 — Modelo de Estados

```text
DEFAULT → HOVER → ACTIVE
  ↓         ↓
FOCUS    DISABLED
```

### §17.2 — Tokens de Estado Global

| Token | Valor | Uso |
|-------|-------|-----|
| `--state-hover-overlay` | `rgba(200,167,82,0.08)` | Capa sutil en hover |
| `--state-hover-gold` | `#D4B55A` | Gold más claro en hover |
| `--state-active-overlay` | `rgba(200,167,82,0.15)` | Capa visible en active |
| `--state-active-gold` | `#B8972E` | Gold saturado al presionar |
| `--state-focus-ring` | `0 0 0 2px var(--bg-1), 0 0 0 4px var(--gold-4)` | Doble anillo de foco |
| `--state-focus-ring-offset` | `2px` | Espacio elemento-anillo |
| `--state-disabled-opacity` | `0.4` | Opacidad disabled |
| `--state-disabled-cursor` | `not-allowed` | Cursor disabled |
| `--state-transition` | `all 180ms ease` | Transición estándar |
| `--state-transition-fast` | `all 120ms ease` | Transición rápida |

### §17.3 — Implementación CSS

```css
:root {
  --state-hover-overlay:    rgba(200,167,82,0.08);
  --state-hover-gold:       #D4B55A;
  --state-active-overlay:   rgba(200,167,82,0.15);
  --state-active-gold:      #B8972E;
  --state-focus-ring:       0 0 0 2px var(--bg-1), 0 0 0 4px var(--gold-4);
  --state-focus-ring-offset: 2px;
  --state-disabled-opacity: 0.4;
  --state-disabled-cursor:  not-allowed;
  --state-transition:       all 180ms ease;
  --state-transition-fast:  all 120ms ease;
}
```

### §17.4 — Botón Primario Gold (todos los estados)

```css
.btn-gold {
  background: var(--metallic-btn);
  background-size: 200% 100%;
  color: var(--bg-2);
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--comp-btn-py) var(--comp-btn-px);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: var(--state-transition);
  position: relative;
  overflow: hidden;
}
.btn-gold:hover {
  filter: brightness(1.1);
  box-shadow: var(--shadow-gold-sm);
  transform: translateY(-1px);
}
.btn-gold:active {
  filter: brightness(0.95);
  transform: translateY(0px) scale(0.98);
  box-shadow: var(--shadow-gold-xs);
}
.btn-gold:focus-visible {
  outline: none;
  box-shadow: var(--state-focus-ring);
}
.btn-gold:disabled,
.btn-gold[aria-disabled="true"] {
  opacity: var(--state-disabled-opacity);
  cursor: var(--state-disabled-cursor);
  pointer-events: none;
  filter: grayscale(40%);
}
```

### §17.5 — Botón Outline Gold

```css
.btn-outline-gold {
  background: transparent;
  color: var(--gold-4);
  border: 1px solid var(--border-gold);
  border-radius: var(--radius-sm);
  padding: var(--comp-btn-py) var(--comp-btn-px);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: var(--state-transition);
}
.btn-outline-gold:hover {
  background: var(--state-hover-overlay);
  border-color: var(--gold-4);
  color: var(--gold-5);
}
.btn-outline-gold:active {
  background: var(--state-active-overlay);
  transform: scale(0.98);
}
.btn-outline-gold:focus-visible {
  outline: none;
  box-shadow: var(--state-focus-ring);
}
.btn-outline-gold:disabled {
  opacity: var(--state-disabled-opacity);
  cursor: var(--state-disabled-cursor);
  pointer-events: none;
}
```

### §17.6 — Inputs y Campos de Formulario

```css
.input-gold {
  background: var(--bg-3);
  color: var(--text-primary);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-sm);
  padding: var(--comp-input-py) var(--comp-input-px);
  font-family: 'Rajdhani', sans-serif;
  font-size: var(--text-base);
  transition: var(--state-transition);
  width: 100%;
}
.input-gold:hover {
  border-color: var(--border-gold);
}
.input-gold:focus {
  outline: none;
  border-color: var(--gold-4);
  box-shadow: 0 0 0 3px rgba(200,167,82,0.15);
}
.input-gold.input-error,
.input-gold[aria-invalid="true"] {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
}
.input-gold.input-success {
  border-color: var(--color-success);
}
.input-gold:disabled {
  opacity: var(--state-disabled-opacity);
  cursor: var(--state-disabled-cursor);
  background: var(--bg-0);
}
.input-gold::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}
```

### §17.7 — Cards

```css
.card-gold {
  background: var(--bg-4);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-md);
  padding: var(--layout-card-padding);
  transition: var(--state-transition);
  position: relative;
}
.card-gold.card-clickable:hover {
  border-color: var(--border-gold);
  box-shadow: var(--shadow-gold-sm);
  transform: translateY(-2px);
}
.card-gold.card-clickable:active {
  transform: translateY(0px);
  box-shadow: var(--shadow-gold-xs);
}
.card-gold.card-clickable:focus-visible {
  outline: none;
  box-shadow: var(--state-focus-ring);
}
.card-gold.card-featured {
  border-color: var(--border-gold);
  box-shadow: var(--shadow-gold-sm);
}
.card-gold.card-featured::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--metallic-border);
  background-size: 200% 100%;
  animation: borderShimmer 3s linear infinite;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
```

### §17.8 — Links y Navegación

```css
.link-gold {
  color: var(--gold-4);
  text-decoration: none;
  transition: var(--state-transition-fast);
  cursor: pointer;
}
.link-gold:hover {
  color: var(--gold-5);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.link-gold:active { color: var(--state-active-gold); }
.link-gold:focus-visible {
  outline: none;
  box-shadow: var(--state-focus-ring);
  border-radius: var(--radius-xs);
}
.nav-item {
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  transition: var(--state-transition);
}
.nav-item:hover { color: var(--text-primary); }
.nav-item.active {
  color: var(--gold-4);
  border-bottom: 2px solid var(--gold-4);
}
```

### §17.9 — Badges de Estado

```css
.badge {
  font-family: 'Orbitron', sans-serif;
  font-size: var(--text-xs);
  font-weight: 700;
  padding: var(--comp-badge-py) var(--comp-badge-px);
  border-radius: var(--radius-pill);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.badge-success {
  background: rgba(16,185,129,0.15);
  color: var(--color-success);
  border: 1px solid rgba(16,185,129,0.3);
}
.badge-warning {
  background: rgba(245,158,11,0.15);
  color: var(--color-warning);
  border: 1px solid rgba(245,158,11,0.3);
}
.badge-error {
  background: rgba(239,68,68,0.15);
  color: var(--color-error);
  border: 1px solid rgba(239,68,68,0.3);
}
.badge-info {
  background: rgba(59,130,246,0.15);
  color: var(--color-info);
  border: 1px solid rgba(59,130,246,0.3);
}
.badge-gold {
  background: rgba(200,167,82,0.15);
  color: var(--gold-4);
  border: 1px solid var(--border-gold);
}
```

### §17.10 — Tabla Resumen de Estados

| Componente | Hover | Active | Focus | Disabled |
|------------|-------|--------|-------|----------|
| Botón gold | brightness(1.1) + sombra + Y(-1px) | brightness(0.95) + scale(0.98) | Doble anillo gold | opacity 0.4 + grayscale |
| Botón outline | Overlay 0.08 + border gold | Overlay 0.15 + scale(0.98) | Doble anillo gold | opacity 0.4 |
| Input | Border gold sutil | — | Border gold + glow 0.15 | opacity 0.4 + bg oscuro |
| Card clickable | Border gold + sombra + Y(-2px) | Y(0) + sombra reducida | Doble anillo gold | — |
| Link | Gold light + underline | Gold saturado | Anillo gold + radius | — |

### §17.11 — Anti-Patrones de Estado

- No usar :hover sin :focus-visible equivalente.
- No animar estados con duración mayor a 220ms.
- No usar outline: none sin reemplazo visual de foco.
- No usar opacity: 0 para disabled (mínimo 0.3).
- No inventar estados sin token.
- No omitir cursor: not-allowed en disabled.

---

## §18 — Accesibilidad

Estándar objetivo: WCAG 2.1 nivel AA como mínimo.

### §18.1 — Focus Ring System

| Token | Valor | Uso |
|-------|-------|-----|
| `--a11y-focus-ring` | `0 0 0 2px var(--bg-1), 0 0 0 4px var(--gold-4)` | Anillo doble estándar |
| `--a11y-focus-ring-error` | `0 0 0 2px var(--bg-1), 0 0 0 4px var(--color-error)` | Foco en campo con error |
| `--a11y-focus-ring-inset` | `inset 0 0 0 2px var(--gold-4)` | Foco interno |
| `--a11y-focus-width` | `2px` | Grosor del anillo |
| `--a11y-focus-offset` | `2px` | Separación del elemento |

```css
:root {
  --a11y-focus-ring:       0 0 0 2px var(--bg-1), 0 0 0 4px var(--gold-4);
  --a11y-focus-ring-error: 0 0 0 2px var(--bg-1), 0 0 0 4px var(--color-error);
  --a11y-focus-ring-inset: inset 0 0 0 2px var(--gold-4);
  --a11y-focus-width:      2px;
  --a11y-focus-offset:     2px;
}

*:focus-visible {
  outline: none;
  box-shadow: var(--a11y-focus-ring);
}
*:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
```

### §18.2 — Contraste de Color

| Tipo de contenido | Ratio mínimo | Estándar |
|-------------------|-------------|----------|
| Texto normal (< 18px) | 4.5:1 | AA |
| Texto grande (≥ 18px bold) | 3:1 | AA |
| Componentes UI | 3:1 | AA |
| Texto decorativo | Sin requisito | — |

### §18.3 — Validación de Paleta

| Combinación | Ratio | Resultado |
|-------------|-------|-----------|
| #fff sobre #0a0a0a | 19.5:1 | ✅ AAA |
| #ccc sobre #0a0a0a | 14.8:1 | ✅ AAA |
| #94A3B8 sobre #0a0a0a | 7.0:1 | ✅ AAA |
| #C8A752 sobre #0a0a0a | 7.2:1 | ✅ AAA |
| #C8A752 sobre #1a1a1f | 5.9:1 | ✅ AA |
| #E8D48B sobre #0a0a0a | 11.2:1 | ✅ AAA |
| #6b5a3e sobre #0a0a0a | 2.8:1 | ⚠️ Solo decorativo |
| #10B981 sobre #0a0a0a | 6.4:1 | ✅ AA |
| #EF4444 sobre #0a0a0a | 4.6:1 | ✅ AA |
| #F59E0B sobre #0a0a0a | 7.8:1 | ✅ AAA |

Regla: `--gold-3` (`#6b5a3e`) SOLO decorativo, NUNCA texto funcional.

### §18.4 — Touch Targets

Crítico para agricultores con manos grandes o guantes.

| Token | Valor | Uso |
|-------|-------|-----|
| `--a11y-touch-min` | `44px` | Mínimo absoluto WCAG |
| `--a11y-touch-recommended` | `48px` | Recomendado YavlGold |
| `--a11y-touch-spacing` | `8px` | Espacio mínimo entre targets |

```css
:root {
  --a11y-touch-min:         44px;
  --a11y-touch-recommended: 48px;
  --a11y-touch-spacing:     8px;
}

button, a, input[type="checkbox"],
input[type="radio"], select,
[role="button"], [role="tab"], [role="menuitem"] {
  min-height: var(--a11y-touch-min);
  min-width: var(--a11y-touch-min);
}

.btn-gold, .btn-outline-gold, .btn-nav {
  min-height: var(--a11y-touch-recommended);
}
```

### §18.5 — Movimiento Reducido

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .text-metallic, .btn-gold {
    animation: none;
    background-size: 100% 100%;
  }
  .hero::after,
  [class*="ghost"]::before,
  [class*="ghost"]::after {
    animation: none;
    opacity: 0.02;
  }
}
```

### §18.6 — Screen Reader Utilities

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
.sr-only-focusable:focus,
.sr-only-focusable:focus-visible {
  position: static;
  width: auto; height: auto;
  padding: var(--comp-btn-py) var(--comp-btn-px);
  margin: 0; overflow: visible;
  clip: auto; white-space: normal;
  background: var(--gold-4);
  color: var(--bg-2);
  font-weight: 700;
  z-index: 9999;
}
```

### §18.7 — Atributos ARIA Obligatorios

| Componente | Atributos requeridos |
|------------|---------------------|
| Ícono decorativo | `aria-hidden="true"` |
| Ícono funcional sin texto | `aria-label="descripción"` |
| Botón de ícono solo | `aria-label="acción"` |
| Input con error | `aria-invalid="true"` + `aria-describedby` |
| Sección expandible | `aria-expanded="true/false"` |
| Modal | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` |
| Alerta / toast | `role="alert"` + `aria-live="polite"` |
| Barra de progreso | `role="progressbar"` + `aria-valuenow/min/max` |
| Navegación | `<nav aria-label="Navegación principal">` |

### §18.8 — Skip Link

```html
<body>
  <a href="#main-content" class="sr-only-focusable">
    Saltar al contenido principal
  </a>
  <nav aria-label="Navegación principal">...</nav>
  <main id="main-content">...</main>
</body>
```

### §18.9 — Checklist de Accesibilidad por Página

- [ ] Skip link presente
- [ ] Todas las imágenes tienen alt
- [ ] Íconos decorativos con aria-hidden="true"
- [ ] Botones de ícono con aria-label
- [ ] Inputs con label asociado
- [ ] Alertas con role="alert"
- [ ] Texto funcional pasa 4.5:1
- [ ] Touch targets mínimo 44x44px
- [ ] prefers-reduced-motion respetado
- [ ] Navegable 100% con teclado
- [ ] Orden de foco lógico
- [ ] Errores con texto, no solo color
- [ ] `<html lang="es">`

### §18.10 — Anti-Patrones de Accesibilidad

- No usar outline: none sin box-shadow de reemplazo.
- No comunicar información SOLO con color.
- No usar tabindex mayor a 0.
- No crear componentes custom sin roles ARIA.
- No ocultar contenido con display: none si debe ser anunciado.
- No usar placeholder como sustituto de label.

---

## §19 — Canon de Modales YavlGold V10.1

Estado: `ACTIVO`
Version: `V10.1`
Pieza madre de referencia: `agro-ia-wizard.js` — modal "Configura tu asistente"

Este capitulo formaliza el lenguaje visual obligatorio para TODOS los modales, dialogs, wizards, paneles flotantes y superficies emergentes de YavlGold.

### §19.1 — Principio de Sobriedad Funcional

En modales funcionales, la prioridad es **claridad, jerarquia, operacion y consistencia**. Se adopta el lenguaje **flat-gold sobrio** como canon visual para todas las superficies emergentes.

Los gradientes metallic (§3), gold shadows y shimmer animations tienen lugar legitimo en landing pages, hero sections, module cards y elementos prestige. En modales funcionales producen ruido visual y se omiten intencionalmente.

La pieza madre de referencia es el modal **"Configura tu asistente"** (`agro-ia-wizard.js`). No se copia a ciegas cada detalle, pero si se adopta su tono, densidad, estructura y disciplina visual como base obligatoria.

### §19.2 — Shell Estandar de Modal

| Propiedad | Valor canonico |
|---|---|
| Background | `var(--bg-2)` |
| Border | `1px solid var(--gold-4)` — flat, sin metallic shimmer |
| Border radius | `var(--radius-md)` (12px desktop, 8px mobile <=480px) |
| Shadow | `0 8px 32px rgba(0,0,0,0.5)` — sombra oscura, sin gold tint |
| Max width — compacto | `min(460px, calc(100vw - 32px))` |
| Max width — ancho | `min(620px, calc(100vw - 32px))` |
| Overlay | `rgba(0,0,0,0.85)` + `backdrop-filter: blur(8px)` |
| Z-index | `>= 10000` |
| Closing transition | `opacity 180ms ease` |

### §19.3 — Header Estandar

- **Estructura**: icon + title (izquierda) | close button (derecha)
- **Padding**: `16px 20px 12px`
- **Border-bottom**: `1px solid var(--border-neutral)`
- **Icon**: Font Awesome, `color: var(--gold-4)`, `font-size: 1.1rem`
- **Title**: Orbitron, `0.95rem`, `font-weight: 600`, `color: var(--text-primary)`
- **Close**: `&times;` o `fa-xmark`, `color: var(--text-muted)`, hover `var(--text-primary)`
- **Gap icono-titulo**: `10px`

### §19.4 — Body

- **Padding**: `20px` (desktop), `16px` (mobile <=480px)
- **Step title**: Orbitron `1rem` / `600`, `color: var(--text-primary)`
- **Descripcion**: Rajdhani `0.85rem`, `color: var(--text-muted)`
- **Spacing entre bloques**: `16-18px`

### §19.5 — Botones de Modal

| Tipo | Estilo | Hover |
|---|---|---|
| **Primary** | `background: var(--gold-4)`, `color: var(--bg-1)`, flat | `opacity: 0.9` |
| **Secondary** | `background: var(--bg-3)`, `border: 1px solid var(--border-neutral)` | `border-color: var(--gold-5)` |
| **Ghost** | sin background, `color: var(--text-muted)` | `color: var(--text-primary)` |

- **Font**: Rajdhani, `0.85rem`, `font-weight: 600`
- **Padding**: `8px 18px`
- **Border radius**: `var(--radius-sm)` (6px)
- **Transition**: `150ms ease`
- **Disabled**: `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`
- **Sin transform en hover**: no `translateY`, no `scale` — estilo flat intencional

### §19.6 — Cards y Chips Seleccionables

| Propiedad | Card | Chip |
|---|---|---|
| Background | `var(--bg-3)` | `var(--bg-3)` |
| Border | `1px solid var(--border-neutral)` | `1px solid var(--border-neutral)` |
| Radius | `var(--radius-sm)` (8px) | `20px` (pill) |
| Hover | `border-color: var(--gold-5)` | `border-color: var(--gold-5)` |
| Selected | border `var(--gold-4)`, bg `rgba(200,167,82,0.08)` | border gold + text gold + bg tint |
| Transition | `150ms ease` | `150ms ease` |

**Goal chips** (con icono): radius `8px`, `gap: 8px` entre icono y texto.

### §19.7 — Progress Bar (wizards)

- **Height**: `3px`
- **Track**: `var(--bg-3)`
- **Bar**: `var(--gold-4)`
- **Transition**: `width 220ms ease`

### §19.8 — Token Aliases para Modales

Los siguientes aliases son compatibles con el ADN y pueden usarse en modales sin violar el sistema de tokens:

| Alias | Mapeo canonico | Fallback |
|---|---|---|
| `--text-1` | `var(--text-primary)` | `#ffffff` |
| `--text-2` | `var(--text-secondary)` | `#cccccc` |
| `--text-3` | `var(--text-muted)` | `#94A3B8` |
| `--border-1` | `var(--border-neutral)` | `rgba(255,255,255,0.08)` |

El fallback de `--bg-2` como `#141414` (ligeramente mas claro que el canon `#0B0C0F`) es aceptable en modales para distinguirse del fondo de la pagina.

### §19.9 — Animaciones

| Elemento | Animacion | Duracion |
|---|---|---|
| Overlay open | `opacity: 0 → 1` | `180ms ease` |
| Overlay close | `opacity: 1 → 0` | `180ms ease` |
| Progress bar | `width` transition | `220ms ease` |
| Cards/chips/botones | `border-color`, `background` | `150ms ease` |

**Prohibidos en modales funcionales:**
- `transform` en hover (no `translateY`, no `scale`)
- Metallic shimmer, gold glow, gradient animation
- Cualquier animacion que cause reflow

**`prefers-reduced-motion: reduce`**: desactiva TODAS las transitions del modal.

### §19.10 — Accesibilidad Obligatoria (sin excepciones)

TODO modal debe incluir:

- `role="dialog"` en el overlay
- `aria-modal="true"`
- `aria-labelledby` apuntando al titulo
- `aria-label` en el boton de cerrar
- `:focus-visible` con `box-shadow: var(--state-focus-ring)` en todo elemento interactivo
- Focus inicial al primer campo interactivo al abrir
- Escape key cierra el modal
- Overlay click cierra el modal (cuando el caso lo permita)
- Touch targets minimo `44px` en botones de accion
- Focus retorna al trigger al cerrar

### §19.11 — Superficies Cubiertas (scope obligatorio)

Esta regla aplica sin excepcion a:

- Login y registro
- Nuevo cultivo / editar cultivo
- Editar fiado
- Nuevo cliente wizard
- Nuevo carrito
- Nueva cartera operativa / editar cartera
- Nueva tarea
- Ajustes
- Panel de control global
- Feedback / encuestas
- Notificaciones
- Centro de alertas
- Configuracion de asistente IA
- **Reemplazo de prompt() nativo del navegador**
- CUALQUIER superficie emergente nueva o legacy
- CUALQUIER overlay funcional relacionado

### §19.12 — Migracion Legacy

Los modales existentes se migraran progresivamente cuando se toquen por mantenimiento, bugfix o nuevas features. **No se requiere migracion masiva.**

Prioridad de migracion:
1. Modales que usan `prompt()` nativo (reemplazo urgente) — **CRITICA**
2. Modales con estilos inconsistentes o hardcodeados — **ALTA**
3. Modales parcialmente compatibles — **MEDIA**
4. Resto de superficies legacy — **BAJA**

Toda pieza nueva **debe nacer ya bajo §19**.

### §19.13 — Anti-Patrones Prohibidos en Modales

- Usar `window.prompt()`, `window.alert()`, `window.confirm()` nativos del navegador
- Metallic gradients o shimmer en botones de modal funcional
- Gold shadow en shell de modal (sombra oscura standard)
- Transform en hover (translateY, scale) — usar opacity flat
- Sin focus-visible en elementos interactivos
- Sin atributos ARIA de dialog/modal
- Hardcodear colores fuera de tokens sin justificacion
- Duplicar estilos de shell modal en cada modulo sin reutilizar patron

---

## §20 — Ley de Separación Semántica de Superficies

### Principio

Cada vista debe tener una función primaria clara.
No mezclar en una misma superficie categorías semánticas distintas si eso degrada claridad, lectura o operación.

En YavlGold, una pantalla no debe intentar ser al mismo tiempo:
- historial,
- dashboard,
- panel de KPIs,
- formulario,
- centro de acciones,
- y navegación secundaria.

Cuando una vista mezcle demasiadas capas, el agente debe separar, no apilar.

---

### §20.1 — Regla base

Toda superficie debe responder primero:

> ¿Cuál es la tarea principal de esta vista?

Y el diseño debe obedecer esa respuesta.

Ejemplos:
- **Vista de historial** → historial, filtros, ledger, acciones relacionadas
- **Vista estadística** → KPIs, comparativas, resúmenes, progreso, lectura financiera
- **Vista operativa** → acciones, formularios, flujos de registro
- **Vista de detalle** → contexto breve + contenido principal de esa categoría
- **Vista de navegación** → volver, cambiar de contexto, salir, moverse

Si una capa no pertenece a la función principal de la vista, debe:
- moverse a otra superficie,
- comprimirse,
- o vivir como bloque secundario claramente separado.

---

### §20.2 — Prohibición de mezclas semánticas pesadas

Queda prohibido mezclar como bloque dominante dentro de una misma vista:

- historial + dashboard estadístico grande
- ledger + mini panel de métricas protagonista
- timeline + resumen financiero profundo
- detalle operativo + comparador analítico pesado
- navegación crítica escondida entre bloques no relacionados

Ejemplo canónico:
En **Ver detalle** de un cliente canónico de Cartera Viva,
la vista debe priorizar **historial + acciones + contexto breve**.
Las estadísticas grandes no deben vivir allí como protagonista visual.

---

### §20.3 — Regla de protagonismo visual

Debe existir una sola capa protagonista por vista.

La jerarquía correcta es:

1. tarea principal
2. contexto breve
3. acciones relacionadas
4. contenido secundario
5. navegación complementaria

No se debe permitir que una capa secundaria robe protagonismo visual a la principal.

Ejemplos de violación:
- una tarjeta financiera gigante antes del historial;
- KPIs dominando una vista cuyo propósito era revisar registros;
- bloques de progreso ocupando el lugar del ledger real.

---

### §20.4 — Regla de separación por categoría

Si un contenido pertenece a otra categoría funcional, debe salir de esa vista.

Ejemplos:
- estadísticas profundas → sección estadística o despliegue financiero
- historial de movimientos → vista de historial
- acciones de registro → barra operativa o panel de acciones
- navegación de retorno → header o toolbar visible
- contexto breve → cabecera compacta

No convertir una vista en "cajón de sastre" por conveniencia.

---

### §20.5 — Regla de navegación visible

Toda vista de detalle o subnivel debe tener una salida clara, visible y fácil de encontrar.

El botón Volver:
- no debe perderse visualmente,
- no debe quedar enterrado entre bloques ajenos,
- no debe competir con tarjetas pesadas,
- debe vivir en header, toolbar o zona naturalmente visible.

Perder el botón de retorno es una falla UX, no un detalle menor.

---

### §20.6 — Regla de acciones operativas

Las acciones relevantes deben existir, pero no dominar la semántica de la vista.

Ejemplo:
en una vista de historial se permiten botones como:
- nuevo fiado
- nuevo cobro
- nueva pérdida
- editar cliente

pero deben vivir como barra operativa compacta,
no como excusa para convertir la vista en dashboard híbrido.

---

### §20.7 — Regla de futura expansión

Cuando un bloque importante no cabe semánticamente en la vista actual, no se fuerza.
Se crea o se planifica una superficie futura adecuada.

Ejemplo válido:
- "Despliegue financiero" para métricas y resumen económico profundo del cliente
- dejar "Ver detalle" centrado solo en historial operativo

Primero claridad.
Después expansión.

---

### §20.8 — Anti-patrones prohibidos

- convertir una vista de historial en mini dashboard
- mezclar KPIs grandes con ledger sin separación clara
- poner navegación crítica en zonas de baja visibilidad
- usar una tarjeta estadística dominante dentro de una vista cuyo propósito es revisar registros
- agregar bloques "porque caben"
- mezclar capa analítica y capa operativa sin necesidad real
- esconder la tarea principal detrás de contexto secundario

---

### §20.9 — Regla práctica para agentes

Antes de agregar un bloque nuevo, el agente debe preguntarse:

1. ¿Esto pertenece semánticamente a esta vista?
2. ¿Es contenido principal o secundario?
3. ¿Compite visualmente con la tarea principal?
4. ¿Debería vivir en otra categoría o despliegue?

Si la respuesta indica mezcla o fatiga, el bloque debe separarse.

---

### §20.10 — Criterio final

En YavlGold, claridad semántica > densidad visual.

Una vista limpia, enfocada y categóricamente correcta vale más que una pantalla cargada con "de todo un poco".

---

# 💎 ADN VISUAL INMUTABLE V10.0 💎

Estado: ACTIVO · Fecha: 2026-02-18
Fuente de inspiracion: `review-submitted-code.zip`

Cobertura actual: `§0-§20`

**Tu finca merece tecnologia de primera. YavlGold nace del campo, para el campo.**
— Filosofia YavlGold

© 2026 YavlGold · Release activo V1 · ADN Visual Inmutable V10.0 · §0-§20 · Open Source (MIT License)
