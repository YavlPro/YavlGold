#!/usr/bin/env bash
set -Eeuo pipefail

# Config por defecto (puedes sobreescribir con vars de entorno)
PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
INDEX_PATH="${INDEX_PATH:-/}"
RESET_PATH="${RESET_PATH:-/reset-password.html}"
EXPECT_RESET_RE="${EXPECT_RESET_RE:-Reset|Restablecer|Cambiar|Password}"
EXPECT_INDEX_RE="${EXPECT_INDEX_RE:-DOCTYPE|<html}"
WAIT_SECS="${WAIT_SECS:-30}"
KILL_ON_PORT="${KILL_ON_PORT:-0}"   # 1 para matar procesos en el puerto

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Colores
GREEN="$(printf '\033[32m')"
RED="$(printf '\033[31m')"
YELLOW="$(printf '\033[33m')"
BOLD="$(printf '\033[1m')"
RESET="$(printf '\033[0m')"

info()  { echo "${YELLOW}[*]${RESET} $*"; }
ok()    { echo "${GREEN}[✓]${RESET} $*"; }
fail()  { echo "${RED}[✗]${RESET} $*"; exit 1; }

has() { command -v "$1" >/dev/null 2>&1; }

# Detecta package manager
PM="npm"
if [[ -f pnpm-lock.yaml ]] && has pnpm; then PM="pnpm"
elif [[ -f yarn.lock ]] && has yarn; then PM="yarn"; fi
ok "Package manager detectado: $PM"

# Verifica vite disponible para preview fallback
if ! has vite && ! npx -y vite --version >/dev/null 2>&1; then
  fail "Vite no está disponible. Instala dev deps o ejecuta: npm i -D vite"
fi

# Comprobación de Vite MPA (best-effort)
if grep -Eq "appType:\s*['\"]mpa['\"]" vite.config.* 2>/dev/null; then
  ok "vite.config: appType 'mpa' detectado"
else
  info "No se encontró appType: 'mpa' en vite.config.* (continuo igualmente)"
fi

# Build (preferir script build:v9 si existe en package.json)
info "Construyendo proyecto…"
set +e
if [[ "$PM" == "pnpm" ]]; then
  if grep -q '"build:v9"' package.json; then
    pnpm run -s build:v9
  else
    pnpm run -s build || pnpm exec vite build
  fi
elif [[ "$PM" == "yarn" ]]; then
  if grep -q '"build:v9"' package.json; then
    yarn build:v9
  else
    yarn build || yarn vite build
  fi
else
  if grep -q '"build:v9"' package.json; then
    npm run build:v9
  else
    npm run build || npx -y vite build
  fi
fi
rc=$?
set -e
[[ $rc -eq 0 ]] || fail "Falló el build"

# Verifica que dist/reset-password.html exista
if [[ -f "dist/reset-password.html" ]]; then
  ok "dist/reset-password.html presente"
else
  info "No se encontró dist/reset-password.html. Si usas otra ruta, exporta RESET_PATH o ajusta rollupOptions.input."
fi

# Detecta firma de assets del entry reset-password para validar contenido estático
RESET_ASSET_RE=""
if [[ -f "dist/reset-password.html" ]]; then
  # JS principal
  if grep -oE 'assets/(resetPassword-[^"]+\.js)' dist/reset-password.html >/dev/null 2>&1; then
    RESET_ASSET_RE="$(grep -oE 'assets/(resetPassword-[^"]+\.js)' dist/reset-password.html | head -n1)"
  # CSS de la página
  elif grep -oE 'assets/(resetPassword-[^"]+\.css)' dist/reset-password.html >/dev/null 2>&1; then
    RESET_ASSET_RE="$(grep -oE 'assets/(resetPassword-[^"]+\.css)' dist/reset-password.html | head -n1)"
  fi
fi

if [[ -n "$RESET_ASSET_RE" ]]; then
  ok "Firma de reset detectada: $RESET_ASSET_RE"
  # Si EXPECT_RESET_RE sigue con el valor por defecto, usa la firma
  if [[ "${EXPECT_RESET_RE:-}" == "Reset|Restablecer|Cambiar|Password" || -z "${EXPECT_RESET_RE:-}" ]]; then
    EXPECT_RESET_RE="$RESET_ASSET_RE"
    info "Usando EXPECT_RESET_RE por firma de asset: $EXPECT_RESET_RE"
  fi
else
  info "No se detectó firma de asset en dist/reset-password.html; se mantiene EXPECT_RESET_RE='${EXPECT_RESET_RE}'"
fi

