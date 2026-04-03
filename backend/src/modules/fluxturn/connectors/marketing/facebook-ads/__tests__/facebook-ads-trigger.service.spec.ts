/**
 * Facebook Ads Trigger Service Tests
 *
 * Tests for the Facebook Ads trigger service functionality.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { FacebookAdsTriggerService } from '../facebook-ads-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('FacebookAdsTriggerService', () => {
  let service: FacebookAdsTriggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FacebookAdsTriggerService],
    }).compile();

    service = module.get<FacebookAdsTriggerService>(FacebookAdsTriggerService);
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
      expect(service.getTriggerType()).toBe(TriggerType.FACEBOOK_ADS);
    });
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should activate trigger successfully with valid config', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'campaign_delivery_issue',
        adAccountId: 'act_123456789',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated');
      expect(result.data?.webhookEndpoint).toBe('/webhooks/facebook-ads/workflow-123');
    });

    it('should fail activation without trigger ID', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: '',
        adAccountId: 'act_123456789',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_TRIGGER_ID');
    });

    it('should fail new_lead trigger without pageId and formId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'new_lead',
        adAccountId: 'act_123456789',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_PAGE_OR_FORM_ID');
    });

    it('should activate new_lead trigger with pageId and formId', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'new_lead',
        adAccountId: 'act_123456789',
        pageId: 'page_123',
        formId: 'form_456',
      });

      expect(result.success).toBe(true);
    });

    it('should fail activation without ad account ID', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'campaign_delivery_issue',
        adAccountId: '',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_AD_ACCOUNT_ID');
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate an active trigger', async () => {
      // First activate
      await service.activate('workflow-123', {
        triggerId: 'campaign_delivery_issue',
        adAccountId: 'act_123456789',
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
        triggerId: 'campaign_delivery_issue',
        adAccountId: 'act_123456789',
      });

      const status = await service.getStatus('workflow-123');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.FACEBOOK_ADS);
      expect(status.metadata?.triggerId).toBe('campaign_delivery_issue');
    });

    it('should return inactive status for non-existent trigger', async () => {
      const status = await service.getStatus('non-existent-workflow');

      expect(status.active).toBe(false);
      expect(status.type).toBe(TriggerType.FACEBOOK_ADS);
    });
  });

  // ===========================================
  // Configuration Tests
  // ===========================================
  describe('getTriggerConfig', () => {
    it('should return trigger configuration for active workflow', async () => {
      await service.activate('workflow-123', {
        triggerId: 'campaign_delivery_issue',
        adAccountId: 'act_123456789',
      });

      const config = service.getTriggerConfig('workflow-123');

      expect(config).toBeDefined();
      expect(config?.triggerId).toBe('campaign_delivery_issue');
      expect(config?.adAccountId).toBe('act_123456789');
    });

    it('should return undefined for non-existent workflow', () => {
      const config = service.getTriggerConfig('non-existent-workflow');

      expect(config).toBeUndefined();
    });
  });
});
