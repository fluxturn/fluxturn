# Fluxturn Connector Architecture Guide

## Overview
Fluxturn is an n8n-like automation platform with a connector-based architecture. This guide documents the complete pattern for understanding and implementing connectors.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Connector Definition Structure](#connector-definition-structure)
4. [Base Classes & Interfaces](#base-classes--interfaces)
5. [Auth Configuration](#auth-configuration)
6. [Actions & Triggers](#actions--triggers)
7. [Implementation Pattern](#implementation-pattern)
8. [Examples](#examples)
9. [Quick Reference](#quick-reference)

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Dynamically generates configuration modals based on │   │
│  │  auth_fields from backend connector definitions      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Backend NestJS API                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  connector.constants.ts                               │   │
│  │  - Seeds database with connector definitions         │   │
│  │  - Defines supported_actions & supported_triggers    │   │
│  │  - Defines auth_fields for UI generation             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Connector Implementations (TypeScript Classes)       │   │
│  │  - Extend BaseConnector                              │   │
│  │  - Implement category-specific interfaces            │   │
│  │  - Execute actions & process triggers                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  connectors table (JSONB fields):                    │   │
│  │  - auth_fields: UI field definitions                 │   │
│  │  - supported_actions: Available actions              │   │
│  │  - supported_triggers: Available triggers            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `connectors` Table
**Location**: `/backend/src/modules/database/platform.service.ts:106-127`

```sql
CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  type VARCHAR(50) DEFAULT 'official',
  status VARCHAR(50) DEFAULT 'active',
  is_public BOOLEAN DEFAULT true,
  auth_type VARCHAR(50),
  auth_fields JSONB,              -- ⭐ Defines UI configuration fields
  endpoints JSONB,
  webhook_support BOOLEAN DEFAULT false,
  rate_limits JSONB,
  sandbox_available BOOLEAN DEFAULT false,
  capabilities JSONB,
  supported_triggers JSONB,       -- ⭐ Trigger definitions
  supported_actions JSONB,        -- ⭐ Action definitions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `connector_configs` Table
Stores user-created connector instances with credentials:
```sql
CREATE TABLE IF NOT EXISTS connector_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  connector_type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  credentials JSONB,              -- ⭐ Encrypted user credentials
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status VARCHAR(50),
  test_result JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Connector Definition Structure

### Location
`/backend/src/common/constants/connector.constants.ts`

### Interface
```typescript
export interface ConnectorDefinition {
  name: string;                    // Unique identifier (e.g., 'telegram')
  display_name: string;            // Display name (e.g., 'Telegram')
  category: string;                // Category (e.g., 'communication')
  description: string;             // Brief description
  auth_type?: string;              // 'api_key' | 'oauth2' | 'basic_auth' | 'bearer_token'
  auth_fields?: any;               // ⭐ Frontend uses this to build config UI
  endpoints?: any;                 // API endpoints
  webhook_support?: boolean;       // Supports webhooks?
  rate_limits?: any;               // Rate limit configs
  sandbox_available?: boolean;     // Has sandbox environment?
  supported_actions?: any[];       // ⭐ Available actions
  supported_triggers?: any[];      // ⭐ Available triggers
  oauth_config?: OAuthConfig;      // OAuth configuration
}
```

### Example: Telegram Connector Definition
```typescript
{
  name: 'telegram',
  display_name: 'Telegram',
  category: 'communication',
  description: 'Send and receive messages through Telegram Bot API',
  auth_type: 'api_key',

  // ⭐ Frontend reads this to generate configuration modal
  auth_fields: [
    {
      key: 'botToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      description: 'Get your bot token from @BotFather on Telegram',
      helpUrl: 'https://core.telegram.org/bots#botfather',
      helpText: 'How to get a bot token'
    }
  ],

  endpoints: {
    base_url: 'https://api.telegram.org/bot{botToken}',
    message: {
      send: '/sendMessage',
      edit: '/editMessageText',
      delete: '/deleteMessage'
    }
  },

  webhook_support: true,
  rate_limits: { requests_per_second: 30 },

  // ⭐ Action definitions with detailed schemas
  supported_actions: [
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a text message to a Telegram chat',
      category: 'Messages',
      icon: 'send',
      api: {
        endpoint: '/sendMessage',
        method: 'POST',
        baseUrl: 'https://api.telegram.org/bot{botToken}',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          chatId: 'chat_id',
          text: 'text',
          parseMode: 'parse_mode',
          disableNotification: 'disable_notification'
        }
      },
      inputSchema: {
        chatId: {
          type: 'string',
          required: true,
          label: 'Chat ID',
          placeholder: '123456789',
          description: 'Unique identifier for the target chat'
        },
        text: {
          type: 'string',
          required: true,
          label: 'Message Text',
          inputType: 'textarea',
          maxLength: 4096,
          description: 'Text of the message to send'
        },
        parseMode: {
          type: 'select',
          label: 'Parse Mode',
          default: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Markdown', value: 'Markdown' },
            { label: 'HTML', value: 'HTML' }
          ],
          description: 'How to parse text formatting'
        }
      }
    }
  ],

  // ⭐ Trigger definitions with output schemas
  supported_triggers: [
    {
      id: 'new_message',
      name: 'New Message',
      description: 'Triggers when a new message is received',
      eventType: 'message',
      icon: 'message-circle',
      webhookRequired: true,
      outputSchema: {
        telegramEvent: {
          type: 'object',
          properties: {
            message_id: { type: 'number' },
            text: { type: 'string' },
            from: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                username: { type: 'string' },
                first_name: { type: 'string' }
              }
            },
            chat: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                type: { type: 'string' }
              }
            }
          }
        }
      }
    }
  ]
}
```

---

## Base Classes & Interfaces

### Connector Types
**Location**: `/backend/src/modules/connectors/types/index.ts`

```typescript
export enum ConnectorType {
  // Communication
  TELEGRAM = 'telegram',
  GMAIL = 'gmail',
  SLACK = 'slack',
  DISCORD = 'discord',

  // Social
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',

  // AI
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',

  // ... more types
}

export enum ConnectorCategory {
  COMMUNICATION = 'communication',
  SOCIAL = 'social',
  CRM = 'crm',
  AI = 'ai',
  MARKETING = 'marketing',
  STORAGE = 'storage',
  // ... more categories
}

export enum AuthType {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  BASIC_AUTH = 'basic_auth',
  BEARER_TOKEN = 'bearer_token',
  CUSTOM = 'custom'
}
```

### Base Connector
**Location**: `/backend/src/modules/connectors/base/base.connector.ts`

```typescript
@Injectable()
export abstract class BaseConnector implements IConnector {
  protected readonly logger = new Logger(this.constructor.name);
  protected config: ConnectorConfig;
  protected eventEmitter = new EventEmitter();

  // Abstract methods every connector must implement
  abstract getMetadata(): ConnectorMetadata;
  protected abstract initializeConnection(): Promise<void>;
  protected abstract performConnectionTest(): Promise<boolean>;
  protected abstract performHealthCheck(): Promise<void>;
  protected abstract performRequest(request: ConnectorRequest): Promise<any>;
  protected abstract performAction(actionId: string, input: any): Promise<any>;
  protected abstract cleanup(): Promise<void>;

  // Provided utilities
  async initialize(config: ConnectorConfig): Promise<void>;
  async testConnection(): Promise<ConnectorResponse<boolean>>;
  async executeAction(actionId: string, input: any): Promise<ConnectorResponse>;
  protected async executeWithRetry<T>(operation: () => Promise<T>): Promise<T>;
  protected async checkRateLimit(): Promise<void>;
  protected handleError(error: any, context: string): ConnectorResponse;

  // ... more utility methods
}
```

### Category-Specific Interfaces
**Location**: `/backend/src/modules/connectors/base/connector.interface.ts`

```typescript
// Base interface
export interface IConnector {
  getMetadata(): ConnectorMetadata;
  initialize(config: ConnectorConfig): Promise<void>;
  testConnection(): Promise<ConnectorResponse<boolean>>;
  executeAction(actionId: string, input: any): Promise<ConnectorResponse>;
  destroy(): Promise<void>;
}

// Communication connectors
export interface ICommunicationConnector extends IConnector {
  sendMessage(to: string | string[], message: any): Promise<ConnectorResponse>;
  getMessages(options?: PaginatedRequest): Promise<ConnectorResponse>;
  getContact(contactId: string): Promise<ConnectorResponse>;
  upsertContact(contact: any): Promise<ConnectorResponse>;
}

// Social connectors
export interface ISocialConnector extends IConnector {
  postContent(content: any): Promise<ConnectorResponse>;
  getPosts(options?: PaginatedRequest): Promise<ConnectorResponse>;
  getUserProfile(userId?: string): Promise<ConnectorResponse>;
  getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse>;
  schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse>;
}

// CRM connectors
export interface ICRMConnector extends IConnector {
  createContact(contact: any): Promise<ConnectorResponse>;
  updateContact(contactId: string, updates: any): Promise<ConnectorResponse>;
  getContact(contactId: string): Promise<ConnectorResponse>;
  searchContacts(query: string, options?: PaginatedRequest): Promise<ConnectorResponse>;
  createDeal(deal: any): Promise<ConnectorResponse>;
  // ... more CRM methods
}

// ... more category interfaces
```

---

## Auth Configuration

### Auth Types

#### 1. API Key
```typescript
{
  name: 'telegram',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'botToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your bot token',
      description: 'Get from @BotFather'
    }
  ]
}
```

#### 2. OAuth2
```typescript
{
  name: 'twitter',
  auth_type: 'oauth2',
  auth_fields: {
    client_id: 'string',
    client_secret: 'string'
  },
  oauth_config: {
    authorization_url: 'https://twitter.com/i/oauth2/authorize',
    token_url: 'https://api.twitter.com/2/oauth2/token',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access'
    ]
  }
}
```

#### 3. Complex Auth Fields (Array Format)
Used when you need detailed field configurations for the frontend:
```typescript
auth_fields: [
  {
    key: 'apiKey',
    label: 'API Key',
    type: 'password',
    required: true,
    placeholder: 'sk-...',
    description: 'Your OpenAI API key',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'How to create an API key'
  },
  {
    key: 'organization',
    label: 'Organization ID',
    type: 'string',
    required: false,
    placeholder: 'org-...',
    description: 'Optional organization identifier'
  }
]
```

---

## Actions & Triggers

### Action Definition Schema

```typescript
{
  id: string;                      // Unique action ID (e.g., 'send_message')
  name: string;                    // Display name
  description: string;             // Brief description
  category: string;                // Action category (optional)
  icon: string;                    // Icon identifier (optional)

  // API configuration
  api: {
    endpoint: string;              // API endpoint path
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    baseUrl: string;               // Base URL (can include template vars)
    headers: Record<string, string>;
    paramMapping: Record<string, string>;  // Maps input fields to API params
  };

  // Input schema - defines form fields in UI
  inputSchema: {
    [fieldName: string]: {
      type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'object';
      required?: boolean;
      label: string;
      description?: string;
      placeholder?: string;
      default?: any;

      // For 'string' type
      inputType?: 'text' | 'textarea' | 'email' | 'url' | 'password';
      maxLength?: number;
      minLength?: number;
      pattern?: string;

      // For 'number' type
      min?: number;
      max?: number;
      step?: number;

      // For 'select' type
      options?: Array<{ label: string; value: any }>;
      enum?: any[];

      // For 'array' type
      itemSchema?: any;

      // Conditional display
      displayOptions?: {
        show?: Record<string, any[]>;
        hide?: Record<string, any[]>;
      };
    };
  };

  // Output schema - describes response structure
  outputSchema: {
    [fieldName: string]: {
      type: string;
      description?: string;
      properties?: any;  // For nested objects
    };
  };
}
```

### Trigger Definition Schema

```typescript
{
  id: string;                      // Unique trigger ID
  name: string;                    // Display name
  description: string;             // Brief description
  eventType: string;               // Event type identifier
  icon?: string;                   // Icon identifier

  webhookRequired?: boolean;       // Requires webhook setup
  pollingEnabled?: boolean;        // Supports polling

  // Input schema - configuration for the trigger
  inputSchema?: {
    [fieldName: string]: {
      type: 'string' | 'number' | 'boolean' | 'select';
      required?: boolean;
      label: string;
      description?: string;
      default?: any;
      options?: Array<{ label: string; value: any }>;
      enum?: any[];
    };
  };

  // Output schema - describes event data structure
  outputSchema: {
    [fieldName: string]: {
      type: string;
      description?: string;
      properties?: any;  // For nested objects
    };
  };
}
```

### Advanced Input Schema Examples

#### 1. Select with Options
```typescript
parseMode: {
  type: 'select',
  required: false,
  label: 'Parse Mode',
  description: 'Message formatting style',
  default: 'none',
  options: [
    { label: 'None', value: 'none' },
    { label: 'Markdown', value: 'Markdown' },
    { label: 'HTML', value: 'HTML' }
  ]
}
```

#### 2. Conditional Display
```typescript
quality: {
  type: 'select',
  label: 'Quality',
  description: 'Image quality (DALL-E 3 only)',
  default: 'standard',
  options: [
    { label: 'Standard', value: 'standard' },
    { label: 'HD', value: 'hd' }
  ],
  displayOptions: {
    show: {
      model: ['dall-e-3']  // Only show when model is 'dall-e-3'
    }
  }
}
```

#### 3. Array with Item Schema
```typescript
messages: {
  type: 'array',
  required: true,
  label: 'Messages',
  description: 'Array of message objects for the conversation',
  itemSchema: {
    role: {
      type: 'select',
      required: true,
      label: 'Role',
      options: [
        { label: 'System', value: 'system' },
        { label: 'User', value: 'user' },
        { label: 'Assistant', value: 'assistant' }
      ],
      default: 'user'
    },
    content: {
      type: 'string',
      required: true,
      label: 'Content',
      inputType: 'textarea',
      placeholder: 'Enter message content...'
    }
  }
}
```

#### 4. Number with Constraints
```typescript
temperature: {
  type: 'number',
  label: 'Temperature',
  description: 'Controls randomness (0-2). Lower is more deterministic',
  default: 1,
  min: 0,
  max: 2,
  step: 0.1
}
```

---

## Implementation Pattern

### Step-by-Step Guide to Create a New Connector

#### Step 1: Add Connector Definition
**File**: `/backend/src/common/constants/connector.constants.ts`

```typescript
export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  // ... other connectors

  {
    name: 'your_connector',
    display_name: 'Your Service',
    category: 'communication',  // or 'social', 'crm', etc.
    description: 'Brief description of your service',
    auth_type: 'api_key',  // or 'oauth2'

    auth_fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your API key',
        description: 'Get from your service dashboard'
      }
    ],

    endpoints: {
      base_url: 'https://api.yourservice.com',
      messages: {
        send: '/v1/messages',
        list: '/v1/messages'
      }
    },

    webhook_support: true,
    rate_limits: { requests_per_minute: 60 },

    supported_actions: [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message',
        category: 'Messages',
        icon: 'send',
        api: {
          endpoint: '/v1/messages',
          method: 'POST',
          baseUrl: 'https://api.yourservice.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {apiKey}'
          },
          paramMapping: {
            to: 'recipient',
            message: 'text'
          }
        },
        inputSchema: {
          to: {
            type: 'string',
            required: true,
            label: 'Recipient',
            placeholder: 'user@example.com'
          },
          message: {
            type: 'string',
            required: true,
            label: 'Message',
            inputType: 'textarea'
          }
        }
      }
    ],

    supported_triggers: [
      {
        id: 'message_received',
        name: 'Message Received',
        description: 'Triggers when a message is received',
        eventType: 'message',
        webhookRequired: true,
        outputSchema: {
          messageId: { type: 'string' },
          from: { type: 'string' },
          text: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    ]
  }
];
```

#### Step 2: Add Type Definitions
**File**: `/backend/src/modules/connectors/types/index.ts`

```typescript
export enum ConnectorType {
  // ... existing types
  YOUR_CONNECTOR = 'your_connector',
}
```

#### Step 3: Create Connector Implementation
**File**: `/backend/src/modules/connectors/communication/your-connector.connector.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../base/base.connector';
import { ICommunicationConnector } from '../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  PaginatedRequest,
  ConnectorConfig,
  ConnectorRequest
} from '../types';

@Injectable()
export class YourConnector extends BaseConnector implements ICommunicationConnector {

  // 1. Define metadata
  getMetadata(): ConnectorMetadata {
    return {
      name: 'your_connector',
      description: 'Your Service connector',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.YOUR_CONNECTOR,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true
    };
  }

  // 2. Initialize connection
  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiKey) {
      throw new Error('API key is required');
    }
    this.logger.log('Your connector initialized');
  }

  // 3. Test connection
  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Make a test API call
      const response = await this.makeApiRequest('GET', '/v1/me');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // 4. Health check
  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.apiKey) {
      throw new Error('API key not configured');
    }
  }

  // 5. Generic request handler
  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // Implement generic HTTP request logic
  }

  // 6. Action dispatcher
  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_message':
        return await this.sendMessage(input.to, input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  // 7. Cleanup
  protected async cleanup(): Promise<void> {
    this.logger.log('Connector cleanup completed');
  }

  // 8. Implement interface methods
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    try {
      const recipients = Array.isArray(to) ? to : [to];
      const response = await this.makeApiRequest('POST', '/v1/messages', {
        recipient: recipients[0],
        text: message.text || message
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error.message
        }
      };
    }
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const response = await this.makeApiRequest('GET', '/v1/messages', {
        limit: options?.limit || 10
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get messages');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    // Implement contact retrieval
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    // Implement contact creation/update
  }

  // Helper methods
  private async makeApiRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const apiKey = this.config.credentials.apiKey;

    // Implement HTTP request logic using axios or similar
    const response = await axios({
      method,
      url: `https://api.yourservice.com${endpoint}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data
    });

    return response;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message',
        inputSchema: {
          to: { type: 'string', required: true },
          message: { type: 'string', required: true }
        },
        outputSchema: {
          messageId: { type: 'string' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'message_received',
        name: 'Message Received',
        description: 'Triggers when a message is received',
        eventType: 'message',
        webhookRequired: true,
        outputSchema: {
          messageId: { type: 'string' },
          text: { type: 'string' }
        }
      }
    ];
  }
}
```

#### Step 4: Register Connector
**File**: `/backend/src/modules/connectors/[category]/index.ts`

```typescript
export { YourConnector } from './your-connector.connector';
```

#### Step 5: Add to Module
**File**: `/backend/src/modules/connectors/connectors.module.ts`

```typescript
import { YourConnector } from './communication/your-connector.connector';

@Module({
  providers: [
    // ... other connectors
    YourConnector,
  ],
  exports: [YourConnector],
})
export class ConnectorsModule {}
```

---

## Examples

### Example 1: Telegram (API Key Auth)
**Implementation**: `/backend/src/modules/connectors/communication/telegram.connector.ts`

```typescript
@Injectable()
export class TelegramConnector extends BaseConnector implements ICommunicationConnector {
  getMetadata(): ConnectorMetadata {
    return {
      name: 'telegram',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.TELEGRAM,
      authType: AuthType.API_KEY,
      // ... metadata
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log('Telegram connector initialized');
  }

  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const chatIds = Array.isArray(to) ? to : [to];

    for (const chatId of chatIds) {
      const result = await this.performSendMessage({
        chatId,
        text: message.text || message,
        parseMode: message.parseMode
      }, this.config.credentials);
    }

    return { success: true, data: results };
  }

  private async makeApiRequest(method: string, params: any): Promise<any> {
    const botToken = this.config.credentials.botToken;
    const url = `https://api.telegram.org/bot${botToken}/${method}`;

    const response = await axios.post(url, params);
    return response.data;
  }
}
```

### Example 2: Gmail (OAuth2 Auth)
**Implementation**: `/backend/src/modules/connectors/communication/gmail.connector.ts`

```typescript
@Injectable()
export class GmailConnector extends BaseConnector implements ICommunicationConnector {
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Gmail',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly'
      ],
      // ... metadata
    };
  }

  async sendEmail(request: GmailSendRequest): Promise<ConnectorResponse> {
    const rawMessage = this.createRawMessage(request);

    const response = await this.performRequest({
      method: 'POST',
      endpoint: `${this.baseUrl}/users/me/messages/send`,
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: { raw: rawMessage }
    });

    return { success: true, data: response };
  }

  async refreshTokens(): Promise<OAuthTokens> {
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: this.config.credentials.clientId,
        client_secret: this.config.credentials.clientSecret,
        refresh_token: this.config.credentials.refreshToken,
        grant_type: 'refresh_token'
      }
    );

    return {
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      expiresAt: new Date(Date.now() + tokenResponse.data.expires_in * 1000)
    };
  }
}
```

### Example 3: Twitter (OAuth2 with Token Refresh)
**Implementation**: `/backend/src/modules/connectors/social/twitter.connector.ts`

```typescript
@Injectable()
export class TwitterConnector extends BaseConnector implements ISocialConnector {
  private client: TwitterApi;

