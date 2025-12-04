/* apps/gold/assets/js/config/supabase-config.js */

// 1. Capturamos las variables del entorno Vite (Tus claves sb_)
const requestUrl = import.meta.env.VITE_SUPABASE_URL;
const requestKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Validación de seguridad (Para que no arranque si falta algo en el .env)
if (!requestUrl || !requestKey) {
    console.error('🚨 Error Fatal: No se leen las variables VITE_SUPABASE_* del .env');
}

// 3. EXPORTACIÓN NOMBRADA (La solución al error de consola)
export const SUPABASE_URL = requestUrl;
export const SUPABASE_ANON_KEY = requestKey;

// 4. OBJETO DE CONFIGURACIÓN (requerido por packages/auth)
export const supabaseConfig = {
    isValid() {
        return !!(requestUrl && requestKey);
    },
    getUrl() {
        return requestUrl;
    },
    getKey() {
        return requestKey;
    }
};

// 5. Inicialización del cliente con @supabase/supabase-js
import { createClient } from '@supabase/supabase-js';

// Patrón Singleton para no crear múltiples clientes
let supabaseInstance = null;

export const supabase = (() => {
    if (supabaseInstance) return supabaseInstance;
    if (requestUrl && requestKey) {
        supabaseInstance = createClient(requestUrl, requestKey);
        console.log('✅ Supabase client inicializado (sb-* key)');
        return supabaseInstance;
    }
    return null;
})();
