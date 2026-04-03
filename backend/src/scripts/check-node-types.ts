#!/usr/bin/env ts-node
/**
 * Check what node types are ACTUALLY in the database
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkNodeTypes() {
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

    // Check node_types table structure
    console.log('=== NODE_TYPES TABLE SCHEMA ===\n');
    const schemaQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'node_types'
      ORDER BY ordinal_position
    `;
    const schemaResult = await client.query(schemaQuery);
    console.log('Columns:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Check what node types exist
    console.log('\n\n=== ALL NODE TYPES IN DATABASE ===\n');
    const nodeTypesQuery = `
      SELECT type, name, category, is_trigger, is_action, is_builtin,
             requires_connector, connector_type
      FROM node_types
      WHERE is_active = true
      ORDER BY category, is_trigger DESC, name
    `;
    const result = await client.query(nodeTypesQuery);

    console.log(`Total node types: ${result.rows.length}\n`);

    // Group by category
    const grouped: any = {};
    result.rows.forEach(row => {
      const cat = row.category || 'other';
      if (!grouped[cat]) grouped[cat] = { triggers: [], actions: [] };

      if (row.is_trigger) {
        grouped[cat].triggers.push(row);
      } else if (row.is_action) {
        grouped[cat].actions.push(row);
      }
    });

    Object.keys(grouped).forEach(category => {
      console.log(`\n📁 ${category.toUpperCase()}`);

      if (grouped[category].triggers.length > 0) {
        console.log('\n  🎯 Triggers:');
        grouped[category].triggers.forEach((node: any) => {
          console.log(`     • ${node.type} - "${node.name}"`);
          if (node.requires_connector) {
            console.log(`       (requires connector: ${node.connector_type || 'any'})`);
          }
        });
      }

      if (grouped[category].actions.length > 0) {
        console.log('\n  ⚡ Actions:');
        grouped[category].actions.forEach((node: any) => {
          console.log(`     • ${node.type} - "${node.name}"`);
          if (node.requires_connector) {
            console.log(`       (requires connector: ${node.connector_type || 'any'})`);
          }
        });
      }
    });

    // Check which nodes require connectors
    console.log('\n\n=== CONNECTOR-BASED NODES ===\n');
    const connectorNodesQuery = `
      SELECT type, name, connector_type, requires_connector
      FROM node_types
      WHERE requires_connector = true
      ORDER BY type
    `;
    const connectorNodes = await client.query(connectorNodesQuery);

    if (connectorNodes.rows.length > 0) {
      console.log('These node types require connector configuration:\n');
      connectorNodes.rows.forEach(row => {
        console.log(`  • ${row.type} - "${row.name}"`);
        console.log(`    Connector type: ${row.connector_type || 'any'}`);
      });
    } else {
      console.log('No connector-based nodes found in node_types table.');
    }

    // Check for CONNECTOR_TRIGGER and CONNECTOR_ACTION
    console.log('\n\n=== CHECKING FOR GENERIC CONNECTOR NODES ===\n');
    const genericQuery = `
      SELECT type, name, description
      FROM node_types
      WHERE type IN ('CONNECTOR_TRIGGER', 'CONNECTOR_ACTION')
    `;
    const genericResult = await client.query(genericQuery);

    if (genericResult.rows.length > 0) {
      console.log('✅ Found generic connector nodes:');
      genericResult.rows.forEach(row => {
        console.log(`  • ${row.type} - ${row.name}`);
        console.log(`    ${row.description || 'No description'}`);
      });
    } else {
      console.log('❌ CONNECTOR_TRIGGER and CONNECTOR_ACTION not found in node_types table!');
      console.log('   These need to be added for the AI to use connector-based nodes.');
    }

    // Show what AI should use
    console.log('\n\n=== WHAT AI SHOULD USE ===\n');
    console.log('Based on the database, the AI should use these EXACT node type names:');
    console.log('');

    const triggerQuery = `SELECT type, name FROM node_types WHERE is_trigger = true AND is_active = true ORDER BY name`;
    const actionQuery = `SELECT type, name FROM node_types WHERE is_action = true AND is_active = true ORDER BY name`;

    const triggers = await client.query(triggerQuery);
    const actions = await client.query(actionQuery);

    console.log('TRIGGERS:');
    triggers.rows.forEach(row => {
      console.log(`  - type: "${row.type}" (${row.name})`);
    });

    console.log('\nACTIONS:');
    actions.rows.forEach(row => {
      console.log(`  - type: "${row.type}" (${row.name})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkNodeTypes().catch(console.error);
