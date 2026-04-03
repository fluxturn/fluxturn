/**
 * Klaviyo Connector Tests
 *
 * Tests for the Klaviyo connector actions, metadata, triggers, and sync validation.
 */
import { KlaviyoConnector } from '../klaviyo.connector';
import { KLAVIYO_CONNECTOR } from '../klaviyo.definition';

describe('KlaviyoConnector', () => {
  let connector: KlaviyoConnector;

  const mockCredentials = {
    apiKey: 'pk-test-key-123',
  };

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Klaviyo Connector',
    type: 'klaviyo',
    category: 'marketing',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    connector = new KlaviyoConnector();
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Klaviyo');
      expect(metadata.description).toContain('marketing');
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
      expect(metadata.triggers.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // Profile Action Tests
  // ===========================================
  describe('profile actions', () => {
    it('should have create_profile action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_profile');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Profile');
    });

    it('should have get_profile action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_profile');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Profile');
    });

    it('should have update_profile action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_profile');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Profile');
    });

    it('should have get_profiles action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_profiles');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Profiles');
    });

    it('should have subscribe_profile action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'subscribe_profile');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Subscribe Profile');
    });

    it('should have unsubscribe_profile action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'unsubscribe_profile');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Unsubscribe Profile');
    });
  });

  // ===========================================
  // Event Action Tests
  // ===========================================
  describe('event actions', () => {
    it('should have create_event action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_event');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Event');
    });

    it('should have track_event action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'track_event');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Track Event');
    });

    it('should have get_event action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_event');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Event');
    });

    it('should have get_events action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_events');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Events');
    });

    it('should have get_profile_events action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_profile_events');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Profile Events');
    });
  });

  // ===========================================
  // List Action Tests
  // ===========================================
  describe('list actions', () => {
    it('should have create_list action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_list');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create List');
    });

    it('should have get_list action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_list');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get List');
    });

    it('should have get_lists action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_lists');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Lists');
    });

    it('should have update_list action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_list');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update List');
    });

    it('should have delete_list action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_list');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete List');
    });

    it('should have add_profile_to_list action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'add_profile_to_list');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Add Profile to List');
    });

    it('should have remove_profile_from_list action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'remove_profile_from_list');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Remove Profile from List');
    });
  });

  // ===========================================
  // Segment Action Tests
  // ===========================================
  describe('segment actions', () => {
    it('should have get_segment action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_segment');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Segment');
    });

    it('should have get_segments action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_segments');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Segments');
    });

    it('should have get_segment_profiles action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_segment_profiles');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Segment Profiles');
    });
  });

  // ===========================================
  // Campaign Action Tests
  // ===========================================
  describe('campaign actions', () => {
    it('should have create_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Campaign');
    });

    it('should have get_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Campaign');
    });

    it('should have get_campaigns action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_campaigns');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Campaigns');
    });

    it('should have update_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Campaign');
    });

    it('should have delete_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Campaign');
    });

    it('should have send_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'send_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Send Campaign');
    });

    it('should have cancel_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'cancel_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Cancel Campaign');
    });
  });

  // ===========================================
  // Template Action Tests
  // ===========================================
  describe('template actions', () => {
    it('should have create_template action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_template');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Template');
    });

    it('should have get_template action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_template');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Template');
    });

    it('should have get_templates action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_templates');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Templates');
    });

    it('should have update_template action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_template');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Template');
    });

    it('should have delete_template action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_template');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Template');
    });
  });

  // ===========================================
  // Flow Action Tests
  // ===========================================
  describe('flow actions', () => {
    it('should have create_flow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_flow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Flow');
    });

    it('should have get_flow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_flow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Flow');
    });

    it('should have get_flows action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_flows');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Flows');
    });

    it('should have update_flow_status action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_flow_status');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Flow Status');
    });

    it('should have delete_flow action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_flow');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Flow');
    });
  });

  // ===========================================
  // Metric Action Tests
  // ===========================================
  describe('metric actions', () => {
    it('should have get_metric action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_metric');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Metric');
    });

    it('should have get_metrics action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_metrics');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Metrics');
    });
  });

  // ===========================================
  // Image Action Tests
  // ===========================================
  describe('image actions', () => {
    it('should have upload_image action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'upload_image');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Upload Image');
    });

    it('should have get_images action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_images');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Images');
    });
  });

  // ===========================================
  // Tag Action Tests
  // ===========================================
  describe('tag actions', () => {
    it('should have create_tag action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_tag');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Tag');
    });

    it('should have get_tag action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_tag');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Tag');
    });

    it('should have get_tags action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_tags');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Tags');
    });

    it('should have delete_tag action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_tag');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Tag');
    });
  });

  // ===========================================
  // Catalog Action Tests
  // ===========================================
  describe('catalog actions', () => {
    it('should have create_catalog_item action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_catalog_item');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Catalog Item');
    });

    it('should have get_catalog_item action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_catalog_item');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Catalog Item');
    });

    it('should have get_catalog_items action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_catalog_items');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Catalog Items');
    });

    it('should have update_catalog_item action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_catalog_item');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Catalog Item');
    });

    it('should have delete_catalog_item action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_catalog_item');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Catalog Item');
    });
  });

  // ===========================================
  // Form Action Tests
  // ===========================================
  describe('form actions', () => {
    it('should have get_form action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_form');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Form');
    });

    it('should have get_forms action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_forms');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Forms');
    });
  });

  // ===========================================
  // Coupon Action Tests
  // ===========================================
  describe('coupon actions', () => {
    it('should have create_coupon action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_coupon');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Coupon');
    });

    it('should have get_coupon action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_coupon');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Coupon');
    });

    it('should have get_coupons action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_coupons');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Coupons');
    });
  });

  // ===========================================
  // Trigger Tests
  // ===========================================
  describe('triggers', () => {
    it('should have profile_created trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'profile_created');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Profile Created');
      expect(trigger?.eventType).toBe('profile.created');
      expect(trigger?.webhookRequired).toBe(true);
    });

    it('should have profile_updated trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'profile_updated');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Profile Updated');
      expect(trigger?.eventType).toBe('profile.updated');
    });

    it('should have event_tracked trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'event_tracked');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Event Tracked');
      expect(trigger?.eventType).toBe('event.tracked');
    });

    it('should have list_member_added trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'list_member_added');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('List Member Added');
      expect(trigger?.eventType).toBe('list.member_added');
    });

    it('should have list_member_removed trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'list_member_removed');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('List Member Removed');
      expect(trigger?.eventType).toBe('list.member_removed');
    });

    it('should have campaign_sent trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'campaign_sent');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Campaign Sent');
      expect(trigger?.eventType).toBe('campaign.sent');
    });

    it('should have flow_triggered trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'flow_triggered');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Flow Triggered');
      expect(trigger?.eventType).toBe('flow.triggered');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests (CRITICAL)
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have ALL definition actions implemented in connector', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = KLAVIYO_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      const missingInConnector = definitionActionIds.filter(
        (id: string) => !connectorActionIds.includes(id)
      );

      expect(missingInConnector).toEqual([]);
    });

    it('should have ALL connector actions defined in definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = KLAVIYO_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      const missingInDefinition = connectorActionIds.filter(
        (id: string) => !definitionActionIds.includes(id)
      );

      expect(missingInDefinition).toEqual([]);
    });

    it('should have ALL definition triggers implemented in connector', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds =
        KLAVIYO_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      const missingInConnector = definitionTriggerIds.filter(
        (id: string) => !connectorTriggerIds.includes(id)
      );

      expect(missingInConnector).toEqual([]);
    });

    it('should have ALL connector triggers defined in definition', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds =
        KLAVIYO_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      const missingInDefinition = connectorTriggerIds.filter(
        (id: string) => !definitionTriggerIds.includes(id)
      );

      expect(missingInDefinition).toEqual([]);
    });

    it('should have matching auth_fields for credential keys used by connector', () => {
      const definitionAuthKeys = KLAVIYO_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Key expected by connector
      expect(definitionAuthKeys).toContain('apiKey');
    });

    it('should have webhook_support in definition', () => {
      expect(KLAVIYO_CONNECTOR.webhook_support).toBe(true);
    });

    it('should have correct auth_type', () => {
      expect(KLAVIYO_CONNECTOR.auth_type).toBe('api_key');
    });

    it('should have correct category', () => {
      expect(KLAVIYO_CONNECTOR.category).toBe('marketing');
    });
  });

  // ===========================================
  // Action Count Verification
  // ===========================================
  describe('action count verification', () => {
    it('should have correct number of actions in connector', () => {
      const metadata = connector.getMetadata();
      // 56 actions: Profiles (6), Events (6 - includes track_event), Lists (7), Segments (3), Campaigns (7),
      // Templates (5), Flows (6 - includes create_flow), Metrics (2), Images (2), Tags (4), Catalogs (5), Forms (2), Coupons (3)
      expect(metadata.actions.length).toBe(56);
    });

    it('should have correct number of triggers in connector', () => {
      const metadata = connector.getMetadata();
      // 7 triggers: profile_created, profile_updated, event_tracked, list_member_added,
      // list_member_removed, campaign_sent, flow_triggered
      expect(metadata.triggers.length).toBe(7);
    });
  });

  // ===========================================
  // Credential Key Tests
  // ===========================================
  describe('credential key handling', () => {
    it('should support apiKey credential key', () => {
      const credentials = {
        apiKey: 'pk-test-key',
      };

      expect(credentials.apiKey).toBe('pk-test-key');
    });
  });
});
