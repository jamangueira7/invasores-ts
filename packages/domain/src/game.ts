import { TypedEmitter } from './events';
import { WORLD_HEIGHT, WORLD_WIDTH } from './geometry';
import { createInvader, type Invader, InvaderType } from './invader';
import { PlayerShip } from './player-ship';
import { mathRandom, type RandomSource } from './random';
import { Shot } from './shot';
import { Stars } from './stars';

export const STARTING_LIVES = 3;
export const FORMATION_ROWS = 5;
export const FORMATION_COLUMNS = 11;
/** Tipo de cada linha da formação, de cima para baixo. */
export const ROW_TYPES: readonly InvaderType[] = [
  InvaderType.Crown,
  InvaderType.Stinger,
  InvaderType.Stinger,
  InvaderType.Drone,
  InvaderType.Drone,
];

export type GameStatus = 'playing' | 'paused' | 'over';
export type Kills = Record<InvaderType, number>;

export interface GameEvents extends Record<string, unknown> {
  invaderKilled: { type: InvaderType; points: number; x: number; y: number; score: number };
  playerHit: { lives: number; x: number; y: number };
  waveCleared: { wave: number; nextWave: number };
  gameOver: { score: number; wave: number; kills: Readonly<Kills> };
}

export interface Controls {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface GameOptions {
  random?: RandomSource;
  /** Chance de um invasor atirar, por milissegundo. Zero desliga (útil nos testes). */
  invaderFireRate?: number;
}

/** O jogo: ondas, vidas, pontos, colisões e fim. Não conhece a tela; publica eventos (cap. 11). */
export class Game extends TypedEmitter<GameEvents> {
  static readonly STEP_X = 10;
  static readonly STEP_DOWN = 18;
  static readonly SPACING_X = 50;
  static readonly SPACING_Y = 42;
  static readonly MARGIN = 16;

  readonly width = WORLD_WIDTH;
  readonly height = WORLD_HEIGHT;
  readonly player = new PlayerShip();
  readonly stars: Stars;
  readonly controls: Controls = { left: false, right: false, fire: false };

  private readonly random: RandomSource;
  private readonly fireRate: number | undefined;
  private _invaders: Invader[] = [];
  private _shots: Shot[] = [];
  private _score = 0;
  private _lives = STARTING_LIVES;
  private _wave = 1;
  private _status: GameStatus = 'playing';
  private _kills: Kills = { [InvaderType.Drone]: 0, [InvaderType.Stinger]: 0, [InvaderType.Crown]: 0 };
  private direction: -1 | 1 = 1;
  private stepClock = 0;
  private waveSize = FORMATION_ROWS * FORMATION_COLUMNS;

  constructor(options: GameOptions = {}) {
    super();
    this.random = options.random ?? mathRandom;
    this.fireRate = options.invaderFireRate;
    this.stars = new Stars(this.random);
    this.spawnWave();
  }

  get invaders(): readonly Invader[] {
    return this._invaders;
  }
  get shots(): readonly Shot[] {
    return this._shots;
  }
  get score(): number {
    return this._score;
  }
  get lives(): number {
    return this._lives;
  }
  get wave(): number {
    return this._wave;
  }
  get status(): GameStatus {
    return this._status;
  }
  get kills(): Readonly<Kills> {
    return this._kills;
  }
  get formationDirection(): -1 | 1 {
    return this.direction;
  }

  /** Intervalo entre passos da formação: fica mais curto quando sobram poucos e a cada onda. */
  get stepIntervalMs(): number {
    const remaining = this._invaders.length / this.waveSize;
    const base = 60 + 640 * remaining;
    return Math.max(35, Math.round(base * Math.pow(0.88, this._wave - 1)));
  }

  pause(): void {
    if (this._status === 'playing') this._status = 'paused';
  }

  resume(): void {
    if (this._status === 'paused') this._status = 'playing';
  }

  togglePause(): void {
    if (this._status === 'paused') this.resume();
    else this.pause();
  }

  /** Um passo da lógica. Chamado pelo relógio de lógica da tela (setInterval). */
  update(elapsedMs: number): void {
    if (this._status !== 'playing') return;
    const dt = Math.min(elapsedMs, 100);

    this.player.tick(dt);
    const dir = (this.controls.right ? 1 : 0) - (this.controls.left ? 1 : 0);
    this.player.move(dir as -1 | 0 | 1, dt);
    if (this.controls.fire) this.playerFire();

    this._shots = this._shots.map((s) => s.moved(dt)).filter((s) => !s.isOutside(this.height));

    this.stepClock += dt;
    while (this.stepClock >= this.stepIntervalMs && this._status === 'playing') {
      this.stepClock -= this.stepIntervalMs;
      this.stepFormation();
    }

    if (this.random.next(0, 1_000_000) < this.invaderFireChance * dt * 1_000_000) this.invaderFire();

    this.resolveCollisions();
  }

  /** Dispara o tiro do jogador, se a arma já recarregou. */
  playerFire(): boolean {
    if (this._status !== 'playing') return false;
    const shot = this.player.fire();
    if (!shot) return false;
    this._shots = [...this._shots, shot];
    return true;
  }

