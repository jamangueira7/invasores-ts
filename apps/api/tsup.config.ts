import { defineConfig } from 'tsup';

// O pacote de domínio é TS puro do monorepo: entra no bundle da API.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  noExternal: ['@lab/domain'],
});
