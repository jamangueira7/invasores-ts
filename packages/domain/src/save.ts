import { Game, type Kills } from './game';
import { createInvader, INVADER_TYPES, isInvaderType } from './invader';
import type { RandomSource } from './random';

export const SAVE_VERSION = 1;

/** Jogo em andamento em JSON (cap. 9). Tiros e estrelas não entram: recomeçam ao carregar. */
export interface GameSnapshot {
  version: number;
  score: number;
  lives: number;
  wave: number;
  direction: -1 | 1;
  playerX: number;
  kills: Record<string, number>;
  invaders: { type: string; x: number; y: number }[];
}

/** Erro próprio (cap. 10): o arquivo de save não é um jogo válido. */
export class SaveCorruptedError extends Error {
  override readonly name = 'SaveCorruptedError';
  constructor(
    readonly reason: string,
    options?: { cause?: unknown },
  ) {
    super(`Save corrompido: ${reason}`, options);
  }
}

export function toSnapshot(game: Game): GameSnapshot {
  return {
    version: SAVE_VERSION,
    score: game.score,
    lives: game.lives,
    wave: game.wave,
    direction: game.formationDirection,
    playerX: game.player.x,
    kills: { ...game.kills },
    invaders: game.invaders.map((i) => ({ type: i.type, x: i.x, y: i.y })),
  };
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Lê o texto do save e devolve um jogo pausado. Qualquer defeito vira `SaveCorruptedError`. */
export function loadGame(text: string, random?: RandomSource): Game {
  let data: Partial<GameSnapshot>;
  try {
    data = JSON.parse(text) as Partial<GameSnapshot>;
  } catch (cause) {
    throw new SaveCorruptedError('o arquivo não é JSON', { cause });
  }
  if (typeof data !== 'object' || data === null) throw new SaveCorruptedError('formato desconhecido');
  if (data.version !== SAVE_VERSION) throw new SaveCorruptedError(`versão ${String(data.version)} desconhecida`);
  const { score, lives, wave, direction, playerX, kills, invaders } = data;
  if (!finite(score) || score < 0) throw new SaveCorruptedError('pontuação inválida');
  if (!finite(lives) || lives < 1 || lives > 3) throw new SaveCorruptedError('vidas inválidas');
  if (!finite(wave) || wave < 1) throw new SaveCorruptedError('onda inválida');
  if (direction !== 1 && direction !== -1) throw new SaveCorruptedError('direção inválida');
  if (!finite(playerX)) throw new SaveCorruptedError('posição da nave inválida');
  if (!Array.isArray(invaders) || invaders.length === 0) throw new SaveCorruptedError('sem invasores');
  if (typeof kills !== 'object' || kills === null) throw new SaveCorruptedError('abates inválidos');

  const game = new Game({ random });
  game.restore({
    score,
    lives,
    wave,
    direction,
    playerX,
    kills: Object.fromEntries(INVADER_TYPES.map((t) => [t, Number(kills[t]) || 0])) as Kills,
    invaders: invaders.map((i, index) => {
      if (!isInvaderType(i?.type) || !finite(i.x) || !finite(i.y)) {
        throw new SaveCorruptedError(`invasor ${index} inválido`);
      }
      return createInvader(i.type, i.x, i.y);
    }),
  });
  return game;
}

/** Visualizador hexadecimal (cap. 9): 16 bytes por linha, deslocamento, hexa e texto. */
export function hexDump(bytes: Uint8Array, width = 16): string[] {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += width) {
    const chunk = bytes.subarray(offset, offset + width);
    const hex = Array.from(chunk, (b) => b.toString(16).padStart(2, '0')).join(' ');
    const text = Array.from(chunk, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(width * 3 - 1)}  ${text}`);
  }
  return lines;
}
