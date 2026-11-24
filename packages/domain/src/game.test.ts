import { describe, expect, it, vi } from 'vitest';
import { Game, STARTING_LIVES } from './game';
import { createInvader, type Invader, InvaderType } from './invader';
import { sequenceRandom } from './random';
import { Shot } from './shot';
import { Stars } from './stars';
import { intersects } from './geometry';

const quiet = () => new Game({ random: sequenceRandom([3, 1, 4, 1, 5, 9, 2, 6]), invaderFireRate: 0 });

/** Põe a nave embaixo do alvo e atira até ele morrer (ou o tempo acabar). */
function shootDown(game: Game, target: Invader): void {
  for (let t = 0; t < 400 && game.invaders.includes(target); t++) {
    game.player.placeAt(target.centerX - game.player.width / 2);
    game.controls.fire = true;
    game.update(16);
  }
  game.controls.fire = false;
}

/** Faz um invasor da frente atirar e segura a nave embaixo do tiro até ser atingida. */
function getHit(game: Game): void {
  const shot = game.invaderFire();
  if (!shot) throw new Error('nenhum tiro');
  const lives = game.lives;
  for (let t = 0; t < 400 && game.lives === lives; t++) {
    game.player.placeAt(shot.x - game.player.width / 2);
    game.update(16);
  }
}

describe('Invader', () => {
  it('cada tipo vale uma pontuação diferente (polimorfismo)', () => {
    expect(createInvader(InvaderType.Drone, 0, 0).points).toBe(10);
    expect(createInvader(InvaderType.Stinger, 0, 0).points).toBe(20);
    expect(createInvader(InvaderType.Crown, 0, 0).points).toBe(30);
  });
});

describe('Shot e Star', () => {
  it('tiro é imutável: andar devolve outro tiro', () => {
    const shot = new Shot(10, 100, 'player');
    const moved = shot.moved(100);
    expect(shot.y).toBe(100);
    expect(moved.y).toBeLessThan(100);
    expect(Object.isFrozen(shot)).toBe(true);
    expect(new Shot(0, -20, 'player').isOutside(600)).toBe(true);
  });

  it('o céu tem 300 estrelas e algumas trocam a cada quadro', () => {
    const stars = new Stars(sequenceRandom([5, 17, 250, 2, 1, 42, 99, 3]));
    expect(stars.all).toHaveLength(300);
    const before = stars.all;
    stars.twinkle(5);
    expect(stars.all).toHaveLength(300);
    expect(stars.all).not.toBe(before);
    expect(stars.all.filter((s, i) => s !== before[i]).length).toBeGreaterThan(0);
  });

  it('colisão por retângulos', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(intersects(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(intersects(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
  });
});

describe('Game', () => {
  it('começa com 3 vidas, onda 1 e 55 invasores em 5 linhas', () => {
    const game = quiet();
    expect(game.lives).toBe(STARTING_LIVES);
    expect(game.wave).toBe(1);
    expect(game.invaders).toHaveLength(55);
    expect(game.invaders[0]?.type).toBe(InvaderType.Crown);
    expect(game.invaders.at(-1)?.type).toBe(InvaderType.Drone);
  });

  it('tiro do jogador que acerta mata o invasor, soma pontos e emite invaderKilled', () => {
    const game = quiet();
    const killed = vi.fn();
    game.on('invaderKilled', killed);
    const target = game.invaders.at(-1)!; // drone da linha de baixo
    shootDown(game, target);
    expect(game.invaders).not.toContain(target);
    expect(game.score).toBe(10);
    expect(game.kills[InvaderType.Drone]).toBe(1);
    expect(killed).toHaveBeenCalledWith(expect.objectContaining({ type: InvaderType.Drone, points: 10 }));
  });

  it('pontua por tipo: limpar uma coluna vale 10+10+20+20+30', () => {
    const game = quiet();
    const column = game.invaders.filter((_, i) => i % 11 === 5).reverse();
    for (const invader of column) shootDown(game, invader);
    expect(game.score).toBe(90);
    expect(game.kills).toEqual({ drone: 2, stinger: 2, crown: 1 });
  });

  it('tiro inimigo tira uma vida, emite playerHit e deixa a nave invulnerável', () => {
    const game = quiet();
    const hit = vi.fn();
    game.on('playerHit', hit);
    getHit(game);
    expect(game.lives).toBe(2);
    expect(hit).toHaveBeenCalledWith(expect.objectContaining({ lives: 2 }));
    expect(game.player.isInvulnerable).toBe(true);
    expect(game.status).toBe('playing');
  });

  it('sem vidas, o jogo acaba e emite gameOver uma vez', () => {
    const game = quiet();
    const over = vi.fn();
    game.on('gameOver', over);
    for (let i = 0; i < 3; i++) {
      getHit(game);
      for (let t = 0; t < 120 && game.status === 'playing'; t++) game.update(16); // passa a invulnerabilidade
    }
    expect(game.lives).toBe(0);
    expect(game.status).toBe('over');
    expect(over).toHaveBeenCalledTimes(1);
    game.update(16);
    expect(over).toHaveBeenCalledTimes(1);
  });

  it('onda limpa emite waveCleared e traz uma formação nova', () => {
    const game = quiet();
    const last = createInvader(InvaderType.Crown, 400, 200);
    game.restore({ score: 50, lives: 2, wave: 1, kills: game.kills, direction: 1, playerX: 0, invaders: [last] });
    game.resume();
    const cleared = vi.fn();
    game.on('waveCleared', cleared);
    shootDown(game, last);
    expect(cleared).toHaveBeenCalledWith({ wave: 1, nextWave: 2 });
    expect(game.wave).toBe(2);
    expect(game.invaders).toHaveLength(55);
    expect(game.score).toBe(80);
  });

  it('a formação anda de lado e, na borda, desce e inverte', () => {
    const game = quiet();
    const first = game.invaders[0]!;
    const y0 = first.y;
    const x0 = first.x;
    game.stepFormation();
    expect(first.x).toBe(x0 + Game.STEP_X);
    let steps = 0;
    while (game.formationDirection === 1 && steps++ < 100) game.stepFormation();
    expect(first.y).toBe(y0 + Game.STEP_DOWN);
    const xAtTurn = first.x;
    game.stepFormation();
    expect(first.x).toBe(xAtTurn - Game.STEP_X);
  });

  it('a formação acelera quando sobram menos invasores', () => {
    const game = quiet();
    const full = game.stepIntervalMs;
    shootDown(game, game.invaders.at(-1)!);
    shootDown(game, game.invaders.at(-1)!);
    expect(game.stepIntervalMs).toBeLessThan(full);
  });

  it('invasores chegando na base acabam o jogo', () => {
    const game = quiet();
    const over = vi.fn();
    game.on('gameOver', over);
    for (let i = 0; i < 1000 && game.status === 'playing'; i++) game.stepFormation();
    expect(game.status).toBe('over');
    expect(over).toHaveBeenCalledTimes(1);
  });

  it('só os da frente atiram, e pausa congela o jogo', () => {
    const game = quiet();
    const front = game.frontInvaders();
    expect(front).toHaveLength(11);
    expect(front.every((i) => i.type === InvaderType.Drone)).toBe(true);
    game.pause();
    const x = game.invaders[0]!.x;
    game.update(5000);
    expect(game.invaders[0]!.x).toBe(x);
    expect(game.status).toBe('paused');
  });
});
