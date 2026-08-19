import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PoolClient } from 'pg';
import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../pool';

type AppliedMigrationRow = {
  id: string;
  checksum: string;
  applied_at: Date;
};

type MigrationFile = {
  id: string;
  sql: string;
  checksum: string;
};

export type MigrationStatus = {
  id: string;
  status: 'applied' | 'pending';
  appliedAt?: string;
};

function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'src/db/migrate/migrations'),
    path.resolve(process.cwd(), 'dist/db/migrate/migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Migrations directory not found');
}

async function ensureSchemaMigrationsTable(): Promise<void> {
  await getDbPool().query(`
    create table if not exists public.schema_migrations (
      id text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
  `);
}

async function readMigrationFiles(): Promise<MigrationFile[]> {
  const migrationsDir = resolveMigrationsDir();
  const files = (await fsp.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const migrations: MigrationFile[] = [];
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = await fsp.readFile(fullPath, 'utf-8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    migrations.push({
      id: file,
      sql,
      checksum,
    });
  }

  return migrations;
}

async function readAppliedMigrations(): Promise<Map<string, AppliedMigrationRow>> {
  const result = await getDbPool().query<AppliedMigrationRow>(
    'select id, checksum, applied_at from public.schema_migrations order by id asc',
  );

  const map = new Map<string, AppliedMigrationRow>();
  for (const row of result.rows) {
    map.set(row.id, row);
  }
  return map;
}

function assertNoChecksumDrift(migration: MigrationFile, applied: AppliedMigrationRow): void {
  if (migration.checksum !== applied.checksum) {
    throw Errors.dbError('Applied migration checksum mismatch', {
      migrationId: migration.id,
    });
  }
}

async function applyMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  await client.query(migration.sql);
  await client.query(
    'insert into public.schema_migrations (id, checksum, applied_at) values ($1, $2, now())',
    [migration.id, migration.checksum],
  );
}

export async function getMigrationsStatus(): Promise<MigrationStatus[]> {
  try {
    await ensureSchemaMigrationsTable();

    const migrations = await readMigrationFiles();
    const applied = await readAppliedMigrations();

    return migrations.map((migration) => {
      const existing = applied.get(migration.id);
      if (!existing) {
        return {
          id: migration.id,
          status: 'pending',
        };
      }

      assertNoChecksumDrift(migration, existing);

      return {
        id: migration.id,
        status: 'applied',
        appliedAt: existing.applied_at.toISOString(),
      };
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('[DB_MIGRATE] Failed to load status', formatDbError(error));
    throw Errors.dbError('Failed to load migration status');
  }
}

export async function runMigrations(): Promise<void> {
  try {
    await ensureSchemaMigrationsTable();

    const migrations = await readMigrationFiles();
    if (migrations.length === 0) {
      console.log('[DB_MIGRATE] No migration files found');
      return;
    }

    const applied = await readAppliedMigrations();

    for (const migration of migrations) {
      const existing = applied.get(migration.id);
      if (existing) {
        assertNoChecksumDrift(migration, existing);
        console.log(`[DB_MIGRATE] Skip ${migration.id} (already applied)`);
        continue;
      }

      const client = await getDbPool().connect();

      try {
        await client.query('BEGIN');
        await applyMigration(client, migration);
        await client.query('COMMIT');
        console.log(`[DB_MIGRATE] Applied ${migration.id}`);
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[DB_MIGRATE] Rollback failed', formatDbError(rollbackError));
        }

        console.error(`[DB_MIGRATE] Failed ${migration.id}`, formatDbError(error));

        if (error instanceof AppError) {
          throw error;
        }

        throw Errors.dbError(`Failed to apply migration ${migration.id}`, {
          migrationId: migration.id,
        });
      } finally {
        client.release();
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('[DB_MIGRATE] Failed before applying migrations', formatDbError(error));
    throw Errors.dbError('Failed to run migrations');
  }
}
