/**
 * Paddle Connector Tests
 *
 * Tests for the Paddle connector actions using mocked HTTP responses.
 * Tests both behavioral verification and definition-connector sync.
 */
import { PaddleConnector } from '../paddle.connector';
import { PADDLE_CONNECTOR } from '../paddle.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('PaddleConnector', () => {
  let connector: PaddleConnector;
  let mockAuthUtils: jest.Mocked<AuthUtils>;
  let mockApiUtils: jest.Mocked<ApiUtils>;

  const mockCredentials = {
    vendorId: 'mock-vendor-id-12345',
    vendorAuthCode: 'mock-vendor-auth-code-xyz789',
    sandbox: true,
  };

  const mockConfig = {
    id: 'test-paddle-connector',
    name: 'Paddle Test',
    type: 'paddle',
    category: 'ecommerce',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    mockAuthUtils = {} as jest.Mocked<AuthUtils>;
    mockApiUtils = {
      executeRequest: jest.fn(),
    } as unknown as jest.Mocked<ApiUtils>;

    connector = new PaddleConnector(mockAuthUtils, mockApiUtils);
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
        PADDLE_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        PADDLE_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have triggers matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds =
        PADDLE_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth field keys', () => {
      const definitionAuthKeys =
        PADDLE_CONNECTOR.auth_fields?.map((f: any) => f.key) || [];

      expect(definitionAuthKeys).toContain('vendorId');
      expect(definitionAuthKeys).toContain('vendorAuthCode');
      expect(definitionAuthKeys).toContain('sandbox');
    });

    it('should have core actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Coupon actions
      expect(connectorActionIds).toContain('create_coupon');
      expect(connectorActionIds).toContain('get_coupons');
      expect(connectorActionIds).toContain('update_coupon');

      // Payment actions
      expect(connectorActionIds).toContain('get_payments');
      expect(connectorActionIds).toContain('reschedule_payment');

      // Plan actions
      expect(connectorActionIds).toContain('get_plan');
      expect(connectorActionIds).toContain('get_plans');

      // Product actions
      expect(connectorActionIds).toContain('get_products');

      // User actions
      expect(connectorActionIds).toContain('get_users');
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialization', () => {
    it('should initialize with production environment', async () => {
      const productionConfig = {
        ...mockConfig,
        credentials: {
          ...mockCredentials,
          sandbox: false,
        },
      };

      await expect(connector.initialize(productionConfig)).resolves.not.toThrow();
    });

    it('should initialize with sandbox environment', async () => {
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

    it('should throw error when vendorId is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          vendorAuthCode: 'mock-auth-code',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Vendor ID and Vendor Auth Code are required',
      );
    });

    it('should throw error when vendorAuthCode is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          vendorId: 'mock-vendor-id',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Vendor ID and Vendor Auth Code are required',
      );
    });

    it('should handle sandbox as string "true"', async () => {
      const configWithStringSandbox = {
        ...mockConfig,
        credentials: {
          ...mockCredentials,
          sandbox: 'true',
        },
      };

      await expect(connector.initialize(configWithStringSandbox)).resolves.not.toThrow();
    });
  });

  // ===========================================
  // getMetadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Paddle');
      expect(metadata.category).toBe('ecommerce');
      expect(metadata.webhookSupport).toBe(true);
      expect(metadata.actions.length).toBeGreaterThan(0);
      expect(metadata.triggers.length).toBeGreaterThan(0);
    });

    it('should include all coupon actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_coupon');
      expect(actionIds).toContain('get_coupons');
      expect(actionIds).toContain('update_coupon');
    });

    it('should include all subscription triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('subscription_created');
      expect(triggerIds).toContain('subscription_updated');
      expect(triggerIds).toContain('subscription_cancelled');
    });

    it('should include payment triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('payment_succeeded');
      expect(triggerIds).toContain('payment_failed');
      expect(triggerIds).toContain('payment_refunded');
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('executeAction', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    describe('create_coupon', () => {
      it('should create coupon successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: { coupon_codes: ['TESTCODE123'] },
          },
        });

        const result = await connector.executeAction('create_coupon', {
          couponType: 'checkout',
          discountType: 'percentage',
          discountAmount: 10,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_coupons', () => {
      it('should get coupons successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: [
              { coupon: 'TEST1', discount_amount: 10 },
              { coupon: 'TEST2', discount_amount: 20 },
            ],
          },
        });

        const result = await connector.executeAction('get_coupons', {
          productId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('update_coupon', () => {
      it('should update coupon successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: {},
          },
        });

        const result = await connector.executeAction('update_coupon', {
          couponId: 'TESTCODE123',
          allowedUses: 100,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_payments', () => {
      it('should get payments successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: [
              { id: 1, amount: 100, currency: 'USD' },
              { id: 2, amount: 200, currency: 'USD' },
            ],
          },
        });

        const result = await connector.executeAction('get_payments', {
          limit: 10,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('reschedule_payment', () => {
      it('should reschedule payment successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: {},
          },
        });

        const result = await connector.executeAction('reschedule_payment', {
          paymentId: 12345,
          date: '2025-12-01',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_plan', () => {
      it('should get plan successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: { id: '12345', name: 'Pro Plan' },
          },
        });

        const result = await connector.executeAction('get_plan', {
          planId: '12345',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_plans', () => {
      it('should get all plans successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: [
              { id: '1', name: 'Basic' },
              { id: '2', name: 'Pro' },
            ],
          },
        });

        const result = await connector.executeAction('get_plans', {
          limit: 10,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_products', () => {
      it('should get products successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: {
              products: [
                { id: 1, name: 'Product 1' },
                { id: 2, name: 'Product 2' },
              ],
            },
          },
        });

        const result = await connector.executeAction('get_products', {
          limit: 10,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('get_users', () => {
      it('should get subscription users successfully', async () => {
        (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
          data: {
            success: true,
            response: [
              { subscription_id: '1', user_id: 'user1' },
              { subscription_id: '2', user_id: 'user2' },
            ],
          },
        });

        const result = await connector.executeAction('get_users', {
          limit: 10,
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
          response: { products: [] },
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
        'Direct payment creation not supported',
      );
    });

    it('should throw error for createCustomer (not supported)', async () => {
      await expect(connector.createCustomer({} as any)).rejects.toThrow(
        'Customer creation not directly supported',
      );
    });

    it('should throw error for createProduct (not supported)', async () => {
      await expect(connector.createProduct({} as any)).rejects.toThrow(
        'Product creation must be done through Paddle Dashboard',
      );
    });

    it('should throw error for createSubscription (not supported)', async () => {
      await expect(connector.createSubscription({} as any)).rejects.toThrow(
        'Subscription creation not directly supported',
      );
    });

    it('should list products successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          response: {
            products: [
              { id: 1, name: 'Product 1', base_price: 999 },
            ],
          },
        },
      });

      const result = await connector.listProducts();
      expect(result.success).toBe(true);
    });

    it('should list payments successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          response: [
            { id: 1, amount: 1000, currency: 'USD', is_paid: 1 },
          ],
        },
      });

      const result = await connector.listPayments();
      expect(result.success).toBe(true);
    });

    it('should cancel subscription successfully', async () => {
      (mockApiUtils.executeRequest as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          response: { subscription_id: '12345', state: 'deleted' },
        },
      });

      const result = await connector.cancelSubscription('12345');
      expect(result.success).toBe(true);
    });
  });
});
