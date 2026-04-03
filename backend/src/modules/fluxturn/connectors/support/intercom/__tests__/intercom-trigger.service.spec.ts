/**
 * Intercom Trigger Service Tests
 *
 * Tests for the Intercom trigger service that manages webhook-based triggers.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { IntercomTriggerService } from '../intercom-trigger.service';
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

describe('IntercomTriggerService', () => {
  let service: IntercomTriggerService;
  let platformService: jest.Mocked<PlatformService>;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';
  const mockCredentialId = 'credential-456';
  const mockAccessToken = 'dG9rOm1vY2staW50ZXJjb20tYWNjZXNzLXRva2VuLTEyMzQ1';
  const mockWebhookUrl = 'http://localhost:5005/webhooks/intercom/workflow-123';

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
        IntercomTriggerService,
        { provide: PlatformService, useValue: platformService },
        { provide: WorkflowService, useValue: workflowService },
      ],
    }).compile();

    service = module.get<IntercomTriggerService>(IntercomTriggerService);
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return INTERCOM trigger type', () => {
      const triggerType = service.getTriggerType();
      expect(triggerType).toBe(TriggerType.INTERCOM);
    });
  });

  // ===========================================
  // Activate Tests
  // ===========================================
  describe('activate', () => {
    const triggerConfig = {
      credentialId: mockCredentialId,
      triggerId: 'conversation_opened',
    };

    it('should activate trigger successfully', async () => {
      // Mock credential lookup
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: mockAccessToken,
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
      expect(result.data?.webhookUrl).toContain('/webhooks/intercom/');
      expect(result.data?.triggerId).toBe('conversation_opened');
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

    it('should fail when access_token is missing', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: {} }],
        rowCount: 1,
        command: 'SELECT',
        fields: [],
      } as any);

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid Intercom credentials');
    });

    it('should handle connectorConfigId as alternative to credentialId', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: mockAccessToken,
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
        triggerId: 'user_created',
      });

      expect(result.success).toBe(true);
    });

    it('should handle exceptions gracefully', async () => {
      platformService.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.activate(mockWorkflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should return trigger event types in activation result', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: { access_token: mockAccessToken } }],
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
        credentialId: mockCredentialId,
        triggerId: 'conversation_closed',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerTypes).toContain('conversation.admin.closed');
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
              triggerId: 'conversation_opened',
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
              triggerId: 'conversation_opened',
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
      expect(result.type).toBe(TriggerType.INTERCOM);
      expect(result.message).toContain('configured');
      expect(result.metadata?.webhookUrl).toBe(mockWebhookUrl);
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
      expect(result.type).toBe(TriggerType.INTERCOM);
      expect(result.message).toContain('No webhook configured');
    });

    it('should handle exceptions and return inactive status', async () => {
      platformService.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getStatus(mockWorkflowId);

      expect(result.active).toBe(false);
      expect(result.type).toBe(TriggerType.INTERCOM);
      expect(result.message).toContain('Database error');
    });
  });

  // ===========================================
  // Trigger Type Mapping Tests
  // ===========================================
  describe('trigger type mapping', () => {
    it('should map conversation_opened trigger correctly', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: { access_token: mockAccessToken } }],
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
        credentialId: mockCredentialId,
        triggerId: 'conversation_opened',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerTypes).toContain('conversation.user.created');
    });

    it('should map user_created trigger correctly', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: { access_token: mockAccessToken } }],
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
        credentialId: mockCredentialId,
        triggerId: 'user_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerTypes).toContain('contact.user.created');
    });

    it('should return default trigger type when no specific trigger is configured', async () => {
      platformService.query.mockResolvedValueOnce({
        rows: [{ credentials: { access_token: mockAccessToken } }],
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
        credentialId: mockCredentialId,
        // No triggerId specified
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerTypes).toContain('conversation.user.created');
    });
  });

  // ===========================================
  // Get Webhook Config Tests
  // ===========================================
  describe('getWebhookConfig', () => {
    it('should return webhook config when exists', async () => {
      const expectedConfig = {
        webhookUrl: mockWebhookUrl,
        triggerId: 'conversation_opened',
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
