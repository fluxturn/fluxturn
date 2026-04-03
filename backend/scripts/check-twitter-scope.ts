import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTwitterScope() {
  const pool = new Pool({
    host: process.env.PLATFORM_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PLATFORM_DB_PORT || process.env.DB_PORT || '5432'),
    user: process.env.PLATFORM_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.PLATFORM_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.PLATFORM_DB_NAME || process.env.DB_NAME || 'fluxturn_platform',
  });

  try {
    console.log('Checking Twitter connector configs...\n');

    const result = await pool.query(`
      SELECT id, name, connector_type, oauth_scope, created_at, updated_at
      FROM connector_configs
      WHERE connector_type = 'twitter'
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    if (result.rows.length === 0) {
      console.log('No Twitter connections found.');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`--- Twitter Connection ${i + 1} ---`);
        console.log(`ID: ${row.id}`);
        console.log(`Name: ${row.name}`);
        console.log(`Created: ${row.created_at}`);
        console.log(`Updated: ${row.updated_at}`);
        console.log(`OAuth Scope: ${row.oauth_scope || 'NOT SET'}`);
        console.log(`Has media.write: ${row.oauth_scope?.includes('media.write') ? 'YES' : 'NO'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTwitterScope();
