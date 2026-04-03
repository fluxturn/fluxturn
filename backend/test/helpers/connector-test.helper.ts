/**
 * Connector Test Helper
 *
 * Provides utilities for testing connector implementations.
 */
import nock from 'nock';
import { BaseConnector } from '../../src/modules/fluxturn/connectors/base/base.connector';
import { getMockCredentials } from './mock-credentials';

export interface TestFixture {
  action: string;
  baseUrl: string;
  testCases: TestCase[];
}

export interface TestCase {
  name: string;
  input: Record<string, any>;
  mock: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    status: number;
    response: any;
    requestBody?: any;
  };
  expected: {
    success: boolean;
    data?: any;
    error?: any;
  };
}

export class ConnectorTestHelper {
  /**
   * Create and initialize a connector for testing (parameterless constructor)
   */
  static async createConnector<T extends BaseConnector>(
    ConnectorClass: new () => T,
    connectorName: string,
    customCredentials?: any
  ): Promise<T>;

  /**
   * Create and initialize a connector for testing (with constructor arguments)
   */
  static async createConnector<T extends BaseConnector>(
    ConnectorClass: new (...args: any[]) => T,
    connectorName: string,
    customCredentials?: any,
    constructorArgs?: any[]
  ): Promise<T>;

  /**
   * Implementation
   */
  static async createConnector<T extends BaseConnector>(
    ConnectorClass: new (...args: any[]) => T,
    connectorName: string,
    customCredentials?: any,
    constructorArgs?: any[]
  ): Promise<T> {
    // Create mock dependencies for connectors that need them
    const mockAuthUtils = {
      createAuthHeader: jest.fn().mockReturnValue('Bearer mock-token'),
      refreshToken: jest.fn().mockResolvedValue({ accessToken: 'new-token' }),
    };

    const mockApiUtils = {
      makeRequest: jest.fn().mockResolvedValue({ data: {} }),
      handleError: jest.fn(),
    };

    // If constructor args provided, use them; otherwise try with mocks
    const args = constructorArgs || [mockAuthUtils, mockApiUtils];

    let connector: T;
    try {
      // Try creating with args first (for connectors with dependencies)
      connector = new ConnectorClass(...args);
    } catch (error) {
      // If that fails, try without args (for connectors without dependencies)
      connector = new ConnectorClass();
    }

    await connector.initialize({
      id: `test-${connectorName}-${Date.now()}`,
      name: connectorName,
      type: connectorName as any, // Type cast for testing
      category: 'marketing' as any, // Default category for testing
      credentials: customCredentials || getMockCredentials(connectorName),
    } as any);

    return connector;
  }

  /**
   * Setup nock mock for an API endpoint
   */
  static mockApi(
    baseUrl: string,
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    path: string,
    response: { status: number; body: any },
    requestBody?: any
  ): nock.Scope {
    const scope = nock(baseUrl);

    if (requestBody) {
      return scope[method](path, requestBody).reply(response.status, response.body);
    }

    return scope[method](path).reply(response.status, response.body);
  }

  /**
   * Setup mock from test case definition
   */
  static setupMockFromTestCase(baseUrl: string, testCase: TestCase): nock.Scope {
    const method = testCase.mock.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

    return this.mockApi(
      baseUrl,
      method,
      testCase.mock.path,
      { status: testCase.mock.status, body: testCase.mock.response },
      testCase.mock.requestBody
    );
  }

  /**
   * Load fixture from a path (relative to connector's __tests__/fixtures)
   */
  static loadFixture<T = TestFixture>(fixturePath: string): T {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(fixturePath);
  }

  /**
   * Assert connector response matches expected output
   * Handles nested response structures where result.data may contain { success, data }
   *
   * Response structure:
   * - Success case: { success: true, data: { success: true, data: {...} } }
   * - Error case: { success: true, data: { success: false, error: {...} } }
   *
   * Note: executeAction wraps all results, so we check result.data.success for inner status
   */
  static assertResponse(actual: any, expected: { success: boolean; data?: any; error?: any }): void {
    // The inner success is in result.data.success (due to executeAction wrapping)
    // For error cases: result.success is true, but result.data.success is false
    const innerSuccess = actual.data?.success !== undefined ? actual.data.success : actual.success;
    expect(innerSuccess).toBe(expected.success);

    if (expected.data !== undefined) {
      // Handle nested data structure: result.data might be { success, data } or direct data
      const actualData = actual.data?.data !== undefined ? actual.data.data : actual.data;
      expect(actualData).toMatchObject(expected.data);
    }

    if (expected.error !== undefined) {
      // Error is in result.data.error or result.error
      const actualError = actual.data?.error !== undefined ? actual.data.error : actual.error;
      expect(actualError).toMatchObject(expected.error);
    }
  }

  /**
   * Run all test cases from a fixture
   */
  static async runFixtureTests(
    connector: BaseConnector,
    fixture: TestFixture,
    actionId?: string
  ): Promise<void> {
    const action = actionId || fixture.action;

    for (const testCase of fixture.testCases) {
      // Setup mock
      this.setupMockFromTestCase(fixture.baseUrl, testCase);

      // Execute action
      const result = await connector.executeAction(action, testCase.input);

      // Assert
      this.assertResponse(result, testCase.expected);

      // Clean mocks for next test case
      nock.cleanAll();
    }
  }

  /**
   * Create a mock HTTP interceptor that logs requests for debugging
   */
  static createDebugInterceptor(baseUrl: string): void {
    nock(baseUrl)
      .persist()
      .intercept(/.*/, 'GET')
      .reply(function (uri) {
        console.log(`[NOCK DEBUG] GET ${uri}`);
        console.log(`[NOCK DEBUG] Headers:`, this.req.headers);
        return [404, { error: 'No mock defined' }];
      })
      .intercept(/.*/, 'POST')
      .reply(function (uri, body) {
        console.log(`[NOCK DEBUG] POST ${uri}`);
        console.log(`[NOCK DEBUG] Body:`, body);
        return [404, { error: 'No mock defined' }];
      });
  }

  /**
   * Verify all expected HTTP calls were made
   */
  static verifyAllMocksCalled(): void {
    if (!nock.isDone()) {
      const pendingMocks = nock.pendingMocks();
      throw new Error(
        `Not all HTTP mocks were used. Pending mocks:\n${pendingMocks.join('\n')}`
      );
    }
  }
}
