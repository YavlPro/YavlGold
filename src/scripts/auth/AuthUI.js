/**
 * AuthUI - Lógica de UI para Autenticación (V9.1)
 * @description
 * Maneja los formularios de login, logout y la visualización
 * del estado del usuario. Depende de AuthClient.
 *
 * @version 9.1.0
 * @author YavlGold Team
 */

// Importa el cliente de autenticación
import { authClient } from './AuthClient.js';
import { config } from '../config/ConfigManager.js';

class AuthUI {
  // Elementos del DOM (cache)
  #loginForm = null;
  #logoutButton = null;
  #userProfile = null;
  #userEmailEl = null;
  #authErrorEl = null;
  #authContainer = null;
  #switchToRegister = null;
  #switchToLogin = null;
  #submitButton = null;
  #mode = 'login'; // 'login' | 'signup' | 'reset'

  // Modal
  #modal = null;
  #modalTitle = null;
  #modalForm = null;
  #modalEmail = null;
  #modalPassword = null;
  #modalSubmit = null;
  #modalSwitch = null;
  #modalClose = null;
  #modalError = null;
  #modalSuccess = null;
  #forgotPasswordLink = null;
  #backToLoginLink = null;
  #hcaptchaContainer = null;
  #hcaptchaScriptLoaded = false;

