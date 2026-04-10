import type { JsonObject, JsonValue } from './json';

// Connector TypeScript types for frontend UI system

export interface ConnectorCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  domain?: string;
  subdomain?: string;
  instanceUrl?: string;
  webhookSecret?: string;
  [key: string]: string | undefined;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  type: ConnectorType;
  category: ConnectorCategory;
  credentials: ConnectorCredentials;
  settings?: JsonObject;
  isActive?: boolean;
  status: 'active' | 'inactive' | 'error' | 'testing';
  lastTested?: Date;
  lastUsed?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  projectId?: string;
  appId?: string;
  workflowId?: string;
}

export interface ConnectorFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'password' | 'url' | 'email' | 'select' | 'multiselect';
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{label: string; value: string}>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ConnectorMetadata {
  name: string;
  displayName: string;
  description: string;
  category: ConnectorCategory;
  logoUrl?: string;
  documentationUrl?: string;
  authType: AuthType;
  requiredFields: Record<string, ConnectorFieldSchema>;
  optionalFields: Record<string, ConnectorFieldSchema>;
  testConnectionSupported: boolean;
  webhookSupported: boolean;
  rateLimitInfo?: string;
  pricingInfo?: string;
  popularActions?: string[];
  tags: string[];
}

export interface ConnectorTestResult {
  success: boolean;
  message: string;
  details?: JsonValue;
  responseTime?: number;
  timestamp: Date;
}

export interface ConnectorUsageStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecution?: Date;
  avgResponseTime: number;
  currentMonth: {
    executions: number;
    errors: number;
  };
  previousMonth: {
    executions: number;
    errors: number;
  };
}

export const ConnectorCategory = {
  AI: 'ai',
  ANALYTICS: 'analytics',
  COMMUNICATION: 'communication',
  CRM: 'crm',
  DATABASE: 'database',
  DEVELOPMENT: 'development',
  ECOMMERCE: 'ecommerce',
  FINANCE: 'finance',
  FORMS: 'forms',
  MARKETING: 'marketing',
  PROJECT_MANAGEMENT: 'project_management',
  SOCIAL: 'social',
  STORAGE: 'storage',
  SUPPORT: 'support',
  VIDEO: 'video'
} as const;

export type ConnectorCategory = typeof ConnectorCategory[keyof typeof ConnectorCategory];

export const ConnectorType = {
  // AI
  ANTHROPIC: 'anthropic',
  AWS_BEDROCK: 'aws-bedrock',
  GOOGLE_AI: 'google-ai',
  OPENAI: 'openai',
  
  // Analytics
  GOOGLE_ANALYTICS: 'google-analytics',
  MIXPANEL: 'mixpanel',
  SEGMENT: 'segment',
  
  // Communication
  DISCORD: 'discord',
  GMAIL: 'gmail',
  SLACK: 'slack',
  TEAMS: 'teams',
  TWILIO: 'twilio',
  
  // CRM
  AIRTABLE: 'airtable',
  HUBSPOT: 'hubspot',
  MONDAY: 'monday',
  PIPEDRIVE: 'pipedrive',
  SALESFORCE: 'salesforce',
  ZOHO: 'zoho',
  
  // Development
  GITHUB: 'github',
  
  // E-commerce
  PAYPAL: 'paypal',
  SHOPIFY: 'shopify',
  STRIPE: 'stripe',
  WOOCOMMERCE: 'woocommerce',
  
  // Finance
  PLAID: 'plaid',
  
  // Forms
  GOOGLE_FORMS: 'google-forms',
  JOTFORM: 'jotform',
  TYPEFORM: 'typeform',
  
  // Marketing
  FACEBOOK_ADS: 'facebook-ads',
  GOOGLE_ADS: 'google-ads',
  KLAVIYO: 'klaviyo',
  MAILCHIMP: 'mailchimp',
  SENDGRID: 'sendgrid',
  
  // Project Management
  ASANA: 'asana',
  JIRA: 'jira',
  LINEAR: 'linear',
  NOTION: 'notion',
  TRELLO: 'trello',
  
  // Social
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  
  // Storage
  AWS_S3: 'aws-s3',
  DROPBOX: 'dropbox',
  GOOGLE_DRIVE: 'google-drive',
  GOOGLE_SHEETS: 'google-sheets',
  MONGODB: 'mongodb',
  MYSQL: 'mysql',
  
  // Support
  FRESHDESK: 'freshdesk',
  INTERCOM: 'intercom',
  ZENDESK: 'zendesk',
  
  // Video
  YOUTUBE: 'youtube',
  ZOOM: 'zoom'
} as const;

export type ConnectorType = typeof ConnectorType[keyof typeof ConnectorType];

export const AuthType = {
  API_KEY: 'api_key',
  OAUTH2: 'oauth2',
  BASIC_AUTH: 'basic_auth',
  BEARER_TOKEN: 'bearer_token',
  CUSTOM: 'custom'
} as const;

export type AuthType = typeof AuthType[keyof typeof AuthType];

