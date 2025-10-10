// Configuración de Supabase
const SUPABASE_URL = 'https://ppjtyslyvwpxepedymlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwanR5c2x5dndweGVwZWR5bWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0MzY4ODUsImV4cCI6MjA0NDAxMjg4NX0.pHUWJmwO0fmxdLNqoLgD2H2N-4-HWBC1JAj5jKz2oJE';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado de autenticación global
let currentUser = null;

// Función para verificar si el usuario está autenticado
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        currentUser = session?.user || null;
        updateAuthUI();
        return currentUser;
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        currentUser = null;
        updateAuthUI();
        return null;
    }
}

// Función para actualizar la interfaz según el estado de autenticación
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    if (!authButtons) return;
    
    if (currentUser) {
        // Usuario autenticado
        const userName = currentUser.user_metadata?.full_name || 
                        currentUser.user_metadata?.name || 
                        currentUser.email?.split('@')[0] || 
                        'Usuario';
        
        authButtons.innerHTML = `
            <div class="user-menu">
                <span class="user-name">¡Hola, ${userName}!</span>
                <button class="btn btn-secondary" onclick="logout()">Cerrar Sesión</button>
            </div>
        `;
    } else {
        // Usuario no autenticado
        authButtons.innerHTML = `
            <button class="btn btn-secondary" onclick="showAuthModal('login')">Iniciar Sesión</button>
            <button class="btn btn-primary" onclick="showAuthModal('register')">Registrarse</button>
        `;
    }
}

// Función de registro
async function register(email, password, name) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    name: name
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            showNotification('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.', 'success');
            hideAuthModal();
            return data.user;
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification(error.message || 'Error al registrar usuario', 'error');
        throw error;
    }
}

// Función de login
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data.user) {
            currentUser = data.user;
            updateAuthUI();
            showNotification('¡Inicio de sesión exitoso!', 'success');
            hideAuthModal();
            
            // Redirigir si estaba intentando acceder a una página protegida
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('needLogin') === '1') {
                // Remover el parámetro y recargar
                window.location.href = window.location.pathname;
            }
            
            return data.user;
        }
    } catch (error) {
        console.error('Error en login:', error);
        showNotification(error.message || 'Error al iniciar sesión', 'error');
        throw error;
    }
}

// Función de logout
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        updateAuthUI();
        showNotification('Sesión cerrada correctamente', 'success');
        
        // Redirigir a home si está en página protegida
        if (window.location.pathname.includes('/dashboard/') || 
            window.location.pathname.includes('/herramientas/')) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error en logout:', error);
        showNotification('Error al cerrar sesión', 'error');
    }
}

// Función para verificar acceso a páginas protegidas
function checkProtectedPage() {
    const protectedPaths = ['/dashboard/', '/herramientas/'];
    const currentPath = window.location.pathname;
    
    if (protectedPaths.some(path => currentPath.includes(path))) {
        if (!currentUser) {
            // Redirigir al home con parámetro para mostrar login
            window.location.href = '/?needLogin=1';
            return false;
        }
    }
    return true;
}

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `auth-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Event listeners para formularios
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación al cargar
    checkAuth();
    
    // Verificar si necesita mostrar login
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('needLogin') === '1') {
        showNotification('Necesitas iniciar sesión para acceder a esta página', 'warning');
        setTimeout(() => showAuthModal('login'), 1000);
    }
    
    // Form de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username')?.value;
            const password = document.getElementById('password')?.value;
            
            if (!username || !password) {
                showNotification('Por favor completa todos los campos', 'warning');
                return;
            }
            
            try {
                await login(username, password);
            } catch (error) {
                console.error('Error en login:', error);
            }
        });
    }
    
    // Form de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('register-name')?.value;
            const email = document.getElementById('register-email')?.value;
            const password = document.getElementById('register-password')?.value;
            
            if (!name || !email || !password) {
                showNotification('Por favor completa todos los campos', 'warning');
                return;
            }
            
            if (password.length < 8) {
                showNotification('La contraseña debe tener al menos 8 caracteres', 'warning');
                return;
            }
            
            try {
                await register(email, password, name);
            } catch (error) {
                console.error('Error en registro:', error);
            }
        });
    }
});

// Escuchar cambios en el estado de autenticación
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    currentUser = session?.user || null;
    updateAuthUI();
    
    if (event === 'SIGNED_OUT') {
        // Usuario cerró sesión
        if (window.location.pathname.includes('/dashboard/') || 
            window.location.pathname.includes('/herramientas/')) {
            window.location.href = '/';
        }
    }
});

// Exponer funciones globalmente
window.checkAuth = checkAuth;
window.login = login;
window.register = register;
window.logout = logout;
window.showNotification = showNotification;
window.checkProtectedPage = checkProtectedPage;