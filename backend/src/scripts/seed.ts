#!/usr/bin/env ts-node
/**
 * Database Seeding Script
 *
 * This script runs all seeder services manually.
 * Seeders are located in src/modules/fluxturn/workflow/services/
 *
 * Usage:
 *   npm run seed
 */

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

// Import required modules and services
import { DatabaseModule } from '../modules/database/database.module';
import { QdrantModule } from '../modules/qdrant/qdrant.module';
import { ConnectorsModule } from '../modules/fluxturn/connectors/connectors.module';

// Import seeder services from their original location
// NOTE: ConnectorSeederService and DynamicConnectorSeederService removed - connectors now read from TypeScript constants
import { TemplateSeederService } from '../modules/fluxturn/workflow/services/template-seeder.service';
import { NodeTypesSeederService } from '../modules/fluxturn/workflow/services/node-types-seeder.service';
import { WorkflowRulesSeederService } from '../modules/fluxturn/workflow/services/workflow-rules-seeder.service';
import { AvailableNodesSeederService } from '../modules/fluxturn/workflow/services/available-nodes-seeder.service';
import { OpenAIChatbotSeederService } from '../modules/fluxturn/workflow/services/openai-chatbot-seeder.service';
import { QdrantSeederService } from '../modules/fluxturn/workflow/services/qdrant-seeder.service';
import { RedisSeederService } from '../modules/fluxturn/workflow/services/redis-seeder.service';

// Determine which env file to use
const getEnvFilePath = (): string => {
  const envLocal = path.resolve(__dirname, '../../.env.local');
  const envDev = path.resolve(__dirname, '../../.env.development');
  const envFile = path.resolve(__dirname, '../../.env');

  if (fs.existsSync(envLocal)) return envLocal;
  if (fs.existsSync(envDev)) return envDev;
  if (fs.existsSync(envFile)) return envFile;

  return null;
};

// Create a minimal seeding module
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePath(),
      isGlobal: true,
    }),
    DatabaseModule,
    QdrantModule,
    ConnectorsModule,
  ],
  providers: [
    TemplateSeederService,
    NodeTypesSeederService,
    WorkflowRulesSeederService,
    AvailableNodesSeederService,
    OpenAIChatbotSeederService,
    QdrantSeederService,
    RedisSeederService,
  ],
})
class SeedModule {}

async function bootstrap() {
  console.log('🌱 Starting Fluxturn database seeding...');
  console.log('='.repeat(50));

  const envPath = getEnvFilePath();
  if (envPath) {
    console.log(`📄 Using environment file: ${envPath}`);
  } else {
    console.warn('⚠️  No environment file found');
  }

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(SeedModule, {
      logger: ['log', 'error', 'warn'],
    });

    console.log('✅ NestJS application context created');
    console.log('='.repeat(50));

    // Note: All seeder services implement OnModuleInit, which NestJS automatically
    // calls when creating the application context above. No need to manually call
    // onModuleInit() again - that would cause double seeding.
    //
    // The seeding has already completed at this point via NestJS lifecycle hooks.

    console.log('\n' + '='.repeat(50));
    console.log('✅ All seeds completed successfully!');
    console.log('='.repeat(50));

    // Close the app
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Seeding failed:', error);
    console.error('='.repeat(50));
    process.exit(1);
  }
}

bootstrap();
