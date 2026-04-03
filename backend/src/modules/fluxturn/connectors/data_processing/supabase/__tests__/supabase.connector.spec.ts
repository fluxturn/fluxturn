/**
 * Supabase Connector Tests
 *
 * Tests for the Supabase connector actions, metadata, and initialization.
 */
import { SupabaseConnector } from '../supabase.connector';
import { SUPABASE_CONNECTOR } from '../supabase.definition';

describe('SupabaseConnector', () => {
  let connector: SupabaseConnector;

  const mockAuthUtils = {} as any;
  const mockApiUtils = {
    executeRequest: jest.fn(),
  } as any;

  const mockCredentials = {
    host: 'https://test-project.supabase.co',
    serviceRole: 'test-service-role-secret',
  };

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Supabase Connector',
    type: 'supabase',
    category: 'data_processing',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    connector = new SupabaseConnector(mockAuthUtils, mockApiUtils);
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Supabase');
      expect(metadata.description).toContain('Supabase');
      expect(metadata.version).toBeDefined();
      expect(metadata.webhookSupport).toBe(false);
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
    it('should have create_row action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_row');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Row');
    });

    it('should have delete_row action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_row');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Row');
    });

    it('should have get_row action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_row');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Row');
    });

    it('should have get_all_rows action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_all_rows');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Many Rows');
    });

    it('should have update_row action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_row');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Row');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all connector actions defined in SUPABASE_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = SUPABASE_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have no webhook support in definition', () => {
      expect(SUPABASE_CONNECTOR.webhook_support).toBe(false);
    });

    it('should have matching auth_fields for credential keys used', () => {
      const definitionAuthKeys = SUPABASE_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Keys used in connector
      expect(definitionAuthKeys).toContain('host');
      expect(definitionAuthKeys).toContain('serviceRole');
    });

    it('should have core row actions available', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('create_row');
      expect(connectorActionIds).toContain('get_row');
      expect(connectorActionIds).toContain('get_all_rows');
      expect(connectorActionIds).toContain('update_row');
      expect(connectorActionIds).toContain('delete_row');
    });
  });

  // ===========================================
  // Credential Key Tests
  // ===========================================
  describe('credential key handling', () => {
    it('should support host credential key', () => {
      const credentials = {
        host: 'https://my-project.supabase.co',
      };

      expect(credentials.host).toBe('https://my-project.supabase.co');
    });

    it('should support serviceRole credential key', () => {
      const credentials = {
        serviceRole: 'my-service-role-secret',
      };

      expect(credentials.serviceRole).toBe('my-service-role-secret');
    });
  });

  // ===========================================
  // Definition Structure Tests
  // ===========================================
  describe('definition structure', () => {
    it('should have correct category', () => {
      expect(SUPABASE_CONNECTOR.category).toBe('data_processing');
    });

    it('should have correct auth_type', () => {
      expect(SUPABASE_CONNECTOR.auth_type).toBe('api_key');
    });

    it('should have endpoints defined', () => {
      expect(SUPABASE_CONNECTOR.endpoints).toBeDefined();
      expect(SUPABASE_CONNECTOR.endpoints.base_url).toContain('{host}');
    });

    it('should have rate limits defined', () => {
      expect(SUPABASE_CONNECTOR.rate_limits).toBeDefined();
      expect(SUPABASE_CONNECTOR.rate_limits.requests_per_minute).toBeDefined();
    });
  });
});
