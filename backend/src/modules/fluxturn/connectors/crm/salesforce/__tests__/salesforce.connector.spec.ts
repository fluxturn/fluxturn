import { Test, TestingModule } from '@nestjs/testing';
import { SalesforceConnector } from '../salesforce.connector';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import { ConnectorCategory, ConnectorType, AuthType, ConnectorConfig } from '../../../types';
import { getMockCredentials, OAUTH_MOCK_CREDENTIALS } from '../../../../../../../test/helpers/mock-credentials';

// Mock jsforce
jest.mock('jsforce', () => {
  const mockSObject = {
    create: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
    destroy: jest.fn(),
    describe: jest.fn(),
  };

  const mockConnection = {
    identity: jest.fn(),
    limits: jest.fn(),
    query: jest.fn(),
    search: jest.fn(),
    logout: jest.fn(),
    accessToken: 'mock-access-token',
    instanceUrl: 'https://mock.salesforce.com',
    sobject: jest.fn(() => mockSObject),
    oauth2: {
      refreshToken: jest.fn(),
    },
  };

  return {
    Connection: jest.fn(() => mockConnection),
    __mockConnection: mockConnection,
    __mockSObject: mockSObject,
  };
});

describe('SalesforceConnector', () => {
  let connector: SalesforceConnector;
  let mockConnection: any;
  let mockSObject: any;

  const mockCredentials = getMockCredentials('salesforce');
  const oauthCredentials = OAUTH_MOCK_CREDENTIALS.google; // Use google as fallback pattern

  // Helper to create valid ConnectorConfig
  const createConfig = (credentials: any, settings: any = {}): ConnectorConfig => ({
    id: 'test-salesforce-id',
    name: 'Test Salesforce',
    type: ConnectorType.SALESFORCE,
    category: ConnectorCategory.CRM,
    credentials,
    settings,
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mock references
    const jsforce = require('jsforce');
    mockConnection = jsforce.__mockConnection;
    mockSObject = jsforce.__mockSObject;

    // Setup default mock returns
    mockConnection.identity.mockResolvedValue({ user_id: 'mock-user-id' });
    mockConnection.limits.mockResolvedValue({
      DailyApiRequests: { Remaining: 10000 },
    });
    mockConnection.query.mockResolvedValue({
      records: [],
      done: true,
    });
    mockConnection.search.mockResolvedValue({
      searchRecords: [],
    });
    mockConnection.logout.mockResolvedValue(undefined);
    mockConnection.oauth2.refreshToken.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    mockSObject.create.mockResolvedValue({ id: 'mock-id-123', success: true });
    mockSObject.update.mockResolvedValue({ id: 'mock-id-123', success: true });
    mockSObject.retrieve.mockResolvedValue({ Id: 'mock-id-123', Name: 'Mock Record' });
    mockSObject.destroy.mockResolvedValue({ id: 'mock-id-123', success: true });
    mockSObject.describe.mockResolvedValue({
      fields: [
        { name: 'Id', custom: false },
        { name: 'Custom__c', custom: true },
      ],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesforceConnector,
        {
          provide: AuthUtils,
          useValue: {
            getAuthHeaders: jest.fn().mockReturnValue({
              Authorization: 'Bearer mock-token',
            }),
          },
        },
        {
          provide: ApiUtils,
          useValue: {
            executeRequest: jest.fn().mockResolvedValue({
              success: true,
              data: {},
            }),
          },
        },
      ],
    }).compile();

    connector = module.get<SalesforceConnector>(SalesforceConnector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Salesforce');
      expect(metadata.category).toBe(ConnectorCategory.CRM);
      expect(metadata.type).toBe(ConnectorType.SALESFORCE);
      expect(metadata.authType).toBe(AuthType.OAUTH2);
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should include rate limit configuration', () => {
      const metadata = connector.getMetadata();

      expect(metadata.rateLimit).toBeDefined();
      expect(metadata.rateLimit?.requestsPerMinute).toBe(100);
      expect(metadata.rateLimit?.requestsPerHour).toBe(5000);
      expect(metadata.rateLimit?.requestsPerDay).toBe(100000);
    });

    it('should include required OAuth scopes', () => {
      const metadata = connector.getMetadata();

      expect(metadata.requiredScopes).toBeDefined();
      expect(metadata.requiredScopes).toContain('api');
      expect(metadata.requiredScopes).toContain('refresh_token');
      expect(metadata.requiredScopes).toContain('full');
      expect(metadata.requiredScopes).toContain('chatter_api');
    });
  });

  describe('actions', () => {
    it('should define all required action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      // Account actions
      expect(actionIds).toContain('create_account');
      expect(actionIds).toContain('update_account');
      expect(actionIds).toContain('get_account');
      expect(actionIds).toContain('get_all_accounts');

      // Contact actions
      expect(actionIds).toContain('create_contact');
      expect(actionIds).toContain('update_contact');
      expect(actionIds).toContain('get_contact');
      expect(actionIds).toContain('get_all_contacts');
      expect(actionIds).toContain('delete_contact');

      // Lead actions
      expect(actionIds).toContain('create_lead');
      expect(actionIds).toContain('update_lead');
      expect(actionIds).toContain('get_lead');
      expect(actionIds).toContain('get_all_leads');
      expect(actionIds).toContain('delete_lead');

      // Opportunity actions
      expect(actionIds).toContain('create_opportunity');
      expect(actionIds).toContain('update_opportunity');
      expect(actionIds).toContain('get_opportunity');
      expect(actionIds).toContain('get_all_opportunities');
      expect(actionIds).toContain('delete_opportunity');

      // Case actions
      expect(actionIds).toContain('create_case');
      expect(actionIds).toContain('update_case');
      expect(actionIds).toContain('get_case');
      expect(actionIds).toContain('get_all_cases');

      // Task actions
      expect(actionIds).toContain('create_task');
      expect(actionIds).toContain('update_task');
      expect(actionIds).toContain('get_task');
      expect(actionIds).toContain('get_all_tasks');
      expect(actionIds).toContain('delete_task');

      // Search actions
      expect(actionIds).toContain('search_records');
      expect(actionIds).toContain('execute_soql');

      // Custom object actions
      expect(actionIds).toContain('create_custom_object');
      expect(actionIds).toContain('update_custom_object');
      expect(actionIds).toContain('get_custom_object');
    });

    it('should have input/output schemas for all actions', () => {
      const metadata = connector.getMetadata();

      for (const action of metadata.actions) {
        expect(action.inputSchema).toBeDefined();
        expect(action.outputSchema).toBeDefined();
        expect(action.name).toBeDefined();
        expect(action.description).toBeDefined();
      }
    });
  });

  describe('triggers', () => {
    it('should define all required trigger IDs', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('record_created');
      expect(triggerIds).toContain('record_updated');
      expect(triggerIds).toContain('record_deleted');
      expect(triggerIds).toContain('opportunity_stage_changed');
      expect(triggerIds).toContain('lead_converted');
      expect(triggerIds).toContain('case_escalated');
    });

    it('should have correct event types for triggers', () => {
      const metadata = connector.getMetadata();

      const recordCreated = metadata.triggers.find((t) => t.id === 'record_created');
      expect(recordCreated?.eventType).toBe('record.created');

      const recordUpdated = metadata.triggers.find((t) => t.id === 'record_updated');
      expect(recordUpdated?.eventType).toBe('record.updated');

      const recordDeleted = metadata.triggers.find((t) => t.id === 'record_deleted');
      expect(recordDeleted?.eventType).toBe('record.deleted');

      const opportunityChanged = metadata.triggers.find((t) => t.id === 'opportunity_stage_changed');
      expect(opportunityChanged?.eventType).toBe('opportunity.stage_changed');

      const leadConverted = metadata.triggers.find((t) => t.id === 'lead_converted');
      expect(leadConverted?.eventType).toBe('lead.converted');

      const caseEscalated = metadata.triggers.find((t) => t.id === 'case_escalated');
      expect(caseEscalated?.eventType).toBe('case.escalated');
    });

    it('should mark all triggers as webhook required', () => {
      const metadata = connector.getMetadata();

      for (const trigger of metadata.triggers) {
        expect(trigger.webhookRequired).toBe(true);
      }
    });

    it('should have output schemas for all triggers', () => {
      const metadata = connector.getMetadata();

      for (const trigger of metadata.triggers) {
        expect(trigger.outputSchema).toBeDefined();
        expect(Object.keys(trigger.outputSchema).length).toBeGreaterThan(0);
      }
    });
  });

  describe('ICRMConnector interface', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    describe('createContact', () => {
      it('should create a contact successfully', async () => {
        const response = await connector.createContact({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.create).toHaveBeenCalledWith(
          expect.objectContaining({
            FirstName: 'John',
            LastName: 'Doe',
            Email: 'john.doe@example.com',
            Phone: '+1234567890',
          }),
        );
      });

      it('should handle contact creation failure', async () => {
        mockSObject.create.mockRejectedValueOnce(new Error('Creation failed'));

        const response = await connector.createContact({
          firstName: 'John',
          lastName: 'Doe',
        });

        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      });
    });

    describe('updateContact', () => {
      it('should update a contact successfully', async () => {
        const response = await connector.updateContact('003xxx', {
          firstName: 'Jane',
          email: 'jane.doe@example.com',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.update).toHaveBeenCalledWith(
          expect.objectContaining({
            Id: '003xxx',
            FirstName: 'Jane',
            Email: 'jane.doe@example.com',
          }),
        );
      });
    });

    describe('getContact', () => {
      it('should retrieve a contact by ID', async () => {
        mockSObject.retrieve.mockResolvedValueOnce({
          Id: '003xxx',
          FirstName: 'John',
          LastName: 'Doe',
          Email: 'john@example.com',
        });

        const response = await connector.getContact('003xxx');

        expect(response.success).toBe(true);
        expect(response.data).toHaveProperty('FirstName', 'John');
        expect(mockSObject.retrieve).toHaveBeenCalledWith('003xxx');
      });
    });

    describe('deleteContact', () => {
      it('should delete a contact successfully', async () => {
        const response = await connector.deleteContact('003xxx');

        expect(response.success).toBe(true);
        expect(mockSObject.destroy).toHaveBeenCalledWith('003xxx');
      });
    });

    describe('createDeal', () => {
      it('should create an opportunity successfully', async () => {
        const response = await connector.createDeal({
          name: 'Big Deal',
          amount: 50000,
          stage: 'Prospecting',
          closeDate: '2024-12-31',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.create).toHaveBeenCalledWith(
          expect.objectContaining({
            Name: 'Big Deal',
            Amount: 50000,
            StageName: 'Prospecting',
          }),
        );
      });
    });

    describe('createCompany', () => {
      it('should create an account successfully', async () => {
        const response = await connector.createCompany({
          name: 'Acme Corp',
          website: 'https://acme.com',
          industry: 'Technology',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.create).toHaveBeenCalledWith(
          expect.objectContaining({
            Name: 'Acme Corp',
            Website: 'https://acme.com',
            Industry: 'Technology',
          }),
        );
      });
    });

    describe('searchContacts', () => {
      it('should search contacts with query', async () => {
        mockConnection.query.mockResolvedValueOnce({
          records: [
            { Id: '003xxx', FirstName: 'John', LastName: 'Doe' },
          ],
          done: true,
        });

        const response = await connector.searchContacts('John');

        expect(response.success).toBe(true);
        expect(mockConnection.query).toHaveBeenCalled();
      });
    });
  });

  describe('Lead operations', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    describe('createLead', () => {
      it('should create a lead successfully', async () => {
        const response = await connector.createLead({
          firstName: 'Jane',
          lastName: 'Smith',
          company: 'Tech Corp',
          email: 'jane@techcorp.com',
          status: 'Open',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.create).toHaveBeenCalledWith(
          expect.objectContaining({
            FirstName: 'Jane',
            LastName: 'Smith',
            Company: 'Tech Corp',
            Email: 'jane@techcorp.com',
            Status: 'Open',
          }),
        );
      });
    });

    describe('updateLead', () => {
      it('should update a lead successfully', async () => {
        const response = await connector.updateLead('00Qxxx', {
          status: 'Contacted',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.update).toHaveBeenCalledWith(
          expect.objectContaining({
            Id: '00Qxxx',
            Status: 'Contacted',
          }),
        );
      });
    });

    describe('getLead', () => {
      it('should retrieve a lead by ID', async () => {
        mockSObject.retrieve.mockResolvedValueOnce({
          Id: '00Qxxx',
          FirstName: 'Jane',
          LastName: 'Smith',
          Company: 'Tech Corp',
        });

        const response = await connector.getLead('00Qxxx');

        expect(response.success).toBe(true);
        expect(response.data).toHaveProperty('Company', 'Tech Corp');
      });
    });

    describe('deleteLead', () => {
      it('should delete a lead successfully', async () => {
        const response = await connector.deleteLead('00Qxxx');

        expect(response.success).toBe(true);
        expect(mockSObject.destroy).toHaveBeenCalledWith('00Qxxx');
      });
    });
  });

  describe('Case operations', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    describe('createCase', () => {
      it('should create a case successfully', async () => {
        const response = await connector.createCase({
          subject: 'Support Request',
          description: 'Customer needs help',
          status: 'New',
          priority: 'High',
          origin: 'Email',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.create).toHaveBeenCalledWith(
          expect.objectContaining({
            Subject: 'Support Request',
            Description: 'Customer needs help',
            Status: 'New',
            Priority: 'High',
            Origin: 'Email',
          }),
        );
      });
    });

    describe('updateCase', () => {
      it('should update a case successfully', async () => {
        const response = await connector.updateCase('500xxx', {
          status: 'Working',
          priority: 'Medium',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.update).toHaveBeenCalledWith(
          expect.objectContaining({
            Id: '500xxx',
            Status: 'Working',
            Priority: 'Medium',
          }),
        );
      });
    });

    describe('getCase', () => {
      it('should retrieve a case by ID', async () => {
        mockSObject.retrieve.mockResolvedValueOnce({
          Id: '500xxx',
          Subject: 'Support Request',
          Status: 'New',
        });

        const response = await connector.getCase('500xxx');

        expect(response.success).toBe(true);
        expect(response.data).toHaveProperty('Subject', 'Support Request');
      });
    });
  });

  describe('Task operations', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    describe('createActivity', () => {
      it('should create a task successfully', async () => {
        const response = await connector.createActivity({
          subject: 'Follow up call',
          description: 'Call the customer',
          priority: 'High',
          status: 'Not Started',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.create).toHaveBeenCalledWith(
          expect.objectContaining({
            Subject: 'Follow up call',
            Description: 'Call the customer',
            Priority: 'High',
            Status: 'Not Started',
          }),
        );
      });
    });

    describe('getTask', () => {
      it('should retrieve a task by ID', async () => {
        mockSObject.retrieve.mockResolvedValueOnce({
          Id: '00Txxx',
          Subject: 'Follow up call',
          Status: 'Not Started',
        });

        const response = await connector.getTask('00Txxx');

        expect(response.success).toBe(true);
        expect(response.data).toHaveProperty('Subject', 'Follow up call');
      });
    });

    describe('deleteTask', () => {
      it('should delete a task successfully', async () => {
        const response = await connector.deleteTask('00Txxx');

        expect(response.success).toBe(true);
        expect(mockSObject.destroy).toHaveBeenCalledWith('00Txxx');
      });
    });
  });

  describe('Custom Object operations', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    describe('createCustomObject', () => {
      it('should create a custom object record', async () => {
        const response = await connector.createCustomObject('Custom_Object__c', {
          Name: 'Test Record',
          Custom_Field__c: 'Value',
        });

        expect(response.success).toBe(true);
        expect(mockConnection.sobject).toHaveBeenCalledWith('Custom_Object__c');
        expect(mockSObject.create).toHaveBeenCalledWith({
          Name: 'Test Record',
          Custom_Field__c: 'Value',
        });
      });
    });

    describe('updateCustomObject', () => {
      it('should update a custom object record', async () => {
        const response = await connector.updateCustomObject('Custom_Object__c', 'a00xxx', {
          Custom_Field__c: 'New Value',
        });

        expect(response.success).toBe(true);
        expect(mockSObject.update).toHaveBeenCalledWith({
          Id: 'a00xxx',
          Custom_Field__c: 'New Value',
        });
      });
    });

    describe('getCustomObject', () => {
      it('should retrieve a custom object record', async () => {
        mockSObject.retrieve.mockResolvedValueOnce({
          Id: 'a00xxx',
          Name: 'Test Record',
          Custom_Field__c: 'Value',
        });

        const response = await connector.getCustomObject('Custom_Object__c', 'a00xxx');

        expect(response.success).toBe(true);
        expect(response.data).toHaveProperty('Custom_Field__c', 'Value');
      });
    });
  });

  describe('Search operations', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    describe('executeSOQL', () => {
      it('should execute SOQL query successfully', async () => {
        mockConnection.query.mockResolvedValueOnce({
          records: [
            { Id: '001xxx', Name: 'Account 1' },
            { Id: '001yyy', Name: 'Account 2' },
          ],
          done: true,
          totalSize: 2,
        });

        const response = await connector.executeSOQL("SELECT Id, Name FROM Account WHERE Industry = 'Technology'");

        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(mockConnection.query).toHaveBeenCalledWith(
          "SELECT Id, Name FROM Account WHERE Industry = 'Technology'",
        );
      });

      it('should handle SOQL query errors', async () => {
        mockConnection.query.mockRejectedValueOnce(new Error('Invalid SOQL'));

        const response = await connector.executeSOQL('INVALID QUERY');

        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      });
    });

    describe('globalSearch', () => {
      it('should perform global search successfully', async () => {
        mockConnection.search.mockResolvedValueOnce({
          searchRecords: [
            { Id: '001xxx', attributes: { type: 'Account' } },
            { Id: '003xxx', attributes: { type: 'Contact' } },
          ],
        });

        const response = await connector.globalSearch('Acme', ['Account', 'Contact']);

        expect(response.success).toBe(true);
        expect(mockConnection.search).toHaveBeenCalled();
      });
    });
  });

  describe('Token refresh', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig({
        ...mockCredentials,
        refreshToken: 'mock-refresh-token',
      }));
    });

    it('should refresh tokens successfully', async () => {
      const tokens = await connector.refreshTokens();

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
      expect(tokens.tokenType).toBe('Bearer');
    });

    it('should throw error when no refresh token available', async () => {
      await connector.initialize(createConfig({
        ...mockCredentials,
        refreshToken: undefined,
      }));

      await expect(connector.refreshTokens()).rejects.toThrow('No refresh token available');
    });
  });

  describe('Bulk operations', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    it('should perform bulk create operation', async () => {
      mockSObject.create.mockResolvedValueOnce([
        { id: '003xxx', success: true },
        { id: '003yyy', success: true },
      ]);

      const result = await connector.bulkOperation({
        operation: 'create',
        items: [
          { FirstName: 'John', LastName: 'Doe' },
          { FirstName: 'Jane', LastName: 'Smith' },
        ],
      });

      expect(result.totalSuccessful).toBe(2);
      expect(result.totalFailed).toBe(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      mockSObject.create.mockResolvedValueOnce([
        { id: '003xxx', success: true },
        { success: false, errors: [{ message: 'Required field missing' }] },
      ]);

      const result = await connector.bulkOperation({
        operation: 'create',
        items: [
          { FirstName: 'John', LastName: 'Doe' },
          { FirstName: 'Jane' }, // Missing LastName
        ],
        continueOnError: true,
      });

      expect(result.totalSuccessful).toBe(1);
      expect(result.totalFailed).toBe(1);
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      await connector.initialize(createConfig(mockCredentials));
    });

    it('should return error for unknown action', async () => {
      const response = await connector.executeAction('unknown_action', {});

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('unknown_action');
    });

    it('should handle API errors gracefully', async () => {
      mockSObject.create.mockRejectedValueOnce(new Error('API Error'));

      const response = await connector.createContact({
        lastName: 'Test',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});
