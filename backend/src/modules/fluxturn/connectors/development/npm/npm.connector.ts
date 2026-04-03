import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
} from '../../types';

@Injectable()
export class NpmConnector extends BaseConnector {
  protected readonly logger = new Logger(NpmConnector.name);
  private readonly baseUrl = 'https://registry.npmjs.org';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'npm',
      description: 'Query npm registry for package information and manage distribution tags',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.NPM,
      authType: AuthType.NONE,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log('npm connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/express',
      });
      return !!response;
    } catch (error) {
      this.logger.error('npm connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    // No auth required for npm registry
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    try {
      const response = await fetch(url, {
        method: request.method,
        headers: {
          'Accept': 'application/json',
          ...request.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`npm API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('npm API request failed', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_metadata':
        return await this.getMetadataAction(input);
      case 'get_versions':
        return await this.getVersions(input);
      case 'search':
        return await this.search(input);
      case 'dist_tag_get_all':
        return await this.getDistTags(input);
      case 'dist_tag_update':
        return await this.updateDistTag(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('npm connector cleanup completed');
  }

  private async getMetadataAction(input: any): Promise<ConnectorResponse> {
    try {
      const { packageName, packageVersion = 'latest' } = input;
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/${encodeURIComponent(packageName)}/${encodeURIComponent(packageVersion)}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_METADATA_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getVersions(input: any): Promise<ConnectorResponse> {
    try {
      const { packageName } = input;
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/${encodeURIComponent(packageName)}`,
      });

      // Extract versions from time object
      const versions: any[] = [];
      if (response.time) {
        Object.entries(response.time).forEach(([version, publishedAt]) => {
          // Only include valid semver versions (filter out 'modified', 'created')
          if (/^\d+\.\d+\.\d+/.test(version)) {
            versions.push({
              version,
              published_at: publishedAt,
            });
          }
        });
      }

      // Sort by published date (newest first)
      versions.sort((a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );

      return {
        success: true,
        data: { versions },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_VERSIONS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async search(input: any): Promise<ConnectorResponse> {
    try {
      const { query, limit = 10, offset = 0 } = input;

      const params = new URLSearchParams({
        text: query,
        size: limit.toString(),
        from: offset.toString(),
        popularity: '0.99',
      });

      const url = `${this.baseUrl}/-/v1/search?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      // Extract package information
      const packages = data.objects?.map((obj: any) => ({
        name: obj.package?.name,
        version: obj.package?.version,
        description: obj.package?.description,
      })) || [];

      return {
        success: true,
        data: { packages },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getDistTags(input: any): Promise<ConnectorResponse> {
    try {
      const { packageName } = input;
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/-/package/${encodeURIComponent(packageName)}/dist-tags`,
      });

      return {
        success: true,
        data: { tags: response },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_DIST_TAGS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async updateDistTag(input: any): Promise<ConnectorResponse> {
    try {
      const { packageName, distTagName, packageVersion } = input;

      const url = `${this.baseUrl}/-/package/${encodeURIComponent(packageName)}/dist-tags/${encodeURIComponent(distTagName)}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: packageVersion,
      });

      if (!response.ok) {
        throw new Error(`Update dist-tag failed: ${response.status}`);
      }

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_DIST_TAG_FAILED',
          message: error.message,
        },
      };
    }
  }
}
