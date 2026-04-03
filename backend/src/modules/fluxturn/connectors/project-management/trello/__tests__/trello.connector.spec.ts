/**
 * Trello Connector Tests
 *
 * Tests for the Trello project management connector actions using mocked HTTP responses.
 */
import { TrelloConnector } from '../trello.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('TrelloConnector', () => {
  let connector: TrelloConnector;
  let mockAuthUtils: AuthUtils;
  let mockApiUtils: ApiUtils;
  const BASE_URL = 'https://api.trello.com/1';

  beforeEach(async () => {
    // Create mock utils
    mockAuthUtils = {
      createAuthHeader: jest.fn().mockReturnValue(''),
      refreshToken: jest.fn().mockResolvedValue({ accessToken: 'new-token' }),
    } as any;

    mockApiUtils = {
      executeRequest: jest.fn().mockImplementation(async (request) => {
        // Mock API responses based on endpoint
        if (request.endpoint.includes('/members/me')) {
          return {
            success: true,
            data: {
              id: '5f0a1b2c3d4e5f6g',
              username: 'testuser',
              fullName: 'Test User',
              email: 'test@example.com'
            }
          };
        }
        // Handle add_member first (more specific)
        if (request.method === 'POST' && request.endpoint.includes('/cards/') && (request.endpoint.includes('/idMembers') || request.endpoint.includes('/members'))) {
          return {
            success: true,
            data: [
              { id: 'member123', fullName: 'Member One' }
            ]
          };
        }
        // Handle create_card (must check it's exactly /cards endpoint)
        if (request.method === 'POST' && (request.endpoint === '/cards' || request.endpoint.endsWith('/cards'))) {
          return {
            success: true,
            data: {
              id: 'card123',
              name: request.queryParams?.name || 'Test Card',
              desc: request.queryParams?.desc || '',
              idList: request.queryParams?.idList || 'list123',
              idBoard: 'board123',
              url: 'https://trello.com/c/card123',
              shortUrl: 'https://trello.com/c/card123',
              due: request.queryParams?.due || null,
              dueComplete: request.queryParams?.dueComplete || false
            }
          };
        }
        if (request.method === 'PUT' && request.endpoint.includes('/cards/')) {
          return {
            success: true,
            data: {
              id: 'card123',
              name: request.body?.name || 'Updated Card',
              desc: request.body?.desc || '',
              closed: request.body?.closed || false,
              url: 'https://trello.com/c/card123'
            }
          };
        }
        if (request.method === 'GET' && request.endpoint.match(/\/cards\/[^/]+$/)) {
          return {
            success: true,
            data: {
              id: 'card123',
              name: 'Test Card',
              desc: 'Test description',
              idList: 'list123',
              idBoard: 'board123',
              closed: false,
              url: 'https://trello.com/c/card123'
            }
          };
        }
        if (request.method === 'GET' && request.endpoint.includes('/lists/') && request.endpoint.includes('/cards')) {
          return {
            success: true,
            data: [
              { id: 'card1', name: 'Card 1', idList: 'list123' },
              { id: 'card2', name: 'Card 2', idList: 'list123' }
            ]
          };
        }
        if (request.method === 'DELETE' && request.endpoint.includes('/cards/')) {
          return {
            success: true,
            data: { limits: {} }
          };
        }
        if (request.method === 'POST' && request.endpoint.includes('/boards')) {
          return {
            success: true,
            data: {
              id: 'board123',
              name: request.body?.name || request.queryParams?.name || 'Test Board',
              desc: request.body?.desc || request.queryParams?.desc || '',
              url: 'https://trello.com/b/board123',
              shortUrl: 'https://trello.com/b/board123'
            }
          };
        }
        if (request.method === 'POST' && request.endpoint.includes('/lists')) {
          return {
            success: true,
            data: {
              id: 'list456',
              name: request.body?.name || request.queryParams?.name || 'Test List',
              idBoard: request.body?.idBoard || request.queryParams?.idBoard || 'board123',
              pos: request.body?.pos || request.queryParams?.pos || 16384
            }
          };
        }
        if (request.method === 'GET' && request.endpoint.includes('/boards/') && request.endpoint.includes('/lists')) {
          return {
            success: true,
            data: [
              { id: 'list1', name: 'To Do', idBoard: 'board123' },
              { id: 'list2', name: 'In Progress', idBoard: 'board123' },
              { id: 'list3', name: 'Done', idBoard: 'board123' }
            ]
          };
        }
        if (request.method === 'POST' && request.endpoint.includes('/cards/') && request.endpoint.includes('/actions/comments')) {
          return {
            success: true,
            data: {
              id: 'action123',
              type: 'commentCard',
              data: { text: request.queryParams?.text || 'Test comment' },
              idMemberCreator: 'member123',
              date: new Date().toISOString()
            }
          };
        }
        if (request.method === 'POST' && request.endpoint.includes('/checklists')) {
          return {
            success: true,
            data: {
              id: 'checklist123',
              name: request.queryParams?.name || 'Test Checklist',
              idCard: request.queryParams?.idCard || 'card123'
            }
          };
        }
        return { success: true, data: {} };
      }),
    } as any;

    connector = await ConnectorTestHelper.createConnector(
      TrelloConnector,
      'trello',
      undefined,
      [mockAuthUtils, mockApiUtils]
    );
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when connection is valid', async () => {
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when credentials are invalid', async () => {
      mockApiUtils.executeRequest = jest.fn().mockRejectedValue(new Error('Unauthorized'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Card Action Tests
  // ===========================================
  describe('create_card', () => {
    it('should create card successfully', async () => {
      const result = await connector.executeAction('create_card', {
        name: 'New Task',
        idList: 'list123',
        desc: 'Task description'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'card123');
      expect(result.data).toHaveProperty('name', 'New Task');
    });

    it('should create card with due date', async () => {
      const result = await connector.executeAction('create_card', {
        name: 'Task with due date',
        idList: 'list123',
        due: '2024-12-31T23:59:59.000Z',
        dueComplete: false
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('due');
    });

    it('should create card with members', async () => {
      const result = await connector.executeAction('create_card', {
        name: 'Task with members',
        idList: 'list123',
        idMembers: 'member1,member2'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });

    it('should create card with labels', async () => {
      const result = await connector.executeAction('create_card', {
        name: 'Task with labels',
        idList: 'list123',
        idLabels: 'label1,label2'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });
  });

  // ===========================================
  // Update Card Action Tests
  // ===========================================
  describe('update_card', () => {
    it('should update card successfully', async () => {
      const result = await connector.executeAction('update_card', {
        cardId: 'card123',
        name: 'Updated Task',
        desc: 'Updated description'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'card123');
      expect(result.data).toHaveProperty('name', 'Updated Task');
    });

    it('should archive card', async () => {
      const result = await connector.executeAction('update_card', {
        cardId: 'card123',
        closed: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('closed', true);
    });
  });

  // ===========================================
  // Get Card Action Tests
  // ===========================================
  describe('get_card', () => {
    it('should get card by ID', async () => {
      const result = await connector.executeAction('get_card', {
        cardId: 'card123'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'card123');
      expect(result.data).toHaveProperty('name', 'Test Card');
    });
  });

  // ===========================================
  // Get Cards Action Tests
  // ===========================================
  describe('get_cards', () => {
    it('should get all cards in a list', async () => {
      const result = await connector.executeAction('get_cards', {
        listId: 'list123'
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      if (Array.isArray(result.data)) {
        expect(result.data.length).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================
  // Delete Card Action Tests
  // ===========================================
  describe('delete_card', () => {
    it('should delete card successfully', async () => {
      const result = await connector.executeAction('delete_card', {
        cardId: 'card123'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  // ===========================================
  // Archive Card Action Tests
  // ===========================================
  describe('archive_card', () => {
    it('should archive card successfully', async () => {
      const result = await connector.executeAction('archive_card', {
        cardId: 'card123'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('closed', true);
    });
  });

  // ===========================================
  // Move Card Action Tests
  // ===========================================
  describe('move_card', () => {
    it('should move card to different list', async () => {
      const result = await connector.executeAction('move_card', {
        cardId: 'card123',
        idList: 'list456'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  // ===========================================
  // Create Board Action Tests
  // ===========================================
  describe('create_board', () => {
    it('should create board successfully', async () => {
      const result = await connector.executeAction('create_board', {
        name: 'New Project Board',
        desc: 'Project board description'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'board123');
      expect(result.data).toHaveProperty('name', 'New Project Board');
      expect(result.data).toHaveProperty('url');
    });

    it('should create board with default lists', async () => {
      const result = await connector.executeAction('create_board', {
        name: 'Board with lists',
        defaultLists: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });
  });

  // ===========================================
  // Create List Action Tests
  // ===========================================
  describe('create_list', () => {
    it('should create list successfully', async () => {
      const result = await connector.executeAction('create_list', {
        name: 'New List',
        idBoard: 'board123'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'list456');
      expect(result.data).toHaveProperty('name', 'New List');
    });

    it('should create list with position', async () => {
      const result = await connector.executeAction('create_list', {
        name: 'List at top',
        idBoard: 'board123',
        pos: 'top'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });
  });

  // ===========================================
  // Get Lists Action Tests
  // ===========================================
  describe('get_lists', () => {
    it('should get all lists in a board', async () => {
      const result = await connector.executeAction('get_lists', {
        boardId: 'board123'
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      if (Array.isArray(result.data)) {
        expect(result.data.length).toBe(3);
        expect(result.data[0]).toHaveProperty('name', 'To Do');
      }
    });
  });

  // ===========================================
  // Add Comment Action Tests
  // ===========================================
  describe('add_comment', () => {
    it('should add comment to card', async () => {
      const result = await connector.executeAction('add_comment', {
        cardId: 'card123',
        text: 'This is a test comment'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('text');
    });
  });

  // ===========================================
  // Add Member Action Tests
  // ===========================================
  describe('add_member', () => {
    it('should add member to card', async () => {
      const result = await connector.executeAction('add_member', {
        cardId: 'card123',
        memberId: 'member123'
      });

      console.log('add_member result:', JSON.stringify(result, null, 2));
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  // ===========================================
  // Create Checklist Action Tests
  // ===========================================
  describe('create_checklist', () => {
    it('should create checklist on card', async () => {
      const result = await connector.executeAction('create_checklist', {
        cardId: 'card123',
        name: 'Test Checklist'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'checklist123');
      expect(result.data).toHaveProperty('name', 'Test Checklist');
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
    });
  });
});
