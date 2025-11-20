# @yavl/ui

Componentes UI compartidos y sistema de diseño del ecosistema Yavl.

## 🎯 Características

- ✅ Componentes reutilizables (Modal, Card, Button, etc.)
- ✅ Estilos base compartidos
- ✅ Variables CSS consistentes
- ✅ Tema cyberpunk/golden
- ✅ Responsive design
- ✅ Accesibilidad (a11y)

## 📦 Componentes Disponibles

### Modal
```javascript
import { Modal } from '@yavl/ui';

const modal = new Modal({
  title: 'Título',
  content: 'Contenido',
  onClose: () => console.log('Cerrado')
});
```

### Card
```javascript
import { Card } from '@yavl/ui';

const card = new Card({
  title: 'Card Title',
  content: 'Card content',
  footer: 'Footer content'
});
```

### Button
```javascript
import { Button } from '@yavl/ui';

const button = new Button({
  text: 'Click me',
  variant: 'primary', // primary, secondary, danger
  onClick: () => console.log('Clicked!')
});
```

## 🎨 Estilos Base

```javascript
import '@yavl/ui/styles/base.css';
```

El CSS base incluye:
- Reset/normalize
- Variables CSS (colores, espaciado, tipografía)
- Utilidades comunes
- Grid system
- Responsive helpers

## 📁 Estructura

```
/packages/ui/
├── src/
│   ├── components/
│   │   ├── Modal.js
│   │   ├── Card.js
│   │   ├── Button.js
│   │   └── index.js
│   ├── styles/
│   │   ├── base.css
│   │   ├── variables.css
│   │   └── utilities.css
│   └── index.js
├── package.json
└── README.md
```

## 🎨 Variables CSS

```css
:root {
  /* Colores principales */
  --color-primary: #C8A752;
  --color-secondary: #1a1a1a;
  
  /* Espaciado */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  
  /* Tipografía */
  --font-primary: 'Orbitron', sans-serif;
  --font-secondary: 'Rajdhani', sans-serif;
}
```

## 📄 Licencia

MIT © YavlPro
