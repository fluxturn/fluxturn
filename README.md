<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/Exploring the Future of Technology.png" alt="FluxTurn">
  </a>
</p>

<p align="center">
  <h1 align="center">FluxTurn</h1>
  <p align="center">
    <strong>Open-source AI-powered workflow automation platform</strong>
  </p>
  <p align="center">
    Build, automate, and orchestrate workflows with natural language and a visual builder.
  </p>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://github.com/fluxturn/fluxturn/stargazers"><img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/fluxturn/fluxturn/issues"><img src="https://img.shields.io/github/issues/fluxturn/fluxturn" alt="Issues"></a>
  <a href="https://github.com/fluxturn/fluxturn/pulls"><img src="https://img.shields.io/github/issues-pr/fluxturn/fluxturn" alt="Pull Requests"></a>
  <a href="https://discord.gg/fluxturn"><img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentation</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README_JA.md">日本語</a> |
  <a href="./README_ZH.md">中文</a> |
  <a href="./README_KO.md">한국어</a> |
  <a href="./README_ES.md">Español</a> |
  <a href="./README_FR.md">Français</a> |
  <a href="./README_DE.md">Deutsch</a> |
  <a href="./README_PT-BR.md">Português</a> |
  <a href="./README_RU.md">Русский</a> |
  <a href="./README_HI.md">हिन्दी</a>
</p>

---

## What is FluxTurn?

FluxTurn is a **production-ready, open-source workflow automation platform** that bridges the gap between idea and execution. Built for developers, DevOps teams, and technical users, FluxTurn combines the power of AI-driven workflow generation with a sophisticated visual builder to help you automate complex processes in seconds instead of hours.

Unlike traditional automation tools that require extensive configuration or low-code platforms that sacrifice flexibility, FluxTurn gives you the best of both worlds: the speed of natural language workflow generation and the precision of a visual node-based editor.

### How It Works

1. **Describe Your Workflow** -- Tell FluxTurn what you want to automate in plain English
2. **AI Generates the Flow** -- Our AI agent analyzes your requirements and creates a complete workflow with the right connectors
3. **Visual Refinement** -- Fine-tune the generated workflow using our ReactFlow-powered canvas
4. **Deploy & Monitor** -- Execute workflows in real-time with detailed logging and WebSocket-based monitoring

### Key Capabilities

- **🤖 AI Workflow Generation** -- Describe what you want in plain English, get a working workflow with proper error handling and best practices
- **🎨 Visual Workflow Builder** -- Drag-and-drop interface powered by ReactFlow with real-time validation
- **🔌 120+ Pre-Built Connectors** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, Anthropic, and many more
- **⚡ Real-Time Execution** -- Watch workflows run with detailed logs, WebSocket updates, and performance metrics
- **🏠 Self-Hosted & Privacy-First** -- Run on your own infrastructure with Docker, full data control
- **🌍 Multi-Language Support** -- 17 languages including English, Japanese, Chinese, Korean, Spanish, and more
- **🔄 Production-Ready** -- Built with NestJS, PostgreSQL, Redis, and Qdrant for enterprise-scale deployments

## What Problem We Solve

### The Automation Dilemma

Modern teams face a critical challenge: **automation is essential but time-consuming**. Building integrations between tools, handling errors, and maintaining workflows requires significant engineering resources.

**Common pain points we address:**

- ❌ **Manual Integration Hell** -- Writing custom scripts to connect different APIs takes hours or days
- ❌ **Expensive SaaS Lock-In** -- Commercial automation tools charge per workflow execution or user seat
- ❌ **Limited Flexibility** -- Low-code platforms are easy to start but hard to customize for complex use cases
- ❌ **Vendor Dependency** -- Cloud-only solutions mean you don't own your automation logic or data
- ❌ **Steep Learning Curve** -- Traditional workflow engines require deep technical knowledge to set up

### FluxTurn's Solution

✅ **AI-Powered Speed** -- Turn ideas into working workflows in seconds, not hours
✅ **Open Source Freedom** -- No vendor lock-in, no per-execution fees, full control over your code
✅ **Self-Hosted Privacy** -- Keep sensitive data and workflows on your infrastructure
✅ **Developer-Friendly** -- Full API access, extensible connector system, TypeScript codebase
✅ **Visual + Code** -- Start with AI generation, refine visually, export as code if needed

## Why FluxTurn? (Comparison)

| Feature | FluxTurn | Zapier/Make | n8n | Temporal | Custom Scripts |
|---------|----------|-------------|-----|----------|----------------|
| **AI Workflow Generation** | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |
| **Visual Builder** | ✅ ReactFlow | ✅ | ✅ | ❌ | ❌ |
| **Self-Hosted** | ✅ Free | ❌ | ✅ | ✅ | ✅ |
| **Open Source** | ✅ Apache 2.0 | ❌ | ✅ Fair-code | ✅ MIT | N/A |
| **Pre-Built Connectors** | ✅ 120+ | ✅ 5000+ | ✅ 400+ | ❌ | ❌ |
| **Real-Time Monitoring** | ✅ WebSocket | ✅ | ✅ | ✅ | ❌ |
| **Multi-Language UI** | ✅ 17 languages | ✅ | ❌ | ❌ | N/A |
| **No Per-Execution Cost** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Production Ready** | ✅ NestJS | ✅ | ✅ | ✅ | ⚠️ |
| **Natural Language Input** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Vector Search (Qdrant)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Learning Curve** | 🟢 Low | 🟢 Low | 🟡 Medium | 🔴 High | 🔴 High |

