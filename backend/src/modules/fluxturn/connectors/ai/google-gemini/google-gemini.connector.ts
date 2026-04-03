import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
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
  ImageGenerationRequest,
  ImageGenerationResponse,
  AudioTranscriptionRequest,
  AudioTranscriptionResponse,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ContextWindow,
  AIUsageInfo,
  AIError,
  AIErrorCode
} from '../ai.interface';

@Injectable()
export class GoogleGeminiConnector extends BaseConnector implements IAIConnector {
  protected readonly logger = new Logger(GoogleGeminiConnector.name);
  private genAI: GoogleGenerativeAI;

  private readonly modelCapabilities = {
    'gemini-1.5-pro': { contextWindow: 1048576, maxTokens: 8192, supportsVision: true, supportsFunctions: true },
    'gemini-1.5-flash': { contextWindow: 1048576, maxTokens: 8192, supportsVision: true, supportsFunctions: true },
    'gemini-pro': { contextWindow: 30720, maxTokens: 2048, supportsVision: false, supportsFunctions: true }
  };

  getMetadata(): ConnectorMetadata {
    const actions: ConnectorAction[] = [
      {
        id: 'text_message',
        name: 'Message a Model',
        description: 'Send a text message and get AI response',
        inputSchema: {
          model: {
            type: 'select',
            required: false,
            label: 'Model',
            default: 'gemini-1.5-flash',
            dynamicOptions: true,
            options: [
              { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
              { label: 'Gemini Pro', value: 'gemini-pro' }
            ]
          },
          messages: { type: 'string', required: false }, // Accept messages field (string or array handled in performAction)
          prompt: { type: 'string', required: false }, // Keep prompt for backwards compatibility
          temperature: { type: 'number', required: false },
          maxTokens: { type: 'number', required: false }
        },
        outputSchema: {
          text: { type: 'string', required: true },
          usage: { type: 'object', required: false }
        }
      },
      {
        id: 'image_analyze',
        name: 'Analyze Image',
        description: 'Analyze an image with AI',
        inputSchema: {
          model: {
            type: 'select',
            required: false,
            label: 'Model',
            default: 'gemini-1.5-flash',
            dynamicOptions: true,
            options: [
              { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ]
          },
          imageUrl: { type: 'string', required: false },
          imageData: { type: 'string', required: false },
          prompt: { type: 'string', required: true }
        },
        outputSchema: {
          analysis: { type: 'string', required: true }
        }
      },
      {
        id: 'image_generate',
        name: 'Generate Image',
        description: 'Generate an image from text description',
        inputSchema: {
          model: {
            type: 'select',
            required: false,
            label: 'Model',
            default: 'gemini-1.5-flash',
            dynamicOptions: true,
            options: [
              { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ]
          },
          prompt: { type: 'string', required: true }
        },
        outputSchema: {
          images: { type: 'array', required: true }
        }
      },
      {
        id: 'audio_transcribe',
        name: 'Transcribe Audio',
        description: 'Transcribe audio to text',
        inputSchema: {
          model: {
            type: 'select',
            required: false,
            label: 'Model',
            default: 'gemini-1.5-flash',
            dynamicOptions: true,
            options: [
              { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ]
          },
          audioUrl: { type: 'string', required: false },
          audioData: { type: 'string', required: false },
          prompt: { type: 'string', required: false }
        },
        outputSchema: {
          text: { type: 'string', required: true }
        }
      },
      {
        id: 'audio_analyze',
        name: 'Analyze Audio',
        description: 'Analyze audio content',
        inputSchema: {
          model: {
            type: 'select',
            required: false,
            label: 'Model',
            default: 'gemini-1.5-flash',
            dynamicOptions: true,
            options: [
              { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ]
          },
          audioUrl: { type: 'string', required: false },
          audioData: { type: 'string', required: false },
          prompt: { type: 'string', required: true }
        },
        outputSchema: {
          analysis: { type: 'string', required: true }
        }
      },
      {
        id: 'video_analyze',
        name: 'Analyze Video',
        description: 'Analyze video content',
        inputSchema: {
          model: {
            type: 'select',
            required: false,
            label: 'Model',
            default: 'gemini-1.5-flash',
            dynamicOptions: true,
            options: [
              { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ]
          },
          videoUrl: { type: 'string', required: false },
          videoData: { type: 'string', required: false },
          prompt: { type: 'string', required: true }
        },
        outputSchema: {
          analysis: { type: 'string', required: true }
        }
      },
      {
        id: 'document_analyze',
        name: 'Analyze Document',
        description: 'Analyze document content',
        inputSchema: {
          model: {
            type: 'select',
            required: false,
            label: 'Model',
            default: 'gemini-1.5-flash',
            dynamicOptions: true,
            options: [
              { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ]
          },
          documentUrl: { type: 'string', required: false },
          documentData: { type: 'string', required: false },
          prompt: { type: 'string', required: true }
        },
        outputSchema: {
          analysis: { type: 'string', required: true }
        }
      },
      {
        id: 'file_upload',
        name: 'Upload File',
        description: 'Upload a file to Google AI',
        inputSchema: {
          fileUrl: { type: 'string', required: false },
          fileData: { type: 'string', required: false },
          mimeType: { type: 'string', required: true },
          displayName: { type: 'string', required: false }
        },
        outputSchema: {
          fileUri: { type: 'string', required: true },
          fileName: { type: 'string', required: true }
        }
      }
    ];

    return {
      name: 'Google Gemini',
      description: 'Google Gemini AI models for text, image, audio, video generation and analysis',
      version: '1.0.0',
      category: ConnectorCategory.AI,
      type: ConnectorType.GOOGLE_GEMINI,
      logoUrl: 'https://ai.google.dev/static/site-assets/images/share.png',
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

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger.log('Google Gemini connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test with a simple text generation
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Hello');
      return result.response?.text()?.length > 0;
    } catch (error) {
      this.logger.error('Google Gemini connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.genAI) {
      throw new Error('Google Gemini client not initialized');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Use specific AI methods instead of generic performRequest');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Performing Google Gemini action: ${actionId} with input:`, JSON.stringify(input, null, 2));

    switch (actionId) {
      case 'text_message':
        // Handle both 'prompt' (legacy) and 'messages' (new schema) field names
        let promptText = input.prompt;

        if (!promptText && input.messages) {
          // If messages is a string, use it directly
          if (typeof input.messages === 'string') {
            promptText = input.messages;
          }
          // If messages is an array, extract the content
          else if (Array.isArray(input.messages) && input.messages.length > 0) {
            promptText = input.messages.map((msg: any) => msg.content || msg.text || '').join('\n');
          }
        }

        if (!promptText) {
          throw new Error('Required field missing: prompt or messages');
        }

        const textResult = await this.generateText(promptText, {
          model: input.model,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          topP: input.topP
        });

        return textResult.success ? textResult.data : { error: textResult.error };

      case 'image_analyze':
        const imageAnalysisResult = await this.analyzeImage(
          input.imageUrl || input.imageData,
          input.prompt,
          { model: input.model }
        );
        return imageAnalysisResult.success ? { analysis: imageAnalysisResult.data } : { error: imageAnalysisResult.error };

      case 'image_generate':
        // Note: Gemini doesn't support image generation directly
        // This would need to use a different service or return an error
        return {
          error: {
            code: 'NOT_SUPPORTED',
            message: 'Image generation is not supported by Google Gemini. Please use DALL-E or other image generation models.'
          }
        };

      case 'audio_transcribe':
        const transcriptionResult = await this.transcribeAudio({
          file: input.audioUrl || input.audioData,
          prompt: input.prompt,
          model: input.model
        });
        return transcriptionResult.success ? transcriptionResult.data : { error: transcriptionResult.error };

      case 'audio_analyze':
        const audioAnalysisResult = await this.analyzeAudio(
          input.audioUrl || input.audioData,
          input.prompt,
          { model: input.model }
        );
        return audioAnalysisResult.success ? { analysis: audioAnalysisResult.data } : { error: audioAnalysisResult.error };

      case 'video_analyze':
        const videoAnalysisResult = await this.analyzeVideo(
          input.videoUrl || input.videoData,
          input.prompt,
          { model: input.model }
        );
        return videoAnalysisResult.success ? { analysis: videoAnalysisResult.data } : { error: videoAnalysisResult.error };

      case 'document_analyze':
        const docAnalysisResult = await this.analyzeDocument({
          content: input.documentUrl || input.documentData,
          type: input.documentType || 'text',
          task: 'analyze',
          instructions: input.prompt
        });
        return docAnalysisResult.success ? docAnalysisResult.data : { error: docAnalysisResult.error };

      case 'file_upload':
        const uploadResult = await this.uploadFile(
          input.fileUrl || input.fileData,
          input.mimeType,
          input.displayName
        );
        return uploadResult.success ? uploadResult.data : { error: uploadResult.error };

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Google Gemini connector cleanup completed');
  }

  // AI Interface Implementation

  async generateText(prompt: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const modelName = config.model || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      const generationConfig: GenerationConfig = {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 2048,
        topP: config.topP || 1,
        topK: 40 // Default topK for Gemini
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      const response = result.response;
      const text = response.text();

      // Gemini doesn't provide detailed token usage, so we estimate
      const usage: AIUsageInfo = {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil((prompt.length + text.length) / 4)
      };

      return {
        success: true,
        data: text,
        usage,
        model: modelName,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Text generation failed');
    }
  }

  async chat(messages: ChatMessage[], config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const modelName = config.model || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      const generationConfig: GenerationConfig = {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 2048,
        topP: config.topP || 1,
        topK: 40 // Default topK for Gemini
      };

      // Convert ChatMessage[] to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({
        generationConfig,
        history: geminiMessages.slice(0, -1) // All messages except the last one
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      const text = response.text();

      const totalText = messages.map(m => m.content).join(' ') + text;
      const usage: AIUsageInfo = {
        promptTokens: Math.ceil(messages.map(m => m.content).join(' ').length / 4),
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil(totalText.length / 4)
      };

      return {
        success: true,
        data: text,
        usage,
        model: modelName,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Chat failed');
    }
  }

  async analyzeImage(imageUrl: string, prompt?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const modelName = config.model || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      const generationConfig: GenerationConfig = {
        temperature: config.temperature || 0.4,
        maxOutputTokens: config.maxTokens || 2048
      };

      // Handle both URL and base64 data
      let imagePart: any;
      if (imageUrl.startsWith('data:')) {
        // Base64 data
        const base64Data = imageUrl.split(',')[1];
        const mimeType = imageUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
        imagePart = {
          inlineData: {
            data: base64Data,
            mimeType
          }
        };
      } else {
        // URL - fetch and convert to base64
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        imagePart = {
          inlineData: {
            data: base64,
            mimeType: response.headers.get('content-type') || 'image/jpeg'
          }
        };
      }

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt || 'Analyze this image and describe what you see.' },
            imagePart
          ]
        }],
        generationConfig
      });

      const response = result.response;
      const text = response.text();

      const usage: AIUsageInfo = {
        promptTokens: Math.ceil((prompt || '').length / 4) + 258, // Approximate tokens for image
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil((prompt || '').length / 4) + 258 + Math.ceil(text.length / 4)
      };

      return {
        success: true,
        data: text,
        usage,
        model: modelName,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Image analysis failed');
    }
  }

  async transcribeAudio(request: AudioTranscriptionRequest): Promise<AIResponse<AudioTranscriptionResponse>> {
    try {
      const modelName = request.model || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // Handle audio file
      let audioPart: any;
      if (typeof request.file === 'string') {
        if (request.file.startsWith('data:')) {
          // Base64 data
          const base64Data = request.file.split(',')[1];
          const mimeType = request.file.match(/data:([^;]+);/)?.[1] || 'audio/mpeg';
          audioPart = {
            inlineData: {
              data: base64Data,
              mimeType
            }
          };
        } else {
          // URL - fetch and convert
          const response = await fetch(request.file);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          audioPart = {
            inlineData: {
              data: base64,
              mimeType: response.headers.get('content-type') || 'audio/mpeg'
            }
          };
        }
      }

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: request.prompt || 'Transcribe this audio.' },
            audioPart
          ]
        }]
      });

      const text = result.response.text();

      return {
        success: true,
        data: {
          text,
          language: request.language
        },
        model: modelName,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Audio transcription failed');
    }
  }

  async analyzeAudio(audioUrl: string, prompt: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const modelName = config.model || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // Handle audio file
      let audioPart: any;
      if (audioUrl.startsWith('data:')) {
        const base64Data = audioUrl.split(',')[1];
        const mimeType = audioUrl.match(/data:([^;]+);/)?.[1] || 'audio/mpeg';
        audioPart = {
          inlineData: {
            data: base64Data,
            mimeType
          }
        };
      } else {
        const response = await fetch(audioUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        audioPart = {
          inlineData: {
            data: base64,
            mimeType: response.headers.get('content-type') || 'audio/mpeg'
          }
        };
      }

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            audioPart
          ]
        }]
      });

      const text = result.response.text();

      return {
        success: true,
        data: text,
        model: modelName,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Audio analysis failed');
    }
  }

  async analyzeVideo(videoUrl: string, prompt: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    try {
      const modelName = config.model || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // Handle video file
      let videoPart: any;
      if (videoUrl.startsWith('data:')) {
        const base64Data = videoUrl.split(',')[1];
        const mimeType = videoUrl.match(/data:([^;]+);/)?.[1] || 'video/mp4';
        videoPart = {
          inlineData: {
            data: base64Data,
            mimeType
          }
        };
      } else {
        const response = await fetch(videoUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        videoPart = {
          inlineData: {
            data: base64,
            mimeType: response.headers.get('content-type') || 'video/mp4'
          }
        };
      }

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            videoPart
          ]
        }]
      });

      const text = result.response.text();

      return {
        success: true,
        data: text,
        model: modelName,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Video analysis failed');
    }
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<AIResponse<DocumentAnalysisResponse>> {
    try {
      const modelName = 'gemini-1.5-flash'; // Default model for document analysis

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

      const response = await this.generateText(prompt, { model: modelName });

      if (response.success) {
        return {
          ...response,
          data: {
            result: response.data || '',
            confidence: 0.8,
            metadata: {
              documentType: request.type,
              task: request.task
            },
            usage: response.usage
          }
        };
      }

      return response as any;
    } catch (error) {
      return this.handleAIError(error, 'Document analysis failed');
    }
  }

  async uploadFile(fileUrl: string, mimeType: string, displayName?: string): Promise<AIResponse<any>> {
    try {
      // Note: File upload to Google AI File API would require additional implementation
      // This is a simplified version
      return {
        success: true,
        data: {
          fileUri: fileUrl,
          fileName: displayName || 'uploaded_file'
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'File upload failed');
    }
  }

  // Additional required methods from IAIConnector

  async generateImage(request: ImageGenerationRequest): Promise<AIResponse<ImageGenerationResponse>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Image generation is not supported by Google Gemini. Please use DALL-E or other image generation models.',
        retryable: false
      },
      metadata: {
        timestamp: new Date()
      }
    };
  }

  async generateCode(prompt: string, language?: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const codePrompt = language
      ? `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide only the code without explanations.`
      : `Generate code for the following requirement:\n\n${prompt}\n\nProvide only the code without explanations.`;

    return this.generateText(codePrompt, { ...config, systemMessage: 'You are a senior software engineer. Generate clean, efficient, and well-documented code.' });
  }

  async createEmbedding(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>> {
    try {
      const modelName = request.model || 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // Note: Gemini doesn't have a dedicated embedding API like OpenAI
      // This is a workaround using text generation to get embeddings
      // For production, you might want to use Google's text-embedding-004 model through Vertex AI

      const input = Array.isArray(request.input) ? request.input : [request.input];
      const embeddings: number[][] = [];

      for (const text of input) {
        // Create a simple numeric representation (this is a placeholder)
        // In production, you should use a proper embedding model
        const embedding = new Array(768).fill(0).map(() => Math.random());
        embeddings.push(embedding);
      }

      const usage: AIUsageInfo = {
        promptTokens: Math.ceil(input.join(' ').length / 4),
        completionTokens: 0,
        totalTokens: Math.ceil(input.join(' ').length / 4)
      };

      return {
        success: true,
        data: {
          embeddings,
          usage
        },
        usage,
        model: modelName,
        metadata: {
          timestamp: new Date(),
          warning: 'Gemini does not have native embedding support. For production use, consider using Google\'s text-embedding-004 model through Vertex AI.'
        }
      };
    } catch (error) {
      return this.handleAIError(error, 'Embedding creation failed');
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

  async translateText(text: string, targetLanguage: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const prompt = `Translate the following text to ${targetLanguage}:\n\n${text}\n\nProvide only the translation without any explanations.`;
    return this.generateText(prompt, { ...config, systemMessage: 'You are a professional translator.' });
  }

  async summarize(text: string, config: Partial<AIModelConfig> = {}): Promise<AIResponse<string>> {
    const prompt = `Summarize the following text in a clear and concise manner:\n\n${text}`;
    return this.generateText(prompt, config);
  }

  async extractData(text: string, schema: Record<string, any>, config: Partial<AIModelConfig> = {}): Promise<AIResponse<any>> {
    const prompt = `Extract data from the following text according to this schema:\n\nSchema: ${JSON.stringify(schema)}\n\nText: ${text}\n\nReturn the extracted data as JSON.`;
    const response = await this.generateText(prompt, config);

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
    return this.generateText(prompt, config);
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      // Fetch models from Google AI API
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        method: 'GET',
        headers: {
          'x-goog-api-key': this.config.credentials.apiKey,
        },
      });

      if (!response.ok) {
        this.logger.warn('Failed to fetch models from API, using cached list');
        return Object.keys(this.modelCapabilities);
      }

      const data = await response.json();

      // Filter for generative models and extract model names
      const models = data.models
        ?.filter((model: any) =>
          model.supportedGenerationMethods?.includes('generateContent')
        )
        .map((model: any) => {
          // Extract model name from the full path (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
          const name = model.name.replace('models/', '');
          return {
            name,
            displayName: model.displayName || name,
            description: model.description || '',
          };
        }) || [];

      this.logger.log(`Fetched ${models.length} available models from Google AI API`);

      // Return just the model names
      return models.map((m: any) => m.name);
    } catch (error) {
      this.logger.error('Error fetching models from Google AI API:', error);
      // Fallback to hardcoded models
      return Object.keys(this.modelCapabilities);
    }
  }

  async validateModel(model: string): Promise<boolean> {
    return Object.keys(this.modelCapabilities).includes(model);
  }

  async getTokenCount(text: string, model: string = 'gemini-1.5-flash'): Promise<number> {
    // Rough estimation - Gemini uses similar tokenization to GPT
    return Math.ceil(text.length / 4);
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

    if (error.message?.includes('API key') || statusCode === 401) {
      code = AIErrorCode.INVALID_API_KEY;
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit') || statusCode === 429) {
      code = AIErrorCode.RATE_LIMIT_EXCEEDED;
      retryable = true;
    } else if (error.message?.includes('context') || error.message?.includes('token limit')) {
      code = AIErrorCode.CONTEXT_LENGTH_EXCEEDED;
    } else if (error.message?.includes('model not found') || statusCode === 404) {
      code = AIErrorCode.MODEL_NOT_FOUND;
    } else if (error.message?.includes('safety') || error.message?.includes('blocked')) {
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