  /** Anda a formação de lado; ao bater na borda, desce e inverte o sentido. */
  stepFormation(): void {
    if (this._invaders.length === 0) return;
    const dx = this.direction * Game.STEP_X;
    const left = Math.min(...this._invaders.map((i) => i.x)) + dx;
    const right = Math.max(...this._invaders.map((i) => i.x + i.width)) + dx;
    if (left < Game.MARGIN || right > this.width - Game.MARGIN) {
      for (const invader of this._invaders) invader.moveBy(0, Game.STEP_DOWN);
      this.direction = this.direction === 1 ? -1 : 1;
    } else {
      for (const invader of this._invaders) invader.moveBy(dx, 0);
    }
    const lowest = Math.max(...this._invaders.map((i) => i.y + i.height));
    if (lowest >= this.player.y) this.endGame();
  }

  /** Os da frente (o mais baixo de cada coluna) são os únicos que podem atirar. */
  frontInvaders(): Invader[] {
    const front = new Map<number, Invader>();
    for (const invader of this._invaders) {
      const column = Math.round(invader.x);
      const current = front.get(column);
      if (!current || invader.y > current.y) front.set(column, invader);
    }
    return [...front.values()].sort((a, b) => a.x - b.x);
  }

  /** Um invasor da frente, escolhido pelo aleatório, atira para baixo. */
  invaderFire(): Shot | null {
    const front = this.frontInvaders();
    const enemyShots = this._shots.filter((s) => s.owner === 'invader').length;
    if (front.length === 0 || enemyShots >= 2 + this._wave) return null;
    const shooter = front[this.random.next(0, front.length)];
    if (!shooter) return null;
    const shot = new Shot(shooter.centerX - Shot.WIDTH / 2, shooter.y + shooter.height, 'invader');
    this._shots = [...this._shots, shot];
    return shot;
  }

  private get invaderFireChance(): number {
    return this.fireRate ?? 0.0009 + 0.00025 * (this._wave - 1);
  }

  private resolveCollisions(): void {
    const remaining: Shot[] = [];
    for (const [index, shot] of this._shots.entries()) {
      if (shot.owner === 'player') {
        const target = this._invaders.find((i) => i.collidesWith(shot));
        if (target) {
          this.kill(target);
          continue;
        }
      } else if (!this.player.isInvulnerable && this.player.collidesWith(shot)) {
        this.hitPlayer();
        if (this._status === 'over') return;
        // Tiros inimigos somem ao renascer: o jogador ganha um respiro.
        this._shots = [...remaining, ...this._shots.slice(index + 1)].filter((s) => s.owner === 'player');
        return;
      }
      remaining.push(shot);
    }
    this._shots = remaining;
    if (this._invaders.length === 0 && this._status === 'playing') this.clearWave();
  }

  private kill(invader: Invader): void {
    this._invaders = this._invaders.filter((i) => i !== invader);
    this._score += invader.points;
    this._kills = { ...this._kills, [invader.type]: this._kills[invader.type] + 1 };
    this.emit('invaderKilled', {
      type: invader.type,
      points: invader.points,
      x: invader.centerX,
      y: invader.y + invader.height / 2,
      score: this._score,
    });
  }

  private hitPlayer(): void {
    this._lives = Math.max(0, this._lives - 1);
    const { x, y } = { x: this.player.centerX, y: this.player.y + this.player.height / 2 };
    this.emit('playerHit', { lives: this._lives, x, y });
    if (this._lives === 0) this.endGame();
    else this.player.respawn();
  }

  private clearWave(): void {
    const wave = this._wave;
    this._wave++;
    this._shots = [];
    this.spawnWave();
    this.emit('waveCleared', { wave, nextWave: this._wave });
  }

  private endGame(): void {
    if (this._status === 'over') return;
    this._status = 'over';
    this.emit('gameOver', { score: this._score, wave: this._wave, kills: { ...this._kills } });
  }

  private spawnWave(): void {
    const top = 70 + Math.min(this._wave - 1, 5) * 14;
    const left = (this.width - (FORMATION_COLUMNS - 1) * Game.SPACING_X - 34) / 2;
    this._invaders = [];
    ROW_TYPES.forEach((type, row) => {
      for (let col = 0; col < FORMATION_COLUMNS; col++) {
        this._invaders.push(createInvader(type, left + col * Game.SPACING_X, top + row * Game.SPACING_Y));
      }
    });
    this.waveSize = this._invaders.length;
    this.direction = 1;
    this.stepClock = 0;
  }

  /** Usado ao carregar um save: troca o estado inteiro por um já validado. */
  restore(state: {
    score: number;
    lives: number;
    wave: number;
    kills: Kills;
    direction: -1 | 1;
    playerX: number;
    invaders: Invader[];
  }): void {
    this._score = state.score;
    this._lives = state.lives;
    this._wave = state.wave;
    this._kills = { ...state.kills };
    this.direction = state.direction;
    this.player.placeAt(state.playerX);
    this._invaders = state.invaders;
    this.waveSize = FORMATION_ROWS * FORMATION_COLUMNS;
    this._shots = [];
    this._status = 'paused';
  }
}
