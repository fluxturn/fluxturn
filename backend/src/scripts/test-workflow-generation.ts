#!/usr/bin/env ts-node
/**
 * Test AI workflow generation and see what it actually produces
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIWorkflowGeneratorService } from '../modules/fluxturn/workflow/services/ai-workflow-generator.service';

async function testGeneration() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const aiService = app.get(AIWorkflowGeneratorService);

  console.log('🤖 Testing AI Workflow Generation\n');
  console.log('═══════════════════════════════════════════════════\n');

  const testPrompt = 'when telegram message received, send to slack';
  console.log(`Prompt: "${testPrompt}"\n`);
  console.log('Generating workflow...\n');

  try {
    const result = await aiService.generateWorkflowFromPrompt(testPrompt, {
      availableConnectors: ['telegram', 'slack', 'gmail', 'openai'],
      userId: 'test-user',
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESULT:\n');
    console.log(`Success: ${result.success}`);
    console.log(`Confidence: ${result.confidence}%`);

    if (result.workflow?.canvas?.nodes) {
      console.log(`\nGenerated ${result.workflow.canvas.nodes.length} nodes:`);
      result.workflow.canvas.nodes.forEach((node: any, idx: number) => {
        console.log(`\nNode ${idx + 1}:`);
        console.log(`  ID: ${node.id}`);
        console.log(`  Type: ${node.type}`);
        console.log(`  Label: ${node.data?.label}`);

        if (node.type === 'CONNECTOR_TRIGGER' || node.type === 'CONNECTOR_ACTION') {
          console.log(`  Connector: ${node.data?.connector || node.data?.connectorType || 'MISSING'}`);
          if (node.type === 'CONNECTOR_TRIGGER') {
            console.log(`  Trigger: ${node.data?.trigger || node.data?.triggerId || 'MISSING'}`);
          } else {
            console.log(`  Action: ${node.data?.action || node.data?.actionId || 'MISSING'}`);
          }
        }
      });
    }

    if (result.analysis?.validation) {
      console.log('\n\n📋 VALIDATION:');
      console.log(JSON.stringify(result.analysis.validation, null, 2));
    }

    if (!result.success) {
      console.log('\n\n❌ ERRORS:');
      console.log(result.error);
    }

    // Check debug files
    console.log('\n\n💾 DEBUG FILES:');
    const fs = require('fs');
    const path = require('path');
    const debugDir = path.join(process.cwd(), 'debug');

    if (fs.existsSync(debugDir)) {
      const files = fs.readdirSync(debugDir)
        .filter((f: string) => f.startsWith('ai-prompt-'))
        .sort()
        .reverse();

      if (files.length > 0) {
        const latestFile = path.join(debugDir, files[0]);
        console.log(`Latest prompt saved to: ${latestFile}`);
        console.log(`\nTo inspect: cat ${latestFile} | grep -A 30 "CONNECTOR"`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

testGeneration().catch(console.error);
