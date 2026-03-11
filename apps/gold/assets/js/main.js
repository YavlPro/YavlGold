// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 YAVLGOLD V9.4 - CSS IMPORTS
// Vite empaqueta estos archivos CSS en el build de producción
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import '../css/tokens.css';
import '../css/style.css';
import '../css/unificacion.css';
import '../css/dashboard.css';
import '../css/mobile-optimizations.css';
import '../css/landing-v10.css';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 YAVLGOLD V9.4 - CONFIGURACIÓN DE SUPABASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { supabase } from './config/supabase-config.js';
import uxMessages from './ui/uxMessages.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 YAVLGOLD V9.4 - SISTEMA DE AUDITORÍA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import './utils/auditLogger.js';

export { supabase };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🦶 YAVLGOLD V9.4 - DYNAMIC FOOTER (Single Source of Truth)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.addEventListener('DOMContentLoaded', function () {
  // Dynamic Year (Always Current)
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const footerYearEl = document.getElementById('footer-year');
  if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

  // Dynamic Version (Injected by Vite at build time from package.json)
  const footerVersionEl = document.getElementById('footer-version');
  if (footerVersionEl && typeof __APP_VERSION__ !== 'undefined') {
    footerVersionEl.textContent = __APP_VERSION__;
    console.log(`[YavlGold] 🏷️ Version: ${__APP_VERSION__}`);
  }
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
              uxMessages.redirect(uxMessages.copy.accountVerified());

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

window.showGoldToast = (message) => {
  uxMessages.success({ title: message });
};
