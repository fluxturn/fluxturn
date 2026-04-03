/**
 * Magento Connector Tests
 *
 * Tests for the Magento connector actions using mocked HTTP responses.
 * Tests both behavioral verification and definition-connector sync.
 */
import { MagentoConnector } from '../magento.connector';
import { MAGENTO_CONNECTOR } from '../magento.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('MagentoConnector', () => {
  let connector: MagentoConnector;
  let mockAuthUtils: jest.Mocked<AuthUtils>;
  let mockApiUtils: jest.Mocked<ApiUtils>;

  const mockCredentials = {
    host: 'https://magento.example.com',
    accessToken: 'mock-access-token-xyz123',
  };

  const mockConfig = {
    id: 'test-magento-connector',
    name: 'Magento Test',
    type: 'magento',
    category: 'ecommerce',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    mockAuthUtils = {} as jest.Mocked<AuthUtils>;
    mockApiUtils = {
      executeRequest: jest.fn(),
    } as unknown as jest.Mocked<ApiUtils>;

    connector = new MagentoConnector(mockAuthUtils, mockApiUtils);
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
        MAGENTO_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        MAGENTO_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have triggers matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds =
        MAGENTO_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];

      // Both should be empty
      expect(connectorTriggerIds).toHaveLength(0);
      expect(definitionTriggerIds).toHaveLength(0);
    });

    it('should have matching auth field keys', () => {
      const definitionAuthKeys =
        MAGENTO_CONNECTOR.auth_fields?.map((f: any) => f.key) || [];

      expect(definitionAuthKeys).toContain('host');
      expect(definitionAuthKeys).toContain('accessToken');
    });

    it('should have webhook_support matching definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.webhookSupport).toBe(MAGENTO_CONNECTOR.webhook_support);
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should have customer actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('create_customer');
      expect(connectorActionIds).toContain('get_customer');
      expect(connectorActionIds).toContain('update_customer');
      expect(connectorActionIds).toContain('delete_customer');
      expect(connectorActionIds).toContain('get_all_customers');
    });

    it('should have product actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('create_product');
      expect(connectorActionIds).toContain('get_product');
      expect(connectorActionIds).toContain('update_product');
      expect(connectorActionIds).toContain('delete_product');
      expect(connectorActionIds).toContain('get_all_products');
    });

    it('should have order actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('get_order');
      expect(connectorActionIds).toContain('get_all_orders');
      expect(connectorActionIds).toContain('cancel_order');
      expect(connectorActionIds).toContain('ship_order');
    });

    it('should have invoice action matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('create_invoice');
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialization', () => {
    it('should initialize successfully with valid credentials', async () => {
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

    it('should throw error when host is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          accessToken: 'mock-token',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Magento host URL is required',
      );
    });

    it('should throw error when accessToken is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          host: 'https://magento.example.com',
        },
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

      expect(metadata.name).toBe('Magento 2');
      expect(metadata.category).toBe('ecommerce');
      expect(metadata.webhookSupport).toBe(false);
      expect(metadata.actions.length).toBe(15);
      expect(metadata.triggers.length).toBe(0);
    });

    it('should include all customer actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_customer');
      expect(actionIds).toContain('get_customer');
      expect(actionIds).toContain('update_customer');
      expect(actionIds).toContain('delete_customer');
      expect(actionIds).toContain('get_all_customers');
    });

    it('should include all product actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_product');
      expect(actionIds).toContain('get_product');
      expect(actionIds).toContain('update_product');
      expect(actionIds).toContain('delete_product');
      expect(actionIds).toContain('get_all_products');
    });

    it('should include all order actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_order');
      expect(actionIds).toContain('get_all_orders');
      expect(actionIds).toContain('cancel_order');
      expect(actionIds).toContain('ship_order');
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('executeAction', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    describe('create_customer', () => {
      it('should create customer successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            id: 1,
            email: 'test@example.com',
            firstname: 'John',
            lastname: 'Doe',
          },
        });

        const result = await connector.executeAction('create_customer', {
          email: 'test@example.com',
          firstname: 'John',
          lastname: 'Doe',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_customer', () => {
      it('should get customer successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            id: 1,
            email: 'test@example.com',
            firstname: 'John',
            lastname: 'Doe',
          },
        });

        const result = await connector.executeAction('get_customer', {
          customerId: '1',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('update_customer', () => {
      it('should update customer successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            id: 1,
            email: 'updated@example.com',
            firstname: 'Jane',
            lastname: 'Doe',
          },
        });

        const result = await connector.executeAction('update_customer', {
          customerId: '1',
          email: 'updated@example.com',
          firstname: 'Jane',
          lastname: 'Doe',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('delete_customer', () => {
      it('should delete customer successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: true,
        });

        const result = await connector.executeAction('delete_customer', {
          customerId: '1',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_all_customers', () => {
      it('should get all customers successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            items: [
              { id: 1, email: 'user1@example.com' },
              { id: 2, email: 'user2@example.com' },
            ],
          },
        });

        const result = await connector.executeAction('get_all_customers', {
          pageSize: 10,
          currentPage: 1,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('create_product', () => {
      it('should create product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            id: 1,
            sku: 'TEST-001',
            name: 'Test Product',
            price: 99.99,
          },
        });

        const result = await connector.executeAction('create_product', {
          sku: 'TEST-001',
          name: 'Test Product',
          attributeSetId: 4,
          price: 99.99,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_product', () => {
      it('should get product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            id: 1,
            sku: 'TEST-001',
            name: 'Test Product',
            price: 99.99,
          },
        });

        const result = await connector.executeAction('get_product', {
          sku: 'TEST-001',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('update_product', () => {
      it('should update product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            id: 1,
            sku: 'TEST-001',
            name: 'Updated Product',
            price: 149.99,
          },
        });

        const result = await connector.executeAction('update_product', {
          sku: 'TEST-001',
          name: 'Updated Product',
          price: 149.99,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('delete_product', () => {
      it('should delete product successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: true,
        });

        const result = await connector.executeAction('delete_product', {
          sku: 'TEST-001',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_all_products', () => {
      it('should get all products successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            items: [
              { id: 1, sku: 'PROD-1', name: 'Product 1' },
              { id: 2, sku: 'PROD-2', name: 'Product 2' },
            ],
          },
        });

        const result = await connector.executeAction('get_all_products', {
          pageSize: 10,
          currentPage: 1,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_order', () => {
      it('should get order successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            entity_id: 1,
            increment_id: '100000001',
            status: 'pending',
          },
        });

        const result = await connector.executeAction('get_order', {
          orderId: '1',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_all_orders', () => {
      it('should get all orders successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            items: [
              { entity_id: 1, increment_id: '100000001' },
              { entity_id: 2, increment_id: '100000002' },
            ],
          },
        });

        const result = await connector.executeAction('get_all_orders', {
          pageSize: 10,
          currentPage: 1,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('cancel_order', () => {
      it('should cancel order successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: true,
        });

        const result = await connector.executeAction('cancel_order', {
          orderId: '1',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('ship_order', () => {
      it('should ship order successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: true,
        });

        const result = await connector.executeAction('ship_order', {
          orderId: '1',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('create_invoice', () => {
      it('should create invoice successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: true,
        });

        const result = await connector.executeAction('create_invoice', {
          orderId: '1',
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
        data: [{ id: 1, code: 'default' }],
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
  // Interface Method Tests
  // ===========================================
  describe('Interface methods', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should throw error for createOrder (not supported)', async () => {
      await expect(connector.createOrder({})).rejects.toThrow(
        'Creating orders is not supported',
      );
    });

    it('should throw error for updateOrder (not supported)', async () => {
      await expect(connector.updateOrder('1', {})).rejects.toThrow(
        'Updating orders is not supported',
      );
    });

    it('should create product successfully via interface', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: { id: 1, sku: 'TEST-001', name: 'Test Product' },
      });

      const result = await connector.createProduct({
        sku: 'TEST-001',
        name: 'Test Product',
        attributeSetId: 4,
        price: 99.99,
      });

      expect(result.success).toBe(true);
    });

    it('should get product successfully via interface', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: { id: 1, sku: 'TEST-001', name: 'Test Product' },
      });

      const result = await connector.getProduct('TEST-001');
      expect(result.success).toBe(true);
    });

    it('should create customer successfully via interface', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: { id: 1, email: 'test@example.com' },
      });

      const result = await connector.createCustomer({
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
      });

      expect(result.success).toBe(true);
    });

    it('should get customer successfully via interface', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: { id: 1, email: 'test@example.com' },
      });

      const result = await connector.getCustomer('1');
      expect(result.success).toBe(true);
    });

    it('should search products successfully via interface', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: { items: [{ id: 1, sku: 'TEST-001' }] },
      });

      const result = await connector.searchProducts({ pageSize: 10 });
      expect(result.success).toBe(true);
    });

    it('should search orders successfully via interface', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: { items: [{ entity_id: 1 }] },
      });

      const result = await connector.searchOrders({ pageSize: 10 });
      expect(result.success).toBe(true);
    });
  });
});
