import { vi } from 'vitest';
import { Game, toSnapshot } from '@lab/domain';
import type { Stats } from '../api';

export const STATS: Stats = {
  ranking: [
    { name: 'Ana', best: 12400, games: 5, bestWave: 4 },
    { name: 'Beto', best: 3200, games: 2, bestWave: 2 },
  ],
  killsByType: [
    { type: 'drone', total: 120 },
    { type: 'crown', total: 30 },
  ],
  pointsByDay: [{ day: '2024-05-02', points: 15600, games: 7 }],
};

export interface Route {
  status?: number;
  body?: unknown;
  text?: string;
}

export type Routes = Record<string, Route | ((init?: RequestInit) => Route)>;

/** `fetch` falso: cada chave é "MÉTODO /url". Rota desconhecida vira 404. */
export function mockFetch(routes: Routes) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const entry = routes[`${init?.method ?? 'GET'} ${url}`];
    const route = typeof entry === 'function' ? entry(init) : entry;
    if (!route) return new Response(JSON.stringify({ error: 'Nenhum jogo salvo ainda.' }), { status: 404 });
    const body = route.text ?? (route.body === undefined ? null : JSON.stringify(route.body));
    return new Response(route.status === 204 ? null : body, { status: route.status ?? 200 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Texto de um save válido, no formato que a API devolve. */
export function savedGameText(): string {
  const game = new Game({ invaderFireRate: 0 });
  return JSON.stringify({ ...toSnapshot(game), score: 250, lives: 2, wave: 3 });
}

/** O jogo em andamento (a tela o expõe em `window.game` no modo dev). */
export const currentGame = () => (window as unknown as { game: Game }).game;

/** Põe a nave embaixo do alvo (por padrão um Drone da fileira de baixo, 10 pontos) e atira até ele morrer. */
export function shootDown(game: Game, target = game.invaders.at(-1)!): void {
  for (let t = 0; t < 400 && game.invaders.includes(target); t++) {
    game.player.placeAt(target.centerX - game.player.width / 2);
    if (!game.shots.some((s) => s.owner === 'player')) game.playerFire(); // um tiro por vez
    game.update(16);
  }
}

/** Faz a formação chegar à nave: o jogo termina na hora. */
export function forceGameOver(game: Game): void {
  for (const invader of game.invaders) invader.moveBy(0, 1000);
  game.stepFormation();
}
