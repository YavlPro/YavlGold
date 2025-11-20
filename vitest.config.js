import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.spec.{js,ts}',
      'src/**/__tests__/*.{js,ts}'
    ],
    setupFiles: [],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
