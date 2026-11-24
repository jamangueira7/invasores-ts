import { configDefaults, defineConfig } from 'vitest/config';

// `pnpm test` roda só os unitários (sem banco). Os de integração ficam em `pnpm test:int`.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, '**/*.int.test.ts'] },
});
