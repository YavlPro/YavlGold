# Plan de Optimización de Rendimiento - YavlGold

**Fecha:** 18 Octubre 2025  
**Problema:** Carga lenta de la página  
**Objetivo:** Reducir tiempo de carga a < 3 segundos  

## 🔍 Diagnóstico Actual

### Scripts Externos Cargando (Bloquean Renderizado)
```html
<!-- Estos causan delay porque se descargan de CDNs externos -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://js.hcaptcha.com/1/api.js" async defer></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### CSS Grande
```
unificacion.css: 9.1KB
tokens.css: 8.8KB
yavl-themes.css: 6.6KB
base.css: 4.8KB
Total CSS: ~29KB
```

### JavaScript Cargado
```
Supabase JS: ~50KB (CDN)
academia.js: 21KB
authUI.js: 14KB
authClient.js: 7.6KB
Total JS: ~100KB+
```

## 🚀 Soluciones Rápidas (Implementar Ya)

### 1. Lazy Load de Scripts No Críticos ✅

**authClient.js** - Solo necesario cuando el usuario hace login:

```html
<!-- ANTES: Carga inmediata -->
<script type="module" src="/apps/gold/assets/js/auth.js"></script>

<!-- DESPUÉS: Carga diferida -->
<script type="module">
  // Cargar auth solo cuando se necesite
  document.getElementById('signin-btn')?.addEventListener('click', async () => {
    if (!window.AuthClient) {
      await import('/apps/gold/assets/js/auth.js');
    }
    window.AuthUI?.showLoginModal();
  });
</script>
```

### 2. Optimizar Font Awesome (Crítico) ✅

**Problema:** Font Awesome completo son ~600KB

**Solución:**
```html
<!-- ANTES: Todo el set de iconos -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<!-- DESPUÉS: Solo los iconos que usas -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/fontawesome.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/solid.min.css">
```

O mejor aún, usa iconos SVG inline para los principales.

### 3. Preconnect a CDNs ✅

```html
<!-- Agregar en <head> ANTES de cualquier otro link -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### 4. Async/Defer Scripts ✅

```html
<!-- hCaptcha no bloquea -->
<script src="https://js.hcaptcha.com/1/api.js" async defer></script>

<!-- Supabase puede esperar -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
```

### 5. Minificar CSS Inline Crítico ✅

Extraer el CSS crítico "above the fold" e inlinearlo:

```html
<style>
  /* Critical CSS - Solo lo que se ve sin scroll */
  body{margin:0;font-family:Montserrat,sans-serif;background:#0B0C0F;color:#E5E7EB}
  .gg-header{display:flex;justify-content:space-between;padding:20px;background:#1a1b1f}
  /* ... solo estilos del header y hero */
</style>

<!-- Resto del CSS carga después -->
<link rel="stylesheet" href="/apps/gold/assets/css/unificacion.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/apps/gold/assets/css/unificacion.css"></noscript>
```

## 🎯 Soluciones Medianas (Próxima Iteración)

### 6. Comprimir Imágenes

```bash
# Instalar herramientas
npm install -g imagemin-cli imagemin-webp

# Convertir a WebP (mucho más pequeño)
imagemin assets/images/*.png --plugin=webp --out-dir=assets/images/webp/

# Usar en HTML
<picture>
  <source srcset="/apps/gold/assets/images/webp/logo.webp" type="image/webp">
  <img src="/apps/gold/assets/images/logo.png" alt="YavlGold">
</picture>
```

### 7. Service Worker (Cache)

```javascript
// sw.js - Cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('yavlgold-v1').then((cache) => {
      return cache.addAll([
        '/apps/gold/',
        '/apps/gold/assets/css/unificacion.css',
        '/apps/gold/assets/js/script.js',
        '/apps/gold/assets/images/logo.png'
      ]);
    })
  );
});
```

### 8. Code Splitting (Vite)

