# YavlGold V9.3 - Ecosistema Global Educativo

Bienvenido al repositorio oficial de **YavlGold**, un ecosistema educativo multi-módulo enfocado en Blockchain, Trading y Herramientas Digitales.

## 🏗 Arquitectura

El proyecto es un **Monorepo** basado en **Vite** (Vanilla JS) optimizado para despliegue en Vercel.
Funciona como una **Multi-Page App (MPA)** donde cada carpeta en `/apps` es un módulo independiente pero conectado visualmente.

### Estructura Clave

- **`/apps`**: Contiene los módulos funcionales.
  - `gold/`: Landing page principal (`/`) y Dashboard (`/dashboard`).
  - `academia/`: Plataforma educativa con cursos.
  - `suite/`: Suite multimedia.
  - `herramientas/`: Calculadoras y utilidades (Trading/Cripto).
- **`/public/brand`**: **Assets Blindados**. Contiene los logos oficiales (`logo.webp`, `logo.svg`).
- **`/dist`**: Carpeta de salida generada por el build (no versionar).
- **`vite.config.js`**: Configuración central que mapea cada entrada (input) para el build.

## 🚀 Comandos

### Desarrollo
Para iniciar el servidor local:
```bash
pnpm dev
```

### Producción
Para generar el build de producción (Vite build):
```bash
pnpm build:v9
```

## 🔐 Autenticación

El sistema utiliza **Supabase** para la autenticación.
Se implementa un **Smart AuthGuard V9.4** en `authClient.js` que gestiona:
- Redirección inteligente.
- Prevención de bucles de redirección en dispositivos móviles.
- Protección de rutas privadas (`/dashboard`, `/herramientas`, etc.).

---
*Desarrollado por el equipo de YavlGold.*
