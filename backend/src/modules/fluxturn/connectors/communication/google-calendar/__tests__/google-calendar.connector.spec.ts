/**
 * Google Calendar Connector Tests
 *
 * Behavioral tests that verify API calls, endpoints, headers, and request bodies.
 * Uses ApiUtils mocking pattern for reliable testing.
 */

import { GoogleCalendarConnector } from '../google-calendar.connector';
import { GOOGLE_CALENDAR_CONNECTOR } from '../google-calendar.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('GoogleCalendarConnector', () => {
  let connector: GoogleCalendarConnector;
  let mockAuthUtils: jest.Mocked<AuthUtils>;
  let mockApiUtils: jest.Mocked<ApiUtils>;

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Google Calendar Connector',
    type: 'google-calendar',
    category: 'communication',
    credentials: {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      authType: 'oauth2'
    },
    settings: {}
  } as any;

  beforeEach(() => {
    // Create mock instances
    mockAuthUtils = {
      createAuthHeaders: jest.fn().mockReturnValue({
        'Authorization': 'Bearer test-access-token'
      })
    } as unknown as jest.Mocked<AuthUtils>;
    mockApiUtils = {
      executeRequest: jest.fn(),
    } as unknown as jest.Mocked<ApiUtils>;

    connector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);
    jest.clearAllMocks();
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Google Calendar');
      expect(metadata.category).toBe('communication');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return all defined actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);

      expect(actionIds).toContain('check_availability');
      expect(actionIds).toContain('create_event');
      expect(actionIds).toContain('delete_event');
      expect(actionIds).toContain('get_event');
      expect(actionIds).toContain('get_many_events');
      expect(actionIds).toContain('update_event');
    });

    it('should return all defined triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map(t => t.id);

      expect(triggerIds).toContain('event_created');
      expect(triggerIds).toContain('event_updated');
      expect(triggerIds).toContain('event_cancelled');
      expect(triggerIds).toContain('event_started');
      expect(triggerIds).toContain('event_ended');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = GOOGLE_CALENDAR_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = GOOGLE_CALENDAR_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers in definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = GOOGLE_CALENDAR_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = GOOGLE_CALENDAR_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });
  });

  describe('Action: create_event', () => {
    it('should call correct endpoint for creating event', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init - calendarList
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'event-123',
            htmlLink: 'https://calendar.google.com/event/123',
            summary: 'Test Event',
            created: '2024-01-01T10:00:00Z'
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('create_event', {
        calendarId: 'primary',
        summary: 'Test Event',
        startDateTime: '2024-01-15T10:00:00Z',
        endDateTime: '2024-01-15T11:00:00Z',
        timeZone: 'UTC'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/calendars/primary/events')
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: get_event', () => {
    it('should call correct endpoint for getting event', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'event-123',
            summary: 'Test Event',
            start: { dateTime: '2024-01-15T10:00:00Z' },
            end: { dateTime: '2024-01-15T11:00:00Z' }
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('get_event', {
        calendarId: 'primary',
        eventId: 'event-123'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/calendars/primary/events/event-123')
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: get_many_events', () => {
    it('should call correct endpoint for getting multiple events', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockResolvedValueOnce({
          success: true,
          data: {
            items: [
              { id: 'event-1', summary: 'Event 1' },
              { id: 'event-2', summary: 'Event 2' }
            ],
            nextPageToken: null
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('get_many_events', {
        calendarId: 'primary',
        maxResults: 10
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/calendars/primary/events')
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: update_event', () => {
    it('should call correct endpoint for updating event', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'event-123',
            summary: 'Updated Event',
            updated: '2024-01-15T12:00:00Z'
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('update_event', {
        calendarId: 'primary',
        eventId: 'event-123',
        summary: 'Updated Event'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          endpoint: expect.stringContaining('/calendars/primary/events/event-123')
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: delete_event', () => {
    it('should call correct endpoint for deleting event', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockResolvedValueOnce({ success: true, data: {} });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('delete_event', {
        calendarId: 'primary',
        eventId: 'event-123'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/calendars/primary/events/event-123')
        }),
        expect.any(Object)
      );
    });
  });

  describe('Action: check_availability', () => {
    it('should call correct endpoint for checking availability', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockResolvedValueOnce({
          success: true,
          data: {
            calendars: {
              primary: {
                busy: [
                  { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' }
                ]
              }
            }
          }
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('check_availability', {
        calendarId: 'primary',
        timeMin: '2024-01-15T00:00:00Z',
        timeMax: '2024-01-15T23:59:59Z'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/freeBusy')
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockRejectedValueOnce(new Error('API error'));

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('get_event', {
        calendarId: 'primary',
        eventId: 'invalid-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown action', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('invalid_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('Connection Test', () => {
    it('should test connection successfully', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }); // test

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should fail connection test with invalid credentials', async () => {
      const freshConnector = new GoogleCalendarConnector(mockAuthUtils, mockApiUtils);

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'primary' }] } }) // init
        .mockRejectedValueOnce(new Error('Invalid credentials'));

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(false);
    });
  });
});
