import { Kysely, Migrator, PostgresDialect } from 'kysely';
import pg from 'pg';
import { migrations } from './migrations/index';

/** Tabelas do laboratório: acrescente aqui junto com a migration. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}

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
