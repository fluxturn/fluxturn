/**
 * Brevo Trigger Service Tests
 *
 * Tests for the Brevo trigger activation/deactivation using mocked HTTP responses.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { BrevoTriggerService } from '../brevo-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';

describe('BrevoTriggerService', () => {
  let service: BrevoTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://api.brevo.com/v3';

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService();

    // Create service directly with mocked dependencies (avoiding NestJS DI complexity)
    service = new BrevoTriggerService(
      mockConfigService as ConfigService,
      mockPlatformService
    );
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should create a new webhook when none exists', async () => {
      // Mock: list existing webhooks (empty)
      nock(BASE_URL)
        .get('/webhooks')
        .query({ type: 'transactional' })
        .reply(200, { webhooks: [] });

      // Mock: create new webhook
      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, { id: 'new-webhook-123' });

      const result = await service.activate('workflow-test-1', {
        credentials: { apiKey: 'mock-api-key' },
        triggerId: 'email_delivered',
        webhookType: 'transactional',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBe('new-webhook-123');
      expect(result.data?.webhookUrl).toContain('workflow-test-1');
    });

    it('should reuse existing webhook if URL matches', async () => {
      // Mock: list existing webhooks with matching URL
      nock(BASE_URL)
        .get('/webhooks')
        .query({ type: 'transactional' })
        .reply(200, {
          webhooks: [
            {
              id: 'existing-webhook-456',
              url: 'http://localhost:3000/api/v1/webhooks/brevo/workflow-test-2',
            },
          ],
        });

      const result = await service.activate('workflow-test-2', {
        credentials: { apiKey: 'mock-api-key' },
        triggerId: 'email_delivered',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBe('existing-webhook-456');
    });

    it('should fail when no API key is provided', async () => {
      const result = await service.activate('workflow-test-3', {
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
            credentials: { apiKey: 'db-fetched-api-key' },
          },
        ],
      });

      // Mock: list webhooks
      nock(BASE_URL)
        .get('/webhooks')
        .query({ type: 'transactional' })
        .reply(200, { webhooks: [] });

      // Mock: create webhook
      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, { id: 'db-cred-webhook' });

      const result = await service.activate('workflow-test-4', {
        credentialId: 'cred-123',
        triggerId: 'email_delivered',
      });

      expect(result.success).toBe(true);
    });

    it('should handle different trigger types correctly', async () => {
      const triggerTypes = [
        { triggerId: 'email_delivered', expectedEvents: ['delivered'] },
        { triggerId: 'email_opened', expectedEvents: ['opened', 'uniqueOpened'] },
        { triggerId: 'email_clicked', expectedEvents: ['click'] },
        { triggerId: 'email_hard_bounce', expectedEvents: ['hardBounce', 'hard_bounce'] },
      ];

      for (const { triggerId, expectedEvents } of triggerTypes) {
        nock.cleanAll();

        nock(BASE_URL)
          .get('/webhooks')
          .query({ type: 'transactional' })
          .reply(200, { webhooks: [] });

        let capturedEvents: string[] = [];
        nock(BASE_URL)
          .post('/webhooks', (body: any) => {
            capturedEvents = body.events;
            return true;
          })
          .reply(200, { id: `webhook-${triggerId}` });

        await service.activate(`workflow-${triggerId}`, {
          credentials: { apiKey: 'mock-key' },
          triggerId,
        });

        // Verify the correct events were sent
        expect(capturedEvents).toEqual(expect.arrayContaining(expectedEvents));
      }
    });

    it('should handle API errors during webhook creation', async () => {
      nock(BASE_URL)
        .get('/webhooks')
        .query({ type: 'transactional' })
        .reply(200, { webhooks: [] });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(500, { message: 'Internal server error' });

      const result = await service.activate('workflow-test-error', {
        credentials: { apiKey: 'mock-key' },
        triggerId: 'email_delivered',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should delete webhook successfully', async () => {
      // Setup: mock stored webhook data
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            webhook_data: {
              webhookId: 'webhook-to-delete',
              apiKey: 'mock-key',
            },
          },
        ],
      });

      // Mock: delete webhook
      nock(BASE_URL)
        .delete('/webhooks/webhook-to-delete')
        .reply(200);

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
    });

    it('should handle missing webhook data gracefully', async () => {
      // No stored webhook data
      mockPlatformService.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.deactivate('workflow-no-webhook');

      // Should still succeed (nothing to delete)
      expect(result.success).toBe(true);
    });

    it('should handle API error during webhook deletion', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            webhook_data: {
              webhookId: 'webhook-delete-error',
              apiKey: 'mock-key',
            },
          },
        ],
      });

      nock(BASE_URL)
        .delete('/webhooks/webhook-delete-error')
        .reply(404, { message: 'Webhook not found' });

      // Should still return success (best effort deletion)
      const result = await service.deactivate('workflow-delete-error');
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Status Tests
  // ===========================================
  describe('getStatus', () => {
    it('should return inactive status when trigger is not active', async () => {
      const status = await service.getStatus('inactive-workflow');

      expect(status.active).toBe(false);
    });

    it('should return active status after activation', async () => {
      // First activate
      nock(BASE_URL)
        .get('/webhooks')
        .query({ type: 'transactional' })
        .reply(200, { webhooks: [] });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, { id: 'status-test-webhook' });

      await service.activate('status-test-workflow', {
        credentials: { apiKey: 'mock-key' },
        triggerId: 'email_delivered',
      });

      // Then check status
      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.metadata?.webhookId).toBe('status-test-webhook');
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return BREVO trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBeDefined();
    });
  });
});
