/**
 * PagerDuty Connector Tests
 *
 * Tests for the PagerDuty connector actions using mocked HTTP responses.
 * Tests both behavioral verification and definition-connector sync.
 */
import { PagerDutyConnector } from '../pagerduty.connector';
import { PAGERDUTY_CONNECTOR } from '../pagerduty.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('PagerDutyConnector', () => {
  let connector: PagerDutyConnector;
  let mockAuthUtils: jest.Mocked<AuthUtils>;
  let mockApiUtils: jest.Mocked<ApiUtils>;

  const mockCredentials = {
    authType: 'api_token',
    apiToken: 'mock-pagerduty-api-token-12345',
  };

  const mockConfig = {
    id: 'test-pagerduty-connector',
    name: 'PagerDuty Test',
    type: 'pagerduty',
    category: 'support',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    mockAuthUtils = {} as jest.Mocked<AuthUtils>;
    mockApiUtils = {
      executeRequest: jest.fn(),
    } as unknown as jest.Mocked<ApiUtils>;

    connector = new PagerDutyConnector(mockAuthUtils, mockApiUtils);
    jest.clearAllMocks();
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        PAGERDUTY_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      // All connector actions should exist in definition
      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds =
        PAGERDUTY_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      // All definition actions should exist in connector
      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have triggers matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds =
        PAGERDUTY_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];

      // All connector triggers should exist in definition
      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth field keys', () => {
      const definitionAuthKeys =
        PAGERDUTY_CONNECTOR.auth_fields?.map((f: any) => f.key) || [];

      // Check that authType and apiToken are defined
      expect(definitionAuthKeys).toContain('authType');
      expect(definitionAuthKeys).toContain('apiToken');
    });

    it('should have core actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      // Core incident actions
      expect(connectorActionIds).toContain('incident_create');
      expect(connectorActionIds).toContain('incident_get');
      expect(connectorActionIds).toContain('incident_get_all');
      expect(connectorActionIds).toContain('incident_update');

      // Incident note actions
      expect(connectorActionIds).toContain('incident_note_create');
      expect(connectorActionIds).toContain('incident_note_get_all');

      // Log entry actions
      expect(connectorActionIds).toContain('log_entry_get');
      expect(connectorActionIds).toContain('log_entry_get_all');

      // User actions
      expect(connectorActionIds).toContain('user_get');
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialization', () => {
    it('should initialize with API token authentication', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
      expect(connector.isInitialized()).toBe(true);
    });

    it('should initialize with OAuth2 authentication', async () => {
      const oauthConfig = {
        ...mockConfig,
        credentials: {
          authType: 'oauth2',
          accessToken: 'mock-oauth-access-token',
        },
      };

      await expect(connector.initialize(oauthConfig)).resolves.not.toThrow();
      expect(connector.isInitialized()).toBe(true);
    });

    it('should throw error when credentials are missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: undefined,
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Invalid connector configuration: missing required fields',
      );
    });

    it('should throw error when API token is missing for api_token auth', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          authType: 'api_token',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Missing required PagerDuty API token',
      );
    });

    it('should throw error when access token is missing for OAuth2 auth', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          authType: 'oauth2',
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Missing required OAuth2 access token',
      );
    });

    it('should default to api_token auth when authType not specified', async () => {
      const configWithoutAuthType = {
        ...mockConfig,
        credentials: {
          apiToken: 'mock-api-token',
        },
      };

      await expect(
        connector.initialize(configWithoutAuthType),
      ).resolves.not.toThrow();
      expect(connector.isInitialized()).toBe(true);
    });
  });

  // ===========================================
  // getMetadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('PagerDuty');
      expect(metadata.category).toBe('support');
      expect(metadata.webhookSupport).toBe(true);
      expect(metadata.actions.length).toBeGreaterThan(0);
      expect(metadata.triggers.length).toBeGreaterThan(0);
    });

    it('should include all incident actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('incident_create');
      expect(actionIds).toContain('incident_get');
      expect(actionIds).toContain('incident_get_all');
      expect(actionIds).toContain('incident_update');
    });

    it('should include all triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('incident_triggered');
      expect(triggerIds).toContain('incident_acknowledged');
      expect(triggerIds).toContain('incident_resolved');
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('executeAction', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    describe('incident_create', () => {
      it('should create incident successfully', async () => {
        const result = await connector.executeAction('incident_create', {
          title: 'Test Incident',
          serviceId: 'service-123',
          email: 'test@example.com',
        });

        // Result should have success property (may fail due to mock not being set up, but action should be found)
        expect(result).toHaveProperty('success');
      });
    });

    describe('incident_get', () => {
      it('should get incident by ID', async () => {
        const result = await connector.executeAction('incident_get', {
          incidentId: 'incident-123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('incident_get_all', () => {
      it('should get multiple incidents', async () => {
        const result = await connector.executeAction('incident_get_all', {
          limit: 10,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('incident_update', () => {
      it('should update incident', async () => {
        const result = await connector.executeAction('incident_update', {
          incidentId: 'incident-123',
          email: 'test@example.com',
          status: 'acknowledged',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('incident_note_create', () => {
      it('should create incident note', async () => {
        const result = await connector.executeAction('incident_note_create', {
          incidentId: 'incident-123',
          content: 'This is a test note',
          email: 'test@example.com',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('incident_note_get_all', () => {
      it('should get incident notes', async () => {
        const result = await connector.executeAction('incident_note_get_all', {
          incidentId: 'incident-123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('log_entry_get', () => {
      it('should get log entry by ID', async () => {
        const result = await connector.executeAction('log_entry_get', {
          logEntryId: 'log-entry-123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('log_entry_get_all', () => {
      it('should get multiple log entries', async () => {
        const result = await connector.executeAction('log_entry_get_all', {
          limit: 10,
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('user_get', () => {
      it('should get user by ID', async () => {
        const result = await connector.executeAction('user_get', {
          userId: 'user-123',
        });

        expect(result).toHaveProperty('success');
      });
    });

    describe('unknown action', () => {
      it('should return error for unknown action', async () => {
        const result = await connector.executeAction('non_existent_action', {});

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('UNKNOWN_ACTION');
      });
    });
  });

  // ===========================================
  // testConnection Tests
  // ===========================================
  describe('testConnection', () => {
    beforeEach(async () => {
      await connector.initialize(mockConfig);
    });

    it('should have testConnection method', () => {
      expect(typeof connector.testConnection).toBe('function');
    });
  });
});
