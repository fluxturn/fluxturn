/**
 * Segment Connector Tests
 *
 * Tests for the Segment connector actions, metadata, and initialization.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { SegmentConnector } from '../segment.connector';
import { SEGMENT_CONNECTOR } from '../segment.definition';

describe('SegmentConnector', () => {
  let connector: SegmentConnector;

  const mockCredentials = {
    writeKey: 'test-write-key-123',
    workspace_id: 'test-workspace-id',
    access_token: 'test-access-token',
  };

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Segment Connector',
    type: 'segment',
    category: 'analytics',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SegmentConnector],
    }).compile();

    connector = module.get<SegmentConnector>(SegmentConnector);
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Segment');
      expect(metadata.description).toContain('analytics');
      expect(metadata.version).toBeDefined();
    });

    it('should return actions', () => {
      const metadata = connector.getMetadata();

      expect(metadata.actions).toBeDefined();
      expect(metadata.actions.length).toBeGreaterThan(0);
    });

    it('should return triggers', () => {
      const metadata = connector.getMetadata();

      expect(metadata.triggers).toBeDefined();
      expect(metadata.triggers.length).toBe(2);
    });

    it('should have audience_entered trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'audience_entered');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Audience Entered');
      expect(trigger?.eventType).toBe('segment:audience_entered');
      expect(trigger?.webhookRequired).toBe(true);
    });

    it('should have audience_exited trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'audience_exited');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Audience Exited');
      expect(trigger?.eventType).toBe('segment:audience_exited');
      expect(trigger?.webhookRequired).toBe(true);
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initialize', () => {
    it('should initialize with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error when writeKey is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { ...mockCredentials, writeKey: undefined },
      };

      await expect(connector.initialize(invalidConfig as any)).rejects.toThrow();
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('executeAction', () => {
    it('should have track_event action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'track_event');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Track Event');
    });

    it('should have identify_user action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'identify_user');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Identify User');
    });

    it('should have track_page action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'track_page');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Track Page');
    });

    it('should have add_to_group action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'add_to_group');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Add to Group');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all connector actions defined in SEGMENT_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = SEGMENT_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = SEGMENT_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers defined in SEGMENT_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds = SEGMENT_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds = SEGMENT_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth_fields for all credential keys used', () => {
      const definitionAuthKeys = SEGMENT_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Keys used in connector
      const usedKeys = ['writeKey', 'workspace_id', 'access_token'];

      for (const key of usedKeys) {
        expect(definitionAuthKeys).toContain(key);
      }
    });

    it('should have matching trigger eventType format', () => {
      const metadata = connector.getMetadata();
      const definitionTriggers = SEGMENT_CONNECTOR.supported_triggers || [];

      for (const connectorTrigger of metadata.triggers) {
        const definitionTrigger = definitionTriggers.find((t: any) => t.id === connectorTrigger.id);
        expect(definitionTrigger).toBeDefined();
        expect(connectorTrigger.eventType).toBe(definitionTrigger?.eventType);
      }
    });
  });
});
