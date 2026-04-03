# Connector Development Guide

This guide walks through the process of building a new connector for FluxTurn. By the end, you will have a working connector with actions, triggers, and authentication.

## Prerequisites

- Node.js 18+
- A running FluxTurn development environment (see [Quick Start](../getting-started/quick-start.md))
- Familiarity with TypeScript and NestJS basics
- API documentation for the service you want to integrate

## Architecture Overview

Every connector in FluxTurn has two parts:

1. **Connector definition** -- A declarative JSON object in `connector.constants.ts` that describes the connector's metadata, auth fields, actions, and triggers. This is what the frontend reads to render configuration forms and action/trigger pickers.
2. **Connector class** -- A TypeScript class that extends `BaseConnector` and implements the actual API calls.

The full architecture is documented in `backend/CLAUDE.md`. Here is the short version:

```
connector.constants.ts   -->  Database (seeded on startup)  -->  Frontend UI
connector class           -->  Workflow engine calls executeAction() at runtime
```

### Key files

| File | Purpose |
|------|---------|
| `backend/src/common/constants/connector.constants.ts` | Connector definitions (metadata, auth, actions, triggers) |
| `backend/src/modules/fluxturn/connectors/types/index.ts` | `ConnectorType` and `ConnectorCategory` enums |
| `backend/src/modules/fluxturn/connectors/base/base.connector.ts` | Base class all connectors extend |
| `backend/src/modules/fluxturn/connectors/base/connector.interface.ts` | Category-specific interfaces |
| `backend/src/modules/fluxturn/connectors/connectors.module.ts` | NestJS module registration |

## Step-by-Step Guide

### Step 1: Add the Connector Definition

Open `backend/src/common/constants/connector.constants.ts` and add an entry to the `CONNECTOR_DEFINITIONS` array:

```typescript
{
  name: 'acme',
  display_name: 'Acme',
  category: 'communication',
  description: 'Send and receive messages through Acme',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'ak_...',
      description: 'Find this in your Acme dashboard under Settings > API',
    },
  ],
  endpoints: {
    base_url: 'https://api.acme.com/v1',
  },
  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },
  supported_actions: [
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a message to a channel',
      category: 'Messages',
      icon: 'send',
      api: {
        endpoint: '/messages',
        method: 'POST',
        baseUrl: 'https://api.acme.com/v1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: { channel: 'channel', text: 'text' },
      },
      inputSchema: {
        channel: { type: 'string', required: true, label: 'Channel' },
        text: { type: 'string', required: true, label: 'Message', inputType: 'textarea' },
      },
    },
  ],
  supported_triggers: [],
}
```

### Step 2: Add the Type Enum

Open `backend/src/modules/fluxturn/connectors/types/index.ts` and add your connector to the `ConnectorType` enum:

```typescript
export enum ConnectorType {
  // ... existing entries
  ACME = 'acme',
}
```

### Step 3: Create the Connector Class

Create a new file in the appropriate category directory. For a communication connector:

`backend/src/modules/fluxturn/connectors/communication/acme.connector.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../base/base.connector';
import { ICommunicationConnector } from '../base/connector.interface';
import {
  ConnectorMetadata, ConnectorResponse, ConnectorCategory,
  ConnectorType, AuthType, ConnectorConfig, ConnectorRequest,
  PaginatedRequest,
} from '../types';

@Injectable()
export class AcmeConnector extends BaseConnector implements ICommunicationConnector {

  getMetadata(): ConnectorMetadata {
    return {
      name: 'acme',
      description: 'Acme messaging connector',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.ACME,
      authType: AuthType.API_KEY,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiKey) {
      throw new Error('API key is required');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    // Call a lightweight endpoint to verify the key works
    const res = await this.makeRequest('GET', '/me');
    return res.status === 200;
  }

  protected async performHealthCheck(): Promise<void> {
    await this.performConnectionTest();
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    return this.makeRequest(request.method, request.endpoint, request.body);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_message':
        return this.sendMessage(input.channel, input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {}

  // -- ICommunicationConnector methods --

  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const res = await this.makeRequest('POST', '/messages', {
      channel: Array.isArray(to) ? to[0] : to,
      text: message.text || message,
    });
    return { success: true, data: res.data };
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    const res = await this.makeRequest('GET', '/messages');
    return { success: true, data: res.data };
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    const res = await this.makeRequest('GET', `/contacts/${contactId}`);
    return { success: true, data: res.data };
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    const res = await this.makeRequest('POST', '/contacts', contact);
    return { success: true, data: res.data };
  }

  // -- Helpers --

  private async makeRequest(method: string, path: string, body?: any) {
    const axios = require('axios');
    return axios({
      method,
      url: `https://api.acme.com/v1${path}`,
      headers: {
        Authorization: `Bearer ${this.config.credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: body,
    });
  }
}
```

### Step 4: Register in the Module

Open `backend/src/modules/fluxturn/connectors/connectors.module.ts` and add your connector:

```typescript
import { AcmeConnector } from './communication/acme.connector';

@Module({
  providers: [
    // ... existing connectors
    AcmeConnector,
  ],
  exports: [AcmeConnector],
})
export class ConnectorsModule {}
```

### Step 5: Add a Connector Icon

Place an SVG icon at `frontend/public/icons/connectors/acme.svg`. The icon should be square (ideally 24x24 or 48x48) and work on both light and dark backgrounds.

## Auth Types

FluxTurn supports several authentication patterns. Choose the one that matches your target API.

### API Key

The simplest option. The user provides a key that is sent as a header or query parameter.

```typescript
auth_type: 'api_key',
auth_fields: [
  { key: 'apiKey', label: 'API Key', type: 'password', required: true }
]
```

### OAuth2

For services that use the OAuth 2.0 authorization code flow. FluxTurn handles the redirect and token exchange.

```typescript
auth_type: 'oauth2',
oauth_config: {
  authorization_url: 'https://example.com/oauth/authorize',
  token_url: 'https://example.com/oauth/token',
  scopes: ['read', 'write'],
}
```

You will also need to add the corresponding environment variables (`EXAMPLE_OAUTH_CLIENT_ID`, `EXAMPLE_OAUTH_CLIENT_SECRET`, `EXAMPLE_OAUTH_REDIRECT_URI`) to `backend/.env.example`.

### Bearer Token

Similar to API Key but specifically expects a bearer token.

```typescript
auth_type: 'bearer_token',
auth_fields: [
  { key: 'token', label: 'Access Token', type: 'password', required: true }
]
```

## Testing Your Connector

1. **Start the backend** in dev mode: `cd backend && npm run start:dev`. The connector definition is seeded to the database on startup.
2. **Verify seeding** -- Open the app and check that your connector appears in the connector list.
3. **Test connection** -- Add a connector instance with real credentials and use the "Test Connection" button.
4. **Test actions** -- Create a workflow that uses your connector's action and run it.
5. **Write unit tests** -- Add a test file at `backend/src/modules/fluxturn/connectors/communication/__tests__/acme.connector.spec.ts`.

```bash
cd backend
npm test -- --testPathPattern=acme
```

## Submitting a PR

1. Fork the repository and create a branch from `develop`: `git checkout -b feature/connector-acme`
2. Include all four changes: definition, type enum, connector class, module registration.
3. Add an icon SVG to `frontend/public/icons/connectors/`.
4. Add at least basic unit tests.
5. Open a pull request against the `develop` branch with a clear description of the service and the actions/triggers you implemented.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for general contribution guidelines.
