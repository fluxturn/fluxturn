/**
 * Centralized database naming utility
 * Provides consistent database naming conventions across the application
 */

export class DatabaseNamingUtil {
  /**
   * Generate database name for a project
   * Format: proj_<project_id with underscores>
   */
  static getProjectDatabaseName(projectId: string): string {
    const sanitizedId = projectId.replace(/-/g, '_');
    return `proj_${sanitizedId}`;
  }

  /**
   * Generate database name for an app
   * Format: app_<app_id with underscores>
   */
  static getAppDatabaseName(appId: string): string {
    const sanitizedId = appId.replace(/-/g, '_');
    return `app_${sanitizedId}`;
  }

  /**
   * Parse entity type and ID from database name
   * Returns { type: 'project' | 'app', id: string }
   */
  static parseDatabaseName(databaseName: string): { type: 'project' | 'app'; id: string } | null {
    if (databaseName.startsWith('proj_')) {
      const id = databaseName.substring(5).replace(/_/g, '-');
      return { type: 'project', id };
    }
    
    if (databaseName.startsWith('app_')) {
      const id = databaseName.substring(4).replace(/_/g, '-');
      return { type: 'app', id };
    }
    
    return null;
  }

  /**
   * Check if a database name is for a project
   */
  static isProjectDatabase(databaseName: string): boolean {
    return databaseName.startsWith('proj_');
  }

  /**
   * Check if a database name is for an app
   */
  static isAppDatabase(databaseName: string): boolean {
    return databaseName.startsWith('app_');
  }
}