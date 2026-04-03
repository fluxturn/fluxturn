import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { DatabaseModule } from '../database';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ConfigModule, DatabaseModule, StorageModule],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
