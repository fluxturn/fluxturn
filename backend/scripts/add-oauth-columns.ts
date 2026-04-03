import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function addOAuthColumns() {
  const pool = new Pool({
    host: process.env.PLATFORM_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PLATFORM_DB_PORT || process.env.DB_PORT || '5432'),
    user: process.env.PLATFORM_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.PLATFORM_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.PLATFORM_DB_NAME || process.env.DB_NAME || 'fluxturn_platform',
  });

  try {
    console.log('Adding OAuth refresh columns to connector_configs table...');

    await pool.query(`
      ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS refresh_retry_count INTEGER DEFAULT 0;
      ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS refresh_disabled BOOLEAN DEFAULT false;
      ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS last_refresh_attempt TIMESTAMP WITH TIME ZONE;
      ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS last_refresh_error TEXT;
    `);

    console.log('Columns added successfully!');

    // Create index for efficient querying
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_connector_configs_oauth_expiring
      ON connector_configs(oauth_expires_at)
      WHERE is_oauth = true AND status = 'active' AND refresh_disabled = false;
    `);

    console.log('Index created successfully!');

    // Verify columns exist
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'connector_configs'
      AND column_name IN ('refresh_retry_count', 'refresh_disabled', 'last_refresh_attempt', 'last_refresh_error')
    `);

    console.log('Verified columns:', result.rows.map(r => r.column_name));

  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addOAuthColumns();
