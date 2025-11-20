#!/usr/bin/env bash
# scripts/rescate-v9.sh – Orquesta Supabase + Vite + prueba de recover (con verificación Docker)

# Modo estricto pero con chequeo explícito de Docker antes de continuar
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SB_DIR="${ROOT_DIR}/supabase"
APP_DIR="${ROOT_DIR}/apps/gold"
PUB_DIR="${APP_DIR}/public"
ENV_JS="${PUB_DIR}/env.local.js"
APP_PORT="${APP_PORT:-3000}"
SB_PORT="${SB_PORT:-54321}"

abort() {
  echo "ERROR: $*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || abort "Falta dependencia: $1"
}

require_docker_running() {
  if ! docker info >/dev/null 2>&1; then
    echo "⚠️ Docker no accesible en /var/run/docker.sock"
    echo "   1. Asegúrate de que Docker Desktop esté iniciado en Windows."
    echo "   2. Activa WSL integration para tu distro (Settings > Resources > WSL)."
    echo "   3. Verifica desde WSL: 'docker version' sin errores."
    echo "   4. Si usas dockerd dentro WSL: sudo service docker start"
    abort "Docker daemon no disponible."
  fi
}

wait_on_port() {
  local host="$1" port="$2" retries="${3:-60}"
  for i in $(seq 1 "$retries"); do
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

detect_auth_container() {
  local name
  name="$(docker ps --filter "label=com.myproject.role=auth" --format '{{.Names}}' | head -n1 || true)"
  [[ -n "$name" ]] && { echo "$name"; return; }
  docker ps --format '{{.Names}}' | grep -E 'supabase_auth|supabase-auth' | head -n1 || true
}

detect_mailpit_hostport() {
  local line
  line="$(docker ps --filter "label=com.myproject.role=mail" --format '{{.Names}} {{.Ports}}' | head -n1 || true)"
  if [[ -z "$line" ]]; then
    line="$(docker ps --format '{{.Names}} {{.Ports}}' | grep -Ei 'mailpit|inbucket' | head -n1 || true)"
  fi
  if [[ -z "$line" ]]; then
    echo ""
    return 0
  fi
  sed -nE 's/.*(0\.0\.0\.0:|:::)?([0-9]+)->8025\/tcp.*/\2/p' <<< "$line" | head -n1
}

extract_anon_from_config() {
  local cfg="${SB_DIR}/config.toml"
  local val=""
  if [[ -f "$cfg" ]]; then
    val=$(awk -F'=' '
      $1 ~ /anon_key/ {
        v=$2
        gsub(/^[[:space:]]+|[[:space:]]+$/,"",v)
        gsub(/^"|"$/,"",v)
        print v
        exit
      }
    ' "$cfg" || true)
  fi
  if [[ -n "$val" ]]; then
    echo "$val"
    return 0
  fi
  # Fallback: leer Publishable key desde supabase status
  local pub
  pub=$( (cd "$SB_DIR" && npx -y supabase@2.48.3 status --workdir . 2>/dev/null) | sed -nE 's/^ *Publishable key: *(sb_publishable_[A-Za-z0-9_\-\.]+).*$/\1/p' | head -n1 )
  if [[ -n "$pub" ]]; then
    echo "$pub"
    return 0
  fi
  return 1
}

verify_override_present() {
  local overrideA="${SB_DIR}/docker-compose.override.yml"
  local overrideB="${SB_DIR}/docker/docker-compose.override.yml"
  if [[ -f "$overrideA" || -f "$overrideB" ]]; then
    echo "✓ Detectado docker-compose.override.yml"
  else
    echo "⚠️ ADVERTENCIA: no se encontró docker-compose.override.yml en supabase/ ni supabase/docker/"
  fi
}

ensure_env_js() {
  mkdir -p "$PUB_DIR"
  if [[ -f "$ENV_JS" ]]; then
    echo "✓ ${ENV_JS} ya existe"
    return 0
  fi

  local anon
  if ! anon="$(extract_anon_from_config)" || [[ -z "$anon" ]]; then
    abort "No se pudo obtener Publishable (anon) key ni desde config.toml ni desde 'supabase status'"
  fi

  cat > "$ENV_JS" <<EOF
// Generado por scripts/rescate-v9.sh (solo claves públicas)
window.__ENV = {
  supabaseUrl: 'http://127.0.0.1:${SB_PORT}',
  anonKey: '${anon}'
};
EOF

  echo "✓ Generado ${ENV_JS}"
}

# ---------- Prechequeos ----------
need docker
need node
need npx
need awk
need sed
need nc || abort "Instala 'nc' (netcat)."

require_docker_running

[[ -d "$SB_DIR" ]] || abort "No se encuentra ${SB_DIR}"
[[ -d "$APP_DIR" ]] || abort "No se encuentra ${APP_DIR}"

echo "==> Paso 0/7: Verificando docker-compose.override.yml"
verify_override_present

echo "==> Paso 1/7: Arrancando Supabase CLI 2.48.3 via npx (workdir ./supabase)"
pushd "$SB_DIR" >/dev/null
if ! npx -y supabase@2.48.3 stop --workdir . 2>/dev/null; then
  echo "(info) No había stack previo o Docker reiniciado"
fi
npx -y supabase@2.48.3 start --workdir . --debug
popd >/dev/null

echo "==> Paso 2/7: Esperando puerto ${SB_PORT} (Supabase API)"
wait_on_port 127.0.0.1 "$SB_PORT" 90 || abort "Supabase no abrió en ${SB_PORT}"

echo "==> Paso 3/7: Verificando GoTrue env + reachability SMTP"
AUTH="$(detect_auth_container)"
if [[ -n "$AUTH" ]]; then
  docker exec -it "$AUTH" sh -lc 'env | sort | grep -E "^GOTRUE_(SMTP|EXTERNAL_EMAIL|MAILER|SITE_URL)"' || true
  docker exec -it "$AUTH" sh -lc 'HOST=mailpit; nc -vz $HOST 1025 || (echo "nc no disponible o puerto cerrado"; true)' || true
else
  echo "⚠️ No se detectó contenedor de auth (etiqueta o nombre)."
fi

echo "==> Paso 4/7: Detectando puerto UI de Mailpit (8025 mapeado)"
MAILPIT_UI="$(detect_mailpit_hostport)"

if [[ -n "$MAILPIT_UI" ]]; then
  echo "✓ Mailpit UI: http://127.0.0.1:${MAILPIT_UI}"
else
  echo "⚠️ No se detectó Mailpit UI automáticamente. Ejecuta: docker ps | grep -Ei 'mailpit|inbucket'"
fi

echo "==> Paso 5/7: Generando apps/gold/public/env.local.js (claves públicas)"
ensure_env_js

echo "==> Paso 6/7: Iniciando Vite apps/gold en 127.0.0.1:${APP_PORT}"
pushd "$APP_DIR" >/dev/null
VITE_LOG="${APP_DIR}/vite.log"
echo "   (logs en ${VITE_LOG})"
if command -v pnpm >/dev/null 2>&1; then
  (pnpm vite --config "${APP_DIR}/vite.config.js" > "${VITE_LOG}" 2>&1 &)
else
  (npx -y vite --config "${APP_DIR}/vite.config.js" > "${VITE_LOG}" 2>&1 &)
fi
popd >/dev/null

wait_on_port 127.0.0.1 "$APP_PORT" 60 || abort "Vite no abrió en ${APP_PORT}"
echo "✓ App lista: http://127.0.0.1:${APP_PORT}"

echo "==> Paso 7/7: Disparo de prueba /auth/v1/recover (test@yavlgold.local)"
ANON="$(extract_anon_from_config)"

curl -sS -i -X POST "http://127.0.0.1:${SB_PORT}/auth/v1/recover" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Content-Type: application/json" \
  --data '{"email":"test@yavlgold.local","redirect_to":"http://127.0.0.1:'"${APP_PORT}"'/reset-password.html"}' \
  | sed -n '1,20p'

echo
echo "============================================================"
echo "Listo:"
echo "- App: http://127.0.0.1:${APP_PORT}"
[[ -n "$MAILPIT_UI" ]] && echo "- Mailpit: http://127.0.0.1:${MAILPIT_UI}"
echo "============================================================"