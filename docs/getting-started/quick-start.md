# Quick Start

Get FluxTurn running locally in a few minutes.

## Prerequisites

| Dependency | Minimum Version | Purpose |
|-----------|----------------|---------|
| Node.js | 18+ | Runtime for backend and frontend |
| PostgreSQL | 14+ | Primary database |
| Redis | 7+ | Caching, queues, real-time pub/sub |
| Docker | 20+ | Optional, for containerized setup |

Qdrant (vector database) is optional and only needed if you want AI-powered workflow generation with RAG.

## Option 1: Docker Setup (Recommended)

The fastest way to get started. Docker Compose brings up all required services automatically.

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn

# Configure environment
cp backend/.env.example backend/.env
```

Open `backend/.env` in your editor and set at minimum:

- `PLATFORM_DB_PASSWORD` -- Choose a password for the database.
- `JWT_SECRET` -- Generate with `openssl rand -hex 64`.
- `CONNECTOR_ENCRYPTION_KEY` -- Generate with `openssl rand -hex 32`.
- `SESSION_SECRET` -- Generate with `openssl rand -hex 32`.

Then start everything:

```bash
docker compose up -d
```

Wait for the services to initialize (about 30 seconds on first run), then open:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5005
- **API Docs (Swagger):** http://localhost:5005/api/docs

## Option 2: Manual Setup

Use this approach if you prefer to run services directly or already have PostgreSQL and Redis running.

### 1. Clone the repository

```bash
git clone https://github.com/fluxturn/fluxturn.git
cd fluxturn
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and configure the database connection to match your local PostgreSQL instance:

```
PLATFORM_DB_HOST=localhost
PLATFORM_DB_PORT=5432
PLATFORM_DB_NAME=fluxturn_platform
PLATFORM_DB_USER=postgres
PLATFORM_DB_PASSWORD=your_password
```

Also set the required secrets (`JWT_SECRET`, `CONNECTOR_ENCRYPTION_KEY`, `SESSION_SECRET`) as described above.

Create the database:

```bash
createdb fluxturn_platform
```

Install dependencies and start the backend:

```bash
npm install
npm run start:dev
```

The backend starts on port 5005 by default.

### 3. Set up the frontend

Open a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend starts on port 5173 by default. The `.env` file points to the backend at `http://localhost:5005` -- adjust if your backend runs on a different host or port.

### 4. Set up Redis

If Redis is not already running:

```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis
```

By default, FluxTurn connects to Redis on `localhost:6379`. Set `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` in `backend/.env` if your setup differs.

## Accessing the App

Once both the backend and frontend are running:

1. Open http://localhost:5173 in your browser.
2. Create an account or sign in.
3. You will land on the dashboard where you can create your first project and organization.

## Your First Workflow

1. **Create a project** -- From the dashboard, create a new project to hold your workflows.
2. **Open the workflow builder** -- Click "New Workflow" inside your project.
3. **Add a trigger** -- Every workflow starts with a trigger. Click the trigger node and choose an event (for example, "Manual Trigger" to run it by hand).
4. **Add action nodes** -- Click the "+" button to add steps. Choose a connector and an action (for example, Slack > Send Message).
5. **Configure credentials** -- Each connector node prompts you to add credentials the first time. Enter your API key or connect via OAuth.
6. **Run the workflow** -- Click "Execute" to run the workflow manually and see the results in the execution log.

## Next Steps

- [Configuration Reference](configuration.md) -- All environment variables explained.
- [Architecture Overview](../architecture/overview.md) -- How the system is structured.
- [Connectors](../connectors.md) -- Browse available connectors.
- [Contributing](../../CONTRIBUTING.md) -- Help improve FluxTurn.
