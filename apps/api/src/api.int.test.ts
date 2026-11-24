import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import { buildApp } from './app';
import type { Database } from './db';
import { clearTables, setupTestDb } from './testing/test-db';

let db: Kysely<Database>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  db = await setupTestDb();
  app = buildApp(db, { saveDir: await mkdtemp(join(tmpdir(), 'invasores-int-')) });
});
beforeEach(() => clearTables(db));
afterAll(async () => {
  await app.close();
  await db.destroy();
});

const kills = (drone = 0, stinger = 0, crown = 0) => ({ drone, stinger, crown });
const play = (name: string, score: number, wave = 1, k = kills()) =>
  app.inject({ method: 'POST', url: '/api/games', payload: { name, score, wave, kills: k } });
const stats = async () => (await app.inject({ method: 'GET', url: '/api/stats' })).json();
const count = async (table: keyof Database) =>
  Number((await db.selectFrom(table).select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()).n);

describe('POST /api/games e GET /api/stats', () => {
  it('grava a partida e ela aparece no ranking e nos abates', async () => {
    const res = await play('Ana', 1230, 3, kills(20, 8, 2));
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toEqual(expect.any(Number));
    expect(await stats()).toMatchObject({
      ranking: [{ name: 'Ana', best: 1230, bestWave: 3, games: 1 }],
      killsByType: [
        { type: 'drone', total: 20 },
        { type: 'stinger', total: 8 },
        { type: 'crown', total: 2 },
      ],
    });
  });

  it('o mesmo nome reaproveita o jogador e guarda só os tipos que tiveram abates', async () => {
    await play('Ana', 100, 1, kills(5));
    await play('Ana', 300, 2, kills(0, 4));
    expect(await count('players')).toBe(1);
    expect(await count('games')).toBe(2);
    expect(await count('kills')).toBe(2);
  });

  it.each([
    ['nome vazio', { name: '   ', score: 10, wave: 1, kills: kills() }],
    ['nome com mais de 20 caracteres', { name: 'x'.repeat(21), score: 10, wave: 1, kills: kills() }],
    ['pontuação negativa', { name: 'Ana', score: -5, wave: 1, kills: kills() }],
    ['onda zero', { name: 'Ana', score: 10, wave: 0, kills: kills() }],
    ['tipo de invasor desconhecido', { name: 'Ana', score: 10, wave: 1, kills: { alien: 2 } }],
  ])('recusa %s com 400 e não grava nada', async (_nome, payload) => {
    const res = await app.inject({ method: 'POST', url: '/api/games', payload });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toEqual(expect.any(String));
    expect(await count('players')).toBe(0);
    expect(await count('games')).toBe(0);
    expect(await count('kills')).toBe(0);
  });

  it('ranking: um piloto por linha com o melhor placar, da maior para a menor pontuação', async () => {
    await play('Beto', 500, 2);
    await play('Ana', 200, 1);
    await play('Ana', 900, 4);
    await play('Ana', 100, 6);
    await play('Caio', 700, 3);
    expect((await stats()).ranking).toEqual([
      { name: 'Ana', best: 900, bestWave: 6, games: 3 },
      { name: 'Caio', best: 700, bestWave: 3, games: 1 },
      { name: 'Beto', best: 500, bestWave: 2, games: 1 },
    ]);
  });

  it('ranking mostra só os 10 melhores', async () => {
    for (let i = 1; i <= 12; i++) await play(`Piloto${i}`, i * 10);
    const { ranking } = await stats();
    expect(ranking).toHaveLength(10);
    expect(ranking[0].name).toBe('Piloto12');
    expect(ranking.at(-1).name).toBe('Piloto3');
  });

  it('abates por tipo somam todas as partidas, do mais abatido para o menos', async () => {
    await play('Ana', 10, 1, kills(3, 0, 9));
    await play('Beto', 10, 1, kills(4, 1, 0));
    expect((await stats()).killsByType).toEqual([
      { type: 'crown', total: 9 },
      { type: 'drone', total: 7 },
      { type: 'stinger', total: 1 },
    ]);
  });

  it('pontos por dia somam as partidas do dia, do dia mais recente para o mais antigo', async () => {
    await play('Ana', 100);
    await play('Beto', 250);
    const old = await play('Caio', 40);
    await db
      .updateTable('games')
      .set({ played_at: new Date(Date.now() - 3 * 86_400_000) })
      .where('id', '=', old.json().id)
      .execute();
    const { pointsByDay } = await stats();
    expect(pointsByDay.map((d: { points: number; games: number }) => [d.points, d.games])).toEqual([
      [350, 2],
      [40, 1],
    ]);
    expect(pointsByDay[0].day > pointsByDay[1].day).toBe(true);
  });

  it('sem partidas devolve listas vazias', async () => {
    expect(await stats()).toEqual({ ranking: [], killsByType: [], pointsByDay: [] });
  });
});
