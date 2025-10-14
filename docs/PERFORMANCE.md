# YavlGold - Performance Optimization Guide

## 🚀 Current Optimizations

### ✅ Already Implemented

1. **Static Assets**
   - ✅ Logo as PNG (optimized, 88KB)
   - ✅ Local assets (no external dependencies for core features)
   - ✅ Cache busting with query params

2. **CDN Usage**
   - ✅ Font Awesome from CDN
   - ✅ Google Fonts optimized loading
   - ✅ Supabase from CDN
   - ✅ hCaptcha from CDN

3. **Code Organization**
   - ✅ Modular auth system (authClient, authGuard, authUI)
   - ✅ Lazy script loading (async/defer)

---

## 📈 Additional Optimizations

### 1. Image Optimization

**Current Status:**
- Logo: 88KB PNG (good)

**Recommendations:**
- Convert to WebP format (50-80% smaller)
- Add `loading="lazy"` to images
- Use responsive images with `srcset`

**Implementation:**
```html
<!-- Before -->
<img src="/assets/images/logo.png" alt="YavlGold">

<!-- After -->
<picture>
  <source srcset="/assets/images/logo.webp" type="image/webp">
  <img src="/assets/images/logo.png" alt="YavlGold" loading="lazy" width="200" height="200">
</picture>
```

**Convert to WebP:**
```bash
# Install ImageMagick or use online converter
convert logo.png -quality 85 logo.webp
```

---

### 2. CSS Optimization

**Current:**
- Inline CSS in HTML files
- External `unificacion.css`

**Recommendations:**

**Critical CSS Inlining:**
```html
<style>
  /* Inline critical CSS for above-the-fold content */
  :root { --color-secondary: #C8A752; }
  body { margin: 0; font-family: 'Montserrat', sans-serif; }
  .gg-header { /* ... */ }
</style>

<!-- Load non-critical CSS async -->
<link rel="preload" href="/assets/css/unificacion.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/assets/css/unificacion.css"></noscript>
```

**Minify CSS:**
```bash
# Using cssnano or clean-css
npm install -g clean-css-cli
cleancss -o assets/css/unificacion.min.css assets/css/unificacion.css
```

---

### 3. JavaScript Optimization

**Current:**
- Inline scripts
- External auth modules

**Recommendations:**

**Minify JS:**
```bash
npm install -g terser
terser assets/js/auth/authClient.js -o assets/js/auth/authClient.min.js -c -m
```

**Defer Non-Critical Scripts:**
```html
<script defer src="/assets/js/auth/authClient.min.js"></script>
<script defer src="/assets/js/auth/authGuard.min.js"></script>
<script defer src="/assets/js/auth/authUI.min.js"></script>
```

---

### 4. Font Loading Optimization

**Current:**
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Optimized:**
```html
<!-- Preconnect to font CDN -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Load fonts with font-display swap -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Or Self-Host Fonts:**
1. Download fonts from Google Fonts
2. Use `font-face` in CSS
3. Serve from `/assets/fonts/`

---

### 5. Lazy Loading

**For Images:**
```html
<img src="/assets/images/logo.png" loading="lazy" alt="YavlGold">
```

**For Iframes (if any):**
```html
<iframe src="..." loading="lazy"></iframe>
```

**For Scripts:**
```javascript
// Load non-critical scripts after page load
window.addEventListener('load', () => {
  const script = document.createElement('script');
  script.src = '/assets/js/analytics.js';
  document.body.appendChild(script);
});
```

---

### 6. Caching Strategy

**Service Worker (Progressive Web App):**

Create `sw.js`:
```javascript
const CACHE_NAME = 'yavlgold-v1';
const urlsToCache = [
  '/',
  '/assets/css/unificacion.css',
  '/assets/js/auth/authClient.js',
  '/assets/images/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

Register in HTML:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

### 7. Resource Hints

**Add to `<head>`:**
```html
<!-- DNS Prefetch -->
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
<link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
<link rel="dns-prefetch" href="https://gerzlzprkarikblqxpjt.supabase.co">
<link rel="dns-prefetch" href="https://js.hcaptcha.com">

<!-- Preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload critical assets -->
<link rel="preload" href="/assets/images/logo.png" as="image">
<link rel="preload" href="/assets/css/unificacion.css" as="style">
```

---

### 8. Compression

**Brotli/Gzip:**

Most hosting platforms (Vercel, Netlify) handle this automatically.

**Manual setup for Apache (.htaccess):**
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
</IfModule>
```

---

### 9. Database Query Optimization

**Supabase:**
- ✅ Use indexes on frequently queried fields
- ✅ Limit query results with `.limit()`
- ✅ Use `.select()` to fetch only needed columns
- ✅ Enable RLS (Row Level Security)

---

### 10. Monitoring & Metrics

**Tools:**
- Google Lighthouse (built into Chrome DevTools)
- WebPageTest.org
- GTmetrix
- Pingdom

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

---

## 🎯 Performance Budget

**Page Weight Targets:**
- HTML: < 50KB
- CSS: < 100KB
- JS: < 150KB
- Images: < 500KB
- Total: < 1MB

**Load Time Targets:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1

---

## 📊 Current Performance

Run Lighthouse audit:
```bash
npx lighthouse https://yavlgold.com --view
```

Or use Chrome DevTools → Lighthouse tab

---

## 🔧 Quick Wins (Implement First)

1. ✅ Add `loading="lazy"` to all images
2. ✅ Minify CSS and JS
3. ✅ Add resource hints (dns-prefetch, preconnect)
4. ✅ Enable compression (automatic on Vercel/Netlify)
5. ✅ Add cache headers (configured in vercel.json/netlify.toml)

---

## 📝 Implementation Checklist

- [ ] Convert images to WebP format
- [ ] Add `loading="lazy"` to images
- [ ] Minify CSS files
- [ ] Minify JS files
- [ ] Add resource hints in HTML
- [ ] Implement Service Worker (optional)
- [ ] Run Lighthouse audit
- [ ] Fix any issues found
- [ ] Monitor performance in production

---

**Last Updated:** October 14, 2025
