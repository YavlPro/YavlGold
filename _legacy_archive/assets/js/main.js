/**
 * YAVLGOLD V9.2 - Main Entry Point
 */
// Importamos la configuración desde la carpeta 'config' (según tu captura)
import { supabase } from './config/supabase-config.js';

// Importamos la UI para que se ejecute sola
import './auth/authUI.js';

function initializeApp() {
  console.log('[Main] 🚀 Inicializando YavlGold V9.2...');

  if (!supabase) {
    console.error('[Main] ❌ Supabase no inicializado. Revisa .env');
    return;
  }
  console.log('[Main] ✅ Supabase Conectado');

  // Actualizar año del footer
  const yearElements = document.querySelectorAll('#current-year, [data-year]');
  const currentYear = new Date().getFullYear();
  yearElements.forEach(el => el.textContent = currentYear);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
