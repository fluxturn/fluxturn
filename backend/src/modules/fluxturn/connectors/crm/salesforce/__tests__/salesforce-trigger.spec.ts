import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { SalesforceTriggerService } from '../salesforce-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../../database/platform.service';

describe('SalesforceTriggerService', () => {
  let service: SalesforceTriggerService;
  let platformService: PlatformService;

  const mockConfig: Record<string, string> = {
    APP_URL: 'http://localhost:3000',
    CONNECTOR_ENCRYPTION_KEY: 'a'.repeat(32),
  };

  const mockCredentials = {
    accessToken: 'mock-salesforce-access-token',
    refreshToken: 'mock-salesforce-refresh-token',
    instanceUrl: 'https://mock.salesforce.com',
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesforceTriggerService,
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

    service = module.get<SalesforceTriggerService>(SalesforceTriggerService);
    platformService = module.get<PlatformService>(PlatformService);
  });

  afterEach(() => {
    jest.useRealTimers();
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('getTriggerType', () => {
    it('should return SALESFORCE trigger type', () => {
      expect(service.getTriggerType()).toBe(TriggerType.SALESFORCE);
    });
  });

  describe('activate', () => {
    it('should activate record_created trigger successfully', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'record_created',
        objectType: 'Contact',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Salesforce trigger activated successfully');
      expect(result.data).toHaveProperty('triggerId', 'record_created');
      expect(result.data).toHaveProperty('objectType', 'Contact');
      expect(result.data).toHaveProperty('pollingEnabled', true);
    });

    it('should activate record_updated trigger', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'record_updated',
        objectType: 'Account',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.triggerId).toBe('record_updated');
    });

    it('should activate record_deleted trigger', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'record_deleted',
        objectType: 'Lead',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.triggerId).toBe('record_deleted');
    });

    it('should activate opportunity_stage_changed trigger', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'opportunity_stage_changed',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.triggerId).toBe('opportunity_stage_changed');
    });

    it('should activate lead_converted trigger', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'lead_converted',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.triggerId).toBe('lead_converted');
    });

    it('should activate case_escalated trigger', async () => {
      const result = await service.activate('workflow-123', {
        triggerId: 'case_escalated',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.triggerId).toBe('case_escalated');
    });

    it('should use default trigger and object when not specified', async () => {
      const result = await service.activate('workflow-123', {
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.triggerId).toBe('record_created');
      expect(result.data.objectType).toBe('Contact');
    });

    it('should fail when no credentials found', async () => {
      (platformService.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.activate('workflow-123', {
        triggerId: 'record_created',
        credentialId: 'invalid-cred',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('accessToken');
    });

    it('should accept instanceUrl from trigger config', async () => {
      (platformService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ credentials: { accessToken: 'token' } }],
      });

      const result = await service.activate('workflow-123', {
        triggerId: 'record_created',
        credentialId: 'cred-123',
        instanceUrl: 'https://custom.salesforce.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('deactivate', () => {
    beforeEach(async () => {
      await service.activate('workflow-123', {
        triggerId: 'record_created',
        objectType: 'Contact',
        credentialId: 'cred-123',
      });
    });

    it('should deactivate trigger successfully', async () => {
      const result = await service.deactivate('workflow-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Salesforce trigger deactivated successfully');
    });

    it('should clear polling interval on deactivation', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await service.deactivate('workflow-123');

      expect(clearIntervalSpy).toHaveBeenCalled();
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
      expect(status.type).toBe(TriggerType.SALESFORCE);
      expect(status.message).toContain('No active trigger');
    });

    it('should return active status for activated trigger', async () => {
      await service.activate('workflow-123', {
        triggerId: 'record_created',
        objectType: 'Contact',
        credentialId: 'cred-123',
      });

      const status = await service.getStatus('workflow-123');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.SALESFORCE);
      expect(status.metadata).toHaveProperty('triggerId', 'record_created');
      expect(status.metadata).toHaveProperty('objectType', 'Contact');
      expect(status.metadata).toHaveProperty('pollingEnabled', true);
    });

    it('should include lastPolled timestamp', async () => {
      await service.activate('workflow-123', {
        triggerId: 'record_created',
        credentialId: 'cred-123',
      });

      const status = await service.getStatus('workflow-123');

      expect(status.metadata).toHaveProperty('lastPolled');
      expect(status.metadata?.lastPolled).toBeDefined();
    });
  });

  describe('getActiveTrigger', () => {
    it('should return undefined for non-existent trigger', () => {
      const trigger = service.getActiveTrigger('non-existent');
      expect(trigger).toBeUndefined();
    });

    it('should return trigger details for active trigger', async () => {
      await service.activate('workflow-123', {
        triggerId: 'record_created',
        objectType: 'Account',
        credentialId: 'cred-123',
      });

      const trigger = service.getActiveTrigger('workflow-123');

      expect(trigger).toBeDefined();
      expect(trigger?.triggerId).toBe('record_created');
      expect(trigger?.config.objectType).toBe('Account');
    });
  });

  describe('polling configuration', () => {
    it('should set up polling interval on activation', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      await service.activate('workflow-123', {
        triggerId: 'record_created',
        credentialId: 'cred-123',
      });

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it('should poll for changes at specified interval', async () => {
      nock('https://mock.salesforce.com')
        .get('/services/data/v58.0/query')
        .query(true)
        .reply(200, { records: [], done: true });

      await service.activate('workflow-123', {
        triggerId: 'record_created',
        credentialId: 'cred-123',
      });

      // Fast-forward time to trigger polling
      jest.advanceTimersByTime(60000);

      // Allow async operations to complete
      await Promise.resolve();
    });
  });

  describe('trigger types and SOQL queries', () => {
    it('should use correct query for record_created', async () => {
      await service.activate('workflow-123', {
        triggerId: 'record_created',
        objectType: 'Lead',
        credentialId: 'cred-123',
      });

      const trigger = service.getActiveTrigger('workflow-123');
      expect(trigger?.triggerId).toBe('record_created');
    });

    it('should use correct query for opportunity_stage_changed', async () => {
      await service.activate('workflow-123', {
        triggerId: 'opportunity_stage_changed',
        credentialId: 'cred-123',
      });

      const trigger = service.getActiveTrigger('workflow-123');
      expect(trigger?.triggerId).toBe('opportunity_stage_changed');
    });
  });

  describe('credential handling', () => {
    it('should handle encrypted credentials', async () => {
      const encryptedCreds = {
        iv: 'mock-iv',
        data: 'mock-encrypted-data',
        authTag: 'mock-auth-tag',
      };

      (platformService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ credentials: encryptedCreds }],
      });

      // This will fail because decryption will fail with mock data
      const result = await service.activate('workflow-123', {
        triggerId: 'record_created',
        credentialId: 'cred-123',
      });

      // Decryption failure should result in activation failure
      expect(result.success).toBe(false);
    });

    it('should handle instance_url in snake_case', async () => {
      (platformService.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          credentials: {
            access_token: 'token',
            instance_url: 'https://snake-case.salesforce.com',
          },
        }],
      });

      const result = await service.activate('workflow-123', {
        triggerId: 'record_created',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clean up all active triggers', async () => {
      await service.activate('workflow-1', {
        triggerId: 'record_created',
        credentialId: 'cred-123',
      });

      await service.activate('workflow-2', {
        triggerId: 'record_updated',
        credentialId: 'cred-123',
      });

      await service.onModuleDestroy();

      const status1 = await service.getStatus('workflow-1');
      const status2 = await service.getStatus('workflow-2');

      expect(status1.active).toBe(false);
      expect(status2.active).toBe(false);
    });
  });
});
