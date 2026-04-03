/**
 * Google Ads Connector Tests
 *
 * Tests for the Google Ads connector.
 * Note: The connector is currently disabled as it requires the googleapis package.
 * These tests verify the disabled state and proper error handling.
 */
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { GoogleAdsConnector } from '../google-ads.connector';
import { getMockCredentials } from '@test/helpers/mock-credentials';
import { ConnectorCategory, ConnectorType, AuthType } from '../../../types';

describe('GoogleAdsConnector', () => {
  let connector: GoogleAdsConnector;

  beforeEach(() => {
    connector = new GoogleAdsConnector();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return metadata indicating disabled state', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toContain('Disabled');
      expect(metadata.name).toContain('googleapis');
      expect(metadata.type).toBe(ConnectorType.GOOGLE_ADS);
      expect(metadata.category).toBe(ConnectorCategory.MARKETING);
      expect(metadata.authType).toBe(AuthType.OAUTH2);
    });

    it('should return empty actions array', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toEqual([]);
    });

    it('should return empty triggers array', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toEqual([]);
    });

    it('should indicate no webhook support', () => {
      const metadata = connector.getMetadata();
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should have rate limit configuration', () => {
      const metadata = connector.getMetadata();
      expect(metadata.rateLimit).toBeDefined();
      expect(metadata.rateLimit.requestsPerSecond).toBe(1);
      expect(metadata.rateLimit.requestsPerMinute).toBe(60);
    });
  });

  // ===========================================
  // Initialization Tests (Disabled State)
  // ===========================================
  describe('initialization', () => {
    it('should throw error when initializing', async () => {
      await expect(
        connector.initialize({
          id: 'test-google-ads-123',
          name: 'google_ads',
          type: 'google_ads' as any,
          category: 'marketing' as any,
          credentials: getMockCredentials('google_ads'),
        } as any),
      ).rejects.toThrow('googleapis package not installed');
    });
  });

  // ===========================================
  // Connection Tests (Disabled State)
  // ===========================================
  describe('testConnection', () => {
    it('should return false for connection test', async () => {
      // Create a fresh connector
      const freshConnector = new GoogleAdsConnector();

      // performConnectionTest returns false when disabled
      const result = await (freshConnector as any).performConnectionTest();
      expect(result).toBe(false);
    });
  });

  // ===========================================
  // Action Execution Tests (Disabled State)
  // ===========================================
  describe('executeAction', () => {
    it('should return CONNECTOR_DISABLED error for any action', async () => {
      const result = await connector.executeAction('campaign_get', {
        customerId: '1234567890',
        campaignId: '123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('CONNECTOR_DISABLED');
      expect(result.error.message).toContain('googleapis package not installed');
    });

    it('should return CONNECTOR_DISABLED for campaign_get_all', async () => {
      const result = await connector.executeAction('campaign_get_all', {
        customerId: '1234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CONNECTOR_DISABLED');
    });

    it('should return CONNECTOR_DISABLED for campaign_create', async () => {
      const result = await connector.executeAction('campaign_create', {
        customerId: '1234567890',
        name: 'Test Campaign',
        advertisingChannelType: 'SEARCH',
        budgetId: '456',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CONNECTOR_DISABLED');
    });

    it('should return CONNECTOR_DISABLED for ad_group_create', async () => {
      const result = await connector.executeAction('ad_group_create', {
        customerId: '1234567890',
        campaignId: '123',
        name: 'Test Ad Group',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CONNECTOR_DISABLED');
    });

    it('should return CONNECTOR_DISABLED for keyword_create', async () => {
      const result = await connector.executeAction('keyword_create', {
        customerId: '1234567890',
        adGroupId: '123',
        keyword: 'test keyword',
        matchType: 'EXACT',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CONNECTOR_DISABLED');
    });

    it('should return CONNECTOR_DISABLED for report_campaign_performance', async () => {
      const result = await connector.executeAction('report_campaign_performance', {
        customerId: '1234567890',
        dateRange: 'LAST_30_DAYS',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CONNECTOR_DISABLED');
    });

    it('should return CONNECTOR_DISABLED for unknown actions', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CONNECTOR_DISABLED');
    });
  });

  // ===========================================
  // Health Check Tests (Disabled State)
  // ===========================================
  describe('performHealthCheck', () => {
    it('should throw error for health check', async () => {
      await expect((connector as any).performHealthCheck()).rejects.toThrow(
        'googleapis package not installed',
      );
    });
  });

  // ===========================================
  // Request Tests (Disabled State)
  // ===========================================
  describe('performRequest', () => {
    it('should throw error for any request', async () => {
      await expect(
        (connector as any).performRequest({
          method: 'POST',
          url: '/test',
          body: {},
        }),
      ).rejects.toThrow('googleapis package not installed');
    });
  });

  // ===========================================
  // Cleanup Tests
  // ===========================================
  describe('cleanup', () => {
    it('should complete cleanup without error', async () => {
      await expect((connector as any).cleanup()).resolves.not.toThrow();
    });
  });

  // ===========================================
  // Definition Alignment Tests
  // ===========================================
  describe('definition alignment', () => {
    it('should acknowledge expected actions from definition', () => {
      // These are the actions defined in google-ads.definition.ts
      const expectedActions = [
        'campaign_get',
        'campaign_get_all',
        'campaign_create',
        'campaign_update',
        'ad_group_create',
        'ad_group_get_all',
        'keyword_create',
        'keyword_get_all',
        'report_campaign_performance',
      ];

      // All should return CONNECTOR_DISABLED
      expectedActions.forEach(async (actionId) => {
        const result = await connector.executeAction(actionId, {});
        expect(result.error?.code).toBe('CONNECTOR_DISABLED');
      });
    });

    it('should have no triggers as per definition', () => {
      // Google Ads API doesn't support webhooks
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });
  });

  // ===========================================
  // Credential Requirements Tests
  // ===========================================
  describe('credential requirements', () => {
    it('should document required credentials', () => {
      // Verify mock credentials have required fields
      const creds = getMockCredentials('google_ads');

      expect(creds).toHaveProperty('accessToken');
      expect(creds).toHaveProperty('developerToken');
      expect(creds).toHaveProperty('customerId');
    });
  });
});
