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

// Google AI interfaces (simplified for this implementation)
interface GoogleGenerativeAIResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GoogleEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
  usage?: {
    totalTokens: number;
  };
}

// Mock Google AI client since @google-ai/generativelanguage might not be installed
class MockGoogleAIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateContent(params: any): Promise<GoogleGenerativeAIResponse> {
    // This would be the actual Google AI API call
    // For now, we'll throw an error to indicate the SDK is needed
    throw new Error('Google AI SDK (@google-ai/generativelanguage or @google/generative-ai) is required but not installed. Please install it to use this connector.');
  }

  async *generateContentStream(params: any): AsyncIterable<any> {
    throw new Error('Google AI SDK (@google-ai/generativelanguage or @google/generative-ai) is required but not installed. Please install it to use this connector.');
  }

  async embedContent(params: any): Promise<GoogleEmbeddingResponse> {
    throw new Error('Google AI SDK (@google-ai/generativelanguage or @google/generative-ai) is required but not installed. Please install it to use this connector.');
  }

  async listModels(): Promise<{ models: Array<{ name: string; displayName: string }> }> {
    throw new Error('Google AI SDK (@google-ai/generativelanguage or @google/generative-ai) is required but not installed. Please install it to use this connector.');
  }
}

@Injectable()
export class GoogleAIConnector extends BaseConnector implements IAIConnector {
  protected readonly logger = new Logger(GoogleAIConnector.name);
  private googleAI: MockGoogleAIClient;

  private readonly modelCapabilities = {
    'gemini-1.5-pro': { contextWindow: 2000000, maxTokens: 8192, supportsVision: true, supportsFunctions: true, supportsAudio: true },
    'gemini-1.5-flash': { contextWindow: 1000000, maxTokens: 8192, supportsVision: true, supportsFunctions: true, supportsAudio: true },
    'gemini-1.0-pro': { contextWindow: 32768, maxTokens: 2048, supportsVision: false, supportsFunctions: true, supportsAudio: false },
    'gemini-pro-vision': { contextWindow: 16384, maxTokens: 2048, supportsVision: true, supportsFunctions: false, supportsAudio: false },
    'text-embedding-004': { contextWindow: 2048, maxTokens: 2048, supportsVision: false, supportsFunctions: false, supportsAudio: false },
    'text-embedding-gecko': { contextWindow: 2048, maxTokens: 2048, supportsVision: false, supportsFunctions: false, supportsAudio: false },
    'palm2-text-bison': { contextWindow: 8192, maxTokens: 1024, supportsVision: false, supportsFunctions: false, supportsAudio: false },
    'palm2-chat-bison': { contextWindow: 8192, maxTokens: 1024, supportsVision: false, supportsFunctions: false, supportsAudio: false }
  };

