# FICHA TECNICA - YavlGold V1

**Fecha de Referencia:** 15/04/2026
**Tipo de Proyecto:** Herramienta agricola digital (Agro V1 liberado)
**Arquitectura:** Monorepo Turborepo
**Release activo visible:** `V1`
**Instrucciones para agentes:** `AGENTS.md` (raiz del repo)
**Sistema de diseño:** `apps/gold/docs/ADN-VISUAL-V10.0.md` (inmutable)
**LLMs context:** `apps/gold/public/llms.txt` (servido en produccion)

---

## 1. DOMINIOS Y HOSTING

### Dominios
- **Principal:** yavlgold.com
- **Secundario:** yavlgold.gold (redirige automáticamente al dominio principal)

### Infraestructura
- **Hosting:** Vercel
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Almacenamiento:** Supabase Storage

---

## 2. STACK TECNOLÓGICO

### Frontend
- **Lenguaje:** Vanilla JavaScript (ES6+ Modules)
- **Build Tool:** Vite (Multi-Page Application)
- **Arquitectura:** MPA (Multi-Page Application) - NO SPA
- **Tipografías:**
  - Títulos/branding: Orbitron
  - Cuerpo/UI: Rajdhani
  - Citas/prestige: Playfair Display
- **Iconos:** Font Awesome 6.5

### Backend/Servicios
- **BaaS:** Supabase (Backend as a Service)
- **APIs Externas:**
  - Weather API (módulo Agro)
  - Binance API (módulo Crypto - solo market data pública)

### Gestión de Dependencias
- **Package Manager:** pnpm
- **Monorepo:** Turborepo

---

## 3. ESTRUCTURA DEL PROYECTO

### Aplicación Principal
```
apps/gold/
├── index.html              # Página principal (navbar/cards)
├── dashboard/              # Dashboard del usuario
│   └── index.html
├── agro/                   # Módulo Agro + Clima
│   └── index.html
├── crypto/                 # Módulo Crypto (en desarrollo)
│   └── index.html
├── assets/
│   ├── js/
│   │   ├── config/         # Configuración Supabase
│   │   ├── auth/           # Cliente de autenticación
│   │   ├── modules/        # Gestión de módulos
│   │   └── geolocation.js  # Lógica de geolocalización
│   └── css/                # Estilos globales
├── public/                 # Assets públicos (canónico vivo)
│   ├── brand/              # Logos y favicons
│   ├── site.webmanifest   # PWA manifest
│   └── pwa/               # Icons PWA
└── vite.config.js          # Configuración de entradas MPA
```

### Infraestrutura del Repo
```
raiz/
├── supabase/               # Infraestrutura Supabase (no tocar)
├── node_modules/          # Dependencias
├── apps/gold/             # Producto YavlGold (único código activo)
├── .git/                  # Control de versiones
├── vercel.json            # Deploy config y routing público canónico
└── turbo.json             # Turborepo config
```

### Regla canónica de infraestructura Supabase

La única carpeta Supabase canónica del proyecto es:

`supabase/` en la raíz del repo.

Su rol es contener la infraestructura real de Supabase:

- configuración principal;
- migraciones canónicas;
- Edge Functions;
- vínculo remoto;
- soporte operativo del backend.

No existe carpeta Supabase adicional valida dentro de `apps/gold/`. La duplicación histórica `apps/gold/supabase/` fue retirada del árbol activo el 2026-04-18 tras validación controlada del bootstrap/reset desde `supabase/` raíz. Si reaparece, debe tratarse como regresión operativa o contexto legacy accidental, no como segundo canon.

Regla estricta:

- no mantener dos árboles Supabase compitiendo como si ambos fueran válidos;
- no crear nuevas migraciones ni funciones en árboles secundarios;
- cualquier nueva duplicación debe corregirse con diagnóstico y reconciliación previa.

---

## 4. MÓDULOS FUNCIONALES

### 4.1 Dashboard
**Ubicación:** `apps/gold/dashboard/`

**Funcionalidades:**
- Resumen de actividad del usuario
- "Continuar donde lo dejé" (último módulo visitado)
- Recomendaciones personalizadas (sin IA, basadas en reglas)
- Estadísticas de uso
- Notificaciones y anuncios

**Datos Utilizados:**
- Perfiles de usuario
- Módulos disponibles
- Favoritos del usuario
- Progreso académico
- Notificaciones

### 4.2 Agro (módulo liberado)
**Ubicación:** `apps/gold/agro/`

