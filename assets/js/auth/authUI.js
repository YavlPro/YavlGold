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
      // Formulario unificado
      authForm: document.getElementById('auth-form'),
      // Formularios separados legacy (para compatibilidad)
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      // Cerrar modales
      closeAuthModal: document.querySelector('#auth-modal-close'),
      closeLoginModal: document.querySelector('#loginModal .modal-close'),
      closeRegisterModal: document.querySelector('#registerModal .modal-close'),
      // User menu
      userMenu: document.getElementById('user-menu'),
      userMenuBtn: document.getElementById('user-menu-btn'),
      userDropdown: document.getElementById('user-dropdown'),
      logoutBtn: document.getElementById('logout-btn'),
      authButtons: document.querySelector('.auth-buttons'),
      // Errores
      authError: document.getElementById('auth-error'),
      authSuccess: document.getElementById('auth-success'),
      loginError: document.getElementById('login-error'),
      registerError: document.getElementById('register-error'),
      // Nav móvil
      navToggle: document.getElementById('nav-toggle'),
      mainNav: document.getElementById('main-nav'),
      // Links para cambiar entre login/register
      showRegisterLink: document.getElementById('show-register-link'),
      showLoginLink: document.getElementById('show-login-link'),
      // Toggle del modal de auth
      authModalToggle: document.getElementById('auth-modal-toggle-mode'),
    };
  },

  attachEventListeners() {
    // Formulario unificado de auth
    this.elements.authForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const modalMode = this.elements.authModal?.dataset.mode || 'login';
      if (modalMode === 'login') {
        this.handleLogin(e);
      } else {
        this.handleRegister(e);
      }
    });

    // Cerrar modal de auth
    this.elements.closeAuthModal?.addEventListener('click', () => this.hideAuthModal());

    // Toggle entre login y registro
    this.elements.authModalToggle?.addEventListener('click', (e) => {
      e.preventDefault();
      const currentMode = this.elements.authModal?.dataset.mode || 'login';
      this.switchAuthMode(currentMode === 'login' ? 'signup' : 'login');
    });

    // Legacy: Botones y formularios separados
    this.elements.loginBtn?.addEventListener('click', (e) => { e.preventDefault(); this.showLoginModal(); });
    this.elements.closeLoginModal?.addEventListener('click', () => this.hideLoginModal());
    this.elements.loginForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(e); });

    this.elements.registerBtn?.addEventListener('click', (e) => { e.preventDefault(); this.showRegisterModal(); });
    this.elements.closeRegisterModal?.addEventListener('click', () => this.hideRegisterModal());
    this.elements.registerForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleRegister(e); });

    this.elements.userMenuBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleUserDropdown(); });
    this.elements.logoutBtn?.addEventListener('click', (e) => { e.preventDefault(); this.handleLogout(); });

    // Click outside para cerrar modal
    this.elements.authModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.authModal || e.target.classList.contains('auth-modal-overlay')) {
        this.hideAuthModal();
      }
    });

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
      this.hideAuthModal();
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

    // Sistema con modal unificado
    if (this.elements.authModal) {
      this.elements.authModal.classList.remove('hidden');
      this.elements.authModal.dataset.mode = 'login';
      this.switchAuthMode('login');
      document.body.style.overflow = 'hidden';
      setTimeout(() => this.elements.authForm?.querySelector('#email')?.focus(), 80);
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

    // Sistema con modal unificado
    if (this.elements.authModal) {
      this.elements.authModal.classList.remove('hidden');
      this.elements.authModal.dataset.mode = 'signup';
      this.switchAuthMode('signup');
      document.body.style.overflow = 'hidden';
      setTimeout(() => this.elements.authForm?.querySelector('#email')?.focus(), 80);
    }
  },

  hideAuthModal() {
    if (this.elements.authModal) {
      this.elements.authModal.classList.add('hidden');
      document.body.style.overflow = '';
      this.clearError('auth');
      this.elements.authForm?.reset();
    }
  },

  switchAuthMode(mode) {
    if (!this.elements.authModal) return;

    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-modal-submit');
    const switchText = document.querySelector('.auth-switch');

    this.elements.authModal.dataset.mode = mode;

    if (mode === 'signup') {
      if (title) title.textContent = 'Crear Cuenta';
      if (submitBtn) submitBtn.textContent = 'Registrarse';
      if (this.elements.authModalToggle) this.elements.authModalToggle.textContent = 'Inicia sesión';
      if (switchText) switchText.innerHTML = '¿Ya tienes cuenta? <a href="#" id="auth-modal-toggle-mode">Inicia sesión</a>';
    } else {
      if (title) title.textContent = 'Iniciar Sesión';
      if (submitBtn) submitBtn.textContent = 'Entrar';
      if (this.elements.authModalToggle) this.elements.authModalToggle.textContent = 'Regístrate';
      if (switchText) switchText.innerHTML = '¿No tienes cuenta? <a href="#" id="auth-modal-toggle-mode">Regístrate</a>';
    }

    this.clearError('auth');

    // Re-bind el event listener del toggle
    const newToggle = document.getElementById('auth-modal-toggle-mode');
    if (newToggle) {
      newToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const currentMode = this.elements.authModal?.dataset.mode || 'login';
        this.switchAuthMode(currentMode === 'login' ? 'signup' : 'login');
      });
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
    } catch (err) {
      console.error('[AuthUI] Error en login:', err);
      this.showError('login', 'Error inesperado. Intenta de nuevo.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = txt; }
    }
  },

  async handleRegister(e) {
    // Para registro desde el modal unificado, necesitamos capturar el nombre
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const password = fd.get('password');
    let name = fd.get('name');

    // Si no hay campo de nombre (modal unificado), usar el email como nombre temporal
    if (!name && this.elements.authModal?.dataset.mode === 'signup') {
      name = email?.split('@')[0] || 'Usuario';
    }

    if (!email || !password) return this.showError('register', 'Por favor completa todos los campos');

    const btn = e.target.querySelector('button[type="submit"]');
    const txt = btn?.textContent || '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...'; }

    try {
      const res = await window.AuthClient.register(email, password, name);
      if (res.success) this.showSuccess('¡Cuenta creada exitosamente!');
      else this.showError('register', res.error || 'Error al registrarse');
    } catch (err) {
      console.error('[AuthUI] Error en registro:', err);
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
    // Primero intentar con elementos del modal unificado
    if (this.elements.authError) {
      this.elements.authError.textContent = message;
      this.elements.authError.classList.remove('hidden');
      this.elements.authError.style.display = 'block';
      setTimeout(() => {
        this.elements.authError.style.display = 'none';
        this.elements.authError.classList.add('hidden');
      }, 5000);
      return;
    }

    // Fallback para elementos legacy
    const el = type === 'login' ? this.elements.loginError : type === 'register' ? this.elements.registerError : null;
    if (!el) return this.showToast(message, 'error');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  },

  clearError(type) {
    // Limpiar error del modal unificado
    if (this.elements.authError) {
      this.elements.authError.textContent = '';
      this.elements.authError.style.display = 'none';
      this.elements.authError.classList.add('hidden');
    }

    // Limpiar success del modal unificado
    if (this.elements.authSuccess) {
      this.elements.authSuccess.textContent = '';
      this.elements.authSuccess.style.display = 'none';
      this.elements.authSuccess.classList.add('hidden');
    }

    // Legacy
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
