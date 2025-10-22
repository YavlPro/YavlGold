/**
 * YAVLGOLD - AUTH UI v2.0.1
 */
const AuthUI = {
  elements: {},

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.updateUI();
    console.log('[AuthUI] ✅ AuthUI v2.0 inicializado');
  },

  cacheElements() {
    this.elements = {
      // Modales nuevos (dashboard/herramientas)
      loginModal: document.getElementById('loginModal'),
      registerModal: document.getElementById('registerModal'),
      // Modal antiguo (homepage)
      authModal: document.getElementById('auth-modal'),
      modalOverlay: document.getElementById('modal-overlay'),
      loginTab: document.getElementById('login-tab'),
      registerTab: document.getElementById('register-tab'),
      // Botones
      loginBtn: document.getElementById('login-btn'),
      registerBtn: document.getElementById('register-btn'),
      // Formularios
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      // Cerrar modales
      closeLoginModal: document.querySelector('#loginModal .modal-close'),
      closeRegisterModal: document.querySelector('#registerModal .modal-close'),
      // User menu
      userMenu: document.getElementById('user-menu'),
      userMenuBtn: document.getElementById('user-menu-btn'),
      userDropdown: document.getElementById('user-dropdown'),
      logoutBtn: document.getElementById('logout-btn'),
      authButtons: document.querySelector('.auth-buttons'),
      // Errores
      loginError: document.getElementById('login-error'),
      registerError: document.getElementById('register-error'),
      // Nav móvil
      navToggle: document.getElementById('nav-toggle'),
      mainNav: document.getElementById('main-nav'),
      // Links para cambiar entre login/register
      showRegisterLink: document.getElementById('show-register-link'),
      showLoginLink: document.getElementById('show-login-link'),
    };
  },

  attachEventListeners() {
    this.elements.loginBtn?.addEventListener('click', (e) => { e.preventDefault(); this.showLoginModal(); });
    this.elements.closeLoginModal?.addEventListener('click', () => this.hideLoginModal());
    this.elements.loginForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(e); });

    this.elements.registerBtn?.addEventListener('click', (e) => { e.preventDefault(); this.showRegisterModal(); });
    this.elements.closeRegisterModal?.addEventListener('click', () => this.hideRegisterModal());
    this.elements.registerForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleRegister(e); });

    this.elements.userMenuBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleUserDropdown(); });
    this.elements.logoutBtn?.addEventListener('click', (e) => { e.preventDefault(); this.handleLogout(); });

    this.elements.loginModal?.addEventListener('click', (e) => { if (e.target === this.elements.loginModal) this.hideLoginModal(); });
    this.elements.registerModal?.addEventListener('click', (e) => { if (e.target === this.elements.registerModal) this.hideRegisterModal(); });

    document.addEventListener('click', (e) => {
      if (this.elements.userDropdown && this.elements.userDropdown.style.display === 'block' && !this.elements.userMenu?.contains(e.target)) {
        this.elements.userDropdown.style.display = 'none';
      }
    });

    if (this.elements.navToggle && this.elements.mainNav) {
      this.elements.navToggle.addEventListener('click', () => this.toggleMobileNav());
      this.elements.mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => this.elements.mainNav.classList.remove('active')));
    }

    // Listen to auth events (note: authClient emits 'signed_in', not 'login')
    window.addEventListener('auth:signed_in', () => { 
      this.updateUI(); 
      this.hideLoginModal(); 
      this.hideRegisterModal();
      // Auto-redirect to dashboard if not already there
      if (!window.location.pathname.includes('/dashboard')) {
        setTimeout(() => {
          window.location.href = '/dashboard/';
        }, 500);
      }
    });
    window.addEventListener('auth:signed_out', () => this.updateUI());
    window.addEventListener('auth:profileUpdated', () => this.updateUI());

    this.elements.showRegisterLink?.addEventListener('click', (e) => { e.preventDefault(); this.hideLoginModal(); this.showRegisterModal(); });
    this.elements.showLoginLink?.addEventListener('click', (e) => { e.preventDefault(); this.hideRegisterModal(); this.showLoginModal(); });
  },

  showLoginModal() {
    // Sistema nuevo (loginModal separado)
    if (this.elements.loginModal) {
      this.elements.loginModal.style.display = 'flex';
      this.clearError('login');
      setTimeout(() => this.elements.loginForm?.querySelector('input[name="email"]')?.focus(), 80);
      return;
    }
    
    // Sistema antiguo (auth-modal con tabs)
    if (this.elements.authModal) {
      this.elements.modalOverlay.style.display = 'block';
      this.elements.authModal.style.display = 'block';
      // Activar tab de login
      this.elements.loginTab?.classList.add('active');
      this.elements.registerTab?.classList.remove('active');
      // Mostrar formulario de login
      this.elements.loginForm?.classList.add('active');
      this.elements.registerForm?.classList.remove('active');
      this.clearError('login');
      setTimeout(() => this.elements.loginForm?.querySelector('input[name="email"]')?.focus(), 80);
    }
  },
  
  hideLoginModal() {
    // Sistema nuevo
    if (this.elements.loginModal) {
      this.elements.loginModal.style.display = 'none';
      this.clearError('login');
      this.elements.loginForm?.reset();
      return;
    }
    
    // Sistema antiguo
    if (this.elements.authModal) {
      this.elements.modalOverlay.style.display = 'none';
      this.elements.authModal.style.display = 'none';
      this.clearError('login');
      this.elements.loginForm?.reset();
    }
  },
  
  showRegisterModal() {
    // Sistema nuevo (registerModal separado)
    if (this.elements.registerModal) {
      this.elements.registerModal.style.display = 'flex';
      this.clearError('register');
      setTimeout(() => this.elements.registerForm?.querySelector('input[name="name"]')?.focus(), 80);
      return;
    }
    
    // Sistema antiguo (auth-modal con tabs)
    if (this.elements.authModal) {
      this.elements.modalOverlay.style.display = 'block';
      this.elements.authModal.style.display = 'block';
      // Activar tab de registro
      this.elements.registerTab?.classList.add('active');
      this.elements.loginTab?.classList.remove('active');
      // Mostrar formulario de registro
      this.elements.registerForm?.classList.add('active');
      this.elements.loginForm?.classList.remove('active');
      this.clearError('register');
      setTimeout(() => this.elements.registerForm?.querySelector('input[name="email"]')?.focus(), 80);
    }
  },
  
  hideRegisterModal() {
    // Sistema nuevo
    if (this.elements.registerModal) {
      this.elements.registerModal.style.display = 'none';
      this.clearError('register');
      this.elements.registerForm?.reset();
      return;
    }
    
    // Sistema antiguo
    if (this.elements.authModal) {
      this.elements.modalOverlay.style.display = 'none';
      this.elements.authModal.style.display = 'none';
      this.clearError('register');
      this.elements.registerForm?.reset();
    }
  },

  toggleUserDropdown() {
    if (!this.elements.userDropdown) return;
    const show = this.elements.userDropdown.style.display !== 'block';
    this.elements.userDropdown.style.display = show ? 'block' : 'none';
  },

  toggleMobileNav() {
    this.elements.mainNav?.classList.toggle('active');
    const icon = this.elements.navToggle?.querySelector('i');
    if (icon) {
      const active = this.elements.mainNav?.classList.contains('active');
      icon.className = active ? 'fas fa-times' : 'fas fa-bars';
    }
  },

  async handleLogin(e) {
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const password = fd.get('password');
    if (!email || !password) return this.showError('login', 'Por favor completa todos los campos');

    const btn = e.target.querySelector('button[type="submit"]');
    const txt = btn?.textContent || '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...'; }

    try {
      const res = await window.AuthClient.login(email, password);
      if (res.success) this.showSuccess('¡Bienvenido de nuevo!');
      else this.showError('login', res.error || 'Error al iniciar sesión');
    } catch {
      this.showError('login', 'Error inesperado. Intenta de nuevo.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = txt; }
    }
  },

  async handleRegister(e) {
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const password = fd.get('password');
    const name = fd.get('name');
    if (!email || !password || !name) return this.showError('register', 'Por favor completa todos los campos');

    const btn = e.target.querySelector('button[type="submit"]');
    const txt = btn?.textContent || '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...'; }

    try {
      const res = await window.AuthClient.register(email, password, name);
      if (res.success) this.showSuccess('¡Cuenta creada exitosamente!');
      else this.showError('register', res.error || 'Error al registrarse');
    } catch {
      this.showError('register', 'Error inesperado. Intenta de nuevo.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = txt; }
    }
  },

  handleLogout() {
    console.log('[AuthUI] 🚪 Logout iniciado');
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      window.AuthClient.logout();
      this.showSuccess('Sesión cerrada correctamente');
      if (this.elements.userDropdown) this.elements.userDropdown.style.display = 'none';
      
      // Redirigir a la página principal después de cerrar sesión
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  },

  showError(type, message) {
    const el = type === 'login' ? this.elements.loginError : type === 'register' ? this.elements.registerError : null;
    if (!el) return this.showToast(message, 'error');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  },
  clearError(type) {
    const el = type === 'login' ? this.elements.loginError : this.elements.registerError;
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  },
  showSuccess(message) { this.showToast(message, 'success'); },

  showToast(message, type = 'success') {
    let toast = document.getElementById('auth-toast');
    if (!toast) {
      toast = document.createElement('div'); toast.id = 'auth-toast'; document.body.appendChild(toast);
    }
    const style = type === 'success'
      ? { bg: 'linear-gradient(135deg,#C8A752,#C8A752)', color: '#0B0C0F', icon: 'fa-check-circle' }
      : { bg: 'linear-gradient(135deg,#ff6b6b,#ff5252)', color: '#fff', icon: 'fa-exclamation-circle' };

    toast.style.cssText = `
      position: fixed; top: 90px; right: 20px;
      background: ${style.bg}; color: ${style.color};
      padding: 16px 24px; border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0,0,0,.3); font-weight: 600; font-size: 15px;
      z-index: 10000; opacity: 0; transform: translateX(400px);
      transition: all .3s cubic-bezier(.68,-.55,.265,1.55);
      display: flex; align-items: center; gap: 12px; max-width: 350px;
    `;
    toast.innerHTML = `<i class="fas ${style.icon}"></i><span>${message}</span>`;
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 10);
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateX(400px)';
      setTimeout(() => { toast.remove?.(); }, 300);
    }, 3500);
  },

  // Actualizar UI
  updateUI() {
    const authed = window.AuthClient.isAuthenticated();
    const user = window.AuthClient.getCurrentUser();

    if (authed && user) {
      this.elements.authButtons && (this.elements.authButtons.style.display = 'none');
      if (this.elements.userMenu) {
        this.elements.userMenu.style.display = 'flex';
        const nameSpan = this.elements.userMenu.querySelector('span');
        const avatar = this.elements.userMenu.querySelector('.user-avatar-sm');
        if (nameSpan) nameSpan.textContent = user.name || user.email?.split('@')[0] || 'Usuario';
        if (avatar) {
          avatar.src =
            user.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=C8A752&color=0B0C0F&bold=true`;
          avatar.alt = user.name || user.email || 'User';
        }
      }
      // Quitar candados de enlaces protegidos
      document.querySelectorAll('[data-protected="true"] .lock-icon')?.forEach((i) => i.remove());
    } else {
      this.elements.authButtons && (this.elements.authButtons.style.display = 'flex');
      this.elements.userMenu && (this.elements.userMenu.style.display = 'none');
    }
  },
};

// Auto-init y export
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => AuthUI.init(), 50));
} else {
  setTimeout(() => AuthUI.init(), 50);
}
window.AuthUI = AuthUI;
