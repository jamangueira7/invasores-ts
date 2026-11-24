import { buildApp } from './app';
import { createDb, migrate } from './db';

const db = createDb();
await migrate(db);

const app = buildApp(db);
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    await db.destroy();
    process.exit(0);
  });
}
