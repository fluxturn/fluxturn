/**
 * SendGrid Trigger Service Tests
 *
 * Tests for the SendGrid trigger activation/deactivation.
 * Note: SendGrid uses manual webhook configuration, so these tests focus on
 * internal state management rather than API calls.
 */
import { ConfigService } from '@nestjs/config';
import { SendGridTriggerService } from '../sendgrid-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('SendGridTriggerService', () => {
  let service: SendGridTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService({
      APP_URL: 'https://app.example.com',
    });

    // Create service directly with mocked dependencies
    service = new SendGridTriggerService(
      mockConfigService as ConfigService,
      mockPlatformService
    );
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should activate trigger successfully with credentials', async () => {
      const result = await service.activate('workflow-test-1', {
        credentials: { apiKey: 'SG.mock-api-key' },
        triggerId: 'email_delivered',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data?.webhookUrl).toContain('workflow-test-1');
      expect(result.data?.webhookUrl).toContain('sendgrid');
      expect(result.data?.triggerId).toBe('email_delivered');
      expect(result.data?.events).toContain('delivered');
    });

    it('should fail when no API key is provided', async () => {
      const result = await service.activate('workflow-test-2', {
        triggerId: 'email_delivered',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should fetch credentials from database when credentialId is provided', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'SG.db-fetched-api-key' },
          },
        ],
      });

      const result = await service.activate('workflow-test-3', {
        credentialId: 'cred-123',
        triggerId: 'email_opened',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('email_opened');
      expect(result.data?.events).toContain('open');
    });

    it('should handle different trigger types correctly', async () => {
      const triggerTypes = [
        { triggerId: 'email_delivered', expectedEvents: ['delivered'] },
        { triggerId: 'email_opened', expectedEvents: ['open'] },
        { triggerId: 'email_clicked', expectedEvents: ['click'] },
        { triggerId: 'email_bounced', expectedEvents: ['bounce'] },
        { triggerId: 'email_dropped', expectedEvents: ['dropped'] },
        { triggerId: 'spam_report', expectedEvents: ['spamreport'] },
      ];

      for (const { triggerId, expectedEvents } of triggerTypes) {
        const result = await service.activate(`workflow-${triggerId}`, {
          credentials: { apiKey: 'SG.mock-key' },
          triggerId,
        });

        expect(result.success).toBe(true);
        expect(result.data?.events).toEqual(expect.arrayContaining(expectedEvents));
      }
    });

    it('should include setup instructions in response', async () => {
      const result = await service.activate('workflow-test-4', {
        credentials: { apiKey: 'SG.mock-key' },
        triggerId: 'email_delivered',
      });

      expect(result.success).toBe(true);
      expect(result.data?.instructions).toBeDefined();
      expect(result.data?.instructions.step1).toContain('SendGrid Dashboard');
    });

    it('should store webhook data in database', async () => {
      await service.activate('workflow-test-5', {
        credentials: { apiKey: 'SG.mock-key' },
        triggerId: 'email_delivered',
      });

      // Verify database query was called to store webhook data
      expect(mockPlatformService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO workflow_triggers'),
        expect.arrayContaining(['workflow-test-5'])
      );
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate trigger successfully', async () => {
      // First activate
      await service.activate('workflow-to-deactivate', {
        credentials: { apiKey: 'SG.mock-key' },
        triggerId: 'email_delivered',
      });

      // Then deactivate
      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated');
    });

    it('should handle deactivation of non-existent trigger', async () => {
      const result = await service.deactivate('non-existent-workflow');

      // Should still succeed (nothing to delete)
      expect(result.success).toBe(true);
    });

    it('should remove webhook data from database', async () => {
      // Activate first
      await service.activate('workflow-to-delete', {
        credentials: { apiKey: 'SG.mock-key' },
        triggerId: 'email_delivered',
      });

      // Deactivate
      await service.deactivate('workflow-to-delete');

      // Verify delete query was called
      expect(mockPlatformService.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM workflow_triggers'),
        expect.arrayContaining(['workflow-to-delete'])
      );
    });
  });

  // ===========================================
  // Status Tests
  // ===========================================
  describe('getStatus', () => {
    it('should return inactive status when trigger is not active', async () => {
      const status = await service.getStatus('inactive-workflow');

      expect(status.active).toBe(false);
      expect(status.type).toBe(TriggerType.SENDGRID);
    });

    it('should return active status after activation', async () => {
      // First activate
      await service.activate('status-test-workflow', {
        credentials: { apiKey: 'SG.mock-key' },
        triggerId: 'email_delivered',
      });

      // Then check status
      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.SENDGRID);
      expect(status.metadata?.triggerId).toBe('email_delivered');
      expect(status.metadata?.webhookUrl).toContain('status-test-workflow');
    });

    it('should check database for persisted triggers', async () => {
      // Mock database returning stored trigger
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            webhook_data: {
              triggerId: 'email_opened',
              webhookUrl: 'https://app.example.com/api/v1/webhooks/sendgrid/db-workflow',
              events: ['open'],
            },
          },
        ],
      });

      const status = await service.getStatus('db-workflow');

      expect(status.active).toBe(true);
      expect(status.metadata?.triggerId).toBe('email_opened');
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return SENDGRID trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBe(TriggerType.SENDGRID);
    });
  });

  // ===========================================
  // Signature Validation Tests
  // ===========================================
  describe('validateSignature', () => {
    it('should accept webhooks when no verification key is stored', () => {
      const isValid = service.validateSignature(
        { event: 'delivered', email: 'test@example.com' },
        'some-signature',
        '1234567890',
        'unknown-workflow'
      );

      // Should accept since no key is stored (graceful degradation)
      expect(isValid).toBe(true);
    });

    it('should accept webhooks for activated workflows', async () => {
      // Activate to store verification key
      await service.activate('signature-test-workflow', {
        credentials: { apiKey: 'SG.mock-key' },
        triggerId: 'email_delivered',
      });

      const isValid = service.validateSignature(
        { event: 'delivered', email: 'test@example.com' },
        'test-signature',
        '1234567890',
        'signature-test-workflow'
      );

      // Currently accepts all (signature verification is a manual setup)
      expect(isValid).toBe(true);
    });
  });

  // ===========================================
  // Helper Method Tests
  // ===========================================
  describe('getEventTypesForTrigger', () => {
    it('should return correct events for each trigger type', () => {
      expect(service.getEventTypesForTrigger('email_delivered')).toEqual(['delivered']);
      expect(service.getEventTypesForTrigger('email_opened')).toEqual(['open']);
      expect(service.getEventTypesForTrigger('email_clicked')).toEqual(['click']);
      expect(service.getEventTypesForTrigger('email_bounced')).toEqual(['bounce']);
      expect(service.getEventTypesForTrigger('unknown')).toEqual(['delivered']);
    });
  });

  describe('getActiveTrigger', () => {
    it('should return undefined for non-active workflow', () => {
      const trigger = service.getActiveTrigger('non-existent');
      expect(trigger).toBeUndefined();
    });

    it('should return trigger data for active workflow', async () => {
      await service.activate('active-trigger-test', {
        credentials: { apiKey: 'SG.mock-key' },
        triggerId: 'email_delivered',
      });

      const trigger = service.getActiveTrigger('active-trigger-test');

      expect(trigger).toBeDefined();
      expect(trigger?.triggerId).toBe('email_delivered');
      expect(trigger?.workflowId).toBe('active-trigger-test');
    });
  });
});
