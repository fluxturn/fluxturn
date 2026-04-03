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
  <a href="https://discord.gg/fluxturn"><img src="https://img.shields.io/discord/YOUR_DISCORD_ID?label=Discord&logo=discord&logoColor=white" alt="Discord"></a>
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
  <a href="./README_HI.md">हिन्दी</a> |
  <a href="./README_BN.md">বাংলা</a>
</p>

---

## What is FluxTurn?

FluxTurn is an open-source workflow automation platform that lets you connect apps, automate processes, and build AI-powered workflows -- all through a visual builder or natural language.

**Key capabilities:**

- **AI Workflow Generation** -- Describe what you want in plain English, get a working workflow
- **Visual Workflow Builder** -- Drag-and-drop interface powered by ReactFlow
- **80+ Connectors** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, and many more
- **Real-Time Execution** -- Watch workflows run with detailed logs and monitoring
- **Self-Hosted** -- Run on your own infrastructure with Docker

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

That's it! Access the app at `http://localhost:5173` and the API at `http://localhost:5005`.

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
                    |  (Port 5173)     |  Visual Workflow Builder
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

**Backend** (`/backend`) -- NestJS, PostgreSQL (raw SQL), Redis, Socket.IO, LangChain, 80+ connectors

## Connectors

FluxTurn ships with 80+ connectors across these categories:

| Category | Connectors |
|----------|-----------|
| **Communication** | Slack, Gmail, Outlook, Telegram, Discord, Twilio, SendGrid, Microsoft Teams |
| **CRM & Sales** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Airtable |
| **E-Commerce** | Shopify, Stripe, PayPal, WooCommerce, Paddle, Gumroad |
| **Project Management** | Jira, Asana, Trello, Notion, Linear, ClickUp |
| **Social** | Twitter/X, Facebook, Instagram, TikTok, LinkedIn, Pinterest |
| **AI & ML** | OpenAI, Anthropic, Google AI, AWS Bedrock, Ollama, Replicate |
| **Analytics** | PostHog, Mixpanel, Segment, Grafana, Metabase, Splunk |
| **Storage** | Google Drive, Dropbox, AWS S3, PostgreSQL, Snowflake, Supabase |
| **Support** | Zendesk, Intercom, ServiceNow, PagerDuty, Sentry |
| **Finance** | QuickBooks, Plaid, Chargebee, Wise |
| **Marketing** | Mailchimp, Klaviyo, Facebook Ads |
| **CMS** | WordPress, Contentful, Ghost, Medium, Webflow |

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
  <img src="https://contrib.rocks/image?repo=fluxturn/fluxturn" />
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
