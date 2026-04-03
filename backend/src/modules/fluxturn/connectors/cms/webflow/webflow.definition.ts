import { ConnectorDefinition } from '../../shared';

/**
 * Webflow Connector Definition
 *
 * Visual web design platform with CMS capabilities for creating
 * and managing website content.
 *
 * Resources:
 * - Items: Collection items (CMS content)
 * - Collections: Content types
 * - Sites: Webflow sites
 *
 * Authentication:
 * - OAuth2
 */
export const WEBFLOW_CONNECTOR: ConnectorDefinition = {
  name: 'webflow',
  display_name: 'Webflow',
  category: 'cms',
  description: 'Visual web design platform with CMS for creating and managing website content',

  auth_type: 'oauth2',

  oauth_config: {
    authorization_url: 'https://webflow.com/oauth/authorize',
    token_url: 'https://api.webflow.com/oauth/access_token',
    scopes: [
      'cms:read',
      'cms:write',
      'sites:read',
      'forms:read',
    ],
  },

  auth_fields: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Webflow access token',
      description: 'OAuth access token or API token from Webflow',
      helpUrl: 'https://developers.webflow.com/data/docs/getting-started-with-the-webflow-api',
      helpText: 'How to get an access token',
    },
  ],

  endpoints: {
    base_url: 'https://api.webflow.com/v2',
    sites: '/sites',
    collections: '/collections',
    items: '/collections/{collectionId}/items',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_minute: 60,
  },

  supported_actions: [
    // ==================== SITE OPERATIONS ====================
    {
      id: 'get_sites',
      name: 'Get Sites',
      description: 'Get all sites',
      category: 'Sites',
      icon: 'globe',
      api: {
        endpoint: '/sites',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {},
      outputSchema: {
        sites: {
          type: 'array',
          description: 'List of Webflow sites',
        },
      },
    },

    {
      id: 'get_site',
      name: 'Get Site',
      description: 'Get a site by ID',
      category: 'Sites',
      icon: 'globe',
      api: {
        endpoint: '/sites/{siteId}',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        displayName: { type: 'string' },
        shortName: { type: 'string' },
        previewUrl: { type: 'string' },
        timezone: { type: 'string' },
        createdOn: { type: 'string' },
        lastPublished: { type: 'string' },
      },
    },

    {
      id: 'publish_site',
      name: 'Publish Site',
      description: 'Publish a site to the specified domains',
      category: 'Sites',
      icon: 'upload',
      api: {
        endpoint: '/sites/{siteId}/publish',
        method: 'POST',
        baseUrl: 'https://api.webflow.com/v2',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
        domains: {
          type: 'array',
          label: 'Domains',
          description: 'Specific domains to publish to (optional)',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
      },
      outputSchema: {
        publishedOn: { type: 'string' },
      },
    },

    // ==================== COLLECTION OPERATIONS ====================
    {
      id: 'get_collections',
      name: 'Get Collections',
      description: 'Get all collections for a site',
      category: 'Collections',
      icon: 'folder',
      api: {
        endpoint: '/sites/{siteId}/collections',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        collections: { type: 'array' },
      },
    },

    {
      id: 'get_collection',
      name: 'Get Collection',
      description: 'Get a collection by ID',
      category: 'Collections',
      icon: 'folder',
      api: {
        endpoint: '/collections/{collectionId}',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        collectionId: {
          type: 'string',
          required: true,
          label: 'Collection ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        displayName: { type: 'string' },
        singularName: { type: 'string' },
        slug: { type: 'string' },
        fields: { type: 'array' },
      },
    },

    // ==================== ITEM OPERATIONS ====================
    {
      id: 'create_item',
      name: 'Create Item',
      description: 'Create a new collection item',
      category: 'Items',
      icon: 'plus',
      api: {
        endpoint: '/collections/{collectionId}/items',
        method: 'POST',
        baseUrl: 'https://api.webflow.com/v2',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        collectionId: {
          type: 'string',
          required: true,
          label: 'Collection ID',
          aiControlled: false,
        },
        isArchived: {
          type: 'boolean',
          label: 'Is Archived',
          default: false,
          aiControlled: false,
        },
        isDraft: {
          type: 'boolean',
          label: 'Is Draft',
          default: false,
          aiControlled: false,
        },
        fieldData: {
          type: 'object',
          required: true,
          label: 'Field Data',
          description: 'Item field values based on collection schema',
          aiControlled: true,
          aiDescription: 'Generate appropriate field data content for the CMS collection item',
        },
      },
      outputSchema: {
        id: { type: 'string' },
        cmsLocaleId: { type: 'string' },
        lastPublished: { type: 'string' },
        lastUpdated: { type: 'string' },
        createdOn: { type: 'string' },
        isArchived: { type: 'boolean' },
        isDraft: { type: 'boolean' },
        fieldData: { type: 'object' },
      },
    },

    {
      id: 'get_item',
      name: 'Get Item',
      description: 'Get a collection item by ID',
      category: 'Items',
      icon: 'file',
      api: {
        endpoint: '/collections/{collectionId}/items/{itemId}',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        collectionId: {
          type: 'string',
          required: true,
          label: 'Collection ID',
          aiControlled: false,
        },
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        cmsLocaleId: { type: 'string' },
        lastPublished: { type: 'string' },
        lastUpdated: { type: 'string' },
        createdOn: { type: 'string' },
        isArchived: { type: 'boolean' },
        isDraft: { type: 'boolean' },
        fieldData: { type: 'object' },
      },
    },

    {
      id: 'get_all_items',
      name: 'Get All Items',
      description: 'Get all items in a collection',
      category: 'Items',
      icon: 'list',
      api: {
        endpoint: '/collections/{collectionId}/items',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        collectionId: {
          type: 'string',
          required: true,
          label: 'Collection ID',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          max: 100,
          aiControlled: false,
        },
        offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          aiControlled: false,
        },
        cmsLocaleId: {
          type: 'string',
          label: 'CMS Locale ID',
          description: 'Filter by locale',
          aiControlled: false,
        },
      },
      outputSchema: {
        items: { type: 'array' },
        pagination: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
            offset: { type: 'number' },
            total: { type: 'number' },
          },
        },
      },
    },

    {
      id: 'update_item',
      name: 'Update Item',
      description: 'Update an existing collection item',
      category: 'Items',
      icon: 'edit',
      api: {
        endpoint: '/collections/{collectionId}/items/{itemId}',
        method: 'PATCH',
        baseUrl: 'https://api.webflow.com/v2',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        collectionId: {
          type: 'string',
          required: true,
          label: 'Collection ID',
          aiControlled: false,
        },
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          aiControlled: false,
        },
        isArchived: {
          type: 'boolean',
          label: 'Is Archived',
          aiControlled: false,
        },
        isDraft: {
          type: 'boolean',
          label: 'Is Draft',
          aiControlled: false,
        },
        fieldData: {
          type: 'object',
          label: 'Field Data',
          description: 'Fields to update',
          aiControlled: true,
          aiDescription: 'Generate updated field data content for the CMS collection item',
        },
      },
      outputSchema: {
        id: { type: 'string' },
        lastUpdated: { type: 'string' },
        fieldData: { type: 'object' },
      },
    },

    {
      id: 'delete_item',
      name: 'Delete Item',
      description: 'Delete a collection item',
      category: 'Items',
      icon: 'trash',
      api: {
        endpoint: '/collections/{collectionId}/items/{itemId}',
        method: 'DELETE',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        collectionId: {
          type: 'string',
          required: true,
          label: 'Collection ID',
          aiControlled: false,
        },
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'publish_item',
      name: 'Publish Item',
      description: 'Publish a collection item',
      category: 'Items',
      icon: 'upload',
      api: {
        endpoint: '/collections/{collectionId}/items/publish',
        method: 'POST',
        baseUrl: 'https://api.webflow.com/v2',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        collectionId: {
          type: 'string',
          required: true,
          label: 'Collection ID',
          aiControlled: false,
        },
        itemIds: {
          type: 'array',
          required: true,
          label: 'Item IDs',
          description: 'IDs of items to publish',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
      },
      outputSchema: {
        publishedItemIds: { type: 'array' },
      },
    },

    // ==================== FORM OPERATIONS ====================
    {
      id: 'get_forms',
      name: 'Get Forms',
      description: 'Get all forms for a site',
      category: 'Forms',
      icon: 'file-text',
      api: {
        endpoint: '/sites/{siteId}/forms',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        forms: { type: 'array' },
      },
    },

    {
      id: 'get_form_submissions',
      name: 'Get Form Submissions',
      description: 'Get submissions for a form',
      category: 'Forms',
      icon: 'list',
      api: {
        endpoint: '/forms/{formId}/submissions',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
        offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          aiControlled: false,
        },
      },
      outputSchema: {
        formSubmissions: { type: 'array' },
        pagination: { type: 'object' },
      },
    },

    // ==================== USER OPERATIONS ====================
    {
      id: 'get_authorized_user',
      name: 'Get Authorized User',
      description: 'Get information about the authenticated user',
      category: 'User',
      icon: 'user',
      api: {
        endpoint: '/token/authorized_by',
        method: 'GET',
        baseUrl: 'https://api.webflow.com/v2',
      },
      inputSchema: {},
      outputSchema: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'form_submission',
      name: 'Form Submission',
      description: 'Triggers when a form is submitted',
      eventType: 'form_submission',
      icon: 'file-text',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        name: { type: 'string', description: 'Form name' },
        submittedAt: { type: 'string' },
        data: { type: 'object', description: 'Form field values' },
      },
    },
    {
      id: 'collection_item_created',
      name: 'Collection Item Created',
      description: 'Triggers when a new collection item is created',
      eventType: 'collection_item_created',
      icon: 'plus',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        _id: { type: 'string' },
        collectionId: { type: 'string' },
        createdOn: { type: 'string' },
        fieldData: { type: 'object' },
      },
    },
    {
      id: 'collection_item_changed',
      name: 'Collection Item Updated',
      description: 'Triggers when a collection item is updated',
      eventType: 'collection_item_changed',
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        _id: { type: 'string' },
        collectionId: { type: 'string' },
        lastUpdated: { type: 'string' },
        fieldData: { type: 'object' },
      },
    },
    {
      id: 'collection_item_deleted',
      name: 'Collection Item Deleted',
      description: 'Triggers when a collection item is deleted',
      eventType: 'collection_item_deleted',
      icon: 'trash',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        _id: { type: 'string' },
        collectionId: { type: 'string' },
        deletedOn: { type: 'string' },
      },
    },
    {
      id: 'site_publish',
      name: 'Site Published',
      description: 'Triggers when a site is published',
      eventType: 'site_publish',
      icon: 'upload',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        siteId: { type: 'string' },
        publishedOn: { type: 'string' },
        domains: { type: 'array' },
      },
    },
    {
      id: 'ecomm_new_order',
      name: 'New E-Commerce Order',
      description: 'Triggers when a new e-commerce order is placed',
      eventType: 'ecomm_new_order',
      icon: 'shopping-cart',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        orderId: { type: 'string' },
        status: { type: 'string' },
        total: { type: 'number' },
        customerInfo: { type: 'object' },
        items: { type: 'array' },
      },
    },
    {
      id: 'ecomm_order_changed',
      name: 'E-Commerce Order Changed',
      description: 'Triggers when an e-commerce order is updated',
      eventType: 'ecomm_order_changed',
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        orderId: { type: 'string' },
        status: { type: 'string' },
        changedOn: { type: 'string' },
      },
    },
    {
      id: 'ecomm_inventory_changed',
      name: 'E-Commerce Inventory Changed',
      description: 'Triggers when inventory levels change',
      eventType: 'ecomm_inventory_changed',
      icon: 'package',
      webhookRequired: true,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        productId: { type: 'string' },
        inventoryType: { type: 'string' },
        quantity: { type: 'number' },
      },
    },
  ],
};
