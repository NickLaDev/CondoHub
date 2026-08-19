import { AppError } from '../src/core/contract/errors';
import { getMigrationsStatus, runMigrations } from '../src/db/migrate/migrate';

async function main(): Promise<void> {
  const statusOnly = process.argv.includes('--status');

  if (statusOnly) {
    const statuses = await getMigrationsStatus();
    for (const item of statuses) {
      if (item.status === 'applied') {
        console.log(`[DB_STATUS] ${item.id} -> applied (${item.appliedAt})`);
      } else {
        console.log(`[DB_STATUS] ${item.id} -> pending`);
      }
    }
    return;
  }

  await runMigrations();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    if (error instanceof AppError) {
      console.error('[DB_MIGRATE] failed', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      process.exit(1);
    }

    console.error('[DB_MIGRATE] failed', error);
    process.exit(1);
  });
