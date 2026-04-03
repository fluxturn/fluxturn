import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { ConnectorType, ConnectorCategory } from '../types';
import { OpenAIConnector } from './openai';
import { AnthropicConnector } from './anthropic';
import { GoogleAIConnector } from './google-ai';
import { AWSBedrockConnector } from './aws-bedrock';

/**
 * Example service demonstrating how to use AI connectors
 * This is for demonstration purposes only
 */
@Injectable()
export class AIConnectorExampleService {
  private readonly logger = new Logger(AIConnectorExampleService.name);

  constructor(
    private readonly openaiConnector: OpenAIConnector,
    private readonly anthropicConnector: AnthropicConnector,
    private readonly googleAIConnector: GoogleAIConnector,
    private readonly awsBedrockConnector: AWSBedrockConnector,
  ) {}

  /**
   * Example: Initialize and test OpenAI connector
   */
  async testOpenAIConnector(): Promise<void> {
    try {
      // Initialize the connector
      await this.openaiConnector.initialize({
        id: 'openai-test',
        name: 'OpenAI Test',
        type: ConnectorType.OPENAI,
        category: ConnectorCategory.AI,
        credentials: {
          apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
        }
      });

      // Test connection
      const connectionTest = await this.openaiConnector.testConnection();
      this.logger.log('OpenAI Connection Test:', connectionTest.success);

      if (connectionTest.success) {
        // Generate text
        const textResponse = await this.openaiConnector.generateText(
          'Explain quantum computing in simple terms',
          {
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 150
          }
        );

        this.logger.log('Text Generation:', textResponse.data);
        this.logger.log('Usage:', textResponse.usage);

        // Generate code
        const codeResponse = await this.openaiConnector.generateCode(
          'Create a function that calculates the fibonacci sequence',
          'javascript',
          { model: 'gpt-3.5-turbo', maxTokens: 200 }
        );

        this.logger.log('Code Generation:', codeResponse.data);

        // Create embeddings
        const embeddingResponse = await this.openaiConnector.createEmbedding({
          input: 'This is a test sentence for embeddings',
          model: 'text-embedding-3-small'
        });

        this.logger.log('Embeddings created:', embeddingResponse.data?.embeddings?.length || 0);
      }
    } catch (error) {
      this.logger.error('OpenAI Connector test failed:', error);
    }
  }

  /**
   * Example: Initialize and test Anthropic connector
   */
  async testAnthropicConnector(): Promise<void> {
    try {
      // Initialize the connector
      await this.anthropicConnector.initialize({
        id: 'anthropic-test',
        name: 'Anthropic Test',
        type: ConnectorType.ANTHROPIC,
        category: ConnectorCategory.AI,
        credentials: {
          apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here'
        }
      });

      // Test connection (will show SDK requirement error)
      const connectionTest = await this.anthropicConnector.testConnection();
      this.logger.log('Anthropic Connection Test:', connectionTest.success);

      if (connectionTest.success) {
        // Analyze document
        const analysisResponse = await this.anthropicConnector.analyzeDocument({
          content: 'This is a sample document about artificial intelligence and machine learning.',
          type: 'text',
          task: 'summarize',
          instructions: 'Focus on key technical concepts'
        });

        this.logger.log('Document Analysis:', analysisResponse.data?.result);

        // Generate code with reasoning
        const codeResponse = await this.anthropicConnector.generateCode(
          'Create a secure password validator function',
          'python',
          { 
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.3,
            maxTokens: 300
          }
        );

        this.logger.log('Code with Reasoning:', codeResponse.data);
      }
    } catch (error) {
      this.logger.error('Anthropic Connector test failed:', error);
    }
  }

  /**
   * Example: Initialize and test Google AI connector
   */
  async testGoogleAIConnector(): Promise<void> {
    try {
      // Initialize the connector
      await this.googleAIConnector.initialize({
        id: 'google-ai-test',
        name: 'Google AI Test',
        type: ConnectorType.GOOGLE_AI,
        category: ConnectorCategory.AI,
        credentials: {
          apiKey: process.env.GOOGLE_AI_API_KEY || 'your-api-key-here'
        }
      });

      // Test connection (will show SDK requirement error)
      const connectionTest = await this.googleAIConnector.testConnection();
      this.logger.log('Google AI Connection Test:', connectionTest.success);

      if (connectionTest.success) {
        // Analyze sentiment
        const sentimentResponse = await this.googleAIConnector.analyzeSentiment(
          'I absolutely love this new AI technology! It\'s amazing what we can accomplish.',
          { model: 'gemini-1.5-flash' }
        );

        this.logger.log('Sentiment Analysis:', sentimentResponse.data);

        // Extract entities
        const entitiesResponse = await this.googleAIConnector.extractEntities(
          'John Smith works at Google in Mountain View, California. He started on January 15, 2023.',
          { model: 'gemini-1.5-flash' }
        );

        this.logger.log('Entities Extracted:', entitiesResponse.data);

        // Multi-modal chat (text + potential image analysis)
        const chatResponse = await this.googleAIConnector.chat([
          { role: 'user', content: 'What are the key benefits of multimodal AI systems?' }
        ], { model: 'gemini-1.5-pro', maxTokens: 200 });

        this.logger.log('Multimodal Chat:', chatResponse.data);
      }
    } catch (error) {
      this.logger.error('Google AI Connector test failed:', error);
    }
  }

