import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class MediumConnector extends BaseConnector {
  private readonly baseUrl = 'https://api.medium.com/v1';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Medium',
      description: 'Publish and manage posts on Medium',
      version: '1.0.0',
      category: ConnectorCategory.CMS,
      type: ConnectorType.MEDIUM,
      authType: AuthType.BEARER_TOKEN,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Access token is required');
    }
    this.logger.log('Medium connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/me',
        headers: this.getAuthHeaders(),
      });
      return !!response;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const response = await this.apiUtils.executeRequest({
      method: request.method,
      endpoint: url,
      headers: request.headers || this.getAuthHeaders(),
      queryParams: request.queryParams,
      body: request.body,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Post
      case 'create_post':
        return await this.createPost(input);

      // Publication
      case 'get_all_publications':
        return await this.getAllPublications(input);

      // User
      case 'get_user':
        return await this.getUser();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Medium connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_post',
        name: 'Create Post',
        description: 'Create a new post on Medium',
        inputSchema: {
          publication: { type: 'boolean', required: false },
          publicationId: { type: 'string', required: false },
          title: { type: 'string', required: true },
          contentFormat: { type: 'string', required: true },
          content: { type: 'string', required: true },
          canonicalUrl: { type: 'string', required: false },
          tags: { type: 'string', required: false },
          publishStatus: { type: 'string', required: false },
          license: { type: 'string', required: false },
          notifyFollowers: { type: 'boolean', required: false },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'get_all_publications',
        name: 'Get All Publications',
        description: 'Get all publications for the authenticated user',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { publications: { type: 'array' } },
      },
      {
        id: 'get_user',
        name: 'Get User',
        description: 'Get authenticated user information',
        inputSchema: {},
        outputSchema: { user: { type: 'object' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // User Methods
  private async getUser(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/me',
      headers: this.getAuthHeaders(),
    });
  }

  // Post Methods
  private async createPost(data: any): Promise<any> {
    const {
      publication,
      publicationId,
      title,
      contentFormat,
      content,
      tags,
      canonicalUrl,
      publishStatus,
      license,
      notifyFollowers,
    } = data;

    // Build the request body
    const bodyRequest: any = {
      title,
      contentFormat,
      content,
      tags: [],
    };

    // Process tags if provided
    if (tags) {
      const tagArray = tags.split(',').map((tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag.length > 25) {
          throw new Error(
            `The tag "${trimmedTag}" is too long. Maximum length of a tag is 25 characters.`,
          );
        }
        return trimmedTag;
      });

      if (tagArray.length > 5) {
        throw new Error('Too many tags. Maximum 5 tags can be set.');
      }

      bodyRequest.tags = tagArray;
    }

    // Add optional fields
    if (canonicalUrl) {
      bodyRequest.canonicalUrl = canonicalUrl;
    }
    if (publishStatus) {
      bodyRequest.publishStatus = publishStatus;
    }
    if (license) {
      bodyRequest.license = license;
    }
    if (notifyFollowers !== undefined) {
      bodyRequest.notifyFollowers = notifyFollowers;
    }

    // Determine endpoint based on publication flag
    let endpoint: string;

    if (publication && publicationId) {
      // Post to publication
      endpoint = `/publications/${publicationId}/posts`;
    } else {
      // Post to user's own profile
      // First get the user ID
      const user = await this.getUser();
      const userId = user.data.id;
      endpoint = `/users/${userId}/posts`;
    }

    const response = await this.performRequest({
      method: 'POST',
      endpoint,
      headers: this.getAuthHeaders(),
      body: bodyRequest,
    });

    return response.data || response;
  }

  // Publication Methods
  private async getAllPublications(data: any): Promise<any> {
    const { returnAll = false, limit = 100 } = data;

    // Get user ID first
    const user = await this.getUser();
    const userId = user.data.id;

    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/users/${userId}/publications`,
      headers: this.getAuthHeaders(),
    });

    let publications = response.data || response;

    // Apply limit if not returning all
    if (!returnAll && Array.isArray(publications)) {
      publications = publications.slice(0, limit);
    }

    return publications;
  }
}
