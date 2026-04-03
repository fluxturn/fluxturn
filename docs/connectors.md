# Connectors

FluxTurn ships with 80+ connectors that let your workflows interact with external services. Each connector defines actions (things you can do) and triggers (events that start a workflow).

## Overview

Connectors are the building blocks of FluxTurn workflows. A connector wraps an external API and exposes a set of **actions** and **triggers** that you can use in the visual workflow builder.

- **Actions** -- Operations your workflow can perform, such as "Send a Slack message" or "Create a Jira ticket."
- **Triggers** -- Events that start a workflow, such as "New email received" or "Order placed in Shopify."

Each connector handles authentication, rate limiting, and error handling so you can focus on building workflows.

## Categories

### CRM & Sales

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| HubSpot | OAuth2 | Contacts, deals, companies, tickets |
| Salesforce | OAuth2 | Leads, opportunities, accounts, cases |
| Pipedrive | API Key | Deals, contacts, activities, pipelines |
| Zoho CRM | OAuth2 | Leads, contacts, deals, accounts |
| Airtable | API Key | Bases, tables, records |

### Communication

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| Slack | OAuth2 | Messages, channels, reactions, files |
| Gmail | OAuth2 | Send, read, label, and search emails |
| Outlook | OAuth2 | Email, calendar, contacts |
| Telegram | API Key | Messages, photos, documents via Bot API |
| Discord | OAuth2 | Messages, channels, webhooks |
| Twilio | API Key | SMS, voice calls, WhatsApp |
| SendGrid | API Key | Transactional and marketing emails |
| Microsoft Teams | OAuth2 | Messages, channels, meetings |

### E-Commerce

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| Shopify | OAuth2 | Orders, products, customers, inventory |
| Stripe | API Key | Payments, subscriptions, invoices |
| PayPal | OAuth2 | Payments, refunds, disputes |
| WooCommerce | API Key | Orders, products, customers |
| Paddle | API Key | Subscriptions, transactions |
| Gumroad | API Key | Sales, products, subscribers |

### Project Management

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| Jira | OAuth2 | Issues, projects, sprints, boards |
| Asana | OAuth2 | Tasks, projects, sections |
| Trello | API Key | Cards, boards, lists |
| Notion | OAuth2 | Pages, databases, blocks |
| Linear | API Key | Issues, projects, cycles |
| ClickUp | API Key | Tasks, spaces, folders |

### Social Media

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| Twitter/X | OAuth2 | Tweets, mentions, DMs, followers |
| Facebook | OAuth2 | Posts, pages, ads, insights |
| Instagram | OAuth2 | Posts, stories, comments |
| TikTok | OAuth2 | Videos, comments, analytics |
| LinkedIn | OAuth2 | Posts, connections, company pages |
| Pinterest | OAuth2 | Pins, boards, analytics |
| Reddit | OAuth2 | Posts, comments, subreddits |

### AI & ML

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| OpenAI | API Key | Chat completions, embeddings, images (DALL-E) |
| Anthropic | API Key | Claude chat completions |
| Google AI | API Key | Gemini models |
| AWS Bedrock | API Key | Foundation models |
| Ollama | None | Local LLM inference |
| Replicate | API Key | Run open-source ML models |

### Analytics & Monitoring

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| PostHog | API Key | Events, feature flags, insights |
| Mixpanel | API Key | Events, user profiles, funnels |
| Segment | API Key | Track, identify, group |
| Grafana | API Key | Dashboards, alerts, annotations |
| Metabase | API Key | Questions, dashboards, collections |
| Splunk | API Key | Search, alerts, dashboards |

### Cloud & Storage

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| Google Drive | OAuth2 | Files, folders, permissions |
| Dropbox | OAuth2 | Files, folders, sharing |
| AWS S3 | API Key | Buckets, objects, presigned URLs |
| PostgreSQL | API Key | Queries, inserts, updates |
| Snowflake | API Key | Queries, warehouses |
| Supabase | API Key | Database, auth, storage |

### Finance

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| QuickBooks | OAuth2 | Invoices, customers, payments |
| Plaid | API Key | Bank accounts, transactions |
| Chargebee | API Key | Subscriptions, invoices |
| Wise | API Key | Transfers, balances, recipients |

### Marketing

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| Mailchimp | API Key | Campaigns, audiences, automations |
| Klaviyo | API Key | Flows, lists, campaigns |
| Facebook Ads | OAuth2 | Campaigns, ad sets, ads |

### CMS

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| WordPress | API Key | Posts, pages, comments, media |
| Contentful | API Key | Entries, content types, assets |
| Ghost | API Key | Posts, pages, members |
| Medium | OAuth2 | Posts, publications |
| Webflow | API Key | Sites, collections, items |

### Support

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| Zendesk | API Key | Tickets, users, organizations |
| Intercom | OAuth2 | Conversations, contacts, companies |
| ServiceNow | OAuth2 | Incidents, requests, changes |
| PagerDuty | API Key | Incidents, services, escalations |
| Sentry | API Key | Issues, events, releases |

### Developer Tools

| Connector | Auth Type | Description |
|-----------|-----------|-------------|
| GitHub | OAuth2 | Repos, issues, PRs, actions |

## How to Add a New Connector

FluxTurn's connector framework is designed to make it straightforward to add new integrations. The process involves defining the connector metadata, implementing the connector class, and registering it in the module system.

See the [Connector Development Guide](guides/connector-development.md) for a complete walkthrough.

## Community Connectors

We welcome connector contributions from the community. If there is a service you want FluxTurn to support, you can either:

1. **Build it yourself** -- Follow the [Connector Development Guide](guides/connector-development.md) and submit a pull request.
2. **Request it** -- Open a [Feature Request](https://github.com/fluxturn/fluxturn/issues/new?template=feature_request.yml) describing the service and the actions/triggers you need.

Community-contributed connectors go through the same review process as core connectors. Once merged, they are maintained as part of the official connector set.
