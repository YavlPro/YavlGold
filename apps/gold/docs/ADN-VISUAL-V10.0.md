# 💎 ADN VISUAL INMUTABLE V10.0 💎
# YavlGold — ADN Visual Inmutable

Documento completo del sistema de diseño. Referencia visual inmutable e inmutablemente oficial.

---

## Inmutable V10.0

- Estado: `ACTIVO`
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

---

## 🧬 DNA del Proyecto

**YavlGold — Mision, No Negociables, Stack y Filosofia**

| Campo | Valor |
| --- | --- |
| Proyecto | YavlGold |
| Release visible actual | V1 |
| Contexto historico de formalizacion | V9.8 |
| DNA Version | V10.0 — Inmutable |
| Estado | ACTIVO |
| Autor | Yerikson Varela |
| Origen | Táchira, Venezuela 🇻🇪 |
| Fecha | 2026-02-18 |
| Licencia | MIT Open Source |

---

## 📋 §0 — Misión del Documento

Este archivo define el DNA visual oficial e inmutable de YavlGold.

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

## §13-§14 — Gobernanza

## ✅ §13 — Checklist Rápido

- [ ] Fondo principal en `#0a0a0a`.
- [ ] Acento principal en `#C8A752`.
- [ ] Tipografías: Orbitron + Rajdhani.
- [ ] Tokens antes de hardcode.
- [ ] Motion <= 220ms en interacciones.
- [ ] Sin acento azul/morado en UI principal.
- [ ] Sin cambio de arquitectura MPA/Vanilla.
- [ ] Ghost emojis con opacity `0.02-0.05`.
- [ ] Light mode vía override de tokens.
- [ ] `prefers-reduced-motion` respetado.

## ⚖️ §14 — Gobernanza del DNA

"Este documento es la referencia visual inmutable."

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

# 💎 ADN VISUAL INMUTABLE V10.0 💎

Estado: ACTIVO · Fecha: 2026-02-18  
Fuente de inspiración: `review-submitted-code.zip`

**Tu finca merece tecnología de primera. YavlGold nace del campo, para el campo.**  
— Filosofía YavlGold

© 2026 YavlGold · Release activo V1 · ADN Visual Inmutable V10.0 · Open Source (MIT License)
