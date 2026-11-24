import type { Migration } from 'kysely';

/** Migrations em ordem de nome (ex.: '0001_runs'). Cada uma com `up` e `down`. */
export const migrations: Record<string, Migration> = {};
