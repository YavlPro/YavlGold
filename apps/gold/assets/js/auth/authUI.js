// YAVLGOLD - AUTH UI v2.0.1
import logo3D from '../../images/logo.webp';

function getSafeAvatarUrl(user) {
  if (user?.avatar) return user.avatar;
  if (window.AuthClient?.buildLocalAvatar) {
    return window.AuthClient.buildLocalAvatar(user?.name || user?.email || 'Usuario');
  }
  return '';
}

const AuthUI = {
  elements: {},
  isRecoveryMode: false,
  isUpdatePasswordMode: false,

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.setupPasswordToggles();
    this.updateUI();
    this.syncAuthModalWithHash();
    console.log('[AuthUI] ✅ AuthUI v2.0 inicializado');

    // 🔑 RECEPTOR: Leer la "nota de la nevera" que dejó authClient
    if (sessionStorage.getItem('yavl_recovery_pending') === 'true') {
      console.log('[AuthUI] 📬 Nota de recovery encontrada. Ejecutando orden...');
      // ⚠️ NO borrar la nota aquí - se borra SOLO al éxito del cambio de contraseña
      // Pequeño delay para asegurar transición suave
      setTimeout(() => {
        this.showUpdatePasswordMode();
      }, 500);
    }
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
      this.toggleRecoveryMode(true);
    });

    window.addEventListener('hashchange', () => this.syncAuthModalWithHash());

    // Listen to auth events
    window.addEventListener('auth:signed_in', () => {
      console.log('[AuthUI] 🔔 Evento SIGNED_IN recibido');
      this.updateUI();
      this.hideAllAuthModals();

      // 🛑 NO redirigir si hay recovery pendiente
      if (sessionStorage.getItem('yavl_recovery_pending') === 'true') {
        console.log('[AuthUI] 🛑 Recovery pendiente. NO redirigir.');
        return;
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
    window.addEventListener('auth:callback:error', (event) => {
      const message = event?.detail?.message || 'No se pudo completar el acceso.';
      this.showError('login', message);
    });
  },

  // Cambiar entre tabs
  switchToLogin() {
    if (this.elements.authModal) {
      this.elements.authModal.dataset.mode = 'login';
    }
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
    if (this.elements.authModal) {
      this.elements.authModal.dataset.mode = 'signup';
    }
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
  showLoginModal(options = {}) {
    // Sistema nuevo (loginModal separado - dashboard/herramientas)
    if (this.elements.loginModal) {
      this.elements.loginModal.style.display = 'flex';
      this.clearError('login');
      if (!options.skipHashSync) this.writeAuthHash('login');
      setTimeout(() => this.elements.loginForm?.querySelector('input[name="email"]')?.focus(), 80);
      return;
    }

    // Homepage - usar modal principal y cambiar a tab de login
    if (this.elements.authModal) {
      this.elements.authModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.switchToLogin();
      if (!options.skipHashSync) this.writeAuthHash('login');
    }
  },

  showRegisterModal(options = {}) {
    // Sistema nuevo (registerModal separado - dashboard/herramientas)
    if (this.elements.registerModal) {
      this.elements.registerModal.style.display = 'flex';
      this.clearError('register');
      if (!options.skipHashSync) this.writeAuthHash('signup');
      setTimeout(() => this.elements.registerForm?.querySelector('input[name="name"]')?.focus(), 80);
      return;
    }

    // Homepage - usar modal principal y cambiar a tab de registro
    if (this.elements.authModal) {
      this.elements.authModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.switchToRegister();
      if (!options.skipHashSync) this.writeAuthHash('signup');
    }
  },

  // Método público para compatibilidad con openAuthModal() global
  openAuthModal(mode) {
    if (mode === 'signup' || mode === 'register') {
      this.showRegisterModal();
    } else {
      this.showLoginModal();
    }
  },

  hideAuthModal(options = {}) {
    if (this.elements.authModal) {
      this.elements.authModal.classList.add('hidden');
      document.body.style.overflow = '';
      this.clearError('login');
      this.clearError('register');
      this.elements.loginForm?.reset();
      this.elements.registerForm?.reset();
    }
    if (!options.skipHashSync) this.clearAuthHash();
  },

  hideLoginModal(options = {}) {
    // Sistema nuevo
    if (this.elements.loginModal) {
      this.elements.loginModal.style.display = 'none';
      this.clearError('login');
      this.elements.loginForm?.reset();
      if (!options.skipHashSync) this.clearAuthHash();
      return;
    }
    // Homepage - usar hideAuthModal
    this.hideAuthModal(options);
  },

  hideRegisterModal(options = {}) {
    // Sistema nuevo
    if (this.elements.registerModal) {
      this.elements.registerModal.style.display = 'none';
      this.clearError('register');
      this.elements.registerForm?.reset();
      if (!options.skipHashSync) this.clearAuthHash();
      return;
    }
    // Homepage - usar hideAuthModal
    this.hideAuthModal(options);
  },

  hideAllAuthModals(options = {}) {
    this.hideAuthModal({ skipHashSync: true });
    this.hideLoginModal({ skipHashSync: true });
    this.hideRegisterModal({ skipHashSync: true });
    if (!options.skipHashSync) this.clearAuthHash();
  },

  getAuthHashMode() {
    const hash = String(window.location.hash || '').toLowerCase();
    if (hash === '#login') return 'login';
    if (hash === '#signup' || hash === '#register') return 'signup';
    return '';
  },

  writeAuthHash(mode) {
    if (typeof window === 'undefined') return;
    const nextHash = mode === 'signup' ? '#signup' : '#login';
    const url = new URL(window.location.href);
    if (url.hash === nextHash) return;
    url.hash = nextHash;
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  },

  clearAuthHash() {
    if (typeof window === 'undefined') return;
    if (!this.getAuthHashMode()) return;
    const url = new URL(window.location.href);
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  },

  syncAuthModalWithHash() {
    const mode = this.getAuthHashMode();
    if (!mode) {
      if (!this.isRecoveryMode && !this.isUpdatePasswordMode) {
        this.hideAllAuthModals({ skipHashSync: true });
      }
      return;
    }

    if (mode === 'signup') {
      this.showRegisterModal({ skipHashSync: true });
    } else {
      this.showLoginModal({ skipHashSync: true });
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

    // Re-bind Toggle/Back links dynamically since we cloned the form
    const forgotLink = newLoginForm.querySelector('#forgot-password-link');
    forgotLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleRecoveryMode(true);
    });

    // Create or bind Back to Login link
    let backLink = newLoginForm.querySelector('.back-to-login-link');
    if (!backLink) {
      // It might be created dynamically in toggleRecoveryMode, but we need to bind if it exists or when created
    }

    newLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const email = newLoginForm.querySelector('#login-email')?.value?.trim();

      // 🔄 MODO RECUPERACIÓN
      if (this.isRecoveryMode) {
        console.log('[AuthUI] 🔄 Procesando solicitud de RECUPERACIÓN');

        if (!email) {
          this.showError('login', 'Ingresa tu correo electrónico para recuperarlo');
          return false;
        }

        // Validar captcha visualmente (opcional, ya lo hace authClient pero mejora UX)
        if (typeof hcaptcha !== 'undefined' && !hcaptcha.getResponse()) {
          this.showError('login', 'Por favor completa el captcha');
          return false;
        }

        const btn = newLoginForm.querySelector('button[type="submit"]');
        const originalText = btn?.textContent || 'Enviar Enlace';

        try {
          if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; }

          const res = await window.AuthClient.resetPassword(email);

          if (res.success) {
            this.showSuccess('¡Enlace enviado! Revisa tu correo.');
            // Volver al login después de un momento
            setTimeout(() => this.toggleRecoveryMode(false), 3000);
          } else {
            this.showError('login', res.error || 'Error al enviar enlace');
            this.resetCaptcha();
          }
        } catch (err) {
          this.showError('login', err.message);
          this.resetCaptcha();
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
        }
        return false;
      }

      // 🔄 MODO UPDATE PASSWORD (NUEVO)
      if (this.isUpdatePasswordMode) {
        console.log('[AuthUI] 🔄 Procesando ACTUALIZACIÓN DE CONTRASEÑA');

        const password = newLoginForm.querySelector('#login-password')?.value;

        if (!password || password.length < 8) {
          this.showError('login', 'La contraseña debe tener al menos 8 caracteres');
          return false;
        }

        const btn = newLoginForm.querySelector('button[type="submit"]');
        const originalText = btn?.textContent || 'Guardar';

        try {
          if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }

          // Usar AuthClient.supabase directamente o añadir método wrapper.
          // Accedemos a supabase a través de AuthClient si está expuesto, o importamos supabase-config si fuera necesario.
          // window.AuthClient.supabase debería estar disponible.

          if (!window.AuthClient?.supabase) {
            throw new Error('Supabase no disponible');
          }

          const { data, error } = await window.AuthClient.supabase.auth.updateUser({ password: password });

          if (error) throw error;

          this.showSuccess('Contraseña Actualizada Correctamente');

          // 🧽 AHORA SÍ: Borrar la nota porque el cambio fue exitoso
          sessionStorage.removeItem('yavl_recovery_pending');
          console.log('[AuthUI] ✅ Recovery completado. Nota borrada.');

          setTimeout(() => {
            if (!sessionStorage.getItem('yavl_recovery_pending')) {
              window.location.href = '/dashboard/';
            } else {
              console.log('[AuthUI] 🛑 Redirección al Dashboard bloqueada por Recovery');
            }
          }, 1000);

        } catch (err) {
          console.error('[AuthUI] Update password error:', err);
          this.showError('login', err.message);
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
        }

        return false;
      }

      // 🔐 MODO LOGIN NORMAL (INVISIBLE CAPTCHA)
      console.log('🔐 [AuthUI] Submit LOGIN interceptado. Verificando hCaptcha...');

      const password = newLoginForm.querySelector('#login-password')?.value;

      if (!email || !password) {
        this.showError('login', 'Por favor completa todos los campos');
        return false;
      }

      const btn = newLoginForm.querySelector('button[type="submit"]');
      const originalText = btn?.textContent || 'Entrar';

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
      }

      // 1. INTENTO PRIMARIO: Ejecutar Captcha Invisible (Definido en index.html)
      if (typeof window.executeLoginCaptcha === 'function') {
        console.log('[AuthUI] 🤖 Ejecutando hCaptcha Invisible...');
        window.executeLoginCaptcha(email, password, btn, originalText);
      }
      // 2. FALLBACK DE EMERGENCIA: Login directo (si hCaptcha falló al cargar)
      else {
        console.warn('[AuthUI] ⚠️ executeLoginCaptcha no disponible. Probando login directo...');
        try {
          if (!window.AuthClient) throw new Error('AuthClient no disponible');

          const res = await window.AuthClient.login(email, password);

          if (res.success) {
            console.log('✅ [AuthUI] Login directo exitoso');
            this.showSuccess('¡Bienvenido de nuevo!');
            this.hideAllAuthModals();
          } else {
            throw new Error(res.error || 'Error al iniciar sesión');
          }
        } catch (err) {
          console.error('❌ [AuthUI] Login error:', err);
          this.showError('login', err.message);
          this.resetCaptcha();
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
        }
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

      if (password.length < 8) {
        this.showError('register', 'La contraseña debe tener al menos 8 caracteres');
        return false;
      }

      const btn = newRegisterForm.querySelector('button[type="submit"]');
      const originalText = btn?.textContent || 'Crear Cuenta';

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
      }

      // Use invisible hCaptcha - execute programmatically
      if (typeof window.executeRegisterCaptcha === 'function') {
        window.executeRegisterCaptcha(name, email, password, btn, originalText);
      } else {
        // Fallback to direct register if invisible captcha not available
        console.warn('[AuthUI] executeRegisterCaptcha not available, using direct register');
        try {
          if (!window.AuthClient) {
            throw new Error('AuthClient no está disponible');
          }

          console.log('📝 [AuthUI] Llamando a AuthClient.register()...');
          const res = await window.AuthClient.register(email, password, name);

          if (res.success) {
            console.log('✅ [AuthUI] Registro exitoso');
            this.showSuccess('¡Cuenta creada! Revisa tu email para confirmar.');
            newRegisterForm.reset();
            setTimeout(() => this.switchToLogin(), 2000);
            if (btn) { btn.disabled = false; btn.textContent = originalText; }
          } else {
            console.error('❌ [AuthUI] Registro falló:', res.error);
            this.showError('register', res.error || 'Error al registrarse');
            this.resetCaptcha();
            if (btn) { btn.disabled = false; btn.textContent = originalText; }
          }
        } catch (err) {
          console.error('❌ [AuthUI] Error de registro:', err);
          this.showError('register', err.message || 'Error inesperado');
          this.resetCaptcha();
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
        }
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
    // XSS Prevention: Use DOM methods instead of innerHTML for message
    toast.innerHTML = '';
    const icon = document.createElement('i');
    icon.className = `fas ${style.icon}`;
    const span = document.createElement('span');
    span.textContent = message; // textContent = safe from XSS
    toast.appendChild(icon);
    toast.appendChild(span);
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

  /**
   * 🔄 Reset hCaptcha widget (para reintentos después de errores)
   */
  resetCaptcha() {
    if (typeof hcaptcha !== 'undefined') {
      try {
        hcaptcha.reset();
        console.log('[AuthUI] 🔄 hCaptcha reseteado');
      } catch (e) {
        console.warn('[AuthUI] ⚠️ No se pudo resetear hCaptcha:', e.message);
      }
    }
  },

  handleForgotPassword() {
    // Legacy wrapper
    this.toggleRecoveryMode(true);
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
          avatar.src = getSafeAvatarUrl(user);
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
  toggleRecoveryMode(active) {
    this.isRecoveryMode = active;
    this.resetCaptcha(); // Siempre limpiar captcha al cambiar de modo
    const form = this.elements.loginForm;
    if (!form) return;

    const tabsParams = document.querySelector('.auth-tabs'); // En el modal general
    const passwordGroup = form.querySelector('.form-group:nth-of-type(2)'); // Password
    const rememberGroup = form.querySelector('.form-group:nth-of-type(3)'); // Remember me
    const submitBtn = form.querySelector('button[type="submit"]');
    const forgotContainer = form.querySelector('.forgot-password-container');

    // Título dinámico
    let titleEl = document.getElementById('auth-dynamic-title');
    if (!titleEl && active) {
      titleEl = document.createElement('h2');
      titleEl.id = 'auth-dynamic-title';
      titleEl.style.cssText = 'text-align: center; font-size: 1.8rem; margin-bottom: 20px; color: var(--gold-principal);';
      titleEl.textContent = 'Recuperar Contraseña';
      form.insertBefore(titleEl, form.firstChild);
    }

    if (active) {
      // Ocultar Tabs si existen
      if (tabsParams) tabsParams.style.display = 'none';
      if (titleEl) titleEl.style.display = 'block';

      // Ocultar Password y Remember
      if (passwordGroup) passwordGroup.style.display = 'none';
      if (rememberGroup) rememberGroup.style.display = 'none';

      // Cambiar Botón
      if (submitBtn) submitBtn.textContent = 'Enviar Enlace de Recuperación';

      // Ocultar link "Olvide contraseña"
      if (forgotContainer) forgotContainer.style.display = 'none';

      // Mostrar "Volver a Login"
      let backLink = document.getElementById('back-to-login-dynamic');
      if (!backLink) {
        backLink = document.createElement('div');
        backLink.id = 'back-to-login-dynamic';
        backLink.style.textAlign = 'center';
        backLink.style.marginTop = '15px';
        backLink.innerHTML = `<a href="#" class="back-to-login-link"><i class="fas fa-arrow-left"></i> Volver a Iniciar Sesión</a>`;
        form.appendChild(backLink);

        backLink.querySelector('a').addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleRecoveryMode(false);
        });
      }
      backLink.style.display = 'block';

    } else {
      // Restaurar UI Normal
      if (tabsParams) tabsParams.style.display = 'flex';
      if (titleEl) titleEl.style.display = 'none';

      if (passwordGroup) passwordGroup.style.display = 'block';
      if (rememberGroup) rememberGroup.style.display = 'flex'; // Usually flex

      if (submitBtn) submitBtn.textContent = 'Entrar';

      if (forgotContainer) forgotContainer.style.display = 'block';

      const backLink = document.getElementById('back-to-login-dynamic');
      if (backLink) backLink.style.display = 'none';
    }

    this.clearError('login');
  },

  showUpdatePasswordMode() {
    console.log('[AuthUI] 🔑 Activando modo UPDATE PASSWORD');
    this.isUpdatePasswordMode = true;
    this.isRecoveryMode = false; // CRÍTICO: Apagar Recovery para evitar conflicto
    this.showLoginModal();

    const form = this.elements.loginForm;
    if (!form) return;

    // UI Adjustments
    const emailGroup = form.querySelector('.form-group:nth-of-type(1)'); // Email
    const passwordGroup = form.querySelector('.form-group:nth-of-type(2)'); // Password
    const rememberGroup = form.querySelector('.form-group:nth-of-type(3)'); // Remember me
    const submitBtn = form.querySelector('button[type="submit"]');
    const forgotContainer = form.querySelector('.forgot-password-container');
    const tabsParams = document.querySelector('.auth-tabs');

    // Título dinámico
    let titleEl = document.getElementById('auth-dynamic-title');
    if (!titleEl) {
      titleEl = document.createElement('h2');
      titleEl.id = 'auth-dynamic-title';
      titleEl.style.cssText = 'text-align: center; font-size: 1.8rem; margin-bottom: 20px; color: var(--gold-principal);';
      form.insertBefore(titleEl, form.firstChild);
    }

    titleEl.textContent = 'Establecer Nueva Contraseña';
    titleEl.style.display = 'block';

    if (tabsParams) tabsParams.style.display = 'none';
    if (emailGroup) emailGroup.style.display = 'none';
    if (passwordGroup) passwordGroup.style.display = 'block';
    if (rememberGroup) rememberGroup.style.display = 'none';
    if (forgotContainer) forgotContainer.style.display = 'none';

    if (submitBtn) submitBtn.textContent = 'Guardar Nueva Contraseña';

    // 🔓 DESARMAR validación del email (oculto pero aún required = bloqueo del navegador)
    const emailInput = form.querySelector('#login-email');
    if (emailInput) {
      emailInput.required = false;
      emailInput.value = 'recovery@placeholder.com'; // Valor dummy para evitar validación
    }

    // Ensure password input is visible and required
    const passwordInput = form.querySelector('#login-password');
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.placeholder = 'Nueva contraseña';
      passwordInput.required = true; // El password SÍ es obligatorio
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
