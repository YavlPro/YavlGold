/**
 * CONFIGURACIÓN CENTRAL DE SUPABASE (V9.9 - VITE ONLY)
 * Fuente de verdad única para las credenciales.
 */
import { createClient } from '@supabase/supabase-js'

// 1. Extracción Estricta de Variables VITE (Las nuevas sb_publishable)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Diagnóstico de Arranque (Para ver en consola qué llave se está usando)
console.log('[SupabaseConfig] 🔌 Inicializando cliente...');
console.log('[SupabaseConfig] 🌐 URL:', supabaseUrl);
console.log('[SupabaseConfig] 🔑 KEY Prefix:', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'UNDEFINED');

// 3. Validación de Seguridad
if (!supabaseUrl || !supabaseKey) {
    console.error('[SupabaseConfig] ❌ ERROR CRÍTICO: Faltan variables de entorno VITE_. Revisa tu archivo .env o configuración de Vercel.');
}

// 4. Creación del Cliente (Singleton)
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // Vital para el Magic Link
    },
});

// Export por defecto para compatibilidad
export default supabase;
