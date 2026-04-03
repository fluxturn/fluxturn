import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
} from '../../types';

@Injectable()
export class DeepLConnector extends BaseConnector {
  protected readonly logger = new Logger(DeepLConnector.name);

  getMetadata(): ConnectorMetadata {
    return {
      name: 'DeepL',
      description: 'Translate text using DeepL translation API with support for 30+ languages',
      version: '1.0.0',
      category: ConnectorCategory.UTILITY,
      type: ConnectorType.DEEPL,
      authType: AuthType.API_KEY,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiKey) {
      throw new Error('DeepL API key is required');
    }
    this.logger.log('DeepL connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const result = await this.getUsage();
      return result.success;
    } catch (error) {
      this.logger.error('DeepL connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.apiKey) {
      throw new Error('API key not configured');
    }
  }

  private getBaseUrl(): string {
    const apiPlan = this.config.credentials?.apiPlan || 'pro';
    return apiPlan === 'pro'
      ? 'https://api.deepl.com/v2'
      : 'https://api-free.deepl.com/v2';
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${request.endpoint}`;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('auth_key', this.config.credentials.apiKey);

    if (request.queryParams) {
      Object.entries(request.queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const fullUrl = `${url}?${params.toString()}`;

    try {
      const response = await fetch(fullUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('DeepL API request failed', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'translate':
        return await this.translate(input);
      case 'get_usage':
        return await this.getUsage();
      case 'get_languages':
        return await this.getLanguages(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('DeepL connector cleanup completed');
  }

  // Action implementations
  private async translate(input: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        text: input.text,
        target_lang: input.translateTo,
      };

      // Handle source language
      if (input.sourceLang && input.sourceLang !== 'auto') {
        // DeepL uses 'EN' for both EN-GB and EN-US as source
        const sourceLang = ['EN-GB', 'EN-US'].includes(input.sourceLang)
          ? 'EN'
          : input.sourceLang;
        queryParams.source_lang = sourceLang;
      }

      // Handle split sentences
      if (input.splitSentences !== undefined) {
        queryParams.split_sentences = input.splitSentences;
      }

      // Handle preserve formatting
      if (input.preserveFormatting !== undefined) {
        queryParams.preserve_formatting = input.preserveFormatting;
      }

      // Handle formality
      if (input.formality && input.formality !== 'default') {
        queryParams.formality = input.formality;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/translate',
        queryParams,
      });

      const translation = response.translations?.[0];

      return {
        success: true,
        data: {
          detected_source_language: translation?.detected_source_language,
          text: translation?.text,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRANSLATION_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getUsage(): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/usage',
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_USAGE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getLanguages(input: any): Promise<ConnectorResponse> {
    try {
      const type = input.type || 'target';
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/languages',
        queryParams: { type },
      });

      return {
        success: true,
        data: { languages: response },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_LANGUAGES_FAILED',
          message: error.message,
        },
      };
    }
  }
}
