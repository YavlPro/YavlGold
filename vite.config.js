/**
 * Configuración de Vite para YavlGold V9.1 (MPA)
 * - Modo multi‑page para servir rutas HTML directas (sin fallback SPA)
 * - Entradas explícitas: index.html y reset-password.html en la raíz del repo
 */
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Desactivar comportamiento de SPA: cada .html es una página
    appType: 'mpa',

    // Raíz del proyecto: servimos los HTML desde la raíz
    // Los assets estáticos viven en /assets
    publicDir: 'assets',

    server: {
      port: 3000,
      strictPort: true,
      open: false,
      proxy: {
        '/api': {
          target: 'http://localhost:8888',
          changeOrigin: true,
        },
      },
    },

    preview: {
      port: 3000,
      strictPort: true,
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          indexV9: resolve(__dirname, 'index-v9.html'),
          resetPassword: resolve(__dirname, 'reset-password.html'),
        },
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
        },
      },
    },

    // Inyección segura de variables públicas
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_HCAPTCHA_SITE_KEY': JSON.stringify(env.VITE_HCAPTCHA_SITE_KEY || ''),
    },
  };
});
