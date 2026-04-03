/**
 * Jira Webhook Controller Tests
 *
 * Tests for the Jira webhook event reception endpoint.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock the WorkflowService module to avoid ESM import chain issues
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

import { JiraWebhookController } from '../jira-webhook.controller';
import { JiraTriggerService } from '../jira-trigger.service';
import { WorkflowService } from '../../../../workflow/workflow.service';

describe('JiraWebhookController', () => {
  let controller: JiraWebhookController;
  let mockWorkflowService: any;
  let mockJiraTriggerService: any;

  const MOCK_WORKFLOW_ID = 'workflow-123';

  beforeEach(async () => {
    mockWorkflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    };

    mockJiraTriggerService = {
      shouldTrigger: jest.fn(),
      processWebhookEvent: jest.fn(),
      getActiveTrigger: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraWebhookController],
      providers: [
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: JiraTriggerService, useValue: mockJiraTriggerService },
      ],
    }).compile();

    controller = module.get<JiraWebhookController>(JiraWebhookController);
  });

  // ===========================================
  // Issue Event Tests
  // ===========================================
  describe('receiveWebhook - issue events', () => {
    const mockWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'jira',
              triggerId: 'issue_created',
            },
          },
        ],
      },
    };

    it('should process issue_created event and trigger workflow', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-123' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'issue_created',
        issue: { key: 'PROJ-123' },
      });

      const payload = {
        webhookEvent: 'jira:issue_created',
        issue: {
          id: '12345',
          key: 'PROJ-123',
          fields: {
            summary: 'Test issue',
            status: { name: 'To Do' },
          },
        },
        user: {
          accountId: 'user-123',
          displayName: 'Test User',
        },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        'webhook-id-123'
      );

      expect(result.success).toBe(true);
      expect(result.executionId).toBe('execution-123');
      expect(mockWorkflowService.executeWorkflow).toHaveBeenCalled();
    });

    it('should process issue_updated event correctly', async () => {
      const updatedWorkflow = {
        ...mockWorkflow,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'jira',
                triggerId: 'issue_updated',
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(updatedWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-456' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'issue_updated',
        issue: { key: 'PROJ-456' },
        changelog: { items: [{ field: 'status' }] },
      });

      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: {
          id: '45678',
          key: 'PROJ-456',
          fields: {
            summary: 'Updated issue',
            status: { name: 'In Progress' },
          },
        },
        changelog: {
          items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }],
        },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(null);

      const payload = {
        webhookEvent: 'jira:issue_created',
        issue: { key: 'PROJ-123' },
      };

      await expect(
        controller.receiveWebhook(MOCK_WORKFLOW_ID, payload as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no Jira trigger', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue({
        id: MOCK_WORKFLOW_ID,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: { connectorType: 'github' }, // Not Jira
            },
          ],
        },
      });

      const payload = {
        webhookEvent: 'jira:issue_created',
        issue: { key: 'PROJ-123' },
      };

      await expect(
        controller.receiveWebhook(MOCK_WORKFLOW_ID, payload as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // Comment Event Tests
  // ===========================================
  describe('receiveWebhook - comment events', () => {
    const mockCommentWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'jira',
              triggerId: 'comment_created',
            },
          },
        ],
      },
    };

    it('should process comment_created event correctly', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockCommentWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-comment' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'comment_created',
        comment: { body: 'Test comment' },
      });

      const payload = {
        webhookEvent: 'comment_created',
        comment: {
          id: 'comment-123',
          body: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Test comment' }] },
            ],
          },
          author: { accountId: 'user-123' },
        },
        issue: {
          id: '12345',
          key: 'PROJ-123',
        },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Sprint Event Tests
  // ===========================================
  describe('receiveWebhook - sprint events', () => {
    const mockSprintWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'jira',
              triggerId: 'sprint_started',
            },
          },
        ],
      },
    };

    it('should process sprint_started event correctly', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockSprintWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-sprint' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'sprint_started',
        sprint: { name: 'Sprint 1' },
      });

      const payload = {
        webhookEvent: 'sprint_started',
        sprint: {
          id: 'sprint-123',
          name: 'Sprint 1',
          state: 'active',
          startDate: '2024-01-01',
          endDate: '2024-01-14',
        },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Project Event Tests
  // ===========================================
  describe('receiveWebhook - project events', () => {
    const mockProjectWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'jira',
              triggerId: 'project_created',
            },
          },
        ],
      },
    };

    it('should process project_created event correctly', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockProjectWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-project' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'project_created',
        project: { key: 'NEWPROJ' },
      });

      const payload = {
        webhookEvent: 'project_created',
        project: {
          id: 'project-123',
          key: 'NEWPROJ',
          name: 'New Project',
        },
        user: {
          accountId: 'admin-123',
        },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Worklog Event Tests
  // ===========================================
  describe('receiveWebhook - worklog events', () => {
    const mockWorklogWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'jira',
              triggerId: 'worklog_created',
            },
          },
        ],
      },
    };

    it('should process worklog_created event correctly', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorklogWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-worklog' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'worklog_created',
        worklog: { timeSpent: '2h' },
      });

      const payload = {
        webhookEvent: 'worklog_created',
        worklog: {
          id: 'worklog-123',
          timeSpent: '2h',
          timeSpentSeconds: 7200,
          started: '2024-01-15T09:00:00.000+0000',
        },
        issue: {
          id: '12345',
          key: 'PROJ-123',
        },
        user: {
          accountId: 'user-123',
        },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Event Filtering Tests
  // ===========================================
  describe('receiveWebhook - event filtering', () => {
    it('should return success when event does not match trigger', async () => {
      const issueCreatedWorkflow = {
        id: MOCK_WORKFLOW_ID,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'jira',
                triggerId: 'issue_created', // Only issue_created
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(issueCreatedWorkflow);
      mockJiraTriggerService.shouldTrigger.mockReturnValue(false);

      const payload = {
        webhookEvent: 'jira:issue_deleted', // But we got issue_deleted
        issue: { key: 'PROJ-123' },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('does not match');
    });

    it('should trigger all events when no specific triggerId configured', async () => {
      const genericWorkflow = {
        id: MOCK_WORKFLOW_ID,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'jira',
                // No triggerId - should match all events
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(genericWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-generic' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(false); // Trigger service doesn't know
      mockJiraTriggerService.processWebhookEvent.mockReturnValue(null);

      const payload = {
        webhookEvent: 'jira:issue_updated',
        issue: {
          id: '12345',
          key: 'PROJ-123',
          fields: { summary: 'Test' },
        },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
      expect(mockWorkflowService.executeWorkflow).toHaveBeenCalled();
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('receiveWebhook - error handling', () => {
    const mockWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'jira',
              triggerId: 'issue_created',
            },
          },
        ],
      },
    };

    it('should handle execution errors gracefully', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockWorkflowService.executeWorkflow.mockRejectedValue(new Error('Execution failed'));
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'issue_created',
      });

      const payload = {
        webhookEvent: 'jira:issue_created',
        issue: { key: 'PROJ-123' },
      };

      // Should return 200 to Jira even on errors
      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });

    it('should handle nested canvas structure', async () => {
      const nestedWorkflow = {
        id: MOCK_WORKFLOW_ID,
        workflow: {
          canvas: {
            nodes: [
              {
                type: 'CONNECTOR_TRIGGER',
                data: {
                  connectorType: 'jira',
                  triggerId: 'issue_created',
                },
              },
            ],
          },
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(nestedWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-nested' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue({
        event: 'issue_created',
      });

      const payload = {
        webhookEvent: 'jira:issue_created',
        issue: { key: 'PROJ-123' },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // ADF Processing Tests
  // ===========================================
  describe('receiveWebhook - ADF processing', () => {
    const mockWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'jira',
              triggerId: 'issue_created',
            },
          },
        ],
      },
    };

    it('should extract text from ADF description', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-adf' });
      mockJiraTriggerService.shouldTrigger.mockReturnValue(true);
      mockJiraTriggerService.processWebhookEvent.mockReturnValue(null);

      const payload = {
        webhookEvent: 'jira:issue_created',
        issue: {
          id: '12345',
          key: 'PROJ-123',
          fields: {
            summary: 'Test issue with ADF',
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'This is a ' },
                    { type: 'text', text: 'test description', marks: [{ type: 'strong' }] },
                  ],
                },
              ],
            },
          },
        },
        user: { accountId: 'user-123' },
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any
      );

      expect(result.success).toBe(true);
      // The controller should have extracted text from ADF
      const executeCall = mockWorkflowService.executeWorkflow.mock.calls[0][0];
      expect(executeCall.input_data.jiraEvent).toBeDefined();
    });
  });
});