  protected async initializeConnection(): Promise<void> {
    // Check token expiration
    const expiresAt = this.config.credentials.expiresAt;
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      // Refresh if expired or expiring soon
      if (currentTime >= expirationTime - fiveMinutesInMs) {
        await this.refreshToken();
      }
    }

    const accessToken = this.config.credentials.accessToken;
    this.client = new TwitterApi(accessToken);
  }

  private async refreshToken(): Promise<void> {
    const tokenResponse = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.credentials.refreshToken,
        client_id: this.config.settings.client_id
      }),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString('base64')}`
        }
      }
    );

    // Update credentials
    this.config.credentials.accessToken = tokenResponse.data.access_token;
    this.config.credentials.refreshToken = tokenResponse.data.refresh_token;
    this.config.credentials.expiresAt = new Date(
      Date.now() + tokenResponse.data.expires_in * 1000
    ).toISOString();
  }

  async postContent(content: any): Promise<ConnectorResponse> {
    const { text, media, reply_to } = content;

    let tweetData: any = { text };

    if (reply_to) {
      tweetData.reply = { in_reply_to_tweet_id: reply_to };
    }

    const tweet = await this.client.v2.tweet(tweetData);

    return {
      success: true,
      data: tweet.data
    };
  }
}
```

### Example 4: Facebook (Complex Actions)
**Implementation**: `/backend/src/modules/connectors/social/facebook.connector.ts`

