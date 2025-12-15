#!/usr/bin/env bash
# scripts/pre-op-audit.sh — PASO 0 v9.0 (Kimik2)
set -euo pipefail

echo "🔍 PASO 0 — AUDITORÍA PREVIA A OPERACIÓN LUZ DORADA"
echo "===="
echo "Estado de Git:"
git status --porcelain || echo "✗ No hay repo git inicializado"
echo ""
echo "Rama actual: $(git branch --show-current 2>/dev/null || echo 'N/A')"
echo "Remoto: $(git remote -v 2>/dev/null | head -n1 || echo 'N/A')"
echo ""
echo "Detección de archivos sensibles:"
[ -d .quarantine ] && echo "⚠️ Directorio .quarantine detectado" || echo "✅ Sin cuarentena previa"
[ -f apps/gold/public/env.local.js ] && echo "⚠️ apps/gold/public/env.local.js presente" || echo "✅ Limpio"
[ -f assets/apps/gold/config.local.js ] && echo "⚠️ assets/apps/gold/config.local.js presente" || echo "✅ Limpio"
[ -f assets/js/supabase-config.local.js ] && echo "⚠️ assets/js/supabase-config.local.js presente" || echo "✅ Limpio"
echo ""
echo "Verificación de Docker:"
docker ps --format '{{.Names}}' 2>/dev/null || echo "✗ Docker no accesible"
echo ""
echo "🔍 AUDITORÍA COMPLETA"
