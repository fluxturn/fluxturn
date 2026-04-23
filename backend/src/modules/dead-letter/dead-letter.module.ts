import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeadLetterController } from './dead-letter.controller';
import { DeadLetterService } from './dead-letter.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [DeadLetterController],
  providers: [DeadLetterService],
  exports: [DeadLetterService],
})
export class DeadLetterModule {}
