/**
 * Klaviyo Webhook Controller Tests
 *
 * Tests for the Klaviyo webhook controller functionality.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { KlaviyoWebhookController } from '../klaviyo-webhook.controller';
import { KlaviyoTriggerService } from '../klaviyo-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('KlaviyoWebhookController', () => {
  let controller: KlaviyoWebhookController;
  let triggerService: KlaviyoTriggerService;

  const mockTriggerService = {
    getStatus: jest.fn(),
    getTriggerConfig: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    getTriggerType: jest.fn().mockReturnValue(TriggerType.KLAVIYO),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KlaviyoWebhookController],
      providers: [
        {
          provide: KlaviyoTriggerService,
          useValue: mockTriggerService,
        },
      ],
    }).compile();

    controller = module.get<KlaviyoWebhookController>(KlaviyoWebhookController);
    triggerService = module.get<KlaviyoTriggerService>(KlaviyoTriggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Webhook Handler Tests
  // ===========================================
  describe('handleWebhook', () => {
    it('should process profile.created event successfully', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.KLAVIYO,
      });

      const payload = {
        type: 'profile.created',
        data: {
          id: 'profile-123',
          type: 'profile',
          attributes: {
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
          },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.received).toBe(true);
      expect(result.processed).toBe(true);
    });

    it('should process event.tracked event successfully', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.KLAVIYO,
      });

      const payload = {
        type: 'event.tracked',
        data: {
          id: 'event-123',
          type: 'event',
          attributes: {
            metric_name: 'Placed Order',
            event_properties: { value: 99.99 },
            datetime: new Date().toISOString(),
          },
          relationships: {
            profile: {
              data: { id: 'profile-123', type: 'profile' },
            },
          },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.received).toBe(true);
      expect(result.processed).toBe(true);
    });

    it('should process list.member.added event successfully', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.KLAVIYO,
      });

      const payload = {
        type: 'list.member.added',
        data: {
          id: 'membership-123',
          type: 'list-member',
          attributes: {},
          relationships: {
            profile: {
              data: { id: 'profile-123', type: 'profile' },
            },
            list: {
              data: { id: 'list-123', type: 'list' },
            },
          },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.received).toBe(true);
      expect(result.processed).toBe(true);
    });

    it('should return not processed for inactive trigger', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: false,
        type: TriggerType.KLAVIYO,
      });

      const payload = {
        type: 'profile.created',
        data: {
          id: 'profile-123',
          type: 'profile',
          attributes: {},
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.received).toBe(true);
      expect(result.processed).toBe(false);
    });

    it('should return not processed for unknown event type', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.KLAVIYO,
      });

      const payload = {
        type: 'unknown.event.type',
        data: {
          id: 'test-123',
          type: 'unknown',
          attributes: {},
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.received).toBe(true);
      expect(result.processed).toBe(false);
    });

    it('should throw error on processing failure', async () => {
      mockTriggerService.getStatus.mockRejectedValue(new Error('Service error'));

      const payload = {
        type: 'profile.created',
        data: {
          id: 'profile-123',
          type: 'profile',
          attributes: {},
        },
      };

      await expect(
        controller.handleWebhook('workflow-123', payload, 'signature', 'timestamp'),
      ).rejects.toThrow(HttpException);
    });
  });

  // ===========================================
  // Deduplication Tests
  // ===========================================
  describe('event deduplication', () => {
    it('should not process duplicate events', async () => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.KLAVIYO,
      });

      const payload = {
        type: 'profile.created',
        data: {
          id: 'profile-duplicate-123',
          type: 'profile',
          attributes: { email: 'test@example.com' },
        },
      };

      // First call
      const result1 = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );
      expect(result1.processed).toBe(true);

      // Second call with same event - should be deduplicated
      const result2 = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );
      expect(result2.processed).toBe(false);
    });
  });

  // ===========================================
  // Event Type Mapping Tests
  // ===========================================
  describe('event type mapping', () => {
    beforeEach(() => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.KLAVIYO,
      });
    });

    it('should map profile.updated to profile_updated', async () => {
      const payload = {
        type: 'profile.updated',
        data: {
          id: 'profile-upd-123',
          type: 'profile',
          attributes: { email: 'updated@example.com' },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.processed).toBe(true);
    });

    it('should map campaign.sent to campaign_sent', async () => {
      const payload = {
        type: 'campaign.sent',
        data: {
          id: 'campaign-sent-123',
          type: 'campaign',
          attributes: {},
          relationships: {
            campaign: {
              data: { id: 'campaign-123', type: 'campaign' },
            },
          },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.processed).toBe(true);
    });

    it('should map flow.triggered to flow_triggered', async () => {
      const payload = {
        type: 'flow.triggered',
        data: {
          id: 'flow-triggered-123',
          type: 'flow-action',
          attributes: {},
          relationships: {
            flow: {
              data: { id: 'flow-123', type: 'flow' },
            },
            profile: {
              data: { id: 'profile-123', type: 'profile' },
            },
          },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.processed).toBe(true);
    });

    it('should map list.member.removed to list_member_removed', async () => {
      const payload = {
        type: 'list.member.removed',
        data: {
          id: 'removal-123',
          type: 'list-member',
          attributes: {},
          relationships: {
            list: {
              data: { id: 'list-123', type: 'list' },
            },
            profile: {
              data: { id: 'profile-123', type: 'profile' },
            },
          },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.processed).toBe(true);
    });
  });

  // ===========================================
  // Data Extraction Tests
  // ===========================================
  describe('data extraction', () => {
    beforeEach(() => {
      mockTriggerService.getStatus.mockResolvedValue({
        active: true,
        type: TriggerType.KLAVIYO,
      });
    });

    it('should extract profile data correctly', async () => {
      const payload = {
        type: 'profile.created',
        data: {
          id: 'profile-extract-123',
          type: 'profile',
          attributes: {
            email: 'extract@example.com',
            first_name: 'Extract',
            last_name: 'Test',
            phone_number: '+1234567890',
          },
        },
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.processed).toBe(true);
    });

    it('should include included resources', async () => {
      const payload = {
        type: 'event.created',
        data: {
          id: 'event-include-123',
          type: 'event',
          attributes: { metric_name: 'Test Event' },
        },
        included: [
          {
            id: 'profile-123',
            type: 'profile',
            attributes: { email: 'included@example.com' },
          },
        ],
      };

      const result = await controller.handleWebhook(
        'workflow-123',
        payload,
        'signature',
        'timestamp',
      );

      expect(result.processed).toBe(true);
    });
  });
});
