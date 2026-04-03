#!/usr/bin/env ts-node
/**
 * Standalone Connector Seeding Script
 *
 * This script seeds connectors directly to PostgreSQL without NestJS module system.
 * This avoids circular dependency issues.
 *
 * Usage:
 *   npx ts-node src/scripts/seed-connectors.ts
 *   or
 *   npm run seed:connectors
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  console.log(`📄 Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('📄 Loading default environment');
  dotenv.config();
}

// Import connector definitions
import { CONNECTOR_DEFINITIONS } from '../modules/fluxturn/connectors/shared';

// Extended connector definition with verified field
interface ConnectorDefinitionWithVerified {
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

console.log(`🔌 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

const pool = new Pool(dbConfig);

async function seedConnectors(): Promise<void> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Cast to extended type that includes verified
  const connectors = CONNECTOR_DEFINITIONS as ConnectorDefinitionWithVerified[];

  console.log(`\n📦 Found ${connectors.length} connector definitions\n`);

  for (const connector of connectors) {
    try {
      // Check if connector exists
      const existingResult = await pool.query(
        `SELECT id, verified,
         supported_actions::text as actions,
         supported_triggers::text as triggers,
         auth_fields::text as auth_fields
         FROM connectors WHERE name = $1 AND is_public = true`,
        [connector.name]
      );

      if (existingResult.rows.length === 0) {
        // INSERT new connector
        await insertConnector(connector);
        inserted++;
        console.log(`   ✅ Inserted: ${connector.name}`);
      } else {
        // UPDATE existing connector - compare and update if different
        const existing = existingResult.rows[0];
        const changes: string[] = [];

        // Check what needs updating
        const newActions = JSON.stringify(connector.supported_actions || []);
        const newTriggers = JSON.stringify(connector.supported_triggers || []);
        const newAuthFields = JSON.stringify(connector.auth_fields || null);

        if (existing.actions !== newActions) changes.push('supported_actions');
        if (existing.triggers !== newTriggers) changes.push('supported_triggers');
        if (existing.auth_fields !== newAuthFields) changes.push('auth_fields');
        if (connector.verified !== undefined && connector.verified !== existing.verified) {
          changes.push('verified');
        }

        if (changes.length > 0) {
          await updateConnector(connector);
          updated++;
          console.log(`   🔄 Updated: ${connector.name} (${changes.join(', ')})`);
        } else {
          skipped++;
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing ${connector.name}: ${error.message}`);
    }
  }

  console.log(`\n✅ Connector seeding complete:`);
  console.log(`   - Inserted: ${inserted}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Skipped: ${skipped}`);
}

async function insertConnector(connector: ConnectorDefinitionWithVerified): Promise<void> {
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

async function updateConnector(connector: ConnectorDefinitionWithVerified): Promise<void> {
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
  console.log('🌱 Starting Connector Seeding...');
  console.log('='.repeat(50));

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    await seedConnectors();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Seeding completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
