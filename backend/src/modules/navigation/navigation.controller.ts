import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NavigationService } from './navigation.service';

interface MenuData {
  organizations: any[];
  selectedOrganization: any | null;
  projects: any[];
  selectedProject: any | null;
  apps: any[];
  selectedApp: any | null;
}

@ApiTags('Navigation')
@Controller('navigation')
@UseGuards(JwtAuthGuard)
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get('menu-data')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get all menu data for navigation' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Selected organization ID' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Selected project ID' })
  @ApiQuery({ name: 'appId', required: false, description: 'Selected app ID' })
  async getMenuData(
    @Request() req,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('appId') appId?: string,
  ): Promise<MenuData> {
    const userId = req.user.userId;
    return this.navigationService.getMenuData(userId, organizationId, projectId, appId);
  }

  @Get('simpleMegamenu')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get simple megamenu data for navigation' })
  async getSimpleMegamenu(@Request() req): Promise<any> {
    const userId = req.user.userId;
    return this.navigationService.getSimpleMegamenu(userId);
  }
}