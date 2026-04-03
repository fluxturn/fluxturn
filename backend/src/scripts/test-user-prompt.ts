import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AIWorkflowGeneratorService } from '../modules/fluxturn/workflow/services/ai-workflow-generator.service';

async function bootstrap() {
  console.log('🚀 Testing User-Specific Prompt\n');
  console.log('======================================================================');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const aiWorkflowGenerator = app.get(AIWorkflowGeneratorService);

  // User's exact prompt
  const prompt = "when someone message in gmail check it is related to job or not, if it is related to job send me to telegram and keep it in google sheet";

  console.log(`\n📝 User Prompt: "${prompt}"\n`);
  console.log('Expected nodes:');
  console.log('  1. Gmail trigger (email received)');
  console.log('  2. OpenAI action (check if job-related)');
  console.log('  3. IF condition (check result)');
  console.log('  4. Telegram action (send message)');
  console.log('  5. Google Sheets action (add row)\n');
  console.log('======================================================================\n');

  try {
    const result = await aiWorkflowGenerator.generateWorkflowWithAgents(prompt, {
      availableConnectors: [
        'gmail',
        'telegram',
        'google_sheets',
        'openai',
        'slack',
        'discord',
        'http_request',
      ],
    });

    if (result.success) {
      console.log('\n✅ Workflow Generated Successfully!\n');
      console.log(`📊 Confidence: ${result.confidence}%`);
      console.log(`📦 Nodes: ${result.workflow.nodes.length}`);
      console.log(`🔗 Connections: ${result.workflow.connections.length}\n`);

      console.log('Nodes Generated:');
      result.workflow.nodes.forEach((node: any, index: number) => {
        console.log(`  ${index + 1}. ${node.name} (${node.type})`);
        console.log(`     ID: ${node.id}`);
        console.log(`     Connector: ${node.connector || 'built-in'}`);
        if (node.actionId) console.log(`     Action: ${node.actionId}`);
        if (node.triggerId) console.log(`     Trigger: ${node.triggerId}`);
        console.log('');
      });

      console.log('\nConnections:');
      result.workflow.connections.forEach((conn: any, index: number) => {
        console.log(`  ${index + 1}. ${conn.source} → ${conn.target}`);
      });

      console.log('\n======================================================================');
      console.log('Analysis:');
      if (result.analysis) {
        console.log(`  Intent: ${result.analysis.intent?.intent || 'N/A'}`);
        console.log(`  Connectors: ${result.analysis.connectors?.selectedConnectors?.map((c: any) => c.name).join(', ') || 'N/A'}`);
      }
      console.log('======================================================================\n');

    } else {
      console.error('❌ Generation failed:', result.error);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
