import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBody, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto';

@ApiTags('Projects')
@Controller('project')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Create a new project under organization' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to create project under (optional if provided in request body)',
    required: false,
  })
  @ApiBody({ type: CreateProjectDto })
  async createProject(
    @Request() req,
    @Body() dto: CreateProjectDto
  ) {
    // Get organizationId from header, body, or auth context
    const organizationId = req.headers['x-organization-id'] || dto.organizationId || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header or organizationId in request body.');
    }

    const userId = req.user.userId || req.user.sub;

    return this.projectService.createProject(dto, userId, organizationId);
  }

  @Get()
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get project details' })
  @ApiHeader({
    name: 'x-project-id',
    description: 'Project ID to retrieve (required)',
    required: true,
  })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID for multi-tenant context',
    required: false,
  })
  async getProject(@Request() req) {
    const projectId = req.headers['x-project-id'] || req.auth?.projectId;
    if (!projectId) {
      throw new BadRequestException('Project ID is required. Please provide x-project-id header.');
    }
    return this.projectService.getProject(projectId);
  }

  @Get('api-keys')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get all API keys for a project' })
  @ApiHeader({
    name: 'x-project-id',
    description: 'Project ID to retrieve (required)',
    required: true,
  })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID for multi-tenant context',
    required: false,
  })
  async getProjectApiKeys(
    @Request() req
  ) {
    const userId = req.user.userId || req.user.sub;
    const projectId = req.headers['x-project-id'] || req.auth?.projectId;
    return this.projectService.getProjectApiKeys(projectId, userId);
  }

  @Post('api-keys')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Create a new API key for a project' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the API key' },
        type: { type: 'string', enum: ['service_role', 'anon', 'custom'], description: 'Type of API key' },
        permissions: {
          type: 'object',
          properties: {
            read: { type: 'boolean' },
            write: { type: 'boolean' },
            delete: { type: 'boolean' },
            admin: { type: 'boolean' },
          },
        },
      },
      required: ['name', 'type'],
    },
  })
  @ApiHeader({
    name: 'x-project-id',
    description: 'Project ID to retrieve (required)',
    required: true,
  })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID for multi-tenant context',
    required: false,
  })
  async createProjectApiKey(
    @Body() dto: any,
    @Request() req
  ) {
    const userId = req.user.userId || req.user.sub;
    const projectId = req.headers['x-project-id'] || req.auth?.projectId;
    return this.projectService.createProjectApiKey(projectId, userId, dto);
  }

  @Delete('api-keys/:keyId')
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Delete an API key' })
  async deleteApiKey(
    @Param('keyId') keyId: string,
    @Request() req
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.projectService.deleteApiKey(keyId, userId);
  }

  @Patch()
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Update project settings' })
  @ApiHeader({
    name: 'x-project-id',
    description: 'Project ID to update (required)',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description' },
        projectUrl: { type: 'string', description: 'Project URL' },
      },
    },
  })
  async updateProject(
    @Request() req,
    @Body() updateData: { name?: string; description?: string; projectUrl?: string }
  ) {
    const projectId = req.headers['x-project-id'] || req.auth?.projectId;
    if (!projectId) {
      throw new BadRequestException('Project ID is required. Please provide x-project-id header.');
    }
    const userId = req.user.userId || req.user.sub;
    return this.projectService.updateProject(projectId, updateData, userId);
  }

  @Delete()
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiHeader({
    name: 'x-project-id',
    description: 'Project ID to delete (required)',
    required: true,
  })
  async deleteProject(@Request() req) {
    const projectId = req.headers['x-project-id'] || req.auth?.projectId;
    if (!projectId) {
      throw new BadRequestException('Project ID is required. Please provide x-project-id header.');
    }
    const userId = req.user.userId || req.user.sub;
    return this.projectService.deleteProject(projectId, userId);
  }
}