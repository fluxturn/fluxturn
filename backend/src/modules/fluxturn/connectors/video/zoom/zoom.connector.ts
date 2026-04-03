import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IVideoConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorRequest,
  ConnectorMetadata,
  ConnectorType,
  AuthType,
  ConnectorCategory,
} from '../../types';

@Injectable()
export class ZoomConnector extends BaseConnector implements IVideoConnector {
  private httpClient: AxiosInstance;
  private accessToken: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Zoom',
      description: 'Zoom connector for video conferencing and meeting management',
      version: '1.0.0',
      category: ConnectorCategory.VIDEO,
      type: ConnectorType.ZOOM,
      authType: AuthType.BEARER_TOKEN,
      actions: [
        {
          id: 'create_meeting',
          name: 'Create Meeting',
          description: 'Create a Zoom meeting',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              type: { type: 'number', enum: [1, 2, 3, 8] },
              start_time: { type: 'string', format: 'date-time' },
              duration: { type: 'number' },
              timezone: { type: 'string' },
              agenda: { type: 'string' },
              settings: { type: 'object' }
            },
            required: ['topic']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              topic: { type: 'string' },
              start_time: { type: 'string' },
              join_url: { type: 'string' },
              password: { type: 'string' },
              duration: { type: 'number' }
            }
          }
        },
        {
          id: 'get_meeting',
          name: 'Get Meeting',
          description: 'Get details of a specific meeting',
          inputSchema: {
            type: 'object',
            properties: {
              meetingId: { type: 'string' }
            },
            required: ['meetingId']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              topic: { type: 'string' },
              type: { type: 'number' },
              start_time: { type: 'string' },
              duration: { type: 'number' },
              join_url: { type: 'string' }
            }
          }
        },
        {
          id: 'list_meetings',
          name: 'List Meetings',
          description: 'Get a list of meetings for a user',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', default: 'me' },
              type: { type: 'string', enum: ['scheduled', 'live', 'upcoming'] },
              page_size: { type: 'number' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              meetings: { type: 'array' },
              total_records: { type: 'number' }
            }
          }
        },
        {
          id: 'update_meeting',
          name: 'Update Meeting',
          description: 'Update an existing meeting',
          inputSchema: {
            type: 'object',
            properties: {
              meetingId: { type: 'string' },
              topic: { type: 'string' },
              start_time: { type: 'string' },
              duration: { type: 'number' },
              agenda: { type: 'string' }
            },
            required: ['meetingId']
          },
          outputSchema: {
            type: 'object',
            properties: {
              updated: { type: 'boolean' }
            }
          }
        },
        {
          id: 'delete_meeting',
          name: 'Delete Meeting',
          description: 'Delete a meeting',
          inputSchema: {
            type: 'object',
            properties: {
              meetingId: { type: 'string' }
            },
            required: ['meetingId']
          },
          outputSchema: {
            type: 'object',
            properties: {
              deleted: { type: 'boolean' }
            }
          }
        },
        {
          id: 'get_recordings',
          name: 'Get Recordings',
          description: 'Get recordings for a meeting',
          inputSchema: {
            type: 'object',
            properties: {
              meeting_id: { type: 'string' }
            },
            required: ['meeting_id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              recording_files: { type: 'array' }
            }
          }
        },
        {
          id: 'get_analytics',
          name: 'Get Meeting Analytics',
          description: 'Get participant analytics for a meeting',
          inputSchema: {
            type: 'object',
            properties: {
              meeting_id: { type: 'string' }
            },
            required: ['meeting_id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              participants: { type: 'array' },
              total_records: { type: 'number' }
            }
          }
        },
        {
          id: 'get_user',
          name: 'Get User',
          description: 'Get user information',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', default: 'me' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' }
            }
          }
        }
      ],
      triggers: [
        {
          id: 'meeting_started',
          eventType: 'webhook',
          outputSchema: {},
          name: 'Meeting Started',
          description: 'Triggered when meeting starts'
        }
      ],
      webhookSupport: true,
      rateLimit: {
        requestsPerSecond: 10
      }
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { access_token } = this.config.credentials;
    
    if (!access_token) {
      throw new Error('Zoom access token is required');
    }

    this.accessToken = access_token;
    this.httpClient = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    this.logger.log('Zoom connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/users/me');
      return response.status === 200;
    } catch (error) {
      throw new Error(`Zoom connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.httpClient.get('/users/me');
    } catch (error) {
      throw new Error(`Zoom health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const config = {
        method: request.method,
        url: request.endpoint,
        headers: request.headers,
        data: request.body,
        params: request.queryParams
      };

      const response = await this.httpClient.request(config);
      return response.data;
    } catch (error) {
      this.logger.error('Zoom request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Meeting actions
      case 'create_meeting':
        return this.createLiveStream(input);
      case 'get_meeting':
        return this.getMeeting(input.meetingId);
      case 'list_meetings':
        return this.listMeetings(input);
      case 'update_meeting':
        return this.updateMeeting(input.meetingId, input);
      case 'delete_meeting':
        return this.deleteMeeting(input.meetingId);

      // Recording & Analytics actions
      case 'get_recordings':
        return this.getVideo(input.meeting_id);
      case 'get_analytics':
        return this.getVideoAnalytics(input.meeting_id);

      // User actions
      case 'get_user':
        return this.getUser(input.userId || 'me');

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Zoom connector cleanup completed');
  }

  async uploadVideo(videoData: Buffer, metadata: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Video upload not supported'
      }
    };
  }

  async getVideo(videoId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.get(`/meetings/${videoId}/recordings`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }

  async processVideo(videoId: string, operations: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Video processing not supported'
      }
    };
  }

  async getVideoAnalytics(videoId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.get(`/report/meetings/${videoId}/participants`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }

  async createLiveStream(streamConfig: any): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.post('/users/me/meetings', streamConfig);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }

  // Meeting management methods
  private async getMeeting(meetingId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.get(`/meetings/${meetingId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }

  private async listMeetings(input: any): Promise<ConnectorResponse> {
    try {
      const userId = input.userId || 'me';
      const params: any = {};
      if (input.type) params.type = input.type;
      if (input.page_size) params.page_size = input.page_size;

      const response = await this.httpClient.get(`/users/${userId}/meetings`, { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }

  private async updateMeeting(meetingId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { meetingId: _, ...updateData } = input;
      await this.httpClient.patch(`/meetings/${meetingId}`, updateData);
      return {
        success: true,
        data: { updated: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }

  private async deleteMeeting(meetingId: string): Promise<ConnectorResponse> {
    try {
      await this.httpClient.delete(`/meetings/${meetingId}`);
      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }

  private async getUser(userId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.get(`/users/${userId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error.message
        }
      };
    }
  }
}