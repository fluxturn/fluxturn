#!/usr/bin/env ts-node

/**
 * Test script for the new Multi-Agent Orchestrated Workflow Generation System
 *
 * Usage:
 *   npx ts-node src/scripts/test-orchestrated-workflow.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIWorkflowGeneratorService } from '../modules/fluxturn/workflow/services/ai-workflow-generator.service';

async function test() {
  console.log('🚀 Starting Multi-Agent Workflow Generation Test\n');
  console.log('='.repeat(70));

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const generator = app.get(AIWorkflowGeneratorService);

  // Check if OpenAI is configured
  if (!generator.isAvailable()) {
    console.error('❌ ERROR: OpenAI API key not configured');
    console.error('Please add OPENAI_API_KEY to your .env file');
    await app.close();
    return;
  }

  console.log('✅ OpenAI configured\n');

  const testCases = [
    {
      name: 'Simple Email to Telegram',
      prompt: 'when email received in gmail, send to telegram',
      connectors: ['gmail', 'telegram'],
    },
    {
      name: 'Form Submission Notification',
      prompt: 'when new form submission in jotform, send notification to slack',
      connectors: ['jotform', 'slack'],
    },
    {
      name: 'Conditional Social Media Response',
      prompt: 'when facebook comment is negative, delete it, otherwise reply thanks',
      connectors: ['facebook_graph', 'openai'],
    },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST ${i + 1}/${testCases.length}: ${testCase.name}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📝 Prompt: "${testCase.prompt}"`);
    console.log(`🔌 Connectors: ${testCase.connectors.join(', ')}`);
    console.log('');

    const startTime = Date.now();

    try {
      const result = await generator.generateWorkflowWithAgents(
        testCase.prompt,
        {
          availableConnectors: testCase.connectors,
          userId: 'test_user_123',
          onProgress: (step, data) => {
            const emoji = {
              analyzing: '🔍',
              planning: '📋',
              selecting: '🔌',
              connectors: '✅',
              generating: '⚙️',
              node_created: '📦',
              connecting: '🔗',
              validating: '✔️',
              complete: '🎉',
            }[step] || '⏳';

            console.log(`  ${emoji} ${step}: ${data?.message || JSON.stringify(data || '')}`);
          },
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        console.log(`\n✅ SUCCESS! (${duration}s)`);
        console.log(`  📊 Confidence: ${result.confidence}%`);
        console.log(`  📦 Nodes: ${result.workflow.nodes.length}`);
        console.log(`  🔗 Connections: ${result.workflow.connections.length}`);
        console.log(`  🎯 Method: ${result.analysis.method}`);

        // Show nodes
        console.log(`\n  Nodes Generated:`);
        result.workflow.nodes.forEach((node: any, index: number) => {
          console.log(`    ${index + 1}. ${node.name} (${node.type})`);
          if (node.connector) {
            console.log(`       Connector: ${node.connector}`);
          }
          if (node.actionId) {
            console.log(`       Action: ${node.actionId}`);
          }
          if (node.triggerId) {
            console.log(`       Trigger: ${node.triggerId}`);
          }
        });

        // Show connections
        if (result.workflow.connections.length > 0) {
          console.log(`\n  Connections:`);
          result.workflow.connections.forEach((conn: any, index: number) => {
            console.log(`    ${index + 1}. ${conn.source} → ${conn.target}`);
          });
        }

      } else {
        console.log(`\n❌ FAILED (${duration}s)`);
        console.log(`  Error: ${result.error}`);
      }

    } catch (error) {
      console.error(`\n❌ EXCEPTION:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ All tests complete!');
  console.log(`${'='.repeat(70)}\n`);

  await app.close();
}

// Run the test
test().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