  /**
   * Inicializa el módulo, cachea elementos y añade listeners.
   */
  init() {
    console.log('🎨 Inicializando AuthUI...');
    
    // 1) Intentar inicializar modo sección si existe
    this.#loginForm = document.getElementById('login-form');
    this.#logoutButton = document.getElementById('logout-button');
    this.#userProfile = document.getElementById('user-profile');
    this.#userEmailEl = document.getElementById('user-email');
    this.#authErrorEl = document.getElementById('auth-error');
    this.#authContainer = document.getElementById('auth-container');
    this.#switchToRegister = document.getElementById('switch-to-register');
    this.#switchToLogin = document.getElementById('switch-to-login');
    this.#submitButton = document.getElementById('auth-submit');

    const hasSection = this.#loginForm && this.#logoutButton && this.#userProfile;
    if (hasSection) {
      this.#loginForm.addEventListener('submit', this.#handleSubmit.bind(this));
      this.#logoutButton.addEventListener('click', this.#handleLogout.bind(this));
      this.#switchToRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        this.#mode = 'signup';
        this.#updateFormMode();
      });
      this.#switchToLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        this.#mode = 'login';
        this.#updateFormMode();
      });

      this.render();
      this.#authContainer.style.display = 'block';
    }

    // 2) Inicializar modo modal si existe
    this.#modal = document.getElementById('auth-modal');
    if (this.#modal) {
      this.#modalTitle = document.getElementById('auth-modal-title');
      this.#modalForm = document.getElementById('auth-modal-form');
      this.#modalEmail = document.getElementById('auth-modal-email');
      this.#modalPassword = document.getElementById('auth-modal-password');
      this.#modalSubmit = document.getElementById('auth-modal-submit');
      this.#modalSwitch = document.getElementById('auth-modal-toggle-mode');
      this.#modalClose = document.getElementById('auth-modal-close');
      this.#modalError = document.getElementById('auth-modal-error');
      this.#modalSuccess = document.getElementById('auth-modal-success');
      this.#forgotPasswordLink = document.getElementById('forgot-password-link');
      this.#backToLoginLink = document.getElementById('back-to-login-link');
  this.#hcaptchaContainer = document.getElementById('hcaptcha-container');

      // Abrir modal desde eventos globales
      document.addEventListener('open-auth-modal', (e) => {
        const mode = e.detail?.mode;
        if (mode === 'login' || mode === 'signup') {
          this.#mode = mode;
        }
        this.#showModal();
      });
      window.addEventListener('open-auth-modal', (e) => {
        const mode = e.detail?.mode;
        if (mode === 'login' || mode === 'signup') {
          this.#mode = mode;
        }
        this.#showModal();
      });

      // Cerrar modal al click fuera
      this.#modal.addEventListener('click', (e) => {
        if (e.target.id === 'auth-modal') this.#hideModal();
      });
      this.#modalClose?.addEventListener('click', (e) => {
        e.preventDefault();
        this.#hideModal();
      });

      // Submit del modal
      this.#modalForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.#clearMessages();
        const email = this.#modalEmail?.value;
        const password = this.#modalPassword?.value;
        console.log('[AuthUI] ▶️ Submit modal', { mode: this.#mode, email });
        
        try {
          // Validación previa del CAPTCHA (si está activo)
          if (this.#hcaptchaContainer && typeof window !== 'undefined' && typeof window.hcaptcha !== 'undefined') {
            const token = window.hcaptcha.getResponse();
            if (!token || token.trim().length === 0) {
              this.#showError('Por favor completa el CAPTCHA');
              return;
            }
          }

          if (this.#mode === 'reset') {
            // Modo recuperación de contraseña
            console.log('[AuthUI] 🔁 Enviando correo de recuperación...');
            await authClient.resetPassword(email);
            console.log('[AuthUI] ✅ Solicitud de recuperación enviada');
            this.#showSuccess('✅ Se ha enviado un email de recuperación. Revisa tu bandeja de entrada.');
            // Limpiar el campo de email después de 3 segundos
            setTimeout(() => {
              this.#modalForm?.reset();
              this.#clearMessages();
            }, 3000);
          } else if (this.#mode === 'signup') {
            console.log('[AuthUI] 📝 SignUp...');
            await authClient.signUp(email, password);
            this.render();
            this.#hideModal();
          } else {
            console.log('[AuthUI] 🔐 SignIn...');
            await authClient.signIn(email, password);
            this.render();
            this.#hideModal();
          }
        } catch (err) {
          console.error('❌ Error de Auth (modal):', err.message);
          this.#showError(err.message);
        }
          // Reset del CAPTCHA después de un intento (éxito o error)
          if (this.#hcaptchaContainer && typeof window !== 'undefined' && typeof window.hcaptcha !== 'undefined') {
            try { window.hcaptcha.reset(); } catch {}
          }
      });

      // Toggle modo modal (login <-> signup)
      this.#modalSwitch?.addEventListener('click', (e) => {
        e.preventDefault();
        this.#mode = this.#mode === 'signup' ? 'login' : 'signup';
        this.#refreshModalTexts();
      });

      // Link "¿Olvidaste tu contraseña?"
      this.#forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        this.#mode = 'reset';
        this.#refreshModalTexts();
      });

      // Link "Volver a iniciar sesión"
      this.#backToLoginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        this.#mode = 'login';
        this.#refreshModalTexts();
      });

      // Inicializar textos de modal
      this.#refreshModalTexts();
    }

    if (!hasSection && !this.#modal) {
      console.warn('⚠️ No se encontró UI de autenticación (sección o modal).');
    }
  }

  /**
   * Maneja el envío del formulario de login.
   * @private
   */
  async #handleSubmit(e) {
    e.preventDefault();
    this.#clearError();
    const formData = new FormData(this.#loginForm);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      if (this.#mode === 'signup') {
        console.log(`� Registrando cuenta para ${email}...`);
        await authClient.signUp(email, password);
        console.log('✅ Registro exitoso (revisa tu correo si requiere verificación)');
      } else {
        console.log(`�🔐 Intentando iniciar sesión como ${email}...`);
        await authClient.signIn(email, password);
        console.log('✅ Login exitoso');
      }
      this.render();
    } catch (error) {
      console.error('❌ Error de Login:', error.message);
      this.#showError(error.message);
    }
  }

  /**
   * Maneja el clic en el botón de logout.
   * @private
   */
  async #handleLogout() {
    this.#clearError();
    try {
      console.log('🚪 Cerrando sesión...');
      await authClient.signOut();
      console.log('✅ Logout exitoso');
      this.render();
    } catch (error) {
      console.error('❌ Error de Logout:', error.message);
      this.#showError(error.message);
    }
  }

  /**
   * Actualiza la UI basado en el estado de autenticación.
   */
  render() {
    if (authClient.isAuthenticated()) {
      // Usuario Logueado
      const user = authClient.getCurrentUser();
      this.#userEmailEl.textContent = user.email;
      this.#loginForm.style.display = 'none';
      this.#userProfile.style.display = 'block';
    } else {
      // Usuario Deslogueado
      this.#loginForm.style.display = 'block';
      this.#userProfile.style.display = 'none';
      this.#loginForm.reset();
      this.#updateFormMode();
    }
  }

  /**
   * Muestra un mensaje de error en la UI.
   * @param {string} message
   */
  #showError(message) {
    // Mostrar error en la sección si existe
    if (this.#authErrorEl) {
      this.#authErrorEl.textContent = message;
      this.#authErrorEl.style.display = 'block';
    }
    
    // Mostrar error en el modal si existe y está activo
    if (this.#modalError && this.#modal && !this.#modal.classList.contains('hidden')) {
      this.#modalError.textContent = message;
      this.#modalError.classList.remove('hidden');
    }
  }

  /**
   * Limpia el mensaje de error.
   */
  #clearError() {
    // Limpiar error de la sección
    if (this.#authErrorEl) {
      this.#authErrorEl.textContent = '';
      this.#authErrorEl.style.display = 'none';
    }
    
    // Limpiar error del modal
    if (this.#modalError) {
      this.#modalError.textContent = '';
      this.#modalError.classList.add('hidden');
    }
  }

  /**
   * Muestra un mensaje de éxito en la UI.
   * @param {string} message
   */
  #showSuccess(message) {
    if (this.#modalSuccess && this.#modal && !this.#modal.classList.contains('hidden')) {
      this.#modalSuccess.textContent = message;
      this.#modalSuccess.classList.remove('hidden');
    }
  }

  /**
   * Limpia todos los mensajes (error y éxito).
   */
  #clearMessages() {
    this.#clearError();
    
    // Limpiar mensaje de éxito del modal
    if (this.#modalSuccess) {
      this.#modalSuccess.textContent = '';
      this.#modalSuccess.classList.add('hidden');
    }
  }

  /**
   * Actualiza etiquetas y toggles según el modo actual (login/signup)
   * @private
   */
  #updateFormMode() {
    const titleEl = this.#loginForm?.querySelector('h3');
    if (this.#mode === 'signup') {
      if (titleEl) titleEl.textContent = 'Crear Cuenta';
      if (this.#submitButton) this.#submitButton.textContent = 'Registrarme';
      if (this.#switchToRegister) this.#switchToRegister.style.display = 'none';
      if (this.#switchToLogin) this.#switchToLogin.style.display = 'inline';
    } else {
      if (titleEl) titleEl.textContent = 'Iniciar Sesión';
      if (this.#submitButton) this.#submitButton.textContent = 'Entrar';
      if (this.#switchToRegister) this.#switchToRegister.style.display = 'inline';
      if (this.#switchToLogin) this.#switchToLogin.style.display = 'none';
    }
  }

  /**
   * Permite a la navegación cambiar el modo de formulario (login/registro)
   * @param {'login'|'signup'} mode
   */
  setMode(mode) {
    if (mode !== 'login' && mode !== 'signup') return;
    this.#mode = mode;
    // Si el formulario aún no existe, se aplicará en init()
    if (this.#loginForm) {
      this.#updateFormMode();
    }
    if (this.#modal) {
      this.#refreshModalTexts();
    }
  }

  // Modal helpers
  #showModal() {
    if (!this.#modal) return;
    this.#clearMessages();
    this.#modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.#refreshModalTexts();
    // Cargar y renderizar hCaptcha si hay site key
    this.#ensureHCaptcha();
    // Focus en el primer input
    setTimeout(() => {
      this.#modalEmail?.focus();
    }, 100);
  }

  #hideModal() {
    if (!this.#modal) return;
    this.#clearMessages();
    this.#modal.classList.add('hidden');
    document.body.style.overflow = '';
    // Reset form y volver a modo login
    this.#modalForm?.reset();
    this.#mode = 'login';
    this.#refreshModalTexts();
  }

  #refreshModalTexts() {
    if (!this.#modal) return;
    
    // Obtener elementos del formulario
    const passwordGroup = this.#modalPassword?.closest('.form-group');
    const switchContainer = this.#modalSwitch?.closest('.auth-switch');
    const forgotContainer = this.#forgotPasswordLink?.closest('.forgot-password-container');
    const backContainer = this.#backToLoginLink?.closest('.back-to-login-container');
    
    if (this.#mode === 'reset') {
      // Modo recuperación de contraseña
      if (this.#modalTitle) this.#modalTitle.textContent = 'Recuperar Contraseña';
      if (this.#modalSubmit) this.#modalSubmit.textContent = 'Enviar Email';
      
      // Ocultar campo de password y toggle de registro
      if (passwordGroup) passwordGroup.style.display = 'none';
      if (switchContainer) switchContainer.style.display = 'none';
      if (forgotContainer) forgotContainer.style.display = 'none';
      
      // Mostrar link para volver a login
      if (backContainer) backContainer.style.display = 'block';

      // Desactivar validación nativa del formulario y neutralizar campo password oculto
      if (this.#modalForm) this.#modalForm.setAttribute('novalidate', '');
      if (this.#modalPassword) {
        try {
          this.#modalPassword.required = false;
          this.#modalPassword.disabled = true;
          this.#modalPassword.setAttribute('aria-hidden', 'true');
          this.#modalPassword.setAttribute('tabindex', '-1');
        } catch {}
      }
      
    } else if (this.#mode === 'signup') {
      // Modo registro
      if (this.#modalTitle) this.#modalTitle.textContent = 'Crear Cuenta';
      if (this.#modalSubmit) this.#modalSubmit.textContent = 'Registrarme';
      if (this.#modalSwitch) this.#modalSwitch.textContent = 'Iniciar Sesión';
      
      // Mostrar campo de password y toggle
      if (passwordGroup) passwordGroup.style.display = 'block';
      if (switchContainer) switchContainer.style.display = 'block';
      if (forgotContainer) forgotContainer.style.display = 'none';
      if (backContainer) backContainer.style.display = 'none';

      // Restaurar validación nativa y reactivar password
      if (this.#modalForm) this.#modalForm.removeAttribute('novalidate');
      if (this.#modalPassword) {
        try {
          this.#modalPassword.disabled = false;
          this.#modalPassword.required = true;
          this.#modalPassword.removeAttribute('aria-hidden');
          this.#modalPassword.removeAttribute('tabindex');
        } catch {}
      }
      
    } else {
      // Modo login (default)
      if (this.#modalTitle) this.#modalTitle.textContent = 'Iniciar Sesión';
      if (this.#modalSubmit) this.#modalSubmit.textContent = 'Entrar';
      if (this.#modalSwitch) this.#modalSwitch.textContent = 'Regístrate';
      
      // Mostrar todo excepto back to login
      if (passwordGroup) passwordGroup.style.display = 'block';
      if (switchContainer) switchContainer.style.display = 'block';
      if (forgotContainer) forgotContainer.style.display = 'block';
      if (backContainer) backContainer.style.display = 'none';

      // Restaurar validación nativa y reactivar password
      if (this.#modalForm) this.#modalForm.removeAttribute('novalidate');
      if (this.#modalPassword) {
        try {
          this.#modalPassword.disabled = false;
          this.#modalPassword.required = true;
          this.#modalPassword.removeAttribute('aria-hidden');
          this.#modalPassword.removeAttribute('tabindex');
        } catch {}
      }
    }
  }

  async #ensureHCaptcha() {
    try {
      // Requiere que ConfigManager esté inicializado en main.js antes
      const siteKey = config.isInitialized() ? config.get('HCAPTCHA_SITE_KEY') : '';
      if (!siteKey) return; // No hay captcha configurado

      // Asegurar contenedor presente
      if (!this.#hcaptchaContainer) return;

      // Si ya está renderizado, no hacer nada
      if (typeof window.hcaptcha !== 'undefined' && this.#hcaptchaContainer.childElementCount > 0) {
        return;
      }

      // Cargar script una sola vez
      if (!this.#hcaptchaScriptLoaded && typeof window.hcaptcha === 'undefined') {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://js.hcaptcha.com/1/api.js';
          s.async = true;
          s.defer = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('No se pudo cargar hCaptcha'));
          document.head.appendChild(s);
        });
        this.#hcaptchaScriptLoaded = true;
      }

      // Renderizar el widget si aún no existe
      if (typeof window.hcaptcha !== 'undefined' && this.#hcaptchaContainer.childElementCount === 0) {
        const widget = document.createElement('div');
        widget.className = 'h-captcha';
        widget.setAttribute('data-sitekey', siteKey);
        this.#hcaptchaContainer.appendChild(widget);
        // Si la API ya está lista, se auto-renderiza; en algunos casos llamar a render explícito
        if (window.hcaptcha.render) {
          window.hcaptcha.render(widget, { sitekey: siteKey });
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo inicializar hCaptcha:', e.message);
    }
  }
}

// Exportar una instancia única
export const authUI = new AuthUI();
