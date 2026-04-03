/**
 * Jotform Trigger Service Tests
 *
 * Tests for the Jotform trigger activation/deactivation using mocked HTTP responses.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { JotformTriggerService } from '../jotform-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('JotformTriggerService', () => {
  let service: JotformTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://api.jotform.com';

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService();

    // Create service directly with mocked dependencies
    service = new JotformTriggerService(
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
    it('should create a new webhook successfully', async () => {
      // Mock: fetch credentials from database
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key', apiDomain: 'api.jotform.com' },
          },
        ],
      });

      // Mock: get existing webhooks (empty)
      nock(BASE_URL)
        .get('/form/form-123/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      // Mock: create webhook
      nock(BASE_URL)
        .post('/form/form-123/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'webhook-456',
        });

      const result = await service.activate('workflow-test-1', {
        credentialId: 'cred-123',
        formId: 'form-123',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBe('webhook-456');
      expect(result.data?.webhookUrl).toContain('workflow-test-1');
      expect(result.data?.formId).toBe('form-123');
    });

    it('should reuse existing webhook when already registered', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      // Mock: get existing webhooks (with our webhook already registered)
      nock(BASE_URL)
        .get('/form/form-123/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {
            '0': 'http://localhost:3000/api/v1/webhooks/jotform/workflow-reuse',
          },
        });

      const result = await service.activate('workflow-reuse', {
        credentialId: 'cred-123',
        formId: 'form-123',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated successfully');
    });

    it('should fail when no formId is provided', async () => {
      const result = await service.activate('workflow-no-form', {
        credentialId: 'cred-123',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Form ID is required');
    });

    it('should fail when no API key is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.activate('workflow-no-key', {
        credentialId: 'invalid-cred',
        formId: 'form-123',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('API key');
    });

    it('should handle API error during webhook creation', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      // Mock: get existing webhooks
      nock(BASE_URL)
        .get('/form/form-123/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      // Mock: create webhook fails
      nock(BASE_URL)
        .post('/form/form-123/webhooks')
        .reply(401, {
          responseCode: 401,
          message: 'Invalid API key',
        });

      const result = await service.activate('workflow-api-error', {
        credentialId: 'cred-123',
        formId: 'form-123',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(false);
    });

    it('should handle actionParams for backward compatibility', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      // Mock: get existing webhooks
      nock(BASE_URL)
        .get('/form/form-from-action-params/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      // Mock: create webhook
      nock(BASE_URL)
        .post('/form/form-from-action-params/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'webhook-action-params',
        });

      const result = await service.activate('workflow-action-params', {
        credentialId: 'cred-123',
        actionParams: {
          formId: 'form-from-action-params',
          triggerId: 'form_submission',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should support form_id alternative field name', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/form/form-alt/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      nock(BASE_URL)
        .post('/form/form-alt/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'webhook-alt',
        });

      const result = await service.activate('workflow-form-id-alt', {
        credentialId: 'cred-123',
        form_id: 'form-alt',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(true);
    });

    it('should use custom apiDomain when provided', async () => {
      const customDomain = 'eu-api.jotform.com';

      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key', apiDomain: customDomain },
          },
        ],
      });

      // Mock with custom domain
      nock(`https://${customDomain}`)
        .get('/form/form-eu/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      nock(`https://${customDomain}`)
        .post('/form/form-eu/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'webhook-eu',
        });

      const result = await service.activate('workflow-eu', {
        credentialId: 'cred-123',
        formId: 'form-eu',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should delete webhook successfully', async () => {
      // First activate to have an active trigger
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/form/form-deactivate/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      nock(BASE_URL)
        .post('/form/form-deactivate/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'webhook-to-delete',
        });

      await service.activate('workflow-to-deactivate', {
        credentialId: 'cred-123',
        formId: 'form-deactivate',
        triggerId: 'form_submission',
      });

      // Mock: delete webhook
      nock(BASE_URL)
        .delete('/form/form-deactivate/webhooks/webhook-to-delete')
        .reply(200, {
          responseCode: 200,
        });

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
    });

    it('should handle missing active trigger gracefully', async () => {
      const result = await service.deactivate('workflow-no-trigger');

      // Should still succeed (nothing to delete)
      expect(result.success).toBe(true);
    });

    it('should handle API error during webhook deletion gracefully', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/form/form-delete-error/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      nock(BASE_URL)
        .post('/form/form-delete-error/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'webhook-delete-error',
        });

      await service.activate('workflow-delete-error', {
        credentialId: 'cred-123',
        formId: 'form-delete-error',
        triggerId: 'form_submission',
      });

      // Mock: delete webhook fails
      nock(BASE_URL)
        .delete('/form/form-delete-error/webhooks/webhook-delete-error')
        .reply(404, {
          responseCode: 404,
          message: 'Webhook not found',
        });

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
      expect(status.type).toBe(TriggerType.JOTFORM);
    });

    it('should return active status after activation', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/form/form-status/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      nock(BASE_URL)
        .post('/form/form-status/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'status-test-webhook',
        });

      await service.activate('status-test-workflow', {
        credentialId: 'cred-123',
        formId: 'form-status',
        triggerId: 'form_submission',
      });

      // Then check status
      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.JOTFORM);
      expect(status.metadata?.webhookId).toBe('status-test-webhook');
      expect(status.metadata?.triggerId).toBe('form_submission');
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return JOTFORM trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBe(TriggerType.JOTFORM);
    });
  });

  // ===========================================
  // Active Trigger Tests
  // ===========================================
  describe('getActiveTrigger', () => {
    it('should return active trigger after activation', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { apiKey: 'mock-api-key' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/form/form-active/webhooks')
        .reply(200, {
          responseCode: 200,
          content: {},
        });

      nock(BASE_URL)
        .post('/form/form-active/webhooks')
        .reply(200, {
          responseCode: 200,
          content: 'active-trigger-webhook',
        });

      await service.activate('workflow-active-trigger', {
        credentialId: 'cred-123',
        formId: 'form-active',
        triggerId: 'form_submission',
      });

      const activeTrigger = service.getActiveTrigger('workflow-active-trigger');

      expect(activeTrigger).toBeDefined();
      expect(activeTrigger?.workflowId).toBe('workflow-active-trigger');
      expect(activeTrigger?.triggerId).toBe('form_submission');
      expect(activeTrigger?.config.webhookId).toBe('active-trigger-webhook');
      expect(activeTrigger?.config.formId).toBe('form-active');
    });

    it('should return undefined for unknown workflow', () => {
      const activeTrigger = service.getActiveTrigger('unknown-workflow');
      expect(activeTrigger).toBeUndefined();
    });
  });

  // ===========================================
  // Encrypted Credentials Tests
  // ===========================================
  describe('encrypted credentials', () => {
    it('should fail gracefully when decryption fails', async () => {
      // Mock encrypted credentials with invalid data
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              iv: 'invalid-iv',
              data: 'invalid-encrypted-data',
              authTag: 'invalid-auth-tag',
            },
          },
        ],
      });

      const result = await service.activate('workflow-decrypt-fail', {
        credentialId: 'cred-encrypted',
        formId: 'form-123',
        triggerId: 'form_submission',
      });

      expect(result.success).toBe(false);
    });
  });
});
