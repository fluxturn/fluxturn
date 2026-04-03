import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { SESService } from './ses.service';
import { TemplateService } from './template.service';
import { PlatformService } from '../database/platform.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailController],
  providers: [
    EmailService,
    SESService,
    TemplateService,
    PlatformService,
  ],
  exports: [EmailService, SESService, TemplateService],
})
export class EmailModule {}