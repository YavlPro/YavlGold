# 🔐 Guía de Implementación para YavlGold (Vanilla JS + Supabase)

**Stack Actual:** Vanilla JavaScript + Supabase  
**Fecha:** 18 de octubre de 2025

---

## 📋 Tu Implementación Actual

### ✅ Lo que ya tienes implementado:

1. **AuthClient** (`/assets/js/auth/authClient.js`)
2. **AuthGuard** (`/assets/js/auth/authGuard.js`) 
3. **ThemeManager** (`/assets/js/themeManager.js`)
4. **Protección inline** en páginas críticas

### 🎯 Mejoras Recomendadas

---

## 1. Mejorar AuthClient con Refresh Automático

```javascript
// /assets/js/auth/authClient.js - VERSIÓN MEJORADA

const AuthClient = {
  supabase: null,
  session: null,
  user: null,
  refreshTimer: null,

  /**
   * Inicializar Supabase
   */
  init() {
    const SUPABASE_URL = 'https://ndojapkfhqbgiqtixiqo.supabase.co';
    const SUPABASE_ANON_KEY = 'tu_anon_key_aqui';
    
    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Cargar sesión existente
    this.loadSession();
    
    // Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthClient] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.handleSessionChange(session);
      } else if (event === 'SIGNED_OUT') {
        this.handleLogout();
      }
    });
    
    // Configurar refresh automático
    this.setupAutoRefresh();
    
    console.log('[AuthClient] ✅ Inicializado');
  },

  /**
   * Cargar sesión desde Supabase
   */
  async loadSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        this.handleSessionChange(session);
      }
    } catch (error) {
      console.error('[AuthClient] Error al cargar sesión:', error);
    }
  },

  /**
   * Manejar cambio de sesión
   */
  handleSessionChange(session) {
    if (!session) return;
    
    this.session = session;
    this.user = session.user;
    
    // Guardar en sessionStorage para verificación rápida
    sessionStorage.setItem('gg:session', JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user
    }));
    
    // Disparar evento
    window.dispatchEvent(new CustomEvent('auth:session-updated', {
      detail: { session, user: session.user }
    }));
  },

  /**
   * Configurar refresh automático de token
   */
  setupAutoRefresh() {
    // Limpiar timer anterior si existe
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    // Verificar cada minuto si el token necesita renovarse
    this.refreshTimer = setInterval(async () => {
      const session = this.getSession();
      
      if (!session) return;
      
      // Renovar si faltan menos de 5 minutos para expirar
      const expiresAt = session.expires_at * 1000; // Convertir a ms
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0) {
        console.log('[AuthClient] 🔄 Renovando token...');
        await this.refreshSession();
      }
    }, 60000); // Cada minuto
  },

  /**
   * Refrescar sesión manualmente
   */
  async refreshSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (session) {
        this.handleSessionChange(session);
        console.log('[AuthClient] ✅ Token renovado');
      }
      
      return { success: true };
    } catch (error) {
      console.error('[AuthClient] ❌ Error al renovar token:', error);
      
      // Si el refresh falla, cerrar sesión
      this.logout();
      
      return { success: false, error: error.message };
    }
  },

  /**
   * Login con email y password
   */
  async login(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.handleSessionChange(data.session);
      
      window.dispatchEvent(new CustomEvent('auth:login', {
        detail: { user: data.user }
      }));

      return { success: true, user: data.user };
    } catch (error) {
      console.error('[AuthClient] Error en login:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Registro
   */
  async register(email, password, metadata = {}) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata // username, etc.
        }
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error) {
      console.error('[AuthClient] Error en registro:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await this.supabase.auth.signOut();
      this.handleLogout();
      
      return { success: true };
    } catch (error) {
      console.error('[AuthClient] Error en logout:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Manejar logout localmente
   */
  handleLogout() {
    this.session = null;
    this.user = null;
    
    // Limpiar storage
    sessionStorage.removeItem('gg:session');
    localStorage.removeItem('sb-ndojapkfhqbgiqtixiqo-auth-token');
    
    // Limpiar timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },

  /**
   * Obtener sesión actual
   */
  getSession() {
    // Primero intentar de memoria
    if (this.session) return this.session;
    
    // Luego de sessionStorage
    try {
      const stored = sessionStorage.getItem('gg:session');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[AuthClient] Error al parsear sesión:', error);
    }
    
    return null;
  },

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    const session = this.getSession();
    return session?.user || null;
  },

  /**
   * Verificar si está autenticado
   */
  isAuthenticated() {
    const session = this.getSession();
    
    if (!session) return false;
    
    // Verificar si el token no ha expirado
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    
    return now < expiresAt;
  },

  /**
   * Obtener token de acceso
   */
  getAccessToken() {
    const session = this.getSession();
    return session?.access_token || null;
  },

  /**
   * Verificar rol del usuario
   */
  async hasRole(requiredRole) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Si ProfileManager está disponible, usar la DB
    if (window.ProfileManager) {
      try {
        const result = await ProfileManager.isAdmin(user.id);
        if (requiredRole === 'admin') {
          return result.success && result.isAdmin;
        }
      } catch (error) {
        console.error('[AuthClient] Error al verificar rol:', error);
      }
    }
    
    // Fallback a metadatos del usuario
    const userRole = user.user_metadata?.role || 'user';
    const roleHierarchy = { admin: 3, moderator: 2, user: 1 };
    
    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
  }
};

// Auto-inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AuthClient.init());
} else {
  AuthClient.init();
}

window.AuthClient = AuthClient;
```

