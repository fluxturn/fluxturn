/**
 * Airtable Connector Tests
 *
 * Tests for the Airtable connector actions, metadata, and initialization.
 */
import { AirtableConnector } from '../airtable.connector';
import { AIRTABLE_CONNECTOR } from '../airtable.definition';

describe('AirtableConnector', () => {
  let connector: AirtableConnector;

  const mockAuthUtils = {} as any;
  const mockApiUtils = {
    executeRequest: jest.fn(),
  } as any;

  const mockCredentials = {
    apiKey: 'pat-test-key-123',
    baseId: 'app-test-base-123',
  };

  const mockConfig = {
    id: 'test-connector-id',
    type: 'airtable',
    credentials: mockCredentials,
    settings: {},
  };

  beforeEach(() => {
    connector = new AirtableConnector(mockAuthUtils, mockApiUtils);
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Airtable');
      expect(metadata.description).toContain('Airtable');
      expect(metadata.version).toBeDefined();
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should return actions', () => {
      const metadata = connector.getMetadata();

      expect(metadata.actions).toBeDefined();
      expect(metadata.actions.length).toBeGreaterThan(0);
    });

    it('should return triggers', () => {
      const metadata = connector.getMetadata();

      expect(metadata.triggers).toBeDefined();
      expect(metadata.triggers.length).toBe(3);
    });

    it('should have record_created trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'record_created');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Record Created');
      expect(trigger?.eventType).toBe('airtable:record_created');
      expect(trigger?.webhookRequired).toBe(true);
    });

    it('should have record_updated trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'record_updated');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Record Updated');
      expect(trigger?.eventType).toBe('airtable:record_updated');
      expect(trigger?.webhookRequired).toBe(true);
    });

    it('should have record_deleted trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'record_deleted');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Record Deleted');
      expect(trigger?.eventType).toBe('airtable:record_deleted');
      expect(trigger?.webhookRequired).toBe(true);
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('actions', () => {
    it('should have create_record action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_record');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Record');
    });

    it('should have update_record action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_record');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Record');
    });

    it('should have get_record action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_record');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Record');
    });

    it('should have search_records action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'search_records');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Search Records');
    });

    it('should have delete_record action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_record');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Record');
    });

    it('should have upsert_record action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'upsert_record');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create or Update Record');
    });

    it('should have get_many_bases action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_many_bases');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Many Bases');
    });

    it('should have get_base_schema action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_base_schema');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Base Schema');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all connector actions defined in AIRTABLE_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = AIRTABLE_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = AIRTABLE_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers defined in AIRTABLE_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds = AIRTABLE_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds = AIRTABLE_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching trigger eventType format', () => {
      const metadata = connector.getMetadata();
      const definitionTriggers = AIRTABLE_CONNECTOR.supported_triggers || [];

      for (const connectorTrigger of metadata.triggers) {
        const definitionTrigger = definitionTriggers.find((t: any) => t.id === connectorTrigger.id);
        expect(definitionTrigger).toBeDefined();
        expect(connectorTrigger.eventType).toBe(definitionTrigger?.eventType);
      }
    });

    it('should have matching auth_fields for all credential keys used', () => {
      const definitionAuthKeys = AIRTABLE_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Keys used in connector
      const usedKeys = ['apiKey', 'baseId'];

      for (const key of usedKeys) {
        expect(definitionAuthKeys).toContain(key);
      }
    });
  });
});
