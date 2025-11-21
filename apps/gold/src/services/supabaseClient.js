import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client v2.0 - Singleton Pattern
 * Implementación robusta con validación de entorno (Vite)
 * Parte de la Operación Palacio Interior v1.1
 */
const supabase = (() => {
  const TAG = '[SupabaseClient]';

  // Helper para validar variables de entorno requeridas
  const requireEnv = (name) => {
    const value = import.meta.env[`VITE_${name}`];
    if (!value || typeof value !== 'string' || value.trim() === '') {
      const msg = `${TAG} Configuración crítica faltante: VITE_${name}`;
      console.error(msg);
      throw new Error(msg);
    }
    return value;
  };

  try {
    // 1. Obtener y validar configuración
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');

    // 2. Validación extra de formato URL
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      const msg = `${TAG} VITE_SUPABASE_URL debe comenzar con http:// o https://`;
      console.error(msg);
      throw new Error(msg);
    }

    console.log(`${TAG} Inicializando cliente con URL: ${supabaseUrl}`);

    // 3. Crear instancia única (Singleton)
    return createClient(supabaseUrl, supabaseAnonKey);

  } catch (error) {
    console.error(`${TAG} Error fatal inicializando Supabase:`, error);
    // En desarrollo, lanzamos el error para detener la ejecución y alertar al dev
    throw error;
  }
})();

export default supabase;
