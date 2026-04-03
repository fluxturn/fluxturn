import { ConnectorDefinition } from '../../shared';

/**
 * Zoom Connector Definition
 *
 * Zoom is a video conferencing platform with comprehensive APIs for meetings, webinars, and more.
 * This connector provides full access to Zoom's meeting and webinar management capabilities.
 *
 * Authentication: OAuth2 (Centralized & Manual)
 * API Documentation: https://developers.zoom.us/docs/api/
 *
 * Features:
 * - Meeting management (create, update, delete, retrieve)
 * - Webinar management (create, update, delete, retrieve)
 * - Meeting registrant management
 * - User management
 * - Webhook support for real-time events
 * - Support for recurring meetings and webinars
 */
export const ZOOM_CONNECTOR: ConnectorDefinition = {
  name: 'zoom',
  display_name: 'Zoom',
  category: 'video',
  description: 'Video conferencing platform for meetings, webinars, and collaboration with comprehensive automation capabilities',
  auth_type: 'oauth2',

  auth_fields: [
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Enter your Zoom OAuth Client ID',
      description: 'OAuth Client ID from your Zoom App',
      helpUrl: 'https://marketplace.zoom.us/develop/create',
      helpText: 'How to create a Zoom OAuth App'
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter your Zoom OAuth Client Secret',
      description: 'OAuth Client Secret from your Zoom App'
    },
    {
      key: 'redirect_uri',
      label: 'Redirect URI',
      type: 'string',
      required: true,
      default: 'http://localhost:5005/api/oauth/zoom/callback',
      placeholder: 'https://your-domain.com/api/oauth/zoom/callback',
      description: 'Copy this URI to your Zoom App OAuth settings'
    }
  ],

  oauth_config: {
    authorization_url: 'https://zoom.us/oauth/authorize',
    token_url: 'https://zoom.us/oauth/token',
    scopes: [
      'meeting:read',
      'meeting:write',
      'webinar:read',
      'webinar:write',
      'user:read',
      'recording:read'
    ]
  },

  endpoints: {
    base_url: 'https://api.zoom.us/v2',
    meeting: {
      create: '/users/{userId}/meetings',
      get: '/meetings/{meetingId}',
      list: '/users/{userId}/meetings',
      update: '/meetings/{meetingId}',
      delete: '/meetings/{meetingId}',
      status: '/meetings/{meetingId}/status',
      registrants: '/meetings/{meetingId}/registrants'
    },
    webinar: {
      create: '/users/{userId}/webinars',
      get: '/webinars/{webinarId}',
      list: '/users/{userId}/webinars',
      update: '/webinars/{webinarId}',
      delete: '/webinars/{webinarId}',
      registrants: '/webinars/{webinarId}/registrants'
    },
    user: {
      me: '/users/me',
      get: '/users/{userId}',
      list: '/users'
    },
    recording: {
      list: '/users/{userId}/recordings',
      get: '/meetings/{meetingId}/recordings'
    }
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 10
  },

  supported_actions: [
    // ============================================
    // MEETING OPERATIONS
    // ============================================
    {
      id: 'create_meeting',
      name: 'Create Meeting',
      description: 'Create a new Zoom meeting',
      category: 'Meetings',
      icon: 'video',
      verified: false,
      api: {
        endpoint: '/users/{userId}/meetings',
        method: 'POST',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          userId: 'userId'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          default: 'me',
          placeholder: 'me',
          description: 'User ID or "me" for the authenticated user'
        },
        topic: {
          type: 'string',
          required: true,
          label: 'Meeting Topic',
          placeholder: 'Weekly Team Meeting',
          description: 'The topic/title of the meeting',
          aiControlled: true,
          aiDescription: 'Title/topic of the Zoom meeting'
        },
        type: {
          type: 'select',
          label: 'Meeting Type',
          default: 2,
          options: [
            { label: 'Instant Meeting', value: 1 },
            { label: 'Scheduled Meeting', value: 2 },
            { label: 'Recurring with No Fixed Time', value: 3 },
            { label: 'Recurring with Fixed Time', value: 8 }
          ],
          description: 'Type of meeting'
        },
        startTime: {
          type: 'string',
          label: 'Start Time',
          inputType: 'datetime-local',
          placeholder: '2024-12-31T10:00:00Z',
          description: 'Meeting start time (ISO 8601 format)',
          displayOptions: {
            show: {
              type: [2, 8]
            }
          }
        },
        duration: {
          type: 'number',
          label: 'Duration (minutes)',
          default: 60,
          min: 0,
          description: 'Meeting duration in minutes'
        },
        timezone: {
          type: 'string',
          label: 'Timezone',
          default: 'UTC',
          placeholder: 'America/New_York',
          description: 'Timezone for the meeting (e.g., America/New_York)'
        },
        password: {
          type: 'string',
          label: 'Meeting Password',
          inputType: 'password',
          maxLength: 10,
          description: 'Password to join the meeting'
        },
        agenda: {
          type: 'string',
          label: 'Agenda',
          inputType: 'textarea',
          maxLength: 2000,
          description: 'Meeting agenda/description',
          aiControlled: true,
          aiDescription: 'Detailed agenda or description of the meeting'
        },
        autoRecording: {
          type: 'select',
          label: 'Auto Recording',
          default: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Local', value: 'local' },
            { label: 'Cloud', value: 'cloud' }
          ],
          description: 'Automatic recording option'
        },
        waitingRoom: {
          type: 'boolean',
          label: 'Enable Waiting Room',
          default: true,
          description: 'Enable waiting room for participants'
        },
        joinBeforeHost: {
          type: 'boolean',
          label: 'Allow Join Before Host',
          default: false,
          description: 'Allow participants to join before host'
        },
        muteUponEntry: {
          type: 'boolean',
          label: 'Mute Upon Entry',
          default: false,
          description: 'Mute participants upon entry'
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Meeting ID' },
        uuid: { type: 'string', description: 'Meeting UUID' },
        host_id: { type: 'string', description: 'Host user ID' },
        topic: { type: 'string', description: 'Meeting topic' },
        type: { type: 'number', description: 'Meeting type' },
        start_time: { type: 'string', description: 'Meeting start time' },
        duration: { type: 'number', description: 'Meeting duration' },
        timezone: { type: 'string', description: 'Meeting timezone' },
        join_url: { type: 'string', description: 'Join URL for participants' },
        password: { type: 'string', description: 'Meeting password' },
        start_url: { type: 'string', description: 'Start URL for host' }
      }
    },
    {
      id: 'get_meeting',
      name: 'Get Meeting',
      description: 'Retrieve details of a specific meeting',
      category: 'Meetings',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/meetings/{meetingId}',
        method: 'GET',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          meetingId: 'meetingId'
        }
      },
      inputSchema: {
        meetingId: {
          type: 'string',
          required: true,
          label: 'Meeting ID',
          placeholder: '123456789',
          description: 'The meeting ID or UUID'
        },
        occurrenceId: {
          type: 'string',
          label: 'Occurrence ID',
          description: 'Meeting occurrence ID for recurring meetings'
        },
        showPreviousOccurrences: {
          type: 'boolean',
          label: 'Show Previous Occurrences',
          default: false,
          description: 'Show previous occurrences of recurring meetings'
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Meeting ID' },
        uuid: { type: 'string', description: 'Meeting UUID' },
        host_id: { type: 'string', description: 'Host user ID' },
        topic: { type: 'string', description: 'Meeting topic' },
        type: { type: 'number', description: 'Meeting type' },
        start_time: { type: 'string', description: 'Meeting start time' },
        duration: { type: 'number', description: 'Meeting duration' },
        timezone: { type: 'string', description: 'Meeting timezone' },
        join_url: { type: 'string', description: 'Join URL' },
        password: { type: 'string', description: 'Meeting password' },
        settings: { type: 'object', description: 'Meeting settings' }
      }
    },
    {
      id: 'list_meetings',
      name: 'List Meetings',
      description: 'Get a list of all meetings for a user',
      category: 'Meetings',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/users/{userId}/meetings',
        method: 'GET',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          userId: 'userId',
          type: 'type',
          page_size: 'page_size',
          next_page_token: 'next_page_token'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          default: 'me',
          placeholder: 'me',
          description: 'User ID or "me" for authenticated user'
        },
        type: {
          type: 'select',
          label: 'Meeting Type',
          default: 'scheduled',
          options: [
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Live', value: 'live' },
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Previous Meetings', value: 'previous_meetings' }
          ],
          description: 'Type of meetings to retrieve'
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 30,
          min: 1,
          max: 300,
          description: 'Number of meetings to return',
          displayOptions: {
            hide: {
              returnAll: [true]
            }
          }
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all meetings (ignores limit)'
        }
      },
      outputSchema: {
        meetings: {
          type: 'array',
          description: 'Array of meeting objects',
          properties: {
            id: { type: 'number' },
            uuid: { type: 'string' },
            topic: { type: 'string' },
            type: { type: 'number' },
            start_time: { type: 'string' },
            duration: { type: 'number' },
            join_url: { type: 'string' }
          }
        },
        totalRecords: { type: 'number', description: 'Total number of meetings' }
      }
    },
    {
      id: 'update_meeting',
      name: 'Update Meeting',
      description: 'Update an existing meeting',
      category: 'Meetings',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/meetings/{meetingId}',
        method: 'PATCH',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          meetingId: 'meetingId'
        }
      },
      inputSchema: {
        meetingId: {
          type: 'string',
          required: true,
          label: 'Meeting ID',
          placeholder: '123456789',
          description: 'The meeting ID to update'
        },
        topic: {
          type: 'string',
          label: 'Meeting Topic',
          description: 'Update the meeting topic',
          aiControlled: true,
          aiDescription: 'Updated title/topic for the meeting'
        },
        startTime: {
          type: 'string',
          label: 'Start Time',
          inputType: 'datetime-local',
          description: 'Update meeting start time (ISO 8601)'
        },
        duration: {
          type: 'number',
          label: 'Duration (minutes)',
          min: 0,
          description: 'Update meeting duration'
        },
        password: {
          type: 'string',
          label: 'Meeting Password',
          inputType: 'password',
          description: 'Update meeting password'
        },
        agenda: {
          type: 'string',
          label: 'Agenda',
          inputType: 'textarea',
          description: 'Update meeting agenda',
          aiControlled: true,
          aiDescription: 'Updated agenda for the meeting'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'delete_meeting',
      name: 'Delete Meeting',
      description: 'Delete a meeting',
      category: 'Meetings',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/meetings/{meetingId}',
        method: 'DELETE',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          meetingId: 'meetingId'
        }
      },
      inputSchema: {
        meetingId: {
          type: 'string',
          required: true,
          label: 'Meeting ID',
          placeholder: '123456789',
          description: 'The meeting ID to delete'
        },
        occurrenceId: {
          type: 'string',
          label: 'Occurrence ID',
          description: 'Delete specific occurrence of recurring meeting'
        },
        scheduleReminder: {
          type: 'boolean',
          label: 'Send Cancellation Email',
          default: true,
          description: 'Notify registrants about cancellation'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // ============================================
    // WEBINAR OPERATIONS
    // ============================================
    {
      id: 'create_webinar',
      name: 'Create Webinar',
      description: 'Create a new Zoom webinar',
      category: 'Webinars',
      icon: 'tv',
      verified: false,
      api: {
        endpoint: '/users/{userId}/webinars',
        method: 'POST',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          userId: 'userId'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          default: 'me',
          placeholder: 'me',
          description: 'User ID or "me" for authenticated user'
        },
        topic: {
          type: 'string',
          required: true,
          label: 'Webinar Topic',
          placeholder: 'Product Launch Webinar',
          description: 'The topic/title of the webinar',
          aiControlled: true,
          aiDescription: 'Title/topic of the Zoom webinar'
        },
        type: {
          type: 'select',
          label: 'Webinar Type',
          default: 5,
          options: [
            { label: 'Webinar', value: 5 },
            { label: 'Recurring with No Fixed Time', value: 6 },
            { label: 'Recurring with Fixed Time', value: 9 }
          ],
          description: 'Type of webinar'
        },
        startTime: {
          type: 'string',
          required: true,
          label: 'Start Time',
          inputType: 'datetime-local',
          placeholder: '2024-12-31T10:00:00Z',
          description: 'Webinar start time (ISO 8601)'
        },
        duration: {
          type: 'number',
          required: true,
          label: 'Duration (minutes)',
          default: 60,
          min: 0,
          description: 'Webinar duration in minutes'
        },
        timezone: {
          type: 'string',
          label: 'Timezone',
          default: 'UTC',
          placeholder: 'America/New_York',
          description: 'Timezone for the webinar'
        },
        password: {
          type: 'string',
          label: 'Webinar Password',
          inputType: 'password',
          description: 'Password to join the webinar'
        },
        agenda: {
          type: 'string',
          label: 'Agenda',
          inputType: 'textarea',
          description: 'Webinar agenda/description',
          aiControlled: true,
          aiDescription: 'Detailed agenda or description of the webinar'
        },
        approvalType: {
          type: 'select',
          label: 'Registration Approval',
          default: 2,
          options: [
            { label: 'Automatically Approve', value: 0 },
            { label: 'Manually Approve', value: 1 },
            { label: 'No Registration Required', value: 2 }
          ],
          description: 'Registration approval type'
        },
        hostVideo: {
          type: 'boolean',
          label: 'Start Video When Host Joins',
          default: true,
          description: 'Start video when host joins'
        },
        panelistsVideo: {
          type: 'boolean',
          label: 'Start Video For Panelists',
          default: true,
          description: 'Start video for panelists'
        },
        practiceSession: {
          type: 'boolean',
          label: 'Enable Practice Session',
          default: false,
          description: 'Enable practice session for panelists'
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Webinar ID' },
        uuid: { type: 'string', description: 'Webinar UUID' },
        host_id: { type: 'string', description: 'Host user ID' },
        topic: { type: 'string', description: 'Webinar topic' },
        type: { type: 'number', description: 'Webinar type' },
        start_time: { type: 'string', description: 'Webinar start time' },
        duration: { type: 'number', description: 'Webinar duration' },
        join_url: { type: 'string', description: 'Join URL for attendees' },
        registration_url: { type: 'string', description: 'Registration URL' }
      }
    },
    {
      id: 'get_webinar',
      name: 'Get Webinar',
      description: 'Retrieve details of a specific webinar',
      category: 'Webinars',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/webinars/{webinarId}',
        method: 'GET',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          webinarId: 'webinarId'
        }
      },
      inputSchema: {
        webinarId: {
          type: 'string',
          required: true,
          label: 'Webinar ID',
          placeholder: '123456789',
          description: 'The webinar ID or UUID'
        },
        occurrenceId: {
          type: 'string',
          label: 'Occurrence ID',
          description: 'Webinar occurrence ID for recurring webinars'
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Webinar ID' },
        uuid: { type: 'string', description: 'Webinar UUID' },
        topic: { type: 'string', description: 'Webinar topic' },
        type: { type: 'number', description: 'Webinar type' },
        start_time: { type: 'string', description: 'Webinar start time' },
        duration: { type: 'number', description: 'Webinar duration' },
        join_url: { type: 'string', description: 'Join URL' },
        registration_url: { type: 'string', description: 'Registration URL' }
      }
    },
    {
      id: 'list_webinars',
      name: 'List Webinars',
      description: 'Get a list of all webinars for a user',
      category: 'Webinars',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/users/{userId}/webinars',
        method: 'GET',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          userId: 'userId',
          page_size: 'page_size'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          default: 'me',
          placeholder: 'me',
          description: 'User ID or "me" for authenticated user'
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 30,
          min: 1,
          max: 300,
          description: 'Number of webinars to return',
          displayOptions: {
            hide: {
              returnAll: [true]
            }
          }
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all webinars (ignores limit)'
        }
      },
      outputSchema: {
        webinars: {
          type: 'array',
          description: 'Array of webinar objects',
          properties: {
            id: { type: 'number' },
            uuid: { type: 'string' },
            topic: { type: 'string' },
            type: { type: 'number' },
            start_time: { type: 'string' },
            duration: { type: 'number' },
            join_url: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'update_webinar',
      name: 'Update Webinar',
      description: 'Update an existing webinar',
      category: 'Webinars',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/webinars/{webinarId}',
        method: 'PATCH',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          webinarId: 'webinarId'
        }
      },
      inputSchema: {
        webinarId: {
          type: 'string',
          required: true,
          label: 'Webinar ID',
          placeholder: '123456789',
          description: 'The webinar ID to update'
        },
        topic: {
          type: 'string',
          label: 'Webinar Topic',
          description: 'Update the webinar topic',
          aiControlled: true,
          aiDescription: 'Updated title/topic for the webinar'
        },
        startTime: {
          type: 'string',
          label: 'Start Time',
          inputType: 'datetime-local',
          description: 'Update webinar start time'
        },
        duration: {
          type: 'number',
          label: 'Duration (minutes)',
          description: 'Update webinar duration'
        },
        agenda: {
          type: 'string',
          label: 'Agenda',
          inputType: 'textarea',
          description: 'Update webinar agenda',
          aiControlled: true,
          aiDescription: 'Updated agenda for the webinar'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'delete_webinar',
      name: 'Delete Webinar',
      description: 'Delete a webinar',
      category: 'Webinars',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/webinars/{webinarId}',
        method: 'DELETE',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          webinarId: 'webinarId'
        }
      },
      inputSchema: {
        webinarId: {
          type: 'string',
          required: true,
          label: 'Webinar ID',
          placeholder: '123456789',
          description: 'The webinar ID to delete'
        },
        occurrenceId: {
          type: 'string',
          label: 'Occurrence ID',
          description: 'Delete specific occurrence of recurring webinar'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // ============================================
    // MEETING REGISTRANT OPERATIONS
    // ============================================
    {
      id: 'add_meeting_registrant',
      name: 'Add Meeting Registrant',
      description: 'Add a registrant to a meeting',
      category: 'Meeting Registrants',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/meetings/{meetingId}/registrants',
        method: 'POST',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          meetingId: 'meetingId'
        }
      },
      inputSchema: {
        meetingId: {
          type: 'string',
          required: true,
          label: 'Meeting ID',
          placeholder: '123456789',
          description: 'The meeting ID'
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          inputType: 'email',
          placeholder: 'john@example.com',
          description: 'Registrant email address'
        },
        firstName: {
          type: 'string',
          required: true,
          label: 'First Name',
          placeholder: 'John',
          description: 'Registrant first name',
          aiControlled: true,
          aiDescription: 'First name of the registrant'
        },
        lastName: {
          type: 'string',
          label: 'Last Name',
          placeholder: 'Doe',
          description: 'Registrant last name',
          aiControlled: true,
          aiDescription: 'Last name of the registrant'
        },
        organization: {
          type: 'string',
          label: 'Organization',
          placeholder: 'Acme Corp',
          description: 'Registrant organization',
          aiControlled: true,
          aiDescription: 'Organization/company of the registrant'
        },
        jobTitle: {
          type: 'string',
          label: 'Job Title',
          placeholder: 'Product Manager',
          description: 'Registrant job title',
          aiControlled: true,
          aiDescription: 'Job title of the registrant'
        },
        phone: {
          type: 'string',
          label: 'Phone Number',
          placeholder: '+1-555-123-4567',
          description: 'Registrant phone number'
        },
        address: {
          type: 'string',
          label: 'Address',
          description: 'Registrant address'
        },
        city: {
          type: 'string',
          label: 'City',
          description: 'Registrant city'
        },
        state: {
          type: 'string',
          label: 'State',
          description: 'Registrant state/province'
        },
        zip: {
          type: 'string',
          label: 'Zip Code',
          description: 'Registrant zip/postal code'
        },
        country: {
          type: 'string',
          label: 'Country',
          description: 'Registrant country'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Registrant ID' },
        join_url: { type: 'string', description: 'Join URL for registrant' },
        registrant_id: { type: 'string', description: 'Unique registrant identifier' }
      }
    },
    {
      id: 'list_meeting_registrants',
      name: 'List Meeting Registrants',
      description: 'Get all registrants for a meeting',
      category: 'Meeting Registrants',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/meetings/{meetingId}/registrants',
        method: 'GET',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          meetingId: 'meetingId',
          status: 'status',
          page_size: 'page_size'
        }
      },
      inputSchema: {
        meetingId: {
          type: 'string',
          required: true,
          label: 'Meeting ID',
          placeholder: '123456789',
          description: 'The meeting ID'
        },
        status: {
          type: 'select',
          label: 'Status',
          default: 'approved',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Denied', value: 'denied' }
          ],
          description: 'Filter by registrant status'
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 30,
          min: 1,
          max: 300,
          description: 'Number of registrants to return',
          displayOptions: {
            hide: {
              returnAll: [true]
            }
          }
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all registrants (ignores limit)'
        }
      },
      outputSchema: {
        registrants: {
          type: 'array',
          description: 'Array of registrant objects',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            status: { type: 'string' },
            create_time: { type: 'string' },
            join_url: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'update_registrant_status',
      name: 'Update Registrant Status',
      description: 'Approve, deny, or cancel meeting registrants',
      category: 'Meeting Registrants',
      icon: 'check-circle',
      verified: false,
      api: {
        endpoint: '/meetings/{meetingId}/registrants/status',
        method: 'PUT',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          meetingId: 'meetingId'
        }
      },
      inputSchema: {
        meetingId: {
          type: 'string',
          required: true,
          label: 'Meeting ID',
          placeholder: '123456789',
          description: 'The meeting ID'
        },
        action: {
          type: 'select',
          required: true,
          label: 'Action',
          options: [
            { label: 'Approve', value: 'approve' },
            { label: 'Deny', value: 'deny' },
            { label: 'Cancel', value: 'cancel' }
          ],
          description: 'Action to perform on registrants'
        },
        registrants: {
          type: 'array',
          required: true,
          label: 'Registrant IDs',
          inputType: 'json',
          placeholder: '["registrant_id_1", "registrant_id_2"]',
          description: 'Array of registrant IDs to update'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },

    // ============================================
    // USER OPERATIONS
    // ============================================
    {
      id: 'get_user',
      name: 'Get User',
      description: 'Retrieve user information',
      category: 'Users',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/users/{userId}',
        method: 'GET',
        baseUrl: 'https://api.zoom.us/v2',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          userId: 'userId'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          default: 'me',
          placeholder: 'me',
          description: 'User ID or "me" for authenticated user'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'User ID' },
        email: { type: 'string', description: 'User email' },
        first_name: { type: 'string', description: 'First name' },
        last_name: { type: 'string', description: 'Last name' },
        type: { type: 'number', description: 'User type' },
        role_name: { type: 'string', description: 'User role' },
        pmi: { type: 'number', description: 'Personal Meeting ID' },
        timezone: { type: 'string', description: 'User timezone' },
        verified: { type: 'number', description: 'Verification status' },
        created_at: { type: 'string', description: 'Account creation date' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'meeting_started',
      name: 'Meeting Started',
      description: 'Triggers when a meeting starts',
      eventType: 'zoom:meeting_started',
      verified: false,
      icon: 'play-circle',
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        event: { type: 'string', description: 'Event type' },
        payload: {
          type: 'object',
          description: 'Meeting event payload',
          properties: {
            object: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Meeting ID' },
                uuid: { type: 'string', description: 'Meeting UUID' },
                host_id: { type: 'string', description: 'Host ID' },
                topic: { type: 'string', description: 'Meeting topic' },
                type: { type: 'number', description: 'Meeting type' },
                start_time: { type: 'string', description: 'Start time' },
                duration: { type: 'number', description: 'Duration' },
                timezone: { type: 'string', description: 'Timezone' }
              }
            }
          }
        }
      }
    },
    {
      id: 'meeting_ended',
      name: 'Meeting Ended',
      description: 'Triggers when a meeting ends',
      eventType: 'zoom:meeting_ended',
      verified: false,
      icon: 'stop-circle',
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        event: { type: 'string', description: 'Event type' },
        payload: {
          type: 'object',
          description: 'Meeting event payload',
          properties: {
            object: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Meeting ID' },
                uuid: { type: 'string', description: 'Meeting UUID' },
                host_id: { type: 'string', description: 'Host ID' },
                topic: { type: 'string', description: 'Meeting topic' },
                start_time: { type: 'string', description: 'Start time' },
                end_time: { type: 'string', description: 'End time' },
                duration: { type: 'number', description: 'Actual duration' }
              }
            }
          }
        }
      }
    },
    {
      id: 'participant_joined',
      name: 'Participant Joined',
      description: 'Triggers when a participant joins a meeting',
      eventType: 'zoom:participant_joined',
      verified: false,
      icon: 'user-plus',
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        event: { type: 'string', description: 'Event type' },
        payload: {
          type: 'object',
          description: 'Participant event payload',
          properties: {
            object: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Meeting ID' },
                participant: {
                  type: 'object',
                  properties: {
                    user_id: { type: 'string' },
                    user_name: { type: 'string' },
                    join_time: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      id: 'recording_completed',
      name: 'Recording Completed',
      description: 'Triggers when a meeting recording is completed',
      eventType: 'zoom:recording_completed',
      verified: false,
      icon: 'film',
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        event: { type: 'string', description: 'Event type' },
        payload: {
          type: 'object',
          description: 'Recording event payload',
          properties: {
            object: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Meeting ID' },
                uuid: { type: 'string', description: 'Meeting UUID' },
                host_id: { type: 'string', description: 'Host ID' },
                topic: { type: 'string', description: 'Meeting topic' },
                recording_files: {
                  type: 'array',
                  description: 'Array of recording files'
                }
              }
            }
          }
        }
      }
    }
  ]
};
