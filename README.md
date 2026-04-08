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

FluxTurn is a **production-ready, open-source workflow automation platform** that bridges the gap between idea and execution. Built for developers, DevOps teams, and technical users, FluxTurn combines the power of AI-driven workflow generation with a sophisticated visual builder to help you automate complex processes in seconds instead of hours.

Unlike traditional automation tools that require extensive configuration or low-code platforms that sacrifice flexibility, FluxTurn gives you the best of both worlds: the speed of natural language workflow generation and the precision of a visual node-based editor.

<p align="center">
  <img src="frontend/public/fluxturn_demo.png" alt="FluxTurn Visual Workflow Builder">
  <br>
  <em>FluxTurn's visual workflow builder showing an AI agent workflow with chat memory</em>
</p>

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

## 📊 Project Activity & Statistics

FluxTurn is an **actively maintained** project with a growing community. Here's what's happening:

### GitHub Activity

<p align="left">
  <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=for-the-badge&logo=github&color=yellow" alt="GitHub Stars">
  <img src="https://img.shields.io/github/forks/fluxturn/fluxturn?style=for-the-badge&logo=github&color=blue" alt="Forks">
  <img src="https://img.shields.io/github/contributors/fluxturn/fluxturn?style=for-the-badge&logo=github&color=green" alt="Contributors">
  <img src="https://img.shields.io/github/last-commit/fluxturn/fluxturn?style=for-the-badge&logo=github&color=orange" alt="Last Commit">
</p>

<p align="left">
  <img src="https://img.shields.io/github/issues/fluxturn/fluxturn?style=for-the-badge&logo=github&color=red" alt="Open Issues">
  <img src="https://img.shields.io/github/issues-pr/fluxturn/fluxturn?style=for-the-badge&logo=github&color=purple" alt="Open PRs">
  <img src="https://img.shields.io/github/issues-closed/fluxturn/fluxturn?style=for-the-badge&logo=github&color=green" alt="Closed Issues">
  <img src="https://img.shields.io/github/issues-pr-closed/fluxturn/fluxturn?style=for-the-badge&logo=github&color=blue" alt="Closed PRs">
</p>

### Community Metrics

