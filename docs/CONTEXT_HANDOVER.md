# 🎯 DUMP DE MEMORIA - CONTEXT HANDOVER
## Transferencia de Contexto para GitHub Copilot

**Fecha de Generación:** 20 de Noviembre de 2025, 19:33 (America/Caracas, UTC-4:00)
**Repositorio:** YavlGold - Ecosistema Educativo Prestigioso Multimodulo
**Versión Activa:** V9.1
**Estado General:** 🚧 EN CONSTRUCCIÓN ACTIVA 🚧

---

## 📍 ESTADO DEL BÚNKER (Configuración de Puertos)

### ✅ VITE DEVELOPMENT SERVER
- **Puerto Configurado:** `3000`
- **Host:** `127.0.0.1` (localhost)
- **Archivo de Config:** `apps/gold/vite.config.js`
- **Protocolo HMR:** WebSocket (ws)
- **Timeout HMR:** 30000ms
- **strictPort:** `true` (no cambiará automáticamente si el puerto está ocupado)

### ✅ SUPABASE LOCAL SERVICES
- **API/Auth:** Puerto `54321`
- **PostgreSQL DB:** Puerto `54322`
- **Studio UI:** Puerto `54323`
- **Site URL configurado:** `http://127.0.0.1:3000`
- **Archivo de Config:** `supabase/config.toml`
- **Project ID:** `yavlgold`

### 🔥 IMPORTANTE - SINCRONIZACIÓN
El Vite dev server (puerto 3000) y Supabase Auth están perfectamente sincronizados:
- Vite sirve la app en `http://127.0.0.1:3000`
- Supabase redirige auth callbacks a `http://127.0.0.1:3000`
- **NO MODIFICAR** estos puertos sin actualizar ambas configuraciones

---

## 🗺️ MAPA DE ARCHIVOS CRÍTICOS

### 📂 ESTRUCTURA PRINCIPAL

```
YavlGold/
├── apps/
│   ├── gold/                    ⭐ PRODUCTO ESTRELLA - ACADEMIA
│   │   ├── index.html          🎯 PUNTO DE ENTRADA PRINCIPAL
│   │   ├── vite.config.js      ⚙️ CONFIG VITE (Puerto 3000)
│   │   ├── src/
│   │   └── dist/
│   ├── social/                  📱 Red Social (En desarrollo)
│   ├── agro/                    🌾 Agricultura Tech (En desarrollo)
│   └── suite/                   🎵 Suite Multimedia (En desarrollo)
│
├── supabase/
│   ├── config.toml             ⚙️ CONFIG SUPABASE (Puertos 54321-54323)
│   ├── migrations/
│   └── functions/
│
├── packages/                   📦 Paquetes compartidos (monorepo)
│   ├── auth/
│   ├── themes/
│   ├── ui/
│   └── utils/
│
├── docs/                       📚 DOCUMENTACIÓN TÉCNICA
│   ├── ROADMAP_IMPLEMENTATION.md
│   ├── ROADMAP-PRIORIDADES.md
│   ├── ROADMAPS-DETALLADOS-MODULOS.md
│   └── [70+ archivos de documentación]
│
├── package.json               📋 Root workspace config
├── pnpm-workspace.yaml        🔧 Monorepo workspace
└── pnpm-lock.yaml             🔒 Lockfile
```

### 🎯 UBICACIONES EXACTAS DE ARCHIVOS CLAVE

| Archivo | Ruta Exacta | Propósito |
|---------|-------------|-----------|
| **index.html** | `apps/gold/index.html` | Landing page principal V9.1 |
| **vite.config.js** | `apps/gold/vite.config.js` | Config dev server puerto 3000 |
| **config.toml** | `supabase/config.toml` | Config Supabase local |
| **package.json** | `package.json` (root) | Monorepo config principal |
| **workspace config** | `pnpm-workspace.yaml` | Definición de workspaces |

---

## 🌳 ESTRATEGIA DE RAMAS (GIT WORKFLOW)

### ⚠️ REGLA DE ORO: PROTECCIÓN DE `main`

```
🚫 NUNCA TRABAJES DIRECTAMENTE EN `main`
🚫 NUNCA HAGAS COMMIT DIRECTO A `main`
🚫 NUNCA HAGAS PUSH DIRECTO A `main`
```

### ✅ WORKFLOW CORRECTO

1. **Crear Feature Branch:**
   ```bash
   git checkout -b feature/nombre-descriptivo
   ```

2. **Prefijos Permitidos:**
   - `feature/` - Nueva funcionalidad
   - `fix/` - Corrección de bugs
   - `docs/` - Documentación
   - `refactor/` - Refactorización
   - `test/` - Tests
   - `chore/` - Tareas de mantenimiento

3. **Ejemplos Válidos:**
   ```bash
   feature/auth-modal-improvements
   feature/dashboard-analytics
   fix/mobile-menu-overflow
   docs/api-documentation
   refactor/supabase-queries
   ```

