# 🌟 GLOBAL GOLD - Ecosistema Cripto Profesional

Plataforma completa para trading e inversión en criptomonedas. Incluye herramientas profesionales, academia educativa, sistema de autenticación y comunidad activa.

## 📦 Estructura del Proyecto

```
globalgold/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css        # Sistema de tokens de diseño
│   │   ├── unificacion.css   # Estilos unificados
│   │   └── style.css         # Estilos base
│   ├── js/
│   │   ├── auth/
│   │   │   ├── authClient.js   # Cliente de autenticación v2.0
│   │   │   ├── authUI.js       # Interfaz de auth
│   │   │   └── authGuard.js    # Protección de rutas
│   │   └── script.js        # Scripts generales
│   └── images/            # Imágenes y assets
├── herramientas/
│   ├── index.html         # Hub de herramientas
│   ├── calculadora.html   # Calculadora de ROI
│   ├── conversor.html     # Conversor de cripto
│   └── analisis.html      # Análisis de mercado
├── academia/
│   ├── index.html         # Página principal academia
│   └── lecciones/         # Contenido educativo
├── dashboard/
│   └── index.html         # Panel de usuario
└── go/                   # Redirects (Telegram, WhatsApp, etc)
```

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/YavlPro/gold.git
cd gold
```

### 2. Configurar Supabase (Backend)
Edita `assets/js/auth/authClient.js` con tus credenciales:
```javascript
const SUPABASE_URL = 'tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';
```

### 3. Desplegar
- **GitHub Pages**: Push a main y activa Pages en Settings
- **Vercel/Netlify**: Conecta el repo y despliega automáticamente
- **Servidor propio**: Sube los archivos vía FTP/SSH

## 📚 Cómo Usar

### Sistema de Tokens CSS
Usa las variables definidas en `assets/css/tokens.css`:

```css
/* Colores dorados */
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);

/* Gradientes */
background: var(--gg-gradient-gold);

/* Sombras */
box-shadow: var(--gg-shadow-gold);

/* Transiciones */
transition: var(--gg-transition-base);
```

### Sistema de Autenticación
#### Proteger una página:
```html
<script src="/assets/js/auth/authClient.js"></script>
<script src="/assets/js/auth/authUI.js"></script>
<script src="/assets/js/auth/authGuard.js"></script>
```

#### Proteger un enlace:
```html
<a href="/herramientas/" data-protected="true">Herramientas</a>
```

### Agregar nuevas herramientas
1. Crea un archivo en `/herramientas/mi-herramienta.html`
2. Copia la estructura de `calculadora.html`
3. Agrégala al hub en `herramientas/index.html`

## Autoría
- Autor: Yerikson Varela (YavlPro)  
- Marca/comunidad: GLOBAL GOLD

## Contacto
- Web: https://globalgold.gold/  
- X (Twitter): https://x.com/Yavlcapitan  
- Telegram (Comunidad): https://t.me/+94LkbchALuk3Zjhh  
- YouTube: https://youtube.com/@globalgoldlc  
- Nota: En el sitio web los botones de contacto ocultan número/usuario a simple vista (implementado vía páginas /go/).

## ⚖️ Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 👏 Créditos

- **Diseño y Desarrollo**: Yerikson Varela (YavlPro)
- **Comunidad**: GlobalGold Team
- **Inspiración**: La comunidad cripto global

## Contribuciones
¿Quieres aportar? Abre un issue o una pull request. ¡Toda ayuda es bienvenida!

## 🛣️ Roadmap

### ✅ Fase 1: Fundación (Completada)
- [x] Estructura base del sitio
- [x] Sistema de autenticación v2.0
- [x] Diseño responsive
- [x] Sistema de tokens CSS

### 🔄 Fase 2: Expansión (En Progreso)
- [x] Academia completa (5 lecciones)
- [x] Calculadora de ROI
- [ ] Conversor de criptomonedas (en desarrollo)
- [ ] Análisis de mercado
- [ ] Dashboard con datos reales

### ⏳ Fase 3: Ecosistema Pro (Próximamente)
- [ ] Gestor de portafolio
- [ ] Integración con APIs de exchanges
- [ ] Contenido premium para miembros
- [ ] Sistema de notificaciones en tiempo real
- [ ] Mobile app (PWA)

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript (Vanilla)
- **Backend**: Supabase (Auth, Database, Storage)
- **Hosting**: GitHub Pages / Vercel
- **CDN**: Font Awesome, Google Fonts
- **Seguridad**: hCaptcha, HTTPS, CORS
