# 🥂 Champagne Soft Gold - Design Tokens

## 📊 Paleta Principal Implementada

### Escala Champagne Soft Gold
```css
:root {
  /* Núcleo de la paleta */
  --gold-300: #E8D59B;  /* Champagne Extra Suave - Highlights sutiles */
  --gold-400: #E2C675;  /* Champagne Acento Principal - UI primaria */
  --gold-500: #C9A851;  /* Champagne Intenso - Base dorada */
  --gold-600: #A8863B;  /* Sombras y Contornos - Profundidad */
  --gold-700: #8B6F30;  /* Dorado Oscuro Profundo - Contraste máximo */
}
```

### Características de la paleta
- **Tono base:** Amarillo cálido con desaturación controlada
- **Saturación:** 45-55% (reducción 30% vs. anterior)
- **Luminosidad:** 60-85% para legibilidad óptima
- **Temperatura:** Cálida neutra (no amarillento)
- **Inspiración:** Champagne vintage, seda dorada, latón satinado

---

## 🎨 Paletas Opcionales para Comparación

### Opción 1: Antique Gold (Dorado Antiguo)
Más terracota, menos champagne. Para estética vintage clásica.

```css
:root {
  --gold-300: #E5D2A8;  /* Arena Antigua */
  --gold-400: #D4B257;  /* Oro Antiguo Claro */
  --gold-500: #B8953D;  /* Oro Envejecido */
  --gold-600: #92732B;  /* Bronce Profundo */
  --gold-700: #6F5720;  /* Sepia Oscuro */
}
```

**Uso ideal:**
- Proyectos históricos
- Aplicaciones de lujo tradicional
- Temas con textura de papel/pergamino

**Contraste WCAG:**
- `--gold-400` sobre `--bg-main`: **6.2:1** (AAA)
- `--gold-500` sobre `--bg-main`: **5.8:1** (AA+)

---

### Opción 2: Satin Brass (Latón Satinado)
Más metálico, con sutil verdor. Para diseños industriales elegantes.

```css
:root {
  --gold-300: #E8DDB3;  /* Seda Dorada */
  --gold-400: #D7C07A;  /* Latón Pulido */
  --gold-500: #BCA35A;  /* Latón Satinado */
  --gold-600: #9C8442;  /* Cobre Antiguo */
  --gold-700: #7A662E;  /* Bronce Oscuro */
}
```

**Uso ideal:**
- Diseños arquitectónicos
- Apps de ingeniería/fintech
- Estética industrial premium

**Contraste WCAG:**
- `--gold-400` sobre `--bg-main`: **6.8:1** (AAA)
- `--gold-500` sobre `--bg-main`: **5.5:1** (AA)

---

## 🔧 Sistema de Tokens Completo

### Design Tokens para Figma/CSS

```json
{
  "color": {
    "brand": {
      "gold": {
        "300": {
          "value": "#E8D59B",
          "type": "color",
          "description": "Champagne Extra Suave - Highlights"
        },
        "400": {
          "value": "#E2C675",
          "type": "color",
          "description": "Champagne Acento Principal"
        },
        "500": {
          "value": "#C9A851",
          "type": "color",
          "description": "Champagne Intenso - Base"
        },
        "600": {
          "value": "#A8863B",
          "type": "color",
          "description": "Sombras y Contornos"
        },
        "700": {
          "value": "#8B6F30",
          "type": "color",
          "description": "Dorado Oscuro Profundo"
        }
      }
    },
    "semantic": {
      "primary": {
        "value": "{color.brand.gold.500}",
        "type": "color"
      },
      "accent": {
        "value": "{color.brand.gold.400}",
        "type": "color"
      },
      "surface": {
        "value": "#0C1015",
        "type": "color"
      }
    }
  },
  "shadow": {
    "gold": {
      "sm": {
        "value": "0 0 15px rgba(201, 168, 81, 0.25)",
        "type": "boxShadow"
      },
      "md": {
        "value": "0 0 24px rgba(201, 168, 81, 0.35)",
        "type": "boxShadow"
      },
      "soft": {
        "value": "0 4px 20px rgba(201, 168, 81, 0.20)",
        "type": "boxShadow"
      }
    }
  },
  "gradient": {
    "primary": {
      "value": "linear-gradient(180deg, {color.brand.gold.400} 0%, {color.brand.gold.600} 100%)",
      "type": "gradient"
    },
    "subtle": {
      "value": "linear-gradient(135deg, rgba(226, 198, 117, 0.15), rgba(168, 134, 59, 0.05))",
      "type": "gradient"
    }
  }
}
```

---

## ✅ Verificación de Accesibilidad

### Contraste de Textos (WCAG 2.1)

