#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIWorkflowGeneratorService } from '../modules/fluxturn/workflow/services/ai-workflow-generator.service';

async function testEnrichment() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const aiService = app.get(AIWorkflowGeneratorService);

  console.log('Generating workflow...\n');

  const result = await aiService.generateWorkflowFromPrompt(
    'when telegram message received, send message to telegram',
    {
      availableConnectors: ['telegram'],
      userId: 'test',
    }
  );

  if (result.success && result.workflow?.canvas?.nodes) {
    console.log('=== ENRICHED NODE DATA ===\n');

    result.workflow.canvas.nodes.forEach((node: any, idx: number) => {
      console.log(`\nNode ${idx + 1}: ${node.type}`);
      console.log('─'.repeat(60));
      console.log('Full node.data:', JSON.stringify(node.data, null, 2));
    });
  } else {
    console.log('Failed:', result.error);
  }

  await app.close();
}

testEnrichment().catch(console.error);
