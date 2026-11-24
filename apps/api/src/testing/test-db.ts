import { type Kysely, sql } from 'kysely';
import pg from 'pg';
import { createDb, type Database, migrate } from '../db';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://lab:lab@db:5432/lab_test';

/** Cria o banco de teste se ainda não existe (conecta no banco `postgres` do mesmo servidor). */
async function ensureDatabase(url: string): Promise<void> {
  const name = new URL(url).pathname.slice(1);
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const found = await admin.query('select 1 from pg_database where datname = $1', [name]);
    if (found.rowCount === 0) await admin.query(`create database "${name.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }
}

/** Banco de teste pronto: criado se preciso e com as migrations aplicadas. */
export async function setupTestDb(): Promise<Kysely<Database>> {
  await ensureDatabase(TEST_DATABASE_URL);
  const db = createDb(TEST_DATABASE_URL);
  await migrate(db);
  return db;
}

/** Esvazia as tabelas (e zera os ids) para o próximo teste começar do zero. */
export async function clearTables(db: Kysely<Database>): Promise<void> {
  await sql`truncate table kills, games, players restart identity cascade`.execute(db);
}