---

## 2. Protección Avanzada con Redirección Inteligente

```javascript
// /assets/js/auth/authGuard.js - VERSIÓN MEJORADA

const AuthGuard = {
  protectedPaths: [
    '/dashboard/',
    '/dashboard/perfil.html',
    '/dashboard/configuracion.html',
    '/herramientas/',
    '/herramientas/calculadora.html',
    '/herramientas/conversor.html',
    '/herramientas/analisis.html',
    '/profile/',
    '/settings/'
  ],
  
  publicPaths: [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/comunidad/',
    '/academia/',
    '/go/'
  ],

  /**
   * Verificar si la ruta actual está protegida
   */
  isProtectedRoute(path = window.location.pathname) {
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    return this.protectedPaths.some(protectedPath => {
      return normalizedPath.startsWith(protectedPath) || 
             path.includes(protectedPath.replace('/', ''));
    });
  },

  /**
   * Verificar autenticación con timeout
   */
  async checkWithTimeout(timeout = 3000) {
    return Promise.race([
      this.check(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  },

  /**
   * Verificar acceso (versión mejorada)
   */
  async check() {
    const currentPath = window.location.pathname;
    
    // Si no es ruta protegida, permitir
    if (!this.isProtectedRoute(currentPath)) {
      return true;
    }

    // Mostrar loading mientras verifica
    this.showLoadingOverlay();

    try {
      // Esperar a que AuthClient esté listo
      if (!window.AuthClient) {
        await this.waitForAuthClient();
      }

      // Verificar autenticación
      const isAuth = window.AuthClient.isAuthenticated();

      if (isAuth) {
        console.log('[AuthGuard] ✅ Acceso permitido:', currentPath);
        this.hideLoadingOverlay();
        return true;
      }

      // No autenticado, bloquear y redirigir
      console.warn('[AuthGuard] ⛔ Acceso denegado:', currentPath);
      document.body.style.display = 'none';
      
      this.redirectToLogin(currentPath + window.location.search + window.location.hash);
      return false;

    } catch (error) {
      console.error('[AuthGuard] Error en verificación:', error);
      document.body.style.display = 'none';
      this.redirectToLogin(currentPath);
      return false;
    }
  },

  /**
   * Esperar a que AuthClient esté disponible
   */
  waitForAuthClient(maxWait = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        if (window.AuthClient) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > maxWait) {
          clearInterval(checkInterval);
          reject(new Error('AuthClient no disponible'));
        }
      }, 100);
    });
  },

  /**
   * Mostrar overlay de carga
   */
  showLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'auth-loading-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(11, 12, 15, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      ">
        <div style="text-align: center;">
          <div style="
            border: 4px solid rgba(200, 167, 82, 0.1);
            border-top: 4px solid #C8A752;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          "></div>
          <p style="color: #C8A752; font-family: 'Montserrat', sans-serif;">
            Verificando acceso...
          </p>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
  },

  /**
   * Ocultar overlay de carga
   */
  hideLoadingOverlay() {
    const overlay = document.getElementById('auth-loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  },

  /**
   * Redirigir a login con mensaje
   */
  redirectToLogin(intendedPath = null) {
    try {
      if (intendedPath && intendedPath !== '/') {
        sessionStorage.setItem('gg:redirectAfterLogin', intendedPath);
      }
    } catch (error) {
      console.error('[AuthGuard] Error al guardar redirección:', error);
    }

    // Intentar mostrar modal de login si está disponible
    if (window.AuthUI?.showLoginModal) {
      window.AuthUI.showLoginModal();
    } else {
      // Fallback: redirigir a home con hash de login
      setTimeout(() => {
        window.location.href = '/#login';
      }, 500);
    }
  },

  /**
   * Redirigir después del login
   */
  redirectAfterLogin() {
    try {
      const intended = sessionStorage.getItem('gg:redirectAfterLogin');
      
      if (intended) {
        sessionStorage.removeItem('gg:redirectAfterLogin');
        setTimeout(() => {
          window.location.href = intended;
        }, 800);
        return;
      }
    } catch (error) {
      console.error('[AuthGuard] Error al leer redirección:', error);
    }

    // Default: ir al dashboard
    setTimeout(() => {
      window.location.href = '/dashboard/';
    }, 800);
  },

  /**
   * Proteger enlaces
   */
  protectLinks() {
    const links = document.querySelectorAll('[data-protected="true"]');
    
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        if (!window.AuthClient?.isAuthenticated()) {
          e.preventDefault();
          e.stopPropagation();
          
          const href = link.getAttribute('href') || window.location.pathname;
          this.redirectToLogin(href);
        }
      }, { capture: true });

      // Agregar icono de candado visual
      if (!window.AuthClient?.isAuthenticated() && !link.querySelector('.lock-icon')) {
        const icon = document.createElement('i');
        icon.className = 'fas fa-lock lock-icon';
        icon.style.cssText = 'margin-left:6px;font-size:0.8em;opacity:.7;';
        link.appendChild(icon);
      }
    });

    console.log(`[AuthGuard] 🔒 ${links.length} enlaces protegidos`);
  },

  /**
   * Verificar rol para contenido específico
   */
  async checkRole(requiredRole) {
    if (!this.check()) return false;

    const hasPermission = await window.AuthClient.hasRole(requiredRole);

    if (!hasPermission) {
      console.warn(`[AuthGuard] ⛔ Rol insuficiente: ${requiredRole}`);
      
      if (window.AuthUI) {
        window.AuthUI.showError('generic', 'No tienes permisos para acceder.');
      } else {
        alert('No tienes permisos para acceder a este contenido.');
      }

      setTimeout(() => {
        window.location.href = '/dashboard/';
      }, 1500);

      return false;
    }

    return true;
  },

  /**
   * Proteger elementos por rol
   */
  async protectByRole() {
    const user = window.AuthClient?.getCurrentUser();
    if (!user) return;

    // Obtener rol desde DB si es posible
    let isAdmin = false;
    if (window.ProfileManager) {
      try {
        const result = await ProfileManager.isAdmin(user.id);
        isAdmin = result.success && result.isAdmin;
      } catch (error) {
        console.error('[AuthGuard] Error al verificar admin:', error);
      }
    }

    // Ocultar/mostrar elementos según rol
    document.querySelectorAll('[data-role]').forEach(el => {
      const requiredRole = el.getAttribute('data-role');
      let shouldShow = false;

      if (requiredRole === 'admin') {
        shouldShow = isAdmin;
      } else {
        shouldShow = window.AuthClient.hasRole(requiredRole);
      }

      el.style.display = shouldShow ? '' : 'none';
    });
  },

  /**
   * Inicializar AuthGuard
   */
  init() {
    console.log('[AuthGuard] 🚀 Inicializando...');

    // Verificar en DOMContentLoaded
    document.addEventListener('DOMContentLoaded', async () => {
      await this.check();
      this.protectLinks();
      
      if (window.AuthClient?.isAuthenticated()) {
        await this.protectByRole();
      }
    });

    // Escuchar eventos de auth
    window.addEventListener('auth:login', async () => {
      this.protectLinks();
      await this.protectByRole();
      this.redirectAfterLogin();
    });

    window.addEventListener('auth:logout', () => {
      this.protectLinks();
      
      if (this.isProtectedRoute()) {
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    });

    // Verificar periódicamente la sesión
    setInterval(() => {
      if (this.isProtectedRoute() && !window.AuthClient?.isAuthenticated()) {
        console.warn('[AuthGuard] ⚠️ Sesión expirada, redirigiendo...');
        this.redirectToLogin(window.location.pathname);
      }
    }, 60000); // Cada minuto
  }
};

// Auto-inicializar
AuthGuard.init();
window.AuthGuard = AuthGuard;

console.log('[AuthGuard] ✅ AuthGuard v2.1 cargado');
```

