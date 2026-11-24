import { expect, test } from '@playwright/test';

// `make screenshot`: joga até um momento bonito e salva docs/screenshot.png (1280×800, escala 1).
// Usa `window.game`, que a tela expõe no modo dev, só para escolher o instante do print.
test('screenshot da partida para o README', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByLabel('Campo de batalha')).toBeVisible();

  // Registra o instante do último abate (a explosão nasce dele).
  await page.evaluate(() => {
    const w = window as unknown as { game: { on: (e: string, f: () => void) => void }; lastKill?: number };
    w.game.on('invaderKilled', () => (w.lastKill = performance.now()));
  });

  // ~3 s atirando e balançando a nave para acertar colunas diferentes.
  await page.keyboard.down(' ');
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowLeft']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(750);
    await page.keyboard.up(key);
  }

  // Segue atirando até haver, ao mesmo tempo, tiro nosso, tiro inimigo e um abate recente.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const w = window as unknown as {
            game: { shots: { owner: string }[]; score: number; lives: number };
            lastKill?: number;
          };
          const owners = new Set(w.game.shots.map((s) => s.owner));
          const recent = w.lastKill !== undefined && performance.now() - w.lastKill < 150;
          return recent && owners.has('player') && owners.has('invader') && w.game.score > 0 && w.game.lives >= 2;
        }),
      { timeout: 40_000, intervals: [20] },
    )
    .toBe(true);

  await page.screenshot({ path: '../docs/screenshot.png', type: 'png' });
  await page.keyboard.up(' ');
});
