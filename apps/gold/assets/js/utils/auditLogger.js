/**
 * Sistema de Auditoría YavlGold V9.4
 * Envía eventos a través del wrapper público 'log_event' (schema public).
 *
 * Arquitectura:
 * App → supabase-js → PostgREST RPC → public.log_event → security.log_event → INSERT
 */
import { supabase } from '../config/supabase-config.js';

/**
 * Registra un evento de auditoría
 * @param {string} eventType - Tipo de evento (máx 64 chars)
 * @param {object} payload - Datos adicionales del evento
 */
export async function auditLog(eventType, payload = {}) {
  try {
    // Guard rails (cliente): evita spam accidental por errores de código
    if (typeof eventType !== 'string' || eventType.trim().length === 0) return;
    if (eventType.length > 64) eventType = eventType.slice(0, 64);

    const { error } = await supabase.rpc('log_event', {
      p_event_type: eventType,
      p_payload: payload,
    });

    if (error) {
      // En DEV mostramos el error; en PROD fallamos en silencio para no afectar UX
      if (import.meta.env.DEV) console.error('[audit] rpc error:', error);
    } else {
      if (import.meta.env.DEV) console.log(`[audit] sent: ${eventType}`);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error('[audit] system fail:', e);
  }
}

// Exposición para pruebas (solo DEV)
if (import.meta.env.DEV) {
  window.__auditLog = auditLog;
  console.log("[audit] DEV tool ready: window.__auditLog('EVENT', {data})");
}

export default auditLog;
