#!/usr/bin/env ts-node
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAuthFields() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT name, auth_type, auth_fields
      FROM connectors
      WHERE name IN ('slack', 'clickup')
      ORDER BY name
    `);

    const slack = result.rows.find(r => r.name === 'slack');
    const clickup = result.rows.find(r => r.name === 'clickup');

    console.log('\n=== SLACK ===');
    console.log('Auth Type:', slack?.auth_type);
    console.log('Auth Fields:', JSON.stringify(slack?.auth_fields, null, 2));

    console.log('\n=== CLICKUP ===');
    console.log('Auth Type:', clickup?.auth_type);
    console.log('Auth Fields:', JSON.stringify(clickup?.auth_fields, null, 2));

    // Check if structures match
    const slackHasAuthMode = Array.isArray(slack?.auth_fields) &&
      slack.auth_fields.some((f: any) => f.key === 'authMode');
    const clickupHasAuthMode = Array.isArray(clickup?.auth_fields) &&
      clickup.auth_fields.some((f: any) => f.key === 'authMode');

    console.log('\n=== COMPARISON ===');
    console.log('Slack has authMode:', slackHasAuthMode);
    console.log('ClickUp has authMode:', clickupHasAuthMode);
    console.log('Structures match:', slackHasAuthMode === clickupHasAuthMode);

  } finally {
    client.release();
    await pool.end();
  }
}

checkAuthFields().catch(console.error);
