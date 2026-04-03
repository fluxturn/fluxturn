import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { WorkflowProcessor } from './workflow.processor';
import { DatabaseModule } from '../database/database.module';
import { ConnectorsModule } from '../fluxturn/connectors/connectors.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    forwardRef(() => ConnectorsModule),
  ],
  controllers: [QueueController],
  providers: [QueueService, WorkflowProcessor],
  exports: [QueueService],
})
export class QueueModule {}