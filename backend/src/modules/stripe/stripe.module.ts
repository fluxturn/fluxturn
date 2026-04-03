import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { DatabaseModule } from '../database/database.module';
import { WorkflowModule } from '../fluxturn/workflow/workflow.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, WorkflowModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
