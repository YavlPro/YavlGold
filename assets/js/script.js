// Tu código existente de script.js (si tienes algo) debería ir aquí arriba.
// Por ahora, el archivo solo contendrá el sistema de autenticación.

// =============================================
// SISTEMA DE AUTENTICACIÓN - INTERCEPTORES
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // INTERCEPTOR SOLO para enlaces protegidos
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
                
                console.log('🔐 Redirigiendo al login...');
                // Asegúrate de que la ruta a dashboard.html sea correcta desde donde se ejecute el script
                window.location.href = 'dashboard.html?needLogin=1#login';
            }
            // Si está autenticado, el enlace funciona normal
        });
    });

    // Verificar estado de autenticación (opcional, para lógica de UI)
    checkAuthStatus();
});

// Función para verificar autenticación
function checkAuthStatus() {
    const auth = JSON.parse(localStorage.getItem('gg:auth') || '{}');
    if (auth.ok === true) {
        console.log('✅ Usuario autenticado');
    } else {
        console.log('❌ Usuario NO autenticado');
    }
    return auth.ok === true;
}

// Login simulado (para usar desde la consola o botones)
window.simularLogin = function() {
    localStorage.setItem('gg:auth', JSON.stringify({
        ok: true,
        t: Date.now(),
        user: 'usuario_demo'
    }));
    
    const intended = sessionStorage.getItem('gg:intended') || 'herramientas.html';
    sessionStorage.removeItem('gg:intended');
    window.location.href = intended;
};

// Logout (para usar desde la consola o botones)
window.logout = function() {
    localStorage.removeItem('gg:auth');
    sessionStorage.removeItem('gg:intended');
    window.location.href = 'index.html';
};
