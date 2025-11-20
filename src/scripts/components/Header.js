/**
 * Header Component V9.1
 * @description
 * Inserta el header oficial de YavlGold V9.1 en el DOM.
 * Utiliza el logo 'logo.png' y los estilos globales.
 *
 * @version 9.1.0
 * @author YavlGold Team
 */

// Ruta pública servida por Vite (publicDir -> ../assets)
// Header debe usar el PNG circular SIN rotación
const logoUrl = '/images/logo.png';

class Header {
  #targetElement = null;

  /**
   * Inicializa el Header.
   * @param {string} targetSelector - El selector CSS del elemento donde se montará el header (ej. '#app-header')
   */
  init(targetSelector) {
    this.#targetElement = document.querySelector(targetSelector);
    if (!this.#targetElement) {
      console.error(`❌ Error de Header: No se encontró el elemento '${targetSelector}'.`);
      return;
    }
    this.render();
  }

  /**
   * Renderiza el HTML del header en el elemento
   */
  render() {
    const headerHTML = `
      <style>
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: var(--bg-secondary);
          border-bottom: 2px solid var(--gold-principal);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          position: sticky;
          top: 0;
          z-index: 1000;
        }
        .header-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
        }
        .header-logo img {
          height: 48px; /* Tamaño del logo en el header */
          width: 48px;
          border-radius: 50%; /* Asegura que el logo sea circular */
          object-fit: cover;
        }
        .header-brand {
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: var(--text-primary);
        }
        .header-brand span {
          color: var(--gold-principal);
        }
      </style>

      <header class="app-header">
        <a href="/" class="header-logo" aria-label="Inicio YavlGold">
          <picture>
            <source srcset="/images/logo.webp" type="image/webp">
            <source srcset="/images/logo.png" type="image/png">
            <img src="/images/logo.png" alt="YavlGold Logo" />
          </picture>
          <span class="header-brand">Yavl<span>Gold</span></span>
        </a>
        <div class="header-nav">
          <span style="color: var(--text-secondary);">V9.1 Pipeline</span>
        </div>
      </header>
    `;
    this.#targetElement.innerHTML = headerHTML;
  }
}

// Exportar una instancia única
export const header = new Header();
