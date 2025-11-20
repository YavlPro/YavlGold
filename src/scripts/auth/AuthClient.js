/**
 * AuthClient - Cliente de autenticación con Supabase
 * Refactorizado para usar ConfigManager (V9.1)
 *
 * @version 9.1.0
 * @author YavlGold Team
 * @description
 * Cliente Singleton para interactuar con Supabase Auth.
 * Se inicializa *después* del ConfigManager para asegurar
 * que las claves de Supabase estén cargadas.
 */

// Importa el cliente de Supabase y el ConfigManager
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/ConfigManager.js';

export class AuthClient {
  static #instance = null;
  #supabaseClient = null;
  #currentUser = null;

  /**
   * Constructor privado (Singleton)
   */
  constructor() {
    if (AuthClient.#instance) {
      throw new Error('AuthClient es Singleton. Usa AuthClient.getInstance()');
    }
  }

  /**
   * Obtiene la instancia única de AuthClient
   * @returns {AuthClient}
   */
  static getInstance() {
    if (!AuthClient.#instance) {
      AuthClient.#instance = new AuthClient();
    }
    return AuthClient.#instance;
  }

  /**
   * Inicializa el cliente de Supabase.
   * DEBE llamarse después de config.init()
   * @async
   * @throws {Error} Si ConfigManager no está inicializado
   */
  async init() {
    // 🛡️ Barrera de seguridad:
    // Nos aseguramos de que ConfigManager esté listo
    if (!config.isInitialized()) {
      throw new Error(
        'ConfigManager debe estar inicializado antes de AuthClient'
      );
    }

    try {
  // ⭐ Obtiene las claves de forma segura desde el ConfigManager
  const supabaseUrl = config.get('SUPABASE_URL');
  const supabaseKey = config.get('SUPABASE_ANON_KEY');

  // 🔎 Diagnóstico: verificar que llegan valores correctos
  console.log('🕵️‍♂️ [AuthClient] Inspeccionando configuración ANTES de crear el cliente...');
  console.log('🕵️‍♂️ URL recibida:', supabaseUrl);
  console.log('🕵️‍♂️ Anon Key recibida (primeros 8 chars):', typeof supabaseKey === 'string' ? supabaseKey.slice(0, 8) + '…' : supabaseKey);

      // Crea el cliente Supabase
      this.#supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true // Importante para OAuth y Magic Links
        }
      });

      console.log('🕵️‍♂️ [AuthClient] Cliente Supabase creado.');

      // Intenta cargar la sesión actual al iniciar
      await this.#loadCurrentSession();

      console.log('✅ AuthClient inicializado correctamente');

    } catch (error) {
      console.error('❌ Error fatal inicializando AuthClient:', error);
      throw error; // Lanza el error para detener la carga de la app
    }
  }

  /**
   * Carga la sesión del usuario desde Supabase al iniciar
   * @private
   */
  async #loadCurrentSession() {
    const { data, error } = await this.#supabaseClient.auth.getSession();
    
    if (error) {
      console.warn('Error cargando sesión inicial:', error.message);
      return;
    }

    if (data.session) {
      this.#currentUser = data.session.user;
      console.log('✅ Sesión activa encontrada para:', this.#currentUser.email);
    } else {
      console.log('ℹ️ No se encontró sesión activa.');
    }
  }

  /**
   * Registra un nuevo usuario
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async signUp(email, password) {
    // Intentar obtener token de hCaptcha (si existe)
    const captchaToken = await this.getCaptchaToken();

    const { data, error } = await this.#supabaseClient.auth.signUp({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined
    });

    if (error) throw error; // Deja que el UI maneje el error

    // Puede que la sesión no se establezca hasta la confirmación
    this.#currentUser = data.user; 
    return data;
  }

  /**
   * Inicia sesión con email y password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async signIn(email, password) {
    // Intentar obtener token de hCaptcha (si existe)
    const captchaToken = await this.getCaptchaToken();

    const { data, error } = await this.#supabaseClient.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined
    });

    if (error) throw error;

    this.#currentUser = data.user;
    return data;
  }

  /**
   * Cierra la sesión del usuario
   */
  async signOut() {
    const { error } = await this.#supabaseClient.auth.signOut();
    if (error) throw error;

    this.#currentUser = null;
    console.log('✅ Sesión cerrada');
  }

  /**
   * Envía un email de recuperación de contraseña
   * @param {string} email - El email del usuario que olvidó su contraseña
   * @returns {Promise<Object>}
   */
  async resetPassword(email) {
    try {
      // Validación básica de email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Email inválido');
      }

      const { data, error } = await this.#supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
      });

      if (error) throw error;

      console.log('✅ Email de recuperación enviado a:', email);
      return data;
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('user not found')) {
        throw new Error('Usuario no encontrado');
      }
      throw err;
    }
  }

  /**
   * Actualiza la contraseña del usuario autenticado
   * Este método se usa en el flujo de recuperación de contraseña
   * cuando el usuario hace click en el enlace del email
   * @param {string} newPassword - La nueva contraseña del usuario
   * @returns {Promise<Object>}
   */
  async updatePassword(newPassword) {
    try {
      // Validaciones de seguridad
      if (!newPassword || newPassword.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      if (/\s/.test(newPassword)) {
        // Requisito adicional: sin espacios
        throw new Error('No debe contener espacios');
      }

      if (!/[A-Z]/.test(newPassword)) {
        throw new Error('La contraseña debe contener al menos una mayúscula');
      }

      if (!/[0-9]/.test(newPassword)) {
        throw new Error('La contraseña debe contener al menos un número');
      }

      // Actualiza la contraseña en Supabase
      const { data, error } = await this.#supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      console.log('✅ Contraseña actualizada exitosamente');
      return data;

    } catch (error) {
      console.error('❌ Error actualizando contraseña:', error);
      throw error;
    }
  }

  /**
   * Obtiene el objeto del usuario actual
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.#currentUser;
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.#currentUser !== null;
  }

  /**
   * Expone el cliente de Supabase (para operaciones avanzadas)
   * @returns {SupabaseClient}
   */
  getClient() {
    if (!this.#supabaseClient) {
      throw new Error('AuthClient no inicializado. Llama a init() primero.');
    }
    return this.#supabaseClient;
  }

  /**
   * Obtiene el token de hCaptcha si el widget está presente y completado.
   * Devuelve null si no está disponible o vacío.
   * @returns {Promise<string|null>}
   */
  async getCaptchaToken() {
    try {
      // hCaptcha solo existe si se cargó el script del proveedor
      if (typeof window !== 'undefined' && typeof window.hcaptcha !== 'undefined') {
        // Si hay múltiples widgets, hcaptcha.getResponse() sin args devuelve el primero
        const response = window.hcaptcha.getResponse();
        if (response && response.trim().length > 0) {
          console.log('[AuthClient] ✅ hCaptcha token obtenido');
          return response;
        }
        console.warn('[AuthClient] ⚠️ hCaptcha no completado o token vacío');
        return null;
      }
      // No cargar si no está disponible (DEV sin captcha)
      return null;
    } catch (e) {
      console.warn('[AuthClient] ⚠️ Error al obtener token de CAPTCHA:', e.message);
      return null;
    }
  }
}

// Exportar la instancia única
export const authClient = AuthClient.getInstance();
