// SendGrid Connector Definition
// Comprehensive connector for email delivery and marketing campaigns via SendGrid

import { ConnectorDefinition } from '../../shared';

export const SENDGRID_MARKETING_CONNECTOR: ConnectorDefinition = {
  name: 'sendgrid_marketing',
  display_name: 'SendGrid (Marketing)',
  category: 'marketing',
  description: 'SendGrid email delivery and marketing platform for sending transactional and marketing emails, managing contacts, lists, campaigns, and templates.',
  auth_type: 'api_key',
  verified: true,

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxx',
      description: 'Your SendGrid API key with appropriate permissions',
      helpUrl: 'https://docs.sendgrid.com/ui/account-and-settings/api-keys',
      helpText: 'How to create an API key'
    }
  ],

  endpoints: {
    base_url: 'https://api.sendgrid.com/v3',
    mail: '/mail/send',
    contacts: '/marketing/contacts',
    lists: '/marketing/lists',
    segments: '/marketing/segments',
    singlesends: '/marketing/singlesends',
    templates: '/templates'
  },

  webhook_support: true,

  rate_limits: {
    requests_per_second: 5,
    requests_per_minute: 300
  },

  sandbox_available: false,

  // ============================================
  // SUPPORTED ACTIONS - Complete SendGrid API Coverage
  // ============================================
  supported_actions: [
    // ==========================================
    // EMAIL ACTIONS
    // ==========================================
    {
      id: 'send_email',
      name: 'Send Email',
      description: 'Send a transactional email to one or more recipients',
      category: 'Email',
      icon: 'send',
      verified: true,
      api: {
        endpoint: '/mail/send',
        method: 'POST',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        to: {
          type: 'string',
          required: true,
          label: 'To Email',
          inputType: 'email',
          placeholder: 'recipient@example.com',
          description: 'Recipient email address',
          aiControlled: false
        },
        from: {
          type: 'string',
          required: true,
          label: 'From Email',
          inputType: 'email',
          placeholder: 'sender@example.com',
          description: 'Sender email address (must be verified in SendGrid)',
          aiControlled: false
        },
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Email subject line',
          description: 'Subject line of the email',
          aiControlled: true,
          aiDescription: 'A clear, engaging email subject line that summarizes the email content and encourages opening.'
        },
        content: {
          type: 'string',
          required: true,
          label: 'Text Content',
          inputType: 'textarea',
          placeholder: 'Plain text email content...',
          description: 'Plain text version of the email body',
          aiControlled: true,
          aiDescription: 'The plain text email body content. Keep it clear and professional.'
        },
        html: {
          type: 'string',
          required: false,
          label: 'HTML Content',
          inputType: 'textarea',
          placeholder: '<h1>HTML email content...</h1>',
          description: 'HTML version of the email body (optional)',
          aiControlled: true,
          aiDescription: 'The HTML formatted email body with proper formatting and styling.'
        },
        replyTo: {
          type: 'string',
          required: false,
          label: 'Reply To',
          inputType: 'email',
          placeholder: 'reply@example.com',
          description: 'Reply-to email address',
          aiControlled: false
        },
        cc: {
          type: 'string',
          required: false,
          label: 'CC',
          inputType: 'email',
          placeholder: 'cc@example.com',
          description: 'Carbon copy recipient(s), comma-separated',
          aiControlled: false
        },
        bcc: {
          type: 'string',
          required: false,
          label: 'BCC',
          inputType: 'email',
          placeholder: 'bcc@example.com',
          description: 'Blind carbon copy recipient(s), comma-separated',
          aiControlled: false
        },
        categories: {
          type: 'string',
          required: false,
          label: 'Categories',
          placeholder: 'category1, category2',
          description: 'Comma-separated list of categories for tracking',
          aiControlled: false
        },
        templateId: {
          type: 'string',
          required: false,
          label: 'Template ID',
          placeholder: 'd-xxxxxxxxxxxxxxxxxxxx',
          description: 'SendGrid dynamic template ID',
          aiControlled: false
        },
        templateData: {
          type: 'object',
          required: false,
          label: 'Template Data',
          description: 'Dynamic template data as JSON object',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the email was sent successfully' },
        messageId: { type: 'string', description: 'Unique message ID from SendGrid' }
      }
    },

    // ==========================================
    // CONTACT ACTIONS
    // ==========================================
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Add a new contact to SendGrid Marketing',
      category: 'Contacts',
      icon: 'user-plus',
      verified: true,
      api: {
        endpoint: '/marketing/contacts',
        method: 'PUT',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          inputType: 'email',
          placeholder: 'contact@example.com',
          description: 'Email address of the contact',
          aiControlled: false
        },
        firstName: {
          type: 'string',
          required: false,
          label: 'First Name',
          placeholder: 'John',
          description: 'Contact first name',
          aiControlled: true,
          aiDescription: 'First name of the contact'
        },
        lastName: {
          type: 'string',
          required: false,
          label: 'Last Name',
          placeholder: 'Doe',
          description: 'Contact last name',
          aiControlled: true,
          aiDescription: 'Last name of the contact'
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone Number',
          placeholder: '+1234567890',
          description: 'Contact phone number',
          aiControlled: false
        },
        addressLine1: {
          type: 'string',
          required: false,
          label: 'Address Line 1',
          placeholder: '123 Main St',
          description: 'Street address line 1',
          aiControlled: false
        },
        addressLine2: {
          type: 'string',
          required: false,
          label: 'Address Line 2',
          placeholder: 'Suite 100',
          description: 'Street address line 2',
          aiControlled: false
        },
        city: {
          type: 'string',
          required: false,
          label: 'City',
          placeholder: 'San Francisco',
          description: 'City',
          aiControlled: false
        },
        state: {
          type: 'string',
          required: false,
          label: 'State/Province',
          placeholder: 'CA',
          description: 'State or province',
          aiControlled: false
        },
        postalCode: {
          type: 'string',
          required: false,
          label: 'Postal Code',
          placeholder: '94105',
          description: 'Postal or ZIP code',
          aiControlled: false
        },
        country: {
          type: 'string',
          required: false,
          label: 'Country',
          placeholder: 'USA',
          description: 'Country',
          aiControlled: false
        },
        listIds: {
          type: 'string',
          required: false,
          label: 'List IDs',
          placeholder: 'list-id-1, list-id-2',
          description: 'Comma-separated list IDs to add contact to',
          aiControlled: false
        },
        customFields: {
          type: 'object',
          required: false,
          label: 'Custom Fields',
          description: 'Custom field values as JSON object',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the contact was created successfully' },
        data: {
          type: 'object',
          description: 'Created contact data',
          properties: {
            id: { type: 'string', description: 'Contact ID' },
            email: { type: 'string', description: 'Email address' }
          }
        }
      }
    },
    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Update an existing contact in SendGrid Marketing',
      category: 'Contacts',
      icon: 'edit',
      verified: true,
      api: {
        endpoint: '/marketing/contacts',
        method: 'PUT',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          inputType: 'email',
          placeholder: 'contact@example.com',
          description: 'Email address of the contact to update',
          aiControlled: false
        },
        firstName: {
          type: 'string',
          required: false,
          label: 'First Name',
          placeholder: 'John',
          description: 'Updated first name',
          aiControlled: true,
          aiDescription: 'New first name for the contact'
        },
        lastName: {
          type: 'string',
          required: false,
          label: 'Last Name',
          placeholder: 'Doe',
          description: 'Updated last name',
          aiControlled: true,
          aiDescription: 'New last name for the contact'
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone Number',
          placeholder: '+1234567890',
          description: 'Updated phone number',
          aiControlled: false
        },
        addressLine1: {
          type: 'string',
          required: false,
          label: 'Address Line 1',
          description: 'Updated street address line 1',
          aiControlled: false
        },
        addressLine2: {
          type: 'string',
          required: false,
          label: 'Address Line 2',
          description: 'Updated street address line 2',
          aiControlled: false
        },
        city: {
          type: 'string',
          required: false,
          label: 'City',
          description: 'Updated city',
          aiControlled: false
        },
        state: {
          type: 'string',
          required: false,
          label: 'State/Province',
          description: 'Updated state or province',
          aiControlled: false
        },
        postalCode: {
          type: 'string',
          required: false,
          label: 'Postal Code',
          description: 'Updated postal or ZIP code',
          aiControlled: false
        },
        country: {
          type: 'string',
          required: false,
          label: 'Country',
          description: 'Updated country',
          aiControlled: false
        },
        customFields: {
          type: 'object',
          required: false,
          label: 'Custom Fields',
          description: 'Updated custom field values as JSON object',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated contact data' }
      }
    },
    {
      id: 'get_contact',
      name: 'Get Contact',
      description: 'Get information about a specific contact',
      category: 'Contacts',
      icon: 'user',
      verified: true,
      api: {
        endpoint: '/marketing/contacts/{contactId}',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the contact',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Contact data' }
      }
    },
    {
      id: 'get_contacts',
      name: 'Get All Contacts',
      description: 'Get all contacts from SendGrid Marketing',
      category: 'Contacts',
      icon: 'users',
      verified: true,
      api: {
        endpoint: '/marketing/contacts',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        pageSize: {
          type: 'number',
          required: false,
          label: 'Page Size',
          default: 50,
          min: 1,
          max: 1000,
          description: 'Number of contacts to return per page',
          aiControlled: false
        },
        pageToken: {
          type: 'string',
          required: false,
          label: 'Page Token',
          description: 'Token for pagination to get the next page',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of contacts' },
        metadata: { type: 'object', description: 'Pagination metadata' }
      }
    },
    {
      id: 'search_contacts',
      name: 'Search Contacts',
      description: 'Search contacts using SendGrid query syntax',
      category: 'Contacts',
      icon: 'search',
      verified: true,
      api: {
        endpoint: '/marketing/contacts/search',
        method: 'POST',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: "email LIKE '%@example.com'",
          description: 'SendGrid SGQL query to search contacts',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'Matching contacts' }
      }
    },
    {
      id: 'delete_contact',
      name: 'Delete Contact',
      description: 'Delete a contact from SendGrid Marketing',
      category: 'Contacts',
      icon: 'trash',
      verified: true,
      api: {
        endpoint: '/marketing/contacts',
        method: 'DELETE',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the contact to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'bulk_import_contacts',
      name: 'Bulk Import Contacts',
      description: 'Import multiple contacts at once',
      category: 'Contacts',
      icon: 'upload',
      verified: true,
      api: {
        endpoint: '/marketing/contacts',
        method: 'PUT',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        contacts: {
          type: 'array',
          required: true,
          label: 'Contacts',
          description: 'Array of contact objects to import',
          aiControlled: false
        },
        listIds: {
          type: 'string',
          required: false,
          label: 'List IDs',
          placeholder: 'list-id-1, list-id-2',
          description: 'Comma-separated list IDs to add all contacts to',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Bulk import result with job ID' }
      }
    },

    // ==========================================
    // LIST ACTIONS
    // ==========================================
    {
      id: 'create_list',
      name: 'Create List',
      description: 'Create a new contact list',
      category: 'Lists',
      icon: 'list',
      verified: true,
      api: {
        endpoint: '/marketing/lists',
        method: 'POST',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'List Name',
          placeholder: 'Newsletter Subscribers',
          description: 'Name for the new list',
          aiControlled: true,
          aiDescription: 'A descriptive name for the contact list'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created list data',
          properties: {
            id: { type: 'string', description: 'List ID' },
            name: { type: 'string', description: 'List name' }
          }
        }
      }
    },
    {
      id: 'update_list',
      name: 'Update List',
      description: 'Update an existing contact list',
      category: 'Lists',
      icon: 'edit',
      verified: true,
      api: {
        endpoint: '/marketing/lists/{listId}',
        method: 'PATCH',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the list to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'New List Name',
          placeholder: 'Updated List Name',
          description: 'New name for the list',
          aiControlled: true,
          aiDescription: 'The updated name for the contact list'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated list data' }
      }
    },
    {
      id: 'get_list',
      name: 'Get List',
      description: 'Get information about a specific list',
      category: 'Lists',
      icon: 'list',
      verified: true,
      api: {
        endpoint: '/marketing/lists/{listId}',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the list',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'List data' }
      }
    },
    {
      id: 'get_lists',
      name: 'Get All Lists',
      description: 'Get all contact lists',
      category: 'Lists',
      icon: 'list',
      verified: true,
      api: {
        endpoint: '/marketing/lists',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        pageSize: {
          type: 'number',
          required: false,
          label: 'Page Size',
          default: 50,
          min: 1,
          max: 1000,
          description: 'Number of lists to return per page',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of contact lists' }
      }
    },
    {
      id: 'delete_list',
      name: 'Delete List',
      description: 'Delete a contact list',
      category: 'Lists',
      icon: 'trash',
      verified: true,
      api: {
        endpoint: '/marketing/lists/{listId}',
        method: 'DELETE',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the list to delete',
          aiControlled: false
        },
        deleteContacts: {
          type: 'boolean',
          required: false,
          label: 'Delete Contacts',
          default: false,
          description: 'Also delete all contacts in the list',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'add_contact_to_list',
      name: 'Add Contact to List',
      description: 'Add a contact to a list',
      category: 'Lists',
      icon: 'user-plus',
      verified: true,
      api: {
        endpoint: '/marketing/lists/{listId}/contacts',
        method: 'PUT',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the list',
          aiControlled: false
        },
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the contact to add',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'remove_contact_from_list',
      name: 'Remove Contact from List',
      description: 'Remove a contact from a list',
      category: 'Lists',
      icon: 'user-minus',
      verified: true,
      api: {
        endpoint: '/marketing/lists/{listId}/contacts',
        method: 'DELETE',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the list',
          aiControlled: false
        },
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the contact to remove',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // SEGMENT ACTIONS
    // ==========================================
    {
      id: 'create_segment',
      name: 'Create Segment',
      description: 'Create a new contact segment',
      category: 'Segments',
      icon: 'filter',
      verified: true,
      api: {
        endpoint: '/marketing/segments',
        method: 'POST',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Segment Name',
          placeholder: 'Active Subscribers',
          description: 'Name for the new segment',
          aiControlled: true,
          aiDescription: 'A descriptive name for the contact segment'
        },
        parentListId: {
          type: 'string',
          required: true,
          label: 'Parent List ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The list ID this segment is based on',
          aiControlled: false
        },
        queryDsl: {
          type: 'string',
          required: true,
          label: 'Query DSL',
          inputType: 'textarea',
          placeholder: '{"and":[{"field":"email","operator":"contains","value":"@example.com"}]}',
          description: 'Segment query in SendGrid DSL format (JSON)',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created segment data',
          properties: {
            id: { type: 'string', description: 'Segment ID' },
            name: { type: 'string', description: 'Segment name' }
          }
        }
      }
    },
    {
      id: 'update_segment',
      name: 'Update Segment',
      description: 'Update an existing segment',
      category: 'Segments',
      icon: 'edit',
      verified: true,
      api: {
        endpoint: '/marketing/segments/{segmentId}',
        method: 'PATCH',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        segmentId: {
          type: 'string',
          required: true,
          label: 'Segment ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the segment to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Segment Name',
          placeholder: 'Updated Segment Name',
          description: 'New name for the segment',
          aiControlled: true,
          aiDescription: 'The updated name for the segment'
        },
        queryDsl: {
          type: 'string',
          required: false,
          label: 'Query DSL',
          inputType: 'textarea',
          description: 'Updated segment query in SendGrid DSL format (JSON)',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated segment data' }
      }
    },
    {
      id: 'get_segment',
      name: 'Get Segment',
      description: 'Get information about a specific segment',
      category: 'Segments',
      icon: 'filter',
      verified: true,
      api: {
        endpoint: '/marketing/segments/{segmentId}',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        segmentId: {
          type: 'string',
          required: true,
          label: 'Segment ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the segment',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Segment data' }
      }
    },
    {
      id: 'get_segments',
      name: 'Get All Segments',
      description: 'Get all segments',
      category: 'Segments',
      icon: 'filter',
      verified: true,
      api: {
        endpoint: '/marketing/segments',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        parentListId: {
          type: 'string',
          required: false,
          label: 'Parent List ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'Filter segments by parent list ID',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of segments' }
      }
    },
    {
      id: 'delete_segment',
      name: 'Delete Segment',
      description: 'Delete a segment',
      category: 'Segments',
      icon: 'trash',
      verified: true,
      api: {
        endpoint: '/marketing/segments/{segmentId}',
        method: 'DELETE',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        segmentId: {
          type: 'string',
          required: true,
          label: 'Segment ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the segment to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // CAMPAIGN (SINGLE SEND) ACTIONS
    // ==========================================
    {
      id: 'create_campaign',
      name: 'Create Campaign',
      description: 'Create a new single send marketing campaign',
      category: 'Campaigns',
      icon: 'mail',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends',
        method: 'POST',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Campaign Name',
          placeholder: 'January Newsletter',
          description: 'Internal name for the campaign',
          aiControlled: true,
          aiDescription: 'A descriptive name for the marketing campaign'
        },
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Your Monthly Newsletter',
          description: 'Email subject line',
          aiControlled: true,
          aiDescription: 'An engaging email subject line that encourages recipients to open the email'
        },
        content: {
          type: 'string',
          required: true,
          label: 'HTML Content',
          inputType: 'textarea',
          placeholder: '<h1>Newsletter Content</h1>',
          description: 'HTML content of the campaign email',
          aiControlled: true,
          aiDescription: 'The HTML email body content with proper formatting, styling, and compelling copy'
        },
        plainContent: {
          type: 'string',
          required: false,
          label: 'Plain Text Content',
          inputType: 'textarea',
          placeholder: 'Newsletter content...',
          description: 'Plain text version of the email (auto-generated if not provided)',
          aiControlled: true,
          aiDescription: 'The plain text version of the email content'
        },
        listIds: {
          type: 'string',
          required: false,
          label: 'List IDs',
          placeholder: 'list-id-1, list-id-2',
          description: 'Comma-separated list IDs to send to',
          aiControlled: false
        },
        segmentIds: {
          type: 'string',
          required: false,
          label: 'Segment IDs',
          placeholder: 'segment-id-1, segment-id-2',
          description: 'Comma-separated segment IDs to send to',
          aiControlled: false
        },
        senderId: {
          type: 'number',
          required: false,
          label: 'Sender ID',
          description: 'ID of the verified sender identity',
          aiControlled: false
        },
        suppressionGroupId: {
          type: 'number',
          required: false,
          label: 'Suppression Group ID',
          description: 'ID of the unsubscribe group',
          aiControlled: false
        },
        categories: {
          type: 'string',
          required: false,
          label: 'Categories',
          placeholder: 'newsletter, monthly',
          description: 'Comma-separated categories for tracking',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created campaign data',
          properties: {
            id: { type: 'string', description: 'Campaign ID' },
            name: { type: 'string', description: 'Campaign name' },
            status: { type: 'string', description: 'Campaign status' }
          }
        }
      }
    },
    {
      id: 'update_campaign',
      name: 'Update Campaign',
      description: 'Update an existing campaign',
      category: 'Campaigns',
      icon: 'edit',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends/{campaignId}',
        method: 'PATCH',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the campaign to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Campaign Name',
          placeholder: 'Updated Campaign Name',
          description: 'New name for the campaign',
          aiControlled: true,
          aiDescription: 'The updated campaign name'
        },
        subject: {
          type: 'string',
          required: false,
          label: 'Subject',
          placeholder: 'Updated Subject Line',
          description: 'New email subject line',
          aiControlled: true,
          aiDescription: 'An updated engaging email subject line'
        },
        content: {
          type: 'string',
          required: false,
          label: 'HTML Content',
          inputType: 'textarea',
          description: 'Updated HTML content',
          aiControlled: true,
          aiDescription: 'The updated HTML email body content'
        },
        plainContent: {
          type: 'string',
          required: false,
          label: 'Plain Text Content',
          inputType: 'textarea',
          description: 'Updated plain text content',
          aiControlled: true,
          aiDescription: 'The updated plain text version of the email'
        },
        listIds: {
          type: 'string',
          required: false,
          label: 'List IDs',
          description: 'Updated comma-separated list IDs',
          aiControlled: false
        },
        segmentIds: {
          type: 'string',
          required: false,
          label: 'Segment IDs',
          description: 'Updated comma-separated segment IDs',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated campaign data' }
      }
    },
    {
      id: 'get_campaign',
      name: 'Get Campaign',
      description: 'Get information about a specific campaign',
      category: 'Campaigns',
      icon: 'mail',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends/{campaignId}',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the campaign',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Campaign data' }
      }
    },
    {
      id: 'get_campaigns',
      name: 'Get All Campaigns',
      description: 'Get all marketing campaigns',
      category: 'Campaigns',
      icon: 'mail',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        pageSize: {
          type: 'number',
          required: false,
          label: 'Page Size',
          default: 50,
          min: 1,
          max: 100,
          description: 'Number of campaigns to return per page',
          aiControlled: false
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status Filter',
          options: [
            { label: 'All', value: '' },
            { label: 'Draft', value: 'draft' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Sent', value: 'sent' },
            { label: 'Paused', value: 'paused' },
            { label: 'Canceled', value: 'canceled' }
          ],
          description: 'Filter by campaign status',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of campaigns' }
      }
    },
    {
      id: 'delete_campaign',
      name: 'Delete Campaign',
      description: 'Delete a marketing campaign',
      category: 'Campaigns',
      icon: 'trash',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends/{campaignId}',
        method: 'DELETE',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the campaign to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'send_campaign',
      name: 'Send Campaign',
      description: 'Send a campaign immediately or schedule it',
      category: 'Campaigns',
      icon: 'send',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends/{campaignId}/schedule',
        method: 'PUT',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the campaign to send',
          aiControlled: false
        },
        sendAt: {
          type: 'string',
          required: false,
          label: 'Send At',
          placeholder: '2024-01-15T10:00:00Z',
          description: 'Schedule time in ISO 8601 format (leave empty to send now)',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'pause_campaign',
      name: 'Pause Campaign',
      description: 'Pause a scheduled campaign',
      category: 'Campaigns',
      icon: 'pause',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends/{campaignId}/schedule',
        method: 'DELETE',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the campaign to pause',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'get_campaign_stats',
      name: 'Get Campaign Stats',
      description: 'Get statistics for a campaign',
      category: 'Campaigns',
      icon: 'bar-chart',
      verified: true,
      api: {
        endpoint: '/marketing/singlesends/{campaignId}/stats',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          description: 'The unique ID of the campaign',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Campaign statistics',
          properties: {
            sent: { type: 'number', description: 'Number of emails sent' },
            delivered: { type: 'number', description: 'Number of emails delivered' },
            opens: { type: 'number', description: 'Number of opens' },
            uniqueOpens: { type: 'number', description: 'Number of unique opens' },
            clicks: { type: 'number', description: 'Number of clicks' },
            uniqueClicks: { type: 'number', description: 'Number of unique clicks' },
            unsubscribes: { type: 'number', description: 'Number of unsubscribes' },
            bounces: { type: 'number', description: 'Number of bounces' },
            openRate: { type: 'number', description: 'Open rate percentage' },
            clickRate: { type: 'number', description: 'Click rate percentage' }
          }
        }
      }
    },

    // ==========================================
    // TEMPLATE ACTIONS
    // ==========================================
    {
      id: 'create_template',
      name: 'Create Template',
      description: 'Create a new email template',
      category: 'Templates',
      icon: 'file-text',
      verified: true,
      api: {
        endpoint: '/templates',
        method: 'POST',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Template Name',
          placeholder: 'Welcome Email Template',
          description: 'Name for the template',
          aiControlled: true,
          aiDescription: 'A descriptive name for the email template'
        },
        subject: {
          type: 'string',
          required: false,
          label: 'Subject',
          placeholder: 'Welcome to {{company_name}}!',
          description: 'Default subject line (supports handlebars)',
          aiControlled: true,
          aiDescription: 'The default email subject line for this template'
        },
        htmlContent: {
          type: 'string',
          required: true,
          label: 'HTML Content',
          inputType: 'textarea',
          placeholder: '<h1>Welcome {{first_name}}!</h1>',
          description: 'HTML template content (supports handlebars)',
          aiControlled: true,
          aiDescription: 'The HTML email template content with handlebars variables for personalization'
        },
        plainContent: {
          type: 'string',
          required: false,
          label: 'Plain Text Content',
          inputType: 'textarea',
          placeholder: 'Welcome {{first_name}}!',
          description: 'Plain text template content',
          aiControlled: true,
          aiDescription: 'The plain text version of the email template'
        },
        generation: {
          type: 'select',
          required: false,
          label: 'Template Type',
          default: 'dynamic',
          options: [
            { label: 'Dynamic (Recommended)', value: 'dynamic' },
            { label: 'Legacy', value: 'legacy' }
          ],
          description: 'Template generation type',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          description: 'Created template data',
          properties: {
            id: { type: 'string', description: 'Template ID' },
            name: { type: 'string', description: 'Template name' }
          }
        }
      }
    },
    {
      id: 'update_template',
      name: 'Update Template',
      description: 'Update an existing email template',
      category: 'Templates',
      icon: 'edit',
      verified: true,
      api: {
        endpoint: '/templates/{templateId}',
        method: 'PATCH',
        baseUrl: 'https://api.sendgrid.com/v3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        templateId: {
          type: 'string',
          required: true,
          label: 'Template ID',
          placeholder: 'd-xxxxxxxxxxxxxxxxxxxx',
          description: 'The unique ID of the template to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Template Name',
          placeholder: 'Updated Template Name',
          description: 'New name for the template',
          aiControlled: true,
          aiDescription: 'The updated template name'
        },
        subject: {
          type: 'string',
          required: false,
          label: 'Subject',
          description: 'Updated subject line',
          aiControlled: true,
          aiDescription: 'The updated email subject line'
        },
        htmlContent: {
          type: 'string',
          required: false,
          label: 'HTML Content',
          inputType: 'textarea',
          description: 'Updated HTML content',
          aiControlled: true,
          aiDescription: 'The updated HTML email template content'
        },
        plainContent: {
          type: 'string',
          required: false,
          label: 'Plain Text Content',
          inputType: 'textarea',
          description: 'Updated plain text content',
          aiControlled: true,
          aiDescription: 'The updated plain text version of the template'
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated template data' }
      }
    },
    {
      id: 'get_template',
      name: 'Get Template',
      description: 'Get information about a specific template',
      category: 'Templates',
      icon: 'file-text',
      verified: true,
      api: {
        endpoint: '/templates/{templateId}',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        templateId: {
          type: 'string',
          required: true,
          label: 'Template ID',
          placeholder: 'd-xxxxxxxxxxxxxxxxxxxx',
          description: 'The unique ID of the template',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Template data' }
      }
    },
    {
      id: 'get_templates',
      name: 'Get All Templates',
      description: 'Get all email templates',
      category: 'Templates',
      icon: 'file-text',
      verified: true,
      api: {
        endpoint: '/templates',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        generations: {
          type: 'select',
          required: false,
          label: 'Template Type',
          default: 'dynamic',
          options: [
            { label: 'Dynamic', value: 'dynamic' },
            { label: 'Legacy', value: 'legacy' }
          ],
          description: 'Filter by template generation type',
          aiControlled: false
        },
        pageSize: {
          type: 'number',
          required: false,
          label: 'Page Size',
          default: 50,
          min: 1,
          max: 200,
          description: 'Number of templates to return per page',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of templates' }
      }
    },
    {
      id: 'delete_template',
      name: 'Delete Template',
      description: 'Delete an email template',
      category: 'Templates',
      icon: 'trash',
      verified: true,
      api: {
        endpoint: '/templates/{templateId}',
        method: 'DELETE',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {
        templateId: {
          type: 'string',
          required: true,
          label: 'Template ID',
          placeholder: 'd-xxxxxxxxxxxxxxxxxxxx',
          description: 'The unique ID of the template to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // SENDER IDENTITY ACTIONS
    // ==========================================
    {
      id: 'get_senders',
      name: 'Get Sender Identities',
      description: 'Get all verified sender identities',
      category: 'Senders',
      icon: 'user-check',
      verified: true,
      api: {
        endpoint: '/verified_senders',
        method: 'GET',
        baseUrl: 'https://api.sendgrid.com/v3'
      },
      inputSchema: {},
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of verified senders' }
      }
    }
  ],

  // ============================================
  // SUPPORTED TRIGGERS - Webhook-based events
  // ============================================
  supported_triggers: [
    {
      id: 'email_delivered',
      name: 'Email Delivered',
      description: 'Triggers when an email is successfully delivered',
      eventType: 'delivered',
      icon: 'check-circle',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (delivered)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'email_opened',
      name: 'Email Opened',
      description: 'Triggers when a recipient opens an email',
      eventType: 'open',
      icon: 'eye',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (open)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' },
            useragent: { type: 'string', description: 'User agent of the opener' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'email_clicked',
      name: 'Link Clicked',
      description: 'Triggers when a recipient clicks a link in an email',
      eventType: 'click',
      icon: 'mouse-pointer',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (click)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' },
            url: { type: 'string', description: 'Clicked URL' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'email_bounced',
      name: 'Email Bounced',
      description: 'Triggers when an email bounces (hard or soft)',
      eventType: 'bounce',
      icon: 'alert-triangle',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (bounce)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' },
            reason: { type: 'string', description: 'Bounce reason' },
            type: { type: 'string', description: 'Bounce type (hard/soft)' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'email_dropped',
      name: 'Email Dropped',
      description: 'Triggers when an email is dropped (not sent)',
      eventType: 'dropped',
      icon: 'x-circle',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (dropped)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' },
            reason: { type: 'string', description: 'Drop reason' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'email_unsubscribed',
      name: 'Unsubscribed',
      description: 'Triggers when a recipient unsubscribes',
      eventType: 'unsubscribe',
      icon: 'user-minus',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (unsubscribe)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'spam_report',
      name: 'Spam Report',
      description: 'Triggers when a recipient marks an email as spam',
      eventType: 'spamreport',
      icon: 'alert-octagon',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (spamreport)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'group_unsubscribed',
      name: 'Group Unsubscribed',
      description: 'Triggers when a recipient unsubscribes from a specific group',
      eventType: 'group_unsubscribe',
      icon: 'users',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (group_unsubscribe)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' },
            asm_group_id: { type: 'number', description: 'Unsubscribe group ID' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'group_resubscribed',
      name: 'Group Resubscribed',
      description: 'Triggers when a recipient resubscribes to a specific group',
      eventType: 'group_resubscribe',
      icon: 'user-plus',
      verified: true,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {},
      outputSchema: {
        sendgridEvent: {
          type: 'object',
          description: 'SendGrid webhook event data',
          properties: {
            email: { type: 'string', description: 'Recipient email address' },
            timestamp: { type: 'number', description: 'Unix timestamp' },
            event: { type: 'string', description: 'Event type (group_resubscribe)' },
            sg_message_id: { type: 'string', description: 'SendGrid message ID' },
            asm_group_id: { type: 'number', description: 'Unsubscribe group ID' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    }
  ]
};
