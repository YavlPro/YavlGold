// Modal.js - Componente de modal reutilizable
// Placeholder - Se implementará en Fase 2

export class Modal {
  constructor(options = {}) {
    this.title = options.title || '';
    this.content = options.content || '';
    this.onClose = options.onClose || (() => {});
  }

  render() {
    // Implementación del modal
  }

  show() {
    // Mostrar modal
  }

  hide() {
    // Ocultar modal
  }
}
