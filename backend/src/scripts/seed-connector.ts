#!/usr/bin/env ts-node
/**
 * Seed Single Connector Script
 *
 * Seeds or updates a single connector by name.
 *
 * Usage:
 *   npx ts-node src/scripts/seed-connector.ts <connector_name>
 *   npm run seed:connector -- twilio
 *   npm run seed:connector -- telegram
 *
 * Examples:
 *   npx ts-node src/scripts/seed-connector.ts twilio
 *   npx ts-node src/scripts/seed-connector.ts telegram
 *   npx ts-node src/scripts/seed-connector.ts --list   # List all available connectors
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Import connector definitions
import { CONNECTOR_DEFINITIONS } from '../modules/fluxturn/connectors/shared';

interface ConnectorDefinition {
  name: string;
  display_name: string;
  category: string;
  description: string;
  auth_type?: string;
  auth_fields?: any;
  endpoints?: any;
  webhook_support?: boolean;
  rate_limits?: any;
  sandbox_available?: boolean;
  verified?: boolean;
  supported_actions?: any[];
  supported_triggers?: any[];
  oauth_config?: any;
}

// Database configuration
const dbConfig = {
  host: process.env.PLATFORM_DB_HOST || 'localhost',
  port: parseInt(process.env.PLATFORM_DB_PORT || '5432', 10),
  database: process.env.PLATFORM_DB_NAME || 'fluxturn_platform',
  user: process.env.PLATFORM_DB_USER || 'postgres',
  password: process.env.PLATFORM_DB_PASSWORD || 'postgres',
};

const pool = new Pool(dbConfig);

function findConnector(name: string): ConnectorDefinition | undefined {
  return (CONNECTOR_DEFINITIONS as ConnectorDefinition[]).find(
    c => c.name.toLowerCase() === name.toLowerCase()
  );
}

function listConnectors(): void {
  const connectors = CONNECTOR_DEFINITIONS as ConnectorDefinition[];

  console.log('\n📦 Available Connectors:\n');

  // Group by category
  const grouped: Record<string, ConnectorDefinition[]> = {};
  for (const c of connectors) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  for (const [category, items] of Object.entries(grouped).sort()) {
    console.log(`  📁 ${category.toUpperCase()}`);
    for (const c of items.sort((a, b) => a.name.localeCompare(b.name))) {
      const actions = c.supported_actions?.length || 0;
      const triggers = c.supported_triggers?.length || 0;
      const verified = c.verified ? '✓' : ' ';
      console.log(`     ${verified} ${c.name.padEnd(20)} - ${actions} actions, ${triggers} triggers`);
    }
    console.log('');
  }

  console.log(`Total: ${connectors.length} connectors\n`);
}

async function seedConnector(connector: ConnectorDefinition): Promise<void> {
  console.log(`\n🔌 Seeding connector: ${connector.name}`);
  console.log('='.repeat(50));

  // Check if connector exists
  const existingResult = await pool.query(
    `SELECT id,
     jsonb_array_length(COALESCE(supported_actions, '[]'::jsonb)) as action_count,
     jsonb_array_length(COALESCE(supported_triggers, '[]'::jsonb)) as trigger_count
     FROM connectors WHERE name = $1 AND is_public = true`,
    [connector.name]
  );

  if (existingResult.rows.length === 0) {
    // INSERT new connector
    await insertConnector(connector);
    console.log(`✅ Inserted new connector: ${connector.name}`);
  } else {
    // UPDATE existing connector
    const existing = existingResult.rows[0];
    console.log(`📊 Current state in DB:`);
    console.log(`   - Actions: ${existing.action_count}`);
    console.log(`   - Triggers: ${existing.trigger_count}`);

    await updateConnector(connector);
    console.log(`\n🔄 Updated connector: ${connector.name}`);
  }

  // Show new state
  const newActions = connector.supported_actions?.length || 0;
  const newTriggers = connector.supported_triggers?.length || 0;

  console.log(`\n📊 New state:`);
  console.log(`   - Actions: ${newActions}`);
  if (connector.supported_actions) {
    connector.supported_actions.forEach(a => {
      console.log(`     • ${a.id}: ${a.name}`);
    });
  }
  console.log(`   - Triggers: ${newTriggers}`);
  if (connector.supported_triggers) {
    connector.supported_triggers.forEach(t => {
      console.log(`     • ${t.id}: ${t.name}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Done!');
}

async function insertConnector(connector: ConnectorDefinition): Promise<void> {
  const insertQuery = `
    INSERT INTO connectors (
      id, name, display_name, description, category, type,
      status, is_public, auth_type, auth_fields, endpoints,
      webhook_support, rate_limits, sandbox_available, verified, capabilities,
      supported_triggers, supported_actions, oauth_config,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19,
      NOW(), NOW()
    )
  `;

  const values = [
    uuidv4(),
    connector.name,
    connector.display_name,
    connector.description,
    connector.category,
    'official',
    'active',
    true,
    connector.auth_type || 'api_key',
    connector.auth_fields ? JSON.stringify(connector.auth_fields) : null,
    connector.endpoints ? JSON.stringify(connector.endpoints) : null,
    connector.webhook_support ?? false,
    connector.rate_limits ? JSON.stringify(connector.rate_limits) : null,
    connector.sandbox_available ?? false,
    connector.verified ?? false,
    JSON.stringify({
      triggers: [],
      actions: [],
      conditions: [],
      webhooks: connector.webhook_support ?? false,
      batch: true,
    }),
    JSON.stringify(connector.supported_triggers || []),
    JSON.stringify(connector.supported_actions || []),
    connector.oauth_config ? JSON.stringify(connector.oauth_config) : null,
  ];

  await pool.query(insertQuery, values);
}

async function updateConnector(connector: ConnectorDefinition): Promise<void> {
  const updateQuery = `
    UPDATE connectors SET
      display_name = $2,
      description = $3,
      category = $4,
      auth_type = $5,
      auth_fields = $6,
      endpoints = $7,
      webhook_support = $8,
      rate_limits = $9,
      sandbox_available = $10,
      verified = $11,
      supported_triggers = $12,
      supported_actions = $13,
      oauth_config = $14,
      updated_at = NOW()
    WHERE name = $1 AND is_public = true
  `;

  const values = [
    connector.name,
    connector.display_name,
    connector.description,
    connector.category,
    connector.auth_type || 'api_key',
    connector.auth_fields ? JSON.stringify(connector.auth_fields) : null,
    connector.endpoints ? JSON.stringify(connector.endpoints) : null,
    connector.webhook_support ?? false,
    connector.rate_limits ? JSON.stringify(connector.rate_limits) : null,
    connector.sandbox_available ?? false,
    connector.verified ?? false,
    JSON.stringify(connector.supported_triggers || []),
    JSON.stringify(connector.supported_actions || []),
    connector.oauth_config ? JSON.stringify(connector.oauth_config) : null,
  ];

  await pool.query(updateQuery, values);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npx ts-node src/scripts/seed-connector.ts <connector_name>

Options:
  --list, -l    List all available connectors
  --help, -h    Show this help message

Examples:
  npx ts-node src/scripts/seed-connector.ts twilio
  npx ts-node src/scripts/seed-connector.ts --list
`);
    process.exit(0);
  }

  if (args[0] === '--list' || args[0] === '-l') {
    listConnectors();
    process.exit(0);
  }

  const connectorName = args[0];
  const connector = findConnector(connectorName);

  if (!connector) {
    console.error(`\n❌ Connector not found: ${connectorName}`);
    console.log('\nRun with --list to see available connectors');
    process.exit(1);
  }

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log(`✅ Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    await seedConnector(connector);
  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
