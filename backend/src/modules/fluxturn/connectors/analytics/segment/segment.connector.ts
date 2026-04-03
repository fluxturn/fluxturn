import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { Analytics } from '@segment/analytics-node';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuid } from 'uuid';
import { BaseConnector } from '../../base/base.connector';
import { IAnalyticsConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorRequest
} from '../../types';

@Injectable()
export class SegmentConnector extends BaseConnector implements IAnalyticsConnector {
  protected readonly logger = new Logger(SegmentConnector.name);
  private analytics: Analytics;
  private httpClient: AxiosInstance;
  private writeKey: string;
  private workspaceId: string;
  private accessToken?: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Segment',
      description: 'Customer data platform for collecting and managing user analytics',
      version: '1.0.0',
      category: ConnectorCategory.ANALYTICS,
      type: ConnectorType.SEGMENT,
      authType: AuthType.API_KEY,
      logoUrl: 'https://segment.com/site-assets/images/og-image.png',
      documentationUrl: 'https://segment.com/docs/',
      actions: [
        {
          id: 'track_event',
          name: 'Track Event',
          description: 'Record the actions your users perform. Every action triggers an event.',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              anonymousId: { type: 'string' },
              event: { type: 'string', required: true },
              properties: { type: 'array' },
              context: { type: 'object' },
              integrations: { type: 'object' }
            },
            required: ['event']
          },
          outputSchema: {
            success: { type: 'boolean', required: true }
          }
        },
        {
          id: 'track_page',
          name: 'Track Page',
          description: 'Record page views on your website, along with optional extra information',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              anonymousId: { type: 'string' },
              name: { type: 'string' },
              properties: { type: 'array' },
              context: { type: 'object' },
              integrations: { type: 'object' }
            }
          },
          outputSchema: {
            success: { type: 'boolean', required: true }
          }
        },
        {
          id: 'identify_user',
          name: 'Identify User',
          description: 'Identify lets you tie a user to their actions and record traits about them',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              anonymousId: { type: 'string' },
              traits: { type: 'array' },
              context: { type: 'object' },
              integrations: { type: 'object' }
            }
          },
          outputSchema: {
            success: { type: 'boolean', required: true }
          }
        },
        {
          id: 'add_to_group',
          name: 'Add to Group',
          description: 'Group lets you associate an identified user with a group',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              anonymousId: { type: 'string' },
              groupId: { type: 'string', required: true },
              traits: { type: 'array' },
              context: { type: 'object' },
              integrations: { type: 'object' }
            },
            required: ['groupId']
          },
          outputSchema: {
            success: { type: 'boolean', required: true }
          }
        }
      ],
      triggers: [
        {
          id: 'audience_entered',
          eventType: 'segment:audience_entered',
          outputSchema: {
            userId: { type: 'string', description: 'User ID' },
            audienceId: { type: 'string', description: 'Audience ID' },
            audienceName: { type: 'string', description: 'Audience name' },
            traits: { type: 'object', description: 'User traits' },
            timestamp: { type: 'string', description: 'Event timestamp' }
          },
          name: 'Audience Entered',
          description: 'Triggered when user enters an audience',
          webhookRequired: true
        },
        {
          id: 'audience_exited',
          eventType: 'segment:audience_exited',
          outputSchema: {
            userId: { type: 'string', description: 'User ID' },
            audienceId: { type: 'string', description: 'Audience ID' },
            audienceName: { type: 'string', description: 'Audience name' },
            traits: { type: 'object', description: 'User traits' },
            timestamp: { type: 'string', description: 'Event timestamp' }
          },
          name: 'Audience Exited',
          description: 'Triggered when user exits an audience',
          webhookRequired: true
        }
      ]
    };
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    try {
      this.config = config;

      if (!config.credentials) {
        throw new Error('Segment credentials are required');
      }

      const { writeKey, workspace_id, access_token } = config.credentials;

      if (!writeKey) {
        throw new Error('Missing required Segment write key');
      }

      this.writeKey = writeKey;
      this.workspaceId = workspace_id;
      this.accessToken = access_token;

      // Initialize Segment Analytics client
      this.analytics = new Analytics({
        writeKey: this.writeKey,
        maxRetries: 3,
        maxEventsInBatch: 15
      });

      // Initialize HTTP client for API queries (if access token is provided)
      if (this.accessToken) {
        this.httpClient = axios.create({
          baseURL: 'https://api.segmentapis.com',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      // Initialization complete
      this.logger.log('Segment connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Segment connector:', error);
      throw error;
    }
  }

  async testConnection(): Promise<ConnectorResponse<boolean>> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      // Test by sending a test event
      const testEvent = {
        userId: 'test-user',
        event: 'Connection Test',
        properties: {
          test: true,
          timestamp: new Date().toISOString()
        }
      };

      await this.analytics.track(testEvent);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Segment connection test failed:', error);
      return {
        success: false,
        data: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }

  async trackEvent(eventName: string, properties?: any, userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const eventData: any = {
        event: eventName,
        properties: properties || {}
      };

      if (userId) {
        eventData.userId = userId;
      } else if (properties?.anonymous_id) {
        eventData.anonymousId = properties.anonymous_id;
      } else {
        eventData.anonymousId = 'anonymous-' + Date.now();
      }

      if (properties?.context) {
        eventData.context = properties.context;
      }

      if (properties?.timestamp) {
        eventData.timestamp = new Date(properties.timestamp);
      }

      await this.analytics.track(eventData);

      return {
        success: true,
        data: {
          event: eventName,
          userId: eventData.userId,
          anonymousId: eventData.anonymousId,
          properties: properties
        },
      };
    } catch (error) {
      this.logger.error('Failed to track Segment event:', error);
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }

  async identifyUser(userId: string, traits?: any, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const identifyData: any = {
        traits: traits || {}
      };

      if (userId) {
        identifyData.userId = userId;
      } else if (options?.anonymous_id) {
        identifyData.anonymousId = options.anonymous_id;
      } else {
        throw new Error('Either userId or anonymousId is required');
      }

      if (options?.context) {
        identifyData.context = options.context;
      }

      if (options?.timestamp) {
        identifyData.timestamp = new Date(options.timestamp);
      }

      await this.analytics.identify(identifyData);

      return {
        success: true,
        data: {
          userId: identifyData.userId,
          anonymousId: identifyData.anonymousId,
          traits: traits
        },
      };
    } catch (error) {
      this.logger.error('Failed to identify Segment user:', error);
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }

  async trackPage(pageName?: string, properties?: any, userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const pageData: any = {
        properties: properties || {}
      };

      if (pageName) {
        pageData.name = pageName;
      }

      if (properties?.category) {
        pageData.category = properties.category;
      }

      if (userId) {
        pageData.userId = userId;
      } else if (properties?.anonymous_id) {
        pageData.anonymousId = properties.anonymous_id;
      } else {
        pageData.anonymousId = 'anonymous-' + Date.now();
      }

      if (properties?.context) {
        pageData.context = properties.context;
      }

      if (properties?.timestamp) {
        pageData.timestamp = new Date(properties.timestamp);
      }

      await this.analytics.page(pageData);

      return {
        success: true,
        data: {
          name: pageName,
          userId: pageData.userId,
          anonymousId: pageData.anonymousId,
          properties: properties
        },
      };
    } catch (error) {
      this.logger.error('Failed to track Segment page:', error);
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }

  async createGroup(groupId: string, traits?: any, userId?: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const groupData: any = {
        groupId: groupId,
        traits: traits || {}
      };

      if (userId) {
        groupData.userId = userId;
      } else if (options?.anonymous_id) {
        groupData.anonymousId = options.anonymous_id;
      } else {
        throw new Error('Either userId or anonymousId is required');
      }

      if (options?.context) {
        groupData.context = options.context;
      }

      if (options?.timestamp) {
        groupData.timestamp = new Date(options.timestamp);
      }

      await this.analytics.group(groupData);

      return {
        success: true,
        data: {
          groupId: groupId,
          userId: groupData.userId,
          anonymousId: groupData.anonymousId,
          traits: traits
        },
      };
    } catch (error) {
      this.logger.error('Failed to create Segment group:', error);
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }

  async getAnalytics(query: any): Promise<ConnectorResponse> {
    if (!this.httpClient || !this.workspaceId) {
      return {
        success: false,
        error: {
          code: 'API_NOT_CONFIGURED',
          message: 'API access not configured'
        }
      };
    }

    try {
      // This would require specific API endpoints based on query type
      // Segment's API structure varies by plan and features
      const response = await this.httpClient.get(`/workspaces/${this.workspaceId}/tracking-plans`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to get Segment analytics:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.response?.data?.message || error.message
        }
      };
    }
  }

  async createReport(reportConfig: any): Promise<ConnectorResponse> {
    // Segment doesn't have a direct report creation API
    // This would typically be done through their web interface
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Report creation not supported via API'
      }
    };
  }

  async getUserProfiles(userIds?: string[]): Promise<ConnectorResponse> {
    if (!this.httpClient || !this.workspaceId) {
      return {
        success: false,
        error: {
          code: 'API_NOT_CONFIGURED',
          message: 'API access not configured'
        }
      };
    }

    try {
      // This would require Segment Profiles API access
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'User profiles API not implemented'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get Segment user profiles:', error);
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }

  async flushEvents(): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      await this.analytics.closeAndFlush();

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Failed to flush Segment events:', error);
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'track_event':
        return this.trackEventAction(input);
      case 'identify_user':
        return this.identifyUserAction(input);
      case 'track_page':
        return this.trackPageAction(input);
      case 'add_to_group':
        return this.addToGroupAction(input);
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${actionId}`,
            details: null
          }
        };
    }
  }

  private async trackEventAction(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const { userId, anonymousId, event, properties, context, integrations } = input;

      if (!userId && !anonymousId) {
        throw new Error('Either userId or anonymousId is required');
      }

      if (!event) {
        throw new Error('Event name is required');
      }

      const eventData: any = {
        event,
        properties: this.buildPropertiesObject(properties) || {},
        context: this.buildContextObject(context),
        integrations: this.buildIntegrationsObject(integrations)
      };

      if (userId) {
        eventData.userId = userId;
      } else {
        eventData.anonymousId = anonymousId || uuid();
      }

      await this.analytics.track(eventData);

      return {
        success: true,
        data: {
          event,
          userId: eventData.userId,
          anonymousId: eventData.anonymousId
        }
      };
    } catch (error) {
      this.logger.error('Failed to track Segment event:', error);
      return {
        success: false,
        error: {
          code: 'TRACK_EVENT_FAILED',
          message: error.message,
          details: error
        }
      };
    }
  }

  private async trackPageAction(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const { userId, anonymousId, name, properties, context, integrations } = input;

      if (!userId && !anonymousId) {
        throw new Error('Either userId or anonymousId is required');
      }

      const pageData: any = {
        properties: this.buildPropertiesObject(properties) || {},
        context: this.buildContextObject(context),
        integrations: this.buildIntegrationsObject(integrations)
      };

      if (name) {
        pageData.name = name;
      }

      if (userId) {
        pageData.userId = userId;
      } else {
        pageData.anonymousId = anonymousId || uuid();
      }

      await this.analytics.page(pageData);

      return {
        success: true,
        data: {
          name,
          userId: pageData.userId,
          anonymousId: pageData.anonymousId
        }
      };
    } catch (error) {
      this.logger.error('Failed to track Segment page:', error);
      return {
        success: false,
        error: {
          code: 'TRACK_PAGE_FAILED',
          message: error.message,
          details: error
        }
      };
    }
  }

  private async identifyUserAction(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const { userId, anonymousId, traits, context, integrations } = input;

      if (!userId && !anonymousId) {
        throw new Error('Either userId or anonymousId is required');
      }

      const identifyData: any = {
        traits: this.buildTraitsObject(traits) || {},
        context: this.buildContextObject(context),
        integrations: this.buildIntegrationsObject(integrations)
      };

      if (userId) {
        identifyData.userId = userId;
      } else {
        identifyData.anonymousId = anonymousId || uuid();
      }

      await this.analytics.identify(identifyData);

      return {
        success: true,
        data: {
          userId: identifyData.userId,
          anonymousId: identifyData.anonymousId,
          traits: identifyData.traits
        }
      };
    } catch (error) {
      this.logger.error('Failed to identify Segment user:', error);
      return {
        success: false,
        error: {
          code: 'IDENTIFY_USER_FAILED',
          message: error.message,
          details: error
        }
      };
    }
  }

  private async addToGroupAction(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.analytics) {
        throw new Error('Segment client not initialized');
      }

      const { userId, anonymousId, groupId, traits, context, integrations } = input;

      if (!userId && !anonymousId) {
        throw new Error('Either userId or anonymousId is required');
      }

      if (!groupId) {
        throw new Error('Group ID is required');
      }

      const groupData: any = {
        groupId,
        traits: this.buildTraitsObject(traits) || {},
        context: this.buildContextObject(context),
        integrations: this.buildIntegrationsObject(integrations)
      };

      if (userId) {
        groupData.userId = userId;
      } else {
        groupData.anonymousId = anonymousId || uuid();
      }

      await this.analytics.group(groupData);

      return {
        success: true,
        data: {
          groupId,
          userId: groupData.userId,
          anonymousId: groupData.anonymousId,
          traits: groupData.traits
        }
      };
    } catch (error) {
      this.logger.error('Failed to add Segment user to group:', error);
      return {
        success: false,
        error: {
          code: 'ADD_TO_GROUP_FAILED',
          message: error.message,
          details: error
        }
      };
    }
  }

  private buildPropertiesObject(properties: any): any {
    if (!properties) return {};

    // If properties is an array of key-value pairs (from n8n format)
    if (Array.isArray(properties)) {
      const obj: any = {};
      for (const prop of properties) {
        if (prop.key) {
          obj[prop.key] = prop.value;
        }
      }
      return obj;
    }

    // If properties is already an object, return as-is
    return properties;
  }

  private buildTraitsObject(traits: any): any {
    if (!traits) return {};

    // If traits is an array of key-value pairs (from n8n format)
    if (Array.isArray(traits)) {
      const obj: any = {};
      for (const trait of traits) {
        if (trait.key) {
          obj[trait.key] = trait.value;
        }
      }
      return obj;
    }

    // If traits is already an object, return as-is
    return traits;
  }

  private buildContextObject(context: any): any {
    if (!context) return {};

    const contextObj: any = {};

    // Handle context fields
    if (context.active !== undefined) {
      contextObj.active = context.active;
    }
    if (context.ip) {
      contextObj.ip = context.ip;
    }
    if (context.locale) {
      contextObj.locale = context.locale;
    }
    if (context.page) {
      contextObj.page = context.page;
    }
    if (context.timezone) {
      contextObj.timezone = context.timezone;
    }

    // Handle app context
    if (context.app) {
      contextObj.app = {};
      if (context.app.name) contextObj.app.name = context.app.name;
      if (context.app.version) contextObj.app.version = context.app.version;
      if (context.app.build) contextObj.app.build = context.app.build;
    }

    // Handle campaign context
    if (context.campaign) {
      contextObj.campaign = {};
      if (context.campaign.name) contextObj.campaign.name = context.campaign.name;
      if (context.campaign.source) contextObj.campaign.source = context.campaign.source;
      if (context.campaign.medium) contextObj.campaign.medium = context.campaign.medium;
      if (context.campaign.term) contextObj.campaign.term = context.campaign.term;
      if (context.campaign.content) contextObj.campaign.content = context.campaign.content;
    }

    // Handle device context
    if (context.device) {
      contextObj.device = {};
      if (context.device.id) contextObj.device.id = context.device.id;
      if (context.device.manufacturer) contextObj.device.manufacturer = context.device.manufacturer;
      if (context.device.model) contextObj.device.model = context.device.model;
      if (context.device.type) contextObj.device.type = context.device.type;
      if (context.device.version) contextObj.device.version = context.device.version;
    }

    return contextObj;
  }

  private buildIntegrationsObject(integrations: any): any {
    if (!integrations) return {};

    const integrationsObj: any = {};

    if (integrations.all !== undefined) {
      integrationsObj.all = integrations.all;
    }
    if (integrations.salesforce !== undefined) {
      integrationsObj.salesforce = integrations.salesforce;
    }

    return integrationsObj;
  }

  async destroy(): Promise<void> {
    if (this.analytics) {
      await this.analytics.closeAndFlush();
    }
    await super.destroy();
  }

  // Abstract method implementations from BaseConnector
  protected async initializeConnection(): Promise<void> {
    await this.initialize(this.config);
  }

  protected async performConnectionTest(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success && result.data === true;
  }

  protected async performHealthCheck(): Promise<void> {
    const result = await this.testConnection();
    if (!result.success) {
      throw new Error(result.error?.message || 'Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // This connector uses specific methods instead of generic request
    throw new Error('Use specific methods for Segment operations');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    await this.destroy();
  }
}