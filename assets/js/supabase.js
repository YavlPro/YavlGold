/**
 * =============================================
 * YAVLGOLD - SUPABASE CLIENT
 * Cliente de Supabase exportable para módulos ES6
 * =============================================
 */

// Import centralized configuration (no hardcoded credentials)
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig } from './config/supabase-config.js';

/**
 * Crear cliente de Supabase
 * Requiere que el SDK de Supabase esté cargado globalmente
 */
function createSupabaseClient() {
  // Validate configuration before proceeding
  if (!supabaseConfig.isValid()) {
    console.error('[Supabase] ❌ Invalid configuration. Client will not be created.');
    return null;
  }

  // Verificar que el SDK esté disponible
  if (typeof window.supabase === 'undefined') {
    console.error('[Supabase] ❌ SDK no encontrado. Asegúrate de incluir: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    return null;
  }

  try {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] ✅ Cliente creado correctamente');
    return client;
  } catch (error) {
    console.error('[Supabase] ❌ Error al crear cliente:', error);
    return null;
  }
}

// Crear instancia del cliente
export const supabase = createSupabaseClient();

// Exportar también la función createClient por si se necesita recrear
export { createSupabaseClient };

// Para uso sin módulos (global)
if (typeof window !== 'undefined') {
  window.ggSupabase = supabase;
  console.log('[Supabase] 🌐 Cliente disponible globalmente como window.ggSupabase');
}
