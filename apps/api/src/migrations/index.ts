import { type Kysely, type Migration, sql } from 'kysely';

/** Migrations em ordem de nome (ex.: '0001_runs'). Cada uma com `up` e `down`. */
export const migrations: Record<string, Migration> = {
  '0001_invasores': {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable('players')
        .addColumn('id', 'serial', (c) => c.primaryKey())
        .addColumn('name', 'varchar(20)', (c) => c.notNull().unique())
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();
      await db.schema
        .createTable('games')
        .addColumn('id', 'serial', (c) => c.primaryKey())
        .addColumn('player_id', 'integer', (c) => c.notNull().references('players.id').onDelete('cascade'))
        .addColumn('score', 'integer', (c) => c.notNull())
        .addColumn('wave', 'integer', (c) => c.notNull())
        .addColumn('played_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();
      await db.schema
        .createTable('kills')
        .addColumn('id', 'serial', (c) => c.primaryKey())
        .addColumn('game_id', 'integer', (c) => c.notNull().references('games.id').onDelete('cascade'))
        .addColumn('type', 'varchar(16)', (c) => c.notNull())
        .addColumn('quantity', 'integer', (c) => c.notNull())
        .execute();
      await db.schema.createIndex('games_player_idx').on('games').column('player_id').execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable('kills').execute();
      await db.schema.dropTable('games').execute();
      await db.schema.dropTable('players').execute();
    },
  },
};
