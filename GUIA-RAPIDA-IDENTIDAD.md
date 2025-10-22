# 🎨 Guía Rápida: Identidad Visual YavlGold

## Para GitHub Copilot y Desarrolladores

### 🔐 REGLAS ABSOLUTAS (NUNCA CAMBIAR)

```css
/* ⚠️ ESTOS VALORES SON SAGRADOS ⚠️ */
--yavl-gold: #C8A752;        /* ORO PRINCIPAL */
--yavl-gold-dark: #8B7842;   /* ORO OSCURO */
```

**NO uses:**
- ❌ `#C8A752` (gold)
- ❌ `#FFC107` (amber)
- ❌ `#C8A752` (champagne)
- ❌ `#C8A752` (soft gold)

**SÍ usa:**
- ✅ `#C8A752` (yavl gold oficial)
- ✅ `var(--yavl-gold)` (variable CSS)

---

## 📝 Fuentes Oficiales

```html
<!-- SIEMPRE incluir en <head> -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap" rel="stylesheet">
```

```css
/* Uso correcto */
h1, h2, h3, button {
  font-family: 'Orbitron', sans-serif;
}

p, li, span {
  font-family: 'Rajdhani', sans-serif;
}
```

---

## 🌐 Grid Background (OBLIGATORIO)

```css
/* SIEMPRE en el <body> */
body {
  background-color: #101114;
  background-image:
    linear-gradient(rgba(200,167,82, 0.3) 1px, transparent 1px),
    linear-gradient(to right, rgba(200,167,82, 0.3) 1px, #101114 1px);
  background-size: 40px 40px;
}

/* Responsive */
@media (max-width: 768px) {
  body {
    background-size: 20px 20px;
  }
}
```

---

## 🔘 Botones - Copiar y Pegar

### Botón Principal
```html
<button class="btn btn-primary">
  <i class="fas fa-rocket"></i>
  Texto del Botón
</button>
```

```css
.btn-primary {
  background: linear-gradient(135deg, #C8A752, #8B7842);
  color: #0B0C0F;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  padding: 0.75rem 1.75rem;
  border-radius: 16px;
  border: none;
  box-shadow: 0 0 15px rgba(200,167,82, 0.5);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  box-shadow: 0 0 25px rgba(200,167,82, 0.8);
  transform: translateY(-2px);
}
```

### Botón Outline
```html
<button class="btn btn-outline">
  <i class="fas fa-star"></i>
  Texto del Botón
</button>
```

```css
.btn-outline {
  background: transparent;
  color: #C8A752;
  border: 2px solid #C8A752;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  padding: 0.75rem 1.75rem;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.btn-outline:hover {
  background: #C8A752;
  color: #0B0C0F;
  box-shadow: 0 0 25px rgba(200,167,82, 0.8);
  transform: translateY(-2px);
}
```

---

## 🃏 Cards

```html
<div class="card">
  <h3>Título del Card</h3>
  <p>Contenido del card</p>
  <a href="#" class="card-link">Ver más</a>
</div>
```

```css
.card {
  background: linear-gradient(135deg, rgba(11, 12, 15, 0.95), rgba(200,167,82, 0.03));
  border: 2px solid rgba(200,167,82, 0.3);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 0 15px rgba(200,167,82, 0.5);
  transition: all 0.3s ease;
}

.card:hover {
  border-color: rgba(200,167,82, 0.6);
  box-shadow: 0 0 25px rgba(200,167,82, 0.8);
  transform: translateY(-3px);
}
```

---

## 🎨 Paleta Completa

```css
:root {
  /* PRINCIPALES */
  --yavl-gold: #C8A752;
  --yavl-gold-dark: #8B7842;
  
  /* BACKGROUNDS */
  --yavl-dark: #0B0C0F;
  --bg-dark: #101114;
  --bg-darker: #0a0a0a;
  --bg-card: rgba(200,167,82, 0.05);
  
  /* TEXTOS */
  --text-light: #f0f0f0;
  --text-secondary: #a0a0a0;
  --text-muted: #6b7280;
  
  /* BORDES */
  --border-gold: rgba(200,167,82, 0.3);
  --border-gold-hover: rgba(200,167,82, 0.6);
  
  /* EFECTOS */
  --glow-gold: 0 0 15px rgba(200,167,82, 0.5);
  --glow-gold-intense: 0 0 25px rgba(200,167,82, 0.8);
  
  /* TIPOGRAFÍA */
  --font-heading: 'Orbitron', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
  
  /* TRANSICIONES */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
  
  /* RADIOS */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
}
```

---

## ✅ Checklist Rápido

Antes de hacer commit, verifica:

- [ ] Color oro es `#C8A752` (no otro)
- [ ] Fuentes son Orbitron + Rajdhani (no otras)
- [ ] Grid background está presente en body
- [ ] Botones usan clase `.btn` y `.btn-primary` o `.btn-outline`
- [ ] Títulos usan Orbitron
- [ ] Texto usa Rajdhani
- [ ] Cards tienen border dorado
- [ ] Hover effects con `transform: translateY(-2px)`
- [ ] Glow effects en elementos importantes
- [ ] Variables CSS usadas (no valores hardcoded)

---

## 🚫 Errores Comunes

### ❌ NO HACER:
```css
/* INCORRECTO */
color: #C8A752;
font-family: 'Inter', sans-serif;
background: gold;
border: 1px solid yellow;
```

### ✅ SÍ HACER:
```css
/* CORRECTO */
color: var(--yavl-gold);
font-family: var(--font-heading);
background: var(--yavl-gold);
border: 2px solid var(--border-gold);
```

---

## 📚 Plantilla HTML Mínima

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YavlGold - Título de Página</title>
  
  <!-- Fuentes Oficiales -->
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap" rel="stylesheet">
  
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <style>
    :root {
      --yavl-gold: #C8A752;
      --yavl-gold-dark: #8B7842;
      --yavl-dark: #0B0C0F;
      --bg-dark: #101114;
      --text-light: #f0f0f0;
      --border-gold: rgba(200,167,82, 0.3);
      --glow-gold: 0 0 15px rgba(200,167,82, 0.5);
      --font-heading: 'Orbitron', sans-serif;
      --font-body: 'Rajdhani', sans-serif;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background-color: var(--bg-dark);
      color: var(--text-light);
      font-family: var(--font-body);
      
      /* GRID BACKGROUND - OBLIGATORIO */
      background-image:
        linear-gradient(var(--border-gold) 1px, transparent 1px),
        linear-gradient(to right, var(--border-gold) 1px, var(--bg-dark) 1px);
      background-size: 40px 40px;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-heading);
      color: var(--yavl-gold);
      text-shadow: var(--glow-gold);
    }
  </style>
</head>
<body>
  <h1>YavlGold</h1>
  <p>Tu contenido aquí...</p>
</body>
</html>
```

---

## 🔗 Referencias

- **Guía Completa:** `Identidad oficcial.html`
- **Ejemplo Implementado:** `index-premium.html`
- **Documentación:** `docs/ACTUALIZACION-IDENTIDAD-OFICIAL-2025.md`

---

**💡 Regla de Oro:**  
Cuando tengas duda, consulta `Identidad oficcial.html` o copia de `index-premium.html`

---

**Creado:** 19 de Octubre, 2025  
**Autor:** YavlGold Team  
**Versión:** 1.0
