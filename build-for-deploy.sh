#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
# YAVL MONOREPO - BUILD SCRIPT PARA GITHUB PAGES
# ═══════════════════════════════════════════════════════════════════════
# Copia archivos de packages compartidos a apps para deployment estático
# Uso: ./build-for-deploy.sh
# ═══════════════════════════════════════════════════════════════════════

set -e

echo "🚀 YavlGold Monorepo - Build para GitHub Pages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════
# 1. YAVLGOLD (apps/gold)
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}📦 [1/4] YavlGold (apps/gold)${NC}"

# Crear directorios
mkdir -p apps/gold/assets/packages/themes
mkdir -p apps/gold/assets/packages/ui
mkdir -p apps/gold/assets/packages/auth

# Copiar themes
echo "  ├─ Copiando @yavl/themes..."
cp packages/themes/themes/yavl-themes.css apps/gold/assets/packages/themes/
cp packages/themes/src/theme-manager.js apps/gold/assets/packages/themes/
cp packages/themes/src/index.js apps/gold/assets/packages/themes/ 2>/dev/null || true

# Copiar UI
echo "  ├─ Copiando @yavl/ui..."
cp packages/ui/src/base.css apps/gold/assets/packages/ui/
cp packages/ui/src/ThemeSwitcher.js apps/gold/assets/packages/ui/
cp packages/ui/src/index.js apps/gold/assets/packages/ui/ 2>/dev/null || true

# Copiar Auth (opcional - si se necesita en el futuro)
echo "  ├─ Copiando @yavl/auth..."
cp packages/auth/src/authClient.js apps/gold/assets/packages/auth/ 2>/dev/null || true
cp packages/auth/src/authGuard.js apps/gold/assets/packages/auth/ 2>/dev/null || true
cp packages/auth/src/authUI.js apps/gold/assets/packages/auth/ 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} YavlGold build completado"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 2. YAVLSOCIAL (apps/social)
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}📦 [2/4] YavlSocial (apps/social)${NC}"

mkdir -p apps/social/assets/packages/themes

# Solo necesita themes para ahora
echo "  ├─ Copiando @yavl/themes..."
cp packages/themes/themes/yavl-themes.css apps/social/assets/packages/themes/ 2>/dev/null || true
cp packages/themes/src/theme-manager.js apps/social/assets/packages/themes/ 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} YavlSocial build completado"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 3. YAVLSUITE (apps/suite)
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}📦 [3/4] YavlSuite (apps/suite)${NC}"

mkdir -p apps/suite/assets/packages/themes

# Solo necesita themes
echo "  ├─ Copiando @yavl/themes..."
cp packages/themes/themes/yavl-themes.css apps/suite/assets/packages/themes/ 2>/dev/null || true
cp packages/themes/src/theme-manager.js apps/suite/assets/packages/themes/ 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} YavlSuite build completado"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 4. YAVLAGRO (apps/agro)
# ═══════════════════════════════════════════════════════════════════════

echo -e "${BLUE}📦 [4/4] YavlAgro (apps/agro)${NC}"

mkdir -p apps/agro/assets/packages/themes

# Solo necesita themes
echo "  ├─ Copiando @yavl/themes..."
cp packages/themes/themes/yavl-themes.css apps/agro/assets/packages/themes/ 2>/dev/null || true
cp packages/themes/src/theme-manager.js apps/agro/assets/packages/themes/ 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} YavlAgro build completado"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# RESUMEN
# ═══════════════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Build para GitHub Pages completado${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Archivos copiados a:"
echo "  • apps/gold/assets/packages/"
echo "  • apps/social/assets/packages/"
echo "  • apps/suite/assets/packages/"
echo "  • apps/agro/assets/packages/"
echo ""
echo "🚀 Próximos pasos:"
echo "  1. git add apps/"
echo "  2. git commit -m \"build: Update packages for deployment\""
echo "  3. git push origin main"
echo ""
echo "⏰ GitHub Pages rebuildeará en ~1-2 minutos"
echo ""
