// YavlGold Vite Config - Build v9.4.2 (2026-01-08 - Version injection)
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

// Read version from package.json (Single Source of Truth)
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  base: './',
  appType: 'mpa', // Multi-Page Application - sirve index.html en subdirectorios

  // 🔧 BUILD-TIME VARIABLES: Inyecta versión y fecha en todo el código
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
    '__BUILD_DATE__': JSON.stringify(new Date().toISOString().split('T')[0])
  },

  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        cookies: 'cookies.html',
        faq: 'faq.html',
        soporte: 'soporte.html',
        terms: 'terms.html',
        privacy: 'privacy.html',
        openSource: 'open-source.html',
        antiSuplantacion: 'anti-suplantacion.html',
        status: 'status.html',
        docsAgro: 'docs-agro.html',
        dashboard: 'dashboard/index.html',
        music: 'dashboard/music.html',
        perfil: 'dashboard/perfil.html',
        configuracion: 'dashboard/configuracion.html',
        // Module apps
        academia: 'academia/index.html',
        agro: 'agro/index.html',
        crypto: 'crypto/index.html',
        tecnologia: 'tecnologia/index.html',
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