4. **Proceso Completo:**
   ```bash
   # 1. Crear rama
   git checkout -b feature/mi-feature

   # 2. Trabajar y commitear
   git add .
   git commit -m "feat: descripción clara"

   # 3. Push a la rama
   git push origin feature/mi-feature

   # 4. Pull Request a main (revisión requerida)
   # NO hacer merge directo
   ```

### 📌 COMMIT CONVENTIONS

Usar conventional commits:
- `feat:` - Nueva característica
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Formato, sin cambios de código
- `refactor:` - Refactorización de código
- `test:` - Añadir/modificar tests
- `chore:` - Tareas de mantenimiento

---

## 📋 PLAN MAESTRO Y ROADMAPS

### 🗺️ DOCUMENTACIÓN DE HOJA DE RUTA

Aunque la tarea menciona `docs/plan-palacio-interno-v1.1.html`, actualmente la documentación de roadmap se encuentra en:

**Documentos de Roadmap Disponibles:**
- `docs/ROADMAP_IMPLEMENTATION.md` - Plan de implementación general
- `docs/ROADMAP-PRIORIDADES.md` - Prioridades del proyecto
- `docs/ROADMAPS-DETALLADOS-MODULOS.md` - Roadmaps detallados por módulo

**Documentos Clave de Implementación:**
- `docs/PLAN-MIGRACION-MONOREPOSITORIO.md` - Plan de migración a monorepo
- `docs/FASE-2-MIGRACION-GOLD.md` - Migración del módulo Gold
- `docs/FASE-3-MIGRACION-SOCIAL.md` - Migración de Social Network
- `docs/FASE-5-MIGRACION-AGRO.md` - Migración de AgroTech
- `docs/FASE-6-SISTEMA-TEMAS.md` - Sistema de temas
- `docs/FASE-7-TESTING-E2E.md` - Testing end-to-end
- `docs/FASE-8-DEPLOY-DNS.md` - Deploy y DNS

### 🎯 MÓDULOS DEL ECOSISTEMA (Prioridades)

1. **Academia (Gold)** ⭐ - PRODUCTO ESTRELLA - EN DESARROLLO ACTIVO
2. **Duelos en Vivo** ⚔️ - EN DESARROLLO
3. **Herramientas Pro** 🛠️ - EN DESARROLLO
4. **Ajedrez Único** ♟️ - PRÓXIMAMENTE
5. **Agricultura Tech** 🌾 - EN DESARROLLO
6. **Suite Multimedia** 🎵 - EN DESARROLLO
7. **Trading Educativo** 📈 - PRÓXIMAMENTE

---

## 🛠️ STACK TÉCNICO DETECTADO

### 📦 RUNTIME & PACKAGE MANAGER

```json
"engines": {
  "node": ">=18.0.0",
  "pnpm": ">=8.0.0"
}
```

- **Node.js:** Versión mínima 18.0.0
- **Package Manager:** pnpm >= 8.0.0 (NO usar npm ni yarn)
- **Arquitectura:** Monorepo con pnpm workspaces

### 🏗️ MONOREPO CONFIGURATION

**Workspace Root:** `/mnt/c/Users/yerik/gold/YavlGold`

**Workspaces Definidos:**
```yaml
packages:
  - 'apps/*'     # Aplicaciones principales
  - 'packages/*' # Paquetes compartidos
```

### 📚 LIBRERÍAS Y DEPENDENCIAS PRINCIPALES

**Frontend:**
- **Vite** - Build tool y dev server
- **Vanilla JS** - No frameworks (decisión arquitectónica)
- **Supabase Client** - Auth y base de datos
- HTML5 + CSS3 moderno (Custom Properties)

**Fonts:**
- **Google Fonts:**
  - Orbitron (700, 900) - Headings y logo
  - Rajdhani (400, 600, 700) - Body text

**Backend:**
- **Supabase** - BaaS completo
  - PostgreSQL
  - Auth
  - Storage
  - Edge Functions
  - Real-time subscriptions

### 🎨 IDENTIDAD VISUAL (SAGRADA - NO MODIFICAR)

**Paleta de Oro Principal:**
```css
--gold-principal: #C8A752;
--gold-light: #E4D08E;
--gold-dark: #9D8040;
```

**Paleta de Oro Vibrante (CTAs):**
```css
--gold-vibrante: #D4AF37;
--gold-vibrante-light: #E8C65A;
--gold-vibrante-dark: #B8941F;
```

**Tema Oscuro/Claro:**
- Sistema de temas con localStorage
- Toggle automático
- CSS Custom Properties

---

## 🔐 CONFIGURACIONES DE SEGURIDAD

### 🛡️ SUPABASE AUTH

- **Email confirmación:** Requerida
- **RLS (Row Level Security):** Habilitado
- **Políticas activas:** Profiles, announcements
- **Captcha:** hCaptcha configurado (opcional)

### 🔑 VARIABLES DE ENTORNO

