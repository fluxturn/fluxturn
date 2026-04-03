import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { TeamsTriggerService } from '../teams-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../../database/platform.service';

describe('TeamsTriggerService', () => {
  let service: TeamsTriggerService;
  let platformService: PlatformService;

  const mockConfig: Record<string, string> = {
    APP_URL: 'http://localhost:3000',
    CONNECTOR_ENCRYPTION_KEY: 'a'.repeat(32),
  };

  const mockCredentials = {
    accessToken: 'mock-teams-access-token',
    refreshToken: 'mock-teams-refresh-token',
    tenantId: 'mock-tenant-id',
  };

  const mockSubscriptionResponse = {
    id: 'mock-subscription-id-12345',
    resource: '/teams/getAllMessages',
    changeType: 'created',
    expirationDateTime: new Date(Date.now() + 4200 * 60 * 1000).toISOString(),
    notificationUrl: 'http://localhost:3000/api/v1/webhooks/teams/workflow-123',
    clientState: 'mock-client-state',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsTriggerService,
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

    service = module.get<TeamsTriggerService>(TeamsTriggerService);
    platformService = module.get<PlatformService>(PlatformService);
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('getTriggerType', () => {
    it('should return TEAMS trigger type', () => {
      expect(service.getTriggerType()).toBe(TriggerType.TEAMS);
    });
  });

  describe('activate', () => {
    it('should activate trigger successfully with channel message', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      const result = await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        teamId: 'team-id-123',
        channelId: 'channel-id-456',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Teams trigger activated successfully');
      expect(result.data).toHaveProperty('subscriptionId');
      expect(result.data).toHaveProperty('webhookUrl');
    });

    it('should activate trigger for new_channel', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      const result = await service.activate('workflow-123', {
        triggerId: 'new_channel',
        teamId: 'team-id-123',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
    });

    it('should activate trigger for new_chat_message', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      const result = await service.activate('workflow-123', {
        triggerId: 'new_chat_message',
        chatId: 'chat-id-789',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
    });

    it('should activate trigger for new_team_member', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      const result = await service.activate('workflow-123', {
        triggerId: 'new_team_member',
        teamId: 'team-id-123',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when no credentials found', async () => {
      (platformService.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        credentialId: 'invalid-cred',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('accessToken');
    });

    it('should fail when API returns error', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(400, {
          error: {
            code: 'InvalidRequest',
            message: 'Invalid subscription resource',
          },
        });

      const result = await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid subscription resource');
    });

    it('should fail when API does not return subscription ID', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, {}); // No ID in response

      const result = await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API did not return subscription ID');
    });
  });

  describe('deactivate', () => {
    beforeEach(async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        credentialId: 'cred-123',
      });
    });

    it('should deactivate trigger successfully', async () => {
      nock('https://graph.microsoft.com')
        .delete(`/v1.0/subscriptions/${mockSubscriptionResponse.id}`)
        .reply(204);

      const result = await service.deactivate('workflow-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Teams trigger deactivated successfully');
    });

    it('should succeed even if subscription deletion fails', async () => {
      nock('https://graph.microsoft.com')
        .delete(`/v1.0/subscriptions/${mockSubscriptionResponse.id}`)
        .reply(404);

      const result = await service.deactivate('workflow-123');

      expect(result.success).toBe(true);
    });

    it('should succeed for non-existent trigger', async () => {
      const result = await service.deactivate('non-existent-workflow');

      expect(result.success).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return inactive status when no trigger exists', async () => {
      const status = await service.getStatus('non-existent-workflow');

      expect(status.active).toBe(false);
      expect(status.type).toBe(TriggerType.TEAMS);
      expect(status.message).toContain('No active trigger');
    });

    it('should return active status for activated trigger', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        credentialId: 'cred-123',
      });

      const status = await service.getStatus('workflow-123');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.TEAMS);
      expect(status.metadata).toHaveProperty('subscriptionId');
      expect(status.metadata).toHaveProperty('triggerId', 'new_channel_message');
    });

    it('should detect expired subscription', async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      await service.activate('workflow-expired', {
        triggerId: 'new_channel_message',
        credentialId: 'cred-123',
      });

      // Manually set expired date on the stored trigger config
      const activeTrigger = service.getActiveTrigger('workflow-expired');
      if (activeTrigger) {
        activeTrigger.config.expirationDateTime = new Date(Date.now() - 1000).toISOString();
      }

      const status = await service.getStatus('workflow-expired');

      expect(status.active).toBe(false);
      expect(status.message).toContain('expired');
    });
  });

  describe('renewSubscription', () => {
    beforeEach(async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        credentialId: 'cred-123',
      });
    });

    it('should renew subscription successfully', async () => {
      nock('https://graph.microsoft.com')
        .patch(`/v1.0/subscriptions/${mockSubscriptionResponse.id}`)
        .reply(200, {
          ...mockSubscriptionResponse,
          expirationDateTime: new Date(Date.now() + 4200 * 60 * 1000).toISOString(),
        });

      const result = await service.renewSubscription('workflow-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscription renewed successfully');
    });

    it('should fail for non-existent trigger', async () => {
      const result = await service.renewSubscription('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Trigger not found');
    });
  });

  describe('clientState validation', () => {
    beforeEach(async () => {
      nock('https://graph.microsoft.com')
        .post('/v1.0/subscriptions')
        .reply(201, mockSubscriptionResponse);

      await service.activate('workflow-123', {
        triggerId: 'new_channel_message',
        credentialId: 'cred-123',
      });
    });

    it('should validate correct client state', () => {
      const clientState = service.getClientState('workflow-123');
      expect(clientState).toBeDefined();

      const isValid = service.validateClientState('workflow-123', clientState!);
      expect(isValid).toBe(true);
    });

    it('should reject invalid client state', () => {
      const isValid = service.validateClientState('workflow-123', 'wrong-state');
      expect(isValid).toBe(false);
    });
  });
});
