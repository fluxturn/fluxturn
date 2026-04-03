/**
 * Trello Trigger Service Tests
 *
 * Tests for Trello webhook management and event handling
 */
import { ConfigService } from '@nestjs/config';
import { TrelloTriggerService } from '../trello-trigger.service';
import { TrelloWebhookService } from '../trello-webhook.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';

describe('TrelloTriggerService', () => {
  let service: TrelloTriggerService;
  let mockPlatformService: any;
  let mockWorkflowService: any;
  let mockTrelloWebhookService: any;

  beforeEach(() => {
    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockWorkflowService = TriggerTestHelper.createMockWorkflowService();

    mockTrelloWebhookService = {
      createWebhook: jest.fn().mockResolvedValue({
        success: true,
        webhooks: [
          {
            id: 'webhook-123',
            description: 'Workflow webhook',
            idModel: 'board123',
            callbackURL: 'https://app.fluxturn.com/webhooks/trello/workflow-123',
            active: true
          }
        ]
      }),
      deleteWebhook: jest.fn().mockResolvedValue({
        success: true
      }),
      getWebhooks: jest.fn().mockResolvedValue({
        success: true,
        webhooks: []
      })
    };

    service = new TrelloTriggerService(
      mockPlatformService,
      mockWorkflowService,
      mockTrelloWebhookService
    );
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should activate card_created trigger successfully', async () => {
      const workflowId = 'workflow-123';
      const triggerConfig = {
        triggerId: 'trigger-456',
        credentialId: 'cred-789',
        actionParams: {
          boardId: 'board123',
          triggerId: 'card_created'
        }
      };

      const result = await service.activate(workflowId, triggerConfig);

      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');
      expect(mockTrelloWebhookService.createWebhook).toHaveBeenCalledWith(workflowId);
    });

    it('should activate card_updated trigger successfully', async () => {
      const workflowId = 'workflow-124';
      const triggerConfig = {
        triggerId: 'trigger-457',
        credentialId: 'cred-789',
        triggerParams: {
          boardId: 'board456',
          triggerId: 'card_updated'
        }
      };

      const result = await service.activate(workflowId, triggerConfig);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('webhooks');
      expect(result.data?.boardId).toBe('board456');
    });

    it('should activate card_moved trigger successfully', async () => {
      const workflowId = 'workflow-125';
      const triggerConfig = {
        triggerId: 'trigger-458',
        credentialId: 'cred-789',
        actionParams: {
          boardId: 'board789',
          triggerId: 'card_moved'
        }
      };

      const result = await service.activate(workflowId, triggerConfig);

      expect(result.success).toBe(true);
    });

    it('should handle missing credentialId error', async () => {
      const workflowId = 'workflow-126';
      const triggerConfig = {
        triggerId: 'trigger-459',
        actionParams: {
          boardId: 'board123'
        }
      };

      const result = await service.activate(workflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('credential');
    });

    it('should handle missing boardId error', async () => {
      const workflowId = 'workflow-127';
      const triggerConfig = {
        triggerId: 'trigger-460',
        credentialId: 'cred-789',
        actionParams: {
          triggerId: 'card_created'
        }
      };

      const result = await service.activate(workflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('not fully configured');
    });

    it('should handle webhook creation failure', async () => {
      const workflowId = 'workflow-128';
      const triggerConfig = {
        triggerId: 'trigger-461',
        credentialId: 'cred-789',
        actionParams: {
          boardId: 'board123',
          triggerId: 'card_created'
        }
      };

      mockTrelloWebhookService.createWebhook = jest.fn().mockResolvedValue({
        success: false,
        error: 'Invalid API credentials'
      });

      const result = await service.activate(workflowId, triggerConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create');
    });

    it('should handle connectorConfigId as alternative to credentialId', async () => {
      const workflowId = 'workflow-129';
      const triggerConfig = {
        triggerId: 'trigger-462',
        connectorConfigId: 'config-789',
        actionParams: {
          boardId: 'board123'
        }
      };

      const result = await service.activate(workflowId, triggerConfig);

      expect(result.success).toBe(true);
      expect(mockTrelloWebhookService.createWebhook).toHaveBeenCalledWith(workflowId);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate trigger successfully', async () => {
      const workflowId = 'workflow-123';

      const result = await service.deactivate(workflowId);

      expect(result.success).toBe(true);
      expect(mockTrelloWebhookService.deleteWebhook).toHaveBeenCalledWith(workflowId);
    });

    it('should handle webhook deletion failure', async () => {
      const workflowId = 'workflow-124';

      mockTrelloWebhookService.deleteWebhook = jest.fn().mockResolvedValue({
        success: false,
        error: 'Webhook not found'
      });

      const result = await service.deactivate(workflowId);

      expect(result.success).toBe(false);
    });

    it('should handle webhook deletion error gracefully', async () => {
      const workflowId = 'workflow-125';

      mockTrelloWebhookService.deleteWebhook = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const result = await service.deactivate(workflowId);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  // ===========================================
  // Status Check Tests
  // ===========================================
  describe('getStatus', () => {
    it('should return active status when webhook exists', async () => {
      const workflowId = 'workflow-123';

      mockTrelloWebhookService.getWebhooks = jest.fn().mockResolvedValue({
        success: true,
        webhooks: [
          {
            id: 'webhook-123',
            description: 'Workflow webhook',
            active: true
          }
        ]
      });

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(true);
      expect(result.message).toContain('active');
    });

    it('should return inactive status when no webhook exists', async () => {
      const workflowId = 'workflow-124';

      mockTrelloWebhookService.getWebhooks = jest.fn().mockResolvedValue({
        success: true,
        webhooks: []
      });

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(false);
    });

    it('should return inactive status when webhook retrieval fails', async () => {
      const workflowId = 'workflow-125';

      mockTrelloWebhookService.getWebhooks = jest.fn().mockResolvedValue({
        success: false,
        error: 'API error'
      });

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      const workflowId = 'workflow-126';

      mockTrelloWebhookService.getWebhooks = jest.fn().mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(false);
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return TRELLO trigger type', () => {
      const triggerType = service.getTriggerType();

      expect(triggerType).toBe('TRELLO');
    });
  });
});