  /**
   * Example: Initialize and test AWS Bedrock connector
   */
  async testAWSBedrockConnector(): Promise<void> {
    try {
      // Initialize the connector
      await this.awsBedrockConnector.initialize({
        id: 'aws-bedrock-test',
        name: 'AWS Bedrock Test',
        type: ConnectorType.AWS_BEDROCK,
        category: ConnectorCategory.AI,
        credentials: {
          // AWS credentials should be set via environment variables
          // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
        },
        settings: {
          region: process.env.AWS_REGION || 'us-east-1'
        }
      });

      // Test connection (will show SDK requirement error)
      const connectionTest = await this.awsBedrockConnector.testConnection();
      this.logger.log('AWS Bedrock Connection Test:', connectionTest.success);

      if (connectionTest.success) {
        // Generate text with Claude on Bedrock
        const claudeResponse = await this.awsBedrockConnector.generateText(
          'Write a technical explanation of how neural networks work',
          {
            model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            temperature: 0.7,
            maxTokens: 250
          }
        );

        this.logger.log('Claude on Bedrock:', claudeResponse.data);

        // Generate text with Llama
        const llamaResponse = await this.awsBedrockConnector.generateText(
          'Explain the concept of reinforcement learning',
          {
            model: 'meta.llama3-2-90b-instruct-v1:0',
            temperature: 0.6,
            maxTokens: 200
          }
        );

        this.logger.log('Llama on Bedrock:', llamaResponse.data);

        // Create embeddings with Titan
        const embeddingResponse = await this.awsBedrockConnector.createEmbedding({
          input: 'AWS Bedrock provides access to foundation models from multiple providers',
          model: 'amazon.titan-embed-text-v2:0'
        });

        this.logger.log('Titan Embeddings:', embeddingResponse.data?.embeddings?.length || 0);

        // Generate image with Stable Diffusion
        const imageResponse = await this.awsBedrockConnector.generateImage({
          prompt: 'A futuristic AI data center with glowing servers',
          model: 'stability.stable-diffusion-xl-v1',
          n: 1
        });

        this.logger.log('Stable Diffusion Images:', imageResponse.data?.images?.length || 0);
      }
    } catch (error) {
      this.logger.error('AWS Bedrock Connector test failed:', error);
    }
  }

  /**
   * Example: Demonstrate streaming responses
   */
  async testStreamingResponses(): Promise<void> {
    try {
      await this.openaiConnector.initialize({
        id: 'openai-stream-test',
        name: 'OpenAI Stream Test',
        type: ConnectorType.OPENAI,
        category: ConnectorCategory.AI,
        credentials: {
          apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
        }
      });

      this.logger.log('Starting streaming response...');
      
      // Stream text generation
      const stream = this.openaiConnector.streamText(
        'Write a short story about a robot learning to paint',
        { model: 'gpt-3.5-turbo', maxTokens: 200 }
      );

      if (stream) {
        for await (const chunk of stream) {
          if (chunk.chunk) {
            process.stdout.write(chunk.chunk); // Write directly to stdout for real-time effect
          }
          
          if (chunk.done) {
            this.logger.log('\nStreaming completed. Usage:', chunk.usage);
            break;
          }
        }
      }
    } catch (error) {
      this.logger.error('Streaming test failed:', error);
    }
  }

  /**
   * Example: Compare responses from different providers
   */
  async compareProviders(): Promise<void> {
    const prompt = 'Explain the difference between machine learning and deep learning in 100 words';
    
    const providers = [
      { name: 'OpenAI', connector: this.openaiConnector, model: 'gpt-3.5-turbo' },
      { name: 'Anthropic', connector: this.anthropicConnector, model: 'claude-3-5-sonnet-20241022' },
      { name: 'Google AI', connector: this.googleAIConnector, model: 'gemini-1.5-flash' },
      { name: 'AWS Bedrock', connector: this.awsBedrockConnector, model: 'anthropic.claude-3-haiku-20240307-v1:0' }
    ];

    for (const provider of providers) {
      try {
        this.logger.log(`\n--- ${provider.name} Response ---`);
        
        const response = await provider.connector.generateText(prompt, {
          model: provider.model,
          maxTokens: 150,
          temperature: 0.7
        });

        if (response.success) {
          this.logger.log('Response:', response.data);
          this.logger.log('Usage:', response.usage);
        } else {
          this.logger.error('Error:', response.error?.message);
        }
      } catch (error) {
        this.logger.error(`${provider.name} failed:`, error.message);
      }
    }
  }

  /**
   * Example: Get model information and capabilities
   */
  async getModelCapabilities(): Promise<void> {
    const connectors = [
      { name: 'OpenAI', connector: this.openaiConnector },
      { name: 'Anthropic', connector: this.anthropicConnector },
      { name: 'Google AI', connector: this.googleAIConnector },
      { name: 'AWS Bedrock', connector: this.awsBedrockConnector }
    ];

    for (const { name, connector } of connectors) {
      try {
        this.logger.log(`\n--- ${name} Models ---`);
        
        const models = await connector.getAvailableModels();
        this.logger.log('Available models:', models.slice(0, 5)); // Show first 5
        
        if (models.length > 0) {
          const contextWindow = await connector.getContextWindow(models[0]);
          this.logger.log(`Context window for ${models[0]}:`, contextWindow);
          
          const tokenCount = await connector.getTokenCount('This is a test sentence', models[0]);
          this.logger.log('Token count for test sentence:', tokenCount);
        }
      } catch (error) {
        this.logger.error(`${name} capabilities check failed:`, error.message);
      }
    }
  }

  /**
   * Run all examples
   */
  async runAllExamples(): Promise<void> {
    this.logger.log('Starting AI Connector Examples...\n');

    await this.testOpenAIConnector();
    await this.testAnthropicConnector();
    await this.testGoogleAIConnector();
    await this.testAWSBedrockConnector();
    await this.testStreamingResponses();
    await this.compareProviders();
    await this.getModelCapabilities();

    this.logger.log('\nAI Connector Examples completed!');
  }
}