# ✅ CHECKLIST DE TESTEO - PRE-FASE 2 COMPLETADA

**Fecha:** 2025-01-21  
**Objetivo:** Validar todas las implementaciones antes de proceder con Fase 2

---

## 📋 SECCIONES A TESTEAR

### 1. 🏠 HOMEPAGE (index.html)

#### ✅ Hero Section
- [ ] Logo carga correctamente
- [ ] Título "Ecosistema YavlGold" visible
- [ ] Subtítulo legible
- [ ] CTA "Explorar Módulos" funciona
- [ ] Animaciones suaves (fade-in)

#### ✅ Módulos (7 Cards)
- [ ] **YavlCrypto:** Border dorado 2px, badge ALTA PRIORIDAD, 3 features
- [ ] **YavlAcademy:** Badge EN DESARROLLO, 3 features
- [ ] **YavlSocial:** Badge PRÓXIMAMENTE, 3 features
- [ ] **YavlSuite:** Badge PRÓXIMAMENTE, 3 features
- [ ] **YavlTrading:** Badge PRÓXIMAMENTE + MUY IMPORTANTE, descripción correcta (Educación + Análisis + Estadísticas)
- [ ] **YavlAgro:** Badge PRÓXIMAMENTE, 3 features
- [ ] **YavlChess:** Badge FUTURO, 3 features

#### ✅ Navbar
- [ ] Logo clickeable (→ homepage)
- [ ] Links: Inicio, Módulos, Roadmap, Comunidad, Dashboard
- [ ] Hover effects dorados
- [ ] Mobile: Hamburger menu funciona
- [ ] Responsive en móvil

#### ✅ Roadmap CTA
- [ ] Sección visible con icono 🗺️
- [ ] Link a /roadmap/ funciona
- [ ] Diseño champagne gold

#### ✅ Footer
- [ ] Links sociales (Twitter, GitHub, Discord)
- [ ] Copyright visible
- [ ] Responsive

---

### 2. 🔐 SISTEMA DE AUTENTICACIÓN

#### ✅ Registro (register.html)
- [ ] Formulario completo (email, password, confirm password)
- [ ] Validación de campos (emails válidos, passwords match)
- [ ] Captcha funciona
- [ ] Error messages claros
- [ ] Success → Redirect a dashboard
- [ ] Link a login funciona

#### ✅ Login (login.html)
- [ ] Formulario simple (email, password)
- [ ] Remember me checkbox
- [ ] Forgot password link → /recuperar-password.html
- [ ] Success → Dashboard
- [ ] Errores mostrados (invalid credentials)

#### ✅ Recuperar Contraseña (recuperar-password.html) ⭐ NUEVO
- [ ] Formulario de email
- [ ] Validación de email
- [ ] Captcha funciona
- [ ] Envío de email confirmado (mensaje success)
- [ ] Link "Volver a login" funciona
- [ ] Diseño champagne gold consistente

#### ✅ Reset Contraseña (reset-password.html) ⭐ NUEVO
- [ ] Formulario nueva contraseña + confirmar
- [ ] Password strength indicator (weak/medium/strong)
- [ ] Validaciones:
  - [ ] Mínimo 8 caracteres
  - [ ] Al menos 1 mayúscula
  - [ ] Al menos 1 minúscula
  - [ ] Al menos 1 número
- [ ] Toggle visibility (ver/ocultar contraseña)
- [ ] Success → Redirect a dashboard
- [ ] Errores mostrados

---

### 3. 📊 DASHBOARD (dashboard/index.html)

#### ✅ Sidebar
- [ ] Logo YavlGold visible
- [ ] Links de navegación:
  - [ ] Dashboard
  - [ ] Perfil
  - [ ] Configuración
  - [ ] Cerrar Sesión ⭐ VERIFICADO
- [ ] **Widget CoinGecko** ⭐ NUEVO:
  - [ ] Título "Precios Cripto"
  - [ ] Top 10 criptos visibles
  - [ ] Logos de criptos cargan
  - [ ] Precios USD actualizados
  - [ ] Cambio 24h con colores (verde = positivo, rojo = negativo)
  - [ ] Auto-refresh cada 30 segundos
  - [ ] Loading state mientras carga
  - [ ] Error handling si API falla

#### ✅ Header
- [ ] Título "Dashboard"
- [ ] User info (avatar, username)
- [ ] Notificaciones icon
- [ ] Responsive mobile

#### ✅ Content
- [ ] Cards de estadísticas visibles
- [ ] Gráficos (si hay)
- [ ] Contenido placeholder correcto

#### ✅ Botón Cerrar Sesión
- [ ] Botón visible en sidebar (línea 1018)
- [ ] Click → Logout de Supabase
- [ ] Redirect a /login.html
- [ ] Session cleared correctamente

---

### 4. 👤 PERFIL (dashboard/perfil.html)

#### ✅ Avatar Upload ⭐ NUEVO
- [ ] Input file visible (accept images)
- [ ] Preview del avatar actual
- [ ] Upload button funciona
- [ ] Validaciones:
  - [ ] Máximo 2MB
  - [ ] Solo imágenes (jpg, png, gif, webp)
  - [ ] Error si excede tamaño
