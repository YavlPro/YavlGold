#!/usr/bin/env bash
# scripts/emergency-git-preservation.sh
set -euo pipefail

echo "🚨 MODO PRESERVACIÓN DE EMERGENCIA ACTIVADO"

[ -d .git ] || { echo "✗ Ejecuta en la raíz del repo (donde está .git)"; exit 1; }

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BASE="$(git rev-parse --short HEAD 2>/dev/null || echo 'nohead')"
BACKUP_BRANCH="emergency_backup_${BASE}_${TIMESTAMP}"

git remote -v >/dev/null || { echo "✗ No hay remoto configurado"; exit 1; }

git checkout -b "$BACKUP_BRANCH"
git add -A
git commit -m "EMERGENCY BACKUP: Estado crudo pre-estabilización ${TIMESTAMP}" --no-verify || true

git tag -a "emergency/${TIMESTAMP}" -m "Snapshot ${TIMESTAMP}" || true

git push -u origin "$BACKUP_BRANCH" --no-verify || true
git push origin "emergency/${TIMESTAMP}" || true

git checkout main
git pull --rebase origin main || true
git checkout -b "architectural_stabilization_${TIMESTAMP}"

echo "✅ Backup en rama: ${BACKUP_BRANCH} (tag: emergency/${TIMESTAMP})"
echo "✅ Sandbox listo: architectural_stabilization_${TIMESTAMP}"
