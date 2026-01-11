# 🛰️ YavlGold Ecosystem

> **V9.4 (Gold Edition)** • Estado: ✅ En Producción

---

## 📋 Descripción

**YavlGold** es una plataforma educativa y operativa que fusiona **Agricultura**, **Tecnología** y **Trading** en un único ecosistema. Diseñada con filosofía "Mobile-First" y estética **Dark/Gold Premium**.

---

## ⚡ Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| **Vanilla JS** | Frontend optimizado, sin frameworks pesados |
| **Vite** | Build tool ultrarrápido con HMR |
| **Supabase** | Backend, Auth, Base de datos PostgreSQL |
| **Turborepo** | Orquestación de monorepo |
| **CSS Custom** | ADN Visual Dark/Gold (sin Tailwind) |

---

## 🧩 Módulos del Ecosistema

### 🌱 Módulo Agro **[COMPLETADO]**

El corazón agrícola del ecosistema, ahora 100% operativo:

- ✅ **Dashboard Operativo** — Gestión visual de cultivos
- ✅ **CRUD Completo** — Crear, leer, actualizar y eliminar cultivos en tiempo real
- ✅ **Integración Supabase** — Tabla `agro_crops` con RLS activado
- ✅ **Widgets Inteligentes:**
  - 🌤️ Clima Geolocalizado (Open-Meteo API + Browser Geolocation)
  - 📈 Mercados en Vivo (Binance WebSocket - BTC/USDT)
  - 🌙 Fase Lunar Astronómica (algoritmo nativo, sin API)
- ✅ **Calculadora ROI** — Análisis de rentabilidad por cultivo
- ✅ **Roadmap Estratégico** — Visión 2026-2027 integrada
- ✅ **Navegación Fluida** — Logo → Home, botón Dashboard Principal
- ✅ **Diseño Responsivo** — Mobile-First, animaciones premium

### 🎓 Módulo Academia `[En Desarrollo]`

- Lecciones estructuradas por módulos
- Sistema de evaluación con quizzes
- Tracking de progreso del estudiante

### 🛠️ Módulo Herramientas `[En Desarrollo]`

- Calculadoras financieras
- Conversor de criptomonedas
- Utilidades para traders

### 👥 Módulo Social `[Planificado]`

- Perfiles de usuario
- Sistema de logros
- Comunidad y networking

---

## 🎨 ADN Visual

El proyecto sigue la filosofía **"Visual DNA: Dark/Gold Premium"**:

```css
--gold-principal: #C8A752;
--gold-vibrante: #D4AF37;
--bg-primary: #0a0a0a;
--bg-secondary: #1a1a1a;
```

- **Tipografía:** Orbitron (headings) + Rajdhani (body)
- **Efectos:** Glassmorphism, partículas animadas, breathing effects
- **Tema:** Dark mode por defecto, light mode disponible

---

## 🔗 Enlaces Rápidos

| Recurso | URL |
|---------|-----|
| 🌐 **Demo en Vivo** | [yavlgold.com](https://yavlgold.com) |
| 📂 **Repositorio** | [github.com/YavlPro/YavlGold](https://github.com/YavlPro/YavlGold) |
| 💬 **Comunidad** | [t.me/YavlEcosystem](https://t.me/YavlEcosystem) |
| 📞 **Soporte** | [t.me/YavlPro](https://t.me/YavlPro) |

---

## 🚀 Inicio Rápido

```bash
# Clonar repositorio
git clone https://github.com/YavlPro/YavlGold.git
cd YavlGold

# Instalar dependencias
pnpm install

# Variables de entorno
cp .env.example .env
# Configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# Desarrollo local
pnpm dev

# Build de producción
pnpm build
```

---

## 📁 Estructura del Proyecto

```
gold/
├── apps/
│   └── gold/           # Aplicación principal
│       ├── agro/       # 🌱 Módulo Agro (ACTIVO)
│       ├── academia/   # 🎓 Módulo Academia
│       ├── dashboard/  # 📊 Dashboard Principal
│       ├── herramientas/ # 🛠️ Herramientas
│       └── assets/     # Recursos compartidos
├── packages/           # Paquetes compartidos
├── turbo.json          # Configuración Turborepo
└── package.json        # Scripts del monorepo
```

---

## 📜 Licencia

Open Source © 2026 YavlGold Team - Released under [MIT License](LICENSE).

---

<div align="center">

**Construido con 🌾 para agricultores e inversores del futuro**

*YavlGold V9.4 — Gold Edition*

</div>
