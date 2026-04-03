// Google Calendar Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_CALENDAR_CONNECTOR: ConnectorDefinition = {
    name: 'google_calendar',
    display_name: 'Google Calendar',
    category: 'communication',
    description: 'Manage calendar events, check availability, and schedule meetings',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          {
            label: 'OAuth2 (Recommended)',
            value: 'oauth2',
            description: 'Connect with your Google account using one-click OAuth'
          },
          {
            label: 'Service Account',
            value: 'service_account',
            description: 'Use a service account JSON key for server-to-server authentication'
          }
        ],
        default: 'oauth2'
      },
      // OAuth2 fields (optional - for custom OAuth apps)
      {
        key: 'clientId',
        label: 'Client ID (Optional)',
        type: 'string',
        required: false,
        placeholder: 'Your Google OAuth Client ID',
        description: 'Leave empty to use one-click OAuth',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret (Optional)',
        type: 'password',
        required: false,
        placeholder: 'Your Google OAuth Client Secret',
        description: 'Leave empty to use one-click OAuth',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      // Service Account fields
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{"type": "service_account", "project_id": "...", ...}',
        description: 'Paste the entire JSON key file content from Google Cloud Console',
        helpUrl: 'https://cloud.google.com/iam/docs/creating-managing-service-account-keys',
        helpText: 'How to create a service account key',
        displayOptions: {
          authType: ['service_account']
        }
      },
      {
        key: 'delegatedEmail',
        label: 'Delegated Email (Optional)',
        type: 'string',
        required: false,
        placeholder: 'user@yourdomain.com',
        description: 'Email to impersonate (requires domain-wide delegation)',
        displayOptions: {
          authType: ['service_account']
        }
      }
    ],
    oauth_config: {
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ]
    },
    endpoints: {
      base_url: 'https://www.googleapis.com/calendar/v3'
    },
    webhook_support: false,
    rate_limits: {
      requests_per_second: 10,
      requests_per_minute: 600
    },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      {
        id: 'check_availability',
        name: 'Check Availability',
        description: 'Check if a calendar is free during a specific time period',
        category: 'Calendar',
        verified: false,
        api: {
          endpoint: '/freeBusy',
          method: 'POST',
          baseUrl: 'https://www.googleapis.com/calendar/v3',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar ID',
            placeholder: 'primary',
            default: 'primary',
            description: 'Calendar identifier (use "primary" for main calendar)'
          },
          timeMin: {
            type: 'string',
            required: true,
            label: 'Start Time',
            placeholder: '2024-01-01T09:00:00Z',
            description: 'Start time in ISO 8601 format'
          },
          timeMax: {
            type: 'string',
            required: true,
            label: 'End Time',
            placeholder: '2024-01-01T17:00:00Z',
            description: 'End time in ISO 8601 format'
          },
          timeZone: {
            type: 'string',
            label: 'Time Zone',
            placeholder: 'America/New_York',
            description: 'Time zone for the query (optional)'
          }
        },
        outputSchema: {
          calendars: {
            type: 'object',
            description: 'Availability information for requested calendars'
          },
          busy: {
            type: 'array',
            description: 'List of busy time periods'
          }
        }
      },
      {
        id: 'create_event',
        name: 'Create Event',
        description: 'Create a new calendar event',
        category: 'Events',
        icon: 'calendar-plus',
        verified: false,
        api: {
          endpoint: '/calendars/{calendarId}/events',
          method: 'POST',
          baseUrl: 'https://www.googleapis.com/calendar/v3',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar',
            description: 'Select calendar from your Google account',
            loadOptionsResource: 'calendars',
            loadOptionsDescription: 'Fetch calendars from Google Calendar',
            default: 'primary',
            order: 1,
            aiControlled: false
          },
          startDateTime: {
            type: 'string',
            inputType: 'datetime-local',
            required: true,
            label: 'Start',
            description: 'Event start time',
            placeholder: '2024-01-01T09:00:00',
            order: 2,
            aiControlled: false
          },
          endDateTime: {
            type: 'string',
            inputType: 'datetime-local',
            required: true,
            label: 'End',
            description: 'Event end time',
            placeholder: '2024-01-01T10:00:00',
            order: 3,
            aiControlled: false
          },
          useDefaultReminders: {
            type: 'boolean',
            label: 'Use Default Reminders',
            default: true,
            description: 'Whether to use default reminder settings',
            order: 4,
            aiControlled: false
          },
          summary: {
            type: 'string',
            label: 'Event Title',
            description: 'Title of the event',
            placeholder: 'Team Meeting',
            order: 5,
            aiControlled: true,
            aiDescription: 'Title of the calendar event'
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            description: 'Detailed description of the event',
            placeholder: 'Discussion about project updates',
            order: 6,
            aiControlled: true,
            aiDescription: 'Detailed description of the calendar event'
          },
          location: {
            type: 'string',
            label: 'Location',
            description: 'Event location',
            placeholder: 'Conference Room A',
            order: 7,
            aiControlled: true,
            aiDescription: 'Location where the event takes place'
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
          htmlLink: { type: 'string', description: 'Link to the event in Google Calendar' },
          summary: { type: 'string', description: 'Event title' },
          created: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'delete_event',
        name: 'Delete Event',
        description: 'Delete a calendar event',
        category: 'Events',
        verified: false,
        api: {
          endpoint: '/calendars/{calendarId}/events/{eventId}',
          method: 'DELETE',
          baseUrl: 'https://www.googleapis.com/calendar/v3',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            calendarId: 'calendarId',
            eventId: 'eventId',
            sendUpdates: 'sendUpdates'
          }
        },
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar ID',
            placeholder: 'primary',
            default: 'primary',
            description: 'Calendar identifier'
          },
          eventId: {
            type: 'string',
            required: true,
            label: 'Event ID',
            placeholder: 'abc123def456',
            description: 'ID of the event to delete'
          },
          sendUpdates: {
            type: 'select',
            label: 'Send Updates',
            description: 'Whether to send cancellation notifications',
            options: [
              { label: 'All', value: 'all' },
              { label: 'External Only', value: 'externalOnly' },
              { label: 'None', value: 'none' }
            ],
            default: 'none'
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      {
        id: 'get_event',
        name: 'Get Event',
        description: 'Get details of a specific calendar event',
        category: 'Events',
        verified: false,
        api: {
          endpoint: '/calendars/{calendarId}/events/{eventId}',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com/calendar/v3',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            calendarId: 'calendarId',
            eventId: 'eventId'
          }
        },
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar ID',
            placeholder: 'primary',
            default: 'primary',
            description: 'Calendar identifier'
          },
          eventId: {
            type: 'string',
            required: true,
            label: 'Event ID',
            placeholder: 'abc123def456',
            description: 'ID of the event to retrieve'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Event description' },
          location: { type: 'string', description: 'Event location' },
          start: { type: 'object', description: 'Start time information' },
          end: { type: 'object', description: 'End time information' },
          attendees: { type: 'array', description: 'List of attendees' },
          htmlLink: { type: 'string', description: 'Link to the event' }
        }
      },
      {
        id: 'get_many_events',
        name: 'Get Many Events',
        description: 'Retrieve multiple calendar events with optional filters',
        category: 'Events',
        verified: false,
        api: {
          endpoint: '/calendars/{calendarId}/events',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com/calendar/v3',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            calendarId: 'calendarId',
            timeMin: 'timeMin',
            timeMax: 'timeMax',
            maxResults: 'maxResults',
            pageToken: 'pageToken',
            q: 'q',
            orderBy: 'orderBy',
            singleEvents: 'singleEvents'
          }
        },
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar ID',
            placeholder: 'primary',
            default: 'primary',
            description: 'Calendar identifier'
          },
          timeMin: {
            type: 'string',
            label: 'Start Time',
            placeholder: '2024-01-01T00:00:00Z',
            description: 'Lower bound for event start time (ISO 8601)'
          },
          timeMax: {
            type: 'string',
            label: 'End Time',
            placeholder: '2024-12-31T23:59:59Z',
            description: 'Upper bound for event start time (ISO 8601)'
          },
          maxResults: {
            type: 'number',
            label: 'Max Results',
            default: 10,
            min: 1,
            max: 2500,
            description: 'Maximum number of events to return'
          },
          pageToken: {
            type: 'string',
            label: 'Page Token',
            description: 'Token for pagination'
          },
          q: {
            type: 'string',
            label: 'Search Query',
            placeholder: 'Team meeting',
            description: 'Free text search terms to find events'
          },
          orderBy: {
            type: 'select',
            label: 'Order By',
            options: [
              { label: 'Start Time', value: 'startTime' },
              { label: 'Updated', value: 'updated' }
            ],
            description: 'Order of returned events'
          },
          singleEvents: {
            type: 'boolean',
            label: 'Expand Recurring Events',
            default: true,
            description: 'Whether to expand recurring events into instances'
          }
        },
        outputSchema: {
          items: {
            type: 'array',
            description: 'List of calendar events'
          },
          nextPageToken: {
            type: 'string',
            description: 'Token for next page of results'
          },
          summary: {
            type: 'string',
            description: 'Calendar summary'
          }
        }
      },
      {
        id: 'update_event',
        name: 'Update Event',
        description: 'Update an existing calendar event',
        category: 'Events',
        verified: false,
        api: {
          endpoint: '/calendars/{calendarId}/events/{eventId}',
          method: 'PATCH',
          baseUrl: 'https://www.googleapis.com/calendar/v3',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            calendarId: 'calendarId',
            eventId: 'eventId',
            summary: 'summary',
            description: 'description',
            location: 'location',
            startDateTime: 'start.dateTime',
            endDateTime: 'end.dateTime',
            attendees: 'attendees',
            sendUpdates: 'sendUpdates'
          }
        },
        inputSchema: {
          calendarId: {
            type: 'string',
            required: true,
            label: 'Calendar ID',
            placeholder: 'primary',
            default: 'primary',
            description: 'Calendar identifier'
          },
          eventId: {
            type: 'string',
            required: true,
            label: 'Event ID',
            placeholder: 'abc123def456',
            description: 'ID of the event to update'
          },
          summary: {
            type: 'string',
            label: 'Event Title',
            placeholder: 'Updated Team Meeting',
            description: 'New title for the event',
            aiControlled: true,
            aiDescription: 'Updated title for the calendar event'
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            description: 'Updated event description',
            aiControlled: true,
            aiDescription: 'Updated description for the calendar event'
          },
          location: {
            type: 'string',
            label: 'Location',
            description: 'Updated event location',
            aiControlled: true,
            aiDescription: 'Updated location for the calendar event'
          },
          startDateTime: {
            type: 'string',
            label: 'Start Date & Time',
            placeholder: '2024-01-01T09:00:00',
            description: 'Updated start time in ISO 8601 format'
          },
          endDateTime: {
            type: 'string',
            label: 'End Date & Time',
            placeholder: '2024-01-01T10:00:00',
            description: 'Updated end time in ISO 8601 format'
          },
          timeZone: {
            type: 'string',
            label: 'Time Zone',
            placeholder: 'America/New_York',
            description: 'Updated time zone'
          },
          attendees: {
            type: 'array',
            label: 'Attendees',
            description: 'Updated list of attendees',
            itemSchema: {
              email: {
                type: 'string',
                required: true,
                label: 'Email',
                placeholder: 'attendee@example.com'
              },
              optional: {
                type: 'boolean',
                label: 'Optional',
                default: false
              }
            }
          },
          sendUpdates: {
            type: 'select',
            label: 'Send Updates',
            description: 'Whether to send update notifications',
            options: [
              { label: 'All', value: 'all' },
              { label: 'External Only', value: 'externalOnly' },
              { label: 'None', value: 'none' }
            ],
            default: 'none'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Updated event title' },
          htmlLink: { type: 'string', description: 'Link to the event' },
          updated: { type: 'string', description: 'Last update timestamp' }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'event_created',
        name: 'Event Created',
        description: 'Triggers when a new event is created in the calendar',
        eventType: 'polling',
        verified: false,
        pollingEnabled: true,
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
          pollInterval: {
            type: 'number',
            label: 'Poll Interval (minutes)',
            default: 5,
            min: 1,
            max: 60,
            description: 'How often to check for new events'
          }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'ID of the created event' },
          summary: { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Event description' },
          location: { type: 'string', description: 'Event location' },
          start: { type: 'object', description: 'Start time information' },
          end: { type: 'object', description: 'End time information' },
          attendees: { type: 'array', description: 'List of attendees' },
          created: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'event_updated',
        name: 'Event Updated',
        description: 'Triggers when an event is modified',
        eventType: 'polling',
        verified: false,
        pollingEnabled: true,
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
          pollInterval: {
            type: 'number',
            label: 'Poll Interval (minutes)',
            default: 5,
            min: 1,
            max: 60
          }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'ID of the updated event' },
          summary: { type: 'string', description: 'Event title' },
          changes: { type: 'object', description: 'Fields that were changed' },
          updated: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'event_cancelled',
        name: 'Event Cancelled',
        description: 'Triggers when an event is cancelled',
        eventType: 'polling',
        verified: false,
        pollingEnabled: true,
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
          pollInterval: {
            type: 'number',
            label: 'Poll Interval (minutes)',
            default: 5,
            min: 1,
            max: 60
          }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'ID of the cancelled event' },
          summary: { type: 'string', description: 'Event title' },
          originalStart: { type: 'object', description: 'Original start time' },
          cancelled: { type: 'string', description: 'Cancellation timestamp' }
        }
      },
      {
        id: 'event_started',
        name: 'Event Started',
        description: 'Triggers when an event start time is reached',
        eventType: 'polling',
        verified: false,
        pollingEnabled: true,
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
          pollInterval: {
            type: 'number',
            label: 'Poll Interval (minutes)',
            default: 1,
            min: 1,
            max: 15,
            description: 'Check frequency (shorter for timely notifications)'
          },
          reminderMinutes: {
            type: 'number',
            label: 'Minutes Before Start',
            default: 0,
            min: 0,
            max: 60,
            description: 'Trigger X minutes before event starts (0 = at start time)'
          }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' },
          start: { type: 'object', description: 'Start time information' },
          end: { type: 'object', description: 'End time information' },
          location: { type: 'string', description: 'Event location' },
          hangoutLink: { type: 'string', description: 'Meeting link if available' }
        }
      },
      {
        id: 'event_ended',
        name: 'Event Ended',
        description: 'Triggers when an event end time is reached',
        eventType: 'polling',
        verified: false,
        pollingEnabled: true,
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
          pollInterval: {
            type: 'number',
            label: 'Poll Interval (minutes)',
            default: 1,
            min: 1,
            max: 15
          }
        },
        outputSchema: {
          eventId: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event title' },
          start: { type: 'object', description: 'Start time' },
          end: { type: 'object', description: 'End time' },
          duration: { type: 'number', description: 'Event duration in minutes' }
        }
      }
    ]
  };
