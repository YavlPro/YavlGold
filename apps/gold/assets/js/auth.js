/**
 * YAVLGOLD - AUTH BRIDGE v3.0
 * Importa el sistema de autenticación desde @yavl/auth (workspace package)
 * y mantiene compatibilidad con código legacy
 */

// ⚠️ NOTA: Este archivo debe cargarse como module:
// <script type="module" src="/assets/js/auth.js"></script>

// Importar desde el paquete workspace @yavl/auth
import { authClient, authGuard, authUI } from '@yavl/auth';

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