```typescript
@Injectable()
export class FacebookConnector extends BaseConnector implements ISocialConnector {
  private accessToken: string;
  private pageId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  async postContent(content: any): Promise<ConnectorResponse> {
    const { message, link, photo, video, scheduled_publish_time } = content;

    let postData: any = {};
    let endpoint = `${this.baseUrl}/${this.pageId}/feed`;

    if (photo) {
      endpoint = `${this.baseUrl}/${this.pageId}/photos`;
      postData.url = photo;
      if (message) postData.caption = message;
    } else if (video) {
      endpoint = `${this.baseUrl}/${this.pageId}/videos`;
      postData.file_url = video;
      if (message) postData.description = message;
    } else {
      if (message) postData.message = message;
      if (link) postData.link = link;
    }

    if (scheduled_publish_time) {
      postData.published = false;
      postData.scheduled_publish_time = scheduled_publish_time;
    }

    postData.access_token = this.accessToken;

    const response = await axios.post(endpoint, postData);

    return {
      success: true,
      data: response.data
    };
  }
}
```

---

## Quick Reference

### Common Patterns

#### 1. Error Handling
```typescript
try {
  const result = await this.performSomeAction();
  return {
    success: true,
    data: result
  };
} catch (error) {
  return this.handleError(error, 'Action failed');
}
```

