# YavlGold V9.4 — Ecosistema Educativo Descentralizado

![Version](https://img.shields.io/badge/version-9.4.0-C8A752?style=flat-square)
![Status](https://img.shields.io/badge/status-Beta-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

Bienvenido al repositorio oficial de **YavlGold**, un ecosistema educativo multi-módulo enfocado en Blockchain, Trading, Agricultura y Herramientas Digitales.

---

## 🏗️ Arquitectura

Este proyecto es un **Monorepo** basado en **Vite** (Vanilla JS + ES Modules) optimizado para despliegue en **Vercel**.
Funciona como una **Multi-Page Application (MPA)** donde cada módulo es independiente pero conectado visualmente.

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Vite + Vanilla JS + CSS Tokens |
| Backend | Supabase (Auth + PostgreSQL + Realtime) |
| Auth | Smart AuthGuard V9.4 + hCaptcha Invisible |
| Deploy | Vercel (Git-based CI/CD) |

### Estructura del Proyecto

```
gold/
├── apps/gold/                 # Dashboard Principal & Auth
│   ├── academia/              # Módulo: Cursos Educativos
│   ├── agro/                  # Módulo: Agricultura & Clima
│   ├── herramientas/          # Módulo: Calculadoras Cripto
│   ├── social/                # Módulo: Red Social
│   ├── suite/                 # Módulo: Suite Multimedia
│   └── dashboard/             # Panel de Control
├── package.json               # Monorepo Root
└── vite.config.js             # Multi-Page Configuration
```

---

## 🚀 Setup Rápido

### Requisitos
- Node.js 18+
- pnpm 8+

### Instalación
```bash
# Clonar
git clone https://github.com/YavlPro/YavlGold.git
cd gold

# Instalar dependencias
pnpm install

# Desarrollo local
pnpm dev
```

### Build Producción
```bash
pnpm build:v9
pnpm preview:v9
```

---

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz con:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

---

## 📋 Changelog Reciente

### V9.4.0 (Enero 2026)
- ✅ **Módulos Dinámicos:** Cards renderizados desde Supabase `modules` table.
- ✅ **hCaptcha Invisible:** Protección anti-bot sin fricción.
- ✅ **Security Patch:** Eliminación de localStorage inseguro.
- ✅ **Smart AuthGuard V9.4:** Anti-loop redirects en móviles.
- ✅ **Single Source of Truth:** Versión inyectada desde `package.json` via Vite.

### V9.3.0 (Diciembre 2025)
- Avatar dinámico en dashboard.
- Settings modal con perfil editable.
- Glassmorphism UI overhaul.

---

## 📄 Licencia

MIT © 2026 [YavlPro](https://github.com/YavlPro)

---

*Desarrollado con 🦅 por el equipo de YavlGold.*
