/**
 * Sentry.io Connector Tests
 *
 * Behavioral tests that verify error tracking operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SentryIoConnector } from '../sentry-io.connector';
import { SENTRY_IO_CONNECTOR } from '../sentry-io.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import { getMockCredentials } from '@test/helpers/mock-credentials';

// Mock ApiUtils at module level
const mockApiUtils = {
  executeRequest: jest.fn(),
};

describe('SentryIoConnector', () => {
  let connector: SentryIoConnector;

  const mockCredentials = getMockCredentials('sentry_io');

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Sentry Config',
    type: 'sentry_io',
    category: 'support',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryIoConnector,
        { provide: AuthUtils, useValue: {} },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<SentryIoConnector>(SentryIoConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('sentry_io');
      expect(metadata.description).toContain('Error tracking');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('support');
      expect(metadata.authType).toBe('bearer_token');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 25 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(25);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all expected action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      // Event actions
      expect(actionIds).toContain('get_event');
      expect(actionIds).toContain('get_all_events');

      // Issue actions
      expect(actionIds).toContain('get_issue');
      expect(actionIds).toContain('get_all_issues');
      expect(actionIds).toContain('update_issue');
      expect(actionIds).toContain('delete_issue');

      // Organization actions
      expect(actionIds).toContain('get_organization');
      expect(actionIds).toContain('get_all_organizations');
      expect(actionIds).toContain('create_organization');
      expect(actionIds).toContain('update_organization');

      // Project actions
      expect(actionIds).toContain('create_project');
      expect(actionIds).toContain('get_project');
      expect(actionIds).toContain('get_all_projects');
      expect(actionIds).toContain('update_project');
      expect(actionIds).toContain('delete_project');

      // Release actions
      expect(actionIds).toContain('create_release');
      expect(actionIds).toContain('get_release');
      expect(actionIds).toContain('get_all_releases');
      expect(actionIds).toContain('update_release');
      expect(actionIds).toContain('delete_release');

      // Team actions
      expect(actionIds).toContain('create_team');
      expect(actionIds).toContain('get_team');
      expect(actionIds).toContain('get_all_teams');
      expect(actionIds).toContain('update_team');
      expect(actionIds).toContain('delete_team');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = SENTRY_IO_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(SENTRY_IO_CONNECTOR.name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(SENTRY_IO_CONNECTOR.category);
    });

    it('should have matching action count', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions.length).toBe(SENTRY_IO_CONNECTOR.supported_actions?.length || 0);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Access token is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: [{ id: 'org1', slug: 'test-org' }],
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

  describe('Action: get_event', () => {
    it('should get event by ID', async () => {
      const mockEvent = { eventID: 'event123', message: 'Error message' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockEvent });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_event', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
        eventId: 'event123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/0/projects/test-org/test-project/events/event123'),
        }),
      );
    });
  });

  describe('Action: get_all_events', () => {
    it('should get all events', async () => {
      const mockEvents = [{ eventID: '1' }, { eventID: '2' }];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockEvents });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_events', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/0/projects/test-org/test-project/events/'),
        }),
      );
    });

    it('should pass full parameter', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: [] });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_all_events', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
        full: true,
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            full: true,
          }),
        }),
      );
    });
  });

  describe('Action: get_issue', () => {
    it('should get issue by ID', async () => {
      const mockIssue = { id: 'issue123', title: 'Test Error' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockIssue });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_issue', {
        issueId: 'issue123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/0/issues/issue123/'),
        }),
      );
    });
  });

  describe('Action: get_all_issues', () => {
    it('should get all issues for a project', async () => {
      const mockIssues = [{ id: '1' }, { id: '2' }];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockIssues });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_issues', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
      });

      expect(result.success).toBe(true);
    });

    it('should apply query filter', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: [] });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_all_issues', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
        query: 'is:unresolved',
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            query: 'is:unresolved',
          }),
        }),
      );
    });
  });

  describe('Action: update_issue', () => {
    it('should update issue status', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'issue123', status: 'resolved' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_issue', {
        issueId: 'issue123',
        status: 'resolved',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          endpoint: expect.stringContaining('/api/0/issues/issue123/'),
        }),
      );
    });

    it('should update issue assignee', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'issue123', assignedTo: { id: 'user1' } },
      });

      await connector.initialize(mockConfig);
      await connector.executeAction('update_issue', {
        issueId: 'issue123',
        assignedTo: 'user1',
      });

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            assignedTo: 'user1',
          }),
        }),
      );
    });
  });

  describe('Action: delete_issue', () => {
    it('should delete issue', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_issue', {
        issueId: 'issue123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/api/0/issues/issue123/'),
        }),
      );
    });
  });

  describe('Action: get_organization', () => {
    it('should get organization by slug', async () => {
      const mockOrg = { id: 'org1', slug: 'test-org', name: 'Test Org' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockOrg });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_organization', {
        organizationSlug: 'test-org',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/0/organizations/test-org/'),
        }),
      );
    });
  });

  describe('Action: get_all_organizations', () => {
    it('should get all organizations', async () => {
      const mockOrgs = [{ id: '1', slug: 'org1' }, { id: '2', slug: 'org2' }];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockOrgs });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_organizations', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/0/organizations/'),
        }),
      );
    });
  });

  describe('Action: create_organization', () => {
    it('should create organization', async () => {
      const mockOrg = { id: 'org1', slug: 'new-org', name: 'New Org' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockOrg });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_organization', {
        name: 'New Org',
        agreeTerms: true,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            name: 'New Org',
            agreeTerms: true,
          }),
        }),
      );
    });
  });

  describe('Action: create_project', () => {
    it('should create project', async () => {
      const mockProject = { id: 'proj1', slug: 'new-project', name: 'New Project' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_project', {
        organizationSlug: 'test-org',
        teamSlug: 'test-team',
        name: 'New Project',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/0/teams/test-org/test-team/projects/'),
        }),
      );
    });
  });

  describe('Action: get_project', () => {
    it('should get project by slug', async () => {
      const mockProject = { id: 'proj1', slug: 'test-project' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProject });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_project', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/0/projects/test-org/test-project/'),
        }),
      );
    });
  });

  describe('Action: get_all_projects', () => {
    it('should get all projects', async () => {
      const mockProjects = [{ id: '1' }, { id: '2' }];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockProjects });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_projects', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/0/projects/'),
        }),
      );
    });
  });

  describe('Action: delete_project', () => {
    it('should delete project', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_project', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: create_release', () => {
    it('should create release', async () => {
      const mockRelease = { version: '1.0.0', dateCreated: '2024-01-01' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockRelease });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_release', {
        organizationSlug: 'test-org',
        version: '1.0.0',
        url: 'https://github.com/org/repo/releases/v1.0.0',
        projects: ['test-project'],
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/0/organizations/test-org/releases/'),
        }),
      );
    });
  });

  describe('Action: get_release', () => {
    it('should get release by version', async () => {
      const mockRelease = { version: '1.0.0' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockRelease });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_release', {
        organizationSlug: 'test-org',
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/0/organizations/test-org/releases/1.0.0/'),
        }),
      );
    });
  });

  describe('Action: get_all_releases', () => {
    it('should get all releases', async () => {
      const mockReleases = [{ version: '1.0.0' }, { version: '1.1.0' }];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockReleases });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_releases', {
        organizationSlug: 'test-org',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: delete_release', () => {
    it('should delete release', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_release', {
        organizationSlug: 'test-org',
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: create_team', () => {
    it('should create team', async () => {
      const mockTeam = { id: 'team1', slug: 'new-team', name: 'New Team' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTeam });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_team', {
        organizationSlug: 'test-org',
        name: 'New Team',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/0/organizations/test-org/teams/'),
        }),
      );
    });
  });

  describe('Action: get_team', () => {
    it('should get team by slug', async () => {
      const mockTeam = { id: 'team1', slug: 'test-team' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTeam });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_team', {
        organizationSlug: 'test-org',
        teamSlug: 'test-team',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/0/teams/test-org/test-team/'),
        }),
      );
    });
  });

  describe('Action: get_all_teams', () => {
    it('should get all teams', async () => {
      const mockTeams = [{ id: '1', slug: 'team1' }, { id: '2', slug: 'team2' }];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockTeams });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_teams', {
        organizationSlug: 'test-org',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: delete_team', () => {
    it('should delete team', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_team', {
        organizationSlug: 'test-org',
        teamSlug: 'test-team',
      });

      expect(result.success).toBe(true);
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
        data: [{ id: 'org1' }],
      });

      await connector.initialize(mockConfig);
      await connector.testConnection();

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockCredentials.token}`,
          }),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_issues', {
        organizationSlug: 'test-org',
        projectSlug: 'test-project',
      });

      expect(result.success).toBe(false);
    });

    it('should handle network errors', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(new Error('Network error'));

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });
});
