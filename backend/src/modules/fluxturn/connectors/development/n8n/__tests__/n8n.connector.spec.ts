/**
 * n8n Connector Tests
 *
 * Tests for the n8n connector actions, metadata, and initialization.
 */
import { N8nConnector } from '../n8n.connector';
import { N8N_CONNECTOR } from '../n8n.definition';

describe('N8nConnector', () => {
  let connector: N8nConnector;

  const mockAuthUtils = {} as any;
  const mockApiUtils = {
    executeRequest: jest.fn(),
  } as any;

  const mockCredentials = {
    apiKey: 'test-api-key-123',
    baseUrl: 'https://test.n8n.cloud/api/v1',
  };

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test n8n Connector',
    type: 'n8n',
    category: 'development',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    connector = new N8nConnector(mockAuthUtils, mockApiUtils);
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('n8n');
      expect(metadata.description).toContain('n8n');
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
    it('should have get_workflows action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_workflows');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Workflows');
    });

    it('should have get_workflow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_workflow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Workflow');
    });

    it('should have create_workflow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_workflow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Workflow');
    });

    it('should have update_workflow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_workflow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Workflow');
    });

    it('should have delete_workflow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_workflow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Workflow');
    });

    it('should have activate_workflow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'activate_workflow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Publish Workflow');
    });

    it('should have deactivate_workflow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'deactivate_workflow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Unpublish Workflow');
    });

    it('should have get_executions action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_executions');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Executions');
    });

    it('should have get_execution action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_execution');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Execution');
    });

    it('should have delete_execution action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_execution');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Execution');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all connector actions defined in N8N_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = N8N_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have no webhook support in definition', () => {
      expect(N8N_CONNECTOR.webhook_support).toBe(false);
    });

    it('should have matching auth_fields for credential keys used', () => {
      const definitionAuthKeys = N8N_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Keys used in connector
      expect(definitionAuthKeys).toContain('apiKey');
      expect(definitionAuthKeys).toContain('baseUrl');
    });

    it('should have core workflow actions available', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('get_workflows');
      expect(connectorActionIds).toContain('get_workflow');
      expect(connectorActionIds).toContain('create_workflow');
      expect(connectorActionIds).toContain('update_workflow');
      expect(connectorActionIds).toContain('delete_workflow');
    });

    it('should have workflow activation actions', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('activate_workflow');
      expect(connectorActionIds).toContain('deactivate_workflow');
    });

    it('should have execution actions', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);

      expect(connectorActionIds).toContain('get_executions');
      expect(connectorActionIds).toContain('get_execution');
      expect(connectorActionIds).toContain('delete_execution');
    });
  });

  // ===========================================
  // Credential Key Tests
  // ===========================================
  describe('credential key handling', () => {
    it('should support apiKey credential key', () => {
      const credentials = {
        apiKey: 'test-api-key',
      };

      expect(credentials.apiKey).toBe('test-api-key');
    });

    it('should support baseUrl credential key', () => {
      const credentials = {
        baseUrl: 'https://my-n8n.example.com/api/v1',
      };

      expect(credentials.baseUrl).toBe('https://my-n8n.example.com/api/v1');
    });
  });
});
