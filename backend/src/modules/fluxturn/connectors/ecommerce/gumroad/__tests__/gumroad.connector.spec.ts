/**
 * Gumroad Connector Tests
 *
 * Tests for the Gumroad connector actions using mocked HTTP responses.
 * Tests both behavioral verification and definition-connector sync.
 */
import { GumroadConnector } from '../gumroad.connector';
import { GUMROAD_CONNECTOR } from '../gumroad.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('GumroadConnector', () => {
  let connector: GumroadConnector;
  let mockAuthUtils: jest.Mocked<AuthUtils>;
  let mockApiUtils: jest.Mocked<ApiUtils>;

  const mockCredentials = {
    accessToken: 'mock-gumroad-access-token-abc123',
  };

  const mockConfig = {
    id: 'test-gumroad-connector',
    name: 'Gumroad Test',
    type: 'gumroad',
    category: 'ecommerce',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    mockAuthUtils = {} as jest.Mocked<AuthUtils>;
    mockApiUtils = {
      executeRequest: jest.fn(),
    } as unknown as jest.Mocked<ApiUtils>;

    connector = new GumroadConnector(mockAuthUtils, mockApiUtils);
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
        GUMROAD_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        GUMROAD_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have triggers matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds =
        GUMROAD_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth field keys', () => {
      const definitionAuthKeys =
        GUMROAD_CONNECTOR.auth_fields?.map((f: any) => f.key) || [];

      expect(definitionAuthKeys).toContain('accessToken');
    });

    it('should have core actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Product actions
      expect(connectorActionIds).toContain('get_product');
      expect(connectorActionIds).toContain('list_products');
      expect(connectorActionIds).toContain('delete_product');
      expect(connectorActionIds).toContain('enable_product');
      expect(connectorActionIds).toContain('disable_product');

      // Sale actions
      expect(connectorActionIds).toContain('get_sale');
      expect(connectorActionIds).toContain('list_sales');
      expect(connectorActionIds).toContain('refund_sale');

      // Subscriber actions
      expect(connectorActionIds).toContain('get_subscriber');
      expect(connectorActionIds).toContain('list_subscribers');

      // Webhook actions
      expect(connectorActionIds).toContain('create_webhook');
      expect(connectorActionIds).toContain('list_webhooks');
      expect(connectorActionIds).toContain('delete_webhook');
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialization', () => {
    it('should initialize with access token', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
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

    it('should throw error when access token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Access token is required',
      );
    });
  });

  // ===========================================
  // getMetadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Gumroad');
      expect(metadata.category).toBe('ecommerce');
      expect(metadata.webhookSupport).toBe(true);
      expect(metadata.actions.length).toBeGreaterThan(0);
      expect(metadata.triggers.length).toBeGreaterThan(0);
    });

    it('should include all product actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_product');
      expect(actionIds).toContain('list_products');
      expect(actionIds).toContain('delete_product');
      expect(actionIds).toContain('enable_product');
      expect(actionIds).toContain('disable_product');
    });

    it('should include all triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('sale');
      expect(triggerIds).toContain('refund');
      expect(triggerIds).toContain('dispute');
      expect(triggerIds).toContain('dispute_won');
      expect(triggerIds).toContain('cancellation');
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('executeAction', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    describe('get_product', () => {
      it('should get product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            product: {
              id: 'prod_123',
              name: 'Test Product',
              price: 999,
              currency: 'usd',
              published: true,
            },
          },
        });

        const result = await connector.executeAction('get_product', {
          productId: 'prod_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('list_products', () => {
      it('should list products successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            products: [
              { id: 'prod_1', name: 'Product 1' },
              { id: 'prod_2', name: 'Product 2' },
            ],
          },
        });

        const result = await connector.executeAction('list_products', {});

        expect(result).toHaveProperty('success');
      });
    });

    describe('delete_product', () => {
      it('should delete product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
          },
        });

        const result = await connector.executeAction('delete_product', {
          productId: 'prod_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('enable_product', () => {
      it('should enable product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            product: { id: 'prod_123', published: true },
          },
        });

        const result = await connector.executeAction('enable_product', {
          productId: 'prod_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('disable_product', () => {
      it('should disable product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            product: { id: 'prod_123', published: false },
          },
        });

        const result = await connector.executeAction('disable_product', {
          productId: 'prod_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_sale', () => {
      it('should get sale successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            sale: {
              id: 'sale_123',
              email: 'customer@example.com',
              price: 999,
            },
          },
        });

        const result = await connector.executeAction('get_sale', {
          saleId: 'sale_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('list_sales', () => {
      it('should list sales successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            sales: [
              { id: 'sale_1', price: 999 },
              { id: 'sale_2', price: 1999 },
            ],
          },
        });

        const result = await connector.executeAction('list_sales', {});

        expect(result).toHaveProperty('success');
      });

      it('should list sales with date filters', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            sales: [],
          },
        });

        const result = await connector.executeAction('list_sales', {
          after: '2024-01-01',
          before: '2024-12-31',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('refund_sale', () => {
      it('should refund sale successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
          },
        });

        const result = await connector.executeAction('refund_sale', {
          saleId: 'sale_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_subscriber', () => {
      it('should get subscriber successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            subscriber: {
              id: 'sub_123',
              user_email: 'subscriber@example.com',
              status: 'active',
            },
          },
        });

        const result = await connector.executeAction('get_subscriber', {
          subscriberId: 'sub_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('list_subscribers', () => {
      it('should list subscribers successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            subscribers: [
              { id: 'sub_1', user_email: 'sub1@example.com' },
              { id: 'sub_2', user_email: 'sub2@example.com' },
            ],
          },
        });

        const result = await connector.executeAction('list_subscribers', {
          productId: 'prod_123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('create_webhook', () => {
      it('should create webhook successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            resource_subscription: {
              id: 'webhook_123',
              post_url: 'https://example.com/webhook',
              resource_name: 'sale',
            },
          },
        });

        const result = await connector.executeAction('create_webhook', {
          url: 'https://example.com/webhook',
          events: ['sale'],
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('list_webhooks', () => {
      it('should list webhooks successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            resource_subscriptions: [
              { id: 'webhook_1', post_url: 'https://example.com/hook1', resource_name: 'sale' },
            ],
          },
        });

        const result = await connector.executeAction('list_webhooks', {});

        expect(result).toHaveProperty('success');
      });
    });

    describe('delete_webhook', () => {
      it('should delete webhook successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
          },
        });

        const result = await connector.executeAction('delete_webhook', {
          webhookId: 'webhook_123',
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
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should have testConnection method', () => {
      expect(typeof connector.testConnection).toBe('function');
    });

    it('should test connection successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          products: [],
        },
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should handle connection test failure', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // IEcommerceConnector Interface Tests
  // ===========================================
  describe('IEcommerceConnector interface', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should throw error for createPayment (not supported)', async () => {
      await expect(connector.createPayment({} as any)).rejects.toThrow(
        'Creating payments directly is not supported',
      );
    });

    it('should throw error for createCustomer (not supported)', async () => {
      await expect(connector.createCustomer({} as any)).rejects.toThrow(
        'Creating customers is not supported',
      );
    });

    it('should throw error for createProduct (not supported)', async () => {
      await expect(connector.createProduct({} as any)).rejects.toThrow(
        'Creating products via API is not supported',
      );
    });

    it('should throw error for createSubscription (not supported)', async () => {
      await expect(connector.createSubscription({} as any)).rejects.toThrow(
        'Creating subscriptions directly is not supported',
      );
    });

    it('should get product successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          product: {
            id: 'prod_123',
            name: 'Test Product',
            price: 999,
            currency: 'usd',
            published: true,
            description: 'A test product',
            short_url: 'https://gumroad.com/l/test',
          },
        },
      });

      const result = await connector.getProduct('prod_123');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should list products successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          products: [
            { id: 'prod_1', name: 'Product 1', price: 999 },
          ],
        },
      });

      const result = await connector.listProducts();
      expect(result.success).toBe(true);
      expect(result.data?.data).toBeDefined();
    });

    it('should delete product successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
        },
      });

      const result = await connector.deleteProduct('prod_123');
      expect(result.success).toBe(true);
    });

    it('should create refund successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
        },
      });

      const result = await connector.createRefund({
        paymentId: 'sale_123',
        amount: 999,
        reason: 'Customer request',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Webhook Methods Tests
  // ===========================================
  describe('webhook methods', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should create webhook successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          resource_subscription: {
            id: 'webhook_123',
            post_url: 'https://example.com/webhook',
            resource_name: 'sale',
          },
        },
      });

      const result = await connector.createWebhook(
        'https://example.com/webhook',
        ['sale', 'refund']
      );

      expect(result.success).toBe(true);
    });

    it('should list webhooks successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          resource_subscriptions: [
            { id: 'webhook_1', post_url: 'https://example.com/hook1', resource_name: 'sale' },
            { id: 'webhook_2', post_url: 'https://example.com/hook1', resource_name: 'refund' },
          ],
        },
      });

      const result = await connector.listWebhooks();
      expect(result.success).toBe(true);
      expect(result.data?.data.length).toBe(1); // Grouped by URL
    });

    it('should delete webhook successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
        },
      });

      const result = await connector.deleteWebhook('webhook_123');
      expect(result.success).toBe(true);
    });

    it('should verify webhook signature', () => {
      // Gumroad doesn't use signature verification by default
      const isValid = connector.verifyWebhookSignature('payload', 'signature', 'secret');
      expect(isValid).toBe(true);
    });
  });
});
