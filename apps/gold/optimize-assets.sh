#!/bin/bash
# YavlGold - Asset Optimization Script
# Optimizes images, CSS, and JS for production

set -e

echo "⚡ YavlGold Asset Optimization"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check dependencies
echo "📦 Checking dependencies..."

MISSING_DEPS=0

if ! command -v convert &> /dev/null; then
    echo -e "${YELLOW}⚠️  ImageMagick not found (optional for WebP conversion)${NC}"
    echo "   Install: sudo apt-get install imagemagick"
    MISSING_DEPS=1
fi

if ! command -v terser &> /dev/null; then
    echo -e "${YELLOW}⚠️  Terser not found (for JS minification)${NC}"
    echo "   Install: npm install -g terser"
    MISSING_DEPS=1
fi

if ! command -v cleancss &> /dev/null; then
    echo -e "${YELLOW}⚠️  clean-css not found (for CSS minification)${NC}"
    echo "   Install: npm install -g clean-css-cli"
    MISSING_DEPS=1
fi

if [[ $MISSING_DEPS -eq 1 ]]; then
    echo ""
    read -p "Some optimizations will be skipped. Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# 1. Optimize Images
echo -e "${BLUE}🖼️  Optimizing images...${NC}"

if command -v convert &> /dev/null; then
    # Convert PNG to WebP
    if [ -f "assets/images/logo.png" ]; then
        echo "  Converting logo.png to WebP..."
        convert assets/images/logo.png -quality 85 assets/images/logo.webp
        echo -e "${GREEN}  ✅ Created logo.webp${NC}"
    fi
    
    # Optimize other images if any
    for img in assets/images/*.png; do
        if [ -f "$img" ] && [ "$img" != "assets/images/logo.png" ]; then
            filename=$(basename "$img" .png)
            echo "  Converting $filename.png to WebP..."
            convert "$img" -quality 85 "assets/images/$filename.webp"
        fi
    done
else
    echo -e "${YELLOW}  ⏭️  Skipping image optimization (ImageMagick not available)${NC}"
fi

echo ""

# 2. Minify CSS
echo -e "${BLUE}📝 Minifying CSS...${NC}"

if command -v cleancss &> /dev/null; then
    if [ -f "assets/css/unificacion.css" ]; then
        echo "  Minifying unificacion.css..."
        cleancss -o assets/css/unificacion.min.css assets/css/unificacion.css
        echo -e "${GREEN}  ✅ Created unificacion.min.css${NC}"
    fi
    
    if [ -f "assets/css/tokens.css" ]; then
        echo "  Minifying tokens.css..."
        cleancss -o assets/css/tokens.min.css assets/css/tokens.css
        echo -e "${GREEN}  ✅ Created tokens.min.css${NC}"
    fi
else
    echo -e "${YELLOW}  ⏭️  Skipping CSS minification (clean-css not available)${NC}"
fi

echo ""

# 3. Minify JavaScript
echo -e "${BLUE}⚙️  Minifying JavaScript...${NC}"

if command -v terser &> /dev/null; then
    # Minify auth files
    for js in assets/js/auth/*.js; do
        if [[ $js != *.min.js ]]; then
            filename=$(basename "$js" .js)
            echo "  Minifying $filename.js..."
            terser "$js" -o "assets/js/auth/$filename.min.js" -c -m
            echo -e "${GREEN}  ✅ Created $filename.min.js${NC}"
        fi
    done
    
    # Minify other JS files
    if [ -f "assets/js/script.js" ]; then
        echo "  Minifying script.js..."
        terser assets/js/script.js -o assets/js/script.min.js -c -m
        echo -e "${GREEN}  ✅ Created script.min.js${NC}"
    fi
    
    if [ -f "assets/js/main.js" ]; then
        echo "  Minifying main.js..."
        terser assets/js/main.js -o assets/js/main.min.js -c -m
        echo -e "${GREEN}  ✅ Created main.min.js${NC}"
    fi
else
    echo -e "${YELLOW}  ⏭️  Skipping JS minification (terser not available)${NC}"
fi

echo ""

# 4. Generate report
echo -e "${BLUE}📊 Generating optimization report...${NC}"

REPORT_FILE="optimization-report.txt"

cat > $REPORT_FILE << EOF
YavlGold Asset Optimization Report
Generated: $(date)
=====================================

Images:
EOF

if [ -f "assets/images/logo.png" ]; then
    PNG_SIZE=$(du -h assets/images/logo.png | cut -f1)
    echo "  logo.png: $PNG_SIZE" >> $REPORT_FILE
fi

if [ -f "assets/images/logo.webp" ]; then
    WEBP_SIZE=$(du -h assets/images/logo.webp | cut -f1)
    SAVINGS=$(echo "scale=1; ($(stat -f%z assets/images/logo.png 2>/dev/null || stat -c%s assets/images/logo.png) - $(stat -f%z assets/images/logo.webp 2>/dev/null || stat -c%s assets/images/logo.webp)) / $(stat -f%z assets/images/logo.png 2>/dev/null || stat -c%s assets/images/logo.png) * 100" | bc)
    echo "  logo.webp: $WEBP_SIZE (saved ~${SAVINGS}%)" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "CSS:" >> $REPORT_FILE

if [ -f "assets/css/unificacion.css" ]; then
    CSS_SIZE=$(du -h assets/css/unificacion.css | cut -f1)
    echo "  unificacion.css: $CSS_SIZE" >> $REPORT_FILE
fi

if [ -f "assets/css/unificacion.min.css" ]; then
    MIN_CSS_SIZE=$(du -h assets/css/unificacion.min.css | cut -f1)
    echo "  unificacion.min.css: $MIN_CSS_SIZE" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "JavaScript:" >> $REPORT_FILE

for js in assets/js/auth/*.min.js; do
    if [ -f "$js" ]; then
        SIZE=$(du -h "$js" | cut -f1)
        echo "  $(basename $js): $SIZE" >> $REPORT_FILE
    fi
done

cat $REPORT_FILE
echo ""
echo -e "${GREEN}✅ Optimization complete!${NC}"
echo ""
echo "📄 Full report saved to: $REPORT_FILE"
echo ""
echo "Next steps:"
echo "1. Update HTML files to use .min.css and .min.js files"
echo "2. Add WebP images with fallback to PNG"
echo "3. Test the optimized site"
echo "4. Deploy with: ./deploy.sh"
echo ""