- [ ] Success message después de upload
- [ ] Avatar se muestra en dashboard después de refresh
- [ ] Imagen sube a Supabase Storage (bucket 'profiles')

#### ✅ Username Único ⭐ NUEVO
- [ ] Input de username editable
- [ ] Validación en tiempo real:
  - [ ] Mínimo 3 caracteres
  - [ ] Máximo 20 caracteres
  - [ ] Solo alphanumeric + guion bajo
  - [ ] Query a Supabase para verificar unicidad
  - [ ] Error si ya existe
- [ ] Success message si disponible
- [ ] Update funciona correctamente
- [ ] Username se muestra en dashboard después de refresh

#### ✅ Otros Campos
- [ ] Email (readonly, no editable)
- [ ] Bio (textarea, max 280 caracteres)
- [ ] Links sociales (Twitter, GitHub)
- [ ] Save button funciona

---

### 5. ⚙️ CONFIGURACIÓN (dashboard/configuracion.html)

#### ✅ Cambio de Contraseña
- [ ] Formulario: password actual, nueva, confirmar
- [ ] Validaciones correctas
- [ ] **Link "¿Olvidaste tu contraseña?"** ⭐ NUEVO
  - [ ] Link visible
  - [ ] Apunta a /recuperar-password.html
  - [ ] Diseño consistente

#### ✅ Preferencias
- [ ] Tema (dark/light toggle)
- [ ] Idioma (ES/EN)
- [ ] Notificaciones (email, push)

#### ✅ Eliminar Cuenta
- [ ] Botón "Eliminar cuenta" visible
- [ ] Modal de confirmación
- [ ] Warning claro sobre consecuencias

---

### 6. 🗺️ ROADMAP (/roadmap/index.html) ⭐ NUEVO

#### ✅ Header
- [ ] Logo YavlGold clickeable (→ /)
- [ ] Botón "Volver al inicio" funciona
- [ ] Título "Roadmap del Ecosistema YavlGold"
- [ ] Subtítulo visible

#### ✅ Timeline Visual
- [ ] Línea central dorada visible
- [ ] 7 módulos en orden:
  1. YavlCrypto (60% - ALTA PRIORIDAD)
  2. YavlAcademy (40% - EN DESARROLLO)
  3. YavlTrading (0% - PRÓXIMAMENTE - MUY IMPORTANTE) ⭐ ACTUALIZADO
  4. YavlSocial (0% - PRÓXIMAMENTE)
  5. YavlSuite (0% - PRÓXIMAMENTE)
  6. YavlAgro (0% - PRÓXIMAMENTE)
  7. YavlChess (0% - FUTURO)

#### ✅ Cada Módulo Tiene:
- [ ] Icono correcto (Font Awesome)
- [ ] Título con badge de estado
- [ ] Descripción clara
- [ ] Progress bar con % correcto
- [ ] 4 features listadas
- [ ] Link CTA (activo o disabled)
- [ ] Animación on scroll (IntersectionObserver)

#### ✅ YavlTrading Específico ⭐ CRÍTICO
- [ ] Descripción: "Academia de trading profesional con análisis técnico avanzado y estadísticas de mercado en tiempo real"
- [ ] Features:
  - [ ] Cursos de trading profesional
  - [ ] Análisis técnico y fundamental
  - [ ] Estadísticas en tiempo real
  - [ ] Herramientas de análisis avanzado
- [ ] **NO menciona "simulador" ni "trading real"**

#### ✅ Leyenda de Estados
- [ ] ACTIVO (verde)
- [ ] EN DESARROLLO (amarillo)
- [ ] ALTA PRIORIDAD (rojo)
- [ ] PRÓXIMAMENTE (azul)
- [ ] FUTURO (gris)

#### ✅ Responsive
- [ ] Desktop: Timeline centrada, alternancia izq/derecha
- [ ] Tablet: Timeline adaptada
- [ ] Mobile: Timeline a la izquierda, items apilados

---

### 7. 📱 RESPONSIVE & CROSS-BROWSER

#### ✅ Desktop (1920x1080)
- [ ] Homepage perfecto
- [ ] Dashboard cómodo
- [ ] Roadmap legible
- [ ] No scroll horizontal

#### ✅ Laptop (1366x768)
- [ ] Todo visible sin zoom
- [ ] Sidebar no colapsa innecesariamente

#### ✅ Tablet (768x1024)
- [ ] Navbar → Hamburger menu
- [ ] Cards apiladas en 1-2 columnas
- [ ] Roadmap timeline adaptada

#### ✅ Mobile (375x667 - iPhone SE)
- [ ] Hamburger menu funciona
- [ ] Cards apiladas 1 columna
- [ ] CoinGecko widget compacto
- [ ] Roadmap timeline izquierda
- [ ] Touch-friendly (botones grandes)

#### ✅ Browsers
- [ ] Chrome (último)
- [ ] Firefox (último)
- [ ] Safari (último)
- [ ] Edge (último)

---

