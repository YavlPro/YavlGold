# 🛑 Cierre de Sesión — 2025-11-14 (pausa solicitada)

- Estado app: Vite en `127.0.0.1:3000` sirviendo título esperado.
- Estado Supabase: stack no iniciado (sin contenedores activos; Mailpit no accesible).
- Docker: accesible (`docker info` OK).
- Cambios aplicados hoy:
  - `supabase/docker-compose.override.yml`: añadido `GOTRUE_MAILER_EXTERNAL_HOSTS="127.0.0.1,localhost"` para suprimir advertencia del mailer.
  - `apps/gold/vite.config.js`: puerto unificado a `3000` y MPA con `reset-password.html`.
  - Scripts `rescate-v9.sh`/`rescate-v9-stop.sh`: checks de Docker, generación de `apps/gold/public/env.local.js`, arranque Vite y disparo de `/auth/v1/recover`.

## Reanudación sugerida (mañana)

```bash
cd /mnt/c/Users/yerik/gold/YavlGold
./scripts/rescate-v9-stop.sh
./scripts/rescate-v9.sh

# Verificaciones
echo "=== Verificación Vite ===" && curl -s http://127.0.0.1:3000/ | grep -o '<title>[^<]*</title>'
echo "=== Verificación Mailpit ===" && curl -s http://127.0.0.1:54324/api/v1/messages | jq -r '.messages[0].Subject'
echo "=== Verificación Puerto ===" && ss -ltnp | grep ':3000' || lsof -i :3000
```

> Nota: si `supabase start` no levanta contenedores, ejecutar manualmente y capturar logs:

```bash
cd supabase
npx -y supabase@2.48.3 stop --workdir . || true
npx -y supabase@2.48.3 start --workdir . --debug | tee ../tmp/supabase-start.log
```

Sesión pausada por solicitud del usuario. Sin más ejecuciones automáticas.
