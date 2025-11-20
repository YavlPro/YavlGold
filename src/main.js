import './styles/global.css';
/**
 * Main Entry Point - YavlGold V9.1
 * @description
 * Orquesta la inicialización de la aplicación para garantizar
 * que la configuración se cargue ANTES que los servicios.
 * Esto previene la "Race Condition" de autenticación.
 *
 * @version 9.1.0
 * @author YavlGold Team
 */

// Importa los dos módulos Singleton
import { config } from './scripts/config/ConfigManager.js';
import { authClient } from './scripts/auth/AuthClient.js';
import { authUI } from './scripts/auth/AuthUI.js';
import { header } from './scripts/components/Header.js';

/**
 * Muestra un mensaje de error crítico en la pantalla de carga.
 * @param {Error} error - El error que causó el fallo.
 */
function showErrorScreen(error) {
  // Compatibilidad: index antiguo (#loading-screen) y prototipo V9.1 (#loadingScreen)
  const loadingScreen =
    document.getElementById('loading-screen') ||
    document.getElementById('loadingScreen');
  if (!loadingScreen) return;

  loadingScreen.innerHTML = `
    <div style="text-align: center; color: #ef4444; padding: 20px;">
      <h2 style="font-family: 'Orbitron', sans-serif; color: #ef4444;">❌ Error Crítico de Inicialización</h2>
      <p style="font-family: 'Rajdhani', sans-serif; margin-top: 15px;">La aplicación no pudo iniciarse.</p>
      <p style="font-family: 'Courier New', monospace; background: #2a2a2a; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 0.9em;">
        ${error.message}
      </p>
      <button onclick="location.reload()" 
              style="margin-top: 20px; padding: 12px 25px; 
                     cursor: pointer; background: #C8A752; 
                     border: none; border-radius: 5px;
                     font-family: 'Rajdhani', sans-serif; font-weight: 700;
                     color: #0a0a0a; font-size: 1em;">
        Reintentar
      </button>
    </div>
  `;
}

/**
 * Oculta la pantalla de carga suavemente.
 */
function hideLoadingScreen() {
  const loadingScreen =
    document.getElementById('loading-screen') ||
    document.getElementById('loadingScreen');
  if (!loadingScreen) return;

  // Prototipo usa clase 'hidden' con transición; mantenemos compatibilidad
  loadingScreen.classList?.add('hidden');
  loadingScreen.style.opacity = '0';
  loadingScreen.style.pointerEvents = 'none';
  setTimeout(() => loadingScreen.remove(), 500);
}

/**
 * Inicializa la UI principal de la aplicación.
 * (Aquí es donde pondrías tu código para cargar el header,
 * las rutas, los event listeners, etc.)
 */
async function initUI() {
  console.log('🎨 Cargando interfaz de usuario...');

  // 1. Renderizar el Header (solo si existe contenedor en el DOM)
  const headerContainer = document.querySelector('#app-header');
  if (headerContainer) {
    header.init('#app-header');
  }

  // 2. Inicializa la lógica de la UI de autenticación (soporta sección o modal)
  authUI.init();

  // Enlazar botones de navegación para forzar modo (si existen)
  const navLogin = document.getElementById('nav-login');
  const navRegister = document.getElementById('nav-register');
  navLogin?.addEventListener('click', (e) => {
    // Si existe modal, abrirlo en modo login
    if (document.getElementById('auth-modal')) {
      e.preventDefault();
      authUI.setMode?.('login');
      window.location.hash = '#auth'; // opcional para accesibilidad
      // mostrar modal lo gestiona authUI.init()
      const evt = new Event('open-auth-modal');
      document.dispatchEvent(evt);
    } else {
      authUI.setMode?.('login');
    }
  });
  navRegister?.addEventListener('click', (e) => {
    if (document.getElementById('auth-modal')) {
      e.preventDefault();
      authUI.setMode?.('signup');
      window.location.hash = '#auth';
      const evt = new Event('open-auth-modal');
      document.dispatchEvent(evt);
    } else {
      authUI.setMode?.('signup');
    }
  });

  console.log('✅ UI inicializada');
}

/**
 * Función principal (anónima y asíncrona) que inicia la app.
 */
(async function initApp() {
  try {
    console.log('🚀 Iniciando YavlGold V9.1...');
    // (Asegúrate de que la pantalla de carga esté visible en tu index.html)

    // FASE 1: Inicializar ConfigManager (ESPERA)
    console.log('📦 Cargando configuración...');
    await config.init();

    // FASE 2: Inicializar AuthClient (ESPERA)
    console.log('🔐 Inicializando autenticación...');
    await authClient.init();

    // FASE 3: Inicializar la UI (ESPERA)
    await initUI();

    // FASE 4: Ocultar la pantalla de carga
    hideLoadingScreen();

    console.log('✅ YavlGold V9.1 inicializado correctamente.');

  } catch (error) {
    // Si algo falla (Configuración o Auth), lo mostramos en pantalla
    console.error('❌ Error crítico durante inicialización:', error);
    showErrorScreen(error);
  }
})();
