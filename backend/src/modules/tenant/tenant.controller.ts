import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key-auth.guard';
import { TenantService } from './tenant.service';
import { CreateTenantDto, CreateApiKeyDto } from './dto';

export interface AuthContext {
  type: 'jwt' | 'apikey';
  token?: string;
  apiKey?: string;
  userId?: string;
  projectId?: string;
  appId?: string;
  organizationId?: string;
}

@ApiTags('Tenant Management')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('create')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiSecurity('api_key')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Create a new tenant with isolated database' })
  @ApiBody({ type: CreateTenantDto })
  async createTenant(
    @Request() req,
    @Body() createTenantDto: CreateTenantDto
  ) {
    return this.tenantService.createTenant(createTenantDto);
  }

  @Post('api-key/create')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiSecurity('api_key')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Generate new API key for project' })
  @ApiBody({ type: CreateApiKeyDto })
  async createApiKey(
    @Request() req,
    @Body() createApiKeyDto: CreateApiKeyDto
  ) {
    const context: AuthContext = req.auth;
    
    // Ensure we have a project context to create API key for
    if (!context.projectId) {
      throw new BadRequestException(
        'API key creation requires a project context. Please ensure you are authenticated with a project.'
      );
    }

    if (!context.organizationId) {
      throw new BadRequestException(
        'API key creation requires an organization context. Please ensure you are authenticated with an organization.'
      );
    }
    
    return this.tenantService.createApiKey({
      projectId: context.projectId,
      organizationId: context.organizationId,
      ...createApiKeyDto,
    });
  }
}