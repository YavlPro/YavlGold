#!/bin/bash

# ========================================
# YAVLGOLD - IMPLEMENTACIÓN AUTOMÁTICA
# Auth System v2.0
# ========================================

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🚀 IMPLEMENTACIÓN AUTOMÁTICA - AUTH SYSTEM v2.0      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ===== VERIFICAR BRANCH =====
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Branch actual: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "feature/auth-system-v2" ]; then
  echo "⚠  No estás en feature/auth-system-v2"
  read -p "¿Cambiar a feature/auth-system-v2? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout feature/auth-system-v2 2>/dev/null || git checkout -b feature/auth-system-v2
    echo "✅ Cambiado a feature/auth-system-v2"
  else
    echo "❌ Operación cancelada"
    exit 1
  fi
fi

echo ""
echo "🔧 Iniciando implementación..."
echo ""

# ===== FUNCIÓN: AGREGAR SCRIPTS AL HTML =====
add_auth_scripts() {
  local file=$1
  local indent="  "
  
  # Verificar si ya tiene los scripts
  if grep -q "auth/authClient.js" "$file"; then
    echo "⏭  $file ya tiene scripts de auth"
    return 0
  fi
  
  # Buscar </body> y agregar scripts antes
  if grep -q "</body>" "$file"; then
    # Crear scripts HTML
    local scripts="
${indent}<!-- ===== AUTH SYSTEM v2.0 ===== -->
${indent}<script src=\"/assets/js/auth/authClient.js\"></script>
${indent}<script src=\"/assets/js/auth/authGuard.js\"></script>
${indent}<script src=\"/assets/js/auth/authUI.js\"></script>

</body>"
    
    # Reemplazar </body> con scripts + </body>
    sed -i.bak "s|</body>|$scripts|" "$file"
    
    # Eliminar backup
    rm -f "${file}.bak"
    
    echo "✅ Scripts agregados a $file"
  else
    echo "⚠  No se encontró </body> en $file"
    return 1
  fi
}

# ===== FUNCIÓN: MARCAR ENLACES PROTEGIDOS =====
mark_protected_links() {
  local file=$1
  
  # Verificar si ya están marcados
  if grep -q 'data-protected="true"' "$file"; then
    echo "⏭  $file ya tiene enlaces protegidos marcados"
    return 0
  fi
  
  # Marcar /herramientas/
  if grep -q 'href="/herramientas/"' "$file"; then
    sed -i.bak 's|href="/herramientas/"|href="/herramientas/" data-protected="true"|g' "$file"
    echo "   🔒 Marcado: /herramientas/"
  fi
  
  # Marcar /dashboard/
  if grep -q 'href="/dashboard/"' "$file"; then
    sed -i.bak 's|href="/dashboard/"|href="/dashboard/" data-protected="true"|g' "$file"
    echo "   🔒 Marcado: /dashboard/"
  fi
  
  # Eliminar backups
  rm -f "${file}.bak"
  
  echo "✅ Enlaces protegidos marcados en $file"
}

# ===== PASO 1: ACTUALIZAR index.html =====
echo "📄 [1/3] Procesando index.html..."
if [ -f "index.html" ]; then
  add_auth_scripts "index.html"
  mark_protected_links "index.html"
  echo ""
else
  echo "❌ index.html no encontrado"
  exit 1
fi

# ===== PASO 2: ACTUALIZAR dashboard/index.html =====
echo "📄 [2/3] Procesando dashboard/index.html..."
if [ -f "dashboard/index.html" ]; then
  add_auth_scripts "dashboard/index.html"
  echo ""
else
  echo "⚠  dashboard/index.html no encontrado (creando directorio...)"
  mkdir -p dashboard
  echo "   ℹ  Deberás crear dashboard/index.html manualmente"
  echo ""
fi

# ===== PASO 3: ACTUALIZAR herramientas/index.html =====
echo "📄 [3/3] Procesando herramientas/index.html..."
if [ -f "herramientas/index.html" ]; then
  add_auth_scripts "herramientas/index.html"
  echo ""
else
  echo "⚠  herramientas/index.html no encontrado (creando directorio...)"
  mkdir -p herramientas
  echo "   ℹ  Deberás crear herramientas/index.html manualmente"
  echo ""
fi

# ===== VERIFICAR ARCHIVOS JS =====
echo "🔍 Verificando archivos JavaScript..."
echo ""

MISSING_FILES=()

if [ ! -f "assets/js/auth/authClient.js" ]; then
  MISSING_FILES+=("authClient.js")
fi

if [ ! -f "assets/js/auth/authGuard.js" ]; then
  MISSING_FILES+=("authGuard.js")
fi

if [ ! -f "assets/js/auth/authUI.js" ]; then
  MISSING_FILES+=("authUI.js")
fi

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
  echo "❌ Archivos JS faltantes:"
  for file in "${MISSING_FILES[@]}"; do
    echo "   - assets/js/auth/$file"
  done
  echo ""
  echo "⚠  Debes crear estos archivos antes de continuar"
  exit 1
else
  echo "✅ Todos los archivos JS existen"
  echo ""
fi

# ===== GIT STATUS =====
echo "📊 Cambios realizados:"
echo ""
git status --short

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ IMPLEMENTACIÓN COMPLETADA                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ===== OPCIONES DE COMMIT =====
read -p "¿Deseas hacer commit de estos cambios? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "💾 Preparando commit..."
  
  # Agregar archivos
  git add index.html
  [ -f "dashboard/index.html" ] && git add dashboard/index.html
  [ -f "herramientas/index.html" ] && git add herramientas/index.html
  git add assets/js/auth/*.js
  
  # Commit
  git commit -m "feat(auth): integrate Auth System v2 - load scripts and mark protected links

- Add authClient.js, authGuard.js, authUI.js to all HTML pages
- Mark /herramientas/ and /dashboard/ links as protected
- Enable automatic login modal on protected link click
- Mobile-first responsive modals and navigation"
  
  echo "✅ Commit realizado"
  echo ""
  
  # Push
  read -p "¿Deseas hacer push a origin/feature/auth-system-v2? (y/n): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Pushing..."
    git push origin feature/auth-system-v2
    echo "✅ Push completado"
    echo ""
  fi
fi

# ===== SIGUIENTES PASOS =====
echo "📋 SIGUIENTES PASOS:"
echo ""
echo "1. Verificar que no haya errores en consola:"
echo "   Abrir DevTools (F12) en el navegador"
echo ""
echo "2. Probar funcionalidad:"
echo "   • Click en 'Herramientas' → debe aparecer modal de login"
echo "   • Login con: test@test.com / password123"
echo "   • Verificar redirección automática"
echo ""
echo "3. Si todo funciona, hacer merge a main:"
echo "   git checkout main"
echo "   git merge feature/auth-system-v2 --no-ff"
echo "   git push origin main"
echo ""
echo "🎉 ¡Listo!"
