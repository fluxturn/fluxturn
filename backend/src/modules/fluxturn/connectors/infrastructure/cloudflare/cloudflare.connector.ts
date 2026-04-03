import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType
} from '../../types';

@Injectable()
export class CloudflareConnector extends BaseConnector {
  protected readonly logger = new Logger(CloudflareConnector.name);
  private httpClient: AxiosInstance;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Cloudflare',
      description: 'Web performance and security platform',
      version: '1.0.0',
      category: ConnectorCategory.INFRASTRUCTURE,
      type: ConnectorType.CLOUDFLARE,
      authType: AuthType.API_KEY,
      actions: [
        { id: 'delete_certificate', name: 'Delete Certificate', description: 'Delete a certificate', inputSchema: {}, outputSchema: {} },
        { id: 'get_certificate', name: 'Get Certificate', description: 'Get certificate details', inputSchema: {}, outputSchema: {} },
        { id: 'get_many_certificates', name: 'Get Many Certificates', description: 'Get multiple certificates', inputSchema: {}, outputSchema: {} },
        { id: 'upload_certificate', name: 'Upload Certificate', description: 'Upload a new certificate', inputSchema: {}, outputSchema: {} }
      ],
      triggers: [],
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiToken) {
      throw new Error('Cloudflare API token is required');
    }

    this.httpClient = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        'Authorization': `Bearer ${this.config.credentials.apiToken}`
      },
      timeout: 30000
    });

    this.logger.log('Cloudflare connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/user/tokens/verify');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Cloudflare connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Cloudflare health check failed');
    }
  }

  protected async performRequest(request: any): Promise<any> {
    const { method = 'GET', endpoint, body, headers } = request;
    const response = await this.httpClient.request({
      method,
      url: endpoint,
      data: body,
      headers
    });
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'delete_certificate':
        return await this.deleteCertificate(input);
      case 'get_certificate':
        return await this.getCertificate(input);
      case 'get_many_certificates':
        return await this.getManyCertificates(input);
      case 'upload_certificate':
        return await this.uploadCertificate(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Cloudflare connector cleanup completed');
  }

  private async deleteCertificate(input: any): Promise<ConnectorResponse> {
    try {
      const { zoneId, certificateId } = input;
      const response = await this.httpClient.delete(`/zones/${zoneId}/origin_tls_client_auth/${certificateId}`);
      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete certificate');
    }
  }

  private async getCertificate(input: any): Promise<ConnectorResponse> {
    try {
      const { zoneId, certificateId } = input;
      const response = await this.httpClient.get(`/zones/${zoneId}/origin_tls_client_auth/${certificateId}`);
      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get certificate');
    }
  }

  private async getManyCertificates(input: any): Promise<ConnectorResponse> {
    try {
      const { zoneId, returnAll = false, limit = 50 } = input;
      const params = returnAll ? {} : { per_page: limit };
      const response = await this.httpClient.get(`/zones/${zoneId}/origin_tls_client_auth`, { params });
      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get certificates');
    }
  }

  private async uploadCertificate(input: any): Promise<ConnectorResponse> {
    try {
      const { zoneId, certificate, privateKey } = input;
      const response = await this.httpClient.post(`/zones/${zoneId}/origin_tls_client_auth`, {
        certificate,
        private_key: privateKey
      });
      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return this.handleError(error, 'Failed to upload certificate');
    }
  }
}
