# @yavl/themes

Sistema de temas cyberpunk para el ecosistema Yavl.

## 🎨 8 Temas Disponibles

1. **Yavl Gold** `#D4AF37` - Default profesional
2. **Neon Blue** `#00d9ff` - Gaming cyberpunk
3. **Magenta Punk** `#ff006e` - Agresivo y vibrante
4. **Emerald Matrix** `#10b981` - Nature-tech (YavlAgro)
5. **Purple Haze** `#a855f7` - Premium y elegante
6. **Orange Blade** `#ff8c00` - Blade Runner aesthetic
7. **Red Alert** `#ef4444` - Urgencia y peligro
8. **Arctic Blue** `#3b82f6` - Clean profesional

## 🚀 Uso

### Importar CSS de temas

```html
<link rel="stylesheet" href="@yavl/themes/themes/yavl-themes.css">
```

### Usar el Theme Manager

```javascript
import { ThemeManager } from '@yavl/themes';

const themeManager = new ThemeManager();

// Cambiar tema
themeManager.setTheme('neon-blue');

// Obtener tema actual
const currentTheme = themeManager.getCurrentTheme(); // 'gold'

// Listar todos los temas
const themes = themeManager.getAvailableThemes();
```

### HTML del Theme Switcher

```html
<select id="theme-selector">
  <option value="gold">Yavl Gold</option>
  <option value="neon-blue">Neon Blue</option>
  <option value="magenta-punk">Magenta Punk</option>
  <option value="emerald-matrix">Emerald Matrix</option>
  <option value="purple-haze">Purple Haze</option>
  <option value="orange-blade">Orange Blade</option>
  <option value="red-alert">Red Alert</option>
  <option value="arctic-blue">Arctic Blue</option>
</select>
```

## 🎨 Estructura de Variables CSS

Cada tema define las siguientes variables:

```css
[data-theme="theme-name"] {
  --primary: #color;
  --primary-light: #color;
  --primary-dark: #color;
  --bg-primary: #color;
  --bg-secondary: #color;
  --bg-tertiary: #color;
  --text-primary: #color;
  --text-secondary: #color;
  --accent: #color;
  --gradient: linear-gradient(...);
}
```

## 💾 Persistencia

Los temas se guardan automáticamente en `localStorage`:

```javascript
// El tema se persiste automáticamente
themeManager.setTheme('purple-haze');

// Al recargar la página, se restaura el último tema usado
```

## 📁 Estructura

```
/packages/themes/
├── src/
│   ├── theme-manager.js    # Gestor de temas
│   └── index.js           # Exports
├── themes/
│   └── yavl-themes.css    # CSS de los 8 temas
├── package.json
└── README.md
```

## 📄 Licencia

MIT © YavlPro
