import { WORLD_HEIGHT, WORLD_WIDTH } from './geometry';
import type { RandomSource } from './random';

/** Paleta das estrelas; a tela decide como pintar cada índice. */
export const STAR_COLORS = ['#ffffff', '#cfe3ff', '#ffe9b3', '#b9f3ff', '#ffc9e6'] as const;

/** Estrela: só dados, imutável (no lugar da `struct` do livro, cap. 14). */
export interface Star {
  readonly x: number;
  readonly y: number;
  readonly color: (typeof STAR_COLORS)[number];
  /** 1 a 3: tamanho e brilho. */
  readonly size: number;
}

export function createStar(random: RandomSource, width = WORLD_WIDTH, height = WORLD_HEIGHT): Star {
  return Object.freeze({
    x: random.next(0, width),
    y: random.next(0, height),
    color: STAR_COLORS[random.next(0, STAR_COLORS.length)] ?? '#ffffff',
    size: random.next(1, 4),
  });
}

/** O céu: 300 estrelas; a cada quadro algumas apagam e outras acendem em outro lugar. */
export class Stars {
  static readonly COUNT = 300;
  private _stars: readonly Star[];

  constructor(
    private readonly random: RandomSource,
    count = Stars.COUNT,
  ) {
    this._stars = Array.from({ length: count }, () => createStar(random));
  }

  get all(): readonly Star[] {
    return this._stars;
  }

  /** Troca `count` estrelas por novas (as antigas apagam, as novas acendem). */
  twinkle(count = 5): void {
    const next = [...this._stars];
    for (let i = 0; i < count; i++) {
      next[this.random.next(0, next.length)] = createStar(this.random);
    }
    this._stars = next;
  }
}
