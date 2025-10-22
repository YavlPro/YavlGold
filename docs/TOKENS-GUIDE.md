# 🎨 Guía de Tokens de Diseño YavlGold

Esta guía documenta el sistema de tokens CSS unificado de YavlGold, que garantiza consistencia visual en todo el proyecto.

## 📋 Índice

1. [Colores](#colores)
2. [Tipografía](#tipografía)
3. [Espaciado](#espaciado)
4. [Sombras y Efectos](#sombras-y-efectos)
5. [Transiciones](#transiciones)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🎨 Colores

### Dorados Principales

```css
--gg-gold-primary: #C8A752;   /* Uso general, botones, iconos */
--gg-gold-bright: #C8A752;    /* Hover states, acentos */
--gg-gold-dark: #8B7842;      /* Texto sobre fondos claros */
--gg-gold-light: #E5D4A6;     /* Fondos sutiles */
```

**Cuándo usar cada uno:**
- **primary**: Color principal para botones, iconos, enlaces
- **bright**: Estados hover, elementos destacados
- **dark**: Textos dorados sobre fondos claros
- **light**: Fondos con toque dorado sutil

### Gradientes Dorados

```css
--gg-gradient-gold: linear-gradient(135deg, #C8A752 0%, #C8A752 100%);
--gg-gradient-shimmer: linear-gradient(45deg, #C8A752, #C8A752, #C8A752);
```

**Uso recomendado:**
```css
.button-premium {
  background: var(--gg-gradient-gold);
  color: var(--gg-bg-primary);
}

.hero-title {
  background: var(--gg-gradient-shimmer);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  background-size: 200% 200%;
  animation: shimmer 3s infinite;
}
```

### Transparencias Doradas

Para overlays y efectos sutiles:

```css
--gg-gold-05: rgba(200, 167, 82, 0.05);   /* Muy sutil */
--gg-gold-10: rgba(200, 167, 82, 0.1);    /* Hover sobre negro */
--gg-gold-20: rgba(200, 167, 82, 0.2);    /* Fondos de cards */
--gg-gold-30: rgba(200, 167, 82, 0.3);    /* Bordes visibles */
--gg-gold-50: rgba(200, 167, 82, 0.5);    /* Overlays */
```

### Fondos Oscuros

```css
--gg-bg-primary: #0B0C0F;                 /* Fondo principal */
--gg-bg-secondary: #0a0a0a;               /* Secciones alternas */
--gg-bg-card: #111111;                    /* Cards sólidos */
--gg-bg-card-glass: rgba(17, 17, 17, 0.9); /* Cards con blur */
```

### Textos

```css
--gg-text-primary: #e2e8f0;    /* Texto principal */
--gg-text-secondary: #ffffff;   /* Títulos importantes */
--gg-text-muted: #94a3b8;      /* Texto secundario */
--gg-text-disabled: #64748b;    /* Deshabilitado */
```

### Estados (Success, Error, Warning, Info)

```css
--gg-success: #10b981;
--gg-error: #ef4444;
--gg-warning: #f59e0b;
--gg-info: #3b82f6;
```

---

## ✍️ Tipografía

### Familias de Fuentes

```css
--gg-font-sans: 'Montserrat', sans-serif;    /* Texto general */
--gg-font-serif: 'Playfair Display', serif;  /* Títulos elegantes */
--gg-font-mono: 'Courier New', monospace;    /* Código */
```

### Tamaños de Fuente

```css
--gg-text-xs: 0.75rem;      /* 12px - Pequeño */
--gg-text-sm: 0.875rem;     /* 14px - Secundario */
--gg-text-base: 1rem;       /* 16px - Base */
--gg-text-lg: 1.125rem;     /* 18px - Destacado */
--gg-text-xl: 1.25rem;      /* 20px - Subtítulos */
--gg-text-2xl: 1.5rem;      /* 24px */
--gg-text-3xl: 1.875rem;    /* 30px */
--gg-text-4xl: 2.25rem;     /* 36px - Títulos */
--gg-text-5xl: 3rem;        /* 48px - Hero */
--gg-text-6xl: 3.75rem;     /* 60px - Extra grande */
```

### Pesos de Fuente

```css
--gg-font-light: 300;
--gg-font-normal: 400;
--gg-font-medium: 500;
--gg-font-semibold: 600;
--gg-font-bold: 700;
```

### Line Heights

```css
--gg-leading-tight: 1.2;     /* Títulos */
--gg-leading-normal: 1.5;    /* Texto general */
--gg-leading-relaxed: 1.7;   /* Lecturas largas */
--gg-leading-loose: 2;       /* Espaciado extra */
```

**Ejemplo de uso:**

```css
h1 {
  font-family: var(--gg-font-serif);
  font-size: var(--gg-text-5xl);
  font-weight: var(--gg-font-bold);
  line-height: var(--gg-leading-tight);
  color: var(--gg-text-secondary);
}

p {
  font-family: var(--gg-font-sans);
  font-size: var(--gg-text-base);
  line-height: var(--gg-leading-relaxed);
  color: var(--gg-text-primary);
}
```

---

## 📏 Espaciado

Sistema basado en múltiplos de 8px:

```css
--gg-space-xs: 4px;
--gg-space-sm: 8px;
--gg-space-md: 16px;
--gg-space-lg: 24px;
--gg-space-xl: 32px;
--gg-space-2xl: 48px;
--gg-space-3xl: 64px;
```

**Recomendaciones:**
- **xs (4px)**: Espaciado mínimo entre elementos relacionados
- **sm (8px)**: Padding interno de botones pequeños
- **md (16px)**: Padding estándar de cards
- **lg (24px)**: Margen entre secciones
- **xl (32px)**: Padding de secciones grandes
- **2xl, 3xl**: Separación entre módulos completos

### Border Radius

```css
--gg-radius-sm: 8px;      /* Botones pequeños */
--gg-radius-md: 12px;     /* Cards estándar */
--gg-radius-lg: 15px;     /* Cards grandes */
--gg-radius-xl: 20px;     /* Modales */
--gg-radius-round: 50%;   /* Círculos */
--gg-radius-pill: 9999px; /* Badges, pills */
```

---

## ✨ Sombras y Efectos

### Sombras por Tamaño

```css
--gg-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
--gg-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);
--gg-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.3);
--gg-shadow-xl: 0 12px 32px rgba(0, 0, 0, 0.4);
```

### Sombras Doradas

```css
--gg-shadow-gold: 0 8px 20px rgba(200, 167, 82, 0.3);
--gg-shadow-gold-hover: 0 10px 25px rgba(200, 167, 82, 0.4);
--gg-shadow-glow: 0 0 30px rgba(200, 167, 82, 0.5);
```

### Blur Effects

```css
--gg-blur-sm: blur(4px);
--gg-blur-md: blur(8px);
--gg-blur-lg: blur(16px);
--gg-blur-xl: blur(24px);

--gg-backdrop-glass: blur(10px) saturate(180%);
--gg-backdrop-glass-strong: blur(20px) saturate(180%);
```

**Ejemplo de card con efecto glass:**

```css
.card-glass {
  background: var(--gg-bg-card-glass);
  backdrop-filter: var(--gg-backdrop-glass);
  border: 1px solid var(--gg-border-color-gold);
  border-radius: var(--gg-radius-lg);
  box-shadow: var(--gg-shadow-gold);
}
```

---

## ⚡ Transiciones

```css
--gg-transition-fast: all 0.15s ease;
--gg-transition-base: all 0.3s ease;
--gg-transition-slow: all 0.5s ease;
--gg-transition-bounce: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
--gg-transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

**Cuándo usar:**
- **fast**: Cambios sutiles (hover de texto)
- **base**: Estándar para la mayoría de interacciones
- **slow**: Transiciones complejas o animaciones
- **bounce**: Efectos divertidos, llamativos
- **smooth**: Suavidad profesional

---

## 🎯 Ejemplos de Uso

### Botón Premium

```css
.btn-premium {
  /* Colores */
  background: var(--gg-gradient-gold);
  color: var(--gg-bg-primary);
  
  /* Espaciado */
  padding: var(--gg-space-md) var(--gg-space-xl);
  
  /* Forma */
  border-radius: var(--gg-radius-md);
  border: none;
  
  /* Tipografía */
  font-family: var(--gg-font-sans);
  font-size: var(--gg-text-base);
  font-weight: var(--gg-font-semibold);
  
  /* Efectos */
  box-shadow: var(--gg-shadow-gold);
  transition: var(--gg-transition-base);
  cursor: pointer;
}

.btn-premium:hover {
  box-shadow: var(--gg-shadow-gold-hover);
  transform: translateY(-2px);
}

.btn-premium:active {
  transform: translateY(0);
}
```

### Card con Glass Effect

```css
.card {
  /* Fondo */
  background: var(--gg-bg-card-glass);
  backdrop-filter: var(--gg-backdrop-glass);
  
  /* Bordes */
  border: 1px solid var(--gg-border-color-gold);
  border-radius: var(--gg-radius-lg);
  
  /* Espaciado */
  padding: var(--gg-space-xl);
  margin: var(--gg-space-lg) 0;
  
  /* Efectos */
  box-shadow: var(--gg-shadow-md);
  transition: var(--gg-transition-base);
}

.card:hover {
  border-color: var(--gg-border-color-hover);
  box-shadow: var(--gg-shadow-gold);
  transform: translateY(-5px);
}
```

### Título con Gradiente

```css
.hero-title {
  /* Tipografía */
  font-family: var(--gg-font-serif);
  font-size: var(--gg-text-5xl);
  font-weight: var(--gg-font-bold);
  line-height: var(--gg-leading-tight);
  
  /* Gradiente en texto */
  background: var(--gg-gradient-shimmer);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  
  /* Animación */
  animation: shimmer 3s infinite linear;
  
  /* Efectos */
  text-shadow: var(--gg-shadow-glow);
}

@keyframes shimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### Input Styled

```css
.input {
  /* Base */
  width: 100%;
  padding: var(--gg-space-md);
  
  /* Tipografía */
  font-family: var(--gg-font-sans);
  font-size: var(--gg-text-base);
  color: var(--gg-text-primary);
  
  /* Apariencia */
  background: var(--gg-bg-card);
  border: 1px solid var(--gg-border-color);
  border-radius: var(--gg-radius-md);
  
  /* Efectos */
  transition: var(--gg-transition-base);
}

.input:focus {
  outline: none;
  border-color: var(--gg-gold-primary);
  box-shadow: 0 0 0 3px var(--gg-gold-10);
  background: var(--gg-bg-card-hover);
}
```

---

## 📱 Z-Index Layers

Sistema de capas para evitar conflictos:

```css
--gg-z-negative: -1;           /* Fondos decorativos */
--gg-z-base: 0;                /* Contenido base */
--gg-z-dropdown: 1000;         /* Dropdowns */
--gg-z-sticky: 1020;           /* Headers sticky */
--gg-z-fixed: 1030;            /* Elementos fijos */
--gg-z-modal-backdrop: 1040;   /* Fondo de modales */
--gg-z-modal: 1050;            /* Modales */
--gg-z-popover: 1060;          /* Popovers */
--gg-z-tooltip: 1070;          /* Tooltips */
--gg-z-notification: 2000;     /* Notificaciones */
```

---

## 🚀 Migración desde CSS Legacy

### Antes:
```css
.button {
  background: #C8A752;
  color: #0B0C0F;
  padding: 12px 24px;
  border-radius: 12px;
}
```

### Después:
```css
.button {
  background: var(--gg-gold-primary);
  color: var(--gg-bg-primary);
  padding: var(--gg-space-md) var(--gg-space-lg);
  border-radius: var(--gg-radius-md);
}
```

**Beneficios:**
- ✅ Consistencia automática
- ✅ Fácil de actualizar globalmente
- ✅ Mejor mantenibilidad
- ✅ Documentación clara

---

## 📚 Recursos Adicionales

- **Archivo principal**: `/assets/css/tokens.css`
- **Ejemplos**: Ver `/herramientas/` para implementaciones reales
- **Comunidad**: [Telegram](https://t.me/+94LkbchALuk3Zjhh)

---

**Creado por**: Yerikson Varela (YavlPro)  
**Versión**: 1.0  
**Última actualización**: 2025
