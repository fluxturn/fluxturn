/**
 * Asana Connector Tests
 *
 * Tests for the Asana connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { AsanaConnector } from '../asana.connector';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import { getMockCredentials } from '@test/helpers/mock-credentials';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import createTaskFixture from './fixtures/create_task.json';
import updateTaskFixture from './fixtures/update_task.json';
import createProjectFixture from './fixtures/create_project.json';
import getTaskFixture from './fixtures/get_task.json';
import getTasksFixture from './fixtures/get_tasks.json';

describe('AsanaConnector', () => {
  let connector: AsanaConnector;
  const BASE_URL = 'https://app.asana.com/api/1.0';

  // Helper to create a new connector for each test
  const createConnector = async () => {
    nock.cleanAll();

    // Mock the /users/me request that happens during initialization
    nock(BASE_URL)
      .get('/users/me')
      .reply(200, {
        data: {
          gid: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      });

    // Create mock dependencies
    const httpService = new HttpService(axios as any);
    const authUtils = new AuthUtils(httpService);
    const apiUtils = new ApiUtils(httpService);

    // Create connector with dependencies
    const newConnector = new AsanaConnector(authUtils, apiUtils);

    // Initialize with mock credentials
    await newConnector.initialize({
      id: `test-asana-${Date.now()}`,
      name: 'asana',
      type: 'asana' as any,
      category: 'project-management' as any,
      credentials: getMockCredentials('asana'),
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
        .get('/users/me')
        .reply(200, {
          data: {
            gid: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
          },
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(401, {
          errors: [
            {
              message: 'Not Authorized',
              help: 'For more information on API status codes, see https://developers.asana.com/docs',
            },
          ],
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Task Action Tests
  // ===========================================
  describe('create_task', () => {
    const fixture = createTaskFixture as unknown as TestFixture;

    it('creates task successfully', async () => {
      nock(BASE_URL)
        .post('/tasks')
        .reply(201, {
          data: {
            gid: 'task-123456',
            name: 'Complete project documentation',
            notes: 'Write API documentation for the new features',
            permalink_url: 'https://app.asana.com/0/project/task-123456',
            completed: false,
            projects: [{ gid: '1234567890' }],
          },
        });

      const result = await connector.executeAction('create_task', {
        title: 'Complete project documentation',
        description: 'Write API documentation for the new features',
        projectId: '1234567890',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('task-123456');
    });

    it('creates task with assignee and due date', async () => {
      nock(BASE_URL)
        .post('/tasks')
        .reply(201, {
          data: {
            gid: 'task-789012',
            name: 'Review pull request',
            assignee: { gid: 'user-789' },
            due_on: '2024-03-15',
            completed: false,
            permalink_url: 'https://app.asana.com/0/0/task-789012',
          },
        });

      const result = await connector.executeAction('create_task', {
        title: 'Review pull request',
        assigneeId: 'user-789',
        dueDate: new Date('2024-03-15'),
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('task-789012');
    });

    it('handles validation error - missing title', async () => {
      nock(BASE_URL)
        .post('/tasks')
        .reply(400, {
          errors: [
            {
              message: 'name: Missing required field',
              help: 'For more information on API status codes, see https://developers.asana.com/docs',
            },
          ],
        });

      const result = await connector.executeAction('create_task', {
        description: 'Task without title',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('handles rate limit error', async () => {
      nock(BASE_URL)
        .post('/tasks')
        .reply(429, {
          errors: [
            {
              message: 'Rate limit exceeded',
              help: 'Retry after some time',
            },
          ],
        });

      const result = await connector.executeAction('create_task', {
        title: 'Rate limited task',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Update Task Action Tests
  // ===========================================
  describe('update_task', () => {
    it('updates task successfully', async () => {
      // Mock the PUT request for update
      nock(BASE_URL)
        .put('/tasks/task-123456')
        .reply(200, {
          data: {
            gid: 'task-123456',
            name: 'Updated task title',
            notes: 'Updated description',
            permalink_url: 'https://app.asana.com/0/project/task-123456',
            completed: false,
          },
        });

      // Mock the GET request for returning the task
      nock(BASE_URL)
        .get('/tasks/task-123456')
        .query(true)
        .reply(200, {
          data: {
            gid: 'task-123456',
            name: 'Updated task title',
            notes: 'Updated description',
            permalink_url: 'https://app.asana.com/0/project/task-123456',
            completed: false,
          },
        });

      const result = await connector.executeAction('update_task', {
        taskId: 'task-123456',
        updates: {
          title: 'Updated task title',
          description: 'Updated description',
        },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('task-123456');
    });

    it('marks task as completed', async () => {
      nock(BASE_URL)
        .put('/tasks/task-789012')
        .reply(200, {
          data: {
            gid: 'task-789012',
            name: 'Existing task',
            completed: true,
            permalink_url: 'https://app.asana.com/0/project/task-789012',
          },
        });

      nock(BASE_URL)
        .get('/tasks/task-789012')
        .query(true)
        .reply(200, {
          data: {
            gid: 'task-789012',
            name: 'Existing task',
            completed: true,
            permalink_url: 'https://app.asana.com/0/project/task-789012',
          },
        });

      const result = await connector.executeAction('update_task', {
        taskId: 'task-789012',
        updates: {
          status: 'Completed',
        },
      });

      expect(result.success).toBe(true);
    });

    it('handles task not found error', async () => {
      nock(BASE_URL)
        .put('/tasks/nonexistent-task')
        .reply(404, {
          errors: [
            {
              message: 'task: Unknown object: nonexistent-task',
              help: 'For more information on API status codes, see https://developers.asana.com/docs',
            },
          ],
        });

      const result = await connector.executeAction('update_task', {
        taskId: 'nonexistent-task',
        updates: {
          title: 'Will not update',
        },
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Create Project Action Tests
  // ===========================================
  describe('create_project', () => {
    it('creates project successfully', async () => {
      nock(BASE_URL)
        .post('/projects')
        .reply(201, {
          data: {
            gid: 'project-456789',
            name: 'New Marketing Campaign',
            notes: 'Q1 2024 marketing initiatives',
            permalink_url: 'https://app.asana.com/0/project-456789',
            workspace: { gid: 'workspace-123' },
          },
        });

      const result = await connector.executeAction('create_project', {
        name: 'New Marketing Campaign',
        description: 'Q1 2024 marketing initiatives',
        workspaceId: 'workspace-123',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('project-456789');
    });

    it('creates project with team', async () => {
      nock(BASE_URL)
        .post('/projects')
        .reply(201, {
          data: {
            gid: 'project-789012',
            name: 'Engineering Sprint',
            permalink_url: 'https://app.asana.com/0/project-789012',
            workspace: { gid: 'workspace-123' },
            team: { gid: 'team-456' },
          },
        });

      const result = await connector.executeAction('create_project', {
        name: 'Engineering Sprint',
        workspaceId: 'workspace-123',
        teamId: 'team-456',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('project-789012');
    });

    it('handles missing workspace error', async () => {
      const result = await connector.executeAction('create_project', {
        name: 'Project without workspace',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Task Action Tests
  // ===========================================
  describe('get_task', () => {
    it('gets task successfully', async () => {
      nock(BASE_URL)
        .get('/tasks/task-123456')
        .query(true)
        .reply(200, {
          data: {
            gid: 'task-123456',
            name: 'Complete project documentation',
            notes: 'Write API documentation for the new features',
            completed: false,
            due_on: '2024-03-15',
            assignee: { gid: 'user-789', name: 'John Doe' },
            projects: [{ gid: 'project-123', name: 'Main Project' }],
            permalink_url: 'https://app.asana.com/0/project/task-123456',
          },
        });

      const result = await connector.executeAction('get_task', {
        taskId: 'task-123456',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('task-123456');
      expect(data.title).toBe('Complete project documentation');
    });

    it('handles task not found', async () => {
      nock(BASE_URL)
        .get('/tasks/nonexistent-task')
        .query(true)
        .reply(404, {
          errors: [
            {
              message: 'task: Unknown object: nonexistent-task',
              help: 'For more information on API status codes, see https://developers.asana.com/docs',
            },
          ],
        });

      const result = await connector.executeAction('get_task', {
        taskId: 'nonexistent-task',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('handles unauthorized access', async () => {
      nock(BASE_URL)
        .get('/tasks/task-private')
        .query(true)
        .reply(401, {
          errors: [
            {
              message: 'Not Authorized',
              help: 'For more information on API status codes, see https://developers.asana.com/docs',
            },
          ],
        });

      const result = await connector.executeAction('get_task', {
        taskId: 'task-private',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Tasks Action Tests
  // ===========================================
  describe('get_tasks', () => {
    it('gets tasks from project', async () => {
      nock(BASE_URL)
        .get('/projects/project-123/tasks')
        .query(true)
        .reply(200, {
          data: [
            { gid: 'task-1', name: 'Task One', completed: false },
            { gid: 'task-2', name: 'Task Two', completed: true },
            { gid: 'task-3', name: 'Task Three', completed: false },
          ],
        });

      const result = await connector.executeAction('get_tasks', {
        projectId: 'project-123',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toHaveLength(3);
    });

    it('handles empty result', async () => {
      nock(BASE_URL)
        .get('/projects/empty-project/tasks')
        .query(true)
        .reply(200, {
          data: [],
        });

      const result = await connector.executeAction('get_tasks', {
        projectId: 'empty-project',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toHaveLength(0);
    });
  });

  // ===========================================
  // Delete Task Action Tests
  // ===========================================
  describe('delete_task', () => {
    it('deletes task successfully', async () => {
      nock(BASE_URL)
        .delete('/tasks/task-123456')
        .reply(200, { data: {} });

      const result = await connector.executeAction('delete_task', {
        taskId: 'task-123456',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.deleted).toBe(true);
    });

    it('handles delete of non-existent task', async () => {
      nock(BASE_URL)
        .delete('/tasks/nonexistent-task')
        .reply(404, {
          errors: [
            {
              message: 'task: Unknown object: nonexistent-task',
            },
          ],
        });

      const result = await connector.executeAction('delete_task', {
        taskId: 'nonexistent-task',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Assign Task Action Tests
  // ===========================================
  describe('assign_task', () => {
    it('assigns task successfully', async () => {
      nock(BASE_URL)
        .put('/tasks/task-123456')
        .reply(200, {
          data: {
            gid: 'task-123456',
            assignee: { gid: 'user-789' },
          },
        });

      nock(BASE_URL)
        .get('/tasks/task-123456')
        .query(true)
        .reply(200, {
          data: {
            gid: 'task-123456',
            name: 'Task',
            assignee: { gid: 'user-789' },
            completed: false,
          },
        });

      const result = await connector.executeAction('assign_task', {
        taskId: 'task-123456',
        assigneeId: 'user-789',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.assigneeId).toBe('user-789');
    });

    it('handles invalid assignee', async () => {
      nock(BASE_URL)
        .put('/tasks/task-123456')
        .reply(400, {
          errors: [
            {
              message: 'assignee: Unknown object: invalid-user',
            },
          ],
        });

      const result = await connector.executeAction('assign_task', {
        taskId: 'task-123456',
        assigneeId: 'invalid-user',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Add Tag Action Tests (maps to addLabelToTask)
  // ===========================================
  describe('add_tag', () => {
    it('adds tag to task successfully', async () => {
      nock(BASE_URL)
        .post('/tasks/task-123456/addTag')
        .reply(200, { data: {} });

      const result = await connector.executeAction('add_tag', {
        taskId: 'task-123456',
        tagId: 'tag-789',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toBe(true);
    });

    it('handles invalid tag', async () => {
      nock(BASE_URL)
        .post('/tasks/task-123456/addTag')
        .reply(400, {
          errors: [
            {
              message: 'tag: Unknown object: invalid-tag',
            },
          ],
        });

      const result = await connector.executeAction('add_tag', {
        taskId: 'task-123456',
        tagId: 'invalid-tag',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Add Comment Action Tests
  // ===========================================
  describe('add_comment', () => {
    it('adds comment successfully', async () => {
      nock(BASE_URL)
        .post('/stories')
        .reply(201, {
          data: {
            gid: 'story-123',
            text: 'Great progress on this task!',
            created_by: { gid: 'user-789' },
            created_at: '2024-01-15T10:00:00Z',
          },
        });

      const result = await connector.executeAction('add_comment', {
        taskId: 'task-123456',
        content: 'Great progress on this task!',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('story-123');
    });

    it('handles missing task', async () => {
      nock(BASE_URL)
        .post('/stories')
        .reply(404, {
          errors: [
            {
              message: 'target: Unknown object',
            },
          ],
        });

      const result = await connector.executeAction('add_comment', {
        taskId: 'nonexistent-task',
        content: 'Comment on missing task',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Create Section Action Tests
  // ===========================================
  describe('create_section', () => {
    it('creates section successfully', async () => {
      nock(BASE_URL)
        .post('/sections')
        .reply(201, {
          data: {
            gid: 'section-123',
            name: 'To Do',
            created_at: '2024-01-15T10:00:00Z',
          },
        });

      const result = await connector.executeAction('create_section', {
        name: 'To Do',
        projectId: 'project-123',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('section-123');
      expect(data.name).toBe('To Do');
    });

    it('handles missing project', async () => {
      nock(BASE_URL)
        .post('/sections')
        .reply(400, {
          errors: [
            {
              message: 'project: Missing required field',
            },
          ],
        });

      const result = await connector.executeAction('create_section', {
        name: 'Section',
        projectId: 'nonexistent-project',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Create Subtask Action Tests
  // ===========================================
  describe('create_subtask', () => {
    it('creates subtask successfully', async () => {
      nock(BASE_URL)
        .post('/tasks')
        .reply(201, {
          data: {
            gid: 'subtask-123',
            name: 'Subtask item',
            notes: 'Description of subtask',
            parent: { gid: 'task-123456' },
            completed: false,
            permalink_url: 'https://app.asana.com/0/0/subtask-123',
          },
        });

      const result = await connector.executeAction('create_subtask', {
        parentTaskId: 'task-123456',
        title: 'Subtask item',
        description: 'Description of subtask',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('subtask-123');
      expect(data.parentTaskId).toBe('task-123456');
    });

    it('handles invalid parent task', async () => {
      nock(BASE_URL)
        .post('/tasks')
        .reply(400, {
          errors: [
            {
              message: 'parent: Unknown object',
            },
          ],
        });

      const result = await connector.executeAction('create_subtask', {
        parentTaskId: 'invalid-parent',
        title: 'Subtask',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Subtasks Action Tests
  // ===========================================
  describe('get_subtasks', () => {
    it('gets subtasks successfully', async () => {
      nock(BASE_URL)
        .get('/tasks/task-123456/subtasks')
        .query(true)
        .reply(200, {
          data: [
            { gid: 'subtask-1', name: 'Subtask 1', completed: false },
            { gid: 'subtask-2', name: 'Subtask 2', completed: true },
          ],
        });

      const result = await connector.executeAction('get_subtasks', {
        taskId: 'task-123456',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toHaveLength(2);
    });

    it('handles task with no subtasks', async () => {
      nock(BASE_URL)
        .get('/tasks/task-no-subtasks/subtasks')
        .query(true)
        .reply(200, {
          data: [],
        });

      const result = await connector.executeAction('get_subtasks', {
        taskId: 'task-no-subtasks',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toHaveLength(0);
    });
  });

  // ===========================================
  // Search Tasks Action Tests (maps to searchTasksAdvanced)
  // ===========================================
  describe('search_tasks', () => {
    it('searches tasks in workspace', async () => {
      nock(BASE_URL)
        .get('/workspaces/workspace-123/tasks/search')
        .query(true)
        .reply(200, {
          data: [
            { gid: 'task-1', name: 'Matching task 1', completed: false },
            { gid: 'task-2', name: 'Matching task 2', completed: true },
          ],
        });

      const result = await connector.executeAction('search_tasks', {
        workspaceId: 'workspace-123',
        query: 'Matching',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toHaveLength(2);
    });

    it('searches with filters', async () => {
      nock(BASE_URL)
        .get('/workspaces/workspace-123/tasks/search')
        .query(true)
        .reply(200, {
          data: [
            { gid: 'task-1', name: 'Assigned task', assignee: { gid: 'user-789' }, completed: false },
          ],
        });

      const result = await connector.executeAction('search_tasks', {
        workspaceId: 'workspace-123',
        assigneeId: 'user-789',
        completed: false,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toHaveLength(1);
    });

    it('handles no results', async () => {
      nock(BASE_URL)
        .get('/workspaces/workspace-123/tasks/search')
        .query(true)
        .reply(200, {
          data: [],
        });

      const result = await connector.executeAction('search_tasks', {
        workspaceId: 'workspace-123',
        query: 'nonexistent',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toHaveLength(0);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Rate Limiting Tests
  // ===========================================
  describe('rate limiting', () => {
    it('should handle 429 Too Many Requests', async () => {
      nock(BASE_URL)
        .get('/tasks/task-123456')
        .query(true)
        .reply(429, {
          errors: [
            {
              message: 'Rate limit exceeded',
            },
          ],
        });

      const result = await connector.executeAction('get_task', {
        taskId: 'task-123456',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Server Error Tests
  // ===========================================
  describe('server errors', () => {
    it('should handle 500 Internal Server Error', async () => {
      nock(BASE_URL)
        .get('/tasks/task-123456')
        .query(true)
        .reply(500, {
          errors: [
            {
              message: 'Internal server error',
            },
          ],
        });

      const result = await connector.executeAction('get_task', {
        taskId: 'task-123456',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });
});
