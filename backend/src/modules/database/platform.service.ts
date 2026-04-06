import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { snakeCase } from 'change-case';
import { DatabaseNamingUtil } from '../../common/utils/database-naming.util';
import {
  PlatformUser,
  Organization,
  Project,
  App,
  ApiKey,
  UserInvitation,
  AuditLog,
  CreateUserInput,
  CreateOrganizationInput,
  CreateProjectInput,
  CreateAppInput,
  CreateApiKeyInput,
  CreateInvitationInput,
  ProjectMember,
  ProjectInvitation,
  CreateProjectMemberInput,
  CreateProjectInvitationInput,
  OrganizationInvitation,
  CreateOrganizationInvitationInput,
} from '../auth/interfaces';

import {
  DatabaseConfig,
  QueryResult,
} from './interfaces';

@Injectable()
export class PlatformService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformService.name);
  private pool: Pool;
  private readonly dbConfig: DatabaseConfig;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.dbConfig = {
      host: this.configService.get<string>('PLATFORM_DB_HOST', 'localhost'),
      port: this.configService.get<number>('PLATFORM_DB_PORT', 5432),
      database: this.configService.get<string>('PLATFORM_DB_NAME', 'fluxturn_platform'),
      user: this.configService.get<string>('PLATFORM_DB_USER', 'postgres'),
      password: this.configService.get<string>('PLATFORM_DB_PASSWORD', 'postgres'),
      max: this.configService.get<number>('PLATFORM_DB_MAX_CONNECTIONS', 20),
      idleTimeoutMillis: this.configService.get<number>('PLATFORM_DB_IDLE_TIMEOUT', 30000),
      connectionTimeoutMillis: this.configService.get<number>('PLATFORM_DB_CONNECTION_TIMEOUT', 10000),
    };
  }

  async onModuleInit() {
    await this.initializePool();
    await this.initializePlatformDatabase();
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Platform database pool closed');
    }
  }

  private async initializePool(): Promise<void> {
    try {
      this.pool = new Pool(this.dbConfig);

      this.pool.on('error', (err) => {
        this.logger.error('Platform database pool error:', err);
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.logger.log('Platform database pool initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize platform database pool:', error);
      throw error;
    }
  }

  private async initializePlatformDatabase(): Promise<void> {
    try {
      await this.createPlatformTables();
      this.logger.log('Platform database tables initialized');
    } catch (error) {
      this.logger.error('Failed to initialize platform database tables:', error);
      throw error;
    }
  }

  private async createPlatformTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Enable UUID extension (outside transaction)
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      `);

      await client.query('BEGIN');

      // Create or update users table - keep existing structure
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          full_name VARCHAR(255),
          avatar_url TEXT,
          bio TEXT,
          website VARCHAR(255),
          location VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          status VARCHAR(50) DEFAULT 'active',
          is_active BOOLEAN DEFAULT true,
          is_email_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          last_login_at TIMESTAMP WITH TIME ZONE
        );
      `);

      // Add role column if it doesn't exist (for existing tables)
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='users' AND column_name='role'
          ) THEN
            ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
          END IF;
        END $$;
      `);

      // Add OAuth provider columns if they don't exist
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS oauth_providers JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS github_id VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE;
      `);

      // Create OAuth tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS oauth_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(50) NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          expires_at TIMESTAMP WITHOUT TIME ZONE,
          provider_data JSONB,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, provider)
        );
      `);

      // Create OAuth temp data table for PKCE flow (Twitter)
      await client.query(`
        CREATE TABLE IF NOT EXISTS oauth_temp_data (
          state VARCHAR(255) PRIMARY KEY,
          code_verifier VARCHAR(255),
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        );
      `);

      // Create index for cleanup
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_oauth_temp_data_created_at
        ON oauth_temp_data(created_at);
      `);

      // Add missing columns if they don't exist
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

        -- Update full_name from first_name and last_name if it's null
        UPDATE users SET full_name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);
      `);

      // Create organizations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          owner_id UUID NOT NULL,
          plan VARCHAR(50) DEFAULT 'free',
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Add plan column if it doesn't exist (for migration)
      await client.query(`
        ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';
      `);

      // Create organization_members table for many-to-many relationship
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
          invited_by UUID REFERENCES users(id),
          joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          UNIQUE(organization_id, user_id)
        );
      `);

      // Create projects table
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          database_name VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          project_url TEXT,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Add project_url column to existing tables
      await client.query(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_url TEXT;
      `);

      // Update existing projects to have is_active = true if it's NULL or false
      await client.query(`
        UPDATE projects SET is_active = true WHERE is_active IS NULL OR is_active = false;
      `);

      // Create apps table
      await client.query(`
        CREATE TABLE IF NOT EXISTS apps (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          database_name VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          type VARCHAR(100) NOT NULL,
          framework VARCHAR(100), -- Single primary framework
          frameworks JSONB DEFAULT '[]', -- Array of all frameworks used
          status VARCHAR(50) DEFAULT 'pending',
          deployment_url TEXT,
          repository_url TEXT,
          settings JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Update existing apps to have is_active = true if it's NULL or false
      await client.query(`
        UPDATE apps SET is_active = true WHERE is_active IS NULL OR is_active = false;
      `);

      // Add missing columns if they don't exist (for migration)
      await client.query(`
        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS framework VARCHAR(100);

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS frameworks JSONB DEFAULT '[]';

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS deployment_url TEXT;

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS repository_url TEXT;

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS deployment_status VARCHAR(50) DEFAULT 'not_deployed';

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS container_ids JSONB DEFAULT '[]';

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS resource_usage JSONB DEFAULT '{}';

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS deployment_config JSONB DEFAULT '{}';

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS deployment_server VARCHAR(255);

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS backend_url TEXT;

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS frontend_url TEXT;

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS mobile_url TEXT;

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS deployment_error TEXT;

        ALTER TABLE apps
        ADD COLUMN IF NOT EXISTS auto_suspend BOOLEAN DEFAULT true;

        -- Remove app_id column if it exists (unified system uses id only)
        ALTER TABLE apps
        DROP COLUMN IF EXISTS app_id;
      `);

      // Create app_files table for storing generated files
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_files (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
          path TEXT NOT NULL,
          content TEXT NOT NULL,
          mime_type TEXT,
          size INTEGER DEFAULT 0,
          is_directory BOOLEAN DEFAULT false,
          framework TEXT CHECK (framework IN ('frontend', 'backend', 'mobile', 'shared')),
          version INTEGER DEFAULT 1,
          checksum TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deleted_at TIMESTAMP WITH TIME ZONE,
          UNIQUE(app_id, path)
        );
      `);

      // Create index for faster queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_app_files_app_framework
        ON app_files(app_id, framework)
        WHERE deleted_at IS NULL;
      `);

      // Create file_metadata table for storing uploaded files (storage)
      await client.query(`
        CREATE TABLE IF NOT EXISTS file_metadata (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          filename VARCHAR(255) NOT NULL,
          original_filename VARCHAR(255),
          s3_key TEXT NOT NULL,
          s3_bucket VARCHAR(255) NOT NULL,
          s3_url TEXT,
          content_type VARCHAR(100),
          size INTEGER DEFAULT 0,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          tags JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for file_metadata
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_file_metadata_organization_id ON file_metadata(organization_id);
        CREATE INDEX IF NOT EXISTS idx_file_metadata_project_id ON file_metadata(project_id);
        CREATE INDEX IF NOT EXISTS idx_file_metadata_app_id ON file_metadata(app_id);
        CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id);
        CREATE INDEX IF NOT EXISTS idx_file_metadata_s3_key ON file_metadata(s3_key);
        CREATE INDEX IF NOT EXISTS idx_file_metadata_content_type ON file_metadata(content_type);
        CREATE INDEX IF NOT EXISTS idx_file_metadata_created_at ON file_metadata(created_at DESC);
      `);

      // Create api_keys table
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          key VARCHAR(255) UNIQUE NOT NULL,
          hashed_key VARCHAR(255) NOT NULL,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          permissions JSONB DEFAULT '[]',
          is_active BOOLEAN DEFAULT true,
          expires_at TIMESTAMP WITH TIME ZONE,
          last_used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create organization_invitations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS organization_invitations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) NOT NULL,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
          token VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          accepted_at TIMESTAMP WITH TIME ZONE,
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create audit_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          action VARCHAR(255) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          resource_id UUID,
          details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create schemas table
      await client.query(`
        CREATE TABLE IF NOT EXISTS schemas (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL,
          definition JSONB NOT NULL,
          version VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id)
        );
      `);

      // Handle saved_schemas table migration (might have old structure)
      await client.query(`
        DO $$
        BEGIN
          -- Check if saved_schemas table exists
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'saved_schemas'
          ) THEN
            -- Check if it has the old structure (with tenant_id instead of organization_id)
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'saved_schemas'
              AND column_name = 'tenant_id'
            ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'saved_schemas'
              AND column_name = 'organization_id'
            ) THEN
              -- Drop the old table and recreate with new structure
              DROP TABLE saved_schemas CASCADE;
            END IF;
          END IF;
        END $$;
      `);

      // Create saved_schemas table for storing organization/project/app schemas
      await client.query(`
        CREATE TABLE IF NOT EXISTS saved_schemas (
          id VARCHAR(255) PRIMARY KEY,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          schema_definition JSONB NOT NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for saved_schemas
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_saved_schemas_organization_id ON saved_schemas(organization_id);
        CREATE INDEX IF NOT EXISTS idx_saved_schemas_project_id ON saved_schemas(project_id);
        CREATE INDEX IF NOT EXISTS idx_saved_schemas_app_id ON saved_schemas(app_id);
        CREATE INDEX IF NOT EXISTS idx_saved_schemas_created_at ON saved_schemas(created_at DESC);
      `);

      // Create migration_history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS migration_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL,
          version VARCHAR(255) NOT NULL,
          plan JSONB NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
          error TEXT,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create email_templates table
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          template_id VARCHAR(100) NOT NULL,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'html' CHECK (type IN ('html', 'text', 'mjml')),
          metadata JSONB DEFAULT '{}',
          is_platform_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(template_id, project_id, app_id)
        );
      `);

      // Add missing columns to email_templates if it exists with old structure
      await client.query(`
        DO $$
        BEGIN
          -- Add template_id column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'email_templates' AND column_name = 'template_id') THEN
            ALTER TABLE email_templates ADD COLUMN template_id VARCHAR(100);
            UPDATE email_templates SET template_id = id WHERE template_id IS NULL;
            ALTER TABLE email_templates ALTER COLUMN template_id SET NOT NULL;
          END IF;

          -- Add is_platform_default column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'email_templates' AND column_name = 'is_platform_default') THEN
            ALTER TABLE email_templates ADD COLUMN is_platform_default BOOLEAN DEFAULT false;
          END IF;
        END $$;
      `);

      // Create email_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
          "to" TEXT[] NOT NULL,
          cc TEXT[],
          bcc TEXT[],
          "from" VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          template_id VARCHAR(100),
          template_data JSONB,
          status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
          message_id VARCHAR(255),
          error TEXT,
          sent_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Migration: Add organization_id to existing email_logs table if it doesn't exist
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'email_logs'
            AND column_name = 'organization_id'
          ) THEN
            ALTER TABLE email_logs
            ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      // Create project_usage table for email tracking
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_usage (
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          email_count INTEGER DEFAULT 0,
          api_calls INTEGER DEFAULT 0,
          storage_bytes BIGINT DEFAULT 0,
          month DATE NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY (project_id, month)
        );
      `);

      // Create app_usage table for email tracking
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_usage (
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          email_count INTEGER DEFAULT 0,
          api_calls INTEGER DEFAULT 0,
          storage_bytes BIGINT DEFAULT 0,
          month DATE NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY (app_id, month)
        );
      `);

      // Skip creating billing_subscriptions here - will be created with full Stripe fields later

      // Create contents table for AI-generated content
      await client.query(`
        CREATE TABLE IF NOT EXISTS contents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          content_type VARCHAR(100) NOT NULL,
          title TEXT,
          content JSONB NOT NULL,
          source VARCHAR(100),
          source_details JSONB,
          parameters JSONB,
          metadata JSONB,
          status VARCHAR(50) DEFAULT 'active',
          version INTEGER DEFAULT 1,
          parent_id UUID REFERENCES contents(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Add missing columns to contents table if it already exists (for migration)
      await client.query(`
        DO $$
        BEGIN
          -- Add content_type column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'contents' AND column_name = 'content_type') THEN
            ALTER TABLE contents ADD COLUMN content_type VARCHAR(100) NOT NULL DEFAULT 'text';
          END IF;

          -- Add other potentially missing columns
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'contents' AND column_name = 'source') THEN
            ALTER TABLE contents ADD COLUMN source VARCHAR(100);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'contents' AND column_name = 'source_details') THEN
            ALTER TABLE contents ADD COLUMN source_details JSONB;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'contents' AND column_name = 'parameters') THEN
            ALTER TABLE contents ADD COLUMN parameters JSONB;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'contents' AND column_name = 'version') THEN
            ALTER TABLE contents ADD COLUMN version INTEGER DEFAULT 1;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'contents' AND column_name = 'parent_id') THEN
            ALTER TABLE contents ADD COLUMN parent_id UUID REFERENCES contents(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);

      // Create indexes for contents table (will skip if already exists)
      await client.query(`
        DO $$
        BEGIN
          -- Create indexes only if they don't exist
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_organization_id') THEN
            CREATE INDEX idx_contents_organization_id ON contents(organization_id);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_project_id') THEN
            CREATE INDEX idx_contents_project_id ON contents(project_id);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_app_id') THEN
            CREATE INDEX idx_contents_app_id ON contents(app_id);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_user_id') THEN
            CREATE INDEX idx_contents_user_id ON contents(user_id);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_content_type') THEN
            CREATE INDEX idx_contents_content_type ON contents(content_type);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_status') THEN
            CREATE INDEX idx_contents_status ON contents(status);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_created_at') THEN
            CREATE INDEX idx_contents_created_at ON contents(created_at DESC);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contents_parent_id') THEN
            CREATE INDEX idx_contents_parent_id ON contents(parent_id);
          END IF;
        END $$;
      `);

      // Create project_members table for many-to-many relationship
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
          permissions TEXT[] DEFAULT ARRAY['read']::TEXT[],
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          invited_at TIMESTAMP WITH TIME ZONE,
          invited_by UUID REFERENCES users(id),
          UNIQUE(project_id, user_id)
        );
      `);

      // Create project_invitations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_invitations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          user_id UUID REFERENCES users(id),
          role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
          invited_by UUID NOT NULL REFERENCES users(id),
          token VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          accepted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for project member tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
        CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
        CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);
      `);

      // Create email_verifications table
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          verified_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create password_resets table
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT false,
          used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for auth tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
        CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
        CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
      `);

      // Create app_images table for caching AI-generated images
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_images (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          app_type VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          purpose VARCHAR(255) NOT NULL,
          field_name VARCHAR(100),
          image_url TEXT NOT NULL,
          s3_key TEXT,
          thumbnail_url TEXT,
          width INTEGER,
          height INTEGER,
          size_bytes INTEGER,
          mime_type VARCHAR(50) DEFAULT 'image/jpeg',
          ai_provider VARCHAR(50),
          ai_model VARCHAR(100),
          prompt_used TEXT,
          tags TEXT[],
          usage_count INTEGER DEFAULT 0,
          last_used_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for app_images table
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_app_images_app_type ON app_images(app_type);
        CREATE INDEX IF NOT EXISTS idx_app_images_entity_type ON app_images(entity_type);
        CREATE INDEX IF NOT EXISTS idx_app_images_purpose ON app_images(purpose);
        CREATE INDEX IF NOT EXISTS idx_app_images_app_entity ON app_images(app_type, entity_type);
        CREATE INDEX IF NOT EXISTS idx_app_images_usage ON app_images(usage_count DESC);
        CREATE INDEX IF NOT EXISTS idx_app_images_tags ON app_images USING gin(tags);
      `);

      // Create chatbot_configs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chatbot_configs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          enabled BOOLEAN DEFAULT true,
          model VARCHAR(100) DEFAULT 'gpt-5-mini',
          temperature DECIMAL(3,2) DEFAULT 0.7,
          max_tokens INTEGER DEFAULT 2000,
          system_prompt TEXT,
          welcome_message TEXT,
          suggested_prompts JSONB DEFAULT '[]',
          theme JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create chatbot_agents table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chatbot_agents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          config_id UUID NOT NULL REFERENCES chatbot_configs(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) DEFAULT 'assistant',
          avatar_url TEXT,
          description TEXT,
          capabilities JSONB DEFAULT '[]',
          tools JSONB DEFAULT '[]',
          knowledge_base JSONB DEFAULT '{}',
          personality_traits JSONB DEFAULT '{}',
          response_style TEXT,
          is_active BOOLEAN DEFAULT true,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create chatbot_conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chatbot_conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          config_id UUID NOT NULL REFERENCES chatbot_configs(id) ON DELETE CASCADE,
          agent_id UUID REFERENCES chatbot_agents(id) ON DELETE SET NULL,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          session_id VARCHAR(255),
          title VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
          context JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create chatbot_messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chatbot_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
          content TEXT NOT NULL,
          tokens_used INTEGER DEFAULT 0,
          attachments JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create chatbot_feedback table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chatbot_feedback (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          message_id UUID NOT NULL REFERENCES chatbot_messages(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          feedback TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create chatbot_documents table for training data
      await client.query(`
        CREATE TABLE IF NOT EXISTS chatbot_documents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          file_id UUID REFERENCES file_metadata(id) ON DELETE SET NULL,
          file_name VARCHAR(500) NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_size BIGINT DEFAULT 0,
          file_url TEXT,
          content TEXT,
          chunks INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          error TEXT,
          metadata JSONB DEFAULT '{}',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for chatbot tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_chatbot_configs_org ON chatbot_configs(organization_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_configs_project ON chatbot_configs(project_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_configs_app ON chatbot_configs(app_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_agents_config ON chatbot_agents(config_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_config ON chatbot_conversations(config_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_org ON chatbot_conversations(organization_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user ON chatbot_conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation ON chatbot_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created ON chatbot_messages(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chatbot_feedback_message ON chatbot_feedback(message_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_documents_org ON chatbot_documents(organization_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_documents_project ON chatbot_documents(project_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_documents_app ON chatbot_documents(app_id);
        CREATE INDEX IF NOT EXISTS idx_chatbot_documents_status ON chatbot_documents(status);
        CREATE INDEX IF NOT EXISTS idx_chatbot_documents_created ON chatbot_documents(created_at DESC);
      `);

      // Create job_queue table for tracking async jobs
      await client.query(`
        CREATE TABLE IF NOT EXISTS job_queue (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          queue_name VARCHAR(255) NOT NULL,
          job_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled', 'delayed')),
          message_id VARCHAR(255),
          receipt_handle TEXT,
          data JSONB DEFAULT '{}',
          result JSONB,
          error TEXT,
          progress INTEGER DEFAULT 0,
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for job_queue table
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
        CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(job_type);
        CREATE INDEX IF NOT EXISTS idx_job_queue_org ON job_queue(organization_id);
        CREATE INDEX IF NOT EXISTS idx_job_queue_created ON job_queue(created_at DESC);
      `);

      // ============================================
      // WORKFLOW TABLES
      // ============================================

      // Create workflows table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          trigger JSONB NOT NULL,
          steps JSONB NOT NULL DEFAULT '[]',
          conditions JSONB DEFAULT '[]',
          variables JSONB DEFAULT '[]',
          outputs JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed', 'scheduled')),
          version INTEGER DEFAULT 1,
          is_template BOOLEAN DEFAULT false,
          template_category VARCHAR(100),
          cron_expression VARCHAR(255),
          next_run_at TIMESTAMP WITH TIME ZONE,
          last_run_at TIMESTAMP WITH TIME ZONE,
          last_run_status VARCHAR(50),
          run_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          average_duration_ms INTEGER,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Add missing columns for workflows (migration support from Fluxturn)
      await client.query(`
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS prompt TEXT;
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT 'manual';
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS trigger_config JSONB;
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS canvas JSONB DEFAULT '{"nodes":[],"edges":[]}';
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS template_category VARCHAR(100);
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS required_connectors TEXT[];
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL;
        ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;
      `);

      // Create index for AI workflow generation tracking (for billing limits)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_workflows_ai_generated_created_at
        ON workflows(organization_id, is_ai_generated, created_at)
        WHERE is_ai_generated = true;
      `);

      // Create workflow_executions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflow_executions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          execution_number INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
          trigger_type VARCHAR(50),
          trigger_data JSONB,
          input_data JSONB,
          output_data JSONB,
          error TEXT,
          error_details JSONB,
          steps_completed INTEGER DEFAULT 0,
          total_steps INTEGER,
          current_step_id VARCHAR(255),
          step_results JSONB DEFAULT '[]',
          context JSONB DEFAULT '{}',
          duration_ms INTEGER,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create workflow_templates table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflow_templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          industry VARCHAR(100),
          use_case VARCHAR(255),
          icon VARCHAR(100),
          popularity_score INTEGER DEFAULT 0,
          difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
          estimated_setup_time INTEGER,
          required_connectors TEXT[],
          optional_connectors TEXT[],
          template_definition JSONB NOT NULL,
          example_data JSONB,
          documentation TEXT,
          tags TEXT[],
          is_featured BOOLEAN DEFAULT false,
          is_public BOOLEAN DEFAULT true,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          usage_count INTEGER DEFAULT 0,
          rating DECIMAL(3,2),
          review_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Add missing columns for workflow_templates (Fluxturn + multi-tenant)
      await client.query(`
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS canvas JSONB DEFAULT '{"nodes":[],"edges":[]}';
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]';
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS triggers JSONB DEFAULT '[]';
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]';
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]';
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS outputs JSONB DEFAULT '[]';
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS use_case VARCHAR(255);
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS required_connectors TEXT[];
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS optional_connectors TEXT[];
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS tags TEXT[];
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
        ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      `);

      // Create connectors table with all required fields
      await client.query(`
        CREATE TABLE IF NOT EXISTS connectors (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          type VARCHAR(50) CHECK (type IN ('official', 'community', 'custom', 'enterprise')),
          icon_url TEXT,
          documentation_url TEXT,
          api_version VARCHAR(50),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated', 'beta')),
          capabilities JSONB DEFAULT '[]',
          supported_triggers JSONB DEFAULT '[]',
          supported_actions JSONB DEFAULT '[]',
          required_fields JSONB DEFAULT '[]',
          optional_fields JSONB DEFAULT '[]',
          auth_type VARCHAR(50),
          auth_config JSONB DEFAULT '{}',
          auth_fields JSONB DEFAULT '{}',
          endpoints JSONB DEFAULT '{}',
          rate_limits JSONB DEFAULT '{}',
          webhook_support BOOLEAN DEFAULT false,
          sandbox_available BOOLEAN DEFAULT false,
          batch_support BOOLEAN DEFAULT false,
          real_time_support BOOLEAN DEFAULT false,
          oauth_config JSONB,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          is_public BOOLEAN DEFAULT true,
          usage_count INTEGER DEFAULT 0,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Add missing columns for connectors (for migration)
      await client.query(`
        ALTER TABLE connectors ADD COLUMN IF NOT EXISTS oauth_config JSONB;
        ALTER TABLE connectors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        ALTER TABLE connectors ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
      `);

      // Migration: Remove auth_type constraint to allow any auth type from Fluxturn connectors
      await client.query(`
        DO $$
        BEGIN
          -- Drop the existing constraint if it exists
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'connectors'
            AND constraint_name = 'connectors_auth_type_check'
          ) THEN
            ALTER TABLE connectors DROP CONSTRAINT connectors_auth_type_check;
          END IF;
        END $$;
      `);

      // Create connector_configs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS connector_configs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          auth_data JSONB,
          config_data JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'expired')),
          last_tested_at TIMESTAMP WITH TIME ZONE,
          last_test_status VARCHAR(50),
          last_test_error TEXT,
          usage_count INTEGER DEFAULT 0,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(connector_id, organization_id, project_id, app_id, name)
        );
      `);

      // Add missing columns for connector_configs (migration support from Fluxturn)
      await client.query(`
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS connector_type VARCHAR(100);
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS config JSONB;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS credentials JSONB;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS test_status VARCHAR(50);
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS test_result JSONB;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS oauth_email VARCHAR(255);
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS oauth_scope TEXT;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS is_oauth BOOLEAN DEFAULT false;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS last_refresh_attempt TIMESTAMP WITH TIME ZONE;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS last_refresh_error TEXT;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS refresh_retry_count INTEGER DEFAULT 0;
        ALTER TABLE connector_configs ADD COLUMN IF NOT EXISTS refresh_disabled BOOLEAN DEFAULT false;
      `);

      // Make connector_id nullable (migration: now using connector_type instead of FK to connectors table)
      await client.query(`
        ALTER TABLE connector_configs ALTER COLUMN connector_id DROP NOT NULL;
        DROP INDEX IF EXISTS idx_connector_configs_connector_id;
      `);

      // Create index for efficient querying of expiring OAuth tokens
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_connector_configs_oauth_expiring
        ON connector_configs(oauth_expires_at)
        WHERE is_oauth = true AND status = 'active' AND refresh_disabled = false;
      `);

      // Create node_types table (from Fluxturn)
      await client.query(`
        CREATE TABLE IF NOT EXISTS node_types (
          type VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL,
          description TEXT,
          icon VARCHAR(50),
          config_schema JSONB DEFAULT '{}',
          input_schema JSONB DEFAULT '{}',
          output_schema JSONB DEFAULT '{}',
          is_trigger BOOLEAN DEFAULT false,
          is_action BOOLEAN DEFAULT false,
          is_builtin BOOLEAN DEFAULT true,
          connector_type VARCHAR(100),
          requires_connector BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          examples JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for node_types
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_node_types_category ON node_types(category);
        CREATE INDEX IF NOT EXISTS idx_node_types_is_trigger ON node_types(is_trigger);
        CREATE INDEX IF NOT EXISTS idx_node_types_connector_type ON node_types(connector_type);
      `);

      // Create conversations table (from Fluxturn with multi-tenant support)
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
          messages JSONB NOT NULL DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'active',
          context JSONB DEFAULT '{}',
          current_workflow JSONB,
          workflow_versions JSONB DEFAULT '[]',
          message_count INTEGER DEFAULT 0,
          last_message_at TIMESTAMP WITH TIME ZONE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for conversations
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_workflow_id ON conversations(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
      `);

      // Enforce multi-tenant constraints: project_id is REQUIRED for user resources
      // (organization_id is already NOT NULL, app_id is optional)
      await client.query(`
        -- Make project_id NOT NULL for workflows (all workflows belong to a project)
        DO $$
        BEGIN
          ALTER TABLE workflows ALTER COLUMN project_id SET NOT NULL;
        EXCEPTION
          WHEN others THEN
            -- If there are existing NULL values, this will fail
            -- In that case, update them to a default or handle manually
            NULL;
        END $$;

        -- Make project_id NOT NULL for connector_configs (all connectors belong to a project)
        DO $$
        BEGIN
          ALTER TABLE connector_configs ALTER COLUMN project_id SET NOT NULL;
        EXCEPTION
          WHEN others THEN NULL;
        END $$;

        -- Make project_id NOT NULL for conversations (all conversations belong to a project)
        DO $$
        BEGIN
          ALTER TABLE conversations ALTER COLUMN project_id SET NOT NULL;
        EXCEPTION
          WHEN others THEN NULL;
        END $$;
      `);

      // Create connector_execution_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS connector_execution_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
          connector_config_id UUID REFERENCES connector_configs(id) ON DELETE SET NULL,
          workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          action VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'timeout', 'cancelled')),
          request_data JSONB,
          response_data JSONB,
          error TEXT,
          error_code VARCHAR(100),
          duration_ms INTEGER,
          api_calls_made INTEGER DEFAULT 0,
          retry_count INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create workflow_schedules table for cron jobs
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflow_schedules (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          cron_expression VARCHAR(255) NOT NULL,
          timezone VARCHAR(100) DEFAULT 'UTC',
          is_active BOOLEAN DEFAULT true,
          last_run_at TIMESTAMP WITH TIME ZONE,
          next_run_at TIMESTAMP WITH TIME ZONE,
          run_count INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for workflow tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON workflows(organization_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_app_id ON workflows(app_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
        CREATE INDEX IF NOT EXISTS idx_workflows_is_template ON workflows(is_template);
        CREATE INDEX IF NOT EXISTS idx_workflows_template_category ON workflows(template_category);
        CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_executions_organization_id ON workflow_executions(organization_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_executions_project_id ON workflow_executions(project_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_executions_app_id ON workflow_executions(app_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
        CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

        CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
        CREATE INDEX IF NOT EXISTS idx_workflow_templates_industry ON workflow_templates(industry);
        CREATE INDEX IF NOT EXISTS idx_workflow_templates_use_case ON workflow_templates(use_case);
        CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_featured ON workflow_templates(is_featured);
        CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_public ON workflow_templates(is_public);
        CREATE INDEX IF NOT EXISTS idx_workflow_templates_tags ON workflow_templates USING gin(tags);

        CREATE INDEX IF NOT EXISTS idx_connectors_category ON connectors(category);
        CREATE INDEX IF NOT EXISTS idx_connectors_type ON connectors(type);
        CREATE INDEX IF NOT EXISTS idx_connectors_status ON connectors(status);
        CREATE INDEX IF NOT EXISTS idx_connectors_organization_id ON connectors(organization_id);
        CREATE INDEX IF NOT EXISTS idx_connectors_is_public ON connectors(is_public);

        CREATE INDEX IF NOT EXISTS idx_connector_configs_connector_type ON connector_configs(connector_type);
        CREATE INDEX IF NOT EXISTS idx_connector_configs_organization_id ON connector_configs(organization_id);
        CREATE INDEX IF NOT EXISTS idx_connector_configs_project_id ON connector_configs(project_id);
        CREATE INDEX IF NOT EXISTS idx_connector_configs_app_id ON connector_configs(app_id);
        CREATE INDEX IF NOT EXISTS idx_connector_configs_status ON connector_configs(status);
        CREATE INDEX IF NOT EXISTS idx_connector_configs_user_id ON connector_configs(user_id);

        CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_connector_id ON connector_execution_logs(connector_id);
        CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_workflow_execution_id ON connector_execution_logs(workflow_execution_id);
        CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_organization_id ON connector_execution_logs(organization_id);
        CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_status ON connector_execution_logs(status);
        CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_started_at ON connector_execution_logs(started_at DESC);

        CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_schedules_is_active ON workflow_schedules(is_active);
        CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run_at ON workflow_schedules(next_run_at);
      `);

      // Create billing_subscriptions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS billing_subscriptions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          stripe_customer_id VARCHAR(255),
          stripe_subscription_id VARCHAR(255) UNIQUE,
          stripe_price_id VARCHAR(255),
          plan VARCHAR(50) DEFAULT 'free',
          status VARCHAR(50) DEFAULT 'active',
          interval VARCHAR(20),
          current_period_start TIMESTAMP WITH TIME ZONE,
          current_period_end TIMESTAMP WITH TIME ZONE,
          cancel_at_period_end BOOLEAN DEFAULT false,
          max_projects INTEGER DEFAULT 2,
          max_apps_per_project INTEGER DEFAULT 2,
          max_team_members INTEGER DEFAULT 1,
          email_quota_monthly INTEGER DEFAULT 100,
          push_quota_monthly INTEGER DEFAULT 1000,
          storage_quota_gb INTEGER DEFAULT 1,
          grace_period_end TIMESTAMP WITH TIME ZONE,
          previous_plan VARCHAR(50),
          has_custom_domain BOOLEAN DEFAULT false,
          has_advanced_analytics BOOLEAN DEFAULT false,
          has_priority_support BOOLEAN DEFAULT false,
          has_api_access BOOLEAN DEFAULT false,
          has_export_feature BOOLEAN DEFAULT false,
          has_collaboration BOOLEAN DEFAULT false,
          has_sso BOOLEAN DEFAULT false,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Add missing columns if they don't exist (for migration)
      await client.query(`
        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS interval VARCHAR(20);

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS has_advanced_analytics BOOLEAN DEFAULT false;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS has_api_access BOOLEAN DEFAULT false;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS has_export_feature BOOLEAN DEFAULT false;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS has_collaboration BOOLEAN DEFAULT false;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS ai_workflow_generations INTEGER;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS workflow_executions INTEGER;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS has_vector_database BOOLEAN DEFAULT false;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS has_workflow_automation BOOLEAN DEFAULT false;

        ALTER TABLE billing_subscriptions
        ADD COLUMN IF NOT EXISTS has_realtime_sync BOOLEAN DEFAULT false;
      `);

      // Create invoices table
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          stripe_invoice_id VARCHAR(255) UNIQUE,
          amount INTEGER NOT NULL,
          currency VARCHAR(10) DEFAULT 'usd',
          status VARCHAR(50) NOT NULL,
          description TEXT,
          period_start TIMESTAMP WITH TIME ZONE NOT NULL,
          period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          paid_at TIMESTAMP WITH TIME ZONE,
          hosted_invoice_url TEXT,
          pdf_url TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create payment_methods table
      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_methods (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
          type VARCHAR(50) NOT NULL,
          last4 VARCHAR(4),
          brand VARCHAR(50),
          exp_month INTEGER,
          exp_year INTEGER,
          is_default BOOLEAN DEFAULT false,
          billing_details JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create billing_events table for audit trail
      await client.query(`
        CREATE TABLE IF NOT EXISTS billing_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          event_type VARCHAR(100) NOT NULL,
          description TEXT,
          metadata JSONB DEFAULT '{}',
          stripe_event_id VARCHAR(255) UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create usage_records table for tracking usage
      await client.query(`
        CREATE TABLE IF NOT EXISTS usage_records (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          record_type VARCHAR(50) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          unit VARCHAR(20),
          period_start TIMESTAMP WITH TIME ZONE NOT NULL,
          period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create billing indexes (check if column exists first)
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='billing_subscriptions'
                     AND column_name='stripe_customer_id') THEN
            CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_stripe_customer_id
            ON billing_subscriptions(stripe_customer_id);
          END IF;
        END $$;
        CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status
        ON billing_subscriptions(status);
        CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_plan
        ON billing_subscriptions(plan);

        CREATE INDEX IF NOT EXISTS idx_invoices_organization_id
        ON invoices(organization_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_status
        ON invoices(status);
        CREATE INDEX IF NOT EXISTS idx_invoices_created_at
        ON invoices(created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_payment_methods_organization_id
        ON payment_methods(organization_id);
        CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default
        ON payment_methods(is_default);

        CREATE INDEX IF NOT EXISTS idx_billing_events_organization_id
        ON billing_events(organization_id);
        CREATE INDEX IF NOT EXISTS idx_billing_events_event_type
        ON billing_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_billing_events_created_at
        ON billing_events(created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_usage_records_organization_id
        ON usage_records(organization_id);
        CREATE INDEX IF NOT EXISTS idx_usage_records_record_type
        ON usage_records(record_type);
        CREATE INDEX IF NOT EXISTS idx_usage_records_period
        ON usage_records(period_start, period_end);
      `);

      // ========== PHASE 8: Create app_components table for component metadata tracking ==========
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_components (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          app_id VARCHAR(255) NOT NULL,
          component_type VARCHAR(100) NOT NULL,
          metadata_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
          config JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_app_component UNIQUE (organization_id, project_id, app_id, component_type)
        );

        CREATE INDEX IF NOT EXISTS idx_app_components_org_project_app
          ON app_components(organization_id, project_id, app_id);

        CREATE INDEX IF NOT EXISTS idx_app_components_component_type
          ON app_components(component_type);

        CREATE INDEX IF NOT EXISTS idx_app_components_created_at
          ON app_components(created_at DESC);
      `);

      // Create trigger for auto-updating updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_app_components_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_app_components_updated_at ON app_components;

        CREATE TRIGGER trigger_update_app_components_updated_at
          BEFORE UPDATE ON app_components
          FOR EACH ROW
          EXECUTE FUNCTION update_app_components_updated_at();
      `);

      // Create video_conferencing_sessions table (multi-tenant)
      await client.query(`
        CREATE TABLE IF NOT EXISTS video_conferencing_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id VARCHAR(255) UNIQUE NOT NULL,
          room_name VARCHAR(255),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          max_participants INTEGER DEFAULT 10,
          status VARCHAR(50) DEFAULT 'active',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE,
          recording_enabled BOOLEAN DEFAULT false,
          recording_url TEXT,
          transcription_enabled BOOLEAN DEFAULT false,
          metadata JSONB,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS video_conferencing_participants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID REFERENCES video_conferencing_sessions(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          identity VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          left_at TIMESTAMP WITH TIME ZONE,
          duration_seconds INTEGER,
          metadata JSONB
        );

        CREATE TABLE IF NOT EXISTS video_conferencing_recordings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID REFERENCES video_conferencing_sessions(id) ON DELETE CASCADE,
          egress_id VARCHAR(255),
          file_url TEXT,
          file_size BIGINT,
          duration_seconds INTEGER,
          format VARCHAR(50),
          status VARCHAR(50) DEFAULT 'processing',
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        );

        CREATE INDEX IF NOT EXISTS idx_video_conferencing_sessions_org ON video_conferencing_sessions(organization_id);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_sessions_project ON video_conferencing_sessions(project_id);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_sessions_app ON video_conferencing_sessions(app_id);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_sessions_status ON video_conferencing_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_sessions_room_id ON video_conferencing_sessions(room_id);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_participants_session ON video_conferencing_participants(session_id);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_participants_user ON video_conferencing_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_recordings_session ON video_conferencing_recordings(session_id);
        CREATE INDEX IF NOT EXISTS idx_video_conferencing_recordings_egress ON video_conferencing_recordings(egress_id);
      `);

      // ============================================
      // TENANT PAYMENT TABLES
      // ============================================

      // Create tenant_payment_configs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_payment_configs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          stripe_publishable_key VARCHAR(255),
          stripe_secret_key VARCHAR(255),
          stripe_webhook_secret VARCHAR(255),
          paypal_client_id VARCHAR(255),
          paypal_client_secret VARCHAR(255),
          paypal_webhook_id VARCHAR(255),
          paypal_mode VARCHAR(20) DEFAULT 'sandbox',
          apple_pay_enabled BOOLEAN DEFAULT false,
          apple_pay_merchant_id VARCHAR(255),
          apple_pay_display_name VARCHAR(255),
          google_pay_enabled BOOLEAN DEFAULT false,
          google_pay_merchant_id VARCHAR(255),
          google_pay_merchant_name VARCHAR(255),
          enabled_providers JSONB DEFAULT '["stripe"]'::jsonb,
          price_ids JSONB DEFAULT '[]'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(organization_id, project_id, app_id)
        );
      `);

      // Migrate existing tenant_payment_configs table to add new payment provider columns
      await client.query(`
        DO $$
        BEGIN
          -- Make Stripe keys optional (for multi-provider support)
          ALTER TABLE tenant_payment_configs ALTER COLUMN stripe_publishable_key DROP NOT NULL;
          ALTER TABLE tenant_payment_configs ALTER COLUMN stripe_secret_key DROP NOT NULL;
        EXCEPTION
          WHEN others THEN NULL;
        END $$;
      `);

      await client.query(`
        DO $$
        BEGIN
          -- Add PayPal columns if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='paypal_client_id') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN paypal_client_id VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='paypal_client_secret') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN paypal_client_secret VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='paypal_webhook_id') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN paypal_webhook_id VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='paypal_mode') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN paypal_mode VARCHAR(20) DEFAULT 'sandbox';
          END IF;

          -- Add Apple Pay columns if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='apple_pay_enabled') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN apple_pay_enabled BOOLEAN DEFAULT false;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='apple_pay_merchant_id') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN apple_pay_merchant_id VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='apple_pay_display_name') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN apple_pay_display_name VARCHAR(255);
          END IF;

          -- Add Google Pay columns if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='google_pay_enabled') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN google_pay_enabled BOOLEAN DEFAULT false;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='google_pay_merchant_id') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN google_pay_merchant_id VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='google_pay_merchant_name') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN google_pay_merchant_name VARCHAR(255);
          END IF;

          -- Add enabled_providers column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_payment_configs' AND column_name='enabled_providers') THEN
            ALTER TABLE tenant_payment_configs ADD COLUMN enabled_providers JSONB DEFAULT '["stripe"]'::jsonb;
          END IF;
        END $$;
      `);

      // Create tenant_subscriptions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_subscriptions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
          user_id VARCHAR(255),
          stripe_customer_id VARCHAR(255),
          stripe_subscription_id VARCHAR(255) UNIQUE,
          stripe_price_id VARCHAR(255) NOT NULL,
          plan VARCHAR(50),
          interval VARCHAR(20),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing')),
          current_period_start TIMESTAMP WITH TIME ZONE,
          current_period_end TIMESTAMP WITH TIME ZONE,
          cancel_at_period_end BOOLEAN DEFAULT false,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Drop existing index if it exists (separate query to run every time)
      await client.query(`DROP INDEX IF EXISTS idx_unique_active_subscription;`);

      // Clean up duplicate active subscriptions - keep most recent, cancel older ones
      await client.query(`
        WITH duplicates AS (
          SELECT
            id,
            organization_id,
            project_id,
            user_id,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY organization_id, project_id, user_id
              ORDER BY created_at DESC
            ) as rn
          FROM tenant_subscriptions
          WHERE status NOT IN ('canceled', 'incomplete_expired')
        )
        UPDATE tenant_subscriptions
        SET status = 'canceled', updated_at = NOW()
        WHERE id IN (
          SELECT id FROM duplicates WHERE rn > 1
        );
      `);

      // Now create the unique index (separate query after cleanup)
      await client.query(`
        CREATE UNIQUE INDEX idx_unique_active_subscription
        ON tenant_subscriptions (organization_id, project_id, user_id)
        WHERE status NOT IN ('canceled', 'incomplete_expired');
      `);

      // Migrate existing tenant_subscriptions table to add app_id and metadata columns
      await client.query(`
        DO $$
        BEGIN
          -- Drop foreign key constraint on user_id if it exists (user_id should store tenant app user IDs, not FluxTurn user IDs)
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'tenant_subscriptions_user_id_fkey'
            AND table_name = 'tenant_subscriptions'
          ) THEN
            ALTER TABLE tenant_subscriptions DROP CONSTRAINT tenant_subscriptions_user_id_fkey;
          END IF;

          -- Change user_id column type to VARCHAR if it's UUID (to support any tenant user ID format)
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenant_subscriptions'
            AND column_name = 'user_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE tenant_subscriptions ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::TEXT;
          END IF;

          -- Add app_id column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenant_subscriptions' AND column_name = 'app_id'
          ) THEN
            ALTER TABLE tenant_subscriptions ADD COLUMN app_id UUID REFERENCES apps(id) ON DELETE CASCADE;
          END IF;

          -- Add metadata column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenant_subscriptions' AND column_name = 'metadata'
          ) THEN
            ALTER TABLE tenant_subscriptions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
          END IF;

          -- Rename price_id to stripe_price_id if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenant_subscriptions' AND column_name = 'price_id'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenant_subscriptions' AND column_name = 'stripe_price_id'
          ) THEN
            ALTER TABLE tenant_subscriptions RENAME COLUMN price_id TO stripe_price_id;
          END IF;
        EXCEPTION
          WHEN others THEN NULL;
        END $$;
      `);

      // Create indexes for tenant payment tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tenant_payment_configs_org ON tenant_payment_configs(organization_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_payment_configs_project ON tenant_payment_configs(project_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_payment_configs_app ON tenant_payment_configs(app_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_payment_configs_active ON tenant_payment_configs(is_active);

        CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_org ON tenant_subscriptions(organization_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_project ON tenant_subscriptions(project_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_app ON tenant_subscriptions(app_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_user ON tenant_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_customer ON tenant_subscriptions(stripe_customer_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
      `);

      // Create image_projects table for Imagitar
      await client.query(`
        CREATE TABLE IF NOT EXISTS image_projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          thumbnail_url TEXT,
          canvas_width INTEGER DEFAULT 1920,
          canvas_height INTEGER DEFAULT 1080,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create image_layers table for Imagitar
      await client.query(`
        CREATE TABLE IF NOT EXISTS image_layers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          image_project_id UUID REFERENCES image_projects(id) ON DELETE CASCADE,
          layer_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          visible BOOLEAN DEFAULT true,
          locked BOOLEAN DEFAULT false,
          opacity DECIMAL(3,2) DEFAULT 1.00,
          blend_mode VARCHAR(50) DEFAULT 'normal',
          z_index INTEGER NOT NULL,
          x DECIMAL(10,2) DEFAULT 0,
          y DECIMAL(10,2) DEFAULT 0,
          width DECIMAL(10,2),
          height DECIMAL(10,2),
          rotation DECIMAL(5,2) DEFAULT 0,
          data JSONB,
          asset_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for image_projects and image_layers
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_image_projects_project ON image_projects(project_id);
        CREATE INDEX IF NOT EXISTS idx_image_layers_project ON image_layers(image_project_id);
        CREATE INDEX IF NOT EXISTS idx_image_layers_z_index ON image_layers(z_index);
      `);

      // ===========================================
      // BLOG TABLES
      // ===========================================

      // Create blog_posts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          excerpt TEXT,
          content TEXT NOT NULL,
          image_urls TEXT[] DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'draft',
          category VARCHAR(100),
          tags TEXT[] DEFAULT '{}',
          featured BOOLEAN DEFAULT false,
          meta_title VARCHAR(255),
          meta_description VARCHAR(500),
          author VARCHAR(255),
          rating DECIMAL(3,2) DEFAULT 0,
          rating_count INTEGER DEFAULT 0,
          views_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          published_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create blog_categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create blog_comments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_comments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          parent_comment_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          author_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create blog_ratings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_ratings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(post_id, user_id)
        );
      `);

      // Create blog indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON blog_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_comment_id);
        CREATE INDEX IF NOT EXISTS idx_blog_ratings_post_id ON blog_ratings(post_id);
      `);

      // Seed default blog categories
      await client.query(`
        INSERT INTO blog_categories (name, slug, description) VALUES
          ('Automation', 'automation', 'Workflow automation tips'),
          ('Integration', 'integration', 'Third-party integrations'),
          ('Tips & Tricks', 'tips-tricks', 'Helpful tips and tricks'),
          ('Updates', 'updates', 'Product updates and announcements'),
          ('Tutorials', 'tutorials', 'Step-by-step guides')
        ON CONFLICT (slug) DO NOTHING;
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Create indexes and foreign key constraints outside transaction
    await this.createIndexesAndConstraints();

    // Insert default email templates
    await this.insertDefaultEmailTemplates();
  }

  private async insertDefaultEmailTemplates(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Insert default platform-level email templates
      const defaultTemplates = [
        {
          id: 'welcome',
          name: 'Welcome Email',
          subject: 'Welcome to {{appName}}!',
          content: '<h1>Welcome {{userName}}!</h1><p>Thank you for joining {{appName}}. We are excited to have you onboard.</p><p>If you have any questions, feel free to reach out to our support team.</p><p>Best regards,<br>The {{appName}} Team</p>',
          type: 'html'
        },
        {
          id: 'reset-password',
          name: 'Password Reset',
          subject: 'Reset Your Password',
          content: '<h1>Password Reset Request</h1><p>Hi {{userName}},</p><p>We received a request to reset your password for your {{appName}} account.</p><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p><p>This link will expire in 24 hours.</p><p>If you didn\'t request this, please ignore this email.</p><p>Best regards,<br>The {{appName}} Team</p>',
          type: 'html'
        },
        {
          id: 'verification',
          name: 'Email Verification',
          subject: 'Verify Your Email',
          content: '<h1>Email Verification</h1><p>Hi {{userName}},</p><p>Please verify your email address by clicking <a href="{{verificationLink}}">here</a>.</p><p>If you didn\'t create this account, please ignore this email.</p><p>Best regards,<br>The {{appName}} Team</p>',
          type: 'html'
        },
        {
          id: 'invitation',
          name: 'Team Invitation',
          subject: 'You\'ve been invited to join {{appName}}',
          content: '<h1>You\'re Invited!</h1><p>Hi {{inviteeName}},</p><p>{{inviterName}} has invited you to join {{appName}} as a {{role}}.</p><p>Click <a href="{{inviteLink}}">here</a> to accept the invitation.</p><p>This invitation will expire in 7 days.</p><p>Best regards,<br>The {{appName}} Team</p>',
          type: 'html'
        },
        {
          id: 'notification',
          name: 'General Notification',
          subject: '{{notificationTitle}}',
          content: '<h1>{{notificationTitle}}</h1><p>Hi {{userName}},</p><p>{{notificationMessage}}</p>{{#if actionUrl}}<p><a href="{{actionUrl}}">{{actionText}}</a></p>{{/if}}<p>Best regards,<br>The {{appName}} Team</p>',
          type: 'html'
        }
      ];

      for (const template of defaultTemplates) {
        try {
          await client.query(
            `INSERT INTO email_templates (template_id, project_id, app_id, name, subject, content, type, metadata, is_platform_default)
             VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, true)
             ON CONFLICT (template_id, project_id, app_id)
             DO NOTHING`,
            [template.id, template.name, template.subject, template.content, template.type, JSON.stringify({})]
          );
        } catch (error) {
          this.logger.warn(`Failed to insert default template ${template.id}: ${error.message}`);
        }
      }

      this.logger.log('Default email templates inserted successfully');
    } catch (error) {
      this.logger.error('Failed to insert default email templates:', error);
    } finally {
      client.release();
    }
  }

  private async createIndexesAndConstraints(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create indexes - handle each one separately to avoid failures
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
        'CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id)',
        'CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug)',
        'CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id)',
        'CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id)',
        'CREATE INDEX IF NOT EXISTS idx_apps_project_id ON apps(project_id)',
        'CREATE INDEX IF NOT EXISTS idx_apps_organization_id ON apps(organization_id)',
        'CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id)',
        'CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id)',
        'CREATE INDEX IF NOT EXISTS idx_api_keys_app_id ON api_keys(app_id)',
        'CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)',
        'CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email)',
        'CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token)',
        'CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_schemas_tenant_id ON schemas(tenant_id)',
        'CREATE INDEX IF NOT EXISTS idx_migration_history_tenant_id ON migration_history(tenant_id)',
        'CREATE INDEX IF NOT EXISTS idx_migration_history_started_at ON migration_history(started_at)',
        'CREATE INDEX IF NOT EXISTS idx_migration_history_status ON migration_history(status)',
        // Email-related indexes
        'CREATE INDEX IF NOT EXISTS idx_email_templates_project ON email_templates(project_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_templates_app ON email_templates(app_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_templates_project_app ON email_templates(project_id, app_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_logs_organization ON email_logs(organization_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_logs_project ON email_logs(project_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_logs_app ON email_logs(app_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)',
        'CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_project_usage_project ON project_usage(project_id)',
        'CREATE INDEX IF NOT EXISTS idx_project_usage_month ON project_usage(month)',
        'CREATE INDEX IF NOT EXISTS idx_app_usage_app ON app_usage(app_id)',
        'CREATE INDEX IF NOT EXISTS idx_app_usage_month ON app_usage(month)',
        'CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_org ON billing_subscriptions(organization_id)'
      ];

      for (const indexQuery of indexes) {
        try {
          await client.query(indexQuery);
        } catch (error) {
          this.logger.warn(`Failed to create index: ${error.message}`);
        }
      }

      // Add foreign key constraints - also handle individually
      const constraints = [
        {
          query: `ALTER TABLE organizations
            ADD CONSTRAINT fk_organizations_owner_id
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE`,
          name: 'fk_organizations_owner_id'
        }
      ];

      for (const constraint of constraints) {
        try {
          await client.query(constraint.query);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            this.logger.warn(`Failed to add constraint ${constraint.name}: ${error.message}`);
          }
        }
      }
    } finally {
      client.release();
    }
  }

  // Query and Transaction Methods
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query(text, params);

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command,
        fields: result.fields,
      };
    } catch (error) {
      this.logger.error(`Query failed: ${text}`, error);
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // User Management Methods
  async createUser(input: CreateUserInput): Promise<PlatformUser> {
    const hashedPassword = input.password ? await bcrypt.hash(input.password, 12) : null;
    const id = uuidv4();
    
    // Generate username from email if not provided
    const username = input.username || input.email.split('@')[0] + '_' + Date.now();
    
    // Handle name field from frontend (could be 'name' or 'firstName'/'lastName')
    let fullName = '';
    let firstName = '';
    let lastName = '';
    
    if (input.name) {
      fullName = input.name;
      const nameParts = input.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else {
      firstName = input.firstName || '';
      lastName = input.lastName || '';
      fullName = `${firstName} ${lastName}`.trim();
    }

    const result = await this.query<any>(`
      INSERT INTO users (id, email, username, password_hash, full_name, first_name, last_name, is_active, is_email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
      RETURNING *
    `, [id, input.email, username, hashedPassword, fullName, firstName, lastName]);

    return this.mapUserRow(result.rows[0]);
  }

  async getUserById(id: string): Promise<PlatformUser | null> {
    const result = await this.query<any>(`
      SELECT u.*, om.organization_id, om.role as org_role
      FROM users u
      LEFT JOIN organization_members om ON u.id = om.user_id
      WHERE u.id = $1
      LIMIT 1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const user = this.mapUserRow(row);

    // Set organizationId from organization_members join
    // Note: user.role is the global role (admin, user) from users table, not org role
    if (row.organization_id) {
      user.organizationId = row.organization_id;
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<PlatformUser | null> {
    const result = await this.query<any>(`
      SELECT u.*, om.organization_id, om.role as org_role
      FROM users u
      LEFT JOIN organization_members om ON u.id = om.user_id
      WHERE u.email = $1
      LIMIT 1
    `, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const user = this.mapUserRow(row);

    // Set organizationId from organization_members join
    // Note: user.role is the global role (admin, user) from users table, not org role
    if (row.organization_id) {
      user.organizationId = row.organization_id;
    }

    return user;
  }

  async validateUserCredentials(email: string, password: string): Promise<PlatformUser | null> {
    const result = await this.query<any>(`
      SELECT u.*, om.organization_id, om.role as org_role
      FROM users u
      LEFT JOIN organization_members om ON u.id = om.user_id
      WHERE u.email = $1
      LIMIT 1
    `, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Handle both password and password_hash columns
    const storedPassword = row.password_hash || row.password;
    if (!storedPassword) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, storedPassword);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.query(`
      UPDATE users SET last_login_at = NOW() WHERE id = $1
    `, [row.id]);

    const user = this.mapUserRow(row);

    // Set organizationId from organization_members join
    // Note: user.role is the global role (admin, user) from users table, not org role
    if (row.organization_id) {
      user.organizationId = row.organization_id;
    }

    return user;
  }

  // Organization Management Methods
  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const id = uuidv4();
    const slug = this.generateSlug(input.name);

    // Create organization
    const result = await this.query<any>(`
      INSERT INTO organizations (id, name, slug, description, owner_id, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, input.name, slug, input.description, input.ownerId, JSON.stringify(input.settings || {})]);

    // Add owner as a member with 'owner' role
    await this.query(`
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES ($1, $2, 'owner')
      ON CONFLICT (organization_id, user_id) DO NOTHING
    `, [id, input.ownerId]);

    return this.mapOrganizationRow(result.rows[0]);
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = snakeCase(key);
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(key === 'settings' && value ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id); // Add id as the last parameter
    const result = await this.query<any>(`
      UPDATE organizations 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      throw new Error('Organization not found');
    }
    
    return this.mapOrganizationRow(result.rows[0]);
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const result = await this.query<any>(`
      SELECT * FROM organizations WHERE id = $1
    `, [id]);

    return result.rows.length > 0 ? this.mapOrganizationRow(result.rows[0]) : null;
  }

  async getOrganizationMetrics(organizationId: string): Promise<{
    projectCount: number;
    appCount: number;
    memberCount: number;
    storageBytes: number;
  }> {
    // Get project count
    const projectResult = await this.query<any>(`
      SELECT COUNT(*) as count FROM projects WHERE organization_id = $1
    `, [organizationId]);
    const projectCount = parseInt(projectResult.rows[0]?.count || '0');

    // Get app count
    const appResult = await this.query<any>(`
      SELECT COUNT(*) as count FROM apps WHERE organization_id = $1
    `, [organizationId]);
    const appCount = parseInt(appResult.rows[0]?.count || '0');

    // Get member count
    const memberResult = await this.query<any>(`
      SELECT COUNT(*) as count FROM organization_members WHERE organization_id = $1
    `, [organizationId]);
    const memberCount = parseInt(memberResult.rows[0]?.count || '0');

    // Get storage usage from file_metadata
    const storageResult = await this.query<any>(`
      SELECT COALESCE(SUM(size), 0) as total_bytes FROM file_metadata WHERE organization_id = $1
    `, [organizationId]);
    const storageBytes = parseInt(storageResult.rows[0]?.total_bytes || '0');

    return {
      projectCount,
      appCount,
      memberCount,
      storageBytes,
    };
  }

  async getOrganizationsByUserId(userId: string): Promise<Organization[]> {
    const result = await this.query<any>(`
      SELECT
        o.*,
        om.role as user_role,
        om.joined_at,
        COALESCE(COUNT(DISTINCT p.id), 0)::integer as project_count,
        COALESCE(COUNT(DISTINCT om2.id), 0)::integer as member_count,
        COALESCE(0, 0)::bigint as storage_used,
        COALESCE(CASE
          WHEN o.plan = 'free' THEN 1073741824
          WHEN o.plan = 'starter' THEN 10737418240
          WHEN o.plan = 'pro' THEN 107374182400
          WHEN o.plan = 'enterprise' THEN 1099511627776
          ELSE 1073741824
        END, 1073741824)::bigint as storage_limit,
        o.is_active as status
      FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id
      LEFT JOIN projects p ON p.organization_id = o.id
      LEFT JOIN organization_members om2 ON om2.organization_id = o.id
      WHERE om.user_id = $1
      GROUP BY o.id, om.role, om.joined_at
      ORDER BY om.joined_at DESC
    `, [userId]);

    return result.rows.map(row => ({
      ...this.mapOrganizationRow(row),
      projectCount: row.project_count,
      memberCount: row.member_count,
      storageUsed: parseInt(row.storage_used || '0'),
      storageLimit: parseInt(row.storage_limit || '1073741824'),
      status: row.status ? 'active' : 'suspended',
      createdAt: row.created_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async deleteOrganization(organizationId: string): Promise<boolean> {
    try {
      // First, get all projects in this organization to delete their databases
      const projectsResult = await this.query<any>(`
        SELECT id, database_name FROM projects WHERE organization_id = $1
      `, [organizationId]);

      // Delete each project's tenant database
      for (const project of projectsResult.rows) {
        if (project.database_name) {
          try {
            const dbClient = await this.pool.connect();
            try {
              // Drop the database (requires superuser privileges)
              await dbClient.query(`DROP DATABASE IF EXISTS "${project.database_name}"`);
              this.logger.log(`Dropped database ${project.database_name} for project ${project.id}`);
            } finally {
              dbClient.release();
            }
          } catch (dbError) {
            this.logger.error(`Failed to drop database ${project.database_name}:`, dbError);
            // Continue with deletion even if database drop fails
          }
        }
      }

      // Now delete the organization record
      // This will cascade delete: projects, apps, organization_members, organization_invitations, api_keys
      const result = await this.query(`
        DELETE FROM organizations WHERE id = $1
      `, [organizationId]);

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Failed to delete organization:', error);
      throw error;
    }
  }

  // Project Management Methods
  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.transaction(async (client) => {
      const projectId = uuidv4();
      const databaseName = DatabaseNamingUtil.getProjectDatabaseName(projectId);
      const serviceRoleKey = this.generateApiKey('service');
      const anonKey = this.generateApiKey('anon');
      
      const projectResult = await client.query(`
        INSERT INTO projects (id, name, description, organization_id, database_name, is_active, settings)
        VALUES ($1, $2, $3, $4, $5, true, $6)
        RETURNING *
      `, [projectId, input.name, input.description, input.organizationId, databaseName, JSON.stringify(input.settings || {})]);

      // Create API keys in api_keys table (service role and anon)
      await client.query(`
        INSERT INTO api_keys (id, name, key, hashed_key, project_id, organization_id, permissions, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        `Service Role Key for ${input.name}`,
        serviceRoleKey,
        this.hashApiKey(serviceRoleKey),
        projectId,
        input.organizationId,
        JSON.stringify(['*']), // Full access
        null // Never expires
      ]);

      await client.query(`
        INSERT INTO api_keys (id, name, key, hashed_key, project_id, organization_id, permissions, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        `Anon Key for ${input.name}`,
        anonKey,
        this.hashApiKey(anonKey),
        projectId,
        input.organizationId,
        JSON.stringify(['read']), // Read-only access
        null // Never expires
      ]);
      return this.mapProjectRow(projectResult.rows[0]);
    });
  }

  async createProjectDatabase(databaseName: string): Promise<void> {
    const adminClient = await this.pool.connect();
    try {
      // These DDL operations must be executed outside a transaction
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      
      // Create dedicated user for the database
      const dbUser = `${databaseName}_user`;
      const dbPassword = this.generateDatabasePassword();
      
      await adminClient.query(`
        CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'
      `);
      
      await adminClient.query(`
        GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${dbUser}"
      `);

      this.logger.log(`Created project database: ${databaseName}`);
      
      // Initialize tenant tables (auth schema, users, sessions, etc.)
      // Note: organizationId will be set later in the context
    } finally {
      adminClient.release();
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    const result = await this.query<any>(`
      SELECT * FROM projects WHERE id = $1
    `, [id]);

    return result.rows.length > 0 ? this.mapProjectRow(result.rows[0]) : null;
  }

  async getProjectsByOrganizationId(organizationId: string): Promise<Project[]> {
    const result = await this.query<any>(`
      SELECT * FROM projects WHERE organization_id = $1 ORDER BY created_at DESC
    `, [organizationId]);

    return result.rows.map(row => this.mapProjectRow(row));
  }

  async updateProject(projectId: string, updates: { name?: string; description?: string; projectUrl?: string }): Promise<Project> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.projectUrl !== undefined) {
      fields.push(`project_url = $${paramCount++}`);
      values.push(updates.projectUrl);
    }

    fields.push(`updated_at = NOW()`);
    values.push(projectId);

    const result = await this.query<any>(`
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return this.mapProjectRow(result.rows[0]);
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const result = await this.query<any>(`
      DELETE FROM projects WHERE id = $1
    `, [projectId]);

    return result.rowCount > 0;
  }

  // App Management Methods
  async createApp(input: CreateAppInput): Promise<App> {
    return this.transaction(async (client) => {
      const appId = uuidv4();
      const databaseName = DatabaseNamingUtil.getAppDatabaseName(appId);
      const serviceRoleKey = this.generateApiKey('service');
      const anonKey = this.generateApiKey('anon');

      // Determine app type from framework
      const frameworkTypeMap: Record<string, string> = {
        'REACT_VITE': 'web',
        'REACT_VITE_TAURI': 'desktop',
        'FLUTTER': 'mobile',
        'NESTJS': 'backend',
      };
      const appType = input.type || frameworkTypeMap[input.framework] || 'web';

      // Check if app name already exists in project and make it unique if needed
      const existingApps = await client.query(`
        SELECT name FROM apps WHERE project_id = $1 AND name LIKE $2 || '%'
      `, [input.projectId, input.name]);
      
      let uniqueName = input.name;
      if (existingApps.rows.length > 0) {
        // Add a number suffix to make it unique
        const existingNames = existingApps.rows.map(r => r.name);
        let counter = 2;
        while (existingNames.includes(uniqueName)) {
          uniqueName = `${input.name} ${counter}`;
          counter++;
        }
      }

      // Store keys and frameworks in settings
      const appSettings = {
        ...input.settings,
        serviceRoleKey,
        anonKey,
        frameworks: input.frameworks || [input.framework], // Store all frameworks
      };

      // Create app record with unique name and all required fields
      // Use the generated UUID as the primary id
      const appResult = await client.query(`
        INSERT INTO apps (id, name, description, project_id, organization_id, database_name, type, framework, frameworks, status, settings, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        appId, // Use the UUID we generated
        uniqueName,
        input.description,
        input.projectId,
        input.organizationId,
        databaseName,
        appType,
        input.framework,
        JSON.stringify(input.frameworks || [input.framework]),
        'pending',
        JSON.stringify(appSettings),
        JSON.stringify({})
      ]);

      // Use appId for API keys (it's the same as the row id)
      // Create API keys in api_keys table
      await client.query(`
        INSERT INTO api_keys (id, name, key, hashed_key, app_id, project_id, organization_id, permissions, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        uuidv4(),
        `Service Role Key for ${uniqueName}`,
        serviceRoleKey,
        this.hashApiKey(serviceRoleKey),
        appId, // Use the app UUID id
        input.projectId,
        input.organizationId,
        JSON.stringify(['*']), // Full access
        null // Never expires
      ]);

      await client.query(`
        INSERT INTO api_keys (id, name, key, hashed_key, app_id, project_id, organization_id, permissions, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        uuidv4(),
        `Anon Key for ${uniqueName}`,
        anonKey,
        this.hashApiKey(anonKey),
        appId, // Use the app UUID id
        input.projectId,
        input.organizationId,
        JSON.stringify(['read']), // Read-only access
        null // Never expires
      ]);

      // Create app database (executed outside transaction)
      try {
        await this.createAppDatabase(databaseName);
      } catch (error) {
        throw new Error(`Failed to create app database: ${error.message}`);
      }

      return this.mapAppRow(appResult.rows[0]);
    });
  }

  async createAppDatabase(databaseName: string): Promise<void> {
    const adminClient = await this.pool.connect();
    try {
      // These DDL operations must be executed outside a transaction
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      
      // Create dedicated user for the database
      const dbUser = `${databaseName}_user`;
      const dbPassword = this.generateDatabasePassword();
      
      await adminClient.query(`
        CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'
      `);
      
      await adminClient.query(`
        GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${dbUser}"
      `);

      this.logger.log(`Created app database: ${databaseName}`);
      
      // Initialize tenant tables (auth schema, users, sessions, etc.)
      // Note: will be initialized after database creation
    } finally {
      adminClient.release();
    }
  }


  /**
   * Create tables for app entities
   */
  async createAppEntityTables(appId: string, entities: any[]): Promise<void> {
    const app = await this.getAppById(appId);
    if (!app) {
      throw new Error(`App ${appId} not found`);
    }

    const appDbConfig = {
      ...this.dbConfig,
      database: app.databaseName
    };

    this.logger.log(`Creating entity tables in database: ${app.databaseName}`);

    const { Pool: PgPool } = require('pg');
    const appPool = new PgPool(appDbConfig);

    try {
      const client = await appPool.connect();

      try {
        // Verify auth schema exists
        const authCheck = await client.query(`
          SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth'
        `);

        if (authCheck.rows.length === 0) {
          this.logger.warn(`⚠️  Auth schema does not exist in ${app.databaseName}! Tables with user references will fail.`);
        } else {
          this.logger.log(`✅ Auth schema exists in ${app.databaseName}`);
        }

        for (const entity of entities) {
          const tableName = entity.name.toLowerCase();
          const fields = entity.fields || [];

          // Build field definitions
          const fieldDefs = fields.map(field => {
            let type = 'VARCHAR(255)';

            // CRITICAL FIX: If field references auth schema tables, it MUST be UUID
            const referencesAuthUsers = field.references &&
              (field.references.table === 'auth.users' || field.references.table === 'users');
            const referencesAuthTeams = field.references &&
              (field.references.table === 'auth.teams' || field.references.table === 'teams');
            const isUserIdField = field.name === 'user_id' || field.name === 'created_by' || field.name === 'updated_by';
            const isTeamIdField = field.name === 'team_id';

            if (referencesAuthUsers || referencesAuthTeams || isUserIdField || isTeamIdField) {
              type = 'UUID'; // Match auth schema UUID types
            } else {
              switch (field.dbType) {
                case 'uuid': type = 'UUID DEFAULT gen_random_uuid()'; break;
                case 'text': type = 'TEXT'; break;
                case 'integer': type = 'INTEGER'; break;
                case 'decimal': type = 'DECIMAL(10,2)'; break;
                case 'boolean': type = 'BOOLEAN DEFAULT false'; break;
                case 'timestamp': type = 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()'; break;
                case 'json': type = 'JSONB'; break;
              }
            }

            const nullable = field.required ? 'NOT NULL' : '';
            const primaryKey = field.name === 'id' ? 'PRIMARY KEY' : '';

            // Handle foreign key references
            let references = '';
            if (field.references) {
              // Map table names to auth schema if needed
              let refTable = field.references.table;
              if (refTable === 'users') refTable = 'auth.users';
              if (refTable === 'teams') refTable = 'auth.teams';

              const refColumn = field.references.column || 'id';
              references = `REFERENCES ${refTable}(${refColumn}) ON DELETE CASCADE`;
            } else if (field.name === 'user_id' || field.name === 'created_by' || field.name === 'updated_by') {
              // Auto-detect common user reference fields
              references = `REFERENCES auth.users(id) ON DELETE SET NULL`;
            } else if (field.name === 'team_id') {
              // Auto-detect team reference field
              references = `REFERENCES auth.teams(id) ON DELETE CASCADE`;
            }

            const fieldDef = `${field.name} ${type} ${primaryKey} ${nullable} ${references}`.trim();
            return fieldDef;
          }).join(',\n            ');

          // Create table (quote table name to handle reserved keywords like 'order')
          const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${fieldDefs});`;
          await client.query(createTableSQL);
          
          // Create indexes for foreign keys and commonly queried fields
          for (const field of fields) {
            if (field.name.endsWith('_id') || field.name === 'email' || field.name === 'created_at') {
              await client.query(`
                CREATE INDEX IF NOT EXISTS idx_${tableName}_${field.name} 
                ON "${tableName}"(${field.name});
              `);
            }
          }
          
          this.logger.log(`Created table ${tableName} for app ${appId}`);
        }
      } finally {
        client.release();
      }
    } finally {
      await appPool.end();
    }
  }

  async getAppById(appId: string): Promise<App | null> {
    const result = await this.query<any>(`
      SELECT * FROM apps WHERE id = $1
    `, [appId]);

    return result.rows.length > 0 ? this.mapAppRow(result.rows[0]) : null;
  }

  async getAppsByProjectId(projectId: string): Promise<App[]> {
    const result = await this.query<any>(`
      SELECT * FROM apps WHERE project_id = $1 ORDER BY created_at DESC
    `, [projectId]);

    return result.rows.map(row => this.mapAppRow(row));
  }

  // API Key Management Methods
  async createApiKey(input: CreateApiKeyInput): Promise<ApiKey> {
    const id = uuidv4();

    // Determine prefix based on key name and permissions
    // Priority: name hint > permissions > default
    let prefix = 'cgx'; // default for custom API keys

    if (input.name.toLowerCase().includes('service')) {
      // Service role keys have full permissions
      prefix = 'service';
    } else if (input.name.toLowerCase().includes('anon')) {
      // Anon keys are public read-only keys
      prefix = 'anon';
    } else if (input.permissions.includes('admin') || (input.permissions.includes('write') && input.permissions.includes('execute'))) {
      // High privilege keys get service prefix
      prefix = 'service';
    } else if (input.permissions.length === 1 && input.permissions.includes('read')) {
      // Read-only keys get anon prefix
      prefix = 'anon';
    }
    // Otherwise use cgx prefix for custom API keys with mixed permissions

    const key = this.generateApiKey(prefix);
    const hashedKey = this.hashApiKey(key);

    const result = await this.query<any>(`
      INSERT INTO api_keys (id, name, key, hashed_key, project_id, app_id, organization_id, permissions, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, input.name, key, hashedKey, input.projectId, input.appId, input.organizationId, JSON.stringify(input.permissions), input.expiresAt]);

    const apiKey = this.mapApiKeyRow(result.rows[0]);
    // Return the actual key only on creation
    apiKey.key = key;
    return apiKey;
  }

  async validateApiKey(key: string): Promise<ApiKey | null> {
    const hashedKey = this.hashApiKey(key);
    
    const result = await this.query<any>(`
      SELECT ak.*, p.organization_id as project_org_id, a.organization_id as app_org_id
      FROM api_keys ak
      LEFT JOIN projects p ON ak.project_id = p.id
      LEFT JOIN apps a ON ak.app_id = a.id
      WHERE ak.hashed_key = $1 
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    `, [hashedKey]);

    if (result.rows.length === 0) {
      return null;
    }

    // Update last used timestamp
    await this.query(`
      UPDATE api_keys SET last_used_at = NOW() WHERE id = $1
    `, [result.rows[0].id]);

    return this.mapApiKeyRow(result.rows[0]);
  }

  async getApiKeysByOrganizationId(organizationId: string): Promise<ApiKey[]> {
    const result = await this.query<any>(`
      SELECT * FROM api_keys WHERE organization_id = $1 ORDER BY created_at DESC
    `, [organizationId]);

    return result.rows.map(row => this.mapApiKeyRow(row));
  }

  async getApiKeysByProjectId(projectId: string): Promise<ApiKey[]> {
    const result = await this.query<any>(`
      SELECT * FROM api_keys WHERE project_id = $1 ORDER BY created_at DESC
    `, [projectId]);

    return result.rows.map(row => this.mapApiKeyRow(row));
  }

  async getApiKeysByAppId(appId: string): Promise<ApiKey[]> {
    const result = await this.query<any>(`
      SELECT * FROM api_keys WHERE app_id = $1 ORDER BY created_at DESC
    `, [appId]);

    return result.rows.map(row => this.mapApiKeyRow(row));
  }

  async deleteApiKey(keyId: string): Promise<boolean> {
    const result = await this.query<any>(`
      DELETE FROM api_keys WHERE id = $1 RETURNING id
    `, [keyId]);

    return result.rowCount > 0;
  }

  // Audit Logging

  // Helper Methods
  private mapUserRow(row: any): PlatformUser {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      fullName: row.full_name || '',
      username: row.username,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      website: row.website,
      location: row.location,
      isActive: row.is_active !== false,
      isEmailVerified: row.is_email_verified || false,
      organizationId: null, // Will be determined from organization_members
      role: row.role || 'user', // Use role from users table (admin, user, etc.)
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
      oauthProviders: row.oauth_providers || [],
      githubId: row.github_id,
      googleId: row.google_id,
      facebookId: row.facebook_id,
      twitterId: row.twitter_id,
      appleId: row.apple_id,
    };
  }

  private mapOrganizationRow(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      isActive: row.is_active,
      ownerId: row.owner_id,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapProjectRow(row: any): Project {
    const settings = row.settings || {};
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      organizationId: row.organization_id,
      databaseName: row.database_name,
      serviceRoleKey: settings.serviceRoleKey || null,
      anonKey: settings.anonKey || null,
      isActive: row.is_active !== false, // Map is_active column (snake_case) to isActive (camelCase)
      projectUrl: row.project_url || null,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAppRow(row: any): App {
    const settings = row.settings || {};
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      projectId: row.project_id,
      organizationId: null, // Not stored in apps table
      databaseName: row.database_name,
      serviceRoleKey: settings.serviceRoleKey || null,
      anonKey: settings.anonKey || null,
      isActive: row.is_active !== false, // Map is_active column (snake_case) to isActive (camelCase)
      type: row.type,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapApiKeyRow(row: any): ApiKey {
    return {
      id: row.id,
      name: row.name,
      key: row.key, // Return the actual key - let frontend handle masking
      hashedKey: row.hashed_key,
      projectId: row.project_id,
      appId: row.app_id,
      organizationId: row.organization_id,
      permissions: row.permissions || [],
      isActive: row.is_active,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAuditLogRow(row: any): AuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
      + '-' + Math.random().toString(36).substring(2, 8);
  }

  private generateApiKey(prefix: string): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomBytes}`;
  }

  private generateDatabasePassword(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  // Content Management Methods
  async saveContent(content: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
    userId?: string;
    type: 'image' | 'video' | 'audio' | 'text' | 'document';
    subtype?: string;
    title?: string;
    description?: string;
    prompt?: string;
    s3Key?: string;
    s3Url?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    dimensions?: { width: number; height: number };
    aiProvider?: string;
    aiModel?: string;
    aiCost?: number;
    aiTaskId?: string;
    metadata?: any;
    tags?: string[];
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    isPublic?: boolean;
  }): Promise<string> {
    // Build the content JSON object with all the details
    const contentData = {
      type: content.type,
      subtype: content.subtype,
      description: content.description,
      prompt: content.prompt,
      s3Key: content.s3Key,
      s3Url: content.s3Url,
      fileSize: content.fileSize,
      mimeType: content.mimeType,
      duration: content.duration,
      dimensions: content.dimensions,
      aiProvider: content.aiProvider,
      aiModel: content.aiModel,
      aiCost: content.aiCost,
      aiTaskId: content.aiTaskId,
      tags: content.tags,
      errorMessage: content.errorMessage,
      isPublic: content.isPublic
    };

    // Construct content_type from type and subtype
    const contentType = content.subtype ? `${content.type}/${content.subtype}` : content.type;

    const query = `
      INSERT INTO contents (
        organization_id, project_id, app_id, user_id,
        content_type, title, content, source, source_details,
        parameters, metadata, status, version
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING id
    `;
    
    const values = [
      content.organizationId || null,
      content.projectId || null,
      content.appId || null,
      content.userId || null,
      contentType,
      content.title || null,
      JSON.stringify(contentData), // Store all content details as JSONB
      'ai-generation', // source
      JSON.stringify({ // source_details
        provider: content.aiProvider,
        model: content.aiModel,
        taskId: content.aiTaskId
      }),
      JSON.stringify({ // parameters  
        prompt: content.prompt,
        dimensions: content.dimensions
      }),
      content.metadata ? JSON.stringify(content.metadata) : null,
      content.status || 'completed',
      1 // version
    ];
    
    const result = await this.query(query, values);
    return result.rows[0].id;
  }

  async updateContent(contentId: string, newContent: any): Promise<void> {
    const updateQuery = `
      UPDATE contents
      SET content = $2,
          updated_at = NOW()
      WHERE id = $1
    `;

    await this.query(updateQuery, [
      contentId,
      JSON.stringify(newContent)
    ]);
  }

  async updateContentStatus(
    contentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string,
    additionalData?: {
      s3Url?: string;
      s3Key?: string;
      fileSize?: number;
      duration?: number;
      dimensions?: { width: number; height: number };
      aiCost?: number;
    }
  ): Promise<void> {
    // First fetch the existing content to merge data
    const getQuery = `SELECT content, metadata FROM contents WHERE id = $1`;
    const existingResult = await this.query(getQuery, [contentId]);
    
    if (existingResult.rows.length === 0) {
      throw new Error(`Content with id ${contentId} not found`);
    }
    
    const existingContent = existingResult.rows[0].content || {};
    const existingMetadata = existingResult.rows[0].metadata || {};
    
    // Merge additional data into content JSONB
    if (additionalData) {
      if (additionalData.s3Url !== undefined) {
        existingContent.s3Url = additionalData.s3Url;
      }
      if (additionalData.s3Key !== undefined) {
        existingContent.s3Key = additionalData.s3Key;
      }
      if (additionalData.fileSize !== undefined) {
        existingContent.fileSize = additionalData.fileSize;
      }
      if (additionalData.duration !== undefined) {
        existingContent.duration = additionalData.duration;
      }
      if (additionalData.dimensions !== undefined) {
        existingContent.dimensions = additionalData.dimensions;
      }
      if (additionalData.aiCost !== undefined) {
        existingContent.aiCost = additionalData.aiCost;
      }
    }
    
    // Add error message to content if provided
    if (errorMessage) {
      existingContent.errorMessage = errorMessage;
    }
    
    // Update the content with merged data
    const updateQuery = `
      UPDATE contents 
      SET status = $2, 
          content = $3,
          updated_at = NOW()
      WHERE id = $1
    `;
    
    await this.query(updateQuery, [
      contentId,
      status,
      JSON.stringify(existingContent)
    ]);
  }

  async getContentById(contentId: string): Promise<any> {
    const query = `SELECT * FROM contents WHERE id = $1`;
    const result = await this.query(query, [contentId]);
    return result.rows[0] || null;
  }

  async getContentsByProject(projectId: string, limit = 100, offset = 0): Promise<any[]> {
    const query = `
      SELECT * FROM contents 
      WHERE project_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.query(query, [projectId, limit, offset]);
    return result.rows;
  }

  async getContentsByApp(appId: string, limit = 100, offset = 0): Promise<any[]> {
    const query = `
      SELECT * FROM contents 
      WHERE app_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.query(query, [appId, limit, offset]);
    return result.rows;
  }

  // ============= PROJECT MEMBER MANAGEMENT =============
  
  async addProjectMember(input: CreateProjectMemberInput): Promise<ProjectMember> {
    const id = uuidv4();
    const result = await this.query<any>(`
      INSERT INTO project_members (id, project_id, user_id, role, permissions, invited_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      id, 
      input.projectId, 
      input.userId, 
      input.role || 'member',
      input.permissions || ['read'],
      input.invitedBy
    ]);
    return this.mapProjectMemberRow(result.rows[0]);
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const result = await this.query<any>(`
      SELECT pm.*, u.email, u.first_name, u.last_name
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at DESC
    `, [projectId]);
    return result.rows.map(row => this.mapProjectMemberRow(row));
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await this.query(`
      DELETE FROM project_members 
      WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId]);
  }

  async updateProjectMemberRole(projectId: string, userId: string, role: string): Promise<void> {
    await this.query(`
      UPDATE project_members 
      SET role = $3, permissions = $4
      WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId, role, this.getPermissionsForRole(role)]);
  }

  async createProjectInvitation(input: CreateProjectInvitationInput): Promise<ProjectInvitation> {
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const result = await this.query<any>(`
      INSERT INTO project_invitations (id, project_id, email, role, invited_by, token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, input.projectId, input.email, input.role, input.invitedBy, token, expiresAt]);
    
    return this.mapProjectInvitationRow(result.rows[0]);
  }

  async getProjectInvitation(token: string): Promise<ProjectInvitation | null> {
    const result = await this.query<any>(`
      SELECT * FROM project_invitations 
      WHERE token = $1 AND status = 'pending' AND expires_at > NOW()
    `, [token]);
    return result.rows.length > 0 ? this.mapProjectInvitationRow(result.rows[0]) : null;
  }

  async acceptProjectInvitation(token: string, userId: string): Promise<boolean> {
    const invitation = await this.getProjectInvitation(token);
    if (!invitation) {
      return false;
    }

    await this.transaction(async (client) => {
      // Update invitation status
      await client.query(`
        UPDATE project_invitations 
        SET status = 'accepted', accepted_at = NOW(), user_id = $2
        WHERE token = $1
      `, [token, userId]);

      // Add user as project member
      await client.query(`
        INSERT INTO project_members (project_id, user_id, role, invited_by, invited_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (project_id, user_id) DO UPDATE
        SET role = EXCLUDED.role
      `, [invitation.projectId, userId, invitation.role, invitation.invitedBy]);
    });

    return true;
  }

  async declineProjectInvitation(token: string): Promise<boolean> {
    const result = await this.query(`
      UPDATE project_invitations 
      SET status = 'declined', updated_at = NOW()
      WHERE token = $1 AND status = 'pending'
      RETURNING id
    `, [token]);
    return result.rowCount > 0;
  }

  async getProjectInvitations(projectId: string): Promise<ProjectInvitation[]> {
    const result = await this.query<any>(`
      SELECT * FROM project_invitations 
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);
    return result.rows.map(row => this.mapProjectInvitationRow(row));
  }

  // Organization member methods
  async getOrganizationMembers(organizationId: string, roles?: string[]): Promise<any[]> {
    let roleFilter = '';
    const params = [organizationId];
    
    if (roles && roles.length > 0) {
      roleFilter = ` AND om.role = ANY($2)`;
      params.push(`{${roles.join(',')}}`);
    }
    
    const result = await this.query<any>(`
      SELECT 
        om.id,
        om.organization_id,
        om.user_id,
        om.role,
        om.joined_at,
        u.email,
        u.first_name,
        u.last_name,
        u.username
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = $1${roleFilter}
      ORDER BY om.joined_at DESC
    `, params);
    
    return result.rows.map(row => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      user: {
        id: row.user_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        username: row.username,
      },
    }));
  }

  async removeOrganizationMember(organizationId: string, userId: string): Promise<void> {
    await this.query(`
      DELETE FROM organization_members
      WHERE organization_id = $1 AND user_id = $2
    `, [organizationId, userId]);
  }

  async updateOrganizationMemberRole(organizationId: string, userId: string, role: string): Promise<void> {
    await this.query(`
      UPDATE organization_members
      SET role = $3
      WHERE organization_id = $1 AND user_id = $2
    `, [organizationId, userId, role]);
  }

  async createOrganizationInvitation(input: CreateOrganizationInvitationInput): Promise<OrganizationInvitation> {
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await this.query<any>(`
      INSERT INTO organization_invitations (id, organization_id, email, role, invited_by, token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, input.organizationId, input.email, input.role, input.invitedBy, token, expiresAt]);

    return this.mapOrganizationInvitationRow(result.rows[0]);
  }

  async getOrganizationInvitation(token: string): Promise<OrganizationInvitation | null> {
    const result = await this.query<any>(`
      SELECT * FROM organization_invitations
      WHERE token = $1 AND status = 'pending' AND expires_at > NOW()
    `, [token]);
    return result.rows.length > 0 ? this.mapOrganizationInvitationRow(result.rows[0]) : null;
  }

  async acceptOrganizationInvitation(token: string, userId: string): Promise<boolean> {
    const invitation = await this.getOrganizationInvitation(token);
    if (!invitation) {
      return false;
    }

    await this.transaction(async (client) => {
      // Update invitation status
      await client.query(`
        UPDATE organization_invitations
        SET status = 'accepted', accepted_at = NOW(), user_id = $2
        WHERE token = $1
      `, [token, userId]);

      // Add user as organization member
      await client.query(`
        INSERT INTO organization_members (organization_id, user_id, role, invited_by, joined_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role = EXCLUDED.role
      `, [invitation.organizationId, userId, invitation.role, invitation.invitedBy]);
    });

    return true;
  }

  async declineOrganizationInvitation(token: string): Promise<boolean> {
    const result = await this.query(`
      UPDATE organization_invitations
      SET status = 'declined', updated_at = NOW()
      WHERE token = $1 AND status = 'pending'
      RETURNING id
    `, [token]);
    return result.rowCount > 0;
  }

  async getOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    const result = await this.query<any>(`
      SELECT * FROM organization_invitations
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `, [organizationId]);
    return result.rows.map(row => this.mapOrganizationInvitationRow(row));
  }

  async resendOrganizationInvitation(invitationId: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Extend by 7 days
    const result = await this.query(`
      UPDATE organization_invitations
      SET expires_at = $2, updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING id
    `, [invitationId, expiresAt]);
    return result.rowCount > 0;
  }

  async cancelOrganizationInvitation(invitationId: string): Promise<boolean> {
    const result = await this.query(`
      UPDATE organization_invitations
      SET status = 'expired', updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING id
    `, [invitationId]);
    return result.rowCount > 0;
  }

  // Billing methods
  async getBillingSubscription(organizationId: string): Promise<any> {
    const result = await this.query<any>(`
      SELECT * FROM billing_subscriptions
      WHERE organization_id = $1
    `, [organizationId]);
    return result.rows[0] || null;
  }

  async createBillingSubscription(data: any): Promise<any> {
    const {
      organizationId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      metadata
    } = data;

    const result = await this.query<any>(`
      INSERT INTO billing_subscriptions (
        organization_id, stripe_subscription_id, stripe_price_id, status,
        current_period_start, current_period_end, cancel_at_period_end, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      organizationId, stripeSubscriptionId, stripePriceId, status,
      currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, 
      metadata ? JSON.stringify(metadata) : null
    ]);
    return result.rows[0];
  }

  async updateBillingSubscription(organizationId: string, data: any): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = snakeCase(key);
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(key === 'metadata' && value ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(organizationId);

    const result = await this.query<any>(`
      UPDATE billing_subscriptions
      SET ${fields.join(', ')}
      WHERE organization_id = $${paramIndex}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async upsertBillingSubscription(organizationId: string, data: any): Promise<any> {
    const {
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      plan,
      interval,
      stripeCustomerId,
      ...rest
    } = data;

    // Build metadata from remaining fields (limits and features)
    const metadata = Object.keys(rest).length > 0 ? rest : null;

    const result = await this.query<any>(`
      INSERT INTO billing_subscriptions (
        organization_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
        plan, status, interval, current_period_start, current_period_end,
        cancel_at_period_end, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (organization_id) DO UPDATE SET
        stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, billing_subscriptions.stripe_customer_id),
        stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, billing_subscriptions.stripe_subscription_id),
        stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, billing_subscriptions.stripe_price_id),
        plan = COALESCE(EXCLUDED.plan, billing_subscriptions.plan),
        status = EXCLUDED.status,
        interval = COALESCE(EXCLUDED.interval, billing_subscriptions.interval),
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        metadata = COALESCE(EXCLUDED.metadata, billing_subscriptions.metadata),
        updated_at = NOW()
      RETURNING *
    `, [
      organizationId,
      stripeCustomerId || null,
      stripeSubscriptionId || null,
      stripePriceId || null,
      plan || 'free',
      status || 'active',
      interval || null,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd || false,
      metadata ? JSON.stringify(metadata) : null
    ]);

    return result.rows[0];
  }

  async createInvoice(data: any): Promise<any> {
    const {
      organizationId,
      stripeInvoiceId,
      amount,
      currency,
      status,
      description,
      periodStart,
      periodEnd,
      paidAt,
      hostedInvoiceUrl,
      pdfUrl,
      metadata
    } = data;

    const result = await this.query<any>(`
      INSERT INTO invoices (
        organization_id, stripe_invoice_id, amount, currency,
        status, description, period_start, period_end, paid_at,
        hosted_invoice_url, pdf_url, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      organizationId, stripeInvoiceId, amount, currency,
      status, description, periodStart, periodEnd, paidAt,
      hostedInvoiceUrl, pdfUrl,
      metadata || {}
    ]);
    return result.rows[0];
  }

  async getInvoices(organizationId: string): Promise<any[]> {
    const result = await this.query<any>(`
      SELECT * FROM invoices
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `, [organizationId]);
    return result.rows;
  }

  async getInvoicesByStripeInvoiceId(stripeInvoiceId: string): Promise<any> {
    const result = await this.query<any>(`
      SELECT * FROM invoices
      WHERE stripe_invoice_id = $1
      LIMIT 1
    `, [stripeInvoiceId]);
    return result.rows[0];
  }

  async getPaymentMethods(organizationId: string): Promise<any[]> {
    const result = await this.query<any>(`
      SELECT * FROM payment_methods
      WHERE organization_id = $1
      ORDER BY is_default DESC, created_at DESC
    `, [organizationId]);
    return result.rows;
  }

  async createPaymentMethod(data: any): Promise<any> {
    const {
      organizationId,
      stripePaymentMethodId,
      type,
      last4,
      brand,
      expiryMonth,
      expiryYear,
      isDefault,
      metadata
    } = data;

    const result = await this.query<any>(`
      INSERT INTO payment_methods (
        organization_id, stripe_payment_method_id, type, last4, brand,
        expiry_month, expiry_year, is_default, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      organizationId, stripePaymentMethodId, type, last4, brand,
      expiryMonth, expiryYear, isDefault || false,
      metadata ? JSON.stringify(metadata) : null
    ]);
    return result.rows[0];
  }

  async updatePaymentMethod(id: string, data: any): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = snakeCase(key);
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(key === 'metadata' && value ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query<any>(`
      UPDATE payment_methods
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    return result.rows[0];
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    const result = await this.query<any>(`
      DELETE FROM payment_methods
      WHERE id = $1
    `, [id]);
    return result.rowCount > 0;
  }

  async setDefaultPaymentMethod(organizationId: string, paymentMethodId: string): Promise<any> {
    // First, unset all existing default payment methods for the organization
    await this.query<any>(`
      UPDATE payment_methods
      SET is_default = false, updated_at = NOW()
      WHERE organization_id = $1
    `, [organizationId]);

    // Then set the specified payment method as default
    const result = await this.query<any>(`
      UPDATE payment_methods
      SET is_default = true, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [paymentMethodId, organizationId]);
    return result.rows[0];
  }

  async createBillingEvent(data: any): Promise<any> {
    const {
      organizationId,
      eventType,
      stripeEventId,
      eventData,
      processed,
      metadata
    } = data;

    const result = await this.query<any>(`
      INSERT INTO billing_events (
        organization_id, event_type, stripe_event_id, event_data, processed, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      organizationId, eventType, stripeEventId,
      eventData ? JSON.stringify(eventData) : null,
      processed || false,
      metadata ? JSON.stringify(metadata) : null
    ]);
    return result.rows[0];
  }

  async getUsageRecords(organizationId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = `
      SELECT * FROM usage_records 
      WHERE organization_id = $1
    `;
    const values = [organizationId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND recorded_at >= $${paramIndex}`;
      values.push(startDate.toISOString());
      paramIndex++;
    }

    if (endDate) {
      query += ` AND recorded_at <= $${paramIndex}`;
      values.push(endDate.toISOString());
      paramIndex++;
    }

    query += ` ORDER BY recorded_at DESC`;

    const result = await this.query<any>(query, values);
    return result.rows;
  }

  async createUsageRecord(data: any): Promise<any> {
    const {
      organizationId,
      recordType,
      quantity,
      unit,
      periodStart,
      periodEnd,
      metadata
    } = data;

    const result = await this.query<any>(`
      INSERT INTO usage_records (
        organization_id, record_type, quantity, unit, period_start, period_end, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      organizationId,
      recordType,
      quantity || 0,
      unit || null,
      periodStart || new Date(),
      periodEnd || new Date(),
      metadata || {}
    ]);
    return result.rows[0];
  }

  // Helper methods for mapping rows
  private mapProjectMemberRow(row: any): ProjectMember {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role,
      permissions: row.permissions || [],
      joinedAt: row.joined_at,
      invitedAt: row.invited_at,
      invitedBy: row.invited_by,
    };
  }

  private mapProjectInvitationRow(row: any): ProjectInvitation {
    return {
      id: row.id,
      projectId: row.project_id,
      email: row.email,
      userId: row.user_id,
      role: row.role,
      invitedBy: row.invited_by,
      token: row.token,
      status: row.status,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapOrganizationInvitationRow(row: any): OrganizationInvitation {
    return {
      id: row.id,
      organizationId: row.organization_id,
      email: row.email,
      userId: row.user_id,
      role: row.role,
      invitedBy: row.invited_by,
      token: row.token,
      status: row.status,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private getPermissionsForRole(role: string): string[] {
    switch (role) {
      case 'owner':
        return ['read', 'write', 'delete', 'admin'];
      case 'admin':
        return ['read', 'write', 'delete'];
      case 'member':
        return ['read', 'write'];
      case 'viewer':
        return ['read'];
      default:
        return ['read'];
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Platform database health check failed:', error);
      return false;
    }
  }

  // Connection Pool Stats
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  // Get Pool for direct access
  getPool(): Pool {
    return this.pool;
  }

  // ============= EMAIL VERIFICATION & PASSWORD RESET =============

  async generateVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.query(`
      INSERT INTO email_verifications (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE
      SET token = $2, expires_at = $3, created_at = NOW()
    `, [userId, token, expiresAt]);

    return token;
  }

  async verifyEmailToken(token: string): Promise<string | null> {
    const result = await this.query<any>(`
      SELECT user_id FROM email_verifications
      WHERE token = $1 AND expires_at > NOW() AND verified_at IS NULL
    `, [token]);

    return result.rows.length > 0 ? result.rows[0].user_id : null;
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.transaction(async (client) => {
      // Mark email as verified in users table
      await client.query(`
        UPDATE users SET is_email_verified = true WHERE id = $1
      `, [userId]);

      // Mark verification token as used
      await client.query(`
        UPDATE email_verifications 
        SET verified_at = NOW() 
        WHERE user_id = $1 AND verified_at IS NULL
      `, [userId]);
    });
  }

  async generatePasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Invalidate any existing tokens for this user
    await this.query(`
      UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false
    `, [userId]);

    // Create new token
    await this.query(`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [userId, token, expiresAt]);

    return token;
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const result = await this.query<any>(`
      SELECT user_id FROM password_resets
      WHERE token = $1 AND expires_at > NOW() AND used = false
    `, [token]);

    return result.rows.length > 0 ? result.rows[0].user_id : null;
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.query(`
      UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
    `, [hashedPassword, userId]);
  }

  // OAuth Methods
  async getUserByOAuthId(provider: string, providerId: string): Promise<PlatformUser | null> {
    const column = `${provider}_id`;
    const result = await this.query<any>(`
      SELECT * FROM users WHERE ${column} = $1
    `, [providerId]);
    return result.rows.length > 0 ? this.mapUserRow(result.rows[0]) : null;
  }

  async createOrUpdateOAuthUser(
    provider: string,
    providerId: string,
    profile: {
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      username?: string;
    }
  ): Promise<PlatformUser> {
    // Check if user exists with this OAuth provider ID
    let user = await this.getUserByOAuthId(provider, providerId);

    if (user) {
      // Update user info if needed
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (profile.avatarUrl && !user.avatarUrl) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        updateValues.push(profile.avatarUrl);
      }

      if (profile.firstName && !user.firstName) {
        updateFields.push(`first_name = $${paramIndex++}`);
        updateValues.push(profile.firstName);
      }

      if (profile.lastName && !user.lastName) {
        updateFields.push(`last_name = $${paramIndex++}`);
        updateValues.push(profile.lastName);
      }

      updateFields.push(`last_login_at = NOW()`);
      updateFields.push(`updated_at = NOW()`);

      // Add provider to oauth_providers array if not already there
      updateFields.push(`oauth_providers =
        CASE
          WHEN oauth_providers::jsonb @> $${paramIndex}::jsonb
          THEN oauth_providers
          ELSE oauth_providers::jsonb || $${paramIndex}::jsonb
        END`);
      updateValues.push(JSON.stringify([provider]));
      paramIndex++;

      updateValues.push(user.id);

      if (updateFields.length > 0) {
        await this.query(`
          UPDATE users
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `, updateValues);
      }

      return this.getUserById(user.id);
    }

    // Check if user exists with same email
    user = await this.getUserByEmail(profile.email);

    if (user) {
      // Link OAuth account to existing user
      const column = `${provider}_id`;
      await this.query(`
        UPDATE users
        SET ${column} = $1,
            oauth_providers =
              CASE
                WHEN oauth_providers::jsonb @> $2::jsonb
                THEN oauth_providers
                ELSE oauth_providers::jsonb || $2::jsonb
              END,
            avatar_url = COALESCE(avatar_url, $3),
            last_login_at = NOW(),
            updated_at = NOW()
        WHERE id = $4
      `, [providerId, JSON.stringify([provider]), profile.avatarUrl, user.id]);

      return this.getUserById(user.id);
    }

    // Create new user with OAuth
    const id = uuidv4();
    const username = profile.username ||
                    profile.email.split('@')[0] + '_' + provider + '_' + Date.now();
    const firstName = profile.firstName || profile.name?.split(' ')[0] || '';
    const lastName = profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '';
    const fullName = profile.name || `${firstName} ${lastName}`.trim();
    const column = `${provider}_id`;

    const result = await this.query<any>(`
      INSERT INTO users (
        id, email, username, ${column},
        first_name, last_name, full_name,
        avatar_url, oauth_providers,
        is_active, is_email_verified, last_login_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, NOW())
      RETURNING *
    `, [
      id, profile.email, username, providerId,
      firstName, lastName, fullName,
      profile.avatarUrl, JSON.stringify([provider])
    ]);

    return this.mapUserRow(result.rows[0]);
  }

  async saveOAuthToken(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
    providerData?: any
  ): Promise<void> {
    await this.query(`
      INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at, provider_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        access_token = $3,
        refresh_token = COALESCE($4, oauth_tokens.refresh_token),
        expires_at = $5,
        provider_data = $6,
        updated_at = NOW()
    `, [userId, provider, accessToken, refreshToken, expiresAt, providerData]);
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    await this.query(`
      UPDATE password_resets 
      SET used = true, used_at = NOW() 
      WHERE token = $1
    `, [token]);
  }

  async updateUser(userId: string, updates: Partial<PlatformUser>): Promise<PlatformUser> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (updates.firstName !== undefined) {
      setClause.push(`first_name = $${paramCount++}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      setClause.push(`last_name = $${paramCount++}`);
      values.push(updates.lastName);
    }
    if (updates.fullName !== undefined) {
      setClause.push(`full_name = $${paramCount++}`);
      values.push(updates.fullName);
    }
    if (updates.avatarUrl !== undefined) {
      setClause.push(`avatar_url = $${paramCount++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.bio !== undefined) {
      setClause.push(`bio = $${paramCount++}`);
      values.push(updates.bio);
    }
    if (updates.website !== undefined) {
      setClause.push(`website = $${paramCount++}`);
      values.push(updates.website);
    }
    if (updates.location !== undefined) {
      setClause.push(`location = $${paramCount++}`);
      values.push(updates.location);
    }

    if (setClause.length === 0) {
      return this.getUserById(userId);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await this.query<PlatformUser>(`
      UPDATE users
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return this.mapUserRow(result.rows[0]);
  }

  async createAuditLog(data: {
    userId?: string;
    organizationId?: string;
    projectId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const id = uuidv4();

    const result = await this.query<AuditLog>(`
      INSERT INTO audit_logs (
        id, user_id, organization_id, project_id,
        action, resource_type, resource_id, details,
        ip_address, user_agent, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
      )
      RETURNING *
    `, [
      id,
      data.userId || null,
      data.organizationId || null,
      data.projectId || null,
      data.action,
      data.resourceType,
      data.resourceId || null,
      JSON.stringify(data.details || {}),
      data.ipAddress || null,
      data.userAgent || null
    ]);

    return result.rows[0];
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const result = await this.query<any>(`
      SELECT o.* 
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1 AND o.is_active = true
      ORDER BY o.created_at DESC
    `, [userId]);

    return result.rows.map(row => this.mapOrganizationRow(row));
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await this.query(`
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [userId]);
  }

  // ============= APP IMAGES MANAGEMENT =============

  async findSimilarAppImage(appType: string, entityType: string, purpose: string): Promise<any> {
    // First try exact match
    let result = await this.query<any>(`
      SELECT * FROM app_images 
      WHERE app_type = $1 AND entity_type = $2 AND purpose = $3
      ORDER BY usage_count DESC, created_at DESC
      LIMIT 1
    `, [appType, entityType, purpose]);

    // If no exact match, try similar purpose
    if (result.rows.length === 0) {
      result = await this.query<any>(`
        SELECT * FROM app_images 
        WHERE app_type = $1 AND entity_type = $2 
        AND (purpose ILIKE $3 OR purpose ILIKE '%' || $4 || '%')
        ORDER BY usage_count DESC, created_at DESC
        LIMIT 1
      `, [appType, entityType, `%${purpose}%`, purpose.split('_')[0]]);
    }

    // If still no match, try same entity type in same app type
    if (result.rows.length === 0) {
      result = await this.query<any>(`
        SELECT * FROM app_images 
        WHERE app_type = $1 AND entity_type = $2
        ORDER BY usage_count DESC, created_at DESC
        LIMIT 1
      `, [appType, entityType]);
    }

    if (result.rows.length > 0) {
      // Update usage count
      await this.query(`
        UPDATE app_images 
        SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE id = $1
      `, [result.rows[0].id]);
      
      return result.rows[0];
    }

    return null;
  }

  async saveAppImage(imageData: {
    appType: string;
    entityType: string;
    purpose: string;
    fieldName?: string;
    imageUrl: string;
    s3Key?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    mimeType?: string;
    aiProvider?: string;
    aiModel?: string;
    promptUsed?: string;
    tags?: string[];
    metadata?: any;
  }): Promise<any> {
    const id = uuidv4();
    const result = await this.query<any>(`
      INSERT INTO app_images (
        id, app_type, entity_type, purpose, field_name, image_url, s3_key, 
        thumbnail_url, width, height, size_bytes, mime_type, ai_provider, 
        ai_model, prompt_used, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      id,
      imageData.appType,
      imageData.entityType,
      imageData.purpose,
      imageData.fieldName,
      imageData.imageUrl,
      imageData.s3Key,
      imageData.thumbnailUrl,
      imageData.width,
      imageData.height,
      imageData.sizeBytes,
      imageData.mimeType || 'image/jpeg',
      imageData.aiProvider,
      imageData.aiModel,
      imageData.promptUsed,
      imageData.tags || [],
      JSON.stringify(imageData.metadata || {})
    ]);

    return result.rows[0];
  }

  async getAppImagesByType(appType: string, entityType?: string): Promise<any[]> {
    let query = `SELECT * FROM app_images WHERE app_type = $1`;
    const params: any[] = [appType];
    
    if (entityType) {
      query += ` AND entity_type = $2`;
      params.push(entityType);
    }
    
    query += ` ORDER BY usage_count DESC, created_at DESC`;
    
    const result = await this.query<any>(query, params);
    return result.rows;
  }

  // Organization member lookup methods
  async findOrganizationMember(userId: string, organizationId: string): Promise<any> {
    const result = await this.query<any>(`
      SELECT 
        om.id,
        om.organization_id,
        om.user_id,
        om.role,
        om.joined_at
      FROM organization_members om
      WHERE om.user_id = $1 AND om.organization_id = $2
    `, [userId, organizationId]);
    
    return result.rows[0] || null;
  }

  async findFirstOrganizationMemberByUser(userId: string): Promise<any> {
    const result = await this.query<any>(`
      SELECT 
        om.id,
        om.organization_id,
        om.user_id,
        om.role,
        om.joined_at,
        o.name as organization_name,
        o.slug as organization_slug
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = $1
      ORDER BY om.joined_at ASC
      LIMIT 1
    `, [userId]);
    
    const row = result.rows[0];
    if (!row) return null;
    
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      organization: {
        id: row.organization_id,
        name: row.organization_name,
        slug: row.organization_slug
      }
    };
  }

  // Usage records methods
  async getUsageRecordsByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = `
      SELECT
        record_type as resource_type,
        SUM(quantity) as total_quantity,
        COUNT(*) as record_count
      FROM usage_records
      WHERE organization_id = $1
    `;
    const params = [organizationId];

    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate.toISOString());
    }

    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate.toISOString());
    }

    query += ` GROUP BY record_type ORDER BY record_type`;

    const result = await this.query<any>(query, params);
    return result.rows.map(row => ({
      resourceType: row.resource_type,
      _sum: {
        quantity: parseInt(row.total_quantity) || 0
      }
    }));
  }

  // ============================================
  // TENANT PAYMENT CONFIG METHODS
  // ============================================

  /**
   * Create tenant payment configuration
   */
  async createTenantPaymentConfig(data: {
    organizationId: string;
    projectId?: string;
    appId?: string;
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalWebhookId?: string;
    paypalMode?: string;
    applePayEnabled?: boolean;
    applePayMerchantId?: string;
    applePayDisplayName?: string;
    googlePayEnabled?: boolean;
    googlePayMerchantId?: string;
    googlePayMerchantName?: string;
    enabledProviders?: string[];
    priceIds: string[];
    isActive: boolean;
  }): Promise<any> {
    const id = uuidv4();

    const result = await this.query<any>(`
      INSERT INTO tenant_payment_configs (
        id, organization_id, project_id, app_id,
        stripe_publishable_key, stripe_secret_key, stripe_webhook_secret,
        paypal_client_id, paypal_client_secret, paypal_webhook_id, paypal_mode,
        apple_pay_enabled, apple_pay_merchant_id, apple_pay_display_name,
        google_pay_enabled, google_pay_merchant_id, google_pay_merchant_name,
        enabled_providers, price_ids, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
      )
      RETURNING *
    `, [
      id,
      data.organizationId,
      data.projectId || null,
      data.appId || null,
      data.stripePublishableKey || null,
      data.stripeSecretKey || null,
      data.stripeWebhookSecret || null,
      data.paypalClientId || null,
      data.paypalClientSecret || null,
      data.paypalWebhookId || null,
      data.paypalMode || 'sandbox',
      data.applePayEnabled || false,
      data.applePayMerchantId || null,
      data.applePayDisplayName || null,
      data.googlePayEnabled || false,
      data.googlePayMerchantId || null,
      data.googlePayMerchantName || null,
      JSON.stringify(data.enabledProviders || ['stripe']),
      JSON.stringify(data.priceIds || []),
      data.isActive,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      appId: row.app_id,
      stripePublishableKey: row.stripe_publishable_key,
      stripeSecretKey: row.stripe_secret_key,
      stripeWebhookSecret: row.stripe_webhook_secret,
      paypalClientId: row.paypal_client_id,
      paypalClientSecret: row.paypal_client_secret,
      paypalWebhookId: row.paypal_webhook_id,
      paypalMode: row.paypal_mode,
      applePayEnabled: row.apple_pay_enabled,
      applePayMerchantId: row.apple_pay_merchant_id,
      applePayDisplayName: row.apple_pay_display_name,
      googlePayEnabled: row.google_pay_enabled,
      googlePayMerchantId: row.google_pay_merchant_id,
      googlePayMerchantName: row.google_pay_merchant_name,
      enabledProviders: Array.isArray(row.enabled_providers) ? row.enabled_providers : (typeof row.enabled_providers === 'string' ? JSON.parse(row.enabled_providers) : ['stripe']),
      priceIds: Array.isArray(row.price_ids) ? row.price_ids : (typeof row.price_ids === 'string' ? JSON.parse(row.price_ids) : []),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get tenant payment configuration with fallback hierarchy
   * Priority: app-level > project-level > org-level
   */
  async getTenantPaymentConfig(
    organizationId: string,
    projectId?: string,
    appId?: string,
  ): Promise<any> {
    // Build query with fallback hierarchy using CASE for ordering
    let query = `
      SELECT * FROM tenant_payment_configs
      WHERE organization_id = $1
    `;
    const params = [organizationId];

    // If projectId provided, allow either exact match or NULL (fallback to org-level)
    if (projectId) {
      query += ` AND (project_id = $${params.length + 1} OR project_id IS NULL)`;
      params.push(projectId);
    } else {
      query += ` AND project_id IS NULL`;
    }

    // If appId provided, allow either exact match or NULL (fallback to project-level)
    if (appId) {
      query += ` AND (app_id = $${params.length + 1} OR app_id IS NULL)`;
      params.push(appId);
    } else {
      query += ` AND app_id IS NULL`;
    }

    // Order by specificity: most specific (app-level) first, then project-level, then org-level
    query += `
      ORDER BY
        CASE WHEN app_id IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN project_id IS NOT NULL THEN 1 ELSE 2 END
      LIMIT 1
    `;

    const result = await this.query<any>(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      appId: row.app_id,
      stripePublishableKey: row.stripe_publishable_key,
      stripeSecretKey: row.stripe_secret_key, // ✅ Return actual key (needed for Stripe client)
      stripeWebhookSecret: row.stripe_webhook_secret, // ✅ Return actual secret (needed for webhook verification)
      paypalClientId: row.paypal_client_id,
      paypalClientSecret: row.paypal_client_secret, // ✅ Return actual secret (needed for PayPal client)
      paypalWebhookId: row.paypal_webhook_id,
      paypalMode: row.paypal_mode,
      applePayEnabled: row.apple_pay_enabled,
      applePayMerchantId: row.apple_pay_merchant_id,
      applePayDisplayName: row.apple_pay_display_name,
      googlePayEnabled: row.google_pay_enabled,
      googlePayMerchantId: row.google_pay_merchant_id,
      googlePayMerchantName: row.google_pay_merchant_name,
      enabledProviders: Array.isArray(row.enabled_providers) ? row.enabled_providers : (typeof row.enabled_providers === 'string' ? JSON.parse(row.enabled_providers) : ['stripe']),
      priceIds: Array.isArray(row.price_ids) ? row.price_ids : (typeof row.price_ids === 'string' ? JSON.parse(row.price_ids) : []),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update tenant payment configuration
   */
  async updateTenantPaymentConfig(id: string, data: Partial<{
    stripePublishableKey: string;
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    paypalClientId: string;
    paypalClientSecret: string;
    paypalWebhookId: string;
    paypalMode: string;
    applePayEnabled: boolean;
    applePayMerchantId: string;
    applePayDisplayName: string;
    googlePayEnabled: boolean;
    googlePayMerchantId: string;
    googlePayMerchantName: string;
    enabledProviders: string[];
    priceIds: string[];
    isActive: boolean;
  }>): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.stripePublishableKey !== undefined) {
      updates.push(`stripe_publishable_key = $${paramCount++}`);
      values.push(data.stripePublishableKey);
    }

    if (data.stripeSecretKey !== undefined) {
      updates.push(`stripe_secret_key = $${paramCount++}`);
      values.push(data.stripeSecretKey);
    }

    if (data.stripeWebhookSecret !== undefined) {
      updates.push(`stripe_webhook_secret = $${paramCount++}`);
      values.push(data.stripeWebhookSecret);
    }

    if (data.paypalClientId !== undefined) {
      updates.push(`paypal_client_id = $${paramCount++}`);
      values.push(data.paypalClientId);
    }

    if (data.paypalClientSecret !== undefined) {
      updates.push(`paypal_client_secret = $${paramCount++}`);
      values.push(data.paypalClientSecret);
    }

    if (data.paypalWebhookId !== undefined) {
      updates.push(`paypal_webhook_id = $${paramCount++}`);
      values.push(data.paypalWebhookId);
    }

    if (data.paypalMode !== undefined) {
      updates.push(`paypal_mode = $${paramCount++}`);
      values.push(data.paypalMode);
    }

    if (data.applePayEnabled !== undefined) {
      updates.push(`apple_pay_enabled = $${paramCount++}`);
      values.push(data.applePayEnabled);
    }

    if (data.applePayMerchantId !== undefined) {
      updates.push(`apple_pay_merchant_id = $${paramCount++}`);
      values.push(data.applePayMerchantId);
    }

    if (data.applePayDisplayName !== undefined) {
      updates.push(`apple_pay_display_name = $${paramCount++}`);
      values.push(data.applePayDisplayName);
    }

    if (data.googlePayEnabled !== undefined) {
      updates.push(`google_pay_enabled = $${paramCount++}`);
      values.push(data.googlePayEnabled);
    }

    if (data.googlePayMerchantId !== undefined) {
      updates.push(`google_pay_merchant_id = $${paramCount++}`);
      values.push(data.googlePayMerchantId);
    }

    if (data.googlePayMerchantName !== undefined) {
      updates.push(`google_pay_merchant_name = $${paramCount++}`);
      values.push(data.googlePayMerchantName);
    }

    if (data.enabledProviders !== undefined) {
      updates.push(`enabled_providers = $${paramCount++}`);
      values.push(JSON.stringify(data.enabledProviders));
    }

    if (data.priceIds !== undefined) {
      updates.push(`price_ids = $${paramCount++}`);
      values.push(JSON.stringify(data.priceIds));
    }

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tenant_payment_configs
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.query<any>(query, values);

    if (result.rows.length === 0) {
      throw new Error('Payment config not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      appId: row.app_id,
      stripePublishableKey: row.stripe_publishable_key,
      stripeSecretKey: row.stripe_secret_key,
      stripeWebhookSecret: row.stripe_webhook_secret,
      paypalClientId: row.paypal_client_id,
      paypalClientSecret: row.paypal_client_secret,
      paypalWebhookId: row.paypal_webhook_id,
      paypalMode: row.paypal_mode,
      applePayEnabled: row.apple_pay_enabled,
      applePayMerchantId: row.apple_pay_merchant_id,
      applePayDisplayName: row.apple_pay_display_name,
      googlePayEnabled: row.google_pay_enabled,
      googlePayMerchantId: row.google_pay_merchant_id,
      googlePayMerchantName: row.google_pay_merchant_name,
      enabledProviders: Array.isArray(row.enabled_providers) ? row.enabled_providers : (typeof row.enabled_providers === 'string' ? JSON.parse(row.enabled_providers) : ['stripe']),
      priceIds: Array.isArray(row.price_ids) ? row.price_ids : (typeof row.price_ids === 'string' ? JSON.parse(row.price_ids) : []),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Delete tenant payment configuration
   */
  async deleteTenantPaymentConfig(id: string): Promise<void> {
    await this.query(`
      DELETE FROM tenant_payment_configs
      WHERE id = $1
    `, [id]);
  }

  // ============================================
  // TENANT SUBSCRIPTION METHODS
  // ============================================

  /**
   * Create tenant subscription
   */
  async createTenantSubscription(data: {
    organizationId: string;
    projectId?: string;
    appId?: string;
    userId?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    status: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const id = uuidv4();

    // Safely serialize metadata, filtering out any non-serializable values
    let metadataJson = '{}';
    try {
      const cleanMetadata = data.metadata || {};
      // Create a clean object with only string values
      const sanitizedMetadata: Record<string, string> = {};
      for (const [key, value] of Object.entries(cleanMetadata)) {
        if (value !== null && value !== undefined) {
          sanitizedMetadata[key] = String(value);
        }
      }
      metadataJson = JSON.stringify(sanitizedMetadata);
    } catch (error) {
      console.error('Failed to serialize metadata, using empty object:', error);
    }

    const result = await this.query<any>(`
      INSERT INTO tenant_subscriptions (
        id, organization_id, project_id, app_id, user_id,
        stripe_customer_id, stripe_subscription_id, stripe_price_id,
        status, current_period_start, current_period_end,
        cancel_at_period_end, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      )
      RETURNING *
    `, [
      id,
      data.organizationId,
      data.projectId || null,
      data.appId || null,
      data.userId || null,
      data.stripeCustomerId || null,
      data.stripeSubscriptionId || null,
      data.stripePriceId || null,
      data.status,
      data.currentPeriodStart || null,
      data.currentPeriodEnd || null,
      data.cancelAtPeriodEnd || false,
      metadataJson,
    ]);

    return this.mapTenantSubscriptionRow(result.rows[0]);
  }

  /**
   * Get tenant subscriptions
   */
  async getTenantSubscriptions(
    organizationId: string,
    projectId?: string,
    appId?: string,
  ): Promise<any[]> {
    let query = `
      SELECT * FROM tenant_subscriptions
      WHERE organization_id = $1
    `;
    const params = [organizationId];

    if (projectId) {
      query += ` AND project_id = $${params.length + 1}`;
      params.push(projectId);
    }

    if (appId) {
      query += ` AND app_id = $${params.length + 1}`;
      params.push(appId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.query<any>(query, params);
    return result.rows.map(row => this.mapTenantSubscriptionRow(row));
  }

  /**
   * Get tenant subscription by ID
   */
  async getTenantSubscriptionById(id: string): Promise<any> {
    const result = await this.query<any>(`
      SELECT * FROM tenant_subscriptions
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTenantSubscriptionRow(result.rows[0]);
  }

  /**
   * Get tenant subscription by Stripe subscription ID
   */
  async getTenantSubscriptionByStripeId(stripeSubscriptionId: string): Promise<any> {
    const result = await this.query<any>(`
      SELECT * FROM tenant_subscriptions
      WHERE stripe_subscription_id = $1
    `, [stripeSubscriptionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTenantSubscriptionRow(result.rows[0]);
  }

  /**
   * Get tenant subscription by user ID
   */
  async getTenantSubscriptionByUser(
    organizationId: string,
    userId: string,
    projectId?: string,
    appId?: string,
  ): Promise<any> {
    let query = `
      SELECT * FROM tenant_subscriptions
      WHERE organization_id = $1 AND user_id = $2
    `;
    const params = [organizationId, userId];

    if (projectId) {
      query += ` AND project_id = $${params.length + 1}`;
      params.push(projectId);
    }

    if (appId) {
      query += ` AND app_id = $${params.length + 1}`;
      params.push(appId);
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const result = await this.query<any>(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTenantSubscriptionRow(result.rows[0]);
  }

  /**
   * Update tenant subscription
   */
  async updateTenantSubscription(id: string, data: Partial<{
    status: string;
    stripePriceId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    metadata: Record<string, any>;
  }>): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.stripePriceId !== undefined) {
      updates.push(`stripe_price_id = $${paramCount++}`);
      values.push(data.stripePriceId);
    }

    if (data.currentPeriodStart !== undefined) {
      updates.push(`current_period_start = $${paramCount++}`);
      values.push(data.currentPeriodStart);
    }

    if (data.currentPeriodEnd !== undefined) {
      updates.push(`current_period_end = $${paramCount++}`);
      values.push(data.currentPeriodEnd);
    }

    if (data.cancelAtPeriodEnd !== undefined) {
      updates.push(`cancel_at_period_end = $${paramCount++}`);
      values.push(data.cancelAtPeriodEnd);
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tenant_subscriptions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.query<any>(query, values);

    if (result.rows.length === 0) {
      throw new Error('Subscription not found');
    }

    return this.mapTenantSubscriptionRow(result.rows[0]);
  }

  /**
   * Delete tenant subscription
   */
  async deleteTenantSubscription(id: string): Promise<void> {
    await this.query(`
      DELETE FROM tenant_subscriptions
      WHERE id = $1
    `, [id]);
  }

  /**
   * Map tenant subscription row to object
   */
  private mapTenantSubscriptionRow(row: any): any {
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      appId: row.app_id,
      userId: row.user_id,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripePriceId: row.stripe_price_id,
      plan: row.plan,
      interval: row.interval,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}