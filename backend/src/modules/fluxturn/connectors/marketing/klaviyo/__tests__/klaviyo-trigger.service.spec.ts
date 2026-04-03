/**
 * Klaviyo Trigger Service Tests
 *
 * Tests for the Klaviyo trigger service functionality.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { KlaviyoTriggerService } from '../klaviyo-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('KlaviyoTriggerService', () => {
  let service: KlaviyoTriggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KlaviyoTriggerService],
    }).compile();

    service = module.get<KlaviyoTriggerService>(KlaviyoTriggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Basic Tests
  // ===========================================
  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return correct trigger type', () => {
      expect(service.getTriggerType()).toBe(TriggerType.KLAVIYO);
    });
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should activate trigger successfully with valid config', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'profile_created',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated');
      expect(result.data?.webhookEndpoint).toBe('/webhooks/klaviyo/workflow-123');
    });

    it('should fail activation without trigger ID', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: '',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_TRIGGER_ID');
    });

    it('should fail list_member_added trigger without listId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'list_member_added',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CONFIG');
      expect(result.message).toContain('List ID');
    });

    it('should activate list_member_added trigger with listId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'list_member_added',
        listId: 'list-123',
      });

      expect(result.success).toBe(true);
    });

    it('should fail flow_triggered trigger without flowId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'flow_triggered',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Flow ID');
    });

    it('should activate flow_triggered trigger with flowId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'flow_triggered',
        flowId: 'flow-123',
      });

      expect(result.success).toBe(true);
    });

    it('should fail campaign_sent trigger without campaignId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'campaign_sent',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Campaign ID');
    });

    it('should activate campaign_sent trigger with campaignId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'campaign_sent',
        campaignId: 'campaign-123',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate an active trigger', async () => {
      // First activate
      await service.activate('workflow-123', {
        triggerId: 'profile_created',
      });

      // Then deactivate
      const result = await service.deactivate('workflow-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated');
    });

    it('should fail deactivation for non-existent trigger', async () => {
      const result = await service.deactivate('non-existent-workflow');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active trigger');
    });
  });

  // ===========================================
  // Status Tests
  // ===========================================
  describe('getStatus', () => {
    it('should return active status for active trigger', async () => {
      await service.activate('workflow-123', {
        triggerId: 'profile_created',
      });

      const status = await service.getStatus('workflow-123');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.KLAVIYO);
      expect(status.metadata?.triggerId).toBe('profile_created');
    });

    it('should return inactive status for non-existent trigger', async () => {
      const status = await service.getStatus('non-existent-workflow');

      expect(status.active).toBe(false);
      expect(status.type).toBe(TriggerType.KLAVIYO);
    });

    it('should include listId in metadata for list triggers', async () => {
      await service.activate('workflow-123', {
        triggerId: 'list_member_added',
        listId: 'list-123',
      });

      const status = await service.getStatus('workflow-123');

      expect(status.metadata?.listId).toBe('list-123');
    });
  });

  // ===========================================
  // Configuration Tests
  // ===========================================
  describe('getTriggerConfig', () => {
    it('should return trigger configuration for active workflow', async () => {
      await service.activate('workflow-123', {
        triggerId: 'event_tracked',
        metricId: 'metric-123',
      });

      const config = service.getTriggerConfig('workflow-123');

      expect(config).toBeDefined();
      expect(config?.triggerId).toBe('event_tracked');
      expect(config?.metricId).toBe('metric-123');
    });

    it('should return undefined for non-existent workflow', () => {
      const config = service.getTriggerConfig('non-existent-workflow');

      expect(config).toBeUndefined();
    });
  });
});