| Metric | Status | Details |
|--------|--------|---------|
| **Total Contributors** | ![Contributors](https://img.shields.io/github/contributors/fluxturn/fluxturn?style=flat-square) | Growing community of developers |
| **Total Commits** | ![Commits](https://img.shields.io/github/commit-activity/t/fluxturn/fluxturn?style=flat-square) | Continuous development |
| **Monthly Commits** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/fluxturn/fluxturn?style=flat-square) | Active maintenance |
| **Average PR Review Time** | ~24-48 hours | Fast feedback loop |
| **Code Quality** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript, ESLint, Prettier |
| **Test Coverage** | ![Coverage](https://img.shields.io/badge/coverage-85%25-green?style=flat-square) | Well-tested codebase |
| **Documentation** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | Extensive guides & API docs |

### Language & Code Statistics

<p align="left">
  <img src="https://img.shields.io/github/languages/top/fluxturn/fluxturn?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/fluxturn/fluxturn?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/fluxturn/fluxturn?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/fluxturn/fluxturn?style=for-the-badge&color=green" alt="License">
</p>

### Recent Activity Highlights

- ✅ **120+ Connectors** shipped and tested
- ✅ **17 Languages** supported in the UI
- ✅ **1000+ Commits** and counting
- ✅ **Active Discord** community with real-time support
- ✅ **Weekly Releases** with new features and bug fixes
- ✅ **Responsive Maintainers** -- PRs reviewed within 1-2 days

### Why These Numbers Matter

**Fast PR Reviews** -- We value your time. Most pull requests get initial feedback within 24-48 hours, not weeks.

**Active Development** -- Regular commits mean the project is evolving. New features, bug fixes, and improvements ship continuously.

**Growing Contributors** -- More contributors = more perspectives, better code quality, and faster feature development.

**High Test Coverage** -- 85%+ coverage means you can contribute confidently knowing tests will catch regressions.

**Comprehensive Docs** -- Detailed documentation means less time struggling, more time building.

### Join the Activity!

Want to see your contributions here? Check out our [Quick Contribution Guide](#-quick-contribution-guide) below!

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

## 🚀 Why Contribute to FluxTurn?

FluxTurn is more than just another open-source project -- it's an opportunity to work with cutting-edge technology while building something that solves real problems for developers worldwide.

### What You'll Gain

**📚 Learn Modern Tech Stack**
- **React 19** -- Latest React features including Server Components
- **NestJS** -- Professional backend framework used by enterprises
- **LangChain** -- AI/ML integration and agent orchestration
- **Vector Databases** -- Work with Qdrant for semantic search
- **ReactFlow** -- Build interactive node-based UIs
- **Real-time Systems** -- WebSocket, Redis, and event-driven architecture

**💼 Build Your Portfolio**
- Contribute to a **production-ready** platform used by real companies
- Work on features that appear on your GitHub profile
- Get recognition in our contributor hall of fame
- Build expertise in **workflow automation** and **AI integration** -- highly valued skills in 2026

**🤝 Join a Growing Community**
- Connect with developers from around the world
- Get code reviews from experienced maintainers
- Learn best practices in software architecture
- Participate in technical discussions and design decisions

**🎯 Make Real Impact**
- Your code will help thousands of developers automate their workflows
- See your features being used in production environments
- Influence the direction of an AI-powered automation platform

**⚡ Quick Onboarding**
- Docker-based setup gets you running in **under 5 minutes**
- Well-documented codebase with clear architecture
- Friendly maintainers who respond to PRs within 24-48 hours
- "Good first issue" labels for newcomers

## 🗺️ Project Roadmap

Here's what we're building and where you can contribute. Items marked with 🆘 need help!

### Q2 2026 (Current Quarter)

**🤖 AI & Intelligence**
- [ ] 🆘 **AI Workflow Optimization** -- Auto-suggest performance improvements for workflows
- [ ] **Multi-Agent Workflows** -- Support for parallel AI agents with coordination
- [ ] 🆘 **Natural Language Workflow Editing** -- "Add error handling to step 3" updates the workflow
- [ ] **Smart Connector Suggestions** -- AI recommends connectors based on workflow context

**🔌 Connectors & Integrations**
- [ ] 🆘 **50+ New Connectors** -- Notion, Linear, Airtable, Make.com, etc.
- [ ] **Connector Marketplace** -- Community-contributed connectors
- [ ] 🆘 **GraphQL Support** -- Add GraphQL connector for modern APIs
- [ ] **Database Connectors** -- Supabase, PlanetScale, Neon enhancements

**🎨 Visual Builder Enhancements**
- [ ] 🆘 **Workflow Templates** -- Pre-built templates for common use cases
- [ ] **Conditional Branching UI** -- Visual if/else flow builder
- [ ] 🆘 **Workflow Versioning** -- Track and rollback workflow changes
- [ ] **Collaborative Editing** -- Multiple users editing the same workflow

### Q3 2026

**⚡ Performance & Scale**
- [ ] **Distributed Execution** -- Run workflows across multiple workers
- [ ] 🆘 **Workflow Caching** -- Cache expensive operations
- [ ] **Rate Limiting Per Connector** -- Automatic backoff and retry
- [ ] **Horizontal Scaling** -- Multi-instance support with Redis pub/sub

**🔐 Enterprise Features**
- [ ] **RBAC (Role-Based Access Control)** -- User permissions and teams
- [ ] 🆘 **Audit Logs** -- Track all workflow changes and executions
- [ ] **SSO Integration** -- SAML, OAuth2, LDAP support
- [ ] **Secrets Management** -- HashiCorp Vault integration

**📊 Monitoring & Observability**
- [ ] 🆘 **Metrics Dashboard** -- Execution time, success rate, error tracking
- [ ] **OpenTelemetry Integration** -- Export traces to Jaeger, Datadog, etc.
- [ ] **Alerting System** -- Notify on workflow failures
- [ ] 🆘 **Workflow Analytics** -- Usage patterns and optimization recommendations

### Q4 2026 & Beyond

**🌐 Platform Expansion**
- [ ] **CLI Tool** -- Manage workflows from terminal
- [ ] 🆘 **Workflow as Code** -- Define workflows in YAML/JSON
- [ ] **CI/CD Integration** -- GitHub Actions, GitLab CI connectors
- [ ] **Mobile App** -- iOS/Android workflow monitoring

**🧩 Developer Experience**
- [ ] 🆘 **Plugin System** -- Custom nodes and connectors via plugins
- [ ] **Workflow Testing Framework** -- Unit tests for workflows
- [ ] **Local Development Mode** -- Offline workflow development
- [ ] **API Schema Validation** -- Auto-validate connector responses

### How to Influence the Roadmap

💡 **Have ideas?** Open a [GitHub Discussion](https://github.com/fluxturn/fluxturn/discussions) or join our [Discord](https://discord.gg/tpJZ9J3q)

🗳️ **Vote on features** -- Star issues you care about to help us prioritize

🛠️ **Want to build something not listed?** -- Propose it! We love community-driven features

## 🎯 Quick Contribution Guide

Get started contributing in **under 10 minutes**:

### Step 1: Set Up Your Environment

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/fluxturn.git
cd fluxturn

# Start with Docker (easiest way)
cp backend/.env.example backend/.env
docker compose up -d

# Access the app
# Frontend: http://localhost:5185
# Backend API: http://localhost:5005
```

**That's it!** You're running FluxTurn locally.

### Step 2: Find Something to Work On

Choose based on your experience level:

**🟢 Beginner-Friendly**
- 📝 [Fix typos or improve documentation](https://github.com/fluxturn/fluxturn/labels/documentation)
- 🌍 [Add translations](https://github.com/fluxturn/fluxturn/labels/i18n) -- We support 17 languages
- 🐛 [Fix simple bugs](https://github.com/fluxturn/fluxturn/labels/good%20first%20issue)
- ✨ [Improve UI/UX](https://github.com/fluxturn/fluxturn/labels/ui%2Fux)

**🟡 Intermediate**
- 🔌 [Add a new connector](https://github.com/fluxturn/fluxturn/labels/connector) -- See our [Connector Development Guide](docs/guides/connector-development.md)
- 🎨 [Enhance the visual builder](https://github.com/fluxturn/fluxturn/labels/visual-builder)
- 🧪 [Write tests](https://github.com/fluxturn/fluxturn/labels/tests)
- 🚀 [Performance improvements](https://github.com/fluxturn/fluxturn/labels/performance)

**🔴 Advanced**
- 🤖 [AI/ML features](https://github.com/fluxturn/fluxturn/labels/ai)
- ⚙️ [Core engine enhancements](https://github.com/fluxturn/fluxturn/labels/core)
- 🏗️ [Architecture improvements](https://github.com/fluxturn/fluxturn/labels/architecture)
- 🔐 [Security features](https://github.com/fluxturn/fluxturn/labels/security)

### Step 3: Make Your Changes

```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Make your changes
# - Frontend code: /frontend/src
# - Backend code: /backend/src
# - Connectors: /backend/src/modules/fluxturn/connectors

# Test your changes
npm run test

# Commit with a clear message
git commit -m "feat: add new connector for Notion API"
```

### Step 4: Submit Your Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Open a PR on GitHub
# - Describe what you changed and why
# - Link to any related issues
# - Add screenshots if it's a UI change
```

**What happens next?**
- ✅ Automated tests run on your PR
- 👀 A maintainer reviews your code (usually within 24-48 hours)
- 💬 We may suggest changes or improvements
- 🎉 Once approved, your code gets merged!

### Contribution Tips

✨ **Start small** -- Your first PR doesn't need to be a huge feature
📖 **Read the code** -- Browse existing connectors or components for examples
❓ **Ask questions** -- Join our [Discord](https://discord.gg/tpJZ9J3q) if you're stuck
🧪 **Write tests** -- PRs with tests get merged faster
📝 **Document your code** -- Add comments for complex logic

### Need Help?

- 💬 [Discord](https://discord.gg/tpJZ9J3q) -- Chat with maintainers and contributors
- 📖 [Contributing Guide](CONTRIBUTING.md) -- Detailed contribution guidelines
- 🐛 [GitHub Issues](https://github.com/fluxturn/fluxturn/issues) -- Report bugs or request features
- 💡 [Discussions](https://github.com/fluxturn/fluxturn/discussions) -- Ask questions, share ideas

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

## 💬 Join Our Community

Connect with developers, get help, and stay updated on FluxTurn's latest developments!

<p align="center">
  <a href="https://discord.gg/tpJZ9J3q">
    <img src="https://img.shields.io/badge/Discord-Join%20Our%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
  </a>
  <a href="https://github.com/fluxturn/fluxturn/discussions">
    <img src="https://img.shields.io/badge/GitHub-Discussions-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Discussions">
  </a>
  <a href="https://twitter.com/fluxturn">
    <img src="https://img.shields.io/badge/Twitter-Follow%20Us-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter">
  </a>
</p>

### Where to Find Us

| Platform | Purpose | Link |
|----------|---------|------|
| 💬 **Discord** | Real-time chat, get help, discuss features | [Join Server](https://discord.gg/tpJZ9J3q) |
| 💡 **GitHub Discussions** | Ask questions, share ideas, feature requests | [Start Discussion](https://github.com/fluxturn/fluxturn/discussions) |
| 🐦 **Twitter/X** | Product updates, announcements, tips | [@fluxturn](https://twitter.com/fluxturn) |
| 📧 **Email** | Direct contact with maintainers | hello@fluxturn.com |
| 🌐 **Website** | Documentation, guides, blog | [fluxturn.com](https://fluxturn.com) |

### Community Guidelines

- 🤝 **Be Respectful** -- Treat everyone with respect and kindness
- 💡 **Share Knowledge** -- Help others learn and grow
- 🐛 **Report Issues** -- Found a bug? Let us know on GitHub Issues
- 🎉 **Celebrate Wins** -- Share your workflows and success stories
- 🌍 **Think Global** -- We're a worldwide community with 17+ languages

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

---

<p align="center">
  <strong>Built with ❤️ by the <a href="https://fluxturn.com">fluxturn</a> community</strong>
</p>

<p align="center">
  If you find this project useful, please consider giving it a star! ⭐
  <br><br>
  <a href="https://github.com/fluxturn/fluxturn/stargazers">
    <img src="https://img.shields.io/github/stars/fluxturn/fluxturn?style=social" alt="Star on GitHub">
  </a>
</p>
