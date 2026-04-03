import { Request } from 'express';
import { ConnectorResponse } from '../types';

export interface AIModelConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemMessage?: string;
}

export interface AIUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface AIResponse<T = any> extends ConnectorResponse<T> {
  usage?: AIUsageInfo;
  model?: string;
  finishReason?: string;
}

export interface StreamResponse {
  chunk: string;
  done: boolean;
  usage?: AIUsageInfo;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage?: AIUsageInfo;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  n?: number;
  style?: string;
}

export interface ImageGenerationResponse {
  images: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  usage?: AIUsageInfo;
}

export interface AudioTranscriptionRequest {
  file: Buffer | string;
  model?: string;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface AudioTranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  usage?: AIUsageInfo;
}

export interface ModerationRequest {
  input: string | string[];
  model?: string;
}

export interface ModerationResponse {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
  usage?: AIUsageInfo;
}

export interface FunctionCall {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: FunctionCall;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  functions?: FunctionCall[];
  function_call?: 'auto' | 'none' | { name: string };
  stream?: boolean;
}

export interface DocumentAnalysisRequest {
  content: string;
  type?: 'text' | 'pdf' | 'html' | 'markdown';
  task?: 'summarize' | 'extract' | 'classify' | 'analyze';
  instructions?: string;
}

export interface DocumentAnalysisResponse {
  result: string;
  confidence?: number;
  metadata?: Record<string, any>;
  usage?: AIUsageInfo;
}

export interface ContextWindow {
  size: number;
  used: number;
  remaining: number;
}

export interface IAIConnector {
  // Text Generation
  generateText(prompt: string, config?: AIModelConfig): Promise<AIResponse<string>>;
  streamText?(prompt: string, config?: AIModelConfig): AsyncIterable<StreamResponse>;
  
  // Chat/Conversation
  chat(messages: ChatMessage[], config?: AIModelConfig): Promise<AIResponse<string>>;
  streamChat?(messages: ChatMessage[], config?: AIModelConfig): AsyncIterable<StreamResponse>;
  
  // Code Generation
  generateCode(prompt: string, language?: string, config?: AIModelConfig): Promise<AIResponse<string>>;
  
  // Embeddings
  createEmbedding(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>>;
  
  // Image Generation (if supported)
  generateImage?(request: ImageGenerationRequest): Promise<AIResponse<ImageGenerationResponse>>;
  
  // Audio Processing (if supported)
  transcribeAudio?(request: AudioTranscriptionRequest): Promise<AIResponse<AudioTranscriptionResponse>>;
  translateText?(text: string, targetLanguage: string, config?: AIModelConfig): Promise<AIResponse<string>>;
  
  // Content Moderation (if supported)
  moderateContent?(request: ModerationRequest): Promise<AIResponse<ModerationResponse>>;
  
  // Document Analysis
  analyzeDocument?(request: DocumentAnalysisRequest): Promise<AIResponse<DocumentAnalysisResponse>>;
  summarize?(text: string, config?: AIModelConfig): Promise<AIResponse<string>>;
  extractData?(text: string, schema: Record<string, any>, config?: AIModelConfig): Promise<AIResponse<any>>;
  classifyText?(text: string, categories: string[], config?: AIModelConfig): Promise<AIResponse<string>>;
  
  // Multi-modal capabilities (if supported)
  analyzeImage?(imageUrl: string, prompt?: string, config?: AIModelConfig): Promise<AIResponse<string>>;
  generateSpeech?(text: string, voice?: string, config?: AIModelConfig): Promise<AIResponse<Buffer>>;
  
  // Utility methods
  getAvailableModels(): Promise<string[]>;
  getContextWindow(model?: string): Promise<ContextWindow>;
  getTokenCount(text: string, model?: string): Promise<number>;
  validateModel(model: string): Promise<boolean>;
  
  // Conversation management
  createConversation?(): Promise<string>;
  addToConversation?(conversationId: string, message: ChatMessage): Promise<void>;
  getConversation?(conversationId: string): Promise<ChatMessage[]>;
  clearConversation?(conversationId: string): Promise<void>;
}

export interface AIModelCapabilities {
  textGeneration: boolean;
  codeGeneration: boolean;
  imageGeneration: boolean;
  imageAnalysis: boolean;
  audioTranscription: boolean;
  audioGeneration: boolean;
  embeddings: boolean;
  functionCalling: boolean;
  streaming: boolean;
  multimodal: boolean;
  contextWindow: number;
  maxTokens: number;
  supportedLanguages?: string[];
  supportedFormats?: string[];
}

export interface AIProviderInfo {
  name: string;
  version: string;
  models: Array<{
    id: string;
    name: string;
    description?: string;
    capabilities: AIModelCapabilities;
    pricing?: {
      inputCost: number;
      outputCost: number;
      unit: string;
    };
  }>;
  defaultModel: string;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay?: number;
  };
}

export enum AIErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  CONTENT_FILTER_TRIGGERED = 'CONTENT_FILTER_TRIGGERED',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  INVALID_REQUEST = 'INVALID_REQUEST',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT'
}

export interface AIError extends Error {
  code: AIErrorCode;
  statusCode?: number;
  retryable: boolean;
  usage?: AIUsageInfo;
}