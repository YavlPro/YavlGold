# PROJECT BRIEF NO SENSIBLE - YavlGold V9.4

Reglas aplicadas: sin valores de .env, sin keys/tokens, sin URLs con query sensible, sin headers privados. Solo rutas de archivos, nombres de funciones, scripts y resumenes.

## 1) Scripts

**package.json (raiz)**
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:v9": "vitest --environment jsdom --run",
    "build:gold": "pnpm -C apps/gold build",
    "clean:gold": "powershell -NoProfile -Command \"Remove-Item -Recurse -Force apps/gold/dist -ErrorAction SilentlyContinue; Remove-Item -Recurse -Force apps/gold/node_modules/.vite -ErrorAction SilentlyContinue\"",
    "scan:gold": "powershell -NoProfile -Command \"$pat='pass\\s*===\\s*[\\x22\\x27]123[\\x22\\x27]|admin.{0,20}123|superadmin'; Select-String -Path 'apps/gold/dist/assets/*.js' -Pattern $pat -ErrorAction SilentlyContinue\"",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "dev:v9": "vite",
    "build:v9": "vite build",
    "preview:v9": "vite preview",
    "verify:mpa": "KILL_ON_PORT=1 bash scripts/verify-mpa.sh",
    "assets:optimize": "node scripts/optimize-images.mjs"
  }
}
```

**apps/gold/package.json**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && node scripts/check-dist-utf8.mjs",
    "preview": "vite preview",
    "clean:gold": "rimraf dist"
  }
}
```

**packages/utils/package.json**
```json
{
  "scripts": {
    "test": "echo \"Tests coming soon\"",
    "lint": "echo \"Linting coming soon\""
  }
}
```

**packages/ui/package.json**
```json
{
  "scripts": {
    "test": "echo \"Tests coming soon\"",
    "lint": "echo \"Linting coming soon\""
  }
}
```

**packages/themes/package.json**
```json
{
  "scripts": {
    "test": "echo \"Tests coming soon\"",
    "lint": "echo \"Linting coming soon\""
  }
}
```

**apps/gold/crypto/package.json**
```json
{
  "scripts": {
    "dev": "python3 -m http.server 8082",
    "preview": "python3 -m http.server 8082"
  }
}
```

**apps/gold/agro/package.json**
```json
{
  "scripts": {
    "dev": "python3 -m http.server 8083",
    "preview": "python3 -m http.server 8083"
  }
}
```

**apps/gold/social/package.json**
```json
{
  "scripts": {
    "dev": "python3 -m http.server 8081",
    "preview": "python3 -m http.server 8081"
  }
}
```

**apps/gold/academia/package.json**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**apps/gold/herramientas/package.json**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Comando real de build**: `pnpm build:gold` (ejecuta `pnpm -C apps/gold build`).

## 2) Mapa de carpetas (max 3 niveles)

**Turborepo (estructura principal)**
```text
/
  apps/
    gold/
  packages/
    themes/
    ui/
    utils/
  public/
  supabase/
  dist/
  .github/
  .turbo/
```

**apps/gold (estructura real)**
```text
apps/gold/
  agro/
  crypto/
  dashboard/
  academia/
  herramientas/
  social/
  assets/
  docs/
  public/
  supabase/
  scripts/
```

**Submodulos (logicos) y rutas**
- agro: `apps/gold/agro`
- clima/weather: `apps/gold/assets/js/geolocation.js` + `apps/gold/agro/dashboard.js`
- crypto: `apps/gold/crypto`
- dashboard: `apps/gold/dashboard`
- auth: `apps/gold/assets/js/auth`
- shared: `apps/gold/assets/js/components` + `apps/gold/assets/js/utils` (y `packages/ui`, `packages/utils`, `packages/themes`)

## 3) Routing / Navegacion

**Archivos de routing o navegacion**
- `apps/gold/vite.config.js` (MPA, entradas HTML por pagina)
- `apps/gold/vercel.json` (clean URLs y routes para subapps)
- `apps/gold/index.html` (navbar + links a submodulos)
- `apps/gold/dashboard/index.html` (links de modulos via `mod.route` / `mod.path` / `slug`)
- `apps/gold/assets/js/auth/authClient.js` (guardas y redirects)
- `apps/gold/dashboard/auth-guard.js` (session check y redirect)

