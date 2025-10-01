document.addEventListener('DOMContentLoaded', function() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  
  // Función simple para "login"
  window.simpleLogin = function() {
    const user = prompt('Usuario:');
    const pass = prompt('Contraseña:');
    if (user === 'admin' && pass === '123') {
      localStorage.setItem('goldAuth', 'true');
      alert('Acceso concedido');
      window.location.href = '/herramientas/';
    } else {
      alert('Credenciales incorrectas');
    }
  };
  
  // Función simple para "logout"
  window.simpleLogout = function() {
    localStorage.removeItem('goldAuth');
    alert('Sesión cerrada');
  };
});
