-- =============================================================================
-- FLUXTURN DATABASE SCHEMA
-- =============================================================================
-- This schema contains only the tables necessary for Fluxturn workflow automation.
-- Total: 27 tables
--
-- Categories:
-- - Core Platform (14 tables): users, auth, organizations, projects, apps
-- - Workflow Automation (9 tables): workflows, connectors, executions
-- - Supporting (4 tables): job_queue, email_templates, email_logs, file_metadata
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SECTION 1: CORE PLATFORM TABLES (13 tables)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
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
  oauth_providers JSONB DEFAULT '[]'::jsonb,
  github_id VARCHAR(255) UNIQUE,
  google_id VARCHAR(255) UNIQUE,
  facebook_id VARCHAR(255) UNIQUE,
  twitter_id VARCHAR(255) UNIQUE,
  apple_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- -----------------------------------------------------------------------------
-- 2. OAUTH_TOKENS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);

-- -----------------------------------------------------------------------------
-- 3. OAUTH_TEMP_DATA TABLE (for PKCE flow)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_temp_data (
  state VARCHAR(255) PRIMARY KEY,
  code_verifier VARCHAR(255),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_temp_data_created_at ON oauth_temp_data(created_at);

-- -----------------------------------------------------------------------------
-- 4. ORGANIZATIONS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

-- -----------------------------------------------------------------------------
-- 5. ORGANIZATION_MEMBERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- -----------------------------------------------------------------------------
-- 6. ORGANIZATION_INVITATIONS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);

-- -----------------------------------------------------------------------------
-- 7. PROJECTS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_database_name ON projects(database_name);

-- -----------------------------------------------------------------------------
-- 8. APPS TABLE (required for code dependencies)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  database_name VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  type VARCHAR(100) NOT NULL,
  framework VARCHAR(100),
  frameworks JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'pending',
  deployment_url TEXT,
  repository_url TEXT,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  deployment_status VARCHAR(50) DEFAULT 'not_deployed',
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  container_ids JSONB DEFAULT '[]',
  resource_usage JSONB DEFAULT '{}',
  deployment_config JSONB DEFAULT '{}',
  deployment_server VARCHAR(255),
  backend_url TEXT,
  frontend_url TEXT,
  mobile_url TEXT,
  deployment_error TEXT,
  auto_suspend BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_project_id ON apps(project_id);
CREATE INDEX IF NOT EXISTS idx_apps_organization_id ON apps(organization_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);

-- -----------------------------------------------------------------------------
-- 9. PROJECT_MEMBERS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- -----------------------------------------------------------------------------
-- 9. PROJECT_INVITATIONS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);

-- -----------------------------------------------------------------------------
-- 10. API_KEYS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_app_id ON api_keys(app_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- -----------------------------------------------------------------------------
-- 11. AUDIT_LOGS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 12. EMAIL_VERIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- -----------------------------------------------------------------------------
-- 13. PASSWORD_RESETS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);


-- =============================================================================
-- SECTION 2: WORKFLOW AUTOMATION TABLES (9 tables)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 15. WORKFLOW_TEMPLATES TABLE (created first for FK reference)
-- -----------------------------------------------------------------------------
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
  canvas JSONB DEFAULT '{"nodes":[],"edges":[]}',
  steps JSONB DEFAULT '[]',
  triggers JSONB DEFAULT '[]',
  conditions JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  example_data JSONB,
  documentation TEXT,
  tags TEXT[],
  ai_prompt TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_industry ON workflow_templates(industry);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_use_case ON workflow_templates(use_case);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_featured ON workflow_templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tags ON workflow_templates USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_organization_id ON workflow_templates(organization_id);

-- -----------------------------------------------------------------------------
-- 16. WORKFLOWS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trigger JSONB NOT NULL,
  trigger_type VARCHAR(50) DEFAULT 'manual',
  trigger_config JSONB,
  steps JSONB NOT NULL DEFAULT '[]',
  conditions JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  canvas JSONB DEFAULT '{"nodes":[],"edges":[]}',
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed', 'scheduled')),
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  template_category VARCHAR(100),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
  required_connectors TEXT[],
  is_ai_generated BOOLEAN DEFAULT false,
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

CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_is_template ON workflows(is_template);
CREATE INDEX IF NOT EXISTS idx_workflows_template_category ON workflows(template_category);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_ai_generated_created_at ON workflows(organization_id, is_ai_generated, created_at) WHERE is_ai_generated = true;

