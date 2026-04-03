/**
 * Todoist Connector Tests
 *
 * Tests for the Todoist connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { TodoistConnector } from '../todoist.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('TodoistConnector', () => {
  let connector: TodoistConnector;
  const BASE_URL = 'https://api.todoist.com/rest/v2';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(TodoistConnector, 'todoist');
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
        .get('/labels')
        .reply(200, []);

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/labels')
        .reply(401, { error: 'Invalid API key' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/labels')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Task Operations
  // ===========================================
  describe('task_create', () => {
    it('should create a task successfully', async () => {
      const mockTask = {
        id: '2995104339',
        content: 'Buy groceries',
        description: 'Get milk and eggs',
        project_id: '2203306141',
        created_at: '2024-01-13T12:00:00Z',
      };

      nock(BASE_URL)
        .post('/tasks', {
          content: 'Buy groceries',
          description: 'Get milk and eggs',
        })
        .reply(200, mockTask);

      const result = await connector.executeAction('task_create', {
        content: 'Buy groceries',
        description: 'Get milk and eggs',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('2995104339');
      expect(data.content).toBe('Buy groceries');
    });

    it('should create a task with full options', async () => {
      const mockTask = {
        id: '2995104340',
        content: 'Submit report',
        description: 'Quarterly report',
        project_id: '2203306141',
        priority: 4,
        labels: ['urgent', 'work'],
        due_string: 'tomorrow',
      };

      nock(BASE_URL)
        .post('/tasks', (body) => {
          return body.content === 'Submit report' &&
                 body.priority === 4 &&
                 Array.isArray(body.labels);
        })
        .reply(200, mockTask);

      const result = await connector.executeAction('task_create', {
        content: 'Submit report',
        description: 'Quarterly report',
        projectId: '2203306141',
        priority: 4,
        labels: ['urgent', 'work'],
        dueString: 'tomorrow',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.priority).toBe(4);
    });

    it('should handle validation error', async () => {
      nock(BASE_URL)
        .post('/tasks')
        .reply(400, { error: 'Content is required' });

      const result = await connector.executeAction('task_create', {
        content: '',
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('task_get', () => {
    it('should get a task by ID', async () => {
      const mockTask = {
        id: '2995104339',
        content: 'Buy groceries',
        description: 'Get milk and eggs',
        is_completed: false,
      };

      nock(BASE_URL)
        .get('/tasks/2995104339')
        .reply(200, mockTask);

      const result = await connector.executeAction('task_get', {
        taskId: '2995104339',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('2995104339');
      expect(data.content).toBe('Buy groceries');
    });

    it('should handle task not found', async () => {
      nock(BASE_URL)
        .get('/tasks/nonexistent')
        .reply(404, { error: 'Task not found' });

      const result = await connector.executeAction('task_get', {
        taskId: 'nonexistent',
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('task_getAll', () => {
    it('should get all tasks', async () => {
      const mockTasks = [
        { id: '1', content: 'Task 1' },
        { id: '2', content: 'Task 2' },
      ];

      nock(BASE_URL)
        .get('/tasks')
        .reply(200, mockTasks);

      const result = await connector.executeAction('task_getAll', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('should get tasks with filters', async () => {
      const mockTasks = [
        { id: '1', content: 'Project Task 1', project_id: '2203306141' },
      ];

      nock(BASE_URL)
        .get('/tasks?project_id=2203306141')
        .reply(200, mockTasks);

      const result = await connector.executeAction('task_getAll', {
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data[0].project_id).toBe('2203306141');
    });
  });

  describe('task_update', () => {
    it('should update a task', async () => {
      const mockTask = {
        id: '2995104339',
        content: 'Buy groceries - updated',
        description: 'Updated description',
      };

      nock(BASE_URL)
        .post('/tasks/2995104339', {
          content: 'Buy groceries - updated',
          description: 'Updated description',
        })
        .reply(200, mockTask);

      const result = await connector.executeAction('task_update', {
        taskId: '2995104339',
        content: 'Buy groceries - updated',
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.content).toBe('Buy groceries - updated');
    });
  });

  describe('task_close', () => {
    it('should close a task', async () => {
      nock(BASE_URL)
        .post('/tasks/2995104339/close')
        .reply(204);

      const result = await connector.executeAction('task_close', {
        taskId: '2995104339',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('task_reopen', () => {
    it('should reopen a task', async () => {
      nock(BASE_URL)
        .post('/tasks/2995104339/reopen')
        .reply(204);

      const result = await connector.executeAction('task_reopen', {
        taskId: '2995104339',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('task_delete', () => {
    it('should delete a task', async () => {
      nock(BASE_URL)
        .delete('/tasks/2995104339')
        .reply(204);

      const result = await connector.executeAction('task_delete', {
        taskId: '2995104339',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('task_move', () => {
    it('should move a task to another project', async () => {
      const mockTask = {
        id: '2995104339',
        project_id: '2203306142',
      };

      nock(BASE_URL)
        .post('/tasks/2995104339', {
          project_id: '2203306142',
        })
        .reply(200, mockTask);

      const result = await connector.executeAction('task_move', {
        taskId: '2995104339',
        projectId: '2203306142',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.project_id).toBe('2203306142');
    });
  });

  describe('task_quickAdd', () => {
    it('should quick add a task', async () => {
      const mockTask = {
        id: '2995104341',
        content: 'Buy milk',
      };

      nock(BASE_URL)
        .post('/quick/add', {
          text: 'Buy milk tomorrow',
        })
        .reply(200, mockTask);

      const result = await connector.executeAction('task_quickAdd', {
        text: 'Buy milk tomorrow',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('2995104341');
    });
  });

  // ===========================================
  // Project Operations
  // ===========================================
  describe('project_create', () => {
    it('should create a project', async () => {
      const mockProject = {
        id: '2203306141',
        name: 'Work Projects',
        color: 'blue',
      };

      nock(BASE_URL)
        .post('/projects', {
          name: 'Work Projects',
        })
        .reply(200, mockProject);

      const result = await connector.executeAction('project_create', {
        name: 'Work Projects',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.name).toBe('Work Projects');
    });
  });

  describe('project_get', () => {
    it('should get a project by ID', async () => {
      const mockProject = {
        id: '2203306141',
        name: 'Work Projects',
      };

      nock(BASE_URL)
        .get('/projects/2203306141')
        .reply(200, mockProject);

      const result = await connector.executeAction('project_get', {
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('2203306141');
    });
  });

  describe('project_getAll', () => {
    it('should get all projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ];

      nock(BASE_URL)
        .get('/projects')
        .reply(200, mockProjects);

      const result = await connector.executeAction('project_getAll', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.length).toBe(2);
    });
  });

  describe('project_update', () => {
    it('should update a project', async () => {
      const mockProject = {
        id: '2203306141',
        name: 'Updated Project Name',
      };

      nock(BASE_URL)
        .post('/projects/2203306141', {
          name: 'Updated Project Name',
        })
        .reply(200, mockProject);

      const result = await connector.executeAction('project_update', {
        projectId: '2203306141',
        name: 'Updated Project Name',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.name).toBe('Updated Project Name');
    });
  });

  describe('project_delete', () => {
    it('should delete a project', async () => {
      nock(BASE_URL)
        .delete('/projects/2203306141')
        .reply(204);

      const result = await connector.executeAction('project_delete', {
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('project_archive', () => {
    it('should archive a project', async () => {
      const mockProject = {
        id: '2203306141',
        is_archived: true,
      };

      nock(BASE_URL)
        .post('/projects/2203306141', {
          is_archived: true,
        })
        .reply(200, mockProject);

      const result = await connector.executeAction('project_archive', {
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('project_unarchive', () => {
    it('should unarchive a project', async () => {
      const mockProject = {
        id: '2203306141',
        is_archived: false,
      };

      nock(BASE_URL)
        .post('/projects/2203306141', {
          is_archived: false,
        })
        .reply(200, mockProject);

      const result = await connector.executeAction('project_unarchive', {
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('project_getCollaborators', () => {
    it('should get project collaborators', async () => {
      const mockCollaborators = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];

      nock(BASE_URL)
        .get('/projects/2203306141/collaborators')
        .reply(200, mockCollaborators);

      const result = await connector.executeAction('project_getCollaborators', {
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.length).toBe(2);
    });
  });

  // ===========================================
  // Section Operations
  // ===========================================
  describe('section_create', () => {
    it('should create a section', async () => {
      const mockSection = {
        id: '7025',
        name: 'To Do',
        project_id: '2203306141',
      };

      nock(BASE_URL)
        .post('/sections', {
          name: 'To Do',
          project_id: '2203306141',
        })
        .reply(200, mockSection);

      const result = await connector.executeAction('section_create', {
        name: 'To Do',
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.name).toBe('To Do');
    });
  });

  describe('section_get', () => {
    it('should get a section by ID', async () => {
      const mockSection = {
        id: '7025',
        name: 'To Do',
      };

      nock(BASE_URL)
        .get('/sections/7025')
        .reply(200, mockSection);

      const result = await connector.executeAction('section_get', {
        sectionId: '7025',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('7025');
    });
  });

  describe('section_getAll', () => {
    it('should get all sections', async () => {
      const mockSections = [
        { id: '1', name: 'Section 1' },
        { id: '2', name: 'Section 2' },
      ];

      nock(BASE_URL)
        .get('/sections')
        .reply(200, mockSections);

      const result = await connector.executeAction('section_getAll', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.length).toBe(2);
    });

    it('should get sections filtered by project', async () => {
      const mockSections = [
        { id: '1', name: 'Section 1', project_id: '2203306141' },
      ];

      nock(BASE_URL)
        .get('/sections?project_id=2203306141')
        .reply(200, mockSections);

      const result = await connector.executeAction('section_getAll', {
        projectId: '2203306141',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('section_update', () => {
    it('should update a section', async () => {
      const mockSection = {
        id: '7025',
        name: 'Updated Section Name',
      };

      nock(BASE_URL)
        .post('/sections/7025', {
          name: 'Updated Section Name',
        })
        .reply(200, mockSection);

      const result = await connector.executeAction('section_update', {
        sectionId: '7025',
        name: 'Updated Section Name',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.name).toBe('Updated Section Name');
    });
  });

  describe('section_delete', () => {
    it('should delete a section', async () => {
      nock(BASE_URL)
        .delete('/sections/7025')
        .reply(204);

      const result = await connector.executeAction('section_delete', {
        sectionId: '7025',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Comment Operations
  // ===========================================
  describe('comment_create', () => {
    it('should create a comment', async () => {
      const mockComment = {
        id: '2992679862',
        content: 'Great work!',
        task_id: '2995104339',
      };

      nock(BASE_URL)
        .post('/comments', {
          task_id: '2995104339',
          content: 'Great work!',
        })
        .reply(200, mockComment);

      const result = await connector.executeAction('comment_create', {
        taskId: '2995104339',
        content: 'Great work!',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.content).toBe('Great work!');
    });
  });

  describe('comment_get', () => {
    it('should get a comment by ID', async () => {
      const mockComment = {
        id: '2992679862',
        content: 'Great work!',
      };

      nock(BASE_URL)
        .get('/comments/2992679862')
        .reply(200, mockComment);

      const result = await connector.executeAction('comment_get', {
        commentId: '2992679862',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('2992679862');
    });
  });

  describe('comment_getAll', () => {
    it('should get comments by task', async () => {
      const mockComments = [
        { id: '1', content: 'Comment 1', task_id: '2995104339' },
      ];

      nock(BASE_URL)
        .get('/comments?task_id=2995104339')
        .reply(200, mockComments);

      const result = await connector.executeAction('comment_getAll', {
        taskId: '2995104339',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.length).toBe(1);
    });
  });

  describe('comment_update', () => {
    it('should update a comment', async () => {
      const mockComment = {
        id: '2992679862',
        content: 'Updated comment',
      };

      nock(BASE_URL)
        .post('/comments/2992679862', {
          content: 'Updated comment',
        })
        .reply(200, mockComment);

      const result = await connector.executeAction('comment_update', {
        commentId: '2992679862',
        content: 'Updated comment',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.content).toBe('Updated comment');
    });
  });

  describe('comment_delete', () => {
    it('should delete a comment', async () => {
      nock(BASE_URL)
        .delete('/comments/2992679862')
        .reply(204);

      const result = await connector.executeAction('comment_delete', {
        commentId: '2992679862',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Label Operations
  // ===========================================
  describe('label_create', () => {
    it('should create a label', async () => {
      const mockLabel = {
        id: '2156154810',
        name: 'Important',
        color: 'red',
      };

      nock(BASE_URL)
        .post('/labels', {
          name: 'Important',
        })
        .reply(200, mockLabel);

      const result = await connector.executeAction('label_create', {
        name: 'Important',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.name).toBe('Important');
    });
  });

  describe('label_get', () => {
    it('should get a label by ID', async () => {
      const mockLabel = {
        id: '2156154810',
        name: 'Important',
      };

      nock(BASE_URL)
        .get('/labels/2156154810')
        .reply(200, mockLabel);

      const result = await connector.executeAction('label_get', {
        labelId: '2156154810',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('2156154810');
    });
  });

  describe('label_getAll', () => {
    it('should get all labels', async () => {
      const mockLabels = [
        { id: '1', name: 'Label 1' },
        { id: '2', name: 'Label 2' },
      ];

      nock(BASE_URL)
        .get('/labels')
        .reply(200, mockLabels);

      const result = await connector.executeAction('label_getAll', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.length).toBe(2);
    });
  });

  describe('label_update', () => {
    it('should update a label', async () => {
      const mockLabel = {
        id: '2156154810',
        name: 'Very Important',
      };

      nock(BASE_URL)
        .post('/labels/2156154810', {
          name: 'Very Important',
        })
        .reply(200, mockLabel);

      const result = await connector.executeAction('label_update', {
        labelId: '2156154810',
        name: 'Very Important',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.name).toBe('Very Important');
    });
  });

  describe('label_delete', () => {
    it('should delete a label', async () => {
      nock(BASE_URL)
        .delete('/labels/2156154810')
        .reply(204);

      const result = await connector.executeAction('label_delete', {
        labelId: '2156154810',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Unknown Action Test
  // ===========================================
  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Unknown action');
    });
  });
});
