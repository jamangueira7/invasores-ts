/** Tamanho do mundo do jogo, em unidades lógicas. A tela escala isso para caber. */
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;

/** Retângulo só de dados: tudo que pode colidir expõe isso. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Função utilitária (cap. 14: no lugar de um método de extensão do C#). */
export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Base de tudo que tem posição e tamanho no campo. A posição só muda pelas subclasses. */
export abstract class Sprite implements Rect {
  protected _x: number;
  protected _y: number;

  protected constructor(
    x: number,
    y: number,
    readonly width: number,
    readonly height: number,
  ) {
    this._x = x;
    this._y = y;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get centerX(): number {
    return this._x + this.width / 2;
  }

  collidesWith(other: Rect): boolean {
    return intersects(this, other);
  }
}
