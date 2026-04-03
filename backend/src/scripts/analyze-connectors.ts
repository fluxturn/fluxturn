#!/usr/bin/env ts-node

/**
 * Connector Analysis Script
 *
 * Usage:
 *   npm run analyze-connectors
 *
 * This script:
 * 1. Scans all connector files in src/modules/connectors
 * 2. Uses OpenAI to analyze each connector
 * 3. Extracts: triggers, actions, parameters, examples
 * 4. Generates JSON seed data for Qdrant
 * 5. Saves to: analyzed-connectors.json
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConnectorAnalyzerService } from '../modules/fluxturn/workflow/services/connector-analyzer.service';
import * as path from 'path';

async function bootstrap() {
  console.log('🔍 Starting Connector Analysis...\n');

  // Create NestJS app context
  const app = await NestFactory.createApplicationContext(AppModule);
  const analyzerService = app.get(ConnectorAnalyzerService);

  try {
    // Path to connectors directory
    const connectorsDir = path.join(__dirname, '../modules/connectors');
    console.log(`📂 Scanning: ${connectorsDir}\n`);

    // Analyze all connectors
    console.log('🤖 Analyzing connectors with OpenAI...\n');
    const analyzedConnectors = await analyzerService.analyzeAllConnectors(connectorsDir);

    console.log(`\n✅ Analyzed ${analyzedConnectors.length} connectors\n`);

    // Generate Qdrant seed data
    console.log('📊 Generating Qdrant seed data...\n');
    const seedData = await analyzerService.generateQdrantSeedData(analyzedConnectors);

    console.log(`Generated:`);
    console.log(`  - ${seedData.connectorDocs.length} connector docs`);
    console.log(`  - ${seedData.workflowExamples.length} workflow examples`);
    console.log(`  - ${seedData.rules.length} rules\n`);

    // Save to file
    const outputPath = path.join(__dirname, '../../analyzed-connectors.json');
    await analyzerService.saveAnalysisToFile(
      {
        analyzedConnectors,
        seedData,
        generatedAt: new Date().toISOString(),
        totalConnectors: analyzedConnectors.length,
      },
      outputPath,
    );

    console.log(`\n✅ Analysis complete!`);
    console.log(`📄 Output saved to: ${outputPath}\n`);
    console.log(`Next steps:`);
    console.log(`  1. Review the JSON file`);
    console.log(`  2. Update qdrant-seeder.service.ts to use this data`);
    console.log(`  3. Restart backend to re-seed Qdrant\n`);

    // Print sample
    console.log(`\n📋 Sample Connector Analysis:\n`);
    if (analyzedConnectors.length > 0) {
      console.log(JSON.stringify(analyzedConnectors[0], null, 2));
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
