#!/bin/bash
set -e

# Nombre del directorio de archivo
ARCHIVE_DIR="_legacy_archive"

echo "=== Inicio de Limpieza Monorepo YavlGold ==="
echo "Directorio de archivo: $ARCHIVE_DIR"

# 1. Crear directorio de archivo si no existe
if [ ! -d "$ARCHIVE_DIR" ]; then
    mkdir -p "$ARCHIVE_DIR"
    echo "✔ Creado directorio $ARCHIVE_DIR"
else
    echo "ℹ El directorio $ARCHIVE_DIR ya existe"
fi

# 2. Ejecutar movimiento con exclusiones estrictas
echo "📦 Moviendo archivos legacy..."

find . -maxdepth 1 -mindepth 1 \
    -not -name "." \
    -not -name ".." \
    -not -name "$ARCHIVE_DIR" \
    -not -name "apps" \
    -not -name "packages" \
    -not -name "node_modules" \
    -not -name ".git" \
    -not -name "supabase" \
    -not -name "package.json" \
    -not -name "pnpm-lock.yaml" \
    -not -name "pnpm-workspace.yaml" \
    -not -name ".gitignore" \
    -not -name "vercel.json" \
    -not -name "README.md" \
    -not -name "LICENSE" \
    -not -name ".env*" \
    -not -name ".vscode" \
    -not -name ".roo" \
    -exec echo " -> Moviendo: {}" \; \
    -exec mv "{}" "$ARCHIVE_DIR/" \;

echo "🔄 Actualizando índice de Git..."
git add .

echo "=== ✅ Limpieza Completada ==="
echo "Todo lo viejo está seguro en: $ARCHIVE_DIR"
echo "Ejecuta 'git status' para verificar y luego haz el commit."
