/**
 * =============================================
 * YAVLGOLD - THEME MANAGER v2.0
 * Sistema de gestión de temas con selector de emojis
 * =============================================
 */

const ThemeManager = {
  THEMES: {
    DARK: 'dark',
    LIGHT: 'light',
    AUTO: 'auto'
  },
  
  THEME_EMOJIS: {
    dark: '🌙',
    light: '☀️',
    auto: '🎨'
  },
  
  STORAGE_KEY: 'gg:theme',
  
  /**
   * Inicializar el sistema de temas
   */
  init() {
    console.log('[ThemeManager] 🎨 Inicializando sistema de temas...');
    
    // Detectar preferencia del sistema
    this.detectSystemPreference();
    
    // Cargar tema guardado o usar auto por defecto
    const savedTheme = this.getTheme();
    this.setTheme(savedTheme);
    
    // Crear selector de emojis
    this.createEmojiSelector();
    
    // Actualizar toggle si existe
    this.updateToggleButton();
    
    console.log('[ThemeManager] ✅ Tema aplicado:', savedTheme);
  },
  
  /**
   * Detectar preferencia del sistema
   */
  detectSystemPreference() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark = darkModeQuery.matches;
      
      // Escuchar cambios en la preferencia del sistema
      darkModeQuery.addEventListener('change', (e) => {
        this.systemPrefersDark = e.matches;
        if (this.getTheme() === this.THEMES.AUTO) {
          this.applyTheme(this.THEMES.AUTO);
        }
      });
    } else {
      this.systemPrefersDark = true; // Default a dark
    }
  },
  
  /**
   * Obtener el tema guardado (MÉTODO PÚBLICO)
   */
  getTheme() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved || this.THEMES.AUTO;
    } catch (error) {
      console.warn('[ThemeManager] ⚠️ Error al leer tema guardado:', error);
      return this.THEMES.AUTO;
    }
  },
  
  /**
   * Establecer tema (MÉTODO PÚBLICO)
   */
  setTheme(theme) {
    const validTheme = [this.THEMES.DARK, this.THEMES.LIGHT, this.THEMES.AUTO].includes(theme) 
      ? theme 
      : this.THEMES.AUTO;
    
    this.applyTheme(validTheme);
    this.updateEmojiSelector(validTheme);
    return validTheme;
  },
  
  /**
   * Obtener el tema actual del documento
   */
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || this.THEMES.DARK;
  },
  
  /**
   * Aplicar un tema
   */
  applyTheme(theme) {
    let effectiveTheme = theme;
    
    // Si es AUTO, usar preferencia del sistema
    if (theme === this.THEMES.AUTO) {
      effectiveTheme = this.systemPrefersDark ? this.THEMES.DARK : this.THEMES.LIGHT;
    }
    
    // Aplicar al HTML
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    
    // Guardar selección del usuario (no el tema efectivo)
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (error) {
      console.warn('[ThemeManager] ⚠️ Error al guardar tema:', error);
    }
    
    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent('theme:changed', {
      detail: { theme: effectiveTheme, userChoice: theme }
    }));
    
    console.log('[ThemeManager] 🎨 Tema aplicado:', effectiveTheme, '(selección:', theme, ')');
    
    return effectiveTheme;
  },
  
  /**
   * Crear selector de emojis para temas
   */
  createEmojiSelector() {
    const container = document.getElementById('theme-switcher-container');
    if (!container) {
      console.warn('[ThemeManager] ⚠️ Contenedor theme-switcher-container no encontrado');
      return;
    }
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear selector
    const selector = document.createElement('div');
    selector.className = 'theme-emoji-selector';
    selector.setAttribute('role', 'radiogroup');
    selector.setAttribute('aria-label', 'Selector de tema');
    
    // Crear botones para cada tema
    Object.keys(this.THEMES).forEach(themeKey => {
      const theme = this.THEMES[themeKey];
      const emoji = this.THEME_EMOJIS[theme];
      
      const button = document.createElement('button');
      button.className = 'theme-emoji-btn';
      button.setAttribute('data-theme', theme);
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-label', `Tema ${theme}`);
      button.textContent = emoji;
      button.title = `Cambiar a tema ${theme}`;
      
      // Event listener
      button.addEventListener('click', () => {
        this.setTheme(theme);
      });
      
      selector.appendChild(button);
    });
    
    container.appendChild(selector);
    this.updateEmojiSelector(this.getTheme());
    
    console.log('[ThemeManager] 🎨 Selector de emojis creado');
  },
  
  /**
   * Actualizar selector de emojis
   */
  updateEmojiSelector(activeTheme) {
    const buttons = document.querySelectorAll('.theme-emoji-btn');
    buttons.forEach(btn => {
      const isActive = btn.getAttribute('data-theme') === activeTheme;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
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
