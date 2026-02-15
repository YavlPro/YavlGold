# FICHA TÉCNICA - YavlGold V9.4

**Fecha de Referencia:** 16/01/2026
**Tipo de Proyecto:** Plataforma educativa, productiva y de servicios
**Arquitectura:** Monorepo Turborepo

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
  - Títulos: Orbitron
  - Cuerpo: Rajdhani

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
├── vite.config.js          # Configuración de entradas MPA
└── vercel.json             # Routing y clean URLs
```

### Paquetes Compartidos
```
packages/
└── themes/                 # Tokens de diseño compartidos
```

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

### 4.2 Agro + Clima
**Ubicación:** `apps/gold/agro/`

**Funcionalidades:**
- Información meteorológica en tiempo real
- Geolocalización con prioridad: Manual > GPS > IP
- Caché de ubicaciones
- Dashboard agrícola

**Archivos Clave:**
- `apps/gold/assets/js/geolocation.js` (lógica de coords)
- `apps/gold/agro/dashboard.js` (integración clima)

**LocalStorage Keys:**
- `YG_MANUAL_LOCATION`
- `yavlgold_gps_cache`
- `yavlgold_ip_cache`
- `yavlgold_location_pref`
- `yavlgold_weather_*`

### 4.3 Crypto
**Ubicación:** `apps/gold/crypto/`

**Estado:** En desarrollo inicial (V1)

**Funcionalidades Planeadas:**
- Market data pública (Binance API)
- Visualización de precios
- Sin trading (solo información)

**Restricciones:**
- Solo endpoints públicos (no requieren autenticación)
- Sin manejo de fondos
- Sin operaciones de trading

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

#### Contenido y Módulos
- `modules` - Definición de módulos educativos
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

---

## 6. IDENTIDAD VISUAL

### Paleta de Colores
- **Fondo Principal:** `#0a0a0a` (negro profundo)
- **Acento Dorado:** `#C8A752`
- **Prohibido:** Azul/morado como acento principal

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
- Clean URLs configuradas en `apps/gold/vercel.json`

### Proceso de Build
```bash
# Desde la raíz del monorepo
pnpm build:gold

# Equivale a:
pnpm -C apps/gold build
```

### Agregar Nueva Página
1. Crear HTML en ubicación apropiada
2. Registrar entrada en `vite.config.js`
3. Ajustar routing en `vercel.json` si necesario
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

### Crypto V1
- Página operativa dentro de build MPA
- Market data pública (REST o WebSocket)
- UI consistente (negro + dorado)
- Manejo elegante de errores
- Sin dependencias pesadas

---

## 11. REFERENCIAS INTERNAS

### Archivos Clave
- **Supabase Client:** `apps/gold/assets/js/config/supabase-config.js`
- **Auth:** `apps/gold/assets/js/auth/authClient.js`
- **Dashboard Guard:** `apps/gold/dashboard/auth-guard.js`
- **Module Manager:** `apps/gold/assets/js/modules/moduleManager.js`
- **Geolocalización:** `apps/gold/assets/js/geolocation.js`
- **Weather:** `apps/gold/agro/dashboard.js`
- **Build Config:** `apps/gold/vite.config.js`
- **Routing:** `apps/gold/vercel.json`

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

**Versión de Ficha:** 1.0
**Última Actualización:** 15/02/2026
