import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // O dev server não baixa `using` (cap. 10) por padrão; assim ele roda também em navegadores sem
  // gerenciamento explícito de recursos (como o Chromium do Playwright). O build já usa um alvo seguro.
  esbuild: { target: 'es2022' },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3000' },
  },
});
