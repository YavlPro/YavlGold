/**
 * GLOBALGOLD - AUTH CLIENT v3.0
 * Integración con Supabase Authentication
 */

// Configuración de Supabase
const SUPABASE_URL = 'https://gerzlzprkarikblqxpjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcnpsenBya2FyaWtibHF4cGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzY3NzUsImV4cCI6MjA3NDUxMjc3NX0.NAWaJp8I75SqjinKfoNWrlLjiQHGBmrbutIkFYo9kBg';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AuthClient = {
  /**
   * Iniciar sesión con email y contraseña
   */
  async login(email, password) {
    try {
      console.log('[AuthClient] 🔐 Iniciando sesión...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
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
    try {
      console.log('[AuthClient] 📝 Registrando usuario...');

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        console.error('[AuthClient] ❌ Error en registro:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('[AuthClient] ✅ Registro exitoso');
        
        // Si el registro requiere confirmación de email
        if (data.user.identities && data.user.identities.length === 0) {
          return { 
            success: true, 
            user: data.user,
            message: 'Por favor verifica tu email para activar tu cuenta'
          };
        }

        // Si el login es automático después del registro
        if (data.session) {
          this.saveSession(data.session, data.user);
          window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
        }

        return { success: true, user: data.user };
      }

      return { success: false, error: 'No se pudo crear la cuenta' };
    } catch (err) {
      console.error('[AuthClient] ❌ Error inesperado:', err);
      return { success: false, error: 'Error inesperado al registrarse' };
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
};

// Restaurar sesión al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AuthClient.restoreSession());
} else {
  AuthClient.restoreSession();
}

// Escuchar cambios en la autenticación de Supabase
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[AuthClient] 🔔 Estado de auth cambió:', event);
  
  if (event === 'SIGNED_IN' && session) {
    AuthClient.saveSession(session, session.user);
  } else if (event === 'SIGNED_OUT') {
    AuthClient.clearSession();
  } else if (event === 'TOKEN_REFRESHED' && session) {
    AuthClient.saveSession(session, session.user);
  }
});

// Auto-refresh cada 30 minutos
setInterval(() => {
  if (AuthClient.isAuthenticated()) {
    AuthClient.refreshSession();
  }
}, 30 * 60 * 1000);

// Export
window.AuthClient = AuthClient;
console.log('[Auth] ✅ AuthClient v2.0 inicializado');