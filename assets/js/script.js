// =============================================
// SISTEMA DE AUTENTICACIÓN GLOBAL GOLD
// =============================================

// Interceptor de enlaces protegidos
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Inicializando sistema de autenticación...');
    
    // 1. Interceptor para enlaces con data-protected
    document.querySelectorAll('a[data-protected="true"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
            const isAuthenticated = auth.ok === true;
            
            if (!isAuthenticated) {
                e.preventDefault();
                e.stopPropagation();
                
                // Guardar destino intentado
                const targetUrl = this.getAttribute('href');
                sessionStorage.setItem('gg:intended', targetUrl);
                
                console.log('🚫 Acceso denegado. Redirigiendo al login...');
                window.location.href = 'dashboard.html?needLogin=1#login';
            }
        });
    });

    // 2. Actualizar UI según estado de autenticación
    updateAuthUI();
});

// Actualizar interfaz según autenticación
function updateAuthUI() {
    const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
    const isAuthenticated = auth.ok === true;
    
    const loginButtons = document.querySelectorAll('.btn-login');
    const logoutButtons = document.querySelectorAll('.btn-logout');
    
    if (isAuthenticated) {
        loginButtons.forEach(btn => btn.style.display = 'none');
        logoutButtons.forEach(btn => btn.style.display = 'inline-block');
        console.log('✅ UI actualizada: usuario autenticado');
    } else {
        loginButtons.forEach(btn => btn.style.display = 'inline-block');
        logoutButtons.forEach(btn => btn.style.display = 'none');
        console.log('✅ UI actualizada: usuario no autenticado');
    }
}

// Función de login simulada
window.simularLogin = function() {
    console.log('🔑 Iniciando sesión simulada...');
    
    localStorage.setItem('gg:auth', JSON.stringify({
        ok: true,
        t: Date.now(),
        user: 'usuario_demo',
        plan: 'premium'
    }));
    
    const intended = sessionStorage.getItem('gg:intended') || 'herramientas.html';
    sessionStorage.removeItem('gg:intended');
    
    console.log('✅ Login exitoso. Redirigiendo a:', intended);
    window.location.href = intended;
};

// Función de logout
window.logout = function() {
    console.log('🚪 Cerrando sesión...');
    
    localStorage.removeItem('gg:auth');
    sessionStorage.removeItem('gg:intended');
    
    // Redirigir al home
    window.location.href = 'index.html';
};

// Verificador de estado de autenticación
window.checkAuth = function() {
    const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
    return auth.ok === true;
};

// =============================================
// UTILIDADES ADICIONALES
// =============================================

// Smooth scroll para anclas
document.addEventListener('DOMContentLoaded', function() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Header shrink on scroll
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.classList.add('shrink');
    } else {
        header.classList.remove('shrink');
    }
});

console.log('✅ Sistema Global Gold cargado correctamente');
