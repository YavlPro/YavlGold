#!/bin/bash

# OBJETIVO 1: Eliminación de carpetas legacy
echo "Eliminando carpetas legacy..."
rm -rf .archive
rm -rf .quarantine
rm -rf tests
rm -rf backups  # si existe
rm -rf tmp      # si existe en raíz

# OBJETIVO 2: Limpieza de la raíz (archivos sueltos)
echo "Eliminando HTMLs muertos..."
rm -f contacto.html cookies.html faq.html privacidad.html recuperar-password.html soporte.html terminos.html

echo "Eliminando scripts viejos..."
rm -f deploy.sh aplicar-identidad.sh

echo "Eliminando documentación obsoleta en raíz..."
# Patrones de archivos a eliminar
find . -maxdepth 1 -type f \( \
  -name "ACTUALIZACION*.md" -o \
  -name "ADMIN-ACCOUNT*.md" -o \
  -name "AJUSTES*.md" -o \
  -name "ANALISIS*.md" -o \
  -name "AUDITORIA*.md" -o \
  -name "BORROSIDAD*.md" -o \
  -name "CHANGELOG*.md" -o \
  -name "CHECKLIST*.md" -o \
  -name "COLOR*.md" -o \
  -name "COMPARATIVA*.md" -o \
  -name "CONFIGURACION*.md" -o \
  -name "CONTEXT*.md" -o \
  -name "CORRECCION*.md" -o \
  -name "DASHBOARD*.md" -o \
  -name "DEPLOY*.md" -o \
  -name "DISEÑO*.md" -o \
  -name "ECOSISTEMA*.md" -o \
  -name "FASE*.md" -o \
  -name "FEATURE*.md" -o \
  -name "FIX*.md" -o \
  -name "GUIA*.md" -o \
  -name "HEALTH*.md" -o \
  -name "IDENTIDAD*.md" -o \
  -name "IMPLEMENTACION*.md" -o \
  -name "INCIDENTE*.md" -o \
  -name "INDICE*.md" -o \
  -name "INFORME*.md" -o \
  -name "INICIO*.md" -o \
  -name "INTEGRATION*.md" -o \
  -name "MEJORAS*.md" -o \
  -name "MOBILE*.md" -o \
  -name "MOCKUP*.md" -o \
  -name "OPTIMIZACIONES*.md" -o \
  -name "PERFORMANCE*.md" -o \
  -name "PLAN*.md" -o \
  -name "PROFILES*.md" -o \
  -name "PROJECT*.md" -o \
  -name "PROTECCION*.md" -o \
  -name "PROXIMOS*.md" -o \
  -name "QA*.md" -o \
  -name "README-*.md" -o \
  -name "RESUMEN*.md" -o \
  -name "RLS*.md" -o \
  -name "ROADMAP*.md" -o \
  -name "ROUTING*.md" -o \
  -name "SECURITY*.md" -o \
  -name "SESSION*.md" -o \
  -name "SOLUCION*.md" -o \
  -name "SUPABASE*.md" -o \
  -name "TEMA*.md" -o \
  -name "TEST*.md" -o \
  -name "TOKENS*.md" -o \
  -name "TROUBLESHOOTING*.md" -o \
  -name "UI-FIXES*.md" -o \
  -name "VERIFICACION*.md" \
\) -delete

# Conservar archivos específicos
if [ -f "CHANGELOG.md" ]; then
  mv CHANGELOG.md CHANGELOG.tmp
  rm -f CHANGELOG-*.md
  mv CHANGELOG.tmp CHANGELOG.md
fi

if [ -f "SECURITY.md" ]; then
  mv SECURITY.md SECURITY.tmp
  rm -f SECURITY-*.md
  mv SECURITY.tmp SECURITY.md
fi

if [ -f "INCIDENTE_SUPABASE_CERRADO.md" ]; then
  mv INCIDENTE_SUPABASE_CERRADO.md INCIDENTE.tmp
  rm -f INCIDENTE_*.md
  mv INCIDENTE.tmp INCIDENTE_SUPABASE_CERRADO.md
fi

# OBJETIVO 3: Limpieza de docs/
echo "Limpiando documentación obsoleta en docs/..."
cd docs
find . -type f \( \
  -name "ACTUALIZACION*.md" -o \
  -name "ADMIN-ACCOUNT*.md" -o \
  -name "AJUSTES*.md" -o \
  -name "ANALISIS*.md" -o \
  -name "AUDITORIA*.md" -o \
  -name "BORROSIDAD*.md" -o \
  -name "CHANGELOG*.md" -o \
  -name "CHECKLIST*.md" -o \
  -name "COLOR*.md" -o \
  -name "COMPARATIVA*.md" -o \
  -name "CONFIGURACION*.md" -o \
  -name "CONTEXT*.md" -o \
  -name "CORRECCION*.md" -o \
  -name "DASHBOARD*.md" -o \
  -name "DEPLOY*.md" -o \
  -name "DISEÑO*.md" -o \
  -name "ECOSISTEMA*.md" -o \
  -name "FASE*.md" -o \
  -name "FEATURE*.md" -o \
  -name "FIX*.md" -o \
  -name "GUIA*.md" -o \
  -name "HEALTH*.md" -o \
  -name "IDENTIDAD*.md" -o \
  -name "IMPLEMENTACION*.md" -o \
  -name "INCIDENTE*.md" -o \
  -name "INDICE*.md" -o \
  -name "INFORME*.md" -o \
  -name "INICIO*.md" -o \
  -name "INTEGRATION*.md" -o \
  -name "MEJORAS*.md" -o \
  -name "MOBILE*.md" -o \
  -name "MOCKUP*.md" -o \
  -name "OPTIMIZACIONES*.md" -o \
  -name "PERFORMANCE*.md" -o \
  -name "PLAN*.md" -o \
  -name "PROFILES*.md" -o \
  -name "PROJECT*.md" -o \
  -name "PROTECCION*.md" -o \
  -name "PROXIMOS*.md" -o \
  -name "QA*.md" -o \
  -name "README-*.md" -o \
  -name "RESUMEN*.md" -o \
  -name "RLS*.md" -o \
  -name "ROADMAP*.md" -o \
  -name "ROUTING*.md" -o \
  -name "SECURITY*.md" -o \
  -name "SESSION*.md" -o \
  -name "SOLUCION*.md" -o \
  -name "SUPABASE*.md" -o \
  -name "TEMA*.md" -o \
  -name "TEST*.md" -o \
  -name "TOKENS*.md" -o \
  -name "TROUBLESHOOTING*.md" -o \
  -name "UI-FIXES*.md" -o \
  -name "VERIFICACION*.md" \
\) -delete

# Conservar archivos específicos en docs/
if [ -f "CHANGELOG.md" ]; then
  mv CHANGELOG.md CHANGELOG.tmp
  rm -f CHANGELOG-*.md
  mv CHANGELOG.tmp CHANGELOG.md
fi

if [ -f "SECURITY.md" ]; then
  mv SECURITY.md SECURITY.tmp
  rm -f SECURITY-*.md
  mv SECURITY.tmp SECURITY.md
fi

if [ -f "INCIDENTE_SUPABASE_CERRADO.md" ]; then
  mv INCIDENTE_SUPABASE_CERRADO.md INCIDENTE.tmp
  rm -f INCIDENTE_*.md
  mv INCIDENTE.tmp INCIDENTE_SUPABASE_CERRADO.md
fi

cd ..

# Realizar commit final
echo "Realizando commit..."
git add .
git commit -m "🔥 CLEANUP MAESTRO: Eliminación de +100 archivos de ruido y carpetas legacy"
git push
