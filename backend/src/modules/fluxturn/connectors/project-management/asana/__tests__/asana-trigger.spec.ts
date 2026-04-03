/**
 * Asana Trigger Service Tests
 *
 * Tests for the Asana trigger activation/deactivation using mocked HTTP responses.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { AsanaTriggerService } from '../asana-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('AsanaTriggerService', () => {
  let service: AsanaTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const BASE_URL = 'https://app.asana.com/api/1.0';

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService();

    // Create service directly with mocked dependencies
    service = new AsanaTriggerService(
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
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      // Mock: create webhook
      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'webhook-123',
            resource: { gid: 'project-456' },
            target: 'http://localhost:3000/api/v1/webhooks/asana/workflow-test-1',
          },
        });

      const result = await service.activate('workflow-test-1', {
        credentialId: 'cred-123',
        projectId: 'project-456',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookGid).toBe('webhook-123');
      expect(result.data?.webhookUrl).toContain('workflow-test-1');
    });

    it('should create webhook with workspaceId when projectId is not provided', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'webhook-456',
            resource: { gid: 'workspace-789' },
          },
        });

      const result = await service.activate('workflow-workspace-1', {
        credentialId: 'cred-123',
        workspaceId: 'workspace-789',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookGid).toBe('webhook-456');
      expect(result.data?.resourceGid).toBe('workspace-789');
    });

    it('should fail when no projectId or workspaceId is provided', async () => {
      const result = await service.activate('workflow-no-resource', {
        credentialId: 'cred-123',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project ID or Workspace ID is required');
    });

    it('should fail when no access token is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.activate('workflow-no-token', {
        credentialId: 'invalid-cred',
        projectId: 'project-123',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('access token');
    });

    it('should handle API error during webhook creation', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(500, {
          errors: [{ message: 'Internal server error' }],
        });

      const result = await service.activate('workflow-api-error', {
        credentialId: 'cred-123',
        projectId: 'project-456',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
    });

    it('should handle different trigger types correctly', async () => {
      const triggerTypes = [
        { triggerId: 'task_created', expectedFilter: { resource_type: 'task', action: 'added' } },
        { triggerId: 'task_updated', expectedFilter: { resource_type: 'task', action: 'changed' } },
        { triggerId: 'task_completed', expectedFilter: { resource_type: 'task', action: 'changed' } },
        { triggerId: 'project_created', expectedFilter: { resource_type: 'project', action: 'added' } },
        { triggerId: 'comment_added', expectedFilter: { resource_type: 'story', action: 'added' } },
      ];

      for (const { triggerId, expectedFilter } of triggerTypes) {
        nock.cleanAll();

        mockPlatformService.query.mockResolvedValueOnce({
          rows: [
            {
              credentials: { accessToken: 'mock-access-token' },
            },
          ],
        });

        let capturedFilters: any[] = [];
        nock(BASE_URL)
          .post('/webhooks', (body: any) => {
            capturedFilters = body.data?.filters || [];
            return true;
          })
          .reply(200, {
            data: {
              gid: `webhook-${triggerId}`,
            },
          });

        await service.activate(`workflow-${triggerId}`, {
          credentialId: 'cred-123',
          projectId: 'project-456',
          triggerId,
        });

        // Verify the correct filters were sent
        expect(capturedFilters).toContainEqual(expectedFilter);
      }
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
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'webhook-action-params',
          },
        });

      const result = await service.activate('workflow-action-params', {
        credentialId: 'cred-123',
        actionParams: {
          projectId: 'project-from-action-params',
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
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'webhook-to-delete',
          },
        });

      await service.activate('workflow-to-deactivate', {
        credentialId: 'cred-123',
        projectId: 'project-456',
        triggerId: 'task_created',
      });

      // Mock: delete webhook
      nock(BASE_URL)
        .delete('/webhooks/webhook-to-delete')
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
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'webhook-delete-error',
          },
        });

      await service.activate('workflow-delete-error', {
        credentialId: 'cred-123',
        projectId: 'project-456',
        triggerId: 'task_created',
      });

      // Mock: delete webhook fails
      nock(BASE_URL)
        .delete('/webhooks/webhook-delete-error')
        .reply(404, {
          errors: [{ message: 'Webhook not found' }],
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
      expect(status.type).toBe(TriggerType.ASANA);
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
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'status-test-webhook',
          },
        });

      await service.activate('status-test-workflow', {
        credentialId: 'cred-123',
        projectId: 'project-456',
        triggerId: 'task_created',
      });

      // Then check status
      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.ASANA);
      expect(status.metadata?.webhookGid).toBe('status-test-webhook');
      expect(status.metadata?.triggerId).toBe('task_created');
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return ASANA trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBe(TriggerType.ASANA);
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
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'hook-secret-webhook',
          },
        });

      await service.activate('workflow-hook-secret', {
        credentialId: 'cred-123',
        projectId: 'project-456',
        triggerId: 'task_created',
      });

      // Store hook secret
      const secret = 'asana-hook-secret-12345';
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
            credentials: { accessToken: 'mock-access-token' },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhooks')
        .reply(200, {
          data: {
            gid: 'active-trigger-webhook',
          },
        });

      await service.activate('workflow-active-trigger', {
        credentialId: 'cred-123',
        projectId: 'project-789',
        triggerId: 'task_updated',
      });

      const activeTrigger = service.getActiveTrigger('workflow-active-trigger');

      expect(activeTrigger).toBeDefined();
      expect(activeTrigger?.workflowId).toBe('workflow-active-trigger');
      expect(activeTrigger?.triggerId).toBe('task_updated');
      expect(activeTrigger?.config.webhookGid).toBe('active-trigger-webhook');
      expect(activeTrigger?.config.resourceGid).toBe('project-789');
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
        projectId: 'project-456',
        triggerId: 'task_created',
      });

      expect(result.success).toBe(false);
    });
  });
});