#### 2. Rate Limiting
```typescript
// Defined in connector definition
rate_limits: {
  requests_per_minute: 60,
  requests_per_second: 10
}

// Used by BaseConnector automatically
await this.checkRateLimit();
```

#### 3. Retry Logic
```typescript
// Retry with exponential backoff (built into BaseConnector)
const response = await this.executeWithRetry(async () => {
  return await this.performRequest(request);
});
```

#### 4. Pagination
```typescript
async getItems(options?: PaginatedRequest): Promise<ConnectorResponse> {
  const limit = options?.limit || 10;
  const cursor = options?.cursor;

  const response = await this.makeApiRequest({
    limit,
    cursor
  });

  return {
    success: true,
    data: {
      items: response.items,
      pagination: {
        next_cursor: response.next_cursor,
        has_more: !!response.next_cursor
      }
    }
  };
}
```

### Field Type Reference

| Type | Usage | Additional Properties |
|------|-------|----------------------|
| `string` | Text input | `inputType`, `maxLength`, `pattern` |
| `number` | Numeric input | `min`, `max`, `step` |
| `boolean` | Checkbox | `default` |
| `select` | Dropdown | `options`, `enum` |
| `array` | List of items | `itemSchema` |
| `object` | Nested object | `properties` |

### Input Types for String Fields

