import { ConnectorDefinition } from '../../shared';

/**
 * ActiveCampaign Connector Definition
 *
 * Marketing automation and CRM platform with email marketing,
 * sales automation, and customer relationship management.
 *
 * Resources:
 * - Contacts: Contact management
 * - Deals: Sales pipeline management
 * - Lists: Email list management
 * - Tags: Contact tagging
 * - Accounts: B2B account management
 *
 * Authentication:
 * - API Key
 */
export const ACTIVECAMPAIGN_CONNECTOR: ConnectorDefinition = {
  name: 'activecampaign',
  display_name: 'ActiveCampaign',
  category: 'marketing',
  description: 'Marketing automation platform with email marketing, sales automation, and CRM',

  auth_type: 'api_key',

  auth_fields: [
    {
      key: 'apiUrl',
      label: 'API URL',
      type: 'string',
      required: true,
      placeholder: 'https://youraccountname.api-us1.com',
      description: 'Your ActiveCampaign API URL',
      helpUrl: 'https://help.activecampaign.com/hc/en-us/articles/207317590-Getting-started-with-the-API',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your API key',
      description: 'Find in Settings > Developer',
    },
  ],

  endpoints: {
    base_url: '{apiUrl}/api/3',
    contacts: '/contacts',
    deals: '/deals',
    lists: '/lists',
    tags: '/tags',
    accounts: '/accounts',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 5,
  },

  supported_actions: [
    // ==================== CONTACT OPERATIONS ====================
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Create a new contact',
      category: 'Contacts',
      icon: 'user-plus',
      api: {
        endpoint: '/contacts',
        method: 'POST',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          inputType: 'email',
          placeholder: 'contact@example.com',
          aiControlled: true,
          aiDescription: 'The contact email address.',
        },
        firstName: {
          type: 'string',
          label: 'First Name',
          aiControlled: true,
          aiDescription: 'The contact first name.',
        },
        lastName: {
          type: 'string',
          label: 'Last Name',
          aiControlled: true,
          aiDescription: 'The contact last name.',
        },
        phone: {
          type: 'string',
          label: 'Phone',
          aiControlled: false,
        },
        fieldValues: {
          type: 'array',
          label: 'Custom Fields',
          description: 'Custom field values',
          aiControlled: false,
          itemSchema: {
            field: {
              type: 'string',
              label: 'Field ID',
            },
            value: {
              type: 'string',
              label: 'Value',
            },
          },
        },
      },
      outputSchema: {
        contact: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
      },
    },

    {
      id: 'get_contact',
      name: 'Get Contact',
      description: 'Get a contact by ID',
      category: 'Contacts',
      icon: 'user',
      api: {
        endpoint: '/contacts/{contactId}',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        contact: { type: 'object' },
      },
    },

    {
      id: 'get_all_contacts',
      name: 'Get All Contacts',
      description: 'Get all contacts with optional filtering',
      category: 'Contacts',
      icon: 'users',
      api: {
        endpoint: '/contacts',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        email: {
          type: 'string',
          label: 'Email',
          description: 'Filter by email address',
          aiControlled: false,
        },
        listid: {
          type: 'string',
          label: 'List ID',
          description: 'Filter by list membership',
          aiControlled: false,
        },
        tagid: {
          type: 'string',
          label: 'Tag ID',
          description: 'Filter by tag',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 20,
          max: 100,
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
        contacts: { type: 'array' },
      },
    },

    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Update an existing contact',
      category: 'Contacts',
      icon: 'edit',
      api: {
        endpoint: '/contacts/{contactId}',
        method: 'PUT',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
        email: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          aiControlled: true,
          aiDescription: 'Updated contact email address.',
        },
        firstName: {
          type: 'string',
          label: 'First Name',
          aiControlled: true,
          aiDescription: 'Updated contact first name.',
        },
        lastName: {
          type: 'string',
          label: 'Last Name',
          aiControlled: true,
          aiDescription: 'Updated contact last name.',
        },
        phone: {
          type: 'string',
          label: 'Phone',
          aiControlled: false,
        },
      },
      outputSchema: {
        contact: { type: 'object' },
      },
    },

    {
      id: 'delete_contact',
      name: 'Delete Contact',
      description: 'Delete a contact',
      category: 'Contacts',
      icon: 'trash',
      api: {
        endpoint: '/contacts/{contactId}',
        method: 'DELETE',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== CONTACT LIST OPERATIONS ====================
    {
      id: 'add_contact_to_list',
      name: 'Add Contact to List',
      description: 'Add a contact to a list',
      category: 'Contact Lists',
      icon: 'list',
      api: {
        endpoint: '/contactLists',
        method: 'POST',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        contact: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
        list: {
          type: 'string',
          required: true,
          label: 'List ID',
          aiControlled: false,
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Active (Subscribe)', value: '1' },
            { label: 'Unsubscribed', value: '2' },
          ],
          default: '1',
          aiControlled: false,
        },
      },
      outputSchema: {
        contactList: { type: 'object' },
      },
    },

    {
      id: 'remove_contact_from_list',
      name: 'Remove Contact from List',
      description: 'Remove a contact from a list',
      category: 'Contact Lists',
      icon: 'x',
      api: {
        endpoint: '/contactLists/{contactListId}',
        method: 'DELETE',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        contactListId: {
          type: 'string',
          required: true,
          label: 'Contact List ID',
          description: 'The contactList association ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== TAG OPERATIONS ====================
    {
      id: 'add_tag_to_contact',
      name: 'Add Tag to Contact',
      description: 'Add a tag to a contact',
      category: 'Tags',
      icon: 'tag',
      api: {
        endpoint: '/contactTags',
        method: 'POST',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        contact: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
        tag: {
          type: 'string',
          required: true,
          label: 'Tag ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        contactTag: { type: 'object' },
      },
    },

    {
      id: 'remove_tag_from_contact',
      name: 'Remove Tag from Contact',
      description: 'Remove a tag from a contact',
      category: 'Tags',
      icon: 'x',
      api: {
        endpoint: '/contactTags/{contactTagId}',
        method: 'DELETE',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        contactTagId: {
          type: 'string',
          required: true,
          label: 'Contact Tag ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'create_tag',
      name: 'Create Tag',
      description: 'Create a new tag',
      category: 'Tags',
      icon: 'tag',
      api: {
        endpoint: '/tags',
        method: 'POST',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        tag: {
          type: 'string',
          required: true,
          label: 'Tag Name',
          aiControlled: true,
          aiDescription: 'The name of the tag to create.',
        },
        tagType: {
          type: 'select',
          label: 'Tag Type',
          options: [
            { label: 'Contact', value: 'contact' },
            { label: 'Template', value: 'template' },
          ],
          default: 'contact',
          aiControlled: false,
        },
        description: {
          type: 'string',
          label: 'Description',
          aiControlled: true,
          aiDescription: 'A description of the tag purpose.',
        },
      },
      outputSchema: {
        tag: { type: 'object' },
      },
    },

    {
      id: 'get_all_tags',
      name: 'Get All Tags',
      description: 'Get all tags',
      category: 'Tags',
      icon: 'tag',
      api: {
        endpoint: '/tags',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 20,
          aiControlled: false,
        },
      },
      outputSchema: {
        tags: { type: 'array' },
      },
    },

    // ==================== DEAL OPERATIONS ====================
    {
      id: 'create_deal',
      name: 'Create Deal',
      description: 'Create a new deal',
      category: 'Deals',
      icon: 'dollar-sign',
      api: {
        endpoint: '/deals',
        method: 'POST',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        title: {
          type: 'string',
          required: true,
          label: 'Deal Title',
          aiControlled: true,
          aiDescription: 'The title/name of the deal.',
        },
        value: {
          type: 'number',
          label: 'Value',
          description: 'Deal value in cents',
          aiControlled: false,
        },
        currency: {
          type: 'string',
          label: 'Currency',
          default: 'usd',
          placeholder: 'usd',
          aiControlled: false,
        },
        contact: {
          type: 'string',
          label: 'Primary Contact ID',
          aiControlled: false,
        },
        account: {
          type: 'string',
          label: 'Account ID',
          aiControlled: false,
        },
        group: {
          type: 'string',
          required: true,
          label: 'Pipeline ID',
          aiControlled: false,
        },
        stage: {
          type: 'string',
          required: true,
          label: 'Stage ID',
          aiControlled: false,
        },
        owner: {
          type: 'string',
          label: 'Owner ID',
          aiControlled: false,
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'A description of the deal details.',
        },
      },
      outputSchema: {
        deal: { type: 'object' },
      },
    },

    {
      id: 'get_deal',
      name: 'Get Deal',
      description: 'Get a deal by ID',
      category: 'Deals',
      icon: 'dollar-sign',
      api: {
        endpoint: '/deals/{dealId}',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        deal: { type: 'object' },
      },
    },

    {
      id: 'get_all_deals',
      name: 'Get All Deals',
      description: 'Get all deals',
      category: 'Deals',
      icon: 'dollar-sign',
      api: {
        endpoint: '/deals',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 20,
          aiControlled: false,
        },
        stage: {
          type: 'string',
          label: 'Stage ID',
          aiControlled: false,
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Open', value: '0' },
            { label: 'Won', value: '1' },
            { label: 'Lost', value: '2' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        deals: { type: 'array' },
      },
    },

    {
      id: 'update_deal',
      name: 'Update Deal',
      description: 'Update an existing deal',
      category: 'Deals',
      icon: 'edit',
      api: {
        endpoint: '/deals/{dealId}',
        method: 'PUT',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false,
        },
        title: {
          type: 'string',
          label: 'Title',
          aiControlled: true,
          aiDescription: 'Updated deal title.',
        },
        value: {
          type: 'number',
          label: 'Value',
          aiControlled: false,
        },
        stage: {
          type: 'string',
          label: 'Stage ID',
          aiControlled: false,
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Open', value: '0' },
            { label: 'Won', value: '1' },
            { label: 'Lost', value: '2' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        deal: { type: 'object' },
      },
    },

    {
      id: 'delete_deal',
      name: 'Delete Deal',
      description: 'Delete a deal',
      category: 'Deals',
      icon: 'trash',
      api: {
        endpoint: '/deals/{dealId}',
        method: 'DELETE',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== ACCOUNT OPERATIONS ====================
    {
      id: 'create_account',
      name: 'Create Account',
      description: 'Create a new account (company)',
      category: 'Accounts',
      icon: 'building',
      api: {
        endpoint: '/accounts',
        method: 'POST',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Account Name',
          aiControlled: true,
          aiDescription: 'The name of the account/company.',
        },
        accountUrl: {
          type: 'string',
          label: 'Website URL',
          inputType: 'url',
          aiControlled: false,
        },
      },
      outputSchema: {
        account: { type: 'object' },
      },
    },

    {
      id: 'get_account',
      name: 'Get Account',
      description: 'Get an account by ID',
      category: 'Accounts',
      icon: 'building',
      api: {
        endpoint: '/accounts/{accountId}',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        account: { type: 'object' },
      },
    },

    {
      id: 'get_all_accounts',
      name: 'Get All Accounts',
      description: 'Get all accounts',
      category: 'Accounts',
      icon: 'building',
      api: {
        endpoint: '/accounts',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 20,
          aiControlled: false,
        },
      },
      outputSchema: {
        accounts: { type: 'array' },
      },
    },

    {
      id: 'update_account',
      name: 'Update Account',
      description: 'Update an existing account',
      category: 'Accounts',
      icon: 'edit',
      api: {
        endpoint: '/accounts/{accountId}',
        method: 'PUT',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          label: 'Account Name',
          aiControlled: true,
          aiDescription: 'Updated account/company name.',
        },
        accountUrl: {
          type: 'string',
          label: 'Website URL',
          aiControlled: false,
        },
      },
      outputSchema: {
        account: { type: 'object' },
      },
    },

    {
      id: 'delete_account',
      name: 'Delete Account',
      description: 'Delete an account',
      category: 'Accounts',
      icon: 'trash',
      api: {
        endpoint: '/accounts/{accountId}',
        method: 'DELETE',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== LIST OPERATIONS ====================
    {
      id: 'create_list',
      name: 'Create List',
      description: 'Create a new email list',
      category: 'Lists',
      icon: 'list',
      api: {
        endpoint: '/lists',
        method: 'POST',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'List Name',
          aiControlled: true,
          aiDescription: 'The name of the email list.',
        },
        stringid: {
          type: 'string',
          required: true,
          label: 'String ID',
          description: 'Unique string identifier for the list',
          aiControlled: false,
        },
        sender_url: {
          type: 'string',
          required: true,
          label: 'Sender URL',
          inputType: 'url',
          aiControlled: false,
        },
        sender_reminder: {
          type: 'string',
          required: true,
          label: 'Sender Reminder',
          inputType: 'textarea',
          description: 'Reminder text shown to recipients',
          aiControlled: true,
          aiDescription: 'Reminder text shown to recipients about why they are receiving emails.',
        },
      },
      outputSchema: {
        list: { type: 'object' },
      },
    },

    {
      id: 'get_all_lists',
      name: 'Get All Lists',
      description: 'Get all email lists',
      category: 'Lists',
      icon: 'list',
      api: {
        endpoint: '/lists',
        method: 'GET',
        baseUrl: '{apiUrl}/api/3',
        headers: {
          'Api-Token': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 20,
          aiControlled: false,
        },
      },
      outputSchema: {
        lists: { type: 'array' },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'contact_added',
      name: 'Contact Added',
      description: 'Triggers when a new contact is added',
      eventType: 'contact_add',
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        type: { type: 'string' },
        date_time: { type: 'string' },
        contact: { type: 'object' },
      },
    },
    {
      id: 'contact_updated',
      name: 'Contact Updated',
      description: 'Triggers when a contact is updated',
      eventType: 'contact_update',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        type: { type: 'string' },
        date_time: { type: 'string' },
        contact: { type: 'object' },
      },
    },
    {
      id: 'contact_tag_added',
      name: 'Contact Tag Added',
      description: 'Triggers when a tag is added to a contact',
      eventType: 'contact_tag_added',
      icon: 'tag',
      webhookRequired: true,
      outputSchema: {
        type: { type: 'string' },
        date_time: { type: 'string' },
        contact: { type: 'object' },
        tag: { type: 'string' },
      },
    },
    {
      id: 'deal_add',
      name: 'Deal Created',
      description: 'Triggers when a deal is created',
      eventType: 'deal_add',
      icon: 'dollar-sign',
      webhookRequired: true,
      outputSchema: {
        type: { type: 'string' },
        date_time: { type: 'string' },
        deal: { type: 'object' },
      },
    },
    {
      id: 'deal_update',
      name: 'Deal Updated',
      description: 'Triggers when a deal is updated',
      eventType: 'deal_update',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        type: { type: 'string' },
        date_time: { type: 'string' },
        deal: { type: 'object' },
      },
    },
    {
      id: 'subscribe',
      name: 'Contact Subscribed',
      description: 'Triggers when a contact subscribes to a list',
      eventType: 'subscribe',
      icon: 'mail',
      webhookRequired: true,
      outputSchema: {
        type: { type: 'string' },
        date_time: { type: 'string' },
        contact: { type: 'object' },
        list: { type: 'string' },
      },
    },
    {
      id: 'unsubscribe',
      name: 'Contact Unsubscribed',
      description: 'Triggers when a contact unsubscribes from a list',
      eventType: 'unsubscribe',
      icon: 'mail',
      webhookRequired: true,
      outputSchema: {
        type: { type: 'string' },
        date_time: { type: 'string' },
        contact: { type: 'object' },
        list: { type: 'string' },
      },
    },
  ],
};
