import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { AwsS3TriggerService } from './aws-s3-trigger.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface S3Record {
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: string;
  eventName: string;
  userIdentity: {
    principalId: string;
  };
  requestParameters: {
    sourceIPAddress: string;
  };
  responseElements: {
    'x-amz-request-id': string;
    'x-amz-id-2': string;
  };
  s3: {
    s3SchemaVersion: string;
    configurationId: string;
    bucket: {
      name: string;
      ownerIdentity: {
        principalId: string;
      };
      arn: string;
    };
    object: {
      key: string;
      size?: number;
      eTag?: string;
      versionId?: string;
      sequencer: string;
    };
  };
}

interface S3EventPayload {
  Records?: S3Record[];
  Message?: string;
  Type?: string;
  SubscribeURL?: string;
  TopicArn?: string;
  MessageId?: string;
}

@Controller('webhooks/aws-s3')
export class AwsS3WebhookController {
  private readonly logger = new Logger(AwsS3WebhookController.name);

  constructor(
    private readonly awsS3TriggerService: AwsS3TriggerService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: S3EventPayload,
    @Headers('x-amz-sns-message-type') snsMessageType: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Received AWS S3 webhook for workflow ${workflowId}`);

    // Handle SNS subscription confirmation
    if (snsMessageType === 'SubscriptionConfirmation' && payload.SubscribeURL) {
      this.logger.log('Confirming SNS subscription');
      try {
        await axios.get(payload.SubscribeURL);
        this.logger.log('SNS subscription confirmed');
        return res.json({ success: true, message: 'Subscription confirmed' });
      } catch (error) {
        this.logger.error('Failed to confirm SNS subscription:', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: 'Failed to confirm subscription',
        });
      }
    }

    try {
      // Parse S3 event records
      let records: S3Record[] = [];

      // Handle direct S3 event notification
      if (payload.Records) {
        records = payload.Records;
      }
      // Handle SNS wrapped message
      else if (payload.Type === 'Notification' && payload.Message) {
        try {
          const message = JSON.parse(payload.Message);
          if (message.Records) {
            records = message.Records;
          }
        } catch (e) {
          this.logger.warn('Failed to parse SNS message:', e);
        }
      }

      if (records.length === 0) {
        this.logger.debug('No S3 records in payload');
        return res.json({ success: true, message: 'No events to process' });
      }

      // Get active trigger to filter events
      const activeTrigger = this.awsS3TriggerService.getActiveTrigger(workflowId);

      for (const record of records) {
        const eventName = record.eventName;
        const triggerId = this.mapEventToTriggerId(eventName);

        this.logger.debug(`Processing S3 event: ${eventName} -> ${triggerId}`);

        // Check if this event matches the configured trigger
        if (activeTrigger && activeTrigger.triggerId !== triggerId) {
          this.logger.debug(`Event ${triggerId} doesn't match trigger ${activeTrigger.triggerId}, skipping`);
          continue;
        }

        // Check prefix filter if configured
        if (activeTrigger?.config.prefix) {
          const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
          if (!objectKey.startsWith(activeTrigger.config.prefix)) {
            this.logger.debug(`Object key ${objectKey} doesn't match prefix ${activeTrigger.config.prefix}, skipping`);
            continue;
          }
        }

        // Prepare event data
        const eventData = this.prepareEventData(record, triggerId);

        // Execute workflow
        await this.workflowService.executeWorkflow({
          workflow_id: workflowId,
          input_data: {
            s3Event: eventData,
          },
        });

        this.logger.log(`Successfully triggered workflow ${workflowId} with S3 ${triggerId} event`);
      }

      return res.json({
        success: true,
        message: 'Webhook processed successfully',
        recordsProcessed: records.length,
      });
    } catch (error) {
      this.logger.error(`Failed to process AWS S3 webhook for workflow ${workflowId}:`, error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  private mapEventToTriggerId(eventName: string): string {
    if (eventName.startsWith('ObjectCreated')) {
      return 'object_created';
    }
    if (eventName.startsWith('ObjectRemoved')) {
      return 'object_removed';
    }
    if (eventName.startsWith('s3:ObjectCreated')) {
      return 'object_created';
    }
    if (eventName.startsWith('s3:ObjectRemoved')) {
      return 'object_removed';
    }
    return 'unknown';
  }

  private prepareEventData(record: S3Record, triggerId: string): any {
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    const baseData = {
      triggerId,
      timestamp: new Date().toISOString(),
      eventName: record.eventName,
      eventTime: record.eventTime,
      awsRegion: record.awsRegion,
      requestId: record.responseElements?.['x-amz-request-id'],
    };

    switch (triggerId) {
      case 'object_created':
        return {
          ...baseData,
          bucket: record.s3.bucket.name,
          bucketArn: record.s3.bucket.arn,
          key: objectKey,
          size: record.s3.object.size,
          eTag: record.s3.object.eTag,
          versionId: record.s3.object.versionId,
          s3Url: `s3://${record.s3.bucket.name}/${objectKey}`,
          httpUrl: `https://${record.s3.bucket.name}.s3.${record.awsRegion}.amazonaws.com/${encodeURIComponent(objectKey)}`,
          userIdentity: record.userIdentity,
          sourceIP: record.requestParameters?.sourceIPAddress,
        };

      case 'object_removed':
        return {
          ...baseData,
          bucket: record.s3.bucket.name,
          bucketArn: record.s3.bucket.arn,
          key: objectKey,
          versionId: record.s3.object.versionId,
          s3Url: `s3://${record.s3.bucket.name}/${objectKey}`,
          userIdentity: record.userIdentity,
          sourceIP: record.requestParameters?.sourceIPAddress,
          deleted: true,
        };

      default:
        return {
          ...baseData,
          bucket: record.s3.bucket.name,
          key: objectKey,
          rawRecord: record,
        };
    }
  }
}
