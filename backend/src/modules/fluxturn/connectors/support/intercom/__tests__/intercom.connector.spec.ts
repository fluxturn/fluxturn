/**
 * Intercom Connector Tests
 *
 * Tests for the Intercom support connector actions using mocked HTTP responses.
 */
import { IntercomConnector } from '../intercom.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';
import nock from 'nock';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('IntercomConnector', () => {
  let connector: IntercomConnector;
  let mockAuthUtils: AuthUtils;
  let mockApiUtils: ApiUtils;
  const BASE_URL = 'https://api.intercom.io';

  beforeEach(async () => {
    nock.cleanAll();

    // Create mock utils
    mockAuthUtils = {
      createAuthHeader: jest.fn().mockReturnValue('Bearer mock-token'),
      refreshToken: jest.fn().mockResolvedValue({ accessToken: 'new-token' }),
    } as any;

    mockApiUtils = {
      makeRequest: jest.fn().mockResolvedValue({ data: {} }),
      handleError: jest.fn(),
      executeRequest: jest.fn().mockImplementation(async (request) => {
        return { success: true, data: {} };
      }),
    } as any;

    connector = await ConnectorTestHelper.createConnector(
      IntercomConnector,
      'intercom',
      undefined,
      [mockAuthUtils, mockApiUtils]
    );
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
        .get('/me')
        .reply(200, {
          id: '12345',
          email: 'admin@example.com',
          name: 'Test Admin'
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/me')
        .reply(401, {
          type: 'error.list',
          errors: [{ code: 'unauthorized', message: 'Access Token Invalid' }]
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });

    it('should return failure when network error occurs', async () => {
      nock(BASE_URL)
        .get('/me')
        .replyWithError('Network error');

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Conversation Action Tests
  // ===========================================
  describe('create_conversation', () => {
    it('should create conversation successfully with user_id', async () => {
      nock(BASE_URL)
        .post('/conversations', (body) => {
          return body.body && body.from && body.from.user_id;
        })
        .reply(200, {
          id: 'conv_123',
          subject: 'Test Subject',
          body: 'Test message',
          state: 'open',
          created_at: 1234567890
        });

      const result = await connector.executeAction('create_conversation', {
        user_id: 'user_123',
        body: 'Test message',
        subject: 'Test Subject',
        message_type: 'email'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'conv_123');
    });

    it('should create conversation successfully with email', async () => {
      nock(BASE_URL)
        .post('/conversations', (body) => {
          return body.body && body.from && body.from.email;
        })
        .reply(200, {
          id: 'conv_124',
          body: 'Test message',
          state: 'open',
          created_at: 1234567890
        });

      const result = await connector.executeAction('create_conversation', {
        email: 'user@example.com',
        body: 'Test message',
        message_type: 'inapp'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'conv_124');
    });

    it('should handle error when neither user_id nor email provided', async () => {
      const result = await connector.executeAction('create_conversation', {
        body: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle API error response', async () => {
      nock(BASE_URL)
        .post('/conversations')
        .reply(400, {
          type: 'error.list',
          errors: [{ code: 'invalid', message: 'Invalid body' }]
        });

      const result = await connector.executeAction('create_conversation', {
        user_id: 'user_123',
        body: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================
  // Reply to Conversation Action Tests
  // ===========================================
  describe('reply_to_conversation', () => {
    it('should reply to conversation successfully', async () => {
      const conversationId = 'conv_123';

      nock(BASE_URL)
        .post(`/conversations/${conversationId}/reply`, (body) => {
          return body.body && body.message_type;
        })
        .reply(200, {
          id: 'reply_123',
          body: 'Thank you for contacting us',
          author: { type: 'admin', id: 'admin_123' },
          created_at: 1234567890
        });

      const result = await connector.executeAction('reply_to_conversation', {
        conversation_id: conversationId,
        body: 'Thank you for contacting us',
        message_type: 'comment'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'reply_123');
    });

    it('should reply with admin_id', async () => {
      const conversationId = 'conv_123';

      nock(BASE_URL)
        .post(`/conversations/${conversationId}/reply`, (body) => {
          return body.admin_id === 'admin_456';
        })
        .reply(200, {
          id: 'reply_124',
          body: 'Internal note',
          author: { type: 'admin', id: 'admin_456' },
          created_at: 1234567890
        });

      const result = await connector.executeAction('reply_to_conversation', {
        conversation_id: conversationId,
        body: 'Internal note',
        message_type: 'note',
        admin_id: 'admin_456'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'reply_124');
    });

    it('should handle conversation not found error', async () => {
      nock(BASE_URL)
        .post('/conversations/invalid_id/reply')
        .reply(404, {
          type: 'error.list',
          errors: [{ code: 'not_found', message: 'Conversation not found' }]
        });

      const result = await connector.executeAction('reply_to_conversation', {
        conversation_id: 'invalid_id',
        body: 'Reply message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================
  // Get Conversations Action Tests
  // ===========================================
  describe('get_conversations', () => {
    it('should get conversations with default parameters', async () => {
      nock(BASE_URL)
        .get('/conversations')
        .reply(200, {
          conversations: [
            { id: 'conv_1', subject: 'Conv 1', state: 'open' },
            { id: 'conv_2', subject: 'Conv 2', state: 'closed' }
          ],
          pages: {
            type: 'pages',
            page: 1,
            per_page: 20,
            total_pages: 1
          },
          total_count: 2
        });

      const result = await connector.executeAction('get_conversations', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('conversations');
      expect(result.data.conversations).toHaveLength(2);
    });

    it('should get conversations with filters', async () => {
      nock(BASE_URL)
        .get('/conversations')
        .query({
          state: 'open',
          sort: 'updated_at',
          order: 'desc',
          per_page: 10
        })
        .reply(200, {
          conversations: [
            { id: 'conv_3', subject: 'Open Conv', state: 'open' }
          ],
          pages: {
            type: 'pages',
            page: 1,
            per_page: 10,
            total_pages: 1
          },
          total_count: 1
        });

      const result = await connector.executeAction('get_conversations', {
        filters: {
          state: 'open',
          sort: 'updated_at',
          order: 'desc',
          per_page: 10
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.conversations).toHaveLength(1);
      expect(result.data.conversations[0].state).toBe('open');
    });

    it('should handle pagination', async () => {
      nock(BASE_URL)
        .get('/conversations')
        .query({
          per_page: 5,
          starting_after: 'cursor_123'
        })
        .reply(200, {
          conversations: [
            { id: 'conv_6', subject: 'Page 2 Conv 1' }
          ],
          pages: {
            type: 'pages',
            page: 2,
            per_page: 5,
            total_pages: 3
          },
          total_count: 15
        });

      const result = await connector.executeAction('get_conversations', {
        limit: 5,
        cursor: 'cursor_123'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('pages');
    });
  });

  // ===========================================
  // Create User Action Tests
  // ===========================================
  describe('create_user', () => {
    it('should create user with user_id', async () => {
      nock(BASE_URL)
        .post('/users', (body) => {
          return body.user_id === 'user_123';
        })
        .reply(200, {
          id: '5ffc9c1234567890',
          user_id: 'user_123',
          email: 'user@example.com',
          name: 'John Doe',
          created_at: 1234567890,
          updated_at: 1234567890
        });

      const result = await connector.executeAction('create_user', {
        user_id: 'user_123',
        email: 'user@example.com',
        name: 'John Doe'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user_id', 'user_123');
    });

    it('should create user with email only', async () => {
      nock(BASE_URL)
        .post('/users', (body) => {
          return body.email === 'newuser@example.com';
        })
        .reply(200, {
          id: '5ffc9c9876543210',
          email: 'newuser@example.com',
          created_at: 1234567890,
          updated_at: 1234567890
        });

      const result = await connector.executeAction('create_user', {
        email: 'newuser@example.com'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('email', 'newuser@example.com');
    });

    it('should create user with custom attributes', async () => {
      nock(BASE_URL)
        .post('/users', (body) => {
          return body.custom_attributes && body.custom_attributes.subscription_plan;
        })
        .reply(200, {
          id: '5ffc9c1111111111',
          user_id: 'user_456',
          email: 'premium@example.com',
          custom_attributes: {
            subscription_plan: 'premium',
            account_created: '2024-01-01'
          },
          created_at: 1234567890,
          updated_at: 1234567890
        });

      const result = await connector.executeAction('create_user', {
        user_id: 'user_456',
        email: 'premium@example.com',
        custom_attributes: {
          subscription_plan: 'premium',
          account_created: '2024-01-01'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.custom_attributes).toHaveProperty('subscription_plan', 'premium');
    });

    it('should handle error when neither user_id nor email provided', async () => {
      const result = await connector.executeAction('create_user', {
        name: 'No Identifier User'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================
  // Search Conversations Action Tests
  // ===========================================
  describe('search_conversations', () => {
    it('should search conversations by query', async () => {
      nock(BASE_URL)
        .post('/conversations/search', (body) => {
          return body.query && body.query.value;
        })
        .reply(200, {
          conversations: [
            {
              id: 'conv_search_1',
              conversation_message: { body: 'Contains search term' }
            }
          ],
          total_count: 1,
          pages: { type: 'pages', page: 1, per_page: 20, total_pages: 1 }
        });

      const result = await connector.executeAction('search_conversations', {
        query: 'search term'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('conversations');
      expect(result.data.total_count).toBe(1);
    });
  });

  // ===========================================
  // Update Ticket Action Tests
  // ===========================================
  describe('update_ticket', () => {
    it('should update conversation state', async () => {
      const conversationId = 'conv_123';

      nock(BASE_URL)
        .put(`/conversations/${conversationId}`, (body) => {
          return body.state === 'closed';
        })
        .reply(200, {
          id: conversationId,
          state: 'closed',
          updated_at: 1234567890
        });

      const result = await connector.executeAction('update_ticket', {
        conversation_id: conversationId,
        state: 'closed'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('state', 'closed');
    });

    it('should update conversation assignee', async () => {
      const conversationId = 'conv_124';

      nock(BASE_URL)
        .put(`/conversations/${conversationId}`, (body) => {
          return body.assignee && body.assignee.id === 'admin_789';
        })
        .reply(200, {
          id: conversationId,
          assignee: { id: 'admin_789' },
          updated_at: 1234567890
        });

      const result = await connector.executeAction('update_ticket', {
        conversation_id: conversationId,
        assignee_id: 'admin_789'
      });

      expect(result.success).toBe(true);
      expect(result.data.assignee).toHaveProperty('id', 'admin_789');
    });
  });

  // ===========================================
  // Unknown Action Test
  // ===========================================
  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('code', 'UNKNOWN_ACTION');
    });
  });
});
