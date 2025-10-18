/**
 * =============================================
 * YAVLGOLD - THEME MANAGER v1.0
 * Sistema de gestión de temas (claro/oscuro)
 * =============================================
 */

const ThemeManager = {
  THEMES: {
    DARK: 'dark',
    LIGHT: 'light'
  },
  
  STORAGE_KEY: 'gg:theme',
  
  /**
   * Inicializar el sistema de temas
   */
  init() {
    console.log('[ThemeManager] 🎨 Inicializando sistema de temas...');
    
    // Cargar tema guardado o usar oscuro por defecto
    const savedTheme = this.getSavedTheme();
    this.applyTheme(savedTheme);
    
    // Actualizar toggle si existe
    this.updateToggleButton();
    
    console.log('[ThemeManager] ✅ Tema aplicado:', savedTheme);
  },
  
  /**
   * Obtener el tema guardado
   */
  getSavedTheme() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved || this.THEMES.DARK;
    } catch (error) {
      console.warn('[ThemeManager] ⚠️ Error al leer tema guardado:', error);
      return this.THEMES.DARK;
    }
  },
  
  /**
   * Obtener el tema actual
   */
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || this.THEMES.DARK;
  },
  
  /**
   * Aplicar un tema
   */
  applyTheme(theme) {
    const validTheme = theme === this.THEMES.LIGHT ? this.THEMES.LIGHT : this.THEMES.DARK;
    
    // Aplicar al HTML
    document.documentElement.setAttribute('data-theme', validTheme);
    
    // Guardar en localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, validTheme);
    } catch (error) {
      console.warn('[ThemeManager] ⚠️ Error al guardar tema:', error);
    }
    
    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent('theme:changed', {
      detail: { theme: validTheme }
    }));
    
    console.log('[ThemeManager] 🎨 Tema aplicado:', validTheme);
    
    return validTheme;
  },
  
  /**
   * Alternar entre temas
   */
  toggle() {
    const current = this.getCurrentTheme();
    const newTheme = current === this.THEMES.DARK ? this.THEMES.LIGHT : this.THEMES.DARK;
    this.applyTheme(newTheme);
    this.updateToggleButton();
    return newTheme;
  },
  
  /**
   * Actualizar el botón de toggle si existe
   */
  updateToggleButton() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    
    const current = this.getCurrentTheme();
    const icon = toggleBtn.querySelector('i');
    
    if (current === this.THEMES.DARK) {
      if (icon) icon.className = 'fas fa-moon';
      toggleBtn.setAttribute('title', 'Cambiar a tema claro');
      toggleBtn.setAttribute('aria-label', 'Cambiar a tema claro');
    } else {
      if (icon) icon.className = 'fas fa-sun';
      toggleBtn.setAttribute('title', 'Cambiar a tema oscuro');
      toggleBtn.setAttribute('aria-label', 'Cambiar a tema oscuro');
    }
  },
  
  /**
   * Configurar el botón de toggle
   */
  setupToggleButton(buttonId = 'theme-toggle') {
    const toggleBtn = document.getElementById(buttonId);
    if (!toggleBtn) {
      console.warn('[ThemeManager] ⚠️ Botón de toggle no encontrado:', buttonId);
      return;
    }
    
    toggleBtn.addEventListener('click', () => {
      this.toggle();
    });
    
    this.updateToggleButton();
    console.log('[ThemeManager] 🔘 Botón de toggle configurado');
  }
};

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  ThemeManager.init();
}

// Exponer globalmente
window.ThemeManager = ThemeManager;

console.log('[ThemeManager] ✅ ThemeManager v1.0 cargado');
