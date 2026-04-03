#!/usr/bin/env ts-node
/**
 * Standalone Template Seeder Script
 *
 * Seeds workflow templates to PostgreSQL without NestJS context.
 * This script connects directly to the database and seeds templates
 * from JSON files in the templates directory.
 *
 * Usage:
 *   NODE_ENV=production node dist/src/scripts/seed-templates-standalone.js
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Determine project root (handles both ts-node and compiled js)
// When compiled: __dirname is dist/src/scripts, go up 3 levels to backend root
// When ts-node: __dirname is src/scripts, go up 2 levels to backend root
const isCompiled = __dirname.includes('dist');
const projectRoot = isCompiled
  ? path.resolve(__dirname, '..', '..', '..')  // dist/src/scripts -> backend
  : path.resolve(__dirname, '..', '..');        // src/scripts -> backend

// Manual .env parser (more reliable than dotenv v17)
function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

// Load environment variables from .env file
let envVars: Record<string, string> = {};
const envFiles = ['.env', '.env.production', '.env.local'];
for (const envFile of envFiles) {
  const envPath = path.join(projectRoot, envFile);
  if (fs.existsSync(envPath)) {
    console.log(`📄 Loading environment from: ${envPath}`);
    envVars = parseEnvFile(envPath);
    console.log(`   Found ${Object.keys(envVars).length} environment variables`);
    break;
  }
}

// Helper to get env var from parsed file or process.env
const getEnv = (key: string): string | undefined => envVars[key] || process.env[key];

// Debug: List all env vars that contain DB, DATABASE, POSTGRES, or PG
console.log('🔍 Searching for database-related environment variables...');
const allEnvKeys = [...new Set([...Object.keys(envVars), ...Object.keys(process.env)])];
const dbRelatedVars = allEnvKeys.filter(key =>
  key.includes('DB') ||
  key.includes('DATABASE') ||
  key.includes('POSTGRES') ||
  key.includes('PG')
);
if (dbRelatedVars.length > 0) {
  console.log('   Found database-related vars:');
  dbRelatedVars.forEach(key => {
    const value = getEnv(key);
    const display = key.toLowerCase().includes('pass') || key.toLowerCase().includes('secret')
      ? `✓ set (${value?.length || 0} chars)`
      : `= ${value}`;
    console.log(`   - ${key}: ${display}`);
  });
} else {
  console.log('   ⚠️  No database-related environment variables found!');
  console.log('   Available env var keys (first 20):', Object.keys(envVars).slice(0, 20).join(', '));
}

// Database configuration - try multiple common variable names (including PLATFORM_DB_*)
const dbConfig = {
  host: getEnv('PLATFORM_DB_HOST') || getEnv('DB_HOST') || getEnv('DATABASE_HOST') || getEnv('POSTGRES_HOST') || getEnv('PGHOST') || 'localhost',
  port: parseInt(getEnv('PLATFORM_DB_PORT') || getEnv('DB_PORT') || getEnv('DATABASE_PORT') || getEnv('POSTGRES_PORT') || getEnv('PGPORT') || '5432', 10),
  database: getEnv('PLATFORM_DB_NAME') || getEnv('DB_DATABASE') || getEnv('DB_NAME') || getEnv('DATABASE_NAME') || getEnv('POSTGRES_DB') || getEnv('PGDATABASE') || 'fluxturn',
  user: getEnv('PLATFORM_DB_USER') || getEnv('DB_USERNAME') || getEnv('DB_USER') || getEnv('DATABASE_USER') || getEnv('POSTGRES_USER') || getEnv('PGUSER') || 'postgres',
  password: getEnv('PLATFORM_DB_PASSWORD') || getEnv('DB_PASSWORD') || getEnv('DATABASE_PASSWORD') || getEnv('POSTGRES_PASSWORD') || getEnv('PGPASSWORD') || '',
  ssl: (getEnv('PLATFORM_DB_SSL') === 'true' || getEnv('DB_SSL') === 'true' || getEnv('DATABASE_SSL') === 'true') ? { rejectUnauthorized: false } : false,
};

console.log('');
console.log('📊 Resolved database configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Password: ${dbConfig.password ? '✓ set (' + dbConfig.password.length + ' chars)' : '✗ not set'}`);
console.log(`   SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);

// Validate required credentials
if (!dbConfig.password) {
  console.error('');
  console.error('❌ Database password is not set. Please ensure one of these env vars is set:');
  console.error('   DB_PASSWORD, DATABASE_PASSWORD, POSTGRES_PASSWORD, or PGPASSWORD');
  process.exit(1);
}

// Templates directory path (always in src/, not dist/)
const templatesDir = path.join(projectRoot, 'src', 'modules', 'fluxturn', 'common', 'templates');

interface TemplateFile {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  canvas?: any;
  steps?: any[];
  triggers?: any[];
  conditions?: any[];
  variables?: any[];
  outputs?: any[];
  requiredConnectors?: string[];
  required_connectors?: string[];
  tags?: string[];
  is_public?: boolean;
  verified?: boolean;
  metadata?: any;
  ai_prompt?: string;
  difficulty?: string;
  estimatedSetupTime?: string;
}

async function seedTemplates() {
  console.log('🌱 Starting standalone template seeding...');
  console.log('='.repeat(50));
  console.log(`📂 Templates directory: ${templatesDir}`);
  console.log(`🗄️  Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log('='.repeat(50));

  // Create database pool
  const pool = new Pool(dbConfig);

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log(`✅ Database connected at ${testResult.rows[0].now}`);

    // Check if templates directory exists
    if (!fs.existsSync(templatesDir)) {
      console.error(`❌ Templates directory not found: ${templatesDir}`);
      process.exit(1);
    }

    // Read all JSON files from templates directory (except index.json)
    const files = fs.readdirSync(templatesDir).filter(
      (file) => file.endsWith('.json') && file !== 'index.json'
    );

    if (files.length === 0) {
      console.warn('⚠️  No template files found');
      return;
    }

    console.log(`📂 Found ${files.length} template files`);
    console.log('');

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of files) {
      const filePath = path.join(templatesDir, file);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const template: TemplateFile = JSON.parse(fileContent);

        // Check if template exists by name
        const existingResult = await pool.query(
          'SELECT id FROM workflow_templates WHERE name = $1',
          [template.name]
        );

        const templateId = existingResult.rows.length > 0
          ? existingResult.rows[0].id
          : (template.id || uuidv4());

        // Build template_definition
        const templateDefinition = {
          canvas: template.canvas || {},
          steps: template.steps || [],
          triggers: template.triggers || [],
          conditions: template.conditions || [],
          variables: template.variables || [],
          outputs: template.outputs || [],
        };

        // Get required connectors (handle both naming conventions)
        const requiredConnectors = template.requiredConnectors || template.required_connectors || [];

        if (existingResult.rows.length === 0) {
          // INSERT new template
          await pool.query(
            `INSERT INTO workflow_templates (
              id, name, description, category, template_definition,
              canvas, steps, triggers, conditions, variables, outputs,
              required_connectors, tags, is_public, verified, metadata, ai_prompt,
              created_by, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
            )`,
            [
              templateId,
              template.name,
              template.description || null,
              template.category || 'general',
              JSON.stringify(templateDefinition),
              JSON.stringify(template.canvas || {}),
              JSON.stringify(template.steps || []),
              JSON.stringify(template.triggers || []),
              JSON.stringify(template.conditions || []),
              JSON.stringify(template.variables || []),
              JSON.stringify(template.outputs || []),
              requiredConnectors,
              template.tags || [],
              template.is_public !== undefined ? template.is_public : true,
              template.verified !== undefined ? template.verified : false,
              JSON.stringify(template.metadata || {}),
              template.ai_prompt || null,
              null, // created_by (system templates)
            ]
          );
          inserted++;
          // Uncomment for verbose logging:
          // console.log(`   ✅ Inserted: ${template.name}`);
        } else {
          // UPDATE existing template
          await pool.query(
            `UPDATE workflow_templates SET
              description = $2,
              category = $3,
              template_definition = $4,
              canvas = $5,
              steps = $6,
              triggers = $7,
              conditions = $8,
              variables = $9,
              outputs = $10,
              required_connectors = $11,
              tags = $12,
              is_public = $13,
              verified = $14,
              metadata = $15,
              ai_prompt = $16,
              updated_at = NOW()
            WHERE id = $1`,
            [
              templateId,
              template.description || null,
              template.category || 'general',
              JSON.stringify(templateDefinition),
              JSON.stringify(template.canvas || {}),
              JSON.stringify(template.steps || []),
              JSON.stringify(template.triggers || []),
              JSON.stringify(template.conditions || []),
              JSON.stringify(template.variables || []),
              JSON.stringify(template.outputs || []),
              requiredConnectors,
              template.tags || [],
              template.is_public !== undefined ? template.is_public : true,
              template.verified !== undefined ? template.verified : false,
              JSON.stringify(template.metadata || {}),
              template.ai_prompt || null,
            ]
          );
          updated++;
          // Uncomment for verbose logging:
          // console.log(`   🔄 Updated: ${template.name}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error processing ${file}: ${error.message}`);
        errors++;
      }
    }

    console.log('');
    console.log('='.repeat(50));
    console.log(`✅ Template seeding complete!`);
    console.log(`   📥 Inserted: ${inserted}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors}`);
    }
    console.log('='.repeat(50));

    // Get final count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM workflow_templates');
    console.log(`📊 Total templates in database: ${countResult.rows[0].count}`);

  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seeder
seedTemplates()
  .then(() => {
    console.log('');
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