**Renderizado de paginas en vanilla**
- MPA con HTML estatico + `<script type="module">` que inyecta/actualiza DOM.
- Vite empaqueta entradas definidas en `apps/gold/vite.config.js`.

## 4) Supabase

**Instancia del client**
- `apps/gold/assets/js/config/supabase-config.js` (`createClient`, usa variables VITE_)

**Auth (login/session) y user**
- `apps/gold/assets/js/auth/authClient.js` (login/register/reset, `getSession`, `getCurrentUser`)
- `apps/gold/assets/js/auth/authUI.js` (UI de auth conectada a AuthClient)
- `apps/gold/assets/js/main.js` (listener `onAuthStateChange`)
- `apps/gold/dashboard/auth-guard.js` (session check para dashboard)
- `apps/gold/assets/js/academia.js` (`supabase.auth.getUser()`)

**Tablas/consultas usadas (solo nombres)**
- Progreso: `profiles`, `lessons`, `modules`, `user_lesson_progress`, `user_quiz_attempts`, `user_badges`, `badges`, `certificates`
- Actividad/gestion: `user_favorites`, `announcements`, `feedback`, `app_admins`
- Notificaciones: `notifications`
- Storage: `avatars`
- RPC: `log_event`

## 5) Dashboard

**Archivos principales**
- `apps/gold/dashboard/index.html`
- `apps/gold/dashboard/auth-guard.js`

**Secciones y datos**
- Bienvenida (avatar/nombre): `profiles`
- Stats (modulos/favoritos/en desarrollo): `modules`, `user_favorites`
- Grid de modulos (dinamico): `modules` (usa `route`/`path`/`slug`)
- Notificaciones: `notifications`
- Anuncios: `announcements`
- Feedback: `feedback`
- Perfil/ajustes: `profiles`, `avatars`

**Puntos de extension seguros (stats/recomendaciones)**
- `apps/gold/assets/js/modules/moduleManager.js` (extender `StatsManager`, mapear a nuevos IDs/data-stat)
- `apps/gold/dashboard/index.html` (agregar contenedor de recomendaciones y poblarlo con modulos ya cargados)
- `apps/gold/assets/js/modules/moduleManager.js` (usar cache y evitar fetch duplicado)

## 6) Agro / Clima

**Logica Manual > GPS > IP**
- `apps/gold/assets/js/geolocation.js` (funcion `getCoordsSmart`)
- Usado en `apps/gold/agro/dashboard.js` (`initWeather`)

**LocalStorage keys (solo nombres)**
- `YG_MANUAL_LOCATION`
- `yavlgold_gps_cache`
- `yavlgold_ip_cache`
- `yavlgold_location_pref`
- `yavlgold_weather_` (prefijo)
- `yavlgold_agro_crops`
- `yavlgold_agro_tasks`
- `yavlgold_agro_notifications`
- `yavlgold_agro_notifications_read`
- `theme`

**UI del clima**
- `apps/gold/agro/index.html` (IDs `weather-temp`, `weather-desc`, `weather-humidity`)
- `apps/gold/agro/dashboard.js` (`displayWeather`)

## 7) Crypto

**Contenido actual**
- `apps/gold/crypto/index.html`
- `apps/gold/crypto/header.html`
- `apps/gold/crypto/index_old.html`
- `apps/gold/crypto/script_backup.txt`
- `apps/gold/crypto/README.md`
- `apps/gold/crypto/package.json`
- `apps/gold/crypto/LICENSE`

**Enlace desde navegacion actual**
- `apps/gold/index.html` (card con `window.location.href = './crypto/'`)
- `apps/gold/vite.config.js` (entrada `crypto`)
- `apps/gold/vercel.json` (route `/crypto`)

## 8) Riesgos / constraints detectados

- No hay modelo claro de actividad/uso (ej: `user_activity`, `module_views`), solo counts basicos en `modules` y `user_favorites`.
- Progreso academico existe pero no esta integrado al dashboard; requiere cruzar `user_lesson_progress`/`profiles`.
- Logica de modulos duplicada (inline en dashboard + `StatsManager`), riesgo de desalineacion.
- MPA obliga a registrar nuevas paginas en `apps/gold/vite.config.js` y rutas limpias en `apps/gold/vercel.json`.
- Varias queries por carga; evitar duplicados y centralizar cache.
- Scripts raiz `verify:mpa` y `assets:optimize` apuntan a rutas no presentes en el repo.
