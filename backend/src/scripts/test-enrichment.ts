#!/usr/bin/env ts-node
/**
 * Test node enrichment to see what data is actually being added
 */
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
      console.log('data.label:', node.data?.label);
      console.log('data.connector:', node.data?.connector);
      console.log('data.connectorType:', node.data?.connectorType);
      console.log('data.trigger:', node.data?.trigger);
      console.log('data.triggerId:', node.data?.triggerId);
      console.log('data.action:', node.data?.action);
      console.log('data.actionId:', node.data?.actionId);
      console.log('data.connectorDisplayName:', node.data?.connectorDisplayName);
      console.log('data.triggerName:', node.data?.triggerName);
      console.log('data.actionName:', node.data?.actionName);
      console.log('\nHas inputSchema?', !!node.data?.inputSchema);
      console.log('Has configSchema?', !!node.data?.configSchema);
      console.log('Has outputSchema?', !!node.data?.outputSchema);

      if (node.data?.inputSchema) {
        console.log('\ninputSchema fields:', Object.keys(node.data.inputSchema));
      }

      if (node.data?.configSchema) {
        console.log('configSchema:', JSON.stringify(node.data.configSchema, null, 2));
      }
    });
  } else {
    console.log('Failed:', result.error);
  }

  await app.close();
}

testEnrichment().catch(console.error);
