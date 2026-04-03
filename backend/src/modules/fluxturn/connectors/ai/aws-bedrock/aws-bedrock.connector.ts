import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorConfig,
  ConnectorMetadata,
  ConnectorAction,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorRequest,
  ConnectorResponse
} from '../../types';
import {
  IAIConnector,
  AIModelConfig,
  AIResponse,
  ChatMessage,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  StreamResponse,
  ContextWindow,
  AIUsageInfo,
  AIError,
  AIErrorCode
} from '../ai.interface';

// AWS SDK interfaces (these would be imported from AWS SDK)
interface BedrockRuntimeClient {
  invokeModel: (params: any) => Promise<{ body: Uint8Array }>;
  invokeModelWithResponseStream: (params: any) => Promise<{ body: AsyncIterable<any> }>;
}

interface BedrockClient {
  listFoundationModels: (params?: any) => Promise<{ modelSummaries: Array<{ modelId: string; modelName: string }> }>;
}

// Mock AWS clients since aws-sdk might not be fully configured
class MockBedrockRuntimeClient implements BedrockRuntimeClient {
  async invokeModel(params: any): Promise<{ body: Uint8Array }> {
    throw new Error('AWS SDK (aws-sdk v3) is required but not properly configured. Please install and configure AWS credentials to use this connector.');
  }

  async invokeModelWithResponseStream(params: any): Promise<{ body: AsyncIterable<any> }> {
    throw new Error('AWS SDK (aws-sdk v3) is required but not properly configured. Please install and configure AWS credentials to use this connector.');
  }
}

class MockBedrockClient implements BedrockClient {
  async listFoundationModels(params?: any): Promise<{ modelSummaries: Array<{ modelId: string; modelName: string }> }> {
    throw new Error('AWS SDK (aws-sdk v3) is required but not properly configured. Please install and configure AWS credentials to use this connector.');
  }
}

