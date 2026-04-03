/**
 * PayPal Trigger Service Tests
 *
 * Tests for the PayPal trigger service that manages webhook-based triggers.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PayPalTriggerService } from '../paypal-trigger.service';
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

describe('PayPalTriggerService', () => {
  let service: PayPalTriggerService;
  let platformService: jest.Mocked<PlatformService>;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';
  const mockCredentialId = 'credential-456';
  const mockClientId = 'test-client-id';
  const mockClientSecret = 'test-client-secret';
  const mockWebhookUrl = 'http://localhost:5005/webhooks/paypal/workflow-123';

  beforeEach(async () => {
    // Create mock services
    platformService = {
      query: jest.fn(),
    } as any;

    workflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayPalTriggerService,
        { provide: PlatformService, useValue: platformService },
        { provide: WorkflowService, useValue: workflowService },
      ],
    }).compile();

    service = module.get<PayPalTriggerService>(PayPalTriggerService);
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return PAYPAL trigger type', () => {
      const triggerType = service.getTriggerType();
      expect(triggerType).toBe(TriggerType.PAYPAL);
    });
  });

  // ===========================================
  // Activate Tests
  // ===========================================
  describe('activate', () => {
    const triggerConfig = {
      credentialId: mockCredentialId,
      triggerId: 'webhook_events',
    };

    it('should activate trigger successfully', async () => {
      // Mock credential lookup
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              clientId: mockClientId,
              clientSecret: mockClientSecret,
              environment: 'sandbox',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      // Mock webhook config storage
      platformService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        fields: [],
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated successfully');
      expect(result.data?.webhookUrl).toContain('/webhooks/paypal/');
      expect(result.data?.triggerId).toBe('webhook_events');
      expect(result.data?.setupInstructions).toBeDefined();
    });

    it('should fail when credentialId is missing', async () => {
      const result = await service.activate(mockWorkflowId, {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('credential not selected');
    });

    it('should fail when credential is not found', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('credential not found');
    });

    it('should fail when clientId is missing', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: { clientSecret: mockClientSecret } }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid PayPal credentials');
    });

    it('should fail when clientSecret is missing', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: { clientId: mockClientId } }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid PayPal credentials');
    });

    it('should handle connectorConfigId as alternative to credentialId', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              clientId: mockClientId,
              clientSecret: mockClientSecret,
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      platformService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        fields: [],
      } as any);

      const result = await service.activate(mockWorkflowId, {
        connectorConfigId: mockCredentialId,
        triggerId: 'webhook_events',
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
      // Mock getting webhook config
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            webhook_config: {
              webhookUrl: mockWebhookUrl,
              triggerId: 'webhook_events',
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      // Mock clearing webhook config
      platformService.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        fields: [],
      } as any);

      const result = await service.deactivate(mockWorkflowId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated successfully');
    });

    it('should succeed when no webhook config exists', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ webhook_config: null }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.deactivate(mockWorkflowId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('no webhook configured');
    });

    it('should handle exceptions gracefully', async () => {
      platformService.query.mockRejectedValueOnce(new Error('Database error'));

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
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            webhook_config: {
              webhookUrl: mockWebhookUrl,
              triggerId: 'webhook_events',
              environment: 'sandbox',
              activatedAt: new Date().toISOString(),
            },
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.getStatus(mockWorkflowId);

      expect(result.active).toBe(true);
      expect(result.type).toBe(TriggerType.PAYPAL);
      expect(result.message).toContain('configured');
      expect(result.metadata?.webhookUrl).toBe(mockWebhookUrl);
      expect(result.metadata?.environment).toBe('sandbox');
    });

    it('should return inactive status when no webhook configured', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ webhook_config: null }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.getStatus(mockWorkflowId);

      expect(result.active).toBe(false);
      expect(result.type).toBe(TriggerType.PAYPAL);
      expect(result.message).toContain('No webhook configured');
    });

    it('should handle exceptions and return inactive status', async () => {
      platformService.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getStatus(mockWorkflowId);

      expect(result.active).toBe(false);
      expect(result.type).toBe(TriggerType.PAYPAL);
      expect(result.message).toContain('Database error');
    });
  });

  // ===========================================
  // Get Webhook Config Tests
  // ===========================================
  describe('getWebhookConfig', () => {
    it('should return webhook config when exists', async () => {
      const expectedConfig = {
        webhookUrl: mockWebhookUrl,
        triggerId: 'webhook_events',
        environment: 'sandbox',
        activatedAt: new Date().toISOString(),
      };

      platformService.query.mockResolvedValueOnce({
        rows: [{ webhook_config: expectedConfig }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const config = await service.getWebhookConfig(mockWorkflowId);

      expect(config).toEqual(expectedConfig);
    });

    it('should return null when no config exists', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ webhook_config: null }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const config = await service.getWebhookConfig(mockWorkflowId);

      expect(config).toBeNull();
    });

    it('should return null when workflow not found', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        fields: [],
      } as any);

      const config = await service.getWebhookConfig(mockWorkflowId);

      expect(config).toBeNull();
    });
  });
});
