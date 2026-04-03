import { ConnectorDefinition } from '../../shared';

/**
 * Contentful Connector Definition
 *
 * Headless CMS for content management and delivery.
 * Supports both Delivery API (published content) and Preview API (draft content).
 *
 * Resources:
 * - Entries: Content entries (primary resource)
 * - Assets: Media files (images, videos, documents)
 * - Content Types: Content models
 * - Locales: Available languages
 * - Spaces: Workspaces
 *
 * Authentication:
 * - API Token (Space ID + Access Tokens)
 */
export const CONTENTFUL_CONNECTOR: ConnectorDefinition = {
  name: 'contentful',
  display_name: 'Contentful',
  category: 'cms',
  description: 'Headless CMS for content management and delivery with API-first approach',

  auth_type: 'api_key',

  auth_fields: [
    {
      key: 'spaceId',
      label: 'Space ID',
      type: 'string',
      required: true,
      placeholder: 'abc123xyz',
      description: 'The ID for the Contentful space',
      helpUrl: 'https://www.contentful.com/help/find-space-id/',
    },
    {
      key: 'deliveryAccessToken',
      label: 'Content Delivery API Access Token',
      type: 'password',
      required: false,
      placeholder: 'xxx...',
      description: 'Access token for published content (Delivery API)',
    },
    {
      key: 'previewAccessToken',
      label: 'Content Preview API Access Token',
      type: 'password',
      required: false,
      placeholder: 'xxx...',
      description: 'Access token for draft content (Preview API)',
    },
    {
      key: 'managementAccessToken',
      label: 'Content Management API Token',
      type: 'password',
      required: false,
      placeholder: 'CFPAT-xxx...',
      description: 'Personal access token for creating/updating content',
      helpUrl: 'https://www.contentful.com/developers/docs/references/authentication/',
    },
  ],

  endpoints: {
    delivery_url: 'https://cdn.contentful.com',
    preview_url: 'https://preview.contentful.com',
    management_url: 'https://api.contentful.com',
    spaces: '/spaces/{spaceId}',
    environments: '/spaces/{spaceId}/environments',
    entries: '/spaces/{spaceId}/environments/{environmentId}/entries',
    assets: '/spaces/{spaceId}/environments/{environmentId}/assets',
    content_types: '/spaces/{spaceId}/environments/{environmentId}/content_types',
    locales: '/spaces/{spaceId}/environments/{environmentId}/locales',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 10,
  },

  supported_actions: [
    // ==================== SPACE OPERATIONS ====================
    {
      id: 'get_space',
      name: 'Get Space',
      description: 'Get the current space details',
      category: 'Spaces',
      icon: 'home',
      api: {
        endpoint: '/spaces/{spaceId}',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
        headers: {
          Authorization: 'Bearer {accessToken}',
        },
      },
      inputSchema: {},
      outputSchema: {
        sys: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            id: { type: 'string' },
          },
        },
        name: { type: 'string' },
        locales: { type: 'array' },
      },
    },

    // ==================== ENTRY OPERATIONS ====================
    {
      id: 'get_entry',
      name: 'Get Entry',
      description: 'Get a specific entry by ID',
      category: 'Entries',
      icon: 'file-text',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries/{entryId}',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        source: {
          type: 'select',
          label: 'Source',
          description: 'Choose between published or draft content',
          default: 'deliveryApi',
          options: [
            { label: 'Delivery API (Published)', value: 'deliveryApi' },
            { label: 'Preview API (Draft)', value: 'previewApi' },
          ],
          aiControlled: false,
        },
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          description: 'The environment to query',
          aiControlled: false,
        },
        entryId: {
          type: 'string',
          required: true,
          label: 'Entry ID',
          placeholder: 'abc123',
          aiControlled: false,
        },
        locale: {
          type: 'string',
          label: 'Locale',
          placeholder: 'en-US',
          description: 'Retrieve entry for a specific locale',
          aiControlled: false,
        },
        include: {
          type: 'number',
          label: 'Include Depth',
          default: 1,
          min: 0,
          max: 10,
          description: 'Levels of linked entries to include',
          aiControlled: false,
        },
        rawData: {
          type: 'boolean',
          label: 'Return Raw Data',
          default: true,
          description: 'Return full entry including sys metadata',
          aiControlled: false,
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },

    {
      id: 'get_entries',
      name: 'Get Entries',
      description: 'Get all entries with optional filtering',
      category: 'Entries',
      icon: 'list',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        source: {
          type: 'select',
          label: 'Source',
          default: 'deliveryApi',
          options: [
            { label: 'Delivery API (Published)', value: 'deliveryApi' },
            { label: 'Preview API (Draft)', value: 'previewApi' },
          ],
          aiControlled: false,
        },
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        content_type: {
          type: 'string',
          label: 'Content Type',
          description: 'Filter by content type ID',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          max: 1000,
          aiControlled: false,
        },
        skip: {
          type: 'number',
          label: 'Skip',
          default: 0,
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order',
          placeholder: 'sys.createdAt',
          description: 'Order results (prefix with - for descending)',
          aiControlled: false,
        },
        query: {
          type: 'string',
          label: 'Search Query',
          description: 'Full-text search query',
          aiControlled: false,
        },
        select: {
          type: 'string',
          label: 'Select Fields',
          placeholder: 'fields.title,fields.slug',
          description: 'Comma-separated list of fields to return',
          aiControlled: false,
        },
        locale: {
          type: 'string',
          label: 'Locale',
          placeholder: 'en-US',
          aiControlled: false,
        },
        include: {
          type: 'number',
          label: 'Include Depth',
          default: 1,
          max: 10,
          aiControlled: false,
        },
        rawData: {
          type: 'boolean',
          label: 'Return Raw Data',
          default: true,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: { type: 'array' },
        total: { type: 'number' },
        skip: { type: 'number' },
        limit: { type: 'number' },
      },
    },

    {
      id: 'create_entry',
      name: 'Create Entry',
      description: 'Create a new entry (requires Management API)',
      category: 'Entries',
      icon: 'plus',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries',
        method: 'POST',
        baseUrl: 'https://api.contentful.com',
        headers: {
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Content-Type': '{contentTypeId}',
        },
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        contentTypeId: {
          type: 'string',
          required: true,
          label: 'Content Type ID',
          description: 'The content type for this entry',
          aiControlled: false,
        },
        fields: {
          type: 'object',
          required: true,
          label: 'Fields',
          description: 'Entry fields in format { "fieldName": { "locale": "value" } }',
          aiControlled: true,
          aiDescription: 'The content fields for the entry',
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },

    {
      id: 'update_entry',
      name: 'Update Entry',
      description: 'Update an existing entry',
      category: 'Entries',
      icon: 'edit',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries/{entryId}',
        method: 'PUT',
        baseUrl: 'https://api.contentful.com',
        headers: {
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Version': '{version}',
        },
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        entryId: {
          type: 'string',
          required: true,
          label: 'Entry ID',
          aiControlled: false,
        },
        version: {
          type: 'number',
          required: true,
          label: 'Version',
          description: 'Current version of the entry (for optimistic locking)',
          aiControlled: false,
        },
        fields: {
          type: 'object',
          required: true,
          label: 'Fields',
          aiControlled: true,
          aiDescription: 'The updated content fields for the entry',
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },

    {
      id: 'delete_entry',
      name: 'Delete Entry',
      description: 'Delete an entry',
      category: 'Entries',
      icon: 'trash',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries/{entryId}',
        method: 'DELETE',
        baseUrl: 'https://api.contentful.com',
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        entryId: {
          type: 'string',
          required: true,
          label: 'Entry ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'publish_entry',
      name: 'Publish Entry',
      description: 'Publish an entry',
      category: 'Entries',
      icon: 'check-circle',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries/{entryId}/published',
        method: 'PUT',
        baseUrl: 'https://api.contentful.com',
        headers: {
          'X-Contentful-Version': '{version}',
        },
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        entryId: {
          type: 'string',
          required: true,
          label: 'Entry ID',
          aiControlled: false,
        },
        version: {
          type: 'number',
          required: true,
          label: 'Version',
          aiControlled: false,
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },

    {
      id: 'unpublish_entry',
      name: 'Unpublish Entry',
      description: 'Unpublish an entry',
      category: 'Entries',
      icon: 'x-circle',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries/{entryId}/published',
        method: 'DELETE',
        baseUrl: 'https://api.contentful.com',
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        entryId: {
          type: 'string',
          required: true,
          label: 'Entry ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        sys: { type: 'object' },
      },
    },

    // ==================== ASSET OPERATIONS ====================
    {
      id: 'get_asset',
      name: 'Get Asset',
      description: 'Get a specific asset by ID',
      category: 'Assets',
      icon: 'image',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/assets/{assetId}',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        source: {
          type: 'select',
          label: 'Source',
          default: 'deliveryApi',
          options: [
            { label: 'Delivery API (Published)', value: 'deliveryApi' },
            { label: 'Preview API (Draft)', value: 'previewApi' },
          ],
          aiControlled: false,
        },
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        assetId: {
          type: 'string',
          required: true,
          label: 'Asset ID',
          aiControlled: false,
        },
        locale: {
          type: 'string',
          label: 'Locale',
          aiControlled: false,
        },
        rawData: {
          type: 'boolean',
          label: 'Return Raw Data',
          default: true,
          aiControlled: false,
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        fields: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            file: { type: 'object' },
          },
        },
      },
    },

    {
      id: 'get_assets',
      name: 'Get Assets',
      description: 'Get all assets with optional filtering',
      category: 'Assets',
      icon: 'images',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/assets',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        source: {
          type: 'select',
          label: 'Source',
          default: 'deliveryApi',
          options: [
            { label: 'Delivery API (Published)', value: 'deliveryApi' },
            { label: 'Preview API (Draft)', value: 'previewApi' },
          ],
          aiControlled: false,
        },
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          max: 1000,
          aiControlled: false,
        },
        skip: {
          type: 'number',
          label: 'Skip',
          default: 0,
          aiControlled: false,
        },
        mimetype_group: {
          type: 'select',
          label: 'MIME Type Group',
          options: [
            { label: 'All', value: '' },
            { label: 'Images', value: 'image' },
            { label: 'Videos', value: 'video' },
            { label: 'Audio', value: 'audio' },
            { label: 'Documents', value: 'document' },
          ],
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order',
          placeholder: 'sys.createdAt',
          aiControlled: false,
        },
        query: {
          type: 'string',
          label: 'Search Query',
          aiControlled: false,
        },
        rawData: {
          type: 'boolean',
          label: 'Return Raw Data',
          default: true,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: { type: 'array' },
        total: { type: 'number' },
        skip: { type: 'number' },
        limit: { type: 'number' },
      },
    },

    {
      id: 'create_asset',
      name: 'Create Asset',
      description: 'Create a new asset',
      category: 'Assets',
      icon: 'upload',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/assets',
        method: 'POST',
        baseUrl: 'https://api.contentful.com',
        headers: {
          'Content-Type': 'application/vnd.contentful.management.v1+json',
        },
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        title: {
          type: 'string',
          required: true,
          label: 'Title',
          aiControlled: true,
          aiDescription: 'The title of the asset',
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'The description of the asset',
        },
        fileName: {
          type: 'string',
          required: true,
          label: 'File Name',
          aiControlled: false,
        },
        contentType: {
          type: 'string',
          required: true,
          label: 'Content Type',
          placeholder: 'image/jpeg',
          aiControlled: false,
        },
        uploadUrl: {
          type: 'string',
          required: true,
          label: 'Upload URL',
          inputType: 'url',
          description: 'URL of the file to upload',
          aiControlled: false,
        },
        locale: {
          type: 'string',
          label: 'Locale',
          default: 'en-US',
          aiControlled: false,
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },

    {
      id: 'process_asset',
      name: 'Process Asset',
      description: 'Process an asset for a specific locale',
      category: 'Assets',
      icon: 'refresh-cw',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/assets/{assetId}/files/{locale}/process',
        method: 'PUT',
        baseUrl: 'https://api.contentful.com',
        headers: {
          'X-Contentful-Version': '{version}',
        },
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        assetId: {
          type: 'string',
          required: true,
          label: 'Asset ID',
          aiControlled: false,
        },
        locale: {
          type: 'string',
          required: true,
          label: 'Locale',
          default: 'en-US',
          aiControlled: false,
        },
        version: {
          type: 'number',
          required: true,
          label: 'Version',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'publish_asset',
      name: 'Publish Asset',
      description: 'Publish an asset',
      category: 'Assets',
      icon: 'check-circle',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/assets/{assetId}/published',
        method: 'PUT',
        baseUrl: 'https://api.contentful.com',
        headers: {
          'X-Contentful-Version': '{version}',
        },
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        assetId: {
          type: 'string',
          required: true,
          label: 'Asset ID',
          aiControlled: false,
        },
        version: {
          type: 'number',
          required: true,
          label: 'Version',
          aiControlled: false,
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },

    {
      id: 'delete_asset',
      name: 'Delete Asset',
      description: 'Delete an asset',
      category: 'Assets',
      icon: 'trash',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/assets/{assetId}',
        method: 'DELETE',
        baseUrl: 'https://api.contentful.com',
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        assetId: {
          type: 'string',
          required: true,
          label: 'Asset ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== CONTENT TYPE OPERATIONS ====================
    {
      id: 'get_content_type',
      name: 'Get Content Type',
      description: 'Get a specific content type',
      category: 'Content Types',
      icon: 'layers',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/content_types/{contentTypeId}',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        contentTypeId: {
          type: 'string',
          required: true,
          label: 'Content Type ID',
          aiControlled: false,
        },
        rawData: {
          type: 'boolean',
          label: 'Return Raw Data',
          default: true,
          description: 'Return full content type including sys metadata',
          aiControlled: false,
        },
      },
      outputSchema: {
        sys: { type: 'object' },
        name: { type: 'string' },
        description: { type: 'string' },
        displayField: { type: 'string' },
        fields: { type: 'array' },
      },
    },

    {
      id: 'get_content_types',
      name: 'Get Content Types',
      description: 'Get all content types',
      category: 'Content Types',
      icon: 'layers',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/content_types',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: { type: 'array' },
        total: { type: 'number' },
      },
    },

    // ==================== LOCALE OPERATIONS ====================
    {
      id: 'get_locales',
      name: 'Get Locales',
      description: 'Get all locales for the space',
      category: 'Locales',
      icon: 'globe',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/locales',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'List of locales',
        },
        total: { type: 'number' },
      },
    },

    // ==================== ENVIRONMENT OPERATIONS ====================
    {
      id: 'get_environments',
      name: 'Get Environments',
      description: 'Get all environments in the space',
      category: 'Environments',
      icon: 'git-branch',
      api: {
        endpoint: '/spaces/{spaceId}/environments',
        method: 'GET',
        baseUrl: 'https://api.contentful.com',
      },
      inputSchema: {},
      outputSchema: {
        items: { type: 'array' },
        total: { type: 'number' },
      },
    },

    // ==================== SEARCH OPERATIONS ====================
    {
      id: 'search_entries',
      name: 'Search Entries',
      description: 'Search entries with advanced filters',
      category: 'Search',
      icon: 'search',
      api: {
        endpoint: '/spaces/{spaceId}/environments/{environmentId}/entries',
        method: 'GET',
        baseUrl: 'https://cdn.contentful.com',
      },
      inputSchema: {
        source: {
          type: 'select',
          label: 'Source',
          default: 'deliveryApi',
          options: [
            { label: 'Delivery API (Published)', value: 'deliveryApi' },
            { label: 'Preview API (Draft)', value: 'previewApi' },
          ],
          aiControlled: false,
        },
        environmentId: {
          type: 'string',
          required: true,
          label: 'Environment ID',
          default: 'master',
          aiControlled: false,
        },
        query: {
          type: 'string',
          label: 'Full-Text Search',
          description: 'Search across all text fields',
          aiControlled: false,
        },
        content_type: {
          type: 'string',
          label: 'Content Type',
          aiControlled: false,
        },
        fieldFilters: {
          type: 'string',
          label: 'Field Filters',
          description: 'Field filters in format: field=value&field2[ne]=value2',
          inputType: 'textarea',
          aiControlled: false,
        },
        links_to_entry: {
          type: 'string',
          label: 'Links to Entry',
          description: 'Find entries linking to a specific entry ID',
          aiControlled: false,
        },
        links_to_asset: {
          type: 'string',
          label: 'Links to Asset',
          description: 'Find entries linking to a specific asset ID',
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order By',
          placeholder: '-sys.createdAt',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          max: 1000,
          aiControlled: false,
        },
        skip: {
          type: 'number',
          label: 'Skip',
          default: 0,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: { type: 'array' },
        total: { type: 'number' },
        includes: { type: 'object' },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'entry_created',
      name: 'Entry Created',
      description: 'Triggers when a new entry is created',
      eventType: 'ContentManagement.Entry.create',
      icon: 'file-plus',
      webhookRequired: true,
      outputSchema: {
        sys: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            id: { type: 'string' },
            space: { type: 'object' },
            environment: { type: 'object' },
            contentType: { type: 'object' },
            createdAt: { type: 'string' },
          },
        },
        fields: { type: 'object' },
      },
    },
    {
      id: 'entry_updated',
      name: 'Entry Updated',
      description: 'Triggers when an entry is updated',
      eventType: 'ContentManagement.Entry.save',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },
    {
      id: 'entry_published',
      name: 'Entry Published',
      description: 'Triggers when an entry is published',
      eventType: 'ContentManagement.Entry.publish',
      icon: 'check-circle',
      webhookRequired: true,
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },
    {
      id: 'entry_unpublished',
      name: 'Entry Unpublished',
      description: 'Triggers when an entry is unpublished',
      eventType: 'ContentManagement.Entry.unpublish',
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },
    {
      id: 'entry_deleted',
      name: 'Entry Deleted',
      description: 'Triggers when an entry is deleted',
      eventType: 'ContentManagement.Entry.delete',
      icon: 'trash',
      webhookRequired: true,
      outputSchema: {
        sys: { type: 'object' },
      },
    },
    {
      id: 'asset_created',
      name: 'Asset Created',
      description: 'Triggers when a new asset is created',
      eventType: 'ContentManagement.Asset.create',
      icon: 'image',
      webhookRequired: true,
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },
    {
      id: 'asset_published',
      name: 'Asset Published',
      description: 'Triggers when an asset is published',
      eventType: 'ContentManagement.Asset.publish',
      icon: 'check-circle',
      webhookRequired: true,
      outputSchema: {
        sys: { type: 'object' },
        fields: { type: 'object' },
      },
    },
    {
      id: 'asset_deleted',
      name: 'Asset Deleted',
      description: 'Triggers when an asset is deleted',
      eventType: 'ContentManagement.Asset.delete',
      icon: 'trash',
      webhookRequired: true,
      outputSchema: {
        sys: { type: 'object' },
      },
    },
  ],
};