### What Makes FluxTurn Unique?

1. **AI-First Design** -- Only workflow platform with native AI workflow generation and natural language understanding
2. **Modern Tech Stack** -- React 19, NestJS, PostgreSQL, Redis, Qdrant -- built for 2025 and beyond
3. **Developer Experience** -- Clean TypeScript codebase, extensible architecture, comprehensive API
4. **True Open Source** -- Apache 2.0 license, no "fair-code" restrictions, community-driven development
5. **Multi-Modal Input** -- Natural language OR visual builder OR API -- choose what works for your team

## Quick Start

### Docker (Recommended)

Run these commands from the project root:

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and JWT secret
docker compose up -d
```

That's it! Access the app at `http://localhost:5185` and the API at `http://localhost:5005`.

### Manual Setup

**Prerequisites:** Node.js 18+, PostgreSQL 14+, Redis 7+

```bash
# Clone
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# Backend
cd backend
cp .env.example .env    # Edit .env with your configuration
npm install
npm run start:dev

# Frontend (in a new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Architecture

```
                    +------------------+
                    |    Frontend      |  React 19 + Vite + Tailwind
                    |  (Port 5185)     |  Visual Workflow Builder
                    +--------+---------+  AI Chat Interface
                             |
                             v
                    +------------------+
                    |    Backend       |  NestJS + TypeScript
                    |  (Port 5005)     |  REST API + WebSocket
                    +--------+---------+  Workflow Engine
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
        +-----------+  +---------+  +----------+
        | PostgreSQL |  |  Redis  |  |  Qdrant  |
        | (Database) |  | (Cache) |  | (Vector) |
        +-----------+  +---------+  +----------+
```

**Frontend** (`/frontend`) -- React 19, Vite, TailwindCSS, ReactFlow, i18next, CodeMirror

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, 120+ connectors

## Connectors

FluxTurn ships with 120+ connectors across these categories:

| Category | Connectors |
|----------|-----------|
| **AI & ML** | OpenAI, OpenAI Chatbot, Anthropic, Google AI, Google Gemini, AWS Bedrock |
| **Analytics** | Google Analytics, Grafana, Metabase, Mixpanel, PostHog, Segment, Splunk |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |
| **Communication** | Slack, Gmail, Microsoft Teams, Telegram, Discord, Twilio, WhatsApp, AWS SES, SMTP, IMAP, POP3, Google Calendar, Calendly, Discourse, Matrix, Mattermost |
| **CRM & Sales** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable, Monday.com |
| **Data Processing** | Supabase, Scrapfly, Extract From File |
| **Database** | Elasticsearch |
| **Development** | GitHub, GitLab, Bitbucket, Git, Jenkins, Travis CI, Netlify, n8n, npm |
| **E-Commerce** | Shopify, Stripe, PayPal, WooCommerce, Magento, Paddle, Gumroad |
| **Finance** | QuickBooks, Plaid, Chargebee, Wise, Xero |
| **Forms** | Google Forms, Jotform, Typeform |
| **Marketing** | Mailchimp, Klaviyo, SendGrid, Brevo, ActiveCampaign, Google Ads, Facebook Ads |
| **Productivity** | Figma, Todoist, Spotify, Clockify, Toggl, Harvest |
| **Project Management** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Social** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest, Reddit |
| **Storage** | Google Drive, Google Docs, Google Sheets, Dropbox, AWS S3, PostgreSQL, MySQL, MongoDB, Redis, Snowflake |
| **Support** | Zendesk, Intercom, Freshdesk, ServiceNow, PagerDuty, Sentry |
| **Utility** | Bitly, DeepL, FTP, SSH, Execute Command |
| **Video** | YouTube, Zoom |

[View all connectors &rarr;](docs/connectors.md)

## i18n

FluxTurn supports 17 languages via i18next:

- English, Japanese, Chinese, Korean, Spanish, French, German, Italian, Russian, Portuguese (BR), Dutch, Polish, Ukrainian, Vietnamese, Indonesian, Arabic, Hindi

Want to add a new language? See the [translation guide](docs/contributing/translations.md).

## Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) to get started.

**Ways to contribute:**
- Report bugs or request features via [GitHub Issues](https://github.com/fluxturn/fluxturn/issues)
- Submit pull requests for bug fixes or new features
- Add new connectors (see the [Connector Development Guide](docs/guides/connector-development.md))
- Improve documentation
- Add translations

## Contributors

Thank you to all the amazing people who have contributed to FluxTurn! 🎉

<a href="https://github.com/fluxturn/fluxturn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn&anon=1&max=100&columns=10" />
</a>

Want to see your face here? Check out our [Contributing Guide](CONTRIBUTING.md) and start contributing today!

## Community

- [Discord](https://discord.gg/fluxturn) -- Chat with the team and community
- [GitHub Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Ask questions, share ideas
- [Twitter/X](https://twitter.com/fluxturn) -- Follow for updates

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Acknowledgments

Built with [NestJS](https://nestjs.com), [React](https://react.dev), [ReactFlow](https://reactflow.dev), [TypeScript](https://typescriptlang.org), and [i18next](https://i18next.com).

---

<p align="center">
  <a href="https://fluxturn.com">Website</a> |
  <a href="https://github.com/fluxturn/fluxturn/wiki">Docs</a> |
  <a href="https://discord.gg/fluxturn">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