| InputType | Description |
|-----------|-------------|
| `text` | Single-line text input (default) |
| `textarea` | Multi-line text input |
| `email` | Email input with validation |
| `url` | URL input with validation |
| `password` | Password input (masked) |

### Common Icon Names
- `send`, `message-circle`, `message-square`
- `user`, `user-plus`, `user-minus`
- `image`, `file`, `video`
- `calendar`, `clock`, `bell`
- `shield`, `lock`, `key`
- `settings`, `tool`, `filter`

### File Locations Reference

| Component | Location |
|-----------|----------|
| Connector definitions | `/backend/src/common/constants/connector.constants.ts` |
| Type definitions | `/backend/src/modules/connectors/types/index.ts` |
| Base connector | `/backend/src/modules/connectors/base/base.connector.ts` |
| Interfaces | `/backend/src/modules/connectors/base/connector.interface.ts` |
| Communication connectors | `/backend/src/modules/connectors/communication/` |
| Social connectors | `/backend/src/modules/connectors/social/` |
| CRM connectors | `/backend/src/modules/connectors/crm/` |
| AI connectors | `/backend/src/modules/connectors/ai/` |
| Database schema | `/backend/src/modules/database/platform.service.ts` |

---

## Data Flow

### 1. Connector Seeding (Application Startup)
```
CONNECTOR_DEFINITIONS (connector.constants.ts)
    ↓
Database Seeder
    ↓
connectors table (PostgreSQL)
    ↓
Frontend fetches connector list via API
    ↓
User sees available connectors in UI
```

