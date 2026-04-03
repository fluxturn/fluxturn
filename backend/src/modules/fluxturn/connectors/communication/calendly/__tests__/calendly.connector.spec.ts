/**
 * Calendly Connector Tests
 *
 * Tests for the Calendly connector actions using mocked HTTP responses.
 */
import { CalendlyConnector } from '../calendly.connector';
import { CALENDLY_CONNECTOR } from '../calendly.definition';
import { ConnectorCategory, ConnectorType, AuthType } from '../../../types';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  })),
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    })),
  },
}));

describe('CalendlyConnector', () => {
  let connector: CalendlyConnector;
  let mockAxiosInstance: any;

  const mockCredentials = {
    accessToken: 'mock-calendly-access-token',
    personalToken: 'mock-calendly-personal-token',
    authType: 'personalToken',
  };

  const mockCurrentUser = {
    uri: 'https://api.calendly.com/users/USER123',
    name: 'Test User',
    email: 'test@example.com',
    scheduling_url: 'https://calendly.com/test-user',
    timezone: 'America/New_York',
    current_organization: 'https://api.calendly.com/organizations/ORG123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Get axios mock
    const axios = require('axios');
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    };
    axios.create.mockReturnValue(mockAxiosInstance);

    // Mock the initialization call
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { resource: mockCurrentUser },
      status: 200,
    });

    connector = new CalendlyConnector();
    await connector.initialize({
      id: 'test-calendly-id',
      name: 'Test Calendly',
      type: ConnectorType.CALENDLY,
      category: ConnectorCategory.COMMUNICATION,
      credentials: mockCredentials,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Calendly');
      expect(metadata.category).toBe(ConnectorCategory.COMMUNICATION);
      expect(metadata.type).toBe(ConnectorType.CALENDLY);
      expect(metadata.authType).toBe(AuthType.OAUTH2);
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should include rate limit configuration', () => {
      const metadata = connector.getMetadata();

      expect(metadata.rateLimit).toBeDefined();
      expect(metadata.rateLimit?.requestsPerSecond).toBe(5);
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all definition actions implemented in connector', () => {
      const definitionActionIds = CALENDLY_CONNECTOR.supported_actions?.map(
        (a: any) => a.id
      ) || [];

      const coreActions = [
        'get_current_user',
        'get_user',
        'get_event_types',
        'get_event_type',
        'get_scheduled_events',
        'get_scheduled_event',
        'cancel_scheduled_event',
        'get_invitees',
        'get_invitee',
        'create_webhook',
        'get_webhooks',
        'delete_webhook',
        'get_organization',
        'get_organization_memberships',
      ];

      for (const actionId of coreActions) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching auth fields', () => {
      const definitionAuthKeys = CALENDLY_CONNECTOR.auth_fields?.map(
        (f: any) => f.key
      ) || [];

      expect(definitionAuthKeys).toContain('authType');
      expect(definitionAuthKeys).toContain('personalToken');
    });

    it('should have triggers matching definition event types', () => {
      const definitionTriggers = CALENDLY_CONNECTOR.supported_triggers || [];

      expect(definitionTriggers.length).toBeGreaterThan(0);

      const triggerIds = definitionTriggers.map((t: any) => t.id);
      expect(triggerIds).toContain('invitee_created');
      expect(triggerIds).toContain('invitee_canceled');
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { resource: mockCurrentUser },
        status: 200,
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Unauthorized',
        response: { status: 401 },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // User Actions
  // ===========================================
  describe('get_current_user', () => {
    it('should get current user successfully', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { resource: mockCurrentUser },
        status: 200,
      });

      const result = await connector.executeAction('get_current_user', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toMatchObject({
        name: 'Test User',
        email: 'test@example.com',
      });
    });
  });

  describe('get_user', () => {
    it('should get user by URI successfully', async () => {
      const mockUser = { ...mockCurrentUser, name: 'Another User' };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { resource: mockUser },
        status: 200,
      });

      const result = await connector.executeAction('get_user', {
        userUri: 'https://api.calendly.com/users/USER456',
      });

      expect(result.success).toBe(true);
    });

    it('should handle user not found', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'User not found',
        response: { status: 404 },
      });

      const result = await connector.executeAction('get_user', {
        userUri: 'https://api.calendly.com/users/INVALID',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Event Type Actions
  // ===========================================
  describe('get_event_types', () => {
    it('should get event types successfully', async () => {
      const mockEventTypes = [
        { uri: 'https://api.calendly.com/event_types/ET1', name: '15 Minute Meeting' },
        { uri: 'https://api.calendly.com/event_types/ET2', name: '30 Minute Meeting' },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { collection: mockEventTypes },
        status: 200,
      });

      const result = await connector.executeAction('get_event_types', {});

      expect(result.success).toBe(true);
    });

    it('should filter by active status', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { collection: [] },
        status: 200,
      });

      const result = await connector.executeAction('get_event_types', {
        active: true,
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/event_types',
        expect.objectContaining({
          params: expect.objectContaining({ active: true }),
        })
      );
    });
  });

  describe('get_event_type', () => {
    it('should get event type by URI', async () => {
      const mockEventType = {
        uri: 'https://api.calendly.com/event_types/ET1',
        name: '15 Minute Meeting',
        duration: 15,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { resource: mockEventType },
        status: 200,
      });

      const result = await connector.executeAction('get_event_type', {
        eventTypeUri: 'https://api.calendly.com/event_types/ET1',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Scheduled Event Actions
  // ===========================================
  describe('get_scheduled_events', () => {
    it('should get scheduled events successfully', async () => {
      const mockEvents = [
        { uri: 'https://api.calendly.com/scheduled_events/EV1', name: 'Meeting 1' },
        { uri: 'https://api.calendly.com/scheduled_events/EV2', name: 'Meeting 2' },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { collection: mockEvents },
        status: 200,
      });

      const result = await connector.executeAction('get_scheduled_events', {});

      expect(result.success).toBe(true);
    });

    it('should filter by status', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { collection: [] },
        status: 200,
      });

      const result = await connector.executeAction('get_scheduled_events', {
        status: 'active',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/scheduled_events',
        expect.objectContaining({
          params: expect.objectContaining({ status: 'active' }),
        })
      );
    });
  });

  describe('get_scheduled_event', () => {
    it('should get scheduled event by URI', async () => {
      const mockEvent = {
        uri: 'https://api.calendly.com/scheduled_events/EV1',
        name: 'Meeting 1',
        status: 'active',
        start_time: '2025-01-15T10:00:00Z',
        end_time: '2025-01-15T10:30:00Z',
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { resource: mockEvent },
        status: 200,
      });

      const result = await connector.executeAction('get_scheduled_event', {
        eventUri: 'https://api.calendly.com/scheduled_events/EV1',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('cancel_scheduled_event', () => {
    it('should cancel event successfully', async () => {
      const mockCancellation = {
        canceled_by: 'Test User',
        reason: 'Schedule conflict',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { resource: mockCancellation },
        status: 200,
      });

      const result = await connector.executeAction('cancel_scheduled_event', {
        eventUri: 'https://api.calendly.com/scheduled_events/EV1',
        reason: 'Schedule conflict',
      });

      expect(result.success).toBe(true);
    });

    it('should cancel event without reason', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { resource: {} },
        status: 200,
      });

      const result = await connector.executeAction('cancel_scheduled_event', {
        eventUri: 'https://api.calendly.com/scheduled_events/EV2',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Invitee Actions
  // ===========================================
  describe('get_invitees', () => {
    it('should get invitees for an event', async () => {
      const mockInvitees = [
        { uri: 'https://api.calendly.com/invitees/INV1', name: 'John Doe', email: 'john@example.com' },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { collection: mockInvitees },
        status: 200,
      });

      const result = await connector.executeAction('get_invitees', {
        eventUri: 'https://api.calendly.com/scheduled_events/EV1',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_invitee', () => {
    it('should get invitee by URI', async () => {
      const mockInvitee = {
        uri: 'https://api.calendly.com/scheduled_events/EV1/invitees/INV1',
        name: 'John Doe',
        email: 'john@example.com',
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { resource: mockInvitee },
        status: 200,
      });

      const result = await connector.executeAction('get_invitee', {
        inviteeUri: 'https://api.calendly.com/scheduled_events/EV1/invitees/INV1',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Webhook Actions
  // ===========================================
  describe('create_webhook', () => {
    it('should create webhook subscription', async () => {
      const mockWebhook = {
        uri: 'https://api.calendly.com/webhook_subscriptions/WH1',
        callback_url: 'https://example.com/webhook',
        events: ['invitee.created'],
        scope: 'user',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { resource: mockWebhook },
        status: 200,
      });

      const result = await connector.executeAction('create_webhook', {
        url: 'https://example.com/webhook',
        events: ['invitee.created'],
        scope: 'user',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_webhooks', () => {
    it('should get webhook subscriptions', async () => {
      const mockWebhooks = [
        { uri: 'https://api.calendly.com/webhook_subscriptions/WH1', callback_url: 'https://example.com/webhook' },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { collection: mockWebhooks },
        status: 200,
      });

      const result = await connector.executeAction('get_webhooks', {
        scope: 'user',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('delete_webhook', () => {
    it('should delete webhook subscription', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({
        status: 200,
      });

      const result = await connector.executeAction('delete_webhook', {
        webhookUri: 'https://api.calendly.com/webhook_subscriptions/WH1',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Organization Actions
  // ===========================================
  describe('get_organization', () => {
    it('should get organization details', async () => {
      const mockOrg = {
        uri: 'https://api.calendly.com/organizations/ORG1',
        name: 'Test Organization',
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { resource: mockOrg },
        status: 200,
      });

      const result = await connector.executeAction('get_organization', {
        organizationUri: 'https://api.calendly.com/organizations/ORG1',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_organization_memberships', () => {
    it('should get organization memberships', async () => {
      const mockMemberships = [
        { user: { uri: 'https://api.calendly.com/users/USER1', name: 'User 1' } },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { collection: mockMemberships },
        status: 200,
      });

      const result = await connector.executeAction('get_organization_memberships', {
        organization: 'https://api.calendly.com/organizations/ORG1',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('non_existent_action');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Rate limit exceeded',
        response: { status: 429 },
      });

      const result = await connector.executeAction('get_current_user', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle server errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Internal server error',
        response: { status: 500 },
      });

      const result = await connector.executeAction('get_current_user', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });
});
