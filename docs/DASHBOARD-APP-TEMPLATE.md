# 📱 YavlGold Dashboard App - Documentación

**Fecha**: 19 de Octubre, 2025  
**Versión**: 1.0  
**Tipo**: Dashboard Application Layout

---

## 🎯 Descripción

Plantilla de aplicación responsive tipo dashboard con la identidad visual YavlGold. Diseñada para ofrecer una experiencia fluida similar a aplicaciones nativas, con navegación lateral (desktop) y barra inferior (mobile).

---

## ✨ Características

### Layout Responsive
- ✅ **Mobile First**: Optimizado para pantallas pequeñas
- ✅ **Sidebar desplegable**: En móvil se oculta, en desktop siempre visible
- ✅ **Barra inferior fija**: Solo en móvil para navegación rápida
- ✅ **Sin espacios vacíos**: Layout fluido y compacto

### Componentes Principales

#### 1. **Header Compacto** (60px)
```html
- Botón menú hamburguesa (solo móvil)
- Logo YavlGold centrado
- Icono de usuario
```

#### 2. **Sidebar Panel** (280px desktop)
```html
- Info de usuario con avatar
- Navegación con 8 enlaces
- Iconos Font Awesome
- Hover effects dorados
```

#### 3. **Área Principal**
```html
- Título de página
- Stat Card con barra de progreso
- Status Grid (2x2 móvil, 4x1 desktop)
- Info Cards Grid (responsive)
```

#### 4. **Barra Inferior** (65px, solo móvil)
```html
- 5 accesos rápidos
- Iconos + labels
- Active states
```

---

## 🎨 Design System

### Paleta de Colores (Champagne Soft Gold)

```css
--gold-300: #E8D59B  /* Lightest */
--gold-400: #C8A752  /* Primary */
--gold-500: #C8A752  /* Medium */
--gold-600: #C8A752  /* Dark */
--gold-700: #C8A752  /* Darkest */
```

### Backgrounds

```css
--bg-primary: #0C0F13    /* Body background */
--bg-secondary: #12161C  /* Header, sidebar, nav */
--bg-card: #1A1E24       /* Cards */
--bg-card-hover: #1F242B /* Card hover */
```

### Text Colors

```css
--text-primary: #E8ECF2   /* Headings */
--text-secondary: #C9D0DA /* Body text */
--text-muted: #9CA3AF     /* Labels */
```

---

## 📐 Breakpoints

### Mobile
```css
< 768px
- Sidebar oculto (left: -100%)
- Barra inferior visible
- Status Grid: 2x2
- Cards Grid: 1 columna
```

### Tablet
```css
>= 768px
- Sidebar siempre visible (280px fijo)
- Barra inferior oculta
- Status Grid: 4x1
- Cards Grid: 2 columnas
- Main content con margin-left: 280px
```

### Desktop
```css
>= 1024px
- Status Grid: 4x1
- Cards Grid: 3 columnas
- Main content max-width: 1400px
```

---

## 🔧 Componentes Detallados

### 1. Stat Card (Barra de Progreso)

**HTML:**
```html
<section class="stat-card">
  <h2><i class="fas fa-microchip"></i> Tasa de Hash</h2>
  <div class="meter">
    <div class="bar" style="width: 45%;"></div>
  </div>
  <div class="stat-value">45 TH/s</div>
  <div class="stat-label">Activo ahora</div>
</section>
```

**CSS:**
```css
.stat-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border-subtle);
}

.meter {
  background: var(--bg-primary);
  height: 12px;
  border-radius: 20px;
}

.bar {
  background: linear-gradient(90deg, 
    var(--gold-400) 0%, 
    var(--gold-600) 100%);
  box-shadow: 0 0 10px rgba(226, 198, 117, 0.4);
}
```

**Propósito**: Mostrar métricas principales con visualización de progreso.

---

### 2. Status Grid (4 Estados)

**HTML:**
```html
<section class="status-grid">
  <div class="status-item active">
    <h3>Activo</h3>
    <p>12</p>
    <div class="stat-label">Dispositivos</div>
  </div>
  <!-- Más items... -->
</section>
```

**Estados con Colores:**

| Estado | Color | Background |
|--------|-------|------------|
| Active | `#20e890` (verde) | `rgba(0, 255, 128, 0.08)` |
| Inactive | `#ff9320` (naranja) | `rgba(255, 128, 0, 0.08)` |
| Low | `var(--gold-400)` (dorado) | `rgba(226, 198, 117, 0.08)` |
| Disabled | `#6b7280` (gris) | `rgba(255, 255, 255, 0.03)` |

