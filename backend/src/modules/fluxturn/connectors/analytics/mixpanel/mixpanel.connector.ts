import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
import * as querystring from 'querystring';

@Injectable()
export class MixpanelConnector extends BaseConnector implements IAnalyticsConnector {
  protected readonly logger = new Logger(MixpanelConnector.name);
  private httpClient: AxiosInstance;
  private queryClient: AxiosInstance;
  private exportClient: AxiosInstance;
  private projectToken: string;
  private projectId: string;
  private serviceAccountUsername: string;
  private serviceAccountSecret: string;
  private region: string;
  private endpoints: {
    track: string;
    import: string;
    engage: string;
    query: string;
    export: string;
  };

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Mixpanel',
      description: 'Mixpanel product analytics platform for tracking events and user profiles',
      version: '2.0.0',
      category: ConnectorCategory.ANALYTICS,
      type: ConnectorType.MIXPANEL,
      authType: AuthType.API_KEY,
      logoUrl: 'https://mixpanel.com/wp-content/themes/mixpanel-wordpress/assets/images/logo.svg',
      documentationUrl: 'https://developer.mixpanel.com/reference',
      actions: [
        { id: 'track_event', name: 'Track Event', description: 'Track a single event (last 5 days only)', inputSchema: {}, outputSchema: {} },
        { id: 'import_events', name: 'Import Events', description: 'Import historical events (supports events older than 5 days)', inputSchema: {}, outputSchema: {} },
        { id: 'profile_set', name: 'Set Profile Properties', description: 'Create or update user profile properties', inputSchema: {}, outputSchema: {} },
        { id: 'profile_set_once', name: 'Set Profile Properties Once', description: 'Set profile properties only if they do not exist', inputSchema: {}, outputSchema: {} },
        { id: 'profile_increment', name: 'Increment Profile Property', description: 'Increment or decrement numeric profile properties', inputSchema: {}, outputSchema: {} },
        { id: 'profile_append', name: 'Append to List Property', description: 'Append values to a list property', inputSchema: {}, outputSchema: {} },
        { id: 'profile_union', name: 'Union to List Property', description: 'Add values to a list property without duplicates', inputSchema: {}, outputSchema: {} },
        { id: 'profile_remove', name: 'Remove from List Property', description: 'Remove values from a list property', inputSchema: {}, outputSchema: {} },
        { id: 'profile_unset', name: 'Delete Profile Properties', description: 'Remove specific properties from a profile', inputSchema: {}, outputSchema: {} },
        { id: 'profile_delete', name: 'Delete Profile', description: 'Permanently delete a user profile', inputSchema: {}, outputSchema: {} },
        { id: 'query_profiles', name: 'Query Profiles', description: 'Query user profiles with filtering', inputSchema: {}, outputSchema: {} },
        { id: 'query_insights', name: 'Query Insights', description: 'Get insights data (trends and compositions)', inputSchema: {}, outputSchema: {} },
        { id: 'query_funnels', name: 'Query Funnels', description: 'Analyze conversion funnels', inputSchema: {}, outputSchema: {} },
        { id: 'query_retention', name: 'Query Retention', description: 'Analyze user retention cohorts', inputSchema: {}, outputSchema: {} },
        { id: 'export_events', name: 'Export Raw Events', description: 'Export raw event data for a date range', inputSchema: {}, outputSchema: {} }
      ],
      triggers: []
    };
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    try {
      this.config = config;

      if (!config.credentials) {
        throw new Error('Mixpanel credentials are required');
      }

      const {
        projectToken,
        serviceAccountUsername,
        serviceAccountSecret,
        projectId,
        region = 'us'
      } = config.credentials;

      if (!projectToken) {
        throw new Error('Missing required Mixpanel credential: projectToken');
      }

      this.projectToken = projectToken;
      this.serviceAccountUsername = serviceAccountUsername;
      this.serviceAccountSecret = serviceAccountSecret;
      this.projectId = projectId;
      this.region = region;

      // Set region-specific endpoints
      const regionMap = {
        us: {
          track: 'https://api.mixpanel.com/track',
          import: 'https://api.mixpanel.com/import',
          engage: 'https://api.mixpanel.com/engage',
          query: 'https://mixpanel.com/api',
          export: 'https://data.mixpanel.com/api/2.0/export'
        },
        eu: {
          track: 'https://api-eu.mixpanel.com/track',
          import: 'https://api-eu.mixpanel.com/import',
          engage: 'https://api-eu.mixpanel.com/engage',
          query: 'https://eu.mixpanel.com/api',
          export: 'https://data-eu.mixpanel.com/api/2.0/export'
        },
        in: {
          track: 'https://api-in.mixpanel.com/track',
          import: 'https://api-in.mixpanel.com/import',
          engage: 'https://api-in.mixpanel.com/engage',
          query: 'https://in.mixpanel.com/api',
          export: 'https://data-in.mixpanel.com/api/2.0/export'
        }
      };

      this.endpoints = regionMap[region] || regionMap.us;

      // Initialize HTTP client for tracking and engage operations (uses project token)
      this.httpClient = axios.create({
        timeout: 30000
      });

      // Initialize query client (requires service account for query operations)
      if (serviceAccountUsername && serviceAccountSecret) {
        this.queryClient = axios.create({
          baseURL: this.endpoints.query,
          auth: {
            username: serviceAccountUsername,
            password: serviceAccountSecret
          },
          timeout: 60000
        });
      }

      // Initialize export client (requires service account)
      if (serviceAccountUsername && serviceAccountSecret) {
        this.exportClient = axios.create({
          baseURL: this.endpoints.export,
          auth: {
            username: serviceAccountUsername,
            password: serviceAccountSecret
          },
          timeout: 120000
        });
      }

      this.logger.log(`Mixpanel connector initialized successfully (region: ${region})`);
    } catch (error) {
      this.logger.error('Failed to initialize Mixpanel connector:', error);
      throw error;
    }
  }

  async testConnection(): Promise<ConnectorResponse<boolean>> {
    try {
      if (!this.httpClient) {
        throw new Error('Mixpanel client not initialized');
      }

      // Test connection by attempting to track a test event
      const testEvent = {
        event: '__connection_test__',
        properties: {
          token: this.projectToken,
          distinct_id: 'test_user',
          time: Math.floor(Date.now() / 1000)
        }
      };

      const data = querystring.stringify({
        data: Buffer.from(JSON.stringify([testEvent])).toString('base64')
      });

      const response = await this.httpClient.post(this.endpoints.track, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: response.data === 1 || response.data?.status === 1,
        data: true,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      this.logger.error('Mixpanel connection test failed:', error);
      return {
        success: false,
        data: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  // ==================== EVENT OPERATIONS ====================

  async trackEvent(input: any): Promise<ConnectorResponse> {
    try {
      const { event, distinctId, properties = {}, time, insertId, ip } = input;

      if (!event || !distinctId) {
        throw new Error('Event name and distinctId are required');
      }

      const eventData = {
        event,
        properties: {
          ...properties,
          token: this.projectToken,
          distinct_id: distinctId,
          time: time || Math.floor(Date.now() / 1000),
          ...(insertId && { $insert_id: insertId }),
          ...(ip && { ip })
        }
      };

      const data = querystring.stringify({
        data: Buffer.from(JSON.stringify([eventData])).toString('base64')
      });

      const response = await this.httpClient.post(this.endpoints.track, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: response.data === 1 || response.data?.status === 1,
        data: {
          event,
          distinct_id: distinctId,
          status: response.data
        }
      };
    } catch (error) {
      this.logger.error('Failed to track event:', error);
      return {
        success: false,
        error: {
          code: 'TRACK_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  async importEvents(input: any): Promise<ConnectorResponse> {
    try {
      const { events, strict = true } = input;

      if (!events || !Array.isArray(events) || events.length === 0) {
        throw new Error('Events array is required');
      }

      if (events.length > 2000) {
        throw new Error('Maximum 2000 events per batch');
      }

      const formattedEvents = events.map((evt) => ({
        event: evt.event,
        properties: {
          ...evt.properties,
          time: evt.time,
          distinct_id: evt.distinctId,
          ...(evt.insertId && { $insert_id: evt.insertId })
        }
      }));

      const auth = this.serviceAccountUsername && this.serviceAccountSecret
        ? {
            username: this.serviceAccountUsername,
            password: this.serviceAccountSecret
          }
        : {
            username: this.projectToken,
            password: ''
          };

      const response = await this.httpClient.post(
        this.endpoints.import,
        formattedEvents,
        {
          auth,
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            strict: strict ? '1' : '0',
            ...(this.projectId && { project_id: this.projectId })
          }
        }
      );

      return {
        success: response.data?.code === 200,
        data: {
          code: response.data?.code,
          num_records_imported: response.data?.num_records_imported,
          status: response.data?.status
        }
      };
    } catch (error) {
      this.logger.error('Failed to import events:', error);
      return {
        success: false,
        error: {
          code: 'IMPORT_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  // ==================== PROFILE OPERATIONS ====================

  private async engageOperation(operation: string, input: any): Promise<ConnectorResponse> {
    try {
      const { distinctId, properties, time, ip, ignoreTime, ignoreAlias } = input;

      if (!distinctId) {
        throw new Error('distinctId is required');
      }

      const engageData: any = {
        $token: this.projectToken,
        $distinct_id: distinctId,
        [operation]: properties
      };

      if (time) engageData.$time = time;
      if (ip) engageData.$ip = ip;
      if (ignoreTime) engageData.$ignore_time = true;
      if (ignoreAlias) engageData.$ignore_alias = true;

      const data = querystring.stringify({
        data: Buffer.from(JSON.stringify([engageData])).toString('base64')
      });

      const response = await this.httpClient.post(this.endpoints.engage, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: response.data === 1 || response.data?.status === 1,
        data: {
          distinct_id: distinctId,
          operation,
          status: response.data
        }
      };
    } catch (error) {
      this.logger.error(`Failed to perform ${operation} operation:`, error);
      return {
        success: false,
        error: {
          code: 'ENGAGE_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  async profileSet(input: any): Promise<ConnectorResponse> {
    return this.engageOperation('$set', input);
  }

  async profileSetOnce(input: any): Promise<ConnectorResponse> {
    return this.engageOperation('$set_once', input);
  }

  async profileIncrement(input: any): Promise<ConnectorResponse> {
    return this.engageOperation('$add', input);
  }

  async profileAppend(input: any): Promise<ConnectorResponse> {
    return this.engageOperation('$append', input);
  }

  async profileUnion(input: any): Promise<ConnectorResponse> {
    return this.engageOperation('$union', input);
  }

  async profileRemove(input: any): Promise<ConnectorResponse> {
    return this.engageOperation('$remove', input);
  }

  async profileUnset(input: any): Promise<ConnectorResponse> {
    return this.engageOperation('$unset', input);
  }

  async profileDelete(input: any): Promise<ConnectorResponse> {
    try {
      const { distinctId, time, ignoreAlias } = input;

      if (!distinctId) {
        throw new Error('distinctId is required');
      }

      const engageData: any = {
        $token: this.projectToken,
        $distinct_id: distinctId,
        $delete: ''
      };

      if (time) engageData.$time = time;
      if (ignoreAlias) engageData.$ignore_alias = true;

      const data = querystring.stringify({
        data: Buffer.from(JSON.stringify([engageData])).toString('base64')
      });

      const response = await this.httpClient.post(this.endpoints.engage, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: response.data === 1 || response.data?.status === 1,
        data: {
          distinct_id: distinctId,
          deleted: true,
          status: response.data
        }
      };
    } catch (error) {
      this.logger.error('Failed to delete profile:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  // ==================== QUERY OPERATIONS ====================

  async queryProfiles(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.queryClient) {
        throw new Error('Service account credentials required for query operations');
      }

      const { where, sessionId, page = 0, pageSize = 1000 } = input;

      const params: any = {
        page_size: pageSize
      };

      if (where) params.where = where;
      if (sessionId) {
        params.session_id = sessionId;
        params.page = page;
      }

      const response = await this.queryClient.post('/query/engage', params);

      return {
        success: true,
        data: {
          results: response.data.results,
          page: response.data.page,
          page_size: response.data.page_size,
          session_id: response.data.session_id,
          total: response.data.total
        }
      };
    } catch (error) {
      this.logger.error('Failed to query profiles:', error);
      return {
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  async queryInsights(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.queryClient) {
        throw new Error('Service account credentials required for query operations');
      }

      const { fromDate, toDate, events, type = 'general', unit = 'day' } = input;

      if (!fromDate || !toDate || !events || events.length === 0) {
        throw new Error('fromDate, toDate, and events are required');
      }

      const params = {
        from_date: fromDate,
        to_date: toDate,
        event: JSON.stringify(events),
        type,
        unit
      };

      const response = await this.queryClient.get('/2.0/insights', { params });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to query insights:', error);
      return {
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  async queryFunnels(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.queryClient) {
        throw new Error('Service account credentials required for query operations');
      }

      const { funnelId, fromDate, toDate, unit = 'day', interval = 1 } = input;

      if (!funnelId || !fromDate || !toDate) {
        throw new Error('funnelId, fromDate, and toDate are required');
      }

      const params = {
        funnel_id: funnelId,
        from_date: fromDate,
        to_date: toDate,
        unit,
        interval
      };

      const response = await this.queryClient.get('/2.0/funnels', { params });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to query funnels:', error);
      return {
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  async queryRetention(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.queryClient) {
        throw new Error('Service account credentials required for query operations');
      }

      const {
        fromDate,
        toDate,
        retentionType = 'birth',
        bornEvent,
        event,
        unit = 'day'
      } = input;

      if (!fromDate || !toDate) {
        throw new Error('fromDate and toDate are required');
      }

      const params: any = {
        from_date: fromDate,
        to_date: toDate,
        retention_type: retentionType,
        unit
      };

      if (bornEvent) params.born_event = bornEvent;
      if (event) params.event = event;

      const response = await this.queryClient.get('/2.0/retention', { params });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to query retention:', error);
      return {
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  async exportEvents(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.exportClient) {
        throw new Error('Service account credentials required for export operations');
      }

      const { fromDate, toDate, event, where, limit } = input;

      if (!fromDate || !toDate) {
        throw new Error('fromDate and toDate are required');
      }

      const params: any = {
        from_date: fromDate,
        to_date: toDate
      };

      if (event && event.length > 0) {
        params.event = JSON.stringify(event);
      }
      if (where) params.where = where;
      if (limit) params.limit = limit;

      const response = await this.exportClient.get('', { params });

      // Parse NDJSON response
      const events = response.data
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line));

      return {
        success: true,
        data: {
          events,
          count: events.length,
          format: 'ndjson'
        }
      };
    } catch (error) {
      this.logger.error('Failed to export events:', error);
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error.response?.data?.error || error.message,
          details: error
        }
      };
    }
  }

  // ==================== LEGACY METHODS (for compatibility) ====================

  async trackEventLegacy(eventName: string, properties?: any, userId?: string): Promise<ConnectorResponse> {
    return this.trackEvent({
      event: eventName,
      distinctId: userId || properties?.distinct_id,
      properties,
      time: properties?.timestamp
    });
  }

  async createUserProfile(distinctId: string, properties: any): Promise<ConnectorResponse> {
    return this.profileSet({ distinctId, properties });
  }

  async getAnalytics(query: any): Promise<ConnectorResponse> {
    const { event, type, unit, interval, from_date, to_date } = query;

    return this.queryInsights({
      fromDate: from_date,
      toDate: to_date,
      events: [event],
      type,
      unit
    });
  }

  async getFunnelAnalysis(funnelId: number, options?: any): Promise<ConnectorResponse> {
    return this.queryFunnels({
      funnelId,
      fromDate: options?.from_date,
      toDate: options?.to_date,
      unit: options?.unit,
      interval: options?.interval
    });
  }

  async createReport(reportConfig: any): Promise<ConnectorResponse> {
    const {
      name,
      events = [],
      type = 'general',
      unit = 'day',
      from_date,
      to_date
    } = reportConfig;

    if (!events.length) {
      throw new Error('At least one event is required for the report');
    }

    return this.queryInsights({
      fromDate: from_date,
      toDate: to_date,
      events,
      type,
      unit
    });
  }

  async getUserProfiles(userIds?: string[]): Promise<ConnectorResponse> {
    if (!userIds || userIds.length === 0) {
      throw new Error('User IDs are required');
    }

    // Query profiles one by one
    const profiles = [];
    for (const userId of userIds) {
      const result = await this.queryProfiles({
        where: `properties["$distinct_id"] == "${userId}"`,
        pageSize: 1
      });

      if (result.success && result.data?.results?.length > 0) {
        profiles.push(result.data.results[0]);
      }
    }

    return {
      success: true,
      data: {
        profiles,
        total_requested: userIds.length,
        total_found: profiles.length
      }
    };
  }

  // ==================== ACTION DISPATCHER ====================

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'track_event':
        return this.trackEvent(input);
      case 'import_events':
        return this.importEvents(input);
      case 'profile_set':
        return this.profileSet(input);
      case 'profile_set_once':
        return this.profileSetOnce(input);
      case 'profile_increment':
        return this.profileIncrement(input);
      case 'profile_append':
        return this.profileAppend(input);
      case 'profile_union':
        return this.profileUnion(input);
      case 'profile_remove':
        return this.profileRemove(input);
      case 'profile_unset':
        return this.profileUnset(input);
      case 'profile_delete':
        return this.profileDelete(input);
      case 'query_profiles':
        return this.queryProfiles(input);
      case 'query_insights':
        return this.queryInsights(input);
      case 'query_funnels':
        return this.queryFunnels(input);
      case 'query_retention':
        return this.queryRetention(input);
      case 'export_events':
        return this.exportEvents(input);
      case 'create_user_profile':
        return this.createUserProfile(input.distinct_id, input.properties);
      case 'get_events':
        return this.getAnalytics(input);
      case 'get_funnel':
        return this.getFunnelAnalysis(input.funnel_id, input);
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

  // ==================== BASE CONNECTOR ABSTRACT METHODS ====================

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
    throw new Error('Use specific action methods for Mixpanel operations');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    // No cleanup needed for Mixpanel HTTP clients
    this.logger.log('Mixpanel connector cleanup completed');
  }
}
