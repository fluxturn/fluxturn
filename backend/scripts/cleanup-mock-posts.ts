/**
 * Cleanup script to remove mock/duplicate posts from PAO database
 * Run with: npx ts-node scripts/cleanup-mock-posts.ts
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

async function cleanupMockPosts() {
  const client = await pool.connect();

  try {
    console.log('Starting mock posts cleanup...\n');

    // 1. Delete posts with mock external_post_id
    const mockIdResult = await client.query(`
      DELETE FROM pao_collected_posts
      WHERE external_post_id LIKE 'mock_%'
      RETURNING id
    `);
    console.log(`Deleted ${mockIdResult.rowCount} posts with mock external_post_id`);

    // 2. Find and delete duplicate content posts (keep one of each)
    const duplicates = await client.query(`
      WITH duplicates AS (
        SELECT id, content, competitor_id,
          ROW_NUMBER() OVER (PARTITION BY content ORDER BY created_at DESC) as rn
        FROM pao_collected_posts
        WHERE content IS NOT NULL
      )
      DELETE FROM pao_collected_posts
      WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
      )
      RETURNING id
    `);
    console.log(`Deleted ${duplicates.rowCount} duplicate content posts`);

    // 3. Show remaining posts count
    const remaining = await client.query(`
      SELECT
        platform,
        COUNT(*) as count,
        COUNT(DISTINCT competitor_id) as competitors
      FROM pao_collected_posts
      GROUP BY platform
      ORDER BY count DESC
    `);

    console.log('\nRemaining posts by platform:');
    remaining.rows.forEach(row => {
      console.log(`  ${row.platform}: ${row.count} posts from ${row.competitors} competitors`);
    });

    // 4. Show any remaining duplicates
    const stillDuplicates = await client.query(`
      SELECT content, COUNT(*) as count
      FROM pao_collected_posts
      WHERE content IS NOT NULL
      GROUP BY content
      HAVING COUNT(*) > 1
      LIMIT 5
    `);

    if (stillDuplicates.rowCount > 0) {
      console.log('\nWarning: Some duplicates still exist:');
      stillDuplicates.rows.forEach(row => {
        console.log(`  "${row.content.substring(0, 50)}..." (${row.count} copies)`);
      });
    } else {
      console.log('\nNo duplicate content remaining.');
    }

    console.log('\nCleanup complete!');

  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupMockPosts();
