/**
 * Workflow System Type Definitions
 * Core types for workflow configuration, execution, and management
 */

// ============================================
// CORE WORKFLOW TYPES
// ============================================

export type WorkflowType = 
  | 'email-management'
  | 'lead-qualification'
  | 'customer-support'
  | 'content-pipeline'
  | 'order-fulfillment'
  | 'expense-management'
  | 'recruitment-pipeline'
  | 'data-pipeline'
  | 'social-automation'
  | 'inventory-management'
  | 'invoice-processing'
  | 'survey-analysis'
  | 'competitor-monitoring'
  | 'custom';

export type WorkflowComplexity = 'simple' | 'medium' | 'complex' | 'advanced';

export type WorkflowStatus = 
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'scheduled';

// ============================================
// TRIGGER TYPES
// ============================================

export interface WorkflowTrigger {
  type: TriggerType;
  source?: string;
  event?: string;
  filter?: any;
  cron?: string;
  webhook?: string;
  conditions?: TriggerCondition[];
}

export type TriggerType = 
  | 'webhook'
  | 'schedule'
  | 'email'
  | 'form_submission'
  | 'database'
  | 'api'
  | 'manual'
  | 'social_mention'
  | 'file_upload'
  | 'payment'
  | 'event';

export interface TriggerCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
}

// ============================================
// WORKFLOW STEPS
// ============================================

export interface WorkflowStep {
  id: string;
  connector: string;
  action: string;
  input?: any;
  params?: Record<string, any>;
  condition?: string;
  onError?: ErrorHandling;
  retry?: RetryConfig;
  timeout?: number;
  parallel?: boolean;
  loop?: LoopConfig;
}

export type ErrorHandling = 'stop' | 'continue' | 'retry' | 'fallback';

export interface RetryConfig {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  delay: number;
}

export interface LoopConfig {
  type: 'for' | 'while' | 'foreach';
  condition?: string;
  items?: string;
  maxIterations?: number;
}

// ============================================
// CONDITIONS & LOGIC
// ============================================

export interface WorkflowCondition {
  id: string;
  expression: string;
  description?: string;
}

export type ComparisonOperator = 
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'in'
  | 'not_in';

export type LogicalOperator = 'AND' | 'OR' | 'NOT' | 'XOR';

export interface ConditionalBranch {
  condition: string;
  steps: WorkflowStep[];
  else?: WorkflowStep[];
}

// ============================================
// ACTIONS & OPERATIONS
// ============================================

export interface WorkflowAction {
  type: ActionType;
  connector: string;
  method: string;
  params: Record<string, any>;
  mapping?: DataMapping;
  transform?: DataTransform;
}

export type ActionType = 
  | 'fetch'
  | 'create'
  | 'update'
  | 'delete'
  | 'send'
  | 'transform'
  | 'calculate'
  | 'validate'
  | 'approve'
  | 'notify';

export interface DataMapping {
  source: string;
  target: string;
  transform?: string;
}

export interface DataTransform {
  type: TransformType;
  config: Record<string, any>;
}

export type TransformType = 
  | 'map'
  | 'filter'
  | 'reduce'
  | 'sort'
  | 'group'
  | 'aggregate'
  | 'pivot'
  | 'flatten'
  | 'merge'
  | 'split';

// ============================================
// CONNECTOR CONFIGURATION
// ============================================

export interface ConnectorConfig {
  id: string;
  type: string;
  name: string;
  category: ConnectorCategory;
  credentials?: Record<string, any>;
  endpoints?: Record<string, EndpointConfig>;
  rateLimit?: RateLimitConfig;
  retry?: RetryConfig;
}

export type ConnectorCategory = 
  | 'ai'
  | 'analytics'
  | 'communication'
  | 'crm'
  | 'development'
  | 'ecommerce'
  | 'finance'
  | 'forms'
  | 'marketing'
  | 'project-management'
  | 'social'
  | 'storage'
  | 'support'
  | 'video'
  | 'custom';

export interface EndpointConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: 'basic' | 'bearer' | 'oauth2' | 'api_key' | 'custom';
  config: Record<string, any>;
}

