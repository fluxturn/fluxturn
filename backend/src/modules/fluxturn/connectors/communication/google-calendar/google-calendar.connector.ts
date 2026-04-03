import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  OAuthTokens
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

// Google Calendar-specific interfaces
export interface CalendarEventRequest {
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  attendees?: Array<{
    email: string;
    optional?: boolean;
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface CalendarUpdateRequest extends CalendarEventRequest {
  eventId: string;
}

export interface CalendarFreeBusyRequest {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  timeZone?: string;
}

@Injectable()
export class GoogleCalendarConnector extends BaseConnector implements IConnector {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Google Calendar',
      description: 'Manage calendar events, check availability, and schedule meetings',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.GOOGLE_CALENDAR,
      logoUrl: 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png',
      documentationUrl: 'https://developers.google.com/calendar/api',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Log credential info for debugging
      this.logger.log('[initializeConnection] Credential keys:', Object.keys(this.config.credentials || {}).join(', '));

      const hasAccessToken = !!this.config.credentials?.accessToken;
      const hasRefreshToken = !!this.config.credentials?.refreshToken;
      const expiresAt = this.config.credentials?.expiresAt;

      this.logger.log(`[initializeConnection] Has accessToken: ${hasAccessToken}, Has refreshToken: ${hasRefreshToken}, expiresAt: ${expiresAt}`);

      // Check if we need to refresh the OAuth token
      if (expiresAt) {
        const expirationTime = new Date(expiresAt).getTime();
        const currentTime = Date.now();
        const fiveMinutesInMs = 5 * 60 * 1000;

        this.logger.log(`[initializeConnection] Token expiration check - Current: ${new Date(currentTime).toISOString()}, Expires: ${new Date(expirationTime).toISOString()}, Expired: ${currentTime >= expirationTime}`);

        // Refresh if expired or expiring within 5 minutes
        if (currentTime >= expirationTime - fiveMinutesInMs) {
          this.logger.log('[initializeConnection] OAuth token expired or expiring soon, refreshing...');
          try {
            await this.refreshTokens();
            this.logger.log('[initializeConnection] OAuth token refreshed successfully');
          } catch (error) {
            this.logger.error('[initializeConnection] Failed to refresh OAuth token:', error.message);
            throw new Error('OAuth token expired. Please reconnect your Google Calendar account.');
          }
        }
      } else if (!hasAccessToken) {
        throw new Error('No access token found. Please reconnect your Google Calendar account.');
      } else {
        this.logger.warn('[initializeConnection] No expiration time found for access token. Assuming token is valid.');
      }

      this.logger.log('[initializeConnection] Testing connection to Google Calendar API...');
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/me/calendarList`,
        headers: this.getAuthHeaders(),
        queryParams: { maxResults: 1 }
      });

      if (!response.items) {
        throw new Error('Failed to initialize Google Calendar connection - no calendars found');
      }

      this.logger.log('[initializeConnection] Google Calendar connector initialized successfully');
    } catch (error) {
      this.logger.error('[initializeConnection] Failed to initialize Google Calendar connection:', error);

      // Provide helpful error messages
      if (error.message && error.message.includes('403')) {
        throw new Error('Google Calendar API access denied (403). Please ensure: 1) Google Calendar API is enabled in Google Cloud Console, 2) Your OAuth credential has calendar scopes, 3) You have reconnected your credential after enabling the API.');
      } else if (error.message && error.message.includes('401')) {
        throw new Error('Google Calendar authentication failed (401). Please reconnect your Google Calendar account.');
      } else {
        throw new Error(`Failed to initialize Google Calendar connection: ${error.message}`);
      }
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/me/calendarList`,
        headers: this.getAuthHeaders(),
        queryParams: { maxResults: 1 }
      });
      return !!response.items;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Google Calendar health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Google Calendar API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'check_availability':
        return this.checkAvailability(input);
      case 'create_event':
        return this.createEvent(input);
      case 'delete_event':
        return this.deleteEvent(input);
      case 'get_event':
        return this.getEvent(input);
      case 'get_many_events':
        return this.getManyEvents(input);
      case 'update_event':
        return this.updateEvent(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Google Calendar connector cleanup completed');
  }

  // Google Calendar-specific methods
  async checkAvailability(request: CalendarFreeBusyRequest): Promise<ConnectorResponse> {
    try {
      const { calendarId, timeMin, timeMax, timeZone } = request;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/freeBusy`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          timeMin,
          timeMax,
          timeZone,
          items: [{ id: calendarId }]
        }
      });

      const calendarBusy = response.calendars?.[calendarId];

      return {
        success: true,
        data: {
          calendars: response.calendars,
          busy: calendarBusy?.busy || [],
          errors: calendarBusy?.errors
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to check availability');
    }
  }

  async createEvent(request: CalendarEventRequest): Promise<ConnectorResponse> {
    try {
      const {
        calendarId,
        summary,
        description,
        location,
        startDateTime,
        endDateTime,
        timeZone = 'UTC',
        attendees,
        reminders,
        recurrence,
        sendUpdates = 'none'
      } = request;

      const eventBody: any = {
        summary,
        description,
        location,
        start: {
          dateTime: startDateTime,
          timeZone
        },
        end: {
          dateTime: endDateTime,
          timeZone
        }
      };

      if (attendees && attendees.length > 0) {
        eventBody.attendees = attendees.map(a => ({
          email: a.email,
          optional: a.optional || false
        }));
      }

      if (reminders) {
        eventBody.reminders = reminders;
      }

      if (recurrence && recurrence.length > 0) {
        eventBody.recurrence = recurrence;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/calendars/${calendarId}/events`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        queryParams: {
          sendUpdates
        },
        body: eventBody
      });

