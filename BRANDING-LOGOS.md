# YavlGold V9.1 — Guía de Branding de Logos

Esta guía estandariza el uso de los dos logos oficiales en el ecosistema YavlGold V9.1 y define clases, rutas y tamaños recomendados.

## Archivos oficiales
- PNG circular (sin rotación): `/images/logo.png`
- SVG angular (rotación interna +30°): `/images/logo.svg`

Ambos archivos viven en `assets/images/` y son servidos por Vite como rutas absolutas (`/images/...`).

### Formato WebP (opcional, recomendado)
- Para mejorar el rendimiento en navegadores modernos, puedes añadir `/images/logo.webp` como variante optimizada.
- El header ya incluye `<picture>` con `logo.webp` como primera fuente y fallback a `logo.png`.
- Si aún no existe el archivo WebP, crea uno a partir del PNG (opcional):
  - Requisito: tener ImageMagick o cwebp instalado localmente.
  - PowerShell (opcional):
    ```powershell
    # Requiere 'magick' instalado (ImageMagick)
    magick convert .\assets\images\logo.png -quality 90 .\assets\images\logo.webp
    ```
  - O con cwebp:
    ```powershell
    cwebp .\assets\images\logo.png -q 90 -o .\assets\images\logo.webp
    ```
  - Consejo: apunta a un tamaño de archivo ≤ 8 KB para el logo pequeño.

## Clases CSS y uso
- `.logo-img` (PNG)
  - Uso: Header/Navbar y cualquier UI que requiera el logo circular sin inclinación.
  - Rotación: ninguna (no aplicar transform).
  - Tamaños recomendados: 16–48px (header 48px por defecto).

- `.logo-main` (SVG)
  - Uso: Favicon, Loading Screen, Footer, Hero y secciones donde se requiera la “Y” angular.
  - Rotación: +30° INTRÍNSECA en el propio SVG (no usar transform CSS para rotar).
  - Animación: debe mantener el efecto "breathe" (sombra/respiración suave).
  - Tamaños recomendados: 80–200px (loading 120px, footer 80px).

## Snippets de referencia

Header (PNG sin rotación):
```html
<div class="logo-container" id="logoLink">
  <picture>
    <source srcset="/images/logo.webp" type="image/webp" />
    <source srcset="/images/logo.png" type="image/png" />
    <img src="/images/logo.png" alt="YavlGold logo" class="logo-img" />
  </picture>
  <div class="logo-text">Yavl<span>Gold</span></div>
</div>
```

Loading Screen (SVG con +30° y breathe):
```html
<div class="loading-screen" id="loadingScreen">
  <img src="/images/logo.svg" alt="YavlGold" width="120" height="120" class="logo-main" />
  <div class="loading-text">Cargando YavlGold...</div>
</div>
```

Footer (SVG con +30° y breathe):
```html
<footer class="footer">
  <div class="footer-logo">
    <img src="/images/logo.svg" alt="YavlGold" width="80" height="80" class="logo-main" />
  </div>
</footer>
```

Favicon (SVG único):
```html
<link rel="icon" type="image/svg+xml" href="/images/logo.svg" />
```

## Reglas de oro
- No rotar el PNG; cualquier inclinación rompe la identidad.
- Mantener la rotación del SVG dentro del propio archivo (no sobrescribir con CSS).
- Mantener la animación "breathe" en usos del SVG (.logo-main).
- Optimización: evitar imágenes > 8 KB para versiones pequeñas del PNG.
- Accesibilidad: incluir `alt` descriptivo ("YavlGold" o "YavlGold logo").

## Estilos mínimos sugeridos
```css
.logo-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 50%;
  transform: none; /* SIN rotación */
}

.logo-main {
  width: 48px;
  height: 48px;
  display: inline-block;
  filter: drop-shadow(0 0 20px rgba(200, 167, 82, 0.5));
  animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { filter: drop-shadow(0 0 20px rgba(200, 167, 82, 0.4)); }
  50% { filter: drop-shadow(0 0 50px rgba(200, 167, 82, 0.8)); }
}
```

## QA checklist
- Header muestra PNG circular recto (0°) y nítido en 1x/2x DPR.
- Favicon muestra la “Y” angular (SVG) correctamente en pestaña.
- Loading y Footer usan el SVG con "breathe"; sin jitter ni escalado brusco.
- En Responsive (375px / 768px / 1440px), el logo no se corta ni distorsiona.
- En consola: sin 404 de rutas de imágenes.

---
Última actualización: 2025-11-04
