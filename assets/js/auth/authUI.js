/**
 * YAVLGOLD - AUTH UI v2.2 (Modular Fix)
 * Ruta: apps/gold/assets/js/auth/authUI.js
 */
import { loginWithEmailPassword, logout } from './authClient.js';
import { supabase } from '../config/supabase-config.js';

const AuthUI = {
  elements: {},

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.checkSession();
    console.log('[AuthUI] ✅ Sistema Modular Cargado');
  },

  cacheElements() {
    this.elements = {
      // Soporte para ambos IDs de formulario (por si acaso)
      loginForm: document.getElementById('loginForm') || document.getElementById('login-form'),
      loginBtn: document.getElementById('login-btn'),
      logoutBtn: document.getElementById('logout-btn'),
      userMenu: document.getElementById('user-menu'),
      authButtons: document.querySelector('.auth-buttons'),
      authModal: document.getElementById('auth-modal') || document.getElementById('loginModal'),

      // Inputs flexibles (busca por ID o por name)
      emailInput: document.getElementById('email') || document.querySelector('input[name="email"]'),
      passInput: document.getElementById('password') || document.querySelector('input[name="password"]')
    };
  },

  attachEventListeners() {
    // LOGIN
    if (this.elements.loginForm) {
      this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // LOGOUT
    this.elements.logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleLogout();
    });

    // ABRIR MODAL
    this.elements.loginBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal();
    });
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : 'Entrar';

    if (btn) { btn.textContent = 'Verificando...'; btn.disabled = true; }

    // Obtenemos valores de forma segura
    const email = this.elements.emailInput?.value || e.target.querySelector('input[name="email"]')?.value;
    const password = this.elements.passInput?.value || e.target.querySelector('input[name="password"]')?.value;

    const result = await loginWithEmailPassword(email, password);

    if (result.ok) {
      this.showToast('¡Bienvenido!', 'success');
      setTimeout(() => window.location.href = '/panel', 1000); // Redirección
    } else {
      this.showToast(result.error, 'error');
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
  },

  async handleLogout() {
    if (confirm('¿Cerrar sesión?')) await logout();
  },

  // VERIFICACIÓN DE SESIÓN EN VIVO
  async checkSession() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    this.updateUI(session?.user);

    supabase.auth.onAuthStateChange((_event, session) => {
      this.updateUI(session?.user);
    });
  },

  updateUI(user) {
    if (user) {
      // Usuario conectado
      if (this.elements.authButtons) this.elements.authButtons.style.display = 'none';
      if (this.elements.userMenu) {
        this.elements.userMenu.style.display = 'flex';
        const nameSpan = this.elements.userMenu.querySelector('span');
        if (nameSpan) nameSpan.textContent = user.email.split('@')[0];
      }
    } else {
      // Visitante
      if (this.elements.authButtons) this.elements.authButtons.style.display = 'flex';
      if (this.elements.userMenu) this.elements.userMenu.style.display = 'none';
    }
  },

  showModal() {
    if (this.elements.authModal) {
      this.elements.authModal.style.display = 'flex';
      this.elements.authModal.classList.remove('hidden');
    }
  },

  showToast(message, type = 'success') {
    let toast = document.getElementById('auth-toast');
    if (!toast) {
      toast = document.createElement('div'); toast.id = 'auth-toast'; document.body.appendChild(toast);
    }
    const bg = type === 'success' ? '#C8A752' : '#ff5252';
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${bg}; color: #000; padding: 12px 24px; border-radius: 8px; z-index: 10000; font-weight: bold;`;
    toast.textContent = message;
    setTimeout(() => toast.remove(), 3000);
  }
};

// Auto-inicialización
document.addEventListener('DOMContentLoaded', () => { AuthUI.init(); });