---

## 3. Sistema de Heartbeat (Keep-Alive)

```javascript
// /assets/js/auth/heartbeat.js - NUEVO ARCHIVO

/**
 * Sistema de heartbeat para mantener sesión activa
 */
const AuthHeartbeat = {
  interval: null,
  HEARTBEAT_INTERVAL: 5 * 60 * 1000, // 5 minutos

  /**
   * Iniciar heartbeat
   */
  start() {
    if (this.interval) {
      this.stop();
    }

    console.log('[Heartbeat] ❤️ Iniciando...');

    this.interval = setInterval(() => {
      this.ping();
    }, this.HEARTBEAT_INTERVAL);

    // Ping inicial
    this.ping();
  },

  /**
   * Detener heartbeat
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[Heartbeat] ⏹️ Detenido');
    }
  },

  /**
   * Hacer ping para mantener sesión
   */
  async ping() {
    try {
      if (!window.AuthClient?.isAuthenticated()) {
        this.stop();
        return;
      }

      console.log('[Heartbeat] 📡 Ping...');

      // Refrescar sesión en Supabase
      const result = await window.AuthClient.refreshSession();

      if (!result.success) {
        console.error('[Heartbeat] ❌ Error en ping, cerrando sesión');
        this.stop();
        window.AuthClient.logout();
      } else {
        console.log('[Heartbeat] ✅ Pong');
      }
    } catch (error) {
      console.error('[Heartbeat] Error:', error);
    }
  },

  /**
   * Inicializar
   */
  init() {
    // Iniciar solo si está autenticado
    if (window.AuthClient?.isAuthenticated()) {
      this.start();
    }

    // Escuchar eventos de auth
    window.addEventListener('auth:login', () => this.start());
    window.addEventListener('auth:logout', () => this.stop());

    console.log('[Heartbeat] ✅ Heartbeat inicializado');
  }
};

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
  AuthHeartbeat.init();
});

window.AuthHeartbeat = AuthHeartbeat;
```

