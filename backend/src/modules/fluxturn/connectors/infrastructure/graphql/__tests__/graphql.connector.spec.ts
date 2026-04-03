/**
 * GraphQL Connector Tests
 */
import nock from 'nock';
import { GraphqlConnector } from '../graphql.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('GraphqlConnector', () => {
  let connector: GraphqlConnector;
  const MOCK_ENDPOINT = 'https://mock-graphql-api.com/graphql';

  beforeEach(async () => {
    nock.cleanAll();
    connector = await ConnectorTestHelper.createConnector(GraphqlConnector, 'graphql');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('testConnection', () => {
    it('should return success for stateless connector', async () => {
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });
  });

  describe('execute_query', () => {
    it('should execute a GraphQL query with POST request', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      };

      nock('https://mock-api.com')
        .post('/graphql')
        .reply(200, mockResponse);

      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'POST',
        requestFormat: 'json',
        query: 'query { user(id: "1") { id name email } }',
        responseFormat: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should execute a GraphQL query with variables', async () => {
      const mockResponse = {
        data: {
          post: {
            id: '123',
            title: 'Test Post'
          }
        }
      };

      nock('https://mock-api.com')
        .post('/graphql', (body: any) => {
          return body.variables && body.variables.id === '123';
        })
        .reply(200, mockResponse);

      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'POST',
        requestFormat: 'json',
        query: 'query getPost($id: ID!) { post(id: $id) { id title } }',
        variables: JSON.stringify({ id: '123' }),
        responseFormat: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should execute a GraphQL mutation', async () => {
      const mockResponse = {
        data: {
          createUser: {
            id: '456',
            name: 'New User',
            email: 'new@example.com'
          }
        }
      };

      nock('https://mock-api.com')
        .post('/graphql')
        .reply(200, mockResponse);

      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'POST',
        requestFormat: 'json',
        query: 'mutation { createUser(name: "New User", email: "new@example.com") { id name email } }',
        responseFormat: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should include custom headers in request', async () => {
      const mockResponse = { data: { success: true } };

      nock('https://mock-api.com', {
        reqheaders: {
          'Authorization': 'Bearer test-token',
          'X-Custom-Header': 'custom-value',
        },
      })
        .post('/graphql')
        .reply(200, mockResponse);

      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'POST',
        requestFormat: 'json',
        query: 'query { test }',
        headers: [
          { name: 'Authorization', value: 'Bearer test-token' },
          { name: 'X-Custom-Header', value: 'custom-value' }
        ],
        responseFormat: 'json',
      });

      expect(result.success).toBe(true);
    });

    it('should handle GraphQL errors in response', async () => {
      const mockResponse = {
        errors: [
          {
            message: 'Field "nonExistentField" doesn\'t exist on type "User"',
            locations: [{ line: 1, column: 10 }]
          }
        ],
        data: null
      };

      nock('https://mock-api.com')
        .post('/graphql')
        .reply(200, mockResponse);

      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'POST',
        requestFormat: 'json',
        query: 'query { user { nonExistentField } }',
        responseFormat: 'json',
      });

      // Should still return success=true as HTTP request succeeded
      // GraphQL errors are in the response
      expect(result.success).toBe(true);
      expect(result.data.errors).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      nock('https://mock-api.com')
        .post('/graphql')
        .reply(401, { error: 'Unauthorized' });

      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'POST',
        requestFormat: 'json',
        query: 'query { test }',
        responseFormat: 'json',
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle invalid JSON variables', async () => {
      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'POST',
        requestFormat: 'json',
        query: 'query test($id: ID!) { user(id: $id) { id } }',
        variables: '{invalid json}',
        responseFormat: 'json',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_VARIABLES');
    });

    it('should execute GET request with query parameter', async () => {
      const mockResponse = {
        data: { version: '1.0' }
      };

      nock('https://mock-api.com')
        .get('/graphql')
        .query(true)
        .reply(200, mockResponse);

      const result = await connector.executeAction('execute_query', {
        endpoint: 'https://mock-api.com/graphql',
        requestMethod: 'GET',
        query: 'query { version }',
        responseFormat: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
    });
  });
});