### 2. User Configuration Flow
```
User clicks "Add Connector"
    ↓
Frontend fetches connector definition (including auth_fields)
    ↓
Frontend dynamically generates configuration form
    ↓
User fills in credentials (e.g., API key, OAuth tokens)
    ↓
Frontend sends POST to /api/connectors/config
    ↓
Backend validates and stores in connector_configs table
    ↓
Credentials encrypted in database
```

### 3. Action Execution Flow
```
User creates workflow with connector action
    ↓
Workflow engine loads connector config
    ↓
ConnectorFactory creates connector instance
    ↓
connector.initialize(config) called
    ↓
connector.executeAction(actionId, input) called
    ↓
Connector performs API request to external service
    ↓
Result returned to workflow engine
    ↓
Next workflow step executed
```

### 4. Trigger Flow (Webhook)
```
External service sends webhook to /api/webhooks/[connector]/[triggerId]
    ↓
Backend receives webhook payload
    ↓
Connector.processWebhook(payload, headers) called
    ↓
Connector validates and transforms webhook data
    ↓
Workflow engine finds workflows with this trigger
    ↓
Workflows executed with webhook data as input
```

---

## Best Practices

### 1. Naming Conventions
- **Connector name**: lowercase with underscores (e.g., `google_drive`, `send_grid`)
- **Action IDs**: lowercase with underscores (e.g., `send_message`, `create_contact`)
- **Field keys**: camelCase (e.g., `chatId`, `parseMode`)

