#!/usr/bin/env bash
# scripts/rescate-v9-stop.sh – Detiene Supabase y Vite

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SB_DIR="${ROOT_DIR}/supabase"

echo "==> Deteniendo Supabase (npx supabase@2.48.3)"
pushd "$SB_DIR" >/dev/null
npx -y supabase@2.48.3 stop --workdir . || true
popd >/dev/null

echo "==> Matando Vite (puerto 3000) si está activo"
if command -v lsof >/dev/null 2>&1; then
  PID="$(lsof -t -i:3000 || true)"
  if [[ -n "$PID" ]]; then
    echo "   Matando PID $PID (lsof)"
    kill "$PID" || true
  else
    echo "   No hay proceso en 5173 (lsof)"
  fi
elif command -v fuser >/dev/null 2>&1; then
  PID="$(fuser -n tcp 3000 2>/dev/null || true)"
  if [[ -n "$PID" ]]; then
    echo "   Matando PID(s) $PID (fuser)"
    kill $PID || true
  else
    echo "   No hay proceso en 5173 (fuser)"
  fi
else
  echo "⚠️ Ni 'lsof' ni 'fuser' disponibles. Detén manualmente el proceso en 5173 si persiste."
fi

echo "✓ Stack detenido"