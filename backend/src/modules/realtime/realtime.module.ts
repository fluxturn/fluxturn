import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SocketGateway } from './gateways/socket.gateway';
import { ChatbotGateway } from './gateways/chatbot.gateway';
import { NotificationGateway } from './gateways/notification.gateway';
import { RealtimeService } from './realtime.service';
import { SocketAuthGuard } from './guards/socket-auth.guard';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => DatabaseModule),
    forwardRef(() => AuthModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    SocketGateway,
    ChatbotGateway,
    NotificationGateway,
    RealtimeService,
    SocketAuthGuard,
  ],
  exports: [RealtimeService, SocketGateway, NotificationGateway],
})
export class RealtimeModule {}