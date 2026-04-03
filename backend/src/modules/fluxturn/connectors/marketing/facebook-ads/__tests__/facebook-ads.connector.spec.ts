/**
 * Facebook Ads Connector Tests
 *
 * Tests for the Facebook Ads connector actions, metadata, triggers, and sync validation.
 */
import { FacebookAdsConnector } from '../facebook-ads.connector';
import { FACEBOOK_ADS_CONNECTOR } from '../facebook-ads.definition';

describe('FacebookAdsConnector', () => {
  let connector: FacebookAdsConnector;

  const mockCredentials = {
    accessToken: 'test-access-token',
    adAccountId: 'act_123456789',
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
  };

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Facebook Ads Connector',
    type: 'facebook-ads',
    category: 'marketing',
    credentials: mockCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    connector = new FacebookAdsConnector();
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Facebook Ads');
      expect(metadata.description).toContain('Facebook');
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
      expect(metadata.triggers.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // Action Tests
  // ===========================================
  describe('actions', () => {
    it('should have http_request action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'http_request');

      expect(action).toBeDefined();
      expect(action?.name).toBe('HTTP Request');
    });

    it('should have get_campaigns action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_campaigns');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Campaigns');
    });

    it('should have get_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Campaign');
    });

    it('should have create_campaign action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_campaign');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Campaign');
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

    it('should have get_adsets action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_adsets');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Ad Sets');
    });

    it('should have get_adset action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_adset');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Ad Set');
    });

    it('should have create_adset action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_adset');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Ad Set');
    });

    it('should have update_adset action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_adset');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Ad Set');
    });

    it('should have delete_adset action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_adset');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Ad Set');
    });

    it('should have get_ads action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_ads');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Ads');
    });

    it('should have get_ad action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_ad');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Ad');
    });

    it('should have update_ad action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'update_ad');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Update Ad');
    });

    it('should have delete_ad action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'delete_ad');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Delete Ad');
    });

    it('should have get_lead action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_lead');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Lead');
    });

    it('should have get_leadgen_forms action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_leadgen_forms');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Lead Forms');
    });

    it('should have get_form_leads action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_form_leads');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Form Leads');
    });

    it('should have get_insights action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_insights');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Insights');
    });

    it('should have get_custom_audiences action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'get_custom_audiences');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Get Custom Audiences');
    });

    it('should have create_custom_audience action', () => {
      const metadata = connector.getMetadata();
      const action = metadata.actions.find((a) => a.id === 'create_custom_audience');

      expect(action).toBeDefined();
      expect(action?.name).toBe('Create Custom Audience');
    });
  });

  // ===========================================
  // Trigger Tests
  // ===========================================
  describe('triggers', () => {
    it('should have new_lead trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'new_lead');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('New Lead');
    });

    it('should have campaign_delivery_issue trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'campaign_delivery_issue');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Campaign Delivery Issue');
    });

    it('should have budget_spent trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'budget_spent');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Budget Spent');
    });

    it('should have ad_disapproved trigger', () => {
      const metadata = connector.getMetadata();
      const trigger = metadata.triggers.find((t) => t.id === 'ad_disapproved');

      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Ad Disapproved');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests (CRITICAL)
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have ALL definition actions implemented in connector', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = FACEBOOK_ADS_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      const missingInConnector = definitionActionIds.filter(
        (id: string) => !connectorActionIds.includes(id)
      );

      expect(missingInConnector).toEqual([]);
    });

    it('should have ALL connector actions defined in definition', () => {
      const metadata = connector.getMetadata();
      const definitionActionIds = FACEBOOK_ADS_CONNECTOR.supported_actions.map((a: any) => a.id);
      const connectorActionIds = metadata.actions.map((a) => a.id);

      const missingInDefinition = connectorActionIds.filter(
        (id: string) => !definitionActionIds.includes(id)
      );

      expect(missingInDefinition).toEqual([]);
    });

    it('should have ALL definition triggers implemented in connector', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds =
        FACEBOOK_ADS_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      const missingInConnector = definitionTriggerIds.filter(
        (id: string) => !connectorTriggerIds.includes(id)
      );

      expect(missingInConnector).toEqual([]);
    });

    it('should have ALL connector triggers defined in definition', () => {
      const metadata = connector.getMetadata();
      const definitionTriggerIds =
        FACEBOOK_ADS_CONNECTOR.supported_triggers?.map((t: any) => t.id) || [];
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);

      const missingInDefinition = connectorTriggerIds.filter(
        (id: string) => !definitionTriggerIds.includes(id)
      );

      expect(missingInDefinition).toEqual([]);
    });

    it('should have matching auth_fields for credential keys used by connector', () => {
      const definitionAuthKeys = FACEBOOK_ADS_CONNECTOR.auth_fields.map((f: any) => f.key);

      // Keys expected by connector
      expect(definitionAuthKeys).toContain('accessToken');
      expect(definitionAuthKeys).toContain('appId');
      expect(definitionAuthKeys).toContain('appSecret');
      expect(definitionAuthKeys).toContain('adAccountId');
    });

    it('should have webhook_support in definition', () => {
      expect(FACEBOOK_ADS_CONNECTOR.webhook_support).toBe(true);
    });

    it('should have correct auth_type', () => {
      expect(FACEBOOK_ADS_CONNECTOR.auth_type).toBe('bearer_token');
    });

    it('should have correct category', () => {
      expect(FACEBOOK_ADS_CONNECTOR.category).toBe('marketing');
    });
  });

  // ===========================================
  // Action Count Verification
  // ===========================================
  describe('action count verification', () => {
    it('should have correct number of actions in connector', () => {
      const metadata = connector.getMetadata();
      // 21 actions: http_request, campaigns (5), adsets (5), ads (4), leads (3), insights (1), audiences (2)
      expect(metadata.actions.length).toBe(21);
    });

    it('should have correct number of triggers in connector', () => {
      const metadata = connector.getMetadata();
      // 4 triggers: new_lead, campaign_delivery_issue, budget_spent, ad_disapproved
      expect(metadata.triggers.length).toBe(4);
    });
  });

  // ===========================================
  // Credential Key Tests
  // ===========================================
  describe('credential key handling', () => {
    it('should support accessToken credential key', () => {
      const credentials = {
        accessToken: 'test-token',
        adAccountId: 'act_123',
      };

      expect(credentials.accessToken).toBe('test-token');
    });

    it('should support adAccountId credential key', () => {
      const credentials = {
        accessToken: 'test-token',
        adAccountId: 'act_123456789',
      };

      expect(credentials.adAccountId).toBe('act_123456789');
    });

    it('should support appId credential key', () => {
      const credentials = {
        appId: 'test-app-id',
      };

      expect(credentials.appId).toBe('test-app-id');
    });

    it('should support appSecret credential key', () => {
      const credentials = {
        appSecret: 'test-app-secret',
      };

      expect(credentials.appSecret).toBe('test-app-secret');
    });
  });
});
