// Segment Connector
// Based on n8n Segment implementation

import { ConnectorDefinition } from '../../shared';

export const SEGMENT_CONNECTOR: ConnectorDefinition = {
    name: 'segment',
    display_name: 'Segment',
    category: 'analytics',
    description: 'Customer data platform for collecting and managing user analytics',
    auth_type: 'api_key',
    auth_fields: [
      {
        key: 'writeKey',
        label: 'Write Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your Segment Write Key',
        description: 'The Write Key from your Segment source settings',
        helpUrl: 'https://segment.com/docs/connections/find-writekey/',
        helpText: 'How to find your Write Key'
      },
      {
        key: 'workspace_id',
        label: 'Workspace ID',
        type: 'string',
        required: false,
        placeholder: 'Enter your Segment Workspace ID',
        description: 'Optional: Your Segment Workspace ID for API access',
        helpUrl: 'https://segment.com/docs/config-api/',
        helpText: 'Required for Config API access'
      },
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: false,
        placeholder: 'Enter your Segment Access Token',
        description: 'Optional: Personal Access Token for Segment Config API',
        helpUrl: 'https://segment.com/docs/config-api/authentication/',
        helpText: 'Required for Config API access'
      }
    ],
    endpoints: {
      base_url: 'https://api.segment.io/v1',
      track: '/track',
      identify: '/identify',
      page: '/page',
      group: '/group'
    },
    webhook_support: true,
    rate_limits: { requests_per_second: 100 },
    sandbox_available: false,
    supported_actions: [
      {
        id: 'track_event',
        name: 'Track Event',
        description: 'Record the actions your users perform. Every action triggers an event.',
        category: 'Track',
        icon: 'activity',
        api: {
          endpoint: '/track',
          method: 'POST',
          baseUrl: 'https://api.segment.io/v1',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          userId: {
            type: 'string',
            required: false,
            label: 'User ID',
            placeholder: 'user123',
            description: 'Unique identifier for the user (either userId or anonymousId required)',
            aiControlled: false
          },
          anonymousId: {
            type: 'string',
            required: false,
            label: 'Anonymous ID',
            placeholder: 'anon-abc123',
            description: 'Anonymous identifier (either userId or anonymousId required)',
            aiControlled: false
          },
          event: {
            type: 'string',
            required: true,
            label: 'Event Name',
            placeholder: 'Button Clicked',
            description: 'Name of the action that a user has performed',
            aiControlled: false
          },
          properties: {
            type: 'array',
            required: false,
            label: 'Properties',
            description: 'Free-form dictionary of properties of the event',
            aiControlled: false,
            itemSchema: {
              key: {
                type: 'string',
                required: true,
                label: 'Key',
                aiControlled: false
              },
              value: {
                type: 'string',
                required: true,
                label: 'Value',
                aiControlled: false
              }
            }
          },
          context: {
            type: 'object',
            required: false,
            label: 'Context',
            description: 'Dictionary of extra information about the event',
            aiControlled: false,
            properties: {
              active: {
                type: 'boolean',
                label: 'Active',
                description: 'Whether a user is active',
                aiControlled: false
              },
              ip: {
                type: 'string',
                label: 'IP Address',
                description: "Current user's IP address",
                aiControlled: false
              },
              locale: {
                type: 'string',
                label: 'Locale',
                placeholder: 'en-US',
                description: 'Locale string for the current user',
                aiControlled: false
              },
              page: {
                type: 'string',
                label: 'Page',
                description: 'Information about the current page',
                aiControlled: false
              },
              timezone: {
                type: 'string',
                label: 'Timezone',
                placeholder: 'America/New_York',
                description: 'Timezone as tzdata string',
                aiControlled: false
              },
              app: {
                type: 'object',
                label: 'App',
                aiControlled: false,
                properties: {
                  name: { type: 'string', label: 'Name', aiControlled: false },
                  version: { type: 'string', label: 'Version', aiControlled: false },
                  build: { type: 'string', label: 'Build', aiControlled: false }
                }
              },
              campaign: {
                type: 'object',
                label: 'Campaign',
                aiControlled: false,
                properties: {
                  name: { type: 'string', label: 'Name', aiControlled: false },
                  source: { type: 'string', label: 'Source', aiControlled: false },
                  medium: { type: 'string', label: 'Medium', aiControlled: false },
                  term: { type: 'string', label: 'Term', aiControlled: false },
                  content: { type: 'string', label: 'Content', aiControlled: false }
                }
              },
              device: {
                type: 'object',
                label: 'Device',
                aiControlled: false,
                properties: {
                  id: { type: 'string', label: 'ID', aiControlled: false },
                  manufacturer: { type: 'string', label: 'Manufacturer', aiControlled: false },
                  model: { type: 'string', label: 'Model', aiControlled: false },
                  type: { type: 'string', label: 'Type', aiControlled: false },
                  version: { type: 'string', label: 'Version', aiControlled: false }
                }
              }
            }
          },
          integrations: {
            type: 'object',
            required: false,
            label: 'Integrations',
            description: 'Dictionary of integration settings',
            aiControlled: false,
            properties: {
              all: {
                type: 'boolean',
                label: 'All',
                default: true,
                description: 'Enable/disable all integrations',
                aiControlled: false
              },
              salesforce: {
                type: 'boolean',
                label: 'Salesforce',
                default: false,
                description: 'Enable/disable Salesforce integration',
                aiControlled: false
              }
            }
          }
        },
        outputSchema: {
          success: {
            type: 'boolean',
            description: 'Whether the event was tracked successfully'
          }
        }
      },
      {
        id: 'track_page',
        name: 'Track Page',
        description: 'Record page views on your website, along with optional extra information',
        category: 'Track',
        icon: 'file-text',
        api: {
          endpoint: '/page',
          method: 'POST',
          baseUrl: 'https://api.segment.io/v1',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          userId: {
            type: 'string',
            required: false,
            label: 'User ID',
            placeholder: 'user123',
            description: 'Unique identifier for the user (either userId or anonymousId required)',
            aiControlled: false
          },
          anonymousId: {
            type: 'string',
            required: false,
            label: 'Anonymous ID',
            placeholder: 'anon-abc123',
            description: 'Anonymous identifier (either userId or anonymousId required)',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: false,
            label: 'Page Name',
            placeholder: 'Signup',
            description: 'Name of the page (e.g., "Signup", "Home")',
            aiControlled: false
          },
          properties: {
            type: 'array',
            required: false,
            label: 'Properties',
            description: 'Free-form dictionary of properties of the page',
            aiControlled: false,
            itemSchema: {
              key: {
                type: 'string',
                required: true,
                label: 'Key',
                aiControlled: false
              },
              value: {
                type: 'string',
                required: true,
                label: 'Value',
                aiControlled: false
              }
            }
          },
          context: {
            type: 'object',
            required: false,
            label: 'Context',
            description: 'Dictionary of extra information',
            aiControlled: false,
            properties: {
              active: { type: 'boolean', label: 'Active', aiControlled: false },
              ip: { type: 'string', label: 'IP Address', aiControlled: false },
              locale: { type: 'string', label: 'Locale', aiControlled: false },
              page: { type: 'string', label: 'Page', aiControlled: false },
              timezone: { type: 'string', label: 'Timezone', aiControlled: false },
              app: {
                type: 'object',
                aiControlled: false,
                properties: {
                  name: { type: 'string', aiControlled: false },
                  version: { type: 'string', aiControlled: false },
                  build: { type: 'string', aiControlled: false }
                }
              },
              campaign: {
                type: 'object',
                aiControlled: false,
                properties: {
                  name: { type: 'string', aiControlled: false },
                  source: { type: 'string', aiControlled: false },
                  medium: { type: 'string', aiControlled: false },
                  term: { type: 'string', aiControlled: false },
                  content: { type: 'string', aiControlled: false }
                }
              },
              device: {
                type: 'object',
                aiControlled: false,
                properties: {
                  id: { type: 'string', aiControlled: false },
                  manufacturer: { type: 'string', aiControlled: false },
                  model: { type: 'string', aiControlled: false },
                  type: { type: 'string', aiControlled: false },
                  version: { type: 'string', aiControlled: false }
                }
              }
            }
          },
          integrations: {
            type: 'object',
            required: false,
            label: 'Integrations',
            aiControlled: false,
            properties: {
              all: { type: 'boolean', default: true, aiControlled: false },
              salesforce: { type: 'boolean', default: false, aiControlled: false }
            }
          }
        },
        outputSchema: {
          success: {
            type: 'boolean',
            description: 'Whether the page view was tracked successfully'
          }
        }
      },
      {
        id: 'identify_user',
        name: 'Identify User',
        description: 'Identify lets you tie a user to their actions and record traits about them',
        category: 'Identify',
        icon: 'user',
        api: {
          endpoint: '/identify',
          method: 'POST',
          baseUrl: 'https://api.segment.io/v1',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          userId: {
            type: 'string',
            required: false,
            label: 'User ID',
            placeholder: 'user123',
            description: 'Unique identifier for the user (either userId or anonymousId required)',
            aiControlled: false
          },
          anonymousId: {
            type: 'string',
            required: false,
            label: 'Anonymous ID',
            placeholder: 'anon-abc123',
            description: 'Anonymous identifier (either userId or anonymousId required)',
            aiControlled: false
          },
          traits: {
            type: 'array',
            required: false,
            label: 'Traits',
            description: 'Free-form dictionary of traits of the user',
            aiControlled: false,
            itemSchema: {
              key: {
                type: 'string',
                required: true,
                label: 'Key',
                placeholder: 'email',
                aiControlled: false
              },
              value: {
                type: 'string',
                required: true,
                label: 'Value',
                placeholder: 'user@example.com',
                aiControlled: false
              }
            }
          },
          context: {
            type: 'object',
            required: false,
            label: 'Context',
            description: 'Dictionary of extra information',
            aiControlled: false,
            properties: {
              active: { type: 'boolean', label: 'Active', aiControlled: false },
              ip: { type: 'string', label: 'IP Address', aiControlled: false },
              locale: { type: 'string', label: 'Locale', aiControlled: false },
              page: { type: 'string', label: 'Page', aiControlled: false },
              timezone: { type: 'string', label: 'Timezone', aiControlled: false },
              app: {
                type: 'object',
                aiControlled: false,
                properties: {
                  name: { type: 'string', aiControlled: false },
                  version: { type: 'string', aiControlled: false },
                  build: { type: 'string', aiControlled: false }
                }
              },
              campaign: {
                type: 'object',
                aiControlled: false,
                properties: {
                  name: { type: 'string', aiControlled: false },
                  source: { type: 'string', aiControlled: false },
                  medium: { type: 'string', aiControlled: false },
                  term: { type: 'string', aiControlled: false },
                  content: { type: 'string', aiControlled: false }
                }
              },
              device: {
                type: 'object',
                aiControlled: false,
                properties: {
                  id: { type: 'string', aiControlled: false },
                  manufacturer: { type: 'string', aiControlled: false },
                  model: { type: 'string', aiControlled: false },
                  type: { type: 'string', aiControlled: false },
                  version: { type: 'string', aiControlled: false }
                }
              }
            }
          },
          integrations: {
            type: 'object',
            required: false,
            label: 'Integrations',
            aiControlled: false,
            properties: {
              all: { type: 'boolean', default: true, aiControlled: false },
              salesforce: { type: 'boolean', default: false, aiControlled: false }
            }
          }
        },
        outputSchema: {
          success: {
            type: 'boolean',
            description: 'Whether the user was identified successfully'
          }
        }
      },
      {
        id: 'add_to_group',
        name: 'Add to Group',
        description: 'Group lets you associate an identified user with a group',
        category: 'Group',
        icon: 'users',
        api: {
          endpoint: '/group',
          method: 'POST',
          baseUrl: 'https://api.segment.io/v1',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          userId: {
            type: 'string',
            required: false,
            label: 'User ID',
            placeholder: 'user123',
            description: 'Unique identifier for the user (either userId or anonymousId required)',
            aiControlled: false
          },
          anonymousId: {
            type: 'string',
            required: false,
            label: 'Anonymous ID',
            placeholder: 'anon-abc123',
            description: 'Anonymous identifier (either userId or anonymousId required)',
            aiControlled: false
          },
          groupId: {
            type: 'string',
            required: true,
            label: 'Group ID',
            placeholder: 'group123',
            description: 'Unique identifier for the group in your database',
            aiControlled: false
          },
          traits: {
            type: 'array',
            required: false,
            label: 'Traits',
            description: 'Free-form dictionary of traits of the group',
            aiControlled: false,
            itemSchema: {
              key: {
                type: 'string',
                required: true,
                label: 'Key',
                placeholder: 'name',
                aiControlled: false
              },
              value: {
                type: 'string',
                required: true,
                label: 'Value',
                placeholder: 'Acme Inc',
                aiControlled: false
              }
            }
          },
          context: {
            type: 'object',
            required: false,
            label: 'Context',
            description: 'Dictionary of extra information',
            aiControlled: false,
            properties: {
              active: { type: 'boolean', label: 'Active', aiControlled: false },
              ip: { type: 'string', label: 'IP Address', aiControlled: false },
              locale: { type: 'string', label: 'Locale', aiControlled: false },
              page: { type: 'string', label: 'Page', aiControlled: false },
              timezone: { type: 'string', label: 'Timezone', aiControlled: false },
              app: {
                type: 'object',
                aiControlled: false,
                properties: {
                  name: { type: 'string', aiControlled: false },
                  version: { type: 'string', aiControlled: false },
                  build: { type: 'string', aiControlled: false }
                }
              },
              campaign: {
                type: 'object',
                aiControlled: false,
                properties: {
                  name: { type: 'string', aiControlled: false },
                  source: { type: 'string', aiControlled: false },
                  medium: { type: 'string', aiControlled: false },
                  term: { type: 'string', aiControlled: false },
                  content: { type: 'string', aiControlled: false }
                }
              },
              device: {
                type: 'object',
                aiControlled: false,
                properties: {
                  id: { type: 'string', aiControlled: false },
                  manufacturer: { type: 'string', aiControlled: false },
                  model: { type: 'string', aiControlled: false },
                  type: { type: 'string', aiControlled: false },
                  version: { type: 'string', aiControlled: false }
                }
              }
            }
          },
          integrations: {
            type: 'object',
            required: false,
            label: 'Integrations',
            aiControlled: false,
            properties: {
              all: { type: 'boolean', default: true, aiControlled: false },
              salesforce: { type: 'boolean', default: false, aiControlled: false }
            }
          }
        },
        outputSchema: {
          success: {
            type: 'boolean',
            description: 'Whether the user was added to the group successfully'
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'audience_entered',
        name: 'Audience Entered',
        description: 'Triggered when a user enters a Segment audience',
        eventType: 'segment:audience_entered',
        icon: 'users',
        webhookRequired: true,
        inputSchema: {
          audienceId: {
            type: 'string',
            label: 'Audience ID',
            description: 'The ID of the audience to monitor',
            required: false
          }
        },
        outputSchema: {
          userId: { type: 'string', description: 'User ID' },
          audienceId: { type: 'string', description: 'Audience ID' },
          audienceName: { type: 'string', description: 'Audience name' },
          traits: { type: 'object', description: 'User traits' },
          timestamp: { type: 'string', description: 'Event timestamp' }
        }
      },
      {
        id: 'audience_exited',
        name: 'Audience Exited',
        description: 'Triggered when a user exits a Segment audience',
        eventType: 'segment:audience_exited',
        icon: 'user-minus',
        webhookRequired: true,
        inputSchema: {
          audienceId: {
            type: 'string',
            label: 'Audience ID',
            description: 'The ID of the audience to monitor',
            required: false
          }
        },
        outputSchema: {
          userId: { type: 'string', description: 'User ID' },
          audienceId: { type: 'string', description: 'Audience ID' },
          audienceName: { type: 'string', description: 'Audience name' },
          traits: { type: 'object', description: 'User traits' },
          timestamp: { type: 'string', description: 'Event timestamp' }
        }
      }
    ]
  };
