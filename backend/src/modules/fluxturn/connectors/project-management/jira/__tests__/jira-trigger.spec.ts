/**
 * Jira Trigger Service Tests
 *
 * Tests for the Jira trigger activation/deactivation using mocked HTTP responses.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { JiraTriggerService } from '../jira-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';

describe('JiraTriggerService', () => {
  let service: JiraTriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;
  const MOCK_DOMAIN = 'test-company.atlassian.net';
  const BASE_URL = `https://${MOCK_DOMAIN}/rest/api/3`;

  beforeEach(() => {
    nock.cleanAll();

    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService({
      APP_URL: 'http://localhost:3000',
    });

    service = new JiraTriggerService(
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
    it('should activate trigger successfully for issue_created', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-123' });

      const result = await service.activate('workflow-test-1', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('activated successfully');
      expect(result.data?.triggerId).toBe('issue_created');
      expect(result.data?.events).toContain('jira:issue_created');
    });

    it('should activate trigger successfully for issue_updated', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-456' });

      const result = await service.activate('workflow-updated', {
        credentialId: 'cred-123',
        triggerId: 'issue_updated',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('issue_updated');
      expect(result.data?.events).toContain('jira:issue_updated');
    });

    it('should activate trigger for comment_created', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-789' });

      const result = await service.activate('workflow-comment', {
        credentialId: 'cred-123',
        triggerId: 'comment_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('comment_created');
      expect(result.data?.events).toContain('comment_created');
    });

    it('should activate trigger for sprint_started', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-sprint' });

      const result = await service.activate('workflow-sprint', {
        credentialId: 'cred-123',
        triggerId: 'sprint_started',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('sprint_started');
      expect(result.data?.events).toContain('sprint_started');
    });

    it('should fail when no email is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      const result = await service.activate('workflow-no-email', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Email');
    });

    it('should fail when no API token is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      const result = await service.activate('workflow-no-token', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('API Token');
    });

    it('should fail when no domain is available', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
            },
          },
        ],
      });

      const result = await service.activate('workflow-no-domain', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('domain');
    });

    it('should handle webhook registration failure gracefully (403)', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      // Webhook API returns 403 (forbidden - requires admin)
      nock(BASE_URL)
        .post('/webhook')
        .reply(403, { errorMessages: ['Admin permission required'] });

      // Should still succeed (manual webhook setup may be required)
      const result = await service.activate('workflow-webhook-403', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookId).toBeUndefined();
    });

    it('should handle webhook registration failure (500)', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(500, { errorMessages: ['Internal server error'] });

      const result = await service.activate('workflow-webhook-500', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to register');
    });

    it('should handle actionParams for backward compatibility', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-action-params' });

      const result = await service.activate('workflow-action-params', {
        credentialId: 'cred-123',
        actionParams: {
          triggerId: 'issue_deleted',
          projectKey: 'PROJ',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('issue_deleted');
      expect(result.data?.projectKey).toBe('PROJ');
    });

    it('should use default trigger ID when not specified', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-default' });

      const result = await service.activate('workflow-default', {
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('issue_created');
    });

    it('should handle direct credentials without database lookup', async () => {
      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-direct' });

      const result = await service.activate('workflow-direct', {
        email: 'direct@test.com',
        apiToken: 'direct-api-token',
        domain: MOCK_DOMAIN,
        triggerId: 'project_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('project_created');
    });

    it('should include JQL filter when projectKey is provided', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      let capturedBody: any;
      nock(BASE_URL)
        .post('/webhook', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, { id: 'webhook-jql' });

      await service.activate('workflow-jql', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
        projectKey: 'TEST',
      });

      expect(capturedBody.filters).toBeDefined();
      expect(capturedBody.filters['issue-related-events-section']).toContain('TEST');
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
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-to-delete' });

      await service.activate('workflow-to-deactivate', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      // Mock delete webhook
      nock(BASE_URL)
        .delete('/webhook/webhook-to-delete')
        .reply(204);

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated');
    });

    it('should handle deactivating non-existent trigger', async () => {
      const result = await service.deactivate('workflow-nonexistent');

      expect(result.success).toBe(true);
      expect(result.message).toContain('was not active');
    });

    it('should handle webhook deletion failure gracefully', async () => {
      // First activate
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-delete-fail' });

      await service.activate('workflow-delete-fail', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      // Mock delete failure
      nock(BASE_URL)
        .delete('/webhook/webhook-delete-fail')
        .reply(500, { error: 'Internal error' });

      // Should still succeed (soft failure)
      const result = await service.deactivate('workflow-delete-fail');

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
      expect(status.type).toBe(TriggerType.JIRA);
      expect(status.message).toBe('Not active');
    });

    it('should return active status after activation', async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-status' });

      await service.activate('status-test-workflow', {
        credentialId: 'cred-123',
        triggerId: 'comment_deleted',
      });

      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.JIRA);
      expect(status.metadata?.triggerId).toBe('comment_deleted');
      expect(status.metadata?.domain).toBe(MOCK_DOMAIN);
    });
  });

  // ===========================================
  // Trigger Type Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return JIRA trigger type', () => {
      const type = service.getTriggerType();
      expect(type).toBe(TriggerType.JIRA);
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
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-active' });

      await service.activate('workflow-active-trigger', {
        credentialId: 'cred-123',
        triggerId: 'worklog_created',
        projectKey: 'MYPROJ',
      });

      const activeTrigger = service.getActiveTrigger('workflow-active-trigger');

      expect(activeTrigger).toBeDefined();
      expect(activeTrigger?.triggerId).toBe('worklog_created');
      expect(activeTrigger?.projectKey).toBe('MYPROJ');
      expect(activeTrigger?.domain).toBe(MOCK_DOMAIN);
    });

    it('should return undefined for unknown workflow', () => {
      const activeTrigger = service.getActiveTrigger('unknown-workflow');
      expect(activeTrigger).toBeUndefined();
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
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-event' });
    });

    it('should process issue_created event correctly', async () => {
      await service.activate('workflow-issue-event', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      const event = {
        webhookEvent: 'jira:issue_created',
        issue: {
          id: '12345',
          key: 'PROJ-123',
          self: 'https://test.atlassian.net/rest/api/3/issue/12345',
          fields: {
            summary: 'Test issue',
            status: { name: 'To Do' },
          },
        },
        user: {
          accountId: 'user-123',
          displayName: 'Test User',
        },
        changelog: {
          items: [],
        },
      };

      const result = service.processWebhookEvent('workflow-issue-event', event);

      expect(result).toBeDefined();
      expect(result.event).toBe('issue_created');
      expect(result.issue.key).toBe('PROJ-123');
      expect(result.user.accountId).toBe('user-123');
    });

    it('should process comment_created event correctly', async () => {
      await service.activate('workflow-comment-event', {
        credentialId: 'cred-123',
        triggerId: 'comment_created',
      });

      const event = {
        webhookEvent: 'comment_created',
        comment: {
          id: 'comment-456',
          body: 'Test comment',
          author: { accountId: 'author-123' },
        },
        issue: {
          id: '12345',
          key: 'PROJ-123',
        },
        user: {
          accountId: 'user-123',
        },
      };

      const result = service.processWebhookEvent('workflow-comment-event', event);

      expect(result).toBeDefined();
      expect(result.event).toBe('comment_created');
      expect(result.comment).toBeDefined();
      expect(result.issue.key).toBe('PROJ-123');
    });

    it('should process sprint_started event correctly', async () => {
      await service.activate('workflow-sprint-event', {
        credentialId: 'cred-123',
        triggerId: 'sprint_started',
      });

      const event = {
        webhookEvent: 'sprint_started',
        sprint: {
          id: 'sprint-789',
          name: 'Sprint 1',
          state: 'active',
          startDate: '2024-01-01',
          endDate: '2024-01-14',
        },
      };

      const result = service.processWebhookEvent('workflow-sprint-event', event);

      expect(result).toBeDefined();
      expect(result.event).toBe('sprint_started');
      expect(result.sprint.name).toBe('Sprint 1');
    });

    it('should return null for non-existent workflow', () => {
      const result = service.processWebhookEvent('non-existent', { webhookEvent: 'test' });
      expect(result).toBeNull();
    });
  });

  // ===========================================
  // Should Trigger Tests
  // ===========================================
  describe('shouldTrigger', () => {
    beforeEach(async () => {
      mockPlatformService.query.mockResolvedValueOnce({
        rows: [
          {
            credentials: {
              email: 'test@test.com',
              apiToken: 'mock-api-token',
              domain: MOCK_DOMAIN,
            },
          },
        ],
      });

      nock(BASE_URL)
        .post('/webhook')
        .reply(200, { id: 'webhook-should-trigger' });
    });

    it('should return true when event matches trigger', async () => {
      await service.activate('workflow-match', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      const result = service.shouldTrigger('workflow-match', {
        webhookEvent: 'jira:issue_created',
      });

      expect(result).toBe(true);
    });

    it('should return false when event does not match trigger', async () => {
      await service.activate('workflow-no-match', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
      });

      const result = service.shouldTrigger('workflow-no-match', {
        webhookEvent: 'jira:issue_deleted',
      });

      expect(result).toBe(false);
    });

    it('should return false for non-existent workflow', () => {
      const result = service.shouldTrigger('non-existent', {
        webhookEvent: 'jira:issue_created',
      });

      expect(result).toBe(false);
    });

    it('should filter by project key when configured', async () => {
      await service.activate('workflow-project-filter', {
        credentialId: 'cred-123',
        triggerId: 'issue_created',
        projectKey: 'PROJ',
      });

      const matchResult = service.shouldTrigger('workflow-project-filter', {
        webhookEvent: 'jira:issue_created',
        issue: {
          fields: {
            project: { key: 'PROJ' },
          },
        },
      });

      expect(matchResult).toBe(true);

      const noMatchResult = service.shouldTrigger('workflow-project-filter', {
        webhookEvent: 'jira:issue_created',
        issue: {
          fields: {
            project: { key: 'OTHER' },
          },
        },
      });

      expect(noMatchResult).toBe(false);
    });
  });

  // ===========================================
  // Encrypted Credentials Tests
  // ===========================================
  describe('encrypted credentials', () => {
    it('should fail gracefully when decryption fails', async () => {
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
        triggerId: 'issue_created',
      });

      expect(result.success).toBe(false);
    });
  });
});
