/**
 * Segment Webhook Controller Tests
 *
 * Tests for the Segment webhook controller that handles incoming events.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { SegmentWebhookController } from '../segment-webhook.controller';

// Mock WorkflowService to avoid ESM import issues with @octokit/rest
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

import { WorkflowService } from '../../../../workflow/workflow.service';

describe('SegmentWebhookController', () => {
  let controller: SegmentWebhookController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';
  const mockExecutionId = 'execution-456';

  beforeEach(async () => {
    workflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SegmentWebhookController],
      providers: [{ provide: WorkflowService, useValue: workflowService }],
    }).compile();

    controller = module.get<SegmentWebhookController>(SegmentWebhookController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Track Event Tests
  // ===========================================
  describe('track event', () => {
    const trackPayload = {
      type: 'track',
      event: 'Order Completed',
      userId: 'user-123',
      messageId: 'msg-123',
      timestamp: new Date().toISOString(),
      properties: {
        orderId: 'order-456',
        total: 99.99,
      },
      context: {
        library: { name: 'analytics.js', version: '4.1.0' },
      },
    };

    it('should process track event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, trackPayload, {});

      expect(result.success).toBe(true);
      expect(result.executionId).toBe(mockExecutionId);
      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: mockWorkflowId,
          input_data: expect.objectContaining({
            eventType: 'track',
            eventName: 'Order Completed',
          }),
        }),
      );
    });
  });

  // ===========================================
  // Audience Event Tests
  // ===========================================
  describe('audience events', () => {
    const audienceEnteredPayload = {
      type: 'track',
      event: 'Audience Entered',
      userId: 'user-123',
      messageId: 'msg-123',
      timestamp: new Date().toISOString(),
      properties: {
        audience_key: 'audience-456',
        audience_name: 'High Value Customers',
      },
      context: {
        personas: {
          computation_id: 'audience-456',
        },
      },
    };

    const audienceExitedPayload = {
      type: 'track',
      event: 'Audience Exited',
      userId: 'user-123',
      messageId: 'msg-124',
      timestamp: new Date().toISOString(),
      properties: {
        audience_key: 'audience-456',
        audience_name: 'High Value Customers',
      },
    };

    it('should process audience_entered event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, audienceEnteredPayload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('audience_entered');
    });

    it('should process audience_exited event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, audienceExitedPayload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('audience_exited');
    });
  });

  // ===========================================
  // Identify Event Tests
  // ===========================================
  describe('identify event', () => {
    const identifyPayload = {
      type: 'identify',
      userId: 'user-123',
      messageId: 'msg-125',
      timestamp: new Date().toISOString(),
      traits: {
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    it('should process identify event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, identifyPayload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('identify_user');
    });
  });

  // ===========================================
  // Page Event Tests
  // ===========================================
  describe('page event', () => {
    const pagePayload = {
      type: 'page',
      name: 'Home',
      userId: 'user-123',
      messageId: 'msg-126',
      timestamp: new Date().toISOString(),
      properties: {
        url: 'https://example.com',
        title: 'Home Page',
      },
    };

    it('should process page event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, pagePayload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('page_view');
    });
  });

  // ===========================================
  // Workflow Not Found Tests
  // ===========================================
  describe('workflow not found', () => {
    it('should return error when workflow not found', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce(null);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'track', event: 'Test', messageId: 'msg-999' },
        {},
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Workflow not found');
    });
  });

  // ===========================================
  // Inactive Workflow Tests
  // ===========================================
  describe('inactive workflow', () => {
    it('should skip processing when workflow is inactive', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: false,
      } as any);

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'track', event: 'Test', messageId: 'msg-998' },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.message).toContain('not active');
    });
  });

  // ===========================================
  // Deduplication Tests
  // ===========================================
  describe('deduplication', () => {
    it('should skip duplicate events', async () => {
      const payload = {
        type: 'track',
        event: 'Test Event',
        userId: 'user-123',
        messageId: 'duplicate-msg-123',
      };

      workflowService.getWorkflow.mockResolvedValue({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValue({
        id: mockExecutionId,
      } as any);

      // First call should process
      const result1 = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result1.success).toBe(true);
      expect(result1.skipped).toBeUndefined();

      // Second call with same messageId should be skipped
      const result2 = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result2.success).toBe(true);
      expect(result2.skipped).toBe(true);
      expect(result2.message).toContain('Duplicate');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('should handle workflow service errors gracefully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockRejectedValueOnce(new Error('Execution failed'));

      const result = await controller.receiveWebhook(
        mockWorkflowId,
        { type: 'track', event: 'Test', messageId: 'msg-997' },
        {},
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Execution failed');
    });
  });

  // ===========================================
  // Group Event Tests
  // ===========================================
  describe('group event', () => {
    const groupPayload = {
      type: 'group',
      userId: 'user-123',
      groupId: 'group-456',
      messageId: 'msg-127',
      timestamp: new Date().toISOString(),
      traits: {
        name: 'Acme Inc',
        industry: 'Technology',
      },
    };

    it('should process group event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, groupPayload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('group_membership');
    });
  });
});
