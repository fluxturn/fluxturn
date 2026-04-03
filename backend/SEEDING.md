# Database Seeding Setup

## Current Status

✅ **Seeder services disabled in app startup** (`src/modules/workflow/workflow.module.ts`)
✅ **Seeding script created** (`src/scripts/seed.ts`)
✅ **NPM script configured** (`npm run seed`)

## Location of Files

### Seeder Services (Original, Unchanged)
All seeder services remain in their original location:
```
src/modules/workflow/services/
├── template-seeder.service.ts
├── node-types-seeder.service.ts
├── dynamic-connector-seeder.service.ts
├── workflow-rules-seeder.service.ts
├── available-nodes-seeder.service.ts
├── openai-chatbot-seeder.service.ts
├── qdrant-seeder.service.ts
└── redis-seeder.service.ts
```

### Seed Script
```
src/scripts/seed.ts  # Runs all seeder services manually
```

## How to Run Seeding

```bash
npm run seed
```

This will:
1. Create a minimal NestJS application context
2. Load all seeder services
3. Call `onModuleInit()` on each service
4. Insert data into database and Qdrant
5. Exit when complete

## What Gets Seeded

1. **Node Types** - Workflow node definitions
2. **Templates** - Pre-built workflow templates
3. **Connectors** - Connector definitions (60+ connectors)
4. **Workflow Rules** - RAG-based workflow patterns (Qdrant)
5. **Available Nodes** - Node metadata for AI (Qdrant)
6. **OpenAI Chatbot** - Chatbot training data (Qdrant)
7. **Qdrant Collections** - Vector database setup
8. **Redis Data** - Connector credentials for Redis

## Requirements

### Required
- PostgreSQL database running
- Database credentials in `.env` file

### Optional (will skip if not available)
- Qdrant (for AI features)
- OpenAI API key (for embeddings)
- Redis (for caching)

## App Startup

The app now starts **WITHOUT running seeders automatically**.

```bash
npm run start:dev
# ✅ Faster startup
# ✅ No database seeding
# ✅ No OnModuleInit from seeders
```

## Troubleshooting

If `npm run seed` has errors, you can:

1. Check database connection
2. Check environment variables
3. Run seeders individually if needed
4. Check logs for specific error messages

## Reverting (If Needed)

To go back to auto-seeding on startup:

Edit `src/modules/workflow/workflow.module.ts` and uncomment:
- All seeder service imports
- All seeder service providers

But manual seeding is recommended for production!
