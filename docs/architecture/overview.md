# Architecture Overview

This document describes the high-level architecture of FluxTurn, how the pieces fit together, and where to find things in the codebase.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, Vite, TailwindCSS | UI, workflow builder |
| Workflow Editor | ReactFlow | Visual node-based editor |
| Internationalization | i18next | Multi-language support |
| Code Editor | CodeMirror | In-app code editing |
| Backend | NestJS, TypeScript | REST API, workflow engine, connector runtime |
| Database | PostgreSQL (raw SQL) | Primary data store, multi-tenant isolation |
| Cache & Queues | Redis | Caching, pub/sub, rate limiting |
| Vector Database | Qdrant | Embeddings for AI workflow generation |
| AI | LangChain, OpenAI, DeepSeek | Workflow generation, code generation |
| Real-Time | Socket.IO | Live workflow execution updates |

## Project Structure

```
fluxturn/
  backend/                          # NestJS backend application
    src/
      common/
        constants/                  # Connector definitions, shared constants
        filters/                    # Exception filters
      modules/
        auth/                       # JWT, OAuth, API key authentication
        database/                   # PostgreSQL platform service (raw SQL)
        fluxturn/
          connectors/               # 80+ connector implementations
            base/                   # BaseConnector class and interfaces
            communication/          # Slack, Gmail, Telegram, etc.
            social/                 # Twitter, Facebook, Instagram, etc.
            crm/                    # HubSpot, Salesforce, Pipedrive, etc.
            ai/                     # OpenAI, Anthropic, Google AI, etc.
            ecommerce/              # Shopify, Stripe, PayPal, etc.
            ...                     # More category directories
          workflow/                  # Workflow engine and execution
          conversations/            # AI conversation handling
        ai/                         # AI services (LangChain, embeddings)
        organization/               # Multi-tenant organization management
        project/                    # Project management
        realtime/                   # WebSocket gateways (Socket.IO)
        storage/                    # File storage (local + Cloudflare R2)
        email/                      # Email service (SMTP)
        stripe/                     # Payment processing
      scripts/                      # Seed scripts, utilities
    scripts/                        # Shell and TypeScript utility scripts

  frontend/                         # React frontend application
    src/
      components/
        workflow/                   # Workflow builder, node types, edges
        landing/                    # Landing page sections
        layout/                     # Layout components (header, sidebar, footer)
        ui/                         # Shared UI components (Radix/Shadcn-based)
      pages/                        # Route-level page components
      i18n/                         # i18next setup and locale files
        locales/                    # en.json, ja.json, ...
      lib/                          # API client, utility functions
      hooks/                        # Custom React hooks
      contexts/                     # React context providers
```

## How Workflows Work

A workflow in FluxTurn is a directed graph of nodes. Each node is either a **trigger** (the starting event) or an **action** (a step that does something).

### Execution flow

```
1. Trigger fires
     |
     v
2. Workflow engine loads the workflow definition
     |
     v
3. For each node in topological order:
     a. Resolve input data (from previous node outputs or static config)
     b. Load the connector instance and credentials
     c. Call connector.executeAction(actionId, input)
     d. Store the output
     |
     v
4. Execution completes, results stored in database
```

### Trigger types

- **Manual** -- User clicks "Execute" in the UI.
- **Webhook** -- An external service sends an HTTP request to a FluxTurn webhook URL. The connector validates the payload and starts the workflow.
- **Polling** -- FluxTurn periodically checks an external service for new data (for example, checking Gmail for new emails).
- **Schedule** -- Workflow runs on a cron schedule.

### Real-time updates

During execution, the backend emits events over Socket.IO so the frontend can show live progress. Each node's status (pending, running, success, error) and output data are streamed to the connected client.

## Connector Framework

Connectors are the integration layer between FluxTurn and external services. The framework has two parts:

### 1. Connector definitions (declarative)

Stored in `backend/src/common/constants/connector.constants.ts`. Each definition includes:

- Metadata (name, category, description)
- Auth configuration (type, fields the user needs to fill in)
- Actions (what the connector can do)
- Triggers (what events the connector can listen for)

These definitions are seeded to the `connectors` table in PostgreSQL on application startup. The frontend reads them via the API to render connector UIs dynamically.

### 2. Connector classes (imperative)

TypeScript classes that extend `BaseConnector` and implement a category-specific interface (for example, `ICommunicationConnector` or `ISocialConnector`).

The `BaseConnector` provides:

- Connection lifecycle (`initialize`, `testConnection`, `destroy`)
- Retry logic with exponential backoff (`executeWithRetry`)
- Rate limiting (`checkRateLimit`)
- Standardized error handling (`handleError`)

Each connector implements `performAction(actionId, input)` which dispatches to the appropriate method based on the action ID.

See the [Connector Development Guide](../guides/connector-development.md) for implementation details.

## Database Schema

FluxTurn uses PostgreSQL with raw SQL queries (no ORM). The platform service (`backend/src/modules/database/platform.service.ts`) manages the schema.

### Key tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts and authentication |
| `organizations` | Multi-tenant organizations |
| `projects` | Projects within organizations |
| `workflows` | Workflow definitions (nodes, edges, config) |
| `workflow_executions` | Execution history and results |
| `connectors` | Connector definitions (seeded from constants) |
| `connector_configs` | User-created connector instances with encrypted credentials |
| `conversations` | AI chat conversations for workflow generation |

### Multi-tenancy

FluxTurn supports multi-tenant isolation. Each organization can have its own tenant database. The `TENANT_DB_*` environment variables configure the connection to tenant databases. The platform database stores shared data (users, organizations, connectors), while tenant databases store organization-specific data.

### Credential storage

Connector credentials are stored in the `connector_configs` table in a `credentials` JSONB column. Values are encrypted using the `CONNECTOR_ENCRYPTION_KEY` before storage. The encryption key must be kept secret and consistent across deployments -- changing it invalidates all stored credentials.

## Data Flow Summary

```
User creates workflow in UI
    |
    v
Frontend sends workflow definition to REST API
    |
    v
Backend stores workflow in PostgreSQL
    |
    v
Trigger fires (manual, webhook, poll, or schedule)
    |
    v
Workflow engine loads definition + connector configs
    |
    v
For each node: connector.executeAction() calls external API
    |
    v
Results stored in workflow_executions table
    |
    v
Real-time updates sent to frontend via Socket.IO
```

## Further Reading

- [Connector List](../connectors.md) -- All available connectors
- [Connector Development Guide](../guides/connector-development.md) -- Build a new connector
- [Configuration Reference](../getting-started/configuration.md) -- Environment variables
- [Quick Start](../getting-started/quick-start.md) -- Get running locally
