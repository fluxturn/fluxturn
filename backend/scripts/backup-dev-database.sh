#!/bin/bash

# Database Backup Script for Fluxturn Dev Database
# This script backs up connector, workflow, and template related tables from dev database
# Configure via environment variables: PLATFORM_DB_HOST, PLATFORM_DB_PORT, etc.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration - set via environment variables or .env file
DB_HOST="${PLATFORM_DB_HOST:-localhost}"
DB_PORT="${PLATFORM_DB_PORT:-5432}"
DB_NAME="${PLATFORM_DB_NAME:-fluxturn_platform}"
DB_USER="${PLATFORM_DB_USER:-postgres}"
DB_PASSWORD="${PLATFORM_DB_PASSWORD:-postgres}"

# Backup directory
BACKUP_DIR="./db/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dev_backup_${TIMESTAMP}.sql"

# Tables to backup (connectors, workflows, templates related)
TABLES=(
    "connectors"
    "connector_configs"
    "workflows"
    "workflow_executions"
    "workflow_execution_logs"
    "workflow_templates"
    "templates"
    "oauth_configs"
    "api_keys"
    "webhook_configs"
)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Fluxturn Dev Database Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Database: ${YELLOW}${DB_NAME}@${DB_HOST}${NC}"
echo -e "Timestamp: ${YELLOW}${TIMESTAMP}${NC}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${YELLOW}Creating backup directory...${NC}"
echo -e "Backup location: ${GREEN}${BACKUP_FILE}${NC}"
echo ""

# Start backup
echo -e "${YELLOW}Starting backup...${NC}"
echo ""

# Export PGPASSWORD for pg_dump
export PGPASSWORD="${DB_PASSWORD}"

# Create backup file header
cat > "${BACKUP_FILE}" <<EOF
-- =====================================================
-- Fluxturn Dev Database Backup
-- =====================================================
-- Database: ${DB_NAME}
-- Server: ${DB_HOST}
-- Timestamp: ${TIMESTAMP}
-- Tables: ${TABLES[@]}
-- =====================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

EOF

# Backup each table
for TABLE in "${TABLES[@]}"; do
    echo -e "Backing up table: ${GREEN}${TABLE}${NC}"

    # Check if table exists first
    TABLE_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${TABLE}');")

    if [ "$TABLE_EXISTS" = "t" ]; then
        # Dump schema and data for the table
        pg_dump -h "${DB_HOST}" \
                -p "${DB_PORT}" \
                -U "${DB_USER}" \
                -d "${DB_NAME}" \
                --table="public.${TABLE}" \
                --data-only \
                --inserts \
                --column-inserts \
                >> "${BACKUP_FILE}"

        echo -e "  ${GREEN}✓${NC} Backed up successfully"
    else
        echo -e "  ${YELLOW}⚠${NC} Table does not exist, skipping"
    fi
    echo ""
done

# Add metadata to backup file
echo "" >> "${BACKUP_FILE}"
echo "-- =====================================================
-- Backup completed at: $(date)
-- =====================================================" >> "${BACKUP_FILE}"

# Unset password
unset PGPASSWORD

# Get file size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "File: ${YELLOW}${BACKUP_FILE}${NC}"
echo -e "Size: ${YELLOW}${BACKUP_SIZE}${NC}"
echo ""

# Create a symlink to latest backup
ln -sf "$(basename ${BACKUP_FILE})" "${BACKUP_DIR}/latest.sql"
echo -e "${GREEN}✓${NC} Latest backup symlink created at: ${YELLOW}${BACKUP_DIR}/latest.sql${NC}"
echo ""

# List all backups
echo -e "${YELLOW}Recent backups:${NC}"
ls -lht "${BACKUP_DIR}"/*.sql | head -5

exit 0
