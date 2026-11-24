import Fastify from 'fastify';
import type { Kysely } from 'kysely';
import type { Database } from './db';

export function buildApp(_db: Kysely<Database>) {
  const app = Fastify({ logger: { level: 'info' } });

  app.get('/api/health', async () => ({ ok: true }));

  return app;
}
