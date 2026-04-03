/**
 * SendGrid Connector Tests
 *
 * Tests for the SendGrid connector actions using mocked SendGrid SDK.
 * Note: Only tests actions that are exposed in getMetadata().
 */
import { SendGridConnector } from '../sendgrid.connector';
import { ConnectorType, ConnectorCategory } from '../../../types';

// Mock the SendGrid SDK modules
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

jest.mock('@sendgrid/client', () => ({
  setApiKey: jest.fn(),
  request: jest.fn(),
}));

import * as sgMail from '@sendgrid/mail';
import * as sgClient from '@sendgrid/client';

// Get references to mocked functions
const mockSgMail = sgMail as jest.Mocked<typeof sgMail>;
const mockSgClient = sgClient as jest.Mocked<typeof sgClient>;

describe('SendGridConnector', () => {
  let connector: SendGridConnector;

  beforeEach(async () => {
    // Clear mock call history but keep implementations
    jest.clearAllMocks();

    // Create a fresh connector for each test
    connector = new SendGridConnector();
    await connector.initialize({
      id: `test-sendgrid-${Date.now()}`,
      name: 'Test SendGrid',
      type: ConnectorType.SENDGRID,
      category: ConnectorCategory.MARKETING,
      credentials: { apiKey: 'SG.mock-api-key' },
      settings: {},
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      (mockSgClient.request as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ statusCode: 200, body: { email: 'test@example.com' } }, {}])
      );

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with error', async () => {
      (mockSgClient.request as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Unauthorized'))
      );

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Contact Action Tests (exposed in metadata)
  // ===========================================
  describe('create_contact', () => {
    it('should create contact successfully', async () => {
      (mockSgClient.request as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ statusCode: 202, body: { job_id: 'job-123' } }, {}])
      );

      const result = await connector.executeAction('create_contact', {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.success).toBe(true);
    });

    it('should handle validation error', async () => {
      (mockSgClient.request as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Invalid email format'))
      );

      const result = await connector.executeAction('create_contact', {
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Campaign Action Tests (exposed in metadata)
  // ===========================================
  describe('create_campaign', () => {
    it('should create campaign successfully', async () => {
      (mockSgClient.request as jest.Mock).mockImplementation(() =>
        Promise.resolve([
          {
            statusCode: 201,
            body: {
              id: 'campaign-123',
              name: 'Test Campaign',
              status: 'draft',
            },
          },
          {},
        ])
      );

      const result = await connector.executeAction('create_campaign', {
        name: 'Test Campaign',
        subject: 'Test Subject',
        content: '<p>Test Content</p>',
        listIds: ['list-1'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle creation failure', async () => {
      (mockSgClient.request as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Failed to create campaign'))
      );

      const result = await connector.executeAction('create_campaign', {
        name: 'Test Campaign',
        subject: 'Test Subject',
        content: '<p>Test Content</p>',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Send Email Tests (exposed in metadata)
  // ===========================================
  describe('send_email', () => {
    it('should send email successfully', async () => {
      (mockSgMail.send as jest.Mock).mockImplementation(() =>
        Promise.resolve([{ statusCode: 202, headers: { 'x-message-id': 'msg-123' } }, {}])
      );

      const result = await connector.executeAction('send_email', {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test Subject',
        content: 'Test content',
      });

      expect(result.success).toBe(true);
    });

    it('should handle send email failure', async () => {
      (mockSgMail.send as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Failed to send email'))
      );

      const result = await connector.executeAction('send_email', {
        to: 'invalid@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        content: 'Test',
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

      expect(metadata.name).toBe('SendGrid');
      expect(metadata.actions).toBeDefined();
      expect(metadata.actions.length).toBeGreaterThanOrEqual(3);

      // Verify some expected actions are present
      const actionIds = metadata.actions.map((a) => a.id);
      expect(actionIds).toContain('send_email');
      expect(actionIds).toContain('create_contact');
      expect(actionIds).toContain('create_campaign');
    });

    it('should include trigger definitions', () => {
      const metadata = connector.getMetadata();

      expect(metadata.triggers).toBeDefined();
      expect(metadata.triggers.length).toBeGreaterThan(0);

      const triggerIds = metadata.triggers.map((t) => t.id);
      expect(triggerIds).toContain('email_delivered');
      expect(triggerIds).toContain('email_opened');
    });
  });
});
