/**
 * YAVLGOLD - AUTH CLIENT v2.0
 */
const AuthClient = {
  supabase: null,
  currentSession: null,
  STORAGE_KEY: 'gg:session',

  init() {
    const SUPABASE_URL = 'https://gerzlzprkarikblqxpjt.supabase.co';
    // Prefer runtime configuration injected via window.__YAVL_SUPABASE__
    const runtime = (typeof window !== 'undefined' && window.__YAVL_SUPABASE__) || null;
    const SUPABASE_ANON_KEY = (runtime && runtime.anon) || '__ANON_REMOVED__';

    // If runtime config missing, attempt to auto-load apps/gold/config.local.js
    if (!runtime || !runtime.anon) {
      console.warn('[AuthClient] ⚠️ No runtime Supabase config found. Attempting to load /apps/gold/config.local.js automatically...');
      // register as global so other code can access this client while we wait
      window.AuthClient = this;

      // Try to inject the runtime config script (absolute and relative as fallback)
      const tryLoadConfig = (src) => new Promise((resolve) => {
        try {
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.onload = () => resolve(true);
          s.onerror = () => resolve(false);
          document.head.appendChild(s);
        } catch (e) {
          resolve(false);
        }
      });

      const waitForRuntime = (timeoutMs = 5000) => new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
          if (window.__YAVL_SUPABASE__ && window.__YAVL_SUPABASE__.anon) return resolve(true);
          if (Date.now() - start > timeoutMs) return resolve(false);
          setTimeout(check, 150);
        };
        check();
      });

      (async () => {
        // try absolute path first
        await tryLoadConfig('/apps/gold/config.local.js');
        let ok = await waitForRuntime(2000);
        if (!ok) {
          // try relative path
          await tryLoadConfig('apps/gold/config.local.js');
          ok = await waitForRuntime(3000);
        }

        if (ok) {
          // re-run init now that runtime is available
          console.log('[AuthClient] ✅ Runtime config loaded dynamically');
          this.init();
        } else {
          console.warn('[AuthClient] ⚠️ No runtime config found after auto-load attempts. Auth will remain inactive until config is provided.');
        }
      })();

      return;
    }

    try {
      this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.loadSession();
      console.log('[Auth] ✅ AuthClient v2.0 inicializado (runtime anon)');
    } catch (err) {
      console.error('[AuthClient] ❌ Error inicializando Supabase con runtime config:', err);
    }
  },

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
        
        return { success: true, user: session.user, message: 'Por favor revisa tu email para confirmar tu cuenta' };
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

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AuthClient.init());
} else {
  AuthClient.init();
}

window.AuthClient = AuthClient;