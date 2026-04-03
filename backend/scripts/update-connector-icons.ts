import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Database configuration - set via environment variables or .env file
const pool = new Pool({
  host: process.env.PLATFORM_DB_HOST || 'localhost',
  port: parseInt(process.env.PLATFORM_DB_PORT || '5432'),
  database: process.env.PLATFORM_DB_NAME || 'fluxturn_platform',
  user: process.env.PLATFORM_DB_USER || 'postgres',
  password: process.env.PLATFORM_DB_PASSWORD || 'postgres',
});

// CDN base URL
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://cdn.fluxturn.com/connectors';

// Local icons directory
const LOCAL_ICONS_DIR = path.join(
  __dirname,
  '../../frontend/public/icons/connectors'
);

/**
 * Get all PNG files from the local icons directory
 */
function getLocalIconFiles(): string[] {
  try {
    const files = fs.readdirSync(LOCAL_ICONS_DIR);
    return files
      .filter((file) => file.endsWith('.png'))
      .map((file) => file.replace('.png', ''));
  } catch (error) {
    console.error('Error reading local icons directory:', error);
    return [];
  }
}

/**
 * Update connector icon URLs in the database
 */
async function updateConnectorIcons() {
  const client = await pool.connect();

  try {
    console.log('🔍 Reading local connector icons...');
    const iconNames = getLocalIconFiles();
    console.log(`📁 Found ${iconNames.length} icon files locally\n`);

    // Get all connectors from database
    console.log('🔍 Fetching connectors from database...');
    const { rows: connectors } = await client.query(
      'SELECT id, name, display_name, icon_url FROM connectors ORDER BY name'
    );
    console.log(`📊 Found ${connectors.length} connectors in database\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    console.log('🔄 Processing connectors...\n');

    for (const connector of connectors) {
      const connectorName = connector.name;

      // Check if icon exists locally
      if (iconNames.includes(connectorName)) {
        const newIconUrl = `${CDN_BASE_URL}/${connectorName}.png`;

        // Update the database
        await client.query(
          'UPDATE connectors SET icon_url = $1, updated_at = NOW() WHERE id = $2',
          [newIconUrl, connector.id]
        );

        console.log(
          `✅ Updated: ${connector.display_name.padEnd(25)} | ${connectorName.padEnd(20)} → ${newIconUrl}`
        );
        updatedCount++;
      } else {
        console.log(
          `⚠️  Skipped: ${connector.display_name.padEnd(25)} | ${connectorName.padEnd(20)} → Icon not found locally`
        );
        notFoundCount++;
      }
    }

    // Show icons that exist locally but not in database
    console.log('\n📋 Icons in directory but not matched in database:');
    const unmatchedIcons = iconNames.filter(
      (iconName) => !connectors.some((c) => c.name === iconName)
    );

    if (unmatchedIcons.length > 0) {
      unmatchedIcons.forEach((iconName) => {
        console.log(`   • ${iconName}.png`);
      });
    } else {
      console.log('   None - all local icons are matched!');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount}`);
    console.log(`   ⚠️  Icon not found:      ${notFoundCount}`);
    console.log(`   📁 Total connectors:     ${connectors.length}`);
    console.log(`   📁 Total local icons:    ${iconNames.length}`);
    console.log(`   🔍 Unmatched icons:      ${unmatchedIcons.length}`);
    console.log('='.repeat(70));
  } catch (error) {
    console.error('❌ Error updating connector icons:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify the update by showing some sample results
 */
async function verifyUpdate() {
  const client = await pool.connect();

  try {
    console.log('\n🔍 Verifying updates (showing first 10 connectors)...\n');

    const { rows } = await client.query(
      'SELECT name, display_name, icon_url FROM connectors ORDER BY name LIMIT 10'
    );

    rows.forEach((row) => {
      console.log(`${row.display_name.padEnd(25)} | ${row.icon_url || 'No icon URL'}`);
    });
  } catch (error) {
    console.error('❌ Error verifying updates:', error);
  } finally {
    client.release();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Connector Icon URL Update Script\n');
  console.log('=' .repeat(70));

  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection successful\n');

    // Update icons
    await updateConnectorIcons();

    // Verify updates
    await verifyUpdate();

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();
