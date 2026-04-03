// Notion Connector
// Complete n8n-style implementation

import { ConnectorDefinition } from '../../shared';

export const NOTION_CONNECTOR: ConnectorDefinition = {
  name: 'notion',
  display_name: 'Notion',
  category: 'project_management',
  description: 'Notion workspace integration for managing databases, pages, blocks, and users',
  auth_type: 'oauth2',
  auth_fields: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: false,
      placeholder: 'Will be populated after OAuth',
      description: 'OAuth access token (automatically filled after connection)',
      helpUrl: 'https://developers.notion.com/docs/authorization',
      helpText: 'Learn about Notion OAuth'
    }
  ],
  oauth_config: {
    authorization_url: 'https://api.notion.com/v1/oauth/authorize',
    token_url: 'https://api.notion.com/v1/oauth/token',
    scopes: []
  },
  endpoints: {
    base_url: 'https://api.notion.com/v1',
    databases: {
      query: '/databases/{database_id}/query',
      create: '/databases',
      update: '/databases/{database_id}',
      retrieve: '/databases/{database_id}'
    },
    pages: {
      create: '/pages',
      retrieve: '/pages/{page_id}',
      update: '/pages/{page_id}',
      archive: '/pages/{page_id}'
    },
    blocks: {
      retrieve: '/blocks/{block_id}',
      update: '/blocks/{block_id}',
      delete: '/blocks/{block_id}',
      children: '/blocks/{block_id}/children',
      append: '/blocks/{block_id}/children'
    },
    users: {
      list: '/users',
      retrieve: '/users/{user_id}',
      me: '/users/me'
    },
    search: '/search'
  },
  webhook_support: false,
  rate_limits: {
    requests_per_second: 3
  },
  sandbox_available: false,
  supported_actions: [
    // Database Page Operations
    {
      id: 'database_page_create',
      name: 'Create Database Page',
      description: 'Create a new page in a database',
      category: 'Database Page',
      icon: 'file-plus',
      verified: false,
      api: {
        endpoint: '/pages',
        method: 'POST',
        baseUrl: 'https://api.notion.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        paramMapping: {
          databaseId: 'parent.database_id',
          properties: 'properties'
        }
      },
      inputSchema: {
        databaseId: {
          type: 'select',
          required: true,
          label: 'Database',
          placeholder: 'Select a database',
          loadOptionsMethod: 'getDatabases',
          loadOptionsResource: 'databases',
          description: 'The database to create the page in',
          aiControlled: false
        },
        title: {
          type: 'string',
          label: 'Title',
          placeholder: 'Enter page title',
          description: 'Page title (if database has a title property)',
          aiControlled: true,
          aiDescription: 'The title for the new database page'
        },
        simple: {
          type: 'boolean',
          label: 'Simplify',
          default: true,
          description: 'Return a simplified version of the response instead of the raw data',
          aiControlled: false
        },
        propertiesUi: {
          type: 'fixedCollection',
          label: 'Properties',
          placeholder: 'Add Property',
          description: 'Properties to set on the new page',
          default: {},
          typeOptions: {
            multipleValues: true
          },
          options: [
            {
              name: 'propertyValues',
              displayName: 'Property',
              values: [
                {
                  name: 'key',
                  type: 'string',
                  label: 'Key',
                  required: true,
                  description: 'Property name'
                },
                {
                  name: 'value',
                  type: 'string',
                  label: 'Value',
                  required: true,
                  description: 'Property value'
                }
              ]
            }
          ]
        },
        blockUi: {
          type: 'fixedCollection',
          label: 'Blocks',
          placeholder: 'Add Block',
          description: 'Blocks to append to the page',
          default: {},
          typeOptions: {
            multipleValues: true
          },
          options: [
            {
              name: 'blockValues',
              displayName: 'Block',
              values: [
                {
                  name: 'type',
                  type: 'select',
                  label: 'Type',
                  required: true,
                  options: [
                    { label: 'Paragraph', value: 'paragraph' },
                    { label: 'Heading 1', value: 'heading_1' },
                    { label: 'Heading 2', value: 'heading_2' },
                    { label: 'Heading 3', value: 'heading_3' },
                    { label: 'To-Do', value: 'to_do' },
                    { label: 'Bulleted List Item', value: 'bulleted_list_item' },
                    { label: 'Numbered List Item', value: 'numbered_list_item' },
                    { label: 'Quote', value: 'quote' },
                    { label: 'Code', value: 'code' }
                  ]
                },
                {
                  name: 'textContent',
                  type: 'string',
                  label: 'Text Content',
                  required: true,
                  inputType: 'textarea',
                  description: 'Block content'
                }
              ]
            }
          ]
        }
      }
    },
    {
      id: 'database_page_get',
      name: 'Get a Database Page',
      description: 'Get a page from a database',
      category: 'Database Page',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/pages/{page_id}',
        method: 'GET',
        baseUrl: 'https://api.notion.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Notion-Version': '2022-06-28'
        },
        paramMapping: {
          pageId: 'page_id'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          placeholder: 'Enter page ID',
          description: 'The ID of the page to retrieve',
          aiControlled: false
        },
        simple: {
          type: 'boolean',
          label: 'Simplify',
          default: true,
          description: 'Return a simplified version of the response instead of the raw data',
          aiControlled: false
        }
      }
    },
    {
      id: 'database_page_get_all',
      name: 'Get Many Database Pages',
      description: 'Get many pages from a database',
      category: 'Database Page',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/databases/{database_id}/query',
        method: 'POST',
        baseUrl: 'https://api.notion.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        paramMapping: {
          databaseId: 'database_id',
          filter: 'filter',
          sorts: 'sorts',
          limit: 'page_size'
        }
      },
      inputSchema: {
        databaseId: {
          type: 'select',
          required: true,
          label: 'Database',
          placeholder: 'Select a database',
          loadOptionsMethod: 'getDatabases',
          loadOptionsResource: 'databases',
          description: 'The database to query',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all pages (may take a while for large databases)',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 50,
          min: 1,
          max: 100,
          description: 'Maximum number of pages to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        simple: {
          type: 'boolean',
          label: 'Simplify',
          default: true,
          description: 'Return a simplified version of the response instead of the raw data',
          aiControlled: false
        },
        filterType: {
          type: 'select',
          label: 'Filter Type',
          default: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Build Manually', value: 'manual' },
            { label: 'JSON', value: 'json' }
          ],
          aiControlled: false
        },
        filter: {
          type: 'object',
          label: 'Filter (JSON)',
          description: 'Notion filter object',
          placeholder: '{"property": "Status", "select": {"equals": "Done"}}',
          inputType: 'textarea',
          displayOptions: {
            show: {
              filterType: ['json']
            }
          },
          aiControlled: false
        },
        sort: {
          type: 'object',
          label: 'Sort',
          description: 'Sort options (JSON)',
          placeholder: '[{"property": "Name", "direction": "ascending"}]',
          inputType: 'textarea',
          aiControlled: false
        }
      }
    },
    {
      id: 'database_page_update',
      name: 'Update Database Page',
      description: 'Update a page in a database',
      category: 'Database Page',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/pages/{page_id}',
        method: 'PATCH',
        baseUrl: 'https://api.notion.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        paramMapping: {
          pageId: 'page_id',
          properties: 'properties'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          placeholder: 'Enter page ID',
          description: 'The ID of the page to update',
          aiControlled: false
        },
        propertiesUi: {
          type: 'fixedCollection',
          label: 'Properties',
          placeholder: 'Add Property',
          description: 'Properties to update on the page',
          default: {},
          typeOptions: {
            multipleValues: true
          },
          options: [
            {
              name: 'propertyValues',
              displayName: 'Property',
              values: [
                {
                  name: 'key',
                  type: 'string',
                  label: 'Key',
                  required: true,
                  description: 'Property name'
                },
                {
                  name: 'value',
                  type: 'string',
                  label: 'Value',
                  required: true,
                  description: 'Property value'
                }
              ]
            }
          ],
          aiControlled: false
        },
        simple: {
          type: 'boolean',
          label: 'Simplify',
          default: true,
          description: 'Return a simplified version of the response instead of the raw data',
          aiControlled: false
        }
      }
    },

    // Page Operations
    {
      id: 'page_create',
      name: 'Create Page',
      description: 'Create a new page',
      category: 'Page',
      icon: 'file-plus',
      verified: false,
      api: {
        endpoint: '/pages',
        method: 'POST',
        baseUrl: 'https://api.notion.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        paramMapping: {
          parent: 'parent',
          title: 'properties.title',
          content: 'children'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Parent Page ID',
          placeholder: 'Enter parent page ID',
          description: 'The ID of the parent page',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: true,
          label: 'Page Title',
          placeholder: 'Enter page title',
          description: 'Title of the new page',
          aiControlled: true,
          aiDescription: 'The title for the new Notion page.'
        },
        blockUi: {
          type: 'fixedCollection',
          label: 'Blocks',
          placeholder: 'Add Block',
          description: 'Blocks to append to the page',
          default: {},
          typeOptions: {
            multipleValues: true
          },
          options: [
            {
              name: 'blockValues',
              displayName: 'Block',
              values: [
                {
                  name: 'type',
                  type: 'select',
                  label: 'Type',
                  required: true,
                  options: [
                    { label: 'Paragraph', value: 'paragraph' },
                    { label: 'Heading 1', value: 'heading_1' },
                    { label: 'Heading 2', value: 'heading_2' },
                    { label: 'Heading 3', value: 'heading_3' },
                    { label: 'To-Do', value: 'to_do' },
                    { label: 'Bulleted List Item', value: 'bulleted_list_item' },
                    { label: 'Numbered List Item', value: 'numbered_list_item' },
                    { label: 'Quote', value: 'quote' },
                    { label: 'Code', value: 'code' }
                  ]
                },
                {
                  name: 'textContent',
                  type: 'string',
                  label: 'Text Content',
                  required: true,
                  inputType: 'textarea',
                  description: 'Block content'
                }
              ]
            }
          ],
          aiControlled: false
        },
        simple: {
          type: 'boolean',
          label: 'Simplify',
          default: true,
          description: 'Return a simplified version of the response instead of the raw data',
          aiControlled: false
        }
      }
    },
    {
      id: 'page_search',
      name: 'Search Pages',
      description: 'Search for pages by title',
      category: 'Page',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/search',
        method: 'POST',
        baseUrl: 'https://api.notion.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        paramMapping: {
          query: 'query',
          filter: 'filter',
          sort: 'sort'
        }
      },
      inputSchema: {
        text: {
          type: 'string',
          label: 'Search Text',
          placeholder: 'Enter search query',
          description: 'Text to search for in page titles',
          aiControlled: true,
          aiDescription: 'The search query text to find Notion pages.'
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all results',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 50,
          min: 1,
          max: 100,
          description: 'Maximum number of results to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        simple: {
          type: 'boolean',
          label: 'Simplify',
          default: true,
          description: 'Return a simplified version of the response instead of the raw data',
          aiControlled: false
        },
        options: {
          type: 'collection',
          label: 'Options',
          description: 'Additional options',
          default: {},
          properties: {
            sort: {
              type: 'object',
              label: 'Sort',
              description: 'Sort configuration',
              properties: {
                direction: {
                  type: 'select',
                  label: 'Direction',
                  default: 'descending',
                  options: [
                    { label: 'Ascending', value: 'ascending' },
                    { label: 'Descending', value: 'descending' }
                  ]
                },
                timestamp: {
                  type: 'select',
                  label: 'Timestamp',
                  default: 'last_edited_time',
                  options: [
                    { label: 'Last Edited Time', value: 'last_edited_time' },
                    { label: 'Created Time', value: 'created_time' }
                  ]
                }
              }
            }
          },
          aiControlled: false
        }
      }
    }
  ],
  supported_triggers: [
    {
      id: 'database_page_created',
      name: 'On Page Added to Database',
      description: 'Triggers when a new page is created in a database (polling)',
      eventType: 'database_page_created',
      verified: false,
      icon: 'file-plus',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        databaseId: {
          type: 'select',
          required: true,
          label: 'Database',
          placeholder: 'Select a database',
          loadOptionsMethod: 'getDatabases',
          loadOptionsResource: 'databases',
          description: 'The database to monitor for new pages'
        },
        pollInterval: {
          type: 'number',
          label: 'Poll Interval (minutes)',
          description: 'How often to check for new pages',
          default: 5,
          min: 1,
          max: 60
        }
      },
      outputSchema: {
        pageId: { type: 'string', description: 'Page ID' },
        createdTime: { type: 'string', description: 'Creation timestamp' },
        properties: { type: 'object', description: 'Page properties' },
        url: { type: 'string', description: 'Page URL' }
      }
    },
    {
      id: 'database_page_updated',
      name: 'On Page Updated in Database',
      description: 'Triggers when a page in a database is updated (polling)',
      eventType: 'database_page_updated',
      verified: false,
      icon: 'edit',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        databaseId: {
          type: 'select',
          required: true,
          label: 'Database',
          placeholder: 'Select a database',
          loadOptionsMethod: 'getDatabases',
          loadOptionsResource: 'databases',
          description: 'The database to monitor for updated pages'
        },
        pollInterval: {
          type: 'number',
          label: 'Poll Interval (minutes)',
          description: 'How often to check for updated pages',
          default: 5,
          min: 1,
          max: 60
        }
      },
      outputSchema: {
        pageId: { type: 'string', description: 'Page ID' },
        lastEditedTime: { type: 'string', description: 'Last edit timestamp' },
        properties: { type: 'object', description: 'Page properties' },
        url: { type: 'string', description: 'Page URL' }
      }
    }
  ]
};
