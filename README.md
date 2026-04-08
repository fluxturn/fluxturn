<p align="center">
  <a href="https://fluxturn.com">
    <img src="frontend/public/fluxturn_1.png" alt="FluxTurn" width="600">
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
  <a href="https://discord.gg/tpJZ9J3q"><img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="https://github.com/fluxturn/fluxturn/wiki">Documentation</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
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

FluxTurn is an open-source workflow automation platform that lets you connect apps, automate processes, and build AI-powered workflows -- all through a visual builder or natural language.

**Key capabilities:**

- **AI Workflow Generation** -- Describe what you want in plain English, get a working workflow
- **Visual Workflow Builder** -- Drag-and-drop interface powered by ReactFlow
- **120+ Connectors** -- Slack, Gmail, Shopify, HubSpot, Jira, Stripe, OpenAI, and many more
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

- [Discord](https://discord.gg/tpJZ9J3q) -- Chat with the team and community
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
  <a href="https://discord.gg/tpJZ9J3q">Discord</a> |
  <a href="https://twitter.com/fluxturn">Twitter</a>
</p>
