#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      🔍 DIAGNÓSTICO COMPLETO DE BOTONES - YAVLGOLD          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Verificar que los archivos existen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Test 1: Verificar archivos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "index.html" ]; then
    echo -e "${GREEN}✅ index.html existe${NC}"
else
    echo -e "${RED}❌ index.html NO existe${NC}"
fi

if [ -f "index-premium.html" ]; then
    echo -e "${GREEN}✅ index-premium.html existe${NC}"
else
    echo -e "${RED}❌ index-premium.html NO existe${NC}"
fi

echo ""

# Test 2: Verificar que el fix está en el código
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔬 Test 2: Verificar función fixButtonFunctionality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "fixButtonFunctionality" index.html; then
    echo -e "${GREEN}✅ Fix encontrado en index.html${NC}"
    echo -e "${BLUE}   Líneas donde aparece:${NC}"
    grep -n "fixButtonFunctionality" index.html | head -3
else
    echo -e "${RED}❌ Fix NO encontrado en index.html${NC}"
fi

echo ""

if grep -q "fixButtonFunctionality" index-premium.html; then
    echo -e "${GREEN}✅ Fix encontrado en index-premium.html${NC}"
else
    echo -e "${RED}❌ Fix NO encontrado en index-premium.html${NC}"
fi

echo ""

# Test 3: Verificar botones en el HTML
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Test 3: Verificar estructura de botones"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BTN_COUNT=$(grep -c 'class="btn btn-' index.html)
echo -e "${BLUE}📊 Botones encontrados: ${BTN_COUNT}${NC}"

if grep -q 'btn btn-outline' index.html; then
    echo -e "${GREEN}✅ Botón 'btn-outline' encontrado${NC}"
    echo -e "${BLUE}   Contexto:${NC}"
    grep -A1 'btn btn-outline' index.html | head -2
else
    echo -e "${RED}❌ Botón 'btn-outline' NO encontrado${NC}"
fi

echo ""

if grep -q 'btn btn-primary' index.html; then
    echo -e "${GREEN}✅ Botón 'btn-primary' encontrado${NC}"
    echo -e "${BLUE}   Contexto:${NC}"
    grep -A1 'btn btn-primary' index.html | head -2
else
    echo -e "${RED}❌ Botón 'btn-primary' NO encontrado${NC}"
fi

echo ""

# Test 4: Verificar CSS pointer-events
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 Test 4: Verificar CSS pointer-events"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

POINTER_COUNT=$(grep -c 'pointer-events.*auto' index.html)
echo -e "${BLUE}📊 Referencias a pointer-events: auto encontradas: ${POINTER_COUNT}${NC}"

if [ "$POINTER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ CSS pointer-events configurado${NC}"
    echo -e "${BLUE}   Primeras referencias:${NC}"
    grep -n 'pointer-events.*auto' index.html | head -5
else
    echo -e "${RED}❌ CSS pointer-events NO configurado${NC}"
fi

echo ""

# Test 5: Verificar z-index
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔢 Test 5: Verificar z-index en botones"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q 'z-index.*100' index.html; then
    echo -e "${GREEN}✅ z-index: 100 encontrado en el fix${NC}"
else
    echo -e "${YELLOW}⚠️  z-index: 100 no encontrado (puede estar en otra forma)${NC}"
fi

echo ""

# Test 6: Comparar archivos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Test 6: Comparar index.html con index-premium.html"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if diff -q index.html index-premium.html > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Los archivos son idénticos${NC}"
else
    echo -e "${YELLOW}⚠️  Los archivos son diferentes${NC}"
    echo -e "${BLUE}   Diferencias:${NC}"
    diff index.html index-premium.html | head -20
    echo ""
    echo -e "${YELLOW}💡 Ejecuta: cp index-premium.html index.html${NC}"
fi

echo ""

# Test 7: Verificar último commit
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 7: Último commit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git log -1 --oneline

echo ""

# Test 8: Verificar estado de Git
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Test 8: Estado de Git"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Hay cambios sin commitear:${NC}"
    git status --short
    echo ""
    echo -e "${YELLOW}💡 Ejecuta:${NC}"
    echo "   git add ."
    echo "   git commit -m 'fix: actualizar archivos'"
    echo "   git push origin main"
else
    echo -e "${GREEN}✅ No hay cambios pendientes${NC}"
fi

echo ""

# Test 9: Tamaño de archivos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📏 Test 9: Tamaño de archivos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "index.html" ]; then
    SIZE=$(wc -c < index.html)
    echo -e "${BLUE}index.html: ${SIZE} bytes ($(echo "scale=2; $SIZE/1024" | bc) KB)${NC}"
fi

if [ -f "index-premium.html" ]; then
    SIZE=$(wc -c < index-premium.html)
    echo -e "${BLUE}index-premium.html: ${SIZE} bytes ($(echo "scale=2; $SIZE/1024" | bc) KB)${NC}"
fi

echo ""

# Resumen final
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    📊 RESUMEN FINAL                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Contar tests exitosos
SUCCESS=0
TOTAL=9

[ -f "index.html" ] && ((SUCCESS++))
grep -q "fixButtonFunctionality" index.html && ((SUCCESS++))
grep -q 'btn btn-outline' index.html && ((SUCCESS++))
grep -q 'pointer-events.*auto' index.html && ((SUCCESS++))
diff -q index.html index-premium.html > /dev/null 2>&1 && ((SUCCESS++))

if [ $SUCCESS -eq $TOTAL ]; then
    echo -e "${GREEN}🎉 TODOS LOS TESTS LOCALES PASARON (${SUCCESS}/${TOTAL})${NC}"
    echo ""
    echo -e "${GREEN}✅ Los archivos están correctos${NC}"
    echo -e "${BLUE}💡 Si los botones siguen sin funcionar:${NC}"
    echo "   1. Limpia caché del navegador (Ctrl+Shift+R)"
    echo "   2. Espera 2-3 minutos para que GitHub Pages actualice"
    echo "   3. Abre: https://yavlpro.github.io/gold/"
    echo "   4. Presiona F12 y ve a Console"
    echo "   5. Busca: '✅ Fix de botones aplicado'"
else
    echo -e "${YELLOW}⚠️  ALGUNOS TESTS FALLARON (${SUCCESS}/${TOTAL})${NC}"
    echo ""
    echo -e "${YELLOW}Revisa los mensajes de error arriba${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 URLs para probar:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "• Sitio: https://yavlpro.github.io/gold/"
echo "• Test 1: https://yavlpro.github.io/gold/test-botones.html"
echo "• Test 2: https://yavlpro.github.io/gold/diagnostico-directo.html"
echo ""
