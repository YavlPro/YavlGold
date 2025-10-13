/**
 * YAVLGOLD - AUTH GUARD v2.0.1
 */
const AuthGuard = {
  protectedPaths: ['/herramientas/', '/dashboard/', '/profile/', '/settings/'],
  publicPaths: ['/', '/index.html', '/comunidad/', '/academia/'],

  isProtectedRoute(path = window.location.pathname) {
    const p = path === '/' ? '/' : path.replace(/\/$/, '');
    return this.protectedPaths.some(pp => p === pp.replace(/\/$/, '') || p.startsWith(pp.replace(/\/$/, '')));
  },
  isPublicRoute(path = window.location.pathname) {
    const p = path === '/' ? '/' : path.replace(/\/$/, '');
    return this.publicPaths.some(pub => p === pub || p.startsWith(pub));
  },

  check() {
    const current = window.location.pathname;
    if (!this.isProtectedRoute(current)) return true;
    if (window.AuthClient?.isAuthenticated()) {
      console.log('[AuthGuard] ✅ Acceso permitido:', current);
      return true;
    }
    console.warn('[AuthGuard] ⛔ Acceso denegado:', current);
    this.redirectToLogin(current + window.location.search + window.location.hash);
    return false;
  },

  protectLinks() {
    const links = document.querySelectorAll('[data-protected="true"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        if (!window.AuthClient?.isAuthenticated()) {
          e.preventDefault(); e.stopPropagation();
          const href = link.getAttribute('href') || (window.location.pathname + window.location.search + window.location.hash);
          this.redirectToLogin(href);
        }
      }, { capture: true });
      if (!window.AuthClient?.isAuthenticated() && !link.querySelector('.lock-icon')) {
        const i = document.createElement('i');
        i.className = 'fas fa-lock lock-icon';
        i.style.cssText = 'margin-left:6px;font-size:0.8em;opacity:.7;';
        link.appendChild(i);
      }
    });
    console.log(`[AuthGuard] 🔒 ${links.length} enlaces protegidos`);
  },

  redirectToLogin(intended = null) {
    try { if (intended && intended !== '/') sessionStorage.setItem('gg:redirectAfterLogin', intended); } catch (_) {}
    if (window.AuthUI?.showLoginModal) window.AuthUI.showLoginModal();
    else { alert('Debes iniciar sesión para acceder.'); setTimeout(() => (window.location.href = '/'), 1500); }
  },

  redirectAfterLogin() {
    const intended = sessionStorage.getItem('gg:redirectAfterLogin');
    if (intended) { sessionStorage.removeItem('gg:redirectAfterLogin'); setTimeout(() => (window.location.href = intended), 800); return; }
    setTimeout(() => (window.location.href = '/dashboard/'), 800);
  },

  hasRole(requiredRole) {
    const user = window.AuthClient?.getCurrentUser();
    if (!user) return false;
    const hierarchy = { admin: 3, moderator: 2, user: 1 };
    return (hierarchy[user.role] || 0) >= (hierarchy[requiredRole] || 0);
  },
  checkRole(requiredRole) {
    if (!this.check()) return false;
    if (!this.hasRole(requiredRole)) {
      console.warn(`[AuthGuard] ⛔ Rol insuficiente: ${requiredRole}`);
      if (window.AuthUI) window.AuthUI.showError('generic', 'No tienes permisos para acceder.');
      else alert('No tienes permisos para acceder.');
      setTimeout(() => (window.location.href = '/dashboard/'), 1500);
      return false;
    }
    return true;
  },
  protectByRole() {
    const user = window.AuthClient?.getCurrentUser();
    if (!user) return;
    document.querySelectorAll('[data-role]').forEach(el => {
      const req = el.getAttribute('data-role');
      el.style.display = this.hasRole(req) ? '' : 'none';
    });
  },

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[AuthGuard] 🚀 Inicializando...');
      this.check();
      this.protectLinks();
      if (window.AuthClient?.isAuthenticated()) this.protectByRole();
    });
    window.addEventListener('auth:login', () => { this.protectLinks(); this.protectByRole(); this.redirectAfterLogin(); });
    window.addEventListener('auth:logout', () => { this.protectLinks(); if (this.isProtectedRoute()) setTimeout(() => (window.location.href = '/'), 500); });
  },
};

AuthGuard.init();
window.AuthGuard = AuthGuard;
console.log('[AuthGuard] ✅ AuthGuard v2.0.1 cargado');
