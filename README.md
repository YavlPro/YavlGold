# ✨ YavlGold — Ecosistema Cripto Premium

> **Plataforma educativa blockchain** con **identidad oficial YavlGold**. Herramientas profesionales, academia y comunidad para el mundo cripto.

[![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-success)](https://yavlgold.com/)
[![Licencia](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)
[![Diseño](https://img.shields.io/badge/Dise%C3%B1o-Identidad%20Oficial-gold)]()
[![Responsive](https://img.shields.io/badge/Responsive-100%25-brightgreen)]()

🌐 **En vivo:** [https://yavlgold.com/](https://yavlgold.com/)

---

## 🎨 Identidad Visual Oficial YavlGold

YavlGold sigue **estrictas guías de identidad corporativa** con colores, tipografías y elementos visuales definidos oficialmente:

### 🌟 Paleta de Colores Oficial (NUNCA CAMBIAR)

```css
/* COLORES PRINCIPALES - IDENTIDAD YAVL */
--yavl-gold: #D4AF37;              /* ORO PRINCIPAL - Color oficial YavlGold */
--yavl-gold-dark: #B8860B;         /* ORO OSCURO (hover/secondary) */

/* FONDOS OFICIALES */
--yavl-dark: #0B0C0F;              /* Negro Yavl principal */
--bg-dark: #101114;                /* Fondo oscuro general */
--bg-card: rgba(212, 175, 55, 0.05); /* Cards con tinte dorado */

/* TEXTOS - Máxima Legibilidad */
--text-light: #f0f0f0;             /* Texto principal claro */
--text-secondary: #a0a0a0;         /* Texto secundario/subtítulos */
--text-muted: #6b7280;             /* Texto deshabilitado/notas */
```

### 📝 Tipografía Oficial

```css
/* FUENTES OBLIGATORIAS */
--font-heading: 'Orbitron', sans-serif;  /* Títulos - Futurista/Tech */
--font-body: 'Rajdhani', sans-serif;     /* Cuerpo - Moderna/Legible */
```

### 🎯 Elementos Visuales Obligatorios

#### **Grid Background** (Presente en TODA la identidad)
```css
background-image:
  linear-gradient(var(--border-gold) 1px, transparent 1px),
  linear-gradient(to right, var(--border-gold) 1px, var(--bg-dark) 1px);
background-size: 40px 40px;  /* Grid de 40x40 píxeles */
```

### ✨ Mejoras Implementadas (Octubre 2025)

#### � Identidad Visual
- **Color Oro Oficial**: #D4AF37 (100% consistente en toda la plataforma)
- **Grid Background**: Patrón obligatorio 40×40px con líneas doradas
- **Tipografía Oficial**: Orbitron (títulos futuristas) + Rajdhani (cuerpo moderno)
- **Logo Animado**: Efecto glow pulsante con sombra dorada (#D4AF37)
- **Transiciones Suaves**: 0.3s ease para interacciones

#### 📝 Optimizaciones de Legibilidad
- **Antialiasing Global**: `-webkit-font-smoothing: antialiased` en toda la página
- **Text Shadow Reducido**: De 15px a 2-3px para mayor nitidez
- **Glow Effects**: Reducidos 50% (de 15px a 8px) para mejor claridad
- **Color Consistente**: Todos los títulos usan exactamente var(--yavl-gold)
- **Sin Gradientes**: Eliminados gradient-clip que causaban borrosidad

#### � Corrección de Enlaces
- **12 Enlaces Corregidos**: De `#` a rutas funcionales
- **Academia**: `/academia` (lecciones y cursos)
- **Herramientas**: `/herramientas` (calculadoras y conversores)
- **Dashboard**: `/dashboard` (panel de control)
- **Social Media**: YouTube, Telegram, Twitter con URLs reales

#### 📱 Mobile-First
- **Drawer Lateral**: Menu responsive con animaciones suaves
- **Modals Compactos**: Adaptables a todos los tamaños de pantalla
- **Auth Completo**: Login/Register con validación captcha
- **Scrollbar Dorado**: Personalizado con color oficial
- **Touch Optimizado**: Botones 44×44px mínimo para dedos

#### 🔐 Características de Seguridad
- **Captcha Visual**: Códigos aleatorios 7 caracteres (A-Z, 0-9)
- **Validación Frontend**: Verificación antes de envío
- **Refresh Dinámico**: Regeneración automática tras errores

#### 🎭 Sistema de Temas
- **Dark Theme**: Predeterminado con oro #D4AF37
- **Light Theme**: Disponible con toggle suave
- **Persistencia**: LocalStorage guarda preferencia

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html                # Página principal optimizada
├── index-premium.html        # Versión alternativa premium
│
├── assets/
│   ├── images/
│   │   ├── logo.png         # Logo YavlGold 512x512
│   │   └── og-cover.png     # Open Graph image
│   ├── css/                 # Estilos inline en HTML
│   └── js/                  # JavaScript inline en HTML
│
├── apps/
│   ├── gold/                # Aplicación Gold
│   ├── agro/                # YavlAgro integration
│   ├── social/              # Red social cripto
│   └── suite/               # Suite de herramientas
│
├── academia/                # Módulo educativo
│   └── lecciones/
│
├── herramientas/            # Herramientas Pro
├── dashboard/               # Panel de usuario
├── profile/                 # Perfiles de usuario
│
├── docs/                    # Documentación
│   ├── RESUMEN-EJECUTIVO.md
│   ├── DISEÑO-PREMIUM-2025.md
│   ├── DISEÑO-VISUAL-GUIA.md
│   ├── COMPARATIVA-DISEÑO.md
│   ├── ACTUALIZACION-IDENTIDAD-OFICIAL-2025.md  # ✨ NUEVO
│   ├── AJUSTES-LEGIBILIDAD-2025.md              # ✨ NUEVO
│   ├── INICIO-RAPIDO.md
│   ├── MOCKUP-VISUAL-DETALLADO.md
│   └── INDICE-ARCHIVOS.md
│
├── VERIFICACION-FINAL.md    # ✨ Checklist de validación
├── GUIA-RAPIDA-IDENTIDAD.md # ✨ Guía de uso rápido
├── BORROSIDAD-CORREGIDA.md  # ✨ Fix de legibilidad
├── aplicar-identidad.sh     # ✨ Script de automatización
│
├── backups/                 # Respaldos del sistema
├── tests/                   # Tests de integración
│
├── package.json
├── pnpm-lock.yaml
├── netlify.toml
├── vercel.json
├── robots.txt
├── sitemap.xml
└── CNAME
```

---

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/YavlPro/YavlGold.git
cd YavlGold

# Abrir con Live Server (VS Code)
# O simplemente abrir index.html en el navegador
```

### Deployment

El sitio se despliega automáticamente en GitHub Pages:

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

**URL de producción:** [https://yavlgold.com/](https://yavlgold.com/)

---

## 💻 Tecnologías

- **HTML5**: Semántico y accesible (WCAG 2.1 AA)
- **CSS3**: Custom properties, Flexbox, Grid
- **JavaScript ES6+**: Vanilla JS (sin frameworks)
- **Font Awesome 6.4.0**: Iconografía profesional
- **Google Fonts**: Orbitron (títulos) + Rajdhani (cuerpo) - **Identidad oficial**
- **Grid Background**: Patrón 40×40px obligatorio
- **Responsive Design**: Mobile-first approach (320px+)

### 🎨 Sistema de Diseño Oficial

```css
/* Color oficial NUNCA cambiar */
#D4AF37 - Oro YavlGold principal
#B8860B - Oro oscuro (hover)

/* Tipografía oficial */
Orbitron - Títulos (futurista/tech)
Rajdhani - Cuerpo (moderna/legible)

/* Grid obligatorio */
40px × 40px - Toda la identidad YavlGold
```

---

## 📱 Breakpoints Responsive

```css
/* Desktop */
@media (min-width: 1024px) { /* Full navbar + modals */ }

/* Tablet */
@media (max-width: 1024px) { /* Drawer + compact modals */ }
@media (max-width: 768px) { /* Optimized spacing */ }

/* Mobile */
@media (max-width: 480px) { /* Ultra compact */ }
@media (max-width: 375px) { /* Small devices */ }
```

---

## 🎯 Características Principales

### 🏠 Landing Page
- Hero section con logo animado
- Secciones: Conceptos, Herramientas, Academia, Comunidad
- Footer con 4 columnas informativas
- WhatsApp floating button

### 📱 Mobile Experience
- Drawer lateral glassmorphism (320px, blur 20px)
- Overlay con blur intenso (8px)
- Navegación completa en drawer
- Auth buttons en footer del drawer

### 🔐 Sistema de Autenticación
- Modal de Login compacto
- Modal de Registro compacto
- Captcha visual con refresh
- Validación en tiempo real
- Scroll interno (max-height 85-90vh)

### 🎨 Efectos Visuales
- Glassmorphism en drawer y modals
- Blur effects (backdrop-filter)
- Animaciones suaves (cubic-bezier)
- Hover effects en navegación
- Logo glow pulsante
- Scrollbar dorado personalizado

---

## 📝 Commits Recientes

```bash
# Historial de mejoras (Oct 2025)
6016ca0 - feat: compact drawer with glassmorphism blur effect
72964a8 - feat: make modals more compact for mobile and desktop
408346b - fix: restore mobile navbar with hamburger menu
64600ec - feat: port mobile improvements to main index.html
2e43c3c - feat: add captcha validation with scroll support
cd1a181 - fix: mobile drawer and auth modals with validation
```

---

## 🛠️ Mantenimiento

### Archivos Principales
- `index.html` - Landing page principal (mantener actualizado)
- `index-premium.html` - Versión alternativa premium
- `assets/images/logo.png` - Logo oficial 512x512
- `README.md` - Este archivo

### Backups
- `index.html.backup` - Respaldo pre-cambios importantes
- `index.html.backup-pre-mobile-fix` - Respaldo pre-mobile
- `backups/` - Respaldos históricos organizados

### Limpieza
Archivos de test y temporales eliminados para mantener el repo limpio.

---

## 🤝 Contribuir

Este es un proyecto privado de YavlPro. Para contribuciones:

1. Fork del repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

---

## 📞 Contacto

- **Web:** [https://yavlgold.com/](https://yavlgold.com/)
- **GitHub:** [@YavlPro](https://github.com/YavlPro)
- **Organización:** YavlPro

---

## 🎉 Estado del Proyecto

✅ **En Producción Activa - Octubre 2025**

### ✨ Últimas Actualizaciones (19/10/2025)

#### 🎨 Identidad Visual Oficial Aplicada
- ✅ **Color oro #D4AF37** implementado en 35+ instancias
- ✅ **Tipografías oficiales**: Orbitron + Rajdhani en toda la plataforma
- ✅ **Grid background 40×40px** presente en todos los fondos
- ✅ **12 enlaces corregidos** (# → rutas funcionales)

#### 📝 Optimizaciones de Legibilidad
- ✅ **Glow effects reducidos 50%** (15px → 8px)
- ✅ **Antialiasing global** para texto ultra nítido
- ✅ **Text-shadow optimizado** (3px máximo)
- ✅ **Colores consistentes** en todos los títulos
- ✅ **0 errores de compilación**

#### 📚 Documentación Creada
- ✅ `docs/ACTUALIZACION-IDENTIDAD-OFICIAL-2025.md` - Log completo de cambios
- ✅ `docs/AJUSTES-LEGIBILIDAD-2025.md` - Correcciones de borrosidad
- ✅ `VERIFICACION-FINAL.md` - Checklist de validación
- ✅ `GUIA-RAPIDA-IDENTIDAD.md` - Guía de referencia rápida
- ✅ `BORROSIDAD-CORREGIDA.md` - Solución de problemas visuales
- ✅ `aplicar-identidad.sh` - Script de automatización bash

#### 🚀 Próximos Pasos
- [ ] Aplicar identidad a `academia/index.html`
- [ ] Aplicar identidad a `herramientas/index.html`
- [ ] Aplicar identidad a `dashboard/index.html`
- [ ] Testing E2E completo
- [ ] Performance audit (Lighthouse 95+)
- Accesible (WCAG AA+)

---

<div align="center">
  
### ✨ Hecho con 💛 por YavlPro

**YavlGold** — *Tu ecosistema cripto premium*

</div>