-- -----------------------------------------------------------------------------
-- 17. WORKFLOW_EXECUTIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_organization_id ON workflow_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_project_id ON workflow_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

-- -----------------------------------------------------------------------------
-- 18. WORKFLOW_SCHEDULES TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_is_active ON workflow_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run_at ON workflow_schedules(next_run_at);

-- -----------------------------------------------------------------------------
-- 19. CONNECTORS TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_connectors_category ON connectors(category);
CREATE INDEX IF NOT EXISTS idx_connectors_type ON connectors(type);
CREATE INDEX IF NOT EXISTS idx_connectors_status ON connectors(status);
CREATE INDEX IF NOT EXISTS idx_connectors_organization_id ON connectors(organization_id);
CREATE INDEX IF NOT EXISTS idx_connectors_is_public ON connectors(is_public);
CREATE INDEX IF NOT EXISTS idx_connectors_name ON connectors(name);

-- -----------------------------------------------------------------------------
-- 20. CONNECTOR_CONFIGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
  connector_type VARCHAR(100),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB,
  credentials JSONB,
  auth_data JSONB,
  config_data JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'expired')),
  is_active BOOLEAN DEFAULT true,
  is_oauth BOOLEAN DEFAULT false,
  oauth_email VARCHAR(255),
  oauth_expires_at TIMESTAMP WITH TIME ZONE,
  oauth_scope TEXT,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_test_status VARCHAR(50),
  last_test_error TEXT,
  test_status VARCHAR(50),
  test_result JSONB,
  last_refresh_attempt TIMESTAMP WITH TIME ZONE,
  last_refresh_error TEXT,
  refresh_retry_count INTEGER DEFAULT 0,
  refresh_disabled BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_configs_connector_type ON connector_configs(connector_type);
CREATE INDEX IF NOT EXISTS idx_connector_configs_organization_id ON connector_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_connector_configs_project_id ON connector_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_connector_configs_user_id ON connector_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_connector_configs_status ON connector_configs(status);
CREATE INDEX IF NOT EXISTS idx_connector_configs_oauth_expiring ON connector_configs(oauth_expires_at) WHERE is_oauth = true AND status = 'active' AND refresh_disabled = false;

-- -----------------------------------------------------------------------------
-- 21. CONNECTOR_EXECUTION_LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  connector_config_id UUID REFERENCES connector_configs(id) ON DELETE SET NULL,
  workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_connector_id ON connector_execution_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_workflow_execution_id ON connector_execution_logs(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_organization_id ON connector_execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_status ON connector_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_connector_execution_logs_started_at ON connector_execution_logs(started_at DESC);

-- -----------------------------------------------------------------------------
-- 22. NODE_TYPES TABLE
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_node_types_category ON node_types(category);
CREATE INDEX IF NOT EXISTS idx_node_types_is_trigger ON node_types(is_trigger);
CREATE INDEX IF NOT EXISTS idx_node_types_connector_type ON node_types(connector_type);
CREATE INDEX IF NOT EXISTS idx_node_types_is_active ON node_types(is_active);

-- -----------------------------------------------------------------------------
-- 23. CONVERSATIONS TABLE (Fluxturn chat threads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workflow_id ON conversations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);


-- =============================================================================
-- SECTION 3: SUPPORTING TABLES (4 tables)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 24. JOB_QUEUE TABLE
-- -----------------------------------------------------------------------------
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
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_queue_org ON job_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_created ON job_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_queue_queue_name ON job_queue(queue_name);

-- -----------------------------------------------------------------------------
-- 25. EMAIL_TEMPLATES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id VARCHAR(100) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'html' CHECK (type IN ('html', 'text', 'mjml')),
  metadata JSONB DEFAULT '{}',
  is_platform_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_project_id ON email_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_template_id ON email_templates(template_id);

-- -----------------------------------------------------------------------------
-- 26. EMAIL_LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_email_logs_organization_id ON email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_project_id ON email_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 27. FILE_METADATA TABLE
-- -----------------------------------------------------------------------------
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
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_metadata_organization_id ON file_metadata(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_project_id ON file_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id);


-- =============================================================================
-- SECTION 4: FOREIGN KEY ADDITIONS (deferred to avoid circular dependencies)
-- =============================================================================

-- Add foreign key from organizations to users for owner_id
-- (Deferred because users table doesn't exist when organizations is first created)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_organizations_owner'
    AND table_name = 'organizations'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_owner
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;


-- =============================================================================
-- END OF FLUXTURN SCHEMA
-- =============================================================================