---

## 4. Agregar Scripts en el Orden Correcto

```html
<!-- En TODAS las páginas protegidas -->
<!DOCTYPE html>
<html lang="es">
<head>
  <!-- ... meta tags ... -->
  
  <!-- Supabase PRIMERO -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  
  <!-- Protección inline (solo en páginas protegidas) -->
  <script>
    (function() {
      const session = sessionStorage.getItem('gg:session') || 
                     localStorage.getItem('sb-ndojapkfhqbgiqtixiqo-auth-token');
      if (!session) {
        document.body.style.display = 'none';
        document.addEventListener('DOMContentLoaded', function() {
          sessionStorage.setItem('gg:redirectAfterLogin', window.location.pathname);
          window.location.href = '/#login';
        });
      }
    })();
  </script>
</head>
<body>
  <!-- ... contenido ... -->
  
  <!-- Scripts AL FINAL del body -->
  <script src="/assets/js/themeManager.js"></script>
  <script src="/assets/js/auth/authClient.js"></script>
  <script src="/assets/js/auth/authUI.js"></script>
  <script src="/assets/js/auth/authGuard.js"></script>
  <script src="/assets/js/auth/heartbeat.js"></script> <!-- NUEVO -->
  <script src="/assets/js/script.js"></script>
</body>
</html>
```

---

## 5. Pruebas de Seguridad

### Script de Pruebas

