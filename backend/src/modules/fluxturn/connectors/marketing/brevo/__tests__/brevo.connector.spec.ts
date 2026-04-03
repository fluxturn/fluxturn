/**
 * Brevo Connector Tests
 *
 * Tests for the Brevo connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { BrevoConnector } from '../brevo.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import createContactFixture from './fixtures/create_contact.json';
import sendEmailFixture from './fixtures/send_email.json';

describe('BrevoConnector', () => {
  let connector: BrevoConnector;
  const BASE_URL = 'https://api.brevo.com/v3';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(BrevoConnector, 'brevo');
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
        .get('/account')
        .reply(200, {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/account')
        .reply(401, { message: 'Unauthorized - Invalid API key' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/account')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Contact Action Tests
  // ===========================================
  describe('create_contact', () => {
    const fixture = createContactFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup mock
        nock(BASE_URL)
          .post('/contacts')
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await connector.executeAction('create_contact', testCase.input);

        // Assert
        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Get Contact Action Tests
  // ===========================================
  describe('get_contact', () => {
    it('should get contact by email successfully', async () => {
      const email = 'test@example.com';
      const mockContact = {
        email,
        id: 12345,
        attributes: { FIRSTNAME: 'John', LASTNAME: 'Doe' },
        listIds: [1, 2],
      };

      // Use regex to handle URL encoding
      nock(BASE_URL)
        .get(/\/contacts\/test.*example\.com/)
        .reply(200, mockContact);

      const result = await connector.executeAction('get_contact', {
        identifier: email,
      });

      expect(result.success).toBe(true);
      expect(result.data.data).toMatchObject(mockContact);
    });

    it('should get contact by ID successfully', async () => {
      const contactId = '12345';

      nock(BASE_URL)
        .get(`/contacts/${contactId}`)
        .reply(200, { id: 12345, email: 'test@example.com' });

      const result = await connector.executeAction('get_contact', {
        identifier: contactId,
      });

      expect(result.success).toBe(true);
    });

    it('should handle contact not found', async () => {
      // Use regex to handle URL encoding
      nock(BASE_URL)
        .get(/\/contacts\/nonexistent.*example\.com/)
        .reply(404, { code: 'document_not_found', message: 'Contact not found' });

      const result = await connector.executeAction('get_contact', {
        identifier: 'nonexistent@example.com',
      });

      // The connector wraps error responses - inner result has success: false
      // result.data = { success: false, error: {...} }
      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Update Contact Action Tests
  // ===========================================
  describe('update_contact', () => {
    it('should update contact attributes successfully', async () => {
      const email = 'test@example.com';

      // Use regex to handle URL encoding
      nock(BASE_URL)
        .put(/\/contacts\/test.*example\.com/)
        .reply(204);

      const result = await connector.executeAction('update_contact', {
        identifier: email,
        attributes: { FIRSTNAME: 'Updated', COMPANY: 'New Company' },
      });

      expect(result.success).toBe(true);
    });

    it('should handle update on non-existent contact', async () => {
      // Use regex to handle URL encoding
      nock(BASE_URL)
        .put(/\/contacts\/unknown.*example\.com/)
        .reply(404, { code: 'document_not_found', message: 'Contact not found' });

      const result = await connector.executeAction('update_contact', {
        identifier: 'unknown@example.com',
        attributes: { FIRSTNAME: 'Test' },
      });

      // The connector wraps error responses - inner result has success: false
      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Delete Contact Action Tests
  // ===========================================
  describe('delete_contact', () => {
    it('should delete contact successfully', async () => {
      const email = 'delete@example.com';

      // Use regex to handle URL encoding
      nock(BASE_URL)
        .delete(/\/contacts\/delete.*example\.com/)
        .reply(204);

      const result = await connector.executeAction('delete_contact', {
        identifier: email,
      });

      expect(result.success).toBe(true);
    });

    it('should handle deletion of non-existent contact', async () => {
      // Use regex to handle URL encoding
      nock(BASE_URL)
        .delete(/\/contacts\/unknown.*example\.com/)
        .reply(404, { code: 'document_not_found' });

      const result = await connector.executeAction('delete_contact', {
        identifier: 'unknown@example.com',
      });

      // The connector wraps error responses - inner result has success: false
      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Send Transactional Email Tests
  // ===========================================
  describe('send_transactional_email', () => {
    const fixture = sendEmailFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        nock(BASE_URL)
          .post('/smtp/email')
          .reply(testCase.mock.status, testCase.mock.response);

        const result = await connector.executeAction(
          'send_transactional_email',
          testCase.input
        );

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // List Operations Tests
  // ===========================================
  describe('get_lists', () => {
    it('should get all lists successfully', async () => {
      const mockLists = {
        lists: [
          { id: 1, name: 'Newsletter', totalSubscribers: 100 },
          { id: 2, name: 'Customers', totalSubscribers: 250 },
        ],
        count: 2,
      };

      nock(BASE_URL)
        .get('/contacts/lists')
        .query({ limit: 50 })  // offset=0 is falsy, not sent
        .reply(200, mockLists);

      const result = await connector.executeAction('get_lists', {
        limit: 50,
      });

      expect(result.success).toBe(true);
      // Result is wrapped: result.data = { success: true, data: [...] }
      const lists = result.data?.data !== undefined ? result.data.data : result.data;
      expect(lists).toHaveLength(2);
    });

    it('should handle empty lists', async () => {
      nock(BASE_URL)
        .get('/contacts/lists')
        .query(true)
        .reply(200, { lists: [], count: 0 });

      const result = await connector.executeAction('get_lists', {});

      expect(result.success).toBe(true);
      // Result is wrapped: result.data = { success: true, data: [] }
      const lists = result.data?.data !== undefined ? result.data.data : result.data;
      expect(lists).toHaveLength(0);
    });
  });

  describe('create_list', () => {
    it('should create a new list successfully', async () => {
      nock(BASE_URL)
        .post('/contacts/lists')
        .reply(201, { id: 10 });

      const result = await connector.executeAction('create_list', {
        name: 'New List',
        folderId: 1,
      });

      expect(result.success).toBe(true);
      // Result is wrapped: result.data = { success: true, data: { id: 10 } }
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toMatchObject({ id: 10 });
    });
  });

  // ===========================================
  // Sender Operations Tests
  // ===========================================
  describe('get_senders', () => {
    it('should get all senders successfully', async () => {
      const mockSenders = {
        senders: [
          { id: 1, name: 'Main Sender', email: 'noreply@company.com' },
          { id: 2, name: 'Support', email: 'support@company.com' },
        ],
      };

      nock(BASE_URL)
        .get('/senders')
        .query(true)
        .reply(200, mockSenders);

      const result = await connector.executeAction('get_senders', {});

      expect(result.success).toBe(true);
      // Result is wrapped: result.data = { success: true, data: [...] }
      const senders = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(senders)).toBe(true);
    });
  });

  // ===========================================
  // Account Information Tests
  // ===========================================
  describe('get_account', () => {
    it('should get account information successfully', async () => {
      const mockAccount = {
        email: 'admin@company.com',
        firstName: 'Admin',
        lastName: 'User',
        companyName: 'Test Company',
        plan: [{ type: 'free' }],
      };

      nock(BASE_URL).get('/account').reply(200, mockAccount);

      const result = await connector.executeAction('get_account', {});

      expect(result.success).toBe(true);
      // Check nested data structure
      expect(result.data.data || result.data).toMatchObject(mockAccount);
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
});
