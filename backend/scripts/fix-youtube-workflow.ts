import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fluxturn_db',
  user: 'postgres',
  password: 'Dev_Kx7Rm4Nq9Ws2Pv8Zx3Cy6Dt5Bv'
});

async function fixWorkflow() {
  const client = await pool.connect();

  try {
    // Get current workflow
    const result = await client.query(
      `SELECT canvas FROM workflows WHERE id = $1`,
      ['a549a654-e171-4dd9-a7c3-21163307ea06']
    );

    if (result.rows.length === 0) {
      console.log('Workflow not found');
      return;
    }

    const canvas = result.rows[0].canvas;

    // Find trigger and YouTube nodes
    const triggerNode = canvas.nodes.find((n: any) =>
      n.type === 'CONNECTOR_TRIGGER' && n.data?.connectorType === 'google_drive'
    );
    const youtubeNode = canvas.nodes.find((n: any) =>
      n.data?.connectorType === 'youtube'
    );

    if (!triggerNode || !youtubeNode) {
      console.log('Could not find required nodes');
      return;
    }

    // Check if download node exists
    const hasDownload = canvas.nodes.some((n: any) =>
      n.data?.actionId === 'file_download'
    );

    if (hasDownload) {
      console.log('Download node already exists');
      return;
    }

    console.log('Adding Download Video node...');

    // Create download node
    const downloadNode = {
      id: `google_drive_download_${Date.now()}`,
      type: 'CONNECTOR_ACTION',
      position: { x: 350, y: 200 },
      data: {
        label: 'Download Video',
        connectorType: 'google_drive',
        actionId: 'file_download',
        description: 'Downloads the video file from Google Drive',
        config: {},
        actionParams: {
          fileId: `={{$node["${triggerNode.data.label}"].json.id}}`,
          convertGoogleDocs: false
        }
      }
    };

    // Add node
    canvas.nodes.push(downloadNode);

    // Update edges
    const edgeIndex = canvas.edges.findIndex((e: any) =>
      e.source === triggerNode.id && e.target === youtubeNode.id
    );

    if (edgeIndex >= 0) {
      canvas.edges.splice(edgeIndex, 1);
    }

    canvas.edges.push({
      id: `e_trigger_download_${Date.now()}`,
      source: triggerNode.id,
      target: downloadNode.id,
      sourceHandle: 'source',
      targetHandle: 'target'
    });

    canvas.edges.push({
      id: `e_download_youtube_${Date.now()}`,
      source: downloadNode.id,
      target: youtubeNode.id,
      sourceHandle: 'source',
      targetHandle: 'target'
    });

    // Update workflow
    await client.query(
      `UPDATE workflows SET canvas = $1, updated_at = NOW() WHERE id = $2`,
      [canvas, 'a549a654-e171-4dd9-a7c3-21163307ea06']
    );

    console.log('✅ Workflow fixed successfully!');
    console.log(`Added Download Video node: ${downloadNode.id}`);
    console.log('Please refresh your browser.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixWorkflow();
