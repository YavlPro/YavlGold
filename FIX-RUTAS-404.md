# 🔧 Fix Rutas 404 — GitHub Pages

> **Solución a enlaces rotos y dashboard en blanco**

## 📋 Problema Identificado

En GitHub Pages, las rutas absolutas (`/dashboard/`, `/academia/`, etc.) no funcionan correctamente porque el sitio se aloja en `https://yavlpro.github.io/YavlGold/`, no en la raíz del dominio.

### Síntomas
- ❌ Dashboard aparece en blanco después del login
- ❌ Enlaces a `/academia/`, `/herramientas/`, etc. dan 404
- ❌ CSS no carga en páginas internas
- ❌ Imágenes rotas en subdirectorios

## ✅ Solución Implementada

### 1. **index.html** (Página Principal)

#### Antes (❌ Rutas absolutas)
```html
<a href="/dashboard">Dashboard</a>
<a href="/academia">Academia</a>
<a href="/herramientas">Herramientas</a>
<a href="/privacidad">Privacidad</a>
window.location.href = '/dashboard/';
```

#### Después (✅ Rutas relativas)
```html
<a href="./dashboard/">Dashboard</a>
<a href="./academia/">Academia</a>
<a href="./herramientas/">Herramientas</a>
<a href="./privacidad.html">Privacidad</a>
window.location.href = './dashboard/';
```

### 2. **dashboard/index.html**

#### Antes (❌ Rutas absolutas)
```html
<link rel="stylesheet" href="/assets/css/unificacion.css">
<link rel="icon" href="/assets/images/logo.png">
<a href="/herramientas/">Herramientas</a>
<a href="/academia/">Academia</a>
```

#### Después (✅ Rutas relativas)
```html
<link rel="stylesheet" href="../assets/css/unificacion.css">
<link rel="icon" href="../assets/images/logo.png">
<a href="../herramientas/">Herramientas</a>
<a href="../academia/">Academia</a>
```

### 3. **Archivos Modificados**

- ✅ `index.html` — 12+ rutas corregidas
- ✅ `dashboard/index.html` — CSS, imágenes, navegación corregida
- ⚠️ `herramientas/index.html` — Pendiente de revisión
- ⚠️ `academia/index.html` — Pendiente de creación

---

## 🧪 Testing

### Verificar Rutas Localmente
```bash
# Iniciar servidor local
cd /home/codespace/gold
python -m http.server 8000

# Probar en navegador:
# http://localhost:8000/
# http://localhost:8000/dashboard/
# http://localhost:8000/privacidad.html
# http://localhost:8000/terminos.html
```

### Verificar en GitHub Pages
```bash
# Después del deploy:
# https://yavlpro.github.io/YavlGold/
# https://yavlpro.github.io/YavlGold/dashboard/
# https://yavlpro.github.io/YavlGold/privacidad.html
```

---

## 📝 Checklist de Rutas

### ✅ Completado
- [x] Login redirect a dashboard (`./dashboard/`)
- [x] Navegación navbar (`./dashboard/`, `./academia/`, etc.)
- [x] Mobile drawer links
- [x] CSS y assets en dashboard (`../assets/`)
- [x] Páginas legales (`./privacidad.html`, `./terminos.html`)

### ⚠️ Pendiente de Verificar
- [ ] `herramientas/index.html` rutas internas
- [ ] `academia/index.html` (crear página)
- [ ] Footer links en todas las páginas
- [ ] Imágenes en assets (verificar carga)

---

## 🔍 Comando de Verificación

Para encontrar todas las rutas absolutas restantes:
```bash
cd /home/codespace/gold
grep -r 'href="/' --include="*.html" | grep -v "https://" | grep -v "http://"
```

Para corregir en masa (usar con precaución):
```bash
# Ejemplo para un archivo específico
sed -i 's|href="/ruta"|href="./ruta"|g' archivo.html
```

---

## 📊 Resumen de Cambios

| Archivo | Rutas Corregidas | Estado |
|---------|-----------------|--------|
| `index.html` | 12+ | ✅ Completo |
| `dashboard/index.html` | 15+ | ✅ Completo |
| `privacidad.html` | 0 (nueva) | ✅ OK |
| `terminos.html` | 0 (nueva) | ✅ OK |
| `herramientas/index.html` | ? | ⚠️ Revisar |
| `academia/index.html` | N/A | ❌ Crear |

---

## 🚀 Deploy

```bash
cd /home/codespace/gold
git add .
git commit -m "🔧 fix: correct all routes for GitHub Pages

- Fixed absolute paths to relative paths in index.html
- Fixed dashboard CSS and asset paths (../ prefix)
- Fixed login redirect to ./dashboard/
- Fixed legal pages links (privacidad.html, terminos.html)
- Dashboard now loads correctly after authentication"
git push
```

---

## 🎯 Resultado Esperado

Después de este fix:
- ✅ Login funciona y redirige correctamente
- ✅ Dashboard carga con estilos completos
- ✅ Navegación entre páginas sin 404
- ✅ Assets (CSS, imágenes, JS) cargan correctamente
- ✅ Páginas legales accesibles desde footer

---

<div align="center">

**Última actualización:** 19 de Octubre, 2025  
**Estado:** ✅ Fix aplicado, pendiente de deploy

</div>
