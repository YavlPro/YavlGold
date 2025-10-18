/**
 * YAVLGOLD - AUTH BRIDGE v3.0
 * Importa el sistema de autenticación desde archivos locales
 * y mantiene compatibilidad con código legacy
 */

// ⚠️ NOTA: Este archivo debe cargarse como module:
// <script type="module" src="/apps/gold/assets/js/auth.js"></script>

// Importar desde archivos locales (GitHub Pages compatible)
import authClient from './auth/authClient.js';
import authGuard from './auth/authGuard.js';
import authUI from './auth/authUI.js';

// Exponer globalmente para backward compatibility
window.AuthClient = authClient;
window.AuthGuard = authGuard;
window.AuthUI = authUI;

console.log('[YavlGold Auth] ✅ Sistema de autenticación cargado desde @yavl/auth');

// Funciones legacy (backward compatibility)
window.checkAuth = function() {
  return authClient.isAuthenticated();
};

window.login = async function(email, password) {
  return await authClient.login(email, password);
};

window.register = async function(email, password, name) {
  return await authClient.register(email, password, name);
};

window.logout = function() {
  authClient.logout();
};

window.showNotification = function(message, type = 'success') {
  if (type === 'success') authUI.showSuccess(message);
  else authUI.showError('generic', message);
};

window.checkProtectedPage = function() {
  return authGuard.check();
};
