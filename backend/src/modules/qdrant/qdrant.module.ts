import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantService } from './qdrant.service';
import { QdrantController } from './qdrant.controller';

@Module({
  imports: [ConfigModule],
  controllers: [QdrantController],
  providers: [QdrantService],
  exports: [QdrantService],
})
export class QdrantModule {}
