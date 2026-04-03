/**
 * Reset post counts - Delete all posts and reset cached counts
 * Run with: npx ts-node scripts/reset-post-counts.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.PLATFORM_DB_HOST || 'localhost',
  port: parseInt(process.env.PLATFORM_DB_PORT || '5432'),
  user: process.env.PLATFORM_DB_USER || 'postgres',
  password: process.env.PLATFORM_DB_PASSWORD || 'postgres',
  database: process.env.PLATFORM_DB_NAME || 'fluxturn_social',
});

async function resetPostCounts() {
  const client = await pool.connect();

  try {
    console.log('Starting post count reset...\n');

    // 1. Check current state
    const beforePosts = await client.query(`SELECT COUNT(*) as count FROM pao_collected_posts`);
    const beforeConfigs = await client.query(`
      SELECT id, name, total_posts_collected
      FROM pao_promotion_config
      WHERE total_posts_collected > 0
    `);

    console.log(`Current posts in pao_collected_posts: ${beforePosts.rows[0].count}`);
    console.log(`Configs with non-zero post counts:`);
    beforeConfigs.rows.forEach(row => {
      console.log(`  - ${row.name || row.id}: ${row.total_posts_collected} posts`);
    });

    // 2. Delete all collected posts
    const deleteResult = await client.query(`DELETE FROM pao_collected_posts RETURNING id`);
    console.log(`\nDeleted ${deleteResult.rowCount} posts from pao_collected_posts`);

    // 3. Reset all post counts in configs
    const updateResult = await client.query(`
      UPDATE pao_promotion_config
      SET total_posts_collected = 0
      WHERE total_posts_collected > 0
      RETURNING id, name
    `);
    console.log(`Reset post count to 0 for ${updateResult.rowCount} configs`);

    // 4. Verify
    const afterPosts = await client.query(`SELECT COUNT(*) as count FROM pao_collected_posts`);
    const afterConfigs = await client.query(`
      SELECT COUNT(*) as count
      FROM pao_promotion_config
      WHERE total_posts_collected > 0
    `);

    console.log(`\nVerification:`);
    console.log(`  Posts remaining: ${afterPosts.rows[0].count}`);
    console.log(`  Configs with non-zero counts: ${afterConfigs.rows[0].count}`);

    console.log('\nReset complete! Dashboard should now show 0 posts collected.');

  } catch (error) {
    console.error('Reset failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetPostCounts();
