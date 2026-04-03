// Salesforce Connector
// Comprehensive Salesforce CRM integration

import { ConnectorDefinition } from '../../shared';

export const SALESFORCE_CONNECTOR: ConnectorDefinition = {
  name: 'salesforce',
  display_name: 'Salesforce',
  category: 'crm',
  description: 'Comprehensive Salesforce CRM integration with support for accounts, contacts, leads, opportunities, cases, tasks, and custom objects',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authType',
      type: 'select',
      label: 'Authentication Type',
      required: true,
      default: 'oauth2',
      options: [
        { label: 'OAuth2 (Recommended - One-Click)', value: 'oauth2' },
        { label: 'Manual OAuth (Bring Your Own Credentials)', value: 'manual' }
      ],
      description: 'Choose how to authenticate with Salesforce'
    },
    {
      key: 'instanceUrl',
      label: 'Instance URL',
      type: 'select',
      required: true,
      default: 'https://login.salesforce.com',
      options: [
        { label: 'Production (https://login.salesforce.com)', value: 'https://login.salesforce.com' },
        { label: 'Sandbox (https://test.salesforce.com)', value: 'https://test.salesforce.com' }
      ],
      description: 'Salesforce environment to connect to'
    },
    {
      key: 'clientId',
      label: 'Client ID (Consumer Key)',
      type: 'string',
      required: true,
      placeholder: '3MVG9...',
      description: 'Your Salesforce Connected App Client ID',
      helpUrl: 'https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm',
      helpText: 'How to create a Connected App',
      displayOptions: { authType: ['manual'] }
    },
    {
      key: 'clientSecret',
      label: 'Client Secret (Consumer Secret)',
      type: 'password',
      required: true,
      placeholder: 'Enter client secret',
      description: 'Your Salesforce Connected App Client Secret',
      displayOptions: { authType: ['manual'] }
    }
  ],
  oauth_config: {
    authorization_url: 'https://login.salesforce.com/services/oauth2/authorize',
    token_url: 'https://login.salesforce.com/services/oauth2/token',
    scopes: [
      'api',
      'refresh_token',
      'full',
      'chatter_api'
    ]
  },
  endpoints: {
    base_url: 'https://login.salesforce.com',
    api_version: '/services/data/v58.0',
    query: '/services/data/v58.0/query',
    sobjects: '/services/data/v58.0/sobjects',
    search: '/services/data/v58.0/search',
    limits: '/services/data/v58.0/limits'
  },
  webhook_support: true,
  rate_limits: {
    api_calls_per_day: 15000,
    api_calls_per_hour: 5000
  },
  sandbox_available: true,
  supported_actions: [
    // Account Actions
    {
      id: 'create_account',
      name: 'Create Account',
      description: 'Create a new account (company) in Salesforce',
      category: 'Account',
      icon: 'building',
      verified: false,
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Account Name',
          placeholder: 'Acme Corporation',
          description: 'Name of the account/company',
          aiControlled: true,
          aiDescription: 'Name of the account/company to create'
        },
        website: {
          type: 'string',
          label: 'Website',
          inputType: 'url',
          placeholder: 'https://example.com',
          aiControlled: true,
          aiDescription: 'Website URL for the account'
        },
        phone: {
          type: 'string',
          label: 'Phone',
          placeholder: '+1 234 567 8900',
          aiControlled: true,
          aiDescription: 'Phone number for the account'
        },
        industry: {
          type: 'select',
          label: 'Industry',
          options: [
            { label: 'Technology', value: 'Technology' },
            { label: 'Healthcare', value: 'Healthcare' },
            { label: 'Finance', value: 'Finance' },
            { label: 'Manufacturing', value: 'Manufacturing' },
            { label: 'Retail', value: 'Retail' },
            { label: 'Other', value: 'Other' }
          ],
          aiControlled: false
        },
        type: {
          type: 'select',
          label: 'Account Type',
          options: [
            { label: 'Prospect', value: 'Prospect' },
            { label: 'Customer', value: 'Customer' },
            { label: 'Partner', value: 'Partner' }
          ],
          aiControlled: false
        },
        numberOfEmployees: {
          type: 'number',
          label: 'Number of Employees',
          min: 0,
          aiControlled: false
        },
        annualRevenue: {
          type: 'number',
          label: 'Annual Revenue',
          min: 0,
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'Description of the account'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created account ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'update_account',
      name: 'Update Account',
      description: 'Update an existing account in Salesforce',
      category: 'Account',
      icon: 'edit',
      verified: false,
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          placeholder: '001...',
          description: 'Salesforce account ID'
        },
        name: { type: 'string', label: 'Account Name' },
        website: { type: 'string', label: 'Website', inputType: 'url' },
        phone: { type: 'string', label: 'Phone' },
        industry: { type: 'string', label: 'Industry' },
        type: { type: 'string', label: 'Account Type' },
        numberOfEmployees: { type: 'number', label: 'Number of Employees' },
        annualRevenue: { type: 'number', label: 'Annual Revenue' }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_account',
      name: 'Get Account',
      description: 'Retrieve an account by ID',
      category: 'Account',
      icon: 'file-text',
      verified: false,
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          placeholder: '001...'
        }
      },
      outputSchema: {
        account: { type: 'object', description: 'Account information' }
      }
    },
    {
      id: 'get_all_accounts',
      name: 'Get All Accounts',
      description: 'Retrieve a list of accounts',
      category: 'Account',
      icon: 'list',
      verified: false,
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 2000,
          description: 'Maximum number of records to return'
        },
        conditions: {
          type: 'string',
          label: 'Filter Conditions',
          placeholder: 'Industry = \'Technology\'',
          description: 'SOQL WHERE clause conditions (optional)'
        }
      },
      outputSchema: {
        accounts: { type: 'array', description: 'List of accounts' },
        totalSize: { type: 'number', description: 'Total number of records' }
      }
    },
    // Contact Actions
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Create a new contact in Salesforce',
      category: 'Contact',
      icon: 'user-plus',
      verified: false,
      inputSchema: {
        firstName: {
          type: 'string',
          label: 'First Name',
          placeholder: 'John',
          aiControlled: true,
          aiDescription: 'First name of the contact'
        },
        lastName: {
          type: 'string',
          required: true,
          label: 'Last Name',
          placeholder: 'Doe',
          aiControlled: true,
          aiDescription: 'Last name of the contact'
        },
        email: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          placeholder: 'john.doe@example.com',
          aiControlled: true,
          aiDescription: 'Email address of the contact'
        },
        phone: {
          type: 'string',
          label: 'Phone',
          placeholder: '+1 234 567 8900',
          aiControlled: true,
          aiDescription: 'Phone number of the contact'
        },
        accountId: {
          type: 'string',
          label: 'Account ID',
          placeholder: '001...',
          description: 'Associated account/company ID',
          aiControlled: false
        },
        title: {
          type: 'string',
          label: 'Job Title',
          placeholder: 'Sales Manager',
          aiControlled: true,
          aiDescription: 'Job title of the contact'
        },
        department: {
          type: 'string',
          label: 'Department',
          placeholder: 'Sales',
          aiControlled: true,
          aiDescription: 'Department of the contact'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created contact ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Update an existing contact',
      category: 'Contact',
      icon: 'edit',
      verified: false,
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: '003...'
        },
        firstName: { type: 'string', label: 'First Name' },
        lastName: { type: 'string', label: 'Last Name' },
        email: { type: 'string', label: 'Email', inputType: 'email' },
        phone: { type: 'string', label: 'Phone' },
        title: { type: 'string', label: 'Job Title' },
        department: { type: 'string', label: 'Department' }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_contact',
      name: 'Get Contact',
      description: 'Retrieve a contact by ID',
      category: 'Contact',
      icon: 'user',
      verified: false,
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: '003...'
        }
      },
      outputSchema: {
        contact: { type: 'object', description: 'Contact information' }
      }
    },
    {
      id: 'get_all_contacts',
      name: 'Get All Contacts',
      description: 'Retrieve a list of contacts',
      category: 'Contact',
      icon: 'users',
      verified: false,
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 2000
        },
        conditions: {
          type: 'string',
          label: 'Filter Conditions',
          placeholder: 'Email != null'
        }
      },
      outputSchema: {
        contacts: { type: 'array', description: 'List of contacts' },
        totalSize: { type: 'number', description: 'Total number of records' }
      }
    },
    {
      id: 'delete_contact',
      name: 'Delete Contact',
      description: 'Delete a contact from Salesforce',
      category: 'Contact',
      icon: 'trash-2',
      verified: false,
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: '003...'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    // Lead Actions
    {
      id: 'create_lead',
      name: 'Create Lead',
      description: 'Create a new lead in Salesforce',
      category: 'Lead',
      icon: 'user-plus',
      verified: false,
      inputSchema: {
        firstName: { type: 'string', label: 'First Name' },
        lastName: {
          type: 'string',
          required: true,
          label: 'Last Name'
        },
        company: {
          type: 'string',
          required: true,
          label: 'Company'
        },
        email: {
          type: 'string',
          label: 'Email',
          inputType: 'email'
        },
        phone: { type: 'string', label: 'Phone' },
        status: {
          type: 'select',
          label: 'Lead Status',
          default: 'Open',
          options: [
            { label: 'Open', value: 'Open' },
            { label: 'Contacted', value: 'Contacted' },
            { label: 'Qualified', value: 'Qualified' },
            { label: 'Unqualified', value: 'Unqualified' }
          ]
        },
        leadSource: {
          type: 'select',
          label: 'Lead Source',
          options: [
            { label: 'Web', value: 'Web' },
            { label: 'Phone Inquiry', value: 'Phone Inquiry' },
            { label: 'Partner Referral', value: 'Partner Referral' },
            { label: 'Purchased List', value: 'Purchased List' },
            { label: 'Other', value: 'Other' }
          ]
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created lead ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'update_lead',
      name: 'Update Lead',
      description: 'Update an existing lead',
      category: 'Lead',
      icon: 'edit',
      verified: false,
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          placeholder: '00Q...'
        },
        firstName: { type: 'string', label: 'First Name' },
        lastName: { type: 'string', label: 'Last Name' },
        company: { type: 'string', label: 'Company' },
        email: { type: 'string', label: 'Email', inputType: 'email' },
        phone: { type: 'string', label: 'Phone' },
        status: { type: 'string', label: 'Lead Status' }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_lead',
      name: 'Get Lead',
      description: 'Retrieve a lead by ID',
      category: 'Lead',
      icon: 'file-text',
      verified: false,
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          placeholder: '00Q...'
        }
      },
      outputSchema: {
        lead: { type: 'object', description: 'Lead information' }
      }
    },
    {
      id: 'get_all_leads',
      name: 'Get All Leads',
      description: 'Retrieve a list of leads',
      category: 'Lead',
      icon: 'list',
      verified: false,
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 2000
        },
        conditions: {
          type: 'string',
          label: 'Filter Conditions',
          placeholder: 'Status = \'Open\''
        }
      },
      outputSchema: {
        leads: { type: 'array', description: 'List of leads' },
        totalSize: { type: 'number', description: 'Total number of records' }
      }
    },
    {
      id: 'delete_lead',
      name: 'Delete Lead',
      description: 'Delete a lead from Salesforce',
      category: 'Lead',
      icon: 'trash-2',
      verified: false,
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          placeholder: '00Q...'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    // Opportunity Actions
    {
      id: 'create_opportunity',
      name: 'Create Opportunity',
      description: 'Create a new opportunity (deal) in Salesforce',
      category: 'Opportunity',
      icon: 'briefcase',
      verified: false,
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Opportunity Name',
          placeholder: 'Enterprise Deal - Q4 2024'
        },
        amount: {
          type: 'number',
          label: 'Amount',
          min: 0,
          placeholder: '50000'
        },
        closeDate: {
          type: 'string',
          required: true,
          label: 'Close Date',
          placeholder: '2024-12-31',
          description: 'Expected close date (YYYY-MM-DD)'
        },
        stageName: {
          type: 'select',
          required: true,
          label: 'Stage',
          default: 'Prospecting',
          options: [
            { label: 'Prospecting', value: 'Prospecting' },
            { label: 'Qualification', value: 'Qualification' },
            { label: 'Needs Analysis', value: 'Needs Analysis' },
            { label: 'Proposal', value: 'Proposal/Price Quote' },
            { label: 'Negotiation', value: 'Negotiation/Review' },
            { label: 'Closed Won', value: 'Closed Won' },
            { label: 'Closed Lost', value: 'Closed Lost' }
          ]
        },
        accountId: {
          type: 'string',
          label: 'Account ID',
          placeholder: '001...'
        },
        probability: {
          type: 'number',
          label: 'Probability (%)',
          min: 0,
          max: 100
        },
        type: {
          type: 'select',
          label: 'Opportunity Type',
          options: [
            { label: 'New Business', value: 'New Business' },
            { label: 'Existing Business', value: 'Existing Business' }
          ]
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created opportunity ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'update_opportunity',
      name: 'Update Opportunity',
      description: 'Update an existing opportunity',
      category: 'Opportunity',
      icon: 'edit',
      verified: false,
      inputSchema: {
        opportunityId: {
          type: 'string',
          required: true,
          label: 'Opportunity ID',
          placeholder: '006...'
        },
        name: { type: 'string', label: 'Opportunity Name' },
        amount: { type: 'number', label: 'Amount', min: 0 },
        closeDate: { type: 'string', label: 'Close Date' },
        stageName: { type: 'string', label: 'Stage' },
        probability: { type: 'number', label: 'Probability (%)', min: 0, max: 100 }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_opportunity',
      name: 'Get Opportunity',
      description: 'Retrieve an opportunity by ID',
      category: 'Opportunity',
      icon: 'file-text',
      verified: false,
      inputSchema: {
        opportunityId: {
          type: 'string',
          required: true,
          label: 'Opportunity ID',
          placeholder: '006...'
        }
      },
      outputSchema: {
        opportunity: { type: 'object', description: 'Opportunity information' }
      }
    },
    {
      id: 'get_all_opportunities',
      name: 'Get All Opportunities',
      description: 'Retrieve a list of opportunities',
      category: 'Opportunity',
      icon: 'list',
      verified: false,
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 2000
        },
        conditions: {
          type: 'string',
          label: 'Filter Conditions',
          placeholder: 'StageName = \'Prospecting\''
        }
      },
      outputSchema: {
        opportunities: { type: 'array', description: 'List of opportunities' },
        totalSize: { type: 'number', description: 'Total number of records' }
      }
    },
    {
      id: 'delete_opportunity',
      name: 'Delete Opportunity',
      description: 'Delete an opportunity from Salesforce',
      category: 'Opportunity',
      icon: 'trash-2',
      verified: false,
      inputSchema: {
        opportunityId: {
          type: 'string',
          required: true,
          label: 'Opportunity ID',
          placeholder: '006...'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    // Case Actions
    {
      id: 'create_case',
      name: 'Create Case',
      description: 'Create a new case (support ticket) in Salesforce',
      category: 'Case',
      icon: 'alert-circle',
      verified: false,
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Customer issue with product'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea'
        },
        status: {
          type: 'select',
          label: 'Status',
          default: 'New',
          options: [
            { label: 'New', value: 'New' },
            { label: 'Working', value: 'Working' },
            { label: 'Escalated', value: 'Escalated' },
            { label: 'Closed', value: 'Closed' }
          ]
        },
        priority: {
          type: 'select',
          label: 'Priority',
          default: 'Medium',
          options: [
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' }
          ]
        },
        origin: {
          type: 'select',
          label: 'Case Origin',
          options: [
            { label: 'Email', value: 'Email' },
            { label: 'Phone', value: 'Phone' },
            { label: 'Web', value: 'Web' }
          ]
        },
        accountId: { type: 'string', label: 'Account ID' },
        contactId: { type: 'string', label: 'Contact ID' }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created case ID' },
        caseNumber: { type: 'string', description: 'Case number' }
      }
    },
    {
      id: 'update_case',
      name: 'Update Case',
      description: 'Update an existing case',
      category: 'Case',
      icon: 'edit',
      verified: false,
      inputSchema: {
        caseId: {
          type: 'string',
          required: true,
          label: 'Case ID',
          placeholder: '500...'
        },
        subject: { type: 'string', label: 'Subject' },
        description: { type: 'string', label: 'Description', inputType: 'textarea' },
        status: { type: 'string', label: 'Status' },
        priority: { type: 'string', label: 'Priority' }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_case',
      name: 'Get Case',
      description: 'Retrieve a case by ID',
      category: 'Case',
      icon: 'file-text',
      verified: false,
      inputSchema: {
        caseId: {
          type: 'string',
          required: true,
          label: 'Case ID',
          placeholder: '500...'
        }
      },
      outputSchema: {
        case: { type: 'object', description: 'Case information' }
      }
    },
    {
      id: 'get_all_cases',
      name: 'Get All Cases',
      description: 'Retrieve a list of cases',
      category: 'Case',
      icon: 'list',
      verified: false,
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 2000
        },
        conditions: {
          type: 'string',
          label: 'Filter Conditions',
          placeholder: 'Status = \'New\''
        }
      },
      outputSchema: {
        cases: { type: 'array', description: 'List of cases' },
        totalSize: { type: 'number', description: 'Total number of records' }
      }
    },
    // Task Actions
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Create a new task/activity in Salesforce',
      category: 'Task',
      icon: 'check-square',
      verified: false,
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Follow up with customer'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea'
        },
        activityDate: {
          type: 'string',
          label: 'Due Date',
          placeholder: '2024-12-31',
          description: 'Task due date (YYYY-MM-DD)'
        },
        priority: {
          type: 'select',
          label: 'Priority',
          default: 'Normal',
          options: [
            { label: 'High', value: 'High' },
            { label: 'Normal', value: 'Normal' },
            { label: 'Low', value: 'Low' }
          ]
        },
        status: {
          type: 'select',
          label: 'Status',
          default: 'Not Started',
          options: [
            { label: 'Not Started', value: 'Not Started' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Waiting', value: 'Waiting' },
            { label: 'Deferred', value: 'Deferred' }
          ]
        },
        whoId: {
          type: 'string',
          label: 'Related To (Contact/Lead ID)',
          placeholder: '003... or 00Q...'
        },
        whatId: {
          type: 'string',
          label: 'Related To (Account/Opportunity ID)',
          placeholder: '001... or 006...'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created task ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'update_task',
      name: 'Update Task',
      description: 'Update an existing task',
      category: 'Task',
      icon: 'edit',
      verified: false,
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '00T...'
        },
        subject: { type: 'string', label: 'Subject' },
        description: { type: 'string', label: 'Description', inputType: 'textarea' },
        activityDate: { type: 'string', label: 'Due Date' },
        priority: { type: 'string', label: 'Priority' },
        status: { type: 'string', label: 'Status' }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_task',
      name: 'Get Task',
      description: 'Retrieve a task by ID',
      category: 'Task',
      icon: 'file-text',
      verified: false,
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '00T...'
        }
      },
      outputSchema: {
        task: { type: 'object', description: 'Task information' }
      }
    },
    {
      id: 'get_all_tasks',
      name: 'Get All Tasks',
      description: 'Retrieve a list of tasks',
      category: 'Task',
      icon: 'list',
      verified: false,
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 2000
        },
        conditions: {
          type: 'string',
          label: 'Filter Conditions',
          placeholder: 'Status = \'Not Started\''
        }
      },
      outputSchema: {
        tasks: { type: 'array', description: 'List of tasks' },
        totalSize: { type: 'number', description: 'Total number of records' }
      }
    },
    {
      id: 'delete_task',
      name: 'Delete Task',
      description: 'Delete a task from Salesforce',
      category: 'Task',
      icon: 'trash-2',
      verified: false,
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '00T...'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    // Search & Query Actions
    {
      id: 'search_records',
      name: 'Search Records',
      description: 'Search across multiple objects using SOSL',
      category: 'Search',
      icon: 'search',
      verified: false,
      inputSchema: {
        searchTerm: {
          type: 'string',
          required: true,
          label: 'Search Term',
          placeholder: 'Acme'
        },
        objectTypes: {
          type: 'array',
          label: 'Object Types',
          description: 'Objects to search (e.g., Account, Contact, Lead)',
          itemSchema: {
            value: { type: 'string' }
          }
        }
      },
      outputSchema: {
        searchRecords: { type: 'array', description: 'Matching records' }
      }
    },
    {
      id: 'execute_soql',
      name: 'Execute SOQL Query',
      description: 'Execute a custom SOQL query',
      category: 'Query',
      icon: 'code',
      verified: false,
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'SOQL Query',
          inputType: 'textarea',
          placeholder: 'SELECT Id, Name FROM Account WHERE Industry = \'Technology\'',
          description: 'Salesforce Object Query Language (SOQL) query'
        }
      },
      outputSchema: {
        records: { type: 'array', description: 'Query results' },
        totalSize: { type: 'number', description: 'Total number of records' },
        done: { type: 'boolean', description: 'Whether all records were retrieved' }
      }
    },
    // Custom Object Actions
    {
      id: 'create_custom_object',
      name: 'Create Custom Object Record',
      description: 'Create a record in a custom Salesforce object',
      category: 'Custom Object',
      icon: 'plus-circle',
      verified: false,
      inputSchema: {
        objectName: {
          type: 'string',
          required: true,
          label: 'Object API Name',
          placeholder: 'Custom_Object__c',
          description: 'API name of the custom object'
        },
        fields: {
          type: 'object',
          required: true,
          label: 'Field Values',
          inputType: 'json',
          description: 'Field names and values as JSON object'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created record ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'update_custom_object',
      name: 'Update Custom Object Record',
      description: 'Update a record in a custom Salesforce object',
      category: 'Custom Object',
      icon: 'edit',
      verified: false,
      inputSchema: {
        objectName: {
          type: 'string',
          required: true,
          label: 'Object API Name',
          placeholder: 'Custom_Object__c'
        },
        recordId: {
          type: 'string',
          required: true,
          label: 'Record ID'
        },
        fields: {
          type: 'object',
          required: true,
          label: 'Field Values',
          inputType: 'json'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_custom_object',
      name: 'Get Custom Object Record',
      description: 'Retrieve a custom object record by ID',
      category: 'Custom Object',
      icon: 'file-text',
      verified: false,
      inputSchema: {
        objectName: {
          type: 'string',
          required: true,
          label: 'Object API Name',
          placeholder: 'Custom_Object__c'
        },
        recordId: {
          type: 'string',
          required: true,
          label: 'Record ID'
        }
      },
      outputSchema: {
        record: { type: 'object', description: 'Record data' }
      }
    }
  ],
  supported_triggers: [
    {
      id: 'record_created',
      name: 'Record Created',
      description: 'Triggered when a new record is created in Salesforce (uses polling)',
      eventType: 'record.created',
      verified: false,
      icon: 'plus-circle',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        objectType: {
          type: 'select',
          required: true,
          label: 'Object Type',
          options: [
            { label: 'Account', value: 'Account' },
            { label: 'Contact', value: 'Contact' },
            { label: 'Lead', value: 'Lead' },
            { label: 'Opportunity', value: 'Opportunity' },
            { label: 'Case', value: 'Case' },
            { label: 'Task', value: 'Task' }
          ],
          description: 'Type of Salesforce object to monitor'
        }
      },
      outputSchema: {
        recordId: { type: 'string', description: 'Created record ID' },
        objectType: { type: 'string', description: 'Object type' },
        record: { type: 'object', description: 'Complete record data' },
        createdDate: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'record_updated',
      name: 'Record Updated',
      description: 'Triggered when a record is updated in Salesforce (uses polling)',
      eventType: 'record.updated',
      verified: false,
      icon: 'edit',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        objectType: {
          type: 'select',
          required: true,
          label: 'Object Type',
          options: [
            { label: 'Account', value: 'Account' },
            { label: 'Contact', value: 'Contact' },
            { label: 'Lead', value: 'Lead' },
            { label: 'Opportunity', value: 'Opportunity' },
            { label: 'Case', value: 'Case' },
            { label: 'Task', value: 'Task' }
          ]
        }
      },
      outputSchema: {
        recordId: { type: 'string', description: 'Updated record ID' },
        objectType: { type: 'string', description: 'Object type' },
        record: { type: 'object', description: 'Updated record data' },
        updatedFields: { type: 'array', description: 'List of changed fields' },
        lastModifiedDate: { type: 'string', description: 'Last modified timestamp' }
      }
    },
    {
      id: 'record_deleted',
      name: 'Record Deleted',
      description: 'Triggered when a record is deleted from Salesforce (uses polling)',
      eventType: 'record.deleted',
      verified: false,
      icon: 'trash-2',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        objectType: {
          type: 'select',
          required: true,
          label: 'Object Type',
          options: [
            { label: 'Account', value: 'Account' },
            { label: 'Contact', value: 'Contact' },
            { label: 'Lead', value: 'Lead' },
            { label: 'Opportunity', value: 'Opportunity' },
            { label: 'Case', value: 'Case' },
            { label: 'Task', value: 'Task' }
          ]
        }
      },
      outputSchema: {
        recordId: { type: 'string', description: 'Deleted record ID' },
        objectType: { type: 'string', description: 'Object type' },
        deletedDate: { type: 'string', description: 'Deletion timestamp' }
      }
    },
    {
      id: 'opportunity_stage_changed',
      name: 'Opportunity Stage Changed',
      description: 'Triggered when an opportunity stage is changed (uses polling)',
      eventType: 'opportunity.stage_changed',
      verified: false,
      icon: 'trending-up',
      webhookRequired: false,
      pollingEnabled: true,
      outputSchema: {
        opportunityId: { type: 'string', description: 'Opportunity ID' },
        name: { type: 'string', description: 'Opportunity name' },
        previousStage: { type: 'string', description: 'Previous stage name' },
        newStage: { type: 'string', description: 'New stage name' },
        amount: { type: 'number', description: 'Opportunity amount' },
        closeDate: { type: 'string', description: 'Expected close date' }
      }
    },
    {
      id: 'lead_converted',
      name: 'Lead Converted',
      description: 'Triggered when a lead is converted to account/contact/opportunity (uses polling)',
      eventType: 'lead.converted',
      verified: false,
      icon: 'git-merge',
      webhookRequired: false,
      pollingEnabled: true,
      outputSchema: {
        leadId: { type: 'string', description: 'Converted lead ID' },
        accountId: { type: 'string', description: 'Created account ID' },
        contactId: { type: 'string', description: 'Created contact ID' },
        opportunityId: { type: 'string', description: 'Created opportunity ID' },
        convertedDate: { type: 'string', description: 'Conversion timestamp' }
      }
    },
    {
      id: 'case_escalated',
      name: 'Case Escalated',
      description: 'Triggered when a case is escalated (uses polling)',
      eventType: 'case.escalated',
      verified: false,
      icon: 'alert-triangle',
      webhookRequired: false,
      pollingEnabled: true,
      outputSchema: {
        caseId: { type: 'string', description: 'Case ID' },
        caseNumber: { type: 'string', description: 'Case number' },
        subject: { type: 'string', description: 'Case subject' },
        priority: { type: 'string', description: 'Case priority' },
        status: { type: 'string', description: 'Case status' },
        escalatedDate: { type: 'string', description: 'Escalation timestamp' }
      }
    }
  ]
};
