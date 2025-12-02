/**
 * YAVL ECOSYSTEM - AUTH CLIENT
 * Sistema de autenticación unificado con Supabase
 * Migrado desde YavlGold/assets/js/auth/authClient.js
 */

// Import centralized configuration (no hardcoded credentials)
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig } from '../../../assets/js/config/supabase-config.js';

export const authClient = {
  supabase: null,
  currentSession: null,
  STORAGE_KEY: 'yavl:session',

  /**
   * Inicializa el cliente de Supabase
   */
  init() {
    // Validate configuration before proceeding
    if (!supabaseConfig.isValid()) {
      console.error('[Auth] ❌ Supabase configuration missing. Auth will not work.');
      return;
    }

    // Ensure Supabase SDK is loaded
    if (typeof window.supabase === 'undefined') {
      console.error('[Auth] ❌ Supabase no está cargado. Asegúrate de incluir el script de Supabase antes de auth.js');
      return;
    }

    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.loadSession();
    console.log('[Auth] ✅ AuthClient inicializado');
  },

  /**
   * Obtiene token de hCaptcha si está disponible
   */
  async getCaptchaToken() {
    if (typeof hcaptcha !== 'undefined') {
      try {
        const response = hcaptcha.getResponse();
        if (response) {
          console.log('[AuthClient] ✅ hCaptcha token obtenido');
          return response;
        }
      } catch (e) {
        console.warn('[AuthClient] ⚠️ No se pudo obtener token de CAPTCHA:', e.message);
      }
    }
    return null;
  },

  /**
   * Login de usuario
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async login(email, password) {
    console.log('[AuthClient] 🔐 Iniciando sesión...');
    try {
      const captchaToken = await this.getCaptchaToken();

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password,
        options: {
          captchaToken: captchaToken || undefined
        }
      });

      if (error) throw error;

      if (data.session && data.user) {
        const session = {
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email.split('@')[0],
            avatar: data.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.email)}&background=C8A752&color=0B0C0F&bold=true`,
            role: 'user',
            createdAt: data.user.created_at
          },
          token: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
          createdAt: Date.now()
        };

        this.saveSession(session);
        this.emitAuthChange('SIGNED_IN');

        return { success: true, user: session.user };
      }

      return { success: false, error: 'No se pudo iniciar sesión' };
    } catch (error) {
      console.error('[AuthClient] ❌ Error en login:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Registro de nuevo usuario
   * @param {string} email - Email
   * @param {string} password - Contraseña
   * @param {string} name - Nombre completo
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async register(email, password, name) {
    console.log('[AuthClient] 📝 Registrando usuario...');
    try {
      const captchaToken = await this.getCaptchaToken();

      if (!captchaToken) {
        return { success: false, error: 'Por favor completa el CAPTCHA' };
      }

      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            full_name: name
          },
          emailRedirectTo: window.location.origin,
          captchaToken: captchaToken
        }
      });

      if (error) throw error;

      if (data.user) {
        console.log('[AuthClient] ✅ Usuario registrado:', data.user.email);

        // Crear perfil extendido en tabla profiles
        try {
          const { error: profileError } = await this.supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: name.toLowerCase().replace(/\s+/g, '_'),
              email: data.user.email,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C8A752&color=0B0C0F&bold=true`,
              bio: '',
              is_admin: false
            });

          if (profileError) {
            console.warn('[AuthClient] ⚠️ No se pudo crear perfil extendido:', profileError.message);
          } else {
            console.log('[AuthClient] ✅ Perfil extendido creado');
          }
        } catch (profileErr) {
          console.warn('[AuthClient] ⚠️ Error al crear perfil:', profileErr.message);
        }

        // Reset hCaptcha después de uso exitoso
        if (typeof hcaptcha !== 'undefined') {
          hcaptcha.reset();
        }

        // Verificar si el registro requiere confirmación de email
        if (!data.session) {
          // El usuario fue creado pero necesita confirmar email
          console.log('[AuthClient] ℹ️ Registro exitoso, requiere confirmación de email');
          return {
            success: true,
            user: {
              id: data.user.id,
              email: data.user.email,
              name: name
            },
            requiresConfirmation: true,
            message: 'Por favor revisa tu email para confirmar tu cuenta antes de iniciar sesión'
          };
        }

        // Si hay sesión, el usuario puede acceder inmediatamente
        const session = {
          user: {
            id: data.user.id,
            email: data.user.email,
            name: name,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C8A752&color=0B0C0F&bold=true`,
            role: 'user',
            createdAt: data.user.created_at
          },
          token: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).getTime() : Date.now() + (24 * 60 * 60 * 1000),
          createdAt: Date.now()
        };

        this.saveSession(session);
        this.emitAuthChange('USER_REGISTERED');

        return { success: true, user: session.user, message: '¡Cuenta creada exitosamente!' };
      }

      return { success: false, error: 'No se pudo crear el usuario' };
    } catch (error) {
      console.error('[AuthClient] ❌ Error en registro:', error.message);

      // Reset hCaptcha en caso de error
      if (typeof hcaptcha !== 'undefined') {
        hcaptcha.reset();
      }

      return { success: false, error: error.message };
    }
  },

  /**
   * Cierra la sesión del usuario
   */
  logout() {
    console.log('[AuthClient] 🚪 Cerrando sesión...');
    this.supabase.auth.signOut();
    this.currentSession = null;
    localStorage.removeItem(this.STORAGE_KEY);
    this.emitAuthChange('SIGNED_OUT');
    console.log('[AuthClient] ✅ Sesión cerrada');
  },

  /**
   * Guarda la sesión en localStorage
   * @param {object} session - Objeto de sesión
   */
  saveSession(session) {
    try {
      if (!session || !session.user) {
        throw new Error('Sesión inválida');
      }
      this.currentSession = session;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      console.log('[AuthClient] ✅ Sesión guardada');
    } catch (error) {
      console.error('[AuthClient] ❌ Error al guardar sesión:', error);
    }
  },

  /**
   * Carga la sesión desde localStorage
   */
  loadSession() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
        console.log('[AuthClient] ✅ Sesión cargada:', this.currentSession.user?.email);
        this.emitAuthChange('INITIAL_SESSION');
      } else {
        console.log('[AuthClient] ℹ No hay sesión activa');
      }
    } catch (error) {
      console.error('[AuthClient] ❌ Error al cargar sesión:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  },

  /**
   * Verifica si hay un usuario autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentSession?.user;
  },

  /**
   * Obtiene el usuario actual
   * @returns {object|null}
   */
  getCurrentUser() {
    return this.currentSession?.user || null;
  },

  /**
   * Obtiene la sesión completa
   * @returns {object|null}
   */
  getSession() {
    return this.currentSession;
  },

  /**
   * Refresca la sesión actual con Supabase
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async refreshSession() {
    console.log('[AuthClient] 🔄 Refrescando sesión...');
    try {
      if (!this.supabase) {
        return { success: false, error: 'Supabase no inicializado' };
      }

      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        console.error('[AuthClient] ❌ Error al refrescar sesión:', error.message);
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const session = {
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email.split('@')[0],
            avatar: data.user.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.email)}&background=C8A752&color=0B0C0F&bold=true`,
            role: 'user',
            createdAt: data.user.created_at
          },
          token: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: new Date(data.session.expires_at * 1000).getTime(),
          createdAt: Date.now()
        };

        this.saveSession(session);
        this.emitAuthChange('SESSION_REFRESHED');
        console.log('[AuthClient] ✅ Sesión refrescada correctamente');
        return { success: true };
      }

      return { success: false, error: 'No se pudo refrescar la sesión' };
    } catch (error) {
      console.error('[AuthClient] ❌ Excepción al refrescar sesión:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Solicita restablecimiento de contraseña por email
   * @param {string} email - Email del usuario
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async resetPassword(email) {
    console.log('[AuthClient] 📧 Solicitando restablecimiento de contraseña...');
    try {
      if (!this.supabase) {
        return { success: false, error: 'Supabase no inicializado' };
      }

      const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
      });

      if (error) {
        console.error('[AuthClient] ❌ Error al enviar email de recuperación:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[AuthClient] ✅ Email de recuperación enviado');
      return { success: true, message: 'Se ha enviado un email con instrucciones para restablecer tu contraseña' };
    } catch (error) {
      console.error('[AuthClient] ❌ Excepción al enviar email de recuperación:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Emite eventos de cambio de autenticación
   * @param {string} event - Tipo de evento
   */
  emitAuthChange(event) {
    const customEvent = new CustomEvent(`auth:${event.toLowerCase()}`, {
      detail: { user: this.currentSession?.user }
    });
    window.dispatchEvent(customEvent);
    console.log('[AuthClient] 🔔 Estado de auth cambió:', event);
  }
};

// Auto-init cuando el DOM esté listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => authClient.init());
  } else {
    authClient.init();
  }
}

// Soporte para uso global (backward compatibility)
if (typeof window !== 'undefined') {
  window.AuthClient = authClient;
}
