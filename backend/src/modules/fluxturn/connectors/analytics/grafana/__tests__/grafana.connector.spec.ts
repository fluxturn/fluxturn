/**
 * Grafana Connector Tests
 *
 * Behavioral tests that verify analytics operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GrafanaConnector } from '../grafana.connector';
import { GRAFANA_CONNECTOR } from '../grafana.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import { getMockCredentials } from '@test/helpers/mock-credentials';

// Mock ApiUtils at module level
const mockApiUtils = {
  executeRequest: jest.fn(),
};

describe('GrafanaConnector', () => {
  let connector: GrafanaConnector;

  const mockCredentials = getMockCredentials('grafana');

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Grafana Config',
    type: 'grafana',
    category: 'analytics',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrafanaConnector,
        { provide: AuthUtils, useValue: {} },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<GrafanaConnector>(GrafanaConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Grafana');
      expect(metadata.description).toContain('analytics');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('analytics');
      expect(metadata.authType).toBe('api_key');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 16 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(16);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all expected action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      // Dashboard actions
      expect(actionIds).toContain('create_dashboard');
      expect(actionIds).toContain('get_dashboard');
      expect(actionIds).toContain('get_all_dashboards');
      expect(actionIds).toContain('update_dashboard');
      expect(actionIds).toContain('delete_dashboard');

      // Team actions
      expect(actionIds).toContain('create_team');
      expect(actionIds).toContain('get_team');
      expect(actionIds).toContain('get_all_teams');
      expect(actionIds).toContain('update_team');
      expect(actionIds).toContain('delete_team');

      // Team member actions
      expect(actionIds).toContain('add_team_member');
      expect(actionIds).toContain('remove_team_member');
      expect(actionIds).toContain('get_all_team_members');

      // User actions
      expect(actionIds).toContain('get_all_users');
      expect(actionIds).toContain('update_user');
      expect(actionIds).toContain('delete_user');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = GRAFANA_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching display name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(GRAFANA_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(GRAFANA_CONNECTOR.category);
    });

    it('should have matching action count', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions.length).toBe(GRAFANA_CONNECTOR.supported_actions?.length || 0);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if API key is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { baseUrl: 'https://grafana.example.com' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'API key is required',
      );
    });

    it('should throw error if base URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { apiKey: 'test-key' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Base URL is required',
      );
    });

    it('should remove trailing slash from base URL', async () => {
      const configWithSlash = {
        ...mockConfig,
        credentials: {
          ...mockCredentials,
          baseUrl: 'https://grafana.example.com/',
        },
      };

      await connector.initialize(configWithSlash);

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 1, name: 'Test Org' },
      });

      await connector.testConnection();

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.not.stringContaining('//api'),
        }),
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 1, name: 'Test Org' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure for invalid connection', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(new Error('Unauthorized'));

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Action: create_dashboard', () => {
    it('should create dashboard', async () => {
      const mockResponse = {
        data: {
          id: 1,
          uid: 'abc123',
          url: '/d/abc123/test-dashboard',
          status: 'success',
          version: 1,
        },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce(mockResponse);

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_dashboard', {
        title: 'Test Dashboard',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/dashboards/db'),
        }),
      );
    });

    it('should create dashboard with folder ID', async () => {
      const mockResponse = {
        data: { id: 1, uid: 'abc123', status: 'success' },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce(mockResponse);

      await connector.initialize(mockConfig);
      await connector.executeAction('create_dashboard', {
        title: 'Test Dashboard',
        folderId: '5',
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            folderId: '5',
          }),
        }),
      );
    });
  });

  describe('Action: get_dashboard', () => {
    it('should get dashboard by UID', async () => {
      const mockResponse = {
        data: {
          dashboard: { id: 1, uid: 'abc123', title: 'Test' },
          meta: { isStarred: false },
        },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce(mockResponse);

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_dashboard', {
        dashboardUidOrUrl: 'abc123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/dashboards/uid/abc123'),
        }),
      );
    });

    it('should extract UID from URL', async () => {
      const mockResponse = {
        data: { dashboard: { id: 1 }, meta: {} },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce(mockResponse);

      await connector.initialize(mockConfig);
      await connector.executeAction('get_dashboard', {
        dashboardUidOrUrl: 'https://grafana.example.com/d/abc123/dashboard-name',
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/dashboards/uid/abc123'),
        }),
      );
    });
  });

  describe('Action: get_all_dashboards', () => {
    it('should get all dashboards', async () => {
      const mockResponse = {
        data: [
          { id: 1, uid: 'abc', title: 'Dashboard 1' },
          { id: 2, uid: 'def', title: 'Dashboard 2' },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce(mockResponse);

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_dashboards', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/search'),
        }),
      );
    });

    it('should apply limit when not returnAll', async () => {
      const mockResponse = { data: [] };

      mockApiUtils.executeRequest.mockResolvedValueOnce(mockResponse);

      await connector.initialize(mockConfig);
      await connector.executeAction('get_all_dashboards', {
        returnAll: false,
        limit: 10,
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            limit: 10,
          }),
        }),
      );
    });
  });

  describe('Action: update_dashboard', () => {
    it('should update dashboard', async () => {
      // First call gets existing dashboard
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { dashboard: { uid: 'abc123', title: 'Old Title' } },
      });
      // Second call updates
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 1, uid: 'abc123', status: 'success' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_dashboard', {
        dashboardUidOrUrl: 'abc123',
        title: 'New Title',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('Action: delete_dashboard', () => {
    it('should delete dashboard', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { title: 'Deleted Dashboard', message: 'Dashboard deleted' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_dashboard', {
        dashboardUidOrUrl: 'abc123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/api/dashboards/uid/abc123'),
        }),
      );
    });
  });

  describe('Action: create_team', () => {
    it('should create team', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { teamId: 1, message: 'Team created' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_team', {
        name: 'Engineering',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/teams'),
        }),
      );
    });

    it('should create team with email', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { teamId: 1 },
      });

      await connector.initialize(mockConfig);
      await connector.executeAction('create_team', {
        name: 'Engineering',
        email: 'eng@example.com',
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            name: 'Engineering',
            email: 'eng@example.com',
          }),
        }),
      );
    });
  });

  describe('Action: get_team', () => {
    it('should get team by ID', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 1, name: 'Engineering', memberCount: 5 },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_team', {
        teamId: '1',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/teams/1'),
        }),
      );
    });
  });

  describe('Action: get_all_teams', () => {
    it('should get all teams', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { teams: [{ id: 1, name: 'Team 1' }, { id: 2, name: 'Team 2' }] },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_teams', {});

      expect(result.success).toBe(true);
    });

    it('should filter teams by name', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { teams: [{ id: 1, name: 'Engineering' }] },
      });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_all_teams', {
        name: 'Engineering',
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            name: 'Engineering',
          }),
        }),
      );
    });
  });

  describe('Action: add_team_member', () => {
    it('should add team member', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { message: 'Member added' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('add_team_member', {
        teamId: '1',
        userId: '2',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/teams/1/members'),
        }),
      );
    });
  });

  describe('Action: remove_team_member', () => {
    it('should remove team member', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { message: 'Member removed' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('remove_team_member', {
        teamId: '1',
        memberId: '2',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/api/teams/1/members/2'),
        }),
      );
    });
  });

  describe('Action: get_all_users', () => {
    it('should get all users', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: [
          { userId: 1, login: 'admin' },
          { userId: 2, login: 'user1' },
        ],
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_users', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/org/users'),
        }),
      );
    });
  });

  describe('Action: update_user', () => {
    it('should update user role', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { message: 'User updated' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_user', {
        userId: '2',
        role: 'Editor',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          endpoint: expect.stringContaining('/api/org/users/2'),
        }),
      );
    });
  });

  describe('Action: delete_user', () => {
    it('should delete user', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { message: 'User deleted' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_user', {
        userId: '2',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/api/org/users/2'),
        }),
      );
    });
  });

  describe('Unknown Action', () => {
    it('should throw error for unknown action', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/action not found|unknown action/i);
    });
  });

  describe('Authentication', () => {
    it('should use Bearer token for authorization', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 1 },
      });

      await connector.initialize(mockConfig);
      await connector.testConnection();

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockCredentials.apiKey}`,
          }),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_dashboards', {});

      expect(result.success).toBe(false);
    });

    it('should handle invalid URL for UID extraction', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_dashboard', {
        dashboardUidOrUrl: 'https://invalid-url-without-d-segment.com/abc',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/failed to derive uid/i);
    });
  });
});
