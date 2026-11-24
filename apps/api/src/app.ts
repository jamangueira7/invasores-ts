import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import Fastify from 'fastify';
import { type Kysely, sql } from 'kysely';
import { INVADER_TYPES, validateGameResult } from '@lab/domain';
import type { Database } from './db';

export interface AppOptions {
  /** Pasta do save do jogo em andamento (um volume Docker em produção e em dev). */
  saveDir?: string;
}

export function buildApp(db: Kysely<Database>, options: AppOptions = {}) {
  const app = Fastify({ logger: { level: 'info' }, bodyLimit: 256 * 1024 });
  const saveFile = join(options.saveDir ?? process.env.SAVE_DIR ?? './data', 'save.json');

  app.get('/api/health', async () => ({ ok: true }));

  /** Grava o resultado de uma partida: jogador (cria se não existe), jogo e abates por tipo. */
  app.post('/api/games', async (req, reply) => {
    const parsed = validateGameResult(req.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const { name, score, wave, kills } = parsed.value;

    const id = await db.transaction().execute(async (trx) => {
      const player = await trx
        .insertInto('players')
        .values({ name })
        .onConflict((oc) => oc.column('name').doUpdateSet({ name }))
        .returning('id')
        .executeTakeFirstOrThrow();
      const game = await trx
        .insertInto('games')
        .values({ player_id: player.id, score, wave })
        .returning('id')
        .executeTakeFirstOrThrow();
      const rows = INVADER_TYPES.filter((t) => kills[t] > 0).map((t) => ({
        game_id: game.id,
        type: t,
        quantity: kills[t],
      }));
      if (rows.length > 0) await trx.insertInto('kills').values(rows).execute();
      return game.id;
    });
    return reply.code(201).send({ id });
  });

  /** Estatísticas: ranking (join players × games), abatidos por tipo e pontos por dia (groupBy). */
  app.get('/api/stats', async () => {
    const [ranking, killsByType, pointsByDay] = await Promise.all([
      db
        .selectFrom('games')
        .innerJoin('players', 'players.id', 'games.player_id')
        .select((eb) => [
          'players.name',
          eb.fn.max('games.score').as('best'),
          eb.fn.max('games.wave').as('bestWave'),
          eb.fn.countAll<string>().as('games'),
        ])
        .groupBy('players.name')
        .orderBy('best', 'desc')
        .limit(10)
        .execute(),
      db
        .selectFrom('kills')
        .select((eb) => ['type', eb.fn.sum<string>('quantity').as('total')])
        .groupBy('type')
        .orderBy('total', 'desc')
        .execute(),
      db
        .selectFrom('games')
        .select((eb) => [
          sql<string>`to_char(played_at, 'YYYY-MM-DD')`.as('day'),
          eb.fn.sum<string>('score').as('points'),
          eb.fn.countAll<string>().as('games'),
        ])
        .groupBy(sql`to_char(played_at, 'YYYY-MM-DD')`)
        .orderBy('day', 'desc')
        .limit(14)
        .execute(),
    ]);
    return {
      ranking: ranking.map((r) => ({ name: r.name, best: Number(r.best), bestWave: Number(r.bestWave), games: Number(r.games) })),
      killsByType: killsByType.map((k) => ({ type: k.type, total: Number(k.total) })),
      pointsByDay: pointsByDay.map((d) => ({ day: d.day, points: Number(d.points), games: Number(d.games) })),
    };
  });

  /** Salva o jogo em andamento como JSON num arquivo (cap. 9). Quem valida na carga é o domínio. */
  app.put('/api/save', async (req, reply) => {
    if (typeof req.body !== 'object' || req.body === null) return reply.code(400).send({ error: 'Save inválido.' });
    await mkdir(join(saveFile, '..'), { recursive: true });
    await writeFile(saveFile, JSON.stringify(req.body, null, 2), 'utf8');
    return reply.code(204).send();
  });

  /** Devolve o arquivo cru, byte a byte (o visualizador hexadecimal usa a mesma rota). */
  app.get('/api/save', async (_req, reply) => {
    try {
      const bytes = await readFile(saveFile);
      return reply.type('application/octet-stream').send(bytes);
    } catch {
      return reply.code(404).send({ error: 'Nenhum jogo salvo ainda.' });
    }
  });

  return app;
}
