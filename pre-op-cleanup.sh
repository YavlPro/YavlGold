#!/usr/bin/env bash
# pre-op-cleanup.sh — Operación Saneamiento y Verificación v1.1
# Implementa Prioridades 1 y 2 del informe de auditoría Cline
# Uso: bash pre-op-cleanup.sh

set -euo pipefail

# Detectar si estamos en un repo Git (mejora de robustez)
HAS_GIT=0
if [ -d .git ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HAS_GIT=1
else
  echo "ℹ️ Aviso: no se detectó repo Git en el directorio actual. Se omitirán los pasos de commit."
fi

# ====
# 1. CREAR Y EJECUTAR pre-op-audit.sh
# ====
echo "🚀 INICIANDO OPERACIÓN DE SANAMIENTO Y VERIFICACIÓN"
echo "===="
echo ""
echo "📋 FASE 1: Creando auditor pre-operacional..."

mkdir -p scripts

cat > scripts/pre-op-audit.sh << 'EOF'
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
EOF

chmod +x scripts/pre-op-audit.sh
echo "✅ Auditor creado: scripts/pre-op-audit.sh"
echo ""
echo "📊 EJECUTANDO AUDITORÍA INICIAL..."
echo "----"
bash scripts/pre-op-audit.sh
echo ""

# ====
# 2. MOVER ARCHIVOS SENSIBLES A CUARENTENA
# ====
echo "🛡️ FASE 2: Cuarentena de archivos sensibles..."

mkdir -p .quarantine

# Buscar y mover archivos .local.js
SENSITIVE_FILES=$(find . -type f -name "*.local.js" 2>/dev/null || true)

if [ -n "$SENSITIVE_FILES" ]; then
  echo "Archivos sensibles detectados:"
  echo "$SENSITIVE_FILES"
  echo ""
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      # Crear subdirectorios en cuarentena si es necesario
      dirpath=$(dirname "$file")
      mkdir -p ".quarantine/$dirpath"
      # Mover con timestamp para evitar colisiones
      base=$(basename "$file")
      timestamp=$(date +%Y%m%d_%H%M%S)
      dest=".quarantine/${dirpath}/${base%.js}_${timestamp}.js"
      echo "Moviendo: $file → $dest"
      mv "$file" "$dest"
    fi
  done <<< "$SENSITIVE_FILES"
  echo "✅ Archivos sensibles movidos a .quarantine/"
else
  echo "✅ No se encontraron archivos *.local.js"
fi

echo ""

# ====
# 3. VERIFICAR Y ACTUALIZAR .gitignore
# ====
echo "📝 FASE 3: Verificando .gitignore..."

if [ ! -f .gitignore ]; then
  echo "# YavlGold .gitignore" > .gitignore
fi

# Añadir entradas si no existen (evitar duplicados)
for pattern in "*.local.js" ".quarantine/" ".env.development.local"; do
  if ! grep -q "^${pattern}$" .gitignore 2>/dev/null; then
    echo "$pattern" >> .gitignore
    echo "✅ Añadido: $pattern"
  else
    echo "✅ Ya presente: $pattern"
  fi
done

echo ""

# ====
# 4. VERIFICAR PRERREQUISITOS DEL ENTORNO
# ====
echo "🔧 FASE 4: Verificación de prerrequisitos..."
echo "----"

# Verificar Supabase CLI
echo "✓ Verificando Supabase CLI 2.48.3..."
if ! npx supabase@2.48.3 --version > /dev/null 2>&1; then
  echo "✗ CRÍTICO: Supabase CLI 2.48.3 no pudo ejecutarse"
  exit 1
fi
echo "  $(npx supabase@2.48.3 --version)"

echo ""
# Verificar Docker
echo "✓ Verificando Docker..."
if ! docker ps > /dev/null 2>&1; then
  echo "✗ CRÍTICO: Docker no está corriendo o no es accesible"
  exit 1
fi
echo "  Daemon activo - $(docker ps --format '{{.Running}}' | wc -l) contenedores"
echo ""

# Verificar Node y pnpm
echo "✓ Verificando Node.js..."
if ! command -v node > /dev/null; then
  echo "✗ CRÍTICO: Node.js no está instalado"
  exit 1
fi
echo "  $(node -v)"

echo "✓ Verificando pnpm..."
if ! command -v pnpm > /dev/null; then
  echo "✗ CRÍTICO: pnpm no está instalado"
  exit 1
fi
echo "  $(pnpm -v)"

echo "✅ Todos los prerrequisitos SATISFECHOS"
echo ""

# ====
# 5. CREAR ARCHIVOS DE CONFIGURACIÓN DX
# ====
echo "💻 FASE 5: Configurando entorno DX..."

mkdir -p .vscode

cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "[typescript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "[html]": {
    "editor.defaultFormatter": "vscode.html-language-features"
  },
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
EOF

echo "✅ Creado: .vscode/settings.json"
echo ""

# ====
# 6. HACER COMMIT DE LA LIMPIEZA (SOLO SI HAY GIT)
# ====
echo "📦 FASE 6: Preparando commit de saneamiento..."

if [ "$HAS_GIT" -eq 1 ]; then
  git add .gitignore .vscode/settings.json scripts/pre-op-audit.sh || true

  if ! git diff --cached --quiet; then
    git commit -m "chore(setup): execute pre-op cleanup and sanitation
- Cuarentena de archivos sensibles (*.local.js)
- Refuerzo de .gitignore con patrones locales
- Configuración DX (.vscode/settings.json)
- Auditor pre-operacional (scripts/pre-op-audit.sh)
- Validación de prerrequisitos completada" || true

    echo "✅ Commit creado: $(git rev-parse --short HEAD)"
    echo ""
    echo "🎉 OPERACIÓN DE SANAMIENTO COMPLETADA CON ÉXITO"
    echo "El campo de batalla está listo para la Operación Luz Dorada."
  else
    echo "ℹ️ No hay cambios para commitear (posiblemente ya estaba saneado)"
  fi
else
  echo "ℹ️ No se ejecutó commit de saneamiento porque no se detectó repo Git."
fi

echo ""
echo "===="
echo "🚀 PRÓXIMO PASO: Ejecutar scripts/pre-op-audit.sh para validación adicional si lo deseas"
echo "===="
