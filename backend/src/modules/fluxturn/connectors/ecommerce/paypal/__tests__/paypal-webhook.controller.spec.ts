/**
 * PayPal Webhook Controller Tests
 *
 * Tests for the PayPal webhook controller that handles incoming webhook events.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PayPalWebhookController } from '../paypal-webhook.controller';

// Mock WorkflowService to avoid ESM import issues with @octokit/rest
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

import { WorkflowService } from '../../../../workflow/workflow.service';

describe('PayPalWebhookController', () => {
  let controller: PayPalWebhookController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';

  beforeEach(async () => {
    workflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayPalWebhookController],
      providers: [{ provide: WorkflowService, useValue: workflowService }],
    }).compile();

    controller = module.get<PayPalWebhookController>(PayPalWebhookController);
  });

  // ===========================================
  // Basic Webhook Processing Tests
  // ===========================================
  describe('receiveWebhook', () => {
    it('should process payment capture completed event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'event-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
        create_time: '2024-01-15T10:30:00Z',
        resource: {
          id: 'capture-456',
          status: 'COMPLETED',
          amount: { value: '100.00', currency_code: 'USD' },
        },
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.executionId).toBe('execution-123');
      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: mockWorkflowId,
          input_data: expect.objectContaining({
            eventType: 'PAYMENT.CAPTURE.COMPLETED',
            eventId: 'event-123',
          }),
        }),
      );
    });

    it('should process checkout order approved event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-456' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'event-456',
        event_type: 'CHECKOUT.ORDER.APPROVED',
        resource_type: 'checkout-order',
        create_time: '2024-01-15T11:00:00Z',
        resource: {
          id: 'order-789',
          status: 'APPROVED',
          intent: 'CAPTURE',
          purchase_units: [{ amount: { value: '50.00', currency_code: 'USD' } }],
        },
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('order_approved');
    });

    it('should process subscription activated event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-789' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'event-789',
        event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
        resource_type: 'subscription',
        create_time: '2024-01-15T12:00:00Z',
        resource: {
          id: 'subscription-123',
          plan_id: 'plan-456',
          status: 'ACTIVE',
        },
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('subscription_activated');
    });

    it('should process payout batch success event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-payout' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'event-payout',
        event_type: 'PAYMENT.PAYOUTSBATCH.SUCCESS',
        resource_type: 'payouts',
        create_time: '2024-01-15T13:00:00Z',
        resource: {
          batch_header: { payout_batch_id: 'batch-123' },
          items: [],
        },
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('payout_success');
    });

    it('should return error when workflow not found', async () => {
      workflowService.getWorkflow.mockResolvedValue(null);

      const payload = {
        id: 'event-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Workflow not found');
    });

    it('should skip processing when workflow is not active', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: false };
      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);

      const payload = {
        id: 'event-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.message).toContain('not active');
      expect(workflowService.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should handle unknown event types gracefully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-unknown' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'event-unknown',
        event_type: 'CUSTOM.UNKNOWN.EVENT',
        resource_type: 'custom',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      // Should convert to lowercase with underscores
      expect(result.triggerId).toBe('paypal_custom_unknown_event');
    });
  });

  // ===========================================
  // Deduplication Tests
  // ===========================================
  describe('deduplication', () => {
    it('should skip duplicate events', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'duplicate-event-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
      };

      // First call should process
      const result1 = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result1.success).toBe(true);
      expect(result1.skipped).toBeUndefined();

      // Second call with same event should be skipped
      const result2 = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result2.success).toBe(true);
      expect(result2.skipped).toBe(true);
      expect(result2.message).toContain('Duplicate');

      // Should only execute once
      expect(workflowService.executeWorkflow).toHaveBeenCalledTimes(1);
    });

    it('should process same event for different workflows', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'shared-event-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
      };

      // First workflow
      const result1 = await controller.receiveWebhook('workflow-1', payload, {});
      expect(result1.success).toBe(true);

      // Second workflow with same event ID should still process
      const result2 = await controller.receiveWebhook('workflow-2', payload, {});
      expect(result2.success).toBe(true);
      expect(result2.skipped).toBeUndefined();

      expect(workflowService.executeWorkflow).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('should handle workflow execution errors gracefully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockRejectedValue(new Error('Execution failed'));

      const payload = {
        id: 'error-event-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      // Should return 200 to prevent PayPal from retrying
      expect(result.success).toBe(false);
      expect(result.message).toContain('Execution failed');
    });

    it('should handle missing event_type', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'no-type-event',
        resource_type: 'capture',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('paypal_unknown');
    });

    it('should handle missing event id', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Event Data Preparation Tests
  // ===========================================
  describe('event data preparation', () => {
    it('should prepare payment capture event data correctly', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'payment-event',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
        create_time: '2024-01-15T10:30:00Z',
        event_version: '1.0',
        summary: 'Payment completed',
        resource: {
          id: 'capture-123',
          status: 'COMPLETED',
          amount: { value: '100.00', currency_code: 'USD' },
          final_capture: true,
          create_time: '2024-01-15T10:25:00Z',
          update_time: '2024-01-15T10:30:00Z',
          links: [{ rel: 'self', href: 'https://api.paypal.com/...' }],
        },
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            paypalEvent: expect.objectContaining({
              id: 'payment-event',
              event_type: 'PAYMENT.CAPTURE.COMPLETED',
              payment: expect.objectContaining({
                id: 'capture-123',
                status: 'COMPLETED',
                amount: { value: '100.00', currency_code: 'USD' },
              }),
            }),
          }),
        }),
      );
    });

    it('should prepare order event data correctly', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'order-event',
        event_type: 'CHECKOUT.ORDER.COMPLETED',
        resource_type: 'checkout-order',
        resource: {
          id: 'order-123',
          status: 'COMPLETED',
          intent: 'CAPTURE',
          purchase_units: [{ amount: { value: '50.00' } }],
          payer: { email_address: 'buyer@example.com' },
        },
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            paypalEvent: expect.objectContaining({
              order: expect.objectContaining({
                id: 'order-123',
                status: 'COMPLETED',
                intent: 'CAPTURE',
              }),
            }),
          }),
        }),
      );
    });

    it('should prepare subscription event data correctly', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'subscription-event',
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource_type: 'subscription',
        resource: {
          id: 'sub-123',
          plan_id: 'plan-456',
          status: 'CANCELLED',
          subscriber: { email_address: 'subscriber@example.com' },
          billing_info: { last_payment: { amount: { value: '9.99' } } },
        },
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            paypalEvent: expect.objectContaining({
              subscription: expect.objectContaining({
                id: 'sub-123',
                plan_id: 'plan-456',
                status: 'CANCELLED',
              }),
            }),
          }),
        }),
      );
    });

    it('should prepare payout event data correctly', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        id: 'payout-event',
        event_type: 'PAYMENT.PAYOUTSBATCH.DENIED',
        resource_type: 'payouts',
        resource: {
          batch_header: {
            payout_batch_id: 'batch-123',
            batch_status: 'DENIED',
          },
          items: [{ payout_item_id: 'item-1' }],
        },
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            paypalEvent: expect.objectContaining({
              payout: expect.objectContaining({
                batch_header: expect.objectContaining({
                  payout_batch_id: 'batch-123',
                }),
              }),
            }),
          }),
        }),
      );
    });
  });

  // ===========================================
  // Event Type Mapping Tests
  // ===========================================
  describe('event type mapping', () => {
    const eventMappings = [
      { event: 'PAYMENT.CAPTURE.COMPLETED', triggerId: 'payment_completed' },
      { event: 'PAYMENT.CAPTURE.DENIED', triggerId: 'payment_denied' },
      { event: 'PAYMENT.CAPTURE.PENDING', triggerId: 'payment_pending' },
      { event: 'PAYMENT.CAPTURE.REFUNDED', triggerId: 'payment_refunded' },
      { event: 'PAYMENT.CAPTURE.REVERSED', triggerId: 'payment_reversed' },
      { event: 'CHECKOUT.ORDER.APPROVED', triggerId: 'order_approved' },
      { event: 'CHECKOUT.ORDER.COMPLETED', triggerId: 'order_completed' },
      { event: 'BILLING.SUBSCRIPTION.ACTIVATED', triggerId: 'subscription_activated' },
      { event: 'BILLING.SUBSCRIPTION.CANCELLED', triggerId: 'subscription_cancelled' },
      { event: 'BILLING.SUBSCRIPTION.CREATED', triggerId: 'subscription_created' },
      { event: 'BILLING.SUBSCRIPTION.EXPIRED', triggerId: 'subscription_expired' },
      { event: 'BILLING.SUBSCRIPTION.SUSPENDED', triggerId: 'subscription_suspended' },
      { event: 'BILLING.SUBSCRIPTION.UPDATED', triggerId: 'subscription_updated' },
      { event: 'PAYMENT.PAYOUTSBATCH.SUCCESS', triggerId: 'payout_success' },
      { event: 'PAYMENT.PAYOUTSBATCH.DENIED', triggerId: 'payout_denied' },
    ];

    it.each(eventMappings)(
      'should map $event to $triggerId',
      async ({ event, triggerId }) => {
        const mockWorkflow = { id: mockWorkflowId, is_active: true };
        const mockExecution = { id: 'execution-123' };

        workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
        workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

        const payload = {
          id: `event-${triggerId}`,
          event_type: event,
          resource_type: 'test',
        };

        const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

        expect(result.triggerId).toBe(triggerId);
      },
    );
  });
});