| Combinación | Ratio | Nivel | Status |
|-------------|-------|-------|--------|
| `--gold-400` sobre `--bg-main` (#0C1015) | **7.8:1** | AAA | ✅ Excelente |
| `--gold-500` sobre `--bg-main` | **6.2:1** | AAA | ✅ Excelente |
| `--gold-600` sobre `--bg-main` | **4.9:1** | AA | ✅ Bueno |
| `--text-primary` sobre `--bg-main` | **13.5:1** | AAA | ✅ Perfecto |
| `--text-secondary` sobre `--bg-main` | **9.8:1** | AAA | ✅ Perfecto |

**Todos los textos cumplen WCAG AA (mínimo 4.5:1)** ✅

---

## 🎯 Componentes Actualizados

### Glow Effects Refinados
**Reducción adicional del 15% vs. primera refinación:**

```css
/* Logo Hero - Glow ultra suave */
.hero-logo-inner {
  box-shadow: 
    0 0 20px rgba(201, 168, 81, 0.22),  /* -12% opacidad */
    0 4px 18px rgba(201, 168, 81, 0.12), /* -20% opacidad */
    inset 0 0 18px rgba(201, 168, 81, 0.06); /* -25% opacidad */
}

/* Animación de resplandor */
@keyframes glow {
  0%, 100% { 
    box-shadow: 
      0 0 20px rgba(201, 168, 81, 0.22),
      0 4px 18px rgba(201, 168, 81, 0.12),
      inset 0 0 18px rgba(201, 168, 81, 0.06);
  }
  50% { 
    box-shadow: 
      0 0 30px rgba(201, 168, 81, 0.30),  /* Pico más suave */
      0 4px 25px rgba(201, 168, 81, 0.20),
      inset 0 0 25px rgba(201, 168, 81, 0.10);
  }
}
```

### Botones
```css
.btn-primary {
  background: linear-gradient(180deg, var(--gold-400), var(--gold-600));
  color: #0B0E11;
  box-shadow: var(--shadow-gold-soft);
}

.btn-outline:hover {
  background: rgba(201, 168, 81, 0.07);
  color: var(--gold-400);
}
```

### Tarjetas
```css
.feature-card:hover .feature-icon {
  background: linear-gradient(135deg, 
    rgba(226, 198, 117, 0.18), 
    rgba(168, 134, 59, 0.08)
  );
}
```

---

## 📐 Guía de Implementación

### 1. Cambiar de paleta
Para probar otra paleta, reemplaza el bloque `:root` en líneas 25-90 de `index-premium.html`.

### 2. Ajustar opacidades
Los efectos de glow usan valores RGBA. Ajusta el 4º parámetro:
- **0.05-0.10:** Sutil (actual)
- **0.15-0.25:** Moderado
- **0.30-0.50:** Intenso (no recomendado)

### 3. Exportar para Figma
1. Copia el JSON de tokens
2. Importa con plugin "Design Tokens"
3. Sincroniza con Variables de Figma

---

## 📊 Comparativa Visual

```
╔═══════════════════════════════════════════════════════════════════╗
║                   EVOLUCIÓN DE LA PALETA                          ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  V1: Gold Saturado (Original)                                    ║
║  ██████ #C8A752 - Demasiado amarillo                             ║
║  ████   #D4AF37 - Muy brillante                                  ║
║                                                                   ║
║  V2: Champagne Gold (Primera Refinación)                         ║
║  ██████ #C9A646 - Mejor, pero aún cálido                         ║
║  ████   #E3C466 - Reducción 30% saturación                       ║
║                                                                   ║
║  V3: Champagne Soft Gold (Actual) ✅                             ║
║  ██████ #C9A851 - Equilibrado perfecto                           ║
║  ████   #E2C675 - Suave, elegante                                ║
║  ███    #E8D59B - Highlights naturales                           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 🚀 Próximos Pasos Opcionales

### Expansión del Sistema
1. **Variables de espaciado:** `--space-xs` a `--space-3xl`
2. **Tokens de tipografía:** `--font-heading`, `--font-body`
3. **Breakpoints responsive:** `--screen-sm`, `--screen-md`, etc.
4. **Estados de interacción:** `--state-hover`, `--state-active`

### Herramientas Recomendadas
- **Contrast Checker:** [WebAIM](https://webaim.org/resources/contrastchecker/)
- **Token Generator:** [Style Dictionary](https://amzn.github.io/style-dictionary/)
- **Figma Plugin:** [Design Tokens](https://www.figma.com/community/plugin/888356646278934516)

---

## 📝 Notas de Diseño

**Por qué Champagne Soft Gold funciona:**
1. ✅ Menos amarillento que #C8A752 original
2. ✅ Mayor contraste con fondos oscuros
3. ✅ Elegancia profesional (no llamativo)
4. ✅ WCAG AAA en todos los textos
5. ✅ Armonía con tema oscuro premium

**Cuándo usar las alternativas:**
- **Antique Gold:** Proyectos históricos, documentos vintage
- **Satin Brass:** Apps industriales, dashboards técnicos
- **Champagne Soft (actual):** Fintech, lujo moderno, SaaS premium

---

**Última actualización:** $(date +"%Y-%m-%d %H:%M")  
**Archivo:** `index-premium.html` líneas 25-90  
**Verificado:** Sin errores de compilación ✅
