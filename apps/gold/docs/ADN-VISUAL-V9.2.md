# 🧬 YAVLGOLD V9.2 VISUAL DNA - BLOQUE INMUTABLE

> **ESTADO:** PRODUCCIÓN ACTIVA - CERRADO
> **FECHA:** 31 Diciembre 2025
> **FUENTE OFICIAL:** `apps/gold/index.html` + `apps/gold/assets/css/unificacion.css`
> **JERARQUÍA:** `index.html` es LA LEY SUPREMA

---

## 🔤 TIPOGRAFÍAS OFICIALES (INMUTABLES)

**DE `index.html` (líneas 33-34, 101, 119):**

```css
font-family: 'Orbitron', sans-serif; /* HEADINGS - weights: 700, 900 */
font-family: 'Rajdhani', sans-serif; /* BODY - weights: 400, 600, 700 */
```

**DE `unificacion.css` (líneas 9-10):**

```css
--font-heading: 'Orbitron', sans-serif;
--font-body: 'Rajdhani', sans-serif;
```

- ❌ **PROHIBIDO:** Cambiar por otra tipografía
- ✅ **OBLIGATORIO:** Usar Orbitron para headings, Rajdhani para body

---

## 🎨 PALETA DE COLORES (INMUTABLE)

### PALETA DORADA PREMIUM

**DE `index.html` (líneas 40-48):**

```css
:root {
  /* PALETA DORADA PREMIUM - BRANDING */
  --gold-principal: #C8A752;      /* Dorado principal */
  --gold-light: #E4D08E;          /* Dorado claro */
  --gold-dark: #9D8040;           /* Dorado oscuro */

  /* PALETA DORADA VIBRANTE - CTAs & ACCIONES */
  --gold-vibrante: #D4AF37;       /* Vibrante principal */
  --gold-vibrante-light: #E8C65A; /* Vibrante claro */
  --gold-vibrante-dark: #B8941F;  /* Vibrante oscuro */
}
```

### PALETA NEGRA OFICIAL

**DE `index.html` (líneas 49-53):**

```css
:root {
  --black: #0a0a0a;            /* Negro puro */
  --gray-darkest: #1a1a1a;     /* Gris muy oscuro */
  --gray-dark: #2a2a2a;        /* Gris oscuro */
  --gray-medium: #3a3a3a;      /* Gris medio */
}
```

### COLORES DE TEMA

**DE `index.html` (líneas 63-68):**

```css
:root {
  --bg-primary: #0a0a0a;       /* Fondo principal - Negro */
  --bg-secondary: #1a1a1a;     /* Fondo secundario */
  --text-primary: #ffffff;     /* Texto principal - Blanco */
  --text-secondary: #cccccc;   /* Texto secundario */
  --border-color: #2a2a2a;     /* Borde */
}
```

**DE `unificacion.css` (líneas 12-26):**

```css
:root,
[data-theme="dark"] {
  --color-primary: #111111;
  --color-secondary: #C8A752;
  --color-accent: #C8A752;

  --bg-dark: #0a0a0a;
  --bg-darker: #0B0C0F;
  --bg-body: #0B0C0F;
  --text-light: #e2e8f0;
  --text-primary: #ffffff;
  --text-muted: #94a3b8;
  --card-bg: rgba(17, 17, 17, 0.9);
  --card-bg-solid: #111111;
}
```

- ❌ **PROHIBIDO:** Usar cualquier tono de azul, morado, verde
- ✅ **OBLIGATORIO:** Solo negro + dorado + grises de la paleta oficial

---

## ✨ SOMBRAS PREMIUM

**DE `index.html` (líneas 54-62):**

```css
:root {
  /* Sombras Premium */
  --shadow-gold-sm: 0 2px 10px rgba(200, 167, 82, 0.2);
  --shadow-gold-md: 0 5px 20px rgba(200, 167, 82, 0.3);
  --shadow-gold-lg: 0 10px 40px rgba(200, 167, 82, 0.4);
  --shadow-gold-xl: 0 20px 60px rgba(200, 167, 82, 0.5);

  --shadow-vibrante-sm: 0 2px 10px rgba(212, 175, 55, 0.2);
  --shadow-vibrante-md: 0 5px 20px rgba(212, 175, 55, 0.3);
  --shadow-vibrante-lg: 0 10px 40px rgba(212, 175, 55, 0.4);
  --shadow-vibrante-xl: 0 20px 60px rgba(212, 175, 55, 0.5);
}
```

