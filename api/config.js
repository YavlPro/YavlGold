/**
 * Serverless Function: /api/config
 * @description
 * Proporciona variables de entorno seguras para la aplicación cliente en producción.
 * Evita exponer secretos directamente en el frontend.
 * Diseñado para ser usado con Vercel/Netlify.
 *
 * @returns {object} JSON con claves públicas necesarias para el cliente.
 * @author YavlGold Team
 */

// 'process.env' es donde Vercel/Netlify guardan las variables de entorno
// configuradas en su dashboard.

export default async function handler(request, response) {
  // Asegurarse de que solo se acepten peticiones GET
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Obtener las variables de entorno del servidor.
    // (Asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
    // estén configuradas en el dashboard de Vercel/Netlify)
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
    const HCAPTCHA_SITE_KEY = process.env.VITE_HCAPTCHA_SITE_KEY || ''; // Opcional

    // Validar que las variables críticas existan
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ Faltan variables de entorno críticas en /api/config');
      return response.status(500).json({
        message: 'Error de configuración del servidor: Faltan claves de Supabase.'
      });
    }

    // Responder SOLO con las claves públicas
    // ¡IMPORTANTE! NUNCA envíes claves privadas como SERVICE_ROLE_KEY
    response.status(200).json({
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      HCAPTCHA_SITE_KEY,
      ENVIRONMENT: 'production' // Confirma el entorno
    });

  } catch (error) {
    console.error('❌ Error en la función serverless /api/config:', error);
    response.status(500).json({ message: 'Internal Server Error' });
  }
}
