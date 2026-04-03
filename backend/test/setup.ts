/**
 * Global Jest Setup for Connector Testing
 *
 * This file is loaded before all tests run.
 * It configures nock to block all real HTTP requests.
 */
import nock from 'nock';

// Disable all real HTTP connections
beforeAll(() => {
  nock.disableNetConnect();
  // Allow localhost connections for NestJS testing
  nock.enableNetConnect('127.0.0.1');
  nock.enableNetConnect('localhost');
});

// Clean up mocks after each test
afterEach(() => {
  nock.cleanAll();
});

// Restore nock after all tests
afterAll(() => {
  nock.restore();
  nock.enableNetConnect();
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3000';
process.env.CONNECTOR_ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
