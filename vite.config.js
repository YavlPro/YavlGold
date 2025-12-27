import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: "/",
    build: {
        outDir: "dist",
        rollupOptions: {
            input: {
                main: resolve(__dirname, "apps/gold/index.html"),
                dashboard: resolve(__dirname, "apps/gold/dashboard/index.html"),
                academia: resolve(__dirname, "apps/academia/index.html"),
                suite: resolve(__dirname, "apps/suite/index.html"),
                herramientas: resolve(__dirname, "apps/herramientas/index.html"),
                cookies: resolve(__dirname, "apps/gold/cookies.html"),
                faq: resolve(__dirname, "apps/gold/faq.html"),
                roadmap: resolve(__dirname, "apps/gold/roadmap.html"),
            },
        },
    },
});
