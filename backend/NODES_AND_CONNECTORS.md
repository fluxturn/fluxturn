# FluxTurn Nodes and Connectors Reference

**Generated:** 2025-11-19
**Database:** 146 templates seeded successfully
**Connectors:** 59 connectors available

---

## Table of Contents
1. [Node Types Overview](#node-types-overview)
2. [Trigger Nodes](#trigger-nodes)
3. [Action Nodes](#action-nodes)
4. [Tool Nodes](#tool-nodes)
5. [Control Flow Nodes](#control-flow-nodes)
6. [Connectors Reference](#connectors-reference)
7. [Node Type Enum](#node-type-enum)

---

## Node Types Overview

FluxTurn supports **28 node types** organized into 4 categories:

| Category | Count | Node Types |
|----------|-------|------------|
| **Triggers** | 6 | MANUAL_TRIGGER, SCHEDULE_TRIGGER, WEBHOOK_TRIGGER, FORM_TRIGGER, WEBHOOK, CONNECTOR_TRIGGER |
| **Actions** | 14 | HTTP_REQUEST, DATABASE_QUERY, TRANSFORM_DATA, RUN_CODE, AI_AGENT, OPENAI_CHAT_MODEL, SIMPLE_MEMORY, REDIS_MEMORY, MERGE, SPLIT, SET, CONNECTOR_ACTION, GMAIL_TOOL |
| **Control Flow** | 5 | IF_CONDITION, SWITCH, LOOP, FILTER, WAIT |
| **Other** | 1 | NOTE |

---

## Trigger Nodes

### 1. MANUAL_TRIGGER
- **Label:** Manual Trigger
- **Description:** Manually execute the workflow
- **Icon:** MousePointerClick
- **Color:** cyan
- **Use Case:** Start workflows on-demand

### 2. SCHEDULE_TRIGGER
- **Label:** Schedule
- **Description:** Run on a schedule (cron)
- **Icon:** Clock
- **Color:** cyan
- **Configuration:**
  - Schedule mode (minutes, hourly, daily, weekly, monthly, custom cron)
  - Timezone support
- **Use Case:** Automated recurring workflows

### 3. WEBHOOK_TRIGGER
- **Label:** Webhook
- **Description:** Receive HTTP webhooks from any service (Stripe, GitHub, etc.)
- **Icon:** Webhook
- **Color:** cyan
- **Configuration:**
  - HTTP method (GET, POST, PUT, PATCH, DELETE, ALL)
  - Authentication (None, Basic, Bearer, Header, JWT)
  - Response mode (async, on complete, last node)
  - CORS support
  - IP whitelist
- **Use Case:** Integration with external services via webhooks

### 4. FORM_TRIGGER
- **Label:** On Form Submission
- **Description:** Create a web form and trigger workflow on submission
- **Icon:** FileText
- **Color:** cyan
- **Configuration:**
  - Form fields definition
  - Success message
  - Submit button text
- **Use Case:** Collect data via web forms

### 5. WEBHOOK
- **Label:** App Webhook
- **Description:** Receive webhooks from connected apps
- **Icon:** Webhook
- **Color:** cyan
- **Use Case:** Connector-specific webhooks

### 6. CONNECTOR_TRIGGER
- **Label:** App Trigger
- **Description:** Trigger from connected apps (Facebook, Telegram, Gmail, etc.)
- **Icon:** Zap
- **Color:** cyan
- **Dynamic:** Configuration fields populated based on selected connector trigger
- **Use Case:** Event-based triggers from integrated apps

---

## Action Nodes

### 1. HTTP_REQUEST
- **Label:** HTTP Request
- **Description:** Make HTTP/API requests with advanced options
- **Icon:** Globe
- **Color:** teal
- **Configuration:**
  - HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
  - Authentication (None, Credential, Bearer Token, Header Auth, Query Auth)
  - Query parameters, Headers, Body (JSON, Form, Multipart, Raw, Binary)
  - Response format, Timeout, Redirects, SSL, Proxy
- **Use Case:** API integrations, REST requests

### 2. DATABASE_QUERY
- **Label:** Database Query
- **Description:** Execute a database query
- **Icon:** Database
- **Color:** teal
- **Configuration:**
  - Database connection
  - SQL query
- **Use Case:** Data retrieval and manipulation

### 3. TRANSFORM_DATA
- **Label:** Transform Data
- **Description:** Transform data using JSONata
- **Icon:** FileJson
- **Color:** teal
- **Configuration:**
  - JSONata expression
- **Use Case:** Data transformation and mapping

### 4. RUN_CODE
- **Label:** Run Code
- **Description:** Execute custom JavaScript code
- **Icon:** Code
- **Color:** teal
- **Configuration:**
  - JavaScript code editor
- **Use Case:** Custom logic and data processing

### 5. AI_AGENT
- **Label:** AI Agent
- **Description:** AI Agent with chat model, memory, and tools
- **Icon:** Brain
- **Color:** teal
- **Configuration:**
  - System prompt
  - Temperature (0-1)
  - Max tokens
  - Input message
- **Use Case:** AI-powered conversations and tasks

### 6. OPENAI_CHAT_MODEL
- **Label:** OpenAI Chat Model
- **Description:** Provides OpenAI GPT model configuration for AI Agent
- **Icon:** Bot
- **Color:** teal
- **Configuration:**
  - Model selection (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo)
  - Temperature (0-2)
  - Max tokens
  - Top P, Frequency penalty, Presence penalty
- **Use Case:** OpenAI integration for AI tasks

### 7. SIMPLE_MEMORY
- **Label:** Simple Memory
- **Description:** Stores conversation history in memory (no credentials required)
- **Icon:** Database
- **Color:** purple
- **Configuration:**
  - Session ID source
  - Context window length
- **Use Case:** In-memory chat history

### 8. REDIS_MEMORY
- **Label:** Redis Chat Memory
- **Description:** Stores conversation history in Redis (persistent, scalable)
- **Icon:** Database
- **Color:** red
- **Configuration:**
  - Redis credential
  - Session ID, TTL
  - Context window length
- **Use Case:** Persistent chat history across sessions

### 9. MERGE
- **Label:** Merge
- **Description:** Combine data from multiple inputs using various strategies
- **Icon:** GitMerge
- **Color:** teal
- **Configuration:**
  - Number of inputs (2-10)
  - Merge mode (Append, Combine, Combine by SQL, Choose Branch)
  - Join mode (Inner, Outer, Left, Right)
  - Field matching, Clash handling
- **Use Case:** Data aggregation from multiple sources

### 10. SPLIT
- **Label:** Split
- **Description:** Split data into multiple outputs using various strategies
- **Icon:** Split
- **Color:** teal
- **Configuration:**
  - Number of outputs (2-10)
  - Split mode (Duplicate, By Condition, Evenly, By Field, By Size)
  - Routing conditions, Field values, Chunk size
- **Use Case:** Route data to multiple paths

### 11. SET
- **Label:** Edit Fields (Set)
- **Description:** Add, modify, or remove item fields
- **Icon:** Edit
- **Color:** teal
- **Configuration:**
  - Mode (Manual mapping, JSON)
  - Fields to set/modify
  - Include/exclude options
  - Dot notation support
- **Use Case:** Data field manipulation

### 12. GMAIL_TOOL
- **Label:** Gmail Tool
- **Description:** Send emails and manage labels through Gmail (AI Agent tool)
- **Icon:** Mail
- **Color:** blue
- **Configuration:**
  - Gmail credential
  - Operation (Send email, Get labels)
  - Email fields (To, Subject, Message, CC, BCC)
  - Email type (HTML, Text)
- **Use Case:** Email automation via Gmail

### 13. CONNECTOR_ACTION
- **Label:** App Action
- **Description:** Perform actions in connected apps
- **Icon:** Zap
- **Color:** teal
- **Dynamic:** Configuration fields populated based on selected connector action
- **Use Case:** Execute operations in integrated apps

---

## Tool Nodes

Tool nodes are specialized action nodes that provide specific functionality for AI agents:

### GMAIL_TOOL
- **Purpose:** Email operations for AI agents
- **Operations:**
  - Send email
  - Get labels
- **Integration:** Works with AI Agent node

---

## Control Flow Nodes

### 1. IF_CONDITION
- **Label:** If
- **Description:** Branch workflow based on conditions
- **Icon:** GitBranch
- **Color:** purple
- **Configuration:**
  - Conditions builder (AND/OR combinators)
  - Operators (equals, not equals, contains, greater than, less than, etc.)
  - Ignore case option
- **Outputs:** 2 (true, false)
- **Use Case:** Conditional branching

### 2. SWITCH
- **Label:** Switch
- **Description:** Route data to different branches based on rules
- **Icon:** Workflow
- **Color:** purple
- **Configuration:**
  - Mode (Rules, Expression)
  - Routing rules with conditions
  - Fallback output (None, Extra)
  - Ignore case option
- **Outputs:** Multiple (based on rules)
- **Use Case:** Multi-path routing

### 3. LOOP
- **Label:** Loop Over Items
- **Description:** Iterate over array items and execute actions for each
- **Icon:** Repeat
- **Color:** purple
- **Configuration:**
  - Items expression (array)
  - Batch size
- **Use Case:** Iterate over collections

### 4. FILTER
- **Label:** Filter
- **Description:** Filter items based on conditions
- **Icon:** Filter
- **Color:** purple
- **Configuration:**
  - Filter conditions
  - Ignore case option
- **Use Case:** Data filtering

### 5. WAIT
- **Label:** Wait
- **Description:** Wait before continuing with execution
- **Icon:** PauseCircle
- **Color:** purple
- **Configuration:**
  - Resume mode:
    - After time interval (seconds, minutes, hours, days)
    - At specified time (ISO datetime)
    - On webhook call
    - On form submitted
  - Wait limit options
- **Use Case:** Delayed execution, approvals, timed workflows

---

## Connectors Reference

FluxTurn supports **59 connectors** across 15 categories:

### AI/ML Connectors (4)

#### 1. OpenAI
- **Name:** `openai`
- **Display Name:** AI Text Generation
- **Category:** ai
- **Auth:** API Key
- **Description:** Advanced AI text generation and embeddings
- **Endpoints:**
  - Completions: `/v1/chat/completions`
  - Embeddings: `/v1/embeddings`
  - Models: `/v1/models`
- **Rate Limits:** 60 requests/minute

#### 2. Anthropic
- **Name:** `anthropic`
- **Display Name:** AI Assistant
- **Category:** ai
- **Auth:** API Key
- **Description:** Advanced AI reasoning and analysis
- **Endpoints:**
  - Messages: `/v1/messages`
  - Completions: `/v1/complete`
- **Rate Limits:** 50 requests/minute

#### 3. Google AI
- **Name:** `google_ai`
- **Display Name:** AI Language Model
- **Category:** ai
- **Auth:** API Key
- **Description:** AI language models for content generation
- **Endpoints:**
  - Generate Content: `/v1beta/models/{model}:generateContent`
- **Rate Limits:** 60 requests/minute

#### 4. AWS Bedrock
- **Name:** `aws_bedrock`
- **Display Name:** Enterprise AI Platform
- **Category:** ai
- **Auth:** AWS Credentials
- **Description:** Enterprise AI platform with multiple model options
- **Endpoints:**
  - Invoke: `/model/{modelId}/invoke`
- **Rate Limits:** 100 requests/minute
- **Sandbox:** Available

---

### Communication Connectors (8)

#### 1. Gmail
- **Name:** `gmail`
- **Display Name:** Email Service
- **Category:** communication
- **Auth:** OAuth2
- **Description:** Send and receive emails
- **Endpoints:**
  - Send: `/gmail/v1/users/me/messages/send`
  - List: `/gmail/v1/users/me/messages`
- **Webhook Support:** Yes
- **Rate Limits:** 25 requests/second
- **Sandbox:** Available

#### 2. Slack
- **Name:** `slack`
- **Display Name:** Team Communication
- **Category:** communication
- **Auth:** OAuth2
- **Description:** Send messages and manage team workspaces
- **Endpoints:**
  - Post Message: `/chat.postMessage`
  - List Channels: `/conversations.list`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute
- **Sandbox:** Available

#### 3. Twilio
- **Name:** `twilio`
- **Display Name:** SMS & Voice Service
- **Category:** communication
- **Auth:** Basic Auth
- **Description:** SMS, voice calls, and instant messaging
- **Endpoints:**
  - Send SMS: `/2010-04-01/Accounts/{AccountSid}/Messages.json`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second
- **Sandbox:** Available

#### 4. SendGrid
- **Name:** `sendgrid`
- **Display Name:** Email Marketing
- **Category:** communication
- **Auth:** API Key
- **Description:** Email delivery and marketing platform
- **Webhook Support:** Yes

#### 5. Discord
- **Name:** `discord`
- **Display Name:** Discord
- **Category:** communication
- **Auth:** Bot Token
- **Description:** Bot integration and real-time messaging
- **Supported Actions:** (7 actions)
  - Send Message
  - Get Messages
  - Create Channel
  - Get Channels
  - Get User Info
  - Create Invite
- **Supported Triggers:** (3 triggers)
  - Message Received
  - Member Joined
  - Channel Created
- **Webhook Support:** Yes
- **Rate Limits:** 50 requests/second

#### 6. Google Calendar
- **Name:** `google_calendar`
- **Display Name:** Google Calendar
- **Category:** communication
- **Auth:** OAuth2
- **Description:** Manage calendar events and meetings
- **Supported Actions:** (3 actions)
  - Create Event
  - Get Event
  - Delete Event
- **Supported Triggers:** (2 triggers)
  - Event Created (polling)
  - Event Started (polling)
- **Rate Limits:** 10 requests/second

#### 7. Microsoft Teams
- **Name:** `teams`
- **Display Name:** Enterprise Chat
- **Category:** communication
- **Auth:** OAuth2
- **Description:** Enterprise messaging and collaboration
- **Webhook Support:** Yes
- **Rate Limits:** 100 requests/minute
- **Sandbox:** Available

#### 8. POP3
- **Name:** `pop3`
- **Display Name:** POP3 Email
- **Category:** communication
- **Auth:** Basic Auth
- **Description:** Read emails using POP3 protocol
- **Rate Limits:** 30 requests/minute

---

### CRM Connectors (7)

#### 1. Salesforce
- **Name:** `salesforce`
- **Display Name:** Enterprise CRM
- **Category:** crm
- **Auth:** OAuth2
- **Description:** Enterprise customer relationship management
- **Endpoints:**
  - Query: `/services/data/v58.0/query`
  - SObjects: `/services/data/v58.0/sobjects`
- **Webhook Support:** Yes
- **Rate Limits:** 15,000 API calls/day
- **Sandbox:** Available

#### 2. HubSpot
- **Name:** `hubspot`
- **Display Name:** CRM & Marketing
- **Category:** crm
- **Auth:** API Key
- **Description:** CRM and marketing automation platform
- **Endpoints:**
  - Contacts: `/crm/v3/objects/contacts`
  - Deals: `/crm/v3/objects/deals`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second
- **Sandbox:** Available

#### 3. Zoho CRM
- **Name:** `zoho`
- **Display Name:** Business CRM
- **Category:** crm
- **Auth:** OAuth2
- **Description:** Business CRM integration
- **Endpoints:**
  - Leads: `/crm/v2/Leads`
  - Contacts: `/crm/v2/Contacts`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute
- **Sandbox:** Available

#### 4. Pipedrive
- **Name:** `pipedrive`
- **Display Name:** Sales CRM
- **Category:** crm
- **Auth:** API Key
- **Description:** Sales-focused CRM platform
- **Endpoints:**
  - Deals: `/api/v1/deals`
  - Persons: `/api/v1/persons`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second
- **Sandbox:** Available

#### 5. Monday.com
- **Name:** `monday`
- **Display Name:** Monday.com
- **Category:** crm
- **Auth:** API Key
- **Description:** Monday.com work management
- **Endpoints:**
  - Query: `/v2`
- **Webhook Support:** Yes
- **Rate Limits:** 10,000 complexity/minute

#### 6. Airtable
- **Name:** `airtable`
- **Display Name:** Airtable
- **Category:** crm
- **Auth:** Bearer Token
- **Description:** Cloud-based database and spreadsheet platform
- **Supported Actions:** (8 actions)
  - Create Record
  - Update Record
  - Get Record
  - Find Records
  - Delete Record
  - List Bases
  - Get Base Schema
  - Get Table Fields
- **Supported Triggers:** (3 triggers)
  - Record Created
  - Record Updated
  - Record Deleted
- **Webhook Support:** Yes
- **Rate Limits:** 5 requests/second, 300/minute, 18,000/hour

#### 7. JotForm
- **Name:** `jotform`
- **Display Name:** Form Builder
- **Category:** crm
- **Auth:** API Key
- **Description:** Online form builder and data collection
- **Webhook Support:** Yes

---

### Social Media Connectors (5)

#### 1. Twitter/X
- **Name:** `twitter`
- **Display Name:** Social Microblogging
- **Category:** social
- **Auth:** OAuth2
- **Description:** Microblogging API for posts and analytics
- **Endpoints:**
  - Tweet: `/2/tweets`
  - Timeline: `/2/users/{id}/tweets`
- **Webhook Support:** Yes
- **Rate Limits:** 300 tweets/15 minutes

#### 2. Facebook
- **Name:** `facebook`
- **Display Name:** Social Network
- **Category:** social
- **Auth:** OAuth2
- **Description:** Social networking API integration
- **Endpoints:**
  - Posts: `/{page-id}/feed`
  - Insights: `/{page-id}/insights`
- **Webhook Support:** Yes
- **Rate Limits:** 200 requests/hour
- **Sandbox:** Available

#### 3. Instagram
- **Name:** `instagram`
- **Display Name:** Photo Sharing
- **Category:** social
- **Auth:** OAuth2
- **Description:** Photo and video sharing platform API
- **Endpoints:**
  - Media: `/{ig-user-id}/media`
  - Insights: `/{ig-user-id}/insights`
- **Webhook Support:** Yes
- **Rate Limits:** 200 requests/hour
- **Sandbox:** Available

#### 4. LinkedIn
- **Name:** `linkedin`
- **Display Name:** Professional Network
- **Category:** social
- **Auth:** OAuth2
- **Description:** Professional networking and content API
- **Endpoints:**
  - Share: `/v2/ugcPosts`
  - Profile: `/v2/me`
- **Rate Limits:** 1,000 requests/day

#### 5. YouTube
- **Name:** `youtube`
- **Display Name:** Video Platform
- **Category:** social
- **Auth:** API Key
- **Description:** Video platform API for content management
- **Endpoints:**
  - Videos: `/youtube/v3/videos`
  - Channels: `/youtube/v3/channels`
- **Webhook Support:** Yes
- **Rate Limits:** 10,000 quota units/day

---

### E-commerce Connectors (4)

#### 1. Stripe
- **Name:** `stripe`
- **Display Name:** Payment Processing
- **Category:** ecommerce
- **Auth:** API Key
- **Description:** Payment processing and subscription management
- **Endpoints:**
  - Charges: `/v1/charges`
  - Customers: `/v1/customers`
  - Subscriptions: `/v1/subscriptions`
- **Webhook Support:** Yes
- **Rate Limits:** 100 requests/second
- **Sandbox:** Available

#### 2. PayPal
- **Name:** `paypal`
- **Display Name:** Payment Service
- **Category:** ecommerce
- **Auth:** OAuth2
- **Description:** Online payment and transaction processing
- **Endpoints:**
  - Payments: `/v2/payments/payment`
  - Orders: `/v2/checkout/orders`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute
- **Sandbox:** Available

#### 3. Shopify
- **Name:** `shopify`
- **Display Name:** E-Commerce Platform
- **Category:** ecommerce
- **Auth:** OAuth2
- **Description:** E-commerce store management platform
- **Endpoints:**
  - Products: `/admin/api/2023-10/products.json`
  - Orders: `/admin/api/2023-10/orders.json`
- **Webhook Support:** Yes
- **Rate Limits:** 2 requests/second
- **Sandbox:** Available

#### 4. WooCommerce
- **Name:** `woocommerce`
- **Display Name:** WooCommerce
- **Category:** ecommerce
- **Auth:** Basic Auth
- **Description:** WooCommerce WordPress integration
- **Endpoints:**
  - Products: `/wp-json/wc/v3/products`
  - Orders: `/wp-json/wc/v3/orders`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute

---

### Database/Storage Connectors (6)

#### 1. MongoDB
- **Name:** `mongodb`
- **Display Name:** NoSQL Database
- **Category:** database
- **Auth:** API Key
- **Description:** NoSQL document database API
- **Endpoints:**
  - Find One: `/action/findOne`
  - Insert One: `/action/insertOne`
  - Update One: `/action/updateOne`
- **Rate Limits:** 100 requests/second
- **Sandbox:** Available

#### 2. MySQL
- **Name:** `mysql`
- **Display Name:** SQL Database
- **Category:** database
- **Auth:** Credentials
- **Description:** Relational SQL database connector
- **Rate Limits:** 100 connections

#### 3. Google Drive
- **Name:** `google_drive`
- **Display Name:** Cloud File Storage
- **Category:** storage
- **Auth:** OAuth2
- **Description:** Cloud file storage and sharing
- **Endpoints:**
  - Files: `/drive/v3/files`
  - Upload: `/upload/drive/v3/files`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second

#### 4. Dropbox
- **Name:** `dropbox`
- **Display Name:** File Sync Service
- **Category:** storage
- **Auth:** OAuth2
- **Description:** File synchronization and storage service
- **Endpoints:**
  - Upload: `/files/upload`
  - List: `/files/list_folder`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute

#### 5. AWS S3
- **Name:** `aws_s3`
- **Display Name:** Object Storage
- **Category:** storage
- **Auth:** AWS Credentials
- **Description:** Scalable object storage service
- **Webhook Support:** Yes
- **Rate Limits:** 3,500 requests/second
- **Sandbox:** Available

#### 6. Google Sheets
- **Name:** `google_sheets`
- **Display Name:** Google Sheets
- **Category:** storage
- **Auth:** OAuth2
- **Description:** Google Sheets spreadsheet operations
- **Endpoints:**
  - Values: `/v4/spreadsheets/{spreadsheetId}/values/{range}`
- **Rate Limits:** 60 requests/minute

---

### Analytics Connectors (3)

#### 1. Google Analytics
- **Name:** `google_analytics`
- **Display Name:** Web Analytics
- **Category:** analytics
- **Auth:** OAuth2
- **Description:** Web analytics and reporting
- **Endpoints:**
  - Reports: `/v4/reports:batchGet`
- **Rate Limits:** 10 requests/second

#### 2. Mixpanel
- **Name:** `mixpanel`
- **Display Name:** Product Analytics
- **Category:** analytics
- **Auth:** API Key
- **Description:** Product analytics and user tracking
- **Endpoints:**
  - Track: `/track`
  - Engage: `/engage`
- **Rate Limits:** 1,000 events/second

#### 3. Segment
- **Name:** `segment`
- **Display Name:** Customer Data Platform
- **Category:** analytics
- **Auth:** API Key
- **Description:** Unified customer data collection and routing
- **Endpoints:**
  - Track: `/v1/track`
  - Identify: `/v1/identify`
- **Webhook Support:** Yes
- **Rate Limits:** 100 requests/second
- **Sandbox:** Available

---

### Marketing Connectors (4)

#### 1. Mailchimp
- **Name:** `mailchimp`
- **Display Name:** Mailchimp
- **Category:** marketing
- **Auth:** API Key
- **Description:** Email marketing campaigns
- **Endpoints:**
  - Lists: `/3.0/lists`
  - Campaigns: `/3.0/campaigns`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second

#### 2. Klaviyo
- **Name:** `klaviyo`
- **Display Name:** Klaviyo
- **Category:** marketing
- **Auth:** API Key
- **Description:** Advanced email and SMS marketing
- **Endpoints:**
  - Profiles: `/api/profiles`
  - Events: `/api/events`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second

#### 3. Google Ads
- **Name:** `google_ads`
- **Display Name:** Google Ads
- **Category:** marketing
- **Auth:** OAuth2
- **Description:** Google Ads campaign management
- **Endpoints:**
  - Search: `/v14/customers/{customer_id}/googleAds:search`
- **Rate Limits:** 15,000 requests/day
- **Sandbox:** Available

#### 4. Facebook Ads
- **Name:** `facebook_ads`
- **Display Name:** Facebook Ads
- **Category:** marketing
- **Auth:** OAuth2
- **Description:** Facebook Ads Manager
- **Endpoints:**
  - Campaigns: `/v17.0/act_{ad_account_id}/campaigns`
  - Insights: `/v17.0/{object_id}/insights`
- **Webhook Support:** Yes
- **Rate Limits:** 200 requests/hour
- **Sandbox:** Available

---

### Project Management Connectors (5)

#### 1. Jira
- **Name:** `jira`
- **Display Name:** Issue Tracking
- **Category:** project_management
- **Auth:** Basic Auth
- **Description:** Issue and project tracking platform
- **Endpoints:**
  - Issues: `/rest/api/3/issue`
  - Search: `/rest/api/3/search`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute

#### 2. Asana
- **Name:** `asana`
- **Display Name:** Project Management
- **Category:** project_management
- **Auth:** OAuth2
- **Description:** Collaborative project management platform
- **Endpoints:**
  - Tasks: `/api/1.0/tasks`
  - Projects: `/api/1.0/projects`
- **Webhook Support:** Yes
- **Rate Limits:** 150 requests/minute

#### 3. Trello
- **Name:** `trello`
- **Display Name:** Task Management
- **Category:** project_management
- **Auth:** API Key
- **Description:** Visual task and board management
- **Endpoints:**
  - Boards: `/1/boards`
  - Cards: `/1/cards`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second

#### 4. Notion
- **Name:** `notion`
- **Display Name:** Workspace Platform
- **Category:** project_management
- **Auth:** API Key
- **Description:** All-in-one workspace and documentation platform
- **Endpoints:**
  - Databases: `/v1/databases`
  - Pages: `/v1/pages`
- **Rate Limits:** 3 requests/second

#### 5. Linear
- **Name:** `linear`
- **Display Name:** Linear
- **Category:** project_management
- **Auth:** API Key
- **Description:** Linear issue tracking
- **Endpoints:**
  - GraphQL: `/graphql`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute

---

### Support Connectors (3)

#### 1. Zendesk
- **Name:** `zendesk`
- **Display Name:** Customer Support
- **Category:** support
- **Auth:** Basic Auth
- **Description:** Customer support and ticketing system
- **Endpoints:**
  - Tickets: `/api/v2/tickets`
  - Users: `/api/v2/users`
- **Webhook Support:** Yes
- **Rate Limits:** 700 requests/minute
- **Sandbox:** Available

#### 2. Intercom
- **Name:** `intercom`
- **Display Name:** Customer Messaging
- **Category:** support
- **Auth:** API Key
- **Description:** Customer messaging and engagement platform
- **Endpoints:**
  - Conversations: `/conversations`
  - Contacts: `/contacts`
- **Webhook Support:** Yes
- **Rate Limits:** 83 requests/minute
- **Sandbox:** Available

#### 3. Freshdesk
- **Name:** `freshdesk`
- **Display Name:** Helpdesk Platform
- **Category:** support
- **Auth:** API Key
- **Description:** Helpdesk and ticketing platform
- **Endpoints:**
  - Tickets: `/api/v2/tickets`
  - Contacts: `/api/v2/contacts`
- **Webhook Support:** Yes
- **Rate Limits:** 100 requests/minute
- **Sandbox:** Available

---

### Forms Connectors (3)

#### 1. Typeform
- **Name:** `typeform`
- **Display Name:** Form Builder
- **Category:** forms
- **Auth:** API Key
- **Description:** Interactive forms and survey builder
- **Endpoints:**
  - Forms: `/forms`
  - Responses: `/forms/{form_id}/responses`
- **Webhook Support:** Yes
- **Rate Limits:** 2 requests/second

#### 2. Google Forms
- **Name:** `google_forms`
- **Display Name:** Survey Platform
- **Category:** forms
- **Auth:** OAuth2
- **Description:** Online surveys and form responses
- **Endpoints:**
  - Forms: `/v1/forms/{formId}`
  - Responses: `/v1/forms/{formId}/responses`
- **Rate Limits:** 60 requests/minute

#### 3. JotForm
- **Name:** `jotform`
- **Display Name:** Form Builder
- **Category:** forms
- **Auth:** API Key
- **Description:** Online form builder and data collection
- **Webhook Support:** Yes

---

### Finance Connectors (1)

#### Plaid
- **Name:** `plaid`
- **Display Name:** Plaid
- **Category:** finance
- **Auth:** API Key
- **Description:** Banking and financial data
- **Endpoints:**
  - Accounts: `/accounts/get`
  - Transactions: `/transactions/get`
- **Webhook Support:** Yes
- **Rate Limits:** 60 requests/minute
- **Sandbox:** Available

---

### Video Connectors (1)

#### Zoom
- **Name:** `zoom`
- **Display Name:** Video Conferencing
- **Category:** video
- **Auth:** OAuth2
- **Description:** Video meetings and webinar platform
- **Endpoints:**
  - Meetings: `/v2/users/{userId}/meetings`
  - Webinars: `/v2/users/{userId}/webinars`
- **Webhook Support:** Yes
- **Rate Limits:** 10 requests/second
- **Sandbox:** Available

---

### Development Connectors (1)

#### GitHub
- **Name:** `github`
- **Display Name:** Code Repository
- **Category:** development
- **Auth:** API Key (Personal Access Token)
- **Description:** Code repository and version control
- **Endpoints:**
  - Repos: `/repos/{owner}/{repo}`
  - Issues: `/repos/{owner}/{repo}/issues`
- **Webhook Support:** Yes
- **Rate Limits:** 5,000 requests/hour

---

### Schedule Connector (1)

#### Schedule
- **Name:** `schedule`
- **Display Name:** Schedule
- **Category:** trigger
- **Auth:** None
- **Description:** Schedule workflows to run at specific times
- **Supported Triggers:** (4 triggers)
  - Daily
  - Weekly
  - Hourly
  - Custom Cron

---

## Node Type Enum

Complete TypeScript enum definition:

```typescript
export enum NodeType {
  // Triggers (6)
  MANUAL_TRIGGER = "MANUAL_TRIGGER",
  SCHEDULE_TRIGGER = "SCHEDULE_TRIGGER",
  WEBHOOK_TRIGGER = "WEBHOOK_TRIGGER",
  FORM_TRIGGER = "FORM_TRIGGER",
  WEBHOOK = "WEBHOOK",
  CONNECTOR_TRIGGER = "CONNECTOR_TRIGGER",

  // Actions (13)
  HTTP_REQUEST = "HTTP_REQUEST",
  DATABASE_QUERY = "DATABASE_QUERY",
  TRANSFORM_DATA = "TRANSFORM_DATA",
  RUN_CODE = "RUN_CODE",
  AI_AGENT = "AI_AGENT",
  OPENAI_CHAT_MODEL = "OPENAI_CHAT_MODEL",
  SIMPLE_MEMORY = "SIMPLE_MEMORY",
  REDIS_MEMORY = "REDIS_MEMORY",
  MERGE = "MERGE",
  SPLIT = "SPLIT",
  SET = "SET",
  CONNECTOR_ACTION = "CONNECTOR_ACTION",
  GMAIL_TOOL = "GMAIL_TOOL",

  // Control Flow (5)
  IF_CONDITION = "IF_CONDITION",
  SWITCH = "SWITCH",
  LOOP = "LOOP",
  FILTER = "FILTER",
  WAIT = "WAIT",
}
```

---

## Connector Categories

```typescript
export const CONNECTOR_CATEGORIES = [
  'ai',                    // 4 connectors
  'communication',         // 8 connectors
  'crm',                   // 7 connectors
  'social',                // 5 connectors
  'ecommerce',             // 4 connectors
  'database',              // 2 connectors
  'storage',               // 4 connectors
  'analytics',             // 3 connectors
  'marketing',             // 4 connectors
  'project_management',    // 5 connectors
  'support',               // 3 connectors
  'forms',                 // 3 connectors
  'finance',               // 1 connector
  'video',                 // 1 connector
  'development',           // 1 connector
] as const;
```

---

## Summary Statistics

### By Node Category
- **Trigger Nodes:** 6
- **Action Nodes:** 13
- **Control Flow Nodes:** 5
- **Total Node Types:** 24

### By Connector Category
- **AI:** 4 connectors
- **Communication:** 8 connectors
- **CRM:** 7 connectors
- **Social:** 5 connectors
- **E-commerce:** 4 connectors
- **Database:** 2 connectors
- **Storage:** 4 connectors
- **Analytics:** 3 connectors
- **Marketing:** 4 connectors
- **Project Management:** 5 connectors
- **Support:** 3 connectors
- **Forms:** 3 connectors
- **Finance:** 1 connector
- **Video:** 1 connector
- **Development:** 1 connector
- **Trigger:** 1 connector (Schedule)

**Total Connectors:** 59

### Authentication Methods
- **OAuth2:** 24 connectors
- **API Key:** 21 connectors
- **Basic Auth:** 6 connectors
- **Bearer Token:** 1 connector
- **AWS Credentials:** 2 connectors
- **Bot Token:** 1 connector
- **Credentials:** 1 connector
- **None:** 1 connector

### Features
- **Webhook Support:** 37 connectors (63%)
- **Sandbox Available:** 18 connectors (31%)
- **Dynamic Actions:** Discord, Airtable
- **Dynamic Triggers:** Discord, Airtable, Google Calendar, Schedule

---

## Usage Guidelines

### Adding New Connectors
1. Add connector definition to `CONNECTOR_DEFINITIONS` in `/backend/src/common/constants/connector.constants.ts`
2. Define `supported_actions` and `supported_triggers` with full schemas
3. Create connector implementation extending `BaseConnector`
4. Register in `ConnectorsModule`

### Creating Templates
1. Use existing node types from `NodeType` enum
2. For connector actions/triggers, use `CONNECTOR_ACTION` or `CONNECTOR_TRIGGER`
3. Include complete `inputSchema`, `configSchema`, and `outputSchema` for all nodes
4. Test nodes match app's supported types

### Node Type References
- **Frontend:** `/frontend/src/config/nodeTypes.ts`
- **Components:** `/frontend/src/config/nodeComponents.ts`
- **Backend:** `/backend/src/common/constants/connector.constants.ts`
- **Templates:** `/backend/src/common/templates/*.json`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Maintained By:** FluxTurn Development Team
