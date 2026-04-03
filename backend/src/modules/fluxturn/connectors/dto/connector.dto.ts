import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsObject, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConnectorConfigDto {
  @ApiProperty({ 
    example: 'stripe-payment-processor', 
    description: 'Unique name for this connector configuration within the context (project/app/workflow)' 
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 'stripe', 
    description: 'Type of connector (must match available connector types)' 
  })
  @IsNotEmpty()
  @IsString()
  connector_type: string;

  @ApiProperty({
    example: {
      api_key: 'sk_test_51234567890',
      webhook_secret: 'whsec_1234567890',
      webhook_endpoint: 'https://api.example.com/webhooks/stripe'
    },
    description: 'Configuration parameters for the connector (will be encrypted)'
  })
  @IsNotEmpty()
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      client_id: 'google_client_id',
      client_secret: 'google_client_secret',
      redirect_uri: 'https://app.example.com/oauth/callback'
    },
    description: 'Authentication credentials for the connector (will be encrypted)'
  })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the connector should be enabled immediately',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    example: '8d78a289-c5c3-45be-afaa-291153529cc6',
    description: 'Optional user/owner ID for the connector (e.g., workspace ID from external apps)'
  })
  @IsOptional()
  @IsString()
  user_id?: string;
}

export class UpdateConnectorConfigDto {
  @ApiPropertyOptional({ 
    example: 'stripe-payment-processor-updated', 
    description: 'Updated name for the connector configuration' 
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: {
      api_key: 'sk_live_51234567890',
      webhook_secret: 'whsec_0987654321'
    },
    description: 'Updated configuration parameters (will be encrypted)'
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      client_id: 'updated_client_id',
      client_secret: 'updated_client_secret'
    },
    description: 'Updated authentication credentials (will be encrypted)'
  })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to enable or disable the connector'
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class TestConnectorDto {
  @ApiPropertyOptional({ 
    example: 'test_connection', 
    description: 'Specific test action to perform (defaults to basic connection test)' 
  })
  @IsOptional()
  @IsString()
  test_action?: string;

  @ApiPropertyOptional({ 
    example: { amount: 1, currency: 'USD' }, 
    description: 'Test parameters for the action' 
  })
  @IsOptional()
  @IsObject()
  test_params?: Record<string, any>;

  @ApiPropertyOptional({ 
    example: 30000, 
    description: 'Timeout for the test in milliseconds (default: 30000)' 
  })
  @IsOptional()
  timeout?: number;
}

export class ConnectorActionDto {
  @ApiProperty({ 
    example: 'send_payment', 
    description: 'Action to execute on the connector' 
  })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiProperty({ 
    example: { amount: 1000, currency: 'USD', customer_id: 'cus_123' }, 
    description: 'Parameters for the action' 
  })
  @IsNotEmpty()
  @IsObject()
  parameters: Record<string, any>;

  @ApiPropertyOptional({ 
    example: 60000, 
    description: 'Timeout for the action in milliseconds (default: 60000)' 
  })
  @IsOptional()
  timeout?: number;
}

