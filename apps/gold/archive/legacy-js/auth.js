/**
 * YAVLGOLD - AUTH BRIDGE v3.0
 * ARCHIVADO el 2026-03-05.
 * Conservado solo como referencia histórica fuera de la superficie activa.
 */

// ⚠️ NOTA: este archivo ya no forma parte del producto activo.
// Sólo se conserva para referencia del bridge legacy.

// Importar desde la auth vigente y el guard legacy archivado.
import authClient from '../assets/js/auth/authClient.js';
import authGuard from './auth/authGuard.js';
import authUI from '../assets/js/auth/authUI.js';

// Exponer globalmente para backward compatibility
window.AuthClient = authClient;
window.AuthGuard = authGuard;
window.AuthUI = authUI;

console.log('[YavlGold Auth] ✅ Sistema de autenticación cargado desde @yavl/auth');

// Funciones legacy (backward compatibility)
window.checkAuth = function () {
  return authClient.isAuthenticated();
};

window.login = async function (email, password) {
  return await authClient.login(email, password);
};

window.register = async function (email, password, name) {
  return await authClient.register(email, password, name);
};

window.logout = function () {
  authClient.logout();
};

window.showNotification = function (message, type = 'success') {
  if (type === 'success') authUI.showSuccess(message);
  else authUI.showError('generic', message);
};

window.checkProtectedPage = function () {
  return authGuard.check();
};
