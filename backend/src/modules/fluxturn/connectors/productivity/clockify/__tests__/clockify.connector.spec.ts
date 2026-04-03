/**
 * Clockify Connector Tests
 *
 * Behavioral tests that verify time tracking operations, API calls, and connections.
 * Uses axios mocking pattern for reliable testing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ClockifyConnector } from '../clockify.connector';
import { CLOCKIFY_CONNECTOR } from '../clockify.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock ApiUtils
const mockApiUtils = {
  executeRequest: jest.fn(),
};

// Mock AuthUtils
const mockAuthUtils = {
  createApiKeyHeader: jest.fn(),
};

describe('ClockifyConnector', () => {
  let connector: ClockifyConnector;

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Clockify Connector',
    type: 'clockify',
    category: 'productivity',
    credentials: {
      apiKey: 'test-api-key-123',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClockifyConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<ClockifyConnector>(ClockifyConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Clockify');
      expect(metadata.category).toBe('productivity');
      expect(metadata.type).toBe('clockify');
      expect(metadata.authType).toBe('api_key');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return all 17 defined actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_all_workspaces');
      expect(actionIds).toContain('create_time_entry');
      expect(actionIds).toContain('get_time_entry');
      expect(actionIds).toContain('update_time_entry');
      expect(actionIds).toContain('delete_time_entry');
      expect(actionIds).toContain('create_project');
      expect(actionIds).toContain('get_project');
      expect(actionIds).toContain('get_all_projects');
      expect(actionIds).toContain('update_project');
      expect(actionIds).toContain('delete_project');
      expect(actionIds).toContain('create_client');
      expect(actionIds).toContain('get_all_clients');
      expect(actionIds).toContain('create_tag');
      expect(actionIds).toContain('get_all_tags');
      expect(actionIds).toContain('create_task');
      expect(actionIds).toContain('get_all_tasks');
      expect(actionIds).toContain('get_all_users');

      expect(metadata.actions).toHaveLength(17);
    });

    it('should return the new_time_entry trigger', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('new_time_entry');
      expect(metadata.triggers).toHaveLength(1);
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = CLOCKIFY_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = CLOCKIFY_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers in definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds = CLOCKIFY_CONNECTOR.supported_triggers?.map((t) => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds = CLOCKIFY_CONNECTOR.supported_triggers?.map((t) => t.id) || [];

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth_fields key for credentials', () => {
      const definitionAuthFields = CLOCKIFY_CONNECTOR.auth_fields || [];
      const expectedKeys = ['apiKey'];

      for (const key of expectedKeys) {
        const hasField = definitionAuthFields.some((f: any) => f.key === key);
        expect(hasField).toBe(true);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(CLOCKIFY_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(CLOCKIFY_CONNECTOR.category);
    });
  });

  describe('Action: get_all_workspaces', () => {
    it('should get all workspaces', async () => {
      const mockWorkspaces = [
        { id: 'ws1', name: 'Workspace 1' },
        { id: 'ws2', name: 'Workspace 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockWorkspaces });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_workspaces', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWorkspaces);
    });
  });

  describe('Action: create_time_entry', () => {
    it('should create a time entry', async () => {
      const mockTimeEntry = {
        id: 'te1',
        description: 'Working on project',
        timeInterval: { start: '2024-01-09T10:00:00Z' },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_time_entry', {
        workspaceId: 'ws1',
        start: '2024-01-09T10:00:00Z',
        description: 'Working on project',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/workspaces/ws1/time-entries'),
        }),
      );
    });

    it('should create a billable time entry with project and tags', async () => {
      const mockTimeEntry = {
        id: 'te2',
        description: 'Client work',
        billable: true,
        projectId: 'proj1',
        tagIds: ['tag1', 'tag2'],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_time_entry', {
        workspaceId: 'ws1',
        start: '2024-01-09T10:00:00Z',
        description: 'Client work',
        billable: true,
        projectId: 'proj1',
        tagIds: ['tag1', 'tag2'],
      });

      expect(result.success).toBe(true);
      expect(result.data.billable).toBe(true);
    });
  });

  describe('Action: get_time_entry', () => {
    it('should get a specific time entry', async () => {
      const mockTimeEntry = { id: 'te1', description: 'Test entry' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTimeEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_time_entry', {
        workspaceId: 'ws1',
        timeEntryId: 'te1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeEntry);
    });
  });

  describe('Action: update_time_entry', () => {
    it('should update a time entry', async () => {
      const mockUpdatedEntry = {
        id: 'te1',
        description: 'Updated description',
        start: '2024-01-09T11:00:00Z',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUpdatedEntry });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_time_entry', {
        workspaceId: 'ws1',
        timeEntryId: 'te1',
        start: '2024-01-09T11:00:00Z',
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(result.data.description).toBe('Updated description');
    });
  });

  describe('Action: delete_time_entry', () => {
    it('should delete a time entry', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: null });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_time_entry', {
        workspaceId: 'ws1',
        timeEntryId: 'te1',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/workspaces/ws1/time-entries/te1'),
        }),
      );
    });
  });

  describe('Action: create_project', () => {
    it('should create a project', async () => {
      const mockProject = { id: 'proj1', name: 'New Project', color: '#FF5733' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_project', {
        workspaceId: 'ws1',
        name: 'New Project',
        color: '#FF5733',
        billable: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New Project');
    });
  });

  describe('Action: get_project', () => {
    it('should get a specific project', async () => {
      const mockProject = { id: 'proj1', name: 'Test Project' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_project', {
        workspaceId: 'ws1',
        projectId: 'proj1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
    });
  });

  describe('Action: get_all_projects', () => {
    it('should get all projects in a workspace', async () => {
      const mockProjects = [
        { id: 'proj1', name: 'Project 1' },
        { id: 'proj2', name: 'Project 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProjects });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_projects', {
        workspaceId: 'ws1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Action: update_project', () => {
    it('should update a project', async () => {
      const mockUpdatedProject = { id: 'proj1', name: 'Updated Project Name' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUpdatedProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_project', {
        workspaceId: 'ws1',
        projectId: 'proj1',
        name: 'Updated Project Name',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Project Name');
    });
  });

  describe('Action: delete_project', () => {
    it('should delete a project', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: null });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_project', {
        workspaceId: 'ws1',
        projectId: 'proj1',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/workspaces/ws1/projects/proj1'),
        }),
      );
    });
  });

  describe('Action: create_client', () => {
    it('should create a client', async () => {
      const mockClient = { id: 'client1', name: 'New Client' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockClient });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_client', {
        workspaceId: 'ws1',
        name: 'New Client',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New Client');
    });
  });

  describe('Action: get_all_clients', () => {
    it('should get all clients in a workspace', async () => {
      const mockClients = [
        { id: 'client1', name: 'Client 1' },
        { id: 'client2', name: 'Client 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockClients });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_clients', {
        workspaceId: 'ws1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Action: create_tag', () => {
    it('should create a tag', async () => {
      const mockTag = { id: 'tag1', name: 'Urgent' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTag });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_tag', {
        workspaceId: 'ws1',
        name: 'Urgent',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Urgent');
    });
  });

  describe('Action: get_all_tags', () => {
    it('should get all tags in a workspace', async () => {
      const mockTags = [
        { id: 'tag1', name: 'Urgent' },
        { id: 'tag2', name: 'Review' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTags });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_tags', {
        workspaceId: 'ws1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Action: create_task', () => {
    it('should create a task in a project', async () => {
      const mockTask = { id: 'task1', name: 'New Task', projectId: 'proj1' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTask });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_task', {
        workspaceId: 'ws1',
        projectId: 'proj1',
        name: 'New Task',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New Task');
    });

    it('should create a task with estimate and assignee', async () => {
      const mockTask = {
        id: 'task2',
        name: 'Task with estimate',
        assigneeId: 'user1',
        estimate: 'PT2H30M',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTask });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_task', {
        workspaceId: 'ws1',
        projectId: 'proj1',
        name: 'Task with estimate',
        assigneeId: 'user1',
        estimate: 'PT2H30M',
      });

      expect(result.success).toBe(true);
      expect(result.data.estimate).toBe('PT2H30M');
    });
  });

  describe('Action: get_all_tasks', () => {
    it('should get all tasks in a project', async () => {
      const mockTasks = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTasks });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_tasks', {
        workspaceId: 'ws1',
        projectId: 'proj1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Action: get_all_users', () => {
    it('should get all users in a workspace', async () => {
      const mockUsers = [
        { id: 'user1', name: 'User 1', email: 'user1@test.com' },
        { id: 'user2', name: 'User 2', email: 'user2@test.com' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUsers });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_users', {
        workspaceId: 'ws1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Authentication', () => {
    it('should initialize with API key', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should fail initialization without API key', async () => {
      const badConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(connector.initialize(badConfig)).rejects.toThrow('API key is required');
    });
  });

  describe('Connection Test', () => {
    it('should test connection successfully', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: [{ id: 'ws1' }] });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should fail connection test with bad API key', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(new Error('Unauthorized'));

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.executeAction('invalid_action', {});

      expect(result.success).toBe(false);
      // Base connector returns "Action not found" message
      expect(result.error?.message).toMatch(/Unknown action|Action not found/);
    });

    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(new Error('API Error'));

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_workspaces', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup connector on destroy', async () => {
      await connector.initialize(mockConfig);
      await connector.destroy();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Definition Validation', () => {
    it('should have valid inputSchema for create_time_entry action', () => {
      const createTimeEntryAction = CLOCKIFY_CONNECTOR.supported_actions?.find(
        (a) => a.id === 'create_time_entry',
      );

      expect(createTimeEntryAction).toBeDefined();
      expect(createTimeEntryAction?.inputSchema?.workspaceId).toBeDefined();
      expect(createTimeEntryAction?.inputSchema?.workspaceId.required).toBe(true);
      expect(createTimeEntryAction?.inputSchema?.start).toBeDefined();
      expect(createTimeEntryAction?.inputSchema?.start.required).toBe(true);
      expect(createTimeEntryAction?.inputSchema?.description).toBeDefined();
      expect(createTimeEntryAction?.inputSchema?.description.aiControlled).toBe(true);
    });

    it('should have valid inputSchema for create_project action', () => {
      const createProjectAction = CLOCKIFY_CONNECTOR.supported_actions?.find(
        (a) => a.id === 'create_project',
      );

      expect(createProjectAction).toBeDefined();
      expect(createProjectAction?.inputSchema?.workspaceId).toBeDefined();
      expect(createProjectAction?.inputSchema?.name).toBeDefined();
      expect(createProjectAction?.inputSchema?.name.required).toBe(true);
      expect(createProjectAction?.inputSchema?.name.aiControlled).toBe(true);
    });

    it('should have valid inputSchema for create_task action', () => {
      const createTaskAction = CLOCKIFY_CONNECTOR.supported_actions?.find(
        (a) => a.id === 'create_task',
      );

      expect(createTaskAction).toBeDefined();
      expect(createTaskAction?.inputSchema?.workspaceId).toBeDefined();
      expect(createTaskAction?.inputSchema?.projectId).toBeDefined();
      expect(createTaskAction?.inputSchema?.name).toBeDefined();
      expect(createTaskAction?.inputSchema?.estimate).toBeDefined();
    });

    it('should have valid trigger definition for new_time_entry', () => {
      const newTimeEntryTrigger = CLOCKIFY_CONNECTOR.supported_triggers?.find(
        (t) => t.id === 'new_time_entry',
      );

      expect(newTimeEntryTrigger).toBeDefined();
      expect(newTimeEntryTrigger?.eventType).toBe('time_entry.created');
      expect(newTimeEntryTrigger?.pollingEnabled).toBe(true);
      expect(newTimeEntryTrigger?.webhookRequired).toBe(false);
      expect(newTimeEntryTrigger?.inputSchema?.workspaceId).toBeDefined();
      expect(newTimeEntryTrigger?.inputSchema?.pollingInterval).toBeDefined();
    });

    it('should have correct polling interval options for trigger', () => {
      const newTimeEntryTrigger = CLOCKIFY_CONNECTOR.supported_triggers?.find(
        (t) => t.id === 'new_time_entry',
      );

      const pollingOptions = newTimeEntryTrigger?.inputSchema?.pollingInterval?.options?.map(
        (o: any) => o.value,
      );

      expect(pollingOptions).toContain('1');
      expect(pollingOptions).toContain('5');
      expect(pollingOptions).toContain('15');
      expect(pollingOptions).toContain('30');
      expect(pollingOptions).toContain('60');
    });

    it('should have correct API configuration in definition', () => {
      const getWorkspacesAction = CLOCKIFY_CONNECTOR.supported_actions?.find(
        (a) => a.id === 'get_all_workspaces',
      );

      expect(getWorkspacesAction?.api?.baseUrl).toBe('https://api.clockify.me/api/v1');
      expect(getWorkspacesAction?.api?.endpoint).toBe('/workspaces');
      expect(getWorkspacesAction?.api?.method).toBe('GET');
      expect(getWorkspacesAction?.api?.headers?.['X-Api-Key']).toBe('{apiKey}');
    });
  });
});
