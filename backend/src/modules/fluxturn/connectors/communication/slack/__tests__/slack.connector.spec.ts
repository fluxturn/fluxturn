/**
 * Slack Connector Tests
 *
 * Behavioral tests that verify API calls, endpoints, headers, and request bodies.
 * Uses ApiUtils mocking pattern for reliable testing.
 */

import { SlackConnector } from '../slack.connector';
import { SLACK_CONNECTOR } from '../slack.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('SlackConnector', () => {
  let connector: SlackConnector;
  let mockAuthUtils: jest.Mocked<AuthUtils>;
  let mockApiUtils: jest.Mocked<ApiUtils>;

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Slack Connector',
    type: 'slack',
    category: 'communication',
    credentials: {
      accessToken: 'xoxb-test-token'
    },
    settings: {}
  } as any;

  beforeEach(() => {
    // Create mock instances
    mockAuthUtils = {
      createAuthHeaders: jest.fn().mockReturnValue({
        'Authorization': 'Bearer xoxb-test-token'
      })
    } as unknown as jest.Mocked<AuthUtils>;

    mockApiUtils = {
      executeRequest: jest.fn(),
    } as unknown as jest.Mocked<ApiUtils>;

    connector = new SlackConnector(mockAuthUtils, mockApiUtils);
    jest.clearAllMocks();
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Slack');
      expect(metadata.category).toBe('communication');
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should return all defined actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);

      expect(actionIds).toContain('send_message');
      expect(actionIds).toContain('update_message');
      expect(actionIds).toContain('delete_message');
      expect(actionIds).toContain('get_permalink');
      expect(actionIds).toContain('search_messages');
      expect(actionIds).toContain('create_channel');
      expect(actionIds).toContain('get_channel');
      expect(actionIds).toContain('get_channels');
      expect(actionIds).toContain('channel_history');
      expect(actionIds).toContain('invite_to_channel');
      expect(actionIds).toContain('join_channel');
      expect(actionIds).toContain('leave_channel');
      expect(actionIds).toContain('get_channel_members');
      expect(actionIds).toContain('upload_file');
      expect(actionIds).toContain('get_file');
      expect(actionIds).toContain('get_users');
      expect(actionIds).toContain('get_messages');
    });

    it('should return all defined triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map(t => t.id);

      expect(triggerIds).toContain('message');
      expect(triggerIds).toContain('app_mention');
      expect(triggerIds).toContain('reaction_added');
      expect(triggerIds).toContain('channel_created');
      expect(triggerIds).toContain('team_join');
      expect(triggerIds).toContain('file_shared');
      expect(triggerIds).toContain('file_public');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = SLACK_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = SLACK_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers in definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = SLACK_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = SLACK_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching action counts', () => {
      const metadata = connector.getMetadata();
      const connectorActionCount = metadata.actions.length;
      const definitionActionCount = SLACK_CONNECTOR.supported_actions?.length || 0;

      expect(connectorActionCount).toBe(definitionActionCount);
    });

    it('should have matching trigger counts', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerCount = metadata.triggers.length;
      const definitionTriggerCount = SLACK_CONNECTOR.supported_triggers?.length || 0;

      expect(connectorTriggerCount).toBe(definitionTriggerCount);
    });
  });

  describe('Action: send_message', () => {
    it('should call correct endpoint for sending message', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } }) // auth.test
        .mockResolvedValueOnce({
          success: true,
          data: {
            ok: true,
            channel: 'C01234ABCDE',
            ts: '1234567890.123456',
            message: { text: 'Hello Slack!' }
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('send_message', {
        channelId: 'C01234ABCDE',
        text: 'Hello Slack!'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: 'https://slack.com/api/chat.postMessage'
        }),
        expect.any(Object)
      );
    });

    it('should include thread_ts for threaded replies', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: { ok: true, channel: 'C01234ABCDE', ts: '1234567890.123457' }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('send_message', {
        channelId: 'C01234ABCDE',
        text: 'Thread reply',
        threadTs: '1234567890.123456'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            thread_ts: '1234567890.123456'
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: update_message', () => {
    it('should call correct endpoint for updating message', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: { ok: true, channel: 'C01234ABCDE', ts: '1234567890.123456' }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('update_message', {
        channelId: 'C01234ABCDE',
        ts: '1234567890.123456',
        text: 'Updated message'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: 'https://slack.com/api/chat.update'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: delete_message', () => {
    it('should call correct endpoint for deleting message', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: { ok: true, channel: 'C01234ABCDE', ts: '1234567890.123456' }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('delete_message', {
        channelId: 'C01234ABCDE',
        ts: '1234567890.123456'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: 'https://slack.com/api/chat.delete'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: get_channels', () => {
    it('should call correct endpoint for getting channels', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: {
            ok: true,
            channels: [
              { id: 'C01234ABCDE', name: 'general' },
              { id: 'C56789FGHIJ', name: 'random' }
            ]
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('get_channels', { limit: 100 });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: 'https://slack.com/api/conversations.list'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: create_channel', () => {
    it('should call correct endpoint for creating channel', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: {
            ok: true,
            channel: { id: 'C01234NEW', name: 'new-channel' }
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('create_channel', {
        name: 'new-channel',
        is_private: false
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: 'https://slack.com/api/conversations.create',
          body: expect.objectContaining({
            name: 'new-channel',
            is_private: false
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: get_users', () => {
    it('should call correct endpoint for getting users', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: {
            ok: true,
            members: [
              { id: 'U01234ABCDE', name: 'john' },
              { id: 'U56789FGHIJ', name: 'jane' }
            ]
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('get_users', { limit: 100 });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: 'https://slack.com/api/users.list'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: upload_file', () => {
    it('should call correct endpoint for uploading file', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: {
            ok: true,
            file: { id: 'F01234ABCDE', name: 'test.txt' }
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('upload_file', {
        content: 'File content here',
        filename: 'test.txt',
        channels: 'C01234ABCDE'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: 'https://slack.com/api/files.upload'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: search_messages', () => {
    it('should call correct endpoint for searching messages', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: {
            ok: true,
            messages: { matches: [], total: 0 }
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('search_messages', {
        query: 'from:@john in:#general',
        count: 20
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: 'https://slack.com/api/search.messages'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Slack API errors gracefully', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockResolvedValueOnce({
          success: true,
          data: { ok: false, error: 'channel_not_found' }
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('send_message', {
        channelId: 'invalid-channel',
        text: 'Test'
      });

      expect(result.success).toBe(false);
    });

    it('should handle network errors', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } })
        .mockRejectedValueOnce(new Error('Network error'));

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('send_message', {
        channelId: 'C01234ABCDE',
        text: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown action', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('invalid_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('Connection Test', () => {
    it('should test connection successfully', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } }) // init
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } }); // test

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should fail connection test with invalid token', async () => {
      const freshConnector = new SlackConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { ok: true, user_id: 'U123' } }) // init
        .mockResolvedValueOnce({ success: true, data: { ok: false, error: 'invalid_auth' } }); // test

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(false);
    });
  });
});
