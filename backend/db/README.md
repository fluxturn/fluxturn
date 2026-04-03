# Fluxturn Database Backups

This directory contains automated backups of the Fluxturn development database.

## 📋 Overview

The backup system automatically backs up essential tables from the development database whenever code is pushed to the `develop` branch.

## 🗄️ Backed Up Tables

The following tables are included in the backups (only tables that actually exist in the database):

### Connector Tables
- **connectors** - Connector definitions and configurations (65 records)
- **connector_configs** - User-created connector instances with credentials (196 records)
- **connector_execution_logs** - Connector execution history

### Workflow Tables
- **workflows** - Workflow definitions (1 record)
- **workflow_executions** - Workflow execution history (7 records)
- **workflow_templates** - Workflow templates (232 records)
- **workflow_schedules** - Scheduled workflow runs

### Authentication & Integration Tables
- **api_keys** - API keys for authentication (362 records)
- **oauth_tokens** - OAuth access/refresh tokens
- **oauth_temp_data** - Temporary OAuth data during flows

### Email Templates
- **email_templates** - Email templates for workflows (13 records)

## 🔄 Automated Backup Process

### When Backups Run
- **Trigger**: Automatic on every push to `develop` branch
- **Workflow**: `.github/workflows/backup-dev-database.yml`
- **Script**: `backend/scripts/backup-dev-database.sh`

### What Happens
1. GitHub Action triggers on push to `develop`
2. PostgreSQL client is installed in the runner
3. Backup script connects to the dev database
4. Each table is backed up with data-only, column-inserts format
5. Backup file is committed back to the repository
6. Backup is also uploaded as a GitHub artifact (30-day retention)
7. Old backups are cleaned up (keeps latest 10 in repo)

### Backup File Format
- **Location**: `backend/db/backups/`
- **Naming**: `dev_backup_YYYYMMDD_HHMMSS.sql`
- **Format**: SQL with INSERT statements (column-inserts)
- **Latest**: Symlink at `backend/db/backups/latest.sql`

## 🚀 Manual Backup

You can also run backups manually:

### Using npm (Recommended)
```bash
cd backend
npm run backup:db
```

### Using Node.js directly
```bash
cd backend
node scripts/backup-dev-database.js
```

### Via GitHub Actions
1. Go to Actions tab in GitHub
2. Select "Backup Dev Database" workflow
3. Click "Run workflow"
4. Select `develop` branch
5. Click "Run workflow"

## 📦 Restoring from Backup

To restore data from a backup:

### Full Restore
```bash
# Connect to your target database
psql -h <host> -U <user> -d <database> -f backend/db/backups/dev_backup_YYYYMMDD_HHMMSS.sql
```

### Restore Specific Tables
```bash
# Extract specific table inserts from the backup
grep "INSERT INTO connectors" backend/db/backups/latest.sql > connectors_only.sql

# Apply to database
psql -h <host> -U <user> -d <database> -f connectors_only.sql
```

### Using Docker
```bash
docker exec -i postgres_container psql -U username -d database < backend/db/backups/latest.sql
```

## 🔐 Security Notes

⚠️ **Important**: These backups may contain sensitive data:
- Encrypted connector credentials
- OAuth tokens (encrypted)
- API keys (hashed)
- Webhook URLs

**Best Practices**:
- Backups are committed to the repository for version control
- Ensure your repository has appropriate access controls
- Consider encrypting backups for production environments
- Rotate credentials periodically

## 📊 Backup Artifacts

GitHub Actions also uploads backups as artifacts:
- **Retention**: 30 days
- **Location**: Actions → Backup Dev Database → Artifacts
- **Naming**: `database-backup-<run_number>`
- **Compression**: Level 9 (maximum)

## 🧹 Cleanup Policy

- **In Repository**: Keeps latest 10 backups
- **As Artifacts**: Keeps for 30 days
- Automatic cleanup runs after each backup

## 🛠️ Configuration

### Database Connection
Configuration is read from environment variables or defaults to:
- **Host**: Set via `PLATFORM_DB_HOST` env var (default: `localhost`)
- **Port**: Set via `PLATFORM_DB_PORT` env var (default: `5432`)
- **Database**: Set via `PLATFORM_DB_NAME` env var (default: `fluxturn_platform`)
- **User**: Set via `PLATFORM_DB_USER` env var (default: `postgres`)
- **Password**: Set via `PLATFORM_DB_PASSWORD` env var or workflow secrets

### Modifying Backed Up Tables
Edit the `TABLES` array in `backend/scripts/backup-dev-database.sh`:

```bash
TABLES=(
    "connectors"
    "connector_configs"
    # Add more tables here
)
```

## 📝 Logs and Monitoring

### View Backup Logs
1. Go to GitHub Actions
2. Select the workflow run
3. Expand "Run database backup" step

### Backup Summary
Each workflow run generates a summary showing:
- Backup file name and size
- Database and server information
- List of backed up tables
- Commit information

## 🐛 Troubleshooting

### Backup Failed
1. Check GitHub Actions logs
2. Verify database connectivity from GitHub runners
3. Ensure database credentials are correct
4. Check if tables exist in the database

### Large Backup Files
If backups become too large:
1. Consider excluding large tables
2. Implement data archiving strategy
3. Use compression utilities
4. Store large backups in external storage

### Missing Tables
If a table doesn't exist, the backup script will:
- Skip the table with a warning
- Continue backing up other tables
- Complete successfully

## 📚 Additional Resources

- **Database Schema**: See `backend/src/modules/database/platform.service.ts`
- **Connector Guide**: See `backend/CLAUDE.md`
- **GitHub Actions**: See `.github/workflows/backup-dev-database.yml`

## 🤝 Contributing

To improve the backup system:
1. Update the backup script in `backend/scripts/backup-dev-database.sh`
2. Modify the workflow in `.github/workflows/backup-dev-database.yml`
3. Test locally before committing
4. Update this README with any changes

---

**Last Updated**: 2025-11-27
**Maintainer**: Fluxturn Development Team
