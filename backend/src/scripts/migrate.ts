/**
 * Database Migration Runner
 *
 * This script handles database migrations for the Fluxturn platform.
 * Run with: npm run migrate
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables with fallback logic
// Priority: 1. Already set env vars, 2. .env.local (dev), 3. .env (production)
const baseDir = path.join(__dirname, '../../');
const envLocalPath = path.join(baseDir, '.env.local');
const envPath = path.join(baseDir, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
// If neither exists, rely on environment variables being set externally

import { Pool } from 'pg';

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || process.env.PLATFORM_DB_HOST,
  port: parseInt(process.env.DB_PORT || process.env.PLATFORM_DB_PORT),
  database: process.env.DB_NAME || process.env.PLATFORM_DB_NAME,
  user: process.env.DB_USER || process.env.PLATFORM_DB_USER,
  password: process.env.DB_PASSWORD || process.env.PLATFORM_DB_PASSWORD,
};

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

interface Migration {
  id: string;
  name: string;
  filename: string;
  appliedAt?: Date;
}

async function createMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_id VARCHAR(255) UNIQUE NOT NULL,
      migration_name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query('SELECT migration_id FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map(row => row.migration_id));
}

async function getPendingMigrations(pool: Pool): Promise<Migration[]> {
  const appliedMigrations = await getAppliedMigrations(pool);

  // Ensure migrations directory exists
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found. Creating...');
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const pendingMigrations: Migration[] = [];

  for (const filename of files) {
    // Extract migration ID and name from filename (format: 001_initial_schema.sql)
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) continue;

    const [, id, name] = match;
    const migrationId = `${id}_${name}`;

    if (!appliedMigrations.has(migrationId)) {
      pendingMigrations.push({
        id: migrationId,
        name: name.replace(/_/g, ' '),
        filename,
      });
    }
  }

  return pendingMigrations;
}

async function applyMigration(pool: Pool, migration: Migration): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, migration.filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Execute the migration SQL
    await client.query(sql);

    // Record the migration as applied
    await client.query(
      'INSERT INTO schema_migrations (migration_id, migration_name) VALUES ($1, $2)',
      [migration.id, migration.name]
    );

    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${migration.id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Fluxturn Database Migration Runner');
  console.log('='.repeat(60));
  console.log(`\nConnecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const pool = new Pool(dbConfig);

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✓ Database connection established\n');

    // Create migrations table if it doesn't exist
    await createMigrationsTable(pool);

    // Get pending migrations
    const pendingMigrations = await getPendingMigrations(pool);

    if (pendingMigrations.length === 0) {
      console.log('✓ Database is up to date. No pending migrations.\n');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s):\n`);
    pendingMigrations.forEach(m => console.log(`  - ${m.id}`));
    console.log('');

    // Apply each migration
    for (const migration of pendingMigrations) {
      await applyMigration(pool, migration);
    }

    console.log(`\n✓ Successfully applied ${pendingMigrations.length} migration(s).\n`);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Status command to show migration status
async function showStatus(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Migration Status');
  console.log('='.repeat(60));

  const pool = new Pool(dbConfig);

  try {
    await createMigrationsTable(pool);

    const appliedResult = await pool.query(
      'SELECT migration_id, migration_name, applied_at FROM schema_migrations ORDER BY id'
    );

    const pendingMigrations = await getPendingMigrations(pool);

    console.log('\nApplied Migrations:');
    if (appliedResult.rows.length === 0) {
      console.log('  (none)');
    } else {
      appliedResult.rows.forEach(row => {
        const date = new Date(row.applied_at).toISOString().split('T')[0];
        console.log(`  ✓ ${row.migration_id} (${date})`);
      });
    }

    console.log('\nPending Migrations:');
    if (pendingMigrations.length === 0) {
      console.log('  (none - database is up to date)');
    } else {
      pendingMigrations.forEach(m => {
        console.log(`  ○ ${m.id}`);
      });
    }
    console.log('');
  } finally {
    await pool.end();
  }
}

// Main entry point
const command = process.argv[2];

if (command === 'status') {
  showStatus();
} else {
  runMigrations();
}