### 2. Error Handling
- Always use try-catch blocks
- Return `ConnectorResponse` with proper error codes
- Use `this.handleError()` for consistent error formatting
- Log errors with `this.logger.error()`

### 3. Authentication
- Never log credentials or tokens
- Store sensitive data in `credentials` JSONB field
- Implement token refresh for OAuth2 connectors
- Validate credentials in `initializeConnection()`

### 4. Schema Design
- Mark all required fields explicitly
- Provide helpful descriptions and placeholders
- Use appropriate input types
- Include validation constraints (min, max, pattern)

### 5. Testing
- Test connection before saving configuration
- Implement comprehensive error scenarios
- Test rate limiting behavior
- Validate webhook signatures

---

## Troubleshooting

### Common Issues

#### 1. "Connector not found" error
- Check if connector is defined in `CONNECTOR_DEFINITIONS`
- Verify connector type is added to `ConnectorType` enum
- Ensure connector is registered in module providers

#### 2. "Invalid credentials" error
- Verify auth_fields match connector implementation
- Check if credentials are properly stored in config
- Test credentials with external service directly

#### 3. OAuth token expired
- Implement `refreshTokens()` method
- Check token expiration before API calls
- Store refresh token properly

#### 4. Rate limit exceeded
- Review connector's rate_limits configuration
- Implement proper backoff strategy
- Monitor usage statistics

