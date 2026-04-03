import { Injectable, Logger } from '@nestjs/common';
import { TenantService } from '../tenant/tenant.service';
import { PlatformService } from '../database/platform.service';

interface MenuData {
  organizations: any[];
  selectedOrganization: any | null;
  projects: any[];
  selectedProject: any | null;
  apps: any[];
  selectedApp: any | null;
}

@Injectable()
export class NavigationService {
  private readonly logger = new Logger(NavigationService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly platformService: PlatformService,
  ) {}

  async getMenuData(
    userId: string,
    organizationId?: string,
    projectId?: string,
    appId?: string,
  ): Promise<MenuData> {
    try {
      // Get user's latest 5 organizations
      let organizations = [];
      try {
        const allOrgs = await this.tenantService.getOrganizationsByUser(userId);
        organizations = (allOrgs || []).slice(0, 5);
      } catch (error) {
        this.logger.error('Failed to fetch organizations:', error);
        // Return empty data if service is not available
        return {
          organizations: [],
          selectedOrganization: null,
          projects: [],
          selectedProject: null,
          apps: [],
          selectedApp: null,
        };
      }
      
      // Determine selected organization
      let selectedOrg = null;
      if (organizationId) {
        selectedOrg = organizations.find(org => org.id === organizationId);
      }
      if (!selectedOrg && organizations.length > 0) {
        selectedOrg = organizations[0]; // Select first (latest) if none specified
      }
      
      // Get projects for selected organization
      let projects = [];
      let selectedProject = null;
      if (selectedOrg) {
        const orgProjects = await this.tenantService.getProjectsByOrganization(selectedOrg.id);
        projects = (orgProjects || []).slice(0, 5);
        
        // Determine selected project
        if (projectId) {
          selectedProject = projects.find(proj => proj.id === projectId);
        }
        if (!selectedProject && projects.length > 0) {
          selectedProject = projects[0]; // Select first (latest) if none specified
        }
      }
      
      // Get apps for selected project
      let apps = [];
      let selectedApp = null;
      if (selectedProject) {
        try {
          const projectApps = await this.tenantService.getAppsByProject(selectedProject.id);
          apps = (projectApps || []).slice(0, 5);
          
          // Determine selected app
          if (appId) {
            selectedApp = apps.find(app => app.id === appId);
          }
          if (!selectedApp && apps.length > 0) {
            selectedApp = apps[0]; // Select first (latest) if none specified
          }
        } catch (error) {
          this.logger.error('Failed to fetch apps:', error);
        }
      }
      
      return {
        organizations,
        selectedOrganization: selectedOrg,
        projects,
        selectedProject,
        apps,
        selectedApp,
      };
    } catch (error) {
      this.logger.error('Failed to fetch menu data:', error);
      return {
        organizations: [],
        selectedOrganization: null,
        projects: [],
        selectedProject: null,
        apps: [],
        selectedApp: null,
      };
    }
  }

  async getSimpleMegamenu(userId: string): Promise<any> {
    try {
      this.logger.log(`[MEGAMENU] Getting simple megamenu for userId: ${userId}`);
      // Get user's latest organizations directly from platform service
      const organizations = await this.platformService.getOrganizationsByUserId(userId);
      this.logger.log(`[MEGAMENU] Found ${organizations?.length || 0} organizations for user ${userId}`);
      const latestOrgs = (organizations || []).slice(0, 5);
      
      // Select the first (latest) organization by default
      const selectedOrg = latestOrgs.length > 0 ? latestOrgs[0] : null;
      
      // Get projects for selected organization
      let latestProjects = [];
      let selectedProject = null;
      if (selectedOrg) {
        try {
          const projects = await this.platformService.getProjectsByOrganizationId(selectedOrg.id);
          latestProjects = (projects || []).slice(0, 5);
          selectedProject = latestProjects.length > 0 ? latestProjects[0] : null;
        } catch (error) {
          this.logger.warn('Failed to fetch projects:', error);
        }
      }
      
      // Get apps for selected project
      let latestApps = [];
      let selectedApp = null;
      if (selectedProject) {
        try {
          const apps = await this.platformService.getAppsByProjectId(selectedProject.id);
          latestApps = (apps || []).slice(0, 5);
          selectedApp = latestApps.length > 0 ? latestApps[0] : null;
        } catch (error) {
          this.logger.warn('Failed to fetch apps:', error);
        }
      }
      
      return {
        organizations: latestOrgs,
        selectedOrganization: selectedOrg,
        selectedOrganizationId: selectedOrg?.id || null,
        projects: latestProjects,
        selectedProject: selectedProject,
        selectedProjectId: selectedProject?.id || null,
        apps: latestApps,
        selectedApp: selectedApp,
        selectedAppId: selectedApp?.id || null,
      };
    } catch (error) {
      this.logger.error('Failed to fetch simple megamenu:', error);
      return {
        organizations: [],
        selectedOrganization: null,
        selectedOrganizationId: null,
        projects: [],
        selectedProject: null,
        selectedProjectId: null,
        apps: [],
        selectedApp: null,
        selectedAppId: null,
      };
    }
  }
}