### 8. 🔗 NAVEGACIÓN & LINKS

#### ✅ Links Internos
- [ ] Logo → Homepage (desde cualquier página)
- [ ] Navbar "Inicio" → /
- [ ] Navbar "Módulos" → Scroll to #modulos
- [ ] Navbar "Roadmap" → /roadmap/
- [ ] Navbar "Dashboard" → /dashboard/
- [ ] Footer "Comunidad" → Discord (externo)
- [ ] Footer "GitHub" → Repo (externo)

#### ✅ Links de Autenticación
- [ ] "Iniciar Sesión" → /login.html
- [ ] "Registrarse" → /register.html
- [ ] "¿Olvidaste tu contraseña?" → /recuperar-password.html
- [ ] "Volver a login" (desde recovery) → /login.html

#### ✅ Protected Routes
- [ ] Dashboard sin login → Redirect a /login.html
- [ ] Perfil sin login → Redirect a /login.html
- [ ] Configuración sin login → Redirect a /login.html

---

### 9. 🎨 DISEÑO & BRANDING

#### ✅ Tema Cyber Champagne Gold
- [ ] Color primario: `#C8A752` (champagne gold)
- [ ] Border gold: `rgba(200,167,82, 0.28)`
- [ ] Glow effects sutiles en hover
- [ ] Background: `#101114` (dark)
- [ ] Texto: `#f0f0f0` (light)
- [ ] Consistencia en todas las páginas

#### ✅ Tipografía
- [ ] Headings: `Orbitron` (bold, cyberpunk)
- [ ] Body: `Rajdhani` (legible)
- [ ] Font sizes consistentes
- [ ] Line-height cómodo (1.6)

#### ✅ Animaciones
- [ ] Smooth transitions (300ms cubic-bezier)
- [ ] Hover effects sutiles
- [ ] Scroll animations no intrusivas
- [ ] Loading states (spinners, skeletons)

---

### 10. ⚡ PERFORMANCE

#### ✅ Velocidad de Carga
- [ ] Homepage < 2 segundos (First Contentful Paint)
- [ ] Dashboard < 2 segundos
- [ ] Images optimizadas (WebP si posible)
- [ ] Fonts preloaded

#### ✅ API Calls
- [ ] CoinGecko responde rápido (<500ms)
- [ ] Supabase queries optimizadas
- [ ] Error handling para timeouts

#### ✅ JavaScript
- [ ] No errores en consola
- [ ] No warnings críticos
- [ ] EventListeners correctamente removidos

---

### 11. 🔒 SEGURIDAD

#### ✅ Autenticación
- [ ] Passwords hasheados (Supabase handle)
- [ ] Session tokens seguros (HttpOnly cookies)
- [ ] CSRF protection (Supabase handle)

#### ✅ Validaciones
- [ ] Client-side validations (UX)
- [ ] Server-side validations (Supabase)
- [ ] SQL injection protected (Supabase ORM)

#### ✅ Datos Sensibles
- [ ] No API keys expuestas en frontend
- [ ] Supabase anon key correcta (público pero limitado)
- [ ] Avatar uploads con límite de tamaño

---

## 🎯 CHECKLIST DE ACEPTACIÓN FINAL

Antes de marcar Pre-Fase 2 como **COMPLETADA AL 100%**, verificar:

- [ ] ✅ Todos los items críticos (⭐) funcionan
- [ ] ✅ No hay errores de consola en ninguna página
- [ ] ✅ Responsive funciona en móvil (mínimo iPhone SE)
- [ ] ✅ Recovery flow completo funciona (email → reset → login)
- [ ] ✅ CoinGecko widget actualiza precios
- [ ] ✅ Roadmap YavlTrading tiene descripción correcta
- [ ] ✅ Perfil avatar + username funcionan
- [ ] ✅ Todos los commits subidos a GitHub

---

## 📝 CÓMO TESTEAR

### Opción A: Testing Manual (Recomendado)
1. Abrir navegador incógnito (session limpia)
2. Navegar a homepage
3. Seguir checklist punto por punto
4. Anotar bugs/issues en documento separado
5. Repetir en diferentes browsers/devices

### Opción B: Testing Automatizado (Futuro)
- Cypress/Playwright para E2E
- Jest para unit tests
- Lighthouse para performance

---

## 🐛 REPORTE DE BUGS

Si encuentras un bug, documenta:
- **Página:** ¿Dónde ocurrió?
- **Acción:** ¿Qué hiciste?
- **Esperado:** ¿Qué debería pasar?
- **Actual:** ¿Qué pasó realmente?
- **Browser:** Chrome/Firefox/Safari
- **Device:** Desktop/Tablet/Mobile
- **Screenshot:** Si es posible

---

## ✅ ESTADO ACTUAL

**Pre-Fase 2:** ✅ COMPLETADA (7/7 tareas)  
**Testing:** 🟡 PENDIENTE  
**Fase 2:** ⏸️ EN ESPERA (depende de testing)

---

**¡A testear! 🚀**

_Si todo funciona perfecto, procedemos con Fase 2 (Font Awesome optimization)._