      return {
        success: true,
        data: {
          id: response.id,
          summary: response.summary,
          htmlLink: response.htmlLink,
          hangoutLink: response.hangoutLink,
          created: response.created
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create event');
    }
  }

  async deleteEvent(request: { calendarId: string; eventId: string; sendUpdates?: string }): Promise<ConnectorResponse> {
    try {
      const { calendarId, eventId, sendUpdates = 'none' } = request;

      await this.performRequest({
        method: 'DELETE',
        endpoint: `${this.baseUrl}/calendars/${calendarId}/events/${eventId}`,
        headers: this.getAuthHeaders(),
        queryParams: {
          sendUpdates
        }
      });

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete event');
    }
  }

  async getEvent(request: { calendarId: string; eventId: string }): Promise<ConnectorResponse> {
    try {
      const { calendarId, eventId } = request;

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/calendars/${calendarId}/events/${eventId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get event');
    }
  }

  async getManyEvents(request: any): Promise<ConnectorResponse> {
    try {
      const {
        calendarId,
        timeMin,
        timeMax,
        maxResults = 10,
        pageToken,
        q,
        orderBy,
        singleEvents = true
      } = request;

      const params: any = {
        maxResults,
        singleEvents
      };

      if (timeMin) params.timeMin = timeMin;
      if (timeMax) params.timeMax = timeMax;
      if (pageToken) params.pageToken = pageToken;
      if (q) params.q = q;
      if (orderBy) params.orderBy = orderBy;

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/calendars/${calendarId}/events`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          items: response.items || [],
          nextPageToken: response.nextPageToken,
          summary: response.summary
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get events');
    }
  }

  async updateEvent(request: CalendarUpdateRequest): Promise<ConnectorResponse> {
    try {
      const {
        calendarId,
        eventId,
        summary,
        description,
        location,
        startDateTime,
        endDateTime,
        timeZone,
        attendees,
        sendUpdates = 'none'
      } = request;

      const eventBody: any = {};

      if (summary) eventBody.summary = summary;
      if (description) eventBody.description = description;
      if (location) eventBody.location = location;
      if (startDateTime) {
        eventBody.start = {
          dateTime: startDateTime,
          timeZone: timeZone || 'UTC'
        };
      }
      if (endDateTime) {
        eventBody.end = {
          dateTime: endDateTime,
          timeZone: timeZone || 'UTC'
        };
      }
      if (attendees) {
        eventBody.attendees = attendees.map(a => ({
          email: a.email,
          optional: a.optional || false
        }));
      }

      const response = await this.performRequest({
        method: 'PATCH',
        endpoint: `${this.baseUrl}/calendars/${calendarId}/events/${eventId}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        queryParams: {
          sendUpdates
        },
        body: eventBody
      });

      return {
        success: true,
        data: {
          id: response.id,
          summary: response.summary,
          htmlLink: response.htmlLink,
          updated: response.updated
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update event');
    }
  }

  async refreshTokens(): Promise<OAuthTokens> {
    try {
      const refreshToken = this.config.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // For centralized OAuth, use environment variables
      // For user-provided OAuth, use credentials
      const clientId = this.config.credentials.clientId || process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = this.config.credentials.clientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Client ID and Secret are required for token refresh. Either provide them in credentials or configure GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables.');
      }

      this.logger.log('[refreshTokens] Attempting to refresh OAuth token...');

      const tokenResponse = await this.apiUtils.executeRequest({
        method: 'POST',
        endpoint: 'https://oauth2.googleapis.com/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }).toString()
      });

      if (!tokenResponse.success) {
        this.logger.error('[refreshTokens] Failed to refresh token:', tokenResponse.error);
        throw new Error('Failed to refresh OAuth token');
      }

      const tokens: OAuthTokens = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokenResponse.data.expires_in * 1000)),
        scope: tokenResponse.data.scope,
        tokenType: tokenResponse.data.token_type
      };

      // Update stored credentials
      this.config.credentials.accessToken = tokens.accessToken;
      this.config.credentials.refreshToken = tokens.refreshToken;
      this.config.credentials.expiresAt = tokens.expiresAt.toISOString();

      this.logger.log('[refreshTokens] Successfully refreshed OAuth token');

      return tokens;
    } catch (error) {
      this.logger.error('[refreshTokens] Error:', error.message);
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  // Resource loading method for calendar dropdown
  async getCalendars(): Promise<Array<{ label: string; value: string }>> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/me/calendarList`,
        headers: this.getAuthHeaders(),
        queryParams: {
          maxResults: 250,
          showHidden: false
        }
      });

      if (!response.items || response.items.length === 0) {
        return [{
          label: 'Primary Calendar',
          value: 'primary'
        }];
      }

      return response.items.map((calendar: any) => ({
        label: calendar.summary || calendar.id,
        value: calendar.id
      }));
    } catch (error) {
      this.logger.error('Failed to fetch calendars:', error);
      // Return primary calendar as fallback
      return [{
        label: 'Primary Calendar',
        value: 'primary'
      }];
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return this.authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'check_availability',
        name: 'Check Availability',
        description: 'Check if a calendar is free during a specific time period',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar to check availability',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          timeMin: { type: 'string', required: true, description: 'Start time (ISO 8601)' },
          timeMax: { type: 'string', required: true, description: 'End time (ISO 8601)' },
          timeZone: { type: 'string', description: 'Time zone' }
        },
        outputSchema: {
          calendars: { type: 'object', description: 'Availability information' },
          busy: { type: 'array', description: 'Busy time periods' }
        }
      },
      {
        id: 'create_event',
        name: 'Create Event',
        description: 'Create a new calendar event',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar from your Google account',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary',
            order: 1
          },
          startDateTime: {
            type: 'string',
            required: true,
            label: 'Start',
            description: 'Event start time',
            placeholder: '2024-01-01T09:00:00',
            order: 2
          },
          endDateTime: {
            type: 'string',
            required: true,
            label: 'End',
            description: 'Event end time',
            placeholder: '2024-01-01T10:00:00',
            order: 3
          },
          useDefaultReminders: {
            type: 'boolean',
            label: 'Use Default Reminders',
            default: true,
            order: 4
          },
          summary: {
            type: 'string',
            label: 'Event Title',
            description: 'Title of the event',
            placeholder: 'Team Meeting',
            order: 5
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            description: 'Detailed description of the event',
            placeholder: 'Discussion about project updates',
            order: 6
          },
          location: {
            type: 'string',
            label: 'Location',
            description: 'Event location',
            placeholder: 'Conference Room A',
            order: 7
          },
          timeZone: {
            type: 'string',
            label: 'Time Zone',
            description: 'Time zone for the event',
            placeholder: 'America/New_York',
            default: 'UTC',
            order: 8
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Event ID' },
          htmlLink: { type: 'string', description: 'Link to event' },
          summary: { type: 'string', description: 'Event title' },
          created: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'delete_event',
        name: 'Delete Event',
        description: 'Delete a calendar event',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar containing the event',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          eventId: { type: 'string', required: true, description: 'Event ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Deletion success' }
        }
      },
      {
        id: 'get_event',
        name: 'Get Event',
        description: 'Get details of a specific event',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar containing the event',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          eventId: { type: 'string', required: true, description: 'Event ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' }
        }
      },
      {
        id: 'get_many_events',
        name: 'Get Many Events',
        description: 'Retrieve multiple calendar events',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar to retrieve events from',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          maxResults: { type: 'number', description: 'Max results' },
          timeMin: { type: 'string', description: 'Start time filter' },
          timeMax: { type: 'string', description: 'End time filter' }
        },
        outputSchema: {
          items: { type: 'array', description: 'Calendar events' }
        }
      },
      {
        id: 'update_event',
        name: 'Update Event',
        description: 'Update an existing calendar event',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar containing the event',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          eventId: { type: 'string', required: true, description: 'Event ID' },
          summary: { type: 'string', description: 'Updated title' },
          startDateTime: { type: 'string', description: 'Updated start time' },
          endDateTime: { type: 'string', description: 'Updated end time' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Event ID' },
          updated: { type: 'string', description: 'Update timestamp' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'event_cancelled',
        name: 'On Event Cancelled',
        description: 'Triggers when an event is cancelled',
        eventType: 'polling',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar to monitor for cancellations',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          pollInterval: { type: 'number', default: 5, description: 'Polling interval in minutes' }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'Cancelled event ID' },
          summary: { type: 'string', description: 'Event title' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'event_created',
        name: 'On Event Created',
        description: 'Triggers when a new event is created',
        eventType: 'polling',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar to monitor for new events',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          pollInterval: { type: 'number', default: 5, description: 'Polling interval in minutes' }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'event_ended',
        name: 'On Event Ended',
        description: 'Triggers when an event end time is reached',
        eventType: 'polling',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar to monitor for ended events',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          pollInterval: { type: 'number', default: 1, description: 'Check every minute for ended events' }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'event_started',
        name: 'On Event Started',
        description: 'Triggers when an event start time is reached',
        eventType: 'polling',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar to monitor for starting events',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          pollInterval: { type: 'number', default: 1, description: 'Check every minute for starting events' }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'event_updated',
        name: 'On Event Updated',
        description: 'Triggers when an event is modified',
        eventType: 'polling',
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar to monitor for updates',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary'
          },
          pollInterval: { type: 'number', default: 5, description: 'Polling interval in minutes' }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' }
        },
        webhookRequired: false,
        pollingEnabled: true
      }
    ];
  }
}
