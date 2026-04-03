/**
 * AWS S3 Trigger Service Tests
 *
 * Tests for AWS S3 event notifications and webhook management
 */
import { ConfigService } from '@nestjs/config';
import { AwsS3TriggerService } from '../aws-s3-trigger.service';
import { TriggerTestHelper } from '@test/helpers/trigger-test.helper';

describe('AwsS3TriggerService', () => {
  let service: AwsS3TriggerService;
  let mockPlatformService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPlatformService = TriggerTestHelper.createMockPlatformService();
    mockConfigService = TriggerTestHelper.createMockConfigService();

    service = new AwsS3TriggerService(
      mockConfigService as ConfigService,
      mockPlatformService,
    );
  });

  // ===========================================
  // Activation Tests
  // ===========================================
  describe('activate', () => {
    it('should activate object_created trigger successfully', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        bucket: 'test-bucket',
        prefix: 'uploads/',
        triggerId: 'object_created',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          accessKeyId: 'AKIAMOCK',
          secretAccessKey: 'mock-secret',
          region: 'us-east-1',
        },
      });

      mockPlatformService.saveTriggerData.mockResolvedValue({
        success: true,
        data: { bucket: 'test-bucket' },
      });

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(true);
      expect(mockPlatformService.saveTriggerData).toHaveBeenCalled();
    });

    it('should activate object_removed trigger successfully', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        bucket: 'test-bucket',
        triggerId: 'object_removed',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          accessKeyId: 'AKIAMOCK',
          secretAccessKey: 'mock-secret',
          region: 'us-east-1',
        },
      });

      mockPlatformService.saveTriggerData.mockResolvedValue({
        success: true,
        data: { bucket: 'test-bucket' },
      });

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should handle missing credentials error', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        bucket: 'test-bucket',
        triggerId: 'object_created',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue(null);

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle S3 API errors', async () => {
      const workflowId = 'workflow-123';
      const triggerId = 'trigger-456';
      const actionParams = {
        bucket: 'test-bucket',
        triggerId: 'object_created',
      };

      mockPlatformService.getConnectorConfig.mockResolvedValue({
        credentials: {
          accessKeyId: 'AKIAMOCK',
          secretAccessKey: 'mock-secret',
          region: 'us-east-1',
        },
      });

      mockPlatformService.saveTriggerData.mockRejectedValue(
        new Error('NoSuchBucket'),
      );

      const result = await service.activate(
        workflowId,
        {
          triggerId,
          actionParams,
          credentialId: 'mock-credential-id',
        },
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Deactivation Tests
  // ===========================================
  describe('deactivate', () => {
    it('should deactivate trigger successfully', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue({
        bucket: 'test-bucket',
      });

      mockPlatformService.deleteTriggerData.mockResolvedValue({
        success: true,
      });

      const result = await service.deactivate(workflowId);

      expect(result.success).toBe(true);
      expect(mockPlatformService.deleteTriggerData).toHaveBeenCalled();
    });

    it('should handle missing trigger data', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue(null);

      const result = await service.deactivate(workflowId);

      // Should still succeed even if no trigger data
      expect(result.success).toBe(true);
    });

    it('should handle deactivation errors gracefully', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue({
        bucket: 'test-bucket',
      });

      mockPlatformService.deleteTriggerData.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.deactivate(workflowId);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Status Check Tests
  // ===========================================
  describe('getStatus', () => {
    it('should return active status when trigger data exists', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue({
        bucket: 'test-bucket',
      });

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(true);
    });

    it('should return inactive status when no trigger data', async () => {
      const workflowId = 'workflow-123';

      mockPlatformService.getTriggerData.mockResolvedValue(null);

      const result = await service.getStatus(workflowId);

      expect(result.active).toBe(false);
    });
  });
});