**Grid Layout:**
- Móvil: `grid-template-columns: repeat(2, 1fr)`
- Desktop: `grid-template-columns: repeat(4, 1fr)`

---

### 3. Info Cards

**HTML:**
```html
<div class="info-card">
  <div class="info-card-header">
    <div class="info-card-title">Balance Total</div>
    <div class="info-card-icon">
      <i class="fas fa-coins"></i>
    </div>
  </div>
  <div class="info-card-value">$12,450</div>
  <div class="info-card-label">+15.3% este mes</div>
</div>
```

**Features:**
- Icono en esquina superior derecha
- Valor grande centrado
- Label descriptivo
- Hover effect con elevación

**Grid Layout:**
- Móvil: 1 columna
- Tablet: 2 columnas
- Desktop: 3 columnas

---

### 4. Sidebar Navigation

**HTML:**
```html
<aside class="side-panel">
  <div class="user-info">
    <img src="avatar.png" alt="Usuario">
    <div class="user-name">YAVLPRO</div>
    <div class="user-role">Premium Member</div>
  </div>
  <nav>
    <a href="#dashboard" class="active">
      <i class="fas fa-home"></i>
      <span>Dashboard</span>
    </a>
    <!-- Más links... -->
  </nav>
</aside>
```

**Comportamiento:**
- Móvil: Toggle con botón hamburguesa + overlay oscuro
- Desktop: Siempre visible, fijo a la izquierda
- Active state: Borde izquierdo dorado
- Hover: Background dorado suave

---

### 5. Bottom Navigation (Mobile Only)

**HTML:**
```html
<footer class="nav-bottom">
  <a href="#community">
    <i class="fas fa-users"></i>
    <span>Comunidad</span>
  </a>
  <!-- Más links... -->
</footer>
```

**Features:**
- 5 accesos rápidos
- Iconos grandes (1.3rem)
- Labels pequeños (0.75rem)
- Active state con background dorado
- Se oculta en desktop (`display: none` >= 768px)

---

## 🎭 Interacciones

### Toggle Sidebar (Mobile)

```javascript
menuToggle.addEventListener('click', () => {
  if (sidePanel.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

function openSidebar() {
  sidePanel.classList.add('open');  // left: 0
  sideOverlay.classList.add('active');  // opacity: 1
  document.body.style.overflow = 'hidden';  // Block scroll
}

function closeSidebar() {
  sidePanel.classList.remove('open');
  sideOverlay.classList.remove('active');
  document.body.style.overflow = '';
}
```

**Triggers para cerrar sidebar:**
- Click en overlay
- Resize a desktop (>= 768px)
- Click en link de navegación

---

### Active Link Handling

```javascript
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Remove active from siblings
    container.querySelectorAll('a').forEach(l => 
      l.classList.remove('active')
    );
    
    // Add active to clicked link
    link.classList.add('active');
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  });
});
```

---

### Animated Progress Bar

```javascript
window.addEventListener('load', () => {
  const hashBar = document.getElementById('hashBar');
  hashBar.style.width = '0%';  // Start from 0
  setTimeout(() => {
    hashBar.style.width = '45%';  // Animate to value
  }, 300);
});
```

---

## 🎨 Efectos Visuales

### Hover Effects

```css
/* Cards */
.info-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Status Items */
.status-item:hover {
  transform: translateY(-2px);
}

/* Nav Links */
.side-panel nav a:hover {
  background: rgba(226, 198, 117, 0.08);
  color: var(--gold-400);
  border-left-color: var(--gold-400);
}
```

