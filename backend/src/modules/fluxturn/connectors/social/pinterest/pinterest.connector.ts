import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { ISocialConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  PaginatedRequest,
} from '../../types';

@Injectable()
export class PinterestConnector extends BaseConnector implements ISocialConnector {
  private httpClient: AxiosInstance;
  private accessToken: string;
  private baseUrl = 'https://api.pinterest.com/v5';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Pinterest',
      description: 'Create pins, manage boards, track analytics, and auto-post content to Pinterest',
      version: '1.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.PINTEREST,
      authType: AuthType.OAUTH2,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      requiredScopes: [
        'boards:read',
        'boards:write',
        'pins:read',
        'pins:write',
        'user_accounts:read',
      ],
    };
  }

  private getActions() {
    return [
      { id: 'create_pin', name: 'Create Pin', description: 'Create a new pin on a board', inputSchema: {}, outputSchema: {} },
      { id: 'create_pin_from_website', name: 'Create Pin from Website', description: 'Auto-post content from a website URL', inputSchema: {}, outputSchema: {} },
      { id: 'update_pin', name: 'Update Pin', description: 'Update an existing pin', inputSchema: {}, outputSchema: {} },
      { id: 'delete_pin', name: 'Delete Pin', description: 'Delete a pin permanently', inputSchema: {}, outputSchema: {} },
      { id: 'get_pin', name: 'Get Pin', description: 'Retrieve information about a specific pin', inputSchema: {}, outputSchema: {} },
      { id: 'create_board', name: 'Create Board', description: 'Create a new Pinterest board', inputSchema: {}, outputSchema: {} },
      { id: 'update_board', name: 'Update Board', description: 'Update an existing board', inputSchema: {}, outputSchema: {} },
      { id: 'delete_board', name: 'Delete Board', description: 'Delete a board permanently', inputSchema: {}, outputSchema: {} },
      { id: 'list_boards', name: 'List Boards', description: 'Get a list of all boards', inputSchema: {}, outputSchema: {} },
      { id: 'get_board', name: 'Get Board', description: 'Retrieve information about a specific board', inputSchema: {}, outputSchema: {} },
      { id: 'list_board_pins', name: 'List Board Pins', description: 'Get all pins from a specific board', inputSchema: {}, outputSchema: {} },
      { id: 'create_board_section', name: 'Create Board Section', description: 'Create a section within a board', inputSchema: {}, outputSchema: {} },
      { id: 'get_user_profile', name: 'Get User Profile', description: 'Get authenticated user information', inputSchema: {}, outputSchema: {} },
      { id: 'search_pins', name: 'Search Pins', description: 'Search for pins by keyword', inputSchema: {}, outputSchema: {} },
      { id: 'get_user_analytics', name: 'Get User Analytics', description: 'Get account analytics data', inputSchema: {}, outputSchema: {} },
      { id: 'get_pin_analytics', name: 'Get Pin Analytics', description: 'Get analytics for a specific pin', inputSchema: {}, outputSchema: {} },
      { id: 'get_top_pins', name: 'Get Top Pins', description: 'Get top performing pins', inputSchema: {}, outputSchema: {} },
    ];
  }

  private getTriggers() {
    return [
      {
        id: 'new_pin_created',
        name: 'New Pin Created',
        description: 'Triggers when a new pin is created',
        eventType: 'pin.created',
        pollingEnabled: true,
        outputSchema: {},
      },
      {
        id: 'new_board_created',
        name: 'New Board Created',
        description: 'Triggers when a new board is created',
        eventType: 'board.created',
        pollingEnabled: true,
        outputSchema: {},
      },
    ];
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('Pinterest credentials are required');
    }

    const { accessToken, access_token } = this.config.credentials;
    this.accessToken = accessToken || access_token;

    if (!this.accessToken) {
      throw new Error('Missing required Pinterest access token');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('Pinterest connector initialized successfully');
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    if (!this.httpClient) {
      throw new Error('Pinterest connector not initialized');
    }

    const response = await this.httpClient.get('/user_account');
    return response.status === 200;
  }

  protected async performHealthCheck(): Promise<void> {
    await this.performConnectionTest();
  }

  protected async performRequest(request: any): Promise<any> {
    return await this.httpClient.request(request);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Pin actions
      case 'create_pin':
        return this.createPin(input);
      case 'create_pin_from_website':
        return this.createPinFromWebsite(input);
      case 'update_pin':
        return this.updatePin(input);
      case 'delete_pin':
        return this.deletePin(input);
      case 'get_pin':
        return this.getPin(input);

      // Board actions
      case 'create_board':
        return this.createBoard(input);
      case 'update_board':
        return this.updateBoard(input);
      case 'delete_board':
        return this.deleteBoard(input);
      case 'list_boards':
        return this.listBoards(input);
      case 'get_board':
        return this.getBoard(input);
      case 'list_board_pins':
        return this.listBoardPins(input);
      case 'create_board_section':
        return this.createBoardSection(input);

      // User data actions
      case 'get_user_profile':
        return this.getUserProfile();
      case 'search_pins':
        return this.searchPins(input);

      // Analytics actions
      case 'get_user_analytics':
        return this.getUserAnalytics(input);
      case 'get_pin_analytics':
        return this.getPinAnalytics(input);
      case 'get_top_pins':
        return this.getTopPins(input);

      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${actionId}`,
          },
        };
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Pinterest connector cleanup completed');
  }

  // ===== PIN ACTIONS =====

  private async createPin(input: any): Promise<ConnectorResponse> {
    try {
      const { boardId, title, description, link, imageUrl, altText, dominantColor } = input;

      if (!boardId) {
        throw new Error('Board ID is required');
      }
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      const pinData: any = {
        board_id: boardId,
        media_source: {
          source_type: 'image_url',
          url: imageUrl,
        },
      };

      if (title) pinData.title = title;
      if (description) pinData.description = description;
      if (link) pinData.link = link;
      if (altText) pinData.alt_text = altText;
      if (dominantColor) pinData.dominant_color = dominantColor;

      const response = await this.httpClient.post('/pins', pinData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Pinterest pin:', error);
      return this.handleApiError(error, 'create pin');
    }
  }

  private async createPinFromWebsite(input: any): Promise<ConnectorResponse> {
    try {
      const { boardId, websiteUrl, title, description } = input;

      if (!boardId) {
        throw new Error('Board ID is required');
      }
      if (!websiteUrl) {
        throw new Error('Website URL is required');
      }

      const pinData: any = {
        board_id: boardId,
        link: websiteUrl,
        media_source: {
          source_type: 'image_url',
          url: websiteUrl,
        },
      };

      if (title) pinData.title = title;
      if (description) pinData.description = description;

      const response = await this.httpClient.post('/pins', pinData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Pinterest pin from website:', error);
      return this.handleApiError(error, 'create pin from website');
    }
  }

  private async updatePin(input: any): Promise<ConnectorResponse> {
    try {
      const { pinId, title, description, link, altText, boardId } = input;

      if (!pinId) {
        throw new Error('Pin ID is required');
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (link !== undefined) updateData.link = link;
      if (altText !== undefined) updateData.alt_text = altText;
      if (boardId !== undefined) updateData.board_id = boardId;

      const response = await this.httpClient.patch(`/pins/${pinId}`, updateData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to update Pinterest pin:', error);
      return this.handleApiError(error, 'update pin');
    }
  }

  private async deletePin(input: any): Promise<ConnectorResponse> {
    try {
      const { pinId } = input;

      if (!pinId) {
        throw new Error('Pin ID is required');
      }

      await this.httpClient.delete(`/pins/${pinId}`);

      return {
        success: true,
        data: { deleted: true, pinId },
      };
    } catch (error) {
      this.logger.error('Failed to delete Pinterest pin:', error);
      return this.handleApiError(error, 'delete pin');
    }
  }

  private async getPin(input: any): Promise<ConnectorResponse> {
    try {
      const { pinId } = input;

      if (!pinId) {
        throw new Error('Pin ID is required');
      }

      const response = await this.httpClient.get(`/pins/${pinId}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Pinterest pin:', error);
      return this.handleApiError(error, 'get pin');
    }
  }

  // ===== BOARD ACTIONS =====

  private async createBoard(input: any): Promise<ConnectorResponse> {
    try {
      const { name, description, privacy } = input;

      if (!name) {
        throw new Error('Board name is required');
      }

      const boardData: any = { name };
      if (description) boardData.description = description;
      if (privacy) boardData.privacy = privacy;

      const response = await this.httpClient.post('/boards', boardData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Pinterest board:', error);
      return this.handleApiError(error, 'create board');
    }
  }

  private async updateBoard(input: any): Promise<ConnectorResponse> {
    try {
      const { boardId, name, description, privacy } = input;

      if (!boardId) {
        throw new Error('Board ID is required');
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (privacy !== undefined) updateData.privacy = privacy;

      const response = await this.httpClient.patch(`/boards/${boardId}`, updateData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to update Pinterest board:', error);
      return this.handleApiError(error, 'update board');
    }
  }

  private async deleteBoard(input: any): Promise<ConnectorResponse> {
    try {
      const { boardId } = input;

      if (!boardId) {
        throw new Error('Board ID is required');
      }

      await this.httpClient.delete(`/boards/${boardId}`);

      return {
        success: true,
        data: { deleted: true, boardId },
      };
    } catch (error) {
      this.logger.error('Failed to delete Pinterest board:', error);
      return this.handleApiError(error, 'delete board');
    }
  }

  private async listBoards(input: any): Promise<ConnectorResponse> {
    try {
      const { pageSize, privacy, bookmark } = input || {};

      const params: any = {};
      if (pageSize) params.page_size = Math.min(pageSize, 100);
      if (privacy && privacy !== 'ALL') params.privacy = privacy;
      if (bookmark) params.bookmark = bookmark;

      const response = await this.httpClient.get('/boards', { params });

      return {
        success: true,
        data: {
          items: response.data.items || [],
          bookmark: response.data.bookmark,
        },
      };
    } catch (error) {
      this.logger.error('Failed to list Pinterest boards:', error);
      return this.handleApiError(error, 'list boards');
    }
  }

  private async getBoard(input: any): Promise<ConnectorResponse> {
    try {
      const { boardId } = input;

      if (!boardId) {
        throw new Error('Board ID is required');
      }

      const response = await this.httpClient.get(`/boards/${boardId}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Pinterest board:', error);
      return this.handleApiError(error, 'get board');
    }
  }

  private async listBoardPins(input: any): Promise<ConnectorResponse> {
    try {
      const { boardId, pageSize, bookmark } = input;

      if (!boardId) {
        throw new Error('Board ID is required');
      }

      const params: any = {};
      if (pageSize) params.page_size = Math.min(pageSize, 100);
      if (bookmark) params.bookmark = bookmark;

      const response = await this.httpClient.get(`/boards/${boardId}/pins`, { params });

      return {
        success: true,
        data: {
          items: response.data.items || [],
          bookmark: response.data.bookmark,
        },
      };
    } catch (error) {
      this.logger.error('Failed to list Pinterest board pins:', error);
      return this.handleApiError(error, 'list board pins');
    }
  }

  private async createBoardSection(input: any): Promise<ConnectorResponse> {
    try {
      const { boardId, name } = input;

      if (!boardId) {
        throw new Error('Board ID is required');
      }
      if (!name) {
        throw new Error('Section name is required');
      }

      const response = await this.httpClient.post(`/boards/${boardId}/sections`, { name });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Pinterest board section:', error);
      return this.handleApiError(error, 'create board section');
    }
  }

  // ===== USER DATA ACTIONS =====

  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Pinterest connector not initialized');
      }

      const response = await this.httpClient.get('/user_account');

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Pinterest user profile:', error);
      return this.handleApiError(error, 'get user profile');
    }
  }

  private async searchPins(input: any): Promise<ConnectorResponse> {
    try {
      const { query, pageSize, bookmark } = input;

      if (!query) {
        throw new Error('Search query is required');
      }

      const params: any = { query };
      if (pageSize) params.page_size = Math.min(pageSize, 50);
      if (bookmark) params.bookmark = bookmark;

      const response = await this.httpClient.get('/search/pins', { params });

      return {
        success: true,
        data: {
          items: response.data.items || [],
          bookmark: response.data.bookmark,
        },
      };
    } catch (error) {
      this.logger.error('Failed to search Pinterest pins:', error);
      return this.handleApiError(error, 'search pins');
    }
  }

  // ===== ANALYTICS ACTIONS =====

  private async getUserAnalytics(input: any): Promise<ConnectorResponse> {
    try {
      const { startDate, endDate, metricTypes, splitField } = input;

      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      if (!metricTypes || metricTypes.length === 0) {
        throw new Error('At least one metric type is required');
      }

      const params: any = {
        start_date: startDate,
        end_date: endDate,
        metric_types: Array.isArray(metricTypes) ? metricTypes.join(',') : metricTypes,
      };
      if (splitField) params.split_field = splitField;

      const response = await this.httpClient.get('/user_account/analytics', { params });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Pinterest user analytics:', error);
      return this.handleApiError(error, 'get user analytics');
    }
  }

  private async getPinAnalytics(input: any): Promise<ConnectorResponse> {
    try {
      const { pinId, startDate, endDate, metricTypes } = input;

      if (!pinId) {
        throw new Error('Pin ID is required');
      }
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      if (!metricTypes || metricTypes.length === 0) {
        throw new Error('At least one metric type is required');
      }

      const params: any = {
        start_date: startDate,
        end_date: endDate,
        metric_types: Array.isArray(metricTypes) ? metricTypes.join(',') : metricTypes,
      };

      const response = await this.httpClient.get(`/pins/${pinId}/analytics`, { params });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Pinterest pin analytics:', error);
      return this.handleApiError(error, 'get pin analytics');
    }
  }

  private async getTopPins(input: any): Promise<ConnectorResponse> {
    try {
      const { startDate, endDate, sortBy, numOfPins } = input;

      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      if (!sortBy) {
        throw new Error('Sort by metric is required');
      }

      const params: any = {
        start_date: startDate,
        end_date: endDate,
        sort_by: sortBy,
      };
      if (numOfPins) params.num_of_pins = Math.min(numOfPins, 50);

      const response = await this.httpClient.get('/user_account/analytics/top_pins', { params });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Pinterest top pins:', error);
      return this.handleApiError(error, 'get top pins');
    }
  }

  // ===== ISocialConnector INTERFACE METHODS =====

  async postContent(content: any): Promise<ConnectorResponse> {
    return this.createPin(content);
  }

  async getPosts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    // Get pins from all boards
    try {
      const boardsResponse = await this.listBoards({ pageSize: 25 });
      if (!boardsResponse.success) {
        return boardsResponse;
      }

      const allPins: any[] = [];
      for (const board of boardsResponse.data.items || []) {
        const pinsResponse = await this.listBoardPins({
          boardId: board.id,
          pageSize: options?.limit || 10,
        });
        if (pinsResponse.success && pinsResponse.data.items) {
          allPins.push(...pinsResponse.data.items);
        }
      }

      return {
        success: true,
        data: {
          items: allPins.slice(0, options?.limit || 25),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Pinterest posts:', error);
      return this.handleApiError(error, 'get posts');
    }
  }

  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    // Pinterest API v5 doesn't provide direct access to followers/following lists
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Pinterest API does not support listing followers/following',
      },
    };
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    // Pinterest doesn't support scheduled posts through the API
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Scheduled posts not supported by Pinterest API',
      },
    };
  }

  // ===== HELPER METHODS =====

  private handleApiError(error: any, context: string): ConnectorResponse {
    const errorMessage = error.response?.data?.message
      || error.response?.data?.error?.message
      || error.message
      || `Failed to ${context}`;

    const errorCode = error.response?.status
      ? `HTTP_${error.response.status}`
      : 'PINTEREST_ERROR';

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        statusCode: error.response?.status,
        details: error.response?.data,
      },
    };
  }
}
