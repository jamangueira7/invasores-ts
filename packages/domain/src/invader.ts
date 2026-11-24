import { Sprite } from './geometry';

/** Os três tipos de invasor. Valores em texto para ir direto ao banco e ao JSON. */
export enum InvaderType {
  Drone = 'drone',
  Stinger = 'stinger',
  Crown = 'crown',
}

export const INVADER_TYPES: readonly InvaderType[] = [InvaderType.Drone, InvaderType.Stinger, InvaderType.Crown];

export function isInvaderType(value: unknown): value is InvaderType {
  return typeof value === 'string' && (INVADER_TYPES as readonly string[]).includes(value);
}

/** Invasor da formação. Cada tipo sabe quanto vale e qual é o seu nome (polimorfismo, cap. 7). */
export abstract class Invader extends Sprite {
  static readonly WIDTH = 34;
  static readonly HEIGHT = 24;

  abstract readonly type: InvaderType;
  abstract readonly points: number;
  abstract readonly label: string;

  constructor(x: number, y: number) {
    super(x, y, Invader.WIDTH, Invader.HEIGHT);
  }

  moveBy(dx: number, dy: number): void {
    this._x += dx;
    this._y += dy;
  }
}

export class DroneInvader extends Invader {
  override readonly type = InvaderType.Drone;
  override readonly points = 10;
  override readonly label = 'Drone';
}

export class StingerInvader extends Invader {
  override readonly type = InvaderType.Stinger;
  override readonly points = 20;
  override readonly label = 'Ferrão';
}

export class CrownInvader extends Invader {
  override readonly type = InvaderType.Crown;
  override readonly points = 30;
  override readonly label = 'Coroa';
}

export function createInvader(type: InvaderType, x: number, y: number): Invader {
  switch (type) {
    case InvaderType.Drone:
      return new DroneInvader(x, y);
    case InvaderType.Stinger:
      return new StingerInvader(x, y);
    case InvaderType.Crown:
      return new CrownInvader(x, y);
  }
}

/** Pontos por tipo, para placar e legenda. */
export const POINTS_BY_TYPE: Readonly<Record<InvaderType, number>> = {
  [InvaderType.Drone]: 10,
  [InvaderType.Stinger]: 20,
  [InvaderType.Crown]: 30,
};
