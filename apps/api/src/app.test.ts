import { describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import { buildApp } from './app';
import type { Database } from './db';

describe('API', () => {
  it('responde o health check', async () => {
    const app = buildApp({} as Kysely<Database>);
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
