import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SQSService } from './sqs.service';
import { DatabaseModule } from '../database/database.module';

/**
 * Global SQS Module that provides centralized AWS SQS queue management
 * for the entire application, replacing Bull/Redis queues.
 *
 * This module:
 * - Provides a unified SQS service for all queue operations
 * - Manages queue creation, message sending, and processing
 * - Handles automatic polling and message processing
 * - Provides queue statistics and management functions
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => DatabaseModule),
  ],
  providers: [
    SQSService,
  ],
  exports: [SQSService],
})
export class SQSModule {}