/**
 * =============================================
 * YAVLGOLD - AUTH HEARTBEAT v1.0
 * Sistema de keep-alive para mantener sesión activa
 * =============================================
 */

const AuthHeartbeat = {
  interval: null,
  HEARTBEAT_INTERVAL: 5 * 60 * 1000, // 5 minutos
  failedPings: 0,
  MAX_FAILED_PINGS: 3,

  /**
   * Iniciar heartbeat
   */
  start() {
    if (this.interval) {
      this.stop();
    }

    console.log('[Heartbeat] ❤️ Iniciando sistema de keep-alive...');

    // Reiniciar contador
    this.failedPings = 0;

    // Configurar intervalo
    this.interval = setInterval(() => {
      this.ping();
    }, this.HEARTBEAT_INTERVAL);

    // Hacer ping inicial
    this.ping();
  },

  /**
   * Detener heartbeat
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[Heartbeat] ⏹️ Sistema detenido');
    }
  },

  /**
   * Hacer ping para verificar y renovar sesión
   */
  async ping() {
    try {
      // Verificar si hay cliente de auth disponible
      if (!window.AuthClient) {
        console.warn('[Heartbeat] ⚠️ AuthClient no disponible');
        this.stop();
        return;
      }

      // Verificar si está autenticado
      if (!window.AuthClient.isAuthenticated()) {
        console.log('[Heartbeat] ℹ️ No hay sesión activa, deteniendo...');
        this.stop();
        return;
      }

      console.log('[Heartbeat] 📡 Verificando sesión...');

      // Intentar refrescar sesión
      const result = await window.AuthClient.refreshSession();

      if (result.success) {
        console.log('[Heartbeat] ✅ Sesión renovada correctamente');
        this.failedPings = 0;
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('heartbeat:success', {
          detail: { timestamp: new Date().toISOString() }
        }));
      } else {
        console.error('[Heartbeat] ❌ Error al renovar sesión');
        this.handleFailedPing();
      }
    } catch (error) {
      console.error('[Heartbeat] ❌ Excepción en ping:', error);
      this.handleFailedPing();
    }
  },

  /**
   * Manejar ping fallido
   */
  handleFailedPing() {
    this.failedPings++;
    
    console.warn(`[Heartbeat] ⚠️ Ping fallido (${this.failedPings}/${this.MAX_FAILED_PINGS})`);

    if (this.failedPings >= this.MAX_FAILED_PINGS) {
      console.error('[Heartbeat] ❌ Máximo de intentos alcanzado, cerrando sesión');
      
      // Disparar evento de error
      window.dispatchEvent(new CustomEvent('heartbeat:failed', {
        detail: { 
          failedPings: this.failedPings,
          timestamp: new Date().toISOString()
        }
      }));

      // Detener heartbeat
      this.stop();

      // Cerrar sesión
      if (window.AuthClient?.logout) {
        window.AuthClient.logout();
      }
    }
  },

  /**
   * Verificar visibilidad de la página
   */
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('[Heartbeat] 👁️ Página oculta, pausando...');
      // Opcional: detener mientras la página está oculta
      // this.stop();
    } else {
      console.log('[Heartbeat] 👁️ Página visible, verificando sesión...');
      
      // Si hay sesión activa, hacer ping inmediato
      if (window.AuthClient?.isAuthenticated()) {
        if (!this.interval) {
          this.start();
        } else {
          this.ping();
        }
      }
    }
  },

  /**
   * Manejar actividad del usuario
   */
  handleUserActivity() {
    // Si el usuario está activo y hay sesión, renovar si está cerca de expirar
    if (!window.AuthClient?.isAuthenticated()) return;

    const session = window.AuthClient.getSession();
    if (!session) return;

    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const tenMinutes = 10 * 60 * 1000;

    // Si faltan menos de 10 minutos, renovar
    if (timeUntilExpiry < tenMinutes && timeUntilExpiry > 0) {
      console.log('[Heartbeat] 🔄 Usuario activo, renovando sesión preventivamente...');
      this.ping();
    }
  },

  /**
   * Configurar listeners de actividad
   */
  setupActivityListeners() {
    let activityTimeout;
    
    const resetActivityTimer = () => {
      clearTimeout(activityTimeout);
      
      // Esperar 30 segundos de inactividad antes de verificar
      activityTimeout = setTimeout(() => {
        this.handleUserActivity();
      }, 30000);
    };

    // Eventos de actividad del usuario
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetActivityTimer, { passive: true });
    });

    console.log('[Heartbeat] 👤 Listeners de actividad configurados');
  },

  /**
   * Inicializar heartbeat
   */
  init() {
    console.log('[Heartbeat] 🚀 Inicializando sistema...');

    // Configurar listener de visibilidad
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Configurar listeners de actividad
    this.setupActivityListeners();

    // Iniciar solo si está autenticado
    if (window.AuthClient?.isAuthenticated()) {
      this.start();
    } else {
      console.log('[Heartbeat] ℹ️ No hay sesión activa, esperando login...');
    }

    // Escuchar eventos de autenticación
    window.addEventListener('auth:login', () => {
      console.log('[Heartbeat] 🔑 Login detectado, iniciando...');
      this.start();
    });

    window.addEventListener('auth:logout', () => {
      console.log('[Heartbeat] 🚪 Logout detectado, deteniendo...');
      this.stop();
    });

    window.addEventListener('auth:session-updated', () => {
      console.log('[Heartbeat] 🔄 Sesión actualizada');
      this.failedPings = 0; // Reiniciar contador
    });

    console.log('[Heartbeat] ✅ Sistema inicializado correctamente');
  }
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AuthHeartbeat.init());
} else {
  AuthHeartbeat.init();
}

// Exponer globalmente
window.AuthHeartbeat = AuthHeartbeat;

console.log('[Heartbeat] ✅ Auth Heartbeat v1.0 cargado');