# Manejo del puerto
in_use() { (has lsof && lsof -iTCP -sTCP:LISTEN -P -n | grep -q ":$PORT ") || (has ss && ss -ltn | grep -q ":$PORT"); }
if in_use; then
  if [[ "$KILL_ON_PORT" == "1" ]]; then
    info "Puerto $PORT ocupado. Intentando liberar…"
    if has fuser; then fuser -k "${PORT}"/tcp || true
    elif has lsof; then lsof -ti tcp:"$PORT" | xargs -r kill -9 || true
    fi
    sleep 1
  else
    fail "El puerto $PORT está ocupado. Libéralo o ejecuta KILL_ON_PORT=1 ./scripts/verify-mpa.sh"
  fi
fi

# Arranca preview
PREVIEW_LOG="$(mktemp -t vite-preview.XXXXXX.log)"
PREVIEW_PID=""
start_preview() {
  info "Levantando preview en http://$HOST:$PORT …"
  set +e
  if [[ "$PM" == "pnpm" ]]; then
    pnpm exec vite preview --host "$HOST" --port "$PORT" --strictPort >"$PREVIEW_LOG" 2>&1 &
  elif [[ "$PM" == "yarn" ]]; then
    yarn vite preview --host "$HOST" --port "$PORT" --strictPort >"$PREVIEW_LOG" 2>&1 &
  else
    npx -y vite preview --host "$HOST" --port "$PORT" --strictPort >"$PREVIEW_LOG" 2>&1 &
  fi
  PREVIEW_PID=$!
  set -e
}
stop_preview() {
  [[ -n "${PREVIEW_PID:-}" ]] && kill "$PREVIEW_PID" >/dev/null 2>&1 || true
}
trap 'stop_preview' EXIT

start_preview

# Espera a que esté arriba
BASE_URL="http://$HOST:$PORT"
info "Esperando a que el servidor responda (${WAIT_SECS}s)…"
for i in $(seq 1 "$WAIT_SECS"); do
  code="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$INDEX_PATH" || true)"
  if [[ "$code" =~ ^2|3 ]]; then ok "Servidor arriba (HTTP $code)"; break; fi
  sleep 1
  [[ $i -eq $WAIT_SECS ]] && { echo "---- preview log ----"; tail -n +1 "$PREVIEW_LOG" || true; fail "Timeout esperando al server"; }
done

# Helpers de test
fetch() { curl -sS -i "$BASE_URL$1"; }
status() { echo "$1" | sed -n '1s/HTTP\/[0-9.]* \([0-9][0-9][0-9]\).*/\1/p'; }
body() { echo "$1" | sed -n '1,/^\r\?$/d;p'; }

test_url() {
  local path="$1" expect_code="$2" re="$3" mode="${4:-must}"
  info "Probando $path (esperando HTTP $expect_code; patrón /$re/)"
  local res="$(fetch "$path")"
  local sc="$(status "$res")"
  [[ -z "$sc" ]] && fail "No se pudo obtener status de $path"
  if [[ "$sc" != "$expect_code" ]]; then
    echo "$res" | sed -n '1,60p'
    fail "Esperaba $expect_code para $path pero obtuve $sc"
  fi
  # Permite pruebas solo de status (sin validar cuerpo)
  if [[ "$re" == "__STATUS_ONLY__" ]]; then
    ok "$path OK (HTTP $expect_code)"
    return 0
  fi
  local b="$(body "$res")"
  if [[ "$mode" == "must" ]]; then
    if ! echo "$b" | grep -Eiq "$re"; then
      echo "$b" | sed -n '1,120p'
      fail "El cuerpo de $path no coincide con /$re/"
    fi
  else
    if echo "$b" | grep -Eiq "$re"; then
      echo "$b" | sed -n '1,120p'
      fail "El cuerpo de $path no debería coincidir con /$re/"
    fi
  fi
  ok "$path OK (HTTP $expect_code; contenido esperado)"
}

# Tests
info "Ejecutando pruebas:"
test_url "$INDEX_PATH" 200 "__STATUS_ONLY__" "must"
test_url "$RESET_PATH" 200 "$EXPECT_RESET_RE" "must"

# Asegura que no hay fallback SPA: una ruta inexistente debe ser 404
NOT_FOUND_PATH="/__vite-mpa-should-404__.html"
res_nf="$(fetch "$NOT_FOUND_PATH")"
sc_nf="$(status "$res_nf")"
if [[ "$sc_nf" == "404" ]]; then
  ok "$NOT_FOUND_PATH correctamente 404 (sin fallback SPA)"
else
  echo "$res_nf" | sed -n '1,40p'
  fail "$NOT_FOUND_PATH no devolvió 404 (posible fallback SPA activo)"
fi

ok "${BOLD}Verificación completada con éxito.${RESET}"
echo
echo "Resumen:"
echo "- Build OK"
echo "- Preview OK en $BASE_URL"
echo "- ${RESET_PATH} sirve su propio HTML"
echo "- Rutas inexistentes devuelven 404 (MPA efectivo)"