**Funcionalidades:**
- Facturero financiero: gastos, ingresos (pagados), fiados, pérdidas, donaciones, otros
- Gestión de cultivos con ciclos productivos
- Dashboard agrícola con clima en tiempo real
- Rankings y estadísticas financieras
- Carrito de compras con lista de insumos
- Planificación y agenda agrícola
- Inteligencia de mercado
- Feedback y encuestas
- Interacciones sociales
- Notificaciones
- Papelera de eliminados (soft-delete con restore)
- Geolocalización con prioridad: Manual > GPS > IP

**Módulos JS (carga dinámica):**
```
agro.js              — monolito principal (facturero, CRUD, historial)
agro-agenda.js       — agenda agrícola
agro-cart.js         — carrito de insumos
agro-clima.js        — integración meteorológica
agro-crop-report.js  — reportes por cultivo
agro-exchange.js     — tasas de cambio
agro-feedback.js     — feedback y encuestas
agro-interactions.js — interacciones
agro-market.js       — inteligencia de mercado
agro-notifications.js — notificaciones
agro-planning.js     — planificación
agro-privacy.js      — privacidad de datos
agro-selection.js    — selección de cultivos
agro-shell.js        — shell UI de Agro: gestiona la navegación principal del módulo, incluyendo rail persistente, launcher expandido, búsqueda compacta, favoritos y entrada inicial al Dashboard Agro
agro-stats.js        — estadísticas financieras
agro-stats-report.js — reportes estadísticos
agro-trash.js        — papelera de eliminados
agro-unit-totals.js  — totales por unidad
agro-wizard.js       — wizard de configuración
```

**Archivos CSS:**
- `agro.css` — estilos principales + papelera + undo toast
- `agro-dashboard.css` — dashboard
- `agro-operations.css` — operaciones financieras

**LocalStorage Keys:**
- `YG_MANUAL_LOCATION`
- `yavlgold_gps_cache`
- `yavlgold_ip_cache`
- `yavlgold_location_pref`
- `yavlgold_weather_*`

### 4.3 Crypto
**Ubicación:** `apps/gold/crypto/`

**Estado:** No disponible en el catalogo actual (base V1). Placeholder de compatibilidad.

**Nota:** Crypto NO es un modulo activo. Su ruta muestra un placeholder "no disponible". Codigo historico archivado en `archive/`. Si se reactiva, debera alinearse con el catalogo vigente.

### 4.4 Autenticación
**Archivos Clave:**
- `apps/gold/assets/js/config/supabase-config.js`
- `apps/gold/assets/js/auth/authClient.js`
- `apps/gold/assets/js/auth/authUI.js`
- `apps/gold/dashboard/auth-guard.js`

**Características:**
- Autenticación vía Supabase Auth
- Guards de ruta para páginas protegidas
- Gestión de sesiones

---

## 5. BASE DE DATOS (SUPABASE)

### Tablas Principales

#### Usuarios y Perfiles
- `profiles` - Perfiles de usuario

#### Agro — Facturero
- `agro_expenses` - Gastos (con `deleted_at` soft-delete)
- `agro_incomes` - Ingresos/Pagados (con `deleted_at`)
- `agro_pending` - Fiados/Pendientes (con `deleted_at`)
- `agro_losses` - Pérdidas (con `deleted_at`)
- `agro_transfers` - Donaciones/Transferencias (con `deleted_at`)

#### Agro — Cultivos
- `agro_crops` - Cultivos activos
- `agro_crop_cycles` - Ciclos productivos

#### Contenido y Módulos
- `modules` - Definición de módulos
- `user_favorites` - Favoritos del usuario

#### Progreso Académico
- `user_lesson_progress` - Progreso en lecciones
- `user_quiz_attempts` - Intentos de quizzes
- `user_badges` - Insignias obtenidas

#### Comunicación
- `notifications` - Notificaciones del usuario
- `announcements` - Anuncios generales
- `feedback` - Retroalimentación de usuarios

### Seguridad
- Row Level Security (RLS) habilitado
- Políticas de acceso por usuario
- Consultas filtradas por `user_id`
- Soft-delete con `deleted_at` timestamp como patrón estándar
- Monedas soportadas: COP, USD, VES

---

## 6. IDENTIDAD VISUAL

### Paleta de Colores
- **Fondo Principal:** `#0a0a0a` (negro profundo)
- **Acento Dorado:** `#C8A752`
- **Prohibido:** Azul/morado como acento principal

### Documento Canónico de ADN Visual
- **Versión:** `V10.0 (Inmutable)`
- **Ruta:** `apps/gold/docs/ADN-VISUAL-V10.0.md`

### Tipografía
- **Títulos:** Orbitron (futurista, tecnológica)
- **Cuerpo:** Rajdhani (legible, moderna)

### Animaciones
- **Tipo:** Ligeras (opacity, transform)
- **Duración:** 120-220ms
- **Accesibilidad:** Respeta `prefers-reduced-motion`

