/**
 * ClickUp Trigger Service Tests
 *
 * Tests for the ClickUp trigger activation/deactivation using mocked HTTP responses.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { ClickUpTriggerService } from '../clickup-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('ClickUpTriggerService', () => {
  let service: ClickUpTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://api.clickup.com/api/v2';

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService();

    // Create service directly with mocked dependencies
    service = new ClickUpTriggerService(
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
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      // Mock: create webhook
      nock(BASE_URL)
        .post('/team/team-123/webhook')
        .reply(200, {
          id: 'webhook-123',
          endpoint: 'http://localhost:3000/api/v1/webhooks/clickup/workflow-test-1',
          events: ['taskCreated'],
        });

      const result = await service.activate('workflow-test-1', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBe('webhook-123');
      expect(result.data?.webhookUrl).toContain('workflow-test-1');
    });

    it('should create webhook with space filter when spaceId is provided', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      let capturedBody: any = {};
      nock(BASE_URL)
        .post('/team/team-123/webhook', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, {
          id: 'webhook-456',
          events: ['taskCreated'],
        });

      const result = await service.activate('workflow-space-filter', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        spaceId: 'space-789',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(true);
      expect(capturedBody.space_id).toBe('space-789');
    });

    it('should create webhook with list filter when listId is provided', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      let capturedBody: any = {};
      nock(BASE_URL)
        .post('/team/team-123/webhook', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, {
          id: 'webhook-list',
          events: ['taskCreated'],
        });

      const result = await service.activate('workflow-list-filter', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        listId: 'list-999',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(true);
      expect(capturedBody.list_id).toBe('list-999');
    });

    it('should fail when no teamId is provided', async () => {
      const result = await service.activate('workflow-no-team', {
        credentialId: 'cred-123',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Team ID');
    });

    it('should fail when no access token is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.activate('workflow-no-token', {
        credentialId: 'invalid-cred',
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('access token');
    });

    it('should handle API error during webhook creation', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/team/team-123/webhook')
        .reply(500, {
          err: 'Internal server error',
          ECODE: 'SERVER_001',
        });

      const result = await service.activate('workflow-api-error', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
    });

    it('should handle different trigger types correctly', async () => {
      const triggerTypes = [
        { triggerId: 'task_created', expectedEvents: ['taskCreated'] },
        { triggerId: 'task_updated', expectedEvents: ['taskUpdated'] },
        { triggerId: 'task_deleted', expectedEvents: ['taskDeleted'] },
        { triggerId: 'task_status_updated', expectedEvents: ['taskStatusUpdated'] },
        { triggerId: 'task_priority_updated', expectedEvents: ['taskPriorityUpdated'] },
        { triggerId: 'task_assignee_updated', expectedEvents: ['taskAssigneeUpdated'] },
        { triggerId: 'task_comment_posted', expectedEvents: ['taskCommentPosted'] },
        { triggerId: 'list_created', expectedEvents: ['listCreated'] },
        { triggerId: 'goal_created', expectedEvents: ['goalCreated'] },
        { triggerId: 'goal_updated', expectedEvents: ['goalUpdated'] },
      ];

      for (const { triggerId, expectedEvents } of triggerTypes) {
        nock.cleanAll();

        mockPlatformService.query.mockResolvedValueOnce({
          rows: [
            {
              credentials: { accessToken: 'pk_mock_access_token' },
            },
          ],
        });

        let capturedEvents: string[] = [];
        nock(BASE_URL)
          .post('/team/team-123/webhook', (body: any) => {
            capturedEvents = body.events || [];
            return true;
          })
          .reply(200, {
            id: `webhook-${triggerId}`,
          });

        await service.activate(`workflow-${triggerId}`, {
          credentialId: 'cred-123',
          teamId: 'team-123',
          triggerId,
        });

        expect(capturedEvents).toEqual(expectedEvents);
      }
    });

    it('should handle actionParams for backward compatibility', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/team/team-action-params/webhook')
        .reply(200, {
          id: 'webhook-action-params',
        });

      const result = await service.activate('workflow-action-params', {
        credentialId: 'cred-123',
        actionParams: {
          teamId: 'team-action-params',
          triggerId: 'task_updated',
        },
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
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/team/team-123/webhook')
        .reply(200, {
          id: 'webhook-to-delete',
        });

      await service.activate('workflow-to-deactivate', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      // Mock: delete webhook
      nock(BASE_URL)
        .delete('/webhook/webhook-to-delete')
        .reply(200);

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
    });

    it('should handle missing active trigger gracefully', async () => {
      const result = await service.deactivate('workflow-no-trigger');

      // Should still succeed (nothing to delete)
      expect(result.success).toBe(true);
    });

    it('should handle API error during webhook deletion', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/team/team-123/webhook')
        .reply(200, {
          id: 'webhook-delete-error',
        });

      await service.activate('workflow-delete-error', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      // Mock: delete webhook fails
      nock(BASE_URL)
        .delete('/webhook/webhook-delete-error')
        .reply(404, {
          err: 'Webhook not found',
          ECODE: 'WEBHOOK_001',
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
      expect(status.type).toBe(TriggerType.CLICKUP);
    });

    it('should return active status after activation', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/team/team-123/webhook')
        .reply(200, {
          id: 'status-test-webhook',
        });

      await service.activate('status-test-workflow', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      // Then check status
      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.CLICKUP);
      expect(status.metadata?.webhookId).toBe('status-test-webhook');
      expect(status.metadata?.triggerId).toBe('task_created');
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return CLICKUP trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBe(TriggerType.CLICKUP);
    });
  });

  // ===========================================
  // Hook Secret Tests
  // ===========================================
  describe('hook secrets', () => {
    it('should store and retrieve hook secret', async () => {
      // First activate to have an active trigger
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/team/team-123/webhook')
        .reply(200, {
          id: 'hook-secret-webhook',
        });

      await service.activate('workflow-hook-secret', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      // Store hook secret
      const secret = 'clickup-hook-secret-12345';
      service.storeHookSecret('workflow-hook-secret', secret);

      // Retrieve hook secret
      const retrievedSecret = service.getHookSecret('workflow-hook-secret');
      expect(retrievedSecret).toBe(secret);
    });

    it('should return undefined for unknown workflow', () => {
      const secret = service.getHookSecret('unknown-workflow');
      expect(secret).toBeUndefined();
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
            credentials: { accessToken: 'pk_mock_access_token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/team/team-123/webhook')
        .reply(200, {
          id: 'active-trigger-webhook',
        });

      await service.activate('workflow-active-trigger', {
        credentialId: 'cred-123',
        teamId: 'team-123',
        triggerId: 'task_updated',
      });

      const activeTrigger = service.getActiveTrigger('workflow-active-trigger');

      expect(activeTrigger).toBeDefined();
      expect(activeTrigger?.workflowId).toBe('workflow-active-trigger');
      expect(activeTrigger?.triggerId).toBe('task_updated');
      expect(activeTrigger?.config.webhookId).toBe('active-trigger-webhook');
      expect(activeTrigger?.config.teamId).toBe('team-123');
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
        teamId: 'team-123',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
    });
  });
});
