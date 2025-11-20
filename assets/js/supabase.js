/**
 * =============================================
 * YAVLGOLD - SUPABASE CLIENT
 * Cliente de Supabase exportable para módulos ES6
 * =============================================
 */

// Configuración de Supabase
const SUPABASE_URL = 'https://gerzlzprkarikblqxpjt.supabase.co';
// Anon key removed from repo; prefer runtime injection via window.__YAVL_SUPABASE__
const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.__YAVL_SUPABASE__ && window.__YAVL_SUPABASE__.anon) || '__ANON_REMOVED__';

/**
 * Crear cliente de Supabase
 * Requiere que el SDK de Supabase esté cargado globalmente
 */
function createSupabaseClient() {
  // Verificar que el SDK esté disponible
  if (typeof window.supabase === 'undefined') {
    console.error('[Supabase] ❌ SDK no encontrado. Asegúrate de incluir: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    return null;
  }

  try {
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === '__ANON_REMOVED__') {
      console.error('[Supabase] ❌ Anon key not provided at runtime. Define window.__YAVL_SUPABASE__ or create apps/gold/config.local.js');
      return null;
    }
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] ✅ Cliente creado correctamente (runtime anon)');
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
