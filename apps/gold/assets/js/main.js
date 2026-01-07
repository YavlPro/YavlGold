// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 YAVLGOLD V9.4 - CSS IMPORTS
// Vite empaqueta estos archivos CSS en el build de producción
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import '../css/tokens.css';
import '../css/style.css';
import '../css/unificacion.css';
import '../css/dashboard.css';
import '../css/mobile-optimizations.css';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 YAVLGOLD V9.4 - CONFIGURACIÓN DE SUPABASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { supabase } from './config/supabase-config.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 YAVLGOLD V9.4 - SISTEMA DE AUDITORÍA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import './utils/auditLogger.js';

export { supabase };

document.addEventListener('DOMContentLoaded', function () {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📧 YAVLGOLD V9.4 - EMAIL VERIFICATION HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.addEventListener('load', async () => {
  // 1. Detección de Token
  if (window.location.hash && window.location.hash.includes('access_token')) {
    console.log('[VerificationHandler] 🔐 Token detectado. Iniciando handshake...');

    try {
      if (!supabase) {
        console.error('[VerificationHandler] ❌ Supabase no disponible.');
        return;
      }

      // 2. Suscripción a Cambios de Auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[VerificationHandler] 🔔 Evento: ${event}`);

        if (event === 'PASSWORD_RECOVERY') {
          console.log('[VerificationHandler] 🔄 Recuperación de Password detectada');
          // Asegurarnos que AuthUI esté listo
          const checkAuthUI = setInterval(() => {
            if (window.AuthUI) {
              clearInterval(checkAuthUI);
              window.AuthUI.showUpdatePasswordMode();
            }
          }, 100);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          // Confirmar que realmente hay sesión
          if (session) {
            // CHECK FOR RECOVERY IN HASH
            const hash = window.location.hash;
            if (hash && hash.includes('type=recovery')) {
              console.log('[VerificationHandler] 🔄 Detectado type=recovery en hash. Interrumpiendo redirect.');
              const checkAuthUI = setInterval(() => {
                if (window.AuthUI) {
                  clearInterval(checkAuthUI);
                  window.AuthUI.showUpdatePasswordMode();
                }
              }, 100);
              return;
            }

            console.log('[VerificationHandler] ✅ Verificación Exitosa.');

            // 🛑 NO redirigir si hay recovery pendiente
            if (!sessionStorage.getItem('yavl_recovery_pending')) {
              // 3. Feedback Visual (Toast Dorado Premium)
              showGoldToast('Cuenta Verificada con Éxito');

              // 4. Limpieza de URL
              const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
              window.history.replaceState(null, '', cleanUrl);

              // 5. Redirección
              setTimeout(() => {
                console.log('[VerificationHandler] 🚀 Redirigiendo a Dashboard...');
                window.location.href = '/dashboard/';
              }, 2000);
            } else {
              console.log('[VerificationHandler] 🛑 Redirección bloqueada por Recovery pendiente');
            }

            // Desuscribir para evitar múltiples disparos
            if (subscription) subscription.unsubscribe();
          }
        }
      });

    } catch (err) {
      console.error('[VerificationHandler] ❌ Error en el proceso:', err);
    }
  }
});

/**
 * Muestra una notificación Toast estilo Gold V9.4
 * @param {string} message
 */
function showGoldToast(message) {
  // Crear contenedor si no existe
  let container = document.getElementById('gold-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'gold-toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }

  // Crear Elemento Toast
  const toast = document.createElement('div');
  toast.innerText = message;
  toast.style.cssText = `
    background: rgba(10, 10, 10, 0.95);
    color: #D4AF37;
    border: 1px solid #D4AF37;
    border-left: 4px solid #D4AF37;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 1.1rem;
    box-shadow: 0 5px 15px rgba(212, 175, 55, 0.2);
    min-width: 300px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: flex;
    align-items: center;
  `;

  // Icono
  const icon = document.createElement('span');
  icon.innerHTML = '✅ ';
  icon.style.marginRight = '10px';
  toast.prepend(icon);

  container.appendChild(toast);

  // Animación Entrada
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Animación Salida
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
