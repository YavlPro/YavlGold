#!/bin/bash
# migrate-to-vite-env.sh
# MIGRACIÓN A VARIABLES DE ENTORNO VITE (Kimik2 Plan)
# Este script asegura que las variables de entorno tengan el prefijo VITE_

echo "🛡️ Iniciando migración de variables de entorno a formato Vite..."

# 1. Verificar si existe .env
if [ ! -f .env ]; then
    echo "⚠️ .env no encontrado. Creando desde .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env creado exitosamente."
    else
        echo "❌ Error: .env.example no encontrado."
        exit 1
    fi
fi

# 2. Migrar variables SUPABASE_URL -> VITE_SUPABASE_URL
if grep -q "^SUPABASE_URL=" .env; then
    echo "🔄 Migrando SUPABASE_URL..."
    sed -i 's/^SUPABASE_URL=/VITE_SUPABASE_URL=/' .env
fi

# 3. Migrar variables SUPABASE_ANON_KEY -> VITE_SUPABASE_ANON_KEY
if grep -q "^SUPABASE_ANON_KEY=" .env; then
    echo "🔄 Migrando SUPABASE_ANON_KEY..."
    sed -i 's/^SUPABASE_ANON_KEY=/VITE_SUPABASE_ANON_KEY=/' .env
fi

# 4. Verificar existencia de variables críticas
if grep -q "^VITE_SUPABASE_URL=" .env && grep -q "^VITE_SUPABASE_ANON_KEY=" .env; then
    echo "✅ Variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY detectadas."
else
    echo "⚠️ Advertencia: Faltan variables críticas en .env"
fi

echo "🚀 Migración completada. El Palacio está seguro."
