import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkWorkflowCredential() {
  const pool = new Pool({
    host: process.env.PLATFORM_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PLATFORM_DB_PORT || process.env.DB_PORT || '5432'),
    user: process.env.PLATFORM_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.PLATFORM_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.PLATFORM_DB_NAME || process.env.DB_NAME || 'fluxturn_platform',
  });

  try {
    // Check the workflow
    const workflowResult = await pool.query(`
      SELECT id, name, canvas
      FROM workflows
      WHERE id = '35cd1f0f-e4dd-49dc-8f89-9183ab579cfb';
    `);

    if (workflowResult.rows.length === 0) {
      console.log('Workflow not found.');
      return;
    }

    const workflow = workflowResult.rows[0];
    console.log(`Workflow: ${workflow.name}`);
    console.log(`ID: ${workflow.id}\n`);

    // Parse canvas to find Twitter node
    const canvas = workflow.canvas;
    if (canvas && canvas.nodes) {
      const twitterNodes = canvas.nodes.filter((n: any) =>
        n.data?.connectorType === 'twitter' || n.type?.includes('twitter')
      );

      if (twitterNodes.length > 0) {
        twitterNodes.forEach((node: any) => {
          console.log(`--- Twitter Node ---`);
          console.log(`Node ID: ${node.id}`);
          console.log(`Label: ${node.data?.label || 'N/A'}`);
          console.log(`Credential ID: ${node.data?.credentialId || 'NOT SET'}`);
          console.log('');

          // Check the credential
          if (node.data?.credentialId) {
            pool.query(`
              SELECT id, name, oauth_scope FROM connector_configs WHERE id = $1
            `, [node.data.credentialId]).then(credResult => {
              if (credResult.rows.length > 0) {
                const cred = credResult.rows[0];
                console.log(`Credential Name: ${cred.name}`);
                console.log(`Has media.write: ${cred.oauth_scope?.includes('media.write') ? 'YES' : 'NO'}`);
              } else {
                console.log(`Credential ${node.data.credentialId} NOT FOUND in database!`);
              }
            });
          }
        });
      } else {
        console.log('No Twitter nodes found in workflow.');
      }
    }

    // Wait for async queries
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkWorkflowCredential();
