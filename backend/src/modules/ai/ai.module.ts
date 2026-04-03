import { Module } from '@nestjs/common';
import { AIBaseService } from './ai-base.service';

@Module({
  providers: [AIBaseService],
  exports: [AIBaseService],
})
export class AiModule {}
