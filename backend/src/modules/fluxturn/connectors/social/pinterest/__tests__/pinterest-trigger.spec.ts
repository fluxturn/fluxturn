/**
 * Pinterest Trigger Service Tests
 *
 * Tests for the Pinterest trigger activation/deactivation using mocked HTTP responses.
 * Pinterest uses polling-based triggers (no webhooks).
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { PinterestTriggerService } from '../pinterest-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('PinterestTriggerService', () => {
  let service: PinterestTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://api.pinterest.com';

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService();

    // Create service directly with mocked dependencies
    service = new PinterestTriggerService(
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
    it('should activate trigger successfully for new_pin_created', async () => {
      // Mock: fetch credentials from database
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      // Mock: validate credentials
      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, {
          username: 'test_user',
        });

      // Mock: fetch boards for initial state
      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, {
          items: [{ id: 'board-1' }],
        });

      // Mock: fetch pins from board
      nock(BASE_URL)
        .get('/v5/boards/board-1/pins')
        .query(true)
        .reply(200, {
          items: [{ id: 'pin-1' }, { id: 'pin-2' }],
        });

      const result = await service.activate('workflow-test-1', {
        credentialId: 'cred-123',
        triggerId: 'new_pin_created',
        pollingInterval: 5,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('polling mode');
      expect(result.data?.triggerId).toBe('new_pin_created');
    });

    it('should activate trigger successfully for new_board_created', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      // Mock: validate credentials
      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, {
          username: 'test_user',
        });

      // Mock: fetch boards for initial state
      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, {
          items: [{ id: 'board-1' }, { id: 'board-2' }],
        });

      const result = await service.activate('workflow-board-trigger', {
        credentialId: 'cred-123',
        triggerId: 'new_board_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('new_board_created');
    });

    it('should fail when no access token is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.activate('workflow-no-token', {
        credentialId: 'invalid-cred',
        triggerId: 'new_pin_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('access token');
    });

    it('should fail when credentials validation fails', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'invalid-token' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(401, {
          code: 401,
          message: 'Invalid access token',
        });

      const result = await service.activate('workflow-invalid-token', {
        credentialId: 'cred-123',
        triggerId: 'new_pin_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('validate');
    });

    it('should handle actionParams for backward compatibility', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, { username: 'test_user' });

      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, { items: [] });

      const result = await service.activate('workflow-action-params', {
        credentialId: 'cred-123',
        actionParams: {
          triggerId: 'new_board_created',
          pollingInterval: 10,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should use default trigger ID when not specified', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, { username: 'test_user' });

      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, { items: [{ id: 'board-1' }] });

      nock(BASE_URL)
        .get('/v5/boards/board-1/pins')
        .query(true)
        .reply(200, { items: [] });

      const result = await service.activate('workflow-default-trigger', {
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('new_pin_created');
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
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, { username: 'test_user' });

      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, { items: [] });

      await service.activate('workflow-to-deactivate', {
        credentialId: 'cred-123',
        triggerId: 'new_board_created',
      });

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
    });

    it('should handle deactivating non-existent trigger', async () => {
      const result = await service.deactivate('workflow-nonexistent');

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
      expect(status.type).toBe(TriggerType.PINTEREST);
    });

    it('should return active status after activation', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, { username: 'test_user' });

      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, { items: [] });

      await service.activate('status-test-workflow', {
        credentialId: 'cred-123',
        triggerId: 'new_board_created',
        pollingInterval: 10,
      });

      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.PINTEREST);
      expect(status.metadata?.triggerId).toBe('new_board_created');
      expect(status.metadata?.pollingInterval).toContain('10');
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return PINTEREST trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBe(TriggerType.PINTEREST);
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
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, { username: 'test_user' });

      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, { items: [] });

      await service.activate('workflow-active-trigger', {
        credentialId: 'cred-123',
        triggerId: 'new_board_created',
      });

      const activeTrigger = service.getActiveTrigger('workflow-active-trigger');

      expect(activeTrigger).toBeDefined();
      expect(activeTrigger?.workflowId).toBe('workflow-active-trigger');
      expect(activeTrigger?.triggerId).toBe('new_board_created');
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
        triggerId: 'new_pin_created',
      });

      expect(result.success).toBe(false);
    });
  });
});
