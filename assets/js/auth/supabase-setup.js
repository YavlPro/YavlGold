/**
 * ====================================
 * CONFIGURACIÓN Y SETUP DE SUPABASE
 * ====================================
 *
 * Este script ejecuta las migraciones SQL necesarias
 * para configurar triggers, RLS policies y perfiles.
 *
 * EJECUTAR UNA SOLA VEZ en Supabase SQL Editor
 */

// Import centralized configuration (no hardcoded credentials)
import { supabaseConfig } from '../config/supabase-config.js';

// Service role key should NEVER be in client code - use environment variables
const SUPABASE_SERVICE_ROLE_KEY = 'TU_SERVICE_ROLE_KEY_AQUI'; // ⚠️ NUNCA EN CLIENTE

// Este archivo es solo documentación
// Las migraciones SQL se deben ejecutar directamente en Supabase Dashboard

console.warn(`
====================================
⚠️  IMPORTANTE - SETUP INICIAL
====================================

Para configurar Supabase correctamente:

1. Ve a Supabase Dashboard: ${supabaseConfig.url || 'URL not configured'}
2. Navega a: SQL Editor (menú izquierdo)
3. Copia y ejecuta el contenido de: /supabase/migrations/001_setup_profiles_trigger.sql
4. Verifica que se ejecutó correctamente (✓ Query successful)

RESULTADO ESPERADO:
✅ Trigger: create_profile_after_user_insert
✅ Función: ensure_profile_exists()
✅ Políticas RLS en public.profiles (4 policies)
✅ Políticas RLS en public.announcements (4 policies)
✅ Índices optimizados

TESTING:
1. Registra un nuevo usuario desde /index.html
2. Verifica en tabla public.profiles que se creó automáticamente
3. Comprueba que email y username se llenaron correctamente

====================================
`);

// Funciones de verificación (requieren service_role)
async function verifySetup() {
  if (!supabaseConfig.isValid()) {
    console.error('[Setup] ❌ Supabase configuration missing. Cannot verify setup.');
    return;
  }
  const supabase = window.supabase.createClient(supabaseConfig.url, SUPABASE_SERVICE_ROLE_KEY);

  console.log('🔍 Verificando configuración de Supabase...');

  // Verificar triggers
  const { data: triggers, error: triggersError } = await supabase
    .from('pg_trigger')
    .select('*')
    .eq('tgname', 'create_profile_after_user_insert');

  if (triggersError) {
    console.error('❌ Error verificando triggers:', triggersError);
  } else {
    console.log('✅ Trigger encontrado:', triggers);
  }

  // Verificar políticas RLS
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'profiles');

  if (policiesError) {
    console.error('❌ Error verificando políticas:', policiesError);
  } else {
    console.log('✅ Políticas RLS:', policies);
  }
}

// Re-export configuration for backward compatibility
export const SUPABASE_CONFIG = {
  url: supabaseConfig.url,
  anonKey: supabaseConfig.anonKey,
  tables: {
    profiles: 'profiles',
    announcements: 'announcements'
  }
};
