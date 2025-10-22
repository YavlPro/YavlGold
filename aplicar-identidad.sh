#!/bin/bash

# ============================================
# SCRIPT: Aplicar Identidad Visual YavlGold
# ============================================
# Automatiza la aplicación de estilos oficiales
# a archivos HTML del ecosistema YavlGold
# ============================================

set -e  # Detener en caso de error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de ayuda
mostrar_ayuda() {
  echo -e "${BLUE}🎨 Script de Identidad Visual YavlGold${NC}"
  echo ""
  echo "Uso:"
  echo "  ./aplicar-identidad.sh <archivo.html>"
  echo "  ./aplicar-identidad.sh --batch <directorio>"
  echo ""
  echo "Opciones:"
  echo "  --batch DIR    Aplicar a todos los HTML en el directorio"
  echo "  --help         Mostrar esta ayuda"
  echo ""
  echo "Ejemplos:"
  echo "  ./aplicar-identidad.sh index.html"
  echo "  ./aplicar-identidad.sh --batch academia/"
  exit 0
}

# Función principal
aplicar_identidad() {
  local archivo=$1
  
  if [ ! -f "$archivo" ]; then
    echo -e "${RED}❌ Error: Archivo no encontrado: $archivo${NC}"
    return 1
  fi
  
  echo -e "${YELLOW}🎨 Aplicando identidad visual a: $archivo${NC}"
  
  # Crear backup
  cp "$archivo" "${archivo}.backup-$(date +%Y%m%d-%H%M%S)"
  echo -e "${GREEN}✓${NC} Backup creado"
  
  # Reemplazar colores champagne por oro oficial
  sed -i 's/#E8D59B/#C8A752/g' "$archivo"
  sed -i 's/#C8A752/#C8A752/g' "$archivo"
  sed -i 's/#C8A752/#C8A752/g' "$archivo"
  sed -i 's/#C8A752/#8B7842/g' "$archivo"
  sed -i 's/#C8A752/#8B7842/g' "$archivo"
  echo -e "${GREEN}✓${NC} Colores actualizados a oro oficial #C8A752"
  
  # Reemplazar variables CSS
  sed -i 's/var(--gold-primary)/var(--yavl-gold)/g' "$archivo"
  sed -i 's/var(--gold-secondary)/var(--yavl-gold-dark)/g' "$archivo"
  sed -i 's/var(--gold-300)/var(--yavl-gold)/g' "$archivo"
  sed -i 's/var(--gold-400)/var(--yavl-gold)/g' "$archivo"
  sed -i 's/var(--gold-500)/var(--yavl-gold)/g' "$archivo"
  sed -i 's/var(--gold-600)/var(--yavl-gold-dark)/g' "$archivo"
  sed -i 's/var(--gold-700)/var(--yavl-gold-dark)/g' "$archivo"
  sed -i 's/var(--gold-light)/var(--yavl-gold)/g' "$archivo"
  sed -i 's/var(--gold-dark)/var(--yavl-gold-dark)/g' "$archivo"
  echo -e "${GREEN}✓${NC} Variables CSS actualizadas"
  
  # Reemplazar fuentes
  sed -i "s/font-family: 'Inter'/font-family: 'Rajdhani'/g" "$archivo"
  sed -i "s/font-family: 'Playfair Display'/font-family: 'Orbitron'/g" "$archivo"
  sed -i 's/"Inter"/"Rajdhani"/g' "$archivo"
  sed -i 's/"Playfair Display"/"Orbitron"/g' "$archivo"
  echo -e "${GREEN}✓${NC} Fuentes actualizadas (Orbitron + Rajdhani)"
  
  # Reemplazar imports de fuentes en <link>
  sed -i 's|Playfair\+Display:wght@700;800\&family=Inter:wght@300;400;500;600;700|Orbitron:wght@400;700;900\&family=Rajdhani:wght@400;600|g' "$archivo"
  echo -e "${GREEN}✓${NC} Links de fuentes Google actualizados"
  
  echo -e "${GREEN}✅ Identidad aplicada exitosamente a: $archivo${NC}"
  echo ""
  echo -e "${YELLOW}⚠️  Verificación manual requerida:${NC}"
  echo "   1. Grid background en body"
  echo "   2. Variables CSS en :root"
  echo "   3. Títulos con glow effect"
  echo "   4. Compilación sin errores"
  echo ""
}

# Aplicar en batch
aplicar_batch() {
  local directorio=$1
  
  if [ ! -d "$directorio" ]; then
    echo -e "${RED}❌ Error: Directorio no encontrado: $directorio${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}🎨 Aplicando identidad a todos los HTML en: $directorio${NC}"
  echo ""
  
  local archivos=$(find "$directorio" -name "*.html" -type f)
  local total=$(echo "$archivos" | wc -l)
  local actual=0
  
  for archivo in $archivos; do
    actual=$((actual + 1))
    echo -e "${BLUE}[$actual/$total]${NC}"
    aplicar_identidad "$archivo"
  done
  
  echo -e "${GREEN}✅ Proceso completado: $total archivos procesados${NC}"
}

# Main
case "$1" in
  --help|-h)
    mostrar_ayuda
    ;;
  --batch)
    if [ -z "$2" ]; then
      echo -e "${RED}❌ Error: Debes especificar un directorio${NC}"
      mostrar_ayuda
    fi
    aplicar_batch "$2"
    ;;
  "")
    echo -e "${RED}❌ Error: Debes especificar un archivo${NC}"
    mostrar_ayuda
    ;;
  *)
    aplicar_identidad "$1"
    ;;
esac
