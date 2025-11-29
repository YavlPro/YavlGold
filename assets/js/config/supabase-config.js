/**
 * YavlGold - Configuración Centralizada de Supabase
 * Prioridad: Vite (.env) > Window (Fallback legado)
 */

const resolveConfig = () => {
    // 1. Prioridad: Variables de entorno Vite
    const viteUrl = import.meta.env?.VITE_SUPABASE_URL;
    const viteKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (viteUrl && viteKey) {
        return { url: viteUrl, anonKey: viteKey, source: 'vite' };
    }

    // 2. Fallback: Window (si existe)
    if (typeof window !== 'undefined' && window.__YAVL_SUPABASE__) {
        console.warn('[SupabaseConfig] ⚠️ Usando configuración global (window).');
        return window.__YAVL_SUPABASE__;
    }

    console.error('[SupabaseConfig] ❌ No se encontraron credenciales. Revise .env');
    return { url: null, anonKey: null };
};

const config = resolveConfig();

// Validaciones suaves (Sanity Checks - Solo avisos)
if (config.anonKey) {
    if (config.anonKey.startsWith('eyJ')) {
        console.warn('[SupabaseConfig] 🚨 La clave parece un JWT Legacy (eyJ...). Verifique que no sea una clave antigua.');
    } else if (!config.anonKey.startsWith('sb-')) {
        console.info('[SupabaseConfig] ℹ️ La clave no comienza con "sb-". Asegúrese de usar el formato correcto.');
    }
}

export const supabaseConfig = {
    url: config.url,
    anonKey: config.anonKey,
    isValid: () => !!(config.url && config.anonKey)
};

// Exportaciones individuales para compatibilidad
export const SUPABASE_URL = config.url;
export const SUPABASE_ANON_KEY = config.anonKey;
