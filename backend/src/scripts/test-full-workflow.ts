#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIWorkflowGeneratorService } from '../modules/fluxturn/workflow/services/ai-workflow-generator.service';

async function testGeneration() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const aiService = app.get(AIWorkflowGeneratorService);

  console.log('Testing: "when telegram message comes summarize with openai and send to telegram"\n');

  const result = await aiService.generateWorkflowFromPrompt(
    'when telegram message comes summarize with openai and send to telegram',
    {
      availableConnectors: ['telegram', 'openai'],
      userId: 'test-user-123',
    }
  );

  if (result.success && result.workflow) {
    console.log('\n=== FULL WORKFLOW JSON ===\n');
    console.log(JSON.stringify(result.workflow, null, 2));

    console.log('\n\n=== NODE DETAILS ===\n');
    result.workflow.canvas.nodes.forEach((node: any, idx: number) => {
      console.log(`Node ${idx + 1}:`);
      console.log(`  type: "${node.type}"`);
      console.log(`  label: "${node.data?.label}"`);
      console.log(`  connector: "${node.data?.connector || 'N/A'}"`);
      console.log(`  trigger: "${node.data?.trigger || 'N/A'}"`);
      console.log(`  action: "${node.data?.action || 'N/A'}"`);
      console.log('');
    });

    console.log('\n=== IMPORTANT ===');
    console.log('The "label" is just a human-readable name.');
    console.log('The "type" is what matters - it should be CONNECTOR_TRIGGER or CONNECTOR_ACTION');
    console.log('The "connector" + "trigger"/"action" determine which database node to use');
  }

  await app.close();
}

testGeneration().catch(console.error);
