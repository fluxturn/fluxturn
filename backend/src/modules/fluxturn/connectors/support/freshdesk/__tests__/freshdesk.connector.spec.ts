/**
 * Freshdesk Connector Tests
 *
 * Tests for the Freshdesk connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { FreshdeskConnector } from '../freshdesk.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('FreshdeskConnector', () => {
  let connector: FreshdeskConnector;
  const BASE_URL = 'https://mock-company.freshdesk.com/api/v2';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(FreshdeskConnector, 'freshdesk');
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
        .get('/agents/me')
        .reply(200, { id: 1, email: 'agent@example.com', name: 'Test Agent' });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/agents/me')
        .reply(401, { description: 'Unauthorized' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/agents/me')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Ticket Action Tests
  // ===========================================
  describe('create_ticket', () => {
    it('should create ticket successfully', async () => {
      const mockTicket = {
        id: 12345,
        subject: 'Test Ticket',
        description: 'Test description',
        status: 2,
        priority: 1,
        email: 'customer@example.com',
      };

      nock(BASE_URL)
        .post('/tickets')
        .reply(201, mockTicket);

      const result = await connector.executeAction('create_ticket', {
        subject: 'Test Ticket',
        description: 'Test description',
        email: 'customer@example.com',
        priority: 1,
        status: 2,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
        data: mockTicket,
      });
    });

    it('should handle validation error', async () => {
      nock(BASE_URL)
        .post('/tickets')
        .reply(400, {
          description: 'Validation failed',
          errors: [{ field: 'email', message: 'Invalid email' }],
        });

      const result = await connector.executeAction('create_ticket', {
        subject: 'Test',
        description: 'Test',
        email: 'invalid-email',
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Update Ticket Action Tests
  // ===========================================
  describe('update_ticket', () => {
    it('should update ticket successfully', async () => {
      const ticketId = 12345;
      const mockUpdatedTicket = {
        id: ticketId,
        subject: 'Updated Ticket',
        status: 3,
        priority: 2,
      };

      nock(BASE_URL)
        .put(`/tickets/${ticketId}`)
        .reply(200, mockUpdatedTicket);

      const result = await connector.executeAction('update_ticket', {
        ticket_id: ticketId,
        subject: 'Updated Ticket',
        status: 3,
        priority: 2,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });

    it('should handle ticket not found', async () => {
      const ticketId = 99999;

      nock(BASE_URL)
        .put(`/tickets/${ticketId}`)
        .reply(404, { description: 'Ticket not found' });

      const result = await connector.executeAction('update_ticket', {
        ticket_id: ticketId,
        status: 3,
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Tickets Action Tests
  // ===========================================
  describe('get_tickets', () => {
    it('should get tickets successfully', async () => {
      const mockTickets = [
        { id: 1, subject: 'Ticket 1', status: 2 },
        { id: 2, subject: 'Ticket 2', status: 3 },
      ];

      nock(BASE_URL)
        .get('/tickets')
        .reply(200, mockTickets);

      const result = await connector.executeAction('get_tickets', {});

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });

    it('should get tickets with filters', async () => {
      const mockTickets = [
        { id: 1, subject: 'Urgent Ticket', priority: 4 },
      ];

      nock(BASE_URL)
        .get('/tickets')
        .query({ priority: 4 })
        .reply(200, mockTickets);

      const result = await connector.executeAction('get_tickets', {
        priority: 4,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Search Tickets Action Tests
  // ===========================================
  describe('search_tickets', () => {
    it('should search tickets successfully', async () => {
      const mockResults = {
        total: 1,
        results: [
          { id: 1, subject: 'Bug Report', status: 2 },
        ],
      };

      nock(BASE_URL)
        .get('/search/tickets')
        .query({ query: 'bug' })
        .reply(200, mockResults);

      const result = await connector.executeAction('search_tickets', {
        query: 'bug',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Delete Ticket Action Tests
  // ===========================================
  describe('delete_ticket', () => {
    it('should delete ticket successfully', async () => {
      const ticketId = 12345;

      nock(BASE_URL)
        .delete(`/tickets/${ticketId}`)
        .reply(204);

      const result = await connector.executeAction('delete_ticket', {
        ticket_id: ticketId,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Create Contact Action Tests
  // ===========================================
  describe('create_contact', () => {
    it('should create contact successfully', async () => {
      const mockContact = {
        id: 67890,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      nock(BASE_URL)
        .post('/contacts')
        .reply(201, mockContact);

      const result = await connector.executeAction('create_contact', {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
        data: mockContact,
      });
    });
  });

  // ===========================================
  // Get Contact Action Tests
  // ===========================================
  describe('get_contact', () => {
    it('should get contact successfully', async () => {
      const contactId = 67890;
      const mockContact = {
        id: contactId,
        name: 'John Doe',
        email: 'john@example.com',
      };

      nock(BASE_URL)
        .get(`/contacts/${contactId}`)
        .reply(200, mockContact);

      const result = await connector.executeAction('get_contact', {
        contact_id: contactId,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Update Contact Action Tests
  // ===========================================
  describe('update_contact', () => {
    it('should update contact successfully', async () => {
      const contactId = 67890;
      const mockUpdatedContact = {
        id: contactId,
        name: 'Jane Doe',
        email: 'jane@example.com',
      };

      nock(BASE_URL)
        .put(`/contacts/${contactId}`)
        .reply(200, mockUpdatedContact);

      const result = await connector.executeAction('update_contact', {
        contact_id: contactId,
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Delete Contact Action Tests
  // ===========================================
  describe('delete_contact', () => {
    it('should delete contact successfully', async () => {
      const contactId = 67890;

      nock(BASE_URL)
        .delete(`/contacts/${contactId}`)
        .reply(204);

      const result = await connector.executeAction('delete_contact', {
        contact_id: contactId,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // List Contacts Action Tests
  // ===========================================
  describe('list_contacts', () => {
    it('should list contacts successfully', async () => {
      const mockContacts = [
        { id: 1, name: 'Contact 1', email: 'contact1@example.com' },
        { id: 2, name: 'Contact 2', email: 'contact2@example.com' },
      ];

      nock(BASE_URL)
        .get('/contacts')
        .reply(200, mockContacts);

      const result = await connector.executeAction('list_contacts', {});

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Unknown Action Test
  // ===========================================
  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });
});
