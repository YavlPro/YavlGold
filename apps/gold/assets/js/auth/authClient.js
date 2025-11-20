/**
 * YAVLGOLD - AUTH CLIENT v2.0
 */
const AuthClient = {
  supabase: null,
  currentSession: null,
  STORAGE_KEY: 'gg:session',

  async ensureSupabaseConfig(timeoutMs = 3000) {
    // Espera de forma no bloqueante a que window.__YAVL_SUPABASE__ esté disponible
    if (window.__YAVL_SUPABASE__ && window.__YAVL_SUPABASE__.url && window.__YAVL_SUPABASE__.anon) {
      return window.__YAVL_SUPABASE__;
    }
    const start = Date.now();
    while (!window.__YAVL_SUPABASE__ || !window.__YAVL_SUPABASE__.url || !window.__YAVL_SUPABASE__.anon) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Supabase config not found in runtime (timeout)');
      }
      // small delay
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 50));
    }
    return window.__YAVL_SUPABASE__;
  },

  async init() {
    // Configuración: la configuración de Supabase debe inyectarse en runtime
    // Define en tu entorno local (no comiteado): window.__YAVL_SUPABASE__ = { url: '...', anon: '...' }
    let cfg;
    try {
      cfg = await this.ensureSupabaseConfig();
    } catch (err) {
      console.error('[Auth] ❌ Configuración de Supabase no encontrada en runtime. Define window.__YAVL_SUPABASE__ antes de llamar a AuthClient.init()', err);
      return;
    }

    const SUPABASE_URL = cfg.url;
    const SUPABASE_ANON_KEY = cfg.anon;

    if (typeof window.supabase === 'undefined') {
      console.error('[Auth] ❌ Supabase no está cargado. Asegúrate de incluir el script de Supabase antes de auth.js');
      return;
    }

    // Use a global singleton to avoid creating multiple GoTrueClient instances
    // which supabase-js warns about when multiple clients share the same storage key.
    if (!window.__YAVL_SUPABASE_CLIENT__) {
      window.__YAVL_SUPABASE_CLIENT__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    this.supabase = window.__YAVL_SUPABASE_CLIENT__;
    this.loadSession();
    console.log('[Auth] ✅ AuthClient v2.0 inicializado');
  },

  async getCaptchaToken() {
    // For local development, bypass hCaptcha to simplify testing on localhost
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.warn('[AuthClient] ⚠️ Ejecutando en localhost — saltando hCaptcha para pruebas locales');
      return 'LOCALHOST_BYPASS_TOKEN';
    }

    if (typeof hcaptcha !== 'undefined') {
      try {
        const response = hcaptcha.getResponse();
        if (response && response.length > 0) {
          console.log('[AuthClient] ✅ hCaptcha token obtenido:', response.substring(0, 20) + '...');
          return response;
        } else {
          console.warn('[AuthClient] ⚠️ hCaptcha no completado o token vacío');
        }
      } catch (e) {
        console.warn('[AuthClient] ⚠️ Error al obtener token de CAPTCHA:', e.message);
      }
    } else {
      console.warn('[AuthClient] ⚠️ hCaptcha no está cargado');
    }
    return null;
  },

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

        // Si Supabase nos devolvió sesión (usuario confirmado o sign-up sin confirmación requerida),
        // intentamos crear perfil y guardar la sesión. En muchos proyectos la confirmación por email
        // evita que exista una session inmediata: en ese caso NO intentamos insertar en profiles desde el cliente
        // porque la request se rechazará por RLS.
        if (data.session && data.session.access_token) {
          // Crear perfil extendido en tabla profiles (se requiere que la sesión sea válida para pasar RLS)
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

          return { success: true, user: session.user, message: 'Registro completado y sesión iniciada' };
        }

        // Si llegamos aquí, el usuario existe pero no hay sesión (probablemente requiere confirmación por email).
        // No intentamos crear el perfil desde el cliente (fallaría por RLS). Informamos al usuario.
        return { success: true, user: { id: data.user.id, email: data.user.email }, message: 'Registro recibido. Por favor revisa tu email para confirmar la cuenta antes de iniciar sesión.' };
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

  logout() {
    console.log('[AuthClient] 🚪 Cerrando sesión...');
    this.supabase.auth.signOut();
    this.currentSession = null;
    localStorage.removeItem(this.STORAGE_KEY);
    this.emitAuthChange('SIGNED_OUT');
    console.log('[AuthClient] ✅ Sesión cerrada');
  },

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

  isAuthenticated() {
    return !!this.currentSession?.user;
  },

  getCurrentUser() {
    return this.currentSession?.user || null;
  },

  getSession() {
    return this.currentSession;
  },

  emitAuthChange(event) {
    const customEvent = new CustomEvent(`auth:${event.toLowerCase()}`, {
      detail: { user: this.currentSession?.user }
    });
    window.dispatchEvent(customEvent);
    console.log('[AuthClient] 🔔 Estado de auth cambió:', event);
  }
};

// Export para imports de módulos ES6
// Nota: no auto-inicializamos aquí para evitar inicialización prematura
// La inicialización debe llamarse explícitamente con `AuthClient.init()`
// después de que el archivo de configuración runtime esté cargado.
window.AuthClient = AuthClient;
export default AuthClient;