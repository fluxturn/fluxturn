#!/usr/bin/env ts-node
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function check() {
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
      SELECT type, name, is_builtin, is_trigger, is_action, requires_connector
      FROM node_types
      WHERE type IN ('CONNECTOR_TRIGGER', 'CONNECTOR_ACTION')
    `);

    console.log('CONNECTOR_TRIGGER and CONNECTOR_ACTION status:\n');
    result.rows.forEach(row => {
      console.log(`${row.type}:`);
      console.log(`  name: ${row.name}`);
      console.log(`  is_builtin: ${row.is_builtin}`);
      console.log(`  is_trigger: ${row.is_trigger}`);
      console.log(`  is_action: ${row.is_action}`);
      console.log(`  requires_connector: ${row.requires_connector}`);
      console.log('');
    });

    // Check what's being filtered
    console.log('\n=== WHAT THE AI FETCHES ===\n');

    const allNodes = await client.query(`
      SELECT type, name, is_trigger, is_action, is_builtin
      FROM node_types
      WHERE is_active = true
    `);

    const builtinTriggers = allNodes.rows.filter(r => r.is_trigger && r.is_builtin);
    const builtinActions = allNodes.rows.filter(r => r.is_action && r.is_builtin);
    const allTriggers = allNodes.rows.filter(r => r.is_trigger);
    const allActions = allNodes.rows.filter(r => r.is_action);

    console.log(`Using filter: is_trigger && is_builtin`);
    console.log(`  Triggers found: ${builtinTriggers.length}`);
    builtinTriggers.forEach(t => console.log(`    - ${t.type}`));

    console.log(`\nUsing filter: is_action && is_builtin`);
    console.log(`  Actions found: ${builtinActions.length}`);
    builtinActions.forEach(a => console.log(`    - ${a.type}`));

    console.log(`\n\n🚨 PROBLEM:`);
    const connectorTrigger = builtinTriggers.find((t: any) => t.type === 'CONNECTOR_TRIGGER');
    const connectorAction = builtinActions.find((a: any) => a.type === 'CONNECTOR_ACTION');

    if (!connectorTrigger) {
      console.log(`  ❌ CONNECTOR_TRIGGER not in builtin triggers!`);
      console.log(`     AI won't know about it.`);
    } else {
      console.log(`  ✅ CONNECTOR_TRIGGER in builtin triggers`);
    }

    if (!connectorAction) {
      console.log(`  ❌ CONNECTOR_ACTION not in builtin actions!`);
      console.log(`     AI won't know about it.`);
    } else {
      console.log(`  ✅ CONNECTOR_ACTION in builtin actions`);
    }

    console.log(`\n\n💡 SOLUTION:`);
    console.log(`  The code filters for: is_trigger && is_builtin`);
    console.log(`  But CONNECTOR_TRIGGER/ACTION might not be marked as is_builtin.`);
    console.log(`  \n  Either:`);
    console.log(`  1. Update database: SET is_builtin = true for these nodes`);
    console.log(`  2. Update code: Include ALL is_trigger/is_action nodes, not just builtin`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

check().catch(console.error);
