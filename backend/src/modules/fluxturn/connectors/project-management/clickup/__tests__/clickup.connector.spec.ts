/**
 * ClickUp Connector Tests
 *
 * Tests for all ClickUp connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { ClickUpConnector } from '../clickup.connector';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import { getMockCredentials } from '@test/helpers/mock-credentials';

describe('ClickUpConnector', () => {
  let connector: ClickUpConnector;
  const BASE_URL = 'https://api.clickup.com';

  // Helper to create a new connector for each test
  const createConnector = async () => {
    nock.cleanAll();

    // Mock the /user request that happens during initialization
    nock(BASE_URL)
      .get('/api/v2/user')
      .reply(200, {
        user: {
          id: 123456,
          username: 'testuser',
          email: 'test@example.com',
          color: '#7B68EE',
          profilePicture: 'https://clickup.com/avatar.jpg',
        },
      });

    // Create mock dependencies
    const httpService = new HttpService(axios as any);
    const authUtils = new AuthUtils(httpService);
    const apiUtils = new ApiUtils(httpService);

    // Create connector with dependencies
    const newConnector = new ClickUpConnector(authUtils, apiUtils);

    // Initialize with mock credentials
    await newConnector.initialize({
      id: `test-clickup-${Date.now()}`,
      name: 'clickup',
      type: 'clickup' as any,
      category: 'project_management' as any,
      credentials: getMockCredentials('clickup'),
    } as any);

    // Clean nock for the actual test
    nock.cleanAll();

    return newConnector;
  };

  beforeEach(async () => {
    connector = await createConnector();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(BASE_URL)
        .get('/api/v2/user')
        .reply(200, {
          user: {
            id: 123456,
            username: 'testuser',
            email: 'test@example.com',
          },
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/api/v2/user')
        .reply(401, {
          err: 'Token invalid',
          ECODE: 'OAUTH_017',
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Task Actions
  // ===========================================
  describe('task_create', () => {
    it('creates task successfully', async () => {
      nock(BASE_URL)
        .post('/api/v2/list/list-123/task')
        .reply(200, {
          id: 'task-abc',
          name: 'New Task',
          description: 'Task description',
          status: { status: 'Open' },
          url: 'https://app.clickup.com/t/task-abc',
          assignees: [],
          tags: [],
        });

      const result = await connector.executeAction('task_create', {
        listId: 'list-123',
        name: 'New Task',
        description: 'Task description',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('task-abc');
    });

    it('handles missing list ID', async () => {
      const result = await connector.executeAction('task_create', {
        name: 'Test Task',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('listId');
    });
  });

  describe('task_update', () => {
    it('updates task successfully', async () => {
      // Mock update request
      nock(BASE_URL)
        .put('/api/v2/task/task-123')
        .reply(200, {
          id: 'task-123',
          name: 'Updated Task',
          status: { status: 'In Progress' },
        });

      // Mock get request for return value
      nock(BASE_URL)
        .get('/api/v2/task/task-123')
        .reply(200, {
          id: 'task-123',
          name: 'Updated Task',
          description: 'Updated description',
          status: { status: 'In Progress' },
          url: 'https://app.clickup.com/t/task-123',
        });

      const result = await connector.executeAction('task_update', {
        taskId: 'task-123',
        name: 'Updated Task',
        status: 'In Progress',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('task_get', () => {
    it('gets task successfully', async () => {
      nock(BASE_URL)
        .get('/api/v2/task/task-123')
        .reply(200, {
          id: 'task-123',
          name: 'Test Task',
          description: 'Test description',
          status: { status: 'Open' },
          priority: { priority: 'normal' },
          url: 'https://app.clickup.com/t/task-123',
          assignees: [{ id: 456, username: 'user1' }],
          tags: [{ name: 'bug' }],
          list: { id: 'list-1' },
        });

      const result = await connector.executeAction('task_get', {
        taskId: 'task-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('task-123');
      expect(result.data.title).toBe('Test Task');
    });

    it('handles task not found', async () => {
      nock(BASE_URL)
        .get('/api/v2/task/nonexistent')
        .reply(404, {
          err: 'Task not found',
          ECODE: 'ITEM_015',
        });

      const result = await connector.executeAction('task_get', {
        taskId: 'nonexistent',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('task_delete', () => {
    it('deletes task successfully', async () => {
      nock(BASE_URL)
        .delete('/api/v2/task/task-123')
        .reply(200, {});

      const result = await connector.executeAction('task_delete', {
        taskId: 'task-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
    });
  });

  describe('task_get_all', () => {
    it('gets all tasks from list', async () => {
      nock(BASE_URL)
        .get('/api/v2/list/list-123/task')
        .query(true)
        .reply(200, {
          tasks: [
            {
              id: 'task-1',
              name: 'Task 1',
              status: { status: 'Open' },
              list: { id: 'list-123' },
            },
            {
              id: 'task-2',
              name: 'Task 2',
              status: { status: 'Done' },
              list: { id: 'list-123' },
            },
          ],
        });

      const result = await connector.executeAction('task_get_all', {
        listId: 'list-123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('handles missing list ID', async () => {
      const result = await connector.executeAction('task_get_all', {});

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('listId');
    });
  });

  // ===========================================
  // List Actions
  // ===========================================
  describe('list_create', () => {
    it('creates list successfully', async () => {
      nock(BASE_URL)
        .post('/api/v2/folder/folder-123/list')
        .reply(200, {
          id: 'list-abc',
          name: 'New List',
          content: 'List description',
        });

      const result = await connector.executeAction('list_create', {
        folderId: 'folder-123',
        name: 'New List',
        content: 'List description',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('list-abc');
    });

    it('handles missing folder ID', async () => {
      const result = await connector.executeAction('list_create', {
        name: 'Test List',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('list_update', () => {
    it('updates list successfully', async () => {
      nock(BASE_URL)
        .put('/api/v2/list/list-123')
        .reply(200, {
          id: 'list-123',
          name: 'Updated List',
          content: 'Updated content',
        });

      const result = await connector.executeAction('list_update', {
        listId: 'list-123',
        name: 'Updated List',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('list_get', () => {
    it('gets list successfully', async () => {
      nock(BASE_URL)
        .get('/api/v2/list/list-123')
        .reply(200, {
          id: 'list-123',
          name: 'Test List',
          content: 'Test content',
          folder: { id: 'folder-1', name: 'Folder' },
          space: { id: 'space-1', name: 'Space' },
        });

      const result = await connector.executeAction('list_get', {
        listId: 'list-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('list-123');
    });
  });

  describe('list_delete', () => {
    it('deletes list successfully', async () => {
      nock(BASE_URL)
        .delete('/api/v2/list/list-123')
        .reply(200, {});

      const result = await connector.executeAction('list_delete', {
        listId: 'list-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
    });
  });

  // ===========================================
  // Folder Actions
  // ===========================================
  describe('folder_create', () => {
    it('creates folder successfully', async () => {
      nock(BASE_URL)
        .post('/api/v2/space/space-123/folder')
        .reply(200, {
          id: 'folder-abc',
          name: 'New Folder',
        });

      const result = await connector.executeAction('folder_create', {
        spaceId: 'space-123',
        name: 'New Folder',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('folder-abc');
    });
  });

  describe('folder_update', () => {
    it('updates folder successfully', async () => {
      nock(BASE_URL)
        .put('/api/v2/folder/folder-123')
        .reply(200, {
          id: 'folder-123',
          name: 'Updated Folder',
        });

      const result = await connector.executeAction('folder_update', {
        folderId: 'folder-123',
        name: 'Updated Folder',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('folder_get', () => {
    it('gets folder successfully', async () => {
      nock(BASE_URL)
        .get('/api/v2/folder/folder-123')
        .reply(200, {
          id: 'folder-123',
          name: 'Test Folder',
          lists: [],
        });

      const result = await connector.executeAction('folder_get', {
        folderId: 'folder-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('folder-123');
    });
  });

  describe('folder_delete', () => {
    it('deletes folder successfully', async () => {
      nock(BASE_URL)
        .delete('/api/v2/folder/folder-123')
        .reply(200, {});

      const result = await connector.executeAction('folder_delete', {
        folderId: 'folder-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
    });
  });

  // ===========================================
  // Comment Actions
  // ===========================================
  describe('comment_create', () => {
    it('creates comment successfully', async () => {
      nock(BASE_URL)
        .post('/api/v2/task/task-123/comment')
        .reply(200, {
          id: 'comment-abc',
          comment_text: 'This is a test comment',
          user: { id: 123, username: 'testuser' },
          date: '1621550400000',
        });

      const result = await connector.executeAction('comment_create', {
        taskId: 'task-123',
        commentText: 'This is a test comment',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('comment-abc');
    });

    it('handles missing task ID', async () => {
      const result = await connector.executeAction('comment_create', {
        commentText: 'Test comment',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Goal Actions
  // ===========================================
  describe('goal_create', () => {
    it('creates goal successfully', async () => {
      nock(BASE_URL)
        .post('/api/v2/team/team-123/goal')
        .reply(200, {
          goal: {
            id: 'goal-abc',
            name: 'Q4 OKR',
            description: 'Quarterly objectives',
          },
        });

      const result = await connector.executeAction('goal_create', {
        teamId: 'team-123',
        name: 'Q4 OKR',
        description: 'Quarterly objectives',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('goal-abc');
    });
  });

  describe('goal_update', () => {
    it('updates goal successfully', async () => {
      nock(BASE_URL)
        .put('/api/v2/goal/goal-123')
        .reply(200, {
          goal: {
            id: 'goal-123',
            name: 'Updated Goal',
          },
        });

      const result = await connector.executeAction('goal_update', {
        goalId: 'goal-123',
        name: 'Updated Goal',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('goal_get', () => {
    it('gets goal successfully', async () => {
      nock(BASE_URL)
        .get('/api/v2/goal/goal-123')
        .reply(200, {
          goal: {
            id: 'goal-123',
            name: 'Test Goal',
            description: 'Test description',
            percent_completed: 50,
          },
        });

      const result = await connector.executeAction('goal_get', {
        goalId: 'goal-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('goal-123');
    });
  });

  describe('goal_delete', () => {
    it('deletes goal successfully', async () => {
      nock(BASE_URL)
        .delete('/api/v2/goal/goal-123')
        .reply(200, {});

      const result = await connector.executeAction('goal_delete', {
        goalId: 'goal-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
    });
  });

  // ===========================================
  // Time Entry Actions
  // ===========================================
  describe('time_entry_create', () => {
    it('creates time entry successfully', async () => {
      nock(BASE_URL)
        .post('/api/v2/team/team-123/time_entries')
        .reply(200, {
          data: {
            id: 'time-abc',
            start: '1621464000000',
            duration: 3600000,
          },
        });

      const result = await connector.executeAction('time_entry_create', {
        teamId: 'team-123',
        taskId: 'task-456',
        start: 1621464000000,
        duration: 3600000,
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('time-abc');
    });
  });

  // ===========================================
  // Unknown Action
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNKNOWN_ERROR');
    });
  });

  // ===========================================
  // Error Handling
  // ===========================================
  describe('rate limiting', () => {
    it('should handle 429 Too Many Requests', async () => {
      nock(BASE_URL)
        .get('/api/v2/user')
        .reply(429, {
          err: 'Rate limit exceeded',
          ECODE: 'OAUTH_019',
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Interface Methods (IProjectManagementConnector)
  // ===========================================
  describe('getCurrentUser', () => {
    it('gets current user successfully', async () => {
      nock(BASE_URL)
        .get('/api/v2/user')
        .reply(200, {
          user: {
            id: 123456,
            username: 'testuser',
            email: 'test@example.com',
            profilePicture: 'https://example.com/avatar.jpg',
          },
        });

      const result = await connector.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('testuser');
      expect(result.data.email).toBe('test@example.com');
    });
  });
});
