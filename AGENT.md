# AGENTS.md — YavlGold V9.4 (PROYECTO INMUTABLE)
**Repo:** Monorepo Turborepo
**App principal:** `apps/gold/`
**Stack:** Vanilla JS (puro) + Vite (MPA) + Supabase + Vercel
**Fecha de referencia:** 16/01/2026
**Dominios:** principal `yavlgold.com` | secundario `yavlgold.gold` (redirige al principal)

---

## 0) Regla #1: Diagnosticar primero, ejecutar después
**Prohibido editar archivos** hasta completar un “Reporte de Diagnóstico” que incluya:

1) **Mapa de puntos de entrada MPA** (Vite) y navegación actual:
   - `apps/gold/vite.config.js` (entradas HTML)
   - `apps/gold/vercel.json` (clean URLs / routes)
   - `apps/gold/index.html` (navbar/cards)
   - `apps/gold/dashboard/index.html` (dashboard)
2) **Dónde se instancian datos/auth de Supabase**
   - `apps/gold/assets/js/config/supabase-config.js`
   - `apps/gold/assets/js/auth/authClient.js`, `authUI.js`
   - `apps/gold/dashboard/auth-guard.js`
3) **Dashboard: qué consulta hoy y qué le falta**
   - Tablas relevantes ya existentes: `profiles`, `modules`, `user_favorites`, `notifications`, `announcements`, `feedback`
   - Progreso académico disponible (pero no integrado): `user_lesson_progress`, `user_quiz_attempts`, `user_badges`, etc.
4) **Clima/Agro: prioridad Manual > GPS > IP y llaves de storage**
   - Lógica: `apps/gold/assets/js/geolocation.js` (`getCoordsSmart`)
   - Uso: `apps/gold/agro/dashboard.js` (`initWeather`, `displayWeather`)
   - LocalStorage keys (nombres): `YG_MANUAL_LOCATION`, `yavlgold_gps_cache`, `yavlgold_ip_cache`, `yavlgold_location_pref`, `yavlgold_weather_*`, etc.
5) **Crypto: estado real**
   - Existe carpeta: `apps/gold/crypto/` con HTMLs y backups, pero sin implementación productiva.
   - Debe integrarse como página MPA dentro de `apps/gold` (no como app aparte con python server).

**Después del diagnóstico**, proponer un plan “quirúrgico” (lista exacta de archivos a tocar/crear y por qué).
**Solo entonces** aplicar cambios.

---

## 1) No negociables (reglas duras)
### 1.1 Stack / Frameworks
- ✅ Vanilla JS puro, módulos ES, DOM directo.
- ✅ Vite MPA (HTML + `<script type="module">`).
- ❌ Prohibido React/Vue/Svelte/Angular/Next (UI principal).
- ❌ No re-arquitecturas “SPA” si el proyecto es MPA.

### 1.2 Performance (laptop 8GB RAM)
- Evitar dependencias nuevas.
- Evitar charts pesados (si se requiere, usar sparkline simple o nada).
- Evitar procesos pesados (Docker, watchers extra innecesarios).

### 1.3 Seguridad / Datos sensibles (estricto)
- NO revelar/copiar/pegar: `.env`, tokens, keys, service role, JWT, cookies, headers privados.
- NO hardcodear secretos en frontend.
- Binance:
  - V1: **solo market data pública**.
  - Endpoints firmados (TRADE/USER_DATA) requieren backend/serverless (no implementar en frontend).

### 1.4 Git y comandos
- NO ejecutar `git add/commit/push`.
- Al final solo sugerir comandos: `git status` → `git add ...` → `git commit -m "..."` → `git push`.

---

## 2) Visual DNA 9.4 (UI/UX obligatoria)
### 2.1 Paleta y tipografías
- Fondo principal: `#0a0a0a`
- Acento dorado: `#C8A752`
- Tipos:
  - Títulos: Orbitron
  - Cuerpo: Rajdhani
- ❌ Prohibido usar azul/morado como acento en UI principal.

### 2.2 Regla de implementación (muy importante)
- Antes de crear CSS nuevo, **buscar y usar** tokens existentes:
  - `packages/themes/` (y cualquier CSS de tema existente)
  - `apps/gold/assets/` (css/variables si existen)
- Preferir variables CSS existentes (ej: `--yg-gold`) si ya están definidas.
- No introducir una “segunda paleta” ni duplicar estilos.

### 2.3 Animaciones
- Solo animaciones ligeras (`opacity`, `transform`).
- Duración recomendada: 120–220ms.
- Respetar `prefers-reduced-motion` si ya existe patrón; si agregas, implementarlo.

---

