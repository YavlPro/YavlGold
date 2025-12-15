/**
 * YAVLGOLD - AUTH LEGACY BRIDGE
 * Este archivo mantiene compatibilidad con código legacy
 * Redirige las llamadas al nuevo sistema AuthClient v2.0
 */

console.log('[Auth Legacy] ⚠️ Archivo legacy cargado - usar AuthClient v2.0');

// Funciones de compatibilidad que redirigen al nuevo sistema
window.checkAuth = function() {
  return window.AuthClient?.isAuthenticated() || false;
};

window.login = async function(email, password) {
  if (window.AuthClient) {
    return await window.AuthClient.login(email, password);
  }
  console.error('[Auth Legacy] AuthClient no disponible');
  return { success: false, error: 'Sistema de autenticación no disponible' };
};

window.register = async function(email, password, name) {
  if (window.AuthClient) {
    return await window.AuthClient.register(email, password, name);
  }
  console.error('[Auth Legacy] AuthClient no disponible');
  return { success: false, error: 'Sistema de autenticación no disponible' };
};

window.logout = function() {
  if (window.AuthClient) {
    window.AuthClient.logout();
  }
};

window.showNotification = function(message, type = 'success') {
  if (window.AuthUI) {
    if (type === 'success') window.AuthUI.showSuccess(message);
    else window.AuthUI.showError('generic', message);
  }
};

window.checkProtectedPage = function() {
  if (window.AuthGuard) {
    return window.AuthGuard.check();
  }
  return true;
};
