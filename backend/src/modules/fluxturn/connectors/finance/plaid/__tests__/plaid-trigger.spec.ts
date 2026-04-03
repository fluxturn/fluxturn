/**
 * Plaid Trigger Service Tests
 *
 * Tests for the Plaid trigger service that manages webhook-based triggers.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PlaidTriggerService } from '../plaid-trigger.service';
import { PlaidWebhookService } from '../plaid-webhook.service';
import { PlatformService } from '../../../../../database/platform.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

// Mock WorkflowService to avoid ESM import issues with @octokit/rest
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

import { WorkflowService } from '../../../../workflow/workflow.service';

describe('PlaidTriggerService', () => {
  let service: PlaidTriggerService;
  let platformService: jest.Mocked<PlatformService>;
  let workflowService: jest.Mocked<WorkflowService>;
  let plaidWebhookService: jest.Mocked<PlaidWebhookService>;

  const mockWorkflowId = 'workflow-123';
  const mockCredentialId = 'credential-456';
  const mockAccessToken = 'access-sandbox-12345678';
  const mockWebhookUrl = 'https://app.fluxturn.com/webhooks/plaid/workflow-123';

  beforeEach(async () => {
    // Create mock services
    platformService = {
      query: jest.fn(),
    } as any;

    workflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    } as any;

    plaidWebhookService = {
      buildWebhookUrl: jest.fn().mockReturnValue(mockWebhookUrl),
      updateItemWebhook: jest.fn(),
      storeWebhookConfig: jest.fn(),
      getWebhookConfig: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaidTriggerService,
        { provide: PlatformService, useValue: platformService },
        { provide: WorkflowService, useValue: workflowService },
        { provide: PlaidWebhookService, useValue: plaidWebhookService },
      ],
    }).compile();

    service = module.get<PlaidTriggerService>(PlaidTriggerService);
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return PLAID trigger type', () => {
      const triggerType = service.getTriggerType();
      expect(triggerType).toBe(TriggerType.PLAID);
    });
  });

  // ===========================================
  // Activate Tests
  // ===========================================
  describe('activate', () => {
    const triggerConfig = {
      credentialId: mockCredentialId,
      access_token: mockAccessToken,
      triggerId: 'transactions_sync_updates',
    };

    it('should activate trigger successfully', async () => {
      // Mock credential lookup
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              client_id: 'mock-client-id',
              secret: 'mock-secret',
              environment: 'sandbox',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      // Mock webhook update
      plaidWebhookService.updateItemWebhook.mockResolvedValueOnce({
        success: true,
        message: 'Webhook updated',
        item: { item_id: 'item-123' },
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated successfully');
      expect(result.data?.webhookUrl).toBe(mockWebhookUrl);
      expect(plaidWebhookService.storeWebhookConfig).toHaveBeenCalled();
    });

    it('should fail when credentialId is missing', async () => {
      const result = await service.activate(mockWorkflowId, {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('credential not selected');
    });

    it('should fail when access_token is missing', async () => {
      const result = await service.activate(mockWorkflowId, {
        credentialId: mockCredentialId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('access token is required');
    });

    it('should fail when credential is not found', async () => {
      platformService.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', fields: [] } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('credential not found');
    });

    it('should fail when credentials are invalid', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: {} }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid Plaid credentials');
    });

    it('should fail when webhook update fails', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              client_id: 'mock-client-id',
              secret: 'mock-secret',
              environment: 'sandbox',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      plaidWebhookService.updateItemWebhook.mockResolvedValueOnce({
        success: false,
        message: 'Failed',
        error: 'INVALID_ACCESS_TOKEN',
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to configure');
    });

    it('should handle connectorConfigId as alternative to credentialId', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              client_id: 'mock-client-id',
              secret: 'mock-secret',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      plaidWebhookService.updateItemWebhook.mockResolvedValueOnce({
        success: true,
        message: 'Webhook updated',
        item: { item_id: 'item-123' },
      } as any);

      const result = await service.activate(mockWorkflowId, {
        connectorConfigId: mockCredentialId,
        accessToken: mockAccessToken, // Alternative key
      });

      expect(result.success).toBe(true);
    });

    it('should handle exceptions gracefully', async () => {
      platformService.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  // ===========================================
  // Deactivate Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate trigger successfully', async () => {
      plaidWebhookService.getWebhookConfig.mockResolvedValueOnce({
        webhookUrl: mockWebhookUrl,
        accessToken: mockAccessToken,
      });

      platformService.query.mockResolvedValueOnce({ rowCount: 1, rows: [], command: 'UPDATE', fields: [] } as any);

      const result = await service.deactivate(mockWorkflowId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated successfully');
    });

    it('should succeed when no webhook config exists', async () => {
      plaidWebhookService.getWebhookConfig.mockResolvedValueOnce(null);

      const result = await service.deactivate(mockWorkflowId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('no webhook configured');
    });

    it('should handle exceptions gracefully', async () => {
      plaidWebhookService.getWebhookConfig.mockRejectedValueOnce(
        new Error('Database error')
      );

      const result = await service.deactivate(mockWorkflowId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to deactivate');
    });
  });

  // ===========================================
  // Get Status Tests
  // ===========================================
  describe('getStatus', () => {
    it('should return active status when webhook is configured', async () => {
      plaidWebhookService.getWebhookConfig.mockResolvedValueOnce({
        webhookUrl: mockWebhookUrl,
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getStatus(mockWorkflowId);

      expect(result.active).toBe(true);
      expect(result.type).toBe(TriggerType.PLAID);
      expect(result.message).toContain('configured');
      expect(result.metadata?.webhookUrl).toBe(mockWebhookUrl);
    });

    it('should return inactive status when no webhook configured', async () => {
      plaidWebhookService.getWebhookConfig.mockResolvedValueOnce(null);

      const result = await service.getStatus(mockWorkflowId);

      expect(result.active).toBe(false);
      expect(result.type).toBe(TriggerType.PLAID);
      expect(result.message).toContain('No webhook configured');
    });

    it('should handle exceptions and return inactive status', async () => {
      plaidWebhookService.getWebhookConfig.mockRejectedValueOnce(
        new Error('Database error')
      );

      const result = await service.getStatus(mockWorkflowId);

      expect(result.active).toBe(false);
      expect(result.type).toBe(TriggerType.PLAID);
      expect(result.message).toContain('Database error');
    });
  });

  // ===========================================
  // Trigger Type Mapping Tests
  // ===========================================
  describe('trigger type mapping', () => {
    it('should map transactions_sync_updates trigger correctly', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              client_id: 'mock-client-id',
              secret: 'mock-secret',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      plaidWebhookService.updateItemWebhook.mockResolvedValueOnce({
        success: true,
        message: 'Webhook updated',
        item: { item_id: 'item-123' },
      } as any);

      const result = await service.activate(mockWorkflowId, {
        credentialId: mockCredentialId,
        access_token: mockAccessToken,
        triggerId: 'transactions_sync_updates',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerTypes).toContain('TRANSACTIONS.SYNC_UPDATES_AVAILABLE');
    });

    it('should map item_error trigger correctly', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              client_id: 'mock-client-id',
              secret: 'mock-secret',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      plaidWebhookService.updateItemWebhook.mockResolvedValueOnce({
        success: true,
        message: 'Webhook updated',
        item: { item_id: 'item-123' },
      } as any);

      const result = await service.activate(mockWorkflowId, {
        credentialId: mockCredentialId,
        access_token: mockAccessToken,
        triggerId: 'item_error',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerTypes).toContain('ITEM.ERROR');
    });

    it('should return TRANSACTIONS when no specific trigger is configured', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              client_id: 'mock-client-id',
              secret: 'mock-secret',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      plaidWebhookService.updateItemWebhook.mockResolvedValueOnce({
        success: true,
        message: 'Webhook updated',
        item: { item_id: 'item-123' },
      } as any);

      const result = await service.activate(mockWorkflowId, {
        credentialId: mockCredentialId,
        access_token: mockAccessToken,
        // No triggerId specified
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerTypes).toContain('TRANSACTIONS');
    });
  });
});
