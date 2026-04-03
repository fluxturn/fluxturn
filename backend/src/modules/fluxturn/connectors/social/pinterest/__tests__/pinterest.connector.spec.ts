/**
 * Pinterest Connector Tests
 *
 * Tests for all Pinterest connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { PinterestConnector } from '../pinterest.connector';
import { MOCK_CREDENTIALS } from '@test/helpers/mock-credentials';

describe('PinterestConnector', () => {
  let connector: PinterestConnector;
  const BASE_URL = 'https://api.pinterest.com';

  // Helper to create a new connector for each test
  const createConnector = async () => {
    nock.cleanAll();

    // Mock the /user_account request that happens during initialization
    nock(BASE_URL)
      .get('/v5/user_account')
      .reply(200, {
        username: 'test_user',
        account_type: 'BUSINESS',
      });

    const newConnector = new PinterestConnector();

    await newConnector.initialize({
      id: `test-pinterest-${Date.now()}`,
      name: 'pinterest',
      type: 'pinterest' as any,
      category: 'social' as any,
      credentials: MOCK_CREDENTIALS.pinterest,
    });

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
        .get('/v5/user_account')
        .reply(200, {
          username: 'test_user',
          account_type: 'BUSINESS',
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(401, {
          code: 401,
          message: 'Invalid access token',
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Pin Actions
  // ===========================================
  describe('create_pin', () => {
    it('creates pin successfully', async () => {
      nock(BASE_URL)
        .post('/v5/pins')
        .reply(200, {
          id: 'pin-123',
          title: 'Test Pin',
          created_at: '2024-01-15T10:00:00Z',
        });

      const result = await connector.executeAction('create_pin', {
        boardId: 'board-123',
        title: 'Test Pin',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('pin-123');
    });

    it('handles missing board ID', async () => {
      const result = await connector.executeAction('create_pin', {
        title: 'Test Pin',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Board ID is required');
    });

    it('handles missing image URL', async () => {
      const result = await connector.executeAction('create_pin', {
        boardId: 'board-123',
        title: 'Test Pin',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Image URL is required');
    });
  });

  describe('update_pin', () => {
    it('updates pin successfully', async () => {
      nock(BASE_URL)
        .patch('/v5/pins/pin-123')
        .reply(200, {
          id: 'pin-123',
          title: 'Updated Pin',
        });

      const result = await connector.executeAction('update_pin', {
        pinId: 'pin-123',
        title: 'Updated Pin',
      });

      expect(result.success).toBe(true);
    });

    it('handles missing pin ID', async () => {
      const result = await connector.executeAction('update_pin', {
        title: 'Updated Pin',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Pin ID is required');
    });
  });

  describe('delete_pin', () => {
    it('deletes pin successfully', async () => {
      nock(BASE_URL)
        .delete('/v5/pins/pin-123')
        .reply(204);

      const result = await connector.executeAction('delete_pin', {
        pinId: 'pin-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
    });

    it('handles pin not found', async () => {
      nock(BASE_URL)
        .delete('/v5/pins/nonexistent')
        .reply(404, {
          code: 404,
          message: 'Pin not found',
        });

      const result = await connector.executeAction('delete_pin', {
        pinId: 'nonexistent',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('get_pin', () => {
    it('gets pin successfully', async () => {
      nock(BASE_URL)
        .get('/v5/pins/pin-123')
        .reply(200, {
          id: 'pin-123',
          title: 'Test Pin',
          description: 'Test description',
          board_id: 'board-123',
        });

      const result = await connector.executeAction('get_pin', {
        pinId: 'pin-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('pin-123');
    });

    it('handles pin not found', async () => {
      nock(BASE_URL)
        .get('/v5/pins/nonexistent')
        .reply(404, {
          code: 404,
          message: 'Pin not found',
        });

      const result = await connector.executeAction('get_pin', {
        pinId: 'nonexistent',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Board Actions
  // ===========================================
  describe('create_board', () => {
    it('creates board successfully', async () => {
      nock(BASE_URL)
        .post('/v5/boards')
        .reply(200, {
          id: 'board-123',
          name: 'Test Board',
          created_at: '2024-01-15T10:00:00Z',
        });

      const result = await connector.executeAction('create_board', {
        name: 'Test Board',
        description: 'Test description',
        privacy: 'PUBLIC',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('board-123');
    });

    it('handles missing board name', async () => {
      const result = await connector.executeAction('create_board', {
        description: 'Test description',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Board name is required');
    });
  });

  describe('update_board', () => {
    it('updates board successfully', async () => {
      nock(BASE_URL)
        .patch('/v5/boards/board-123')
        .reply(200, {
          id: 'board-123',
          name: 'Updated Board',
        });

      const result = await connector.executeAction('update_board', {
        boardId: 'board-123',
        name: 'Updated Board',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('delete_board', () => {
    it('deletes board successfully', async () => {
      nock(BASE_URL)
        .delete('/v5/boards/board-123')
        .reply(204);

      const result = await connector.executeAction('delete_board', {
        boardId: 'board-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
    });
  });

  describe('list_boards', () => {
    it('lists boards successfully', async () => {
      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, {
          items: [
            { id: 'board-1', name: 'Board 1' },
            { id: 'board-2', name: 'Board 2' },
          ],
          bookmark: 'next-page-token',
        });

      const result = await connector.executeAction('list_boards', {
        pageSize: 25,
      });

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
      expect(result.data.bookmark).toBe('next-page-token');
    });

    it('handles empty result', async () => {
      nock(BASE_URL)
        .get('/v5/boards')
        .query(true)
        .reply(200, {
          items: [],
        });

      const result = await connector.executeAction('list_boards', {});

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(0);
    });
  });

  describe('get_board', () => {
    it('gets board successfully', async () => {
      nock(BASE_URL)
        .get('/v5/boards/board-123')
        .reply(200, {
          id: 'board-123',
          name: 'Test Board',
          pin_count: 50,
        });

      const result = await connector.executeAction('get_board', {
        boardId: 'board-123',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('board-123');
    });
  });

  describe('list_board_pins', () => {
    it('lists board pins successfully', async () => {
      nock(BASE_URL)
        .get('/v5/boards/board-123/pins')
        .query(true)
        .reply(200, {
          items: [
            { id: 'pin-1', title: 'Pin 1' },
            { id: 'pin-2', title: 'Pin 2' },
          ],
        });

      const result = await connector.executeAction('list_board_pins', {
        boardId: 'board-123',
        pageSize: 25,
      });

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });
  });

  describe('create_board_section', () => {
    it('creates board section successfully', async () => {
      nock(BASE_URL)
        .post('/v5/boards/board-123/sections')
        .reply(200, {
          id: 'section-123',
          name: 'Test Section',
        });

      const result = await connector.executeAction('create_board_section', {
        boardId: 'board-123',
        name: 'Test Section',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('section-123');
    });
  });

  // ===========================================
  // User Data Actions
  // ===========================================
  describe('get_user_profile', () => {
    it('gets user profile successfully', async () => {
      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(200, {
          username: 'test_user',
          account_type: 'BUSINESS',
          profile_image: 'https://example.com/profile.jpg',
          follower_count: 1000,
        });

      const result = await connector.executeAction('get_user_profile', {});

      expect(result.success).toBe(true);
      expect(result.data.username).toBe('test_user');
    });
  });

  describe('search_pins', () => {
    it('searches pins successfully', async () => {
      nock(BASE_URL)
        .get('/v5/search/pins')
        .query(true)
        .reply(200, {
          items: [
            { id: 'pin-1', title: 'Recipe 1' },
            { id: 'pin-2', title: 'Recipe 2' },
          ],
        });

      const result = await connector.executeAction('search_pins', {
        query: 'recipes',
        pageSize: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });

    it('handles missing query', async () => {
      const result = await connector.executeAction('search_pins', {});

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Search query is required');
    });
  });

  // ===========================================
  // Analytics Actions
  // ===========================================
  describe('get_user_analytics', () => {
    it('gets user analytics successfully', async () => {
      nock(BASE_URL)
        .get('/v5/user_account/analytics')
        .query(true)
        .reply(200, {
          all: {
            IMPRESSION: 5000,
            SAVE: 100,
          },
          daily_metrics: [
            { date: '2024-01-15', IMPRESSION: 500 },
          ],
        });

      const result = await connector.executeAction('get_user_analytics', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        metricTypes: ['IMPRESSION', 'SAVE'],
      });

      expect(result.success).toBe(true);
      expect(result.data.all.IMPRESSION).toBe(5000);
    });

    it('handles missing dates', async () => {
      const result = await connector.executeAction('get_user_analytics', {
        metricTypes: ['IMPRESSION'],
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Start date and end date are required');
    });
  });

  describe('get_pin_analytics', () => {
    it('gets pin analytics successfully', async () => {
      nock(BASE_URL)
        .get('/v5/pins/pin-123/analytics')
        .query(true)
        .reply(200, {
          all: {
            IMPRESSION: 1000,
          },
        });

      const result = await connector.executeAction('get_pin_analytics', {
        pinId: 'pin-123',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        metricTypes: ['IMPRESSION'],
      });

      expect(result.success).toBe(true);
      expect(result.data.all.IMPRESSION).toBe(1000);
    });
  });

  describe('get_top_pins', () => {
    it('gets top pins successfully', async () => {
      nock(BASE_URL)
        .get('/v5/user_account/analytics/top_pins')
        .query(true)
        .reply(200, {
          pins: [
            { id: 'pin-1', impressions: 5000 },
            { id: 'pin-2', impressions: 3000 },
          ],
        });

      const result = await connector.executeAction('get_top_pins', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        sortBy: 'IMPRESSION',
        numOfPins: 10,
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Unknown Action
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      // BaseConnector wraps the error with UNKNOWN_ERROR code
      expect(result.error.code).toBe('UNKNOWN_ERROR');
    });
  });

  // ===========================================
  // Error Handling
  // ===========================================
  describe('rate limiting', () => {
    it('should handle 429 Too Many Requests', async () => {
      nock(BASE_URL)
        .get('/v5/user_account')
        .reply(429, {
          code: 429,
          message: 'Rate limit exceeded',
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });
});
