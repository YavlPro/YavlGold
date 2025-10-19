/**
 * YAVLGOLD - TRUE PROTECT v1.0.0
 * Sistema de protección avanzada de rutas críticas
 * 
 * Características:
 * - Verificación continua de sesión (cada 10s)
 * - Validación de token con backend (Supabase)
 * - Protección anti-tampering (MutationObserver)
 * - Rate limiting de peticiones
 * - Logs de seguridad avanzados
 * 
 * @version 1.0.0
 * @date 2025-10-19
 */

const TrueProtect = {
  enabled: false,
  checkInterval: 10000, // 10 segundos
  intervalId: null,
  protectionLevel: 'high', // low, medium, high, paranoid
  observer: null,
  
  /**
   * Rutas que requieren TrueProtect obligatorio
   */
  criticalPaths: [
    '/dashboard/',
    '/dashboard/index.html',
    '/dashboard/configuracion.html',
    '/dashboard/perfil.html',
    '/herramientas/',
    '/herramientas/index.html',
    '/herramientas/calculadora.html',
    '/herramientas/conversor.html',
    '/profile/',
    '/settings/',
    'dashboard/',
    'herramientas/',
    'profile/',
    'settings/'
  ],
  
  /**
   * Verificar si ruta actual es crítica
   * @param {string} path - Ruta a verificar
   * @returns {boolean}
   */
  isCriticalRoute(path = window.location.pathname) {
    // Normalizar ruta (eliminar prefijo de repo si existe)
    const normalizedPath = path.replace(/^\/[^/]+\//, '/');
    
    return this.criticalPaths.some(cp => {
      return normalizedPath.includes(cp) || path.includes(cp);
    });
  },
  
  /**
   * Verificación continua de autenticación
   * @async
   */
  async continuousCheck() {
    if (!this.enabled) return;
    
    try {
      // 1. Verificar token local
      if (!window.AuthClient?.isAuthenticated()) {
        this.blockAccess('Token local no encontrado');
        return;
      }
      
      // 2. Verificar token con Supabase (backend) - solo en niveles altos
      if (this.protectionLevel === 'high' || this.protectionLevel === 'paranoid') {
        const tokenValid = await this.verifyTokenWithBackend();
        if (!tokenValid) {
          this.blockAccess('Token inválido o expirado');
          return;
        }
      }
      
      // 3. Verificar rate limiting
      if (!this.rateLimit.check()) {
        this.blockAccess('Rate limit excedido');
        return;
      }
      
      // 4. Log de verificación exitosa
      console.log('[TrueProtect] ✅ Verificación continua OK');
      
    } catch (error) {
      console.error('[TrueProtect] ❌ Error en verificación continua:', error.message);
      // No bloquear en caso de error de red, solo en modo paranoid
      if (this.protectionLevel === 'paranoid') {
        this.blockAccess('Error en verificación de seguridad');
      }
    }
  },
  
  /**
   * Verificar token con Supabase
   * @async
   * @returns {Promise<boolean>}
   */
  async verifyTokenWithBackend() {
    try {
      const supabase = window.AuthClient?.supabase;
      if (!supabase) {
        console.warn('[TrueProtect] ⚠️ Supabase no disponible');
        return false;
      }
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error('[TrueProtect] ❌ Token inválido:', error?.message);
        this.logEvent('WARNING', 'Token inválido detectado', { error: error?.message });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[TrueProtect] ❌ Error verificando token:', error.message);
      return false;
    }
  },
  
  /**
   * Bloquear acceso y redirigir
   * @param {string} reason - Razón del bloqueo
   */
  blockAccess(reason) {
    console.error(`[TrueProtect] 🚨 Acceso bloqueado: ${reason}`);
    
    // Log evento crítico
    this.logEvent('CRITICAL', `Acceso bloqueado: ${reason}`);
    
    // Bloquear contenido inmediatamente
    if (document.body) {
      document.body.style.display = 'none';
      
      // Mensaje de error (solo en modo development)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.body.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #0B0C0F;
            color: #fff;
            font-family: 'Rajdhani', sans-serif;
            text-align: center;
            padding: 20px;
          ">
            <i class="fas fa-shield-alt" style="font-size: 80px; color: #D4AF37; margin-bottom: 20px;"></i>
            <h1 style="color: #D4AF37; margin-bottom: 10px;">⛔ Acceso Denegado</h1>
            <p style="color: #999; margin-bottom: 20px;">TrueProtect ha bloqueado el acceso</p>
            <p style="color: #666; font-size: 14px;">Razón: ${reason}</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Redirigiendo en 2 segundos...</p>
          </div>
        `;
      }
    }
    
    // Detener verificación continua
    this.disable();
    
    // Limpiar sesión
    if (window.AuthClient?.logout) {
      window.AuthClient.logout();
    }
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
      // Detectar nivel de carpeta para redirigir apropiadamente
      const pathParts = window.location.pathname.split('/').filter(p => p);
      if (pathParts.length > 1) {
        window.location.href = '../';
      } else {
        window.location.href = './';
      }
    }, 2000);
  },
  
  /**
   * Protección anti-tampering con MutationObserver
   */
  enableAntiTampering() {
    // Solo en niveles medium, high y paranoid
    if (this.protectionLevel === 'low') {
      console.log('[TrueProtect] ℹ️ Anti-tampering deshabilitado (nivel low)');
      return;
    }
    
    // Si ya está autenticado, no necesitamos anti-tampering
    if (window.AuthClient?.isAuthenticated()) {
      console.log('[TrueProtect] ✅ Usuario autenticado, anti-tampering no requerido');
      return;
    }
    
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target === document.body) {
          // Verificar si intentan mostrar contenido sin autenticación
          const isVisible = document.body.style.display !== 'none';
          const isAuthenticated = window.AuthClient?.isAuthenticated();
          
          if (isVisible && !isAuthenticated) {
            console.error('[TrueProtect] 🚨 Intento de manipulación detectado');
            this.logEvent('CRITICAL', 'Manipulación de DOM detectada');
            this.blockAccess('Manipulación de DOM detectada');
          }
        }
      });
    });
    
    // Observar cambios en body
    this.observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['style'],
      childList: false,
      subtree: false
    });
    
    console.log('[TrueProtect] 🔒 Anti-tampering habilitado');
  },
  
  /**
   * Rate limiting de peticiones
   */
  rateLimit: {
    requests: [],
    maxRequests: 60, // máximo 60 verificaciones
    windowMs: 60000, // en 60 segundos (1 minuto)
    
    check() {
      const now = Date.now();
      
      // Limpiar peticiones antiguas fuera de la ventana
      this.requests = this.requests.filter(time => now - time < this.windowMs);
      
      if (this.requests.length >= this.maxRequests) {
        console.error('[TrueProtect] 🚨 Rate limit excedido');
        return false;
      }
      
      this.requests.push(now);
      return true;
    },
    
    reset() {
      this.requests = [];
      console.log('[TrueProtect] ♻️ Rate limit reseteado');
    }
  },
  
  /**
   * Log de eventos de seguridad
   */
  securityLog: [],
  
  /**
   * Registrar evento de seguridad
   * @param {string} type - Tipo de evento (INFO, WARNING, CRITICAL)
   * @param {string} message - Mensaje del evento
   * @param {object} data - Datos adicionales
   */
  logEvent(type, message, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      message,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      data
    };
    
    this.securityLog.push(event);
    
    // Mantener solo últimos 100 eventos
    if (this.securityLog.length > 100) {
      this.securityLog.shift();
    }
    
    // Log en consola con color según tipo
    const colors = {
      INFO: 'color: #00ff00',
      WARNING: 'color: #ffaa00',
      CRITICAL: 'color: #ff0000; font-weight: bold'
    };
    
    console.log(
      `%c[TrueProtect] ${type}: ${message}`,
      colors[type] || 'color: #999'
    );
    
    // Enviar eventos críticos a servidor (futuro)
    if (type === 'CRITICAL') {
      this.reportToServer(event);
    }
  },
  
  /**
   * Reportar eventos críticos al servidor (futuro)
   * @async
   * @param {object} event - Evento a reportar
   */
  async reportToServer(event) {
    // TODO: Implementar endpoint /api/security/report
    console.warn('[TrueProtect] 📊 Evento crítico (reporte a servidor pendiente):', event);
    
    // Guardar en localStorage temporalmente
    try {
      const savedEvents = JSON.parse(localStorage.getItem('trueprotect:critical-events') || '[]');
      savedEvents.push(event);
      
      // Mantener solo últimos 20 eventos críticos
      if (savedEvents.length > 20) {
        savedEvents.shift();
      }
      
      localStorage.setItem('trueprotect:critical-events', JSON.stringify(savedEvents));
    } catch (error) {
      console.error('[TrueProtect] Error guardando evento crítico:', error.message);
    }
  },
  
  /**
   * Obtener estadísticas de seguridad
   * @returns {object}
   */
  getStats() {
    return {
      enabled: this.enabled,
      level: this.protectionLevel,
      interval: this.checkInterval,
      totalEvents: this.securityLog.length,
      criticalEvents: this.securityLog.filter(e => e.type === 'CRITICAL').length,
      warningEvents: this.securityLog.filter(e => e.type === 'WARNING').length,
      rateLimitRequests: this.rateLimit.requests.length,
      rateLimitMax: this.rateLimit.maxRequests
    };
  },
  
  /**
   * Inicializar TrueProtect
   * @param {object} options - Opciones de configuración
   * @param {string} options.level - Nivel de protección (low, medium, high, paranoid)
   * @param {number} options.interval - Intervalo de verificación en ms
   */
  init(options = {}) {
    // Solo habilitar en rutas críticas
    if (!this.isCriticalRoute()) {
      console.log('[TrueProtect] ℹ️ Ruta no crítica, protección deshabilitada');
      return;
    }
    
    // Verificar que AuthGuard esté disponible
    if (!window.AuthGuard) {
      console.warn('[TrueProtect] ⚠️ AuthGuard no encontrado, TrueProtect requiere AuthGuard');
      return;
    }
    
    // Configuración
    this.protectionLevel = options.level || 'high';
    this.checkInterval = options.interval || 10000;
    
    console.log(`[TrueProtect] 🚀 Iniciando protección nivel: ${this.protectionLevel}`);
    
    this.enabled = true;
    
    // Verificación inicial inmediata
    setTimeout(() => {
      this.continuousCheck();
    }, 1000); // Esperar 1 segundo para que AuthClient se inicialice
    
    // Configurar intervalo según nivel
    const intervals = {
      low: 30000,      // 30 segundos
      medium: 15000,   // 15 segundos
      high: 10000,     // 10 segundos
      paranoid: 5000   // 5 segundos
    };
    
    this.checkInterval = intervals[this.protectionLevel] || this.checkInterval;
    
    // Verificación continua
    this.intervalId = setInterval(() => {
      this.continuousCheck();
    }, this.checkInterval);
    
    // Anti-tampering (solo si no está autenticado)
    if (!window.AuthClient?.isAuthenticated()) {
      this.enableAntiTampering();
    }
    
    // Log evento
    this.logEvent('INFO', 'TrueProtect inicializado', { 
      level: this.protectionLevel,
      interval: this.checkInterval
    });
    
    console.log(`[TrueProtect] ✅ Sistema de protección activo (verificación cada ${this.checkInterval/1000}s)`);
  },
  
  /**
   * Desactivar TrueProtect
   */
  disable() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.enabled = false;
    this.logEvent('INFO', 'TrueProtect deshabilitado');
    console.log('[TrueProtect] ⚠️ Protección deshabilitada');
  }
};

// Auto-init en DOMContentLoaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que AuthGuard se inicialice primero
    setTimeout(() => {
      if (window.AuthGuard) {
        // Determinar nivel según la ruta
        const path = window.location.pathname;
        let level = 'high'; // Por defecto
        
        // Nivel paranoid para configuración
        if (path.includes('configuracion') || path.includes('settings')) {
          level = 'paranoid';
        }
        
        // Nivel medium para herramientas
        if (path.includes('herramientas')) {
          level = 'medium';
        }
        
        TrueProtect.init({ level });
      } else {
        console.warn('[TrueProtect] ⚠️ AuthGuard no disponible, esperando...');
        // Reintentar después de 2 segundos
        setTimeout(() => {
          if (window.AuthGuard) {
            TrueProtect.init({ level: 'high' });
          }
        }, 2000);
      }
    }, 500);
  });
}

// Escuchar eventos de autenticación
if (typeof window !== 'undefined') {
  // Al hacer login, desactivar anti-tampering
  window.addEventListener('auth:login', () => {
    console.log('[TrueProtect] 🔓 Usuario autenticado, desactivando anti-tampering');
    if (TrueProtect.observer) {
      TrueProtect.observer.disconnect();
      TrueProtect.observer = null;
    }
    TrueProtect.logEvent('INFO', 'Usuario autenticado');
  });
  
  // Al hacer logout, reactivar anti-tampering
  window.addEventListener('auth:logout', () => {
    console.log('[TrueProtect] 🔒 Usuario desconectado');
    TrueProtect.logEvent('INFO', 'Usuario desconectado');
    
    // Deshabilitar TrueProtect en rutas protegidas
    if (TrueProtect.isCriticalRoute()) {
      TrueProtect.disable();
    }
  });
}

// Export global
if (typeof window !== 'undefined') {
  window.TrueProtect = TrueProtect;
}

console.log('[TrueProtect] ✅ TrueProtect v1.0.0 cargado');

// Export para módulos ES6
export default TrueProtect;
