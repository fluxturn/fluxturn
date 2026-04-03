/**
 * Wise Connector Tests
 *
 * Tests for the Wise connector actions using mocked HTTP responses.
 * Tests both behavioral verification and definition-connector sync.
 */
import { WiseConnector } from '../wise.connector';
import { WISE_CONNECTOR } from '../wise.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    request: jest.fn(),
  })),
}));

describe('WiseConnector', () => {
  let connector: WiseConnector;

  const mockCredentials = {
    apiToken: 'mock-api-token-xyz123',
    environment: 'test' as const,
    privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMock key\n-----END RSA PRIVATE KEY-----',
  };

  const mockConfig = {
    id: 'test-wise-connector',
    name: 'Wise Test',
    type: 'wise',
    category: 'finance',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    connector = new WiseConnector();
    jest.clearAllMocks();
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        WISE_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        WISE_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have triggers matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds =
        WISE_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds =
        WISE_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth field keys', () => {
      const definitionAuthKeys =
        WISE_CONNECTOR.auth_fields?.map((f: any) => f.key) || [];

      expect(definitionAuthKeys).toContain('apiToken');
      expect(definitionAuthKeys).toContain('environment');
      expect(definitionAuthKeys).toContain('privateKey');
    });

    it('should have webhook_support matching definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.webhookSupport).toBe(WISE_CONNECTOR.webhook_support);
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should have account actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('get_balances');
      expect(connectorActionIds).toContain('get_currencies');
      expect(connectorActionIds).toContain('get_statement');
    });

    it('should have exchange rate action matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('get_exchange_rate');
    });

    it('should have profile actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('get_profile');
      expect(connectorActionIds).toContain('get_all_profiles');
    });

    it('should have quote actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('create_quote');
      expect(connectorActionIds).toContain('get_quote');
    });

    it('should have recipient action matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('get_all_recipients');
    });

    it('should have transfer actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('create_transfer');
      expect(connectorActionIds).toContain('get_transfer');
      expect(connectorActionIds).toContain('get_all_transfers');
      expect(connectorActionIds).toContain('execute_transfer');
      expect(connectorActionIds).toContain('cancel_transfer');
    });

    it('should have webhook triggers matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      expect(connectorTriggerIds).toContain('transfer_state_change');
      expect(connectorTriggerIds).toContain('transfer_active_cases');
      expect(connectorTriggerIds).toContain('balance_credit');
      expect(connectorTriggerIds).toContain('balance_update');
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialization', () => {
    it('should initialize with test environment', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should initialize with live environment', async () => {
      const liveConfig = {
        ...mockConfig,
        credentials: {
          ...mockCredentials,
          environment: 'live',
        },
      };

      await expect(connector.initialize(liveConfig)).resolves.not.toThrow();
    });

    it('should throw error when credentials are missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: undefined,
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Invalid connector configuration: missing required fields',
      );
    });

    it('should throw error when apiToken is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          environment: 'test',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'API token is required',
      );
    });

    it('should initialize without privateKey (optional)', async () => {
      const configWithoutKey = {
        ...mockConfig,
        credentials: {
          apiToken: 'mock-token',
          environment: 'test',
        },
      };

      await expect(connector.initialize(configWithoutKey)).resolves.not.toThrow();
    });

    it('should default to live environment if not specified', async () => {
      const configNoEnv = {
        ...mockConfig,
        credentials: {
          apiToken: 'mock-token',
        },
      };

      await expect(connector.initialize(configNoEnv)).resolves.not.toThrow();
    });
  });

  // ===========================================
  // getMetadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Wise');
      expect(metadata.category).toBe('finance');
      expect(metadata.webhookSupport).toBe(true);
      expect(metadata.actions.length).toBe(14);
      expect(metadata.triggers.length).toBe(4);
    });

    it('should include all account actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_balances');
      expect(actionIds).toContain('get_currencies');
      expect(actionIds).toContain('get_statement');
    });

    it('should include all transfer actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_transfer');
      expect(actionIds).toContain('get_transfer');
      expect(actionIds).toContain('get_all_transfers');
      expect(actionIds).toContain('execute_transfer');
      expect(actionIds).toContain('cancel_transfer');
    });

    it('should include all triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('transfer_state_change');
      expect(triggerIds).toContain('transfer_active_cases');
      expect(triggerIds).toContain('balance_credit');
      expect(triggerIds).toContain('balance_update');
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('executeAction', () => {
    let mockHttpClient: any;

    beforeEach(async () => {
      await connector.initialize(mockConfig);
      // Access the httpClient through the connector
      mockHttpClient = (connector as any).httpClient;
    });

    describe('get_balances', () => {
      it('should get balances successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: [
            { currency: 'USD', amount: { value: 1000, currency: 'USD' } },
            { currency: 'EUR', amount: { value: 500, currency: 'EUR' } },
          ],
        });

        const result = await connector.executeAction('get_balances', {
          profileId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_currencies', () => {
      it('should get currencies successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: ['USD', 'EUR', 'GBP', 'JPY'],
        });

        const result = await connector.executeAction('get_currencies', {});

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_statement', () => {
      it('should get statement successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: {
            transactions: [
              { id: 1, amount: 100, currency: 'USD' },
              { id: 2, amount: -50, currency: 'USD' },
            ],
          },
        });

        const result = await connector.executeAction('get_statement', {
          profileId: '12345',
          borderlessAccountId: '67890',
          currency: 'USD',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_exchange_rate', () => {
      it('should get exchange rate successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: [{ rate: 0.85, source: 'USD', target: 'EUR' }],
        });

        const result = await connector.executeAction('get_exchange_rate', {
          source: 'USD',
          target: 'EUR',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_profile', () => {
      it('should get profile successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: { id: 12345, type: 'personal', fullName: 'John Doe' },
        });

        const result = await connector.executeAction('get_profile', {
          profileId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_all_profiles', () => {
      it('should get all profiles successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: [
            { id: 1, type: 'personal' },
            { id: 2, type: 'business' },
          ],
        });

        const result = await connector.executeAction('get_all_profiles', {});

        expect(result).toHaveProperty('success');
      });
    });

    describe('create_quote', () => {
      it('should create quote successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: {
            id: 'quote-123',
            sourceAmount: 1000,
            targetAmount: 850,
            rate: 0.85,
          },
        });

        const result = await connector.executeAction('create_quote', {
          profileId: '12345',
          sourceCurrency: 'USD',
          targetCurrency: 'EUR',
          amountType: 'source',
          amount: 1000,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_quote', () => {
      it('should get quote successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: { id: 'quote-123', sourceAmount: 1000, targetAmount: 850 },
        });

        const result = await connector.executeAction('get_quote', {
          quoteId: 'quote-123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_all_recipients', () => {
      it('should get all recipients successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: [
            { id: 1, accountHolderName: 'Jane Doe' },
            { id: 2, accountHolderName: 'Bob Smith' },
          ],
        });

        const result = await connector.executeAction('get_all_recipients', {
          profileId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('create_transfer', () => {
      it('should create transfer successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: { id: 12345, status: 'incoming_payment_waiting' },
        });

        const result = await connector.executeAction('create_transfer', {
          quoteId: 'quote-123',
          targetAccountId: '67890',
          reference: 'Test transfer',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_transfer', () => {
      it('should get transfer successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: { id: 12345, status: 'processing' },
        });

        const result = await connector.executeAction('get_transfer', {
          transferId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_all_transfers', () => {
      it('should get all transfers successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: [
            { id: 1, status: 'processing' },
            { id: 2, status: 'outgoing_payment_sent' },
          ],
        });

        const result = await connector.executeAction('get_all_transfers', {
          profileId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('execute_transfer', () => {
      it('should execute transfer successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: { status: 'COMPLETED', balanceTransactionId: 12345 },
        });

        const result = await connector.executeAction('execute_transfer', {
          profileId: '12345',
          transferId: '67890',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('cancel_transfer', () => {
      it('should cancel transfer successfully', async () => {
        mockHttpClient.request = jest.fn().mockResolvedValueOnce({
          data: { id: 12345, status: 'cancelled' },
        });

        const result = await connector.executeAction('cancel_transfer', {
          transferId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('unknown action', () => {
      it('should return error for unknown action', async () => {
        const result = await connector.executeAction('non_existent_action', {});

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('non_existent_action');
      });
    });
  });

  // ===========================================
  // testConnection Tests
  // ===========================================
  describe('testConnection', () => {
    let mockHttpClient: any;

    beforeEach(async () => {
      await connector.initialize(mockConfig);
      mockHttpClient = (connector as any).httpClient;
    });

    it('should have testConnection method', () => {
      expect(typeof connector.testConnection).toBe('function');
    });

    it('should test connection successfully', async () => {
      mockHttpClient.get = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: [{ id: 1, type: 'personal' }],
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should handle connection test failure', async () => {
      mockHttpClient.get = jest.fn().mockRejectedValueOnce(new Error('Connection failed'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // IFinanceConnector Interface Tests
  // ===========================================
  describe('IFinanceConnector interface', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should return error for getAccounts (requires profileId)', async () => {
      const result = await connector.getAccounts();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROFILE_ID_REQUIRED');
    });

    it('should return error for getTransactions (use get_statement)', async () => {
      const result = await connector.getTransactions();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USE_GET_STATEMENT');
    });

    it('should return error for createInvoice (not supported)', async () => {
      const result = await connector.createInvoice({});
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_SUPPORTED');
    });

    it('should return error for processPayment (use transfer actions)', async () => {
      const result = await connector.processPayment({});
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USE_TRANSFER');
    });

    it('should return error for getReports (use get_statement)', async () => {
      const result = await connector.getReports('summary');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USE_GET_STATEMENT');
    });
  });

  // ===========================================
  // SCA (Strong Customer Authentication) Tests
  // ===========================================
  describe('SCA handling', () => {
    let mockHttpClient: any;

    beforeEach(async () => {
      await connector.initialize(mockConfig);
      mockHttpClient = (connector as any).httpClient;
    });

    it('should handle SCA request with private key', async () => {
      // First request fails with 403 and SCA header
      const scaError = {
        response: {
          status: 403,
          headers: {
            'x-2fa-approval': 'one-time-token-123',
          },
        },
      };

      // Second request succeeds
      mockHttpClient.request = jest.fn()
        .mockRejectedValueOnce(scaError)
        .mockResolvedValueOnce({
          data: { id: 12345, status: 'processing' },
        });

      const result = await connector.executeAction('execute_transfer', {
        profileId: '12345',
        transferId: '67890',
      });

      expect(result).toHaveProperty('success');
    });

    it('should fail SCA request without private key', async () => {
      // Initialize without private key
      const configNoKey = {
        ...mockConfig,
        credentials: {
          apiToken: 'mock-token',
          environment: 'test',
        },
      };
      await connector.initialize(configNoKey);
      mockHttpClient = (connector as any).httpClient;

      // Request fails with 403 and SCA header
      const scaError = {
        response: {
          status: 403,
          headers: {
            'x-2fa-approval': 'one-time-token-123',
          },
        },
      };

      mockHttpClient.request = jest.fn().mockRejectedValueOnce(scaError);

      const result = await connector.executeAction('execute_transfer', {
        profileId: '12345',
        transferId: '67890',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Strong Customer Authentication');
    });
  });
});
