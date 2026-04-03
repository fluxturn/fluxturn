/**
 * Harvest Connector Tests
 *
 * Behavioral tests that verify time tracking operations, API calls, and connections.
 * Uses axios mocking pattern for reliable testing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HarvestConnector } from '../harvest.connector';
import { HARVEST_CONNECTOR } from '../harvest.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock ApiUtils
const mockApiUtils = {
  executeRequest: jest.fn(),
};

// Mock AuthUtils
const mockAuthUtils = {
  createBearerAuthHeader: jest.fn(),
};

describe('HarvestConnector', () => {
  let connector: HarvestConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Harvest Config',
    type: 'harvest',
    category: 'productivity',
    credentials: {
      accessToken: 'test-access-token',
      accountId: 'test-account-123',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HarvestConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<HarvestConnector>(HarvestConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Harvest');
      expect(metadata.description).toContain('Time tracking');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('productivity');
      expect(metadata.type).toBe('harvest');
      expect(metadata.authType).toBe('bearer_token');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 51 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(51);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all Time Entry action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_time_entry_by_duration');
      expect(actionIds).toContain('create_time_entry_by_start_end');
      expect(actionIds).toContain('get_time_entry');
      expect(actionIds).toContain('get_all_time_entries');
      expect(actionIds).toContain('update_time_entry');
      expect(actionIds).toContain('delete_time_entry');
      expect(actionIds).toContain('restart_time_entry');
      expect(actionIds).toContain('stop_time_entry');
      expect(actionIds).toContain('delete_time_entry_external_reference');
    });

    it('should include all Client action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_client');
      expect(actionIds).toContain('get_client');
      expect(actionIds).toContain('get_all_clients');
      expect(actionIds).toContain('update_client');
      expect(actionIds).toContain('delete_client');
    });

    it('should include all Project action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_project');
      expect(actionIds).toContain('get_project');
      expect(actionIds).toContain('get_all_projects');
      expect(actionIds).toContain('update_project');
      expect(actionIds).toContain('delete_project');
    });

    it('should include all Task action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_task');
      expect(actionIds).toContain('get_task');
      expect(actionIds).toContain('get_all_tasks');
      expect(actionIds).toContain('update_task');
      expect(actionIds).toContain('delete_task');
    });

    it('should include all User action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_current_user');
      expect(actionIds).toContain('get_user');
      expect(actionIds).toContain('get_all_users');
      expect(actionIds).toContain('create_user');
      expect(actionIds).toContain('update_user');
      expect(actionIds).toContain('delete_user');
    });

    it('should include all Contact action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_contact');
      expect(actionIds).toContain('get_contact');
      expect(actionIds).toContain('get_all_contacts');
      expect(actionIds).toContain('update_contact');
      expect(actionIds).toContain('delete_contact');
    });

    it('should include all Invoice action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_invoice');
      expect(actionIds).toContain('get_invoice');
      expect(actionIds).toContain('get_all_invoices');
      expect(actionIds).toContain('update_invoice');
      expect(actionIds).toContain('delete_invoice');
    });

    it('should include all Estimate action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_estimate');
      expect(actionIds).toContain('get_estimate');
      expect(actionIds).toContain('get_all_estimates');
      expect(actionIds).toContain('update_estimate');
      expect(actionIds).toContain('delete_estimate');
    });

    it('should include all Expense action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_expense');
      expect(actionIds).toContain('get_expense');
      expect(actionIds).toContain('get_all_expenses');
      expect(actionIds).toContain('update_expense');
      expect(actionIds).toContain('delete_expense');
    });

    it('should include Company action', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_company');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = HARVEST_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(HARVEST_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(HARVEST_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if access token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { accountId: 'test-account' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Access token is required',
      );
    });

    it('should throw error if account ID is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { accessToken: 'test-token' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Account ID is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 123, email: 'test@example.com' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/users/me'),
        }),
      );
    });

    it('should return failure for invalid connection', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('Unauthorized'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Action: create_time_entry_by_duration', () => {
    it('should create time entry by duration', async () => {
      const mockTimeEntry = {
        id: 123,
        spent_date: '2024-01-09',
        hours: 2.5,
        notes: 'Working on project',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_time_entry_by_duration', {
        projectId: '456',
        taskId: '789',
        spentDate: '2024-01-09',
        hours: 2.5,
        notes: 'Working on project',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/time_entries'),
        }),
      );
    });
  });

  describe('Action: get_time_entry', () => {
    it('should get time entry', async () => {
      const mockTimeEntry = { id: 123, hours: 2.5 };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_time_entry', {
        id: '123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/time_entries/123'),
        }),
      );
    });
  });

  describe('Action: get_all_time_entries', () => {
    it('should get all time entries', async () => {
      const mockTimeEntries = {
        time_entries: [
          { id: 1, hours: 2 },
          { id: 2, hours: 3 },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntries });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_time_entries', {
        from: '2024-01-01',
        to: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntries);
    });
  });

  describe('Action: delete_time_entry', () => {
    it('should delete time entry', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: null });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_time_entry', {
        id: '123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/time_entries/123'),
        }),
      );
    });
  });

  describe('Action: restart_time_entry', () => {
    it('should restart time entry', async () => {
      const mockEntry = { id: 123, is_running: true };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('restart_time_entry', {
        id: '123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          endpoint: expect.stringContaining('/time_entries/123/restart'),
        }),
      );
    });
  });

  describe('Action: stop_time_entry', () => {
    it('should stop time entry', async () => {
      const mockEntry = { id: 123, is_running: false };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('stop_time_entry', {
        id: '123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          endpoint: expect.stringContaining('/time_entries/123/stop'),
        }),
      );
    });
  });

  describe('Action: create_client', () => {
    it('should create client', async () => {
      const mockClient = { id: 123, name: 'Test Client' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockClient });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_client', {
        name: 'Test Client',
        isActive: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClient);
    });
  });

  describe('Action: get_all_clients', () => {
    it('should get all clients', async () => {
      const mockClients = {
        clients: [
          { id: 1, name: 'Client 1' },
          { id: 2, name: 'Client 2' },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockClients });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_clients', {
        isActive: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClients);
    });
  });

  describe('Action: create_project', () => {
    it('should create project', async () => {
      const mockProject = {
        id: 123,
        name: 'Test Project',
        client: { id: 456 },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_project', {
        clientId: '456',
        name: 'Test Project',
        isBillable: true,
        billBy: 'Tasks',
        budgetBy: 'project',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
    });
  });

  describe('Action: get_all_projects', () => {
    it('should get all projects', async () => {
      const mockProjects = {
        projects: [
          { id: 1, name: 'Project 1' },
          { id: 2, name: 'Project 2' },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProjects });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_projects', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProjects);
    });
  });

  describe('Action: get_current_user', () => {
    it('should get current user', async () => {
      const mockUser = { id: 123, email: 'test@example.com' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUser });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_current_user', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/users/me'),
        }),
      );
    });
  });

  describe('Action: get_company', () => {
    it('should get company info', async () => {
      const mockCompany = {
        name: 'Test Company',
        base_uri: 'https://test.harvestapp.com',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockCompany });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_company', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCompany);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/company'),
        }),
      );
    });
  });

  describe('Unknown Action', () => {
    it('should throw error for unknown action', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/unknown action|not found/i);
    });
  });

  describe('Authentication Headers', () => {
    it('should use Bearer token and Harvest-Account-Id header', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: { id: 123 } });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_current_user', {});

      const callArgs = mockApiUtils.executeRequest.mock.calls[0][0];
      expect(callArgs.headers?.Authorization).toBe('Bearer test-access-token');
      expect(callArgs.headers?.['Harvest-Account-Id']).toBe('test-account-123');
      expect(callArgs.headers?.['User-Agent']).toBe('Fluxturn App');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('API rate limit exceeded'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_current_user', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
