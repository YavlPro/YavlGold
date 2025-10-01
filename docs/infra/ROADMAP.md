# Infraestructura y Backend – Global Gold (Oct 2025)

Este documento resume el plan para priorizar hosting y backend Laravel, dejando en stand‑by mejoras frontend menores.

## Objetivo
- Desplegar una API Laravel mínima en `api.globalgold.gold` para habilitar autenticación real, métricas y persistencia de progreso.

## Entregables Fase 1 (Día 0–2)
- [ ] Compra/activación de hosting (VPS o shared con soporte Laravel).
- [ ] DNS: subdominio `api.globalgold.gold` → A record a IP del servidor (TTL 300s).
- [ ] Deploy esqueleto Laravel:
  - `composer create-project laravel/laravel` (prod)
  - `php artisan key:generate`
  - Permisos `storage/` y `bootstrap/cache`
  - `.env` con DB, APP_URL, CORS para `https://globalgold.gold`
- [ ] Endpoints básicos:
  - `GET /api/health` → `{ ok: true, ts }`
  - `GET /api/v1/ping` → `{ pong: true }`
- [ ] Seguridad inicial:
  - CORS: allow-origin `https://globalgold.gold`, métodos GET/POST/OPTIONS
  - (Opcional) Header `X-Api-Key` para endpoints privados iniciales

## Entregables Fase 2 (Día 3–5)
- [ ] Supabase Auth o Laravel Sanctum (elige 1, ver notas):
  - Supabase: OAuth Google / email‑password → bridge a `gg:auth { src:'supabase', version:'v2' }`
  - Sanctum: SPA auth con cookies httpOnly + CSRF
- [ ] Eventos y progreso:
  - `POST /api/v1/metrics/lesson` → guardar `lesson_open|complete|nav_next|nav_prev`
  - `GET/POST /api/v1/progress` → leer/guardar progreso por usuario
  - Idempotencia por `event_id` y limitación simple (rate‑limit por IP/user)

## Notas de implementación
- CORS en `app/Http/Middleware` o `fruitcake/laravel-cors`.
- Sanitizar payloads y registrar auditoría mínima (user_id, ip, ua).
- Logging: Canal `daily` con retención 7–14 días.
- Healthcheck: expón versión (`APP_VERSION`), commit hash (si disponible), y estado DB.

## Checklist del DNS y despliegue
- [ ] Crear A record: `api` → <IP>
- [ ] Configurar vhost nginx/apache (docroot: `/var/www/laravel/public`)
- [ ] Habilitar HTTPS con Let’s Encrypt (redirect 80 → 443)
- [ ] Probar `https://api.globalgold.gold/api/health`

## Riesgos y mitigación
- Propagación DNS: usar TTL bajo y verificar con `dig`/`nslookup`.
- Seguridad previa a Auth real: proteger con X-Api-Key y rate limiting.
- Coste/tiempo del hosting: priorizar VPS económico (1–2 vCPU, 1–2 GB RAM).

## Decisiones pendientes
- Elegir entre Supabase Auth vs Sanctum (costo/velocidad vs control total).
- BD: Postgres (Supabase) o MySQL/MariaDB (hosting actual).

## Cómo conectar desde el frontend (placeholder)
- Health (read-only):
  fetch('https://api.globalgold.gold/api/health', { mode:'cors' })
    .then(r=>r.json()).then(console.log).catch(console.error)

- En producción usaremos `defer` y llamadas en listeners discretos (sin bloquear render), y enviaremos una copia de métricas a la API cuando esté lista.
