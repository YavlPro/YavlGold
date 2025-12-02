import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        cookies: 'cookies.html',
        faq: 'faq.html',
        soporte: 'soporte.html'
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
