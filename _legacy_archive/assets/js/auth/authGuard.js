/**
 * YAVLGOLD - AUTH GUARD v2.0.2
 * Updated for GitHub Pages relative paths
 */
const AuthGuard = {
  protectedPaths: ['/herramientas/', '/dashboard/', '/profile/', '/settings/', 'herramientas/', 'dashboard/', 'profile/', 'settings/'],
  publicPaths: ['/', '/index.html', '/comunidad/', '/academia/', 'index.html', 'comunidad/', 'academia/'],

  isProtectedRoute(path = window.location.pathname) {
    // Normalizar la ruta eliminando el prefijo del repo si existe
    const normalizedPath = path.replace(/^\/[^/]+\//, '/');
    const p = normalizedPath === '/' ? '/' : normalizedPath.replace(/\/$/, '');
    
    return this.protectedPaths.some(pp => {
      const normalized = pp.replace(/^\//, '').replace(/\/$/, '');
      return p.includes(normalized) || p === '/' + normalized || p.endsWith('/' + normalized);
    });
  },
  
  isPublicRoute(path = window.location.pathname) {
    const normalizedPath = path.replace(/^\/[^/]+\//, '/');
    const p = normalizedPath === '/' ? '/' : normalizedPath.replace(/\/$/, '');
    return this.publicPaths.some(pub => p === pub || p.startsWith(pub) || p === '/' + pub.replace(/^\//, ''));
  },

  check() {
    const current = window.location.pathname;
    if (!this.isProtectedRoute(current)) return true;
    if (window.AuthClient?.isAuthenticated()) {
      console.log('[AuthGuard] ✅ Acceso permitido:', current);
      return true;
    }
    console.warn('[AuthGuard] ⛔ Acceso denegado:', current);
    // Bloquear contenido inmediatamente
    if (document.body) {
      document.body.style.display = 'none';
    }
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
    else { 
      alert('Debes iniciar sesión para acceder.'); 
      // Redirigir a la página principal (relativa al repo)
      setTimeout(() => {
        // Detectar si estamos en un subdirectorio y ajustar la ruta
        const pathParts = window.location.pathname.split('/').filter(p => p);
        if (pathParts.length > 1) {
          window.location.href = '../';
        } else {
          window.location.href = './';
        }
      }, 1500); 
    }
  },

  redirectAfterLogin() {
    const intended = sessionStorage.getItem('gg:redirectAfterLogin');
    if (intended) { 
      sessionStorage.removeItem('gg:redirectAfterLogin'); 
      setTimeout(() => (window.location.href = intended), 800); 
      return; 
    }
    // Redirigir al dashboard con ruta relativa
    setTimeout(() => (window.location.href = './dashboard/'), 800);
  },

  async hasRole(requiredRole) {
    const user = window.AuthClient?.getCurrentUser();
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

  async checkRole(requiredRole) {
    if (!this.check()) return false;
    const hasPermission = await this.hasRole(requiredRole);
    if (!hasPermission) {
      console.warn(`[AuthGuard] ⛔ Rol insuficiente: ${requiredRole}`);
      if (window.AuthUI) window.AuthUI.showError('generic', 'No tienes permisos para acceder.');
      else alert('No tienes permisos para acceder.');
      setTimeout(() => (window.location.href = '/dashboard/'), 1500);
      return false;
    }
    return true;
  },

  async protectByRole() {
    const user = window.AuthClient?.getCurrentUser();
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

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[AuthGuard] 🚀 Inicializando...');
      this.check();
      this.protectLinks();
      if (window.AuthClient?.isAuthenticated()) this.protectByRole();
    });
    window.addEventListener('auth:login', () => { this.protectLinks(); this.protectByRole(); this.redirectAfterLogin(); });
    window.addEventListener('auth:logout', () => { 
      this.protectLinks(); 
      if (this.isProtectedRoute()) {
        setTimeout(() => {
          // Detectar nivel de carpeta y redirigir apropiadamente
          const pathParts = window.location.pathname.split('/').filter(p => p);
          if (pathParts.length > 1) {
            window.location.href = '../';
          } else {
            window.location.href = './';
          }
        }, 500);
      }
    });
  },
};

AuthGuard.init();
window.AuthGuard = AuthGuard;
console.log('[AuthGuard] ✅ AuthGuard v2.0.2 cargado (GitHub Pages compatible)');
