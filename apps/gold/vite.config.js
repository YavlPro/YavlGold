import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    root: resolve(__dirname),
    server: {
        port: 3000,
        strictPort: true,
        host: '127.0.0.1',
        hmr: {
            protocol: 'ws',
            timeout: 30000
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    cacheDir: resolve(__dirname, '../../node_modules/.vite')
})