```javascript
// /assets/js/tests/security-tests.js

/**
 * Tests de seguridad para ejecutar en consola
 */
const SecurityTests = {
  async runAll() {
    console.log('🧪 Iniciando tests de seguridad...\n');

    await this.testProtectedRoutes();
    await this.testTokenExpiration();
    await this.testUnauthorizedAccess();
    await this.testSessionPersistence();

    console.log('\n✅ Tests completados');
  },

  async testProtectedRoutes() {
    console.log('📋 Test 1: Rutas protegidas');

    const protectedPaths = [
      '/dashboard/',
      '/herramientas/',
      '/dashboard/perfil.html'
    ];

    // Simular logout
    await window.AuthClient.logout();

    for (const path of protectedPaths) {
      const isProtected = window.AuthGuard.isProtectedRoute(path);
      console.log(`  ${path}: ${isProtected ? '✅ Protegida' : '❌ NO protegida'}`);
    }
  },

  async testTokenExpiration() {
    console.log('\n📋 Test 2: Expiración de token');

    const session = window.AuthClient.getSession();

    if (!session) {
      console.log('  ℹ️ No hay sesión activa');
      return;
    }

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const minutesUntilExpiry = Math.floor((expiresAt - now) / 60000);

    console.log(`  Expira en: ${minutesUntilExpiry} minutos`);
    console.log(`  ${minutesUntilExpiry > 0 ? '✅' : '❌'} Token válido`);
  },

  async testUnauthorizedAccess() {
    console.log('\n📋 Test 3: Acceso no autorizado');

    // Intentar acceder sin auth
    const wasLoggedIn = window.AuthClient.isAuthenticated();

    if (wasLoggedIn) {
      console.log('  ⚠️ Cierra sesión primero para probar');
      return;
    }

    try {
      window.location.href = '/dashboard/';
      console.log('  ❌ No redirigió a login');
    } catch (error) {
      console.log('  ✅ Redirigió correctamente');
    }
  },

  async testSessionPersistence() {
    console.log('\n📋 Test 4: Persistencia de sesión');

    const sessionInStorage = !!sessionStorage.getItem('gg:session');
    const tokenInStorage = !!localStorage.getItem('sb-ndojapkfhqbgiqtixiqo-auth-token');

    console.log(`  SessionStorage: ${sessionInStorage ? '✅' : '❌'}`);
    console.log(`  LocalStorage: ${tokenInStorage ? '✅' : '❌'}`);
  }
};

// Exponer globalmente para testing manual
window.SecurityTests = SecurityTests;

console.log('🧪 Tests de seguridad cargados. Ejecuta: SecurityTests.runAll()');
```

---

## 6. Monitoreo y Analytics

```javascript
// /assets/js/monitoring/auth-monitor.js

/**
 * Monitoreo de eventos de autenticación
 */
const AuthMonitor = {
  events: [],
  maxEvents: 100,

  /**
   * Registrar evento
   */
  log(type, data = {}) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      ...data
    };

    this.events.push(event);

    // Mantener solo últimos N eventos
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Enviar a analytics (opcional)
    this.sendToAnalytics(event);

    console.log(`[Monitor] ${type}:`, data);
  },

  /**
   * Enviar a servicio de analytics
   */
  async sendToAnalytics(event) {
    // Ejemplo con Google Analytics
    if (window.gtag) {
      gtag('event', event.type, {
        event_category: 'Auth',
        event_label: event.path,
        ...event
      });
    }

    // Ejemplo con servicio custom
    // await fetch('/api/analytics/auth', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event)
    // });
  },

  /**
   * Obtener resumen de eventos
   */
  getSummary() {
    const summary = {
      total: this.events.length,
      byType: {},
      lastEvents: this.events.slice(-10)
    };

    this.events.forEach(event => {
      summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
    });

    return summary;
  },

  /**
   * Inicializar monitoreo
   */
  init() {
    // Escuchar todos los eventos de auth
    const authEvents = [
      'auth:login',
      'auth:logout',
      'auth:session-updated',
      'auth:error',
      'auth:token-expired'
    ];

    authEvents.forEach(eventName => {
      window.addEventListener(eventName, (e) => {
        this.log(eventName, e.detail);
      });
    });

    // Escuchar intentos de acceso bloqueados
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (response.status === 401 || response.status === 403) {
          this.log('auth:access-denied', {
            url: args[0],
            status: response.status
          });
        }
        
        return response;
      } catch (error) {
        this.log('auth:network-error', {
          url: args[0],
          error: error.message
        });
        throw error;
      }
    };

    console.log('[Monitor] ✅ Monitoreo de autenticación activo');
  }
};

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
  AuthMonitor.init();
});

window.AuthMonitor = AuthMonitor;
```

---

## ✅ Checklist de Implementación

- [ ] Actualizar `authClient.js` con refresh automático
- [ ] Actualizar `authGuard.js` con verificación mejorada
- [ ] Crear `heartbeat.js` para keep-alive
- [ ] Agregar tests de seguridad
- [ ] Configurar monitoreo de eventos
- [ ] Probar en modo incógnito
- [ ] Probar con token expirado
- [ ] Probar acceso directo a rutas protegidas
- [ ] Verificar redirección post-login
- [ ] Verificar persistencia de tema
- [ ] Revisar consola de errores
- [ ] Test en diferentes navegadores

---

**Próximos pasos:** Implementar y probar cada componente uno por uno.
