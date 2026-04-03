/**
 * Calendly Trigger Service Tests
 *
 * Tests for the Calendly trigger activation/deactivation using mocked HTTP responses.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { CalendlyTriggerService } from '../calendly-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../../database/platform.service';

describe('CalendlyTriggerService', () => {
  let service: CalendlyTriggerService;
  let platformService: PlatformService;

  const BASE_URL = 'https://api.calendly.com';

  const mockConfig: Record<string, string> = {
    APP_URL: 'http://localhost:3000',
    CONNECTOR_ENCRYPTION_KEY: 'a'.repeat(32),
  };

  const mockCredentials = {
    accessToken: 'mock-calendly-access-token',
    personalToken: 'mock-calendly-personal-token',
  };

  const mockCurrentUser = {
    uri: 'https://api.calendly.com/users/USER123',
    name: 'Test User',
    email: 'test@example.com',
    current_organization: 'https://api.calendly.com/organizations/ORG123',
  };

  beforeEach(async () => {
    nock.cleanAll();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendlyTriggerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: PlatformService,
          useValue: {
            query: jest.fn().mockResolvedValue({
              rows: [{ credentials: mockCredentials }],
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CalendlyTriggerService>(CalendlyTriggerService);
    platformService = module.get<PlatformService>(PlatformService);
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  // ===========================================
  // getTriggerType Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return CALENDLY trigger type', () => {
      expect(service.getTriggerType()).toBe(TriggerType.CALENDLY);
    });
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should create a new webhook when activating trigger', async () => {
      // Mock: get current user
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      // Mock: create webhook
      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: {
            uri: 'https://api.calendly.com/webhook_subscriptions/WH123',
          },
        });

      const result = await service.activate('workflow-test-1', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('webhookUri');
      expect(result.data).toHaveProperty('webhookUrl');
    });

    it('should activate with organization scope', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions', (body: any) => body.scope === 'organization')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      const result = await service.activate('workflow-test-2', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
        scope: 'organization',
      });

      expect(result.success).toBe(true);
    });

    it('should activate with user scope', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions', (body: any) => body.scope === 'user')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      const result = await service.activate('workflow-test-3', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
        scope: 'user',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when no access token is provided', async () => {
      const result = await service.activate('workflow-test-4', {
        triggerId: 'invitee_created',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('access token');
    });

    it('should fetch credentials from database when credentialId is provided', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      const result = await service.activate('workflow-test-5', {
        credentialId: 'cred-123',
        triggerId: 'invitee_created',
      });

      expect(result.success).toBe(true);
      expect(platformService.query).toHaveBeenCalled();
    });

    it('should handle API errors during webhook creation', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(500, { message: 'Internal server error' });

      const result = await service.activate('workflow-test-error', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      expect(result.success).toBe(false);
    });

    it('should activate invitee_canceled trigger', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions', (body: any) =>
          body.events && body.events.includes('invitee.canceled'))
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      const result = await service.activate('workflow-canceled', {
        credentials: mockCredentials,
        triggerId: 'invitee_canceled',
      });

      expect(result.success).toBe(true);
    });

    it('should use actionParams if provided', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      const result = await service.activate('workflow-action-params', {
        credentials: mockCredentials,
        actionParams: {
          triggerId: 'invitee_created',
          scope: 'organization',
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
      // First activate
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      await service.activate('workflow-to-deactivate', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      // Setup mock for stored webhook data
      (platformService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          webhook_data: {
            webhookUri: 'https://api.calendly.com/webhook_subscriptions/WH123',
            accessToken: mockCredentials.accessToken,
          },
        }],
      });

      // Mock webhook deletion
      nock(BASE_URL)
        .delete(/\/webhook_subscriptions\//)
        .reply(200);

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
    });

    it('should handle missing webhook data gracefully', async () => {
      (platformService.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.deactivate('workflow-no-webhook');

      expect(result.success).toBe(true);
    });

    it('should handle API error during webhook deletion', async () => {
      // First activate
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      await service.activate('workflow-delete-error', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      (platformService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          webhook_data: {
            webhookUri: 'https://api.calendly.com/webhook_subscriptions/WH123',
            accessToken: mockCredentials.accessToken,
          },
        }],
      });

      nock(BASE_URL)
        .delete(/\/webhook_subscriptions\//)
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
      expect(status.type).toBe(TriggerType.CALENDLY);
    });

    it('should return active status after activation', async () => {
      // First activate
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      await service.activate('status-test-workflow', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.CALENDLY);
      expect(status.metadata).toHaveProperty('webhookUrl');
      expect(status.metadata).toHaveProperty('triggerId');
    });
  });

  // ===========================================
  // Signature Verification Tests
  // ===========================================
  describe('verifySignature', () => {
    it('should return false when trigger is not active', () => {
      const isValid = service.verifySignature('non-existent', '{}', 'signature');
      expect(isValid).toBe(false);
    });

    it('should verify valid signature', async () => {
      // First activate to get signing key
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      await service.activate('signature-test', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      // Get the active trigger to retrieve the signing key
      const activeTrigger = service.getActiveTrigger('signature-test');
      expect(activeTrigger).toBeDefined();

      if (activeTrigger) {
        // Create a valid signature using the signing key
        const crypto = require('crypto');
        const payload = '{"event": "test"}';
        const expectedSignature = crypto
          .createHmac('sha256', activeTrigger.signingKey)
          .update(payload)
          .digest('hex');

        const isValid = service.verifySignature('signature-test', payload, expectedSignature);
        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid signature', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      await service.activate('signature-invalid', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      const isValid = service.verifySignature('signature-invalid', '{}', 'invalid-signature');
      expect(isValid).toBe(false);
    });
  });

  // ===========================================
  // getActiveTrigger Tests
  // ===========================================
  describe('getActiveTrigger', () => {
    it('should return undefined for non-existent trigger', () => {
      const trigger = service.getActiveTrigger('non-existent');
      expect(trigger).toBeUndefined();
    });

    it('should return trigger details for active trigger', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      await service.activate('active-trigger-test', {
        credentials: mockCredentials,
        triggerId: 'invitee_created',
      });

      const trigger = service.getActiveTrigger('active-trigger-test');

      expect(trigger).toBeDefined();
      expect(trigger?.webhookUri).toBe('https://api.calendly.com/webhook_subscriptions/WH123');
      expect(trigger?.triggerId).toBe('invitee_created');
    });
  });

  // ===========================================
  // Credential Handling Tests
  // ===========================================
  describe('credential handling', () => {
    it('should use personal token when provided', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .matchHeader('Authorization', 'Bearer mock-calendly-personal-token')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      const result = await service.activate('personal-token-test', {
        credentials: {
          personalToken: 'mock-calendly-personal-token',
        },
        triggerId: 'invitee_created',
      });

      expect(result.success).toBe(true);
    });

    it('should use accessToken when provided', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .matchHeader('Authorization', 'Bearer mock-oauth-access-token')
        .reply(200, { resource: mockCurrentUser });

      nock(BASE_URL)
        .post('/webhook_subscriptions')
        .reply(200, {
          resource: { uri: 'https://api.calendly.com/webhook_subscriptions/WH123' },
        });

      const result = await service.activate('oauth-token-test', {
        credentials: {
          accessToken: 'mock-oauth-access-token',
        },
        triggerId: 'invitee_created',
      });

      expect(result.success).toBe(true);
    });
  });
});
