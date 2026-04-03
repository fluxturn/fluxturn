import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PlatformService } from '../database/platform.service';
import { CreateProjectDto } from './dto';
import { Project, App } from '../auth/interfaces';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly platformService: PlatformService,
  ) {}

  /**
   * Create a new project under an organization
   */
  async createProject(
    createProjectDto: CreateProjectDto,
    userId: string,
    organizationId?: string
  ): Promise<{
    success: boolean;
    message: string;
    projectId: string;
    project: Project;
    apps: App[];
  }> {
    try {
      // Determine organization ID from multiple sources
      let orgId = organizationId || createProjectDto.organizationId;
      
      if (!orgId) {
        // Get user's organizations
        const orgs = await this.platformService.getOrganizationsByUserId(userId);
        if (orgs && orgs.length > 0) {
          // Use the first organization
          orgId = orgs[0].id;
        } else {
          throw new BadRequestException('You must belong to an organization to create projects. Please create or join an organization first.');
        }
      }

      // Create project using tenant service
      const project = await this.platformService.createProject({
        name: createProjectDto.name,
        description: createProjectDto.description,
        organizationId: orgId,
      });

      // Get apps for the project (should be empty for new project)
      const apps = await this.platformService.getAppsByProjectId(project.id);

      return {
        success: true,
        message: 'Project created successfully',
        projectId: project.id,
        project,
        apps: apps || [],
      };
    } catch (error: any) {
      this.logger.error('Failed to create project:', error);
      
      // Handle duplicate project name error
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        throw new BadRequestException(
          `A project named "${createProjectDto.name}" already exists in this organization. Please choose a different name.`
        );
      }
      
      // Handle other database errors
      if (error.message?.includes('projects_organization_id_name_key')) {
        throw new BadRequestException(
          `Project name "${createProjectDto.name}" is already taken in your organization.`
        );
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get project details by ID
   */
  async getProject(projectId: string): Promise<{
    project: Project;
    apps: App[];
  }> {
    try {
      const project = await this.platformService.getProjectById(projectId);
      if (!project) {
        throw new BadRequestException('Project not found');
      }

      const apps = await this.platformService.getAppsByProjectId(projectId);
      
      return {
        project,
        apps: apps || [],
      };
    } catch (error: any) {
      this.logger.error('Failed to get project:', error);
      throw error;
    }
  }


  /**
   * Get projects for an organization
   */
  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    try {
      return await this.platformService.getProjectsByOrganizationId(organizationId);
    } catch (error: any) {
      this.logger.error('Failed to get projects by organization:', error);
      throw error;
    }
  }

  /**
   * Get all API keys for a project
   */
  async getProjectApiKeys(projectId: string, userId: string): Promise<any> {
    try {
      // Verify project exists and user has access
      const project = await this.platformService.getProjectById(projectId);
      if (!project) {
        throw new BadRequestException('Project not found');
      }

      // Get API keys for the project
      const apiKeys = await this.platformService.getApiKeysByProjectId(projectId);
      
      return {
        success: true,
        data: apiKeys || [],
        total: apiKeys?.length || 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to get project API keys:', error);
      throw error;
    }
  }

  /**
   * Create a new API key for a project
   */
  async createProjectApiKey(
    projectId: string,
    userId: string,
    dto: {
      name: string;
      type: 'service_role' | 'anon' | 'custom';
      permissions?: {
        read?: boolean;
        write?: boolean;
        delete?: boolean;
        admin?: boolean;
      };
    }
  ): Promise<any> {
    try {
      // Verify project exists
      const project = await this.platformService.getProjectById(projectId);
      if (!project) {
        throw new BadRequestException('Project not found');
      }

      // Set default permissions based on type
      const permissionsObj = dto.permissions || (
        dto.type === 'service_role' ? 
          { read: true, write: true, delete: true, admin: true } :
        dto.type === 'anon' ?
          { read: true, write: false, delete: false, admin: false } :
          { read: true, write: true, delete: false, admin: false }
      );

      // Convert permissions object to array of strings for the interface
      const permissions = Object.entries(permissionsObj)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => key);

      // Create API key in database
      const newApiKey = await this.platformService.createApiKey({
        name: dto.name,
        projectId,
        appId: null,
        organizationId: project.organizationId,
        permissions,
        expiresAt: null,
      });

      return {
        success: true,
        message: 'API key created successfully',
        apiKey: newApiKey,
      };
    } catch (error: any) {
      this.logger.error('Failed to create API key:', error);
      throw error;
    }
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(keyId: string, userId: string): Promise<any> {
    try {
      // Delete the API key
      const deleted = await this.platformService.deleteApiKey(keyId);

      if (!deleted) {
        throw new BadRequestException('API key not found or already deleted');
      }

      return {
        success: true,
        message: 'API key deleted successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to delete API key:', error);
      throw error;
    }
  }

  /**
   * Update project settings
   */
  async updateProject(
    projectId: string,
    updateData: { name?: string; description?: string; projectUrl?: string },
    userId: string
  ): Promise<any> {
    try {
      // Verify project exists
      const project = await this.platformService.getProjectById(projectId);
      if (!project) {
        throw new BadRequestException('Project not found');
      }

      // Update project using platform service
      const updated = await this.platformService.updateProject(projectId, {
        name: updateData.name,
        description: updateData.description,
        projectUrl: updateData.projectUrl,
      });

      return {
        success: true,
        message: 'Project updated successfully',
        project: updated,
      };
    } catch (error: any) {
      this.logger.error('Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, userId: string): Promise<any> {
    try {
      // Verify project exists
      const project = await this.platformService.getProjectById(projectId);
      if (!project) {
        throw new BadRequestException('Project not found');
      }

      // Delete project using platform service
      const deleted = await this.platformService.deleteProject(projectId);

      if (!deleted) {
        throw new BadRequestException('Failed to delete project');
      }

      return {
        success: true,
        message: 'Project deleted successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to delete project:', error);
      throw error;
    }
  }
}