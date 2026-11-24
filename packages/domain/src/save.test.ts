import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { InvaderType } from './invader';
import { validateGameResult } from './results';
import { hexDump, loadGame, SaveCorruptedError, toSnapshot } from './save';

describe('save do jogo em andamento', () => {
  it('ida e volta pelo JSON preserva pontos, vidas e formação', () => {
    const game = new Game({ invaderFireRate: 0 });
    game.stepFormation();
    const loaded = loadGame(JSON.stringify(toSnapshot(game)));
    expect(loaded.status).toBe('paused');
    expect(loaded.lives).toBe(3);
    expect(loaded.invaders).toHaveLength(55);
    expect(loaded.invaders[0]?.x).toBe(game.invaders[0]?.x);
  });

  it('save corrompido lança SaveCorruptedError', () => {
    expect(() => loadGame('{nada')).toThrow(SaveCorruptedError);
    expect(() => loadGame('{"version":1,"score":-5}')).toThrow(/pontuação/);
    const snap = toSnapshot(new Game());
    snap.invaders[0] = { type: 'alien', x: 0, y: 0 };
    expect(() => loadGame(JSON.stringify(snap))).toThrow(/invasor 0/);
  });

  it('hexDump mostra deslocamento, bytes e texto', () => {
    const [line] = hexDump(new TextEncoder().encode('{"a":1}'));
    expect(line).toMatch(/^00000000 {2}7b 22 61 22 3a 31 7d\s+\{"a":1\}$/);
  });
});

describe('validateGameResult', () => {
  it('aceita um resultado válido e completa os tipos faltantes', () => {
    const r = validateGameResult({ name: ' Ana ', score: 120, wave: 2, kills: { drone: 3 } });
    expect(r).toEqual({
      ok: true,
      value: { name: 'Ana', score: 120, wave: 2, kills: { [InvaderType.Drone]: 3, stinger: 0, crown: 0 } },
    });
  });

  it('recusa nome vazio, números quebrados e tipos desconhecidos', () => {
    expect(validateGameResult({ name: '', score: 1, wave: 1, kills: {} }).ok).toBe(false);
    expect(validateGameResult({ name: 'A', score: 1.5, wave: 1, kills: {} }).ok).toBe(false);
    expect(validateGameResult({ name: 'A', score: 1, wave: 0, kills: {} }).ok).toBe(false);
    expect(validateGameResult({ name: 'A', score: 1, wave: 1, kills: { alien: 1 } }).ok).toBe(false);
  });
});
