#!/usr/bin/env ts-node
/**
 * Update ClickUp Connector in Database
 * This script updates the ClickUp connector with the new authMode configuration
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const CLICKUP_AUTH_FIELDS = [
  {
    key: 'authMode',
    label: 'Authentication Mode',
    type: 'select',
    required: true,
    default: 'oneclick',
    options: [
      { label: 'One-Click OAuth (Use Platform Credentials)', value: 'oneclick' },
      { label: 'Manual OAuth (Use Your Own ClickUp App)', value: 'manual' }
    ],
    description: 'Choose between platform-managed OAuth or your own ClickUp OAuth app',
    helpText: 'One-Click OAuth is easier and recommended for most users. Use Manual OAuth if you need custom configuration or branding.'
  },
  {
    key: 'clientId',
    label: 'Client ID',
    type: 'string',
    required: false,
    placeholder: 'Enter your ClickUp App Client ID',
    description: 'OAuth2 Client ID from your ClickUp App',
    helpUrl: 'https://clickup.com/api/developer-portal/myapps',
    helpText: 'Create a ClickUp App at clickup.com/api/developer-portal/myapps',
    displayOptions: {
      show: {
        authMode: ['manual']
      }
    }
  },
  {
    key: 'clientSecret',
    label: 'Client Secret',
    type: 'password',
    required: false,
    placeholder: 'Enter your ClickUp App Client Secret',
    description: 'OAuth2 Client Secret from your ClickUp App',
    helpUrl: 'https://clickup.com/api/developer-portal/myapps',
    helpText: 'Find App Secret in your ClickUp App settings',
    displayOptions: {
      show: {
        authMode: ['manual']
      }
    }
  },
  {
    key: 'redirectUrl',
    label: 'OAuth Redirect URL',
    type: 'string',
    required: false,
    placeholder: 'https://your-domain.com/oauth/callback',
    description: 'The redirect URL configured in your ClickUp App',
    helpUrl: 'https://clickup.com/api/developer-portal/myapps',
    helpText: 'Must match the redirect URL in your ClickUp App OAuth settings',
    displayOptions: {
      show: {
        authMode: ['manual']
      }
    }
  }
];

async function updateClickUpConnector() {
  let client;

  try {
    client = await pool.connect();
    console.log('Connected to database');

    // Update the ClickUp connector
    const updateQuery = `
      UPDATE connectors
      SET
        auth_fields = $1,
        updated_at = NOW()
      WHERE name = 'clickup'
      RETURNING name, display_name, auth_type;
    `;

    const result = await client.query(updateQuery, [JSON.stringify(CLICKUP_AUTH_FIELDS)]);

    if (result.rowCount > 0) {
      console.log('✅ Successfully updated ClickUp connector!');
      console.log('Updated connector:', result.rows[0]);
      console.log('\nNew auth_fields structure:');
      console.log(JSON.stringify(CLICKUP_AUTH_FIELDS, null, 2));
    } else {
      console.log('⚠️  ClickUp connector not found in database');
      console.log('The connector may need to be seeded first with: npm run seed');
    }

  } catch (error) {
    console.error('❌ Error updating ClickUp connector:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the update
updateClickUpConnector()
  .then(() => {
    console.log('\n✅ Update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });
