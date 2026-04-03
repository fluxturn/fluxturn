/**
 * Matrix Connector Tests
 *
 * Behavioral tests that verify decentralized messaging operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MatrixConnector } from '../matrix.connector';
import { MATRIX_CONNECTOR } from '../matrix.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock ApiUtils
const mockApiUtils = {
  executeRequest: jest.fn(),
};

// Mock AuthUtils
const mockAuthUtils = {
  createBearerAuthHeader: jest.fn(),
};

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

describe('MatrixConnector', () => {
  let connector: MatrixConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Matrix Config',
    type: 'matrix',
    category: 'communication',
    credentials: {
      accessToken: 'test-access-token',
      homeserverUrl: 'https://matrix.example.com',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatrixConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<MatrixConnector>(MatrixConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Matrix');
      expect(metadata.description).toContain('Decentralized communication');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('communication');
      expect(metadata.type).toBe('matrix');
      expect(metadata.authType).toBe('bearer_token');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 11 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(11);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all Account action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_account_info');
    });

    it('should include all Message action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('send_message');
      expect(actionIds).toContain('get_messages');
    });

    it('should include all Room action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_room');
      expect(actionIds).toContain('join_room');
      expect(actionIds).toContain('leave_room');
      expect(actionIds).toContain('invite_user');
      expect(actionIds).toContain('kick_user');
    });

    it('should include Event and Room Member action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_event');
      expect(actionIds).toContain('get_room_members');
    });

    it('should include Media action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('upload_media');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = MATRIX_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(MATRIX_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(MATRIX_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if access token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { homeserverUrl: 'https://matrix.example.com' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Access token is required',
      );
    });

    it('should throw error if homeserver URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { accessToken: 'test-token' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Homeserver URL is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { user_id: '@user:matrix.org' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/account/whoami'),
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

  describe('Action: get_account_info', () => {
    it('should get account info', async () => {
      const mockAccount = { user_id: '@testuser:matrix.org' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockAccount });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_account_info', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAccount);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/account/whoami'),
        }),
      );
    });
  });

  describe('Action: send_message', () => {
    it('should send text message', async () => {
      const mockEvent = { event_id: '$event123' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockEvent });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('send_message', {
        roomId: '!room123:matrix.org',
        text: 'Hello World',
        messageType: 'm.text',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEvent);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          endpoint: expect.stringContaining('/rooms/!room123:matrix.org/send/m.room.message/'),
        }),
      );
    });

    it('should send HTML formatted message', async () => {
      const mockEvent = { event_id: '$event456' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockEvent });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('send_message', {
        roomId: '!room123:matrix.org',
        text: '<b>Bold text</b>',
        messageType: 'm.text',
        messageFormat: 'org.matrix.custom.html',
        fallbackText: 'Bold text',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEvent);
    });
  });

  describe('Action: get_messages', () => {
    it('should get messages from room', async () => {
      const mockMessages = {
        chunk: [
          { event_id: '$event1', content: { body: 'Message 1' } },
          { event_id: '$event2', content: { body: 'Message 2' } },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockMessages });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_messages', {
        roomId: '!room123:matrix.org',
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(2);
    });
  });

  describe('Action: create_room', () => {
    it('should create room', async () => {
      const mockRoom = { room_id: '!newroom:matrix.org' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockRoom });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_room', {
        roomName: 'Test Room',
        preset: 'public_chat',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRoom);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/createRoom'),
        }),
      );
    });

    it('should create room with alias', async () => {
      const mockRoom = { room_id: '!newroom:matrix.org' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockRoom });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_room', {
        roomName: 'Test Room',
        preset: 'private_chat',
        roomAlias: 'test-room',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRoom);
    });
  });

  describe('Action: join_room', () => {
    it('should join room by ID', async () => {
      const mockJoin = { room_id: '!room123:matrix.org' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockJoin });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('join_room', {
        roomIdOrAlias: '!room123:matrix.org',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/rooms/!room123:matrix.org/join'),
        }),
      );
    });
  });

  describe('Action: leave_room', () => {
    it('should leave room', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('leave_room', {
        roomId: '!room123:matrix.org',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/rooms/!room123:matrix.org/leave'),
        }),
      );
    });
  });

  describe('Action: invite_user', () => {
    it('should invite user to room', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('invite_user', {
        roomId: '!room123:matrix.org',
        userId: '@user:matrix.org',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/rooms/!room123:matrix.org/invite'),
        }),
      );
    });
  });

  describe('Action: kick_user', () => {
    it('should kick user from room', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('kick_user', {
        roomId: '!room123:matrix.org',
        userId: '@baduser:matrix.org',
        reason: 'Violation of rules',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/rooms/!room123:matrix.org/kick'),
        }),
      );
    });
  });

  describe('Action: get_event', () => {
    it('should get event by ID', async () => {
      const mockEvent = {
        event_id: '$event123',
        type: 'm.room.message',
        content: { body: 'Test message' },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockEvent });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_event', {
        roomId: '!room123:matrix.org',
        eventId: '$event123',
      });

      expect(result.success).toBe(true);
      expect(result.data.event).toEqual(mockEvent);
    });
  });

  describe('Action: get_room_members', () => {
    it('should get room members', async () => {
      const mockMembers = {
        chunk: [
          { user_id: '@user1:matrix.org' },
          { user_id: '@user2:matrix.org' },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockMembers });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_room_members', {
        roomId: '!room123:matrix.org',
      });

      expect(result.success).toBe(true);
      expect(result.data.members).toHaveLength(2);
    });

    it('should filter members by membership', async () => {
      const mockMembers = { chunk: [{ user_id: '@user1:matrix.org' }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockMembers });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_room_members', {
        roomId: '!room123:matrix.org',
        membership: 'join',
      });

      expect(result.success).toBe(true);
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

  describe('Authentication Headers', () => {
    it('should use Bearer token', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: { user_id: '@test:matrix.org' } });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_account_info', {});

      const callArgs = mockApiUtils.executeRequest.mock.calls[0][0];
      expect(callArgs.headers?.Authorization).toBe('Bearer test-access-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('API rate limit exceeded'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_account_info', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
