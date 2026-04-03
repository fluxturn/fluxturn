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
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  StreamResponse,
  ContextWindow,
  AIUsageInfo,
  AIError,
  AIErrorCode
} from '../ai.interface';

// Anthropic SDK interfaces (simplified for this implementation)
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  stop_reason: string;
}

// Mock Anthropic client since @anthropic-ai/sdk might not be installed
class MockAnthropicClient {
  private apiKey: string;

  constructor(options: { apiKey: string }) {
    this.apiKey = options.apiKey;
  }

  messages = {
    create: async (params: any): Promise<AnthropicResponse> => {
      // This would be the actual Anthropic API call
      // For now, we'll throw an error to indicate the SDK is needed
      throw new Error('Anthropic SDK (@anthropic-ai/sdk) is required but not installed. Please install it to use this connector.');
    },

    stream: async function* (params: any): AsyncIterable<any> {
      throw new Error('Anthropic SDK (@anthropic-ai/sdk) is required but not installed. Please install it to use this connector.');
    }
  };
}

@Injectable()
export class AnthropicConnector extends BaseConnector implements IAIConnector {
  protected readonly logger = new Logger(AnthropicConnector.name);
  private anthropic: MockAnthropicClient;

  private readonly modelCapabilities = {
    'claude-3-5-sonnet-20241022': { contextWindow: 200000, maxTokens: 8192, supportsVision: true, supportsFunctions: true },
    'claude-3-5-sonnet-20240620': { contextWindow: 200000, maxTokens: 8192, supportsVision: true, supportsFunctions: true },
    'claude-3-5-haiku-20241022': { contextWindow: 200000, maxTokens: 8192, supportsVision: true, supportsFunctions: true },
    'claude-3-opus-20240229': { contextWindow: 200000, maxTokens: 4096, supportsVision: true, supportsFunctions: true },
    'claude-3-sonnet-20240229': { contextWindow: 200000, maxTokens: 4096, supportsVision: true, supportsFunctions: true },
    'claude-3-haiku-20240307': { contextWindow: 200000, maxTokens: 4096, supportsVision: true, supportsFunctions: true },
    'claude-2.1': { contextWindow: 200000, maxTokens: 4096, supportsVision: false, supportsFunctions: false },
    'claude-2.0': { contextWindow: 100000, maxTokens: 4096, supportsVision: false, supportsFunctions: false },
    'claude-instant-1.2': { contextWindow: 100000, maxTokens: 4096, supportsVision: false, supportsFunctions: false }
  };

