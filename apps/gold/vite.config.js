import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    port: 3000,
    host: '127.0.0.1',
    strictPort: true
  },
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
        'reset-password': './reset-password.html'
      }
    }
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
