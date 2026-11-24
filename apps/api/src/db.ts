import { type Generated, Kysely, Migrator, PostgresDialect } from 'kysely';
import pg from 'pg';
import { migrations } from './migrations/index';

export interface PlayersTable {
  id: Generated<number>;
  name: string;
  created_at: Generated<Date>;
}

export interface GamesTable {
  id: Generated<number>;
  player_id: number;
  score: number;
  wave: number;
  played_at: Generated<Date>;
}

export interface KillsTable {
  id: Generated<number>;
  game_id: number;
  type: string;
  quantity: number;
}

/** Tabelas do laboratório: acrescente aqui junto com a migration. */
export interface Database {
  players: PlayersTable;
  games: GamesTable;
  kills: KillsTable;
}

export function createDb(url = process.env.DATABASE_URL ?? 'postgres://lab:lab@localhost:5432/lab') {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: url }) }),
  });
}

/** Aplica as migrations pendentes ao subir a API. */
export async function migrate(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error, results } = await migrator.migrateToLatest();
  for (const r of results ?? []) console.log(`migration ${r.migrationName}: ${r.status}`);
  if (error) throw error;
}
