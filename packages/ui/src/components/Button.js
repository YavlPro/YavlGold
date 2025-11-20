// Button.js - Componente de botón reutilizable
// Placeholder - Se implementará en Fase 2

export class Button {
  constructor(options = {}) {
    this.text = options.text || 'Button';
    this.variant = options.variant || 'primary'; // primary, secondary, danger
    this.onClick = options.onClick || (() => {});
  }

  render() {
    // Implementación del botón
  }
}
