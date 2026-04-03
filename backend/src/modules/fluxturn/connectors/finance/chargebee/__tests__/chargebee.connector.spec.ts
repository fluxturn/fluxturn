/**
 * Chargebee Connector Tests
 *
 * Tests for the Chargebee connector actions using mocked HTTP responses.
 * Tests both behavioral verification and definition-connector sync.
 */
import nock from 'nock';
import { ChargebeeConnector } from '../chargebee.connector';
import { CHARGEBEE_CONNECTOR } from '../chargebee.definition';

describe('ChargebeeConnector', () => {
  let connector: ChargebeeConnector;

  const mockCredentials = {
    accountName: 'mock-account',
    apiKey: 'mock-chargebee-api-key-12345',
  };

  const BASE_URL = 'https://mock-account.chargebee.com/api/v2';

  const mockConfig = {
    id: 'test-chargebee-connector',
    name: 'Chargebee Test',
    type: 'chargebee',
    category: 'finance',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    nock.cleanAll();
    connector = new ChargebeeConnector();
    jest.clearAllMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    beforeEach(async () => {
      // Mock the initialization call
      nock(BASE_URL).get('/customers').query(true).reply(200, { list: [] });
      await connector.initialize(mockConfig);
    });

    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        CHARGEBEE_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      // All connector actions should exist in definition
      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        CHARGEBEE_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      // All definition actions should exist in connector
      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have triggers matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds =
        CHARGEBEE_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];

      // All connector triggers should exist in definition
      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth field keys', () => {
      const definitionAuthKeys =
        CHARGEBEE_CONNECTOR.auth_fields?.map((f: any) => f.key) || [];

      // Check that accountName and apiKey are defined
      expect(definitionAuthKeys).toContain('accountName');
      expect(definitionAuthKeys).toContain('apiKey');
    });

    it('should have core customer actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Customer actions
      expect(connectorActionIds).toContain('create_customer');
      expect(connectorActionIds).toContain('get_customer');
      expect(connectorActionIds).toContain('update_customer');
      expect(connectorActionIds).toContain('list_customers');
    });

    it('should have core subscription actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Subscription actions
      expect(connectorActionIds).toContain('get_subscription');
      expect(connectorActionIds).toContain('list_subscriptions');
      expect(connectorActionIds).toContain('cancel_subscription');
      expect(connectorActionIds).toContain('delete_subscription');
    });

    it('should have core invoice actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Invoice actions
      expect(connectorActionIds).toContain('list_invoices');
      expect(connectorActionIds).toContain('get_invoice_pdf');
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialization', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error when accountName is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          apiKey: 'mock-key',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Chargebee account name and API key are required',
      );
    });

    it('should throw error when apiKey is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          accountName: 'mock-account',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Chargebee account name and API key are required',
      );
    });

    it('should throw error when credentials are empty', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Chargebee account name and API key are required',
      );
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should return success when API responds with 200', async () => {
      nock(BASE_URL).get('/customers').query(true).reply(200, { list: [] });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/customers')
        .query(true)
        .reply(401, { message: 'Unauthorized' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/customers')
        .query(true)
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // getMetadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Chargebee');
      expect(metadata.category).toBe('finance');
      expect(metadata.webhookSupport).toBe(true);
      expect(metadata.actions.length).toBeGreaterThan(0);
      expect(metadata.triggers.length).toBeGreaterThan(0);
    });

    it('should include all customer actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_customer');
      expect(actionIds).toContain('get_customer');
      expect(actionIds).toContain('update_customer');
      expect(actionIds).toContain('list_customers');
    });

    it('should include all triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('subscription_created');
      expect(triggerIds).toContain('subscription_cancelled');
      expect(triggerIds).toContain('payment_succeeded');
      expect(triggerIds).toContain('customer_created');
    });
  });

  // ===========================================
  // Customer Action Tests
  // ===========================================
  describe('customer actions', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    describe('create_customer', () => {
      it('should create customer successfully', async () => {
        const mockCustomer = {
          customer: {
            id: 'cust_123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
          },
        };

        nock(BASE_URL).post('/customers').reply(200, mockCustomer);

        const result = await connector.executeAction('create_customer', {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        });

        expect(result.success).toBe(true);
        expect(result.data?.customer?.id).toBe('cust_123');
      });

      it('should handle validation error', async () => {
        nock(BASE_URL).post('/customers').reply(400, {
          error_code: 'invalid_param',
          message: 'Email is required',
        });

        const result = await connector.executeAction('create_customer', {});

        expect(result.success).toBe(false);
      });
    });

    describe('get_customer', () => {
      it('should get customer by ID successfully', async () => {
        const mockCustomer = {
          customer: {
            id: 'cust_123',
            first_name: 'John',
            last_name: 'Doe',
          },
        };

        nock(BASE_URL).get('/customers/cust_123').reply(200, mockCustomer);

        const result = await connector.executeAction('get_customer', {
          customerId: 'cust_123',
        });

        expect(result.success).toBe(true);
        expect(result.data?.customer?.id).toBe('cust_123');
      });

      it('should handle customer not found', async () => {
        nock(BASE_URL)
          .get('/customers/invalid_id')
          .reply(404, { error_code: 'resource_not_found' });

        const result = await connector.executeAction('get_customer', {
          customerId: 'invalid_id',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('update_customer', () => {
      it('should update customer successfully', async () => {
        const mockCustomer = {
          customer: {
            id: 'cust_123',
            first_name: 'Jane',
            last_name: 'Doe',
          },
        };

        nock(BASE_URL).post('/customers/cust_123').reply(200, mockCustomer);

        const result = await connector.executeAction('update_customer', {
          customerId: 'cust_123',
          first_name: 'Jane',
        });

        expect(result.success).toBe(true);
        expect(result.data?.customer?.first_name).toBe('Jane');
      });
    });

    describe('list_customers', () => {
      it('should list customers successfully', async () => {
        const mockResponse = {
          list: [
            { customer: { id: 'cust_1' } },
            { customer: { id: 'cust_2' } },
          ],
        };

        nock(BASE_URL).get('/customers').query(true).reply(200, mockResponse);

        const result = await connector.executeAction('list_customers', {
          limit: 10,
        });

        expect(result.success).toBe(true);
        expect(result.data?.list).toHaveLength(2);
      });
    });
  });

  // ===========================================
  // Subscription Action Tests
  // ===========================================
  describe('subscription actions', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    describe('get_subscription', () => {
      it('should get subscription by ID successfully', async () => {
        const mockSubscription = {
          subscription: {
            id: 'sub_123',
            customer_id: 'cust_123',
            status: 'active',
          },
        };

        nock(BASE_URL)
          .get('/subscriptions/sub_123')
          .reply(200, mockSubscription);

        const result = await connector.executeAction('get_subscription', {
          subscriptionId: 'sub_123',
        });

        expect(result.success).toBe(true);
        expect(result.data?.subscription?.id).toBe('sub_123');
      });
    });

    describe('list_subscriptions', () => {
      it('should list subscriptions successfully', async () => {
        const mockResponse = {
          list: [{ subscription: { id: 'sub_1' } }],
        };

        nock(BASE_URL)
          .get('/subscriptions')
          .query(true)
          .reply(200, mockResponse);

        const result = await connector.executeAction('list_subscriptions', {
          limit: 10,
        });

        expect(result.success).toBe(true);
        expect(result.data?.list).toHaveLength(1);
      });

      it('should filter by status', async () => {
        const mockResponse = {
          list: [{ subscription: { id: 'sub_1', status: 'active' } }],
        };

        nock(BASE_URL)
          .get('/subscriptions')
          .query(true)
          .reply(200, mockResponse);

        const result = await connector.executeAction('list_subscriptions', {
          status: 'active',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('cancel_subscription', () => {
      it('should cancel subscription successfully', async () => {
        const mockResponse = {
          subscription: {
            id: 'sub_123',
            status: 'cancelled',
          },
        };

        nock(BASE_URL)
          .post('/subscriptions/sub_123/cancel')
          .reply(200, mockResponse);

        const result = await connector.executeAction('cancel_subscription', {
          subscriptionId: 'sub_123',
          end_of_term: false,
        });

        expect(result.success).toBe(true);
        expect(result.data?.subscription?.status).toBe('cancelled');
      });

      it('should cancel at end of term', async () => {
        const mockResponse = {
          subscription: {
            id: 'sub_123',
            status: 'non_renewing',
          },
        };

        nock(BASE_URL)
          .post('/subscriptions/sub_123/cancel')
          .reply(200, mockResponse);

        const result = await connector.executeAction('cancel_subscription', {
          subscriptionId: 'sub_123',
          end_of_term: true,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('delete_subscription', () => {
      it('should delete subscription successfully', async () => {
        const mockResponse = {
          subscription: {
            id: 'sub_123',
            deleted: true,
          },
        };

        nock(BASE_URL)
          .post('/subscriptions/sub_123/delete')
          .reply(200, mockResponse);

        const result = await connector.executeAction('delete_subscription', {
          subscriptionId: 'sub_123',
        });

        expect(result.success).toBe(true);
      });
    });
  });

  // ===========================================
  // Invoice Action Tests
  // ===========================================
  describe('invoice actions', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    describe('list_invoices', () => {
      it('should list invoices successfully', async () => {
        const mockResponse = {
          list: [{ invoice: { id: 'inv_1' } }, { invoice: { id: 'inv_2' } }],
        };

        nock(BASE_URL).get('/invoices').query(true).reply(200, mockResponse);

        const result = await connector.executeAction('list_invoices', {
          limit: 10,
        });

        expect(result.success).toBe(true);
        expect(result.data?.list).toHaveLength(2);
      });

      it('should filter by date', async () => {
        const mockResponse = { list: [] };

        nock(BASE_URL).get('/invoices').query(true).reply(200, mockResponse);

        const result = await connector.executeAction('list_invoices', {
          date_filter: 'after',
          date_value: '2024-01-01',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('get_invoice_pdf', () => {
      it('should get invoice PDF URL successfully', async () => {
        const mockResponse = {
          download: {
            download_url: 'https://chargebee.com/invoices/inv_123.pdf',
            valid_till: 1234567890,
            mime_type: 'application/pdf',
          },
        };

        nock(BASE_URL)
          .post('/invoices/inv_123/pdf')
          .reply(200, mockResponse);

        const result = await connector.executeAction('get_invoice_pdf', {
          invoiceId: 'inv_123',
        });

        expect(result.success).toBe(true);
        expect(result.data?.download?.download_url).toBeDefined();
      });
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unknown action');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should handle rate limit errors', async () => {
      nock(BASE_URL)
        .get('/customers')
        .query(true)
        .reply(429, { error_code: 'api_request_limit_exceeded' });

      const result = await connector.executeAction('list_customers', {});

      expect(result.success).toBe(false);
    });

    it('should handle server errors', async () => {
      nock(BASE_URL)
        .get('/customers')
        .query(true)
        .reply(500, { message: 'Internal server error' });

      const result = await connector.executeAction('list_customers', {});

      expect(result.success).toBe(false);
    });
  });
});
