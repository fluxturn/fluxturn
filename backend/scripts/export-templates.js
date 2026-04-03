const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 5433,
  database: process.env.DB_NAME || 'fluxturn_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function exportTemplates() {
  try {
    console.log('Fetching templates from database...\n');

    const result = await pool.query(`
      SELECT
        id,
        name,
        description,
        category,
        canvas,
        steps,
        triggers,
        conditions,
        variables,
        outputs,
        required_connectors,
        tags,
        is_public,
        metadata,
        ai_prompt,
        created_at
      FROM workflow_templates
      ORDER BY created_at ASC
    `);

    console.log(`Found ${result.rows.length} templates\n`);

    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      canvas: row.canvas,
      steps: row.steps,
      triggers: row.triggers,
      conditions: row.conditions,
      variables: row.variables,
      outputs: row.outputs,
      required_connectors: row.required_connectors,
      tags: row.tags,
      is_public: row.is_public,
      metadata: row.metadata,
      ai_prompt: row.ai_prompt
    }));

    // Write to JSON file
    const outputPath = path.join(__dirname, 'exported-templates.json');
    fs.writeFileSync(outputPath, JSON.stringify(templates, null, 2));

    console.log(`✅ Successfully exported ${templates.length} templates to: ${outputPath}`);

    // Display summary
    console.log('\nTemplate Summary:');
    console.log('─'.repeat(80));
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Connectors: ${template.required_connectors.join(', ')}`);
      console.log(`   Tags: ${template.tags.join(', ')}`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('Error exporting templates:', error.message);
    process.exit(1);
  }
}

exportTemplates();