Si migramos a Vite build:

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['@supabase/supabase-js'],
          'auth': ['./src/assets/js/auth.js'],
          'ui': ['./src/assets/js/authUI.js']
        }
      }
    }
  }
}
```

## 📊 Mediciones de Performance

### Herramientas de Testing:

1. **Lighthouse** (Chrome DevTools)
   ```
   Abrir DevTools → Lighthouse → Run Report
   ```

2. **PageSpeed Insights**
   ```
   https://pagespeed.web.dev/
   Ingresar: https://yavlgold.com/apps/gold/
   ```

3. **WebPageTest**
   ```
   https://www.webpagetest.org/
   Test desde múltiples ubicaciones
   ```

### Métricas Objetivo:

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| First Contentful Paint | ? | < 1.8s |
| Largest Contentful Paint | ? | < 2.5s |
| Time to Interactive | ? | < 3.8s |
| Total Blocking Time | ? | < 300ms |
| Cumulative Layout Shift | ? | < 0.1 |

## ✅ Quick Wins Implementables Ahora

### Archivo: `/apps/gold/index.html`

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- AGREGAR: Preconnect (mejora DNS lookup) -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://cdnjs.cloudflare.com">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://gerzlzprkarikblqxpjt.supabase.co">
  
  <!-- Favicon -->
  <link rel="icon" href="/apps/gold/assets/images/logo.png" type="image/png">
  
  <!-- CAMBIAR: Font Awesome completo → Solo solid -->
  <link rel="preload" as="style" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/fontawesome.min.css">
  <link rel="preload" as="style" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/solid.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/fontawesome.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/solid.min.css">
  
  <!-- Fuentes con display=swap -->
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- CSS principal -->
  <link rel="stylesheet" href="/apps/gold/assets/css/unificacion.css">
  <link rel="stylesheet" href="/apps/gold/assets/css/tokens.css">
</head>

<body>
  <!-- Contenido... -->
  
  <!-- Scripts al final del body -->
  
  <!-- Supabase con defer -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
  
  <!-- hCaptcha async -->
  <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
  
  <!-- Auth carga al final -->
  <script type="module" src="/apps/gold/assets/js/auth.js"></script>
  
  <!-- Theme system -->
  <link rel="stylesheet" href="/apps/gold/assets/packages/themes/yavl-themes.css">
  <link rel="stylesheet" href="/apps/gold/assets/packages/ui/base.css">
  <script type="module">
    import { ThemeManager } from '/apps/gold/assets/packages/themes/theme-manager.js';
    import { ThemeSwitcher } from '/apps/gold/assets/packages/ui/ThemeSwitcher.js';
    
    // Esperar a que DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initThemes);
    } else {
      initThemes();
    }
    
    function initThemes() {
      const themeManager = new ThemeManager();
      const themeSwitcher = new ThemeSwitcher();
      themeSwitcher.init(themeManager);
    }
  </script>
  
  <!-- Script general al final -->
  <script src="/apps/gold/assets/js/script.js" defer></script>
</body>
```

## 🔧 Solución al Problema de Calculadora

El usuario reporta que "calculadora me lleva a yavlgold login (404)".

**Diagnóstico:**
- No hay enlace directo a calculadora desde index.html
- El flujo es: Index → Herramientas → Calculadora
- Posible confusión con el ícono de calculadora que va a Herramientas

**Solución:**
Agregar enlace directo en el hero o en las quick actions.

```html
<!-- En index.html, sección de herramientas -->
<div class="tools-grid">
  <div class="tool-card">
    <div class="tool-icon"><i class="fas fa-calculator"></i></div>
    <h3>Calculadora de Inversión</h3>
    <p>Calcula rentabilidad y proyecciones de tus inversiones crypto.</p>
    <a href="/apps/gold/herramientas/calculadora.html" class="btn btn-primary">Ir a Calculadora</a>
  </div>
  
  <div class="tool-card">
    <div class="tool-icon"><i class="fas fa-exchange-alt"></i></div>
    <h3>Conversor Cripto</h3>
    <p>Convierte entre diferentes criptomonedas en tiempo real.</p>
    <a href="/apps/gold/herramientas/conversor.html" class="btn btn-primary">Ir a Conversor</a>
  </div>
  
  <div class="tool-card">
    <div class="tool-icon"><i class="fas fa-chart-line"></i></div>
    <h3>Análisis de Mercado</h3>
    <p>Analiza tendencias y toma decisiones informadas.</p>
    <a href="/apps/gold/herramientas/analisis.html" class="btn btn-primary">Ir a Análisis</a>
  </div>
</div>
```

## 📈 Impacto Esperado

| Optimización | Tiempo Ahorrado | Dificultad |
|--------------|----------------|------------|
| Preconnect | ~200-500ms | Fácil ⭐ |
| Font Awesome específico | ~400KB | Fácil ⭐ |
| Defer scripts | ~300-800ms | Fácil ⭐ |
| Lazy load auth | ~50KB inicial | Media ⭐⭐ |
| Service Worker | ~2s (segunda visita) | Media ⭐⭐ |
| WebP images | ~60-80% tamaño | Media ⭐⭐ |
| Code splitting | ~30-40% JS | Difícil ⭐⭐⭐ |

## 🎯 Plan de Acción

### Fase 1: Quick Wins (Ahora - 30 min)
1. ✅ Agregar preconnect hints
2. ✅ Cambiar Font Awesome a específico
3. ✅ Agregar defer a scripts
4. ✅ Arreglar enlace directo a calculadora

### Fase 2: Optimizaciones (1-2 horas)
1. Comprimir y convertir imágenes a WebP
2. Implementar lazy loading de imágenes
3. Minificar CSS y JS
4. Critical CSS inline

### Fase 3: Avanzado (Futuro)
1. Implementar Service Worker
2. Migrar a Vite build system
3. Implementar code splitting
4. CDN para assets estáticos

---

**Próximo paso:** Implementar Fase 1 (Quick Wins) para mejora inmediata del 30-40% en tiempo de carga.