## 3) MPA: reglas de routing/build (Vite + Vercel)
- Si agregas una nueva página/ruta:
  - Registrar entrada en `apps/gold/vite.config.js`
  - Ajustar clean URLs/routing en `apps/gold/vercel.json` si aplica
- Mantener patrón actual: HTML por página + JS modular.

---

## 4) Objetivos por módulo (lo que SÍ debemos hacer)
### 4.1 Dashboard (conectar “desconectado”)
Ubicación: `apps/gold/dashboard/`

Objetivo mínimo:
- “Continuar donde lo dejé” (último módulo visitado).
- “Resumen” con estadísticas reales **si existen** o degradación local si no:
  - ejemplo: módulos visitados, último acceso, favoritos, notificaciones no leídas.
- “Recomendado” con reglas simples (sin IA):
  - Si hay “último módulo” → continuar
  - Si no → módulo menos visitado / primero no visitado

Datos:
- Usar Supabase cuando sea claro y barato:
  - usuario: `profiles`
  - módulos: `modules`
  - favoritos: `user_favorites`
  - notificaciones: `notifications`
- Si progreso académico existe pero no está conectado:
  - integrar “mínimo viable” con `user_lesson_progress` (sin romper UI).
- Si no hay modelo de actividad:
  - implementar tracker local (ver 4.3) como fallback.

### 4.2 Agro + Clima (observabilidad sin alterar comportamiento)
Lógica:
- `apps/gold/assets/js/geolocation.js` (`getCoordsSmart`)
- `apps/gold/agro/dashboard.js` (`initWeather`, `displayWeather`)
- UI: `apps/gold/agro/index.html` (IDs clima)

Objetivo:
- Asegurar prioridad: Manual > GPS > IP.
- Agregar debug NO invasivo:
  - activable por `?debug=1` o flag local
  - debe mostrar: fuente elegida (MANUAL/GPS/IP), coords/ciudad usada, timestamps y estado de caches
- Si debug está apagado: **cero cambios de comportamiento**.

### 4.3 Tracker local (si se usa para dashboard)
Implementar solo si no existe solución de actividad en DB ya lista.

Requisitos:
- localStorage key versionada: `YG_ACTIVITY_V1` (JSON estable)
- API mínima:
  - `trackModuleEnter(moduleId)`
  - `trackModuleExit(moduleId)`
  - `getActivitySummary()`
- Integración en módulos existentes: 1–3 líneas por módulo (mínimo).
- Tolerante a fallos: try/catch (no romper si storage está bloqueado).

### 4.4 Crypto V1 (arranque real)
Ubicación: `apps/gold/crypto/`

Objetivo V1:
- Página operativa dentro del build de `apps/gold` (MPA).
- Market data pública (REST o WS).
- UI consistente negro+dorado.
- Manejo de errores elegante (offline / rate limit / fetch fail).
- Sin dependencias pesadas, sin secrets.

Notas:
- El `apps/gold/crypto/package.json` con `python3 -m http.server` es solo para preview manual, **no** es el flujo principal. La build oficial se valida con `pnpm build:gold`.

---

## 5) Supabase: reglas de consultas
- Evitar `select('*')` si no es necesario; traer campos específicos.
- Filtrar por usuario cuando aplique (ej: `eq('user_id', user.id)`).
- Respetar RLS: no “inventar” bypasses.
- Si existe RPC `log_event`, no asumir su contrato: leer antes de usar.

---

## 6) Build/Validación obligatoria
Al finalizar cambios:
1) Ejecutar build oficial (o equivalente detectado):
   - `pnpm build:gold` (raíz) → ejecuta `pnpm -C apps/gold build`
2) Reportar:
   - comando(s) ejecutado(s)
   - resultado (OK o error)
   - si error: corregir hasta pasar (sin reescrituras masivas)

---

## 7) Entregables en cada PR/lote de cambios
1) Cambios por archivo (qué y por qué).
2) Cómo probar manualmente:
   - Dashboard stats/recomendaciones
   - Agro/Clima (Manual vs GPS vs IP + caches + debug)
   - Crypto V1
3) Resultado del build.
4) Comandos git sugeridos (sin ejecutarlos).

---

## 8) Referencias internas (puntos clave del repo)
- Supabase client: `apps/gold/assets/js/config/supabase-config.js`
- Auth: `apps/gold/assets/js/auth/authClient.js`, `apps/gold/dashboard/auth-guard.js`
- Dashboard: `apps/gold/dashboard/index.html`
- Module manager/stats: `apps/gold/assets/js/modules/moduleManager.js`
- Geo/Weather: `apps/gold/assets/js/geolocation.js`, `apps/gold/agro/dashboard.js`
- MPA build/routing: `apps/gold/vite.config.js`, `apps/gold/vercel.json`
