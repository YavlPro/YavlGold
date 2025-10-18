/**
 * =============================================
 * YAVLGOLD - SUPABASE CLIENT
 * Cliente de Supabase exportable para módulos ES6
 * =============================================
 */

// Configuración de Supabase
const SUPABASE_URL = 'https://gerzlzprkarikblqxpjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcnpsenBya2FyaWtibHF4cGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzY3NzUsImV4cCI6MjA3NDUxMjc3NX0.NAWaJp8I75SqjinKfoNWrlLjiQHGBmrbutIkFYo9kBg';

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
