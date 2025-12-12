/**
 * YAVLGOLD - AUTH UI v2.0.1
 */
const AuthUI = {
  elements: {},

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.setupPasswordToggles();
    this.updateUI();
    console.log('[AuthUI] ✅ AuthUI v2.0 inicializado');
  },

  cacheElements() {
    this.elements = {
      // Modales nuevos (dashboard/herramientas)
      loginModal: document.getElementById('loginModal'),
      registerModal: document.getElementById('registerModal'),
      // Modal principal (homepage)
      authModal: document.getElementById('auth-modal'),
      authModalClose: document.getElementById('auth-modal-close'),
      modalOverlay: document.getElementById('modal-overlay'),
      // Tabs de navegación
      loginTab: document.getElementById('login-tab'),
      registerTab: document.getElementById('register-tab'),
      // Botones
      loginBtn: document.getElementById('login-btn'),
      registerBtn: document.getElementById('register-btn'),
      // FORMULARIOS SEPARADOS - IDs únicos
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
      authError: document.getElementById('auth-error'),
      authSuccess: document.getElementById('auth-success'),
      loginError: document.getElementById('login-error'),
      registerError: document.getElementById('register-error'),
      // Nav móvil
      navToggle: document.getElementById('nav-toggle'),
      mainNav: document.getElementById('main-nav'),
      // Links
      forgotPasswordLink: document.getElementById('forgot-password-link'),
    };
  },

  attachEventListeners() {
    // Tabs de navegación entre Login/Registro
    this.elements.loginTab?.addEventListener('click', () => this.switchToLogin());
    this.elements.registerTab?.addEventListener('click', () => this.switchToRegister());

    // Cerrar modal
    this.elements.authModalClose?.addEventListener('click', () => this.hideAuthModal());

    // Click en overlay cierra modal
    document.querySelector('.auth-modal-overlay')?.addEventListener('click', () => this.hideAuthModal());

    // Botones de la navbar para abrir modales
    this.elements.loginBtn?.addEventListener('click', (e) => { e.preventDefault(); this.showLoginModal(); });
    this.elements.registerBtn?.addEventListener('click', (e) => { e.preventDefault(); this.showRegisterModal(); });

    // Modales separados (dashboard/herramientas)
    this.elements.closeLoginModal?.addEventListener('click', () => this.hideLoginModal());
    this.elements.closeRegisterModal?.addEventListener('click', () => this.hideRegisterModal());
    this.elements.loginModal?.addEventListener('click', (e) => { if (e.target === this.elements.loginModal) this.hideLoginModal(); });
    this.elements.registerModal?.addEventListener('click', (e) => { if (e.target === this.elements.registerModal) this.hideRegisterModal(); });

    // 🔒 FORMULARIOS SEPARADOS - Submit handlers
    this._attachLoginFormHandler();
    this._attachRegisterFormHandler();

    // User menu
    this.elements.userMenuBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleUserDropdown(); });
    this.elements.logoutBtn?.addEventListener('click', (e) => { e.preventDefault(); this.handleLogout(); });

    document.addEventListener('click', (e) => {
      if (this.elements.userDropdown && this.elements.userDropdown.style.display === 'block' && !this.elements.userMenu?.contains(e.target)) {
        this.elements.userDropdown.style.display = 'none';
      }
    });

    // Nav móvil
    if (this.elements.navToggle && this.elements.mainNav) {
      this.elements.navToggle.addEventListener('click', () => this.toggleMobileNav());
      this.elements.mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => this.elements.mainNav.classList.remove('active')));
    }

    // Reset password link
    this.elements.forgotPasswordLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleForgotPassword();
    });

    // Listen to auth events
    window.addEventListener('auth:signed_in', () => {
      console.log('[AuthUI] 🔔 Evento SIGNED_IN recibido');
      this.updateUI();
      this.hideAuthModal();
      if (!window.location.pathname.includes('/dashboard')) {
        setTimeout(() => { window.location.href = '/dashboard/'; }, 500);
      }
    });

    window.addEventListener('auth:initial_session', () => {
      console.log('[AuthUI] 🔔 Evento INITIAL_SESSION recibido');
      this.updateUI();
    });

    window.addEventListener('auth:signed_out', () => {
      console.log('[AuthUI] 🔔 Evento SIGNED_OUT recibido');
      this.updateUI();
    });

    window.addEventListener('auth:profileUpdated', () => this.updateUI());
  },

  // Cambiar entre tabs
  switchToLogin() {
    this.elements.loginTab?.classList.add('active');
    this.elements.registerTab?.classList.remove('active');
    this.elements.loginForm?.classList.add('active');
    this.elements.registerForm?.classList.remove('active');
    this.elements.loginForm.style.display = 'block';
    this.elements.registerForm.style.display = 'none';
    this.clearError('login');
    this.clearError('register');
    setTimeout(() => this.elements.loginForm?.querySelector('#login-email')?.focus(), 80);
  },

  switchToRegister() {
    this.elements.registerTab?.classList.add('active');
    this.elements.loginTab?.classList.remove('active');
    this.elements.registerForm?.classList.add('active');
    this.elements.loginForm?.classList.remove('active');
    this.elements.registerForm.style.display = 'block';
    this.elements.loginForm.style.display = 'none';
    this.clearError('login');
    this.clearError('register');
    setTimeout(() => this.elements.registerForm?.querySelector('#register-name')?.focus(), 80);
  },

  // Mostrar modal principal (homepage)
  showLoginModal() {
    // Sistema nuevo (loginModal separado - dashboard/herramientas)
    if (this.elements.loginModal) {
      this.elements.loginModal.style.display = 'flex';
      this.clearError('login');
      setTimeout(() => this.elements.loginForm?.querySelector('input[name="email"]')?.focus(), 80);
      return;
    }

    // Homepage - usar modal principal y cambiar a tab de login
    if (this.elements.authModal) {
      this.elements.authModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.switchToLogin();
    }
  },

  showRegisterModal() {
    // Sistema nuevo (registerModal separado - dashboard/herramientas)
    if (this.elements.registerModal) {
      this.elements.registerModal.style.display = 'flex';
      this.clearError('register');
      setTimeout(() => this.elements.registerForm?.querySelector('input[name="name"]')?.focus(), 80);
      return;
    }

    // Homepage - usar modal principal y cambiar a tab de registro
    if (this.elements.authModal) {
      this.elements.authModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.switchToRegister();
    }
  },

  hideAuthModal() {
    if (this.elements.authModal) {
      this.elements.authModal.classList.add('hidden');
      document.body.style.overflow = '';
      this.clearError('login');
      this.clearError('register');
      this.elements.loginForm?.reset();
      this.elements.registerForm?.reset();
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
    // Homepage - usar hideAuthModal
    this.hideAuthModal();
  },

  hideRegisterModal() {
    // Sistema nuevo
    if (this.elements.registerModal) {
      this.elements.registerModal.style.display = 'none';
      this.clearError('register');
      this.elements.registerForm?.reset();
      return;
    }
    // Homepage - usar hideAuthModal
    this.hideAuthModal();
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

  /**
   * 🔒 Adjuntar handler seguro al formulario de login
   * Ahora trabaja con formularios SEPARADOS con IDs únicos
   */
  _attachLoginFormHandler() {
    const loginForm = this.elements.loginForm;

    if (!loginForm) {
      console.warn('[AuthUI] ⚠️ No se encontró formulario de login (#login-form)');
      return;
    }

    console.log('[AuthUI] 📋 Adjuntando handler a formulario de LOGIN:', loginForm.id);

    // Prevenir action/method del HTML
    loginForm.setAttribute('action', 'javascript:void(0);');
    loginForm.setAttribute('method', 'post');
    loginForm.removeAttribute('target');

    // Remover listeners previos
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
    this.elements.loginForm = newLoginForm;

    newLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      console.log('🔐 [AuthUI] Submit LOGIN interceptado');

      // Campos específicos del formulario de LOGIN
      const email = newLoginForm.querySelector('#login-email')?.value?.trim();
      const password = newLoginForm.querySelector('#login-password')?.value;

      console.log('📧 Email:', email ? '✓' : '✗');
      console.log('🔑 Password:', password ? '✓' : '✗');

      if (!email || !password) {
        this.showError('login', 'Por favor completa todos los campos');
        return false;
      }

      const btn = newLoginForm.querySelector('button[type="submit"]');
      const originalText = btn?.textContent || 'Entrar';

      try {
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
        }

        if (!window.AuthClient) {
          throw new Error('AuthClient no está disponible');
        }

        console.log('🔐 [AuthUI] Llamando a AuthClient.login()...');
        const res = await window.AuthClient.login(email, password);

        if (res.success) {
          console.log('✅ [AuthUI] Login exitoso');
          this.showSuccess('¡Bienvenido de nuevo!');
          this.hideAuthModal();

          setTimeout(() => {
            window.location.href = '/dashboard/';
          }, 800);
        } else {
          console.error('❌ [AuthUI] Login falló:', res.error);
          this.showError('login', res.error || 'Error al iniciar sesión');
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
        }
      } catch (err) {
        console.error('❌ [AuthUI] Error de login:', err);
        this.showError('login', err.message || 'Error inesperado');
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      }

      return false;
    }, { capture: true });

    console.log('[AuthUI] ✅ Handler de LOGIN adjuntado correctamente');
  },

  /**
   * 🔒 Adjuntar handler seguro al formulario de registro
   */
  _attachRegisterFormHandler() {
    const registerForm = this.elements.registerForm;

    if (!registerForm) {
      console.warn('[AuthUI] ⚠️ No se encontró formulario de registro (#register-form)');
      return;
    }

    console.log('[AuthUI] 📋 Adjuntando handler a formulario de REGISTRO:', registerForm.id);

    // Prevenir action/method del HTML
    registerForm.setAttribute('action', 'javascript:void(0);');
    registerForm.setAttribute('method', 'post');
    registerForm.removeAttribute('target');

    // Remover listeners previos
    const newRegisterForm = registerForm.cloneNode(true);
    registerForm.parentNode.replaceChild(newRegisterForm, registerForm);
    this.elements.registerForm = newRegisterForm;

    newRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      console.log('📝 [AuthUI] Submit REGISTRO interceptado');

      // Campos específicos del formulario de REGISTRO
      const name = newRegisterForm.querySelector('#register-name')?.value?.trim();
      const email = newRegisterForm.querySelector('#register-email')?.value?.trim();
      const password = newRegisterForm.querySelector('#register-password')?.value;

      console.log('👤 Nombre:', name ? '✓' : '✗');
      console.log('📧 Email:', email ? '✓' : '✗');
      console.log('🔑 Password:', password ? '✓' : '✗');

      if (!name || !email || !password) {
        this.showError('register', 'Por favor completa todos los campos');
        return false;
      }

      if (password.length < 6) {
        this.showError('register', 'La contraseña debe tener al menos 6 caracteres');
        return false;
      }

      const btn = newRegisterForm.querySelector('button[type="submit"]');
      const originalText = btn?.textContent || 'Crear Cuenta';

      try {
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        }

        if (!window.AuthClient) {
          throw new Error('AuthClient no está disponible');
        }

        console.log('📝 [AuthUI] Llamando a AuthClient.register()...');
        const res = await window.AuthClient.register(email, password, name);

        if (res.success) {
          console.log('✅ [AuthUI] Registro exitoso');
          this.showSuccess('¡Cuenta creada! Revisa tu email para confirmar.');
          newRegisterForm.reset();
          // Cambiar a tab de login después del registro
          setTimeout(() => this.switchToLogin(), 2000);
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
        } else {
          console.error('❌ [AuthUI] Registro falló:', res.error);
          this.showError('register', res.error || 'Error al registrarse');
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
        }
      } catch (err) {
        console.error('❌ [AuthUI] Error de registro:', err);
        this.showError('register', err.message || 'Error inesperado');
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      }

      return false;
    }, { capture: true });

    console.log('[AuthUI] ✅ Handler de REGISTRO adjuntado correctamente');
  },

  async handleLogin(e) {
    // Método legacy - ahora manejado por _attachLoginFormHandler
    e?.preventDefault?.();
    console.warn('[AuthUI] handleLogin legacy llamado - usar _attachLoginFormHandler');
  },

  async handleRegister(e) {
    // Método legacy - ahora manejado por _attachRegisterFormHandler
    e?.preventDefault?.();
    console.warn('[AuthUI] handleRegister legacy llamado - usar _attachRegisterFormHandler');
  },

  handleLogout() {
    console.log('[AuthUI] 👋 Cerrando sesión...');
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      window.AuthClient.logout();
      this.showSuccess('Sesión cerrada correctamente');
      if (this.elements.userDropdown) this.elements.userDropdown.style.display = 'none';

      // Redirigir a la página principal después de cerrar sesión
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    }
  },

  showError(type, message) {
    // Usar authError del modal principal si existe
    const el = this.elements.authError ||
      (type === 'login' ? this.elements.loginError : this.elements.registerError);

    if (!el) return this.showToast(message, 'error');

    el.textContent = message;
    el.style.display = 'block';
    el.classList.remove('hidden');
    setTimeout(() => {
      el.style.display = 'none';
      el.classList.add('hidden');
    }, 5000);
  },

  clearError(type) {
    const el = this.elements.authError ||
      (type === 'login' ? this.elements.loginError : this.elements.registerError);
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
      el.classList.add('hidden');
    }
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

  setupPasswordToggles() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.password-toggle')) {
        const toggle = e.target.closest('.password-toggle');
        const input = toggle.parentElement.querySelector('input[type="password"], input[type="text"]');
        if (!input) return;

        const icon = toggle.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      }
    });
  },

  handleForgotPassword() {
    // Obtener email del formulario de login (ID único)
    const emailInput = this.elements.loginForm?.querySelector('#login-email');
    const email = emailInput?.value?.trim();

    if (!email) {
      this.showError('login', 'Por favor, ingresa tu correo electrónico primero');
      emailInput?.focus();
      return;
    }

    const btn = this.elements.forgotPasswordLink;
    const originalText = btn?.textContent;

    if (btn) {
      btn.textContent = 'Enviando...';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';
    }

    window.AuthClient.resetPassword(email).then((res) => {
      if (res.success) {
        this.showSuccess('¡Email de recuperación enviado! Revisa tu bandeja de entrada.');
      } else {
        this.showError('login', res.error || 'Error al enviar email de recuperación');
      }
      if (btn) {
        btn.textContent = originalText;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });
  },

  // Actualizar UI
  updateUI() {
    // Chequeo de seguridad para evitar el crash
    if (!window.AuthClient) {
      // console.warn('AuthClient aún no está listo. Reintentando...');
      setTimeout(() => this.updateUI(), 200); // Reintentar en 200ms
      return;
    }

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

// Export para imports de módulos ES6
export default AuthUI;
