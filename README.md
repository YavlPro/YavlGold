# ✨ YavlGold — Ecosistema Cripto Premium

> **Plataforma educativa blockchain** con diseño premium glassmorphism. Herramientas profesionales, academia y comunidad para el mundo cripto.

[![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-success)](https://yavlgold.com/)
[![Licencia](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)
[![Diseño](https://img.shields.io/badge/Dise%C3%B1o-Glassmorphism-gold)]()
[![Responsive](https://img.shields.io/badge/Responsive-100%25-brightgreen)]()

🌐 **En vivo:** [https://yavlgold.com/](https://yavlgold.com/)

---

## 🎨 Diseño Premium con Glassmorphism

YavlGold utiliza un **diseño de última generación** con efectos glassmorphism y paleta dorada champagne:

### 🌟 Paleta de Colores Champagne Gold

```css
/* Champagne Soft Gold - Paleta Premium */
--gold-300: #E8D59B;        /* Champagne Extra Suave */
--gold-400: #E2C675;        /* Champagne Acento Principal */
--gold-500: #C9A851;        /* Champagne Intenso */
--gold-600: #A8863B;        /* Sombras y Contornos */

/* Fondos Oscuros Premium */
--bg-main: #0C1015;         /* Fondo principal profundo */
--bg-surface: #12161C;      /* Superficies elevadas */

/* Textos - Máxima Legibilidad */
--text-primary: #E8ECF2;    /* Texto principal ultra claro */
--text-secondary: #C9D0DA;  /* Texto secundario suave */
```

### ✨ Características Premium

#### 🎯 Diseño Visual
- **Glassmorphism Effect**: Backdrop blur (20px) con saturación aumentada
- **Tema Oscuro Premium**: Negro profundo (#0C1015) con acentos dorados
- **Tipografía Elegante**: Playfair Display (headings) + Inter (body)
- **Logo Animado**: Efecto glow pulsante con sombra dorada
- **Transiciones Suaves**: cubic-bezier optimizado

#### 📱 Mobile-First
- **Drawer Lateral**: Glassmorphism con blur 20px + saturate 180%
- **Modals Compactos**: Desktop (420px), Tablet (380px), Móvil (340px)
- **Auth Completo**: Login/Register con validación captcha
- **Scrollbar Dorado**: Personalizado 6px ultra delgado
- **Touch Optimizado**: Botones y espaciados para dedos

#### 🔐 Características de Seguridad
- **Captcha Visual**: Códigos aleatorios 7 caracteres (A-Z, 0-9)
- **Validación Frontend**: Verificación antes de envío
- **Refresh Dinámico**: Regeneración automática tras errores

#### 🎭 Temas
- **Dark Theme**: Predeterminado con dorado champagne
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
│   ├── INICIO-RAPIDO.md
│   ├── MOCKUP-VISUAL-DETALLADO.md
│   └── INDICE-ARCHIVOS.md
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

- **HTML5**: Semántico y accesible
- **CSS3**: Custom properties, Flexbox, Grid
- **JavaScript ES6+**: Vanilla JS (sin frameworks)
- **Font Awesome 6.4.0**: Iconografía
- **Google Fonts**: Playfair Display + Inter
- **Glassmorphism**: Backdrop-filter blur effects
- **Responsive Design**: Mobile-first approach

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

✅ **En Producción Activa**
- Landing page optimizada
- Mobile drawer glassmorphism
- Auth modals compactos
- Captcha funcional
- 100% responsive
- Accesible (WCAG AA+)

---

<div align="center">
  
### ✨ Hecho con 💛 por YavlPro

**YavlGold** — *Tu ecosistema cripto premium*

</div>
