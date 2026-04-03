/**
 * Instagram Webhook Controller Tests
 *
 * Tests for the Instagram webhook verification and event reception endpoints.
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

import { InstagramWebhookController } from '../instagram-webhook.controller';
import { InstagramTriggerService } from '../instagram-trigger.service';
import { WorkflowService } from '../../../../workflow/workflow.service';

describe('InstagramWebhookController', () => {
  let controller: InstagramWebhookController;
  let mockWorkflowService: any;
  let mockInstagramTriggerService: any;

  const MOCK_WORKFLOW_ID = 'workflow-123';
  const MOCK_INSTAGRAM_ACCOUNT_ID = '17841400008460056';

  beforeEach(async () => {
    mockWorkflowService = {
      getWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
    };

    mockInstagramTriggerService = {
      validateVerifyToken: jest.fn(),
      validateSignature: jest.fn(),
      processWebhookEvent: jest.fn(),
      getActiveTrigger: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstagramWebhookController],
      providers: [
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: InstagramTriggerService, useValue: mockInstagramTriggerService },
      ],
    }).compile();

    controller = module.get<InstagramWebhookController>(InstagramWebhookController);
  });

  // ===========================================
  // Webhook Verification Tests (GET)
  // ===========================================
  describe('verifyWebhook', () => {
    const mockWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'instagram',
              triggerId: 'new_media',
            },
          },
        ],
      },
    };

    it('should return challenge when verification succeeds', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockInstagramTriggerService.validateVerifyToken.mockReturnValue(true);

      const result = await controller.verifyWebhook(
        MOCK_WORKFLOW_ID,
        'subscribe',
        'test-challenge-123',
        'valid-verify-token'
      );

      expect(result).toBe('test-challenge-123');
      expect(mockWorkflowService.getWorkflow).toHaveBeenCalledWith(MOCK_WORKFLOW_ID);
      expect(mockInstagramTriggerService.validateVerifyToken).toHaveBeenCalledWith(
        MOCK_WORKFLOW_ID,
        'valid-verify-token'
      );
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(null);

      await expect(
        controller.verifyWebhook(MOCK_WORKFLOW_ID, 'subscribe', 'challenge', 'token')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no Instagram trigger in workflow', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue({
        id: MOCK_WORKFLOW_ID,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'facebook', // Not Instagram
              },
            },
          ],
        },
      });

      await expect(
        controller.verifyWebhook(MOCK_WORKFLOW_ID, 'subscribe', 'challenge', 'token')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token validation fails', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockInstagramTriggerService.validateVerifyToken.mockReturnValue(false);

      await expect(
        controller.verifyWebhook(MOCK_WORKFLOW_ID, 'subscribe', 'challenge', 'invalid-token')
      ).rejects.toThrow(BadRequestException);
    });

    it('should use node verifyToken when active trigger validation fails', async () => {
      const workflowWithToken = {
        ...mockWorkflow,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'instagram',
                triggerId: 'new_media',
                verifyToken: 'stored-verify-token',
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(workflowWithToken);
      mockInstagramTriggerService.validateVerifyToken.mockReturnValue(false);

      const result = await controller.verifyWebhook(
        MOCK_WORKFLOW_ID,
        'subscribe',
        'challenge-123',
        'stored-verify-token'
      );

      expect(result).toBe('challenge-123');
    });

    it('should use deterministic fallback when no other validation works', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockInstagramTriggerService.validateVerifyToken.mockReturnValue(false);

      // Generate the expected deterministic token
      const crypto = require('crypto');
      const expectedToken = crypto
        .createHash('sha256')
        .update(`fluxturn_instagram_${MOCK_WORKFLOW_ID}`)
        .digest('hex')
        .substring(0, 32);

      const result = await controller.verifyWebhook(
        MOCK_WORKFLOW_ID,
        'subscribe',
        'challenge-xyz',
        expectedToken
      );

      expect(result).toBe('challenge-xyz');
    });

    it('should handle workflow with nested canvas structure', async () => {
      const nestedWorkflow = {
        id: MOCK_WORKFLOW_ID,
        workflow: {
          canvas: {
            nodes: [
              {
                type: 'CONNECTOR_TRIGGER',
                data: {
                  connectorType: 'instagram',
                  triggerId: 'new_comment',
                },
              },
            ],
          },
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(nestedWorkflow);
      mockInstagramTriggerService.validateVerifyToken.mockReturnValue(true);

      const result = await controller.verifyWebhook(
        MOCK_WORKFLOW_ID,
        'subscribe',
        'nested-challenge',
        'valid-token'
      );

      expect(result).toBe('nested-challenge');
    });
  });

  // ===========================================
  // Webhook Event Reception Tests (POST)
  // ===========================================
  describe('receiveWebhook', () => {
    const mockWorkflow = {
      id: MOCK_WORKFLOW_ID,
      canvas: {
        nodes: [
          {
            type: 'CONNECTOR_TRIGGER',
            data: {
              connectorType: 'instagram',
              triggerId: 'new_media',
            },
          },
        ],
      },
    };

    it('should process new_media event and trigger workflow', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-123' });
      mockInstagramTriggerService.validateSignature.mockReturnValue(true);
      mockInstagramTriggerService.processWebhookEvent.mockReturnValue({
        id: 'media-123',
        media_type: 'IMAGE',
      });

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: MOCK_INSTAGRAM_ACCOUNT_ID,
            time: Date.now(),
            changes: [
              {
                field: 'media',
                value: {
                  id: 'media-123',
                  media_type: 'IMAGE',
                  media_url: 'https://example.com/image.jpg',
                },
              },
            ],
          },
        ],
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        'sha256=valid-signature'
      );

      expect(result.success).toBe(true);
      expect(result.executionIds).toContain('execution-123');
      expect(mockWorkflowService.executeWorkflow).toHaveBeenCalled();
    });

    it('should process new_comment event correctly', async () => {
      const commentWorkflow = {
        ...mockWorkflow,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'instagram',
                triggerId: 'new_comment',
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(commentWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-456' });
      mockInstagramTriggerService.processWebhookEvent.mockReturnValue({
        id: 'comment-123',
        text: 'Great post!',
      });

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: MOCK_INSTAGRAM_ACCOUNT_ID,
            time: Date.now(),
            changes: [
              {
                field: 'comments',
                value: {
                  id: 'comment-123',
                  text: 'Great post!',
                  from: { id: 'user-123', username: 'testuser' },
                },
              },
            ],
          },
        ],
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        undefined
      );

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(null);

      const payload = {
        object: 'instagram',
        entry: [],
      };

      await expect(
        controller.receiveWebhook(MOCK_WORKFLOW_ID, payload as any, undefined)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no Instagram trigger', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue({
        id: MOCK_WORKFLOW_ID,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: { connectorType: 'twitter' },
            },
          ],
        },
      });

      const payload = {
        object: 'instagram',
        entry: [],
      };

      await expect(
        controller.receiveWebhook(MOCK_WORKFLOW_ID, payload as any, undefined)
      ).rejects.toThrow(BadRequestException);
    });

    it('should ignore non-instagram events', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);

      const payload = {
        object: 'page', // Not Instagram
        entry: [],
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        undefined
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('ignored');
    });

    it('should return success even when event does not match trigger', async () => {
      const mediaWorkflow = {
        ...mockWorkflow,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'instagram',
                triggerId: 'new_media', // Only new_media
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(mediaWorkflow);

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: MOCK_INSTAGRAM_ACCOUNT_ID,
            time: Date.now(),
            changes: [
              {
                field: 'comments', // But we got comments event
                value: { id: 'comment-123' },
              },
            ],
          },
        ],
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        undefined
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('did not match');
    });

    it('should trigger all events when no specific triggerId configured', async () => {
      const genericTriggerWorkflow = {
        ...mockWorkflow,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'instagram',
                // No triggerId - should match all events
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(genericTriggerWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-789' });
      mockInstagramTriggerService.processWebhookEvent.mockReturnValue({
        id: 'mention-123',
      });

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: MOCK_INSTAGRAM_ACCOUNT_ID,
            time: Date.now(),
            changes: [
              {
                field: 'mentions',
                value: { id: 'mention-123' },
              },
            ],
          },
        ],
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        undefined
      );

      expect(result.success).toBe(true);
      expect(mockWorkflowService.executeWorkflow).toHaveBeenCalled();
    });

    it('should handle signature validation warning gracefully', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockWorkflowService.executeWorkflow.mockResolvedValue({ id: 'execution-999' });
      mockInstagramTriggerService.validateSignature.mockReturnValue(false);
      mockInstagramTriggerService.processWebhookEvent.mockReturnValue({
        id: 'media-456',
      });

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: MOCK_INSTAGRAM_ACCOUNT_ID,
            time: Date.now(),
            changes: [
              {
                field: 'media',
                value: { id: 'media-456' },
              },
            ],
          },
        ],
      };

      // Should still process even with invalid signature (just warns)
      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        'sha256=invalid-signature'
      );

      expect(result.success).toBe(true);
    });

    it('should handle execution errors gracefully', async () => {
      mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);
      mockWorkflowService.executeWorkflow.mockRejectedValue(new Error('Execution failed'));
      mockInstagramTriggerService.processWebhookEvent.mockReturnValue({
        id: 'media-123',
      });

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: MOCK_INSTAGRAM_ACCOUNT_ID,
            time: Date.now(),
            changes: [
              {
                field: 'media',
                value: { id: 'media-123' },
              },
            ],
          },
        ],
      };

      // Should return 200 to Facebook even on errors
      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        undefined
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });

    it('should handle multiple events in a single payload', async () => {
      const genericWorkflow = {
        ...mockWorkflow,
        canvas: {
          nodes: [
            {
              type: 'CONNECTOR_TRIGGER',
              data: {
                connectorType: 'instagram',
                // No specific triggerId
              },
            },
          ],
        },
      };

      mockWorkflowService.getWorkflow.mockResolvedValue(genericWorkflow);
      mockWorkflowService.executeWorkflow
        .mockResolvedValueOnce({ id: 'execution-1' })
        .mockResolvedValueOnce({ id: 'execution-2' });
      mockInstagramTriggerService.processWebhookEvent
        .mockReturnValueOnce({ id: 'media-1' })
        .mockReturnValueOnce({ id: 'comment-1' });

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: MOCK_INSTAGRAM_ACCOUNT_ID,
            time: Date.now(),
            changes: [
              { field: 'media', value: { id: 'media-1' } },
              { field: 'comments', value: { id: 'comment-1' } },
            ],
          },
        ],
      };

      const result = await controller.receiveWebhook(
        MOCK_WORKFLOW_ID,
        payload as any,
        undefined
      );

      expect(result.success).toBe(true);
      expect(result.executionIds).toHaveLength(2);
    });
  });
});
