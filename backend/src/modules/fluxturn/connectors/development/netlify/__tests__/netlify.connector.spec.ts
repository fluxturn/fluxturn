/**
 * Netlify Connector Tests
 *
 * Tests for the Netlify connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { NetlifyConnector } from '../netlify.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('NetlifyConnector', () => {
  let connector: NetlifyConnector;
  const BASE_URL = 'https://api.netlify.com/api/v1';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(NetlifyConnector, 'netlify');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(BASE_URL)
        .get('/sites')
        .query({ per_page: 1 })
        .reply(200, [
          {
            id: 'site-123',
            name: 'test-site',
            url: 'https://test-site.netlify.app',
          },
        ]);

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/sites')
        .query({ per_page: 1 })
        .reply(401, { message: 'Invalid token' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/sites')
        .query({ per_page: 1 })
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Deploy Action Tests
  // ===========================================
  describe('cancel_deploy', () => {
    it('should cancel deploy successfully', async () => {
      const deployId = 'deploy-123';
      const mockResponse = {
        id: deployId,
        state: 'canceled',
        site_id: 'site-123',
      };

      nock(BASE_URL)
        .post(`/deploys/${deployId}/cancel`)
        .reply(200, mockResponse);

      const result = await connector.executeAction('cancel_deploy', {
        deployId,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe(deployId);
      expect(data.state).toBe('canceled');
    });

    it('should handle deploy not found error', async () => {
      const deployId = 'nonexistent';

      nock(BASE_URL)
        .post(`/deploys/${deployId}/cancel`)
        .reply(404, { message: 'Deploy not found' });

      const result = await connector.executeAction('cancel_deploy', {
        deployId,
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle missing deploy ID', async () => {
      const result = await connector.executeAction('cancel_deploy', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('create_deploy', () => {
    it('should create deploy successfully', async () => {
      const siteId = 'site-123';
      const mockResponse = {
        id: 'deploy-456',
        site_id: siteId,
        deploy_url: 'https://deploy-456--test.netlify.app',
        state: 'processing',
        created_at: '2024-01-13T12:00:00Z',
      };

      nock(BASE_URL)
        .post(`/sites/${siteId}/deploys`)
        .query({ title: 'Test Deploy' })
        .reply(200, mockResponse);

      const result = await connector.executeAction('create_deploy', {
        siteId,
        title: 'Test Deploy',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.site_id).toBe(siteId);
      expect(data.state).toBe('processing');
    });

    it('should create deploy without optional title', async () => {
      const siteId = 'site-123';
      const mockResponse = {
        id: 'deploy-789',
        site_id: siteId,
        deploy_url: 'https://deploy-789--test.netlify.app',
        state: 'processing',
        created_at: '2024-01-13T12:00:00Z',
      };

      nock(BASE_URL)
        .post(`/sites/${siteId}/deploys`)
        .reply(200, mockResponse);

      const result = await connector.executeAction('create_deploy', {
        siteId,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.site_id).toBe(siteId);
    });

    it('should handle site not found error', async () => {
      const siteId = 'nonexistent';

      nock(BASE_URL)
        .post(`/sites/${siteId}/deploys`)
        .reply(404, { message: 'Site not found' });

      const result = await connector.executeAction('create_deploy', {
        siteId,
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle missing site ID', async () => {
      const result = await connector.executeAction('create_deploy', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('get_deploy', () => {
    it('should get deploy successfully', async () => {
      const siteId = 'site-123';
      const deployId = 'deploy-456';
      const mockResponse = {
        id: deployId,
        site_id: siteId,
        state: 'ready',
        deploy_url: 'https://deploy-456--test.netlify.app',
        created_at: '2024-01-13T12:00:00Z',
        updated_at: '2024-01-13T12:05:00Z',
      };

      nock(BASE_URL)
        .get(`/sites/${siteId}/deploys/${deployId}`)
        .reply(200, mockResponse);

      const result = await connector.executeAction('get_deploy', {
        siteId,
        deployId,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe(deployId);
      expect(data.state).toBe('ready');
    });

    it('should handle deploy not found error', async () => {
      const siteId = 'site-123';
      const deployId = 'nonexistent';

      nock(BASE_URL)
        .get(`/sites/${siteId}/deploys/${deployId}`)
        .reply(404, { message: 'Deploy not found' });

      const result = await connector.executeAction('get_deploy', {
        siteId,
        deployId,
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle missing IDs', async () => {
      const result = await connector.executeAction('get_deploy', {
        siteId: 'site-123',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('get_all_deploys', () => {
    it('should get deploys with limit', async () => {
      const siteId = 'site-123';
      const mockDeploys = [
        {
          id: 'deploy-1',
          site_id: siteId,
          state: 'ready',
          created_at: '2024-01-13T12:00:00Z',
        },
        {
          id: 'deploy-2',
          site_id: siteId,
          state: 'processing',
          created_at: '2024-01-13T11:00:00Z',
        },
      ];

      nock(BASE_URL)
        .get(`/sites/${siteId}/deploys`)
        .query({ per_page: 50 })
        .reply(200, mockDeploys);

      const result = await connector.executeAction('get_all_deploys', {
        siteId,
        limit: 50,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('should get all deploys with pagination', async () => {
      const siteId = 'site-123';
      const mockDeploysPage1 = [
        { id: 'deploy-1', site_id: siteId },
        { id: 'deploy-2', site_id: siteId },
      ];
      const mockDeploysPage2 = [
        { id: 'deploy-3', site_id: siteId },
      ];

      nock(BASE_URL)
        .get(`/sites/${siteId}/deploys`)
        .query({ page: 0, per_page: 100 })
        .reply(200, mockDeploysPage1, {
          Link: '<https://api.netlify.com/api/v1/sites/site-123/deploys?page=1>; rel="next"',
        });

      nock(BASE_URL)
        .get(`/sites/${siteId}/deploys`)
        .query({ page: 1, per_page: 100 })
        .reply(200, mockDeploysPage2);

      const result = await connector.executeAction('get_all_deploys', {
        siteId,
        returnAll: true,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    it('should handle site not found error', async () => {
      const siteId = 'nonexistent';

      nock(BASE_URL)
        .get(`/sites/${siteId}/deploys`)
        .query({ per_page: 50 })
        .reply(404, { message: 'Site not found' });

      const result = await connector.executeAction('get_all_deploys', {
        siteId,
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle missing site ID', async () => {
      const result = await connector.executeAction('get_all_deploys', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Site Action Tests
  // ===========================================
  describe('delete_site', () => {
    it('should delete site successfully', async () => {
      const siteId = 'site-123';

      nock(BASE_URL)
        .delete(`/sites/${siteId}`)
        .reply(204);

      const result = await connector.executeAction('delete_site', {
        siteId,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.success).toBe(true);
    });

    it('should handle site not found error', async () => {
      const siteId = 'nonexistent';

      nock(BASE_URL)
        .delete(`/sites/${siteId}`)
        .reply(404, { message: 'Site not found' });

      const result = await connector.executeAction('delete_site', {
        siteId,
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle missing site ID', async () => {
      const result = await connector.executeAction('delete_site', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('get_site', () => {
    it('should get site successfully', async () => {
      const siteId = 'site-123';
      const mockSite = {
        id: siteId,
        name: 'test-site',
        url: 'https://test-site.netlify.app',
        admin_url: 'https://app.netlify.com/sites/test-site',
        state: 'current',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-13T12:00:00Z',
      };

      nock(BASE_URL)
        .get(`/sites/${siteId}`)
        .reply(200, mockSite);

      const result = await connector.executeAction('get_site', {
        siteId,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe(siteId);
      expect(data.name).toBe('test-site');
    });

    it('should handle site not found error', async () => {
      const siteId = 'nonexistent';

      nock(BASE_URL)
        .get(`/sites/${siteId}`)
        .reply(404, { message: 'Site not found' });

      const result = await connector.executeAction('get_site', {
        siteId,
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle missing site ID', async () => {
      const result = await connector.executeAction('get_site', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('get_all_sites', () => {
    it('should get sites with limit', async () => {
      const mockSites = [
        {
          id: 'site-1',
          name: 'site-one',
          url: 'https://site-one.netlify.app',
        },
        {
          id: 'site-2',
          name: 'site-two',
          url: 'https://site-two.netlify.app',
        },
      ];

      nock(BASE_URL)
        .get('/sites')
        .query({ filter: 'all', per_page: 50 })
        .reply(200, mockSites);

      const result = await connector.executeAction('get_all_sites', {
        limit: 50,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('should get all sites with pagination', async () => {
      const mockSitesPage1 = [
        { id: 'site-1', name: 'site-one' },
        { id: 'site-2', name: 'site-two' },
      ];
      const mockSitesPage2 = [
        { id: 'site-3', name: 'site-three' },
      ];

      nock(BASE_URL)
        .get('/sites')
        .query({ filter: 'all', page: 0, per_page: 100 })
        .reply(200, mockSitesPage1, {
          Link: '<https://api.netlify.com/api/v1/sites?page=1>; rel="next"',
        });

      nock(BASE_URL)
        .get('/sites')
        .query({ filter: 'all', page: 1, per_page: 100 })
        .reply(200, mockSitesPage2);

      const result = await connector.executeAction('get_all_sites', {
        returnAll: true,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    it('should handle API error', async () => {
      nock(BASE_URL)
        .get('/sites')
        .query({ filter: 'all', per_page: 50 })
        .reply(500, { message: 'Internal server error' });

      const result = await connector.executeAction('get_all_sites', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Unknown Action Test
  // ===========================================
  describe('unknown action', () => {
    it('should throw error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });
});
