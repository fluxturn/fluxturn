/**
 * Typeform Trigger Service Tests
 *
 * Tests for the Typeform trigger activation/deactivation using mocked HTTP responses.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { TypeformTriggerService } from '../typeform-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';

describe('TypeformTriggerService', () => {
  let service: TypeformTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://api.typeform.com';

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService({
      APP_URL: 'https://app.example.com',
    });

    // Create service directly with mocked dependencies
    service = new TypeformTriggerService(
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
    it('should create a new webhook when credentialId is provided', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-access-token' },
          },
        ],
      });

      // Mock: create webhook
      nock(BASE_URL)
        .put(/\/forms\/form-123\/webhooks\/.*/)
        .reply(200, {
          id: 'webhook-123',
          url: 'https://app.example.com/api/v1/webhooks/typeform/workflow-test-1',
          enabled: true,
        });

      const result = await service.activate('workflow-test-1', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'form-123' },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data?.webhookUrl).toContain('workflow-test-1');
    });

    it('should fail when no credentials are found', async () => {
      // Mock empty credentials response
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.activate('workflow-test-2', {
        credentialId: 'invalid-cred',
        triggerId: 'form_response',
        actionParams: { formId: 'form-123' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('access');
    });

    it('should fail when no form ID is provided', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-access-token' },
          },
        ],
      });

      const result = await service.activate('workflow-test-3', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('form');
    });

    it('should fetch credentials from database when credentialId is provided', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'db-fetched-token' },
          },
        ],
      });

      // Mock: create webhook
      nock(BASE_URL)
        .put(/\/forms\/form-456\/webhooks\/.*/)
        .reply(200, {
          id: 'webhook-456',
          enabled: true,
        });

      const result = await service.activate('workflow-test-4', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'form-456' },
      });

      expect(result.success).toBe(true);
    });

    it('should handle API errors during webhook creation', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-token' },
          },
        ],
      });

      nock(BASE_URL)
        .put(/\/forms\/form-123\/webhooks\/.*/)
        .reply(500, { description: 'Internal server error' });

      const result = await service.activate('workflow-test-error', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'form-123' },
      });

      expect(result.success).toBe(false);
    });

    it('should handle form not found error', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-token' },
          },
        ],
      });

      nock(BASE_URL)
        .put(/\/forms\/nonexistent\/webhooks\/.*/)
        .reply(404, { description: 'Form not found' });

      const result = await service.activate('workflow-test-notfound', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'nonexistent' },
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should delete webhook successfully', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-token' },
          },
        ],
      });

      // First, activate to set up internal state
      nock(BASE_URL)
        .put(/\/forms\/form-123\/webhooks\/.*/)
        .reply(200, { id: 'webhook-to-delete' });

      await service.activate('workflow-to-deactivate', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'form-123' },
      });

      // Mock: delete webhook
      nock(BASE_URL)
        .delete(/\/forms\/form-123\/webhooks\/.*/)
        .reply(204);

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
    });

    it('should handle missing webhook data gracefully', async () => {
      const result = await service.deactivate('workflow-no-webhook');

      // Should still succeed (nothing to delete)
      expect(result.success).toBe(true);
    });

    it('should handle API error during webhook deletion gracefully', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-token' },
          },
        ],
      });

      // Activate first
      nock(BASE_URL)
        .put(/\/forms\/form-123\/webhooks\/.*/)
        .reply(200, { id: 'webhook-delete-error' });

      await service.activate('workflow-delete-error', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'form-123' },
      });

      // Mock: delete webhook fails
      nock(BASE_URL)
        .delete(/\/forms\/form-123\/webhooks\/.*/)
        .reply(404, { description: 'Webhook not found' });

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
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-token' },
          },
        ],
      });

      // First activate
      nock(BASE_URL)
        .put(/\/forms\/form-123\/webhooks\/.*/)
        .reply(200, { id: 'status-test-webhook' });

      await service.activate('status-test-workflow', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'form-123' },
      });

      // Then check status
      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.metadata?.formId).toBe('form-123');
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return TYPEFORM trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBeDefined();
    });
  });

  // ===========================================
  // Signature Validation Tests
  // ===========================================
  describe('validateSignature', () => {
    it('should return false for invalid signature', async () => {
      // Mock database query for credentials
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { access_token: 'mock-token' },
          },
        ],
      });

      // Activate to get a secret token
      nock(BASE_URL)
        .put(/\/forms\/form-123\/webhooks\/.*/)
        .reply(200, { id: 'sig-test-webhook' });

      await service.activate('sig-test-workflow', {
        credentialId: 'cred-123',
        triggerId: 'form_response',
        actionParams: { formId: 'form-123' },
      });

      const isValid = service.validateSignature(
        'sig-test-workflow',
        'raw-body-content',
        'invalid-signature'
      );

      // Should fail because signature doesn't match
      expect(isValid).toBe(false);
    });

    it('should return true when no secret is stored (graceful fallback)', () => {
      const isValid = service.validateSignature(
        'unknown-workflow',
        'raw-body',
        'some-signature'
      );

      // Service returns true when no secret is stored (graceful fallback)
      expect(isValid).toBe(true);
    });
  });
});
