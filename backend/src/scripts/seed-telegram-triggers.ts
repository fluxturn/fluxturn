import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { CONNECTOR_DEFINITIONS } from '../modules/fluxturn/connectors/shared';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateTelegramTriggers() {
  const client = await pool.connect();
  
  try {
    console.log('Updating Telegram connector triggers...');
    
    // Find the Telegram connector definition
    const telegramConnector = CONNECTOR_DEFINITIONS.find(c => c.name === 'telegram');
    
    if (!telegramConnector) {
      throw new Error('Telegram connector not found in definitions');
    }
    
    // Update the Telegram connector with new triggers
    const query = `
      UPDATE connectors 
      SET 
        supported_triggers = $1,
        updated_at = NOW()
      WHERE name = 'telegram'
      RETURNING id, name, display_name
    `;
    
    const result = await client.query(query, [
      JSON.stringify(telegramConnector.supported_triggers)
    ]);
    
    if (result.rows.length === 0) {
      console.log('Telegram connector not found in database. Running full seed...');
      
      // Insert the connector if it doesn't exist
      const insertQuery = `
        INSERT INTO connectors (
          name, display_name, category, description, auth_type, 
          auth_fields, endpoints, webhook_support, rate_limits, 
          sandbox_available, supported_actions, supported_triggers
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (name) 
        DO UPDATE SET 
          supported_triggers = EXCLUDED.supported_triggers,
          updated_at = NOW()
        RETURNING id, name, display_name
      `;
      
      const insertResult = await client.query(insertQuery, [
        telegramConnector.name,
        telegramConnector.display_name,
        telegramConnector.category,
        telegramConnector.description,
        telegramConnector.auth_type,
        JSON.stringify(telegramConnector.auth_fields),
        JSON.stringify(telegramConnector.endpoints),
        telegramConnector.webhook_support,
        JSON.stringify(telegramConnector.rate_limits),
        telegramConnector.sandbox_available,
        JSON.stringify(telegramConnector.supported_actions),
        JSON.stringify(telegramConnector.supported_triggers)
      ]);
      
      console.log('Telegram connector created/updated:', insertResult.rows[0]);
    } else {
      console.log('Telegram connector updated:', result.rows[0]);
    }
    
    console.log(`Updated ${telegramConnector.supported_triggers.length} triggers for Telegram`);
    
    // Display trigger summary
    console.log('\nTelegram triggers:');
    telegramConnector.supported_triggers.forEach((trigger: any) => {
      console.log(`  - ${trigger.name}: ${trigger.description}`);
    });
    
    console.log('\n✅ Telegram triggers updated successfully!');
    
  } catch (error) {
    console.error('Error updating Telegram triggers:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateTelegramTriggers().catch(console.error);