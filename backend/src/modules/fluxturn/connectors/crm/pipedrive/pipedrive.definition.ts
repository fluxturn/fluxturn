// Pipedrive Connector
// Comprehensive connector definition with all Pipedrive API capabilities

import { ConnectorDefinition } from '../../shared';

export const PIPEDRIVE_CONNECTOR: ConnectorDefinition = {
  name: 'pipedrive',
  display_name: 'Pipedrive',
  category: 'crm',
  description: 'Pipedrive is a sales CRM and pipeline management tool designed to help sales teams manage leads, track deals, and close more sales efficiently.',
  auth_type: 'api_key',
  auth_types: [
    { value: 'api_key', label: 'API Token' },
    { value: 'oauth2', label: 'OAuth2' }
  ],
  verified: false,

  auth_fields: [
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Pipedrive API token',
      description: 'Your Pipedrive API token for authentication. Find it in Settings > Personal preferences > API',
      helpUrl: 'https://pipedrive.readme.io/docs/how-to-find-the-api-token',
      helpText: 'How to find your API token'
    }
  ],

  oauth_config: {
    authorization_url: 'https://oauth.pipedrive.com/oauth/authorize',
    token_url: 'https://oauth.pipedrive.com/oauth/token',
    scopes: [
      'deals:read',
      'deals:write',
      'contacts:read',
      'contacts:write',
      'activities:read',
      'activities:write',
      'leads:read',
      'leads:write',
      'products:read',
      'products:write',
      'admin'
    ]
  },

  endpoints: {
    base_url: 'https://api.pipedrive.com/v1',
    deals: '/deals',
    persons: '/persons',
    organizations: '/organizations',
    activities: '/activities',
    leads: '/leads',
    notes: '/notes',
    products: '/products',
    files: '/files',
    pipelines: '/pipelines',
    stages: '/stages',
    webhooks: '/webhooks',
    users: '/users',
    itemSearch: '/itemSearch'
  },

  webhook_support: true,

  rate_limits: {
    requests_per_second: 5,
    requests_per_minute: 100,
    requests_per_hour: 8000
  },

  sandbox_available: false,

  // ============================================
  // SUPPORTED ACTIONS - Complete Pipedrive API Coverage
  // ============================================
  supported_actions: [
    // ==========================================
    // ACTIVITY ACTIONS
    // ==========================================
    {
      id: 'create_activity',
      name: 'Create Activity',
      description: 'Create a new activity (call, meeting, task, etc.)',
      category: 'Activities',
      icon: 'calendar',
      verified: false,
      api: {
        endpoint: '/activities',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          subject: 'subject',
          type: 'type',
          done: 'done',
          due_date: 'due_date',
          due_time: 'due_time',
          duration: 'duration',
          deal_id: 'deal_id',
          person_id: 'person_id',
          org_id: 'org_id',
          note: 'note',
          user_id: 'user_id',
          busy_flag: 'busy_flag'
        }
      },
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Enter activity subject',
          description: 'The subject of the activity',
          aiControlled: true,
          aiDescription: 'The subject/title of the activity'
        },
        type: {
          type: 'string',
          required: true,
          label: 'Type',
          placeholder: 'call',
          description: 'Type of the activity (call, meeting, task, deadline, email, lunch)',
          aiControlled: false
        },
        done: {
          type: 'select',
          required: false,
          label: 'Done',
          default: '0',
          options: [
            { label: 'Not Done', value: '0' },
            { label: 'Done', value: '1' }
          ],
          description: 'Whether the activity is done or not'
        },
        due_date: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Due date of the activity (YYYY-MM-DD format)'
        },
        due_time: {
          type: 'string',
          required: false,
          label: 'Due Time',
          placeholder: 'HH:MM',
          description: 'Due time of the activity in HH:MM format'
        },
        duration: {
          type: 'string',
          required: false,
          label: 'Duration',
          placeholder: 'HH:MM',
          description: 'Duration of the activity in HH:MM format'
        },
        deal_id: {
          type: 'number',
          required: false,
          label: 'Deal ID',
          placeholder: 'Enter deal ID',
          description: 'ID of the deal this activity will be associated with'
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID',
          placeholder: 'Enter person ID',
          description: 'ID of the person this activity will be associated with'
        },
        org_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          placeholder: 'Enter organization ID',
          description: 'ID of the organization this activity will be associated with'
        },
        note: {
          type: 'string',
          required: false,
          label: 'Note',
          inputType: 'textarea',
          placeholder: 'Enter activity notes',
          description: 'Note of the activity (HTML format)',
          aiControlled: true,
          aiDescription: 'Notes for the activity'
        },
        user_id: {
          type: 'number',
          required: false,
          label: 'User ID',
          placeholder: 'Enter user ID',
          description: 'ID of the user who will be assigned to the activity',
          aiControlled: false
        },
        busy_flag: {
          type: 'boolean',
          required: false,
          label: 'Busy Flag',
          default: false,
          description: 'Whether the user is busy during the activity'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the operation was successful' },
        data: {
          type: 'object',
          description: 'Created activity data',
          properties: {
            id: { type: 'number', description: 'Activity ID' },
            subject: { type: 'string', description: 'Activity subject' },
            type: { type: 'string', description: 'Activity type' }
          }
        }
      }
    },
    {
      id: 'get_activity',
      name: 'Get Activity',
      description: 'Get data of a specific activity',
      category: 'Activities',
      icon: 'calendar',
      verified: false,
      api: {
        endpoint: '/activities/{activityId}',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        activityId: {
          type: 'number',
          required: true,
          label: 'Activity ID',
          placeholder: 'Enter activity ID',
          description: 'ID of the activity to retrieve'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Activity data' }
      }
    },
    {
      id: 'get_all_activities',
      name: 'Get All Activities',
      description: 'Get all activities with optional filtering',
      category: 'Activities',
      icon: 'calendar',
      verified: false,
      api: {
        endpoint: '/activities',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        user_id: {
          type: 'number',
          required: false,
          label: 'User ID',
          description: 'Filter by user ID'
        },
        type: {
          type: 'string',
          required: false,
          label: 'Type',
          description: 'Filter by activity type'
        },
        done: {
          type: 'select',
          required: false,
          label: 'Done',
          options: [
            { label: 'All', value: '' },
            { label: 'Not Done', value: '0' },
            { label: 'Done', value: '1' }
          ],
          description: 'Filter by done status'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0,
          description: 'Pagination start'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          description: 'Number of items to fetch'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of activities' }
      }
    },
    {
      id: 'update_activity',
      name: 'Update Activity',
      description: 'Update an existing activity',
      category: 'Activities',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/activities/{activityId}',
        method: 'PUT',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        activityId: {
          type: 'number',
          required: true,
          label: 'Activity ID',
          placeholder: 'Enter activity ID',
          description: 'ID of the activity to update'
        },
        subject: {
          type: 'string',
          required: false,
          label: 'Subject',
          description: 'The subject of the activity'
        },
        type: {
          type: 'string',
          required: false,
          label: 'Type',
          description: 'Type of the activity'
        },
        done: {
          type: 'select',
          required: false,
          label: 'Done',
          options: [
            { label: 'Not Done', value: '0' },
            { label: 'Done', value: '1' }
          ],
          description: 'Whether the activity is done'
        },
        due_date: {
          type: 'string',
          required: false,
          label: 'Due Date',
          description: 'Due date (YYYY-MM-DD)'
        },
        note: {
          type: 'string',
          required: false,
          label: 'Note',
          inputType: 'textarea',
          description: 'Note of the activity'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated activity data' }
      }
    },
    {
      id: 'delete_activity',
      name: 'Delete Activity',
      description: 'Delete an activity',
      category: 'Activities',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/activities/{activityId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        activityId: {
          type: 'number',
          required: true,
          label: 'Activity ID',
          description: 'ID of the activity to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // DEAL ACTIONS
    // ==========================================
    {
      id: 'create_deal',
      name: 'Create Deal',
      description: 'Create a new deal in Pipedrive',
      category: 'Deals',
      icon: 'briefcase',
      verified: false,
      api: {
        endpoint: '/deals',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          title: 'title',
          value: 'value',
          currency: 'currency',
          status: 'status',
          stage_id: 'stage_id',
          person_id: 'person_id',
          org_id: 'org_id',
          user_id: 'user_id',
          probability: 'probability',
          lost_reason: 'lost_reason',
          visible_to: 'visible_to',
          expected_close_date: 'expected_close_date'
        }
      },
      inputSchema: {
        title: {
          type: 'string',
          required: true,
          label: 'Title',
          placeholder: 'Enter deal title',
          description: 'The title/name of the deal',
          aiControlled: true,
          aiDescription: 'The title/name of the deal'
        },
        value: {
          type: 'number',
          required: false,
          label: 'Value',
          placeholder: '0',
          description: 'Value of the deal',
          aiControlled: false
        },
        currency: {
          type: 'string',
          required: false,
          label: 'Currency',
          default: 'USD',
          placeholder: 'USD',
          description: 'Currency code (EUR, USD, GBP, etc.)'
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          default: 'open',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Won', value: 'won' },
            { label: 'Lost', value: 'lost' },
            { label: 'Deleted', value: 'deleted' }
          ],
          description: 'Status of the deal'
        },
        stage_id: {
          type: 'number',
          required: false,
          label: 'Stage ID',
          description: 'ID of the pipeline stage'
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID',
          description: 'ID of the person to associate with the deal'
        },
        org_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'ID of the organization to associate with the deal'
        },
        user_id: {
          type: 'number',
          required: false,
          label: 'User ID',
          description: 'ID of the user who owns the deal'
        },
        probability: {
          type: 'number',
          required: false,
          label: 'Probability',
          min: 0,
          max: 100,
          description: 'Deal success probability (0-100)'
        },
        expected_close_date: {
          type: 'string',
          required: false,
          label: 'Expected Close Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Expected close date of the deal'
        },
        visible_to: {
          type: 'select',
          required: false,
          label: 'Visible To',
          default: '3',
          options: [
            { label: 'Owner & Followers (Private)', value: '1' },
            { label: 'Entire Company (Shared)', value: '3' }
          ],
          description: 'Visibility of the deal'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created deal data',
          properties: {
            id: { type: 'number', description: 'Deal ID' },
            title: { type: 'string', description: 'Deal title' },
            value: { type: 'number', description: 'Deal value' },
            currency: { type: 'string', description: 'Currency code' },
            status: { type: 'string', description: 'Deal status' }
          }
        }
      }
    },
    {
      id: 'get_deal',
      name: 'Get Deal',
      description: 'Get data of a specific deal',
      category: 'Deals',
      icon: 'briefcase',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal to retrieve'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Deal data' }
      }
    },
    {
      id: 'get_all_deals',
      name: 'Get All Deals',
      description: 'Get all deals with optional filtering',
      category: 'Deals',
      icon: 'briefcase',
      verified: false,
      api: {
        endpoint: '/deals',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          options: [
            { label: 'All', value: 'all_not_deleted' },
            { label: 'Open', value: 'open' },
            { label: 'Won', value: 'won' },
            { label: 'Lost', value: 'lost' },
            { label: 'Deleted', value: 'deleted' }
          ],
          description: 'Filter by deal status'
        },
        stage_id: {
          type: 'number',
          required: false,
          label: 'Stage ID',
          description: 'Filter by stage ID'
        },
        pipeline_id: {
          type: 'number',
          required: false,
          label: 'Pipeline ID',
          description: 'Filter by pipeline ID'
        },
        user_id: {
          type: 'number',
          required: false,
          label: 'User ID',
          description: 'Filter by owner user ID'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0,
          description: 'Pagination start'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          description: 'Number of items to fetch'
        },
        sort: {
          type: 'string',
          required: false,
          label: 'Sort',
          placeholder: 'update_time DESC',
          description: 'Field to sort by and direction'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of deals' },
        additional_data: { type: 'object', description: 'Pagination info' }
      }
    },
    {
      id: 'update_deal',
      name: 'Update Deal',
      description: 'Update an existing deal',
      category: 'Deals',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}',
        method: 'PUT',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal to update'
        },
        title: {
          type: 'string',
          required: false,
          label: 'Title',
          description: 'New title for the deal'
        },
        value: {
          type: 'number',
          required: false,
          label: 'Value',
          description: 'New value for the deal'
        },
        currency: {
          type: 'string',
          required: false,
          label: 'Currency',
          description: 'Currency code'
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Won', value: 'won' },
            { label: 'Lost', value: 'lost' },
            { label: 'Deleted', value: 'deleted' }
          ],
          description: 'Deal status'
        },
        stage_id: {
          type: 'number',
          required: false,
          label: 'Stage ID',
          description: 'Move deal to this stage'
        },
        probability: {
          type: 'number',
          required: false,
          label: 'Probability',
          min: 0,
          max: 100,
          description: 'Success probability (0-100)'
        },
        lost_reason: {
          type: 'string',
          required: false,
          label: 'Lost Reason',
          description: 'Reason why the deal was lost'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated deal data' }
      }
    },
    {
      id: 'delete_deal',
      name: 'Delete Deal',
      description: 'Delete a deal',
      category: 'Deals',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'duplicate_deal',
      name: 'Duplicate Deal',
      description: 'Duplicate an existing deal',
      category: 'Deals',
      icon: 'copy',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}/duplicate',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal to duplicate'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Duplicated deal data' }
      }
    },
    {
      id: 'search_deals',
      name: 'Search Deals',
      description: 'Search for deals by term',
      category: 'Deals',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/deals/search',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        term: {
          type: 'string',
          required: true,
          label: 'Search Term',
          placeholder: 'Enter search term',
          description: 'The search term (minimum 2 characters)'
        },
        exact_match: {
          type: 'boolean',
          required: false,
          label: 'Exact Match',
          default: false,
          description: 'Only return exact matches'
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID',
          description: 'Filter by person ID'
        },
        organization_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'Filter by organization ID'
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Won', value: 'won' },
            { label: 'Lost', value: 'lost' }
          ],
          description: 'Filter by status'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          description: 'Max results to return'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Search results' }
      }
    },
    {
      id: 'get_deal_activities',
      name: 'Get Deal Activities',
      description: 'Get all activities of a deal',
      category: 'Deals',
      icon: 'calendar',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}/activities',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal'
        },
        done: {
          type: 'select',
          required: false,
          label: 'Done',
          options: [
            { label: 'All', value: '' },
            { label: 'Not Done', value: '0' },
            { label: 'Done', value: '1' }
          ],
          description: 'Filter by done status'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of activities' }
      }
    },

    // ==========================================
    // DEAL PRODUCT ACTIONS
    // ==========================================
    {
      id: 'add_product_to_deal',
      name: 'Add Product to Deal',
      description: 'Add a product to a deal',
      category: 'Deal Products',
      icon: 'package',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}/products',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal'
        },
        product_id: {
          type: 'number',
          required: true,
          label: 'Product ID',
          description: 'ID of the product to add'
        },
        item_price: {
          type: 'number',
          required: true,
          label: 'Item Price',
          description: 'Price of the product'
        },
        quantity: {
          type: 'number',
          required: true,
          label: 'Quantity',
          default: 1,
          description: 'Quantity of the product'
        },
        discount_percentage: {
          type: 'number',
          required: false,
          label: 'Discount %',
          min: 0,
          max: 100,
          description: 'Discount percentage (0-100)'
        },
        comments: {
          type: 'string',
          required: false,
          label: 'Comments',
          inputType: 'textarea',
          description: 'Comments about this product attachment',
          aiControlled: true,
          aiDescription: 'Comments about the product attachment'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Added product data' }
      }
    },
    {
      id: 'get_deal_products',
      name: 'Get Deal Products',
      description: 'Get all products attached to a deal',
      category: 'Deal Products',
      icon: 'package',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}/products',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of products' }
      }
    },
    {
      id: 'update_deal_product',
      name: 'Update Deal Product',
      description: 'Update a product attached to a deal',
      category: 'Deal Products',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}/products/{productAttachmentId}',
        method: 'PUT',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal'
        },
        productAttachmentId: {
          type: 'number',
          required: true,
          label: 'Product Attachment ID',
          description: 'ID of the product attachment'
        },
        item_price: {
          type: 'number',
          required: false,
          label: 'Item Price',
          description: 'New price'
        },
        quantity: {
          type: 'number',
          required: false,
          label: 'Quantity',
          description: 'New quantity'
        },
        discount_percentage: {
          type: 'number',
          required: false,
          label: 'Discount %',
          description: 'New discount percentage'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated product data' }
      }
    },
    {
      id: 'remove_product_from_deal',
      name: 'Remove Product from Deal',
      description: 'Remove a product from a deal',
      category: 'Deal Products',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/deals/{dealId}/products/{productAttachmentId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        dealId: {
          type: 'number',
          required: true,
          label: 'Deal ID',
          description: 'ID of the deal'
        },
        productAttachmentId: {
          type: 'number',
          required: true,
          label: 'Product Attachment ID',
          description: 'ID of the product attachment to remove'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // PERSON ACTIONS
    // ==========================================
    {
      id: 'create_person',
      name: 'Create Person',
      description: 'Create a new person/contact',
      category: 'Persons',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/persons',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          placeholder: 'John Doe',
          description: 'Full name of the person',
          aiControlled: true,
          aiDescription: 'Full name of the person/contact'
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          placeholder: 'john@example.com',
          description: 'Email address',
          aiControlled: false
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone',
          placeholder: '+1234567890',
          description: 'Phone number',
          aiControlled: false
        },
        org_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'ID of the organization to link',
          aiControlled: false
        },
        owner_id: {
          type: 'number',
          required: false,
          label: 'Owner ID',
          description: 'ID of the user who will own this person'
        },
        marketing_status: {
          type: 'select',
          required: false,
          label: 'Marketing Status',
          default: 'no_consent',
          options: [
            { label: 'No Consent', value: 'no_consent' },
            { label: 'Unsubscribed', value: 'unsubscribed' },
            { label: 'Subscribed', value: 'subscribed' },
            { label: 'Archived', value: 'archived' }
          ],
          description: 'Marketing consent status'
        },
        visible_to: {
          type: 'select',
          required: false,
          label: 'Visible To',
          default: '3',
          options: [
            { label: 'Owner & Followers (Private)', value: '1' },
            { label: 'Entire Company (Shared)', value: '3' }
          ],
          description: 'Visibility setting'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created person data',
          properties: {
            id: { type: 'number', description: 'Person ID' },
            name: { type: 'string', description: 'Person name' },
            email: { type: 'array', description: 'Email addresses' },
            phone: { type: 'array', description: 'Phone numbers' }
          }
        }
      }
    },
    {
      id: 'get_person',
      name: 'Get Person',
      description: 'Get data of a specific person',
      category: 'Persons',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/persons/{personId}',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        personId: {
          type: 'number',
          required: true,
          label: 'Person ID',
          description: 'ID of the person to retrieve'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Person data' }
      }
    },
    {
      id: 'get_all_persons',
      name: 'Get All Persons',
      description: 'Get all persons with optional filtering',
      category: 'Persons',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/persons',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        user_id: {
          type: 'number',
          required: false,
          label: 'User ID',
          description: 'Filter by owner user ID'
        },
        filter_id: {
          type: 'number',
          required: false,
          label: 'Filter ID',
          description: 'ID of a saved filter'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        },
        sort: {
          type: 'string',
          required: false,
          label: 'Sort',
          placeholder: 'name ASC',
          description: 'Field and direction to sort by'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of persons' }
      }
    },
    {
      id: 'update_person',
      name: 'Update Person',
      description: 'Update an existing person',
      category: 'Persons',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/persons/{personId}',
        method: 'PUT',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        personId: {
          type: 'number',
          required: true,
          label: 'Person ID',
          description: 'ID of the person to update'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Name',
          description: 'New name'
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          description: 'New email'
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone',
          description: 'New phone'
        },
        org_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'New organization ID'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated person data' }
      }
    },
    {
      id: 'delete_person',
      name: 'Delete Person',
      description: 'Delete a person',
      category: 'Persons',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/persons/{personId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        personId: {
          type: 'number',
          required: true,
          label: 'Person ID',
          description: 'ID of the person to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'search_persons',
      name: 'Search Persons',
      description: 'Search for persons by term',
      category: 'Persons',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/persons/search',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        term: {
          type: 'string',
          required: true,
          label: 'Search Term',
          placeholder: 'Enter search term',
          description: 'The search term (minimum 2 characters)'
        },
        exact_match: {
          type: 'boolean',
          required: false,
          label: 'Exact Match',
          default: false,
          description: 'Only return exact matches'
        },
        organization_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'Filter by organization'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'name,email,phone',
          description: 'Fields to search in (comma-separated)'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Search results' }
      }
    },

    // ==========================================
    // ORGANIZATION ACTIONS
    // ==========================================
    {
      id: 'create_organization',
      name: 'Create Organization',
      description: 'Create a new organization',
      category: 'Organizations',
      icon: 'building',
      verified: false,
      api: {
        endpoint: '/organizations',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          placeholder: 'Acme Corp',
          description: 'Name of the organization',
          aiControlled: true,
          aiDescription: 'Name of the organization/company'
        },
        owner_id: {
          type: 'number',
          required: false,
          label: 'Owner ID',
          description: 'ID of the user who will own this organization',
          aiControlled: false
        },
        visible_to: {
          type: 'select',
          required: false,
          label: 'Visible To',
          default: '3',
          options: [
            { label: 'Owner & Followers (Private)', value: '1' },
            { label: 'Entire Company (Shared)', value: '3' }
          ],
          description: 'Visibility setting'
        },
        address: {
          type: 'string',
          required: false,
          label: 'Address',
          description: 'Organization address'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created organization data',
          properties: {
            id: { type: 'number', description: 'Organization ID' },
            name: { type: 'string', description: 'Organization name' }
          }
        }
      }
    },
    {
      id: 'get_organization',
      name: 'Get Organization',
      description: 'Get data of a specific organization',
      category: 'Organizations',
      icon: 'building',
      verified: false,
      api: {
        endpoint: '/organizations/{organizationId}',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        organizationId: {
          type: 'number',
          required: true,
          label: 'Organization ID',
          description: 'ID of the organization to retrieve'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Organization data' }
      }
    },
    {
      id: 'get_all_organizations',
      name: 'Get All Organizations',
      description: 'Get all organizations with optional filtering',
      category: 'Organizations',
      icon: 'building',
      verified: false,
      api: {
        endpoint: '/organizations',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        user_id: {
          type: 'number',
          required: false,
          label: 'User ID',
          description: 'Filter by owner user ID'
        },
        filter_id: {
          type: 'number',
          required: false,
          label: 'Filter ID',
          description: 'ID of a saved filter'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        },
        sort: {
          type: 'string',
          required: false,
          label: 'Sort',
          placeholder: 'name ASC'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of organizations' }
      }
    },
    {
      id: 'update_organization',
      name: 'Update Organization',
      description: 'Update an existing organization',
      category: 'Organizations',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/organizations/{organizationId}',
        method: 'PUT',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        organizationId: {
          type: 'number',
          required: true,
          label: 'Organization ID',
          description: 'ID of the organization to update'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Name',
          description: 'New name'
        },
        owner_id: {
          type: 'number',
          required: false,
          label: 'Owner ID',
          description: 'New owner user ID'
        },
        visible_to: {
          type: 'select',
          required: false,
          label: 'Visible To',
          options: [
            { label: 'Owner & Followers (Private)', value: '1' },
            { label: 'Entire Company (Shared)', value: '3' }
          ]
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated organization data' }
      }
    },
    {
      id: 'delete_organization',
      name: 'Delete Organization',
      description: 'Delete an organization',
      category: 'Organizations',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/organizations/{organizationId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        organizationId: {
          type: 'number',
          required: true,
          label: 'Organization ID',
          description: 'ID of the organization to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'search_organizations',
      name: 'Search Organizations',
      description: 'Search for organizations by term',
      category: 'Organizations',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/organizations/search',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        term: {
          type: 'string',
          required: true,
          label: 'Search Term',
          placeholder: 'Enter search term',
          description: 'The search term (minimum 2 characters)'
        },
        exact_match: {
          type: 'boolean',
          required: false,
          label: 'Exact Match',
          default: false
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'name,address,custom_fields',
          description: 'Fields to search in (comma-separated)'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Search results' }
      }
    },

    // ==========================================
    // LEAD ACTIONS
    // ==========================================
    {
      id: 'create_lead',
      name: 'Create Lead',
      description: 'Create a new lead',
      category: 'Leads',
      icon: 'target',
      verified: false,
      api: {
        endpoint: '/leads',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        title: {
          type: 'string',
          required: true,
          label: 'Title',
          placeholder: 'Enter lead title',
          description: 'Title/name of the lead',
          aiControlled: true,
          aiDescription: 'Title/name of the lead'
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID',
          description: 'ID of the person to link',
          aiControlled: false
        },
        organization_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'ID of the organization to link'
        },
        owner_id: {
          type: 'number',
          required: false,
          label: 'Owner ID',
          description: 'ID of the user who will own this lead'
        },
        expected_close_date: {
          type: 'string',
          required: false,
          label: 'Expected Close Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Expected close date'
        },
        value_amount: {
          type: 'number',
          required: false,
          label: 'Value Amount',
          description: 'Potential value of the lead'
        },
        value_currency: {
          type: 'string',
          required: false,
          label: 'Value Currency',
          default: 'USD',
          description: 'Currency code'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created lead data',
          properties: {
            id: { type: 'string', description: 'Lead ID' },
            title: { type: 'string', description: 'Lead title' }
          }
        }
      }
    },
    {
      id: 'get_lead',
      name: 'Get Lead',
      description: 'Get data of a specific lead',
      category: 'Leads',
      icon: 'target',
      verified: false,
      api: {
        endpoint: '/leads/{leadId}',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          description: 'ID of the lead to retrieve'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Lead data' }
      }
    },
    {
      id: 'get_all_leads',
      name: 'Get All Leads',
      description: 'Get all leads with optional filtering',
      category: 'Leads',
      icon: 'target',
      verified: false,
      api: {
        endpoint: '/leads',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        archived_status: {
          type: 'select',
          required: false,
          label: 'Archived Status',
          options: [
            { label: 'Not Archived', value: 'not_archived' },
            { label: 'Archived', value: 'archived' },
            { label: 'All', value: 'all' }
          ],
          default: 'not_archived'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of leads' }
      }
    },
    {
      id: 'update_lead',
      name: 'Update Lead',
      description: 'Update an existing lead',
      category: 'Leads',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/leads/{leadId}',
        method: 'PATCH',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          description: 'ID of the lead to update'
        },
        title: {
          type: 'string',
          required: false,
          label: 'Title',
          description: 'New title'
        },
        owner_id: {
          type: 'number',
          required: false,
          label: 'Owner ID',
          description: 'New owner user ID'
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID',
          description: 'New person ID'
        },
        expected_close_date: {
          type: 'string',
          required: false,
          label: 'Expected Close Date',
          placeholder: 'YYYY-MM-DD'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated lead data' }
      }
    },
    {
      id: 'delete_lead',
      name: 'Delete Lead',
      description: 'Delete a lead',
      category: 'Leads',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/leads/{leadId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          description: 'ID of the lead to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // NOTE ACTIONS
    // ==========================================
    {
      id: 'create_note',
      name: 'Create Note',
      description: 'Create a new note',
      category: 'Notes',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/notes',
        method: 'POST',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        content: {
          type: 'string',
          required: true,
          label: 'Content',
          inputType: 'textarea',
          placeholder: 'Enter note content',
          description: 'Content of the note (HTML supported)',
          aiControlled: true,
          aiDescription: 'Content of the note'
        },
        deal_id: {
          type: 'number',
          required: false,
          label: 'Deal ID',
          description: 'ID of the deal to attach the note to',
          aiControlled: false
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID',
          description: 'ID of the person to attach the note to'
        },
        org_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'ID of the organization to attach the note to'
        },
        lead_id: {
          type: 'string',
          required: false,
          label: 'Lead ID',
          description: 'ID of the lead to attach the note to'
        },
        pinned_to_deal_flag: {
          type: 'boolean',
          required: false,
          label: 'Pin to Deal',
          default: false,
          description: 'Whether to pin the note to the deal'
        },
        pinned_to_person_flag: {
          type: 'boolean',
          required: false,
          label: 'Pin to Person',
          default: false,
          description: 'Whether to pin the note to the person'
        },
        pinned_to_organization_flag: {
          type: 'boolean',
          required: false,
          label: 'Pin to Organization',
          default: false,
          description: 'Whether to pin the note to the organization'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created note data',
          properties: {
            id: { type: 'number', description: 'Note ID' },
            content: { type: 'string', description: 'Note content' }
          }
        }
      }
    },
    {
      id: 'get_note',
      name: 'Get Note',
      description: 'Get data of a specific note',
      category: 'Notes',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/notes/{noteId}',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        noteId: {
          type: 'number',
          required: true,
          label: 'Note ID',
          description: 'ID of the note to retrieve'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Note data' }
      }
    },
    {
      id: 'get_all_notes',
      name: 'Get All Notes',
      description: 'Get all notes with optional filtering',
      category: 'Notes',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/notes',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        deal_id: {
          type: 'number',
          required: false,
          label: 'Deal ID',
          description: 'Filter by deal ID'
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID',
          description: 'Filter by person ID'
        },
        org_id: {
          type: 'number',
          required: false,
          label: 'Organization ID',
          description: 'Filter by organization ID'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of notes' }
      }
    },
    {
      id: 'update_note',
      name: 'Update Note',
      description: 'Update an existing note',
      category: 'Notes',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/notes/{noteId}',
        method: 'PUT',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        noteId: {
          type: 'number',
          required: true,
          label: 'Note ID',
          description: 'ID of the note to update'
        },
        content: {
          type: 'string',
          required: false,
          label: 'Content',
          inputType: 'textarea',
          description: 'New content'
        },
        deal_id: {
          type: 'number',
          required: false,
          label: 'Deal ID'
        },
        person_id: {
          type: 'number',
          required: false,
          label: 'Person ID'
        },
        org_id: {
          type: 'number',
          required: false,
          label: 'Organization ID'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated note data' }
      }
    },
    {
      id: 'delete_note',
      name: 'Delete Note',
      description: 'Delete a note',
      category: 'Notes',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/notes/{noteId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        noteId: {
          type: 'number',
          required: true,
          label: 'Note ID',
          description: 'ID of the note to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // PRODUCT ACTIONS
    // ==========================================
    {
      id: 'get_all_products',
      name: 'Get All Products',
      description: 'Get all products',
      category: 'Products',
      icon: 'package',
      verified: false,
      api: {
        endpoint: '/products',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        user_id: {
          type: 'number',
          required: false,
          label: 'User ID',
          description: 'Filter by owner user ID'
        },
        start: {
          type: 'number',
          required: false,
          label: 'Start',
          default: 0
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of products' }
      }
    },

    // ==========================================
    // FILE ACTIONS
    // ==========================================
    {
      id: 'get_file',
      name: 'Get File',
      description: 'Get data of a specific file',
      category: 'Files',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/files/{fileId}',
        method: 'GET',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        fileId: {
          type: 'number',
          required: true,
          label: 'File ID',
          description: 'ID of the file to retrieve'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'File data' }
      }
    },
    {
      id: 'delete_file',
      name: 'Delete File',
      description: 'Delete a file',
      category: 'Files',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/files/{fileId}',
        method: 'DELETE',
        baseUrl: 'https://api.pipedrive.com/v1'
      },
      inputSchema: {
        fileId: {
          type: 'number',
          required: true,
          label: 'File ID',
          description: 'ID of the file to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'update_file',
      name: 'Update File',
      description: 'Update file details',
      category: 'Files',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/files/{fileId}',
        method: 'PUT',
        baseUrl: 'https://api.pipedrive.com/v1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        fileId: {
          type: 'number',
          required: true,
          label: 'File ID',
          description: 'ID of the file to update'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Name',
          description: 'New file name'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          description: 'New file description'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated file data' }
      }
    }
  ],

  // ============================================
  // SUPPORTED TRIGGERS - Webhook-based events
  // ============================================
  supported_triggers: [
    // ==========================================
    // DEAL TRIGGERS
    // ==========================================
    {
      id: 'deal_created',
      name: 'Deal Created',
      description: 'Triggers when a new deal is created',
      eventType: 'added.deal',
      icon: 'briefcase',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        action: {
          type: 'string',
          required: false,
          label: 'Action',
          default: 'added',
          description: 'Event action type'
        },
        entity: {
          type: 'string',
          required: false,
          label: 'Entity',
          default: 'deal',
          description: 'Entity type'
        }
      },
      outputSchema: {
        pipedriveEvent: {
          type: 'object',
          description: 'Pipedrive webhook event data',
          properties: {
            meta: { type: 'object', description: 'Event metadata' },
            current: { type: 'object', description: 'Current deal data' },
            previous: { type: 'object', description: 'Previous deal data (for updates)' }
          }
        },
        deal: { type: 'object', description: 'Created deal data' },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'deal_updated',
      name: 'Deal Updated',
      description: 'Triggers when a deal is updated',
      eventType: 'updated.deal',
      icon: 'edit',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        action: {
          type: 'string',
          required: false,
          label: 'Action',
          default: 'updated',
          description: 'Event action type'
        },
        entity: {
          type: 'string',
          required: false,
          label: 'Entity',
          default: 'deal',
          description: 'Entity type'
        }
      },
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        deal: { type: 'object', description: 'Updated deal data' },
        changes: { type: 'object', description: 'What fields changed' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'deal_deleted',
      name: 'Deal Deleted',
      description: 'Triggers when a deal is deleted',
      eventType: 'deleted.deal',
      icon: 'trash',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        deal: { type: 'object', description: 'Deleted deal data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'deal_merged',
      name: 'Deal Merged',
      description: 'Triggers when deals are merged',
      eventType: 'merged.deal',
      icon: 'git-merge',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        deal: { type: 'object', description: 'Resulting deal data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // PERSON TRIGGERS
    // ==========================================
    {
      id: 'person_created',
      name: 'Person Created',
      description: 'Triggers when a new person is created',
      eventType: 'added.person',
      icon: 'user-plus',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        person: { type: 'object', description: 'Created person data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'person_updated',
      name: 'Person Updated',
      description: 'Triggers when a person is updated',
      eventType: 'updated.person',
      icon: 'user',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        person: { type: 'object', description: 'Updated person data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'person_deleted',
      name: 'Person Deleted',
      description: 'Triggers when a person is deleted',
      eventType: 'deleted.person',
      icon: 'user-minus',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        person: { type: 'object', description: 'Deleted person data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // ORGANIZATION TRIGGERS
    // ==========================================
    {
      id: 'organization_created',
      name: 'Organization Created',
      description: 'Triggers when a new organization is created',
      eventType: 'added.organization',
      icon: 'building',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        organization: { type: 'object', description: 'Created organization data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'organization_updated',
      name: 'Organization Updated',
      description: 'Triggers when an organization is updated',
      eventType: 'updated.organization',
      icon: 'building',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        organization: { type: 'object', description: 'Updated organization data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'organization_deleted',
      name: 'Organization Deleted',
      description: 'Triggers when an organization is deleted',
      eventType: 'deleted.organization',
      icon: 'building',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        organization: { type: 'object', description: 'Deleted organization data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // ACTIVITY TRIGGERS
    // ==========================================
    {
      id: 'activity_created',
      name: 'Activity Created',
      description: 'Triggers when a new activity is created',
      eventType: 'added.activity',
      icon: 'calendar',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        activity: { type: 'object', description: 'Created activity data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'activity_updated',
      name: 'Activity Updated',
      description: 'Triggers when an activity is updated',
      eventType: 'updated.activity',
      icon: 'calendar',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        activity: { type: 'object', description: 'Updated activity data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'activity_deleted',
      name: 'Activity Deleted',
      description: 'Triggers when an activity is deleted',
      eventType: 'deleted.activity',
      icon: 'calendar',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        activity: { type: 'object', description: 'Deleted activity data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // NOTE TRIGGERS
    // ==========================================
    {
      id: 'note_created',
      name: 'Note Created',
      description: 'Triggers when a new note is created',
      eventType: 'added.note',
      icon: 'file-text',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        note: { type: 'object', description: 'Created note data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'note_updated',
      name: 'Note Updated',
      description: 'Triggers when a note is updated',
      eventType: 'updated.note',
      icon: 'file-text',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        note: { type: 'object', description: 'Updated note data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'note_deleted',
      name: 'Note Deleted',
      description: 'Triggers when a note is deleted',
      eventType: 'deleted.note',
      icon: 'file-text',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        note: { type: 'object', description: 'Deleted note data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // PIPELINE & STAGE TRIGGERS
    // ==========================================
    {
      id: 'pipeline_created',
      name: 'Pipeline Created',
      description: 'Triggers when a new pipeline is created',
      eventType: 'added.pipeline',
      icon: 'git-branch',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        pipeline: { type: 'object', description: 'Created pipeline data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'stage_created',
      name: 'Stage Created',
      description: 'Triggers when a new stage is created',
      eventType: 'added.stage',
      icon: 'layers',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        stage: { type: 'object', description: 'Created stage data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // PRODUCT TRIGGERS
    // ==========================================
    {
      id: 'product_created',
      name: 'Product Created',
      description: 'Triggers when a new product is created',
      eventType: 'added.product',
      icon: 'package',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        product: { type: 'object', description: 'Created product data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },
    {
      id: 'product_updated',
      name: 'Product Updated',
      description: 'Triggers when a product is updated',
      eventType: 'updated.product',
      icon: 'package',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        product: { type: 'object', description: 'Updated product data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // USER TRIGGERS
    // ==========================================
    {
      id: 'user_created',
      name: 'User Created',
      description: 'Triggers when a new user is created',
      eventType: 'added.user',
      icon: 'user',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        user: { type: 'object', description: 'Created user data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    },

    // ==========================================
    // WILDCARD TRIGGER
    // ==========================================
    {
      id: 'any_event',
      name: 'Any Event',
      description: 'Triggers on any Pipedrive event',
      eventType: '*.*',
      icon: 'zap',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        action: {
          type: 'select',
          required: false,
          label: 'Action',
          default: '*',
          options: [
            { label: 'All', value: '*' },
            { label: 'Create', value: 'added' },
            { label: 'Update', value: 'updated' },
            { label: 'Delete', value: 'deleted' },
            { label: 'Merge', value: 'merged' }
          ],
          description: 'Filter by action type'
        },
        entity: {
          type: 'select',
          required: false,
          label: 'Entity',
          default: '*',
          options: [
            { label: 'All', value: '*' },
            { label: 'Activity', value: 'activity' },
            { label: 'Activity Type', value: 'activityType' },
            { label: 'Deal', value: 'deal' },
            { label: 'Note', value: 'note' },
            { label: 'Organization', value: 'organization' },
            { label: 'Person', value: 'person' },
            { label: 'Pipeline', value: 'pipeline' },
            { label: 'Product', value: 'product' },
            { label: 'Stage', value: 'stage' },
            { label: 'User', value: 'user' }
          ],
          description: 'Filter by entity type'
        }
      },
      outputSchema: {
        pipedriveEvent: { type: 'object', description: 'Pipedrive webhook event data' },
        eventType: { type: 'string', description: 'Event type (e.g., added.deal)' },
        data: { type: 'object', description: 'Event data' },
        triggeredAt: { type: 'string', description: 'Timestamp' }
      }
    }
  ]
};
