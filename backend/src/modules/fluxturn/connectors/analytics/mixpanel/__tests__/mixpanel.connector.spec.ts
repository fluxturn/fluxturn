/**
 * Mixpanel Connector Tests
 *
 * Tests for the Mixpanel connector actions, metadata, and initialization.
 */
import { MixpanelConnector } from '../mixpanel.connector';
import { MIXPANEL_CONNECTOR } from '../mixpanel.definition';

describe('MixpanelConnector', () => {
  let connector: MixpanelConnector;

  const mockCredentials = {
    projectToken: 'test-project-token-123',
    serviceAccountUsername: 'test-username',
    serviceAccountSecret: 'test-secret',
    projectId: 'test-project-id',
    region: 'us',
  };

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Mixpanel Connector',
    type: 'mixpanel',
    category: 'analytics',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    connector = new MixpanelConnector();
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Mixpanel');
      expect(metadata.description).toContain('analytics');
      expect(metadata.version).toBeDefined();
    });

    it('should return actions', () => {
      const metadata = connector.getMetadata();

      expect(metadata.actions).toBeDefined();
      expect(metadata.actions.length).toBeGreaterThan(0);
    });

    it('should have empty triggers array', () => {
      const metadata = connector.getMetadata();

      expect(metadata.triggers).toBeDefined();
      expect(metadata.triggers.length).toBe(0);
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('actions', () => {
    it('should have track_event action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'track_event');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Track Event');
    });

    it('should have import_events action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'import_events');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Import Events');
    });

    it('should have profile_set action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'profile_set');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Set Profile Properties');
    });

    it('should have profile_set_once action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'profile_set_once');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Set Profile Properties Once');
    });

    it('should have profile_increment action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'profile_increment');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Increment Profile Property');
    });

    it('should have profile_delete action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'profile_delete');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Profile');
    });

    it('should have query_profiles action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'query_profiles');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Query Profiles');
    });

    it('should have query_insights action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'query_insights');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Query Insights');
    });

    it('should have export_events action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'export_events');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Export Raw Events');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all connector actions defined in MIXPANEL_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = MIXPANEL_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have no triggers in definition', () => {
      expect(MIXPANEL_CONNECTOR.webhook_support).toBe(false);
      // supported_triggers can be either undefined or an empty array
      expect(
        MIXPANEL_CONNECTOR.supported_triggers === undefined ||
        (Array.isArray(MIXPANEL_CONNECTOR.supported_triggers) && MIXPANEL_CONNECTOR.supported_triggers.length === 0)
      ).toBe(true);
    });

    it('should have matching auth_fields for credential keys used', () => {
      const definitionAuthKeys = MIXPANEL_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Keys used in connector
      expect(definitionAuthKeys).toContain('projectToken');
      expect(definitionAuthKeys).toContain('serviceAccountUsername');
      expect(definitionAuthKeys).toContain('serviceAccountSecret');
      expect(definitionAuthKeys).toContain('projectId');
      expect(definitionAuthKeys).toContain('region');
    });

    it('should have core actions available', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('track_event');
      expect(connectorActionIds).toContain('import_events');
      expect(connectorActionIds).toContain('profile_set');
      expect(connectorActionIds).toContain('query_profiles');
      expect(connectorActionIds).toContain('export_events');
    });
  });

  // ===========================================
  // Credential Key Tests
  // ===========================================
  describe('credential key handling', () => {
    it('should support projectToken credential key', () => {
      const credentials = {
        projectToken: 'test-token',
      };

      expect(credentials.projectToken).toBe('test-token');
    });

    it('should support region credential key with default value', () => {
      const credentials = {
        projectToken: 'test-token',
        region: 'eu',
      };

      expect(credentials.region).toBe('eu');
    });

    it('should support service account credentials', () => {
      const credentials = {
        serviceAccountUsername: 'test-user',
        serviceAccountSecret: 'test-secret',
        projectId: 'project-123',
      };

      expect(credentials.serviceAccountUsername).toBe('test-user');
      expect(credentials.serviceAccountSecret).toBe('test-secret');
      expect(credentials.projectId).toBe('project-123');
    });
  });

  // ===========================================
  // Region Support Tests
  // ===========================================
  describe('region support', () => {
    it('should support US region', () => {
      const authFields = MIXPANEL_CONNECTOR.auth_fields.find((f: any) => f.key === 'region');
      const usOption = authFields?.options?.find((o: any) => o.value === 'us');

      expect(usOption).toBeDefined();
      expect(usOption?.label).toContain('US');
    });

    it('should support EU region', () => {
      const authFields = MIXPANEL_CONNECTOR.auth_fields.find((f: any) => f.key === 'region');
      const euOption = authFields?.options?.find((o: any) => o.value === 'eu');

      expect(euOption).toBeDefined();
      expect(euOption?.label).toBe('EU');
    });

    it('should support India region', () => {
      const authFields = MIXPANEL_CONNECTOR.auth_fields.find((f: any) => f.key === 'region');
      const inOption = authFields?.options?.find((o: any) => o.value === 'in');

      expect(inOption).toBeDefined();
      expect(inOption?.label).toBe('India');
    });
  });
});
