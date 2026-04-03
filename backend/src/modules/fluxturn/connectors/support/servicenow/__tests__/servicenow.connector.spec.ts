/**
 * ServiceNow Connector Tests
 *
 * Comprehensive tests for the ServiceNow connector including:
 * - Metadata and connector-definition sync
 * - OAuth2 and Basic Auth authentication
 * - All major actions (incidents, users, records, etc.)
 * - Error handling
 * - Connection tests
 */

import { ServiceNowConnector } from '../servicenow.connector';
import { SERVICENOW_CONNECTOR } from '../servicenow.definition';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ServiceNowConnector', () => {
  let connector: ServiceNowConnector;
  let mockAxiosInstance: any;

  const mockOAuth2Config = {
    id: 'test-connector-id',
    name: 'Test ServiceNow Connector',
    type: 'servicenow',
    category: 'support',
    credentials: {
      instanceUrl: 'https://test-instance.service-now.com',
      authType: 'oauth2',
      accessToken: 'test-oauth-access-token',
    },
    settings: {},
  } as any;

  const mockBasicAuthConfig = {
    id: 'test-connector-id',
    name: 'Test ServiceNow Connector',
    type: 'servicenow',
    category: 'support',
    credentials: {
      instanceUrl: 'https://test-instance.service-now.com',
      authType: 'basic',
      username: 'test-user',
      password: 'test-password',
    },
    settings: {},
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    connector = new ServiceNowConnector();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('ServiceNow');
      expect(metadata.category).toBe('support');
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should return all defined actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);

      // Incident actions
      expect(actionIds).toContain('create_incident');
      expect(actionIds).toContain('get_incident');
      expect(actionIds).toContain('get_all_incidents');
      expect(actionIds).toContain('update_incident');
      expect(actionIds).toContain('delete_incident');

      // User actions
      expect(actionIds).toContain('create_user');
      expect(actionIds).toContain('get_user');
      expect(actionIds).toContain('get_all_users');
      expect(actionIds).toContain('update_user');
      expect(actionIds).toContain('delete_user');

      // Table Record actions
      expect(actionIds).toContain('create_record');
      expect(actionIds).toContain('get_record');
      expect(actionIds).toContain('get_all_records');
      expect(actionIds).toContain('update_record');
      expect(actionIds).toContain('delete_record');

      // Business Service actions
      expect(actionIds).toContain('get_business_service');
      expect(actionIds).toContain('get_all_business_services');

      // Attachment actions
      expect(actionIds).toContain('upload_attachment');
      expect(actionIds).toContain('get_attachments');

      // Other actions
      expect(actionIds).toContain('get_user_groups');
      expect(actionIds).toContain('get_departments');
    });

    it('should return all defined triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map(t => t.id);

      expect(triggerIds).toContain('incident_created');
      expect(triggerIds).toContain('incident_updated');
      expect(triggerIds).toContain('incident_resolved');
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = SERVICENOW_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = SERVICENOW_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers in definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = SERVICENOW_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = SERVICENOW_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching action counts', () => {
      const metadata = connector.getMetadata();
      const connectorActionCount = metadata.actions.length;
      const definitionActionCount = SERVICENOW_CONNECTOR.supported_actions?.length || 0;

      expect(connectorActionCount).toBe(definitionActionCount);
    });

    it('should have matching trigger counts', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerCount = metadata.triggers.length;
      const definitionTriggerCount = SERVICENOW_CONNECTOR.supported_triggers?.length || 0;

      expect(connectorTriggerCount).toBe(definitionTriggerCount);
    });
  });

  // ===========================================
  // OAuth2 Authentication Tests
  // ===========================================
  describe('OAuth2 Authentication', () => {
    it('should initialize with OAuth2 Bearer token', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: { result: [] } });

      await freshConnector.initialize(mockOAuth2Config);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://test-instance.service-now.com/api/now',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-oauth-access-token',
          }),
        })
      );
    });

    it('should use OAuth2 token for API requests', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { result: { sys_id: 'inc123', number: 'INC0001' } },
      });

      await freshConnector.initialize(mockOAuth2Config);
      await freshConnector.executeAction('get_incident', { sys_id: 'inc123' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table/incident/inc123');
    });
  });

  // ===========================================
  // Basic Auth Tests
  // ===========================================
  describe('Basic Authentication', () => {
    it('should initialize with Basic Auth', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: { result: [] } });

      await freshConnector.initialize(mockBasicAuthConfig);

      const expectedBasicAuth = Buffer.from('test-user:test-password').toString('base64');
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://test-instance.service-now.com/api/now',
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedBasicAuth}`,
          }),
        })
      );
    });

    it('should throw error when no credentials provided', async () => {
      const freshConnector = new ServiceNowConnector();

      const invalidConfig = {
        ...mockOAuth2Config,
        credentials: {
          instanceUrl: 'https://test-instance.service-now.com',
        },
      };

      await expect(freshConnector.initialize(invalidConfig)).rejects.toThrow(
        'ServiceNow authentication credentials are required'
      );
    });

    it('should throw error when instance URL is missing', async () => {
      const freshConnector = new ServiceNowConnector();

      const invalidConfig = {
        ...mockOAuth2Config,
        credentials: {
          authType: 'oauth2',
          accessToken: 'token',
        },
      };

      await expect(freshConnector.initialize(invalidConfig)).rejects.toThrow(
        'ServiceNow instance URL is required'
      );
    });
  });

  // ===========================================
  // Incident Action Tests
  // ===========================================
  describe('Action: create_incident', () => {
    it('should create an incident successfully', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'inc123',
            number: 'INC0001',
            short_description: 'Test incident',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('create_incident', {
        short_description: 'Test incident',
        description: 'Test description',
        priority: '2',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/table/incident',
        expect.objectContaining({
          short_description: 'Test incident',
        })
      );
    });
  });

  describe('Action: get_incident', () => {
    it('should get an incident by sys_id', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'inc123',
            number: 'INC0001',
            short_description: 'Test incident',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_incident', {
        sys_id: 'inc123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table/incident/inc123');
    });
  });

  describe('Action: get_all_incidents', () => {
    it('should get all incidents with filters', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: [
            { sys_id: 'inc1', number: 'INC0001' },
            { sys_id: 'inc2', number: 'INC0002' },
          ],
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_all_incidents', {
        sysparm_limit: 10,
        sysparm_query: 'state=1',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/incident',
        expect.objectContaining({
          params: expect.objectContaining({
            sysparm_limit: 10,
            sysparm_query: 'state=1',
          }),
        })
      );
    });
  });

  describe('Action: update_incident', () => {
    it('should update an incident', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.patch.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'inc123',
            state: '2',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('update_incident', {
        sys_id: 'inc123',
        state: '2',
        short_description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/table/incident/inc123',
        expect.objectContaining({
          state: '2',
          short_description: 'Updated description',
        })
      );
    });
  });

  describe('Action: delete_incident', () => {
    it('should delete an incident', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.delete.mockResolvedValueOnce({ status: 204 });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('delete_incident', {
        sys_id: 'inc123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/table/incident/inc123');
    });
  });

  // ===========================================
  // User Action Tests
  // ===========================================
  describe('Action: create_user', () => {
    it('should create a user', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'user123',
            user_name: 'jdoe',
            email: 'jdoe@example.com',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('create_user', {
        user_name: 'jdoe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'jdoe@example.com',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/table/sys_user', expect.any(Object));
    });
  });

  describe('Action: get_user', () => {
    it('should get a user by sys_id', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'user123',
            user_name: 'jdoe',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_user', {
        sys_id: 'user123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table/sys_user/user123');
    });
  });

  describe('Action: get_all_users', () => {
    it('should get all users', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: [
            { sys_id: 'user1', user_name: 'user1' },
            { sys_id: 'user2', user_name: 'user2' },
          ],
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_all_users', {
        sysparm_limit: 50,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: delete_user', () => {
    it('should delete a user', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.delete.mockResolvedValueOnce({ status: 204 });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('delete_user', {
        sys_id: 'user123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/table/sys_user/user123');
    });
  });

  // ===========================================
  // Table Record Action Tests
  // ===========================================
  describe('Action: create_record', () => {
    it('should create a record in any table', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'rec123',
            name: 'Test Record',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('create_record', {
        tableName: 'cmdb_ci',
        data: { name: 'Test Record' },
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/table/cmdb_ci', { name: 'Test Record' });
    });
  });

  describe('Action: get_record', () => {
    it('should get a record from any table', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'rec123',
            name: 'Test Record',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_record', {
        tableName: 'cmdb_ci',
        sys_id: 'rec123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table/cmdb_ci/rec123');
    });
  });

  describe('Action: delete_record', () => {
    it('should delete a record from any table', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.delete.mockResolvedValueOnce({ status: 204 });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('delete_record', {
        tableName: 'cmdb_ci',
        sys_id: 'rec123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/table/cmdb_ci/rec123');
    });
  });

  // ===========================================
  // Business Service Action Tests
  // ===========================================
  describe('Action: get_business_service', () => {
    it('should get a business service', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: {
            sys_id: 'svc123',
            name: 'Email Service',
          },
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_business_service', {
        sys_id: 'svc123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/table/cmdb_ci_service/svc123');
    });
  });

  describe('Action: get_all_business_services', () => {
    it('should get all business services', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: [
            { sys_id: 'svc1', name: 'Service 1' },
            { sys_id: 'svc2', name: 'Service 2' },
          ],
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_all_business_services', {
        sysparm_limit: 100,
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/cmdb_ci_service',
        expect.any(Object)
      );
    });
  });

  // ===========================================
  // Attachment Action Tests
  // ===========================================
  describe('Action: get_attachments', () => {
    it('should get attachments for a record', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: [
            { sys_id: 'att1', file_name: 'file1.txt' },
            { sys_id: 'att2', file_name: 'file2.pdf' },
          ],
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_attachments', {
        table_name: 'incident',
        table_sys_id: 'inc123',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/attachment',
        expect.objectContaining({
          params: {
            sysparm_query: 'table_name=incident^table_sys_id=inc123',
          },
        })
      );
    });
  });

  // ===========================================
  // User Groups & Departments Tests
  // ===========================================
  describe('Action: get_user_groups', () => {
    it('should get user groups', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: [
            { sys_id: 'grp1', name: 'IT Support' },
            { sys_id: 'grp2', name: 'HR' },
          ],
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_user_groups', {
        sysparm_limit: 50,
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/sys_user_group',
        expect.any(Object)
      );
    });
  });

  describe('Action: get_departments', () => {
    it('should get departments', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          result: [
            { sys_id: 'dept1', name: 'Engineering' },
            { sys_id: 'dept2', name: 'Sales' },
          ],
        },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_departments', {
        sysparm_limit: 50,
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/cmn_department',
        expect.any(Object)
      );
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_incident', {
        sys_id: 'invalid-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown action', async () => {
      const freshConnector = new ServiceNowConnector();

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('invalid_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });

    it('should handle 401 unauthorized error', async () => {
      const freshConnector = new ServiceNowConnector();

      const error = new Error('Request failed with status code 401');
      (error as any).response = { status: 401, data: { error: 'Unauthorized' } };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_incident', {
        sys_id: 'inc123',
      });

      expect(result.success).toBe(false);
    });

    it('should handle 404 not found error', async () => {
      const freshConnector = new ServiceNowConnector();

      const error = new Error('Request failed with status code 404');
      (error as any).response = { status: 404, data: { error: 'Not Found' } };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.executeAction('get_incident', {
        sys_id: 'nonexistent',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Connection Test
  // ===========================================
  describe('Connection Test', () => {
    it('should test connection successfully', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { result: [{ sys_id: 'user1' }] },
      });

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should fail connection test with invalid credentials', async () => {
      const freshConnector = new ServiceNowConnector();

      // Connection test fails (initialization doesn't make HTTP requests)
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await freshConnector.initialize(mockOAuth2Config);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Parameter Flexibility Tests
  // ===========================================
  describe('Parameter Flexibility', () => {
    it('should accept both sys_id and incidentId for get_incident', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValue({
        data: { result: { sys_id: 'inc123' } },
      });

      await freshConnector.initialize(mockOAuth2Config);

      // Test with sys_id
      await freshConnector.executeAction('get_incident', { sys_id: 'inc123' });
      expect(mockAxiosInstance.get).toHaveBeenLastCalledWith('/table/incident/inc123');

      // Test with incidentId
      await freshConnector.executeAction('get_incident', { incidentId: 'inc456' });
      expect(mockAxiosInstance.get).toHaveBeenLastCalledWith('/table/incident/inc456');
    });

    it('should accept both sysparm_limit and limit', async () => {
      const freshConnector = new ServiceNowConnector();

      mockAxiosInstance.get.mockResolvedValue({
        data: { result: [] },
      });

      await freshConnector.initialize(mockOAuth2Config);

      // Test with sysparm_limit
      await freshConnector.executeAction('get_all_incidents', { sysparm_limit: 10 });
      expect(mockAxiosInstance.get).toHaveBeenLastCalledWith(
        '/table/incident',
        expect.objectContaining({
          params: expect.objectContaining({ sysparm_limit: 10 }),
        })
      );

      // Test with limit
      await freshConnector.executeAction('get_all_incidents', { limit: 20 });
      expect(mockAxiosInstance.get).toHaveBeenLastCalledWith(
        '/table/incident',
        expect.objectContaining({
          params: expect.objectContaining({ sysparm_limit: 20 }),
        })
      );
    });
  });
});
