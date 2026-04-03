import { Test, TestingModule } from '@nestjs/testing';
import { TogglConnector } from '../toggl.connector';
import { TOGGL_CONNECTOR } from '../toggl.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock ApiUtils
const mockApiUtils = {
  executeRequest: jest.fn(),
};

// Mock AuthUtils
const mockAuthUtils = {
  createBasicAuthHeader: jest.fn(),
};

describe('TogglConnector', () => {
  let connector: TogglConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Toggl Config',
    type: 'toggl',
    category: 'productivity',
    credentials: {
      apiToken: 'test-api-token-123',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TogglConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<TogglConnector>(TogglConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Toggl Track');
      expect(metadata.description).toContain('Time tracking');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('productivity');
      expect(metadata.type).toBe('toggl');
      expect(metadata.authType).toBe('api_key');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 9 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(9);
    });

    it('should return 1 trigger', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(1);
    });

    it('should include all expected action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_time_entry');
      expect(actionIds).toContain('get_time_entry');
      expect(actionIds).toContain('update_time_entry');
      expect(actionIds).toContain('delete_time_entry');
      expect(actionIds).toContain('stop_time_entry');
      expect(actionIds).toContain('create_project');
      expect(actionIds).toContain('get_project');
      expect(actionIds).toContain('get_all_projects');
      expect(actionIds).toContain('get_all_workspaces');
    });

    it('should include new_time_entry trigger', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('new_time_entry');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = TOGGL_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers in definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds = TOGGL_CONNECTOR.supported_triggers?.map((t) => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if API token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'API token is required',
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
          endpoint: expect.stringContaining('/me'),
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

  describe('Action: create_time_entry', () => {
    it('should create time entry', async () => {
      const mockTimeEntry = {
        id: 123,
        description: 'Working on project',
        start: '2024-01-09T10:00:00Z',
        duration: 3600,
        workspace_id: 456,
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_time_entry', {
        workspaceId: 456,
        description: 'Working on project',
        start: '2024-01-09T10:00:00Z',
        duration: 3600,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/workspaces/456/time_entries'),
        }),
      );
    });
  });

  describe('Action: get_time_entry', () => {
    it('should get time entry', async () => {
      const mockTimeEntry = {
        id: 123,
        description: 'Test entry',
        duration: 1800,
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_time_entry', {
        timeEntryId: 123,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/me/time_entries/123'),
        }),
      );
    });
  });

  describe('Action: update_time_entry', () => {
    it('should update time entry', async () => {
      const mockUpdatedEntry = {
        id: 123,
        description: 'Updated description',
        duration: 7200,
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUpdatedEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_time_entry', {
        workspaceId: 456,
        timeEntryId: 123,
        description: 'Updated description',
        duration: 7200,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedEntry);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          endpoint: expect.stringContaining('/workspaces/456/time_entries/123'),
        }),
      );
    });
  });

  describe('Action: delete_time_entry', () => {
    it('should delete time entry', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: null });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_time_entry', {
        workspaceId: 456,
        timeEntryId: 123,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/workspaces/456/time_entries/123'),
        }),
      );
    });
  });

  describe('Action: stop_time_entry', () => {
    it('should stop time entry', async () => {
      const mockStoppedEntry = {
        id: 123,
        stop: '2024-01-09T12:00:00Z',
        duration: 7200,
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockStoppedEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('stop_time_entry', {
        workspaceId: 456,
        timeEntryId: 123,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStoppedEntry);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          endpoint: expect.stringContaining('/workspaces/456/time_entries/123/stop'),
        }),
      );
    });
  });

  describe('Action: create_project', () => {
    it('should create project', async () => {
      const mockProject = {
        id: 789,
        name: 'New Project',
        workspace_id: 456,
        active: true,
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_project', {
        workspaceId: 456,
        name: 'New Project',
        active: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/workspaces/456/projects'),
        }),
      );
    });
  });

  describe('Action: get_project', () => {
    it('should get project', async () => {
      const mockProject = {
        id: 789,
        name: 'Test Project',
        workspace_id: 456,
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_project', {
        workspaceId: 456,
        projectId: 789,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/workspaces/456/projects/789'),
        }),
      );
    });
  });

  describe('Action: get_all_projects', () => {
    it('should get all projects', async () => {
      const mockProjects = [
        { id: 1, name: 'Project 1' },
        { id: 2, name: 'Project 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProjects });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_projects', {
        workspaceId: 456,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProjects);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/workspaces/456/projects'),
        }),
      );
    });
  });

  describe('Action: get_all_workspaces', () => {
    it('should get all workspaces', async () => {
      const mockWorkspaces = [
        { id: 1, name: 'Workspace 1' },
        { id: 2, name: 'Workspace 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockWorkspaces });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_workspaces', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWorkspaces);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/me/workspaces'),
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

  describe('Authentication', () => {
    it('should use Basic auth with correct format', async () => {
      const mockWorkspaces = [{ id: 1, name: 'Workspace 1' }];
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockWorkspaces });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_all_workspaces', {});

      const callArgs = mockApiUtils.executeRequest.mock.calls[0][0];
      const authHeader = callArgs.headers?.Authorization;

      // Toggl uses Basic auth with {apiToken}:api_token format
      const expectedAuth = `Basic ${Buffer.from('test-api-token-123:api_token').toString('base64')}`;
      expect(authHeader).toBe(expectedAuth);
    });
  });

  describe('Trigger Schema', () => {
    it('should have correct schema for new_time_entry trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'new_time_entry');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('New Time Entry');
      expect(trigger?.eventType).toBe('time_entry.created');
      expect(trigger?.pollingEnabled).toBe(true);
      expect(trigger?.webhookRequired).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('API rate limit exceeded'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_workspaces', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
