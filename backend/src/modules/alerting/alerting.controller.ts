import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key-auth.guard';
import { AlertingService } from './alerting.service';
import { CreateAlertConfigDto, UpdateAlertConfigDto } from './dto/alert-config.dto';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity('api_key')
@ApiSecurity('JWT')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: false,
})
export class AlertingController {
  constructor(private readonly alertingService: AlertingService) {}

  @Post('config')
  @ApiOperation({ summary: 'Configure alert channels for the organization' })
  @ApiResponse({ status: 201, description: 'Alert configuration created' })
  async createAlertConfig(
    @Body(ValidationPipe) dto: CreateAlertConfigDto,
    @Request() req: any,
  ) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    return this.alertingService.configureAlerts(orgId, dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get all alert configurations for the organization' })
  @ApiResponse({ status: 200, description: 'List of alert configurations' })
  async getAlertConfigs(@Request() req: any) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    return this.alertingService.getAlertConfigs(orgId);
  }

  @Put('config/:id')
  @ApiOperation({ summary: 'Update an alert configuration' })
  @ApiResponse({ status: 200, description: 'Alert configuration updated' })
  async updateAlertConfig(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateAlertConfigDto,
    @Request() req: any,
  ) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    return this.alertingService.updateAlertConfig(id, orgId, dto);
  }

  @Delete('config/:id')
  @ApiOperation({ summary: 'Delete an alert configuration' })
  @ApiResponse({ status: 200, description: 'Alert configuration deleted' })
  async deleteAlertConfig(@Param('id') id: string, @Request() req: any) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    await this.alertingService.deleteAlertConfig(id, orgId);
    return { message: 'Alert configuration deleted' };
  }
}
