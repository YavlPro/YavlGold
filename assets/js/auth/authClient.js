/**
 * GLOBALGOLD - AUTH CLIENT v2.0
 */
const AuthClient = {
  config: {
    storageKey: 'gg:session',
    sessionDuration: 24 * 60 * 60 * 1000,
    protectedRoutes: ['/herramientas/', '/dashboard/'],
    apiEndpoint: null,
  },

  getSession() {
    const raw = localStorage.getItem(this.config.storageKey);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        console.warn('[Auth] Sesión expirada');
        this.clearSession();
        return null;
      }
      return session;
    } catch (e) {
      console.error('[Auth] Error parseando sesión:', e);
      this.clearSession();
      return null;
    }
  },

  getCurrentUser() {
    const s = this.getSession();
    return s ? s.user : null;
  },

  isAuthenticated() {
    return this.getSession() !== null;
  },

  async login(email, password) {
    try {
      if (!this.validateEmail(email)) throw new Error('Email inválido');
      if (!password || password.length < 6) throw new Error('Contraseña debe tener al menos 6 caracteres');

      const session = {
        user: {
          id: this.generateId(),
          email,
          name: email.split('@')[0],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=C8A752&color=0B0C0F&bold=true`,
          role: 'user',
          createdAt: new Date().toISOString(),
        },
        token: this.generateToken(),
        refreshToken: this.generateToken(),
        expiresAt: Date.now() + this.config.sessionDuration,
        createdAt: Date.now(),
      };
      this.saveSession(session);
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: session.user } }));
      return { success: true, user: session.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async register(email, password, name) {
    try {
      if (!this.validateEmail(email)) throw new Error('Email inválido');
      if (!password || password.length < 8) throw new Error('Contraseña debe tener al menos 8 caracteres');
      if (!name || name.trim().length < 2) throw new Error('Nombre debe tener al menos 2 caracteres');

      const session = {
        user: {
          id: this.generateId(),
          email,
          name: name.trim(),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C8A752&color=0B0C0F&bold=true`,
          role: 'user',
          createdAt: new Date().toISOString(),
        },
        token: this.generateToken(),
        refreshToken: this.generateToken(),
        expiresAt: Date.now() + this.config.sessionDuration,
        createdAt: Date.now(),
      };
      this.saveSession(session);
      window.dispatchEvent(new CustomEvent('auth:register', { detail: { user: session.user } }));
      return { success: true, user: session.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  logout() {
    const user = this.getCurrentUser();
    this.clearSession();
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { user } }));

    const currentPath = window.location.pathname;
    const isProtected = this.config.protectedRoutes.some(route => currentPath.includes(route));
    if (isProtected) setTimeout(() => (window.location.href = '/'), 100);
  },

  saveSession(session) {
    localStorage.setItem(this.config.storageKey, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem('gg:auth');   // legacy
    localStorage.removeItem('goldAuth');  // legacy
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  generateId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  },

  generateToken() {
    return btoa(Math.random().toString(36) + Date.now()).substring(0, 64);
  },

  async requestPasswordReset(email) {
    try {
      if (!this.validateEmail(email)) throw new Error('Email inválido');
      return { success: true, message: 'Instrucciones enviadas a tu email' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateProfile(updates) {
    try {
      const session = this.getSession();
      if (!session) throw new Error('No hay sesión activa');
      if (updates.email && !this.validateEmail(updates.email)) throw new Error('Email inválido');
      if (updates.name && updates.name.trim().length < 2) throw new Error('Nombre debe tener al menos 2 caracteres');

      session.user = { ...session.user, ...updates, updatedAt: new Date().toISOString() };
      this.saveSession(session);
      window.dispatchEvent(new CustomEvent('auth:profileUpdated', { detail: { user: session.user } }));
      return { success: true, user: session.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  refreshSession() {
    const session = this.getSession();
    if (!session) return false;
    session.expiresAt = Date.now() + this.config.sessionDuration;
    this.saveSession(session);
    return true;
  },
};

// Migración sesiones legacy si no hay sesión activa
(function migrateLegacySessions() {
  if (AuthClient.isAuthenticated()) return;
  const legacyAuth = localStorage.getItem('gg:auth');
  if (legacyAuth) {
    try {
      const session = {
        user: {
          id: AuthClient.generateId(),
          email: legacyAuth,
          name: legacyAuth.split('@')[0],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(legacyAuth)}&background=C8A752&color=0B0C0F&bold=true`,
          role: 'user',
          createdAt: new Date().toISOString(),
        },
        token: AuthClient.generateToken(),
        refreshToken: AuthClient.generateToken(),
        expiresAt: Date.now() + AuthClient.config.sessionDuration,
        createdAt: Date.now(),
      };
      AuthClient.saveSession(session);
      localStorage.removeItem('gg:auth');
      return;
    } catch (e) {}
  }
  const goldAuth = localStorage.getItem('goldAuth');
  if (goldAuth) {
    try {
      const parsed = JSON.parse(goldAuth);
      if (parsed.currentUser) {
        const session = {
          user: parsed.currentUser,
          token: AuthClient.generateToken(),
          refreshToken: AuthClient.generateToken(),
          expiresAt: Date.now() + AuthClient.config.sessionDuration,
          createdAt: Date.now(),
        };
        AuthClient.saveSession(session);
        localStorage.removeItem('goldAuth');
        console.log('[Auth] ✅ Migración desde goldAuth exitosa');
        return;
      }
    } catch (e) { console.warn('[Auth] ⚠ Error migrando goldAuth:', e); }
  }
  console.log('[Auth] ℹ No hay sesiones legacy para migrar');
})();

// Auto-refresh cada 30 minutos
setInterval(() => {
  if (AuthClient.isAuthenticated()) {
    AuthClient.refreshSession();
  }
}, 30 * 60 * 1000);

// Export
window.AuthClient = AuthClient;
console.log('[Auth] ✅ AuthClient v2.0 inicializado');
console.log('[Auth] ✅ AuthClient v2.0 inicializado');
    } catch (e) { console.warn('[Auth] ⚠ Error migrando goldAuth:', e); }
  }
  console.log('[Auth] ℹ No hay sesiones legacy para migrar');
})();

// Auto-refresh cada 30 minutos
setInterval(() => {
  if (AuthClient.isAuthenticated()) AuthClient.refreshSession();
}, 30 * 60 * 1000);

// Export
window.AuthClient = AuthClient;
console.log('[Auth] ✅ AuthClient v2.0 inicializado');
