import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: "/",

    resolve: {
        alias: {
            '@': resolve(__dirname, 'apps/gold/assets'),
            '@css': resolve(__dirname, 'apps/gold/assets/css'),
            '@js': resolve(__dirname, 'apps/gold/assets/js'),
            '@images': resolve(__dirname, 'apps/gold/assets/images'),
            '@utils': resolve(__dirname, 'apps/gold/assets/js/utils'),
        }
    },

    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, "apps/gold/index.html"),
                dashboard: resolve(__dirname, "apps/gold/dashboard/index.html"),
                academia: resolve(__dirname, "apps/academia/index.html"),
                suite: resolve(__dirname, "apps/suite/index.html"),
                herramientas: resolve(__dirname, "apps/herramientas/index.html"),
                agro: resolve(__dirname, "apps/agro/index.html"),
                social: resolve(__dirname, "apps/social/index.html"),
                cookies: resolve(__dirname, "apps/gold/cookies.html"),
                faq: resolve(__dirname, "apps/gold/faq.html"),
                roadmap: resolve(__dirname, "apps/gold/roadmap.html"),
            },
        },
        cssCodeSplit: false,
    },

    server: {
        port: 5173,
        open: true,
    },
});
