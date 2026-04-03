/**
 * Zendesk Connector Tests
 *
 * Tests for the Zendesk connector implementation.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ZendeskConnector } from '../zendesk.connector';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ZendeskConnector', () => {
  let connector: ZendeskConnector;
  let authUtils: AuthUtils;
  let apiUtils: ApiUtils;

  const mockCredentials = {
    subdomain: 'test-company',
    email: 'test@example.com',
    api_token: 'dG9rOm1vY2stemVuZGVzay1hcGktdG9rZW4tMTIzNDU=',
  };

  const mockConfig = {
    id: 'test-connector-id',
    type: 'zendesk',
    credentials: mockCredentials,
    settings: {},
  };

  beforeEach(async () => {
    authUtils = {
      createAuthHeader: jest.fn(),
    } as any;

    apiUtils = {
      makeRequest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZendeskConnector,
        { provide: AuthUtils, useValue: authUtils },
        { provide: ApiUtils, useValue: apiUtils },
      ],
    }).compile();

    connector = module.get<ZendeskConnector>(ZendeskConnector);

    // Mock axios.create to return a mock instance
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      defaults: {
        baseURL: `https://${mockCredentials.subdomain}.zendesk.com/api/v2`,
      },
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Zendesk');
      expect(metadata.category).toBe('support');
      expect(metadata.webhookSupport).toBe(true);
      expect(metadata.actions).toHaveLength(26);
      expect(metadata.triggers).toHaveLength(5);
    });

    it('should include ticket actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('ticket_create');
      expect(actionIds).toContain('ticket_update');
      expect(actionIds).toContain('ticket_get');
      expect(actionIds).toContain('ticket_get_all');
      expect(actionIds).toContain('ticket_delete');
      expect(actionIds).toContain('ticket_recover');
    });

    it('should include user actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('user_create');
      expect(actionIds).toContain('user_update');
      expect(actionIds).toContain('user_get');
      expect(actionIds).toContain('user_get_all');
      expect(actionIds).toContain('user_search');
      expect(actionIds).toContain('user_delete');
    });

    it('should include organization actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('organization_create');
      expect(actionIds).toContain('organization_update');
      expect(actionIds).toContain('organization_get');
      expect(actionIds).toContain('organization_get_all');
      expect(actionIds).toContain('organization_delete');
      expect(actionIds).toContain('organization_count');
    });

    it('should include ticket field actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('ticket_field_get');
      expect(actionIds).toContain('ticket_field_get_all');
    });

    it('should include triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('ticket_created');
      expect(triggerIds).toContain('ticket_updated');
      expect(triggerIds).toContain('ticket_solved');
      expect(triggerIds).toContain('user_created');
      expect(triggerIds).toContain('organization_created');
    });

    it('should include additional actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('add_comment');
      expect(actionIds).toContain('search_tickets');
      expect(actionIds).toContain('get_knowledge_base');
    });
  });

  // ===========================================
  // Connector-Definition Sync Validation Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all connector actions defined in ZENDESK_CONNECTOR definition', async () => {
      // Import definition to validate sync
      const { ZENDESK_CONNECTOR } = await import('../zendesk.definition');
      const metadata = connector.getMetadata();

      const definitionActionIds = ZENDESK_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Every connector action should be in definition
      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector metadata', async () => {
      const { ZENDESK_CONNECTOR } = await import('../zendesk.definition');
      const metadata = connector.getMetadata();

      const definitionActionIds = ZENDESK_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Every definition action should be in connector
      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers defined in ZENDESK_CONNECTOR definition', async () => {
      const { ZENDESK_CONNECTOR } = await import('../zendesk.definition');
      const metadata = connector.getMetadata();

      const definitionTriggerIds = ZENDESK_CONNECTOR.supported_triggers.map((t: any) => t.id);
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      // Every connector trigger should be in definition
      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector metadata', async () => {
      const { ZENDESK_CONNECTOR } = await import('../zendesk.definition');
      const metadata = connector.getMetadata();

      const definitionTriggerIds = ZENDESK_CONNECTOR.supported_triggers.map((t: any) => t.id);
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      // Every definition trigger should be in connector
      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching action and trigger counts between connector and definition', async () => {
      const { ZENDESK_CONNECTOR } = await import('../zendesk.definition');
      const metadata = connector.getMetadata();

      expect(metadata.actions.length).toBe(ZENDESK_CONNECTOR.supported_actions.length);
      expect(metadata.triggers.length).toBe(ZENDESK_CONNECTOR.supported_triggers.length);
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await connector.initialize(mockConfig as any);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: `https://${mockCredentials.subdomain}.zendesk.com/api/v2`,
          auth: {
            username: `${mockCredentials.email}/token`,
            password: mockCredentials.api_token,
          },
        }),
      );
    });

    it('should throw error when credentials are missing', async () => {
      await expect(connector.initialize({ id: 'test', type: 'zendesk', credentials: null } as any)).rejects.toThrow(
        'Invalid connector configuration: missing required fields',
      );
    });

    it('should throw error when subdomain is missing', async () => {
      await expect(
        connector.initialize({
          id: 'test',
          type: 'zendesk',
          credentials: { email: 'test@test.com', api_token: 'token' },
        } as any),
      ).rejects.toThrow('Missing required Zendesk credentials');
    });

    it('should throw error when email is missing', async () => {
      await expect(
        connector.initialize({
          id: 'test',
          type: 'zendesk',
          credentials: { subdomain: 'test', api_token: 'token' },
        } as any),
      ).rejects.toThrow('Missing required Zendesk credentials');
    });

    it('should throw error when api_token is missing', async () => {
      await expect(
        connector.initialize({
          id: 'test',
          type: 'zendesk',
          credentials: { subdomain: 'test', email: 'test@test.com' },
        } as any),
      ).rejects.toThrow('Missing required Zendesk credentials');
    });
  });

  // ===========================================
  // Ticket Action Tests
  // ===========================================
  describe('createTicket', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should create ticket successfully', async () => {
      const mockResponse = {
        data: {
          ticket: {
            id: 123,
            subject: 'Test Ticket',
            status: 'open',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await connector.createTicket({
        description: 'Test description',
        subject: 'Test Ticket',
        priority: 'high',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(123);
      expect(httpClient.post).toHaveBeenCalledWith('/tickets.json', {
        ticket: expect.objectContaining({
          comment: { body: 'Test description' },
          subject: 'Test Ticket',
          priority: 'high',
        }),
      });
    });

    it('should fail when description is missing', async () => {
      const result = await connector.createTicket({
        subject: 'Test Ticket',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Description is required');
    });

    it('should handle API errors gracefully', async () => {
      const httpClient = (connector as any).httpClient;
      httpClient.post.mockRejectedValueOnce({
        response: {
          data: {
            error_code: 'INVALID_REQUEST',
            error: 'Invalid ticket data',
          },
        },
      });

      const result = await connector.createTicket({
        description: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('updateTicket', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should update ticket successfully', async () => {
      const mockResponse = {
        data: {
          ticket: {
            id: 123,
            status: 'pending',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.put.mockResolvedValueOnce(mockResponse);

      const result = await connector.updateTicket('123', {
        status: 'pending',
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('pending');
    });

    it('should fail when ticket ID is missing', async () => {
      const result = await connector.updateTicket('', { status: 'pending' });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ticket ID is required');
    });

    it('should handle public reply correctly', async () => {
      const mockResponse = {
        data: { ticket: { id: 123 } },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.put.mockResolvedValueOnce(mockResponse);

      await connector.updateTicket('123', {
        public_reply: 'This is a public reply',
      });

      expect(httpClient.put).toHaveBeenCalledWith('/tickets/123.json', {
        ticket: {
          comment: {
            body: 'This is a public reply',
            public: true,
          },
        },
      });
    });

    it('should handle internal note correctly', async () => {
      const mockResponse = {
        data: { ticket: { id: 123 } },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.put.mockResolvedValueOnce(mockResponse);

      await connector.updateTicket('123', {
        internal_note: 'This is an internal note',
      });

      expect(httpClient.put).toHaveBeenCalledWith('/tickets/123.json', {
        ticket: {
          comment: {
            html_body: 'This is an internal note',
            public: false,
          },
        },
      });
    });
  });

  describe('getTicket', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should get regular ticket by ID', async () => {
      const mockResponse = {
        data: {
          ticket: {
            id: 123,
            subject: 'Test Ticket',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.getTicket('123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(123);
      expect(httpClient.get).toHaveBeenCalledWith('/tickets/123.json');
    });

    it('should get suspended ticket by ID', async () => {
      const mockResponse = {
        data: {
          suspended_ticket: {
            id: 456,
            subject: 'Suspended Ticket',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.getTicket('456', 'suspended');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(456);
      expect(httpClient.get).toHaveBeenCalledWith('/suspended_tickets/456.json');
    });
  });

  describe('getTickets', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should get all tickets with default options', async () => {
      const mockResponse = {
        data: {
          results: [{ id: 1 }, { id: 2 }],
          count: 2,
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.getTickets();

      expect(result.success).toBe(true);
      expect(result.data.tickets).toHaveLength(2);
    });

    it('should apply filters correctly', async () => {
      const mockResponse = {
        data: {
          results: [{ id: 1 }],
          count: 1,
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      await connector.getTickets({
        status: 'open',
        group_id: 123,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(httpClient.get).toHaveBeenCalledWith(
        '/search.json',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.stringContaining('status:open'),
            sort_by: 'created_at',
            sort_order: 'desc',
          }),
        }),
      );
    });
  });

  describe('deleteTicket', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should delete regular ticket', async () => {
      const httpClient = (connector as any).httpClient;
      httpClient.delete.mockResolvedValueOnce({});

      const result = await connector.deleteTicket('123');

      expect(result.success).toBe(true);
      expect(httpClient.delete).toHaveBeenCalledWith('/tickets/123.json');
    });

    it('should delete suspended ticket', async () => {
      const httpClient = (connector as any).httpClient;
      httpClient.delete.mockResolvedValueOnce({});

      const result = await connector.deleteTicket('123', 'suspended');

      expect(result.success).toBe(true);
      expect(httpClient.delete).toHaveBeenCalledWith('/suspended_tickets/123.json');
    });
  });

  describe('recoverTicket', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should recover suspended ticket', async () => {
      const mockResponse = {
        data: {
          ticket: {
            id: 123,
            status: 'open',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.put.mockResolvedValueOnce(mockResponse);

      const result = await connector.recoverTicket('123');

      expect(result.success).toBe(true);
      expect(httpClient.put).toHaveBeenCalledWith('/suspended_tickets/123/recover.json', {});
    });
  });

  // ===========================================
  // User Action Tests
  // ===========================================
  describe('createUser', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should create user successfully', async () => {
      const mockResponse = {
        data: {
          user: {
            id: 456,
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await connector.createUser({
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('John Doe');
    });

    it('should fail when name is missing', async () => {
      const result = await connector.createUser({
        email: 'john@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name is required');
    });
  });

  describe('getUser', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should get user by ID', async () => {
      const mockResponse = {
        data: {
          user: {
            id: 456,
            name: 'John Doe',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.getUser('456');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(456);
    });
  });

  describe('searchUsers', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should search users by query', async () => {
      const mockResponse = {
        data: {
          users: [{ id: 1 }, { id: 2 }],
          count: 2,
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.searchUsers({
        query: 'john@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data.users).toHaveLength(2);
    });
  });

  // ===========================================
  // Organization Action Tests
  // ===========================================
  describe('createOrganization', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should create organization successfully', async () => {
      const mockResponse = {
        data: {
          organization: {
            id: 789,
            name: 'Acme Corp',
          },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await connector.createOrganization({
        name: 'Acme Corp',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Acme Corp');
    });

    it('should fail when name is missing', async () => {
      const result = await connector.createOrganization({});

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name is required');
    });

    it('should handle domain names correctly', async () => {
      const mockResponse = {
        data: {
          organization: { id: 789, name: 'Acme Corp' },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.post.mockResolvedValueOnce(mockResponse);

      await connector.createOrganization({
        name: 'Acme Corp',
        domain_names: 'acme.com, acme.org',
      });

      expect(httpClient.post).toHaveBeenCalledWith('/organizations.json', {
        organization: {
          name: 'Acme Corp',
          domain_names: ['acme.com', 'acme.org'],
        },
      });
    });
  });

  describe('countOrganizations', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should count organizations', async () => {
      const mockResponse = {
        data: {
          count: { value: 42 },
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.countOrganizations();

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(42);
    });
  });

  // ===========================================
  // Ticket Field Action Tests
  // ===========================================
  describe('getTicketFields', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should get ticket fields', async () => {
      const mockResponse = {
        data: {
          ticket_fields: [{ id: 1, type: 'text' }, { id: 2, type: 'checkbox' }],
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.getTicketFields();

      expect(result.success).toBe(true);
      expect(result.data.ticket_fields).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      const mockResponse = {
        data: {
          ticket_fields: Array(50).fill({ id: 1 }),
        },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.get.mockResolvedValueOnce(mockResponse);

      const result = await connector.getTicketFields({ limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data.ticket_fields).toHaveLength(10);
    });
  });

  // ===========================================
  // Action Dispatcher Tests
  // ===========================================
  describe('executeAction', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig as any);
    });

    it('should dispatch ticket_create action', async () => {
      const mockResponse = {
        data: { ticket: { id: 123 } },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeAction('ticket_create', {
        description: 'Test',
      });

      expect(result.success).toBe(true);
    });

    it('should dispatch user_create action', async () => {
      const mockResponse = {
        data: { user: { id: 456 } },
      };

      const httpClient = (connector as any).httpClient;
      httpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeAction('user_create', {
        name: 'Test User',
      });

      expect(result.success).toBe(true);
    });

    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNKNOWN_ACTION');
    });
  });

  // ===========================================
  // isInitialized Tests
  // ===========================================
  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(connector.isInitialized()).toBe(false);
    });

    it('should return true when initialized', async () => {
      await connector.initialize(mockConfig as any);
      expect(connector.isInitialized()).toBe(true);
    });
  });
});
