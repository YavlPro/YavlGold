import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  appType: 'mpa', // Multi-Page Application - sirve index.html en subdirectorios
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        cookies: 'cookies.html',
        faq: 'faq.html',
        soporte: 'soporte.html',
        dashboard: 'dashboard/index.html',
        creacion: 'creacion.html',
        perfil: 'dashboard/perfil.html',
        configuracion: 'dashboard/configuracion.html',
        // Module apps
        academia: 'academia/index.html',
        agro: 'agro/index.html',
        herramientas: 'herramientas/index.html',
        suite: 'suite/index.html',
        social: 'social/index.html'
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  },
  esbuild: {
    target: 'es2020',
  },
});
