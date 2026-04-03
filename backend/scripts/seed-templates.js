/**
 * Workflow Templates Seeder
 *
 * This script seeds all workflow templates from the templates directory into your local database.
 *
 * Usage:
 *   node seed-templates.js
 *
 * Prerequisites:
 *   - PostgreSQL database running
 *   - Database configured in .env file
 *   - Template files in backend/src/common/templates directory
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load environment variables from .env file
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || process.env.PLATFORM_DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.PLATFORM_DB_PORT || '5432'),
  database: process.env.DB_NAME || process.env.PLATFORM_DB_NAME || 'fluxturn_platform',
  user: process.env.DB_USER || process.env.PLATFORM_DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PLATFORM_DB_PASSWORD || 'postgres'
});

async function seedTemplates() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        FluxTurn Workflow Templates Seeder v2.0          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const testConnection = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully\n');

    // Load templates from directory
    const templatesDir = path.join(__dirname, '..', 'src', 'modules', 'fluxturn', 'common', 'templates');

    if (!fs.existsSync(templatesDir)) {
      console.error('❌ Error: templates directory not found!');
      console.error(`   Expected path: ${templatesDir}`);
      process.exit(1);
    }

    console.log('📂 Loading templates from directory...');
    console.log(`   Path: ${templatesDir}\n`);

    // Read all JSON files from the templates directory
    const files = fs.readdirSync(templatesDir);
    const templateFiles = files.filter(file =>
      file.endsWith('.json') && file !== 'index.json'
    );

    // Load all templates
    const templates = [];
    for (const file of templateFiles) {
      const filePath = path.join(templatesDir, file);
      const templateData = fs.readFileSync(filePath, 'utf8');
      try {
        const template = JSON.parse(templateData);
        templates.push(template);
      } catch (error) {
        console.warn(`⚠️  Warning: Could not parse ${file}: ${error.message}`);
      }
    }

    console.log(`✅ Loaded ${templates.length} templates from ${templateFiles.length} files\n`);

    console.log('🌱 Starting seeding process...\n');

    let seededCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const template of templates) {
      let canvas, steps, triggers, required_connectors;

      try {
        // Validate template has required fields
        if (!template || !template.name) {
          console.warn(`⚠️  Skipping invalid template (no name)`);
          errorCount++;
          continue;
        }

        // Check if template already exists
        const checkQuery = `
          SELECT id, name FROM workflow_templates
          WHERE name = $1
        `;
        const existing = await pool.query(checkQuery, [template.name]);

        // Transform template to ensure all required fields exist
        canvas = template.canvas || { nodes: [], edges: [] };

        // Extract steps from canvas nodes (exclude trigger nodes)
        steps = template.steps || (canvas.nodes ? canvas.nodes
          .filter(node => node.type !== 'CONNECTOR_TRIGGER')
          .map(node => ({
            id: node.id,
            action: node.data?.actionId || 'execute',
            params: node.data || {},
            connector: node.type || node.data?.connector
          })) : []);

        // Extract triggers from canvas nodes
        triggers = template.triggers || (canvas.nodes ? canvas.nodes
          .filter(node => node.type === 'CONNECTOR_TRIGGER')
          .map(node => ({
            id: node.id,
            type: node.type,
            config: node.data || {}
          })) : []);

        // Required connectors - normalize the field name
        required_connectors = template.required_connectors || template.requiredConnectors || [];

        // Insert template
        const insertQuery = `
          INSERT INTO workflow_templates (
            id,
            name,
            description,
            category,
            template_definition,
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
            created_by,
            use_count
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17
          )
          RETURNING id, name
        `;

        // Prepare metadata with all additional fields
        const metadata = {
          ...(template.metadata || {}),
          icon: template.icon || '⚡',
          color: template.color || 'from-cyan-500 to-blue-500',
          difficulty: template.difficulty,
          estimatedSetupTime: template.estimatedSetupTime
        };

        // Ensure template_definition has all fields
        const template_definition = {
          ...template,
          canvas,
          steps,
          triggers,
          conditions: template.conditions || [],
          variables: template.variables || [],
          outputs: template.outputs || [],
          required_connectors,
          tags: template.tags || [],
          is_public: template.is_public !== undefined ? template.is_public : true,
          metadata
        };

        // Validate template_definition is not null/undefined
        if (!template_definition || typeof template_definition !== 'object') {
          console.error(`❌ Error: Invalid template_definition for "${template.name}"`);
          errorCount++;
          continue;
        }

        // Convert JSONB fields to strings, with error handling
        let template_def_str, canvas_str, steps_str, triggers_str, conditions_str, variables_str, outputs_str, metadata_str;

        try {
          template_def_str = JSON.stringify(template_definition);
          canvas_str = JSON.stringify(canvas);
          steps_str = JSON.stringify(steps);
          triggers_str = JSON.stringify(triggers);
          conditions_str = JSON.stringify(template.conditions || []);
          variables_str = JSON.stringify(template.variables || []);
          outputs_str = JSON.stringify(template.outputs || []);
          metadata_str = JSON.stringify(metadata);
        } catch (stringifyError) {
          console.error(`❌ Error stringifying JSON for "${template.name}":`, stringifyError.message);
          errorCount++;
          continue;
        }

        // Decide whether to INSERT or UPDATE
        if (existing.rows.length > 0) {
          // Update existing template
          const updateQuery = `
            UPDATE workflow_templates
            SET
              description = $1,
              category = $2,
              template_definition = $3,
              canvas = $4,
              steps = $5,
              triggers = $6,
              conditions = $7,
              variables = $8,
              outputs = $9,
              required_connectors = $10,
              tags = $11,
              is_public = $12,
              metadata = $13,
              updated_at = NOW()
            WHERE name = $14
            RETURNING id, name
          `;

          const updateValues = [
            template.description || '',
            template.category || 'other',
            template_def_str,
            canvas_str,
            steps_str,
            triggers_str,
            conditions_str,
            variables_str,
            outputs_str,
            required_connectors,
            template.tags || [],
            template.is_public !== undefined ? template.is_public : true,
            metadata_str,
            template.name
          ];

          const result = await pool.query(updateQuery, updateValues);
          console.log(`🔄 Updated: "${template.name}" (ID: ${existing.rows[0].id})`);
          skippedCount++;
        } else {
          // Insert new template
          const values = [
            uuidv4(),
            template.name,
            template.description || '',
            template.category || 'other',
            template_def_str, // template_definition - complete template object
            canvas_str,
            steps_str,
            triggers_str,
            conditions_str,
            variables_str,
            outputs_str,
            required_connectors,  // Array type - don't stringify
            template.tags || [],  // Array type - don't stringify
            template.is_public !== undefined ? template.is_public : true,
            metadata_str,
            null, // created_by (system templates)
            0 // use_count
          ];

          const result = await pool.query(insertQuery, values);
          console.log(`✅ Seeded: "${template.name}" (ID: ${result.rows[0].id})`);
          seededCount++;
        }

      } catch (error) {
        console.error(`❌ Error seeding "${template.name}":`, error.message);
        if (error.message.includes('invalid input syntax')) {
          console.error(`   Template data:`, JSON.stringify({
            name: template.name,
            canvas: canvas ? 'exists' : 'null',
            steps: steps ? `${steps.length} steps` : 'null',
            triggers: triggers ? `${triggers.length} triggers` : 'null',
            required_connectors
          }, null, 2));
        }
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 Seeding Summary:');
    console.log('═'.repeat(60));
    console.log(`✅ New templates seeded: ${seededCount} templates`);
    console.log(`🔄 Existing templates updated: ${skippedCount} templates`);
    console.log(`❌ Errors: ${errorCount} templates`);
    console.log(`📦 Total processed: ${templates.length} templates`);
    console.log('═'.repeat(60) + '\n');

    if (seededCount > 0 || skippedCount > 0) {
      console.log('🎉 Operation completed successfully!');
      if (seededCount > 0) {
        console.log(`   ${seededCount} new templates added to FluxTurn platform.`);
      }
      if (skippedCount > 0) {
        console.log(`   ${skippedCount} templates updated with latest changes.\n`);
      }
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. Database credentials in .env are correct');
    console.error('  3. Database and tables exist');
    console.error('  4. exported-templates.json is valid JSON\n');
    process.exit(1);
  }
}

// Run the seeder
seedTemplates();
