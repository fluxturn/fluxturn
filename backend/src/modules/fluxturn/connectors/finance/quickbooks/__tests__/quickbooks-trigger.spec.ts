/**
 * QuickBooks Trigger Service Tests
 *
 * Tests for the QuickBooks trigger service.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { QuickBooksTriggerService } from '../quickbooks-trigger.service';
import { TriggerType } from '../../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../../database/platform.service';

describe('QuickBooksTriggerService', () => {
  let service: QuickBooksTriggerService;
  let platformService: PlatformService;

  const mockConfig: Record<string, string> = {
    APP_URL: 'http://localhost:3000',
    CONNECTOR_ENCRYPTION_KEY: 'a'.repeat(32),
  };

  const mockCredentials = {
    accessToken: 'mock-quickbooks-access-token',
    refreshToken: 'mock-quickbooks-refresh-token',
    realmId: '1234567890',
    verifierToken: 'mock-verifier-token-12345',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickBooksTriggerService,
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

    service = module.get<QuickBooksTriggerService>(QuickBooksTriggerService);
    platformService = module.get<PlatformService>(PlatformService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // getTriggerType Tests
  // ===========================================
  describe('getTriggerType', () => {
    it('should return QUICKBOOKS trigger type', () => {
      expect(service.getTriggerType()).toBe(TriggerType.QUICKBOOKS);
    });
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should activate trigger with webhook URL successfully', async () => {
      const result = await service.activate('workflow-test-1', {
        triggerId: 'invoice_created',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('manual setup required');
      expect(result.data).toHaveProperty('webhookUrl');
      expect(result.data).toHaveProperty('setupRequired', true);
      expect(result.data).toHaveProperty('instructions');
    });

    it('should include setup instructions', async () => {
      const result = await service.activate('workflow-instructions', {
        triggerId: 'invoice_created',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.instructions).toBeDefined();
      expect(result.data?.instructions.length).toBeGreaterThan(0);
      expect(result.data?.instructions.some((i: string) => i.includes('Intuit Developer Portal'))).toBe(true);
    });

    it('should generate correct webhook URL', async () => {
      const result = await service.activate('workflow-url-test', {
        triggerId: 'invoice_created',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.webhookUrl).toContain('/api/v1/webhooks/quickbooks/workflow-url-test');
    });

    it('should activate invoice_created trigger', async () => {
      const result = await service.activate('workflow-invoice-created', {
        triggerId: 'invoice_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Invoice');
    });

    it('should activate payment_created trigger', async () => {
      const result = await service.activate('workflow-payment-created', {
        triggerId: 'payment_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Payment');
    });

    it('should activate customer_created trigger', async () => {
      const result = await service.activate('workflow-customer-created', {
        triggerId: 'customer_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Customer');
    });

    it('should activate customer_updated trigger', async () => {
      const result = await service.activate('workflow-customer-updated', {
        triggerId: 'customer_updated',
      });

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Customer');
    });

    it('should activate vendor_created trigger', async () => {
      const result = await service.activate('workflow-vendor-created', {
        triggerId: 'vendor_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Vendor');
    });

    it('should activate item_created trigger', async () => {
      const result = await service.activate('workflow-item-created', {
        triggerId: 'item_created',
      });

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Item');
    });

    it('should use default trigger when not specified', async () => {
      const result = await service.activate('workflow-default', {});

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Invoice');
    });

    it('should use actionParams triggerId if provided', async () => {
      const result = await service.activate('workflow-action-params', {
        actionParams: {
          triggerId: 'payment_created',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.supportedEntities).toContain('Payment');
    });

    it('should use verifier token from credentials', async () => {
      const result = await service.activate('workflow-verifier', {
        triggerId: 'invoice_created',
        credentials: mockCredentials,
      });

      expect(result.success).toBe(true);

      // Check that the active trigger has the verifier token stored
      const activeTrigger = service.getActiveTrigger('workflow-verifier');
      expect(activeTrigger?.verifierToken).toBe('mock-verifier-token-12345');
    });

    it('should fetch credentials from database when credentialId is provided', async () => {
      const result = await service.activate('workflow-fetch-creds', {
        triggerId: 'invoice_created',
        credentialId: 'cred-123',
      });

      expect(result.success).toBe(true);
      expect(platformService.query).toHaveBeenCalled();
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate trigger successfully', async () => {
      // First activate
      await service.activate('workflow-to-deactivate', {
        triggerId: 'invoice_created',
      });

      const result = await service.deactivate('workflow-to-deactivate');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated');
    });

    it('should remind to remove webhook from portal', async () => {
      await service.activate('workflow-reminder', {
        triggerId: 'invoice_created',
      });

      const result = await service.deactivate('workflow-reminder');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Developer Portal');
    });

    it('should succeed for non-existent trigger', async () => {
      const result = await service.deactivate('non-existent-workflow');

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
      expect(status.type).toBe(TriggerType.QUICKBOOKS);
      expect(status.message).toContain('not active');
    });

    it('should return active status after activation', async () => {
      await service.activate('status-test-workflow', {
        triggerId: 'invoice_created',
      });

      const status = await service.getStatus('status-test-workflow');

      expect(status.active).toBe(true);
      expect(status.type).toBe(TriggerType.QUICKBOOKS);
      expect(status.metadata).toHaveProperty('webhookUrl');
      expect(status.metadata).toHaveProperty('triggerId');
    });

    it('should include hasVerifierToken in status metadata', async () => {
      await service.activate('status-verifier-test', {
        triggerId: 'invoice_created',
        credentials: mockCredentials,
      });

      const status = await service.getStatus('status-verifier-test');

      expect(status.metadata).toHaveProperty('hasVerifierToken');
      expect(status.metadata?.hasVerifierToken).toBe(true);
    });

    it('should include activatedAt in status metadata', async () => {
      await service.activate('status-time-test', {
        triggerId: 'invoice_created',
      });

      const status = await service.getStatus('status-time-test');

      expect(status.metadata).toHaveProperty('activatedAt');
      expect(status.metadata?.activatedAt).toBeInstanceOf(Date);
    });
  });

  // ===========================================
  // Signature Verification Tests
  // ===========================================
  describe('verifySignature', () => {
    const verifierToken = 'test-verifier-token-12345';

    it('should verify valid HMAC-SHA256 signature', () => {
      const payload = '{"test": "data"}';

      // Generate the expected signature
      const expectedSignature = crypto
        .createHmac('sha256', verifierToken)
        .update(payload)
        .digest('base64');

      const isValid = service.verifySignature(payload, expectedSignature, verifierToken);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"test": "data"}';
      const invalidSignature = 'invalid-signature';

      const isValid = service.verifySignature(payload, invalidSignature, verifierToken);

      expect(isValid).toBe(false);
    });

    it('should reject when verifier token is empty', () => {
      const payload = '{"test": "data"}';
      const signature = 'some-signature';

      const isValid = service.verifySignature(payload, signature, '');

      expect(isValid).toBe(false);
    });

    it('should reject when signature is empty', () => {
      const payload = '{"test": "data"}';

      const isValid = service.verifySignature(payload, '', verifierToken);

      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const payload = '{"test": "data"}';

      // This should still fail even if the signature looks similar
      const almostCorrectSignature = crypto
        .createHmac('sha256', verifierToken)
        .update(payload + 'extra')
        .digest('base64');

      const isValid = service.verifySignature(payload, almostCorrectSignature, verifierToken);

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
      await service.activate('active-trigger-test', {
        triggerId: 'invoice_created',
        credentials: mockCredentials,
      });

      const trigger = service.getActiveTrigger('active-trigger-test');

      expect(trigger).toBeDefined();
      expect(trigger?.triggerId).toBe('invoice_created');
      expect(trigger?.webhookUrl).toContain('quickbooks');
      expect(trigger?.activatedAt).toBeDefined();
    });
  });

  // ===========================================
  // getVerifierToken Tests
  // ===========================================
  describe('getVerifierToken', () => {
    it('should return null for non-existent workflow', async () => {
      const token = await service.getVerifierToken('non-existent');
      expect(token).toBeNull();
    });

    it('should return verifier token from active trigger', async () => {
      await service.activate('token-test', {
        triggerId: 'invoice_created',
        credentials: mockCredentials,
      });

      const token = await service.getVerifierToken('token-test');
      expect(token).toBe('mock-verifier-token-12345');
    });

    it('should return token from stored webhook data if not in memory', async () => {
      // Setup mock to return stored webhook data
      (platformService.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('workflow_triggers')) {
          return Promise.resolve({
            rows: [{
              webhook_data: JSON.stringify({ verifierToken: 'stored-verifier-token' }),
            }],
          });
        }
        return Promise.resolve({ rows: [{ credentials: mockCredentials }] });
      });

      // Don't activate, just query for token
      const token = await service.getVerifierToken('stored-workflow');
      expect(token).toBe('stored-verifier-token');
    });
  });

  // ===========================================
  // getSupportedEntities Tests
  // ===========================================
  describe('getSupportedEntities', () => {
    it('should return Invoice for invoice triggers', async () => {
      const result = await service.activate('invoice-test', {
        triggerId: 'invoice_created',
      });

      expect(result.data?.supportedEntities).toContain('Invoice');
    });

    it('should return Payment for payment triggers', async () => {
      const result = await service.activate('payment-test', {
        triggerId: 'payment_created',
      });

      expect(result.data?.supportedEntities).toContain('Payment');
    });

    it('should return Customer for customer triggers', async () => {
      const result = await service.activate('customer-test', {
        triggerId: 'customer_created',
      });

      expect(result.data?.supportedEntities).toContain('Customer');
    });

    it('should return default entities for unknown trigger', async () => {
      const result = await service.activate('unknown-test', {
        triggerId: 'unknown_trigger',
      });

      expect(result.data?.supportedEntities).toContain('Invoice');
      expect(result.data?.supportedEntities).toContain('Payment');
      expect(result.data?.supportedEntities).toContain('Customer');
    });
  });

  // ===========================================
  // Credential Handling Tests
  // ===========================================
  describe('credential handling', () => {
    it('should handle missing credentials gracefully', async () => {
      (platformService.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Should still succeed as webhook URL doesn't require credentials
      const result = await service.activate('no-creds', {
        triggerId: 'invoice_created',
        credentialId: 'non-existent',
      });

      expect(result.success).toBe(true);
    });

    it('should use verifier token from actionParams', async () => {
      const result = await service.activate('action-params-verifier', {
        triggerId: 'invoice_created',
        actionParams: {
          verifierToken: 'action-params-token',
        },
      });

      expect(result.success).toBe(true);

      const trigger = service.getActiveTrigger('action-params-verifier');
      expect(trigger?.verifierToken).toBe('action-params-token');
    });

    it('should use verifier token from credentials object', async () => {
      const result = await service.activate('creds-verifier', {
        triggerId: 'invoice_created',
        credentials: {
          verifierToken: 'creds-token',
        },
      });

      expect(result.success).toBe(true);

      const trigger = service.getActiveTrigger('creds-verifier');
      expect(trigger?.verifierToken).toBe('creds-token');
    });
  });
});
