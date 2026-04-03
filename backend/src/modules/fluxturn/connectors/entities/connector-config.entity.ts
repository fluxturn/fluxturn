import { ApiProperty } from '@nestjs/swagger';

export class ConnectorConfig {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Unique connector configuration ID' })
  id: string;

  @ApiProperty({ example: 'stripe-payment-processor', description: 'Unique name for this connector configuration' })
  name: string;

  @ApiProperty({ example: 'stripe', description: 'Type of connector (e.g., stripe, openai, slack)' })
  connector_type: string;

  @ApiProperty({
    example: { api_key: 'sk_test_...', webhook_secret: 'whsec_...' },
    description: 'Encrypted configuration parameters for the connector'
  })
  config: Record<string, any>;

  @ApiProperty({ example: true, description: 'Whether the connector is currently enabled' })
  enabled: boolean;

  @ApiProperty({ example: 'active', description: 'Current status of the connector' })
  status: 'active' | 'inactive' | 'error' | 'pending';

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Last time the connector was tested' })
  last_tested_at?: string;

  @ApiProperty({ example: 'Connection successful', description: 'Result of the last connection test' })
  last_test_result?: string;

  @ApiProperty({ example: { total_calls: 150, last_call_at: '2024-01-01T12:00:00Z' }, description: 'Usage statistics for the connector' })
  usage_stats?: Record<string, any>;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'When the connector configuration was created' })
  created_at: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'When the connector configuration was last updated' })
  updated_at: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User who created this configuration' })
  created_by?: string;

  @ApiProperty({
    example: { display_name: 'Stripe', description: 'Payment processing', category: 'ecommerce', auth_type: 'api_key' },
    description: 'Additional metadata about the connector type'
  })
  metadata?: {
    display_name?: string;
    description?: string;
    category?: string;
    auth_type?: string;
  };

  @ApiProperty({ example: 'user@example.com', description: 'OAuth connected account email' })
  oauth_email?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'OAuth token expiration time' })
  oauth_expires_at?: string;
}

export class ConnectorUsageLog {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Log entry ID' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Connector configuration ID' })
  connector_config_id: string;

  @ApiProperty({ example: 'send_payment', description: 'Action that was performed' })
  action: string;

  @ApiProperty({ example: 'success', description: 'Result of the action' })
  status: 'success' | 'error' | 'timeout';

  @ApiProperty({ example: { amount: 100, currency: 'USD' }, description: 'Request data for the action' })
  request_data?: Record<string, any>;

  @ApiProperty({ example: { payment_id: 'pi_123', status: 'succeeded' }, description: 'Response data from the action' })
  response_data?: Record<string, any>;

  @ApiProperty({ example: 1250, description: 'Execution time in milliseconds' })
  execution_time_ms?: number;

  @ApiProperty({ example: 'Invalid API key', description: 'Error message if the action failed' })
  error_message?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User who executed the action' })
  executed_by?: string;

  @ApiProperty({ example: '2024-01-01T12:00:00Z', description: 'When the action was executed' })
  executed_at: string;
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  icon_url?: string;
  auth_type: string;
  status?: string;
  auth_fields?: Record<string, any>;
  supported_actions?: string[];
  supported_triggers?: string[];
  webhook_support?: boolean;
  rate_limits?: Record<string, any>;
  sandbox_available?: boolean;
  oauth_config?: {
    authorization_url: string;
    token_url: string;
    scopes: string[];
    revoke_url?: string;
  };
}