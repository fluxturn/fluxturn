# Contributing to FluxTurn

Thank you for your interest in contributing to FluxTurn! This guide will help you get started.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Open a [Bug Report](https://github.com/fluxturn/fluxturn/issues/new?template=bug_report.yml) with:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, browser)
- Screenshots or logs if applicable

### Suggesting Features

Open a [Feature Request](https://github.com/fluxturn/fluxturn/issues/new?template=feature_request.yml) with:
- Description of the feature
- Use case and motivation
- Suggested implementation approach (optional)

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `develop`: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `cd backend && npm test`
5. Run linting: `cd frontend && npm run lint`
6. Commit with a descriptive message
7. Push and open a Pull Request against `develop`

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker & Docker Compose (optional, for local services)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/fluxturn.git
cd fluxturn

# Start infrastructure (PostgreSQL, Redis, Qdrant)
cd backend
docker compose up -d

# Setup backend
cp .env.example .env
# Edit .env with your local database credentials
npm install
npm run start:dev

# Setup frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Project Structure

```
fluxturn/
  backend/                    # NestJS backend
    src/
      modules/
        auth/                 # Authentication (JWT, OAuth, API keys)
        database/             # PostgreSQL platform service
        fluxturn/
          connectors/         # 80+ connector implementations
          workflow/            # Workflow engine
          conversations/      # AI conversations
        ai/                   # AI services (OpenAI, LangChain)
        organization/         # Multi-tenant organization management
        project/              # Project management
        realtime/             # WebSocket gateways
        storage/              # File storage (Cloudflare R2)
        stripe/               # Payment processing
      common/
        constants/            # Connector definitions
        filters/              # Exception filters
  frontend/                   # React frontend
    src/
      components/
        workflow/             # Workflow builder components
        landing/              # Landing page sections
        ui/                   # Shared UI components (Radix/Shadcn)
      pages/                  # Route pages
      i18n/                   # Internationalization
        locales/              # Translation files (en.json, ja.json, ...)
      lib/                    # API clients and utilities
      hooks/                  # React hooks
      contexts/               # React contexts
```

## Adding a New Connector

This is one of the most valuable ways to contribute. See the [Connector Development Guide](backend/.claude/CONNECTOR_TESTING_GUIDE.md) for the full pattern.

**Quick overview:**

1. Add the connector definition to `backend/src/common/constants/connector.constants.ts`
2. Create the connector class in `backend/src/modules/fluxturn/connectors/<category>/`
3. Extend `BaseConnector` and implement the category interface
4. Register in the connectors module
5. Add tests in a `__tests__/` directory
6. Add a connector icon to `frontend/public/icons/connectors/`

## Documenting a Connector

We're documenting all 126 FluxTurn connectors. Each connector gets one markdown file in [`docs/connectors/`](docs/connectors/). This is one of the easiest ways to make a first contribution — no code required.

**To document a connector:**

1. **Find one that needs documenting** in the [connector docs tracking issue](https://github.com/fluxturn/fluxturn/issues) (look for the issue tagged `documentation`), or browse [`docs/connectors/README.md`](docs/connectors/README.md) for the full checklist. Comment on the tracking issue to claim a connector before starting.

2. **Read the template** at [`docs/connectors/_template.md`](docs/connectors/_template.md) and at least one of the three reference docs:
   - [`telegram.md`](docs/connectors/telegram.md) — simple API key auth
   - [`gmail.md`](docs/connectors/gmail.md) — OAuth2 with polling triggers
   - [`slack.md`](docs/connectors/slack.md) — Bearer token with webhook (Events API) triggers

3. **Read the connector source** to find real action IDs, trigger IDs, and required fields. The source path follows this pattern:
   ```
   backend/src/modules/fluxturn/connectors/<category>/<name>/<name>.connector.ts
   ```
   Look at `getMetadata()`, `getActions()`, and `getTriggers()` for the authoritative list of capabilities.

4. **Create your doc file** by copying the template:
   ```bash
   cp docs/connectors/_template.md docs/connectors/<connector-name>.md
   ```
   Use lowercase, hyphenated names: `google-sheets.md`, not `Google Sheets.md`.

5. **Fill in every section**, deleting the `> ` instructional notes as you go. Don't skip "Common gotchas" — those are the most useful part for users hitting real problems.

6. **Open a PR** against `main` with the title `docs(connectors): add documentation for <Connector>`. One connector per PR keeps reviews fast.

7. **Update the checklist** in the tracking issue (or the maintainer will).

**Tips:**
- Document only what's actually in the source. If `getActions()` lists 5 actions, your doc should have 5 actions — don't make up features that don't exist.
- Use placeholder URLs (`https://your-instance.com`) instead of any specific deployment URL.
- For gotchas, draw on real experience if you've used the service. If you haven't, check the service's official docs and Stack Overflow for the most common pitfalls.

## Adding Translations

FluxTurn uses [i18next](https://i18next.com) for internationalization.

1. Copy `frontend/src/i18n/locales/en.json` to a new file (e.g., `fr.json`)
2. Translate all values (keep the keys the same)
3. Register the new locale in `frontend/src/i18n/index.ts`
4. Add the language option to the language switcher component

## Code Style

- **TypeScript** for both frontend and backend
- **Prettier** for formatting (run `npm run format` if available)
- **ESLint** for linting (run `npm run lint`)
- Follow existing patterns in the codebase
- Write descriptive commit messages

## Testing

```bash
# Backend tests
cd backend
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # Coverage report

# Frontend
cd frontend
npm run lint                # Lint check
npm run typecheck           # Type check
```

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include a clear description of what and why
- Reference related issues (e.g., "Fixes #123")
- Ensure all checks pass
- Add tests for new functionality
- Update documentation if needed

## Questions?

- Open a [Discussion](https://github.com/fluxturn/fluxturn/discussions)
- Join our [Discord](https://discord.gg/fluxturn)

Thank you for contributing!
