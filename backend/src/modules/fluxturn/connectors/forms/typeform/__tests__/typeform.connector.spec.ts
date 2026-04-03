/**
 * Typeform Connector Tests
 *
 * Tests for the Typeform connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { TypeformConnector } from '../typeform.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import createFormFixture from './fixtures/create_form.json';
import getResponsesFixture from './fixtures/get_responses.json';

// Mock credentials for Typeform
const typeformCredentials = {
  access_token: 'mock-typeform-access-token',
};

describe('TypeformConnector', () => {
  let connector: TypeformConnector;
  const BASE_URL = 'https://api.typeform.com';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(
      TypeformConnector,
      'typeform',
      typeformCredentials
    );
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
        .get('/me')
        .reply(200, {
          user_id: 'user-123',
          email: 'test@example.com',
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/me')
        .reply(401, { description: 'Unauthorized' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/me')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Form Action Tests
  // ===========================================
  describe('create_form', () => {
    const fixture = createFormFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup mock
        nock(BASE_URL)
          .post('/forms')
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await connector.executeAction('create_form', testCase.input);

        // Assert
        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Get Responses Action Tests
  // ===========================================
  describe('get_responses', () => {
    const fixture = getResponsesFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup mock
        nock(BASE_URL)
          .get(`/forms/${testCase.input.form_id}/responses`)
          .query(true)
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await connector.executeAction('get_responses', testCase.input);

        // Assert
        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });

    it('should handle pagination parameters', async () => {
      nock(BASE_URL)
        .get('/forms/form-123/responses')
        .query({ page_size: 100, after: 'cursor-abc' })
        .reply(200, {
          total_items: 150,
          page_count: 2,
          items: [],
        });

      const result = await connector.executeAction('get_responses', {
        form_id: 'form-123',
        limit: 100,
        cursor: 'cursor-abc',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Update Form Action Tests
  // ===========================================
  describe('update_form', () => {
    it('should update form successfully', async () => {
      nock(BASE_URL)
        .put('/forms/form-to-update')
        .reply(200, {
          id: 'form-to-update',
          title: 'Updated Title',
        });

      const result = await connector.executeAction('update_form', {
        form_id: 'form-to-update',
        title: 'Updated Title',
      });

      expect(result.success).toBe(true);
    });

    it('should handle form not found', async () => {
      nock(BASE_URL)
        .put('/forms/nonexistent')
        .reply(404, {
          code: 'NOT_FOUND',
          description: 'Form not found',
        });

      const result = await connector.executeAction('update_form', {
        form_id: 'nonexistent',
        title: 'New Title',
      });

      expect(result.success).toBe(false);
    });

    it('should update form settings', async () => {
      nock(BASE_URL)
        .put('/forms/form-123')
        .reply(200, {
          id: 'form-123',
          title: 'Survey',
          settings: { is_public: false },
        });

      const result = await connector.executeAction('update_form', {
        form_id: 'form-123',
        settings: { is_public: false },
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Get Analytics Action Tests
  // ===========================================
  describe('get_analytics', () => {
    it('should get form analytics successfully', async () => {
      nock(BASE_URL)
        .get('/insights/form-123/summary')
        .reply(200, {
          visits: { total: 1000 },
          submissions: { total: 250 },
          completion_rate: 25.0,
          average_time: 180,
        });

      const result = await connector.executeAction('get_analytics', {
        form_id: 'form-123',
      });

      expect(result.success).toBe(true);
    });

    it('should handle analytics not available', async () => {
      nock(BASE_URL)
        .get('/insights/new-form/summary')
        .reply(404, {
          code: 'NOT_FOUND',
          description: 'Analytics not available yet',
        });

      const result = await connector.executeAction('get_analytics', {
        form_id: 'new-form',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return connector metadata with all actions', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Typeform');
      expect(metadata.actions).toBeDefined();
      expect(metadata.actions.length).toBeGreaterThanOrEqual(4);

      // Verify all expected actions are present
      const actionIds = metadata.actions.map((a) => a.id);
      expect(actionIds).toContain('create_form');
      expect(actionIds).toContain('get_responses');
      expect(actionIds).toContain('update_form');
      expect(actionIds).toContain('get_analytics');
    });

    it('should include trigger definitions', () => {
      const metadata = connector.getMetadata();

      expect(metadata.triggers).toBeDefined();
      expect(metadata.triggers.length).toBeGreaterThan(0);

      const triggerIds = metadata.triggers.map((t) => t.id);
      expect(triggerIds).toContain('form_response');
    });
  });
});
