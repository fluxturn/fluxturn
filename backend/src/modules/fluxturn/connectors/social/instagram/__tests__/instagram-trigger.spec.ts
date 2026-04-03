/**
 * Instagram Trigger Service Tests
 *
 * Tests for the Instagram trigger activation/deactivation using mocked HTTP responses.
 * Instagram uses Facebook Graph API webhooks for event notifications.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { InstagramTriggerService } from '../instagram-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('InstagramTriggerService', () => {
  let service: InstagramTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://graph.facebook.com/v18.0';
  const MOCK_APP_ID = 'mock-instagram-app-id';
  const MOCK_INSTAGRAM_ACCOUNT_ID = '17841400008460056';

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService({
      APP_URL: 'http://localhost:3000',
    });

    // Create service directly with mocked dependencies
    service = new InstagramTriggerService(
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
    it('should activate trigger successfully for new_media', async () => {
      // Mock: fetch credentials from database
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      // Mock: webhook subscription
      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      const result = await service.activate('workflow-test-1', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated successfully');
      expect(result.data?.triggerId).toBe('new_media');
      expect(result.data?.subscriptions).toContain('media');
    });

    it('should activate trigger successfully for new_comment', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      const result = await service.activate('workflow-comment-trigger', {
        credentialId: 'cred-123',
        triggerId: 'new_comment',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('new_comment');
      expect(result.data?.subscriptions).toContain('comments');
    });

    it('should activate trigger successfully for new_mention', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      const result = await service.activate('workflow-mention-trigger', {
        credentialId: 'cred-123',
        triggerId: 'new_mention',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('new_mention');
      expect(result.data?.subscriptions).toContain('mentions');
    });

    it('should fail when no access token is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.activate('workflow-no-token', {
        credentialId: 'invalid-cred',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Access token');
    });

    it('should fail when no app ID is provided', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
            },
          },
        ],
      });

      const result = await service.activate('workflow-no-app-id', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('App ID');
    });

    it('should fail when no Instagram account ID is provided', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      const result = await service.activate('workflow-no-account-id', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Instagram account ID');
    });

    it('should fail when webhook subscription fails', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(400, {
          error: {
            message: 'Invalid permissions',
            code: 200,
          },
        });

      const result = await service.activate('workflow-subscription-fail', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to subscribe');
    });

    it('should handle actionParams for backward compatibility', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      const result = await service.activate('workflow-action-params', {
        credentialId: 'cred-123',
        actionParams: {
          triggerId: 'new_media',
          appId: MOCK_APP_ID,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should use default trigger ID when not specified', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      const result = await service.activate('workflow-default-trigger', {
        credentialId: 'cred-123',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('new_media');
    });

    it('should handle direct credentials without database lookup', async () => {
      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      const result = await service.activate('workflow-direct-creds', {
        accessToken: 'direct-access-token',
        instagramAccountId: MOCK_INSTAGRAM_ACCOUNT_ID,
        appId: MOCK_APP_ID,
        triggerId: 'new_media',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate trigger successfully', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('workflow-to-deactivate', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      // Mock unsubscribe
      nock(BASE_URL)
        .delete(`/${MOCK_APP_ID}/subscriptions`)
        .query({ object: 'instagram', access_token: /.+/ })
        .reply(200, { success: true });

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated');
    });

    it('should handle deactivating non-existent trigger', async () => {
      const result = await service.deactivate('workflow-nonexistent');

      expect(result.success).toBe(true);
      expect(result.message).toContain('was not active');
    });

    it('should handle unsubscription failure gracefully', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('workflow-unsub-fail', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      // Mock unsubscribe failure
      nock(BASE_URL)
        .delete(`/${MOCK_APP_ID}/subscriptions`)
        .query({ object: 'instagram', access_token: /.+/ })
        .reply(500, { error: 'Internal error' });

      // Should still succeed (soft failure)
      const result = await service.deactivate('workflow-unsub-fail');

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
      expect(status.type).toBe(TriggerType.INSTAGRAM);
      expect(status.message).toBe('Not active');
    });

    it('should return active status after activation', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('status-test-workflow', {
        credentialId: 'cred-123',
        triggerId: 'new_comment',
        appId: MOCK_APP_ID,
      });

      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.INSTAGRAM);
      expect(status.metadata?.triggerId).toBe('new_comment');
      expect(status.metadata?.subscriptions).toContain('comments');
      expect(status.metadata?.instagramAccountId).toBe(MOCK_INSTAGRAM_ACCOUNT_ID);
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return INSTAGRAM trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBe(TriggerType.INSTAGRAM);
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
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('workflow-active-trigger', {
        credentialId: 'cred-123',
        triggerId: 'new_mention',
        appId: MOCK_APP_ID,
      });

      const activeTrigger = service.getActiveTrigger('workflow-active-trigger');

      expect(activeTrigger).toBeDefined();
      expect(activeTrigger?.triggerId).toBe('new_mention');
      expect(activeTrigger?.subscriptions).toContain('mentions');
      expect(activeTrigger?.instagramAccountId).toBe(MOCK_INSTAGRAM_ACCOUNT_ID);
    });

    it('should return undefined for unknown workflow', () => {
      const activeTrigger = service.getActiveTrigger('unknown-workflow');
      expect(activeTrigger).toBeUndefined();
    });
  });

  // ===========================================
  // Verify Token Tests
  // ===========================================
  describe('validateVerifyToken', () => {
    it('should validate correct verify token', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      const activationResult = await service.activate('workflow-verify-token', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      const verifyToken = activationResult.data?.verifyToken;
      const isValid = service.validateVerifyToken('workflow-verify-token', verifyToken);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect verify token', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('workflow-wrong-token', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      const isValid = service.validateVerifyToken('workflow-wrong-token', 'wrong-token');

      expect(isValid).toBe(false);
    });

    it('should return false for non-existent workflow', () => {
      const isValid = service.validateVerifyToken('non-existent', 'any-token');
      expect(isValid).toBe(false);
    });

    it('should return false when no token provided', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('workflow-no-token-provided', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      const isValid = service.validateVerifyToken('workflow-no-token-provided', undefined);

      expect(isValid).toBe(false);
    });
  });

  // ===========================================
  // Signature Validation Tests
  // ===========================================
  describe('validateSignature', () => {
    it('should allow when no app secret is configured', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
              // No appSecret
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('workflow-no-secret', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      const isValid = service.validateSignature('{}', 'sha256=anything', 'workflow-no-secret');

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature format', async () => {
      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });

      await service.activate('workflow-invalid-sig', {
        accessToken: 'direct-token',
        instagramAccountId: MOCK_INSTAGRAM_ACCOUNT_ID,
        appId: MOCK_APP_ID,
        appSecret: 'test-secret',
        triggerId: 'new_media',
      });

      const isValid = service.validateSignature('{}', 'invalid-format', 'workflow-invalid-sig');

      expect(isValid).toBe(false);
    });
  });

  // ===========================================
  // Webhook Event Processing Tests
  // ===========================================
  describe('processWebhookEvent', () => {
    beforeEach(async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              access_token: 'mock-access-token',
              instagram_account_id: MOCK_INSTAGRAM_ACCOUNT_ID,
              appId: MOCK_APP_ID,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post(`/${MOCK_APP_ID}/subscriptions`)
        .reply(200, { success: true });
    });

    it('should process new_media event correctly', async () => {
      await service.activate('workflow-media-event', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      const event = {
        entry: [
          {
            changes: [
              {
                field: 'media',
                value: {
                  id: '12345',
                  media_type: 'IMAGE',
                  media_url: 'https://example.com/image.jpg',
                  caption: 'Test post',
                },
              },
            ],
          },
        ],
      };

      const result = service.processWebhookEvent('workflow-media-event', event);

      expect(result).toEqual({
        id: '12345',
        media_type: 'IMAGE',
        media_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        timestamp: expect.any(String),
      });
    });

    it('should process new_comment event correctly', async () => {
      await service.activate('workflow-comment-event', {
        credentialId: 'cred-123',
        triggerId: 'new_comment',
        appId: MOCK_APP_ID,
      });

      const event = {
        entry: [
          {
            changes: [
              {
                field: 'comments',
                value: {
                  id: 'comment-123',
                  text: 'Great post!',
                  from: {
                    id: 'user-456',
                    username: 'testuser',
                  },
                  media_id: 'media-789',
                  created_time: '2024-01-15T10:00:00Z',
                },
              },
            ],
          },
        ],
      };

      const result = service.processWebhookEvent('workflow-comment-event', event);

      expect(result).toEqual({
        id: 'comment-123',
        text: 'Great post!',
        from: {
          id: 'user-456',
          username: 'testuser',
        },
        media_id: 'media-789',
        timestamp: '2024-01-15T10:00:00Z',
      });
    });

    it('should process new_mention event correctly', async () => {
      await service.activate('workflow-mention-event', {
        credentialId: 'cred-123',
        triggerId: 'new_mention',
        appId: MOCK_APP_ID,
      });

      const event = {
        entry: [
          {
            changes: [
              {
                field: 'mentions',
                value: {
                  id: 'mention-123',
                  text: '@myaccount check this out!',
                  from: {
                    id: 'user-789',
                    username: 'mentioner',
                  },
                  media_id: 'media-999',
                },
              },
            ],
          },
        ],
      };

      const result = service.processWebhookEvent('workflow-mention-event', event);

      expect(result).toEqual({
        id: 'mention-123',
        text: '@myaccount check this out!',
        from: {
          id: 'user-789',
          username: 'mentioner',
        },
        media_id: 'media-999',
        timestamp: expect.any(String),
      });
    });

    it('should return null for non-existent workflow', () => {
      const event = { entry: [{ changes: [{ field: 'media', value: {} }] }] };
      const result = service.processWebhookEvent('non-existent-workflow', event);

      expect(result).toBeNull();
    });

    it('should return null for empty event', async () => {
      await service.activate('workflow-empty-event', {
        credentialId: 'cred-123',
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      const result = service.processWebhookEvent('workflow-empty-event', {});

      expect(result).toBeNull();
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
        triggerId: 'new_media',
        appId: MOCK_APP_ID,
      });

      expect(result.success).toBe(false);
    });
  });
});
