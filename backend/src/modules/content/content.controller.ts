import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
  ApiHeader,
  ApiBody,
} from "@nestjs/swagger";
import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";
import { 
  ContentService, 
  UpdateContentDto, 
  CreateContentDto as ServiceCreateContentDto 
} from "./content.service";
import { IsOptional, IsString, IsEnum, IsObject } from "class-validator";
import { CreateContentDto, UpdateContentRequestDto } from "./dto/content.dto";

@ApiTags("Content Management")
@Controller("content")
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity("api_key")
@ApiSecurity("JWT")
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-project-id',
  description: 'Project ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-app-id',
  description: 'App ID for multi-tenant context (optional)',
  required: false,
})
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(private readonly contentService: ContentService) {}

  @Get("resource")
  @ApiOperation({ summary: "Get all content for a resource" })
  @ApiResponse({ status: 200, description: "Content list retrieved" })
  @ApiQuery({ name: "contentType", required: false })
  @ApiQuery({ name: "status", required: false })
  async getResourceContent(
    @Request() req: any,
    @Query("contentType") contentType?: string,
    @Query("status") status?: string
  ) {
    const organizationId = req.headers["x-organization-id"] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;
    const userId = req.auth?.userId || req.auth?.id;

    return this.contentService.findAllByResource(
      {
        contentType,
        status,
        userId
      },
      projectId,
      appId,
      organizationId
    );
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get content statistics" })
  @ApiResponse({ status: 200, description: "Statistics retrieved" })
  async getStatistics(@Request() req: any) {
    const organizationId = req.headers["x-organization-id"] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    return this.contentService.getStatistics(projectId, appId, organizationId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific content item" })
  @ApiResponse({ status: 200, description: "Content retrieved" })
  @ApiResponse({ status: 404, description: "Content not found" })
  async getContent(@Param("id") id: string, @Request() req: any) {
    const content = await this.contentService.findOne(id);
    if (!content) {
      return { success: false, error: "Content not found" };
    }
    return { success: true, data: content };
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "Get all versions of a content item" })
  @ApiResponse({ status: 200, description: "Content versions retrieved" })
  async getContentVersions(@Param("id") id: string, @Request() req: any) {
    const versions = await this.contentService.getVersions(id);
    return { success: true, data: versions };
  }

  @Post()
  @ApiOperation({ summary: "Create new content" })
  @ApiBody({ type: CreateContentDto })
  @ApiResponse({ status: 201, description: "Content created" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async createContent(
    @Body() createDto: CreateContentDto,
    @Request() req: any
  ) {
    const organizationId = req.headers["x-organization-id"] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;
    const userId = req.auth?.userId || req.auth?.id;

    const contentData: ServiceCreateContentDto = {
      ...createDto,
      organizationId,
      projectId,
      appId,
    };

    const content = await this.contentService.create(contentData, userId);
    return { success: true, data: content };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update content" })
  @ApiBody({ type: UpdateContentRequestDto })
  @ApiResponse({ status: 200, description: "Content updated" })
  @ApiResponse({ status: 404, description: "Content not found" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async updateContent(
    @Param("id") id: string,
    @Body() updateDto: UpdateContentRequestDto,
    @Request() req: any
  ) {
    const userId = req.auth?.userId || req.auth?.id;
    const content = await this.contentService.update(id, updateDto, userId);
    return { success: true, data: content };
  }

  @Post(":id/version")
  @ApiOperation({ summary: "Create new version of content" })
  @ApiBody({ type: UpdateContentRequestDto })
  @ApiResponse({ status: 200, description: "Content version created" })
  @ApiResponse({ status: 404, description: "Content not found" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async createContentVersion(
    @Param("id") id: string,
    @Body() updateDto: UpdateContentRequestDto,
    @Request() req: any
  ) {
    const userId = req.auth?.userId || req.auth?.id;
    const version = await this.contentService.createVersion(id, updateDto, userId);
    return { success: true, data: version };
  }

  @Put(":id/archive")
  @ApiOperation({ summary: "Archive content" })
  @ApiResponse({ status: 200, description: "Content archived" })
  @ApiResponse({ status: 404, description: "Content not found" })
  async archiveContent(@Param("id") id: string, @Request() req: any) {
    const userId = req.auth?.userId || req.auth?.id;
    const content = await this.contentService.archive(id, userId);
    return { success: true, data: content };
  }

  @Put(":id/restore")
  @ApiOperation({ summary: "Restore archived content" })
  @ApiResponse({ status: 200, description: "Content restored" })
  @ApiResponse({ status: 404, description: "Content not found" })
  async restoreContent(@Param("id") id: string, @Request() req: any) {
    const userId = req.auth?.userId || req.auth?.id;
    const content = await this.contentService.restore(id, userId);
    return { success: true, data: content };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete content" })
  @ApiResponse({ status: 200, description: "Content deleted" })
  @ApiResponse({ status: 404, description: "Content not found" })
  async deleteContent(@Param("id") id: string, @Request() req: any) {
    const userId = req.auth?.userId || req.auth?.id;
    await this.contentService.delete(id, userId);
    return { success: true, message: "Content deleted successfully" };
  }

  @Post("generate")
  @ApiOperation({ summary: "Generate content using AI" })
  @ApiResponse({ status: 201, description: "Content generated" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  async generateContent(
    @Body() generateDto: {
      prompt: string;
      contentType: string;
      parameters?: any;
      metadata?: any;
    },
    @Request() req: any
  ) {
    const organizationId = req.headers["x-organization-id"] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;
    const userId = req.auth?.userId || req.auth?.id;

    // For now, create a placeholder content entry
    // In production, this would integrate with the AI service
    const contentData: ServiceCreateContentDto = {
      contentType: generateDto.contentType,
      title: `Generated: ${generateDto.prompt.substring(0, 50)}...`,
      content: {
        prompt: generateDto.prompt,
        generated: true,
        timestamp: new Date().toISOString()
      },
      source: 'ai-generation',
      sourceDetails: {
        model: 'gpt-5-mini',
        provider: 'openai'
      },
      parameters: generateDto.parameters,
      metadata: generateDto.metadata,
      status: 'active',
      organizationId,
      projectId,
      appId,
    };

    const content = await this.contentService.create(contentData, userId);
    return { success: true, data: content };
  }
}