import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import { buildApp } from './app';
import type { Database } from './db';

const noDb = {} as Kysely<Database>;

describe('API', () => {
  it('responde o health check', async () => {
    const app = buildApp(noDb);
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('recusa resultado inválido com 400 e a mensagem do domínio', async () => {
    const app = buildApp(noDb);
    const res = await app.inject({
      method: 'POST',
      url: '/api/games',
      payload: { name: '', score: 10, wave: 1, kills: {} },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/nome/);
    const bad = await app.inject({
      method: 'POST',
      url: '/api/games',
      payload: { name: 'Ana', score: 10, wave: 1, kills: { alien: 2 } },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('salva e devolve o jogo em andamento num arquivo', async () => {
    const saveDir = await mkdtemp(join(tmpdir(), 'invasores-'));
    const app = buildApp(noDb, { saveDir });
    expect((await app.inject({ method: 'GET', url: '/api/save' })).statusCode).toBe(404);
    const put = await app.inject({ method: 'PUT', url: '/api/save', payload: { version: 1, score: 40 } });
    expect(put.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: '/api/save' });
    expect(get.statusCode).toBe(200);
    expect(JSON.parse(get.body)).toEqual({ version: 1, score: 40 });
  });
});
