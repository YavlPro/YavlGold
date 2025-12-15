/**
 * Configuración Robusta para Supabase (Vanilla JS + Vite)
 * YavlGold V9.3 - Fix de compatibilidad global/módulo
 * 
 * Este archivo maneja DOS escenarios:
 * 1. Supabase cargado como script global (window.supabase disponible)
 * 2. Supabase importado como módulo ESM desde CDN
 */

// 1. Lectura Defensiva de Variables de Entorno
const env = typeof import.meta !== 'undefined' ? (import.meta.env || {}) : {};

const requestUrl = env.VITE_SUPABASE_URL;
const requestKey = env.VITE_SUPABASE_ANON_KEY;

// 2. Validación (Solo advertencia en consola, sin romper ejecución)
if (!requestUrl || !requestKey) {
    console.warn('⚠️ [Supabase Config] Variables de entorno no encontradas. Buscando cliente global...');
}

// 3. Exportación de Constantes
export const SUPABASE_URL = requestUrl;
export const SUPABASE_ANON_KEY = requestKey;

// 4. Singleton del Cliente - CON FALLBACK A GLOBAL
let supabaseInstance = null;

/**
 * Crear o retornar el cliente Supabase
 * Prioridad:
 * 1. Instancia ya creada (singleton)
 * 2. Cliente global disponible (window.supabase ya inicializado)
 * 3. Crear nuevo cliente con variables de entorno
 * 4. Crear nuevo cliente usando el constructor global + env vars
 */
const createSupabaseClient = async () => {
    // Ya tenemos instancia
    if (supabaseInstance) return supabaseInstance;
    
    // Opción 1: Cliente global ya existe y está inicializado
    if (typeof window !== 'undefined' && window.supabase && window.supabase.auth) {
        console.log('✅ [Supabase Config] Usando cliente global existente');
        supabaseInstance = window.supabase;
        return supabaseInstance;
    }
    
    // Opción 2: Crear con variables de entorno + constructor global
    if (requestUrl && requestKey) {
        // Si el constructor de supabase está disponible globalmente
        if (typeof window !== 'undefined' && typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            try {
                supabaseInstance = window.supabase.createClient(requestUrl, requestKey);
                console.log('✅ [Supabase Config] Cliente creado con constructor global');
                return supabaseInstance;
            } catch (e) {
                console.warn('⚠️ [Supabase Config] Error con constructor global:', e.message);
            }
        }
        
        // Intentar import dinámico como último recurso
        try {
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            supabaseInstance = createClient(requestUrl, requestKey);
            console.log('✅ [Supabase Config] Cliente creado con import dinámico');
            return supabaseInstance;
        } catch (e) {
            console.error('❌ [Supabase Config] Error al importar desde CDN:', e.message);
        }
    }
    
    // No se pudo crear el cliente
    console.error('❌ [Supabase Config] No se pudo inicializar el cliente Supabase');
    return null;
};

// 5. Crear el cliente de forma síncrona si es posible (para compatibilidad)
const initializeClient = () => {
    // Si ya hay un cliente global inicializado, usarlo
    if (typeof window !== 'undefined' && window.supabase && window.supabase.auth) {
        supabaseInstance = window.supabase;
        return supabaseInstance;
    }
    
    // Si tenemos el constructor global y las env vars, crear
    if (requestUrl && requestKey && typeof window !== 'undefined' && window.supabase?.createClient) {
        try {
            supabaseInstance = window.supabase.createClient(requestUrl, requestKey);
            // También exponerlo globalmente
            window.supabase = supabaseInstance;
            return supabaseInstance;
        } catch (e) {
            console.warn('⚠️ [Supabase Config] Inicialización síncrona falló:', e.message);
        }
    }
    
    return null;
};

// Intentar inicialización síncrona
initializeClient();

// 6. Exportación del cliente (puede ser null si no hay env vars o global)
export const supabase = supabaseInstance;

// 7. Export función para obtener cliente de forma asíncrona
export const getSupabaseClient = createSupabaseClient;

// 8. Export default para compatibilidad
export default supabaseInstance;
