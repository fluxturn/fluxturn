const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'fluxturn_platform',
  user: 'postgres',
  password: 'postgres'
});

async function checkTemplates() {
  try {
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM workflow_templates');
    const total = countResult.rows[0].total;

    console.log(`\n=== WORKFLOW TEMPLATES IN DATABASE ===`);
    console.log(`Total templates: ${total}\n`);

    if (total > 0) {
      // Get templates with details
      const templatesResult = await pool.query(`
        SELECT
          id,
          name,
          category,
          is_public,
          use_count,
          created_at,
          created_by
        FROM workflow_templates
        ORDER BY created_at DESC
      `);

      console.log('Template Details:');
      console.log('─'.repeat(100));
      templatesResult.rows.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   Category: ${template.category || 'N/A'}`);
        console.log(`   Public: ${template.is_public ? 'Yes' : 'No'}`);
        console.log(`   Use Count: ${template.use_count || 0}`);
        console.log(`   Created: ${new Date(template.created_at).toLocaleString()}`);
        console.log(`   ID: ${template.id}`);
        console.log('');
      });
    } else {
      console.log('No templates found in the database.');
    }

    await pool.end();
  } catch (error) {
    console.error('Error checking templates:', error.message);
    process.exit(1);
  }
}

checkTemplates();
