import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiSecurity,
  ApiHeader,
  ApiResponse,
} from "@nestjs/swagger";
import { EmailService } from "./email.service";
import { TemplateService } from "./template.service";
import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";
import {
  GetEmailLogsDto,
  SendEmailDto,
  SendTemplateEmailDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  GetTemplatesDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  GetCampaignsDto,
} from "./dto/email.dto";

@ApiTags("Email Management")
@Controller("email")
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity("api_key")
@ApiSecurity("JWT")
@ApiHeader({
  name: "x-organization-id",
  description: "Organization ID for multi-tenant context",
  required: false,
})
@ApiHeader({
  name: "x-project-id",
  description: "Project ID for multi-tenant context",
  required: false,
})
@ApiHeader({
  name: "x-app-id",
  description: "App ID for multi-tenant context (optional)",
  required: false,
})
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly templateService: TemplateService
  ) {}

  /**
   * Send an email
   */
  @Post("send")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send an email" })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({ status: 200, description: "Email sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async sendEmail(@Body() body: SendEmailDto, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Sending email to ${body.to} ${projectId ? `for project ${projectId}` : "(platform email)"}`
      );

      const result = await this.emailService.sendEmail({
        ...body,
        organizationId,
        projectId,
        appId,
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send a template email
   */
  @Post("send-template")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send an email using a template" })
  @ApiBody({ type: SendTemplateEmailDto })
  @ApiResponse({ status: 200, description: "Template email sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Template not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async sendTemplateEmail(@Body() body: SendTemplateEmailDto, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Sending template email ${body.templateId} to ${body.to} ${
          projectId ? `for project ${projectId}` : "(platform email)"
        }`
      );

      const result = await this.emailService.sendTemplateEmail(
        body.to,
        body.templateId,
        body.templateData,
        {
          organizationId,
          projectId,
          appId,
          subject: body.subject,
          from: body.from,
          cc: body.cc,
          bcc: body.bcc,
        }
      );

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send template email: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get email logs
   */
  @Get("logs")
  @ApiOperation({ summary: "Get email logs" })
  @ApiResponse({
    status: 200,
    description: "Email logs retrieved successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async getEmailLogs(@Query() query: GetEmailLogsDto, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId =
        query.projectId || req.headers["x-project-id"] || req.auth?.projectId;
      const appId = query.appId || req.headers["x-app-id"] || req.auth?.appId;

      const filters = {
        projectId,
        appId,
        status: query.status,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      };

      const pagination = {
        page: query.page ? parseInt(query.page.toString()) : 1,
        limit: query.limit ? parseInt(query.limit.toString()) : 20,
        sortBy: query.sortBy || "created_at",
        sortOrder: query.sortOrder || "desc",
      };

      const result = await this.emailService.getEmailLogs(filters, pagination);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get email logs: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get email statistics
   */
  @Get("stats")
  @ApiOperation({ summary: "Get email statistics" })
  @ApiResponse({
    status: 200,
    description: "Email statistics retrieved successfully",
  })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async getEmailStats(@Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      const stats = await this.emailService.getEmailStats(projectId, appId);

      return {
        success: true,
        ...stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get email stats: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get available email templates
   */
  @Get("templates")
  @ApiOperation({ summary: "Get available email templates" })
  @ApiResponse({ status: 200, description: "Templates retrieved successfully" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async getTemplates(@Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Getting templates ${appId ? `for app ${appId}` : projectId ? `for project ${projectId}` : "(platform templates)"}`
      );

      const templates = await this.emailService.getTemplates(projectId, appId);

      return {
        success: true,
        data: templates,
        count: templates.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get templates: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Create or update an email template
   */
  @Post("templates")
  @ApiOperation({ summary: "Create or update an email template" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        subject: { type: "string" },
        content: { type: "string" },
        type: { type: "string", enum: ["html", "text", "mjml"] },
        metadata: { type: "object" },
      },
      required: ["id", "name", "subject", "content"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Template created/updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async createOrUpdateTemplate(@Body() body: any, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Saving template ${body.id} ${appId ? `for app ${appId}` : projectId ? `for project ${projectId}` : "(platform template)"}`
      );

      const template = await this.emailService.saveTemplate(
        {
          id: body.id || `template_${Date.now()}`,
          name: body.name,
          subject: body.subject,
          content: body.content,
          type: body.type || "html",
          metadata: body.metadata || {},
        },
        projectId,
        appId
      );

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      this.logger.error(
        `Failed to save template: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Preview an email template
   */
  @Post("templates/preview")
  @ApiOperation({ summary: "Preview an email template with sample data" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        templateId: { type: "string" },
        templateData: { type: "object" },
      },
      required: ["templateId", "templateData"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Template preview generated successfully",
  })
  @ApiResponse({ status: 404, description: "Template not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async previewTemplate(@Body() body: any, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Previewing template ${body.templateId} ${appId ? `for app ${appId}` : projectId ? `for project ${projectId}` : "(platform template)"}`
      );

      // Get template from database with proper app/project context
      const template = await this.emailService.getTemplate(
        body.templateId,
        projectId,
        appId
      );

      if (!template) {
        return {
          success: false,
          error: "Template not found",
        };
      }

      // Render the template with the provided data
      const rendered = await this.templateService.renderTemplate(
        template.content,
        template.type || "html",
        body.templateData
      );

      // Also render the subject with template data
      let renderedSubject = template.subject;
      if (body.templateData) {
        Object.keys(body.templateData).forEach((key) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          renderedSubject = renderedSubject.replace(
            regex,
            body.templateData[key]
          );
        });
      }

      const preview = {
        subject: renderedSubject,
        html: rendered.html || "",
        text: rendered.text || "",
        variables: this.templateService.extractVariables(template.content),
        metadata: template.metadata || {},
      };

      return {
        success: true,
        data: preview,
      };
    } catch (error) {
      this.logger.error(
        `Failed to preview template: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get email templates with filtering and pagination
   */
  @Get("templates/list")
  @ApiOperation({ summary: "Get email templates with filtering" })
  @ApiResponse({
    status: 200,
    description: "Templates retrieved successfully",
  })
  async getTemplatesList(@Query() query: GetTemplatesDto, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      const result = await this.emailService.getTemplatesList(
        { organizationId, projectId, appId, category: query.category, search: query.search },
        { page: query.page || 1, limit: query.limit || 20 }
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get templates list: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  @Get("templates/:id")
  @ApiOperation({ summary: "Get email template by ID" })
  @ApiResponse({
    status: 200,
    description: "Template retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Template not found" })
  async getTemplateById(@Param("id") id: string, @Req() req: any) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      const template = await this.emailService.getTemplate(id, projectId, appId);

      if (!template) {
        throw new NotFoundException("Template not found");
      }

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get template: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Create email template
   */
  @Post("templates/create")
  @ApiOperation({ summary: "Create a new email template" })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({
    status: 201,
    description: "Template created successfully",
  })
  async createTemplate(@Body() body: CreateTemplateDto, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Creating template ${body.name} ${appId ? `for app ${appId}` : projectId ? `for project ${projectId}` : "(platform template)"}`
      );

      const template = await this.emailService.createTemplate(
        {
          name: body.name,
          subject: body.subject,
          content: body.content,
          type: body.type || "html",
          category: body.category || "general",
          metadata: body.metadata || {},
        },
        organizationId,
        projectId,
        appId
      );

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create template: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update email template
   */
  @Put("templates/:id")
  @ApiOperation({ summary: "Update an email template" })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({
    status: 200,
    description: "Template updated successfully",
  })
  @ApiResponse({ status: 404, description: "Template not found" })
  async updateTemplate(
    @Param("id") id: string,
    @Body() body: UpdateTemplateDto,
    @Req() req: any
  ) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Updating template ${id} ${appId ? `for app ${appId}` : projectId ? `for project ${projectId}` : "(platform template)"}`
      );

      const template = await this.emailService.updateTemplate(
        id,
        body,
        projectId,
        appId
      );

      if (!template) {
        throw new NotFoundException("Template not found");
      }

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update template: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Delete email template
   */
  @Delete("templates/:id")
  @ApiOperation({ summary: "Delete an email template" })
  @ApiResponse({
    status: 200,
    description: "Template deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Template not found" })
  async deleteTemplate(@Param("id") id: string, @Req() req: any) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Deleting template ${id} ${appId ? `for app ${appId}` : projectId ? `for project ${projectId}` : "(platform template)"}`
      );

      const result = await this.emailService.deleteTemplate(id, projectId, appId);

      if (!result) {
        throw new NotFoundException("Template not found");
      }

      return {
        success: true,
        message: "Template deleted successfully",
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete template: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get email campaigns with filtering and pagination
   */
  @Get("campaigns")
  @ApiOperation({ summary: "Get email campaigns" })
  @ApiResponse({
    status: 200,
    description: "Campaigns retrieved successfully",
  })
  async getCampaigns(@Query() query: GetCampaignsDto, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      const result = await this.emailService.getCampaigns(
        { projectId, appId, status: query.status, search: query.search },
        { page: query.page || 1, limit: query.limit || 20 }
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get campaigns: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  @Get("campaigns/:id")
  @ApiOperation({ summary: "Get email campaign by ID" })
  @ApiResponse({
    status: 200,
    description: "Campaign retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Campaign not found" })
  async getCampaignById(@Param("id") id: string, @Req() req: any) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      const campaign = await this.emailService.getCampaign(id, projectId, appId);

      if (!campaign) {
        throw new NotFoundException("Campaign not found");
      }

      return {
        success: true,
        data: campaign,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get campaign: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Create email campaign
   */
  @Post("campaigns")
  @ApiOperation({ summary: "Create a new email campaign" })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({
    status: 201,
    description: "Campaign created successfully",
  })
  async createCampaign(@Body() body: CreateCampaignDto, @Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const userId = req.auth?.userId;

      if (!organizationId || !projectId) {
        throw new BadRequestException(
          "Organization and project context required for campaigns"
        );
      }

      this.logger.log(
        `Creating campaign ${body.name} for project ${projectId}${appId ? ` / app ${appId}` : ""}`
      );

      const campaign = await this.emailService.createCampaign(
        {
          organizationId,
          projectId,
          appId,
          name: body.name,
          description: body.description,
          templateId: body.templateId,
          subject: body.subject,
          fromEmail: body.fromEmail,
          fromName: body.fromName,
          replyTo: body.replyTo,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          metadata: body.metadata || {},
          createdBy: userId,
        }
      );

      return {
        success: true,
        data: campaign,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create campaign: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update email campaign
   */
  @Put("campaigns/:id")
  @ApiOperation({ summary: "Update an email campaign" })
  @ApiBody({ type: UpdateCampaignDto })
  @ApiResponse({
    status: 200,
    description: "Campaign updated successfully",
  })
  @ApiResponse({ status: 404, description: "Campaign not found" })
  async updateCampaign(
    @Param("id") id: string,
    @Body() body: UpdateCampaignDto,
    @Req() req: any
  ) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Updating campaign ${id} for project ${projectId}${appId ? ` / app ${appId}` : ""}`
      );

      const campaign = await this.emailService.updateCampaign(
        id,
        {
          ...body,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        },
        projectId,
        appId
      );

      if (!campaign) {
        throw new NotFoundException("Campaign not found");
      }

      return {
        success: true,
        data: campaign,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update campaign: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Delete email campaign
   */
  @Delete("campaigns/:id")
  @ApiOperation({ summary: "Delete an email campaign" })
  @ApiResponse({
    status: 200,
    description: "Campaign deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Campaign not found" })
  async deleteCampaign(@Param("id") id: string, @Req() req: any) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      this.logger.log(
        `Deleting campaign ${id} for project ${projectId}${appId ? ` / app ${appId}` : ""}`
      );

      const result = await this.emailService.deleteCampaign(id, projectId, appId);

      if (!result) {
        throw new NotFoundException("Campaign not found");
      }

      return {
        success: true,
        message: "Campaign deleted successfully",
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete campaign: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get email service metrics
   */
  @Get("metrics")
  @ApiOperation({ summary: "Get email service metrics" })
  @ApiResponse({
    status: 200,
    description: "Metrics retrieved successfully",
  })
  async getMetrics(@Req() req: any) {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.auth?.organizationId;
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;

      const metrics = await this.emailService.getMetrics(projectId, appId);

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get metrics: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
