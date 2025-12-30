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
  }
};

// Exponer globalmente para uso en scripts inline
window.yavlLogger = logger;
