import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  ConnectorRequest,
  ConnectorResponse,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types/index';

@Injectable()
export class ServiceNowConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;
  private instanceUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'ServiceNow',
      description: 'ServiceNow IT service management platform connector',
      version: '1.0.0',
      category: ConnectorCategory.SUPPORT,
      type: ConnectorType.SERVICENOW,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/servicenow.svg',
      authType: AuthType.OAUTH2,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerMinute: 100,
      },
      webhookSupport: true,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Incident actions
      { id: 'create_incident', name: 'Create Incident', description: 'Create a new incident', inputSchema: {}, outputSchema: {} },
      { id: 'get_incident', name: 'Get Incident', description: 'Get an incident by sys_id', inputSchema: {}, outputSchema: {} },
      { id: 'get_all_incidents', name: 'Get All Incidents', description: 'Get all incidents with optional filtering', inputSchema: {}, outputSchema: {} },
      { id: 'update_incident', name: 'Update Incident', description: 'Update an existing incident', inputSchema: {}, outputSchema: {} },
      { id: 'delete_incident', name: 'Delete Incident', description: 'Delete an incident', inputSchema: {}, outputSchema: {} },

      // User actions
      { id: 'create_user', name: 'Create User', description: 'Create a new user', inputSchema: {}, outputSchema: {} },
      { id: 'get_user', name: 'Get User', description: 'Get a user by sys_id', inputSchema: {}, outputSchema: {} },
      { id: 'get_all_users', name: 'Get All Users', description: 'Get all users', inputSchema: {}, outputSchema: {} },
      { id: 'update_user', name: 'Update User', description: 'Update an existing user', inputSchema: {}, outputSchema: {} },
      { id: 'delete_user', name: 'Delete User', description: 'Delete a user', inputSchema: {}, outputSchema: {} },

      // Table Record actions
      { id: 'create_record', name: 'Create Table Record', description: 'Create a record in any table', inputSchema: {}, outputSchema: {} },
      { id: 'get_record', name: 'Get Table Record', description: 'Get a record from any table', inputSchema: {}, outputSchema: {} },
      { id: 'get_all_records', name: 'Get All Table Records', description: 'Get records from any table', inputSchema: {}, outputSchema: {} },
      { id: 'update_record', name: 'Update Table Record', description: 'Update a record in any table', inputSchema: {}, outputSchema: {} },
      { id: 'delete_record', name: 'Delete Table Record', description: 'Delete a record from any table', inputSchema: {}, outputSchema: {} },

      // Business Service actions
      { id: 'get_business_service', name: 'Get Business Service', description: 'Get a business service', inputSchema: {}, outputSchema: {} },
      { id: 'get_all_business_services', name: 'Get All Business Services', description: 'Get all business services', inputSchema: {}, outputSchema: {} },

      // Attachment actions
      { id: 'upload_attachment', name: 'Upload Attachment', description: 'Upload an attachment to a record', inputSchema: {}, outputSchema: {} },
      { id: 'get_attachments', name: 'Get Attachments', description: 'Get attachments for a record', inputSchema: {}, outputSchema: {} },

      // User Groups
      { id: 'get_user_groups', name: 'Get User Groups', description: 'Get all user groups', inputSchema: {}, outputSchema: {} },

      // Departments
      { id: 'get_departments', name: 'Get Departments', description: 'Get all departments', inputSchema: {}, outputSchema: {} },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'incident_created',
        name: 'Incident Created',
        description: 'Triggers when a new incident is created',
        eventType: 'incident.created',
        webhookRequired: true,
        outputSchema: {},
      },
      {
        id: 'incident_updated',
        name: 'Incident Updated',
        description: 'Triggers when an incident is updated',
        eventType: 'incident.updated',
        webhookRequired: true,
        outputSchema: {},
      },
      {
        id: 'incident_resolved',
        name: 'Incident Resolved',
        description: 'Triggers when an incident is resolved',
        eventType: 'incident.resolved',
        webhookRequired: true,
        outputSchema: {},
      },
    ];
  }

  protected async initializeConnection(): Promise<void> {
    const { instanceUrl, accessToken, username, password, authType } = this.config.credentials;

    if (!instanceUrl) {
      throw new Error('ServiceNow instance URL is required');
    }

    this.instanceUrl = instanceUrl.replace(/\/$/, '');
    const headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authType === 'oauth2' && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (username && password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    } else {
      throw new Error('ServiceNow authentication credentials are required');
    }

    this.client = axios.create({
      baseURL: `${this.instanceUrl}/api/now`,
      headers,
    });

    this.logger.log('ServiceNow connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/table/sys_user?sysparm_limit=1');
      return response.status === 200;
    } catch (error) {
      throw new Error(`ServiceNow connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.client.get('/table/sys_user?sysparm_limit=1');
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.client.request({
      method: request.method,
      url: request.endpoint,
      data: request.body,
      params: request.queryParams,
    });
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Incident actions
      case 'create_incident':
        return this.createIncident(input);
      case 'get_incident':
        return this.getIncident(input.sys_id || input.incidentId);
      case 'get_all_incidents':
        return this.getIncidents(input);
      case 'update_incident':
        return this.updateIncident(input.sys_id || input.incidentId, input);
      case 'delete_incident':
        return this.deleteIncident(input.sys_id || input.incidentId);

      // User actions
      case 'create_user':
        return this.createUser(input);
      case 'get_user':
        return this.getUser(input.sys_id || input.userId);
      case 'get_all_users':
        return this.getUsers(input);
      case 'update_user':
        return this.updateUser(input.sys_id || input.userId, input);
      case 'delete_user':
        return this.deleteUser(input.sys_id || input.userId);

      // Table Record actions
      case 'get_record':
        return this.getRecord(input.tableName, input.sys_id || input.recordId);
      case 'get_all_records':
        return this.getRecords(input.tableName, input);
      case 'create_record':
        return this.createRecord(input.tableName, input.data);
      case 'update_record':
        return this.updateRecord(input.tableName, input.sys_id || input.recordId, input.data);
      case 'delete_record':
        return this.deleteRecord(input.tableName, input.sys_id || input.recordId);

      // Business Service actions
      case 'get_business_service':
        return this.getBusinessService(input.sys_id);
      case 'get_all_business_services':
        return this.getBusinessServices(input);

      // Attachment actions
      case 'upload_attachment':
        return this.uploadAttachment(input);
      case 'get_attachments':
        return this.getAttachments(input.table_name || input.tableName, input.table_sys_id || input.recordId);

      // User Groups
      case 'get_user_groups':
        return this.getUserGroups(input);

      // Departments
      case 'get_departments':
        return this.getDepartments(input);

      default:
        throw new Error(`Action not found: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('ServiceNow connector cleanup completed');
  }

  // Incident methods
  private async createIncident(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/table/incident', input);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to create incident');
    }
  }

  private async getIncident(incidentId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/table/incident/${incidentId}`);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to get incident');
    }
  }

  private async getIncidents(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.sysparm_query || input.query) params.sysparm_query = input.sysparm_query || input.query;
      if (input.sysparm_limit || input.limit) params.sysparm_limit = input.sysparm_limit || input.limit;
      if (input.sysparm_offset || input.offset) params.sysparm_offset = input.sysparm_offset || input.offset;
      if (input.sysparm_fields || input.fields) params.sysparm_fields = input.sysparm_fields || input.fields;
      if (input.sysparm_orderby || input.orderBy) params.sysparm_orderby = input.sysparm_orderby || input.orderBy;
      if (input.sysparm_display_value) params.sysparm_display_value = input.sysparm_display_value;

      const response = await this.client.get('/table/incident', { params });
      return { success: true, data: response.data.result || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get incidents');
    }
  }

  private async updateIncident(incidentId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { sys_id: _, incidentId: __, ...data } = input;
      const response = await this.client.patch(`/table/incident/${incidentId}`, data);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to update incident');
    }
  }

  private async deleteIncident(incidentId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/table/incident/${incidentId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete incident');
    }
  }

  // User methods
  private async createUser(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/table/sys_user', input);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to create user');
    }
  }

  private async getUser(userId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/table/sys_user/${userId}`);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to get user');
    }
  }

  private async getUsers(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.sysparm_query || input.query) params.sysparm_query = input.sysparm_query || input.query;
      if (input.sysparm_limit || input.limit) params.sysparm_limit = input.sysparm_limit || input.limit;
      if (input.sysparm_offset || input.offset) params.sysparm_offset = input.sysparm_offset || input.offset;

      const response = await this.client.get('/table/sys_user', { params });
      return { success: true, data: response.data.result || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get users');
    }
  }

  private async updateUser(userId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { sys_id: _, userId: __, ...data } = input;
      const response = await this.client.patch(`/table/sys_user/${userId}`, data);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to update user');
    }
  }

  private async deleteUser(userId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/table/sys_user/${userId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete user');
    }
  }

  // Generic Table Record methods
  private async getRecord(tableName: string, recordId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/table/${tableName}/${recordId}`);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, `Failed to get ${tableName} record`);
    }
  }

  private async getRecords(tableName: string, input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.sysparm_query || input.query) params.sysparm_query = input.sysparm_query || input.query;
      if (input.sysparm_limit || input.limit) params.sysparm_limit = input.sysparm_limit || input.limit;
      if (input.sysparm_offset || input.offset) params.sysparm_offset = input.sysparm_offset || input.offset;
      if (input.sysparm_fields || input.fields) params.sysparm_fields = input.sysparm_fields || input.fields;

      const response = await this.client.get(`/table/${tableName}`, { params });
      return { success: true, data: response.data.result || [] };
    } catch (error) {
      return this.handleError(error, `Failed to get ${tableName} records`);
    }
  }

  private async createRecord(tableName: string, data: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post(`/table/${tableName}`, data);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, `Failed to create ${tableName} record`);
    }
  }

  private async updateRecord(tableName: string, recordId: string, data: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.patch(`/table/${tableName}/${recordId}`, data);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, `Failed to update ${tableName} record`);
    }
  }

  private async deleteRecord(tableName: string, recordId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/table/${tableName}/${recordId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, `Failed to delete ${tableName} record`);
    }
  }

  // Business Service methods
  private async getBusinessService(serviceId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/table/cmdb_ci_service/${serviceId}`);
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to get business service');
    }
  }

  private async getBusinessServices(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.sysparm_query || input.query) params.sysparm_query = input.sysparm_query || input.query;
      if (input.sysparm_limit || input.limit) params.sysparm_limit = input.sysparm_limit || input.limit;

      const response = await this.client.get('/table/cmdb_ci_service', { params });
      return { success: true, data: response.data.result || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get business services');
    }
  }

  // Attachment methods
  private async uploadAttachment(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/attachment/file', input.file || input.file_content, {
        params: {
          table_name: input.table_name || input.tableName,
          table_sys_id: input.table_sys_id || input.recordId,
          file_name: input.file_name || input.fileName,
        },
        headers: {
          'Content-Type': input.contentType || 'application/octet-stream',
        },
      });
      return { success: true, data: response.data.result };
    } catch (error) {
      return this.handleError(error, 'Failed to upload attachment');
    }
  }

  private async getAttachments(tableName: string, recordId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get('/attachment', {
        params: {
          sysparm_query: `table_name=${tableName}^table_sys_id=${recordId}`,
        },
      });
      return { success: true, data: response.data.result || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get attachments');
    }
  }

  // User Groups methods
  private async getUserGroups(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.sysparm_query || input.query) params.sysparm_query = input.sysparm_query || input.query;
      if (input.sysparm_limit || input.limit) params.sysparm_limit = input.sysparm_limit || input.limit;

      const response = await this.client.get('/table/sys_user_group', { params });
      return { success: true, data: response.data.result || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get user groups');
    }
  }

  // Department methods
  private async getDepartments(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.sysparm_query || input.query) params.sysparm_query = input.sysparm_query || input.query;
      if (input.sysparm_limit || input.limit) params.sysparm_limit = input.sysparm_limit || input.limit;

      const response = await this.client.get('/table/cmn_department', { params });
      return { success: true, data: response.data.result || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get departments');
    }
  }
}
