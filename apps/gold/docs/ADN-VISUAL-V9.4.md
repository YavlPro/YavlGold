# 🧬 YAVLGOLD V9.4 VISUAL DNA - BLOQUE INMUTABLE

> **ESTADO:** PRODUCCIÓN ACTIVA - ACTUALIZADO
> **FECHA:** 10 Enero 2026
> **FUENTE OFICIAL:** `apps/gold/index.html` (Fuente de la Verdad)
> **JERARQUÍA:** Este documento define la Ley Visual Suprema.

---

## 1. 🔤 TIPOGRAFÍAS OFICIALES (INMUTABLES)

**DEFINICIÓN:**

```css
--font-heading: 'Orbitron', sans-serif; /* HEADINGS - weights: 700, 900 */
--font-body: 'Rajdhani', sans-serif;    /* BODY - weights: 400, 600, 700 */
```

* ❌ **PROHIBIDO:** Cambiar por otra tipografía.
* ✅ **OBLIGATORIO:** Usar `Orbitron` para títulos/impacto y `Rajdhani` para datos/cuerpo.

---

## 2. 🎨 PALETA DE COLORES MAESTRA

### 🏆 BRANDING (ORO Y NEGRO)

El núcleo de la marca es **Negro Profundo + Dorado Premium**.

```css
:root {
  /* NEGROS */
  --bg-primary: #0a0a0a;       /* Negro Puro (Fondo) */
  --bg-secondary: #1a1a1a;     /* Gris muy oscuro (Tarjetas) */
  --border-color: #2a2a2a;     /* Bordes sutiles */

  /* DORADOS */
  --gold-principal: #C8A752;   /* Branding Principal */
  --gold-vibrante: #D4AF37;    /* Acciones / Hover */
  --gold-dark: #9D8040;        /* Sombras / Profundidad */
}
```

### 🚦 COLORES DE ESTADO (EXCEPCIONES LEGALES)

⚠️ **IMPORTANTE:** Estos colores están **PERMITIDOS EXCLUSIVAMENTE** para Badges (Etiquetas) y Estados. **PROHIBIDO** usarlos en fondos, botones principales o textos largos.

| Estado | Código CSS (Gradiente) | Uso Autorizado |
| --- | --- | --- |
| **🔵 EN DESARROLLO** | `linear-gradient(135deg, #3498db, #2980b9)` | Módulos técnicos (Agro, Tools, Dev) |
| **🟣 PRÓXIMAMENTE / ÚNICO** | `linear-gradient(135deg, #9b59b6, #8e44ad)` | Módulos futuros o exclusivos (Ajedrez) |
| **🟠 EN CONSTRUCCIÓN** | `linear-gradient(135deg, #f39c12, #e67e22)` | Alertas de obra o mantenimiento |

---

## 3. 🌌 ATMÓSFERA Y FONDO (EL "PULSO VITAL")

El fondo **NUNCA** es negro plano estático. Debe tener vida.

**REGLA DE IMPLEMENTACIÓN:**

```css
/* Gradiente Radial Dorado Gigante + Animación Pulse */
.hero::before, body::before {
  content: '';
  position: absolute; /* O fixed según el caso */
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 1000px; height: 1000px; /* Grande y difuso */
  background: radial-gradient(circle, rgba(200, 167, 82, 0.15) 0%, transparent 70%);
  animation: pulse 6s ease-in-out infinite;
  pointer-events: none;
}
```

---

## 4. 🔘 UI COMPONENTS: BOTONES Y TARJETAS

### BOTONES PRINCIPALES (PILL SHAPE)

Los botones de acción (CTA) no son cuadrados. Son cápsulas.

* **Forma:** `border-radius: 50px;` (Pill Shape).
* **Estilo:** Gradiente Dorado o Borde Dorado (Outline).
* **Ejemplo:** Botón "EXPLORAR MÓDULOS" o "ENTRAR".

### TARJETAS (GLASS / SOLID)

* **Fondo:** `#1a1a1a` o `rgba(17, 17, 17, 0.9)`.
* **Borde:** 1px sólido color `#2a2a2a`.
* **Hover:** Elevación (`translateY`) + Sombra Dorada (`--shadow-gold`).

---

## 5. 🎬 ANIMACIONES OBLIGATORIAS

El sistema debe sentirse "vivo" y "respirando".

| Animación | Descripción | Uso |
| --- | --- | --- |
| **`pulse`** | Escala suave (1.0 -> 1.05) | Fondos, Badges importantes |
| **`breathe`** | Brillo/Sombra variable | Logos, Iconos principales |
| **`float`** | Flotación vertical suave | Elementos decorativos (iconos de fondo) |
| **`textGlow`** | Resplandor en texto | Títulos H1, Palabras clave |

---

## ⚠️ REGLAS DE ORO (RESUMEN FINAL)

1. 🚫 **NO AZUL/MORADO EN UI PRINCIPAL:** Solo permitido en etiquetas pequeñas de estado. El resto es **100% Negro/Dorado**.
2. ✅ **FONDO VIVO:** Siempre incluir el gradiente radial "Pulse" para evitar que el negro se vea "muerto".
3. ✅ **TIPOGRAFÍA SAGRADA:** Títulos = `Orbitron`. Cuerpo = `Rajdhani`.
4. 🚫 **NO BOTONES CUADRADOS:** Usar `border-radius: 50px` para CTAs primarios.

---

> **CERTIFICACIÓN:** Documento actualizado basado en `index.html` (Fuente de la Verdad).
> **VIGENCIA:** V9.4 en adelante.
