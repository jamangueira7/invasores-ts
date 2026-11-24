import { expect, type Page, test } from '@playwright/test';

/** O placar é um Web Component com shadow DOM aberto: o locator do Playwright entra nele. */
const scoreOf = async (page: Page) => Number((await page.locator('score-board #score').textContent())!.replace(/\D/g, ''));

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByLabel('Campo de batalha')).toBeVisible();
  await expect(page.locator('score-board #score')).toHaveText('0');
}

/** Segura o espaço (tiro contínuo) até o placar subir. */
async function fireUntilScore(page: Page) {
  await page.keyboard.down(' ');
  await expect.poll(() => scoreOf(page), { timeout: 20_000, intervals: [250] }).toBeGreaterThan(0);
  await page.keyboard.up(' ');
}

test('começa a partida, atira e vê a pontuação subir no placar', async ({ page }) => {
  await start(page);
  await expect(page.locator('score-board #lives')).toHaveAttribute('aria-label', '3 vidas');
  await fireUntilScore(page);
  expect(await scoreOf(page)).toBeGreaterThanOrEqual(10);
});

test('pausa com P e retoma pelo botão e pela tecla', async ({ page }) => {
  await start(page);
  await page.keyboard.press('p');
  const pause = page.getByRole('dialog', { name: 'Pausa' });
  await expect(pause).toBeVisible();
  await pause.getByRole('button', { name: 'Continuar' }).click();
  await expect(pause).toBeHidden();
  await page.keyboard.press('p');
  await expect(pause).toBeVisible();
  await page.keyboard.press('p');
  await expect(pause).toBeHidden();
});

test('salva o jogo na pausa e continua do ponto salvo', async ({ page }) => {
  await start(page);
  await fireUntilScore(page);
  await page.keyboard.press('p');
  const pause = page.getByRole('dialog', { name: 'Pausa' });
  await expect(pause).toBeVisible();
  const saved = await scoreOf(page);
  await pause.getByRole('button', { name: 'Salvar jogo' }).click();
  await expect(pause.getByRole('status')).toContainText('Jogo salvo');
  await pause.getByRole('button', { name: 'Sair' }).click();

  await page.getByRole('button', { name: 'Continuar jogo salvo' }).click();
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeVisible();
  expect(await scoreOf(page)).toBe(saved);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeHidden();
});

test('abre o ranking com os pilotos que já salvaram pontuação', async ({ page, request }) => {
  const name = `E2E ${Date.now() % 100000}`;
  const created = await request.post('/api/games', {
    data: { name, score: 99999, wave: 7, kills: { drone: 3, stinger: 2, crown: 1 } },
  });
  expect(created.status()).toBe(201);

  await page.goto('/');
  await page.getByRole('button', { name: 'Ranking e estatísticas' }).click();
  await expect(page.getByRole('heading', { name: 'Ranking de pilotos' })).toBeVisible();
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await expect(row).toContainText('99.999');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
});
