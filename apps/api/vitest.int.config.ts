import { defineConfig } from 'vitest/config';

// Integração contra o Postgres real (banco `lab_test`): um arquivo por vez, limpando as tabelas entre testes.
export default defineConfig({
  test: { include: ['src/**/*.int.test.ts'], fileParallelism: false, testTimeout: 15_000, hookTimeout: 30_000 },
});
