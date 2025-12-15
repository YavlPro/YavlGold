#!/usr/bin/env bash
# scripts/initial-sanitize.sh (opcional pero recomendado)
set -euo pipefail

# Mover duplicado a cuarentena, si existe
mkdir -p .quarantine
if [ -d YavlGold ]; then
  mv YavlGold .quarantine/YavlGold-duplicate 2>/dev/null || true
  echo "✅ Directorio duplicado YavlGold/ movido a .quarantine/YavlGold-duplicate"
else
  echo "ℹ️ No se encontró directorio duplicado YavlGold/ en la raíz"
fi

# Refuerzo .gitignore (sin duplicados)
if [ ! -f .gitignore ]; then
  echo "# YavlGold .gitignore" > .gitignore
fi

for pattern in \
  "apps/gold/public/env.local.js" \
  "assets/apps/gold/config.local.js" \
  "assets/js/supabase-config.local.js" \
  ".quarantine/" \
  ".env.development.local"
do
  if ! grep -q "^${pattern}$" .gitignore 2>/dev/null; then
    echo "$pattern" >> .gitignore
    echo "✅ Añadido a .gitignore: $pattern"
  else
    echo "ℹ️ Patrón ya presente en .gitignore: $pattern"
  fi
done

# Quitar del tracking (si estaban versionados)
git rm --cached -f apps/gold/public/env.local.js 2>/dev/null || true
git rm --cached -f assets/apps/gold/config.local.js 2>/dev/null || true
git rm --cached -f assets/js/supabase-config.local.js 2>/dev/null || true

git add .gitignore 2>/dev/null || true
git commit -m "chore(gitignore): ignore local env/config and quarantine dir" 2>/dev/null || true

echo "✅ Saneamiento inicial completado"
