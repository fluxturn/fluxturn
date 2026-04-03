/**
 * Plaid Webhook Controller Tests
 *
 * Tests for the Plaid webhook controller that receives and processes
 * webhook events from Plaid.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PlaidWebhookController } from '../plaid-webhook.controller';
import { WorkflowService } from '../../../../workflow/workflow.service';

// Mock WorkflowService to avoid ESM import issues
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

describe('PlaidWebhookController', () => {
  let controller: PlaidWebhookController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';
  const mockExecutionId = 'execution-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaidWebhookController],
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

    controller = module.get<PlaidWebhookController>(PlaidWebhookController);
    workflowService = module.get(WorkflowService);
  });

  // ===========================================
  // Transaction Webhook Tests
  // ===========================================
  describe('receiveWebhook - transaction events', () => {
    it('should process TRANSACTIONS.SYNC_UPDATES_AVAILABLE event', async () => {
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'SYNC_UPDATES_AVAILABLE',
          item_id: 'item-123',
          initial_update_complete: true,
          historical_update_complete: false,
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('transactions_sync_updates');
      expect(result.executionId).toBe(mockExecutionId);
      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: mockWorkflowId,
        }),
      );
    });

    it('should process TRANSACTIONS.DEFAULT_UPDATE event', async () => {
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'item-123',
          new_transactions: 5,
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('transactions_default_update');
    });

    it('should process TRANSACTIONS.TRANSACTIONS_REMOVED event', async () => {
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'TRANSACTIONS_REMOVED',
          item_id: 'item-123',
          removed_transactions: ['txn-1', 'txn-2'],
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('transactions_removed');
    });
  });

  // ===========================================
  // Item Webhook Tests
  // ===========================================
  describe('receiveWebhook - item events', () => {
    it('should process ITEM.ERROR event', async () => {
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
          webhook_type: 'ITEM',
          webhook_code: 'ERROR',
          item_id: 'item-123',
          error: {
            error_type: 'ITEM_ERROR',
            error_code: 'INVALID_CREDENTIALS',
            error_message: 'Credentials are no longer valid',
          },
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('item_error');
    });

    it('should process ITEM.PENDING_EXPIRATION event', async () => {
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
          webhook_type: 'ITEM',
          webhook_code: 'PENDING_EXPIRATION',
          item_id: 'item-123',
          consent_expiration_time: '2024-02-15T00:00:00Z',
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('item_pending_expiration');
    });

    it('should process ITEM.USER_PERMISSION_REVOKED event', async () => {
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
          webhook_type: 'ITEM',
          webhook_code: 'USER_PERMISSION_REVOKED',
          item_id: 'item-123',
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('item_user_permission_revoked');
    });
  });

  // ===========================================
  // Auth Webhook Tests
  // ===========================================
  describe('receiveWebhook - auth events', () => {
    it('should process AUTH.AUTOMATICALLY_VERIFIED event', async () => {
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
          webhook_type: 'AUTH',
          webhook_code: 'AUTOMATICALLY_VERIFIED',
          item_id: 'item-123',
          account_id: 'acc-456',
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('auth_automatically_verified');
    });

    it('should process AUTH.VERIFICATION_EXPIRED event', async () => {
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
          webhook_type: 'AUTH',
          webhook_code: 'VERIFICATION_EXPIRED',
          item_id: 'item-123',
          account_id: 'acc-456',
        },
        {},
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('auth_verification_expired');
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'item-123',
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'item-123',
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
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'DEFAULT_UPDATE',
        item_id: 'item-123',
        new_transactions: 3,
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

    it('should process events with different item_ids', async () => {
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'item-123',
          new_transactions: 3,
        },
        {},
      );

      // Second event with different item_id
      const result2 = await controller.receiveWebhook(
        mockWorkflowId,
        {
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'item-456',
          new_transactions: 3,
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'item-123',
        },
        {},
      );

      // Returns 200 to prevent Plaid retries
      expect(result.success).toBe(false);
      expect(result.message).toContain('Execution failed');
    });

    it('should handle unknown webhook types', async () => {
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
          webhook_type: 'UNKNOWN_TYPE',
          webhook_code: 'UNKNOWN_CODE',
          item_id: 'item-123',
        },
        {},
      );

      // Should still process unknown types
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
    it('should include all transaction fields in event data', async () => {
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
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'item-123',
          new_transactions: 5,
          removed_transactions: ['txn-old'],
        },
        {},
      );

      expect(capturedInput.input_data.plaidEvent).toBeDefined();
      expect(capturedInput.input_data.plaidEvent.new_transactions).toBe(5);
      expect(capturedInput.input_data.plaidEvent.removed_transactions).toEqual(['txn-old']);
    });

    it('should include error details for ITEM.ERROR events', async () => {
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
          webhook_type: 'ITEM',
          webhook_code: 'ERROR',
          item_id: 'item-123',
          error: {
            error_type: 'ITEM_ERROR',
            error_code: 'INVALID_CREDENTIALS',
            error_message: 'Credentials are invalid',
          },
        },
        {},
      );

      expect(capturedInput.input_data.plaidEvent.error).toBeDefined();
      expect(capturedInput.input_data.plaidEvent.error.error_code).toBe('INVALID_CREDENTIALS');
    });
  });
});
