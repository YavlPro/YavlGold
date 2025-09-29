document.addEventListener('DOMContentLoaded', () => {
  // --- LÓGICA DE LOGIN ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = e.target.username.value;
      const password = e.target.password.value;

      // Credenciales simples
      if (username === 'admin' && password === '123') {
        localStorage.setItem('goldAuth', 'true');
        alert('¡Login exitoso!');
        window.location.href = '/gold/tools.html';
      } else {
        alert('Usuario o contraseña incorrectos. Usa: admin/123');
      }
    });
  }

  // --- PROTECCIÓN DE PÁGINAS Y ACTUALIZACIÓN DE UI ---
  const protectedPaths = ['/gold/herramientas/', '/gold/dashboard/'];
  const currentPath = window.location.pathname;
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  // 1. Proteger rutas
  if (protectedPaths.some(path => currentPath.startsWith(path))) {
    if (!currentUser) {
      // Guardar la URL a la que se intentaba acceder para redirigir después del login
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      window.location.href = '/gold/login.html';
      return; // Detener la ejecución para evitar que se procese el resto del script
    }
  }

  // 2. Actualizar la UI si el usuario está autenticado
  if (currentUser) {
    // Actualizar header principal (si existe)
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
      authButtons.innerHTML = `
        <span style="color: var(--text-light); margin-right: 15px;">Hola, ${currentUser.username}</span>
        <button class="btn btn-outline" onclick="logout()">Cerrar Sesión</button>
      `;
    }

    // Actualizar UI específica del Dashboard (si estamos en el dashboard)
    if (currentPath.startsWith('/gold/dashboard/')) {
      const dashboardContent = document.getElementById('dashboard-content');
      const loginPrompt = document.getElementById('login-prompt');
      
      if (dashboardContent) dashboardContent.style.display = 'flex';
      if (loginPrompt) loginPrompt.style.display = 'none';
      
      document.getElementById('user-name').textContent = currentUser.username;
      document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
      document.getElementById('user-name-input').value = currentUser.username;
      document.getElementById('user-email').value = currentUser.email;
    }
  } else {
    // 3. Configurar UI para usuario no autenticado
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
      authButtons.innerHTML = `
        <a href="/gold/login.html" class="btn btn-primary">Iniciar Sesión</a>
        <a href="/gold/creacion.html" class="btn btn-secondary">Registrarse</a>
      `;
    }
    
    // Ocultar contenido del dashboard si no hay sesión
    if (currentPath.startsWith('/gold/dashboard/')) {
      const dashboardContent = document.getElementById('dashboard-content');
      const loginPrompt = document.getElementById('login-prompt');
      if (dashboardContent) dashboardContent.style.display = 'none';
      if (loginPrompt) loginPrompt.style.display = 'block';
    }
  }
});

// --- FUNCIÓN DE LOGOUT ---
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = '/gold/index.html';
}