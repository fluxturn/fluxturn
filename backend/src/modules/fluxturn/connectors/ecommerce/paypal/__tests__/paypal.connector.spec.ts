/**
 * PayPal Connector Tests
 *
 * Tests for the PayPal connector actions, metadata, and initialization.
 */
import { PayPalConnector } from '../paypal.connector';
import { PAYPAL_CONNECTOR } from '../paypal.definition';

describe('PayPalConnector', () => {
  let connector: PayPalConnector;

  const mockAuthUtils = {} as any;
  const mockApiUtils = {} as any;
  const mockErrorUtils = {
    handleError: jest.fn((error, context) => ({
      success: false,
      error: { code: 'ERROR', message: error.message },
      metadata: { connectorId: 'paypal' },
    })),
  } as any;

  const mockCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    environment: 'sandbox',
  };

  const mockConfig = {
    id: 'test-connector-id',
    type: 'paypal',
    credentials: mockCredentials,
    settings: {},
  };

  beforeEach(() => {
    connector = new PayPalConnector(mockAuthUtils, mockApiUtils, mockErrorUtils);
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('PayPal');
      expect(metadata.description).toContain('PayPal');
      expect(metadata.version).toBeDefined();
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should return actions', () => {
      const metadata = connector.getMetadata();

      expect(metadata.actions).toBeDefined();
      expect(metadata.actions.length).toBe(4);
    });

    it('should return triggers', () => {
      const metadata = connector.getMetadata();

      expect(metadata.triggers).toBeDefined();
      expect(metadata.triggers.length).toBe(1);
    });

    it('should have webhook_events trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t: any) => t.id === 'webhook_events');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Webhook Events');
      expect(trigger?.eventType).toBe('paypal_webhook');
      expect(trigger?.webhookRequired).toBe(true);
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('actions', () => {
    it('should have create_payout action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a: any) => a.id === 'create_payout');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Payout');
    });

    it('should have get_payout action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a: any) => a.id === 'get_payout');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Payout');
    });

    it('should have get_payout_item action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a: any) => a.id === 'get_payout_item');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Payout Item');
    });

    it('should have cancel_payout_item action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a: any) => a.id === 'cancel_payout_item');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Cancel Payout Item');
    });
  });

  // ===========================================
  // executeAction Tests
  // ===========================================
  describe('executeAction', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unknown action');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all connector actions defined in PAYPAL_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = PAYPAL_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a: any) => a.id);

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = PAYPAL_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a: any) => a.id);

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers defined in PAYPAL_CONNECTOR definition', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds = PAYPAL_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t: any) => t.id);

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds = PAYPAL_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t: any) => t.id);

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth_fields for all credential keys used', () => {
      const definitionAuthKeys = PAYPAL_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Keys used in connector
      const usedKeys = ['clientId', 'clientSecret', 'environment'];

      for (const key of usedKeys) {
        expect(definitionAuthKeys).toContain(key);
      }
    });
  });

  // ===========================================
  // Initialization Tests
  // ===========================================
  describe('initializeWithCredentials', () => {
    it('should throw error when clientId is missing', () => {
      expect(() => {
        connector.initializeWithCredentials({
          credentials: { clientSecret: 'secret' },
        });
      }).toThrow('PayPal client ID and secret are required');
    });

    it('should throw error when clientSecret is missing', () => {
      expect(() => {
        connector.initializeWithCredentials({
          credentials: { clientId: 'id' },
        });
      }).toThrow('PayPal client ID and secret are required');
    });
  });
});
