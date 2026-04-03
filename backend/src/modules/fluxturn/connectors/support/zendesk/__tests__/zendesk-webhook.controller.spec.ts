/**
 * Zendesk Webhook Controller Tests
 *
 * Tests for the Zendesk webhook controller that handles incoming events.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ZendeskWebhookController } from '../zendesk-webhook.controller';

// Mock WorkflowService to avoid ESM import issues with @octokit/rest
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

import { WorkflowService } from '../../../../workflow/workflow.service';

describe('ZendeskWebhookController', () => {
  let controller: ZendeskWebhookController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';
  const mockExecutionId = 'execution-456';

  beforeEach(async () => {
    workflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZendeskWebhookController],
      providers: [{ provide: WorkflowService, useValue: workflowService }],
    }).compile();

    controller = module.get<ZendeskWebhookController>(ZendeskWebhookController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Basic Webhook Processing Tests
  // ===========================================
  describe('receiveWebhook', () => {
    const mockTicketPayload = {
      type: 'zen:event-type:ticket.created',
      ticket: {
        id: 123,
        subject: 'Test Ticket',
        description: 'Test description',
        status: 'open',
        priority: 'high',
        requester_id: 456,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    };

    const mockHeaders = {
      'x-zendesk-webhook-id': 'webhook-123',
    };

    it('should process webhook successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        mockTicketPayload,
        mockHeaders,
      );

      expect(result.success).toBe(true);
      expect(result.executionId).toBe(mockExecutionId);
      expect(result.triggerId).toBe('ticket_created');
      expect(workflowService.getWorkflow).toHaveBeenCalledWith(mockWorkflowId);
      expect(workflowService.executeWorkflow).toHaveBeenCalledWith({
        workflow_id: mockWorkflowId,
        input_data: expect.objectContaining({
          trigger: 'ticket_created',
          eventType: 'zen:event-type:ticket.created',
        }),
      });
    });

    it('should return error when workflow not found', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce(null);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        mockTicketPayload,
        mockHeaders,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Workflow not found');
      expect(workflowService.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should skip when workflow is not active', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: false,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        mockTicketPayload,
        mockHeaders,
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.message).toBe('Workflow not active');
      expect(workflowService.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should handle workflow execution errors gracefully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockRejectedValueOnce(
        new Error('Execution failed'),
      );

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        mockTicketPayload,
        mockHeaders,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Execution failed');
    });
  });

  // ===========================================
  // Deduplication Tests
  // ===========================================
  describe('deduplication', () => {
    const mockPayload = {
      type: 'zen:event-type:ticket.created',
      ticket: { id: 123 },
    };

    const mockHeaders = {
      'x-zendesk-webhook-id': 'duplicate-webhook-123',
    };

    it('should skip duplicate events', async () => {
      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);

      // First call should succeed
      const result1 = await controller.receiveWebhook(
        mockWorkflowId,
        mockPayload,
        mockHeaders,
      );

      expect(result1.success).toBe(true);
      expect(result1.skipped).toBeUndefined();

      // Second call with same event should be skipped
      const result2 = await controller.receiveWebhook(
        mockWorkflowId,
        mockPayload,
        mockHeaders,
      );

      expect(result2.success).toBe(true);
      expect(result2.skipped).toBe(true);
      expect(result2.message).toBe('Duplicate event');

      // executeWorkflow should only be called once
      expect(workflowService.executeWorkflow).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================
  // Event Type Mapping Tests
  // ===========================================
  describe('event type mapping', () => {
    beforeEach(() => {
      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);
    });

    it('should map ticket.created event correctly', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:ticket.created', ticket: { id: 1 } },
        { 'x-zendesk-webhook-id': 'wh-1' },
      );

      expect(result.triggerId).toBe('ticket_created');
    });

    it('should map ticket.updated event correctly', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:ticket.updated', ticket: { id: 2 } },
        { 'x-zendesk-webhook-id': 'wh-2' },
      );

      expect(result.triggerId).toBe('ticket_updated');
    });

    it('should map ticket.changed event correctly', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:ticket.changed', ticket: { id: 3 } },
        { 'x-zendesk-webhook-id': 'wh-3' },
      );

      expect(result.triggerId).toBe('ticket_updated');
    });

    it('should map ticket.status.changed.solved event correctly', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:ticket.status.changed.solved', ticket: { id: 4 } },
        { 'x-zendesk-webhook-id': 'wh-4' },
      );

      expect(result.triggerId).toBe('ticket_solved');
    });

    it('should map user.created event correctly', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:user.created', user: { id: 5 } },
        { 'x-zendesk-webhook-id': 'wh-5' },
      );

      expect(result.triggerId).toBe('user_created');
    });

    it('should map organization.created event correctly', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:organization.created', organization: { id: 6 } },
        { 'x-zendesk-webhook-id': 'wh-6' },
      );

      expect(result.triggerId).toBe('organization_created');
    });
  });

  // ===========================================
  // Trigger Inference Tests
  // ===========================================
  describe('trigger inference from payload', () => {
    beforeEach(() => {
      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);
    });

    it('should infer ticket_solved from payload with solved status', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          type: 'unknown',
          ticket: { id: 1, status: 'solved' },
        },
        { 'x-zendesk-webhook-id': 'wh-infer-1' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            trigger: 'ticket_solved',
          }),
        }),
      );
    });

    it('should infer ticket_created when created_at equals updated_at', async () => {
      const timestamp = '2024-01-01T00:00:00Z';
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          type: 'unknown',
          ticket: {
            id: 2,
            status: 'open',
            created_at: timestamp,
            updated_at: timestamp,
          },
        },
        { 'x-zendesk-webhook-id': 'wh-infer-2' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            trigger: 'ticket_created',
          }),
        }),
      );
    });

    it('should infer ticket_updated when created_at differs from updated_at', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          type: 'unknown',
          ticket: {
            id: 3,
            status: 'open',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        },
        { 'x-zendesk-webhook-id': 'wh-infer-3' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            trigger: 'ticket_updated',
          }),
        }),
      );
    });

    it('should infer user_created from user payload', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          type: 'unknown',
          user: { id: 4, name: 'Test User' },
        },
        { 'x-zendesk-webhook-id': 'wh-infer-4' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            trigger: 'user_created',
          }),
        }),
      );
    });

    it('should infer organization_created from organization payload', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          type: 'unknown',
          organization: { id: 5, name: 'Test Org' },
        },
        { 'x-zendesk-webhook-id': 'wh-infer-5' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            trigger: 'organization_created',
          }),
        }),
      );
    });
  });

  // ===========================================
  // Event Data Preparation Tests
  // ===========================================
  describe('event data preparation', () => {
    beforeEach(() => {
      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);
    });

    it('should prepare ticket event data correctly', async () => {
      const ticketPayload = {
        type: 'zen:event-type:ticket.created',
        ticket: {
          id: 123,
          subject: 'Test Ticket',
          description: 'Test description',
          status: 'open',
          priority: 'high',
          requester_id: 456,
          assignee_id: 789,
          tags: ['tag1', 'tag2'],
          created_at: '2024-01-01T00:00:00Z',
        },
        requester: {
          id: 456,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      await controller.receiveWebhook(
        mockWorkflowId,
        ticketPayload,
        { 'x-zendesk-webhook-id': 'wh-data-1' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith({
        workflow_id: mockWorkflowId,
        input_data: expect.objectContaining({
          zendeskEvent: expect.objectContaining({
            ticket: expect.objectContaining({
              id: 123,
              subject: 'Test Ticket',
              status: 'open',
              priority: 'high',
              requester_id: 456,
              assignee_id: 789,
              tags: ['tag1', 'tag2'],
            }),
            requester: expect.objectContaining({
              id: 456,
              name: 'John Doe',
              email: 'john@example.com',
            }),
          }),
        }),
      });
    });

    it('should prepare user event data correctly', async () => {
      const userPayload = {
        type: 'zen:event-type:user.created',
        user: {
          id: 456,
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'end-user',
          organization_id: 789,
          verified: true,
        },
      };

      await controller.receiveWebhook(
        mockWorkflowId,
        userPayload,
        { 'x-zendesk-webhook-id': 'wh-data-2' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith({
        workflow_id: mockWorkflowId,
        input_data: expect.objectContaining({
          zendeskEvent: expect.objectContaining({
            user: expect.objectContaining({
              id: 456,
              name: 'Jane Doe',
              email: 'jane@example.com',
              role: 'end-user',
              organization_id: 789,
              verified: true,
            }),
          }),
        }),
      });
    });

    it('should prepare organization event data correctly', async () => {
      const orgPayload = {
        type: 'zen:event-type:organization.created',
        organization: {
          id: 789,
          name: 'Acme Corp',
          details: 'Test organization',
          domain_names: ['acme.com'],
          tags: ['enterprise'],
        },
      };

      await controller.receiveWebhook(
        mockWorkflowId,
        orgPayload,
        { 'x-zendesk-webhook-id': 'wh-data-3' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith({
        workflow_id: mockWorkflowId,
        input_data: expect.objectContaining({
          zendeskEvent: expect.objectContaining({
            organization: expect.objectContaining({
              id: 789,
              name: 'Acme Corp',
              details: 'Test organization',
              domain_names: ['acme.com'],
              tags: ['enterprise'],
            }),
          }),
        }),
      });
    });

    it('should handle unknown event types with raw data', async () => {
      const unknownPayload = {
        type: 'zen:event-type:unknown',
        custom_data: { foo: 'bar' },
      };

      await controller.receiveWebhook(
        mockWorkflowId,
        unknownPayload,
        { 'x-zendesk-webhook-id': 'wh-data-4' },
      );

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith({
        workflow_id: mockWorkflowId,
        input_data: expect.objectContaining({
          zendeskEvent: expect.objectContaining({
            raw_data: unknownPayload,
          }),
        }),
      });
    });
  });

  // ===========================================
  // Edge Cases Tests
  // ===========================================
  describe('edge cases', () => {
    beforeEach(() => {
      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);
    });

    it('should handle missing event type', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { ticket: { id: 1 } },
        { 'x-zendesk-webhook-id': 'wh-edge-1' },
      );

      expect(result.success).toBe(true);
    });

    it('should handle missing webhook ID header', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:ticket.created', ticket: { id: 2 } },
        {},
      );

      expect(result.success).toBe(true);
    });

    it('should handle empty payload', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {},
        { 'x-zendesk-webhook-id': 'wh-edge-3' },
      );

      expect(result.success).toBe(true);
    });

    it('should handle null ticket in payload', async () => {
      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'zen:event-type:ticket.created', ticket: null },
        { 'x-zendesk-webhook-id': 'wh-edge-4' },
      );

      expect(result.success).toBe(true);
    });
  });
});
