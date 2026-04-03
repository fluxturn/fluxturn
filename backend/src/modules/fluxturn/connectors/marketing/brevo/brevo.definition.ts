import { ConnectorDefinition } from '../../shared';

/**
 * Brevo (formerly Sendinblue) Connector Definition
 *
 * Email marketing and automation platform with transactional
 * and marketing email capabilities.
 *
 * Resources:
 * - Contacts: Contact management
 * - Emails: Transactional email sending
 * - Senders: Sender management
 * - Attributes: Contact attribute management
 *
 * Authentication:
 * - API Key
 */
export const BREVO_CONNECTOR: ConnectorDefinition = {
  name: 'brevo',
  display_name: 'Brevo',
  category: 'marketing',
  description: 'Email marketing platform for transactional and marketing emails (formerly Sendinblue)',

  auth_type: 'api_key',

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xkeysib-...',
      description: 'Get from SMTP & API > API Keys',
      helpUrl: 'https://app.brevo.com/settings/keys/api',
    },
  ],

  endpoints: {
    base_url: 'https://api.brevo.com/v3',
    contacts: '/contacts',
    email: '/smtp/email',
    senders: '/senders',
    attributes: '/contacts/attributes',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 10,
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
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          inputType: 'email',
          placeholder: 'contact@example.com',
          aiControlled: true, // AI can specify email
          aiDescription: 'The email address of the contact to create',
        },
        attributes: {
          type: 'object',
          label: 'Attributes',
          description: 'Contact attributes (FIRSTNAME, LASTNAME, etc.)',
          aiControlled: true, // AI can fill attributes
          aiDescription: 'Contact attributes object. Example: {"FIRSTNAME": "John", "LASTNAME": "Doe", "COMPANY": "Acme Inc"}',
        },
        listIds: {
          type: 'array',
          label: 'List IDs',
          description: 'Lists to add contact to',
          aiControlled: false, // Pre-configured by workflow
          itemSchema: {
            type: 'number',
          },
        },
        emailBlacklisted: {
          type: 'boolean',
          label: 'Email Blacklisted',
          default: false,
          aiControlled: false, // Pre-configured
        },
        smsBlacklisted: {
          type: 'boolean',
          label: 'SMS Blacklisted',
          default: false,
          aiControlled: false, // Pre-configured
        },
        updateEnabled: {
          type: 'boolean',
          label: 'Update if Exists',
          default: false,
          description: 'Update contact if email already exists',
          aiControlled: false, // Pre-configured
        },
      },
      outputSchema: {
        id: { type: 'number', description: 'Contact ID' },
      },
    },

    {
      id: 'get_contact',
      name: 'Get Contact',
      description: 'Get contact details by email or ID',
      category: 'Contacts',
      icon: 'user',
      api: {
        endpoint: '/contacts/{identifier}',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        identifier: {
          type: 'string',
          required: true,
          label: 'Email or ID',
          description: 'Contact email or ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        email: { type: 'string' },
        id: { type: 'number' },
        attributes: { type: 'object' },
        listIds: { type: 'array' },
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
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 50,
          max: 1000,
          aiControlled: false,
        },
        offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          aiControlled: false,
        },
        modifiedSince: {
          type: 'string',
          label: 'Modified Since',
          placeholder: '2025-01-01T00:00:00Z',
          description: 'Filter contacts modified after this date',
          aiControlled: false,
        },
      },
      outputSchema: {
        contacts: { type: 'array' },
        count: { type: 'number' },
      },
    },

    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Update an existing contact',
      category: 'Contacts',
      icon: 'edit',
      api: {
        endpoint: '/contacts/{identifier}',
        method: 'PUT',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        identifier: {
          type: 'string',
          required: true,
          label: 'Email or ID',
          aiControlled: false,
        },
        attributes: {
          type: 'object',
          label: 'Attributes',
          aiControlled: true,
          aiDescription: 'Contact attributes object with updated values.',
        },
        listIds: {
          type: 'array',
          label: 'List IDs',
          description: 'Replace list memberships',
          aiControlled: false,
        },
        unlinkListIds: {
          type: 'array',
          label: 'Unlink List IDs',
          description: 'Remove from these lists',
          aiControlled: false,
        },
        emailBlacklisted: {
          type: 'boolean',
          label: 'Email Blacklisted',
          aiControlled: false,
        },
        smsBlacklisted: {
          type: 'boolean',
          label: 'SMS Blacklisted',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'delete_contact',
      name: 'Delete Contact',
      description: 'Delete a contact',
      category: 'Contacts',
      icon: 'trash',
      api: {
        endpoint: '/contacts/{identifier}',
        method: 'DELETE',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        identifier: {
          type: 'string',
          required: true,
          label: 'Email or ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== EMAIL OPERATIONS ====================
    {
      id: 'send_transactional_email',
      name: 'Send Transactional Email',
      description: 'Send a transactional email',
      category: 'Emails',
      icon: 'send',
      api: {
        endpoint: '/smtp/email',
        method: 'POST',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        sender: {
          type: 'object',
          required: true,
          label: 'Sender',
          description: 'Sender email and name',
          aiControlled: false, // Pre-configured by workflow
        },
        to: {
          type: 'array',
          required: true,
          label: 'To',
          description: 'Recipients',
          aiControlled: true, // AI can specify recipients
          aiDescription: 'Array of recipient objects with email and optional name. Example: [{"email": "user@example.com", "name": "John"}]',
          itemSchema: {
            email: { type: 'string', required: true },
            name: { type: 'string' },
          },
        },
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true, // AI generates subject
          aiDescription: 'The email subject line. Be clear and concise.',
        },
        htmlContent: {
          type: 'string',
          label: 'HTML Content',
          inputType: 'textarea',
          aiControlled: true, // AI generates content
          aiDescription: 'The HTML body of the email. Use proper HTML formatting.',
        },
        textContent: {
          type: 'string',
          label: 'Text Content',
          inputType: 'textarea',
          aiControlled: true, // AI generates content
          aiDescription: 'Plain text version of the email for clients that do not support HTML.',
        },
        templateId: {
          type: 'number',
          label: 'Template ID',
          description: 'Use a Brevo template instead of content',
          aiControlled: false, // Pre-configured
        },
        params: {
          type: 'object',
          label: 'Template Parameters',
          description: 'Variables for template personalization',
          aiControlled: true, // AI can fill template params
          aiDescription: 'Key-value pairs to fill template placeholders. Example: {"firstName": "John", "orderNumber": "12345"}',
        },
        cc: {
          type: 'array',
          label: 'CC',
          aiControlled: false, // Pre-configured
          itemSchema: {
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
        bcc: {
          type: 'array',
          label: 'BCC',
          aiControlled: false, // Pre-configured
          itemSchema: {
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
        replyTo: {
          type: 'object',
          label: 'Reply To',
          aiControlled: false, // Pre-configured
        },
        tags: {
          type: 'array',
          label: 'Tags',
          description: 'Email tags for tracking',
          aiControlled: false, // Pre-configured
        },
      },
      outputSchema: {
        messageId: { type: 'string', description: 'Message ID' },
      },
    },

    {
      id: 'get_email_events',
      name: 'Get Email Events',
      description: 'Get transactional email events',
      category: 'Emails',
      icon: 'activity',
      api: {
        endpoint: '/smtp/statistics/events',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 50,
          max: 100,
          aiControlled: false,
        },
        offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          aiControlled: false,
        },
        startDate: {
          type: 'string',
          label: 'Start Date',
          placeholder: '2025-01-01',
          aiControlled: false,
        },
        endDate: {
          type: 'string',
          label: 'End Date',
          placeholder: '2025-12-31',
          aiControlled: false,
        },
        email: {
          type: 'string',
          label: 'Email',
          description: 'Filter by recipient email',
          aiControlled: false,
        },
        event: {
          type: 'select',
          label: 'Event Type',
          options: [
            { label: 'Bounces', value: 'bounces' },
            { label: 'Hard Bounces', value: 'hardBounces' },
            { label: 'Soft Bounces', value: 'softBounces' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Spam', value: 'spam' },
            { label: 'Requests', value: 'requests' },
            { label: 'Opened', value: 'opened' },
            { label: 'Clicks', value: 'clicks' },
            { label: 'Invalid', value: 'invalid' },
            { label: 'Deferred', value: 'deferred' },
            { label: 'Blocked', value: 'blocked' },
            { label: 'Unsubscribed', value: 'unsubscribed' },
          ],
          aiControlled: false,
        },
        messageId: {
          type: 'string',
          label: 'Message ID',
          description: 'Filter by specific message',
          aiControlled: false,
        },
      },
      outputSchema: {
        events: { type: 'array' },
      },
    },

    // ==================== SENDER OPERATIONS ====================
    {
      id: 'create_sender',
      name: 'Create Sender',
      description: 'Create a new sender',
      category: 'Senders',
      icon: 'mail',
      api: {
        endpoint: '/senders',
        method: 'POST',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Sender Name',
          aiControlled: true,
          aiDescription: 'The display name for the sender.',
        },
        email: {
          type: 'string',
          required: true,
          label: 'Sender Email',
          inputType: 'email',
          aiControlled: true,
          aiDescription: 'The sender email address.',
        },
        ips: {
          type: 'array',
          label: 'IP Addresses',
          description: 'Dedicated IPs for this sender',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'number' },
      },
    },

    {
      id: 'get_senders',
      name: 'Get Senders',
      description: 'Get all senders',
      category: 'Senders',
      icon: 'mail',
      api: {
        endpoint: '/senders',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        ip: {
          type: 'string',
          label: 'IP Address',
          description: 'Filter by dedicated IP',
          aiControlled: false,
        },
        domain: {
          type: 'string',
          label: 'Domain',
          description: 'Filter by domain',
          aiControlled: false,
        },
      },
      outputSchema: {
        senders: { type: 'array' },
      },
    },

    {
      id: 'update_sender',
      name: 'Update Sender',
      description: 'Update a sender',
      category: 'Senders',
      icon: 'edit',
      api: {
        endpoint: '/senders/{senderId}',
        method: 'PUT',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        senderId: {
          type: 'number',
          required: true,
          label: 'Sender ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          label: 'Sender Name',
          aiControlled: true,
          aiDescription: 'Updated display name for the sender.',
        },
        email: {
          type: 'string',
          label: 'Sender Email',
          inputType: 'email',
          aiControlled: true,
          aiDescription: 'Updated sender email address.',
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'delete_sender',
      name: 'Delete Sender',
      description: 'Delete a sender',
      category: 'Senders',
      icon: 'trash',
      api: {
        endpoint: '/senders/{senderId}',
        method: 'DELETE',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        senderId: {
          type: 'number',
          required: true,
          label: 'Sender ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== ATTRIBUTE OPERATIONS ====================
    {
      id: 'create_attribute',
      name: 'Create Contact Attribute',
      description: 'Create a new contact attribute',
      category: 'Attributes',
      icon: 'plus',
      api: {
        endpoint: '/contacts/attributes/{attributeCategory}/{attributeName}',
        method: 'POST',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        attributeCategory: {
          type: 'select',
          required: true,
          label: 'Category',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Category', value: 'category' },
            { label: 'Calculated', value: 'calculated' },
            { label: 'Global', value: 'global' },
          ],
          aiControlled: false,
        },
        attributeName: {
          type: 'string',
          required: true,
          label: 'Attribute Name',
          aiControlled: true,
          aiDescription: 'The name of the contact attribute to create.',
        },
        type: {
          type: 'select',
          label: 'Type',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Date', value: 'date' },
            { label: 'Float', value: 'float' },
            { label: 'Boolean', value: 'boolean' },
            { label: 'ID', value: 'id' },
          ],
          aiControlled: false,
        },
        value: {
          type: 'string',
          label: 'Default Value',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'get_attributes',
      name: 'Get Contact Attributes',
      description: 'Get all contact attributes',
      category: 'Attributes',
      icon: 'list',
      api: {
        endpoint: '/contacts/attributes',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {},
      outputSchema: {
        attributes: { type: 'array' },
      },
    },

    {
      id: 'delete_attribute',
      name: 'Delete Contact Attribute',
      description: 'Delete a contact attribute',
      category: 'Attributes',
      icon: 'trash',
      api: {
        endpoint: '/contacts/attributes/{attributeCategory}/{attributeName}',
        method: 'DELETE',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        attributeCategory: {
          type: 'string',
          required: true,
          label: 'Category',
          aiControlled: false,
        },
        attributeName: {
          type: 'string',
          required: true,
          label: 'Attribute Name',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== LIST OPERATIONS ====================
    {
      id: 'get_lists',
      name: 'Get Contact Lists',
      description: 'Get all contact lists',
      category: 'Lists',
      icon: 'list',
      api: {
        endpoint: '/contacts/lists',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 50,
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
        lists: { type: 'array' },
        count: { type: 'number' },
      },
    },

    {
      id: 'create_list',
      name: 'Create Contact List',
      description: 'Create a new contact list',
      category: 'Lists',
      icon: 'plus',
      api: {
        endpoint: '/contacts/lists',
        method: 'POST',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'List Name',
          aiControlled: true,
          aiDescription: 'The name of the contact list to create.',
        },
        folderId: {
          type: 'number',
          required: true,
          label: 'Folder ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'number' },
      },
    },

    {
      id: 'get_list',
      name: 'Get Contact List',
      description: 'Get a single contact list by ID',
      category: 'Lists',
      icon: 'list',
      api: {
        endpoint: '/contacts/lists/{listId}',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        listId: {
          type: 'number',
          required: true,
          label: 'List ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'number' },
        name: { type: 'string' },
        folderId: { type: 'number' },
        totalSubscribers: { type: 'number' },
        uniqueSubscribers: { type: 'number' },
      },
    },

    {
      id: 'update_list',
      name: 'Update Contact List',
      description: 'Update a contact list',
      category: 'Lists',
      icon: 'edit',
      api: {
        endpoint: '/contacts/lists/{listId}',
        method: 'PUT',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        listId: {
          type: 'number',
          required: true,
          label: 'List ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          label: 'List Name',
          aiControlled: true,
          aiDescription: 'Updated name for the contact list.',
        },
        folderId: {
          type: 'number',
          label: 'Folder ID',
          description: 'Move list to a different folder',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'delete_list',
      name: 'Delete Contact List',
      description: 'Delete a contact list',
      category: 'Lists',
      icon: 'trash',
      api: {
        endpoint: '/contacts/lists/{listId}',
        method: 'DELETE',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        listId: {
          type: 'number',
          required: true,
          label: 'List ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'add_contacts_to_list',
      name: 'Add Contacts to List',
      description: 'Add contacts to a list by email addresses',
      category: 'Lists',
      icon: 'user-plus',
      api: {
        endpoint: '/contacts/lists/{listId}/contacts/add',
        method: 'POST',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        listId: {
          type: 'number',
          required: true,
          label: 'List ID',
          aiControlled: false,
        },
        emails: {
          type: 'array',
          required: true,
          label: 'Email Addresses',
          description: 'List of email addresses to add',
          aiControlled: true,
          aiDescription: 'Array of email addresses to add to the list.',
          itemSchema: {
            type: 'string',
          },
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'remove_contacts_from_list',
      name: 'Remove Contacts from List',
      description: 'Remove contacts from a list by email addresses',
      category: 'Lists',
      icon: 'user-minus',
      api: {
        endpoint: '/contacts/lists/{listId}/contacts/remove',
        method: 'POST',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        listId: {
          type: 'number',
          required: true,
          label: 'List ID',
          aiControlled: false,
        },
        emails: {
          type: 'array',
          required: true,
          label: 'Email Addresses',
          description: 'List of email addresses to remove',
          aiControlled: true,
          aiDescription: 'Array of email addresses to remove from the list.',
          itemSchema: {
            type: 'string',
          },
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'get_folders',
      name: 'Get Contact Folders',
      description: 'Get all contact folders',
      category: 'Lists',
      icon: 'folder',
      api: {
        endpoint: '/contacts/folders',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 50,
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
        folders: { type: 'array' },
        count: { type: 'number' },
      },
    },

    // ==================== ACCOUNT ====================
    {
      id: 'get_account',
      name: 'Get Account Info',
      description: 'Get account information',
      category: 'Account',
      icon: 'user',
      api: {
        endpoint: '/account',
        method: 'GET',
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
          'api-key': '{apiKey}',
        },
      },
      inputSchema: {},
      outputSchema: {
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        companyName: { type: 'string' },
        plan: { type: 'array' },
        relay: { type: 'object' },
        marketingAutomation: { type: 'object' },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'email_delivered',
      name: 'Email Delivered',
      description: 'Triggers when a transactional email is delivered',
      eventType: 'delivered',
      icon: 'check',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        'message-id': { type: 'string' },
        subject: { type: 'string' },
        tag: { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'email_opened',
      name: 'Email Opened',
      description: 'Triggers when a transactional email is opened',
      eventType: 'opened',
      icon: 'eye',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        'message-id': { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'email_clicked',
      name: 'Email Clicked',
      description: 'Triggers when a link in email is clicked',
      eventType: 'click',
      icon: 'mouse-pointer',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        'message-id': { type: 'string' },
        link: { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'email_hard_bounce',
      name: 'Email Hard Bounce',
      description: 'Triggers when an email hard bounces',
      eventType: 'hardBounce',
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        'message-id': { type: 'string' },
        reason: { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'email_soft_bounce',
      name: 'Email Soft Bounce',
      description: 'Triggers when an email soft bounces',
      eventType: 'softBounce',
      icon: 'alert-circle',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        'message-id': { type: 'string' },
        reason: { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'email_spam',
      name: 'Email Marked as Spam',
      description: 'Triggers when email is marked as spam',
      eventType: 'spam',
      icon: 'alert-triangle',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        'message-id': { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'email_unsubscribed',
      name: 'Email Unsubscribed',
      description: 'Triggers when recipient unsubscribes',
      eventType: 'unsubscribed',
      icon: 'user-minus',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        'message-id': { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'inbound_email',
      name: 'Inbound Email Received',
      description: 'Triggers when an inbound email is processed',
      eventType: 'inboundEmailProcessed',
      icon: 'inbox',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        uuid: { type: 'string' },
        date: { type: 'string' },
        sender: { type: 'object' },
        recipient: { type: 'object' },
        subject: { type: 'string' },
        rawHtmlBody: { type: 'string' },
        rawTextBody: { type: 'string' },
      },
    },
    {
      id: 'contact_created',
      name: 'Contact Added to List',
      description: 'Triggers when a contact is added to a list',
      eventType: 'listAddition',
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        listId: { type: 'array' },
        ts_event: { type: 'number' },
      },
    },
    {
      id: 'contact_updated',
      name: 'Contact Updated',
      description: 'Triggers when a contact is updated',
      eventType: 'contactUpdated',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        email: { type: 'string' },
        id: { type: 'number' },
        date: { type: 'string' },
        ts_event: { type: 'number' },
      },
    },
  ],
};