interface ModelResponse {
  outputs?: Array<{ text: string }>;
  completion?: string;
  content?: Array<{ text: string }>;
  generation?: string;
  inputTextTokenCount?: number;
  results?: Array<{ outputText: string; tokenCount?: { inputTokens: number; outputTokens: number } }>;
  amazon_bedrock_invokeModel?: {
    inputTokens: number;
    outputTokens: number;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable()
export class AWSBedrockConnector extends BaseConnector implements IAIConnector {
  protected readonly logger = new Logger(AWSBedrockConnector.name);
  private bedrockRuntime: MockBedrockRuntimeClient;
  private bedrock: MockBedrockClient;

  private readonly modelCapabilities = {
    // Anthropic Claude models on Bedrock
    'anthropic.claude-3-5-sonnet-20241022-v2:0': { contextWindow: 200000, maxTokens: 8192, supportsVision: true, supportsFunctions: true, provider: 'anthropic' },
    'anthropic.claude-3-5-sonnet-20240620-v1:0': { contextWindow: 200000, maxTokens: 8192, supportsVision: true, supportsFunctions: true, provider: 'anthropic' },
    'anthropic.claude-3-opus-20240229-v1:0': { contextWindow: 200000, maxTokens: 4096, supportsVision: true, supportsFunctions: true, provider: 'anthropic' },
    'anthropic.claude-3-sonnet-20240229-v1:0': { contextWindow: 200000, maxTokens: 4096, supportsVision: true, supportsFunctions: true, provider: 'anthropic' },
    'anthropic.claude-3-haiku-20240307-v1:0': { contextWindow: 200000, maxTokens: 4096, supportsVision: true, supportsFunctions: true, provider: 'anthropic' },
    'anthropic.claude-v2:1': { contextWindow: 200000, maxTokens: 4096, supportsVision: false, supportsFunctions: false, provider: 'anthropic' },
    'anthropic.claude-v2': { contextWindow: 100000, maxTokens: 4096, supportsVision: false, supportsFunctions: false, provider: 'anthropic' },
    'anthropic.claude-instant-v1': { contextWindow: 100000, maxTokens: 4096, supportsVision: false, supportsFunctions: false, provider: 'anthropic' },
    
    // Amazon Titan models
    'amazon.titan-text-premier-v1:0': { contextWindow: 32000, maxTokens: 3000, supportsVision: false, supportsFunctions: false, provider: 'amazon' },
    'amazon.titan-text-express-v1': { contextWindow: 8000, maxTokens: 8000, supportsVision: false, supportsFunctions: false, provider: 'amazon' },
    'amazon.titan-text-lite-v1': { contextWindow: 4000, maxTokens: 4000, supportsVision: false, supportsFunctions: false, provider: 'amazon' },
    'amazon.titan-embed-text-v1': { contextWindow: 8000, maxTokens: 8000, supportsVision: false, supportsFunctions: false, provider: 'amazon' },
    'amazon.titan-embed-text-v2:0': { contextWindow: 8000, maxTokens: 8000, supportsVision: false, supportsFunctions: false, provider: 'amazon' },
    'amazon.titan-image-generator-v1': { contextWindow: 512, maxTokens: 512, supportsVision: false, supportsFunctions: false, provider: 'amazon' },
    
    // Meta Llama models
    'meta.llama3-2-90b-instruct-v1:0': { contextWindow: 128000, maxTokens: 4096, supportsVision: false, supportsFunctions: true, provider: 'meta' },
    'meta.llama3-2-11b-instruct-v1:0': { contextWindow: 128000, maxTokens: 4096, supportsVision: false, supportsFunctions: true, provider: 'meta' },
    'meta.llama3-2-3b-instruct-v1:0': { contextWindow: 128000, maxTokens: 4096, supportsVision: false, supportsFunctions: true, provider: 'meta' },
    'meta.llama3-2-1b-instruct-v1:0': { contextWindow: 128000, maxTokens: 2048, supportsVision: false, supportsFunctions: true, provider: 'meta' },
    'meta.llama3-1-70b-instruct-v1:0': { contextWindow: 128000, maxTokens: 4096, supportsVision: false, supportsFunctions: true, provider: 'meta' },
    'meta.llama3-1-8b-instruct-v1:0': { contextWindow: 128000, maxTokens: 4096, supportsVision: false, supportsFunctions: true, provider: 'meta' },
    
    // Mistral AI models
    'mistral.mistral-large-2407-v1:0': { contextWindow: 128000, maxTokens: 8192, supportsVision: false, supportsFunctions: true, provider: 'mistral' },
    'mistral.mistral-small-2402-v1:0': { contextWindow: 32000, maxTokens: 8192, supportsVision: false, supportsFunctions: true, provider: 'mistral' },
    'mistral.mixtral-8x7b-instruct-v0:1': { contextWindow: 32000, maxTokens: 4096, supportsVision: false, supportsFunctions: true, provider: 'mistral' },
    
    // Cohere models
    'cohere.command-r-plus-v1:0': { contextWindow: 128000, maxTokens: 4000, supportsVision: false, supportsFunctions: true, provider: 'cohere' },
    'cohere.command-r-v1:0': { contextWindow: 128000, maxTokens: 4000, supportsVision: false, supportsFunctions: true, provider: 'cohere' },
    'cohere.command-text-v14': { contextWindow: 4096, maxTokens: 4000, supportsVision: false, supportsFunctions: false, provider: 'cohere' },
    'cohere.embed-english-v3': { contextWindow: 512, maxTokens: 512, supportsVision: false, supportsFunctions: false, provider: 'cohere' },
    'cohere.embed-multilingual-v3': { contextWindow: 512, maxTokens: 512, supportsVision: false, supportsFunctions: false, provider: 'cohere' },
    
    // Stability AI models
    'stability.stable-diffusion-xl-v1': { contextWindow: 512, maxTokens: 512, supportsVision: false, supportsFunctions: false, provider: 'stability' }
  };

  getMetadata(): ConnectorMetadata {
    const actions: ConnectorAction[] = [
      {
        id: 'invokeModel',
        name: 'Invoke Model',
        description: 'Invoke any Bedrock foundation model',
        inputSchema: {
          modelId: { type: 'string', required: true },
          body: { type: 'object', required: true },
          contentType: { type: 'string', required: false },
          accept: { type: 'string', required: false }
        },
        outputSchema: {
          response: { type: 'object', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'generateText',
        name: 'Generate Text',
        description: 'Generate text using Bedrock models',
        inputSchema: {
          prompt: { type: 'string', required: true },
          model: { type: 'string', required: false },
          temperature: { type: 'number', required: false },
          maxTokens: { type: 'number', required: false }
        },
        outputSchema: {
          text: { type: 'string', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'generateImage',
        name: 'Generate Image',
        description: 'Generate images using Stable Diffusion on Bedrock',
        inputSchema: {
          prompt: { type: 'string', required: true },
          model: { type: 'string', required: false },
          width: { type: 'number', required: false },
          height: { type: 'number', required: false }
        },
        outputSchema: {
          images: { type: 'array', required: true }
        }
      },
      {
        id: 'createEmbedding',
        name: 'Create Embedding',
        description: 'Create embeddings using Titan or Cohere models',
        inputSchema: {
          input: { type: 'string', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          embeddings: { type: 'array', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'streamResponse',
        name: 'Stream Response',
        description: 'Stream responses from Bedrock models',
        inputSchema: {
          modelId: { type: 'string', required: true },
          body: { type: 'object', required: true }
        },
        outputSchema: {
          stream: { type: 'object', required: true }
        }
      }
    ];

    return {
      name: 'AWS Bedrock',
      description: 'AWS Bedrock foundation models including Claude, Llama, Titan, and Stable Diffusion',
      version: '1.0.0',
      category: ConnectorCategory.AI,
      type: ConnectorType.AWS_BEDROCK,
      logoUrl: 'https://aws.amazon.com/favicon.ico',
      documentationUrl: 'https://docs.aws.amazon.com/bedrock/',
      authType: AuthType.CUSTOM, // AWS uses IAM credentials
      actions,
      triggers: [],
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 2000
      }
    };
  }

  protected async initializeConnection(): Promise<void> {
    // AWS credentials should be configured via environment variables or IAM roles
    // In a real implementation, you would use:
    // import { BedrockRuntimeClient, BedrockClient } from '@aws-sdk/client-bedrock-runtime';
    // this.bedrockRuntime = new BedrockRuntimeClient({ region: this.config.settings?.region || 'us-east-1' });
    // this.bedrock = new BedrockClient({ region: this.config.settings?.region || 'us-east-1' });
    
    this.bedrockRuntime = new MockBedrockRuntimeClient();
    this.bedrock = new MockBedrockClient();
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const models = await this.bedrock.listFoundationModels();
      return models.modelSummaries.length > 0;
    } catch (error) {
      this.logger.error('AWS Bedrock connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const models = await this.bedrock.listFoundationModels();
    if (models.modelSummaries.length === 0) {
      throw new Error('No foundation models available');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Use specific AI methods instead of generic performRequest');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Definition action IDs (snake_case)
      case 'invoke_model':
        return await this.invokeModelAction(input);
      case 'analyze_image':
        return await this.analyzeImageAction(input);
      case 'create_embeddings':
        return await this.createEmbeddingsAction(input);
      case 'generate_image':
        return await this.generateImageAction(input);
      // Legacy action IDs (camelCase) for backward compatibility
      case 'invokeModel':
        return await this.invokeModel(input.modelId, input.body, input.contentType, input.accept);
      case 'generateText':
        const textResult = await this.generateText(input.prompt, input);
        return textResult.data;
      case 'generateImage':
        const imageResult = await this.generateImage(input);
        return imageResult.data;
      case 'createEmbedding':
        const embeddingResult = await this.createEmbedding(input);
        return embeddingResult.data;
      case 'streamResponse':
        return await this.streamResponse(input.modelId, input.body);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // AWS clients don't require explicit cleanup
  }

  // ============= Definition Action Handlers =============
  // These match the action IDs in aws-bedrock.definition.ts

  /**
   * invoke_model action - Send a prompt to an AWS Bedrock foundation model
   */
  private async invokeModelAction(input: any): Promise<any> {
    const model = input.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0';
    const capabilities = this.modelCapabilities[model];

    if (!capabilities) {
      throw new Error(`Unknown model: ${model}`);
    }

    // Build request body based on provider
    let body: any;
    switch (capabilities.provider) {
      case 'anthropic':
        body = {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: input.maxTokens || 2048,
          temperature: input.temperature || 0.7,
          top_p: input.topP || 0.9,
          top_k: input.topK || 250,
          messages: input.messages || [{ role: 'user', content: input.prompt || '' }],
        };
        if (input.systemPrompt) {
          body.system = input.systemPrompt;
        }
        if (input.stopSequences?.length) {
          body.stop_sequences = input.stopSequences;
        }
        break;

      case 'amazon':
        body = {
          inputText: input.messages?.[0]?.content || input.prompt || '',
          textGenerationConfig: {
            maxTokenCount: input.maxTokens || 2048,
            temperature: input.temperature || 0.7,
            topP: input.topP || 0.9,
          },
        };
        break;

      case 'meta':
        const metaPrompt = input.messages?.map((m: any) => `${m.role}: ${m.content}`).join('\n') || input.prompt || '';
        body = {
          prompt: metaPrompt,
          max_gen_len: input.maxTokens || 2048,
          temperature: input.temperature || 0.7,
          top_p: input.topP || 0.9,
        };
        break;

      case 'mistral':
        body = {
          prompt: input.messages?.[0]?.content || input.prompt || '',
          max_tokens: input.maxTokens || 2048,
          temperature: input.temperature || 0.7,
          top_p: input.topP || 0.9,
        };
        break;

      case 'cohere':
        body = {
          message: input.messages?.[0]?.content || input.prompt || '',
          max_tokens: input.maxTokens || 2048,
          temperature: input.temperature || 0.7,
          p: input.topP || 0.9,
        };
        break;

      default:
        throw new Error(`Unsupported model provider: ${capabilities.provider}`);
    }

    const response = await this.invokeModel(model, body);

    // Format response based on simplify flag
    if (input.simplify !== false) {
      let text = '';
      let usage = { inputTokens: 0, outputTokens: 0 };

      switch (capabilities.provider) {
        case 'anthropic':
          text = response.content?.[0]?.text || '';
          usage = {
            inputTokens: response.usage?.input_tokens || 0,
            outputTokens: response.usage?.output_tokens || 0,
          };
          break;
        case 'amazon':
          text = response.results?.[0]?.outputText || '';
          usage = {
            inputTokens: response.inputTextTokenCount || 0,
            outputTokens: response.results?.[0]?.tokenCount?.outputTokens || 0,
          };
          break;
        case 'meta':
          text = response.generation || '';
          break;
        case 'mistral':
          text = response.outputs?.[0]?.text || '';
          break;
        case 'cohere':
          text = response.text || response.generations?.[0]?.text || '';
          break;
      }

      return {
        text,
        stopReason: response.stop_reason || response.finish_reason || 'end_turn',
        usage,
      };
    }

    return response;
  }

  /**
   * analyze_image action - Analyze an image using Claude vision models
   */
  private async analyzeImageAction(input: any): Promise<any> {
    const model = input.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0';

    // Build image content
    let imageContent: any;
    if (input.imageData) {
      imageContent = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: input.mediaType || 'image/jpeg',
          data: input.imageData,
        },
      };
    } else if (input.imageUrl) {
      // Fetch image and convert to base64
      // For now, use URL directly (some models support this)
      imageContent = {
        type: 'image',
        source: {
          type: 'url',
          url: input.imageUrl,
        },
      };
    } else {
      throw new Error('Either imageUrl or imageData is required');
    }

    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: input.maxTokens || 1024,
      temperature: input.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            { type: 'text', text: input.prompt || 'Describe this image' },
          ],
        },
      ],
    };

    const response = await this.invokeModel(model, body);

    return {
      text: response.content?.[0]?.text || '',
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
      },
    };
  }

  /**
   * create_embeddings action - Generate text embeddings
   */
  private async createEmbeddingsAction(input: any): Promise<any> {
    const model = input.modelId || 'amazon.titan-embed-text-v1';
    const inputText = input.inputText || '';

    let body: any;
    if (model.includes('titan-embed')) {
      body = {
        inputText,
        dimensions: input.dimensions,
        normalize: input.normalize !== false,
      };
    } else if (model.includes('cohere.embed')) {
      body = {
        texts: [inputText],
        input_type: 'search_document',
      };
    } else {
      throw new Error(`Embedding not supported for model: ${model}`);
    }

    const response = await this.invokeModel(model, body);

    return {
      embedding: model.includes('cohere') ? response.embeddings?.[0] : response.embedding,
      inputTextTokenCount: response.inputTextTokenCount || 0,
    };
  }

  /**
   * generate_image action - Generate images using Titan or Stability models
   */
  private async generateImageAction(input: any): Promise<any> {
    const model = input.modelId || 'amazon.titan-image-generator-v1';

    let body: any;
    if (model.includes('titan-image')) {
      body = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: input.prompt,
          negativeText: input.negativePrompt,
        },
        imageGenerationConfig: {
          numberOfImages: input.numberOfImages || 1,
          width: input.width || 1024,
          height: input.height || 1024,
          cfgScale: input.cfgScale || 7,
          seed: input.seed,
        },
      };
    } else if (model.includes('stability')) {
      body = {
        text_prompts: [
          { text: input.prompt, weight: 1 },
          ...(input.negativePrompt ? [{ text: input.negativePrompt, weight: -1 }] : []),
        ],
        cfg_scale: input.cfgScale || 7,
        width: input.width || 1024,
        height: input.height || 1024,
        samples: input.numberOfImages || 1,
        steps: 30,
        seed: input.seed || 0,
      };
    } else {
      throw new Error(`Image generation not supported for model: ${model}`);
    }

    const response = await this.invokeModel(model, body);

    // Extract images
    let images: string[] = [];
    let seeds: number[] = [];

    if (model.includes('titan-image')) {
      images = response.images || [];
      seeds = [response.seed || 0];
    } else if (model.includes('stability')) {
      images = response.artifacts?.map((a: any) => a.base64) || [];
      seeds = response.artifacts?.map((a: any) => a.seed) || [];
    }

    return { images, seeds };
  }

  // AWS Bedrock specific methods

  async invokeModel(modelId: string, body: any, contentType: string = 'application/json', accept: string = 'application/json'): Promise<any> {
    try {
      const response = await this.bedrockRuntime.invokeModel({
        modelId,
        body: JSON.stringify(body),
        contentType,
        accept
      });

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody;
    } catch (error) {
      throw this.createAIError(error, 'Model invocation failed');
    }
  }

  async streamResponse(modelId: string, body: any): Promise<AsyncIterable<any>> {
    try {
      const response = await this.bedrockRuntime.invokeModelWithResponseStream({
        modelId,
        body: JSON.stringify(body),
        contentType: 'application/json',
        accept: 'application/json'
      });

      return response.body;
    } catch (error) {
      throw this.createAIError(error, 'Model streaming failed');
    }
  }

  // AI Interface Implementation

  async generateText(prompt: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      const capabilities = this.modelCapabilities[model];
      
      if (!capabilities) {
        throw new Error(`Unknown model: ${model}`);
      }

      let body: any;
      let responseText = '';
      let usage: AIUsageInfo = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      // Format request body based on model provider
      switch (capabilities.provider) {
        case 'anthropic':
          body = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: config.maxTokens || 1000,
            temperature: config.temperature || 0.7,
            messages: [
              { role: 'user', content: prompt }
            ]
          };
          if (config.systemMessage) {
            body.system = config.systemMessage;
          }
          break;

        case 'amazon':
          body = {
            inputText: prompt,
            textGenerationConfig: {
              maxTokenCount: config.maxTokens || 1000,
              temperature: config.temperature || 0.7,
              topP: config.topP || 0.9
            }
          };
          break;

        case 'meta':
          body = {
            prompt,
            max_gen_len: config.maxTokens || 1000,
            temperature: config.temperature || 0.7,
            top_p: config.topP || 0.9
          };
          break;

        case 'mistral':
          body = {
            prompt,
            max_tokens: config.maxTokens || 1000,
            temperature: config.temperature || 0.7,
            top_p: config.topP || 0.9
          };
          break;

        case 'cohere':
          body = {
            prompt,
            max_tokens: config.maxTokens || 1000,
            temperature: config.temperature || 0.7,
            p: config.topP || 0.9
          };
          break;

        default:
          throw new Error(`Unsupported model provider: ${capabilities.provider}`);
      }

      const response = await this.invokeModel(model, body);
      
      // Parse response based on model provider
      switch (capabilities.provider) {
        case 'anthropic':
          responseText = response.content?.[0]?.text || '';
          usage = {
            promptTokens: response.usage?.input_tokens || 0,
            completionTokens: response.usage?.output_tokens || 0,
            totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
          };
          break;

        case 'amazon':
          responseText = response.results?.[0]?.outputText || '';
          usage = {
            promptTokens: response.inputTextTokenCount || 0,
            completionTokens: response.results?.[0]?.tokenCount?.outputTokens || 0,
            totalTokens: (response.inputTextTokenCount || 0) + (response.results?.[0]?.tokenCount?.outputTokens || 0)
          };
          break;

        case 'meta':
          responseText = response.generation || '';
          usage = {
            promptTokens: response.prompt_token_count || 0,
            completionTokens: response.generation_token_count || 0,
            totalTokens: (response.prompt_token_count || 0) + (response.generation_token_count || 0)
          };
          break;

        case 'mistral':
          responseText = response.outputs?.[0]?.text || '';
          usage = {
            promptTokens: 0, // Mistral doesn't always provide token counts
            completionTokens: 0,
            totalTokens: 0
          };
          break;

        case 'cohere':
          responseText = response.generations?.[0]?.text || '';
          usage = {
            promptTokens: response.meta?.billed_units?.input_tokens || 0,
            completionTokens: response.meta?.billed_units?.output_tokens || 0,
            totalTokens: (response.meta?.billed_units?.input_tokens || 0) + (response.meta?.billed_units?.output_tokens || 0)
          };
          break;

        default:
          responseText = response.completion || response.text || JSON.stringify(response);
      }

      return {
        success: true,
        data: responseText,
        usage,
        model,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Text generation failed');
    }
  }

