import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { CredentialDetectorService } from './services/credential-detector.service';
import { DatabaseModule } from '../../database/database.module';
import { ConnectorsModule } from '../connectors/connectors.module';

@Module({
  imports: [DatabaseModule, ConnectorsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, CredentialDetectorService],
  exports: [ConversationsService, CredentialDetectorService],
})
export class ConversationsModule {}
