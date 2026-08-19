import 'dotenv/config';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool, PoolClient, PoolConfig } from 'pg';

type AppliedMigrationRow = {
  id: string;
  checksum: string;
};

type RepoMigration = {
  id: string;
  checksum: string;
};

type MismatchItem = {
  id: string;
  dbChecksum: string;
  repoChecksum: string;
};

function resolveMigrationsDir(): string {
  const migrationsDir = path.resolve(process.cwd(), 'src/db/migrate/migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }
  return migrationsDir;
}

async function readRepoMigrations(): Promise<Map<string, RepoMigration>> {
  const migrationsDir = resolveMigrationsDir();
  const files = (await fsp.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const map = new Map<string, RepoMigration>();
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = await fsp.readFile(fullPath, 'utf-8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    map.set(file, { id: file, checksum });
  }

  return map;
}

function resolveSsl(connectionString: string): PoolConfig['ssl'] {
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode');
    if (sslMode && sslMode !== 'disable') {
      return { rejectUnauthorized: false };
    }
  } catch {
    // Keep default SSL behavior when URL parsing fails.
  }

  return undefined;
}

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  return databaseUrl;
}

async function readAppliedMigrations(pool: Pool): Promise<AppliedMigrationRow[]> {
  const result = await pool.query<AppliedMigrationRow>(
    'select id, checksum from public.schema_migrations order by id asc',
  );
  return result.rows;
}

function logComparison(status: 'MATCH' | 'MISMATCH', id: string, dbChecksum: string, repoChecksum: string): void {
  console.log(`${status} ${id}`);
  console.log(`  db_checksum:   ${dbChecksum}`);
  console.log(`  repo_checksum: ${repoChecksum}`);
}

async function applyReconciliation(client: PoolClient, mismatches: MismatchItem[]): Promise<void> {
  await client.query('BEGIN');
  try {
    for (const item of mismatches) {
      const result = await client.query(
        `update public.schema_migrations
         set checksum = $2
         where id = $1`,
        [item.id, item.repoChecksum],
      );

      if (result.rowCount !== 1) {
        throw new Error(`Failed to reconcile checksum for migration ${item.id}`);
      }

      console.log(`RECONCILED ${item.id}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback error and preserve original failure.
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const repoMigrations = await readRepoMigrations();

  const databaseUrl = requireDatabaseUrl();
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: resolveSsl(databaseUrl),
  });

  try {
    const appliedMigrations = await readAppliedMigrations(pool);

    if (appliedMigrations.length === 0) {
      console.log('No applied migrations found in public.schema_migrations.');
      return;
    }

    const mismatches: MismatchItem[] = [];
    const missingInRepo: string[] = [];

    for (const applied of appliedMigrations) {
      const repo = repoMigrations.get(applied.id);
      const repoChecksum = repo?.checksum ?? 'MISSING_IN_REPO';
      const isMismatch = !repo || applied.checksum !== repo.checksum;

      logComparison(isMismatch ? 'MISMATCH' : 'MATCH', applied.id, applied.checksum, repoChecksum);

      if (isMismatch) {
        if (!repo) {
          missingInRepo.push(applied.id);
          continue;
        }

        mismatches.push({
          id: applied.id,
          dbChecksum: applied.checksum,
          repoChecksum: repo.checksum,
        });
      }
    }

    if (mismatches.length === 0 && missingInRepo.length === 0) {
      console.log('No checksum divergences found. Nothing to reconcile.');
      return;
    }

    if (!apply) {
      const totalMismatches = mismatches.length + missingInRepo.length;
      console.log(`Detected ${totalMismatches} checksum mismatch(es). Dry-run only.`);
      console.log('Run again with --apply to reconcile repo-vs-db checksum mismatches.');
      return;
    }

    if (missingInRepo.length > 0) {
      console.error('Cannot reconcile migrations that are missing in the repo:');
      for (const id of missingInRepo) {
        console.error(`- ${id}`);
      }
      process.exitCode = 1;
      return;
    }

    if (mismatches.length === 0) {
      console.log('No reconcilable mismatches found.');
      return;
    }

    const client = await pool.connect();
    try {
      await applyReconciliation(client, mismatches);
    } finally {
      client.release();
    }

    console.log(`Reconciled ${mismatches.length} migration checksum mismatch(es).`);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((error: unknown) => {
    console.error('[DB_RECONCILE_MIGRATION_CHECKSUMS] failed', error);
    process.exit(1);
  });
