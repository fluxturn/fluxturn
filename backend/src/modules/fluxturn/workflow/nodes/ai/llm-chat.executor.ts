import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Provider-specific API configuration
 */
interface ProviderConfig {
  url: (model: string) => string;
  headers: (apiKey: string) => Record<string, string>;
  buildBody: (opts: LLMRequestOptions) => any;
  extractResult: (data: any) => LLMResult;
}

interface LLMRequestOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  jsonMode: boolean;
}

interface LLMResult {
  text: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * LLM Chat Executor
 *
 * Calls an AI model (OpenAI, Anthropic, Gemini, Ollama) to process text.
 * Supports {{input}} and {{input.field}} template interpolation in the user prompt.
 */
@Injectable()
export class LLMChatExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['LLM_CHAT'];

  constructor() {
    super();
  }

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];

    const provider: string = config.provider || 'openai';
    const model: string = config.model || 'gpt-4o-mini';
    const systemPrompt: string = config.systemPrompt || 'You are a helpful assistant.';
    const userPromptTemplate: string = config.userPrompt || '{{input}}';
    const temperature: number = config.temperature ?? 0.7;
    const maxTokens: number = config.maxTokens ?? 2000;
    const jsonMode: boolean = config.jsonMode ?? false;

    // Resolve the API key for the selected provider
    const apiKey = this.getApiKey(provider, context);

    // Get the provider configuration
    const providerConfig = this.getProviderConfig(provider);

    // Process each input item
    for (const item of inputData) {
      const inputPayload = item.json ?? item;

      // Template the user prompt
      const userPrompt = this.templatePrompt(userPromptTemplate, inputPayload);

      const requestOpts: LLMRequestOptions = {
        model,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
        jsonMode,
      };

      try {
        const url = providerConfig.url(model);
        const headers = providerConfig.headers(apiKey);
        const body = providerConfig.buildBody(requestOpts);

        this.logger.log(`Calling ${provider} model ${model}`);

        const response = await axios.post(url, body, {
          headers,
          timeout: 120_000,
        });

        const result = providerConfig.extractResult(response.data);

        // If jsonMode, try to parse the response text as JSON
        let output: any = {
          text: result.text,
          model: result.model,
          usage: result.usage,
        };

        if (jsonMode) {
          try {
            output.text = JSON.parse(result.text);
          } catch {
            // Keep raw text if parsing fails
            this.logger.warn('jsonMode enabled but response is not valid JSON, returning raw text');
          }
        }

        results.push({ json: output });
      } catch (error: any) {
        const message =
          error.response?.data?.error?.message ||
          error.response?.data?.error ||
          error.message ||
          'Unknown LLM API error';

        this.logger.error(`LLM call failed (${provider}/${model}): ${message}`);
        throw new Error(
          `LLM node "${node.data?.label || node.id}" failed: ${message}`,
        );
      }
    }

    return results;
  }

  validate(node: NodeData): string[] {
    const errors: string[] = [];
    const config = node.data || {};

    if (!config.userPrompt) {
      errors.push('User Prompt is required');
    }

    const validProviders = ['openai', 'anthropic', 'gemini', 'ollama'];
    if (config.provider && !validProviders.includes(config.provider)) {
      errors.push(`Invalid provider: ${config.provider}. Must be one of: ${validProviders.join(', ')}`);
    }

    return errors;
  }

  // ====== Private helpers ======

  /**
   * Replace {{input}} and {{input.field.nested}} in the prompt template
   */
  private templatePrompt(template: string, input: any): string {
    return template.replace(/\{\{input(?:\.([^}]+))?\}\}/g, (_match, path?: string) => {
      if (!path) {
        // {{input}} — stringify the whole input
        return typeof input === 'string' ? input : JSON.stringify(input);
      }
      // {{input.field.nested}} — dot-path access
      const value = this.getNestedValue(input, path);
      if (value === undefined || value === null) return '';
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  }

  /**
   * Resolve the API key for a provider from env or context
   */
  private getApiKey(provider: string, context: NodeExecutionContext): string {
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      gemini: 'GEMINI_API_KEY',
      ollama: '', // Ollama is local, no key needed
    };

    const envVar = envMap[provider];

    // Ollama doesn't need a key
    if (provider === 'ollama') return '';

    // Try context.$env, then process.env
    const key = context.$env?.[envVar] || process.env[envVar];
    if (!key) {
      throw new Error(
        `Missing API key for provider "${provider}". Set the ${envVar} environment variable.`,
      );
    }
    return key;
  }

  /**
   * Return provider-specific URL, headers, body builder, and result extractor
   */
  private getProviderConfig(provider: string): ProviderConfig {
    switch (provider) {
      case 'openai':
        return {
          url: () => 'https://api.openai.com/v1/chat/completions',
          headers: (apiKey) => ({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          }),
          buildBody: (opts) => ({
            model: opts.model,
            messages: [
              { role: 'system', content: opts.systemPrompt },
              { role: 'user', content: opts.userPrompt },
            ],
            temperature: opts.temperature,
            max_tokens: opts.maxTokens,
            ...(opts.jsonMode && { response_format: { type: 'json_object' } }),
          }),
          extractResult: (data) => ({
            text: data.choices?.[0]?.message?.content ?? '',
            model: data.model ?? '',
            usage: {
              promptTokens: data.usage?.prompt_tokens ?? 0,
              completionTokens: data.usage?.completion_tokens ?? 0,
            },
          }),
        };

      case 'anthropic':
        return {
          url: () => 'https://api.anthropic.com/v1/messages',
          headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          }),
          buildBody: (opts) => ({
            model: opts.model,
            system: opts.systemPrompt,
            messages: [{ role: 'user', content: opts.userPrompt }],
            temperature: opts.temperature,
            max_tokens: opts.maxTokens,
          }),
          extractResult: (data) => ({
            text: data.content?.[0]?.text ?? '',
            model: data.model ?? '',
            usage: {
              promptTokens: data.usage?.input_tokens ?? 0,
              completionTokens: data.usage?.output_tokens ?? 0,
            },
          }),
        };

      case 'gemini':
        return {
          url: (model) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          }),
          buildBody: (opts) => ({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: opts.systemPrompt + '\n\n' + opts.userPrompt },
                ],
              },
            ],
            generationConfig: {
              temperature: opts.temperature,
              maxOutputTokens: opts.maxTokens,
              ...(opts.jsonMode && { responseMimeType: 'application/json' }),
            },
          }),
          extractResult: (data) => ({
            text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
            model: data.modelVersion ?? '',
            usage: {
              promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
              completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
            },
          }),
        };

      case 'ollama': {
        const baseUrl =
          process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        return {
          url: () => `${baseUrl}/v1/chat/completions`,
          headers: () => ({
            'Content-Type': 'application/json',
          }),
          buildBody: (opts) => ({
            model: opts.model,
            messages: [
              { role: 'system', content: opts.systemPrompt },
              { role: 'user', content: opts.userPrompt },
            ],
            temperature: opts.temperature,
            max_tokens: opts.maxTokens,
            ...(opts.jsonMode && { response_format: { type: 'json_object' } }),
          }),
          extractResult: (data) => ({
            text: data.choices?.[0]?.message?.content ?? '',
            model: data.model ?? '',
            usage: {
              promptTokens: data.usage?.prompt_tokens ?? 0,
              completionTokens: data.usage?.completion_tokens ?? 0,
            },
          }),
        };
      }

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