- ❌ **PROHIBIDO:** Crear sombras azules o de otros colores
- ✅ **OBLIGATORIO:** Solo sombras doradas `rgba(200, 167, 82, X)` o vibrantes `rgba(212, 175, 55, X)`

---

## 🌙 TEMA LIGHT (INMUTABLE)

**DE `index.html` (líneas 71-85):**

```css
body.light-mode {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #0a0a0a;
  --text-secondary: #666666;
  --black: #0a0a0a;
  --gray-darkest: #f0f0f0;
  --gray-dark: #e0e0e0;
  --gray-medium: #d0d0d0;
  --border-color: #e0e0e0;

  --shadow-gold-sm: 0 2px 10px rgba(200, 167, 82, 0.15);
  --shadow-gold-md: 0 5px 20px rgba(200, 167, 82, 0.25);
  --shadow-gold-lg: 0 10px 40px rgba(200, 167, 82, 0.35);
  --shadow-gold-xl: 0 20px 60px rgba(200, 167, 82, 0.45);
}
```

---

## 🎬 ANIMACIONES OFICIALES

**DE `index.html` (líneas 126-200):**

```css
@keyframes breathe {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 20px rgba(200, 167, 82, 0.4));
  }
  50% {
    transform: scale(1.08);
    filter: drop-shadow(0 0 50px rgba(200, 167, 82, 0.8));
  }
}

@keyframes textGlow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(200, 167, 82, 0.5),
                 0 0 20px rgba(200, 167, 82, 0.3),
                 0 0 30px rgba(200, 167, 82, 0.2);
  }
  50% {
    text-shadow: 0 0 20px rgba(200, 167, 82, 0.8),
                 0 0 40px rgba(200, 167, 82, 0.6),
                 0 0 60px rgba(200, 167, 82, 0.4);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1, 1); }
  50% { transform: scale(1.05, 1.05); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}
```

- ❌ **PROHIBIDO:** Crear animaciones con colores no dorados
- ✅ **OBLIGATORIO:** Solo usar colores dorados en animaciones

---

## 🏗️ ESTRUCTURA PRINCIPAL

| Componente | Líneas | Características |
|------------|--------|-----------------|
| **Navbar** | 205-522 | Logo circular 48px, animación breathe, hover dorado |
| **Hero** | 526-608 | Logo 200px rotado 30°, título 4.5rem gradiente dorado |
| **Features** | 659-812 | Grid 320px mínimo, hover translateY(-12px) scale(1.02) |
| **Footer** | 964-1010 | Logo SVG limpio sin marco, links hover dorado |

---

## ⚠️ REGLAS DE ORO (INMUTABLES)

| Regla | Detalle |
|-------|---------|
| 🚫 NO azul oscuro | `#1e3a8a`, `#0f172a`, `#1e293b`, `#334155`, `#3b82f6`, `#8b5cf6` **PROHIBIDOS** |
| ✅ Solo negro profundo | `#0a0a0a`, `#0B0C0F`, `#1a1a1a` únicos negros permitidos |
| ✅ Solo dorado oficial | `#C8A752`, `#E4D08E`, `#9D8040`, `#D4AF37` únicos dorados permitidos |
| 🚫 NO cambiar tipografías | Orbitron y Rajdhani son **inmutables** |
| 🚫 NO cambiar animaciones | breathe, textGlow, pulse, float son **obligatorias** |
| 🚫 NO marcos rectangulares | Footer logo debe ser SVG limpio sin box-shadow ni background |

---

## 📐 REFERENCIAS DE ARCHIVOS

| Archivo | Descripción | Líneas |
|---------|-------------|--------|
| `apps/gold/index.html` | Estructura maestra | 2111 |
| `apps/gold/assets/css/unificacion.css` | Variables CSS globales | 429 |
| `apps/gold/assets/js/auth/authClient.js` | Sistema de autenticación | - |
| `apps/gold/assets/js/auth/authUI.js` | UI de autenticación | - |
| `vite.config.js` | Build config | - |

---

> **ESTADO DEL ADN:** ✅ SELLADO Y CONGELADO
> **AUTORIDAD:** `index.html` es la LEY SUPREMA
> **DOCUMENTACIÓN ANTERIOR:** ❌ OBSOLETA si contradice este bloque

---

**FIN DEL BLOQUE INMUTABLE**
