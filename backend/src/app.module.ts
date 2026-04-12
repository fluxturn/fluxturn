import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ProjectModule } from './modules/project/project.module';
import { AiModule } from './modules/ai/ai.module';
import { DatabaseModule } from './modules/database/database.module';
import { EmailModule } from './modules/email/email.module';
import { StorageModule } from './modules/storage/storage.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ContentModule } from './modules/content/content.module';
import { WorkflowModule } from './modules/fluxturn/workflow/workflow.module';
import { ConnectorsModule } from './modules/fluxturn/connectors/connectors.module';
import { ConversationsModule } from './modules/fluxturn/conversations/conversations.module';
import { QueueModule } from './modules/queue/queue.module';
import { SQSModule } from './modules/sqs/sqs.module';
import { EventsModule } from './events/events.module';
import { QdrantModule } from './modules/qdrant/qdrant.module';
import { DatabaseBrowserModule } from './modules/database-browser/database-browser.module';
import { BlogModule } from './modules/blog/blog.module';
import { DeadLetterModule } from './modules/dead-letter/dead-letter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local',
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      ],
    }),
    EventEmitterModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '7d' },
    }),
    DatabaseModule,
    AuthModule,
    AiModule,
    OrganizationModule,
    ProjectModule,
    TenantModule,
    EmailModule,
    StorageModule,
    NavigationModule,
    RealtimeModule,
    ContentModule,
    QdrantModule,
    WorkflowModule,
    ConnectorsModule,
    ConversationsModule,
    QueueModule,
    SQSModule,
    EventsModule,
    DatabaseBrowserModule,
    BlogModule,
    DeadLetterModule,
  ],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class AppModule {}
