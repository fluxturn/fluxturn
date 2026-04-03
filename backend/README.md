# FluxTurn Backend

Self-hosted workflow automation platform backend powered by NestJS.

## Features

- 🔐 **Authentication** - JWT
- 🔄 **Workflow Engine** - AI-powered workflow automation
- 🔌 **60+ Connectors** - Pre-built integrations
- 📦 **AWS SQS** - Background job processing
- 🐘 **PostgreSQL** - Single database
- ⚡ **Redis** - Caching and workflow memory

## Quick Start

### 1. Start Services

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 2. Install & Run

```bash
npm install
npm run build
npm run start:dev
```

Backend runs on **http://localhost:3000**

## Environment Variables

Create `.env` file:

```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fluxturn
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=7d

# OpenAI (optional)
OPENAI_API_KEY=

# Local Storage
UPLOAD_DIR=./uploads

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Authentication
- POST `/auth/register` - Register new user
- POST `/auth/login` - Login
- GET `/auth/me` - Get current user

### Workflows
- GET `/workflows` - List workflows
- POST `/workflows` - Create workflow
- POST `/workflows/:id/execute` - Execute workflow

## Development

```bash
# Development mode
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Tests
npm test

# Lint
npm run lint
```

## Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Clean (remove volumes)
npm run docker:clean
```

## Project Structure

```
src/
├── modules/
│   ├── auth/         # Authentication & users
│   ├── connectors/   # 60+ integrations
│   ├── workflow/     # Workflow engine
│   ├── queue/        # Queue management
│   └── sqs/          # AWS SQS integration
├── common/           # Shared utilities
├── app.module.ts     # Main module
└── main.ts           # Entry point
```

## License

MIT