  getMetadata(): ConnectorMetadata {
    const actions: ConnectorAction[] = [
      {
        id: 'generateText',
        name: 'Generate Text',
        description: 'Generate text using Claude models',
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
        id: 'analyzeDocument',
        name: 'Analyze Document',
        description: 'Analyze documents with Claude\'s advanced reasoning',
        inputSchema: {
          content: { type: 'string', required: true },
          task: { type: 'string', required: false },
          instructions: { type: 'string', required: false }
        },
        outputSchema: {
          result: { type: 'string', required: true },
          confidence: { type: 'number', required: false }
        }
      },
      {
        id: 'generateCode',
        name: 'Generate Code',
        description: 'Generate code with Claude\'s reasoning capabilities',
        inputSchema: {
          prompt: { type: 'string', required: true },
          language: { type: 'string', required: false },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          code: { type: 'string', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'summarize',
        name: 'Summarize Content',
        description: 'Create intelligent summaries with constitutional AI',
        inputSchema: {
          text: { type: 'string', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          summary: { type: 'string', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'extractData',
        name: 'Extract Data',
        description: 'Extract structured data from unstructured text',
        inputSchema: {
          text: { type: 'string', required: true },
          schema: { type: 'object', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          data: { type: 'object', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'classifyText',
        name: 'Classify Text',
        description: 'Classify text with high accuracy',
        inputSchema: {
          text: { type: 'string', required: true },
          categories: { type: 'array', required: true },
          model: { type: 'string', required: false }
        },
        outputSchema: {
          category: { type: 'string', required: true },
          confidence: { type: 'number', required: false }
        }
      }
    ];

    return {
      name: 'Anthropic Claude',
      description: 'Anthropic Claude AI for advanced reasoning, analysis, and text generation',
      version: '1.0.0',
      category: ConnectorCategory.AI,
      type: ConnectorType.ANTHROPIC,
      logoUrl: 'https://www.anthropic.com/favicon.ico',
      documentationUrl: 'https://docs.anthropic.com/',
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
      throw new Error('Anthropic API key is required');
    }

    // In a real implementation, you would use:
    // import Anthropic from '@anthropic-ai/sdk';
    // this.anthropic = new Anthropic({ apiKey });
    
    this.anthropic = new MockAnthropicClient({ apiKey });
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test with a simple message
      await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      return true;
    } catch (error) {
      this.logger.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    // Simple health check
    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Test' }]
    });
    
    if (!response.content || response.content.length === 0) {
      throw new Error('Health check failed - no response from Claude');
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
      case 'analyzeDocument':
        const docResult = await this.analyzeDocument(input);
        return docResult.data;
      case 'generateCode':
        const codeResult = await this.generateCode(input.prompt, input.language, input);
        return codeResult.data;
      case 'summarize':
        const summaryResult = await this.summarize(input.text, input);
        return summaryResult.data;
      case 'extractData':
        const extractResult = await this.extractData(input.text, input.schema, input);
        return extractResult.data;
      case 'classifyText':
        const classifyResult = await this.classifyText(input.text, input.categories, input);
        return classifyResult.data;
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // Anthropic client doesn't require explicit cleanup
  }

  // AI Interface Implementation

  async generateText(prompt: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'claude-3-5-sonnet-20241022';
      const messages: AnthropicMessage[] = [
        { role: 'user', content: prompt }
      ];

      const response = await this.anthropic.messages.create({
        model,
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        messages,
        system: config.systemMessage
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      };

      return {
        success: true,
        data: response.content[0]?.text || '',
        usage,
        model,
        finishReason: response.stop_reason,
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
      const model = config.model || 'claude-3-5-sonnet-20241022';
      const messages: AnthropicMessage[] = [
        { role: 'user', content: prompt }
      ];

      const stream = this.anthropic.messages.stream({
        model,
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        messages,
        system: config.systemMessage
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          yield {
            chunk: chunk.delta.text,
            done: false
          };
        } else if (chunk.type === 'message_stop') {
          yield {
            chunk: '',
            done: true,
            usage: chunk.usage ? {
              promptTokens: chunk.usage.input_tokens,
              completionTokens: chunk.usage.output_tokens,
              totalTokens: chunk.usage.input_tokens + chunk.usage.output_tokens
            } : undefined
          };
        }
      }
    } catch (error) {
      throw this.createAIError(error, 'Text streaming failed');
    }
  }

  async chat(messages: ChatMessage[], config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'claude-3-5-sonnet-20241022';
      
      // Convert ChatMessage format to Anthropic format
      const anthropicMessages: AnthropicMessage[] = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));

      // Extract system message
      const systemMessage = messages.find(msg => msg.role === 'system')?.content || config.systemMessage;

      const response = await this.anthropic.messages.create({
        model,
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        messages: anthropicMessages,
        system: systemMessage
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      };

      return {
        success: true,
        data: response.content[0]?.text || '',
        usage,
        model,
        finishReason: response.stop_reason,
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
      ? `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide clean, well-documented code with proper error handling.`
      : `Generate code for the following requirement:\n\n${prompt}\n\nProvide clean, well-documented code with proper error handling.`;
    
    return this.generateText(codePrompt, { 
      ...config, 
      systemMessage: 'You are a senior software engineer with expertise in clean code principles, design patterns, and best practices. Generate production-ready code with proper documentation and error handling.' 
    });
  }

  async createEmbedding(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>> {
    // Anthropic doesn't provide embedding models directly
    // In a real implementation, you might use a different service or method
    throw new Error('Anthropic does not provide embedding models. Consider using OpenAI or other providers for embeddings.');
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<AIResponse<DocumentAnalysisResponse>> {
    let prompt = `Analyze the following ${request.type || 'text'} document with careful attention to detail:\n\n${request.content}\n\n`;
    
    switch (request.task) {
      case 'summarize':
        prompt += 'Provide a comprehensive summary that captures all key points, main arguments, and important details.';
        break;
      case 'extract':
        prompt += `Extract information as requested: ${request.instructions || 'Extract all key entities, dates, facts, and important details in a structured format'}`;
        break;
      case 'classify':
        prompt += `Classify this document: ${request.instructions || 'Determine the document type, category, and main subject matter'}`;
        break;
      default:
        prompt += request.instructions || 'Provide a thorough analysis including key themes, important insights, potential implications, and any notable patterns or anomalies.';
    }

    const systemMessage = `You are an expert document analyst with advanced reasoning capabilities. Analyze documents thoroughly and accurately, paying attention to nuance, context, and implicit information. Provide detailed, well-structured analysis.`;

    const response = await this.generateText(prompt, { ...request, systemMessage });
    
    if (response.success) {
      return {
        ...response,
        data: {
          result: response.data || '',
          confidence: 0.9, // Claude typically provides high-quality analysis
          metadata: {
            documentType: request.type,
            task: request.task,
            analysisMethod: 'constitutional_ai'
          },
          usage: response.usage
        }
      };
    }
    
    return response as any;
  }

  async summarize(text: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const prompt = `Create a comprehensive yet concise summary of the following text. Capture all key points, main arguments, and important details while maintaining clarity and readability:\n\n${text}`;
    
    return this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are an expert at creating clear, accurate, and comprehensive summaries. Focus on capturing the essence and key information while being concise.' 
    });
  }

  async extractData(text: string, schema: Record<string, any>, config: Partial<AIModelConfig> = {}): Promise<AIResponse<any>> {
    const prompt = `Extract structured data from the following text according to the specified schema. Be thorough and accurate in your extraction.\n\nSchema: ${JSON.stringify(schema, null, 2)}\n\nText: ${text}\n\nReturn the extracted data as valid JSON that matches the schema structure.`;
    
    const response = await this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are a data extraction expert. Extract information carefully and accurately, ensuring the output matches the required schema. Return only valid JSON.' 
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
    const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}\n\nText: ${text}\n\nAnalyze the content carefully and return only the most appropriate category name.`;
    
    return this.generateText(prompt, { 
      ...config, 
      systemMessage: 'You are a text classification expert. Analyze text carefully to determine the most appropriate category based on content, context, and meaning.' 
    });
  }

  async analyzeImage(imageUrl: string, prompt?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const model = config.model || 'claude-3-5-sonnet-20241022';
      
      // Claude 3 supports vision
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this image in detail and describe what you see.'
            },
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            }
          ]
        }
      ];

      const response = await this.anthropic.messages.create({
        model,
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        messages
      });

      const usage: AIUsageInfo = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      };

      return {
        success: true,
        data: response.content[0]?.text || '',
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
    return Object.keys(this.modelCapabilities);
  }

  async getContextWindow(model: string = 'claude-3-5-sonnet-20241022'): Promise<ContextWindow> {
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

  async getTokenCount(text: string, model: string = 'claude-3-5-sonnet-20241022'): Promise<number> {
    // Rough estimation - Anthropic uses a different tokenizer
    return Math.ceil(text.length / 3.5);
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

    if (error.type === 'authentication_error' || statusCode === 401) {
      code = AIErrorCode.INVALID_API_KEY;
    } else if (error.type === 'rate_limit_error' || statusCode === 429) {
      code = AIErrorCode.RATE_LIMIT_EXCEEDED;
      retryable = true;
    } else if (error.type === 'invalid_request_error' && error.message?.includes('max_tokens')) {
      code = AIErrorCode.CONTEXT_LENGTH_EXCEEDED;
    } else if (error.type === 'not_found_error' || statusCode === 404) {
      code = AIErrorCode.MODEL_NOT_FOUND;
    } else if (error.type === 'overloaded_error' || statusCode >= 500) {
      retryable = true;
    }

    const aiError = new Error(`${context}: ${error.message}`) as AIError;
    aiError.code = code;
    aiError.statusCode = statusCode;
    aiError.retryable = retryable;
    
    return aiError;
  }
}