/**
 * Trigger Test Helper
 *
 * Provides utilities for testing trigger services and webhook controllers.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';

export interface WebhookTestCase {
  name: string;
  type: string;
  payload: any;
  expectedResult?: any;
}

export interface TriggerTestConfig {
  workflowId?: string;
  triggerId?: string;
  credentials?: any;
  webhookType?: string;
}

export class TriggerTestHelper {
  /**
   * Create mock ConfigService with common defaults
   */
  static createMockConfigService(overrides?: Record<string, any>) {
    const defaults: Record<string, any> = {
      APP_URL: 'http://localhost:3000',
      CONNECTOR_ENCRYPTION_KEY: 'test-encryption-key-32-chars!!',
      NODE_ENV: 'test',
      ...overrides,
    };

    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        return defaults[key] ?? defaultValue;
      }),
    };
  }

  /**
   * Create mock PlatformService for database operations
   */
  static createMockPlatformService(queryResponses?: Record<string, any>) {
    const defaultResponses = {
      default: { rows: [] },
      ...queryResponses,
    };

    return {
      query: jest.fn((sql: string, params?: any[]) => {
        // Check if there's a specific response for this query pattern
        for (const [pattern, response] of Object.entries(defaultResponses)) {
          if (pattern !== 'default' && sql.includes(pattern)) {
            return Promise.resolve(response);
          }
        }
        return Promise.resolve(defaultResponses.default);
      }),
      // Trigger-specific methods
      getTriggerData: jest.fn().mockResolvedValue(null),
      saveTriggerData: jest.fn().mockResolvedValue({ success: true }),
      deleteTriggerData: jest.fn().mockResolvedValue({ success: true }),
      getConnectorConfig: jest.fn().mockResolvedValue(null),
      updateTriggerData: jest.fn().mockResolvedValue({ success: true }),
    };
  }

  /**
   * Create mock WorkflowService
   */
  static createMockWorkflowService() {
    return {
      executeWorkflow: jest.fn().mockResolvedValue({ success: true }),
      findById: jest.fn().mockResolvedValue({ id: 'mock-workflow', status: 'active' }),
    };
  }

  /**
   * Create a NestJS test module for trigger service testing
   */
  static async createTriggerTestModule(
    TriggerServiceClass: any,
    additionalProviders: any[] = []
  ): Promise<TestingModule> {
    const mockConfigService = this.createMockConfigService();
    const mockPlatformService = this.createMockPlatformService();

    return Test.createTestingModule({
      providers: [
        TriggerServiceClass,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'PlatformService', useValue: mockPlatformService },
        ...additionalProviders,
      ],
    }).compile();
  }

  /**
   * Create a NestJS test module for webhook controller testing
   */
  static async createWebhookControllerTestModule(
    WebhookControllerClass: any,
    additionalProviders: any[] = []
  ): Promise<TestingModule> {
    const mockWorkflowService = this.createMockWorkflowService();

    return Test.createTestingModule({
      controllers: [WebhookControllerClass],
      providers: [
        { provide: 'WorkflowService', useValue: mockWorkflowService },
        ...additionalProviders,
      ],
    }).compile();
  }

  /**
   * Setup webhook registration mock
   */
  static mockWebhookRegistration(
    baseUrl: string,
    listPath: string,
    createPath: string,
    webhookId: string = 'mock-webhook-123'
  ): void {
    // Mock: list existing webhooks (empty)
    nock(baseUrl).get(listPath).reply(200, { webhooks: [] });

    // Mock: create new webhook
    nock(baseUrl).post(createPath).reply(200, { id: webhookId });
  }

  /**
   * Setup webhook deletion mock
   */
  static mockWebhookDeletion(baseUrl: string, deletePath: string): void {
    nock(baseUrl).delete(deletePath).reply(200);
  }

  /**
   * Create a test trigger configuration
   */
  static createTriggerConfig(
    overrides?: Partial<TriggerTestConfig>
  ): TriggerTestConfig {
    return {
      workflowId: 'test-workflow-123',
      triggerId: 'email_delivered',
      credentials: { apiKey: 'mock-api-key' },
      webhookType: 'transactional',
      ...overrides,
    };
  }

  /**
   * Assert trigger activation was successful
   */
  static assertActivationSuccess(result: any, expectedWebhookId?: string): void {
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();

    if (expectedWebhookId) {
      expect(result.data?.webhookId).toBe(expectedWebhookId);
    }
  }

  /**
   * Assert trigger activation failed
   */
  static assertActivationFailure(result: any, expectedError?: string): void {
    expect(result.success).toBe(false);

    if (expectedError) {
      expect(result.error).toContain(expectedError);
    }
  }

  /**
   * Assert trigger deactivation was successful
   */
  static assertDeactivationSuccess(result: any): void {
    expect(result.success).toBe(true);
  }
}
