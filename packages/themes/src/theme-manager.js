// theme-manager.js - Gestor de temas del ecosistema Yavl
// Maneja el cambio, persistencia y aplicación de los 8 temas

export class ThemeManager {
  constructor() {
    this.currentTheme = 'gold'; // Tema default
    this.storageKey = 'yavl-theme';
    
    this.themes = {
      'gold': {
        name: 'Yavl Gold',
        description: 'Profesional y elegante',
        color: '#C8A752'
      },
      'neon-blue': {
        name: 'Neon Blue',
        description: 'Gaming cyberpunk',
        color: '#00d9ff'
      },
      'magenta-punk': {
        name: 'Magenta Punk',
        description: 'Agresivo y vibrante',
        color: '#ff006e'
      },
      'emerald-matrix': {
        name: 'Emerald Matrix',
        description: 'Nature-tech',
        color: '#10b981'
      },
      'purple-haze': {
        name: 'Purple Haze',
        description: 'Premium y misterioso',
        color: '#a855f7'
      },
      'orange-blade': {
        name: 'Orange Blade',
        description: 'Blade Runner aesthetic',
        color: '#ff8c00'
      },
      'red-alert': {
        name: 'Red Alert',
        description: 'Urgencia y peligro',
        color: '#ef4444'
      },
      'arctic-blue': {
        name: 'Arctic Blue',
        description: 'Clean profesional',
        color: '#3b82f6'
      }
    };
    
    // Cargar tema guardado o usar default
    this.init();
  }

  /**
   * Inicializa el gestor de temas
   */
  init() {
    const savedTheme = this.loadTheme();
    if (savedTheme && this.themes[savedTheme]) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('gold');
    }
  }

  /**
   * Cambia el tema actual
   * @param {string} themeName - Nombre del tema a aplicar
   */
  setTheme(themeName) {
    if (!this.themes[themeName]) {
      console.error(`Tema "${themeName}" no existe`);
      return;
    }

    // Aplicar el tema al documento
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Guardar en localStorage
    this.saveTheme(themeName);
    
    // Actualizar tema actual
    this.currentTheme = themeName;
    
    // Emitir evento personalizado para que las apps puedan reaccionar
    this.emitThemeChange(themeName);
    
    console.log(`✅ Tema aplicado: ${this.themes[themeName].name}`);
  }

  /**
   * Obtiene el tema actual
   * @returns {string} Nombre del tema actual
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Obtiene información del tema actual
   * @returns {object} Datos del tema actual
   */
  getCurrentThemeInfo() {
    return this.themes[this.currentTheme];
  }

  /**
   * Obtiene la lista de todos los temas disponibles
   * @returns {array} Array de temas con id, name, primary
   */
  getAvailableThemes() {
    return Object.keys(this.themes).map(key => ({
      id: key,
      name: this.themes[key].name,
      description: this.themes[key].description,
      primary: this.themes[key].color
    }));
  }

  /**
   * Guarda el tema en localStorage
   * @param {string} themeName - Nombre del tema a guardar
   */
  saveTheme(themeName) {
    try {
      localStorage.setItem(this.storageKey, themeName);
    } catch (error) {
      console.error('Error al guardar tema en localStorage:', error);
    }
  }

  /**
   * Carga el tema desde localStorage
   * @returns {string|null} Nombre del tema guardado o null
   */
  loadTheme() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (error) {
      console.error('Error al cargar tema desde localStorage:', error);
      return null;
    }
  }

  /**
   * Emite un evento personalizado cuando cambia el tema
   * @param {string} themeName - Nombre del nuevo tema
   */
  emitThemeChange(themeName) {
    // Evento estilo kebab-case para consistency con auth
    const eventKebab = new CustomEvent('theme:changed', {
      detail: {
        theme: themeName,
        themeInfo: this.themes[themeName]
      }
    });
    window.dispatchEvent(eventKebab);
    
    // También emitir evento legacy para compatibilidad
    const eventLegacy = new CustomEvent('themechange', {
      detail: {
        theme: themeName,
        themeInfo: this.themes[themeName]
      }
    });
    window.dispatchEvent(eventLegacy);
  }

  /**
   * Crea un selector de temas HTML
   * @param {string} containerId - ID del contenedor donde insertar el selector
   */
  createThemeSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Contenedor "${containerId}" no encontrado`);
      return;
    }

    const select = document.createElement('select');
    select.id = 'theme-selector';
    select.className = 'theme-selector';
    
    // Crear opciones para cada tema
    Object.keys(this.themes).forEach(themeKey => {
      const theme = this.themes[themeKey];
      const option = document.createElement('option');
      option.value = themeKey;
      option.textContent = `${theme.name} - ${theme.description}`;
      option.selected = themeKey === this.currentTheme;
      select.appendChild(option);
    });

    // Event listener para cambios
    select.addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });

    container.appendChild(select);
  }
}

// Crear instancia global (singleton)
export const themeManager = new ThemeManager();

// Export default para compatibilidad
export default ThemeManager;
