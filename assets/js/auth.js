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
        // Marcar autenticación y guardar usuario básico
        localStorage.setItem('goldAuth', 'true');
        const user = { username, email: `${username}@example.com` };
        localStorage.setItem('currentUser', JSON.stringify(user));

        alert('¡Login exitoso!');
        // Redirigir a la ruta que intentaba acceder o a herramientas
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/herramientas/';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
      } else {
        alert('Usuario o contraseña incorrectos. Usa: admin/123');
      }
    });
  }

  // --- PROTECCIÓN DE PÁGINAS Y ACTUALIZACIÓN DE UI ---
  const protectedPaths = ['/herramientas/', '/dashboard/'];
  const currentPath = window.location.pathname;
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const goldAuth = localStorage.getItem('goldAuth') === 'true';

  // 1. Proteger rutas
  if (protectedPaths.some(path => currentPath.startsWith(path))) {
    if (!(goldAuth || currentUser)) {
      // Guardar la URL a la que se intentaba acceder para redirigir después del login
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      window.location.href = '/login.html';
      return; // Detener la ejecución para evitar que se procese el resto del script
    }
  }

  // 2. Actualizar la UI si el usuario está autenticado
  if (goldAuth || currentUser) {
    // Actualizar header principal (si existe)
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
      const name = (currentUser && currentUser.username) ? currentUser.username : 'Usuario';
      authButtons.innerHTML = `
        <span style="color: var(--text-light); margin-right: 15px;">Hola, ${name}</span>
        <button class="btn btn-outline" onclick="logout()">Cerrar Sesión</button>
      `;
    }

    // Actualizar UI específica del Dashboard (si estamos en el dashboard)
    if (currentPath.startsWith('/dashboard/')) {
      const dashboardContent = document.getElementById('dashboard-content');
      const loginPrompt = document.getElementById('login-prompt');
      
      if (dashboardContent) dashboardContent.style.display = 'flex';
      if (loginPrompt) loginPrompt.style.display = 'none';
      
      const name = (currentUser && currentUser.username) ? currentUser.username : 'Usuario';
      const email = (currentUser && currentUser.email) ? currentUser.email : '';
      const userNameEl = document.getElementById('user-name');
      const avatarEl = document.getElementById('user-avatar');
      const userNameInput = document.getElementById('user-name-input');
      const userEmailInput = document.getElementById('user-email');
      if (userNameEl) userNameEl.textContent = name;
      if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
      if (userNameInput) userNameInput.value = name;
      if (userEmailInput) userEmailInput.value = email;
    }
  } else {
    // 3. Configurar UI para usuario no autenticado
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
      authButtons.innerHTML = `
        <a href="/login.html" class="btn btn-primary">Iniciar Sesión</a>
        <a href="/creacion.html" class="btn btn-secondary">Registrarse</a>
      `;
    }
    
    // Ocultar contenido del dashboard si no hay sesión
    if (currentPath.startsWith('/dashboard/')) {
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
  localStorage.removeItem('goldAuth');
  window.location.href = '/index.html?v=20250929';
}

// --- LOGIN RÁPIDO (para el botón en login.html) ---
function simpleLogin() {
  // Simula el login con credenciales por defecto
  localStorage.setItem('goldAuth', 'true');
  const user = { username: 'admin', email: 'admin@example.com' };
  localStorage.setItem('currentUser', JSON.stringify(user));
  const redirect = sessionStorage.getItem('redirectAfterLogin') || '/herramientas/';
  sessionStorage.removeItem('redirectAfterLogin');
  window.location.href = redirect;
}