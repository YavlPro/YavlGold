/**
 * YAVL ECOSYSTEM - AUTH GUARD
 * Sistema de protección de rutas y control de acceso
 * Migrado desde YavlGold/assets/js/auth/authGuard.js
 */

import { authClient } from './authClient.js';

export const authGuard = {
  protectedPaths: ['/herramientas/', '/dashboard/', '/profile/', '/settings/'],
  publicPaths: ['/', '/index.html', '/comunidad/', '/academia/'],

  /**
   * Verifica si una ruta es protegida
   * @param {string} path - Ruta a verificar
   * @returns {boolean}
   */
  isProtectedRoute(path = window.location.pathname) {
    const p = path === '/' ? '/' : path.replace(/\/$/, '');
    return this.protectedPaths.some(pp => 
      p === pp.replace(/\/$/, '') || p.startsWith(pp.replace(/\/$/, ''))
    );
  },

  /**
   * Verifica si una ruta es pública
   * @param {string} path - Ruta a verificar
   * @returns {boolean}
   */
  isPublicRoute(path = window.location.pathname) {
    const p = path === '/' ? '/' : path.replace(/\/$/, '');
    return this.publicPaths.some(pub => p === pub || p.startsWith(pub));
  },

  /**
   * Verifica acceso a la ruta actual
   * @returns {boolean}
   */
  check() {
    const current = window.location.pathname;
    if (!this.isProtectedRoute(current)) return true;
    
    if (authClient.isAuthenticated()) {
      console.log('[AuthGuard] ✅ Acceso permitido:', current);
      return true;
    }
    
    console.warn('[AuthGuard] ⛔ Acceso denegado:', current);
    this.redirectToLogin(current + window.location.search + window.location.hash);
    return false;
  },

  /**
   * Protege enlaces con data-protected="true"
   */
  protectLinks() {
    const links = document.querySelectorAll('[data-protected="true"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        if (!authClient.isAuthenticated()) {
          e.preventDefault();
          e.stopPropagation();
          const href = link.getAttribute('href') || 
            (window.location.pathname + window.location.search + window.location.hash);
          this.redirectToLogin(href);
        }
      }, { capture: true });
      
      // Agregar icono de candado a enlaces protegidos
      if (!authClient.isAuthenticated() && !link.querySelector('.lock-icon')) {
        const i = document.createElement('i');
        i.className = 'fas fa-lock lock-icon';
        i.style.cssText = 'margin-left:6px;font-size:0.8em;opacity:.7;';
        link.appendChild(i);
      }
    });
    console.log(`[AuthGuard] 🔒 ${links.length} enlaces protegidos`);
  },

  /**
   * Redirige al login guardando la intención de navegación
   * @param {string} intended - URL a la que se quería acceder
   */
  redirectToLogin(intended = null) {
    try {
      if (intended && intended !== '/') {
        sessionStorage.setItem('yavl:redirectAfterLogin', intended);
      }
    } catch (_) {}
    
    // Intentar mostrar modal de login si está disponible
    if (window.AuthUI?.showLoginModal) {
      window.AuthUI.showLoginModal();
    } else {
      alert('Debes iniciar sesión para acceder.');
      setTimeout(() => (window.location.href = '/'), 1500);
    }
  },

  /**
   * Redirige después del login a la URL guardada o al dashboard
   */
  redirectAfterLogin() {
    const intended = sessionStorage.getItem('yavl:redirectAfterLogin');
    if (intended) {
      sessionStorage.removeItem('yavl:redirectAfterLogin');
      setTimeout(() => (window.location.href = intended), 800);
      return;
    }
    setTimeout(() => (window.location.href = '/dashboard/'), 800);
  },

  /**
   * Verifica si el usuario tiene un rol específico
   * @param {string} requiredRole - Rol requerido
   * @returns {Promise<boolean>}
   */
  async hasRole(requiredRole) {
    const user = authClient.getCurrentUser();
    if (!user) {
      console.warn('[AuthGuard] ⚠️ No hay usuario autenticado');
      return false;
    }

    // Si ProfileManager está disponible, consultar is_admin desde base de datos
    if (window.ProfileManager && requiredRole === 'admin') {
      try {
        console.log('[AuthGuard] 🔍 Verificando admin para user.id:', user.id);
        const result = await ProfileManager.isAdmin(user.id);
        console.log('[AuthGuard] 📊 Resultado de isAdmin:', result);
        return result.success && result.isAdmin;
      } catch (error) {
        console.warn('[AuthGuard] ⚠️ Error al verificar admin, usando fallback:', error.message);
      }
    }

    console.log('[AuthGuard] ⚠️ Usando fallback de roles en sesión. ProfileManager disponible:', !!window.ProfileManager);

    // Fallback al sistema de roles en sesión
    const hierarchy = { admin: 3, moderator: 2, user: 1 };
    return (hierarchy[user.role] || 0) >= (hierarchy[requiredRole] || 0);
  },

  /**
   * Verifica rol y redirige si no tiene permisos
   * @param {string} requiredRole - Rol requerido
   * @returns {Promise<boolean>}
   */
  async checkRole(requiredRole) {
    if (!this.check()) return false;
    
    const hasPermission = await this.hasRole(requiredRole);
    if (!hasPermission) {
      console.warn(`[AuthGuard] ⛔ Rol insuficiente: ${requiredRole}`);
      if (window.AuthUI) {
        window.AuthUI.showError('generic', 'No tienes permisos para acceder.');
      } else {
        alert('No tienes permisos para acceder.');
      }
      setTimeout(() => (window.location.href = '/dashboard/'), 1500);
      return false;
    }
    return true;
  },

  /**
   * Protege elementos del DOM por rol
   */
  async protectByRole() {
    const user = authClient.getCurrentUser();
    if (!user) return;

    // Obtener estado de admin desde base de datos si es posible
    let isAdmin = false;
    if (window.ProfileManager) {
      try {
        const result = await ProfileManager.isAdmin(user.id);
        isAdmin = result.success && result.isAdmin;
      } catch (error) {
        console.warn('[AuthGuard] ⚠️ Error al verificar admin:', error.message);
      }
    }

    document.querySelectorAll('[data-role]').forEach(el => {
      const req = el.getAttribute('data-role');
      let shouldShow = false;

      if (req === 'admin') {
        shouldShow = isAdmin;
      } else {
        shouldShow = this.hasRole(req);
      }

      el.style.display = shouldShow ? '' : 'none';
    });
  },

  /**
   * Inicializa el guard
   */
  init() {
    if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[AuthGuard] 🚀 Inicializando...');
        this.check();
        this.protectLinks();
        if (authClient.isAuthenticated()) {
          this.protectByRole();
        }
      });

      // Event listeners para cambios de auth
      window.addEventListener('auth:signed_in', () => {
        this.protectLinks();
        this.protectByRole();
        this.redirectAfterLogin();
      });

      window.addEventListener('auth:signed_out', () => {
        this.protectLinks();
        if (this.isProtectedRoute()) {
          setTimeout(() => (window.location.href = '/'), 500);
        }
      });
    }
  }
};

// Auto-init
authGuard.init();

// Soporte para uso global (backward compatibility)
if (typeof window !== 'undefined') {
  window.AuthGuard = authGuard;
}

console.log('[AuthGuard] ✅ AuthGuard cargado');
