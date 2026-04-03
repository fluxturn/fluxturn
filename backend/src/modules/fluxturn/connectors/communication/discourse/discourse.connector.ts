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
export class DiscourseConnector extends BaseConnector {

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Discourse',
      description: 'Open source discussion platform and community forum',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.DISCOURSE,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.url) {
      throw new Error('URL is required');
    }
    if (!this.config.credentials?.apiKey) {
      throw new Error('API key is required');
    }
    if (!this.config.credentials?.username) {
      throw new Error('Username is required');
    }
    this.logger.log('Discourse connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/groups.json',
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
    const baseUrl = this.config.credentials.url.replace(/\/$/, '');
    const url = `${baseUrl}${request.endpoint}`;

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
      // Category
      case 'create_category':
        return await this.createCategory(input);
      case 'get_all_categories':
        return await this.getAllCategories(input);
      case 'update_category':
        return await this.updateCategory(input);

      // Group
      case 'create_group':
        return await this.createGroup(input);
      case 'get_group':
        return await this.getGroup(input);
      case 'get_all_groups':
        return await this.getAllGroups(input);
      case 'update_group':
        return await this.updateGroup(input);

      // Post
      case 'create_post':
        return await this.createPost(input);
      case 'get_post':
        return await this.getPost(input);
      case 'get_all_posts':
        return await this.getAllPosts(input);
      case 'update_post':
        return await this.updatePost(input);

      // User
      case 'create_user':
        return await this.createUser(input);
      case 'get_user':
        return await this.getUser(input);
      case 'get_all_users':
        return await this.getAllUsers(input);

      // User Group
      case 'add_user_to_group':
        return await this.addUserToGroup(input);
      case 'remove_user_from_group':
        return await this.removeUserFromGroup(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Discourse connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Api-Key': this.config.credentials.apiKey,
      'Api-Username': this.config.credentials.username,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Category Actions
      {
        id: 'create_category',
        name: 'Create Category',
        description: 'Create a new category',
        inputSchema: {
          name: { type: 'string', required: true },
          color: { type: 'string', required: true },
          textColor: { type: 'string', required: true },
        },
        outputSchema: { category: { type: 'object' } },
      },
      {
        id: 'get_all_categories',
        name: 'Get All Categories',
        description: 'Get all categories',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { categories: { type: 'array' } },
      },
      {
        id: 'update_category',
        name: 'Update Category',
        description: 'Update an existing category',
        inputSchema: {
          categoryId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          color: { type: 'string', required: false },
          textColor: { type: 'string', required: false },
        },
        outputSchema: { category: { type: 'object' } },
      },
      // Group Actions
      {
        id: 'create_group',
        name: 'Create Group',
        description: 'Create a new group',
        inputSchema: {
          name: { type: 'string', required: true },
        },
        outputSchema: { group: { type: 'object' } },
      },
      {
        id: 'get_group',
        name: 'Get Group',
        description: 'Get a specific group',
        inputSchema: {
          name: { type: 'string', required: true },
        },
        outputSchema: { group: { type: 'object' } },
      },
      {
        id: 'get_all_groups',
        name: 'Get All Groups',
        description: 'Get all groups',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { groups: { type: 'array' } },
      },
      {
        id: 'update_group',
        name: 'Update Group',
        description: 'Update an existing group',
        inputSchema: {
          groupId: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
        outputSchema: { group: { type: 'object' } },
      },
      // Post Actions
      {
        id: 'create_post',
        name: 'Create Post',
        description: 'Create a new post',
        inputSchema: {
          content: { type: 'string', required: true },
          title: { type: 'string', required: false },
          category: { type: 'string', required: false },
          topicId: { type: 'string', required: false },
          replyToPostNumber: { type: 'string', required: false },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'get_post',
        name: 'Get Post',
        description: 'Get a specific post',
        inputSchema: {
          postId: { type: 'string', required: true },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'get_all_posts',
        name: 'Get All Posts',
        description: 'Get all posts',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { posts: { type: 'array' } },
      },
      {
        id: 'update_post',
        name: 'Update Post',
        description: 'Update an existing post',
        inputSchema: {
          postId: { type: 'string', required: true },
          content: { type: 'string', required: true },
          editReason: { type: 'string', required: false },
          cooked: { type: 'boolean', required: false },
        },
        outputSchema: { post: { type: 'object' } },
      },
      // User Actions
      {
        id: 'create_user',
        name: 'Create User',
        description: 'Create a new user',
        inputSchema: {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true },
          username: { type: 'string', required: true },
          password: { type: 'string', required: true },
          active: { type: 'boolean', required: false },
          approved: { type: 'boolean', required: false },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_user',
        name: 'Get User',
        description: 'Get a user by username or external ID',
        inputSchema: {
          by: { type: 'string', required: true },
          username: { type: 'string', required: false },
          externalId: { type: 'string', required: false },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_all_users',
        name: 'Get All Users',
        description: 'Get all users with optional filtering',
        inputSchema: {
          flag: { type: 'string', required: false },
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
          stats: { type: 'boolean', required: false },
          asc: { type: 'boolean', required: false },
          showEmails: { type: 'boolean', required: false },
          order: { type: 'string', required: false },
        },
        outputSchema: { users: { type: 'array' } },
      },
      // User Group Actions
      {
        id: 'add_user_to_group',
        name: 'Add User to Group',
        description: 'Add a user to a group',
        inputSchema: {
          groupId: { type: 'string', required: true },
          usernames: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'remove_user_from_group',
        name: 'Remove User from Group',
        description: 'Remove a user from a group',
        inputSchema: {
          groupId: { type: 'string', required: true },
          usernames: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Category Methods
  private async createCategory(data: any): Promise<any> {
    const body: any = {
      name: data.name,
      color: data.color,
      text_color: data.textColor,
    };

    const response = await this.performRequest({
      method: 'POST',
      endpoint: '/categories.json',
      headers: this.getAuthHeaders(),
      body,
    });

    return response.category;
  }

  private async getAllCategories(data: any): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/categories.json',
      headers: this.getAuthHeaders(),
    });

    let categories = response.category_list.categories;

    if (!data.returnAll && data.limit) {
      categories = categories.slice(0, data.limit);
    }

    return categories;
  }

  private async updateCategory(data: any): Promise<any> {
    const { categoryId, name, color, textColor } = data;

    const body: any = { name };

    if (color) body.color = color;
    if (textColor) body.text_color = textColor;

    const response = await this.performRequest({
      method: 'PUT',
      endpoint: `/categories/${categoryId}.json`,
      headers: this.getAuthHeaders(),
      body,
    });

    return response.category;
  }

  // Group Methods
  private async createGroup(data: any): Promise<any> {
    const response = await this.performRequest({
      method: 'POST',
      endpoint: '/admin/groups.json',
      headers: this.getAuthHeaders(),
      body: {
        group: {
          name: data.name,
        },
      },
    });

    return response.basic_group;
  }

  private async getGroup(data: any): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/groups/${data.name}`,
      headers: this.getAuthHeaders(),
    });

    return response.group;
  }

  private async getAllGroups(data: any): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/groups.json',
      headers: this.getAuthHeaders(),
    });

    let groups = response.groups;

    if (!data.returnAll && data.limit) {
      groups = groups.slice(0, data.limit);
    }

    return groups;
  }

  private async updateGroup(data: any): Promise<any> {
    const { groupId, name } = data;

    const response = await this.performRequest({
      method: 'PUT',
      endpoint: `/groups/${groupId}.json`,
      headers: this.getAuthHeaders(),
      body: {
        group: { name },
      },
    });

    return response;
  }

  // Post Methods
  private async createPost(data: any): Promise<any> {
    const body: any = {
      raw: data.content,
    };

    if (data.title) body.title = data.title;
    if (data.category) body.category = data.category;
    if (data.topicId) body.topic_id = data.topicId;
    if (data.replyToPostNumber) body.reply_to_post_number = data.replyToPostNumber;

    const response = await this.performRequest({
      method: 'POST',
      endpoint: '/posts.json',
      headers: this.getAuthHeaders(),
      body,
    });

    return response;
  }

  private async getPost(data: any): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/posts/${data.postId}`,
      headers: this.getAuthHeaders(),
    });

    return response;
  }

  private async getAllPosts(data: any): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/posts.json',
      headers: this.getAuthHeaders(),
    });

    let posts = response.latest_posts;

    // If pagination is needed, fetch more posts
    if (data.returnAll) {
      let lastPost = posts[posts.length - 1];
      let previousLastPostId;

      while (lastPost && lastPost.id !== previousLastPostId) {
        const chunk = await this.performRequest({
          method: 'GET',
          endpoint: `/posts.json?before=${lastPost.id}`,
          headers: this.getAuthHeaders(),
        });

        if (chunk.latest_posts && chunk.latest_posts.length > 0) {
          posts = posts.concat(chunk.latest_posts);
          previousLastPostId = lastPost.id;
          lastPost = chunk.latest_posts[chunk.latest_posts.length - 1];
        } else {
          break;
        }
      }
    } else if (data.limit) {
      posts = posts.slice(0, data.limit);
    }

    return posts;
  }

  private async updatePost(data: any): Promise<any> {
    const { postId, content, editReason, cooked } = data;

    const body: any = {
      raw: content,
    };

    if (editReason) body.edit_reason = editReason;
    if (cooked !== undefined) body.cooked = cooked;

    const response = await this.performRequest({
      method: 'PUT',
      endpoint: `/posts/${postId}.json`,
      headers: this.getAuthHeaders(),
      body,
    });

    return response.post;
  }

  // User Methods
  private async createUser(data: any): Promise<any> {
    const body: any = {
      name: data.name,
      email: data.email,
      username: data.username,
      password: data.password,
    };

    if (data.active !== undefined) body.active = data.active;
    if (data.approved !== undefined) body.approved = data.approved;

    const response = await this.performRequest({
      method: 'POST',
      endpoint: '/users.json',
      headers: this.getAuthHeaders(),
      body,
    });

    return response;
  }

  private async getUser(data: any): Promise<any> {
    let endpoint = '';

    if (data.by === 'username') {
      endpoint = `/users/${data.username}`;
    } else if (data.by === 'externalId') {
      endpoint = `/u/by-external/${data.externalId}.json`;
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint,
      headers: this.getAuthHeaders(),
    });

    return response;
  }

  private async getAllUsers(data: any): Promise<any> {
    const flag = data.flag || 'active';
    const queryParams: any = {};

    if (data.stats !== undefined) queryParams.stats = data.stats;
    if (data.asc !== undefined) queryParams.asc = data.asc;
    if (data.showEmails !== undefined) queryParams.show_emails = data.showEmails;
    if (data.order) queryParams.order = data.order;

    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/admin/users/list/${flag}.json`,
      headers: this.getAuthHeaders(),
      queryParams,
    });

    let users = response;

    if (!data.returnAll && data.limit) {
      users = users.slice(0, data.limit);
    }

    return users;
  }

  // User Group Methods
  private async addUserToGroup(data: any): Promise<any> {
    await this.performRequest({
      method: 'PUT',
      endpoint: `/groups/${data.groupId}/members.json`,
      headers: this.getAuthHeaders(),
      body: {
        usernames: data.usernames,
      },
    });

    return { success: true };
  }

  private async removeUserFromGroup(data: any): Promise<any> {
    await this.performRequest({
      method: 'DELETE',
      endpoint: `/groups/${data.groupId}/members.json`,
      headers: this.getAuthHeaders(),
      body: {
        usernames: data.usernames,
      },
    });

    return { success: true };
  }
}
