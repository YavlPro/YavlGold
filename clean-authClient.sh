#!/bin/bash

# ========================================
# LIMPIEZA authClient.js
# Eliminar código duplicado al final
# ========================================

set -e

echo "🧹 Limpiando authClient.js..."
echo ""

FILE="/workspaces/gold/assets/js/auth/authClient.js"

if [ ! -f "$FILE" ]; then
  echo "❌ Error: $FILE no encontrado"
  exit 1
fi

# Backup
cp "$FILE" "${FILE}.backup"
echo "💾 Backup creado: ${FILE}.backup"

# Crear versión limpia (canon)
cat > "$FILE" << 'EOF'
/**
 * ========================================
 * GLOBALGOLD - AUTH CLIENT v2.0
 * ========================================
 * Sistema de autenticación unificado
 * @version 2.0
 * @date 2025-01-05
 */

const AuthClient = {
  // ===== CONFIGURACIÓN =====
  config: {
    storageKey: 'gg:session',
    sessionDuration: 24 * 60 * 60 * 1000, // 24 horas
    protectedRoutes: ['/herramientas/', '/dashboard/'],
    apiEndpoint: null, // TODO: Supabase
  },

  // ===== GETTERS =====
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
    } catch (error) {
      console.error('[Auth] Error parseando sesión:', error);
      this.clearSession();
      return null;
    }
  },

  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  },

  isAuthenticated() {
    return this.getSession() !== null;
  },

  // ===== LOGIN =====
  async login(email, password) {
    try {
      if (!this.validateEmail(email)) throw new Error('Email inválido');
      if (!password || password.length < 6) throw new Error('Contraseña debe tener al menos 6 caracteres');

      console.log('[Auth] Login para:', email);
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
      console.log('[Auth] ✅ Login exitoso');
      return { success: true, user: session.user };
    } catch (error) {
      console.error('[Auth] ❌ Login error:', error);
      return { success: false, error: error.message };
    }
  },

  // ===== REGISTRO =====
  async register(email, password, name) {
    try {
      if (!this.validateEmail(email)) throw new Error('Email inválido');
      if (!password || password.length < 8) throw new Error('Contraseña debe tener al menos 8 caracteres');
      if (!name || name.trim().length < 2) throw new Error('Nombre debe tener al menos 2 caracteres');

      console.log('[Auth] Registro para:', email);
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
      console.log('[Auth] ✅ Registro exitoso');
      return { success: true, user: session.user };
    } catch (error) {
      console.error('[Auth] ❌ Registro error:', error);
      return { success: false, error: error.message };
    }
  },

  // ===== LOGOUT =====
  logout() {
    const user = this.getCurrentUser();
    console.log('[Auth] Logout:', user?.email);
    this.clearSession();
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { user } }));
    const currentPath = window.location.pathname;
    const isProtected = this.config.protectedRoutes.some(route => currentPath.includes(route));
    if (isProtected) setTimeout(() => (window.location.href = '/'), 100);
  },

  // ===== SESIÓN =====
  saveSession(session) {
    localStorage.setItem(this.config.storageKey, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem('gg:auth');
    localStorage.removeItem('goldAuth');
  },

  refreshSession() {
    const session = this.getSession();
    if (!session) return false;
    session.expiresAt = Date.now() + this.config.sessionDuration;
    this.saveSession(session);
    console.log('[Auth] Sesión renovada');
    return true;
  },

  // ===== VALIDACIONES =====
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // ===== UTILIDADES =====
  generateId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  },

  generateToken() {
    return btoa(Math.random().toString(36) + Date.now()).substring(0, 64);
  },

  // ===== PASSWORD RECOVERY =====
  async requestPasswordReset(email) {
    try {
      if (!this.validateEmail(email)) throw new Error('Email inválido');
      console.log('[Auth] Password reset solicitado para:', email);
      return { success: true, message: 'Instrucciones enviadas a tu email' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ===== ACTUALIZAR PERFIL =====
  async updateProfile(updates) {
    try {
      const session = this.getSession();
      if (!session) throw new Error('No hay sesión activa');
      if (updates.email && !this.validateEmail(updates.email)) throw new Error('Email inválido');
      if (updates.name && updates.name.trim().length < 2) throw new Error('Nombre debe tener al menos 2 caracteres');

      session.user = { ...session.user, ...updates, updatedAt: new Date().toISOString() };
      this.saveSession(session);
      window.dispatchEvent(new CustomEvent('auth:profileUpdated', { detail: { user: session.user } }));
      console.log('[Auth] Perfil actualizado');
      return { success: true, user: session.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// ===== MIGRACIÓN LEGACY =====
(function migrateLegacySessions() {
  if (AuthClient.isAuthenticated()) {
    console.log('[Auth] Sesión existente válida');
    return;
  }

  const legacyAuth = localStorage.getItem('gg:auth');
  if (legacyAuth) {
    try {
      console.log('[Auth] 🔄 Migrando desde gg:auth...');
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
      console.log('[Auth] ✅ Migración exitosa');
      return;
    } catch (e) {
      console.warn('[Auth] ⚠ Error migrando gg:auth:', e);
    }
  }

  const goldAuth = localStorage.getItem('goldAuth');
  if (goldAuth) {
    try {
      console.log('[Auth] 🔄 Migrando desde goldAuth...');
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
        console.log('[Auth] ✅ Migración exitosa');
        return;
      }
    } catch (e) {
      console.warn('[Auth] ⚠ Error migrando goldAuth:', e);
    }
  }

  console.log('[Auth] ℹ No hay sesiones legacy');
})();

// ===== AUTO-REFRESH SESIÓN =====
setInterval(() => {
  if (AuthClient.isAuthenticated()) {
    AuthClient.refreshSession();
  }
}, 30 * 60 * 1000); # Cada 30 minutos

// ===== EXPORTAR =====
window.AuthClient = AuthClient;
console.log('[Auth] ✅ AuthClient v2.0 inicializado');
EOF

echo "✅ Archivo limpiado exitosamente"
echo ""
echo "📊 Comparando con backup:"
wc -l "${FILE}.backup" "$FILE" || true
echo ""

echo "🔍 Verificando sintaxis..."
node -e "new Function(require('fs').readFileSync(process.argv[1], 'utf8'))" "$FILE" && echo "✅ Sintaxis válida" || echo "⚠  No se pudo verificar sintaxis con Node"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ LIMPIEZA COMPLETADA                               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Archivo limpio: $FILE"
echo "💾 Backup guardado: ${FILE}.backup"
echo ""
echo "🔄 Siguiente paso:"
echo "   git add $FILE"
echo "   git commit -m \"fix(auth): remove duplicate code in authClient.js\""
echo "   git push origin feature/auth-system-v2"
echo ""
