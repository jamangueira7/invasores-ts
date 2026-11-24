import { defineConfig, devices } from '@playwright/test';

const shot = Boolean(process.env.SCREENSHOT);

// Roda dentro do Docker (serviço `e2e`), contra o app de dev em http://web:5173.
// `make e2e` roda os testes do fluxo; `make screenshot` roda só o screenshot.spec.ts.
export default defineConfig({
  testDir: '.',
  testMatch: shot ? 'screenshot.spec.ts' : 'tests/*.spec.ts',
  globalSetup: './global-setup.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://web:5173',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
});
