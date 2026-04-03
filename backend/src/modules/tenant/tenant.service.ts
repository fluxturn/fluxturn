import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PlatformService } from '../database';
import {
  PlatformUser,
  Organization,
  Project,
  App,
  ApiKey,
  CreateUserInput,
  CreateOrganizationInput,
  CreateProjectInput,
  CreateAppInput,
  CreateApiKeyInput,
} from '../auth/interfaces';
import { CreateTenantDto, CreateApiKeyDto } from './dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly platformService: PlatformService,
  ) {}

  /**
   * Create a complete tenant with organization, project, and admin user
   */
  async createTenant(createTenantDto: CreateTenantDto): Promise<{
    organizationId: string;
    projectId: string;
    databaseName: string;
    apiKey: string;
  }> {
    try {
      // Step 1: Create the admin user first
      const adminUser = await this.createAdminUser({
        email: createTenantDto.adminEmail,
        password: createTenantDto.adminPassword,
        firstName: 'Admin', // Default name, can be updated later
        lastName: 'User',
        role: 'owner',
      });

      // Step 2: Create the organization
      const organization = await this.createOrganization({
        name: createTenantDto.organizationName,
        ownerId: adminUser.id,
      });

      // Step 3: User will be updated with organization ID during organization creation
      // (This would typically be handled by the business logic in organization creation)

      // Step 4: Create the project with isolated database
      const project = await this.createProject({
        name: createTenantDto.projectName,
        organizationId: organization.id,
      });

      // Step 5: Create an initial API key for the project
      const apiKeyResult = await this.createApiKey({
        name: 'Default API Key',
        projectId: project.id,
        organizationId: organization.id,
        permissions: ['read', 'write', 'delete'],
      });

      return {
        organizationId: organization.id,
        projectId: project.id,
        databaseName: project.databaseName,
        apiKey: apiKeyResult.apiKey,
      };
    } catch (error: any) {
      this.logger.error('Failed to create tenant:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create tenant';
      if (error.message) {
        errorMessage = error.message;
      }
      
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Create a new API key for a project
   */
  async createApiKey(createApiKeyDto: CreateApiKeyDto & { projectId: string; organizationId: string }): Promise<{
    apiKey: string;
    expiresAt?: Date;
  }> {
    try {
      const expiresAt = createApiKeyDto.expiresIn
        ? new Date(Date.now() + createApiKeyDto.expiresIn * 24 * 60 * 60 * 1000)
        : undefined;

      const apiKey = await this.platformService.createApiKey({
        name: createApiKeyDto.name,
        projectId: createApiKeyDto.projectId,
        organizationId: createApiKeyDto.organizationId,
        permissions: createApiKeyDto.permissions || ['read', 'write'],
        expiresAt,
      });

      return {
        apiKey: apiKey.key,
        expiresAt: apiKey.expiresAt,
      };
    } catch (error: any) {
      this.logger.error('Failed to create API key:', error);
      throw new BadRequestException('Failed to create API key: ' + error.message);
    }
  }

  /**
   * Create a new organization
   */
  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    try {
      return await this.platformService.createOrganization(input);
    } catch (error: any) {
      this.logger.error('Failed to create organization:', error);
      throw new BadRequestException('Failed to create organization: ' + error.message);
    }
  }

  /**
   * Create a new project with isolated database
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    try {
      return await this.platformService.createProject(input);
    } catch (error: any) {
      this.logger.error('Failed to create project:', error);
      throw new BadRequestException('Failed to create project: ' + error.message);
    }
  }

  /**
   * Create a new app with isolated database
   */
  async createApp(input: CreateAppInput): Promise<App> {
    try {
      return await this.platformService.createApp(input);
    } catch (error: any) {
      this.logger.error('Failed to create app:', error);
      throw new BadRequestException('Failed to create app: ' + error.message);
    }
  }

  /**
   * Create an admin user
   */
  async createAdminUser(input: CreateUserInput): Promise<PlatformUser> {
    try {
      return await this.platformService.createUser(input);
    } catch (error: any) {
      this.logger.error('Failed to create admin user:', error);
      throw new BadRequestException('Failed to create admin user: ' + error.message);
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<Organization | null> {
    try {
      return await this.platformService.getOrganizationById(id);
    } catch (error: any) {
      this.logger.error('Failed to get organization:', error);
      throw new BadRequestException('Failed to get organization: ' + error.message);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    try {
      return await this.platformService.getProjectById(id);
    } catch (error: any) {
      this.logger.error('Failed to get project:', error);
      throw new BadRequestException('Failed to get project: ' + error.message);
    }
  }

  /**
   * Get app by ID
   */
  async getApp(id: string): Promise<App | null> {
    try {
      return await this.platformService.getAppById(id);
    } catch (error: any) {
      this.logger.error('Failed to get app:', error);
      throw new BadRequestException('Failed to get app: ' + error.message);
    }
  }

  /**
   * Get projects for an organization
   */
  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    try {
      return await this.platformService.getProjectsByOrganizationId(organizationId);
    } catch (error: any) {
      this.logger.error('Failed to get projects:', error);
      throw new BadRequestException('Failed to get projects: ' + error.message);
    }
  }

  /**
   * Get apps for a project
   */
  async getAppsByProject(projectId: string): Promise<App[]> {
    try {
      return await this.platformService.getAppsByProjectId(projectId);
    } catch (error: any) {
      this.logger.error('Failed to get apps:', error);
      throw new BadRequestException('Failed to get apps: ' + error.message);
    }
  }

  /**
   * Get API keys for an organization
   */
  async getApiKeysByOrganization(organizationId: string): Promise<ApiKey[]> {
    try {
      return await this.platformService.getApiKeysByOrganizationId(organizationId);
    } catch (error: any) {
      this.logger.error('Failed to get API keys:', error);
      throw new BadRequestException('Failed to get API keys: ' + error.message);
    }
  }

  /**
   * Get organizations for a user
   */
  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    try {
      return await this.platformService.getOrganizationsByUserId(userId);
    } catch (error: any) {
      this.logger.error('Failed to get organizations:', error);
      throw new BadRequestException('Failed to get organizations: ' + error.message);
    }
  }
}