import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformService } from './platform.service';
import { EntityGeneratorUtil } from './utils/entity-generator.util';
import { AiModule } from '../ai/ai.module';

@Global()
@Module({
  imports: [ConfigModule, AiModule],
  controllers: [
  ],
  providers: [
    PlatformService,
    EntityGeneratorUtil,
  ],
  exports: [
    PlatformService,
    EntityGeneratorUtil,
  ],
})
export class DatabaseModule {}