---

## Migration and Seeding

### Seeding New Connector
When you add a new connector to `connector.constants.ts`, it will be automatically seeded to the database on application restart.

The seeding process:
1. Reads `CONNECTOR_DEFINITIONS` array
2. Inserts/updates records in `connectors` table
3. JSONB fields (`auth_fields`, `supported_actions`, `supported_triggers`) are stored as-is

### Manual Database Update
If you need to update a connector definition:

```sql
UPDATE connectors
SET
  auth_fields = '...',
  supported_actions = '...',
  supported_triggers = '...'
WHERE name = 'your_connector';
```

---

## Additional Resources

### Similar Connectors for Reference
- **API Key Auth**: Telegram, OpenAI
- **OAuth2**: Gmail, Twitter, Facebook, Google Drive
- **Webhook Support**: Telegram, Facebook, Slack
- **Polling Triggers**: Gmail, Twitter
- **Complex Actions**: OpenAI (with detailed schemas), Facebook (media handling)

### Useful Utilities
- `AuthUtils`: Helper for creating auth headers
- `ApiUtils`: HTTP request utilities with retry logic
- `BaseConnector`: Provides rate limiting, retries, error handling

---

This documentation should serve as a comprehensive guide for understanding and implementing new connectors in the Fluxturn automation platform. When adding a new connector, follow the implementation pattern and refer to existing connector examples for specific use cases.