---

## 7. REGLAS DE DESARROLLO

### Restricciones Técnicas
- ✅ Vanilla JS puro (módulos ES6)
- ✅ Vite MPA (HTML + `<script type="module">`)
- ❌ Prohibido: React, Vue, Svelte, Angular, Next.js
- ❌ No convertir a SPA

### Performance
- Optimizado para laptops con 8GB RAM
- Evitar dependencias pesadas
- Evitar charts complejos
- Procesos ligeros (sin Docker innecesario)

### Seguridad
- NO exponer: `.env`, tokens, keys, service role, JWT
- NO hardcodear secretos en frontend
- Binance: solo market data pública (sin endpoints firmados)

### Control de Versiones
- NO ejecutar comandos git automáticamente
- Sugerir comandos al final: `git status` → `git add` → `git commit` → `git push`

---

## 8. ROUTING Y BUILD

### Multi-Page Application (MPA)
- Cada página es un HTML independiente
- Entradas definidas en `apps/gold/vite.config.js`
- Clean URLs configuradas en `vercel.json` de la raíz del repo (config canónica del deploy)

### Proceso de Build
```bash
# Desde la raíz del monorepo
pnpm build:gold

# Equivale a:
pnpm -C apps/gold build
```

### Pipeline de build
1. `agent-guard.mjs` — bloquea dependencias prohibidas (React, Vue, Svelte, Angular, Next, Nuxt, Astro)
2. `agent-report-check.mjs` — valida que exista `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
3. `vite build` — build de producción MPA
4. `check-llms.mjs` — valida `llms.txt` en dist
5. `check-dist-utf8.mjs` — verifica encoding UTF-8 en HTML de salida

### Agregar Nueva Página
1. Crear HTML en ubicación apropiada
2. Registrar entrada en `apps/gold/vite.config.js`
3. Ajustar routing en `vercel.json` raíz si necesario
4. Mantener patrón: HTML + JS modular

---

## 9. FLUJO DE TRABAJO

### Metodología de Desarrollo
1. **Diagnosticar primero, ejecutar después**
   - Generar "Reporte de Diagnóstico" antes de editar
   - Mapear puntos de entrada y navegación
   - Identificar archivos afectados
   - Proponer plan quirúrgico

2. **Validación Obligatoria**
   - Ejecutar `pnpm build:gold` después de cambios
   - Reportar resultado (OK o error)
   - Corregir hasta pasar build

3. **Entregables por PR**
   - Cambios por archivo (qué y por qué)
   - Instrucciones de prueba manual
   - Resultado del build
   - Comandos git sugeridos

---

## 10. OBJETIVOS POR MÓDULO

### Dashboard
- Conectar datos "desconectados"
- "Continuar donde lo dejé" funcional
- Resumen con estadísticas reales o degradación local
- Recomendaciones basadas en reglas simples

### Agro + Clima
- Asegurar prioridad: Manual > GPS > IP
- Debug no invasivo (activable con `?debug=1`)
- Mantener comportamiento actual sin cambios

---

## 11. REFERENCIAS INTERNAS

### Archivos Clave
- **Instrucciones agentes:** `AGENTS.md` (raíz)
- **ADN Visual:** `apps/gold/docs/ADN-VISUAL-V10.0.md`
- **Reporte operativo:** `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- **LLMs context:** `apps/gold/public/llms.txt`
- **Supabase Client:** `apps/gold/assets/js/config/supabase-config.js`
- **Auth:** `apps/gold/assets/js/auth/authClient.js`
- **Dashboard Guard:** `apps/gold/dashboard/auth-guard.js`
- **Module Manager:** `apps/gold/assets/js/modules/moduleManager.js`
- **Geolocalización:** `apps/gold/assets/js/geolocation.js`
- **Weather:** `apps/gold/agro/dashboard.js`
- **Build Config:** `apps/gold/vite.config.js`
- **Routing:** `vercel.json` (raíz del repo)
- **Agent Guard:** `apps/gold/scripts/agent-guard.mjs`

---

## 12. COMANDOS ÚTILES

```bash
# Instalar dependencias
pnpm install

# Build de producción
pnpm build:gold

# Desarrollo local (si configurado)
pnpm dev

# Verificar estado
git status
```

---

## NOTAS IMPORTANTES

1. **Proyecto Inmutable:** Respetar arquitectura MPA existente
2. **Sin Datos Sensibles:** Esta ficha NO contiene keys, tokens o credenciales
3. **Contexto para Agentes:** Usar como referencia para entender estructura y reglas
4. **Actualización:** Mantener sincronizada con cambios mayores del proyecto

---

**Versión de Ficha:** 1.3
**Última Actualización:** 15/04/2026
