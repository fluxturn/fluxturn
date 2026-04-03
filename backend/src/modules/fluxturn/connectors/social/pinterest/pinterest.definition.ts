// Pinterest Connector
// Auto-generated connector definition

import { ConnectorDefinition } from '../../shared';

export const PINTEREST_CONNECTOR: ConnectorDefinition = {
    name: 'pinterest',
    display_name: 'Pinterest',
    category: 'social',
    description: 'Create pins, manage boards, track analytics, and auto-post content to Pinterest',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
          { label: 'Custom OAuth App', value: 'manual', description: 'Use your own Pinterest app credentials' }
        ],
        default: 'oauth2'
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: true,
        placeholder: 'Your Pinterest App ID',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Your Pinterest App Secret',
        displayOptions: { authType: ['manual'] }
      }
    ],
    endpoints: {
      base_url: 'https://api.pinterest.com/v5',
      pins: '/pins',
      boards: '/boards',
      boardSections: '/boards/{board_id}/sections',
      user: '/user_account',
      analytics: '/user_account/analytics',
      followers: '/user_account/followers',
      mediaUpload: '/media'
    },
    webhook_support: false,
    rate_limits: {
      requests_per_day: 1000,
      requests_per_hour: 200,
      requests_per_minute: 10
    },
    sandbox_available: true,
    oauth_config: {
      authorization_url: 'https://www.pinterest.com/oauth/',
      token_url: 'https://api.pinterest.com/v5/oauth/token',
      scopes: [
        'boards:read',
        'boards:write',
        'pins:read',
        'pins:write',
        'user_accounts:read',
        'ads:read'
      ]
    },
    supported_actions: [
      // ===== CREATE PINS =====
      {
        id: 'create_pin',
        name: 'Create Pin',
        description: 'Create a new pin on a board with image, title, and description',
        category: 'Pins',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/pins',
          method: 'POST',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            boardId: 'board_id',
            title: 'title',
            description: 'description',
            link: 'link',
            mediaUrl: 'media_source.source_type',
            imageUrl: 'media_source.url',
            altText: 'alt_text',
            dominantColor: 'dominant_color'
          }
        },
        inputSchema: {
          boardId: {
            type: 'string',
            required: true,
            label: 'Board ID',
            placeholder: '1234567890',
            description: 'The ID of the board to create the pin on',
            helpText: 'Get board ID from "List Boards" action',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Pin Title',
            inputType: 'text',
            maxLength: 100,
            placeholder: 'My Amazing Pin',
            description: 'Title of the pin (max 100 characters)',
            aiControlled: true,
            aiDescription: 'The title of the Pinterest pin'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Pin Description',
            inputType: 'textarea',
            maxLength: 500,
            placeholder: 'Detailed description of your pin...',
            description: 'Description of the pin (max 500 characters)',
            aiControlled: true,
            aiDescription: 'A detailed description of the Pinterest pin'
          },
          link: {
            type: 'string',
            required: false,
            label: 'Destination Link',
            inputType: 'url',
            placeholder: 'https://example.com/article',
            description: 'URL where users will be taken when they click the pin',
            aiControlled: false
          },
          imageUrl: {
            type: 'string',
            required: true,
            label: 'Image URL',
            inputType: 'url',
            placeholder: 'https://example.com/image.jpg',
            description: 'Direct URL to the image (JPEG, PNG, GIF, or WebP)',
            aiControlled: false
          },
          altText: {
            type: 'string',
            required: false,
            label: 'Alt Text',
            inputType: 'text',
            maxLength: 500,
            placeholder: 'Description of the image',
            description: 'Alternative text for accessibility',
            aiControlled: true,
            aiDescription: 'Alternative text description for the image'
          },
          dominantColor: {
            type: 'string',
            required: false,
            label: 'Dominant Color',
            placeholder: '#FF5733',
            description: 'Hex color code for the dominant color in the image',
            aiControlled: false
          }
        },
        outputSchema: {
          id: {
            type: 'string',
            description: 'Unique identifier of the created pin'
          },
          created_at: {
            type: 'string',
            description: 'Creation timestamp'
          },
          link: {
            type: 'string',
            description: 'Destination URL of the pin'
          },
          media: {
            type: 'object',
            description: 'Media information'
          }
        }
      },
      {
        id: 'create_pin_from_website',
        name: 'Create Pin from Website',
        description: 'Auto-post content by scraping a website URL',
        category: 'Pins',
        icon: 'globe',
        verified: false,
        api: {
          endpoint: '/pins',
          method: 'POST',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            boardId: 'board_id',
            websiteUrl: 'link',
            title: 'title',
            description: 'description'
          }
        },
        inputSchema: {
          boardId: {
            type: 'string',
            required: true,
            label: 'Board ID',
            placeholder: '1234567890',
            description: 'The ID of the board to create the pin on',
            aiControlled: false
          },
          websiteUrl: {
            type: 'string',
            required: true,
            label: 'Website URL',
            inputType: 'url',
            placeholder: 'https://example.com/article',
            description: 'URL of the website to create pin from (Pinterest will scrape images)',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: false,
            label: 'Pin Title',
            inputType: 'text',
            maxLength: 100,
            description: 'Title (if not provided, will be scraped from website)',
            aiControlled: true,
            aiDescription: 'The title of the Pinterest pin'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Pin Description',
            inputType: 'textarea',
            maxLength: 500,
            description: 'Description (if not provided, will be scraped from website)',
            aiControlled: true,
            aiDescription: 'A detailed description of the Pinterest pin'
          }
        }
      },
      {
        id: 'update_pin',
        name: 'Update Pin',
        description: 'Update an existing pin\'s title, description, or link',
        category: 'Pins',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/pins/{pin_id}',
          method: 'PATCH',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            pinId: 'pin_id',
            title: 'title',
            description: 'description',
            link: 'link',
            altText: 'alt_text',
            boardId: 'board_id'
          }
        },
        inputSchema: {
          pinId: {
            type: 'string',
            required: true,
            label: 'Pin ID',
            placeholder: '1234567890',
            description: 'The ID of the pin to update',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: false,
            label: 'New Title',
            inputType: 'text',
            maxLength: 100,
            description: 'Updated title for the pin',
            aiControlled: true,
            aiDescription: 'The updated title for the Pinterest pin'
          },
          description: {
            type: 'string',
            required: false,
            label: 'New Description',
            inputType: 'textarea',
            maxLength: 500,
            description: 'Updated description for the pin',
            aiControlled: true,
            aiDescription: 'The updated description for the Pinterest pin'
          },
          link: {
            type: 'string',
            required: false,
            label: 'New Destination Link',
            inputType: 'url',
            description: 'Updated destination URL',
            aiControlled: false
          },
          boardId: {
            type: 'string',
            required: false,
            label: 'Move to Board ID',
            description: 'Move pin to a different board (optional)',
            aiControlled: false
          },
          altText: {
            type: 'string',
            required: false,
            label: 'New Alt Text',
            maxLength: 500,
            description: 'Updated alt text for accessibility',
            aiControlled: true,
            aiDescription: 'Updated alternative text for the image'
          }
        }
      },
      {
        id: 'delete_pin',
        name: 'Delete Pin',
        description: 'Delete a pin permanently',
        category: 'Pins',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/pins/{pin_id}',
          method: 'DELETE',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            pinId: 'pin_id'
          }
        },
        inputSchema: {
          pinId: {
            type: 'string',
            required: true,
            label: 'Pin ID',
            placeholder: '1234567890',
            description: 'The ID of the pin to delete',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_pin',
        name: 'Get Pin',
        description: 'Retrieve information about a specific pin',
        category: 'Pins',
        icon: 'eye',
        verified: false,
        api: {
          endpoint: '/pins/{pin_id}',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            pinId: 'pin_id'
          }
        },
        inputSchema: {
          pinId: {
            type: 'string',
            required: true,
            label: 'Pin ID',
            placeholder: '1234567890',
            description: 'The ID of the pin to retrieve',
            aiControlled: false
          }
        },
        outputSchema: {
          id: {
            type: 'string',
            description: 'Pin ID'
          },
          title: {
            type: 'string',
            description: 'Pin title'
          },
          description: {
            type: 'string',
            description: 'Pin description'
          },
          link: {
            type: 'string',
            description: 'Destination URL'
          },
          created_at: {
            type: 'string',
            description: 'Creation timestamp'
          },
          board_id: {
            type: 'string',
            description: 'Board ID where pin is located'
          },
          media: {
            type: 'object',
            description: 'Media information and URLs'
          }
        }
      },

      // ===== MANAGE BOARDS =====
      {
        id: 'create_board',
        name: 'Create Board',
        description: 'Create a new Pinterest board',
        category: 'Boards',
        icon: 'folder-plus',
        verified: false,
        api: {
          endpoint: '/boards',
          method: 'POST',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            name: 'name',
            description: 'description',
            privacy: 'privacy'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Board Name',
            inputType: 'text',
            placeholder: 'My Board',
            description: 'Name of the board',
            aiControlled: true,
            aiDescription: 'The name of the Pinterest board'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Board Description',
            inputType: 'textarea',
            maxLength: 500,
            placeholder: 'Description of my board...',
            description: 'Description of the board (max 500 characters)',
            aiControlled: true,
            aiDescription: 'A description of the Pinterest board'
          },
          privacy: {
            type: 'select',
            required: false,
            label: 'Privacy Level',
            default: 'PUBLIC',
            options: [
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Protected (Only you + invited)', value: 'PROTECTED' },
              { label: 'Secret (Only you)', value: 'SECRET' }
            ],
            description: 'Privacy level for the board',
            aiControlled: false
          }
        },
        outputSchema: {
          id: {
            type: 'string',
            description: 'Board ID'
          },
          name: {
            type: 'string',
            description: 'Board name'
          },
          created_at: {
            type: 'string',
            description: 'Creation timestamp'
          }
        }
      },
      {
        id: 'update_board',
        name: 'Update Board',
        description: 'Update an existing board\'s name, description, or privacy',
        category: 'Boards',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/boards/{board_id}',
          method: 'PATCH',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            boardId: 'board_id',
            name: 'name',
            description: 'description',
            privacy: 'privacy'
          }
        },
        inputSchema: {
          boardId: {
            type: 'string',
            required: true,
            label: 'Board ID',
            placeholder: '1234567890',
            description: 'The ID of the board to update',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: false,
            label: 'New Board Name',
            inputType: 'text',
            description: 'Updated name for the board',
            aiControlled: true,
            aiDescription: 'The updated name for the Pinterest board'
          },
          description: {
            type: 'string',
            required: false,
            label: 'New Description',
            inputType: 'textarea',
            maxLength: 500,
            description: 'Updated description for the board',
            aiControlled: true,
            aiDescription: 'The updated description for the Pinterest board'
          },
          privacy: {
            type: 'select',
            required: false,
            label: 'Privacy Level',
            options: [
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Protected', value: 'PROTECTED' },
              { label: 'Secret', value: 'SECRET' }
            ],
            description: 'Updated privacy level',
            aiControlled: false
          }
        }
      },
      {
        id: 'delete_board',
        name: 'Delete Board',
        description: 'Delete a board and all its pins permanently',
        category: 'Boards',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/boards/{board_id}',
          method: 'DELETE',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            boardId: 'board_id'
          }
        },
        inputSchema: {
          boardId: {
            type: 'string',
            required: true,
            label: 'Board ID',
            placeholder: '1234567890',
            description: 'The ID of the board to delete',
            aiControlled: false
          }
        }
      },
      {
        id: 'list_boards',
        name: 'List Boards',
        description: 'Get a list of all boards for the authenticated user',
        category: 'Boards',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/boards',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            pageSize: 'page_size',
            bookmark: 'bookmark',
            privacy: 'privacy'
          }
        },
        inputSchema: {
          pageSize: {
            type: 'number',
            required: false,
            label: 'Page Size',
            default: 25,
            min: 1,
            max: 100,
            description: 'Number of boards to return (1-100)',
            aiControlled: false
          },
          privacy: {
            type: 'select',
            required: false,
            label: 'Filter by Privacy',
            options: [
              { label: 'All', value: 'ALL' },
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Protected', value: 'PROTECTED' },
              { label: 'Secret', value: 'SECRET' }
            ],
            description: 'Filter boards by privacy level',
            aiControlled: false
          },
          bookmark: {
            type: 'string',
            required: false,
            label: 'Pagination Bookmark',
            description: 'Bookmark token from previous response for pagination',
            aiControlled: false
          }
        },
        outputSchema: {
          items: {
            type: 'array',
            description: 'Array of boards'
          },
          bookmark: {
            type: 'string',
            description: 'Bookmark for next page'
          }
        }
      },
      {
        id: 'get_board',
        name: 'Get Board',
        description: 'Retrieve information about a specific board',
        category: 'Boards',
        icon: 'folder',
        verified: false,
        api: {
          endpoint: '/boards/{board_id}',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            boardId: 'board_id'
          }
        },
        inputSchema: {
          boardId: {
            type: 'string',
            required: true,
            label: 'Board ID',
            placeholder: '1234567890',
            description: 'The ID of the board to retrieve',
            aiControlled: false
          }
        },
        outputSchema: {
          id: {
            type: 'string',
            description: 'Board ID'
          },
          name: {
            type: 'string',
            description: 'Board name'
          },
          description: {
            type: 'string',
            description: 'Board description'
          },
          pin_count: {
            type: 'number',
            description: 'Number of pins on the board'
          },
          created_at: {
            type: 'string',
            description: 'Creation timestamp'
          }
        }
      },
      {
        id: 'list_board_pins',
        name: 'List Board Pins',
        description: 'Get all pins from a specific board',
        category: 'Boards',
        icon: 'grid',
        verified: false,
        api: {
          endpoint: '/boards/{board_id}/pins',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            boardId: 'board_id',
            pageSize: 'page_size',
            bookmark: 'bookmark'
          }
        },
        inputSchema: {
          boardId: {
            type: 'string',
            required: true,
            label: 'Board ID',
            placeholder: '1234567890',
            description: 'The ID of the board',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            required: false,
            label: 'Page Size',
            default: 25,
            min: 1,
            max: 100,
            description: 'Number of pins to return (1-100)',
            aiControlled: false
          },
          bookmark: {
            type: 'string',
            required: false,
            label: 'Pagination Bookmark',
            description: 'Bookmark token from previous response for pagination',
            aiControlled: false
          }
        }
      },
      {
        id: 'create_board_section',
        name: 'Create Board Section',
        description: 'Create a section within a board to organize pins',
        category: 'Boards',
        icon: 'folder-tree',
        verified: false,
        api: {
          endpoint: '/boards/{board_id}/sections',
          method: 'POST',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            boardId: 'board_id',
            name: 'name'
          }
        },
        inputSchema: {
          boardId: {
            type: 'string',
            required: true,
            label: 'Board ID',
            placeholder: '1234567890',
            description: 'The ID of the board to create section in',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: true,
            label: 'Section Name',
            inputType: 'text',
            placeholder: 'My Section',
            description: 'Name of the section',
            aiControlled: true,
            aiDescription: 'The name of the board section'
          }
        }
      },

      // ===== RETRIEVE DATA =====
      {
        id: 'get_user_profile',
        name: 'Get User Profile',
        description: 'Get information about the authenticated user',
        category: 'User Data',
        icon: 'user',
        verified: false,
        api: {
          endpoint: '/user_account',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {}
        },
        inputSchema: {},
        outputSchema: {
          username: {
            type: 'string',
            description: 'User\'s username'
          },
          account_type: {
            type: 'string',
            description: 'Account type (BUSINESS, PERSONAL)'
          },
          profile_image: {
            type: 'string',
            description: 'Profile image URL'
          },
          website_url: {
            type: 'string',
            description: 'User\'s website URL'
          },
          follower_count: {
            type: 'number',
            description: 'Number of followers'
          },
          following_count: {
            type: 'number',
            description: 'Number of users following'
          },
          board_count: {
            type: 'number',
            description: 'Number of boards'
          },
          pin_count: {
            type: 'number',
            description: 'Total number of pins'
          }
        }
      },
      {
        id: 'search_pins',
        name: 'Search Pins',
        description: 'Search for pins by keyword',
        category: 'User Data',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/search/pins',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            query: 'query',
            pageSize: 'page_size',
            bookmark: 'bookmark'
          }
        },
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Search Query',
            inputType: 'text',
            placeholder: 'cooking recipes',
            description: 'Keywords to search for',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            required: false,
            label: 'Results Per Page',
            default: 25,
            min: 1,
            max: 50,
            description: 'Number of results to return (1-50)',
            aiControlled: false
          },
          bookmark: {
            type: 'string',
            required: false,
            label: 'Pagination Bookmark',
            description: 'Bookmark token from previous response',
            aiControlled: false
          }
        }
      },

      // ===== TRACK ANALYTICS =====
      {
        id: 'get_user_analytics',
        name: 'Get User Analytics',
        description: 'Get analytics data for your Pinterest account',
        category: 'Analytics',
        icon: 'bar-chart',
        verified: false,
        api: {
          endpoint: '/user_account/analytics',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            startDate: 'start_date',
            endDate: 'end_date',
            metricTypes: 'metric_types',
            splitField: 'split_field'
          }
        },
        inputSchema: {
          startDate: {
            type: 'string',
            required: true,
            label: 'Start Date',
            inputType: 'text',
            placeholder: 'YYYY-MM-DD',
            description: 'Start date for analytics data (format: YYYY-MM-DD)',
            aiControlled: false
          },
          endDate: {
            type: 'string',
            required: true,
            label: 'End Date',
            inputType: 'text',
            placeholder: 'YYYY-MM-DD',
            description: 'End date for analytics data (format: YYYY-MM-DD)',
            aiControlled: false
          },
          metricTypes: {
            type: 'array',
            required: true,
            label: 'Metric Types',
            description: 'Metrics to retrieve (e.g., IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK)',
            items: { type: 'string' },
            aiControlled: false
          },
          splitField: {
            type: 'select',
            required: false,
            label: 'Split By',
            options: [
              { label: 'No Split', value: 'NO_SPLIT' },
              { label: 'Pin Format', value: 'PIN_FORMAT' },
              { label: 'App Type', value: 'APP_TYPE' }
            ],
            description: 'How to split the analytics data',
            aiControlled: false
          }
        },
        outputSchema: {
          all: {
            type: 'object',
            description: 'Aggregated analytics data'
          },
          daily_metrics: {
            type: 'array',
            description: 'Daily breakdown of metrics'
          }
        }
      },
      {
        id: 'get_pin_analytics',
        name: 'Get Pin Analytics',
        description: 'Get analytics data for a specific pin',
        category: 'Analytics',
        icon: 'trending-up',
        verified: false,
        api: {
          endpoint: '/pins/{pin_id}/analytics',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            pinId: 'pin_id',
            startDate: 'start_date',
            endDate: 'end_date',
            metricTypes: 'metric_types'
          }
        },
        inputSchema: {
          pinId: {
            type: 'string',
            required: true,
            label: 'Pin ID',
            placeholder: '1234567890',
            description: 'The ID of the pin to get analytics for',
            aiControlled: false
          },
          startDate: {
            type: 'string',
            required: true,
            label: 'Start Date',
            inputType: 'text',
            placeholder: 'YYYY-MM-DD',
            description: 'Start date (format: YYYY-MM-DD)',
            aiControlled: false
          },
          endDate: {
            type: 'string',
            required: true,
            label: 'End Date',
            inputType: 'text',
            placeholder: 'YYYY-MM-DD',
            description: 'End date (format: YYYY-MM-DD)',
            aiControlled: false
          },
          metricTypes: {
            type: 'array',
            required: true,
            label: 'Metric Types',
            description: 'Metrics to retrieve (IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK)',
            items: { type: 'string' },
            aiControlled: false
          }
        },
        outputSchema: {
          all: {
            type: 'object',
            description: 'Aggregated metrics for the pin'
          },
          daily_metrics: {
            type: 'array',
            description: 'Daily metrics breakdown'
          }
        }
      },
      {
        id: 'get_top_pins',
        name: 'Get Top Pins',
        description: 'Get your top performing pins based on analytics',
        category: 'Analytics',
        icon: 'award',
        verified: false,
        api: {
          endpoint: '/user_account/analytics/top_pins',
          method: 'GET',
          baseUrl: 'https://api.pinterest.com/v5',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            startDate: 'start_date',
            endDate: 'end_date',
            sortBy: 'sort_by',
            numOfPins: 'num_of_pins'
          }
        },
        inputSchema: {
          startDate: {
            type: 'string',
            required: true,
            label: 'Start Date',
            inputType: 'text',
            placeholder: 'YYYY-MM-DD',
            description: 'Start date for analytics period',
            aiControlled: false
          },
          endDate: {
            type: 'string',
            required: true,
            label: 'End Date',
            inputType: 'text',
            placeholder: 'YYYY-MM-DD',
            description: 'End date for analytics period',
            aiControlled: false
          },
          sortBy: {
            type: 'select',
            required: true,
            label: 'Sort By Metric',
            options: [
              { label: 'Impressions', value: 'IMPRESSION' },
              { label: 'Saves', value: 'SAVE' },
              { label: 'Pin Clicks', value: 'PIN_CLICK' },
              { label: 'Outbound Clicks', value: 'OUTBOUND_CLICK' }
            ],
            description: 'Metric to sort pins by',
            aiControlled: false
          },
          numOfPins: {
            type: 'number',
            required: false,
            label: 'Number of Pins',
            default: 10,
            min: 1,
            max: 50,
            description: 'Number of top pins to return (1-50)',
            aiControlled: false
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_pin_created',
        name: 'New Pin Created',
        description: 'Triggers when a new pin is created on any of your boards',
        eventType: 'pin.created',
        verified: false,
        icon: 'plus-circle',
        pollingEnabled: true,
        outputSchema: {
          pinId: {
            type: 'string',
            description: 'ID of the newly created pin'
          },
          title: {
            type: 'string',
            description: 'Pin title'
          },
          description: {
            type: 'string',
            description: 'Pin description'
          },
          link: {
            type: 'string',
            description: 'Destination URL'
          },
          boardId: {
            type: 'string',
            description: 'Board ID where pin was created'
          },
          createdAt: {
            type: 'string',
            description: 'Creation timestamp'
          }
        }
      },
      {
        id: 'new_board_created',
        name: 'New Board Created',
        description: 'Triggers when a new board is created',
        eventType: 'board.created',
        verified: false,
        icon: 'folder-plus',
        pollingEnabled: true,
        outputSchema: {
          boardId: {
            type: 'string',
            description: 'ID of the newly created board'
          },
          name: {
            type: 'string',
            description: 'Board name'
          },
          description: {
            type: 'string',
            description: 'Board description'
          },
          createdAt: {
            type: 'string',
            description: 'Creation timestamp'
          }
        }
      }
    ]
  };
