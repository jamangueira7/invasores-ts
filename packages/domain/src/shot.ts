import type { Rect } from './geometry';

export type ShotOwner = 'player' | 'invader';

/** Tiro: objeto de valor imutável (cap. 14). Andar devolve um tiro novo. */
export class Shot implements Rect {
  static readonly WIDTH = 4;
  static readonly HEIGHT = 14;
  /** Velocidade em unidades por milissegundo. */
  static readonly PLAYER_SPEED = 0.62;
  static readonly INVADER_SPEED = 0.28;

  readonly width = Shot.WIDTH;
  readonly height = Shot.HEIGHT;

  constructor(
    readonly x: number,
    readonly y: number,
    readonly owner: ShotOwner,
  ) {
    Object.freeze(this);
  }

  /** -1 sobe (jogador), +1 desce (invasor). */
  get direction(): -1 | 1 {
    return this.owner === 'player' ? -1 : 1;
  }

  moved(elapsedMs: number): Shot {
    const speed = this.owner === 'player' ? Shot.PLAYER_SPEED : Shot.INVADER_SPEED;
    return new Shot(this.x, this.y + this.direction * speed * elapsedMs, this.owner);
  }

  isOutside(height: number): boolean {
    return this.y + this.height < 0 || this.y > height;
  }
}
