/**
 * PostHog Connector Tests
 *
 * Behavioral tests that verify analytics operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { PostHogConnector } from '../posthog.connector';
import { POSTHOG_CONNECTOR } from '../posthog.definition';
import { of, throwError } from 'rxjs';

// Mock HttpService
const mockHttpService = {
  request: jest.fn(),
};

describe('PostHogConnector', () => {
  let connector: PostHogConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test PostHog Config',
    type: 'posthog',
    category: 'analytics',
    credentials: {
      url: 'https://app.posthog.com',
      apiKey: 'phc_test-api-key',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostHogConnector,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    connector = module.get<PostHogConnector>(PostHogConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('PostHog');
      expect(metadata.description).toContain('analytics');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('analytics');
      expect(metadata.type).toBe('posthog');
      expect(metadata.authType).toBe('api_key');
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should return 5 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(5);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all expected action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_event');
      expect(actionIds).toContain('create_alias');
      expect(actionIds).toContain('create_identity');
      expect(actionIds).toContain('track_page');
      expect(actionIds).toContain('track_screen');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = POSTHOG_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(POSTHOG_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(POSTHOG_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if API key is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { url: 'https://app.posthog.com' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'API key is required',
      );
    });

    it('should throw error if URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { apiKey: 'test-key' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Instance URL is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/batch'),
        }),
      );
    });

    it('should return failure for invalid connection', async () => {
      mockHttpService.request.mockReturnValueOnce(
        throwError(() => new Error('Unauthorized')),
      );

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Action: create_event', () => {
    it('should create event', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_event', {
        eventName: 'button_clicked',
        distinctId: 'user123',
        properties: { button_name: 'signup' },
      });

      expect(result.success).toBe(true);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/capture'),
          data: expect.objectContaining({
            api_key: 'phc_test-api-key',
            batch: expect.arrayContaining([
              expect.objectContaining({
                event: 'button_clicked',
              }),
            ]),
          }),
        }),
      );
    });

    it('should create event with timestamp', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_event', {
        eventName: 'purchase',
        distinctId: 'user123',
        timestamp: '2024-01-15T10:30:00Z',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: create_alias', () => {
    it('should create alias', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_alias', {
        distinctId: 'anonymous123',
        alias: 'user@example.com',
      });

      expect(result.success).toBe(true);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/batch'),
        }),
      );
    });
  });

  describe('Action: create_identity', () => {
    it('should create identity', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_identity', {
        distinctId: 'user123',
        properties: {
          email: 'user@example.com',
          name: 'Test User',
          plan: 'premium',
        },
      });

      expect(result.success).toBe(true);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event: '$identify',
            distinct_id: 'user123',
          }),
        }),
      );
    });
  });

  describe('Action: track_page', () => {
    it('should track page view', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('track_page', {
        name: 'Home Page',
        distinctId: 'user123',
        category: 'Marketing',
        properties: { url: '/home' },
      });

      expect(result.success).toBe(true);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'page',
            event: '$page',
            name: 'Home Page',
          }),
        }),
      );
    });
  });

  describe('Action: track_screen', () => {
    it('should track screen view', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('track_screen', {
        name: 'Dashboard Screen',
        distinctId: 'user123',
        category: 'App',
      });

      expect(result.success).toBe(true);
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'screen',
            event: '$screen',
            name: 'Dashboard Screen',
          }),
        }),
      );
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

  describe('API Key in Request', () => {
    it('should include API key in request body', async () => {
      mockHttpService.request.mockReturnValueOnce(
        of({ data: { status: 1 } }),
      );

      await connector.initialize(mockConfig);
      await connector.executeAction('create_event', {
        eventName: 'test',
        distinctId: 'user123',
      });

      const callArgs = mockHttpService.request.mock.calls[0][0];
      expect(callArgs.data.api_key).toBe('phc_test-api-key');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockHttpService.request.mockReturnValueOnce(
        throwError(() => new Error('API rate limit exceeded')),
      );

      await connector.initialize(mockConfig);

      // Should not throw - connector handles errors internally
      await expect(
        connector.executeAction('create_event', {
          eventName: 'test',
          distinctId: 'user123',
        }),
      ).resolves.toBeDefined();
    });
  });
});
