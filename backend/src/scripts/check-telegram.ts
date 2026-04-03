#!/usr/bin/env ts-node
/**
 * Check telegram connector specifically
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkTelegram() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'fluxturn',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT name, display_name, category,
             supported_triggers, supported_actions
      FROM connectors
      WHERE name = 'telegram'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Telegram connector not found!');
      return;
    }

    const connector = result.rows[0];
    console.log('📦 Telegram Connector\n');
    console.log('Name:', connector.name);
    console.log('Display Name:', connector.display_name);
    console.log('Category:', connector.category);
    console.log('');

    console.log('🎯 Supported Triggers:');
    console.log(JSON.stringify(connector.supported_triggers, null, 2));
    console.log('');

    console.log('⚡ Supported Actions:');
    console.log(JSON.stringify(connector.supported_actions, null, 2));
    console.log('');

    console.log('\n=== WHAT AI SHOULD GENERATE ===\n');

    if (connector.supported_triggers && connector.supported_triggers.length > 0) {
      console.log('For Telegram Trigger:');
      console.log(JSON.stringify({
        type: 'CONNECTOR_TRIGGER',
        data: {
          label: connector.supported_triggers[0].name,
          connector: 'telegram',
          trigger: connector.supported_triggers[0].id,
          config: {}
        }
      }, null, 2));
      console.log('');
    }

    if (connector.supported_actions && connector.supported_actions.length > 0) {
      console.log('For Telegram Action:');
      console.log(JSON.stringify({
        type: 'CONNECTOR_ACTION',
        data: {
          label: connector.supported_actions[0].name,
          connector: 'telegram',
          action: connector.supported_actions[0].id,
          config: {}
        }
      }, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTelegram().catch(console.error);
