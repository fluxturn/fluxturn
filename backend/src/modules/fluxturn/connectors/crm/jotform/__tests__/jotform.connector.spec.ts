/**
 * Jotform Connector Tests
 *
 * Tests for the Jotform connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { JotformConnector } from '../jotform.connector';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import { getMockCredentials } from '@test/helpers/mock-credentials';

describe('JotformConnector', () => {
  let connector: JotformConnector;
  const BASE_URL = 'https://api.jotform.com';

  // Helper to create a new connector for each test
  const createConnector = async () => {
    nock.cleanAll();

    // Mock the /user request that happens during initialization
    nock(BASE_URL)
      .get('/user')
      .reply(200, {
        responseCode: 200,
        message: 'success',
        content: {
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User'
        }
      });

    // Create mock dependencies
    const httpService = new HttpService(axios as any);
    const authUtils = new AuthUtils(httpService);
    const apiUtils = new ApiUtils(httpService);

    // Create connector with dependencies
    const newConnector = new JotformConnector(authUtils, apiUtils);

    // Initialize with mock credentials
    await newConnector.initialize({
      id: `test-jotform-${Date.now()}`,
      name: 'jotform',
      type: 'jotform' as any,
      category: 'crm' as any,
      credentials: getMockCredentials('jotform'),
    } as any);

    // Clean nock for the actual test
    nock.cleanAll();

    return newConnector;
  };

  beforeEach(async () => {
    connector = await createConnector();
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
        .get('/user')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {
            username: 'testuser',
            email: 'test@example.com'
          }
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/user')
        .reply(401, {
          responseCode: 401,
          message: 'Invalid API Key'
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/user')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Get Form Action Tests
  // ===========================================
  describe('get_form', () => {
    it('gets form successfully', async () => {
      nock(BASE_URL)
        .get('/form/123456789012345')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {
            id: '123456789012345',
            username: 'testuser',
            title: 'Contact Form',
            status: 'ENABLED',
            created_at: '2024-01-15 10:00:00',
            updated_at: '2024-01-16 12:30:00',
            count: 150,
            new: 5,
            url: 'https://form.jotform.com/123456789012345'
          }
        });

      const result = await connector.executeAction('get_form', {
        formId: '123456789012345'
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('123456789012345');
      expect(data.title).toBe('Contact Form');
    });

    it('handles form not found', async () => {
      nock(BASE_URL)
        .get('/form/nonexistent')
        .reply(404, {
          responseCode: 404,
          message: 'Form not found'
        });

      const result = await connector.executeAction('get_form', {
        formId: 'nonexistent'
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // List Forms Action Tests
  // ===========================================
  describe('list_forms', () => {
    it('lists forms successfully', async () => {
      nock(BASE_URL)
        .get('/user/forms')
        .query(true)
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: [
            {
              id: 'form-1',
              title: 'Contact Form',
              status: 'ENABLED',
              count: 100,
              url: 'https://form.jotform.com/form-1'
            },
            {
              id: 'form-2',
              title: 'Survey Form',
              status: 'ENABLED',
              count: 50,
              url: 'https://form.jotform.com/form-2'
            }
          ]
        });

      const result = await connector.executeAction('list_forms', {
        limit: 20,
        offset: 0
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.forms).toHaveLength(2);
    });

    it('handles empty result', async () => {
      nock(BASE_URL)
        .get('/user/forms')
        .query(true)
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: []
        });

      const result = await connector.executeAction('list_forms', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.forms).toHaveLength(0);
    });
  });

  // ===========================================
  // Get Form Questions Action Tests
  // ===========================================
  describe('get_form_questions', () => {
    it('gets form questions successfully', async () => {
      nock(BASE_URL)
        .get('/form/123456789012345/questions')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {
            '1': {
              qid: '1',
              name: 'name',
              text: 'Full Name',
              type: 'control_fullname',
              order: '1',
              required: 'Yes'
            },
            '2': {
              qid: '2',
              name: 'email',
              text: 'Email Address',
              type: 'control_email',
              order: '2',
              required: 'Yes'
            }
          }
        });

      const result = await connector.executeAction('get_form_questions', {
        formId: '123456789012345'
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.questions).toBeDefined();
    });

    it('handles form not found', async () => {
      nock(BASE_URL)
        .get('/form/nonexistent/questions')
        .reply(404, {
          responseCode: 404,
          message: 'Form not found'
        });

      const result = await connector.executeAction('get_form_questions', {
        formId: 'nonexistent'
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Form Submissions Action Tests
  // ===========================================
  describe('get_form_submissions', () => {
    it('gets form submissions successfully', async () => {
      nock(BASE_URL)
        .get('/form/123456789012345/submissions')
        .query(true)
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: [
            {
              id: 'sub-1',
              form_id: '123456789012345',
              ip: '192.168.1.1',
              created_at: '2024-01-15 10:00:00',
              status: 'ACTIVE',
              new: '1',
              answers: {
                '1': { name: 'name', answer: 'John Doe' },
                '2': { name: 'email', answer: 'john@example.com' }
              }
            }
          ]
        });

      const result = await connector.executeAction('get_form_submissions', {
        formId: '123456789012345'
      });

      expect(result.success).toBe(true);
    });

    it('handles empty submissions', async () => {
      nock(BASE_URL)
        .get('/form/empty-form/submissions')
        .query(true)
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: []
        });

      const result = await connector.executeAction('get_form_submissions', {
        formId: 'empty-form'
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Delete Form Action Tests
  // ===========================================
  describe('delete_form', () => {
    it('deletes form successfully', async () => {
      nock(BASE_URL)
        .delete('/form/123456789012345')
        .reply(200, {
          responseCode: 200,
          message: 'success'
        });

      const result = await connector.executeAction('delete_form', {
        formId: '123456789012345'
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.success).toBe(true);
    });

    it('handles form not found', async () => {
      nock(BASE_URL)
        .delete('/form/nonexistent')
        .reply(404, {
          responseCode: 404,
          message: 'Form not found'
        });

      const result = await connector.executeAction('delete_form', {
        formId: 'nonexistent'
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Submission Action Tests
  // ===========================================
  describe('get_submission', () => {
    it('gets submission successfully', async () => {
      nock(BASE_URL)
        .get('/submission/sub-123')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {
            id: 'sub-123',
            form_id: '123456789012345',
            ip: '192.168.1.1',
            created_at: '2024-01-15 10:00:00',
            status: 'ACTIVE',
            answers: {
              '1': { name: 'name', answer: 'John Doe' }
            }
          }
        });

      const result = await connector.executeAction('get_submission', {
        submissionId: 'sub-123'
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('sub-123');
    });

    it('handles submission not found', async () => {
      nock(BASE_URL)
        .get('/submission/nonexistent')
        .reply(404, {
          responseCode: 404,
          message: 'Submission not found'
        });

      const result = await connector.executeAction('get_submission', {
        submissionId: 'nonexistent'
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Create Submission Action Tests
  // ===========================================
  describe('create_submission', () => {
    it('creates submission successfully', async () => {
      nock(BASE_URL)
        .post('/form/123456789012345/submissions')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {
            submissionID: 'new-sub-123'
          }
        });

      const result = await connector.executeAction('create_submission', {
        formId: '123456789012345',
        submissionData: {
          q1_name: 'John Doe',
          q2_email: 'john@example.com'
        }
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.submissionID).toBe('new-sub-123');
    });

    it('handles validation error', async () => {
      nock(BASE_URL)
        .post('/form/123456789012345/submissions')
        .reply(400, {
          responseCode: 400,
          message: 'Required field missing'
        });

      const result = await connector.executeAction('create_submission', {
        formId: '123456789012345',
        submissionData: {}
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Update Submission Action Tests
  // ===========================================
  describe('update_submission', () => {
    it('updates submission successfully', async () => {
      nock(BASE_URL)
        .post('/submission/sub-123')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {}
        });

      const result = await connector.executeAction('update_submission', {
        submissionId: 'sub-123',
        submissionData: {
          q1_name: 'Jane Doe'
        }
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.success).toBe(true);
    });

    it('handles submission not found', async () => {
      nock(BASE_URL)
        .post('/submission/nonexistent')
        .reply(404, {
          responseCode: 404,
          message: 'Submission not found'
        });

      const result = await connector.executeAction('update_submission', {
        submissionId: 'nonexistent',
        submissionData: { q1_name: 'Test' }
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Delete Submission Action Tests
  // ===========================================
  describe('delete_submission', () => {
    it('deletes submission successfully', async () => {
      nock(BASE_URL)
        .delete('/submission/sub-123')
        .reply(200, {
          responseCode: 200,
          message: 'success'
        });

      const result = await connector.executeAction('delete_submission', {
        submissionId: 'sub-123'
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.success).toBe(true);
    });

    it('handles submission not found', async () => {
      nock(BASE_URL)
        .delete('/submission/nonexistent')
        .reply(404, {
          responseCode: 404,
          message: 'Submission not found'
        });

      const result = await connector.executeAction('delete_submission', {
        submissionId: 'nonexistent'
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get User Info Action Tests
  // ===========================================
  describe('get_user_info', () => {
    it('gets user info successfully', async () => {
      nock(BASE_URL)
        .get('/user')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {
            username: 'testuser',
            email: 'test@example.com',
            name: 'Test User',
            account_type: 'GOLD',
            status: 'ACTIVE',
            created_at: '2020-01-01'
          }
        });

      const result = await connector.executeAction('get_user_info', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.username).toBe('testuser');
      expect(data.email).toBe('test@example.com');
    });

    it('handles unauthorized access', async () => {
      nock(BASE_URL)
        .get('/user')
        .reply(401, {
          responseCode: 401,
          message: 'Invalid API Key'
        });

      const result = await connector.executeAction('get_user_info', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get User Usage Action Tests
  // ===========================================
  describe('get_user_usage', () => {
    it('gets user usage successfully', async () => {
      nock(BASE_URL)
        .get('/user/usage')
        .reply(200, {
          responseCode: 200,
          message: 'success',
          content: {
            submissions: 500,
            ssl_submissions: 450,
            payments: 10,
            uploads: 1024000,
            api_calls: 250
          }
        });

      const result = await connector.executeAction('get_user_usage', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.submissions).toBe(500);
      expect(data.api_calls).toBe(250);
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
  // Rate Limiting Tests
  // ===========================================
  describe('rate limiting', () => {
    it('should handle 429 Too Many Requests', async () => {
      nock(BASE_URL)
        .get('/form/123456789012345')
        .reply(429, {
          responseCode: 429,
          message: 'Rate limit exceeded. Please try again later.'
        });

      const result = await connector.executeAction('get_form', {
        formId: '123456789012345'
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Server Error Tests
  // ===========================================
  describe('server errors', () => {
    it('should handle 500 Internal Server Error', async () => {
      nock(BASE_URL)
        .get('/form/123456789012345')
        .reply(500, {
          responseCode: 500,
          message: 'Internal server error'
        });

      const result = await connector.executeAction('get_form', {
        formId: '123456789012345'
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Webhook Processing Tests
  // ===========================================
  describe('processWebhook', () => {
    it('processes form submission webhook', async () => {
      const webhookPayload = {
        submissionID: 'webhook-sub-123',
        formID: '123456789012345',
        ip: '192.168.1.1',
        created_at: '2024-01-15 10:00:00',
        status: 'ACTIVE',
        answers: {
          'q1_name': 'John Doe',
          'q2_email': 'john@example.com'
        }
      };

      const events = await connector.processWebhook(webhookPayload, {});

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('jotform:form_submission');
      expect(events[0].data.submissionID).toBe('webhook-sub-123');
      expect(events[0].data.formID).toBe('123456789012345');
    });
  });
});
