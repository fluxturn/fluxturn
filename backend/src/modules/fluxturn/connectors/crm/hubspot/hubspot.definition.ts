import { ConnectorDefinition } from '../../shared';

/**
 * HubSpot Connector Definition
 *
 * CRM, marketing, sales, and customer service platform with comprehensive
 * contact management, deal tracking, and automation capabilities.
 *
 * Resources:
 * - Companies: Manage company records and properties
 * - Contacts: Contact management and segmentation
 * - Deals: Sales pipeline and deal tracking
 * - Tickets: Customer service ticket management
 * - Engagements: Calls, emails, meetings, and tasks
 * - Contact Lists: List management and segmentation
 *
 * Authentication:
 * - API Key (legacy)
 * - App Token (recommended)
 * - OAuth2 (for user-specific access)
 */
export const HUBSPOT_CONNECTOR: ConnectorDefinition = {
  name: 'hubspot',
  display_name: 'HubSpot',
  category: 'crm',
  description: 'CRM platform for contact management, sales pipelines, and customer service',

  // Supports multiple auth types
  auth_type: 'multiple',

  // OAuth2 configuration
  oauth_config: {
    authorization_url: 'https://app.hubspot.com/oauth/authorize',
    token_url: 'https://api.hubapi.com/oauth/v1/token',
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.schemas.contacts.read',
      'crm.schemas.companies.read',
      'crm.schemas.deals.read',
      'crm.lists.read',
      'crm.lists.write',
      'tickets',
    ],
  },

  // Alternative authentication fields
  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      default: 'oauth2',
      options: [
        { label: 'OAuth2 (Recommended)', value: 'oauth2' },
        { label: 'App Token', value: 'appToken' },
        { label: 'API Key (Legacy)', value: 'apiKey' },
      ],
      description: 'Choose authentication method',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your HubSpot API key',
      description: 'Legacy API key from HubSpot settings',
      helpUrl: 'https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key',
      displayOptions: {
        authType: ['apiKey'],
      },
    },
    {
      key: 'appToken',
      label: 'App Token',
      type: 'password',
      required: true,
      placeholder: 'Your HubSpot app token',
      description: 'App token from HubSpot private app',
      helpUrl: 'https://developers.hubspot.com/docs/api/private-apps',
      displayOptions: {
        authType: ['appToken'],
      },
    },
  ],

  endpoints: {
    base_url: 'https://api.hubapi.com',
    companies: '/crm/v3/objects/companies',
    contacts: '/crm/v3/objects/contacts',
    deals: '/crm/v3/objects/deals',
    tickets: '/crm/v3/objects/tickets',
    engagements: '/engagements/v1/engagements',
    lists: '/contacts/v1/lists',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 10,
  },

  // Actions available in HubSpot
  supported_actions: [
    // ==================== COMPANY OPERATIONS ====================
    {
      id: 'create_company',
      name: 'Create Company',
      description: 'Create a new company in HubSpot',
      category: 'Companies',
      icon: 'building',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/companies',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          properties: 'properties',
        },
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Company Name',
          placeholder: 'Acme Inc.',
          description: 'Name of the company',
          aiControlled: true,
          aiDescription: 'The name of the company to create.',
        },
        domain: {
          type: 'string',
          label: 'Domain',
          placeholder: 'acme.com',
          description: 'Company website domain',
          aiControlled: false,
        },
        industry: {
          type: 'string',
          label: 'Industry',
          placeholder: 'Technology',
          description: 'Industry the company operates in',
          aiControlled: true,
          aiDescription: 'The industry the company operates in.',
        },
        phone: {
          type: 'string',
          label: 'Phone Number',
          placeholder: '+1-555-0100',
          description: 'Company phone number',
          aiControlled: false,
        },
        city: {
          type: 'string',
          label: 'City',
          placeholder: 'San Francisco',
          aiControlled: false,
        },
        state: {
          type: 'string',
          label: 'State/Region',
          placeholder: 'CA',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          description: 'Additional company properties as key-value pairs',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'Company ID' },
        properties: { type: 'object', description: 'Company properties' },
        createdAt: { type: 'string', description: 'Creation timestamp' },
        updatedAt: { type: 'string', description: 'Last update timestamp' },
      },
    },

    {
      id: 'update_company',
      name: 'Update Company',
      description: 'Update an existing company',
      category: 'Companies',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/companies/{companyId}',
        method: 'PATCH',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          companyId: 'companyId',
          properties: 'properties',
        },
      },
      inputSchema: {
        companyId: {
          type: 'string',
          required: true,
          label: 'Company ID',
          description: 'ID of the company to update',
          aiControlled: false,
        },
        name: {
          type: 'string',
          label: 'Company Name',
          description: 'Updated company name',
          aiControlled: true,
          aiDescription: 'The updated name for the company.',
        },
        domain: {
          type: 'string',
          label: 'Domain',
          description: 'Updated domain',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          description: 'Additional properties to update',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'get_company',
      name: 'Get Company',
      description: 'Get a company by ID',
      category: 'Companies',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/companies/{companyId}',
        method: 'GET',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          companyId: 'companyId',
          properties: 'properties',
        },
      },
      inputSchema: {
        companyId: {
          type: 'string',
          required: true,
          label: 'Company ID',
          description: 'ID of the company to retrieve',
          aiControlled: false,
        },
        properties: {
          type: 'string',
          label: 'Properties',
          description: 'Comma-separated list of properties to return',
          placeholder: 'name,domain,industry',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'delete_company',
      name: 'Delete Company',
      description: 'Delete a company',
      category: 'Companies',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/companies/{companyId}',
        method: 'DELETE',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          companyId: 'companyId',
        },
      },
      inputSchema: {
        companyId: {
          type: 'string',
          required: true,
          label: 'Company ID',
          description: 'ID of the company to delete',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'search_companies',
      name: 'Search Companies',
      description: 'Search companies by domain or other criteria',
      category: 'Companies',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/companies/search',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          filterGroups: 'filterGroups',
          sorts: 'sorts',
          properties: 'properties',
          limit: 'limit',
        },
      },
      inputSchema: {
        domain: {
          type: 'string',
          label: 'Domain',
          description: 'Search by company domain',
          placeholder: 'acme.com',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          description: 'Maximum number of results',
          aiControlled: false,
        },
        properties: {
          type: 'string',
          label: 'Properties',
          description: 'Comma-separated properties to return',
          aiControlled: false,
        },
      },
      outputSchema: {
        results: { type: 'array', description: 'Array of company objects' },
        total: { type: 'number', description: 'Total matching companies' },
      },
    },

    // ==================== CONTACT OPERATIONS ====================
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Create a new contact in HubSpot',
      category: 'Contacts',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/contacts',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          properties: 'properties',
        },
      },
      inputSchema: {
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          inputType: 'email',
          placeholder: 'contact@example.com',
          description: 'Contact email address',
          aiControlled: true,
          aiDescription: 'The contact email address.',
        },
        firstname: {
          type: 'string',
          label: 'First Name',
          placeholder: 'John',
          aiControlled: true,
          aiDescription: 'Contact first name.',
        },
        lastname: {
          type: 'string',
          label: 'Last Name',
          placeholder: 'Doe',
          aiControlled: true,
          aiDescription: 'Contact last name.',
        },
        phone: {
          type: 'string',
          label: 'Phone Number',
          placeholder: '+1-555-0100',
          aiControlled: true,
          aiDescription: 'Contact phone number.',
        },
        company: {
          type: 'string',
          label: 'Company',
          placeholder: 'Acme Inc.',
          aiControlled: true,
          aiDescription: 'Contact company name.',
        },
        website: {
          type: 'string',
          label: 'Website',
          inputType: 'url',
          placeholder: 'https://example.com',
          aiControlled: false,
        },
        lifecyclestage: {
          type: 'select',
          label: 'Lifecycle Stage',
          aiControlled: false,
          options: [
            { label: 'Subscriber', value: 'subscriber' },
            { label: 'Lead', value: 'lead' },
            { label: 'Marketing Qualified Lead', value: 'marketingqualifiedlead' },
            { label: 'Sales Qualified Lead', value: 'salesqualifiedlead' },
            { label: 'Opportunity', value: 'opportunity' },
            { label: 'Customer', value: 'customer' },
            { label: 'Evangelist', value: 'evangelist' },
            { label: 'Other', value: 'other' },
          ],
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          description: 'Additional contact properties',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'Contact ID' },
        properties: { type: 'object', description: 'Contact properties' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Update an existing contact',
      category: 'Contacts',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/contacts/{contactId}',
        method: 'PATCH',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          contactId: 'contactId',
          properties: 'properties',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          description: 'ID of the contact to update',
          aiControlled: false,
        },
        email: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          aiControlled: true,
          aiDescription: 'The updated contact email address.',
        },
        firstname: {
          type: 'string',
          label: 'First Name',
          aiControlled: true,
          aiDescription: 'The updated contact first name.',
        },
        lastname: {
          type: 'string',
          label: 'Last Name',
          aiControlled: true,
          aiDescription: 'The updated contact last name.',
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'get_contact',
      name: 'Get Contact',
      description: 'Get a contact by ID or email',
      category: 'Contacts',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/contacts/{contactId}',
        method: 'GET',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          contactId: 'contactId',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID or Email',
          description: 'ID or email of the contact',
          aiControlled: false,
        },
        properties: {
          type: 'string',
          label: 'Properties',
          description: 'Comma-separated properties to return',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'delete_contact',
      name: 'Delete Contact',
      description: 'Delete a contact',
      category: 'Contacts',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/contacts/{contactId}',
        method: 'DELETE',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          contactId: 'contactId',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          description: 'ID of the contact to delete',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'search_contacts',
      name: 'Search Contacts',
      description: 'Search contacts with filters',
      category: 'Contacts',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/contacts/search',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          filterGroups: 'filterGroups',
          limit: 'limit',
        },
      },
      inputSchema: {
        email: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          description: 'Search by email',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        results: { type: 'array' },
        total: { type: 'number' },
      },
    },

    // ==================== DEAL OPERATIONS ====================
    {
      id: 'create_deal',
      name: 'Create Deal',
      description: 'Create a new deal in HubSpot',
      category: 'Deals',
      icon: 'dollar-sign',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/deals',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          properties: 'properties',
          associations: 'associations',
        },
      },
      inputSchema: {
        dealname: {
          type: 'string',
          required: true,
          label: 'Deal Name',
          placeholder: 'New Business Deal',
          description: 'Name of the deal',
          aiControlled: true,
          aiDescription: 'A descriptive name for the deal.',
        },
        dealstage: {
          type: 'string',
          required: true,
          label: 'Deal Stage',
          description: 'Current stage of the deal',
          aiControlled: false,
        },
        amount: {
          type: 'number',
          label: 'Amount',
          placeholder: '5000',
          description: 'Deal amount in the account currency',
          aiControlled: true,
          aiDescription: 'The deal amount/value.',
        },
        pipeline: {
          type: 'string',
          label: 'Pipeline',
          description: 'Pipeline ID for the deal',
          aiControlled: false,
        },
        closedate: {
          type: 'string',
          label: 'Close Date',
          description: 'Expected close date (YYYY-MM-DD)',
          placeholder: '2025-12-31',
          aiControlled: false,
        },
        associatedCompanyIds: {
          type: 'array',
          label: 'Associated Companies',
          itemSchema: {
            type: 'string',
          },
          description: 'Company IDs to associate with this deal',
          aiControlled: false,
        },
        associatedContactIds: {
          type: 'array',
          label: 'Associated Contacts',
          itemSchema: {
            type: 'string',
          },
          description: 'Contact IDs to associate with this deal',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'Deal ID' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'update_deal',
      name: 'Update Deal',
      description: 'Update an existing deal',
      category: 'Deals',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/deals/{dealId}',
        method: 'PATCH',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          dealId: 'dealId',
          properties: 'properties',
        },
      },
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false,
        },
        dealname: {
          type: 'string',
          label: 'Deal Name',
          aiControlled: true,
          aiDescription: 'The updated name for the deal.',
        },
        dealstage: {
          type: 'string',
          label: 'Deal Stage',
          aiControlled: false,
        },
        amount: {
          type: 'number',
          label: 'Amount',
          aiControlled: true,
          aiDescription: 'The updated deal amount/value.',
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'get_deal',
      name: 'Get Deal',
      description: 'Get a deal by ID',
      category: 'Deals',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/deals/{dealId}',
        method: 'GET',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          dealId: 'dealId',
        },
      },
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false,
        },
        properties: {
          type: 'string',
          label: 'Properties',
          description: 'Comma-separated properties to return',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'delete_deal',
      name: 'Delete Deal',
      description: 'Delete a deal',
      category: 'Deals',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/deals/{dealId}',
        method: 'DELETE',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          dealId: 'dealId',
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

    {
      id: 'search_deals',
      name: 'Search Deals',
      description: 'Search deals with filters',
      category: 'Deals',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/deals/search',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        results: { type: 'array' },
        total: { type: 'number' },
      },
    },

    // ==================== TICKET OPERATIONS ====================
    {
      id: 'create_ticket',
      name: 'Create Ticket',
      description: 'Create a support ticket',
      category: 'Tickets',
      icon: 'ticket',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/tickets',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          properties: 'properties',
        },
      },
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Customer issue with product',
          description: 'Ticket subject/title',
          aiControlled: true,
          aiDescription: 'A clear, concise ticket subject.',
        },
        content: {
          type: 'string',
          required: true,
          label: 'Description',
          inputType: 'textarea',
          description: 'Detailed ticket description',
          aiControlled: true,
          aiDescription: 'Detailed description of the ticket/issue.',
        },
        hs_pipeline: {
          type: 'string',
          label: 'Pipeline',
          description: 'Ticket pipeline ID',
          aiControlled: false,
        },
        hs_pipeline_stage: {
          type: 'string',
          label: 'Pipeline Stage',
          description: 'Current stage in the pipeline',
          aiControlled: false,
        },
        hs_ticket_priority: {
          type: 'select',
          label: 'Priority',
          aiControlled: false,
          options: [
            { label: 'Low', value: 'LOW' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'High', value: 'HIGH' },
          ],
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'Ticket ID' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'update_ticket',
      name: 'Update Ticket',
      description: 'Update a support ticket',
      category: 'Tickets',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/tickets/{ticketId}',
        method: 'PATCH',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          ticketId: 'ticketId',
          properties: 'properties',
        },
      },
      inputSchema: {
        ticketId: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          aiControlled: false,
        },
        subject: {
          type: 'string',
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The updated ticket subject.',
        },
        hs_pipeline_stage: {
          type: 'string',
          label: 'Pipeline Stage',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Properties',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'get_ticket',
      name: 'Get Ticket',
      description: 'Get a ticket by ID',
      category: 'Tickets',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/tickets/{ticketId}',
        method: 'GET',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          ticketId: 'ticketId',
        },
      },
      inputSchema: {
        ticketId: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },

    {
      id: 'delete_ticket',
      name: 'Delete Ticket',
      description: 'Delete a ticket',
      category: 'Tickets',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/crm/v3/objects/tickets/{ticketId}',
        method: 'DELETE',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          ticketId: 'ticketId',
        },
      },
      inputSchema: {
        ticketId: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== ENGAGEMENT OPERATIONS ====================
    {
      id: 'create_engagement',
      name: 'Create Engagement',
      description: 'Create an engagement (call, email, meeting, or task)',
      category: 'Engagements',
      icon: 'activity',
      verified: false,
      api: {
        endpoint: '/engagements/v1/engagements',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          engagement: 'engagement',
          associations: 'associations',
          metadata: 'metadata',
        },
      },
      inputSchema: {
        type: {
          type: 'select',
          required: true,
          label: 'Engagement Type',
          options: [
            { label: 'Call', value: 'CALL' },
            { label: 'Email', value: 'EMAIL' },
            { label: 'Meeting', value: 'MEETING' },
            { label: 'Task', value: 'TASK' },
            { label: 'Note', value: 'NOTE' },
          ],
          description: 'Type of engagement',
          aiControlled: false,
        },
        subject: {
          type: 'string',
          label: 'Subject',
          description: 'Engagement subject or title',
          aiControlled: true,
          aiDescription: 'A clear, concise subject/title for the engagement.',
        },
        body: {
          type: 'string',
          label: 'Body/Notes',
          inputType: 'textarea',
          description: 'Engagement notes or body',
          aiControlled: true,
          aiDescription: 'The body content or notes for the engagement.',
        },
        timestamp: {
          type: 'string',
          label: 'Timestamp',
          description: 'When the engagement occurred (ISO 8601)',
          placeholder: '2025-01-18T10:30:00Z',
          aiControlled: false,
        },
        ownerId: {
          type: 'string',
          label: 'Owner ID',
          description: 'HubSpot user ID of the engagement owner',
          aiControlled: false,
        },
        associatedContactIds: {
          type: 'array',
          label: 'Associated Contacts',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
        associatedCompanyIds: {
          type: 'array',
          label: 'Associated Companies',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
        associatedDealIds: {
          type: 'array',
          label: 'Associated Deals',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
      },
      outputSchema: {
        engagement: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Engagement ID' },
            type: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },

    // ==================== CONTACT LIST OPERATIONS ====================
    {
      id: 'add_contact_to_list',
      name: 'Add Contact to List',
      description: 'Add a contact to a contact list',
      category: 'Contact Lists',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/contacts/v1/lists/{listId}/add',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          listId: 'listId',
          vids: 'vids',
          emails: 'emails',
        },
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          description: 'ID of the contact list',
          aiControlled: false,
        },
        contactIds: {
          type: 'array',
          label: 'Contact IDs',
          itemSchema: {
            type: 'string',
          },
          description: 'Contact IDs to add to the list',
          aiControlled: false,
        },
        emails: {
          type: 'array',
          label: 'Emails',
          itemSchema: {
            type: 'string',
          },
          description: 'Contact emails to add to the list',
          aiControlled: false,
        },
      },
      outputSchema: {
        updated: { type: 'array', description: 'Updated contact IDs' },
        discarded: { type: 'array', description: 'Discarded contact IDs' },
        invalidVids: { type: 'array' },
        invalidEmails: { type: 'array' },
      },
    },

    {
      id: 'remove_contact_from_list',
      name: 'Remove Contact from List',
      description: 'Remove a contact from a contact list',
      category: 'Contact Lists',
      icon: 'x',
      verified: false,
      api: {
        endpoint: '/contacts/v1/lists/{listId}/remove',
        method: 'POST',
        baseUrl: 'https://api.hubapi.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
        },
        paramMapping: {
          listId: 'listId',
          vids: 'vids',
          emails: 'emails',
        },
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          aiControlled: false,
        },
        contactIds: {
          type: 'array',
          label: 'Contact IDs',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
        emails: {
          type: 'array',
          label: 'Emails',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
      },
      outputSchema: {
        updated: { type: 'array' },
        discarded: { type: 'array' },
      },
    },
  ],

  // Webhook triggers
  supported_triggers: [
    {
      id: 'company_created',
      name: 'Company Created',
      description: 'Triggers when a new company is created',
      eventType: 'company.creation',
      verified: false,
      icon: 'building',
      webhookRequired: true,
      inputSchema: {
        subscriptionDetails: {
          type: 'object',
          description: 'Webhook subscription configuration',
        },
      },
      outputSchema: {
        objectId: { type: 'string', description: 'Company ID' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string', description: 'Timestamp' },
      },
    },

    {
      id: 'company_deleted',
      name: 'Company Deleted',
      description: 'Triggers when a company is deleted',
      eventType: 'company.deletion',
      verified: false,
      icon: 'trash',
      webhookRequired: true,
      outputSchema: {
        objectId: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'company_property_changed',
      name: 'Company Property Changed',
      description: 'Triggers when a company property changes',
      eventType: 'company.propertyChange',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        propertyName: {
          type: 'string',
          label: 'Property Name',
          description: 'Specific property to watch (optional)',
        },
      },
      outputSchema: {
        objectId: { type: 'string' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'contact_created',
      name: 'Contact Created',
      description: 'Triggers when a new contact is created',
      eventType: 'contact.creation',
      verified: false,
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        objectId: { type: 'string', description: 'Contact ID' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'contact_deleted',
      name: 'Contact Deleted',
      description: 'Triggers when a contact is deleted',
      eventType: 'contact.deletion',
      verified: false,
      icon: 'trash',
      webhookRequired: true,
      outputSchema: {
        objectId: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'contact_property_changed',
      name: 'Contact Property Changed',
      description: 'Triggers when a contact property changes',
      eventType: 'contact.propertyChange',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        propertyName: {
          type: 'string',
          label: 'Property Name',
          description: 'Specific property to watch (optional)',
        },
      },
      outputSchema: {
        objectId: { type: 'string' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'deal_created',
      name: 'Deal Created',
      description: 'Triggers when a new deal is created',
      eventType: 'deal.creation',
      verified: false,
      icon: 'dollar-sign',
      webhookRequired: true,
      outputSchema: {
        objectId: { type: 'string', description: 'Deal ID' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'deal_deleted',
      name: 'Deal Deleted',
      description: 'Triggers when a deal is deleted',
      eventType: 'deal.deletion',
      verified: false,
      icon: 'trash',
      webhookRequired: true,
      outputSchema: {
        objectId: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'deal_property_changed',
      name: 'Deal Property Changed',
      description: 'Triggers when a deal property changes',
      eventType: 'deal.propertyChange',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        propertyName: {
          type: 'string',
          label: 'Property Name',
          description: 'Specific property to watch (optional)',
        },
      },
      outputSchema: {
        objectId: { type: 'string' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'ticket_created',
      name: 'Ticket Created',
      description: 'Triggers when a new ticket is created',
      eventType: 'ticket.creation',
      verified: false,
      icon: 'ticket',
      webhookRequired: true,
      outputSchema: {
        objectId: { type: 'string', description: 'Ticket ID' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'ticket_deleted',
      name: 'Ticket Deleted',
      description: 'Triggers when a ticket is deleted',
      eventType: 'ticket.deletion',
      verified: false,
      icon: 'trash',
      webhookRequired: true,
      outputSchema: {
        objectId: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        portalId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },

    {
      id: 'ticket_property_changed',
      name: 'Ticket Property Changed',
      description: 'Triggers when a ticket property changes',
      eventType: 'ticket.propertyChange',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        propertyName: {
          type: 'string',
          label: 'Property Name',
          description: 'Specific property to watch (optional)',
        },
      },
      outputSchema: {
        objectId: { type: 'string' },
        propertyName: { type: 'string' },
        propertyValue: { type: 'string' },
        changeSource: { type: 'string' },
        eventId: { type: 'string' },
        subscriptionId: { type: 'string' },
        occurredAt: { type: 'string' },
      },
    },
  ],
};
