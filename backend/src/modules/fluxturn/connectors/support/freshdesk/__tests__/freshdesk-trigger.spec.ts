/**
 * Freshdesk Trigger Service Tests
 *
 * Tests for Freshdesk webhook management and event handling
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { FreshdeskTriggerService } from '../freshdesk-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';

describe('FreshdeskTriggerService', () => {
  let service: FreshdeskTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://mock-company.freshdesk.com/api/v2';

  beforeEach(() => {
    nock.cleanAll();
    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService();

    service = new FreshdeskTriggerService(
      mockConfigService as ConfigService,
      mockPlatformService,
    );
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should activate new_ticket trigger successfully', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        events: ['ticket_created'],
        priority: 'all',
        triggerId: 'new_ticket',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          domain: 'mock-company',
          api_key: 'mock-api-key',
        },
      });

      // Mock webhook creation
      nock(BASE_URL)
        .post('/webhooks')
        .reply(201, {
          id: 123,
          url: 'https://app.fluxturn.com/webhooks/freshdesk/workflow-123',
          events: ['ticket_created'],
          active: true,
        });

      mockPlatformService.saveTriggerData.mockResolvedValue({
        success: true,
        data: { webhookId: '123' },
      });

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(true);
      expect(mockPlatformService.saveTriggerData).toHaveBeenCalled();
    });

    it('should activate ticket_updated trigger successfully', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        events: ['ticket_updated'],
        statuses: [2, 3, 4],
        triggerId: 'ticket_updated',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          domain: 'mock-company',
          api_key: 'mock-api-key',
        },
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(201, {
          id: 124,
          url: 'https://app.fluxturn.com/webhooks/freshdesk/workflow-123',
          events: ['ticket_updated'],
          active: true,
        });

      mockPlatformService.saveTriggerData.mockResolvedValue({
        success: true,
        data: { webhookId: '124' },
      });

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should handle missing credentials error', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        events: ['ticket_created'],
        triggerId: 'new_ticket',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue(null);

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Freshdesk API errors', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        events: ['ticket_created'],
        triggerId: 'new_ticket',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          domain: 'mock-company',
          api_key: 'mock-api-key',
        },
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(400, {
          description: 'Invalid webhook URL',
        });

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate trigger successfully', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue({
        webhookId: '123',
      });

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          domain: 'mock-company',
          api_key: 'mock-api-key',
        },
      });

      // Mock webhook deletion
      nock(BASE_URL)
        .delete('/webhooks/123')
        .reply(204);

      mockPlatformService.deleteTriggerData.mockResolvedValue({
        success: true,
      });

      const result = await service.deactivate(workflowId);

      expect(result.success).toBe(true);
      expect(mockPlatformService.deleteTriggerData).toHaveBeenCalled();
    });

    it('should handle missing trigger data', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue(null);

      const result = await service.deactivate(workflowId);

      // Should still succeed even if no trigger data
      expect(result.success).toBe(true);
    });

    it('should handle webhook not found (404)', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue({
        webhookId: '999',
      });

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          domain: 'mock-company',
          api_key: 'mock-api-key',
        },
      });

      nock(BASE_URL)
        .delete('/webhooks/999')
        .reply(404, { description: 'Webhook not found' });

      mockPlatformService.deleteTriggerData.mockResolvedValue({
        success: true,
      });

      const result = await service.deactivate(workflowId);

      // Should still succeed as webhook is already gone
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Status Check Tests
  // ===========================================
  describe('getStatus', () => {
    it('should return active status when webhook exists', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue({
        webhookId: '123',
        active: true,
      });

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(true);
    });

    it('should return inactive status when no trigger data', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue(null);

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(false);
    });
  });
});