export interface RateLimitConfig {
  requests: number;
  period: number; // in seconds
  burst?: number;
}

// ============================================
// DATA TYPES
// ============================================

export interface WorkflowData {
  input: Record<string, any>;
  output: Record<string, any>;
  context: Record<string, any>;
  errors: WorkflowError[];
  metrics: WorkflowMetrics;
}

export interface WorkflowError {
  step: string;
  error: string;
  timestamp: Date;
  retry?: number;
}

export interface WorkflowMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  stepsExecuted: number;
  stepsSucceeded: number;
  stepsFailed: number;
  retries: number;
}

// ============================================
// EXECUTION CONTEXT
// ============================================

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  projectId: string;
  environment: 'development' | 'staging' | 'production';
  variables: Record<string, any>;
  secrets: Record<string, any>;
  state: WorkflowState;
}

export interface WorkflowState {
  currentStep: string;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  data: Record<string, any>;
  checkpoints: Checkpoint[];
}

export interface Checkpoint {
  stepId: string;
  timestamp: Date;
  data: Record<string, any>;
}

// ============================================
// PERMISSIONS & SECURITY
// ============================================

export interface WorkflowPermissions {
  read: string[];
  write: string[];
  execute: string[];
  delete: string[];
  share: string[];
}

export interface SecurityConfig {
  encryption: boolean;
  audit: boolean;
  compliance: ComplianceStandard[];
  dataRetention: number; // days
  pii_handling: PIIHandling;
}

export type ComplianceStandard = 'GDPR' | 'HIPAA' | 'SOC2' | 'PCI-DSS' | 'ISO27001';

export interface PIIHandling {
  detection: boolean;
  masking: boolean;
  encryption: boolean;
  fields: string[];
}

// ============================================
// MONITORING & ANALYTICS
// ============================================

export interface WorkflowMonitoring {
  alerts: AlertConfig[];
  metrics: MetricConfig[];
  logs: LogConfig;
  tracing: boolean;
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: AlertChannel[];
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
}

export interface MetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels: string[];
}

export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention: number; // days
  format: 'json' | 'text';
}

// ============================================
// WORKFLOW RESULTS
// ============================================

export interface WorkflowResult {
  executionId: string;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  input: any;
  output: any;
  steps: StepResult[];
  errors: WorkflowError[];
  metrics: WorkflowMetrics;
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input: any;
  output: any;
  error?: string;
  retries?: number;
}

// ============================================
// WORKFLOW DEFINITIONS
// ============================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  type: WorkflowType;
  complexity: WorkflowComplexity;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  variables: WorkflowVariable[];
  outputs: WorkflowOutput[];
  permissions: WorkflowPermissions;
  security: SecurityConfig;
  monitoring: WorkflowMonitoring;
  metadata: WorkflowMetadata;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  description?: string;
  validation?: string;
}

export interface WorkflowOutput {
  name: string;
  type: string;
  mapping: string;
  description?: string;
}

export interface WorkflowMetadata {
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  tags: string[];
  category: string;
  industry?: string;
  useCases: string[];
  documentation?: string;
}

// ============================================
// WORKFLOW TEMPLATES
// ============================================

export interface WorkflowTemplateLibrary {
  templates: WorkflowTemplate[];
  categories: TemplateCategory[];
  industries: Industry[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry?: string;
  complexity: WorkflowComplexity;
  estimatedTime: number; // minutes
  requiredConnectors: string[];
  optionalConnectors: string[];
  variables: WorkflowVariable[];
  preview: WorkflowPreview;
  examples: string[];
  documentation: string;
}

export interface WorkflowPreview {
  steps: number;
  triggers: string[];
  outputs: string[];
  thumbnail?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: string[];
}

export interface Industry {
  id: string;
  name: string;
  templates: string[];
}

// ============================================
// WORKFLOW BUILDER
// ============================================

export interface BuilderConfig {
  allowedConnectors: string[];
  maxSteps: number;
  maxComplexity: WorkflowComplexity;
  features: BuilderFeature[];
}

export interface BuilderFeature {
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

// ============================================
// EXPORTS
// ============================================

// Export all types - they're already exported inline above
// No need for default export of types as they don't exist at runtime