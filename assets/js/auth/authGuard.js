/**
 * GLOBALGOLD - AUTH GUARD v2.0
 */
const AuthGuard = {
  protectedPaths: ['/herramientas/', '/dashboard/'],

  isProtectedRoute(path = window.location.pathname) {
    return this.protectedPaths.some(p => path === p || path.startsWith(p) || path.includes(p));
  },

  check() {
    const currentPath = window.location.pathname;
    if (!this.isProtectedRoute(currentPath)) return true;

    if (window.AuthClient && window.AuthClient.isAuthenticated()) return true;

    this.redirectToLogin(currentPath + window.location.search + window.location.hash);
    return false;
  },

  redirectToLogin(intended) {
    try { sessionStorage.setItem('gg:intended', intended); } catch (_) {}
    window.location.href = '/dashboard/?needLogin=1#login';
  },

  protectLinks() {
    const links = document.querySelectorAll('a[data-protected="true"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const authed = window.AuthClient && window.AuthClient.isAuthenticated();
        if (!authed) {
          e.preventDefault();
          e.stopPropagation();
          const href = link.getAttribute('href') || (window.location.pathname + window.location.search + window.location.hash);
          this.redirectToLogin(href);
        }
      }, { capture: true });
    });
  },

  restoreIntendedOnLogin() {
    window.addEventListener('auth:login', () => {
      const intended = sessionStorage.getItem('gg:intended');
      if (intended) {
        sessionStorage.removeItem('gg:intended');
        window.location.href = intended;
      }
    });
  },

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.protectLinks();
      this.check();
    });
    this.restoreIntendedOnLogin();
  },
};

// Auto-init y export
AuthGuard.init();
window.AuthGuard = AuthGuard;
