import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: "apps/gold",
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
                configuracion: resolve(__dirname, "apps/gold/dashboard/configuracion.html"),
                perfil: resolve(__dirname, "apps/gold/dashboard/perfil.html"),
                profile: resolve(__dirname, "apps/gold/profile/index.html"),
                cookies: resolve(__dirname, "apps/gold/cookies.html"),
                faq: resolve(__dirname, "apps/gold/faq.html"),
                roadmap: resolve(__dirname, "apps/gold/roadmap.html"),
                terms: resolve(__dirname, "apps/gold/terms.html"),
                privacy: resolve(__dirname, "apps/gold/privacy.html"),
                // Módulos del Ecosistema
                academia: resolve(__dirname, "apps/gold/academia/index.html"),
                agro: resolve(__dirname, "apps/gold/agro/index.html"),
                herramientas: resolve(__dirname, "apps/gold/herramientas/index.html"),
                suite: resolve(__dirname, "apps/gold/suite/index.html"),
                social: resolve(__dirname, "apps/gold/social/index.html"),
            },
        },
        cssCodeSplit: false,
    },

    server: {
        port: 5173,
        open: true,
    },
});
