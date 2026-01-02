/**
 * YavlGold Logger V9.3
 * Control de logs por entorno
 * En producción: Solo errores
 * En desarrollo: Todo visible
 */

const isDev = import.meta.env.DEV;
const PREFIX = '[YavlGold]';

export const logger = {
  debug: (...args) => {
    if (isDev) console.log(`${PREFIX} 🔍`, ...args);
  },

  info: (...args) => {
    if (isDev) console.info(`${PREFIX} ℹ️`, ...args);
  },

  warn: (...args) => {
    console.warn(`${PREFIX} ⚠️`, ...args);
  },

  error: (...args) => {
    console.error(`${PREFIX} ❌`, ...args);
  },

  success: (...args) => {
    if (isDev) console.log(`${PREFIX} ✅`, ...args);
  },

  auth: (...args) => {
    if (isDev) console.log(`${PREFIX} 🔐`, ...args);
  },

  /**
   * PII/Datos sensibles - NUNCA se muestra en producción
   * Auto-redacta emails incluso en dev para máxima seguridad
   * Usar para: emails, tokens, IDs de usuario, sesiones
   */
  pii: (...args) => {
    if (!isDev) return;
    const redactEmail = (s) => String(s).replace(/(.{2}).+(@.+)/, '$1***$2');
    const redactToken = (s) => String(s).length > 20 ? String(s).slice(0, 8) + '...[REDACTED]' : s;
    const safe = args.map(a => {
      if (typeof a !== 'string') return a;
      if (a.includes('@')) return redactEmail(a);
      if (a.length > 40) return redactToken(a);
      return a;
    });
    console.log(`${PREFIX} 🔒 [PII]`, ...safe);
  }
};

// Exponer globalmente para uso en scripts inline
window.yavlLogger = logger;