### Animations

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card,
.status-item,
.info-card {
  animation: fadeIn 0.4s ease;
}
```

### Transitions

```css
--transition-fast: all 0.15s ease;    /* Hover, active states */
--transition-normal: all 0.3s ease;   /* Sidebar, overlays */
```

---

## 📱 Testing Responsive

### Mobile (< 768px)
```
✅ Sidebar oculto por defecto
✅ Botón hamburguesa funcional
✅ Overlay oscuro al abrir sidebar
✅ Barra inferior visible (5 items)
✅ Status Grid: 2x2
✅ Cards Grid: 1 columna
✅ Sin scroll horizontal
✅ Touch-friendly (44px min target)
```

### Tablet (768px - 1023px)
```
✅ Sidebar siempre visible
✅ Main content con margin-left: 280px
✅ Barra inferior oculta
✅ Status Grid: 4x1 (horizontal)
✅ Cards Grid: 2 columnas
✅ Navegación optimizada
```

### Desktop (>= 1024px)
```
✅ Sidebar fijo a la izquierda
✅ Main content max-width: 1400px
✅ Cards Grid: 3 columnas
✅ Espacios generosos
✅ Hover effects visibles
```

---

## 🎯 Casos de Uso

### 1. Dashboard de Minería
```html
- Mostrar tasa de hash en stat card
- Status grid con dispositivos activos/inactivos
- Info cards con temperatura, energía, uptime
```

### 2. Panel de Trading
```html
- Balance total en stat card
- Operaciones activas/completadas en status grid
- Info cards con ganancias, pérdidas, rendimiento
```

### 3. Academia/Cursos
```html
- Progreso de curso en stat card
- Lecciones completadas/pendientes en status grid
- Info cards con certificados, puntos, logros
```

### 4. Gestión de Comunidad
```html
- Miembros activos en stat card
- Categorías de usuarios en status grid
- Info cards con posts, comentarios, interacciones
```

---

## 🔧 Personalización

### Cambiar Colores

**Modificar variables CSS:**
```css
:root {
  /* Cambiar oro a azul */
  --gold-400: #3B82F6;
  --gold-600: #1D4ED8;
  
  /* Cambiar background a más claro */
  --bg-primary: #1F2937;
  --bg-card: #374151;
}
```

### Agregar Nuevo Item al Status Grid

```html
<div class="status-item warning">
  <h3>Alerta</h3>
  <p>5</p>
  <div class="stat-label">Notificaciones</div>
</div>
```

```css
.status-item.warning {
  background: rgba(255, 193, 7, 0.08);
  border-color: rgba(255, 193, 7, 0.3);
}

.status-item.warning h3,
.status-item.warning p {
  color: #FFC107;
}
```

### Agregar Nuevo Link al Sidebar

```html
<a href="#reports">
  <i class="fas fa-file-alt"></i>
  <span>Reportes</span>
</a>
```

---

## 🚀 Deployment

### Archivos Necesarios
```
dashboard-app.html  (archivo principal)
/assets/images/logo.png  (logo YavlGold)
/assets/images/avatar.png  (avatar usuario)
```

### CDN Externos
```html
<!-- Google Fonts -->
fonts.googleapis.com/css2?family=Inter...

<!-- Font Awesome -->
cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/...
```

### Testing Checklist
- [ ] Logo y avatar cargan correctamente
- [ ] Sidebar se despliega en móvil
- [ ] Barra inferior funciona en móvil
- [ ] Sidebar fijo en desktop
- [ ] Barra inferior oculta en desktop
- [ ] Active states funcionan
- [ ] Animaciones fluidas
- [ ] Sin scroll horizontal
- [ ] Touch targets > 44px en móvil

---

## 💡 Mejores Prácticas

### Performance
- ✅ Usar `transform` y `opacity` para animaciones (GPU accelerated)
- ✅ `backdrop-filter: blur()` con cuidado (puede ser pesado)
- ✅ Lazy load images con `loading="lazy"`
- ✅ Minimizar reflows/repaints

### Accesibilidad
- ✅ Labels descriptivos en botones
- ✅ `aria-label` en iconos
- ✅ Focus states visibles
- ✅ Contraste suficiente (WCAG AA)
- ✅ Touch targets >= 44x44px

### UX
- ✅ Feedback visual inmediato (hover, active)
- ✅ Transiciones suaves (< 300ms)
- ✅ Scroll bloqueado cuando sidebar abierto
- ✅ Close sidebar al navegar (mobile)

---

## 📚 Recursos Adicionales

### Iconos Font Awesome
- Explorar: https://fontawesome.com/icons
- Categorías útiles: business, finance, devices, charts

### Inspiración de Dashboards
- Tailwind UI Components
- Material Design Dashboard
- Ant Design Dashboard

### Testing Tools
- Chrome DevTools (Device Mode)
- Firefox Responsive Design Mode
- BrowserStack (testing real devices)

---

**Autor**: GitHub Copilot  
**Proyecto**: YavlGold Dashboard App  
**Última actualización**: 19 de Octubre, 2025  

---

🎉 **Dashboard Application Template - Ready to Use!**
