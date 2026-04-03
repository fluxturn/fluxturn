import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
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
  ChatRequest,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  AudioTranscriptionRequest,
  AudioTranscriptionResponse,
  ModerationRequest,
  ModerationResponse,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  StreamResponse,
  ContextWindow,
  AIUsageInfo,
  AIProviderInfo,
  AIError,
  AIErrorCode
} from '../ai.interface';

@Injectable()
export class OpenAIConnector extends BaseConnector implements IAIConnector {
  protected readonly logger = new Logger(OpenAIConnector.name);
  private openai: OpenAI;

  private readonly modelCapabilities = {
    'gpt-5': { contextWindow: 8192, maxTokens: 4096, supportsVision: false, supportsFunctions: true },
    'gpt-5-turbo': { contextWindow: 128000, maxTokens: 4096, supportsVision: true, supportsFunctions: true },
    'gpt-5o': { contextWindow: 128000, maxTokens: 4096, supportsVision: true, supportsFunctions: true },
    'gpt-5-mini': { contextWindow: 128000, maxTokens: 16384, supportsVision: true, supportsFunctions: true },
    'gpt-3.5-turbo': { contextWindow: 16385, maxTokens: 4096, supportsVision: false, supportsFunctions: true },
    'text-embedding-3-small': { contextWindow: 8191, maxTokens: 8191, supportsVision: false, supportsFunctions: false },
    'text-embedding-3-large': { contextWindow: 8191, maxTokens: 8191, supportsVision: false, supportsFunctions: false },
    'text-embedding-ada-002': { contextWindow: 8191, maxTokens: 8191, supportsVision: false, supportsFunctions: false },
    'dall-e-3': { contextWindow: 4000, maxTokens: 4000, supportsVision: false, supportsFunctions: false },
    'dall-e-2': { contextWindow: 1000, maxTokens: 1000, supportsVision: false, supportsFunctions: false },
    'whisper-1': { contextWindow: 25000000, maxTokens: 25000000, supportsVision: false, supportsFunctions: false },
    'tts-1': { contextWindow: 4096, maxTokens: 4096, supportsVision: false, supportsFunctions: false },
    'tts-1-hd': { contextWindow: 4096, maxTokens: 4096, supportsVision: false, supportsFunctions: false }
  };