Ver `.env.example` para variables requeridas:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_HCAPTCHA_SITE_KEY` (opcional)

---

## 🚀 COMANDOS DE DESARROLLO

### Iniciar desarrollo (desde root):
```bash
pnpm dev              # Inicia todos los apps en paralelo
```

### Build de producción:
```bash
pnpm build            # Build de todos los apps
```

### Trabajar en un app específico:
```bash
# Desde root
pnpm --filter gold dev
pnpm --filter social dev
pnpm --filter agro dev
```

### Supabase Local:
```bash
supabase start        # Inicia servicios locales
supabase status       # Ver estado de servicios
supabase stop         # Detener servicios
```

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### ✅ COMPLETADO
- ✅ Monorepo configurado con pnpm workspaces
- ✅ Vite dev server en puerto 3000
- ✅ Supabase local configurado
- ✅ Landing page V9.1 operativa
- ✅ Sistema de temas dark/light
- ✅ Identidad visual Gold establecida
- ✅ Auth modal con Supabase
- ✅ Mobile responsive design
- ✅ Navegación mobile optimizada

### 🚧 EN PROGRESO
- 🚧 Academia Gold (producto estrella)
- 🚧 Duelos en Vivo
- 🚧 Herramientas Pro
- 🚧 Sistema de certificaciones
- 🚧 Migración de módulos restantes

### 📋 PENDIENTE
- 📋 Módulo de Ajedrez único
- 📋 Trading Educativo
- 📋 Dashboard completo
- 📋 Sistema de perfiles avanzado
- 📋 Testing E2E completo
- 📋 Deploy a producción

---

## 🎯 NOTAS IMPORTANTES PARA COPILOT

### 🔴 PROHIBICIONES ABSOLUTAS
1. **NO modificar** la identidad visual Gold (#C8A752)
2. **NO trabajar** directamente en branch `main`
3. **NO cambiar** puertos 3000 (Vite) o 54321-54323 (Supabase) sin actualizar ambas configs
4. **NO usar** npm o yarn, solo pnpm
5. **NO eliminar** documentación existente sin consultar

### ✅ MEJORES PRÁCTICAS
1. **SÍ usar** conventional commits
2. **SÍ crear** feature branches
3. **SÍ seguir** la guía de estilo existente
4. **SÍ mantener** responsive design
5. **SÍ documentar** cambios importantes

### 📝 ANTES DE CUALQUIER CAMBIO
1. Revisar documentación en `/docs`
2. Verificar identidad visual en archivos existentes
3. Comprobar que no afecta otras partes del ecosistema
4. Testear en modo dark y light
5. Verificar responsive mobile

---

## 📞 RECURSOS Y REFERENCIAS

### 📚 Documentación Clave
- **Guía Rápida:** `INICIO-RAPIDO.md`
- **Identidad Visual:** `IDENTIDAD-GOLD-SAGRADA.md`
- **Seguridad:** `docs/SECURITY.md`
- **Testing:** `TESTING-GUIDE.md`
- **Supabase Setup:** `SUPABASE-SETUP-INSTRUCTIONS.md`

### 🔗 Enlaces Útiles
- **Repositorio:** https://github.com/YavlPro/YavlGold.git
- **Última Commit:** 19a0d5ed9e3d3d6794ea9e1c7704df4d5f457267

---

## 🎓 FILOSOFÍA DEL PROYECTO

**YavlGold V9.1** es un **Ecosistema Educativo Prestigioso Multimodulo** único en el mundo.

**Principios Fundamentales:**
1. **Calidad Premium antes que velocidad**
2. **Educación de élite accesible**
3. **Innovación tecnológica constante**
4. **Experiencia de usuario excepcional**
5. **Código limpio y mantenible**

---

## ⚡ QUICKSTART PARA NUEVO OPERADOR

```bash
# 1. Clonar repositorio (si aún no lo tienes)
git clone https://github.com/YavlPro/YavlGold.git
cd YavlGold

# 2. Instalar dependencias
pnpm install

# 3. Configurar Supabase
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar Supabase local
supabase start

# 5. Iniciar desarrollo
pnpm dev

# 6. Abrir navegador
# http://127.0.0.1:3000
```

---

## 🔄 ÚLTIMA ACTUALIZACIÓN

**Generado:** 2025-11-20 19:33 (UTC-4)
**Por:** Cline (AI Technical Executor)
**Estado:** ✅ MEMORIA VOLCADA EXITOSAMENTE

---

**🎯 Este documento es tu BIBLIA técnica. Consúltalo antes de cualquier operación.**

**⚠️ Mantén este archivo actualizado cuando cambies configuraciones críticas.**

---

## 🆘 AYUDA RÁPIDA

**Si algo no funciona:**
1. Verificar que Supabase está corriendo: `supabase status`
2. Verificar puerto 3000 libre: `lsof -i :3000` (Linux/Mac) o `netstat -ano | findstr :3000` (Windows)
3. Limpiar cache: `rm -rf node_modules/.vite`
4. Reinstalar: `pnpm install`
5. Consultar `TROUBLESHOOTING-FIX.md`

**Comandos de emergencia:**
```bash
# Resetear Supabase local
supabase db reset

# Limpiar y reinstalar
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Verificar workspace
pnpm -r list
```

---

**END OF CONTEXT HANDOVER** 🎯
