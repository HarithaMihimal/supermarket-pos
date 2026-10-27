import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from './database';

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const databaseDirectory = path.resolve(process.cwd(), '..', 'database');
  const files = (await readdir(databaseDirectory))
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort();
  const applied = await pool.query<{ version: string }>('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(applied.rows.map(row => row.version));

  // Existing installations may have been provisioned manually before the runner existed.
  if (!appliedVersions.size) {
    const schemaExists = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches'`,
    );
    if (schemaExists.rowCount) {
      for (const file of files.filter(item => item < '008_')) {
        await pool.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
        appliedVersions.add(file);
      }
    }
  }

  for (const file of files) {
    if (appliedVersions.has(file)) continue;
    const sql = await readFile(path.join(databaseDirectory, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      console.log(JSON.stringify({ event: 'migration_applied', version: file }));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
