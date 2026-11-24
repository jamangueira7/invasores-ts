import { defineConfig } from 'vitest/config';

// Separado do vite.config.ts: o vitest traz o próprio vite e os tipos dos plugins não casam.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
