/**
 * ConfigManager - Sistema centralizado de gestión de configuración
 * @version 9.1.0
 * @author YavlGold Team
 * @description
 * Implementa patrón Singleton para manejar configuración sensible.
 * Soporta múltiples entornos (desarrollo, producción).
 * Valida claves en runtime y proporciona error handling robusto.
 *
 * @example
 * ```javascript
 * import { config } from './ConfigManager.js';
 * await config.init();
 * const supabaseUrl = config.get('SUPABASE_URL');
 * ```
 */
export class ConfigManager {
  // Propiedades privadas para encapsulación
  static #instance = null;
  #config = {};
  #initialized = false;
  #cache = new Map();

  /**
   * Constructor privado para forzar el patrón Singleton.
   * @throws {Error} Si se intenta instanciar directamente.
   */
  constructor() {
    if (ConfigManager.#instance) {
      throw new Error(
        'ConfigManager es Singleton. Usa ConfigManager.getInstance()'
      );
    }
  }

  /**
   * Obtiene la instancia única del ConfigManager.
   * @returns {ConfigManager} Instancia singleton.
   */
  static getInstance() {
    if (!ConfigManager.#instance) {
      ConfigManager.#instance = new ConfigManager();
    }
    return ConfigManager.#instance;
  }

  /**
   * Inicializa el ConfigManager cargando la configuración según el entorno.
   * @async
   * @throws {Error} Si falla la carga o la validación.
   */
  async init() {
    if (this.#initialized) {
      console.warn('⚠️ ConfigManager ya inicializado.');
      return;
    }

    try {
      console.log('🔧 Inicializando ConfigManager...');
      const isDev = import.meta.env.DEV;
      console.log(`📍 Entorno detectado: ${isDev ? 'DESARROLLO' : 'PRODUCCIÓN'}`);

      if (isDev) {
        this.#loadFromEnv();
        // Fallback inteligente en DEV: intenta cargar runtime apps/gold/config.local.js si faltan claves
        if (!this.#config.SUPABASE_URL || !this.#config.SUPABASE_ANON_KEY) {
          console.warn('⚠️ Variables .env faltantes en DEV. Intentando fallback a runtime apps/gold/config.local.js...');
          await this.#tryLoadRuntimeConfig();
        }
      } else {
        await this.#loadFromAPI();
      }

      this.#validate();
      this.#initialized = true;
      console.log('✅ ConfigManager inicializado correctamente.');

    } catch (error) {
      console.error('❌ Error fatal inicializando ConfigManager:', error);
      throw new Error(`Fallo en la inicialización de ConfigManager: ${error.message}`);
    }
  }

  /**
   * Carga la configuración desde variables de entorno de Vite (desarrollo).
   * @private
   */
  #loadFromEnv() {
    this.#config = {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      HCAPTCHA_SITE_KEY: import.meta.env.VITE_HCAPTCHA_SITE_KEY || '',
      ENVIRONMENT: 'development'
    };
    console.log('📦 Configuración cargada desde variables de entorno (.env).');
  }

  /**
   * Intenta cargar configuración en runtime desde apps/gold/config.local.js (solo DEV).
   * No falla si el archivo no existe; solo configura si encuentra window.__YAVL_SUPABASE__.
   * @private
   */
  async #tryLoadRuntimeConfig() {
    // Ya disponible en global
    if (typeof window !== 'undefined' && window.__YAVL_SUPABASE__) {
      const cfg = window.__YAVL_SUPABASE__;
      this.#config = {
        SUPABASE_URL: cfg.url,
        SUPABASE_ANON_KEY: cfg.anonKey,
        HCAPTCHA_SITE_KEY: cfg.hcaptchaSiteKey || '',
        ENVIRONMENT: 'development'
      };
      console.log('📦 Configuración tomada de window.__YAVL_SUPABASE__ (runtime).');
      return;
    }

    // Intentar inyectar el script desde dos rutas posibles
    const sources = ['/apps/gold/config.local.js', 'apps/gold/config.local.js'];
    for (const src of sources) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
          document.head.appendChild(s);
        });
        if (window.__YAVL_SUPABASE__) {
          const cfg = window.__YAVL_SUPABASE__;
          this.#config = {
            SUPABASE_URL: cfg.url,
            SUPABASE_ANON_KEY: cfg.anonKey,
            HCAPTCHA_SITE_KEY: cfg.hcaptchaSiteKey || '',
            ENVIRONMENT: 'development'
          };
          console.log(`📦 Configuración cargada desde ${src}.`);
          return;
        } else {
          console.warn(`${src} cargado pero window.__YAVL_SUPABASE__ no está definido.`);
        }
      } catch (e) {
        console.warn(`No se pudo cargar configuración runtime desde ${src}:`, e.message);
      }
    }
    console.warn('⚠️ Fallback runtime no disponible. Continúa sin configurar (se lanzará validación).');
  }

  /**
   * Carga la configuración desde el endpoint /api/config (producción).
   * @async
   * @private
   * @throws {Error} Si la petición a la API falla.
   */
  async #loadFromAPI() {
    console.log('📡 Obteniendo configuración desde /api/config...');
    const response = await fetch('/api/config');

    if (!response.ok) {
      throw new Error(`Error al cargar config desde API: Status ${response.status}`);
    }

    this.#config = await response.json();
    this.#config.ENVIRONMENT = 'production';
    console.log('📦 Configuración cargada desde API.');
  }

  /**
   * Valida que las claves requeridas existan y tengan un formato válido.
   * @private
   * @throws {Error} Si falta alguna clave o es inválida.
   */
  #validate() {
    const requiredKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingKeys = requiredKeys.filter(key => !this.#config[key]);

    if (missingKeys.length > 0) {
      throw new Error(`Claves de configuración faltantes: ${missingKeys.join(', ')}. ` +
        `Solución rápida (DEV): crea .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, ` +
        `o crea apps/gold/config.local.js definiendo window.__YAVL_SUPABASE__ = { url, anonKey }.`);
    }

    try {
      new URL(this.#config.SUPABASE_URL);
    } catch {
      throw new Error('SUPABASE_URL tiene un formato inválido. Debe ser una URL completa.');
    }

    if (this.#config.SUPABASE_ANON_KEY.length < 40) {
      throw new Error('SUPABASE_ANON_KEY parece inválida (demasiado corta).');
    }

    console.log('✅ Validación de configuración exitosa.');
  }

  /**
   * Obtiene el valor de una clave de configuración.
   * @param {string} key - El nombre de la clave.
   * @returns {string} El valor de la clave.
   * @throws {Error} Si ConfigManager no está inicializado o la clave no existe.
   */
  get(key) {
    if (!this.#initialized) {
      throw new Error('ConfigManager no ha sido inicializado. Llama a init() primero.');
    }
    if (this.#cache.has(key)) {
      return this.#cache.get(key);
    }
    if (!(key in this.#config)) {
      throw new Error(`La clave de configuración "${key}" no fue encontrada.`);
    }
    const value = this.#config[key];
    this.#cache.set(key, value);
    return value;
  }
  
  /**
   * Verifica si el ConfigManager ya fue inicializado.
   * @returns {boolean}
   */
  isInitialized() {
    return this.#initialized;
  }
}

// Exportar la instancia única para ser usada en toda la aplicación.
export const config = ConfigManager.getInstance();
