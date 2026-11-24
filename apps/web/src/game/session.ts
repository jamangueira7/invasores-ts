import type { Game } from '@lab/domain';
import { GameLoop, Keyboard } from './loop';
import { Renderer } from './renderer';

export interface SessionOptions {
  reducedMotion: boolean;
  onPause: () => void;
}

/**
 * Uma partida na tela. Os recursos são declarados com `using` (cap. 10): quando o `signal`
 * aborta (troca de tela, fim de jogo), a função sai do bloco e o loop, os timers e os
 * listeners são liberados na ordem inversa, mesmo se algo lançar exceção.
 */
export async function runSession(
  game: Game,
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  options: SessionOptions,
): Promise<void> {
  using renderer = new Renderer(canvas, game);
  using loop = new GameLoop(game, renderer, { reducedMotion: options.reducedMotion });
  using _keyboard = new Keyboard(game, options.onPause);
  loop.start();
  await new Promise<void>((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });
}
