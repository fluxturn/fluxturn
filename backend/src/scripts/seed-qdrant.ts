#!/usr/bin/env ts-node
/**
 * Standalone Qdrant Seeding Script
 *
 * Force re-seeds Qdrant vector database with:
 * - Workflow templates from PostgreSQL
 * - Connector documentation
 * - Workflow rules
 *
 * Usage:
 *   npx ts-node src/scripts/seed-qdrant.ts
 *   or
 *   npm run seed:qdrant
 *
 * This is useful when:
 * - You want to force reseed without restarting
 * - Templates were updated in database
 * - Qdrant data is corrupted
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { QdrantSeederService } from '../modules/fluxturn/workflow/services/qdrant-seeder.service';

async function bootstrap() {
  console.log('🚀 Starting Qdrant seeding script...\n');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    // Get the seeder service
    const seederService = app.get(QdrantSeederService);

    console.log('📋 Forcing complete reseed of all Qdrant collections...\n');

    // Force reseed (deletes and recreates all collections)
    await seederService.forceSeed();

    console.log('\n✅ Qdrant seeding completed successfully!');
    console.log('💡 Your backend can now use the updated templates on next restart.\n');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
