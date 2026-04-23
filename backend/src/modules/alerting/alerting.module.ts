import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlertingController } from './alerting.controller';
import { AlertingService } from './alerting.service';
import { EmailModule } from '../email/email.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule, EmailModule],
  controllers: [AlertingController],
  providers: [AlertingService],
  exports: [AlertingService],
})
export class AlertingModule {}
