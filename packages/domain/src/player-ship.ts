import { clamp, Sprite, WORLD_HEIGHT, WORLD_WIDTH } from './geometry';
import { Shot } from './shot';

/** Nave do jogador: anda na base, atira com recarga e fica invulnerável um tempo ao renascer. */
export class PlayerShip extends Sprite {
  static readonly WIDTH = 46;
  static readonly HEIGHT = 26;
  static readonly SPEED = 0.34; // unidades por ms
  static readonly COOLDOWN_MS = 380;
  static readonly RESPAWN_MS = 1600;

  private cooldown = 0;
  private invulnerable = 0;

  constructor(private readonly fieldWidth = WORLD_WIDTH) {
    super((fieldWidth - PlayerShip.WIDTH) / 2, WORLD_HEIGHT - 52, PlayerShip.WIDTH, PlayerShip.HEIGHT);
  }

  get isInvulnerable(): boolean {
    return this.invulnerable > 0;
  }

  /** `direction`: -1 esquerda, 0 parado, +1 direita. */
  move(direction: -1 | 0 | 1, elapsedMs: number): void {
    this._x = clamp(this._x + direction * PlayerShip.SPEED * elapsedMs, 8, this.fieldWidth - this.width - 8);
  }

  placeAt(x: number): void {
    this._x = clamp(x, 8, this.fieldWidth - this.width - 8);
  }

  tick(elapsedMs: number): void {
    this.cooldown = Math.max(0, this.cooldown - elapsedMs);
    this.invulnerable = Math.max(0, this.invulnerable - elapsedMs);
  }

  /** Devolve o tiro novo, ou `null` se a arma ainda está recarregando. */
  fire(): Shot | null {
    if (this.cooldown > 0) return null;
    this.cooldown = PlayerShip.COOLDOWN_MS;
    return new Shot(this.centerX - Shot.WIDTH / 2, this.y - Shot.HEIGHT, 'player');
  }

  /** Foi atingida: volta ao centro e pisca um tempo sem poder ser atingida. */
  respawn(): void {
    this._x = (this.fieldWidth - this.width) / 2;
    this.invulnerable = PlayerShip.RESPAWN_MS;
    this.cooldown = 0;
  }
}
