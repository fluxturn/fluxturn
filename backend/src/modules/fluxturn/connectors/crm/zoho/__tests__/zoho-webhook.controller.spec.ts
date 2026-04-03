/**
 * Zoho CRM Webhook Controller Tests
 *
 * Tests for the Zoho CRM webhook controller that handles incoming webhook events.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ZohoWebhookController } from '../zoho-webhook.controller';

// Mock WorkflowService to avoid ESM import issues with @octokit/rest
jest.mock('../../../../workflow/workflow.service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  })),
}));

import { WorkflowService } from '../../../../workflow/workflow.service';

describe('ZohoWebhookController', () => {
  let controller: ZohoWebhookController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockWorkflowId = 'workflow-123';

  beforeEach(async () => {
    workflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZohoWebhookController],
      providers: [{ provide: WorkflowService, useValue: workflowService }],
    }).compile();

    controller = module.get<ZohoWebhookController>(ZohoWebhookController);
  });

  // ===========================================
  // Basic Webhook Processing Tests
  // ===========================================
  describe('receiveWebhook', () => {
    it('should process record created event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'record.created',
        id: 'event-123',
        module: 'Leads',
        data: {
          record: {
            id: 'record-456',
            First_Name: 'John',
            Last_Name: 'Doe',
            Company: 'Acme Corp',
          },
        },
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.executionId).toBe('execution-123');
      expect(result.triggerId).toBe('record_created');
      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: mockWorkflowId,
          input_data: expect.objectContaining({
            eventType: 'record.created',
            module: 'Leads',
          }),
        }),
      );
    });

    it('should process record updated event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-456' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'record.updated',
        id: 'event-456',
        module: 'Contacts',
        data: {
          record: {
            id: 'contact-789',
            Email: 'updated@example.com',
          },
        },
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('record_updated');
    });

    it('should process deal stage changed event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-789' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'deal.stage_changed',
        id: 'event-789',
        module: 'Deals',
        deal: {
          id: 'deal-123',
          Deal_Name: 'Big Opportunity',
        },
        previous_stage: 'Prospecting',
        new_stage: 'Qualification',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('deal_stage_changed');
    });

    it('should process lead converted event successfully', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-lead' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'lead.converted',
        id: 'event-lead',
        module: 'Leads',
        lead: {
          id: 'lead-123',
          First_Name: 'Jane',
          Last_Name: 'Smith',
        },
        contact: {
          id: 'contact-new',
          Email: 'jane@example.com',
        },
        account: {
          id: 'account-new',
          Account_Name: 'Smith Corp',
        },
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('lead_converted');
    });

    it('should return error when workflow not found', async () => {
      workflowService.getWorkflow.mockResolvedValue(null);

      const payload = {
        event_type: 'record.created',
        id: 'event-123',
        module: 'Leads',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Workflow not found');
    });

    it('should skip processing when workflow is not active', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: false };
      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);

      const payload = {
        event_type: 'record.created',
        id: 'event-123',
        module: 'Leads',
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
        event_type: 'custom.event',
        id: 'event-custom',
        module: 'Custom',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('zoho_custom_event');
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
        event_type: 'record.created',
        id: 'duplicate-event-123',
        module: 'Leads',
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
        event_type: 'record.created',
        id: 'shared-event-123',
        module: 'Leads',
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
        event_type: 'record.created',
        id: 'error-event-123',
        module: 'Leads',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      // Should return 200 to prevent Zoho from retrying
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
        module: 'Leads',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('zoho_unknown');
    });

    it('should handle missing event id', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'record.created',
        module: 'Leads',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Event Type Extraction Tests
  // ===========================================
  describe('event type extraction', () => {
    it('should extract event type from event_type field', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'record.created',
        id: 'event-1',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result.triggerId).toBe('record_created');
    });

    it('should extract event type from eventType field', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        eventType: 'record.updated',
        id: 'event-2',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result.triggerId).toBe('record_updated');
    });

    it('should extract event type from action field', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        action: 'deal.stage_changed',
        id: 'event-3',
      };

      const result = await controller.receiveWebhook(mockWorkflowId, payload, {});
      expect(result.triggerId).toBe('deal_stage_changed');
    });
  });

  // ===========================================
  // Event ID Extraction Tests
  // ===========================================
  describe('event id extraction', () => {
    it('should extract event id from id field', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'record.created',
        id: 'unique-id-123',
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            eventId: 'unique-id-123',
          }),
        }),
      );
    });

    it('should extract event id from data.id field', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'record.created',
        data: { id: 'data-id-456' },
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            eventId: 'data-id-456',
          }),
        }),
      );
    });
  });

  // ===========================================
  // Event Data Preparation Tests
  // ===========================================
  describe('event data preparation', () => {
    it('should prepare record event data correctly', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'record.created',
        id: 'record-event',
        module: 'Leads',
        data: {
          record: {
            id: 'record-123',
            First_Name: 'John',
            Last_Name: 'Doe',
          },
        },
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            zohoEvent: expect.objectContaining({
              record: expect.objectContaining({
                id: 'record-123',
                module: 'Leads',
              }),
            }),
          }),
        }),
      );
    });

    it('should prepare deal stage change event data correctly', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'deal.stage_changed',
        id: 'deal-event',
        module: 'Deals',
        deal: { id: 'deal-123', Deal_Name: 'Big Deal' },
        previous_stage: 'Qualification',
        new_stage: 'Negotiation',
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            zohoEvent: expect.objectContaining({
              deal: expect.objectContaining({ id: 'deal-123' }),
              previousStage: 'Qualification',
              newStage: 'Negotiation',
            }),
          }),
        }),
      );
    });

    it('should prepare lead converted event data correctly', async () => {
      const mockWorkflow = { id: mockWorkflowId, is_active: true };
      const mockExecution = { id: 'execution-123' };

      workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
      workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

      const payload = {
        event_type: 'lead.converted',
        id: 'convert-event',
        module: 'Leads',
        lead: { id: 'lead-123' },
        contact: { id: 'contact-123' },
        account: { id: 'account-123' },
      };

      await controller.receiveWebhook(mockWorkflowId, payload, {});

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          input_data: expect.objectContaining({
            zohoEvent: expect.objectContaining({
              lead: { id: 'lead-123' },
              contact: { id: 'contact-123' },
              account: { id: 'account-123' },
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
      { event: 'record.created', triggerId: 'record_created' },
      { event: 'record.updated', triggerId: 'record_updated' },
      { event: 'record.deleted', triggerId: 'record_deleted' },
      { event: 'deal.stage_changed', triggerId: 'deal_stage_changed' },
      { event: 'deal.won', triggerId: 'deal_won' },
      { event: 'deal.lost', triggerId: 'deal_lost' },
      { event: 'lead.converted', triggerId: 'lead_converted' },
      { event: 'lead.created', triggerId: 'lead_created' },
      { event: 'contact.created', triggerId: 'contact_created' },
      { event: 'contact.updated', triggerId: 'contact_updated' },
      { event: 'account.created', triggerId: 'account_created' },
      { event: 'account.updated', triggerId: 'account_updated' },
    ];

    it.each(eventMappings)(
      'should map $event to $triggerId',
      async ({ event, triggerId }) => {
        const mockWorkflow = { id: mockWorkflowId, is_active: true };
        const mockExecution = { id: 'execution-123' };

        workflowService.getWorkflow.mockResolvedValue(mockWorkflow as any);
        workflowService.executeWorkflow.mockResolvedValue(mockExecution as any);

        const payload = {
          event_type: event,
          id: `event-${triggerId}`,
          module: 'Test',
        };

        const result = await controller.receiveWebhook(mockWorkflowId, payload, {});

        expect(result.triggerId).toBe(triggerId);
      },
    );
  });
});
