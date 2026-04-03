/**
 * Plaid Connector Tests
 *
 * Tests for the Plaid connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { PlaidConnector } from '../plaid.connector';
import { PLAID_CONNECTOR } from '../plaid.definition';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('PlaidConnector', () => {
  let connector: PlaidConnector;
  const SANDBOX_URL = 'https://sandbox.plaid.com';
  const MOCK_ACCESS_TOKEN = 'access-sandbox-12345678';
  const MOCK_ITEM_ID = 'item-sandbox-12345678';

  beforeEach(async () => {
    nock.cleanAll();
    connector = await ConnectorTestHelper.createConnector(PlaidConnector, 'plaid');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Plaid');
      expect(metadata.category).toBe('finance');
      expect(metadata.authType).toBe('api_key');
      expect(metadata.actions).toBeDefined();
      expect(metadata.triggers).toBeDefined();
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should have all required actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);

      expect(actionIds).toContain('get_accounts');
      expect(actionIds).toContain('get_balance');
      expect(actionIds).toContain('get_auth');
      expect(actionIds).toContain('get_identity');
      expect(actionIds).toContain('get_transactions');
      expect(actionIds).toContain('sync_transactions');
      expect(actionIds).toContain('get_item');
      expect(actionIds).toContain('create_link_token');
      expect(actionIds).toContain('get_categories');
    });

    it('should have all required triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map(t => t.id);

      expect(triggerIds).toContain('transactions_sync_updates');
      expect(triggerIds).toContain('transactions_initial_update');
      expect(triggerIds).toContain('item_error');
      expect(triggerIds).toContain('item_pending_expiration');
    });
  });

  // ===========================================
  // Definition Tests
  // ===========================================
  describe('definition', () => {
    it('should have correct definition structure', () => {
      expect(PLAID_CONNECTOR.name).toBe('plaid');
      expect(PLAID_CONNECTOR.display_name).toBe('Plaid');
      expect(PLAID_CONNECTOR.category).toBe('finance');
      expect(PLAID_CONNECTOR.auth_type).toBe('api_key');
      expect(PLAID_CONNECTOR.webhook_support).toBe(true);
    });

    it('should have required auth fields', () => {
      const authFields = PLAID_CONNECTOR.auth_fields;
      expect(authFields).toBeInstanceOf(Array);

      const fieldKeys = authFields?.map((f: any) => f.key) || [];
      expect(fieldKeys).toContain('client_id');
      expect(fieldKeys).toContain('secret');
      expect(fieldKeys).toContain('environment');
    });

    it('should have environment options', () => {
      const envField = PLAID_CONNECTOR.auth_fields?.find((f: any) => f.key === 'environment');

      expect(envField).toBeDefined();
      expect(envField?.options).toHaveLength(3);

      const envValues = envField?.options?.map((o: any) => o.value) || [];
      expect(envValues).toContain('sandbox');
      expect(envValues).toContain('development');
      expect(envValues).toContain('production');
    });

    it('should have supported actions matching connector', () => {
      const defActions = PLAID_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];
      const metadata = connector.getMetadata();
      const connectorActions = metadata.actions.map(a => a.id);

      // All definition actions should be implemented in connector
      for (const actionId of defActions) {
        expect(connectorActions).toContain(actionId);
      }
    });

    it('should have supported triggers matching connector', () => {
      const defTriggers = PLAID_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const metadata = connector.getMetadata();
      const connectorTriggers = metadata.triggers.map(t => t.id);

      // All definition triggers should be declared in connector
      for (const triggerId of defTriggers) {
        expect(connectorTriggers).toContain(triggerId);
      }
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(SANDBOX_URL)
        .post('/institutions/get')
        .reply(200, {
          institutions: [{ institution_id: 'ins_1', name: 'Test Bank' }],
          total: 1,
          request_id: 'test-request-id',
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(SANDBOX_URL)
        .post('/institutions/get')
        .reply(401, {
          error_type: 'INVALID_INPUT',
          error_code: 'INVALID_CREDENTIALS',
          error_message: 'Invalid credentials',
          request_id: 'test-request-id',
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when network error occurs', async () => {
      nock(SANDBOX_URL)
        .post('/institutions/get')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Get Categories Action Tests (Public Endpoint)
  // ===========================================
  describe('get_categories', () => {
    it('should get categories successfully', async () => {
      nock(SANDBOX_URL)
        .post('/categories/get')
        .reply(200, {
          categories: [
            {
              category_id: '10000000',
              group: 'special',
              hierarchy: ['Bank Fees'],
            },
            {
              category_id: '10001000',
              group: 'special',
              hierarchy: ['Bank Fees', 'Overdraft'],
            },
          ],
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_categories', {});

      expect(result.success).toBe(true);
      expect(result.data?.categories).toBeDefined();
      expect(result.data?.categories).toHaveLength(2);
    });
  });

  // ===========================================
  // Get Accounts Action Tests
  // ===========================================
  describe('get_accounts', () => {
    it('should get accounts successfully', async () => {
      nock(SANDBOX_URL)
        .post('/accounts/get')
        .reply(200, {
          accounts: [
            {
              account_id: 'acc-123',
              name: 'Checking',
              type: 'depository',
              subtype: 'checking',
              balances: { current: 1000, available: 950 },
            },
          ],
          item: { item_id: MOCK_ITEM_ID },
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_accounts', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.accounts).toBeDefined();
      expect(result.data?.accounts).toHaveLength(1);
      expect(result.data?.accounts[0].name).toBe('Checking');
    });

    it('should handle invalid access token', async () => {
      nock(SANDBOX_URL)
        .post('/accounts/get')
        .reply(400, {
          error_type: 'INVALID_INPUT',
          error_code: 'INVALID_ACCESS_TOKEN',
          error_message: 'Invalid access token',
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_accounts', {
        access_token: 'invalid-token',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACCESS_TOKEN');
    });
  });

  // ===========================================
  // Get Balance Action Tests
  // ===========================================
  describe('get_balance', () => {
    it('should get balance successfully', async () => {
      nock(SANDBOX_URL)
        .post('/accounts/balance/get')
        .reply(200, {
          accounts: [
            {
              account_id: 'acc-123',
              balances: {
                current: 1500.00,
                available: 1450.00,
                iso_currency_code: 'USD',
              },
            },
          ],
          item: { item_id: MOCK_ITEM_ID },
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_balance', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.accounts[0].balances.current).toBe(1500.00);
    });
  });

  // ===========================================
  // Get Auth Action Tests
  // ===========================================
  describe('get_auth', () => {
    it('should get auth info successfully', async () => {
      nock(SANDBOX_URL)
        .post('/auth/get')
        .reply(200, {
          accounts: [{ account_id: 'acc-123', name: 'Checking' }],
          numbers: {
            ach: [
              {
                account_id: 'acc-123',
                account: '1234567890',
                routing: '011000015',
                wire_routing: '021000021',
              },
            ],
          },
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_auth', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.numbers?.ach).toBeDefined();
      expect(result.data?.numbers?.ach[0].routing).toBe('011000015');
    });
  });

  // ===========================================
  // Get Identity Action Tests
  // ===========================================
  describe('get_identity', () => {
    it('should get identity info successfully', async () => {
      nock(SANDBOX_URL)
        .post('/identity/get')
        .reply(200, {
          accounts: [
            {
              account_id: 'acc-123',
              owners: [
                {
                  names: ['John Doe'],
                  addresses: [{ data: { city: 'New York' } }],
                  emails: [{ data: 'john@example.com', primary: true }],
                  phone_numbers: [{ data: '+15551234567', primary: true }],
                },
              ],
            },
          ],
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_identity', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.accounts[0].owners[0].names[0]).toBe('John Doe');
    });
  });

  // ===========================================
  // Get Transactions Action Tests
  // ===========================================
  describe('get_transactions', () => {
    it('should get transactions successfully', async () => {
      nock(SANDBOX_URL)
        .post('/transactions/get')
        .reply(200, {
          accounts: [{ account_id: 'acc-123' }],
          transactions: [
            {
              transaction_id: 'txn-123',
              account_id: 'acc-123',
              amount: -50.00,
              name: 'Coffee Shop',
              date: '2024-01-15',
            },
            {
              transaction_id: 'txn-124',
              account_id: 'acc-123',
              amount: -25.00,
              name: 'Gas Station',
              date: '2024-01-14',
            },
          ],
          total_transactions: 2,
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_transactions', {
        access_token: MOCK_ACCESS_TOKEN,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.data?.transactions).toHaveLength(2);
      expect(result.data?.total_transactions).toBe(2);
    });

    it('should handle pagination options', async () => {
      nock(SANDBOX_URL)
        .post('/transactions/get')
        .reply(200, {
          accounts: [],
          transactions: [],
          total_transactions: 100,
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_transactions', {
        access_token: MOCK_ACCESS_TOKEN,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        count: 50,
        offset: 50,
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Sync Transactions Action Tests
  // ===========================================
  describe('sync_transactions', () => {
    it('should sync transactions successfully', async () => {
      nock(SANDBOX_URL)
        .post('/transactions/sync')
        .reply(200, {
          added: [
            { transaction_id: 'txn-new-1', amount: -30.00, name: 'Store' },
          ],
          modified: [],
          removed: [],
          next_cursor: 'cursor-abc123',
          has_more: false,
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('sync_transactions', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.added).toHaveLength(1);
      expect(result.data?.has_more).toBe(false);
    });

    it('should handle cursor for incremental sync', async () => {
      nock(SANDBOX_URL)
        .post('/transactions/sync')
        .reply(200, {
          added: [],
          modified: [],
          removed: [],
          next_cursor: 'cursor-xyz789',
          has_more: false,
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('sync_transactions', {
        access_token: MOCK_ACCESS_TOKEN,
        cursor: 'cursor-abc123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.next_cursor).toBe('cursor-xyz789');
    });
  });

  // ===========================================
  // Refresh Transactions Action Tests
  // ===========================================
  describe('refresh_transactions', () => {
    it('should refresh transactions successfully', async () => {
      nock(SANDBOX_URL)
        .post('/transactions/refresh')
        .reply(200, {
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('refresh_transactions', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.request_id).toBe('test-request-id');
    });
  });

  // ===========================================
  // Get Recurring Transactions Action Tests
  // ===========================================
  describe('get_recurring_transactions', () => {
    it('should get recurring transactions successfully', async () => {
      nock(SANDBOX_URL)
        .post('/transactions/recurring/get')
        .reply(200, {
          inflow_streams: [
            { stream_id: 'in-1', description: 'Salary', average_amount: 5000 },
          ],
          outflow_streams: [
            { stream_id: 'out-1', description: 'Rent', average_amount: -1500 },
          ],
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_recurring_transactions', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.inflow_streams).toHaveLength(1);
      expect(result.data?.outflow_streams).toHaveLength(1);
    });
  });

  // ===========================================
  // Item Management Action Tests
  // ===========================================
  describe('get_item', () => {
    it('should get item successfully', async () => {
      nock(SANDBOX_URL)
        .post('/item/get')
        .reply(200, {
          item: {
            item_id: MOCK_ITEM_ID,
            institution_id: 'ins_1',
            webhook: 'https://example.com/webhook',
            available_products: ['transactions', 'auth'],
            billed_products: ['transactions'],
          },
          status: { transactions: { last_successful_update: '2024-01-15' } },
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_item', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
      expect(result.data?.item?.item_id).toBe(MOCK_ITEM_ID);
    });
  });

  describe('remove_item', () => {
    it('should remove item successfully', async () => {
      nock(SANDBOX_URL)
        .post('/item/remove')
        .reply(200, {
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('remove_item', {
        access_token: MOCK_ACCESS_TOKEN,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('update_item_webhook', () => {
    it('should update webhook URL successfully', async () => {
      nock(SANDBOX_URL)
        .post('/item/webhook/update')
        .reply(200, {
          item: {
            item_id: MOCK_ITEM_ID,
            webhook: 'https://new-domain.com/webhook',
          },
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('update_item_webhook', {
        access_token: MOCK_ACCESS_TOKEN,
        webhook: 'https://new-domain.com/webhook',
      });

      expect(result.success).toBe(true);
      expect(result.data?.item?.webhook).toBe('https://new-domain.com/webhook');
    });
  });

  // ===========================================
  // Link Token Action Tests
  // ===========================================
  describe('create_link_token', () => {
    it('should create link token successfully', async () => {
      nock(SANDBOX_URL)
        .post('/link/token/create')
        .reply(200, {
          link_token: 'link-sandbox-token-12345',
          expiration: '2024-01-15T12:00:00Z',
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('create_link_token', {
        user_client_user_id: 'user-123',
        products: ['transactions'],
        country_codes: ['US'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.link_token).toBe('link-sandbox-token-12345');
    });
  });

  describe('exchange_public_token', () => {
    it('should exchange public token successfully', async () => {
      nock(SANDBOX_URL)
        .post('/item/public_token/exchange')
        .reply(200, {
          access_token: MOCK_ACCESS_TOKEN,
          item_id: MOCK_ITEM_ID,
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('exchange_public_token', {
        public_token: 'public-sandbox-token-12345',
      });

      expect(result.success).toBe(true);
      expect(result.data?.access_token).toBe(MOCK_ACCESS_TOKEN);
      expect(result.data?.item_id).toBe(MOCK_ITEM_ID);
    });
  });

  // ===========================================
  // Institution Action Tests
  // ===========================================
  describe('get_institutions', () => {
    it('should get institutions successfully', async () => {
      nock(SANDBOX_URL)
        .post('/institutions/get')
        .reply(200, {
          institutions: [
            { institution_id: 'ins_1', name: 'Chase', products: ['transactions', 'auth'] },
            { institution_id: 'ins_2', name: 'Bank of America', products: ['transactions'] },
          ],
          total: 2,
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_institutions', {
        count: 10,
        offset: 0,
        country_codes: ['US'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.institutions).toHaveLength(2);
      expect(result.data?.total).toBe(2);
    });
  });

  describe('get_institution_by_id', () => {
    it('should get institution by ID successfully', async () => {
      nock(SANDBOX_URL)
        .post('/institutions/get_by_id')
        .reply(200, {
          institution: {
            institution_id: 'ins_1',
            name: 'Chase',
            products: ['transactions', 'auth', 'identity'],
            country_codes: ['US'],
          },
          request_id: 'test-request-id',
        });

      const result = await connector.executeAction('get_institution_by_id', {
        institution_id: 'ins_1',
        country_codes: ['US'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.institution?.name).toBe('Chase');
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown actions', () => {
    it('should throw error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unknown action');
    });
  });

  // ===========================================
  // Interface Method Tests
  // ===========================================
  describe('IFinanceConnector interface', () => {
    it('should return error for getAccounts without access token', async () => {
      const result = await connector.getAccounts();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_TOKEN_REQUIRED');
    });

    it('should return error for getTransactions without access token', async () => {
      const result = await connector.getTransactions();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_TOKEN_REQUIRED');
    });

    it('should return not supported for createInvoice', async () => {
      const result = await connector.createInvoice({});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_SUPPORTED');
    });

    it('should return not supported for processPayment', async () => {
      const result = await connector.processPayment({});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_SUPPORTED');
    });

    it('should return not supported for getReports', async () => {
      const result = await connector.getReports('monthly');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_SUPPORTED');
    });
  });
});
