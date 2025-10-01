// INTERCEPTOR DE ENLACES PROTEGIDOS
document.addEventListener('DOMContentLoaded', function() {
    // Proteger enlaces con data-protected="true"
    const protectedLinks = document.querySelectorAll('a[data-protected="true"]');
    
    protectedLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
            const isAuthenticated = auth.ok === true;
            
            if (!isAuthenticated) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetUrl = this.getAttribute('href');
                sessionStorage.setItem('gg:intended', targetUrl);
                window.location.href = '/dashboard/?needLogin=1#login';
            }
        });
    });
    
    // Verificar estado de autenticación en carga
    checkAuthStatus();
});

// FUNCIÓN PARA VERIFICAR AUTENTICACIÓN
function checkAuthStatus() {
    const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
    const isAuthenticated = auth.ok === true;
    
    const loginButtons = document.querySelectorAll('[onclick*="login"]');
    const logoutButtons = document.querySelectorAll('[onclick*="logout"]');
    
    if (isAuthenticated) {
        console.log('Usuario autenticado');
        // TODO: ocultar/mostrar elementos según estado si aplica
    } else {
        console.log('Usuario NO autenticado');
    }
}

// FUNCIÓN DE LOGIN SIMULADO (para testing)
function simularLogin() {
    localStorage.setItem('gg:auth', JSON.stringify({
        ok: true,
        t: Date.now(),
        user: 'usuario_demo'
    }));
    
    const intended = sessionStorage.getItem('gg:intended') || '/herramientas/';
    sessionStorage.removeItem('gg:intended');
    window.location.href = intended;
}

// FUNCIÓN DE LOGOUT
function logout() {
    localStorage.removeItem('gg:auth');
    sessionStorage.removeItem('gg:intended');
    window.location.href = '/index.html';
}
