# Configuration Reference

FluxTurn is configured through environment variables. The backend reads from `backend/.env` and the frontend reads from `frontend/.env`.

For a complete list of variables with placeholder values, see `backend/.env.example`.

## Backend Environment Variables

### Database (PostgreSQL)

| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_DB_HOST` | `localhost` | PostgreSQL host |
| `PLATFORM_DB_PORT` | `5432` | PostgreSQL port |
| `PLATFORM_DB_NAME` | `fluxturn_platform` | Database name |
| `PLATFORM_DB_USER` | `postgres` | Database user |
| `PLATFORM_DB_PASSWORD` | -- | Database password (required) |
| `TENANT_DB_HOST` | `localhost` | Tenant database host (multi-tenant mode) |
| `TENANT_DB_PORT` | `5432` | Tenant database port |
| `TENANT_DB_USER` | `postgres` | Tenant database user |
| `TENANT_DB_PASSWORD` | -- | Tenant database password |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5005` | Backend HTTP port |
| `NODE_ENV` | `development` | Environment: `development`, `production`, `test` |
| `LOG_LEVEL` | `debug` | Log level: `debug`, `info`, `warn`, `error` |
| `SKIP_AUTO_SEED` | `false` | Skip automatic connector seeding on startup |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | -- | Secret for signing JWTs (required). Generate with `openssl rand -hex 64` |
| `JWT_EXPIRATION` | `7d` | JWT token lifetime |
| `CONNECTOR_ENCRYPTION_KEY` | -- | AES key for encrypting stored credentials. Generate with `openssl rand -hex 32` |
| `SESSION_SECRET` | -- | Secret for session signing |
| `SESSION_TIMEOUT` | `86400000` | Session timeout in milliseconds (default: 24 hours) |

### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | -- | Redis password (leave empty if none) |

### Vector Database (Qdrant)

Optional. Required for AI workflow generation with RAG.

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_HOST` | `localhost` | Qdrant host |
| `QDRANT_PORT` | `6333` | Qdrant gRPC port |
| `QDRANT_API_KEY` | -- | Qdrant API key |

### Cloud Storage (Cloudflare R2)

Optional. Required only if using cloud file storage.

| Variable | Default | Description |
|----------|---------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | -- | Cloudflare account ID |
| `CLOUDFLARE_R2_BUCKET_NAME` | `fluxturn-uploads` | R2 bucket name |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | -- | R2 access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | -- | R2 secret key |
| `CLOUDFLARE_R2_PUBLIC_URL` | -- | Public URL for the R2 bucket |

### Email (SMTP)

| Variable | Default | Description |
|----------|---------|-------------|
| `MAIL_HOST` | -- | SMTP server hostname |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USERNAME` | -- | SMTP username |
| `MAIL_PASSWORD` | -- | SMTP password |
| `MAIL_FROM_ADDRESS` | -- | Default "from" email address |
| `MAIL_FROM_NAME` | `FluxTurn` | Default "from" display name |

### AI Services

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `openai` | Primary AI provider |
| `OPENAI_API_KEY` | -- | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Default OpenAI model |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Model for embeddings |
| `DEEPSEEK_API_KEY` | -- | DeepSeek API key (optional, via OpenRouter) |
| `CODE_GENERATION_PROVIDER` | `openai` | Provider for code generation: `openai` or `deepseek` |
| `E2B_API_KEY` | -- | E2B sandbox API key (optional, for code execution) |

### OAuth Providers

Each OAuth integration requires a client ID, client secret, and redirect URI. Create OAuth apps at the respective developer portals and fill in the values.

| Provider | Variables | Developer Portal |
|----------|-----------|-----------------|
| Google | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | https://console.cloud.google.com/apis/credentials |
| GitHub | `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI` | https://github.com/settings/developers |
| Slack | `SLACK_OAUTH_CLIENT_ID`, `SLACK_OAUTH_CLIENT_SECRET`, `SLACK_OAUTH_REDIRECT_URI` | https://api.slack.com/apps |
| Twitter/X | `TWITTER_OAUTH_CLIENT_ID`, `TWITTER_OAUTH_CLIENT_SECRET`, `TWITTER_OAUTH_REDIRECT_URI` | https://developer.twitter.com/en/portal/dashboard |
| Discord | `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, `DISCORD_OAUTH_REDIRECT_URI` | https://discord.com/developers/applications |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_REDIRECT_URI` | https://developers.facebook.com/apps |
| LinkedIn | `LINKEDIN_OAUTH_CLIENT_ID`, `LINKEDIN_OAUTH_CLIENT_SECRET`, `LINKEDIN_OAUTH_REDIRECT_URI` | https://www.linkedin.com/developers/apps |
| Shopify | `SHOPIFY_OAUTH_API_KEY`, `SHOPIFY_OAUTH_API_SECRET`, `SHOPIFY_OAUTH_REDIRECT_URI` | https://partners.shopify.com/ |
| HubSpot | `HUBSPOT_OAUTH_CLIENT_ID`, `HUBSPOT_OAUTH_CLIENT_SECRET`, `HUBSPOT_OAUTH_REDIRECT_URI` | https://developers.hubspot.com/ |
| Pinterest | `PINTEREST_OAUTH_CLIENT_ID`, `PINTEREST_OAUTH_CLIENT_SECRET`, `PINTEREST_OAUTH_REDIRECT_URI` | https://developers.pinterest.com/apps/ |
| Microsoft Teams | `MICROSOFT_TEAMS_OAUTH_CLIENT_ID`, `MICROSOFT_TEAMS_OAUTH_CLIENT_SECRET`, `MICROSOFT_TEAMS_OAUTH_REDIRECT_URI` | https://portal.azure.com/ |
| Zoom | `ZOOM_OAUTH_CLIENT_ID`, `ZOOM_OAUTH_CLIENT_SECRET`, `ZOOM_OAUTH_REDIRECT_URI` | https://marketplace.zoom.us/develop/create |
| Reddit | `REDDIT_OAUTH_CLIENT_ID`, `REDDIT_OAUTH_CLIENT_SECRET`, `REDDIT_OAUTH_REDIRECT_URI` | https://www.reddit.com/prefs/apps |

The default redirect URI pattern for development is:
```
http://localhost:5005/api/v1/oauth/{provider}/callback
```

### Application URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `http://localhost:5005` | Backend URL |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL |
| `API_URL` | `http://localhost:5005/api` | API base URL |
| `SOCKET_SERVER_URL` | `http://localhost:3001` | WebSocket server URL |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `API_KEY_RATE_LIMIT_MAX_REQUESTS` | `1000` | Max requests for API key auth |

### Stripe (Optional)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Frontend Environment Variables

The frontend uses Vite, so variables must be prefixed with `VITE_`.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5005` | Backend API URL |
| `VITE_WS_URL` | `ws://localhost:5005` | WebSocket URL |

## Security Notes

- Never commit `.env` files to version control. Both are listed in `.gitignore`.
- Generate all secrets (`JWT_SECRET`, `CONNECTOR_ENCRYPTION_KEY`, `SESSION_SECRET`) with cryptographically secure random values.
- In production, use a secrets manager or environment variable injection rather than `.env` files.
- The Swagger UI at `/api/docs` is protected by `SWAGGER_USER` and `SWAGGER_PASSWORD`. Set these to strong values in production.