  getMetadata(): ConnectorMetadata {
    const actions: ConnectorAction[] = [
      // New action IDs (from connector.constants.ts)
      {
        id: 'chat_complete',
        name: 'Chat Completion',
        description: 'Create a chat completion using GPT models',
        inputSchema: {
          messages: { type: 'array', required: true },
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
        id: 'text_complete',
        name: 'Text Completion',
        description: 'Generate text completions using GPT models',
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
        id: 'image_create',
        name: 'Generate Image',
        description: 'Generate images using DALL-E',
        inputSchema: {
          prompt: { type: 'string', required: true },
          model: { type: 'string', required: false },
          size: { type: 'string', required: false },
          quality: { type: 'string', required: false }
        },
        outputSchema: {
          images: { type: 'array', required: true }
        }
      },
      {
        id: 'text_moderate',
        name: 'Moderate Content',
        description: 'Moderate content for policy violations',
        inputSchema: {
          input: { type: 'string', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          flagged: { type: 'boolean', required: true },
          categories: { type: 'object', required: true },
          category_scores: { type: 'object', required: true }
        }
      },
      {
        id: 'create_embeddings',
        name: 'Create Embeddings',
        description: 'Create embeddings for text',
        inputSchema: {
          input: { type: 'string', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          embeddings: { type: 'array', required: true },
          usage: { type: 'object', required: false }
        }
      },
      // Legacy action IDs (for backward compatibility)
      {
        id: 'generateText',
        name: 'Generate Text',
        description: 'Generate text using GPT models',
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
        name: 'Generate Image (Legacy)',
        description: 'Generate images using DALL-E',
        inputSchema: {
          prompt: { type: 'string', required: true },
          model: { type: 'string', required: false },
          size: { type: 'string', required: false },
          quality: { type: 'string', required: false }
        },
        outputSchema: {
          images: { type: 'array', required: true }
        }
      },
      {
        id: 'createEmbedding',
        name: 'Create Embedding (Legacy)',
        description: 'Create embeddings for text',
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
        id: 'transcribeAudio',
        name: 'Transcribe Audio',
        description: 'Transcribe audio using Whisper',
        inputSchema: {
          file: { type: 'string', required: true },
          model: { type: 'string', required: false },
          language: { type: 'string', required: false }
        },
        outputSchema: {
          text: { type: 'string', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'moderateContent',
        name: 'Moderate Content (Legacy)',
        description: 'Moderate content for policy violations',
        inputSchema: {
          input: { type: 'string', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          flagged: { type: 'boolean', required: true },
          categories: { type: 'object', required: true },
          category_scores: { type: 'object', required: true }
        }
      },
      {
        id: 'generateCode',
        name: 'Generate Code',
        description: 'Generate code in various programming languages',
        inputSchema: {
          prompt: { type: 'string', required: true },
          language: { type: 'string', required: false },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          code: { type: 'string', required: true },
          usage: { type: 'object', required: false }
        }
      }
    ];

    return {
      name: 'OpenAI',
      description: 'OpenAI GPT and DALL-E integration for text generation, image creation, and more',
      version: '1.0.0',
      category: ConnectorCategory.AI,
      type: ConnectorType.OPENAI,
      logoUrl: 'https://openai.com/favicon.ico',
      documentationUrl: 'https://platform.openai.com/docs',
      authType: AuthType.API_KEY,
      actions,
      triggers: [],
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 1000
      }
    };
  }

  protected async initializeConnection(): Promise<void> {
    const apiKey = this.config.credentials.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 30000
    });
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const models = await this.openai.models.list();
      return models.data.length > 0;
    } catch (error) {
      this.logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const models = await this.openai.models.list();
    if (models.data.length === 0) {
      throw new Error('No models available');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // This is a generic method - specific AI methods are implemented below
    throw new Error('Use specific AI methods instead of generic performRequest');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Performing OpenAI action: ${actionId} with input:`, JSON.stringify(input, null, 2));

    switch (actionId) {
      // New action IDs from connector.constants.ts
      case 'chat_complete':
        // Handle messages parameter - can be string or array
        let messages = [];
        if (typeof input.messages === 'string') {
          // If messages is a string, convert to OpenAI message format
          messages = [{ role: 'user', content: input.messages }];
        } else if (Array.isArray(input.messages)) {
          // If already an array, use as-is
          messages = input.messages;
        } else {
          // Fallback to empty array
          messages = [];
        }

        const chatConfig = {
          model: input.model || input.chatModel,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          topP: input.topP,
          frequencyPenalty: input.frequencyPenalty,
          presencePenalty: input.presencePenalty,
          n: input.n
        };
        const chatResult = await this.chat(messages, chatConfig);
        return chatResult.success ? chatResult.data : { error: chatResult.error };

      case 'image_create':
        const selectedModel = input.model || input.imageModel || 'dall-e-3';

        const imageRequest: any = {
          prompt: input.prompt,
          model: selectedModel,
          size: input.size,
          n: input.n,
          responseFormat: input.responseFormat
        };

        // Only add quality and style for DALL-E 3
        if (selectedModel === 'dall-e-3') {
          if (input.quality) imageRequest.quality = input.quality;
          if (input.style) imageRequest.style = input.style;
        }

        const imageResult = await this.generateImage(imageRequest);
        return imageResult.success ? imageResult.data : { error: imageResult.error };

      case 'text_complete':
        const textConfig = {
          model: input.model,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          topP: input.topP,
          frequencyPenalty: input.frequencyPenalty,
          presencePenalty: input.presencePenalty,
          n: input.n,
          echo: input.echo
        };
        const textResult = await this.generateText(input.prompt, textConfig);
        return textResult.success ? textResult.data : { error: textResult.error };

      case 'text_moderate':
        const moderateRequest = {
          input: input.input,
          model: input.model
        };
        const moderationResult = await this.moderateContent(moderateRequest);
        return moderationResult.success ? moderationResult.data : { error: moderationResult.error };

      case 'create_embeddings':
        const embeddingRequest = {
          input: input.input,
          model: input.model,
          dimensions: input.dimensions
        };
        const embeddingResult = await this.createEmbedding(embeddingRequest);
        return embeddingResult.success ? embeddingResult.data : { error: embeddingResult.error };

      // Legacy action IDs (keep for backward compatibility)
      case 'generateText':
        const legacyTextResult = await this.generateText(input.prompt, input);
        return legacyTextResult.data;
      case 'generateImage':
        const legacyImageResult = await this.generateImage(input);
        return legacyImageResult.data;
      case 'createEmbedding':
        const legacyEmbeddingResult = await this.createEmbedding(input);
        return legacyEmbeddingResult.data;
      case 'transcribeAudio':
        const transcriptionResult = await this.transcribeAudio(input);
        return transcriptionResult.data;
      case 'moderateContent':
        const legacyModerationResult = await this.moderateContent(input);
        return legacyModerationResult.data;
      case 'generateCode':
        const codeResult = await this.generateCode(input.prompt, input.language, input);
        return codeResult.data;
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // OpenAI client doesn't require explicit cleanup
  }

  // AI Interface Implementation

  async generateText(prompt: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'gpt-3.5-turbo';
      const messages: ChatMessage[] = [];
      
      if (config.systemMessage) {
        messages.push({ role: 'system', content: config.systemMessage });
      }
      messages.push({ role: 'user', content: prompt });

      const completion = await this.openai.chat.completions.create({
        model,
        messages: messages as any,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000,
        top_p: config.topP || 1,
        stream: false
      });

      const usage: AIUsageInfo = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      };

      return {
        success: true,
        data: completion.choices[0]?.message?.content || '',
        usage,
        model,
        finishReason: completion.choices[0]?.finish_reason || '',
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
      const model = config.model || 'gpt-3.5-turbo';
      const messages: ChatMessage[] = [];
      
      if (config.systemMessage) {
        messages.push({ role: 'system', content: config.systemMessage });
      }
      messages.push({ role: 'user', content: prompt });

      const stream = await this.openai.chat.completions.create({
        model,
        messages: messages as any,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000,
        top_p: config.topP || 1,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        const done = chunk.choices[0]?.finish_reason !== null;
        
        yield {
          chunk: content,
          done,
          usage: done && chunk.usage ? {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0
          } : undefined
        };
      }
    } catch (error) {
      throw this.createAIError(error, 'Text streaming failed');
    }
  }

  async chat(messages: ChatMessage[], config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'gpt-3.5-turbo';
      
      const completion = await this.openai.chat.completions.create({
        model,
        messages: messages as any,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000,
        top_p: config.topP || 1,
        stream: false
      });

      const usage: AIUsageInfo = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      };

      return {
        success: true,
        data: completion.choices[0]?.message?.content || '',
        usage,
        model,
        finishReason: completion.choices[0]?.finish_reason || '',
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Chat failed');
    }
  }

  async generateCode(prompt: string, language?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const codePrompt = language 
      ? `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide only the code without explanations.`
      : `Generate code for the following requirement:\n\n${prompt}\n\nProvide only the code without explanations.`;
    
    return this.generateText(codePrompt, { ...config, systemMessage: 'You are a senior software engineer. Generate clean, efficient, and well-documented code.' });
  }

  async createEmbedding(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>> {
    try {
      const model = request.model || 'text-embedding-3-small';
      const input = Array.isArray(request.input) ? request.input : [request.input];

      const response = await this.openai.embeddings.create({
        model,
        input,
        dimensions: request.dimensions
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: 0,
        totalTokens: response.usage?.total_tokens || 0
      };

      return {
        success: true,
        data: {
          embeddings: response.data.map(item => item.embedding),
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
      const model = request.model || 'dall-e-3';

      // Build request params conditionally based on model
      const params: any = {
        model,
        prompt: request.prompt,
        n: request.n || 1,
      };

      // Add size (required for all models)
      if (request.size) {
        params.size = request.size as any;
      }

      // Only add quality and style for dall-e-3 (these params don't exist for dall-e-2)
      if (model === 'dall-e-3') {
        if (request.quality) {
          params.quality = request.quality as any;
        }
        if (request.style) {
          params.style = request.style as any;
        }
      }

      const response = await this.openai.images.generate(params);

      return {
        success: true,
        data: {
          images: response.data?.map(img => ({
            url: img.url,
            b64_json: img.b64_json,
            revised_prompt: img.revised_prompt
          })) || []
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

  async transcribeAudio(request: AudioTranscriptionRequest): Promise<AIResponse<AudioTranscriptionResponse>> {
    try {
      const model = request.model || 'whisper-1';
      
      // Handle both Buffer and file path
      let file: any;
      if (typeof request.file === 'string') {
        // If it's a file path, we need to read it
        const fs = await import('fs');
        file = fs.createReadStream(request.file);
      } else {
        // If it's a Buffer, convert to File-like object
        file = new File([request.file as any], 'audio.mp3', { type: 'audio/mpeg' });
      }

      const response = await this.openai.audio.transcriptions.create({
        file,
        model,
        language: request.language,
        prompt: request.prompt,
        response_format: request.response_format || 'json',
        temperature: request.temperature
      });

      return {
        success: true,
        data: {
          text: typeof response === 'string' ? response : response.text,
          language: typeof response === 'object' ? (response as any).language : undefined,
          duration: typeof response === 'object' ? (response as any).duration : undefined,
          segments: typeof response === 'object' ? (response as any).segments : undefined
        },
        model,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Audio transcription failed');
    }
  }

  async translateText(text: string, targetLanguage: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const prompt = `Translate the following text to ${targetLanguage}:\n\n${text}\n\nProvide only the translation without any explanations.`;
    return this.generateText(prompt, { ...config, systemMessage: 'You are a professional translator.' });
  }

  async moderateContent(request: ModerationRequest): Promise<AIResponse<ModerationResponse>> {
    try {
      const model = request.model || 'omni-moderation-latest';
      
      const response = await this.openai.moderations.create({
        input: request.input,
        model
      });

      const result = response.results[0];
      
      return {
        success: true,
        data: {
          flagged: result.flagged,
          categories: result.categories as unknown as Record<string, boolean>,
          category_scores: result.category_scores as unknown as Record<string, number>
        },
        model,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Content moderation failed');
    }
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<AIResponse<DocumentAnalysisResponse>> {
    let prompt = `Analyze the following ${request.type || 'text'} document:\n\n${request.content}\n\n`;
    
    switch (request.task) {
      case 'summarize':
        prompt += 'Provide a concise summary of the main points.';
        break;
      case 'extract':
        prompt += `Extract key information as requested: ${request.instructions || 'Extract main entities, dates, and important facts'}`;
        break;
      case 'classify':
        prompt += `Classify this document: ${request.instructions || 'Determine the document type and category'}`;
        break;
      default:
        prompt += request.instructions || 'Analyze and provide insights about this document.';
    }

    const response = await this.generateText(prompt, { systemMessage: 'You are a document analysis expert.' });
    
    if (response.success) {
      return {
        ...response,
        data: {
          result: response.data || '',
          confidence: 0.8, // Could be improved with actual confidence scoring
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
    const prompt = `Summarize the following text in a clear and concise manner:\n\n${text}`;
    return this.generateText(prompt, { ...config, systemMessage: 'You are an expert at creating clear, concise summaries.' });
  }

  async extractData(text: string, schema: Record<string, any>, config: Partial<AIModelConfig> = {}): Promise<AIResponse<any>> {
    const prompt = `Extract data from the following text according to this schema:\n\nSchema: ${JSON.stringify(schema)}\n\nText: ${text}\n\nReturn the extracted data as JSON.`;
    const response = await this.generateText(prompt, { ...config, systemMessage: 'You are a data extraction expert. Return only valid JSON.' });
    
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
    return this.generateText(prompt, { ...config, systemMessage: 'You are a text classification expert.' });
  }

  async analyzeImage(imageUrl: string, prompt?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'gpt-5o';
      const messages: any[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this image and describe what you see.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ];

      const response = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      };

      return {
        success: true,
        data: response.choices[0]?.message?.content || '',
        usage,
        model,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Image analysis failed');
    }
  }

  async generateSpeech(text: string, voice?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<Buffer>> {
    try {
      const model = config.model || 'tts-1';
      
      const response = await this.openai.audio.speech.create({
        model,
        voice: voice as any || 'alloy',
        input: text,
        response_format: 'mp3'
      });

      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        success: true,
        data: buffer,
        model,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Speech generation failed');
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      return models.data.map(model => model.id);
    } catch (error) {
      this.logger.error('Failed to fetch available models:', error);
      return Object.keys(this.modelCapabilities);
    }
  }

  async getContextWindow(model: string = 'gpt-3.5-turbo'): Promise<ContextWindow> {
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

  async getTokenCount(text: string, model: string = 'gpt-3.5-turbo'): Promise<number> {
    // Rough estimation - for accurate counting, use tiktoken library
    return Math.ceil(text.length / 4);
  }

  async validateModel(model: string): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.includes(model);
    } catch (error) {
      return false;
    }
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
    let statusCode = error.status || error.statusCode || 500;

    if (error.code === 'invalid_api_key' || statusCode === 401) {
      code = AIErrorCode.INVALID_API_KEY;
    } else if (error.code === 'rate_limit_exceeded' || statusCode === 429) {
      code = AIErrorCode.RATE_LIMIT_EXCEEDED;
      retryable = true;
    } else if (error.code === 'context_length_exceeded' || error.message?.includes('context_length')) {
      code = AIErrorCode.CONTEXT_LENGTH_EXCEEDED;
    } else if (error.code === 'model_not_found' || statusCode === 404) {
      code = AIErrorCode.MODEL_NOT_FOUND;
    } else if (error.code === 'content_filter' || error.message?.includes('content filter')) {
      code = AIErrorCode.CONTENT_FILTER_TRIGGERED;
    } else if (error.code === 'insufficient_quota' || error.message?.includes('quota')) {
      code = AIErrorCode.INSUFFICIENT_QUOTA;
    } else if (statusCode >= 500) {
      retryable = true;
    }

    const aiError = new Error(`${context}: ${error.message}`) as AIError;
    aiError.code = code;
    aiError.statusCode = statusCode;
    aiError.retryable = retryable;
    
    return aiError;
  }
}