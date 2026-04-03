import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { ConnectorMetadata, ConnectorCategory, ConnectorType, AuthType, ConnectorRequest, ConnectorResponse, ConnectorAction } from '../../types';

@Injectable()
export class GoogleAnalyticsConnector extends BaseConnector {
  protected readonly logger = new Logger(GoogleAnalyticsConnector.name);
  private baseUrl = 'https://analyticsdata.googleapis.com';
  private baseUrlUA = 'https://analyticsreporting.googleapis.com';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Google Analytics',
      description: 'Get reports from Google Analytics 4 and search user activity from Universal Analytics',
      version: '1.0.0',
      category: ConnectorCategory.ANALYTICS,
      type: ConnectorType.GOOGLE_ANALYTICS,
      logoUrl: 'https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg',
      documentationUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics'
      ],
      actions: this.getActions(),
      triggers: [],
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerDay: 25000
      }
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Verify OAuth2 credentials exist
    if (!this.config.credentials?.accessToken) {
      throw new Error('Google Analytics requires OAuth2 authentication. Please authorize the connector.');
    }
    this.logger.log('Google Analytics connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test by making a simple API call to verify access
      // We can't test without a property ID, so we just check credentials exist
      return !!this.config.credentials?.accessToken;
    } catch (error) {
      this.logger.error('Google Analytics connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Google Analytics credentials not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const accessToken = this.config.credentials.accessToken;

    const response = await axios({
      method: request.method,
      url: request.endpoint.startsWith('http') ? request.endpoint : `${this.baseUrl}${request.endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...request.headers
      },
      data: request.body,
      params: request.queryParams
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_ga4_report':
        return await this.getGA4Report(input);
      case 'search_user_activity':
        return await this.searchUserActivity(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Google Analytics connector cleanup completed');
  }

  /**
   * Get GA4 Report
   */
  private async getGA4Report(input: any): Promise<ConnectorResponse> {
    try {
      const {
        propertyId,
        dateRange = 'last7days',
        startDate,
        endDate,
        metrics = ['activeUsers', 'sessions'],
        dimensions = ['date'],
        returnAll = false,
        limit = 100,
        simple = true,
        currencyCode,
        dimensionFilter,
        metricFilter,
        orderBys
      } = input;

      if (!propertyId) {
        return {
          success: false,
          error: {
            code: 'MISSING_PROPERTY_ID',
            message: 'GA4 Property ID is required'
          }
        };
      }

      // Prepare date ranges
      const dateRanges = this.prepareDateRange(dateRange, startDate, endDate);

      // Build request body
      const body: any = {
        dateRanges: dateRanges,
      };

      // Add metrics
      if (Array.isArray(metrics) && metrics.length > 0) {
        body.metrics = metrics.map((metric: any) => {
          if (typeof metric === 'string') {
            return { name: metric };
          }
          return metric;
        });
      }

      // Add dimensions
      if (Array.isArray(dimensions) && dimensions.length > 0) {
        body.dimensions = dimensions.map((dimension: any) => {
          if (typeof dimension === 'string') {
            return { name: dimension };
          }
          return dimension;
        });
      }

      // Add optional fields
      if (currencyCode) {
        body.currencyCode = currencyCode;
      }

      if (dimensionFilter) {
        body.dimensionFilter = dimensionFilter;
      }

      if (metricFilter) {
        body.metricFilter = metricFilter;
      }

      if (orderBys) {
        body.orderBys = orderBys;
      }

      // Add limit if not returning all
      if (!returnAll) {
        body.limit = limit;
      }

      // Make API request
      const endpoint = `/v1beta/properties/${propertyId}:runReport`;
      let responseData: any;

      if (returnAll) {
        // Implement pagination to get all results
        responseData = await this.getAllItems(endpoint, body);
      } else {
        responseData = await this.performRequest({
          method: 'POST',
          endpoint,
          body
        });
      }

      // Simplify response if needed
      let finalData = responseData;
      if (simple && responseData) {
        finalData = this.simplifyGA4Response(responseData);
      }

      return {
        success: true,
        data: finalData
      };

    } catch (error: any) {
      this.logger.error('GA4 Report request failed:', error.message);
      return {
        success: false,
        error: {
          code: 'GA4_REQUEST_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  /**
   * Search User Activity (Universal Analytics)
   */
  private async searchUserActivity(input: any): Promise<ConnectorResponse> {
    try {
      const {
        viewId,
        userId,
        returnAll = false,
        limit = 100,
        activityTypes
      } = input;

      if (!viewId) {
        return {
          success: false,
          error: {
            code: 'MISSING_VIEW_ID',
            message: 'View ID is required'
          }
        };
      }

      if (!userId) {
        return {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        };
      }

      // Build request body
      const body: any = {
        viewId,
        user: {
          userId
        }
      };

      // Add optional activity types filter
      if (activityTypes && Array.isArray(activityTypes) && activityTypes.length > 0) {
        body.activityTypes = activityTypes;
      }

      // Make API request
      const endpoint = `${this.baseUrlUA}/v4/userActivity:search`;
      let responseData: any;

      if (returnAll) {
        // Get all sessions with pagination
        responseData = await this.getAllUserActivityItems(endpoint, body);
      } else {
        // Get limited number of sessions
        body.pageSize = limit;
        responseData = await this.performRequest({
          method: 'POST',
          endpoint,
          body
        });
      }

      // Extract sessions from response
      const sessions = responseData.sessions || [];

      return {
        success: true,
        data: sessions
      };

    } catch (error: any) {
      this.logger.error('User Activity Search failed:', error.message);
      return {
        success: false,
        error: {
          code: 'USER_ACTIVITY_SEARCH_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  /**
   * Helper: Get all user activity items with pagination
   */
  private async getAllUserActivityItems(endpoint: string, body: any): Promise<any> {
    const allSessions: any[] = [];
    let pageToken: string | undefined;
    const pageSize = 100;

    do {
      const paginatedBody = {
        ...body,
        pageSize: pageSize
      };

      if (pageToken) {
        paginatedBody.pageToken = pageToken;
      }

      const data = await this.performRequest({
        method: 'POST',
        endpoint,
        body: paginatedBody
      });

      if (data.sessions && data.sessions.length > 0) {
        allSessions.push(...data.sessions);
      }

      pageToken = data.nextPageToken;

    } while (pageToken);

    return {
      sessions: allSessions
    };
  }

  /**
   * Helper: Prepare date range for GA4 request
   */
  private prepareDateRange(dateRange: string, startDate?: string, endDate?: string): any[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start: string;
    let end: string;

    switch (dateRange) {
      case 'today':
        start = 'today';
        end = 'today';
        break;

      case 'yesterday':
        start = 'yesterday';
        end = 'yesterday';
        break;

      case 'last7days':
        start = '7daysAgo';
        end = 'today';
        break;

      case 'last30days':
        start = '30daysAgo';
        end = 'today';
        break;

      case 'last90days':
        start = '90daysAgo';
        end = 'today';
        break;

      case 'thisMonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        start = thisMonthStart.toISOString().split('T')[0];
        end = 'today';
        break;

      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        start = lastMonthStart.toISOString().split('T')[0];
        end = lastMonthEnd.toISOString().split('T')[0];
        break;

      case 'thisYear':
        const thisYearStart = new Date(today.getFullYear(), 0, 1);
        start = thisYearStart.toISOString().split('T')[0];
        end = 'today';
        break;

      case 'lastYear':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        start = lastYearStart.toISOString().split('T')[0];
        end = lastYearEnd.toISOString().split('T')[0];
        break;

      case 'custom':
        if (!startDate || !endDate) {
          throw new Error('Custom date range requires startDate and endDate to be specified');
        }
        start = startDate;
        end = endDate;
        break;

      default:
        start = '7daysAgo';
        end = 'today';
    }

    return [{ startDate: start, endDate: end }];
  }

  /**
   * Helper: Simplify GA4 response to flat objects
   */
  private simplifyGA4Response(response: any): any[] {
    if (!response.rows || !Array.isArray(response.rows)) {
      return [];
    }

    const dimensionHeaders = (response.dimensionHeaders || []).map((header: any) => header.name);
    const metricHeaders = (response.metricHeaders || []).map((header: any) => header.name);

    const returnData: any[] = [];

    response.rows.forEach((row: any) => {
      const rowData: any = {};

      // Add dimensions
      dimensionHeaders.forEach((dimension: string, index: number) => {
        rowData[dimension] = row.dimensionValues?.[index]?.value || null;
      });

      // Add metrics
      metricHeaders.forEach((metric: string, index: number) => {
        rowData[metric] = row.metricValues?.[index]?.value || null;
      });

      returnData.push(rowData);
    });

    return returnData;
  }

  /**
   * Helper: Get all items from Google Analytics API with pagination
   */
  private async getAllItems(endpoint: string, body: any): Promise<any> {
    const allRows: any[] = [];
    let offset = 0;
    const limit = 100000; // GA4 max limit per request
    let hasMore = true;

    while (hasMore) {
      const paginatedBody = {
        ...body,
        limit: limit,
        offset: offset
      };

      const data = await this.performRequest({
        method: 'POST',
        endpoint,
        body: paginatedBody
      });

      if (data.rows && data.rows.length > 0) {
        allRows.push(...data.rows);
        offset += data.rows.length;

        // Check if there are more rows
        if (data.rowCount && offset >= data.rowCount) {
          hasMore = false;
        } else if (data.rows.length < limit) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // Get headers from first request
    const headersData = await this.performRequest({
      method: 'POST',
      endpoint,
      body: { ...body, limit: 1 }
    });

    // Return combined response
    return {
      rows: allRows,
      dimensionHeaders: headersData.dimensionHeaders || [],
      metricHeaders: headersData.metricHeaders || [],
      rowCount: allRows.length
    };
  }

  /**
   * Get available actions
   */
  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'get_ga4_report',
        name: 'Get GA4 Report',
        description: 'Get analytics data from Google Analytics 4 property',
        inputSchema: {
          propertyId: { type: 'string', required: true },
          dateRange: { type: 'string', required: true },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          metrics: { type: 'array', required: true },
          dimensions: { type: 'array' },
          returnAll: { type: 'boolean' },
          limit: { type: 'number' },
          simple: { type: 'boolean' },
          currencyCode: { type: 'string' },
          dimensionFilter: { type: 'object' },
          metricFilter: { type: 'object' },
          orderBys: { type: 'array' }
        },
        outputSchema: {
          rows: { type: 'array' },
          dimensionHeaders: { type: 'array' },
          metricHeaders: { type: 'array' },
          rowCount: { type: 'number' }
        }
      },
      {
        id: 'search_user_activity',
        name: 'Search User Activity',
        description: 'Search for user activity data from Universal Analytics',
        inputSchema: {
          viewId: { type: 'string', required: true },
          userId: { type: 'string', required: true },
          returnAll: { type: 'boolean' },
          limit: { type: 'number' },
          activityTypes: { type: 'array' }
        },
        outputSchema: {
          sessions: { type: 'array' }
        }
      }
    ];
  }
}
