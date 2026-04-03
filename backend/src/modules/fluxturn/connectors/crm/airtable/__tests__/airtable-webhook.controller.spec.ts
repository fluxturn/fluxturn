/**
 * Airtable Webhook Controller Tests
 *
 * Tests for the Airtable webhook controller that handles incoming events.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AirtableWebhookController } from '../airtable-webhook.controller';

// Mock WorkflowService to avoid ESM import issues with @octokit/rest
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

import { WorkflowService } from '../../../../workflow/workflow.service';

describe('AirtableWebhookController', () => {
  let controller: AirtableWebhookController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';
  const mockExecutionId = 'execution-456';

  beforeEach(async () => {
    workflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AirtableWebhookController],
      providers: [{ provide: WorkflowService, useValue: workflowService }],
    }).compile();

    controller = module.get<AirtableWebhookController>(AirtableWebhookController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Ping/Verification Tests
  // ===========================================
  describe('webhook verification', () => {
    it('should respond to ping requests', async () => {
      const result = await controller.receiveWebhook(mockWorkflowId, { ping: true }, {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('verified');
    });
  });

  // ===========================================
  // Record Created Tests
  // ===========================================
  describe('record created event', () => {
    const recordCreatedPayload = {
      webhook: { id: 'webhook-123' },
      base: { id: 'base-456' },
      cursor: 'cursor-1',
      timestamp: new Date().toISOString(),
      changedTablesById: {
        'table-123': {
          createdRecordsById: {
            'rec-456': {
              cellValuesByFieldId: {
                'fld-name': 'Test Name',
                'fld-email': 'test@example.com',
              },
              createdTime: new Date().toISOString(),
            },
          },
        },
      },
    };

    it('should process record created event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, recordCreatedPayload, {});

      expect(result.success).toBe(true);
      expect(result.executionId).toBe(mockExecutionId);
      expect(result.triggerId).toBe('record_created');
    });
  });

  // ===========================================
  // Record Updated Tests
  // ===========================================
  describe('record updated event', () => {
    const recordUpdatedPayload = {
      webhook: { id: 'webhook-123' },
      base: { id: 'base-456' },
      cursor: 'cursor-2',
      timestamp: new Date().toISOString(),
      changedTablesById: {
        'table-123': {
          changedRecordsById: {
            'rec-456': {
              current: {
                cellValuesByFieldId: {
                  'fld-name': 'Updated Name',
                },
              },
              previous: {
                cellValuesByFieldId: {
                  'fld-name': 'Old Name',
                },
              },
            },
          },
        },
      },
    };

    it('should process record updated event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, recordUpdatedPayload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('record_updated');
    });
  });

  // ===========================================
  // Record Deleted Tests
  // ===========================================
  describe('record deleted event', () => {
    const recordDeletedPayload = {
      webhook: { id: 'webhook-123' },
      base: { id: 'base-456' },
      cursor: 'cursor-3',
      timestamp: new Date().toISOString(),
      changedTablesById: {
        'table-123': {
          destroyedRecordIds: ['rec-456', 'rec-789'],
        },
      },
    };

    it('should process record deleted event successfully', async () => {
      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, recordDeletedPayload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('record_deleted');
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
        {
          webhook: { id: 'webhook-999' },
          base: { id: 'base-999' },
          cursor: 'cursor-999',
        },
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
        {
          webhook: { id: 'webhook-998' },
          base: { id: 'base-998' },
          cursor: 'cursor-998',
        },
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
        webhook: { id: 'webhook-dup' },
        base: { id: 'base-dup' },
        cursor: 'duplicate-cursor-123',
        changedTablesById: {
          'table-123': {
            createdRecordsById: {
              'rec-dup': { cellValuesByFieldId: {} },
            },
          },
        },
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

      // Second call with same cursor should be skipped
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
        {
          webhook: { id: 'webhook-err' },
          base: { id: 'base-err' },
          cursor: 'cursor-err',
          changedTablesById: {},
        },
        {},
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Execution failed');
    });
  });

  // ===========================================
  // Multiple Changes Tests
  // ===========================================
  describe('multiple changes', () => {
    it('should handle payload with multiple table changes', async () => {
      const multiChangePayload = {
        webhook: { id: 'webhook-multi' },
        base: { id: 'base-multi' },
        cursor: 'cursor-multi',
        changedTablesById: {
          'table-1': {
            createdRecordsById: {
              'rec-1': { cellValuesByFieldId: { name: 'New 1' } },
            },
          },
          'table-2': {
            changedRecordsById: {
              'rec-2': {
                current: { cellValuesByFieldId: { status: 'done' } },
                previous: { cellValuesByFieldId: { status: 'pending' } },
              },
            },
          },
        },
      };

      workflowService.getWorkflow.mockResolvedValueOnce({
        id: mockWorkflowId,
        is_active: true,
      } as any);

      workflowService.executeWorkflow.mockResolvedValueOnce({
        id: mockExecutionId,
      } as any);

      const result = await controller.receiveWebhook(mockWorkflowId, multiChangePayload, {});

      expect(result.success).toBe(true);
      // Should prioritize created over updated
      expect(result.triggerId).toBe('record_created');
    });
  });
});
