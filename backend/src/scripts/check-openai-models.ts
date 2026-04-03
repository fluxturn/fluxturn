#!/usr/bin/env ts-node

/**
 * OpenAI Models Checker
 *
 * Usage:
 *   npm run check:openai
 *
 * This script:
 * 1. Lists all available models in your OpenAI account
 * 2. Checks if text-embedding-3-small is available
 * 3. Tests the embedding model
 * 4. Shows alternative models if needed
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkOpenAIModels() {
  console.log('🔍 Checking OpenAI Models...\n');

  // Check if API key exists
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY not found in .env file');
    console.log('\nPlease add your OpenAI API key to backend/.env:');
    console.log('OPENAI_API_KEY=sk-proj-your-key-here\n');
    process.exit(1);
  }

  console.log('✅ API Key found\n');

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey });

  try {
    // List all available models
    console.log('📋 Fetching available models...\n');
    const models = await openai.models.list();

    const allModels = models.data.map(m => m.id).sort();
    console.log(`✅ Found ${allModels.length} models in your account\n`);

    // Check for embedding models
    console.log('🔍 Checking Embedding Models:\n');
    const embeddingModels = allModels.filter(m => m.includes('embedding'));

    if (embeddingModels.length === 0) {
      console.log('⚠️  No embedding models found');
    } else {
      embeddingModels.forEach(model => {
        const isRecommended = model === 'text-embedding-3-small';
        const marker = isRecommended ? '✅ (RECOMMENDED)' : '  ';
        console.log(`${marker} ${model}`);
      });
    }

    // Check for GPT models
    console.log('\n🤖 Checking GPT Models:\n');
    const gptModels = allModels.filter(m =>
      m.includes('gpt-4') || m.includes('gpt-3.5')
    );

    if (gptModels.length === 0) {
      console.log('⚠️  No GPT models found');
    } else {
      gptModels.forEach(model => {
        const isRecommended = ['gpt-4o', 'gpt-4o-mini'].includes(model);
        const marker = isRecommended ? '✅ (RECOMMENDED)' : '  ';
        console.log(`${marker} ${model}`);
      });
    }

    // Specifically check for required models
    console.log('\n🎯 Checking Required Models for AI Workflow Generation:\n');

    const requiredModels = {
      embedding: 'text-embedding-3-small',
      chat: 'gpt-4o-mini',
    };

    // Check embedding model
    const hasEmbeddingModel = allModels.includes(requiredModels.embedding);
    if (hasEmbeddingModel) {
      console.log(`✅ Embedding Model: ${requiredModels.embedding} - AVAILABLE`);
    } else {
      console.log(`❌ Embedding Model: ${requiredModels.embedding} - NOT FOUND`);

      // Suggest alternatives
      const alternatives = embeddingModels.filter(m => m.includes('text-embedding'));
      if (alternatives.length > 0) {
        console.log('   Alternatives available:');
        alternatives.forEach(alt => console.log(`   - ${alt}`));
      }
    }

    // Check chat model
    const hasChatModel = allModels.includes(requiredModels.chat);
    if (hasChatModel) {
      console.log(`✅ Chat Model: ${requiredModels.chat} - AVAILABLE`);
    } else {
      console.log(`❌ Chat Model: ${requiredModels.chat} - NOT FOUND`);

      // Check for alternatives
      const hasGPT4o = allModels.includes('gpt-4o');
      const hasGPT4Turbo = allModels.includes('gpt-4-turbo');
      const hasGPT35 = allModels.includes('gpt-3.5-turbo');

      if (hasGPT4o || hasGPT4Turbo || hasGPT35) {
        console.log('   Alternatives available:');
        if (hasGPT4o) console.log('   - gpt-4o (recommended)');
        if (hasGPT4Turbo) console.log('   - gpt-4-turbo');
        if (hasGPT35) console.log('   - gpt-3.5-turbo');
      }
    }

    // Test embedding model
    console.log('\n🧪 Testing Embedding Model...\n');
    try {
      const testModel = hasEmbeddingModel
        ? requiredModels.embedding
        : embeddingModels[0] || 'text-embedding-ada-002';

      console.log(`Testing with model: ${testModel}`);

      const testResponse = await openai.embeddings.create({
        model: testModel,
        input: 'Test embedding',
      });

      const embedding = testResponse.data[0].embedding;
      console.log(`✅ Embedding test successful!`);
      console.log(`   Dimension: ${embedding.length}`);
      console.log(`   Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...]`);
      console.log(`   Usage: ${testResponse.usage.total_tokens} tokens`);
    } catch (error: any) {
      console.log(`❌ Embedding test failed: ${error.message}`);
    }

    // Test chat model (with JSON mode)
    console.log('\n🧪 Testing Chat Model (JSON mode)...\n');
    try {
      const testChatModel = hasChatModel
        ? requiredModels.chat
        : (allModels.includes('gpt-4o') ? 'gpt-4o' : 'gpt-3.5-turbo');

      console.log(`Testing with model: ${testChatModel}`);

      const testChatResponse = await openai.chat.completions.create({
        model: testChatModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond in JSON format.'
          },
          {
            role: 'user',
            content: 'Return a JSON object with a greeting message'
          }
        ],
        response_format: { type: 'json_object' },
      });

      const response = testChatResponse.choices[0]?.message?.content;
      console.log(`✅ Chat test successful!`);
      console.log(`   Response: ${response}`);
      console.log(`   Tokens: ${testChatResponse.usage?.total_tokens}`);
    } catch (error: any) {
      console.log(`❌ Chat test failed: ${error.message}`);

      if (error.message.includes('response_format')) {
        console.log('\n⚠️  This model does not support JSON mode.');
        console.log('   Recommended: Use gpt-4o, gpt-4o-mini, or gpt-4-turbo');
      }
    }

    // Summary and recommendations
    console.log('\n📊 Summary:\n');

    if (hasEmbeddingModel && hasChatModel) {
      console.log('✅ All required models are available!');
      console.log('   Your setup is ready to use AI workflow generation.\n');
    } else {
      console.log('⚠️  Some required models are not available.\n');
      console.log('Recommendations:');

      if (!hasEmbeddingModel) {
        console.log('\n1. Update .env with available embedding model:');
        if (embeddingModels.length > 0) {
          console.log(`   OPENAI_EMBEDDING_MODEL=${embeddingModels[0]}`);
        } else {
          console.log('   No embedding models found - please check your OpenAI account tier');
        }
      }

      if (!hasChatModel) {
        console.log('\n2. Update .env with available chat model:');
        if (allModels.includes('gpt-4o')) {
          console.log('   OPENAI_MODEL=gpt-4o');
        } else if (allModels.includes('gpt-4-turbo')) {
          console.log('   OPENAI_MODEL=gpt-4-turbo');
        } else if (allModels.includes('gpt-3.5-turbo')) {
          console.log('   OPENAI_MODEL=gpt-3.5-turbo');
        }
      }
    }

    // Show all available models
    console.log('\n📋 All Available Models:\n');
    console.log('(First 20 models shown)');
    allModels.slice(0, 20).forEach(model => {
      console.log(`  - ${model}`);
    });

    if (allModels.length > 20) {
      console.log(`  ... and ${allModels.length - 20} more\n`);
    }

    console.log('\n✅ Check complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error checking models:', error.message);

    if (error.status === 401) {
      console.log('\n⚠️  Invalid API key. Please check your OPENAI_API_KEY in .env');
    } else if (error.status === 429) {
      console.log('\n⚠️  Rate limit exceeded. Please try again in a moment.');
    }

    process.exit(1);
  }
}

checkOpenAIModels();
