// PagerDuty Connector Definition
// Complete implementation matching n8n PagerDuty node

import { ConnectorDefinition } from '../../shared';

export const PAGERDUTY_CONNECTOR: ConnectorDefinition = {
  name: 'pagerduty',
  display_name: 'PagerDuty',
  category: 'support',
  description: 'Incident management platform for IT operations - manage incidents, incident notes, log entries, and users',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      options: [
        { label: 'API Token', value: 'api_token', description: 'Use a PagerDuty API token' },
        { label: 'OAuth2', value: 'oauth2', description: 'Connect with OAuth2' }
      ],
      default: 'api_token'
    },
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Your PagerDuty API Token',
      description: 'Generate from User Settings > Create API User Token',
      displayOptions: { authType: ['api_token'] }
    }
  ],
  endpoints: {
    incidents: '/incidents',
    incident_notes: '/incidents/{id}/notes',
    log_entries: '/log_entries',
    users: '/users'
  },
  webhook_support: true,
  rate_limits: { requests_per_minute: 960 },
  sandbox_available: false,

  supported_actions: [
    // INCIDENT ACTIONS
    {
      id: 'incident_create',
      name: 'Create Incident',
      description: 'Create a new incident',
      category: 'Incidents',
      inputSchema: {
        title: {
          type: 'string',
          required: true,
          label: 'Title',
          description: 'A succinct description of the nature, symptoms, cause, or effect of the incident',
          aiControlled: true,
          aiDescription: 'Generate a clear, concise incident title that describes the nature, symptoms, cause, or effect of the incident'
        },
        serviceId: {
          type: 'string',
          required: true,
          label: 'Service ID',
          description: 'The incident will be created on this service',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          placeholder: 'name@email.com',
          description: 'The email address of a valid user associated with the account making the request',
          aiControlled: false
        },
        details: {
          type: 'string',
          label: 'Incident Details',
          inputType: 'textarea',
          description: 'Additional details about the incident which will go in the body',
          aiControlled: true,
          aiDescription: 'Generate detailed incident information including symptoms, impact, affected systems, and any relevant context'
        },
        priorityId: {
          type: 'string',
          label: 'Priority ID',
          description: 'The priority of the incident',
          aiControlled: false
        },
        escalationPolicyId: {
          type: 'string',
          label: 'Escalation Policy ID',
          description: 'Delegate this incident to the specified escalation policy',
          aiControlled: false
        },
        urgency: {
          type: 'select',
          label: 'Urgency',
          options: [
            { label: 'High', value: 'high' },
            { label: 'Low', value: 'low' }
          ],
          description: 'The urgency of the incident',
          aiControlled: false
        },
        incidentKey: {
          type: 'string',
          label: 'Incident Key',
          description: 'Sending subsequent requests referencing the same service and with the same incident_key will result in those requests being rejected if an open incident matches that incident_key',
          aiControlled: false
        },
        conferenceBridge: {
          type: 'object',
          label: 'Conference Bridge',
          description: 'Conference bridge details',
          aiControlled: false,
          properties: {
            conferenceNumber: {
              type: 'string',
              label: 'Conference Number',
              description: 'Phone numbers should be formatted like +1 415-555-1212,,,,1234#',
              aiControlled: false
            },
            conferenceUrl: {
              type: 'string',
              label: 'Conference URL',
              description: 'An URL for the conference bridge',
              aiControlled: false
            }
          }
        }
      }
    },
    {
      id: 'incident_get',
      name: 'Get Incident',
      description: 'Get an incident by ID',
      category: 'Incidents',
      inputSchema: {
        incidentId: {
          type: 'string',
          required: true,
          label: 'Incident ID',
          description: 'Unique identifier for the incident',
          aiControlled: false
        }
      }
    },
    {
      id: 'incident_get_all',
      name: 'Get Many Incidents',
      description: 'Get many incidents',
      category: 'Incidents',
      inputSchema: {
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 500,
          description: 'Max number of results to return',
          aiControlled: false
        },
        dateRange: {
          type: 'select',
          label: 'Date Range',
          options: [
            { label: 'All', value: 'all' }
          ],
          description: 'When set to all, the since and until parameters and defaults are ignored',
          aiControlled: false
        },
        incidentKey: {
          type: 'string',
          label: 'Incident Key',
          description: 'Incident de-duplication key',
          aiControlled: false
        },
        include: {
          type: 'array',
          label: 'Include',
          description: 'Additional details to include',
          aiControlled: false,
          itemSchema: {
            type: 'select',
            options: [
              { label: 'Acknowledgers', value: 'acknowledgers' },
              { label: 'Assignees', value: 'assignees' },
              { label: 'Conference Bridge', value: 'conferenceBridge' },
              { label: 'Escalation Policies', value: 'escalationPolicies' },
              { label: 'First Trigger Log Entries', value: 'firstTriggerLogEntries' },
              { label: 'Priorities', value: 'priorities' },
              { label: 'Services', value: 'services' },
              { label: 'Teams', value: 'teams' },
              { label: 'Users', value: 'users' }
            ]
          }
        },
        serviceIds: {
          type: 'array',
          label: 'Service IDs',
          description: 'Returns only the incidents associated with the passed service(s)',
          aiControlled: false
        },
        since: {
          type: 'string',
          label: 'Since',
          inputType: 'datetime',
          description: 'The start of the date range over which you want to search',
          aiControlled: false
        },
        sortBy: {
          type: 'string',
          label: 'Sort By',
          placeholder: 'created_at:asc,resolved_at:desc',
          description: 'Sort field and direction (e.g., created_at:asc)',
          aiControlled: false
        },
        statuses: {
          type: 'array',
          label: 'Statuses',
          description: 'Filter by incident status',
          aiControlled: false,
          itemSchema: {
            type: 'select',
            options: [
              { label: 'Acknowledged', value: 'acknowledged' },
              { label: 'Resolved', value: 'resolved' },
              { label: 'Triggered', value: 'triggered' }
            ]
          }
        },
        teamIds: {
          type: 'string',
          label: 'Team IDs',
          description: 'Team IDs (comma-separated). Only results related to these teams will be returned',
          aiControlled: false
        },
        timeZone: {
          type: 'string',
          label: 'Time Zone',
          description: 'Time zone in which dates in the result will be rendered',
          aiControlled: false
        },
        until: {
          type: 'string',
          label: 'Until',
          inputType: 'datetime',
          description: 'The end of the date range over which you want to search',
          aiControlled: false
        },
        urgencies: {
          type: 'array',
          label: 'Urgencies',
          description: 'Filter by urgency',
          aiControlled: false,
          itemSchema: {
            type: 'select',
            options: [
              { label: 'High', value: 'high' },
              { label: 'Low', value: 'low' }
            ]
          }
        },
        userIds: {
          type: 'string',
          label: 'User IDs',
          description: 'User IDs (comma-separated). Returns only incidents assigned to these users',
          aiControlled: false
        }
      }
    },
    {
      id: 'incident_update',
      name: 'Update Incident',
      description: 'Update an existing incident',
      category: 'Incidents',
      inputSchema: {
        incidentId: {
          type: 'string',
          required: true,
          label: 'Incident ID',
          description: 'Unique identifier for the incident',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          placeholder: 'name@email.com',
          description: 'The email address of a valid user associated with the account making the request',
          aiControlled: false
        },
        title: {
          type: 'string',
          label: 'Title',
          description: 'A succinct description of the nature, symptoms, cause, or effect of the incident',
          aiControlled: true,
          aiDescription: 'Generate a clear, concise incident title that describes the nature, symptoms, cause, or effect of the incident'
        },
        escalationLevel: {
          type: 'number',
          label: 'Escalation Level',
          min: 0,
          description: 'Escalate the incident to this level in the escalation policy',
          aiControlled: false
        },
        details: {
          type: 'string',
          label: 'Incident Details',
          inputType: 'textarea',
          description: 'Additional details about the incident',
          aiControlled: true,
          aiDescription: 'Generate detailed incident information including symptoms, impact, affected systems, and any relevant context'
        },
        priorityId: {
          type: 'string',
          label: 'Priority ID',
          description: 'The priority of the incident',
          aiControlled: false
        },
        escalationPolicyId: {
          type: 'string',
          label: 'Escalation Policy ID',
          description: 'Delegate this incident to the specified escalation policy',
          aiControlled: false
        },
        urgency: {
          type: 'select',
          label: 'Urgency',
          options: [
            { label: 'High', value: 'high' },
            { label: 'Low', value: 'low' }
          ],
          description: 'The urgency of the incident',
          aiControlled: false
        },
        resolution: {
          type: 'string',
          label: 'Resolution',
          description: 'The resolution for this incident if status is set to resolved',
          aiControlled: true,
          aiDescription: 'Generate a clear resolution summary describing how the incident was resolved and any follow-up actions'
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Acknowledged', value: 'acknowledged' },
            { label: 'Resolved', value: 'resolved' }
          ],
          description: 'The new status of the incident',
          aiControlled: false
        },
        conferenceBridge: {
          type: 'object',
          label: 'Conference Bridge',
          description: 'Conference bridge details',
          aiControlled: false,
          properties: {
            conferenceNumber: {
              type: 'string',
              label: 'Conference Number',
              aiControlled: false
            },
            conferenceUrl: {
              type: 'string',
              label: 'Conference URL',
              aiControlled: false
            }
          }
        }
      }
    },

    // INCIDENT NOTE ACTIONS
    {
      id: 'incident_note_create',
      name: 'Create Incident Note',
      description: 'Create a note on an incident',
      category: 'Incident Notes',
      inputSchema: {
        incidentId: {
          type: 'string',
          required: true,
          label: 'Incident ID',
          description: 'Unique identifier for the incident',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: true,
          label: 'Content',
          inputType: 'textarea',
          description: 'The note content',
          aiControlled: true,
          aiDescription: 'Generate a helpful incident note with relevant updates, investigation findings, or action items'
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          placeholder: 'name@email.com',
          description: 'The email address of a valid user associated with the account making the request',
          aiControlled: false
        }
      }
    },
    {
      id: 'incident_note_get_all',
      name: 'Get Many Incident Notes',
      description: 'Get notes for an incident',
      category: 'Incident Notes',
      inputSchema: {
        incidentId: {
          type: 'string',
          required: true,
          label: 'Incident ID',
          description: 'Unique identifier for the incident',
          aiControlled: false
        },
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 500,
          description: 'Max number of results to return',
          aiControlled: false
        }
      }
    },

    // LOG ENTRY ACTIONS
    {
      id: 'log_entry_get',
      name: 'Get Log Entry',
      description: 'Get a log entry by ID',
      category: 'Log Entries',
      inputSchema: {
        logEntryId: {
          type: 'string',
          required: true,
          label: 'Log Entry ID',
          description: 'Unique identifier for the log entry',
          aiControlled: false
        }
      }
    },
    {
      id: 'log_entry_get_all',
      name: 'Get Many Log Entries',
      description: 'Get many log entries',
      category: 'Log Entries',
      inputSchema: {
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 500,
          description: 'Max number of results to return',
          aiControlled: false
        },
        include: {
          type: 'array',
          label: 'Include',
          description: 'Additional details to include',
          aiControlled: false,
          itemSchema: {
            type: 'select',
            options: [
              { label: 'Channels', value: 'channels' },
              { label: 'Incidents', value: 'incidents' },
              { label: 'Services', value: 'services' },
              { label: 'Teams', value: 'teams' }
            ]
          }
        },
        isOverview: {
          type: 'boolean',
          label: 'Is Overview',
          default: false,
          description: 'Whether to return a subset of log entries that show only the most important changes to the incident',
          aiControlled: false
        },
        since: {
          type: 'string',
          label: 'Since',
          inputType: 'datetime',
          description: 'The start of the date range over which you want to search',
          aiControlled: false
        },
        timeZone: {
          type: 'string',
          label: 'Time Zone',
          description: 'Time zone in which dates in the result will be rendered',
          aiControlled: false
        },
        until: {
          type: 'string',
          label: 'Until',
          inputType: 'datetime',
          description: 'The end of the date range over which you want to search',
          aiControlled: false
        }
      }
    },

    // USER ACTIONS
    {
      id: 'user_get',
      name: 'Get User',
      description: 'Get a user by ID',
      category: 'Users',
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'Unique identifier for the user',
          aiControlled: false
        }
      }
    }
  ],

  // ============= SUPPORTED TRIGGERS =============
  supported_triggers: [
    {
      id: 'incident_triggered',
      name: 'Incident Triggered',
      description: 'Triggered when a new incident is created',
      eventType: 'webhook',
      icon: 'alert-triangle',
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Incident ID' },
          title: { type: 'string', description: 'Incident title' },
          status: { type: 'string', description: 'Incident status' },
          urgency: { type: 'string', description: 'Incident urgency level' },
          created_at: { type: 'string', description: 'Creation timestamp' }
        }
      }
    },
    {
      id: 'incident_acknowledged',
      name: 'Incident Acknowledged',
      description: 'Triggered when an incident is acknowledged',
      eventType: 'webhook',
      icon: 'check-circle',
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Incident ID' },
          title: { type: 'string', description: 'Incident title' },
          status: { type: 'string', description: 'Incident status' },
          acknowledged_at: { type: 'string', description: 'Acknowledgement timestamp' }
        }
      }
    },
    {
      id: 'incident_resolved',
      name: 'Incident Resolved',
      description: 'Triggered when an incident is resolved',
      eventType: 'webhook',
      icon: 'check-square',
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Incident ID' },
          title: { type: 'string', description: 'Incident title' },
          status: { type: 'string', description: 'Incident status' },
          resolved_at: { type: 'string', description: 'Resolution timestamp' }
        }
      }
    }
  ]
};