// Connector registry with metadata for all 54 connectors
export const CONNECTOR_REGISTRY: Record<ConnectorType, ConnectorMetadata> = {
  // AI Connectors
  [ConnectorType.ANTHROPIC]: {
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Anthropic Claude AI integration for advanced text generation and analysis',
    category: ConnectorCategory.AI,
    logoUrl: '/logos/anthropic.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'Your Anthropic API key',
        required: true,
        placeholder: 'sk-ant-...'
      }
    },
    optionalFields: {
      baseUrl: {
        type: 'url',
        label: 'Base URL',
        description: 'Custom API base URL (optional)',
        required: false,
        placeholder: 'https://api.anthropic.com'
      }
    },
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Generate text', 'Analyze content', 'Summarize'],
    tags: ['AI', 'Text Generation', 'Analysis']
  },
  
  [ConnectorType.AWS_BEDROCK]: {
    name: 'aws-bedrock',
    displayName: 'AWS Bedrock',
    description: 'AWS Bedrock foundation models for AI applications',
    category: ConnectorCategory.AI,
    logoUrl: '/logos/aws-bedrock.svg',
    authType: AuthType.CUSTOM,
    requiredFields: {
      accessKeyId: {
        type: 'string',
        label: 'Access Key ID',
        description: 'AWS Access Key ID',
        required: true,
        placeholder: 'AKIA...'
      },
      secretAccessKey: {
        type: 'password',
        label: 'Secret Access Key',
        description: 'AWS Secret Access Key',
        required: true,
        placeholder: '...'
      },
      region: {
        type: 'select',
        label: 'Region',
        description: 'AWS region for Bedrock',
        required: true,
        options: [
          { label: 'US East 1', value: 'us-east-1' },
          { label: 'US West 2', value: 'us-west-2' },
          { label: 'EU West 1', value: 'eu-west-1' }
        ]
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Generate text', 'Generate images', 'Analyze content'],
    tags: ['AI', 'AWS', 'Foundation Models']
  },

  [ConnectorType.GOOGLE_AI]: {
    name: 'google-ai',
    displayName: 'Google AI',
    description: 'Google AI platform integration including Gemini models',
    category: ConnectorCategory.AI,
    logoUrl: '/logos/google-ai.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'Your Google AI API key',
        required: true,
        placeholder: 'AIza...'
      }
    },
    optionalFields: {
      projectId: {
        type: 'string',
        label: 'Project ID',
        description: 'Google Cloud project ID',
        required: false,
        placeholder: 'your-project-id'
      }
    },
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Generate text', 'Analyze images', 'Translate'],
    tags: ['AI', 'Google', 'Gemini']
  },

  [ConnectorType.OPENAI]: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI GPT models for text generation, analysis, and more',
    category: ConnectorCategory.AI,
    logoUrl: '/logos/openai.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'Your OpenAI API key',
        required: true,
        placeholder: 'sk-...'
      }
    },
    optionalFields: {
      organization: {
        type: 'string',
        label: 'Organization ID',
        description: 'OpenAI organization ID (optional)',
        required: false,
        placeholder: 'org-...'
      }
    },
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Generate text', 'Create images', 'Transcribe audio'],
    tags: ['AI', 'GPT', 'DALL-E']
  },

  // Analytics Connectors
  [ConnectorType.GOOGLE_ANALYTICS]: {
    name: 'google-analytics',
    displayName: 'Google Analytics',
    description: 'Google Analytics integration for web analytics data',
    category: ConnectorCategory.ANALYTICS,
    logoUrl: '/logos/google-analytics.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {
      propertyId: {
        type: 'string',
        label: 'Property ID',
        description: 'Google Analytics property ID',
        required: true,
        placeholder: '123456789'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Get reports', 'Track events', 'Get real-time data'],
    tags: ['Analytics', 'Google', 'Web Analytics']
  },

  [ConnectorType.MIXPANEL]: {
    name: 'mixpanel',
    displayName: 'Mixpanel',
    description: 'Mixpanel analytics for product and user behavior tracking',
    category: ConnectorCategory.ANALYTICS,
    logoUrl: '/logos/mixpanel.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      projectToken: {
        type: 'string',
        label: 'Project Token',
        description: 'Mixpanel project token',
        required: true,
        placeholder: 'your-project-token'
      },
      apiSecret: {
        type: 'password',
        label: 'API Secret',
        description: 'Mixpanel API secret',
        required: true,
        placeholder: 'your-api-secret'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Track events', 'Get funnels', 'Export data'],
    tags: ['Analytics', 'Product Analytics', 'User Tracking']
  },

  [ConnectorType.SEGMENT]: {
    name: 'segment',
    displayName: 'Segment',
    description: 'Segment customer data platform integration',
    category: ConnectorCategory.ANALYTICS,
    logoUrl: '/logos/segment.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      writeKey: {
        type: 'string',
        label: 'Write Key',
        description: 'Segment write key for data ingestion',
        required: true,
        placeholder: 'your-write-key'
      }
    },
    optionalFields: {
      accessToken: {
        type: 'password',
        label: 'Access Token',
        description: 'Personal access token for API access',
        required: false,
        placeholder: 'your-access-token'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Track events', 'Identify users', 'Create audiences'],
    tags: ['Analytics', 'Customer Data', 'CDP']
  },

  // Communication Connectors
  [ConnectorType.DISCORD]: {
    name: 'discord',
    displayName: 'Discord',
    description: 'Discord messaging and community management',
    category: ConnectorCategory.COMMUNICATION,
    logoUrl: '/logos/discord.svg',
    authType: AuthType.BEARER_TOKEN,
    requiredFields: {
      botToken: {
        type: 'password',
        label: 'Bot Token',
        description: 'Discord bot token',
        required: true,
        placeholder: 'your-bot-token'
      }
    },
    optionalFields: {
      guildId: {
        type: 'string',
        label: 'Guild ID',
        description: 'Default Discord server ID',
        required: false,
        placeholder: 'guild-id'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send messages', 'Create channels', 'Manage roles'],
    tags: ['Communication', 'Messaging', 'Community']
  },

  [ConnectorType.GMAIL]: {
    name: 'gmail',
    displayName: 'Gmail',
    description: 'Gmail email integration for sending and managing emails',
    category: ConnectorCategory.COMMUNICATION,
    logoUrl: '/logos/gmail.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send emails', 'Read inbox', 'Search emails'],
    tags: ['Email', 'Communication', 'Google']
  },

  [ConnectorType.SLACK]: {
    name: 'slack',
    displayName: 'Slack',
    description: 'Slack team communication and workflow automation',
    category: ConnectorCategory.COMMUNICATION,
    logoUrl: '/logos/slack.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      workspaceUrl: {
        type: 'url',
        label: 'Workspace URL',
        description: 'Your Slack workspace URL',
        required: false,
        placeholder: 'https://yourteam.slack.com'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send messages', 'Create channels', 'Schedule messages'],
    tags: ['Communication', 'Team Chat', 'Collaboration']
  },

  [ConnectorType.TEAMS]: {
    name: 'teams',
    displayName: 'Microsoft Teams',
    description: 'Microsoft Teams integration for communication and collaboration',
    category: ConnectorCategory.COMMUNICATION,
    logoUrl: '/logos/teams.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      tenantId: {
        type: 'string',
        label: 'Tenant ID',
        description: 'Microsoft tenant ID',
        required: false,
        placeholder: 'your-tenant-id'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send messages', 'Create meetings', 'Manage channels'],
    tags: ['Communication', 'Microsoft', 'Video Conferencing']
  },

  [ConnectorType.TWILIO]: {
    name: 'twilio',
    displayName: 'Twilio',
    description: 'Twilio SMS, voice, and video communications platform',
    category: ConnectorCategory.COMMUNICATION,
    logoUrl: '/logos/twilio.svg',
    authType: AuthType.BASIC_AUTH,
    requiredFields: {
      accountSid: {
        type: 'string',
        label: 'Account SID',
        description: 'Twilio Account SID',
        required: true,
        placeholder: 'AC...'
      },
      authToken: {
        type: 'password',
        label: 'Auth Token',
        description: 'Twilio Auth Token',
        required: true,
        placeholder: 'your-auth-token'
      },
      phoneNumber: {
        type: 'string',
        label: 'Phone Number',
        description: 'Twilio phone number',
        required: true,
        placeholder: '+1234567890'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send SMS', 'Make calls', 'Send WhatsApp'],
    tags: ['Communication', 'SMS', 'Voice', 'WhatsApp']
  },

  // CRM Connectors
  [ConnectorType.AIRTABLE]: {
    name: 'airtable',
    displayName: 'Airtable',
    description: 'Airtable database and collaboration platform',
    category: ConnectorCategory.CRM,
    logoUrl: '/logos/airtable.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'Airtable API key',
        required: true,
        placeholder: 'key...'
      },
      baseId: {
        type: 'string',
        label: 'Base ID',
        description: 'Airtable base ID',
        required: true,
        placeholder: 'app...'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create records', 'Update records', 'List records'],
    tags: ['Database', 'CRM', 'Collaboration']
  },

  [ConnectorType.HUBSPOT]: {
    name: 'hubspot',
    displayName: 'HubSpot',
    description: 'HubSpot CRM and marketing automation platform',
    category: ConnectorCategory.CRM,
    logoUrl: '/logos/hubspot.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      portalId: {
        type: 'string',
        label: 'Portal ID',
        description: 'HubSpot portal ID',
        required: false,
        placeholder: 'your-portal-id'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Manage contacts', 'Create deals', 'Track activities'],
    tags: ['CRM', 'Marketing', 'Sales']
  },

  [ConnectorType.MONDAY]: {
    name: 'monday',
    displayName: 'Monday.com',
    description: 'Monday.com work operating system for project management',
    category: ConnectorCategory.CRM,
    logoUrl: '/logos/monday.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiToken: {
        type: 'password',
        label: 'API Token',
        description: 'Monday.com API token',
        required: true,
        placeholder: 'your-api-token'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create items', 'Update boards', 'Manage teams'],
    tags: ['Project Management', 'Collaboration', 'CRM']
  },

  [ConnectorType.PIPEDRIVE]: {
    name: 'pipedrive',
    displayName: 'Pipedrive',
    description: 'Pipedrive sales CRM and pipeline management',
    category: ConnectorCategory.CRM,
    logoUrl: '/logos/pipedrive.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiToken: {
        type: 'password',
        label: 'API Token',
        description: 'Pipedrive API token',
        required: true,
        placeholder: 'your-api-token'
      },
      companyDomain: {
        type: 'string',
        label: 'Company Domain',
        description: 'Your Pipedrive company domain',
        required: true,
        placeholder: 'yourcompany'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Manage deals', 'Track contacts', 'Update pipeline'],
    tags: ['CRM', 'Sales', 'Pipeline']
  },

  [ConnectorType.SALESFORCE]: {
    name: 'salesforce',
    displayName: 'Salesforce',
    description: 'Salesforce CRM and customer success platform',
    category: ConnectorCategory.CRM,
    logoUrl: '/logos/salesforce.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      instanceUrl: {
        type: 'url',
        label: 'Instance URL',
        description: 'Salesforce instance URL',
        required: false,
        placeholder: 'https://yourinstance.salesforce.com'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Manage accounts', 'Track opportunities', 'Create leads'],
    tags: ['CRM', 'Sales', 'Enterprise']
  },

  [ConnectorType.ZOHO]: {
    name: 'zoho',
    displayName: 'Zoho CRM',
    description: 'Zoho CRM for customer relationship management',
    category: ConnectorCategory.CRM,
    logoUrl: '/logos/zoho.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      domain: {
        type: 'select',
        label: 'Domain',
        description: 'Zoho domain location',
        required: false,
        options: [
          { label: 'US (.com)', value: 'com' },
          { label: 'EU (.eu)', value: 'eu' },
          { label: 'India (.in)', value: 'in' },
          { label: 'China (.cn)', value: 'cn' }
        ]
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Manage contacts', 'Track deals', 'Generate reports'],
    tags: ['CRM', 'Sales', 'Analytics']
  },

  // Development Connectors
  [ConnectorType.GITHUB]: {
    name: 'github',
    displayName: 'GitHub',
    description: 'GitHub repository management and DevOps automation',
    category: ConnectorCategory.DEVELOPMENT,
    logoUrl: '/logos/github.svg',
    authType: AuthType.BEARER_TOKEN,
    requiredFields: {
      accessToken: {
        type: 'password',
        label: 'Personal Access Token',
        description: 'GitHub personal access token',
        required: true,
        placeholder: 'ghp_...'
      }
    },
    optionalFields: {
      organization: {
        type: 'string',
        label: 'Organization',
        description: 'GitHub organization name',
        required: false,
        placeholder: 'your-org'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create repositories', 'Manage issues', 'Deploy code'],
    tags: ['Development', 'Git', 'DevOps']
  },

  // E-commerce Connectors
  [ConnectorType.PAYPAL]: {
    name: 'paypal',
    displayName: 'PayPal',
    description: 'PayPal payment processing and merchant services',
    category: ConnectorCategory.ECOMMERCE,
    logoUrl: '/logos/paypal.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {
      clientId: {
        type: 'string',
        label: 'Client ID',
        description: 'PayPal application client ID',
        required: true,
        placeholder: 'your-client-id'
      },
      clientSecret: {
        type: 'password',
        label: 'Client Secret',
        description: 'PayPal application client secret',
        required: true,
        placeholder: 'your-client-secret'
      }
    },
    optionalFields: {
      environment: {
        type: 'select',
        label: 'Environment',
        description: 'PayPal environment',
        required: false,
        options: [
          { label: 'Sandbox', value: 'sandbox' },
          { label: 'Production', value: 'production' }
        ]
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Process payments', 'Create invoices', 'Manage subscriptions'],
    tags: ['Payments', 'E-commerce', 'Invoicing']
  },

  [ConnectorType.SHOPIFY]: {
    name: 'shopify',
    displayName: 'Shopify',
    description: 'Shopify e-commerce platform integration',
    category: ConnectorCategory.ECOMMERCE,
    logoUrl: '/logos/shopify.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {
      shopDomain: {
        type: 'string',
        label: 'Shop Domain',
        description: 'Your Shopify shop domain',
        required: true,
        placeholder: 'yourstore.myshopify.com'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Manage products', 'Process orders', 'Track inventory'],
    tags: ['E-commerce', 'Retail', 'Inventory']
  },

  [ConnectorType.STRIPE]: {
    name: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe payment processing and financial infrastructure',
    category: ConnectorCategory.ECOMMERCE,
    logoUrl: '/logos/stripe.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      secretKey: {
        type: 'password',
        label: 'Secret Key',
        description: 'Stripe secret key',
        required: true,
        placeholder: 'sk_...'
      }
    },
    optionalFields: {
      publishableKey: {
        type: 'string',
        label: 'Publishable Key',
        description: 'Stripe publishable key',
        required: false,
        placeholder: 'pk_...'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Process payments', 'Manage customers', 'Handle subscriptions'],
    tags: ['Payments', 'Subscriptions', 'Financial']
  },

  [ConnectorType.WOOCOMMERCE]: {
    name: 'woocommerce',
    displayName: 'WooCommerce',
    description: 'WooCommerce WordPress e-commerce platform',
    category: ConnectorCategory.ECOMMERCE,
    logoUrl: '/logos/woocommerce.svg',
    authType: AuthType.BASIC_AUTH,
    requiredFields: {
      siteUrl: {
        type: 'url',
        label: 'Site URL',
        description: 'Your WooCommerce site URL',
        required: true,
        placeholder: 'https://yourstore.com'
      },
      consumerKey: {
        type: 'string',
        label: 'Consumer Key',
        description: 'WooCommerce REST API consumer key',
        required: true,
        placeholder: 'ck_...'
      },
      consumerSecret: {
        type: 'password',
        label: 'Consumer Secret',
        description: 'WooCommerce REST API consumer secret',
        required: true,
        placeholder: 'cs_...'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Manage products', 'Process orders', 'Track customers'],
    tags: ['E-commerce', 'WordPress', 'Online Store']
  },

  // Finance Connectors
  [ConnectorType.PLAID]: {
    name: 'plaid',
    displayName: 'Plaid',
    description: 'Plaid financial data aggregation and banking APIs',
    category: ConnectorCategory.FINANCE,
    logoUrl: '/logos/plaid.svg',
    authType: AuthType.CUSTOM,
    requiredFields: {
      clientId: {
        type: 'string',
        label: 'Client ID',
        description: 'Plaid application client ID',
        required: true,
        placeholder: 'your-client-id'
      },
      secret: {
        type: 'password',
        label: 'Secret',
        description: 'Plaid application secret',
        required: true,
        placeholder: 'your-secret'
      }
    },
    optionalFields: {
      environment: {
        type: 'select',
        label: 'Environment',
        description: 'Plaid environment',
        required: false,
        options: [
          { label: 'Sandbox', value: 'sandbox' },
          { label: 'Development', value: 'development' },
          { label: 'Production', value: 'production' }
        ]
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Link accounts', 'Get transactions', 'Verify identity'],
    tags: ['Finance', 'Banking', 'Fintech']
  },

  // Continue with remaining connectors...
  // Forms Connectors
  [ConnectorType.GOOGLE_FORMS]: {
    name: 'google-forms',
    displayName: 'Google Forms',
    description: 'Google Forms integration for survey and form management',
    category: ConnectorCategory.FORMS,
    logoUrl: '/logos/google-forms.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Create forms', 'Get responses', 'Generate reports'],
    tags: ['Forms', 'Surveys', 'Google']
  },

  [ConnectorType.JOTFORM]: {
    name: 'jotform',
    displayName: 'JotForm',
    description: 'JotForm online form builder and data collection',
    category: ConnectorCategory.FORMS,
    logoUrl: '/logos/jotform.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'JotForm API key',
        required: true,
        placeholder: 'your-api-key'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create forms', 'Get submissions', 'Manage forms'],
    tags: ['Forms', 'Data Collection', 'Surveys']
  },

  [ConnectorType.TYPEFORM]: {
    name: 'typeform',
    displayName: 'Typeform',
    description: 'Typeform interactive forms and surveys platform',
    category: ConnectorCategory.FORMS,
    logoUrl: '/logos/typeform.svg',
    authType: AuthType.BEARER_TOKEN,
    requiredFields: {
      personalAccessToken: {
        type: 'password',
        label: 'Personal Access Token',
        description: 'Typeform personal access token',
        required: true,
        placeholder: 'tfp_...'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create forms', 'Get responses', 'Analyze data'],
    tags: ['Forms', 'Surveys', 'Interactive']
  },

  // Marketing Connectors
  [ConnectorType.FACEBOOK_ADS]: {
    name: 'facebook-ads',
    displayName: 'Facebook Ads',
    description: 'Facebook Ads Manager for advertising campaigns',
    category: ConnectorCategory.MARKETING,
    logoUrl: '/logos/facebook-ads.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      adAccountId: {
        type: 'string',
        label: 'Ad Account ID',
        description: 'Facebook Ad Account ID',
        required: false,
        placeholder: 'act_123456789'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create campaigns', 'Get insights', 'Manage ads'],
    tags: ['Advertising', 'Social Media', 'Marketing']
  },

  [ConnectorType.GOOGLE_ADS]: {
    name: 'google-ads',
    displayName: 'Google Ads',
    description: 'Google Ads platform for search and display advertising',
    category: ConnectorCategory.MARKETING,
    logoUrl: '/logos/google-ads.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      customerId: {
        type: 'string',
        label: 'Customer ID',
        description: 'Google Ads customer ID',
        required: false,
        placeholder: '123-456-7890'
      }
    },
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Manage campaigns', 'Get reports', 'Update keywords'],
    tags: ['Advertising', 'Search Marketing', 'PPC']
  },

  [ConnectorType.KLAVIYO]: {
    name: 'klaviyo',
    displayName: 'Klaviyo',
    description: 'Klaviyo email marketing and customer data platform',
    category: ConnectorCategory.MARKETING,
    logoUrl: '/logos/klaviyo.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'Private API Key',
        description: 'Klaviyo private API key',
        required: true,
        placeholder: 'pk_...'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send emails', 'Manage lists', 'Track events'],
    tags: ['Email Marketing', 'Automation', 'E-commerce']
  },

  [ConnectorType.MAILCHIMP]: {
    name: 'mailchimp',
    displayName: 'Mailchimp',
    description: 'Mailchimp email marketing and automation platform',
    category: ConnectorCategory.MARKETING,
    logoUrl: '/logos/mailchimp.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'Mailchimp API key',
        required: true,
        placeholder: 'your-api-key-us1'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create campaigns', 'Manage audiences', 'Send emails'],
    tags: ['Email Marketing', 'Newsletters', 'Automation']
  },

  [ConnectorType.SENDGRID]: {
    name: 'sendgrid',
    displayName: 'SendGrid',
    description: 'SendGrid email delivery and marketing platform',
    category: ConnectorCategory.MARKETING,
    logoUrl: '/logos/sendgrid.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'SendGrid API key',
        required: true,
        placeholder: 'SG...'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send emails', 'Manage contacts', 'Track metrics'],
    tags: ['Email Delivery', 'Transactional Email', 'Marketing']
  },

  // Project Management Connectors
  [ConnectorType.ASANA]: {
    name: 'asana',
    displayName: 'Asana',
    description: 'Asana project management and team collaboration',
    category: ConnectorCategory.PROJECT_MANAGEMENT,
    logoUrl: '/logos/asana.svg',
    authType: AuthType.BEARER_TOKEN,
    requiredFields: {
      personalAccessToken: {
        type: 'password',
        label: 'Personal Access Token',
        description: 'Asana personal access token',
        required: true,
        placeholder: '1/...'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create tasks', 'Manage projects', 'Track progress'],
    tags: ['Project Management', 'Task Management', 'Team Collaboration']
  },

  [ConnectorType.JIRA]: {
    name: 'jira',
    displayName: 'Jira',
    description: 'Atlassian Jira issue tracking and project management',
    category: ConnectorCategory.PROJECT_MANAGEMENT,
    logoUrl: '/logos/jira.svg',
    authType: AuthType.BASIC_AUTH,
    requiredFields: {
      domain: {
        type: 'string',
        label: 'Domain',
        description: 'Your Jira domain',
        required: true,
        placeholder: 'yourcompany.atlassian.net'
      },
      email: {
        type: 'email',
        label: 'Email',
        description: 'Your Jira account email',
        required: true,
        placeholder: 'user@company.com'
      },
      apiToken: {
        type: 'password',
        label: 'API Token',
        description: 'Jira API token',
        required: true,
        placeholder: 'your-api-token'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create issues', 'Update tickets', 'Manage sprints'],
    tags: ['Issue Tracking', 'Agile', 'Development']
  },

  [ConnectorType.LINEAR]: {
    name: 'linear',
    displayName: 'Linear',
    description: 'Linear issue tracking and project management for modern teams',
    category: ConnectorCategory.PROJECT_MANAGEMENT,
    logoUrl: '/logos/linear.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'Linear API key',
        required: true,
        placeholder: 'lin_api_...'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create issues', 'Update status', 'Manage projects'],
    tags: ['Issue Tracking', 'Project Management', 'Development']
  },

  [ConnectorType.NOTION]: {
    name: 'notion',
    displayName: 'Notion',
    description: 'Notion workspace and knowledge management platform',
    category: ConnectorCategory.PROJECT_MANAGEMENT,
    logoUrl: '/logos/notion.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Create pages', 'Update databases', 'Manage content'],
    tags: ['Knowledge Management', 'Workspace', 'Documentation']
  },

  [ConnectorType.TRELLO]: {
    name: 'trello',
    displayName: 'Trello',
    description: 'Trello board-based project management and collaboration',
    category: ConnectorCategory.PROJECT_MANAGEMENT,
    logoUrl: '/logos/trello.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      apiKey: {
        type: 'string',
        label: 'API Key',
        description: 'Trello API key',
        required: true,
        placeholder: 'your-api-key'
      },
      token: {
        type: 'password',
        label: 'Token',
        description: 'Trello token',
        required: true,
        placeholder: 'your-token'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create cards', 'Manage boards', 'Update lists'],
    tags: ['Project Management', 'Kanban', 'Visual Management']
  },

  // Social Connectors
  [ConnectorType.FACEBOOK]: {
    name: 'facebook',
    displayName: 'Facebook',
    description: 'Facebook social media platform integration',
    category: ConnectorCategory.SOCIAL,
    logoUrl: '/logos/facebook.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      pageId: {
        type: 'string',
        label: 'Page ID',
        description: 'Facebook page ID',
        required: false,
        placeholder: 'your-page-id'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Post updates', 'Get insights', 'Manage pages'],
    tags: ['Social Media', 'Marketing', 'Content Publishing']
  },

  [ConnectorType.INSTAGRAM]: {
    name: 'instagram',
    displayName: 'Instagram',
    description: 'Instagram social media and content management',
    category: ConnectorCategory.SOCIAL,
    logoUrl: '/logos/instagram.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Post photos', 'Get insights', 'Manage stories'],
    tags: ['Social Media', 'Visual Content', 'Marketing']
  },

  [ConnectorType.LINKEDIN]: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    description: 'LinkedIn professional networking and content platform',
    category: ConnectorCategory.SOCIAL,
    logoUrl: '/logos/linkedin.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Post updates', 'Get connections', 'Share content'],
    tags: ['Professional Networking', 'B2B Marketing', 'Content Publishing']
  },

  [ConnectorType.TWITTER]: {
    name: 'twitter',
    displayName: 'Twitter (X)',
    description: 'Twitter/X social media platform integration',
    category: ConnectorCategory.SOCIAL,
    logoUrl: '/logos/twitter.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Post tweets', 'Get mentions', 'Manage followers'],
    tags: ['Social Media', 'Microblogging', 'Real-time Communication']
  },

  // Storage Connectors
  [ConnectorType.AWS_S3]: {
    name: 'aws-s3',
    displayName: 'AWS S3',
    description: 'Amazon S3 cloud storage and file management',
    category: ConnectorCategory.STORAGE,
    logoUrl: '/logos/aws-s3.svg',
    authType: AuthType.CUSTOM,
    requiredFields: {
      accessKeyId: {
        type: 'string',
        label: 'Access Key ID',
        description: 'AWS Access Key ID',
        required: true,
        placeholder: 'AKIA...'
      },
      secretAccessKey: {
        type: 'password',
        label: 'Secret Access Key',
        description: 'AWS Secret Access Key',
        required: true,
        placeholder: '...'
      },
      region: {
        type: 'select',
        label: 'Region',
        description: 'AWS region',
        required: true,
        options: [
          { label: 'US East 1', value: 'us-east-1' },
          { label: 'US West 2', value: 'us-west-2' },
          { label: 'EU West 1', value: 'eu-west-1' }
        ]
      },
      bucketName: {
        type: 'string',
        label: 'Bucket Name',
        description: 'S3 bucket name',
        required: true,
        placeholder: 'your-bucket-name'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Upload files', 'Download files', 'List objects'],
    tags: ['Cloud Storage', 'File Management', 'AWS']
  },

  [ConnectorType.DROPBOX]: {
    name: 'dropbox',
    displayName: 'Dropbox',
    description: 'Dropbox cloud storage and file synchronization',
    category: ConnectorCategory.STORAGE,
    logoUrl: '/logos/dropbox.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Upload files', 'Share links', 'Sync folders'],
    tags: ['Cloud Storage', 'File Sharing', 'Synchronization']
  },

  [ConnectorType.GOOGLE_DRIVE]: {
    name: 'google-drive',
    displayName: 'Google Drive',
    description: 'Google Drive cloud storage and collaboration',
    category: ConnectorCategory.STORAGE,
    logoUrl: '/logos/google-drive.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Upload files', 'Share documents', 'Create folders'],
    tags: ['Cloud Storage', 'Collaboration', 'Google']
  },

  [ConnectorType.GOOGLE_SHEETS]: {
    name: 'google-sheets',
    displayName: 'Google Sheets',
    description: 'Google Sheets spreadsheet automation and data management',
    category: ConnectorCategory.STORAGE,
    logoUrl: '/logos/google-sheets.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Update cells', 'Create sheets', 'Read data'],
    tags: ['Spreadsheets', 'Data Management', 'Automation']
  },

  [ConnectorType.MONGODB]: {
    name: 'mongodb',
    displayName: 'MongoDB',
    description: 'MongoDB NoSQL database integration',
    category: ConnectorCategory.STORAGE,
    logoUrl: '/logos/mongodb.svg',
    authType: AuthType.CUSTOM,
    requiredFields: {
      connectionString: {
        type: 'string',
        label: 'Connection String',
        description: 'MongoDB connection string',
        required: true,
        placeholder: 'mongodb://localhost:27017'
      }
    },
    optionalFields: {
      database: {
        type: 'string',
        label: 'Database Name',
        description: 'Default database name',
        required: false,
        placeholder: 'your-database'
      }
    },
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Insert documents', 'Query data', 'Update records'],
    tags: ['Database', 'NoSQL', 'Document Storage']
  },

  [ConnectorType.MYSQL]: {
    name: 'mysql',
    displayName: 'MySQL',
    description: 'MySQL relational database integration',
    category: ConnectorCategory.STORAGE,
    logoUrl: '/logos/mysql.svg',
    authType: AuthType.BASIC_AUTH,
    requiredFields: {
      host: {
        type: 'string',
        label: 'Host',
        description: 'Database host',
        required: true,
        placeholder: 'localhost'
      },
      port: {
        type: 'number',
        label: 'Port',
        description: 'Database port',
        required: true,
        placeholder: '3306'
      },
      database: {
        type: 'string',
        label: 'Database',
        description: 'Database name',
        required: true,
        placeholder: 'your-database'
      },
      username: {
        type: 'string',
        label: 'Username',
        description: 'Database username',
        required: true,
        placeholder: 'username'
      },
      password: {
        type: 'password',
        label: 'Password',
        description: 'Database password',
        required: true,
        placeholder: 'password'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: false,
    popularActions: ['Execute queries', 'Insert data', 'Update records'],
    tags: ['Database', 'SQL', 'Relational']
  },

  // Support Connectors
  [ConnectorType.FRESHDESK]: {
    name: 'freshdesk',
    displayName: 'Freshdesk',
    description: 'Freshdesk customer support and helpdesk platform',
    category: ConnectorCategory.SUPPORT,
    logoUrl: '/logos/freshdesk.svg',
    authType: AuthType.API_KEY,
    requiredFields: {
      domain: {
        type: 'string',
        label: 'Domain',
        description: 'Your Freshdesk domain',
        required: true,
        placeholder: 'yourcompany.freshdesk.com'
      },
      apiKey: {
        type: 'password',
        label: 'API Key',
        description: 'Freshdesk API key',
        required: true,
        placeholder: 'your-api-key'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create tickets', 'Update status', 'Manage contacts'],
    tags: ['Customer Support', 'Help Desk', 'Ticketing']
  },

  [ConnectorType.INTERCOM]: {
    name: 'intercom',
    displayName: 'Intercom',
    description: 'Intercom customer messaging and support platform',
    category: ConnectorCategory.SUPPORT,
    logoUrl: '/logos/intercom.svg',
    authType: AuthType.BEARER_TOKEN,
    requiredFields: {
      accessToken: {
        type: 'password',
        label: 'Access Token',
        description: 'Intercom access token',
        required: true,
        placeholder: 'your-access-token'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Send messages', 'Create users', 'Track events'],
    tags: ['Customer Messaging', 'Live Chat', 'Customer Success']
  },

  [ConnectorType.ZENDESK]: {
    name: 'zendesk',
    displayName: 'Zendesk',
    description: 'Zendesk customer service and support platform',
    category: ConnectorCategory.SUPPORT,
    logoUrl: '/logos/zendesk.svg',
    authType: AuthType.BASIC_AUTH,
    requiredFields: {
      subdomain: {
        type: 'string',
        label: 'Subdomain',
        description: 'Your Zendesk subdomain',
        required: true,
        placeholder: 'yourcompany'
      },
      email: {
        type: 'email',
        label: 'Email',
        description: 'Your Zendesk account email',
        required: true,
        placeholder: 'agent@company.com'
      },
      apiToken: {
        type: 'password',
        label: 'API Token',
        description: 'Zendesk API token',
        required: true,
        placeholder: 'your-api-token'
      }
    },
    optionalFields: {},
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create tickets', 'Update tickets', 'Manage users'],
    tags: ['Customer Support', 'Ticketing', 'Help Desk']
  },

  // Video Connectors
  [ConnectorType.YOUTUBE]: {
    name: 'youtube',
    displayName: 'YouTube',
    description: 'YouTube video platform and content management',
    category: ConnectorCategory.VIDEO,
    logoUrl: '/logos/youtube.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      channelId: {
        type: 'string',
        label: 'Channel ID',
        description: 'YouTube channel ID',
        required: false,
        placeholder: 'UC...'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Upload videos', 'Get analytics', 'Manage playlists'],
    tags: ['Video', 'Content Management', 'Social Media']
  },

  [ConnectorType.ZOOM]: {
    name: 'zoom',
    displayName: 'Zoom',
    description: 'Zoom video conferencing and webinar platform',
    category: ConnectorCategory.VIDEO,
    logoUrl: '/logos/zoom.svg',
    authType: AuthType.OAUTH2,
    requiredFields: {},
    optionalFields: {
      accountId: {
        type: 'string',
        label: 'Account ID',
        description: 'Zoom account ID',
        required: false,
        placeholder: 'your-account-id'
      }
    },
    testConnectionSupported: true,
    webhookSupported: true,
    popularActions: ['Create meetings', 'Schedule webinars', 'Get recordings'],
    tags: ['Video Conferencing', 'Meetings', 'Webinars']
  }
};

// Helper functions
export const getConnectorsByCategory = (category?: ConnectorCategory): ConnectorMetadata[] => {
  if (!category) {
    return Object.values(CONNECTOR_REGISTRY);
  }
  return Object.values(CONNECTOR_REGISTRY).filter(connector => connector.category === category);
};

export const searchConnectors = (query: string): ConnectorMetadata[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(CONNECTOR_REGISTRY).filter(connector =>
    connector.displayName.toLowerCase().includes(lowerQuery) ||
    connector.description.toLowerCase().includes(lowerQuery) ||
    connector.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const getConnectorByType = (type: ConnectorType): ConnectorMetadata | undefined => {
  return CONNECTOR_REGISTRY[type];
};

// Category display information
export const CATEGORY_INFO: Record<ConnectorCategory, { displayName: string; icon: string; color: string; description: string }> = {
  [ConnectorCategory.AI]: {
    displayName: 'AI & ML',
    icon: '🤖',
    color: 'from-purple-500 to-pink-500',
    description: 'Artificial Intelligence and Machine Learning services'
  },
  [ConnectorCategory.ANALYTICS]: {
    displayName: 'Analytics',
    icon: '📊',
    color: 'from-blue-500 to-cyan-500',
    description: 'Analytics and business intelligence platforms'
  },
  [ConnectorCategory.COMMUNICATION]: {
    displayName: 'Communication',
    icon: '💬',
    color: 'from-green-500 to-teal-500',
    description: 'Messaging, email, and communication tools'
  },
  [ConnectorCategory.CRM]: {
    displayName: 'CRM',
    icon: '👥',
    color: 'from-orange-500 to-red-500',
    description: 'Customer Relationship Management systems'
  },
  [ConnectorCategory.DATABASE]: {
    displayName: 'Databases',
    icon: '🗄️',
    color: 'from-gray-500 to-slate-500',
    description: 'Database management and storage solutions'
  },
  [ConnectorCategory.DEVELOPMENT]: {
    displayName: 'Development',
    icon: '⚙️',
    color: 'from-indigo-500 to-purple-500',
    description: 'Development tools and DevOps platforms'
  },
  [ConnectorCategory.ECOMMERCE]: {
    displayName: 'E-commerce',
    icon: '🛒',
    color: 'from-yellow-500 to-orange-500',
    description: 'E-commerce platforms and payment processing'
  },
  [ConnectorCategory.FINANCE]: {
    displayName: 'Finance',
    icon: '💰',
    color: 'from-emerald-500 to-green-500',
    description: 'Financial services and banking APIs'
  },
  [ConnectorCategory.FORMS]: {
    displayName: 'Forms',
    icon: '📝',
    color: 'from-pink-500 to-rose-500',
    description: 'Form builders and survey platforms'
  },
  [ConnectorCategory.MARKETING]: {
    displayName: 'Marketing',
    icon: '📢',
    color: 'from-red-500 to-pink-500',
    description: 'Marketing automation and advertising platforms'
  },
  [ConnectorCategory.PROJECT_MANAGEMENT]: {
    displayName: 'Project Management',
    icon: '📋',
    color: 'from-violet-500 to-purple-500',
    description: 'Project management and collaboration tools'
  },
  [ConnectorCategory.SOCIAL]: {
    displayName: 'Social Media',
    icon: '📱',
    color: 'from-sky-500 to-blue-500',
    description: 'Social media platforms and management tools'
  },
  [ConnectorCategory.STORAGE]: {
    displayName: 'Storage',
    icon: '☁️',
    color: 'from-teal-500 to-cyan-500',
    description: 'Cloud storage and file management services'
  },
  [ConnectorCategory.SUPPORT]: {
    displayName: 'Customer Support',
    icon: '🎧',
    color: 'from-amber-500 to-yellow-500',
    description: 'Customer support and helpdesk platforms'
  },
  [ConnectorCategory.VIDEO]: {
    displayName: 'Video',
    icon: '🎥',
    color: 'from-fuchsia-500 to-pink-500',
    description: 'Video platforms and conferencing tools'
  }
};