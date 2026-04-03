/**
 * QuickBooks Connector Tests
 *
 * Tests for the QuickBooks connector actions using mocked HTTP responses.
 */
import { QuickBooksConnector } from '../quickbooks.connector';
import { QUICKBOOKS_CONNECTOR } from '../quickbooks.definition';
import { ConnectorCategory, ConnectorType, AuthType } from '../../../types';

// Mock axios
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockInstance),
    default: {
      create: jest.fn(() => mockInstance),
    },
    __mockInstance: mockInstance,
  };
});

describe('QuickBooksConnector', () => {
  let connector: QuickBooksConnector;
  let mockAxiosInstance: any;
  const REALM_ID = '1234567890';

  const mockCredentials = {
    accessToken: 'mock-quickbooks-access-token',
    refreshToken: 'mock-quickbooks-refresh-token',
    realmId: REALM_ID,
    environment: 'sandbox',
  };

  const mockCompanyInfo = {
    CompanyInfo: {
      CompanyName: 'Test Company',
      LegalName: 'Test Company LLC',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const axios = require('axios');
    mockAxiosInstance = axios.__mockInstance;

    // Reset all mock implementations
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.delete.mockReset();

    connector = new QuickBooksConnector();
    await connector.initialize({
      id: 'test-quickbooks-id',
      name: 'Test QuickBooks',
      type: ConnectorType.QUICKBOOKS,
      category: ConnectorCategory.FINANCE,
      credentials: mockCredentials,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('QuickBooks');
      expect(metadata.category).toBe(ConnectorCategory.FINANCE);
      expect(metadata.type).toBe(ConnectorType.QUICKBOOKS);
      expect(metadata.authType).toBe(AuthType.OAUTH2);
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should include rate limit configuration', () => {
      const metadata = connector.getMetadata();

      expect(metadata.rateLimit).toBeDefined();
      expect(metadata.rateLimit?.requestsPerMinute).toBe(500);
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have matching auth type', () => {
      expect(QUICKBOOKS_CONNECTOR.auth_type).toBe('multiple');
    });

    it('should have oauth config defined', () => {
      expect(QUICKBOOKS_CONNECTOR.oauth_config).toBeDefined();
      expect(QUICKBOOKS_CONNECTOR.oauth_config?.authorization_url).toContain('intuit.com');
      expect(QUICKBOOKS_CONNECTOR.oauth_config?.token_url).toContain('intuit.com');
      expect(QUICKBOOKS_CONNECTOR.oauth_config?.scopes).toContain('com.intuit.quickbooks.accounting');
    });

    it('should have core actions defined', () => {
      const definitionActionIds = QUICKBOOKS_CONNECTOR.supported_actions?.map(
        (a: any) => a.id
      ) || [];

      // Customer actions
      expect(definitionActionIds).toContain('create_customer');
      expect(definitionActionIds).toContain('get_customer');
      expect(definitionActionIds).toContain('get_all_customers');
      expect(definitionActionIds).toContain('update_customer');

      // Invoice actions
      expect(definitionActionIds).toContain('create_invoice');
      expect(definitionActionIds).toContain('get_invoice');
      expect(definitionActionIds).toContain('get_all_invoices');
      expect(definitionActionIds).toContain('send_invoice');
      expect(definitionActionIds).toContain('void_invoice');

      // Bill actions
      expect(definitionActionIds).toContain('create_bill');
      expect(definitionActionIds).toContain('get_bill');
      expect(definitionActionIds).toContain('get_all_bills');

      // Payment actions
      expect(definitionActionIds).toContain('create_payment');
      expect(definitionActionIds).toContain('get_payment');
      expect(definitionActionIds).toContain('get_all_payments');

      // Item actions
      expect(definitionActionIds).toContain('create_item');
      expect(definitionActionIds).toContain('get_item');
      expect(definitionActionIds).toContain('get_all_items');

      // Vendor actions
      expect(definitionActionIds).toContain('create_vendor');
      expect(definitionActionIds).toContain('get_vendor');
      expect(definitionActionIds).toContain('get_all_vendors');
    });

    it('should have triggers defined', () => {
      const triggerIds = QUICKBOOKS_CONNECTOR.supported_triggers?.map(
        (t: any) => t.id
      ) || [];

      expect(triggerIds).toContain('invoice_created');
      expect(triggerIds).toContain('invoice_updated');
      expect(triggerIds).toContain('payment_created');
      expect(triggerIds).toContain('customer_created');
      expect(triggerIds).toContain('customer_updated');
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockCompanyInfo,
        status: 200,
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Unauthorized',
        response: { status: 401 },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Customer Actions
  // ===========================================
  describe('create_customer', () => {
    it('should create customer successfully', async () => {
      const mockCustomer = {
        Id: '123',
        DisplayName: 'John Doe',
        Balance: 0,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Customer: mockCustomer },
        status: 200,
      });

      const result = await connector.executeAction('create_customer', {
        DisplayName: 'John Doe',
        GivenName: 'John',
        FamilyName: 'Doe',
      });

      expect(result.success).toBe(true);
    });

    it('should handle duplicate customer error', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        message: 'Duplicate Name Exists',
        response: {
          status: 400,
          data: { Fault: { Error: [{ Message: 'Duplicate Name Exists' }] } },
        },
      });

      const result = await connector.executeAction('create_customer', {
        DisplayName: 'Existing Customer',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('get_customer', () => {
    it('should get customer by ID', async () => {
      const mockCustomer = {
        Id: '123',
        DisplayName: 'John Doe',
        Balance: 100,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { Customer: mockCustomer },
        status: 200,
      });

      const result = await connector.executeAction('get_customer', {
        customerId: '123',
      });

      expect(result.success).toBe(true);
    });

    it('should handle customer not found', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Object Not Found',
        response: {
          status: 400,
          data: { Fault: { Error: [{ Message: 'Object Not Found' }] } },
        },
      });

      const result = await connector.executeAction('get_customer', {
        customerId: '999',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('get_customers', () => {
    it('should get all customers', async () => {
      const mockCustomers = [
        { Id: '1', DisplayName: 'Customer 1' },
        { Id: '2', DisplayName: 'Customer 2' },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Customer: mockCustomers } },
        status: 200,
      });

      const result = await connector.executeAction('get_customers', {});

      expect(result.success).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Customer: [] } },
        status: 200,
      });

      const result = await connector.executeAction('get_customers', {
        maxResults: 10,
        startPosition: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('update_customer', () => {
    it('should update customer successfully', async () => {
      const mockCustomer = {
        Id: '123',
        DisplayName: 'John Doe Updated',
        SyncToken: '1',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Customer: mockCustomer },
        status: 200,
      });

      const result = await connector.executeAction('update_customer', {
        Id: '123',
        SyncToken: '0',
        DisplayName: 'John Doe Updated',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Invoice Actions
  // ===========================================
  describe('create_invoice', () => {
    it('should create invoice successfully', async () => {
      const mockInvoice = {
        Id: 'INV-001',
        TotalAmt: 500,
        Balance: 500,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Invoice: mockInvoice },
        status: 200,
      });

      const result = await connector.executeAction('create_invoice', {
        CustomerRef: { value: '123' },
        Line: [
          {
            Amount: 500,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: '1' },
            },
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_invoice', () => {
    it('should get invoice by ID', async () => {
      const mockInvoice = {
        Id: 'INV-001',
        TotalAmt: 500,
        Balance: 250,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { Invoice: mockInvoice },
        status: 200,
      });

      const result = await connector.executeAction('get_invoice', {
        invoiceId: 'INV-001',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_invoices', () => {
    it('should get all invoices', async () => {
      const mockInvoices = [
        { Id: 'INV-001', TotalAmt: 500 },
        { Id: 'INV-002', TotalAmt: 1000 },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Invoice: mockInvoices } },
        status: 200,
      });

      const result = await connector.executeAction('get_invoices', {});

      expect(result.success).toBe(true);
    });
  });

  describe('send_invoice', () => {
    it('should send invoice via email', async () => {
      const mockInvoice = { Id: 'INV-001', EmailStatus: 'EmailSent' };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Invoice: mockInvoice },
        status: 200,
      });

      const result = await connector.executeAction('send_invoice', {
        invoiceId: 'INV-001',
        email: 'customer@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should send invoice to default email when not specified', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Invoice: { Id: 'INV-002' } },
        status: 200,
      });

      const result = await connector.executeAction('send_invoice', {
        invoiceId: 'INV-002',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('void_invoice', () => {
    it('should void invoice successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Invoice: { Id: 'INV-001', void: true } },
        status: 200,
      });

      const result = await connector.executeAction('void_invoice', {
        Id: 'INV-001',
        SyncToken: '0',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Payment Actions
  // ===========================================
  describe('create_payment', () => {
    it('should create payment successfully', async () => {
      const mockPayment = {
        Id: 'PMT-001',
        TotalAmt: 500,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Payment: mockPayment },
        status: 200,
      });

      const result = await connector.executeAction('create_payment', {
        CustomerRef: { value: '123' },
        TotalAmt: 500,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_payment', () => {
    it('should get payment by ID', async () => {
      const mockPayment = { Id: 'PMT-001', TotalAmt: 500 };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { Payment: mockPayment },
        status: 200,
      });

      const result = await connector.executeAction('get_payment', {
        paymentId: 'PMT-001',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_payments', () => {
    it('should get all payments', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Payment: [] } },
        status: 200,
      });

      const result = await connector.executeAction('get_payments', {});

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Bill Actions
  // ===========================================
  describe('create_bill', () => {
    it('should create bill successfully', async () => {
      const mockBill = { Id: 'BILL-001', TotalAmt: 1000 };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Bill: mockBill },
        status: 200,
      });

      const result = await connector.executeAction('create_bill', {
        VendorRef: { value: '456' },
        Line: [{ Amount: 1000 }],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_bill', () => {
    it('should get bill by ID', async () => {
      const mockBill = { Id: 'BILL-001', TotalAmt: 1000 };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { Bill: mockBill },
        status: 200,
      });

      const result = await connector.executeAction('get_bill', {
        billId: 'BILL-001',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_bills', () => {
    it('should get all bills', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Bill: [] } },
        status: 200,
      });

      const result = await connector.executeAction('get_bills', {});

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Item Actions
  // ===========================================
  describe('create_item', () => {
    it('should create item successfully', async () => {
      const mockItem = { Id: 'ITEM-001', Name: 'Widget' };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Item: mockItem },
        status: 200,
      });

      const result = await connector.executeAction('create_item', {
        Name: 'Widget',
        Type: 'Service',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_item', () => {
    it('should get item by ID', async () => {
      const mockItem = { Id: 'ITEM-001', Name: 'Widget' };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { Item: mockItem },
        status: 200,
      });

      const result = await connector.executeAction('get_item', {
        itemId: 'ITEM-001',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_items', () => {
    it('should get all items', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Item: [] } },
        status: 200,
      });

      const result = await connector.executeAction('get_items', {});

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Vendor Actions
  // ===========================================
  describe('create_vendor', () => {
    it('should create vendor successfully', async () => {
      const mockVendor = { Id: 'VEND-001', DisplayName: 'Supplier Inc' };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { Vendor: mockVendor },
        status: 200,
      });

      const result = await connector.executeAction('create_vendor', {
        DisplayName: 'Supplier Inc',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_vendor', () => {
    it('should get vendor by ID', async () => {
      const mockVendor = { Id: 'VEND-001', DisplayName: 'Supplier Inc' };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { Vendor: mockVendor },
        status: 200,
      });

      const result = await connector.executeAction('get_vendor', {
        vendorId: 'VEND-001',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_vendors', () => {
    it('should get all vendors', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Vendor: [] } },
        status: 200,
      });

      const result = await connector.executeAction('get_vendors', {});

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Query Action
  // ===========================================
  describe('query', () => {
    it('should execute custom query successfully', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { QueryResponse: { Account: [] } },
        status: 200,
      });

      const result = await connector.executeAction('query', {
        query: 'SELECT * FROM Account',
      });

      expect(result.success).toBe(true);
    });

    it('should handle invalid query syntax', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Invalid query syntax',
        response: {
          status: 400,
          data: { Fault: { Error: [{ Message: 'Invalid query syntax' }] } },
        },
      });

      const result = await connector.executeAction('query', {
        query: 'INVALID QUERY',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('non_existent_action');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Rate limit exceeded',
        response: { status: 429 },
      });

      const result = await connector.executeAction('get_customer', {
        customerId: '123',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle server errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Internal server error',
        response: { status: 500 },
      });

      const result = await connector.executeAction('get_customer', {
        customerId: '123',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.executeAction('get_customer', {
        customerId: '123',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });
});
