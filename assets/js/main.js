/**
 * YAVLGOLD V9.2 - Main Entry Point
 * Este archivo es el punto de entrada principal que coordina la inicialización
 */

// Importar configuración de Supabase para validar que esté disponible
import { supabaseConfig } from './config/supabase-config.js';

// Función de inicialización principal
function initializeApp() {
  console.log('[Main] 🚀 Inicializando YavlGold V9.2...');

  // Validar configuración de Supabase
  if (!supabaseConfig.isValid()) {
    console.error('[Main] ❌ Configuración de Supabase no válida. Revisa las variables de entorno.');
    // Mostrar mensaje de error al usuario
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #FF4444;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 600;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 999999;
    `;
    errorDiv.textContent = '⚠️ Error de configuración. Contacta al administrador.';
    document.body.appendChild(errorDiv);
    return;
  }

  console.log('[Main] ✅ Configuración de Supabase validada');

  // Actualizar año en el footer si existe
  const yearElements = document.querySelectorAll('#current-year, [data-year]');
  yearElements.forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Log de inicialización exitosa
  console.log('[Main] ✅ YavlGold V9.2 inicializado correctamente');

  // Verificar si AuthClient y AuthUI están disponibles
  if (window.AuthClient) {
    console.log('[Main] ✅ AuthClient disponible');
  } else {
    console.warn('[Main] ⚠️ AuthClient no disponible aún');
  }

  if (window.AuthUI) {
    console.log('[Main] ✅ AuthUI disponible');
  } else {
    console.warn('[Main] ⚠️ AuthUI no disponible aún');
  }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // Si el DOM ya está cargado, ejecutar inmediatamente
  initializeApp();
}

// Exportar para debugging
window.YavlGoldApp = {
  version: '9.2',
  initialized: true,
  config: {
    hasSupabase: supabaseConfig.isValid()
  }
};
