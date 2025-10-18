/**
 * YAVL ECOSYSTEM - THEME SWITCHER COMPONENT
 * Selector visual de temas con dropdown animado
 */

export class ThemeSwitcher {
  constructor(options = {}) {
    this.containerId = options.containerId || 'theme-switcher-container';
    this.container = null;
    this.themeManager = null;
    this.isOpen = false;
  }

  /**
   * Inicializar el componente
   * @param {ThemeManager} themeManager - Instancia del theme manager
   */
  init(themeManager) {
    this.themeManager = themeManager;
    this.container = document.getElementById(this.containerId);
    
    if (!this.container) {
      console.warn(`[ThemeSwitcher] Container #${this.containerId} no encontrado`);
      return;
    }

    if (!this.themeManager) {
      console.warn('[ThemeSwitcher] ThemeManager no proporcionado');
      return;
    }

    this.render();
    this.attachEvents();
    console.log('[ThemeSwitcher] ✅ Inicializado');
  }

  /**
   * Renderizar el HTML del selector
   */
  render() {
    const themes = this.themeManager.getAvailableThemes();
    const currentTheme = this.themeManager.getCurrentTheme();

    const html = `
      <div class="theme-switcher">
        <button class="theme-switcher__btn" aria-label="Cambiar tema" aria-expanded="false">
          <span class="theme-switcher__icon">🎨</span>
          <span class="theme-switcher__label">${this.getThemeLabel(currentTheme)}</span>
          <span class="theme-switcher__arrow">▼</span>
        </button>
        
        <div class="theme-switcher__dropdown" hidden>
          <div class="theme-switcher__header">
            <span>Seleccionar Tema</span>
          </div>
          <ul class="theme-switcher__list">
            ${themes.map(theme => this.renderThemeOption(theme, currentTheme)).join('')}
          </ul>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Renderizar una opción de tema
   */
  renderThemeOption(theme, currentTheme) {
    const isActive = theme.id === currentTheme;
    const activeClass = isActive ? 'theme-switcher__item--active' : '';
    
    return `
      <li>
        <button 
          class="theme-switcher__item ${activeClass}" 
          data-theme="${theme.id}"
          aria-label="Tema ${theme.name}"
        >
          <span 
            class="theme-switcher__color-preview" 
            style="background: ${theme.primary};"
          ></span>
          <span class="theme-switcher__name">${theme.name}</span>
          ${isActive ? '<span class="theme-switcher__check">✓</span>' : ''}
        </button>
      </li>
    `;
  }

  /**
   * Obtener label del tema actual
   */
  getThemeLabel(themeId) {
    const themes = this.themeManager.getAvailableThemes();
    const theme = themes.find(t => t.id === themeId);
    return theme ? theme.name : 'Tema';
  }

  /**
   * Adjuntar event listeners
   */
  attachEvents() {
    const btn = this.container.querySelector('.theme-switcher__btn');
    const dropdown = this.container.querySelector('.theme-switcher__dropdown');
    const items = this.container.querySelectorAll('.theme-switcher__item');

    // Toggle dropdown
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Seleccionar tema
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        const themeId = e.currentTarget.getAttribute('data-theme');
        if (themeId) {
          this.selectTheme(themeId);
        }
      });
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target) && this.isOpen) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation
    btn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleDropdown();
      }
    });

    // Escuchar cambios de tema (de otras fuentes)
    window.addEventListener('theme:changed', (e) => {
      this.updateUI();
    });
  }

  /**
   * Toggle dropdown
   */
  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Abrir dropdown
   */
  openDropdown() {
    const btn = this.container.querySelector('.theme-switcher__btn');
    const dropdown = this.container.querySelector('.theme-switcher__dropdown');
    
    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    this.isOpen = true;
  }

  /**
   * Cerrar dropdown
   */
  closeDropdown() {
    const btn = this.container.querySelector('.theme-switcher__btn');
    const dropdown = this.container.querySelector('.theme-switcher__dropdown');
    
    dropdown.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    this.isOpen = false;
  }

  /**
   * Seleccionar tema
   */
  selectTheme(themeId) {
    console.log(`[ThemeSwitcher] Cambiando a tema: ${themeId}`);
    this.themeManager.setTheme(themeId);
    this.closeDropdown();
    this.updateUI();
  }

  /**
   * Actualizar UI después de cambio de tema
   */
  updateUI() {
    const currentTheme = this.themeManager.getCurrentTheme();
    const btn = this.container.querySelector('.theme-switcher__btn');
    const label = this.container.querySelector('.theme-switcher__label');
    
    // Actualizar label
    if (label) {
      label.textContent = this.getThemeLabel(currentTheme);
    }

    // Actualizar items activos
    const items = this.container.querySelectorAll('.theme-switcher__item');
    items.forEach(item => {
      const themeId = item.getAttribute('data-theme');
      if (themeId === currentTheme) {
        item.classList.add('theme-switcher__item--active');
        if (!item.querySelector('.theme-switcher__check')) {
          const check = document.createElement('span');
          check.className = 'theme-switcher__check';
          check.textContent = '✓';
          item.appendChild(check);
        }
      } else {
        item.classList.remove('theme-switcher__item--active');
        const check = item.querySelector('.theme-switcher__check');
        if (check) check.remove();
      }
    });
  }
}

// Export para uso global
if (typeof window !== 'undefined') {
  window.ThemeSwitcher = ThemeSwitcher;
}

console.log('[ThemeSwitcher] ✅ Component loaded');
