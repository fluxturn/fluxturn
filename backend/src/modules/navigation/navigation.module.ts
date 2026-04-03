import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { TenantModule } from '../tenant/tenant.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [TenantModule, DatabaseModule],
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}