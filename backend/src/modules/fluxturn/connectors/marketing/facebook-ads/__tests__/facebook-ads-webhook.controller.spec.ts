/**
 * Facebook Ads Webhook Controller Tests
 *
 * Tests for the Facebook Ads webhook controller functionality.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { FacebookAdsWebhookController } from '../facebook-ads-webhook.controller';
import { FacebookAdsTriggerService } from '../facebook-ads-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('FacebookAdsWebhookController', () => {
  let controller: FacebookAdsWebhookController;
  let triggerService: FacebookAdsTriggerService;

  const mockTriggerService = {
    getStatus: jest.fn(),
    getTriggerConfig: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    getTriggerType: jest.fn().mockReturnValue(TriggerType.FACEBOOK_ADS),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacebookAdsWebhookController],
      providers: [
        {
          provide: FacebookAdsTriggerService,
          useValue: mockTriggerService,
        },
      ],
    }).compile();

    controller = module.get<FacebookAdsWebhookController>(FacebookAdsWebhookController);
    triggerService = module.get<FacebookAdsTriggerService>(FacebookAdsTriggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Verification Tests
  // ===========================================
  describe('verifyWebhook', () => {
    it('should return challenge for valid subscribe request', () => {
      const result = controller.verifyWebhook(
        'workflow-123',
        'subscribe',
        'verify-token',
        'challenge-123',
      );

      expect(result).toBe('challenge-123');
    });

    it('should throw error for non-subscribe mode', () => {
      expect(() =>
        controller.verifyWebhook('workflow-123', 'invalid', 'token', 'challenge'),
      ).toThrow(HttpException);
    });
  });

  // ===========================================
  // Webhook Handler Tests
  // ===========================================
  describe('handleWebhook', () => {
    it('should process lead gen event successfully', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.FACEBOOK_ADS,
      });

      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page-123',
            time: Date.now(),
            leadgen_id: 'lead-123',
            page_id: 'page-123',
            form_id: 'form-456',
            created_time: Date.now(),
            field_data: [
              { name: 'email', values: ['test@example.com'] },
            ],
          },
        ],
      };

      const result = await controller.handleWebhook('workflow-123', payload, 'signature');

      expect(result.received).toBe(true);
      expect(result.processed).toBe(1);
    });

    it('should process change event successfully', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.FACEBOOK_ADS,
      });

      const payload = {
        object: 'ad_account',
        entry: [
          {
            id: 'ad-account-123',
            time: Date.now(),
            changes: [
              {
                field: 'campaign',
                value: { campaign_id: 'campaign-123', status: 'delivery_issue' },
              },
            ],
          },
        ],
      };

      const result = await controller.handleWebhook('workflow-123', payload, 'signature');

      expect(result.received).toBe(true);
      expect(result.processed).toBe(1);
    });

    it('should return 0 processed for inactive trigger', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: false,
        type: TriggerType.FACEBOOK_ADS,
      });

      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page-123',
            time: Date.now(),
            leadgen_id: 'lead-123',
          },
        ],
      };

      const result = await controller.handleWebhook('workflow-123', payload, 'signature');

      expect(result.received).toBe(true);
      expect(result.processed).toBe(0);
    });

    it('should handle multiple entries', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.FACEBOOK_ADS,
      });

      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page-123',
            time: Date.now(),
            leadgen_id: 'lead-123',
          },
          {
            id: 'page-123',
            time: Date.now(),
            leadgen_id: 'lead-456',
          },
        ],
      };

      const result = await controller.handleWebhook('workflow-123', payload, 'signature');

      expect(result.received).toBe(true);
      expect(result.processed).toBe(2);
    });

    it('should throw error on processing failure', async () => {
      mockTriggerService.getStatus.mockRejectedValue(new Error('Service error'));

      const payload = {
        object: 'page',
        entry: [],
      };

      await expect(controller.handleWebhook('workflow-123', payload, 'signature')).rejects.toThrow(
        HttpException,
      );
    });
  });

  // ===========================================
  // Deduplication Tests
  // ===========================================
  describe('event deduplication', () => {
    it('should not process duplicate lead gen events', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.FACEBOOK_ADS,
      });

      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page-123',
            time: Date.now(),
            leadgen_id: 'lead-duplicate-123',
          },
        ],
      };

      // First call
      const result1 = await controller.handleWebhook('workflow-123', payload, 'signature');
      expect(result1.processed).toBe(1);

      // Second call with same event - should be deduplicated
      const result2 = await controller.handleWebhook('workflow-123', payload, 'signature');
      expect(result2.processed).toBe(0);
    });
  });

  // ===========================================
  // Event Type Mapping Tests
  // ===========================================
  describe('event type mapping', () => {
    it('should map campaign field to campaign_delivery_issue', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.FACEBOOK_ADS,
      });

      const payload = {
        object: 'ad_account',
        entry: [
          {
            id: 'account-123',
            time: Date.now(),
            changes: [{ field: 'campaign', value: {} }],
          },
        ],
      };

      const result = await controller.handleWebhook('workflow-123', payload, 'signature');

      expect(result.processed).toBe(1);
    });

    it('should map ad_status field to ad_disapproved', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.FACEBOOK_ADS,
      });

      const payload = {
        object: 'ad_account',
        entry: [
          {
            id: 'account-123',
            time: Date.now(),
            changes: [{ field: 'ad_status', value: { status: 'disapproved' } }],
          },
        ],
      };

      const result = await controller.handleWebhook('workflow-123', payload, 'signature');

      expect(result.processed).toBe(1);
    });
  });
});