export class ConnectorListQueryDto {
  @ApiPropertyOptional({ 
    example: 'stripe', 
    description: 'Filter by connector type' 
  })
  @IsOptional()
  @IsString()
  connector_type?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by enabled status' 
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ 
    example: 'active', 
    description: 'Filter by status' 
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'error', 'pending'])
  status?: 'active' | 'inactive' | 'error' | 'pending';

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of results per page (default: 20, max: 100)' 
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Number of results to skip (for pagination)' 
  })
  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ 
    example: 'name', 
    description: 'Field to sort by (name, created_at, updated_at)' 
  })
  @IsOptional()
  @IsEnum(['name', 'created_at', 'updated_at', 'connector_type'])
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'connector_type';

  @ApiPropertyOptional({ 
    example: 'asc', 
    description: 'Sort order' 
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';
}

export class ConnectorUsageQueryDto {
  @ApiPropertyOptional({ 
    example: '2024-01-01T00:00:00Z', 
    description: 'Start date for usage statistics' 
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-31T23:59:59Z', 
    description: 'End date for usage statistics' 
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ 
    example: 'send_payment', 
    description: 'Filter by specific action' 
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ 
    example: 'success', 
    description: 'Filter by execution status' 
  })
  @IsOptional()
  @IsEnum(['success', 'error', 'timeout'])
  status?: 'success' | 'error' | 'timeout';

  @ApiPropertyOptional({ 
    example: 50, 
    description: 'Number of results per page (default: 50, max: 200)' 
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Number of results to skip (for pagination)' 
  })
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}

export class OAuthCallbackDto {
  @ApiProperty({
    example: 'abc123def456',
    description: 'Authorization code from OAuth provider'
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    example: 'random-state-string',
    description: 'State parameter for CSRF protection'
  })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiPropertyOptional({
    example: 'read,write',
    description: 'Granted scopes (if provided by OAuth provider)'
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    description: 'PKCE code verifier (required for Twitter OAuth 2.0)'
  })
  @IsOptional()
  @IsString()
  code_verifier?: string;
}

export class ConnectorWebhookDto {
  @ApiProperty({ 
    example: 'stripe', 
    description: 'Connector type that sent the webhook' 
  })
  @IsNotEmpty()
  @IsString()
  connector_type: string;

  @ApiProperty({ 
    example: { type: 'payment.succeeded', data: { object: 'payment_intent' } }, 
    description: 'Webhook payload from the connector' 
  })
  @IsNotEmpty()
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ 
    example: { 'stripe-signature': 't=1234567890,v1=abc123def456' }, 
    description: 'Headers from the webhook request (for signature verification)' 
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

// Response DTOs
export class ConnectorTestResultDto {
  @ApiProperty({ example: true, description: 'Whether the test was successful' })
  success: boolean;

  @ApiProperty({ example: 'Connection successful', description: 'Test result message', required: false })
  message?: string;

  @ApiProperty({
    example: { message: 'Invalid API key', code: 'INVALID_CREDENTIALS', details: '...' },
    description: 'Error details when success is false',
    required: false
  })
  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  @ApiProperty({ example: 150, description: 'Test latency in milliseconds' })
  latency_ms?: number;

  @ApiProperty({ example: { connector_type: 'stripe', tested_at: '2024-01-01T12:00:00Z' }, description: 'Additional test details' })
  details?: Record<string, any>;

  @ApiProperty({ example: 1500, description: 'Test duration in milliseconds' })
  duration_ms: number;

  @ApiProperty({ example: '2024-01-01T12:00:00Z', description: 'When the test was performed' })
  tested_at: string;
}

export class ConnectorActionResultDto {
  @ApiProperty({ example: true, description: 'Whether the action was successful' })
  success: boolean;

  @ApiProperty({ example: { payment_id: 'pi_123', status: 'succeeded' }, description: 'Response data from the action' })
  data?: Record<string, any>;

  @ApiProperty({ example: 'Payment processed successfully', description: 'Action result message' })
  message?: string;

  @ApiProperty({ 
    example: { 
      message: 'Invalid API key', 
      code: 'AUTH_ERROR', 
      details: {} 
    }, 
    description: 'Error information if the action failed' 
  })
  error?: {
    message: string;
    code?: string;
    details?: Record<string, any>;
  };

  @ApiProperty({ example: { connector_type: 'stripe', execution_time_ms: 150 }, description: 'Metadata about the action execution' })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2024-01-01T12:00:00Z', description: 'When the action was executed' })
  executed_at: string;

  @ApiProperty({ example: 2500, description: 'Action duration in milliseconds' })
  duration_ms: number;
}

export class ConnectorUsageStatsDto {
  @ApiProperty({ example: 150, description: 'Total number of executions' })
  total_executions: number;

  @ApiProperty({ example: 145, description: 'Number of successful executions' })
  successful_executions: number;

  @ApiProperty({ example: 5, description: 'Number of failed executions' })
  failed_executions: number;

  @ApiProperty({ example: 96.7, description: 'Success rate percentage' })
  success_rate: number;

  @ApiProperty({ example: 1250, description: 'Average execution time in milliseconds' })
  avg_execution_time_ms: number;

  @ApiProperty({ example: 100, description: 'Minimum execution time in milliseconds' })
  min_execution_time_ms: number;

  @ApiProperty({ example: 5000, description: 'Maximum execution time in milliseconds' })
  max_execution_time_ms: number;

  @ApiProperty({ example: 5, description: 'Number of unique actions' })
  unique_actions: number;

  @ApiProperty({ example: 30, description: 'Number of active days' })
  active_days: number;

  @ApiProperty({ 
    example: { 
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-31T23:59:59Z'
    },
    description: 'Time period for statistics'
  })
  period?: {
    start_date?: string;
    end_date?: string;
  };

  @ApiProperty({ example: '2024-01-01T12:00:00Z', description: 'Last action execution time' })
  last_used_at?: string;

  @ApiProperty({ 
    example: { 
      'send_payment': 100, 
      'refund_payment': 30, 
      'create_customer': 20 
    }, 
    description: 'Breakdown by action type' 
  })
  actions_by_type: Record<string, number>;
}