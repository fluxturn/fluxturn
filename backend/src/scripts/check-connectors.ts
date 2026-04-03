#!/usr/bin/env ts-node
/**
 * Check what connectors are in the database with their triggers/actions
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkConnectors() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'fluxturn',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check connectors with trigger/action counts
    console.log('=== CONNECTORS IN DATABASE ===\n');
    const countQuery = `
      SELECT name,
             display_name,
             category,
             status,
             jsonb_array_length(COALESCE(supported_triggers, '[]'::jsonb)) as trigger_count,
             jsonb_array_length(COALESCE(supported_actions, '[]'::jsonb)) as action_count
      FROM connectors
      WHERE status = 'active'
      ORDER BY category, name
    `;

    const countResult = await client.query(countQuery);
    console.log(`Total active connectors: ${countResult.rows.length}\n`);

    countResult.rows.forEach(row => {
      console.log(`📦 ${row.display_name} (${row.name})`);
      console.log(`   Category: ${row.category}`);
      console.log(`   Triggers: ${row.trigger_count}`);
      console.log(`   Actions: ${row.action_count}`);
      console.log('');
    });

    // Check detailed triggers and actions for first few connectors
    console.log('\n=== DETAILED CONNECTOR DATA (First 5) ===\n');
    const detailQuery = `
      SELECT name,
             display_name,
             supported_triggers,
             supported_actions
      FROM connectors
      WHERE status = 'active'
      ORDER BY name
      LIMIT 5
    `;

    const detailResult = await client.query(detailQuery);

    detailResult.rows.forEach(row => {
      console.log(`\n📦 ${row.display_name} (${row.name})`);

      console.log('\n  🎯 Triggers:');
      const triggers = row.supported_triggers || [];
      if (triggers.length === 0) {
        console.log('     (none)');
      } else {
        triggers.forEach((t: any) => {
          console.log(`     • ${t.id} - ${t.name || 'No name'}`);
          if (t.description) {
            console.log(`       ${t.description}`);
          }
        });
      }

      console.log('\n  ⚡ Actions:');
      const actions = row.supported_actions || [];
      if (actions.length === 0) {
        console.log('     (none)');
      } else {
        actions.forEach((a: any) => {
          console.log(`     • ${a.id} - ${a.name || 'No name'}`);
          if (a.description) {
            console.log(`       ${a.description}`);
          }
        });
      }

      console.log('\n' + '─'.repeat(60));
    });

    // Check if AI is getting this data
    console.log('\n\n=== WHAT AI SHOULD SEE ===\n');
    console.log('When generating workflows, the AI should use:');
    console.log('');
    console.log('For Triggers:');
    console.log('  { "type": "CONNECTOR_TRIGGER", "data": { "connector": "<name>", "trigger": "<id>" } }');
    console.log('');
    console.log('For Actions:');
    console.log('  { "type": "CONNECTOR_ACTION", "data": { "connector": "<name>", "action": "<id>" } }');
    console.log('');

    // Show example for first connector
    if (detailResult.rows.length > 0) {
      const first = detailResult.rows[0];
      if (first.supported_actions && first.supported_actions.length > 0) {
        const action = first.supported_actions[0];
        console.log(`Example for ${first.name}:`);
        console.log(JSON.stringify({
          type: 'CONNECTOR_ACTION',
          data: {
            label: action.name,
            connector: first.name,
            action: action.id,
            config: {}
          }
        }, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkConnectors().catch(console.error);
