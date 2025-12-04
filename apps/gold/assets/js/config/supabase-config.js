/* Configuración Robusta para Supabase (Vanilla JS + Vite) */

// 1. Importación Estática (CDN) - Compatible con navegadores modernos
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 2. Lectura Defensiva de Variables de Entorno
// Si Vite falla al inyectar 'import.meta.env', usamos {} para evitar crash
const env = import.meta.env || {};

const requestUrl = env.VITE_SUPABASE_URL;
const requestKey = env.VITE_SUPABASE_ANON_KEY;

// 3. Validación (Solo advertencia en consola, sin romper ejecución)
if (!requestUrl || !requestKey) {
    console.warn('⚠️ [Supabase Config] Esperando variables de entorno... Si esto persiste, reinicia el servidor.');
}

// 4. Exportación de Constantes
export const SUPABASE_URL = requestUrl;
export const SUPABASE_ANON_KEY = requestKey;

// 5. Singleton del Cliente
let supabaseInstance = null;

export const supabase = (() => {
    if (supabaseInstance) return supabaseInstance;

    if (requestUrl && requestKey) {
        try {
            supabaseInstance = createClient(requestUrl, requestKey);
            return supabaseInstance;
        } catch (error) {
            console.error("❌ Error inicializando Supabase:", error);
            return null;
        }
    }
    return null;
})();