  getMetadata(): ConnectorMetadata {
    const actions: ConnectorAction[] = [
      {
        id: 'generateText',
        name: 'Generate Text',
        description: 'Generate text using Gemini models',
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
        description: 'Generate images using Imagen models',
        inputSchema: {
          prompt: { type: 'string', required: true },
          model: { type: 'string', required: false },
          aspectRatio: { type: 'string', required: false }
        },
        outputSchema: {
          images: { type: 'array', required: true }
        }
      },
      {
        id: 'embedText',
        name: 'Embed Text',
        description: 'Create text embeddings',
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
        id: 'chatConversation',
        name: 'Chat Conversation',
        description: 'Multi-turn chat conversation',
        inputSchema: {
          messages: { type: 'array', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          response: { type: 'string', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'analyzeSentiment',
        name: 'Analyze Sentiment',
        description: 'Analyze sentiment of text',
        inputSchema: {
          text: { type: 'string', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          sentiment: { type: 'string', required: true },
          score: { type: 'number', required: true }
        }
      },
      {
        id: 'extractEntities',
        name: 'Extract Entities',
        description: 'Extract named entities from text',
        inputSchema: {
          text: { type: 'string', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          entities: { type: 'array', required: true }
        }
      }
    ];

    return {
      name: 'Google AI',
      description: 'Google AI and Gemini integration for text generation, embeddings, and multimodal AI',
      version: '1.0.0',
      category: ConnectorCategory.AI,
      type: ConnectorType.GOOGLE_AI,
      logoUrl: 'https://www.gstatic.com/devrel-devsite/prod/v2210deb8920cd4a55bd580441aa58e7853afc04b39a9d9ac4198e1cd7fbe04ef5/ai/images/favicon.png',
      documentationUrl: 'https://ai.google.dev/docs',
      authType: AuthType.API_KEY,
      actions,
      triggers: [],
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 1500
      }
    };
  }

  protected async initializeConnection(): Promise<void> {
    const apiKey = this.config.credentials.apiKey;
    if (!apiKey) {
      throw new Error('Google AI API key is required');
    }

    // In a real implementation, you would use:
    // import { GoogleGenerativeAI } from '@google/generative-ai';
    // this.googleAI = new GoogleGenerativeAI(apiKey);
    
    this.googleAI = new MockGoogleAIClient(apiKey);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const models = await this.googleAI.listModels();
      return models.models.length > 0;
    } catch (error) {
      this.logger.error('Google AI connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const models = await this.googleAI.listModels();
    if (models.models.length === 0) {
      throw new Error('No models available');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Use specific AI methods instead of generic performRequest');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'generateText':
        const textResult = await this.generateText(input.prompt, input);
        return textResult.data;
      case 'generateImage':
        const imageResult = await this.generateImage(input);
        return imageResult.data;
      case 'embedText':
        const embeddingResult = await this.createEmbedding(input);
        return embeddingResult.data;
      case 'chatConversation':
        const chatResult = await this.chat(input.messages, input);
        return chatResult.data;
      case 'analyzeSentiment':
        const sentimentResult = await this.analyzeSentiment(input.text, input);
        return sentimentResult.data;
      case 'extractEntities':
        const entitiesResult = await this.extractEntities(input.text, input);
        return entitiesResult.data;
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // Google AI client doesn't require explicit cleanup
  }

  // AI Interface Implementation

  async generateText(prompt: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'gemini-1.5-flash';

      const generationConfig = {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 1000,
        topP: config.topP || 0.95,
      };

      const parts = [{ text: prompt }];
      if (config.systemMessage) {
        parts.unshift({ text: `System: ${config.systemMessage}` });
      }

      const response = await this.googleAI.generateContent({
        model: `models/${model}`,
        contents: [{ parts }],
        generationConfig
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      };

      return {
        success: true,
        data: response.candidates[0]?.content?.parts[0]?.text || '',
        usage,
        model,
        finishReason: response.candidates[0]?.finishReason || '',
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
      const model = config.model || 'gemini-1.5-flash';

      const generationConfig = {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 1000,
        topP: config.topP || 0.95,
      };

      const parts = [{ text: prompt }];
      if (config.systemMessage) {
        parts.unshift({ text: `System: ${config.systemMessage}` });
      }

      const stream = this.googleAI.generateContentStream({
        model: `models/${model}`,
        contents: [{ parts }],
        generationConfig
      });

      for await (const chunk of stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const done = chunk.candidates?.[0]?.finishReason !== undefined;
        
        yield {
          chunk: text,
          done,
          usage: done && chunk.usageMetadata ? {
            promptTokens: chunk.usageMetadata.promptTokenCount || 0,
            completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
            totalTokens: chunk.usageMetadata.totalTokenCount || 0
          } : undefined
        };
      }
    } catch (error) {
      throw this.createAIError(error, 'Text streaming failed');
    }
  }

  async chat(messages: ChatMessage[], config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'gemini-1.5-flash';

      // Convert messages to Google AI format
      const contents = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

      // Add system message if present
      const systemMessage = messages.find(msg => msg.role === 'system')?.content || config.systemMessage;
      if (systemMessage) {
        contents.unshift({
          role: 'user',
          parts: [{ text: `System: ${systemMessage}` }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'I understand the system instructions.' }]
        });
      }

      const response = await this.googleAI.generateContent({
        model: `models/${model}`,
        contents,
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 1000,
          topP: config.topP || 0.95,
        }
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      };

      return {
        success: true,
        data: response.candidates[0]?.content?.parts[0]?.text || '',
        usage,
        model,
        finishReason: response.candidates[0]?.finishReason || '',
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
      ? `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide clean, efficient, and well-commented code.`
      : `Generate code for the following requirement:\n\n${prompt}\n\nProvide clean, efficient, and well-commented code.`;
    
    return this.generateText(codePrompt, { 
      ...config, 
      systemMessage: 'You are an expert software engineer. Generate high-quality, production-ready code with proper documentation and error handling.' 
    });
  }

  async createEmbedding(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>> {
    try {
      const model = request.model || 'text-embedding-004';
      const input = Array.isArray(request.input) ? request.input : [request.input];

      const embeddings: number[][] = [];
      let totalTokens = 0;

      // Process each input text
      for (const text of input) {
        const response = await this.googleAI.embedContent({
          model: `models/${model}`,
          content: {
            parts: [{ text }]
          }
        });

        embeddings.push(response.embeddings[0]?.values || []);
        totalTokens += response.usage?.totalTokens || 0;
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
      // Google AI uses Imagen for image generation
      // This would require a different API endpoint or service
      throw new Error('Image generation with Imagen requires Google Cloud Vertex AI. Please use the Google Cloud AI Platform connector for image generation.');
    } catch (error) {
      return this.handleAIError(error, 'Image generation failed');
    }
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<AIResponse<DocumentAnalysisResponse>> {
    let prompt = `Analyze the following ${request.type || 'text'} document:\n\n${request.content}\n\n`;
    
    switch (request.task) {
      case 'summarize':
        prompt += 'Provide a comprehensive summary highlighting the key points and main themes.';
        break;
      case 'extract':
        prompt += `Extract information as requested: ${request.instructions || 'Extract key entities, facts, and important details'}`;
        break;
      case 'classify':
        prompt += `Classify this document: ${request.instructions || 'Determine the document type and category'}`;
        break;
      default:
        prompt += request.instructions || 'Analyze this document and provide insights about its content, structure, and key information.';
    }

    const response = await this.generateText(prompt, { 
      systemMessage: 'You are a document analysis expert. Provide thorough and accurate analysis with attention to detail.' 
    });
    
    if (response.success) {
      return {
        ...response,
        data: {
          result: response.data || '',
          confidence: 0.85,
          metadata: {
            documentType: request.type,
            task: request.task,
            model: 'gemini'
          },
          usage: response.usage
        }
      };
    }
    
    return response as any;
  }

  async summarize(text: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const prompt = `Summarize the following text, capturing the main points and key information:\n\n${text}`;
    return this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are an expert at creating clear and comprehensive summaries.' 
    });
  }

  async extractData(text: string, schema: Record<string, any>, config: Partial<AIModelConfig> = {}): Promise<AIResponse<any>> {
    const prompt = `Extract structured data from the following text according to this schema:\n\nSchema: ${JSON.stringify(schema)}\n\nText: ${text}\n\nReturn the extracted data as JSON.`;
    const response = await this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are a data extraction expert. Return only valid JSON that matches the schema.' 
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

  async analyzeSentiment(text: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<{ sentiment: string; score: number }>> {
    const prompt = `Analyze the sentiment of the following text and provide both a sentiment label (positive, negative, neutral) and a confidence score (0-1):\n\n${text}\n\nReturn the result in JSON format: {"sentiment": "label", "score": 0.0}`;
    
    const response = await this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are a sentiment analysis expert. Return only valid JSON with sentiment and score.' 
    });
    
    if (response.success) {
      try {
        const result = JSON.parse(response.data || '{"sentiment": "neutral", "score": 0.5}');
        return {
          ...response,
          data: result
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

  async extractEntities(text: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<Array<{ text: string; type: string; confidence: number }>>> {
    const prompt = `Extract named entities from the following text. For each entity, provide the text, type (PERSON, ORGANIZATION, LOCATION, DATE, etc.), and confidence score:\n\n${text}\n\nReturn the result as JSON array: [{"text": "entity", "type": "TYPE", "confidence": 0.0}]`;
    
    const response = await this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are a named entity recognition expert. Return only valid JSON array with entities.' 
    });
    
    if (response.success) {
      try {
        const entities = JSON.parse(response.data || '[]');
        return {
          ...response,
          data: entities
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

  async analyzeImage(imageUrl: string, prompt?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'gemini-1.5-flash';
      
      const parts = [
        { text: prompt || 'Describe this image in detail.' },
        {
          inlineData: {
            mimeType: 'image/jpeg', // Would need to detect actual mime type
            data: imageUrl // Would need to fetch and convert to base64
          }
        }
      ];

      const response = await this.googleAI.generateContent({
        model: `models/${model}`,
        contents: [{ parts }],
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 1000,
        }
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      };

      return {
        success: true,
        data: response.candidates[0]?.content?.parts[0]?.text || '',
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

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.googleAI.listModels();
      return models.models.map(model => model.name.replace('models/', ''));
    } catch (error) {
      this.logger.error('Failed to fetch available models:', error);
      return Object.keys(this.modelCapabilities);
    }
  }

  async getContextWindow(model: string = 'gemini-1.5-flash'): Promise<ContextWindow> {
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

  async getTokenCount(text: string, model: string = 'gemini-1.5-flash'): Promise<number> {
    // Rough estimation - Google AI uses SentencePiece tokenizer
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
    let statusCode = error.status || error.statusCode || 500;

    if (error.code === 'UNAUTHENTICATED' || statusCode === 401) {
      code = AIErrorCode.INVALID_API_KEY;
    } else if (error.code === 'RESOURCE_EXHAUSTED' || statusCode === 429) {
      code = AIErrorCode.RATE_LIMIT_EXCEEDED;
      retryable = true;
    } else if (error.code === 'INVALID_ARGUMENT' && error.message?.includes('token')) {
      code = AIErrorCode.CONTEXT_LENGTH_EXCEEDED;
    } else if (error.code === 'NOT_FOUND' || statusCode === 404) {
      code = AIErrorCode.MODEL_NOT_FOUND;
    } else if (error.code === 'FAILED_PRECONDITION' && error.message?.includes('safety')) {
      code = AIErrorCode.CONTENT_FILTER_TRIGGERED;
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