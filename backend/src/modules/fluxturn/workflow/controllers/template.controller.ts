import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiBody,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { RequireAdmin } from '../../../auth/decorators/roles.decorator';
import { TemplateService } from '../services/template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ListTemplatesDto,
  CreateWorkflowFromTemplateDto,
  TemplateResponseDto,
  TemplateListResponseDto,
  TemplateCategory
} from '../dto/template.dto';

@ApiTags('workflow-templates')
@Controller('workflow/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireAdmin()
  @ApiBearerAuth('JWT')
  @ApiOperation({ 
    summary: 'Create a new workflow template (Admin only)',
    description: 'Create a reusable workflow template that can be shared and used by others. Only administrators can create templates.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Template created successfully',
    type: TemplateResponseDto
  })
  @ApiBody({ type: CreateTemplateDto })
  async createTemplate(
    @Body(ValidationPipe) dto: CreateTemplateDto,
    @Request() req: any
  ): Promise<TemplateResponseDto> {
    const userId = req.user?.id || req.auth?.userId;
    return this.templateService.createTemplate(dto, userId);
  }

  @Get()
  @ApiOperation({ 
    summary: 'List workflow templates',
    description: 'Get a paginated list of workflow templates with filtering options'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Templates retrieved successfully',
    type: TemplateListResponseDto
  })
  @ApiQuery({ name: 'category', enum: TemplateCategory, required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name, description, or AI prompt' })
  @ApiQuery({ name: 'is_public', type: Boolean, required: false })
  @ApiQuery({ name: 'connectors', type: [String], required: false })
  @ApiQuery({ name: 'tags', type: [String], required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ 
    name: 'sortBy', 
    required: false, 
    enum: ['name', 'created_at', 'updated_at', 'use_count']
  })
  @ApiQuery({ 
    name: 'sortOrder', 
    required: false, 
    enum: ['asc', 'desc']
  })
  async listTemplates(
    @Query(ValidationPipe) dto: ListTemplatesDto,
    @Request() req: any
  ): Promise<TemplateListResponseDto> {
    const userId = req.user?.id || req.auth?.userId;
    return this.templateService.listTemplates(dto, userId);
  }

  @Get('popular')
  @ApiOperation({ 
    summary: 'Get popular templates',
    description: 'Get the most used public templates'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Popular templates retrieved',
    type: [TemplateResponseDto]
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of templates to return'
  })
  async getPopularTemplates(
    @Query('limit') limit?: number
  ): Promise<TemplateResponseDto[]> {
    return this.templateService.getPopularTemplates(limit || 10);
  }

  @Get('my-templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ 
    summary: 'Get user\'s templates',
    description: 'Get all templates created by the authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User templates retrieved',
    type: [TemplateResponseDto]
  })
  async getUserTemplates(
    @Request() req: any
  ): Promise<TemplateResponseDto[]> {
    const userId = req.user?.id || req.auth?.userId;
    return this.templateService.getUserTemplates(userId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get template by ID',
    description: 'Retrieve a specific template by its ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Template retrieved successfully',
    type: TemplateResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Template not found' 
  })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  async getTemplate(
    @Param('id') templateId: string,
    @Request() req: any
  ): Promise<TemplateResponseDto> {
    const userId = req.user?.id || req.auth?.userId;
    return this.templateService.getTemplate(templateId, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireAdmin()
  @ApiBearerAuth('JWT')
  @ApiOperation({ 
    summary: 'Update a template (Admin only)',
    description: 'Update an existing template. Only administrators can update templates.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Template updated successfully',
    type: TemplateResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - can only update own templates' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Template not found' 
  })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  @ApiBody({ type: UpdateTemplateDto })
  async updateTemplate(
    @Param('id') templateId: string,
    @Body(ValidationPipe) dto: UpdateTemplateDto,
    @Request() req: any
  ): Promise<TemplateResponseDto> {
    const userId = req.user?.id || req.auth?.userId;
    return this.templateService.updateTemplate(templateId, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireAdmin()
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete a template (Admin only)',
    description: 'Delete an existing template. Only administrators can delete templates.'
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Template deleted successfully' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - can only delete own templates' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Template not found' 
  })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  async deleteTemplate(
    @Param('id') templateId: string,
    @Request() req: any
  ): Promise<void> {
    const userId = req.user?.id || req.auth?.userId;
    await this.templateService.deleteTemplate(templateId, userId);
  }

  @Post('create-workflow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ 
    summary: 'Create workflow from template',
    description: 'Create a new workflow instance from a template'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Workflow created from template successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'New workflow ID' },
        name: { type: 'string', description: 'Workflow name' },
        description: { type: 'string', description: 'Workflow description' },
        status: { type: 'string', description: 'Workflow status' },
        created_from_template: { type: 'string', description: 'Template ID used' },
        template_name: { type: 'string', description: 'Template name' },
        created_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiBody({ type: CreateWorkflowFromTemplateDto })
  async createWorkflowFromTemplate(
    @Body(ValidationPipe) dto: CreateWorkflowFromTemplateDto,
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id || req.auth?.userId;
    return this.templateService.createWorkflowFromTemplate(dto, userId);
  }

  @Get('category/:category')
  @ApiOperation({ 
    summary: 'Get templates by category',
    description: 'Retrieve all templates in a specific category'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Templates retrieved successfully',
    type: [TemplateResponseDto]
  })
  @ApiParam({ 
    name: 'category', 
    enum: TemplateCategory,
    description: 'Template category'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Maximum number of templates to return'
  })
  async getTemplatesByCategory(
    @Param('category') category: TemplateCategory,
    @Query('limit') limit?: number,
    @Request() req?: any
  ): Promise<TemplateResponseDto[]> {
    const userId = req?.user?.id || req?.auth?.userId;
    const dto: ListTemplatesDto = {
      category,
      limit: limit || 20,
      page: 1,
      is_public: true
    };
    
    const result = await this.templateService.listTemplates(dto, userId);
    return result.templates;
  }

  @Get('connectors/:connectorType')
  @ApiOperation({ 
    summary: 'Get templates using specific connector',
    description: 'Retrieve all templates that use a specific connector'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Templates retrieved successfully',
    type: [TemplateResponseDto]
  })
  @ApiParam({ 
    name: 'connectorType', 
    type: String,
    description: 'Connector type (e.g., telegram, openai, gmail)'
  })
  async getTemplatesByConnector(
    @Param('connectorType') connectorType: string,
    @Request() req: any
  ): Promise<TemplateResponseDto[]> {
    const userId = req.user?.id || req.auth?.userId;
    const dto: ListTemplatesDto = {
      connectors: [connectorType],
      limit: 50,
      page: 1,
      is_public: true
    };
    
    const result = await this.templateService.listTemplates(dto, userId);
    return result.templates;
  }
}