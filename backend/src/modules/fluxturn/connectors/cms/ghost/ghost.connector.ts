import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
import * as jwt from 'jsonwebtoken';

@Injectable()
export class GhostConnector extends BaseConnector {
  private client: AxiosInstance;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Ghost',
      description: 'Professional publishing platform for creating blogs and online publications',
      version: '1.0.0',
      category: ConnectorCategory.CMS,
      type: ConnectorType.GHOST,
      authType: AuthType.CUSTOM,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.url) {
      throw new Error('Ghost site URL is required');
    }
    if (!this.config.credentials?.apiKey) {
      throw new Error('API key is required');
    }
    if (!this.config.credentials?.source) {
      throw new Error('API source is required (contentApi or adminApi)');
    }
    this.logger.log('Ghost connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const source = this.config.credentials.source;
      const version = source === 'contentApi' ? 'v3' : 'v2';
      const apiPath = source === 'contentApi' ? 'content' : 'admin';

      // Test with a simple posts request
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.config.credentials.url}/ghost/api/${version}/${apiPath}/posts`,
        queryParams: { limit: 1 },
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
    const url = request.endpoint.startsWith('http')
      ? request.endpoint
      : `${this.config.credentials.url}${request.endpoint}`;

    const response = await axios({
      url,
      method: request.method,
      headers: request.headers || this.getAuthHeaders(),
      params: request.queryParams,
      data: request.body,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Post actions
      case 'get_post':
        return await this.getPost(input);
      case 'get_all_posts':
        return await this.getAllPosts(input);
      case 'create_post':
        return await this.createPost(input);
      case 'update_post':
        return await this.updatePost(input);
      case 'delete_post':
        return await this.deletePost(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Ghost connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    const source = this.config.credentials.source;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (source === 'adminApi') {
      // Admin API uses JWT authentication
      const [id, secret] = this.config.credentials.apiKey.split(':');
      const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
        keyid: id,
        algorithm: 'HS256',
        expiresIn: '5m',
        audience: '/v2/admin/',
      });
      headers['Authorization'] = `Ghost ${token}`;
    }
    // Content API authentication is handled via query parameter in the request

    return headers;
  }

  private getBaseUrl(): string {
    const source = this.config.credentials.source;
    const version = source === 'contentApi' ? 'v3' : 'v2';
    const apiPath = source === 'contentApi' ? 'content' : 'admin';
    return `${this.config.credentials.url}/ghost/api/${version}/${apiPath}`;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'get_post',
        name: 'Get Post',
        description: 'Get a single post by ID or slug',
        inputSchema: {
          by: { type: 'string', required: true },
          identifier: { type: 'string', required: true },
          fields: { type: 'string', required: false },
          formats: { type: 'array', required: false },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'get_all_posts',
        name: 'Get All Posts',
        description: 'Get multiple posts with filtering',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
          fields: { type: 'string', required: false },
          formats: { type: 'array', required: false },
          include: { type: 'array', required: false },
        },
        outputSchema: { posts: { type: 'array' } },
      },
      {
        id: 'create_post',
        name: 'Create Post',
        description: 'Create a new post',
        inputSchema: {
          title: { type: 'string', required: true },
          contentFormat: { type: 'string', required: true },
          content: { type: 'string', required: true },
          status: { type: 'string', required: false },
          slug: { type: 'string', required: false },
          featured: { type: 'boolean', required: false },
          authors: { type: 'array', required: false },
          tags: { type: 'array', required: false },
          canonical_url: { type: 'string', required: false },
          meta_title: { type: 'string', required: false },
          meta_description: { type: 'string', required: false },
          og_title: { type: 'string', required: false },
          og_description: { type: 'string', required: false },
          og_image: { type: 'string', required: false },
          twitter_title: { type: 'string', required: false },
          twitter_description: { type: 'string', required: false },
          twitter_image: { type: 'string', required: false },
          published_at: { type: 'string', required: false },
          codeinjection_head: { type: 'string', required: false },
          codeinjection_foot: { type: 'string', required: false },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'update_post',
        name: 'Update Post',
        description: 'Update an existing post',
        inputSchema: {
          postId: { type: 'string', required: true },
          contentFormat: { type: 'string', required: true },
          title: { type: 'string', required: false },
          content: { type: 'string', required: false },
          status: { type: 'string', required: false },
          slug: { type: 'string', required: false },
          featured: { type: 'boolean', required: false },
          authors: { type: 'array', required: false },
          tags: { type: 'array', required: false },
          canonical_url: { type: 'string', required: false },
          meta_title: { type: 'string', required: false },
          meta_description: { type: 'string', required: false },
          og_title: { type: 'string', required: false },
          og_description: { type: 'string', required: false },
          og_image: { type: 'string', required: false },
          twitter_title: { type: 'string', required: false },
          twitter_description: { type: 'string', required: false },
          twitter_image: { type: 'string', required: false },
          published_at: { type: 'string', required: false },
          codeinjection_head: { type: 'string', required: false },
          codeinjection_foot: { type: 'string', required: false },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'delete_post',
        name: 'Delete Post',
        description: 'Delete a post',
        inputSchema: {
          postId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Post Methods
  private async getPost(data: any): Promise<any> {
    const { by, identifier, fields, formats } = data;
    const baseUrl = this.getBaseUrl();

    let endpoint: string;
    if (by === 'slug') {
      endpoint = `${baseUrl}/posts/slug/${identifier}`;
    } else {
      endpoint = `${baseUrl}/posts/${identifier}`;
    }

    const queryParams: any = {};
    if (fields) queryParams.fields = fields;
    if (formats && Array.isArray(formats) && formats.length > 0) {
      queryParams.formats = formats.join(',');
    }

    // Add API key for Content API
    if (this.config.credentials.source === 'contentApi') {
      queryParams.key = this.config.credentials.apiKey;
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint,
      queryParams,
      headers: this.getAuthHeaders(),
    });

    return response.posts ? response.posts[0] : response;
  }

  private async getAllPosts(data: any): Promise<any> {
    const { returnAll, limit, fields, formats, include } = data;
    const baseUrl = this.getBaseUrl();

    const queryParams: any = {};

    if (fields) queryParams.fields = fields;
    if (formats && Array.isArray(formats) && formats.length > 0) {
      queryParams.formats = formats.join(',');
    }
    if (include && Array.isArray(include) && include.length > 0) {
      queryParams.include = include.join(',');
    }

    // Add API key for Content API
    if (this.config.credentials.source === 'contentApi') {
      queryParams.key = this.config.credentials.apiKey;
    }

    if (returnAll) {
      // Implement pagination to get all posts
      return await this.getAllPostsPaginated(baseUrl, queryParams);
    } else {
      queryParams.limit = limit || 50;
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${baseUrl}/posts`,
        queryParams,
        headers: this.getAuthHeaders(),
      });

      return response.posts;
    }
  }

  private async getAllPostsPaginated(baseUrl: string, queryParams: any): Promise<any> {
    const allPosts: any[] = [];
    let page = 1;
    let hasMore = true;

    queryParams.limit = 50;

    while (hasMore) {
      queryParams.page = page;

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${baseUrl}/posts`,
        queryParams,
        headers: this.getAuthHeaders(),
      });

      if (response.posts && response.posts.length > 0) {
        allPosts.push(...response.posts);
      }

      // Check if there are more pages
      hasMore = response.meta?.pagination?.next !== null;
      page++;
    }

    return allPosts;
  }

  private async createPost(data: any): Promise<any> {
    const {
      title,
      content,
      contentFormat,
      status,
      featured,
      slug,
      authors,
      tags,
      canonical_url,
      meta_title,
      meta_description,
      og_title,
      og_description,
      og_image,
      twitter_title,
      twitter_description,
      twitter_image,
      published_at,
      codeinjection_head,
      codeinjection_foot,
    } = data;

    const baseUrl = this.getBaseUrl();
    const post: any = { title };

    // Handle content format
    if (contentFormat === 'html') {
      post.html = content;
    } else if (contentFormat === 'lexical') {
      post.lexical = content;
    } else {
      post.mobiledoc = content;
    }

    // Add optional fields
    if (status) post.status = status;
    if (featured !== undefined) post.featured = featured;
    if (slug) post.slug = slug;
    if (authors) post.authors = authors;
    if (tags) post.tags = tags;
    if (canonical_url) post.canonical_url = canonical_url;
    if (meta_title) post.meta_title = meta_title;
    if (meta_description) post.meta_description = meta_description;
    if (og_title) post.og_title = og_title;
    if (og_description) post.og_description = og_description;
    if (og_image) post.og_image = og_image;
    if (twitter_title) post.twitter_title = twitter_title;
    if (twitter_description) post.twitter_description = twitter_description;
    if (twitter_image) post.twitter_image = twitter_image;
    if (published_at) post.published_at = published_at;
    if (codeinjection_head) post.codeinjection_head = codeinjection_head;
    if (codeinjection_foot) post.codeinjection_foot = codeinjection_foot;

    const queryParams: any = {};
    if (contentFormat === 'html') {
      queryParams.source = 'html';
    }

    const response = await this.performRequest({
      method: 'POST',
      endpoint: `${baseUrl}/posts`,
      queryParams,
      body: { posts: [post] },
      headers: this.getAuthHeaders(),
    });

    return response.posts ? response.posts[0] : response;
  }

  private async updatePost(data: any): Promise<any> {
    const {
      postId,
      title,
      content,
      contentFormat,
      status,
      featured,
      slug,
      authors,
      tags,
      canonical_url,
      meta_title,
      meta_description,
      og_title,
      og_description,
      og_image,
      twitter_title,
      twitter_description,
      twitter_image,
      published_at,
      codeinjection_head,
      codeinjection_foot,
    } = data;

    const baseUrl = this.getBaseUrl();
    const post: any = {};

    // Handle content format
    if (content) {
      if (contentFormat === 'html') {
        post.html = content;
      } else if (contentFormat === 'lexical') {
        post.lexical = content;
      } else {
        post.mobiledoc = content;
      }
    }

    // Add optional fields
    if (title) post.title = title;
    if (status) post.status = status;
    if (featured !== undefined) post.featured = featured;
    if (slug) post.slug = slug;
    if (authors) post.authors = authors;
    if (tags) post.tags = tags;
    if (canonical_url) post.canonical_url = canonical_url;
    if (meta_title) post.meta_title = meta_title;
    if (meta_description) post.meta_description = meta_description;
    if (og_title) post.og_title = og_title;
    if (og_description) post.og_description = og_description;
    if (og_image) post.og_image = og_image;
    if (twitter_title) post.twitter_title = twitter_title;
    if (twitter_description) post.twitter_description = twitter_description;
    if (twitter_image) post.twitter_image = twitter_image;
    if (published_at) post.published_at = published_at;
    if (codeinjection_head) post.codeinjection_head = codeinjection_head;
    if (codeinjection_foot) post.codeinjection_foot = codeinjection_foot;

    // Get current post to retrieve updated_at timestamp (required for updates)
    const currentPost = await this.performRequest({
      method: 'GET',
      endpoint: `${baseUrl}/posts/${postId}`,
      queryParams: { fields: 'id,updated_at' },
      headers: this.getAuthHeaders(),
    });

    post.updated_at = currentPost.posts[0].updated_at;

    const queryParams: any = {};
    if (contentFormat === 'html' && content) {
      queryParams.source = 'html';
    }

    const response = await this.performRequest({
      method: 'PUT',
      endpoint: `${baseUrl}/posts/${postId}`,
      queryParams,
      body: { posts: [post] },
      headers: this.getAuthHeaders(),
    });

    return response.posts ? response.posts[0] : response;
  }

  private async deletePost(data: any): Promise<any> {
    const { postId } = data;
    const baseUrl = this.getBaseUrl();

    await this.performRequest({
      method: 'DELETE',
      endpoint: `${baseUrl}/posts/${postId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }
}
