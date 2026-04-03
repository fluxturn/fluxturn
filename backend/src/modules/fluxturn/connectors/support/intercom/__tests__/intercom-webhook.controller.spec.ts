/**
 * Intercom Webhook Controller Tests
 *
 * Tests for the Intercom webhook controller that receives and processes
 * webhook events from Intercom.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { IntercomWebhookController } from '../intercom-webhook.controller';
import { WorkflowService } from '../../../../workflow/workflow.service';

// Mock WorkflowService to avoid ESM import issues
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

describe('IntercomWebhookController', () => {
  let controller: IntercomWebhookController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';
  const mockExecutionId = 'execution-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntercomWebhookController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            getWorkflow: jest.fn(),
            executeWorkflow: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IntercomWebhookController>(IntercomWebhookController);
    workflowService = module.get(WorkflowService);
  });

  // ===========================================
  // Conversation Webhook Tests
  // ===========================================
  describe('receiveWebhook - conversation events', () => {
    it('should process conversation.user.created event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.user.created',
          id: 'delivery-123',
          app_id: 'app-123',
          data: {
            item: {
              id: 'conv-123',
              type: 'conversation',
              state: 'open',
              created_at: 1234567890,
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('conversation_opened');
      expect(result.executionId).toBe(mockExecutionId);
      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: mockWorkflowId,
        }),
      );
    });

    it('should process conversation.admin.closed event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.admin.closed',
          id: 'delivery-124',
          app_id: 'app-123',
          data: {
            item: {
              id: 'conv-124',
              type: 'conversation',
              state: 'closed',
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('conversation_closed');
    });

    it('should process conversation.user.replied event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.user.replied',
          id: 'delivery-125',
          app_id: 'app-123',
          data: {
            item: {
              id: 'conv-125',
              type: 'conversation',
              conversation_parts: [{ body: 'Hello!' }],
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('conversation_replied');
    });

    it('should process conversation.admin.assigned event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.admin.assigned',
          id: 'delivery-126',
          app_id: 'app-123',
          data: {
            item: {
              id: 'conv-126',
              assignee: { id: 'admin-123', type: 'admin' },
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('conversation_assigned');
    });
  });

  // ===========================================
  // User/Contact Webhook Tests
  // ===========================================
  describe('receiveWebhook - user events', () => {
    it('should process contact.user.created event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'contact.user.created',
          id: 'delivery-130',
          app_id: 'app-123',
          data: {
            item: {
              id: 'user-123',
              type: 'user',
              email: 'user@example.com',
              name: 'John Doe',
              created_at: 1234567890,
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('user_created');
    });

    it('should process user.created event (legacy format)', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'user.created',
          id: 'delivery-131',
          app_id: 'app-123',
          data: {
            id: 'user-124',
            email: 'newuser@example.com',
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('user_created');
    });

    it('should process contact.tag.created event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'contact.tag.created',
          id: 'delivery-132',
          app_id: 'app-123',
          data: {
            item: {
              id: 'user-125',
              tags: [{ id: 'tag-1', name: 'VIP' }],
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('user_tag_added');
    });

    it('should process contact.user.unsubscribed event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'contact.user.unsubscribed',
          id: 'delivery-133',
          app_id: 'app-123',
          data: {
            item: {
              id: 'user-126',
              unsubscribed_from_emails: true,
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('user_unsubscribed');
    });
  });

  // ===========================================
  // Workflow Validation Tests
  // ===========================================
  describe('workflow validation', () => {
    it('should return error when workflow not found', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce(null);

      const result = await controller.receiveWebhook(
        'non-existent-workflow',
        {
          topic: 'conversation.user.created',
          id: 'delivery-200',
          app_id: 'app-123',
          data: { item: { id: 'conv-200' } },
        },
        {},
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Workflow not found');
    });

    it('should skip when workflow is not active', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: false,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.user.created',
          id: 'delivery-201',
          app_id: 'app-123',
          data: { item: { id: 'conv-201' } },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.message).toContain('not active');
      expect(workflowService.executeWorkflow).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // Deduplication Tests
  // ===========================================
  describe('deduplication', () => {
    it('should skip duplicate events within TTL', async () => {
      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);

      const payload = {
        topic: 'conversation.user.created',
        id: 'delivery-300',
        app_id: 'app-123',
        data: {
          item: {
            id: 'conv-300',
          },
        },
      };

      // First call should process
      const result1 = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result1.success).toBe(true);
      expect(result1.executionId).toBe(mockExecutionId);

      // Second call with same payload should be skipped
      const result2 = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result2.success).toBe(true);
      expect(result2.skipped).toBe(true);
      expect(result2.message).toContain('Duplicate');
    });

    it('should process events with different delivery IDs', async () => {
      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);

      // First event
      const result1 = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.user.created',
          id: 'delivery-301',
          app_id: 'app-123',
          data: { item: { id: 'conv-301' } },
        },
        {},
      );

      // Second event with different delivery ID
      const result2 = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.user.created',
          id: 'delivery-302',
          app_id: 'app-123',
          data: { item: { id: 'conv-302' } },
        },
        {},
      );

      expect(result1.success).toBe(true);
      expect(result1.executionId).toBeDefined();
      expect(result2.success).toBe(true);
      expect(result2.executionId).toBeDefined();
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
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
        {
          topic: 'conversation.user.created',
          id: 'delivery-400',
          app_id: 'app-123',
          data: { item: { id: 'conv-400' } },
        },
        {},
      );

      // Returns 200 to prevent Intercom retries
      expect(result.success).toBe(false);
      expect(result.message).toContain('Execution failed');
    });

    it('should handle unknown webhook topics', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'unknown.event.type',
          id: 'delivery-401',
          app_id: 'app-123',
          data: { item: { id: 'unknown-item' } },
        },
        {},
      );

      // Should still process unknown topics
      expect(result.success).toBe(true);
      expect(result.triggerId).toBeUndefined();
    });

    it('should handle missing payload fields', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {}, // Empty payload
        {},
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Event Data Preparation Tests
  // ===========================================
  describe('event data preparation', () => {
    it('should include conversation fields in event data', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      let capturedInput: any;
      workflowService.executeWorkflow.mockImplementationOnce((input) => {
        capturedInput = input;
        return Promise.resolve({ id: mockExecutionId });
      });

      await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'conversation.user.created',
          id: 'delivery-500',
          app_id: 'app-123',
          data: {
            item: {
              id: 'conv-500',
              type: 'conversation',
              state: 'open',
              created_at: 1234567890,
              source: { type: 'email' },
              contacts: [{ id: 'user-1' }],
              assignee: { id: 'admin-1' },
            },
          },
        },
        {},
      );

      expect(capturedInput.input_data.intercomEvent).toBeDefined();
      expect(capturedInput.input_data.intercomEvent.conversation).toBeDefined();
      expect(capturedInput.input_data.intercomEvent.conversation.id).toBe('conv-500');
      expect(capturedInput.input_data.intercomEvent.conversation.state).toBe('open');
    });

    it('should include user fields for user events', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      let capturedInput: any;
      workflowService.executeWorkflow.mockImplementationOnce((input) => {
        capturedInput = input;
        return Promise.resolve({ id: mockExecutionId });
      });

      await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'contact.user.created',
          id: 'delivery-501',
          app_id: 'app-123',
          data: {
            item: {
              id: 'user-501',
              type: 'user',
              email: 'newuser@example.com',
              name: 'New User',
              custom_attributes: { plan: 'pro' },
            },
          },
        },
        {},
      );

      expect(capturedInput.input_data.intercomEvent.user).toBeDefined();
      expect(capturedInput.input_data.intercomEvent.user.email).toBe('newuser@example.com');
      expect(capturedInput.input_data.intercomEvent.user.custom_attributes).toEqual({ plan: 'pro' });
    });
  });

  // ===========================================
  // Company Event Tests
  // ===========================================
  describe('receiveWebhook - company events', () => {
    it('should process company.created event', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      let capturedInput: any;
      workflowService.executeWorkflow.mockImplementationOnce((input) => {
        capturedInput = input;
        return Promise.resolve({ id: mockExecutionId });
      });

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        {
          topic: 'company.created',
          id: 'delivery-600',
          app_id: 'app-123',
          data: {
            item: {
              id: 'company-123',
              type: 'company',
              company_id: 'ext-company-123',
              name: 'Acme Corp',
              plan: { name: 'Enterprise' },
              user_count: 50,
            },
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(capturedInput.input_data.intercomEvent.company).toBeDefined();
      expect(capturedInput.input_data.intercomEvent.company.name).toBe('Acme Corp');
    });
  });
});
