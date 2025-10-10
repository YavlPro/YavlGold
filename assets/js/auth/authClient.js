/**
 * GLOBALGOLD - AUTH CLIENT v2.0
 */
const AuthClient = {
  supabase: null,
  currentSession: null,
  STORAGE_KEY: 'gg:session',

  init() {
    // Inicializar cliente Supabase
    const SUPABASE_URL = 'https://gerzlzprkarikblqxpjt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcnpsenBya2FyaWtibHF4cGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzY3NzUsImV4cCI6MjA3NDUxMjc3NX0.NAWaJp8I75SqjinKfoNWrlLjiQHGBmrbutIkFYo9kBg';
    
    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    this.loadSession();
    console.log('[Auth] ✅ AuthClient v2.0 inicializado');
  },

  /**
   * Iniciar sesión con email y contraseña
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

      if (error) {
        console.error('[AuthClient] ❌ Error en login:', error.message);
        return { success: false, error: error.message };
      }

      if (data.session) {
        // Guardar sesión en localStorage
        this.saveSession(data.session, data.user);
        console.log('[AuthClient] ✅ Login exitoso');
        
        // Emitir evento de login
        window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
        
        return { success: true, user: data.user };
      }

      return { success: false, error: 'No se pudo iniciar sesión' };
    } catch (err) {
      console.error('[AuthClient] ❌ Error inesperado:', err);
      return { success: false, error: 'Error inesperado al iniciar sesión' };
    }
  },

  /**
   * Registrar nuevo usuario
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
        
        const session = {
          user: {
            id: data.user.id,
            email: data.user.email,
            name: name,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C8A752&color=0B0C0F&bold=true`,
            role: 'user',
            createdAt: data.user.created_at
          },
          token: data.session?.access_token || btoa(Math.random().toString(36) + Date.now()).substring(0, 64),
          refreshToken: data.session?.refresh_token || btoa(Math.random().toString(36) + Date.now()).substring(0, 64),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
          createdAt: Date.now()
        };

        this.saveSession(session);
        this.emitAuthChange('USER_REGISTERED');
        
        return { success: true, user: session.user };
      }

      return { success: false, error: 'No se pudo crear el usuario' };
    } catch (error) {
      console.error('[AuthClient] ❌ Error en registro:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      console.log('[AuthClient] 🚪 Cerrando sesión...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[AuthClient] ❌ Error al cerrar sesión:', error.message);
      }

      // Limpiar localStorage de todos modos
      this.clearSession();
      console.log('[AuthClient] ✅ Sesión cerrada');

      // Emitir evento de logout
      window.dispatchEvent(new CustomEvent('auth:logout'));

      // Redirigir al home
      if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('[AuthClient] ❌ Error inesperado al cerrar sesión:', err);
      this.clearSession();
      window.location.href = '/';
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated() {
    const session = localStorage.getItem('sb-gerzlzprkarikblqxpjt-auth-token');
    return !!session;
  },

  /**
   * Obtener el usuario actual
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('globalgold_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Obtener la sesión actual de Supabase
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[AuthClient] ❌ Error al obtener sesión:', error.message);
      return null;
    }
    return data.session;
  },

  /**
   * Guardar sesión en localStorage
   */
  saveSession(session, user) {
    try {
      // Supabase guarda automáticamente la sesión, pero guardamos info adicional
      localStorage.setItem('globalgold_user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email.split('@')[0],
        avatar: user.user_metadata?.avatar_url || null,
        created_at: user.created_at,
      }));
      console.log('[AuthClient] 💾 Sesión guardada');
    } catch (err) {
      console.error('[AuthClient] ❌ Error al guardar sesión:', err);
    }
  },

  /**
   * Limpiar sesión del localStorage
   */
  clearSession() {
    localStorage.removeItem('globalgold_user');
    // Limpiar también la sesión de Supabase
    localStorage.removeItem('sb-gerzlzprkarikblqxpjt-auth-token');
    console.log('[AuthClient] 🧹 Sesión limpiada');
  },

  /**
   * Restaurar sesión al cargar la página
   */
  async restoreSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthClient] ❌ Error al restaurar sesión:', error.message);
        this.clearSession();
        return false;
      }

      if (data.session) {
        this.saveSession(data.session, data.session.user);
        console.log('[AuthClient] ✅ Sesión restaurada');
        return true;
      }

      console.log('[AuthClient] ℹ No hay sesión activa');
      return false;
    } catch (err) {
      console.error('[AuthClient] ❌ Error inesperado al restaurar sesión:', err);
      this.clearSession();
      return false;
    }
  },

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(updates) {
    try {
      console.log('[AuthClient] 🔄 Actualizando perfil...');

      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        console.error('[AuthClient] ❌ Error al actualizar perfil:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Actualizar usuario en localStorage
        const currentUser = this.getCurrentUser();
        const updatedUser = {
          ...currentUser,
          ...updates,
          name: updates.name || currentUser.name,
          avatar: updates.avatar_url || currentUser.avatar,
        };
        localStorage.setItem('globalgold_user', JSON.stringify(updatedUser));

        console.log('[AuthClient] ✅ Perfil actualizado');
        window.dispatchEvent(new CustomEvent('auth:profileUpdated', { detail: updatedUser }));

        return { success: true, user: updatedUser };
      }

      return { success: false, error: 'No se pudo actualizar el perfil' };
    } catch (err) {
      console.error('[AuthClient] ❌ Error inesperado:', err);
      return { success: false, error: 'Error inesperado al actualizar perfil' };
    }
  },

  /**
   * Obtener token de CAPTCHA (hCaptcha)
   */
  async getCaptchaToken() {
    // Intentar obtener token de hCaptcha si está cargado
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
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AuthClient.init());
} else {
  AuthClient.init();
}

window.AuthClient = AuthClient;