  async *streamText(prompt: string, config: Partial<AIModelConfig> = {}): AsyncIterable<StreamResponse> {
    try {
      const model = config.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      const capabilities = this.modelCapabilities[model];
      
      if (!capabilities) {
        throw new Error(`Unknown model: ${model}`);
      }

      // Format request body (similar to generateText)
      let body: any;
      switch (capabilities.provider) {
        case 'anthropic':
          body = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: config.maxTokens || 1000,
            temperature: config.temperature || 0.7,
            messages: [
              { role: 'user', content: prompt }
            ]
          };
          if (config.systemMessage) {
            body.system = config.systemMessage;
          }
          break;

        default:
          throw new Error(`Streaming not implemented for provider: ${capabilities.provider}`);
      }

      const stream = await this.streamResponse(model, body);

      for await (const chunk of stream) {
        if (chunk.chunk) {
          const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
          
          if (chunkData.type === 'content_block_delta' && chunkData.delta?.text) {
            yield {
              chunk: chunkData.delta.text,
              done: false
            };
          } else if (chunkData.type === 'message_stop') {
            yield {
              chunk: '',
              done: true,
              usage: chunkData.amazon_bedrock_invokeModel ? {
                promptTokens: chunkData.amazon_bedrock_invokeModel.inputTokens,
                completionTokens: chunkData.amazon_bedrock_invokeModel.outputTokens,
                totalTokens: chunkData.amazon_bedrock_invokeModel.inputTokens + chunkData.amazon_bedrock_invokeModel.outputTokens
              } : undefined
            };
          }
        }
      }
    } catch (error) {
      throw this.createAIError(error, 'Text streaming failed');
    }
  }

  async chat(messages: ChatMessage[], config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    // Convert messages to a single prompt for models that don't support native chat
    const model = config.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    const capabilities = this.modelCapabilities[model];

    if (capabilities?.provider === 'anthropic') {
      // Anthropic models support native chat format
      try {
        const anthropicMessages = messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }));

        const systemMessage = messages.find(msg => msg.role === 'system')?.content || config.systemMessage;

        const body = {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: config.maxTokens || 1000,
          temperature: config.temperature || 0.7,
          messages: anthropicMessages,
          ...(systemMessage && { system: systemMessage })
        };

        const response = await this.invokeModel(model, body);
        
        const usage: AIUsageInfo = {
          promptTokens: response.usage?.input_tokens || 0,
          completionTokens: response.usage?.output_tokens || 0,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        };

        return {
          success: true,
          data: response.content?.[0]?.text || '',
          usage,
          model,
          metadata: {
            timestamp: new Date()
          }
        };
      } catch (error) {
        return this.handleAIError(error, 'Chat failed');
      }
    } else {
      // Convert to single prompt for other models
      const conversationPrompt = messages
        .map(msg => `${msg.role === 'system' ? 'System' : msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n\n') + '\n\nAssistant:';
      
      return this.generateText(conversationPrompt, config);
    }
  }

  async generateCode(prompt: string, language?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const codePrompt = language 
      ? `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide clean, production-ready code with proper documentation.`
      : `Generate code for the following requirement:\n\n${prompt}\n\nProvide clean, production-ready code with proper documentation.`;
    
    return this.generateText(codePrompt, { 
      ...config, 
      systemMessage: 'You are an expert software engineer. Generate high-quality, well-documented code following best practices.' 
    });
  }

  async createEmbedding(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>> {
    try {
      const model = request.model || 'amazon.titan-embed-text-v2:0';
      const input = Array.isArray(request.input) ? request.input : [request.input];
      
      const embeddings: number[][] = [];
      let totalTokens = 0;

      for (const text of input) {
        let body: any;
        
        if (model.includes('titan-embed')) {
          body = { inputText: text };
        } else if (model.includes('cohere.embed')) {
          body = { texts: [text], input_type: 'search_document' };
        } else {
          throw new Error(`Embedding not supported for model: ${model}`);
        }

        const response = await this.invokeModel(model, body);
        
        if (model.includes('titan-embed')) {
          embeddings.push(response.embedding || []);
          totalTokens += response.inputTextTokenCount || 0;
        } else if (model.includes('cohere.embed')) {
          embeddings.push(response.embeddings?.[0] || []);
          totalTokens += response.meta?.billed_units?.input_tokens || 0;
        }
      }

      const usage: AIUsageInfo = {
        promptTokens: totalTokens,
        completionTokens: 0,
        totalTokens
      };

      return {
        success: true,
        data: {
          embeddings,
          usage
        },
        usage,
        model,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Embedding creation failed');
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<AIResponse<ImageGenerationResponse>> {
    try {
      const model = request.model || 'stability.stable-diffusion-xl-v1';
      
      if (!model.includes('stability')) {
        throw new Error('Image generation is only supported with Stability AI models');
      }

      const body = {
        text_prompts: [
          {
            text: request.prompt,
            weight: 1
          }
        ],
        cfg_scale: 10,
        clip_guidance_preset: 'FAST_BLUE',
        height: 1024,
        width: 1024,
        samples: request.n || 1,
        steps: 30
      };

      const response = await this.invokeModel(model, body);
      
      const images = response.artifacts?.map((artifact: any) => ({
        b64_json: artifact.base64,
        url: undefined, // Bedrock returns base64, not URLs
        revised_prompt: undefined
      })) || [];

      return {
        success: true,
        data: {
          images
        },
        model,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Image generation failed');
    }
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<AIResponse<DocumentAnalysisResponse>> {
    let prompt = `Analyze the following ${request.type || 'text'} document:\n\n${request.content}\n\n`;
    
    switch (request.task) {
      case 'summarize':
        prompt += 'Provide a comprehensive summary of the key points.';
        break;
      case 'extract':
        prompt += `Extract information as requested: ${request.instructions || 'Extract key entities, facts, and important details'}`;
        break;
      case 'classify':
        prompt += `Classify this document: ${request.instructions || 'Determine the document type and category'}`;
        break;
      default:
        prompt += request.instructions || 'Analyze this document and provide insights.';
    }

    const response = await this.generateText(prompt, { 
      systemMessage: 'You are a document analysis expert. Provide thorough and accurate analysis.' 
    });
    
    if (response.success) {
      return {
        ...response,
        data: {
          result: response.data || '',
          confidence: 0.85,
          metadata: {
            documentType: request.type,
            task: request.task
          },
          usage: response.usage
        }
      };
    }
    
    return response as any;
  }

  async summarize(text: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const prompt = `Summarize the following text:\n\n${text}`;
    return this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are an expert at creating clear and comprehensive summaries.' 
    });
  }

  async extractData(text: string, schema: Record<string, any>, config: Partial<AIModelConfig> = {}): Promise<AIResponse<any>> {
    const prompt = `Extract structured data from the following text according to this schema:\n\nSchema: ${JSON.stringify(schema)}\n\nText: ${text}\n\nReturn the extracted data as JSON.`;
    const response = await this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are a data extraction expert. Return only valid JSON.' 
    });
    
    if (response.success) {
      try {
        const extractedData = JSON.parse(response.data || '{}');
        return {
          ...response,
          data: extractedData
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Failed to parse JSON response',
            details: error,
            retryable: true
          },
          metadata: { timestamp: new Date() }
        };
      }
    }
    
    return response as any;
  }

  async classifyText(text: string, categories: string[], config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}\n\nText: ${text}\n\nReturn only the category name.`;
    return this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are a text classification expert.' 
    });
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.bedrock.listFoundationModels();
      return models.modelSummaries.map(model => model.modelId);
    } catch (error) {
      this.logger.error('Failed to fetch available models:', error);
      return Object.keys(this.modelCapabilities);
    }
  }

  async getContextWindow(model: string = 'anthropic.claude-3-5-sonnet-20241022-v2:0'): Promise<ContextWindow> {
    const capabilities = this.modelCapabilities[model];
    if (!capabilities) {
      throw new Error(`Unknown model: ${model}`);
    }

    return {
      size: capabilities.contextWindow,
      used: 0, // Would need to track this per conversation
      remaining: capabilities.contextWindow
    };
  }

  async getTokenCount(text: string, model: string = 'anthropic.claude-3-5-sonnet-20241022-v2:0'): Promise<number> {
    // Rough estimation - different models use different tokenizers
    return Math.ceil(text.length / 4);
  }

  async validateModel(model: string): Promise<boolean> {
    return model in this.modelCapabilities;
  }

  // Utility methods
  private handleAIError(error: any, context: string): AIResponse<any> {
    const aiError = this.createAIError(error, context);
    
    return {
      success: false,
      error: {
        code: aiError.code,
        message: aiError.message,
        details: error,
        statusCode: aiError.statusCode,
        retryable: aiError.retryable
      },
      metadata: {
        timestamp: new Date()
      }
    };
  }

  private createAIError(error: any, context: string): AIError {
    let code = AIErrorCode.SERVER_ERROR;
    let retryable = false;
    let statusCode = error.$metadata?.httpStatusCode || error.statusCode || 500;

    if (error.name === 'UnauthorizedException' || statusCode === 401) {
      code = AIErrorCode.INVALID_API_KEY;
    } else if (error.name === 'ThrottlingException' || statusCode === 429) {
      code = AIErrorCode.RATE_LIMIT_EXCEEDED;
      retryable = true;
    } else if (error.name === 'ValidationException' && error.message?.includes('token')) {
      code = AIErrorCode.CONTEXT_LENGTH_EXCEEDED;
    } else if (error.name === 'ResourceNotFoundException' || statusCode === 404) {
      code = AIErrorCode.MODEL_NOT_FOUND;
    } else if (error.name === 'ModelNotReadyException' || error.name === 'ServiceUnavailableException') {
      retryable = true;
    } else if (error.name === 'AccessDeniedException') {
      code = AIErrorCode.INSUFFICIENT_QUOTA;
    }

    const aiError = new Error(`${context}: ${error.message}`) as AIError;
    aiError.code = code;
    aiError.statusCode = statusCode;
    aiError.retryable = retryable;
    
    return aiError;
  }
}