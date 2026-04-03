import { ConnectorDefinition } from '../../shared';

/**
 * ServiceNow Connector Definition
 *
 * IT Service Management (ITSM) platform for incident management,
 * service catalogs, and workflow automation.
 *
 * Resources:
 * - Incidents: IT incident management
 * - Users: User management
 * - Business Services: Business service catalog
 * - Table Records: Generic table operations
 *
 * Authentication:
 * - OAuth2 or Basic Auth
 */
export const SERVICENOW_CONNECTOR: ConnectorDefinition = {
  name: 'servicenow',
  display_name: 'ServiceNow',
  category: 'support',
  description: 'IT Service Management platform for incidents, users, and workflow automation',

  auth_type: 'multiple',

  oauth_config: {
    authorization_url: '{instanceUrl}/oauth_auth.do',
    token_url: '{instanceUrl}/oauth_token.do',
    scopes: ['useraccount'],
  },

  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      default: 'basic',
      options: [
        { label: 'Basic Auth', value: 'basic' },
        { label: 'OAuth2', value: 'oauth2' },
      ],
    },
    {
      key: 'instanceUrl',
      label: 'Instance URL',
      type: 'string',
      required: true,
      placeholder: 'https://your-instance.service-now.com',
      description: 'Your ServiceNow instance URL',
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: true,
      placeholder: 'admin',
      description: 'ServiceNow username',
      displayOptions: {
        authType: ['basic'],
      },
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      description: 'ServiceNow password',
      displayOptions: {
        authType: ['basic'],
      },
    },
  ],

  endpoints: {
    base_url: '{instanceUrl}/api/now',
    incidents: '/table/incident',
    users: '/table/sys_user',
    business_services: '/table/cmdb_ci_service',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 10,
  },

  supported_actions: [
    // ==================== INCIDENT OPERATIONS ====================
    {
      id: 'create_incident',
      name: 'Create Incident',
      description: 'Create a new incident',
      category: 'Incidents',
      icon: 'alert-triangle',
      api: {
        endpoint: '/table/incident',
        method: 'POST',
        baseUrl: '{instanceUrl}/api/now',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      },
      inputSchema: {
        short_description: {
          type: 'string',
          required: true,
          label: 'Short Description',
          placeholder: 'Brief incident summary',
          aiControlled: true,
          aiDescription: 'Brief summary of the incident',
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'Detailed incident description',
          aiControlled: true,
          aiDescription: 'Detailed description of the incident',
        },
        caller_id: {
          type: 'string',
          label: 'Caller',
          description: 'User sys_id who reported the incident',
          aiControlled: false,
        },
        category: {
          type: 'string',
          label: 'Category',
          placeholder: 'software',
          aiControlled: false,
        },
        subcategory: {
          type: 'string',
          label: 'Subcategory',
          aiControlled: false,
        },
        impact: {
          type: 'select',
          label: 'Impact',
          options: [
            { label: '1 - High', value: '1' },
            { label: '2 - Medium', value: '2' },
            { label: '3 - Low', value: '3' },
          ],
          aiControlled: false,
        },
        urgency: {
          type: 'select',
          label: 'Urgency',
          options: [
            { label: '1 - High', value: '1' },
            { label: '2 - Medium', value: '2' },
            { label: '3 - Low', value: '3' },
          ],
          aiControlled: false,
        },
        priority: {
          type: 'select',
          label: 'Priority',
          options: [
            { label: '1 - Critical', value: '1' },
            { label: '2 - High', value: '2' },
            { label: '3 - Moderate', value: '3' },
            { label: '4 - Low', value: '4' },
            { label: '5 - Planning', value: '5' },
          ],
          aiControlled: false,
        },
        assigned_to: {
          type: 'string',
          label: 'Assigned To',
          description: 'User sys_id to assign incident to',
          aiControlled: false,
        },
        assignment_group: {
          type: 'string',
          label: 'Assignment Group',
          description: 'Group sys_id to assign incident to',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Fields',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: {
          type: 'object',
          properties: {
            sys_id: { type: 'string' },
            number: { type: 'string' },
            state: { type: 'string' },
          },
        },
      },
    },

    {
      id: 'get_incident',
      name: 'Get Incident',
      description: 'Get an incident by sys_id',
      category: 'Incidents',
      icon: 'alert-triangle',
      api: {
        endpoint: '/table/incident/{sys_id}',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sys_id: {
          type: 'string',
          required: true,
          label: 'Incident Sys ID',
          aiControlled: false,
        },
        sysparm_display_value: {
          type: 'select',
          label: 'Display Value',
          options: [
            { label: 'True', value: 'true' },
            { label: 'False', value: 'false' },
            { label: 'All', value: 'all' },
          ],
          default: 'true',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'get_all_incidents',
      name: 'Get All Incidents',
      description: 'Get all incidents with optional filtering',
      category: 'Incidents',
      icon: 'list',
      api: {
        endpoint: '/table/incident',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sysparm_query: {
          type: 'string',
          label: 'Query',
          placeholder: 'state=1^priority=1',
          description: 'Encoded query string',
          aiControlled: false,
        },
        sysparm_limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          max: 10000,
          aiControlled: false,
        },
        sysparm_offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          aiControlled: false,
        },
        sysparm_display_value: {
          type: 'select',
          label: 'Display Value',
          options: [
            { label: 'True', value: 'true' },
            { label: 'False', value: 'false' },
            { label: 'All', value: 'all' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'array' },
      },
    },

    {
      id: 'update_incident',
      name: 'Update Incident',
      description: 'Update an existing incident',
      category: 'Incidents',
      icon: 'edit',
      api: {
        endpoint: '/table/incident/{sys_id}',
        method: 'PATCH',
        baseUrl: '{instanceUrl}/api/now',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        sys_id: {
          type: 'string',
          required: true,
          label: 'Incident Sys ID',
          aiControlled: false,
        },
        state: {
          type: 'select',
          label: 'State',
          options: [
            { label: 'New', value: '1' },
            { label: 'In Progress', value: '2' },
            { label: 'On Hold', value: '3' },
            { label: 'Resolved', value: '6' },
            { label: 'Closed', value: '7' },
            { label: 'Canceled', value: '8' },
          ],
          aiControlled: false,
        },
        short_description: {
          type: 'string',
          label: 'Short Description',
          aiControlled: true,
          aiDescription: 'Updated short description for the incident',
        },
        close_code: {
          type: 'string',
          label: 'Close Code',
          description: 'Required when resolving',
          aiControlled: false,
        },
        close_notes: {
          type: 'string',
          label: 'Close Notes',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'Notes explaining the incident resolution',
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Fields',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'delete_incident',
      name: 'Delete Incident',
      description: 'Delete an incident',
      category: 'Incidents',
      icon: 'trash',
      api: {
        endpoint: '/table/incident/{sys_id}',
        method: 'DELETE',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sys_id: {
          type: 'string',
          required: true,
          label: 'Incident Sys ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== USER OPERATIONS ====================
    {
      id: 'create_user',
      name: 'Create User',
      description: 'Create a new user',
      category: 'Users',
      icon: 'user-plus',
      api: {
        endpoint: '/table/sys_user',
        method: 'POST',
        baseUrl: '{instanceUrl}/api/now',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        user_name: {
          type: 'string',
          required: true,
          label: 'Username',
          aiControlled: false,
        },
        first_name: {
          type: 'string',
          label: 'First Name',
          aiControlled: false,
        },
        last_name: {
          type: 'string',
          label: 'Last Name',
          aiControlled: false,
        },
        email: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          aiControlled: false,
        },
        phone: {
          type: 'string',
          label: 'Phone',
          aiControlled: false,
        },
        department: {
          type: 'string',
          label: 'Department',
          description: 'Department sys_id',
          aiControlled: false,
        },
        title: {
          type: 'string',
          label: 'Title',
          aiControlled: false,
        },
        active: {
          type: 'boolean',
          label: 'Active',
          default: true,
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'get_user',
      name: 'Get User',
      description: 'Get a user by sys_id',
      category: 'Users',
      icon: 'user',
      api: {
        endpoint: '/table/sys_user/{sys_id}',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sys_id: {
          type: 'string',
          required: true,
          label: 'User Sys ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'get_all_users',
      name: 'Get All Users',
      description: 'Get all users',
      category: 'Users',
      icon: 'users',
      api: {
        endpoint: '/table/sys_user',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sysparm_query: {
          type: 'string',
          label: 'Query',
          placeholder: 'active=true',
          aiControlled: false,
        },
        sysparm_limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'array' },
      },
    },

    {
      id: 'update_user',
      name: 'Update User',
      description: 'Update an existing user',
      category: 'Users',
      icon: 'edit',
      api: {
        endpoint: '/table/sys_user/{sys_id}',
        method: 'PATCH',
        baseUrl: '{instanceUrl}/api/now',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        sys_id: {
          type: 'string',
          required: true,
          label: 'User Sys ID',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Fields to Update',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'delete_user',
      name: 'Delete User',
      description: 'Delete a user',
      category: 'Users',
      icon: 'trash',
      api: {
        endpoint: '/table/sys_user/{sys_id}',
        method: 'DELETE',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sys_id: {
          type: 'string',
          required: true,
          label: 'User Sys ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== TABLE RECORD OPERATIONS ====================
    {
      id: 'create_record',
      name: 'Create Table Record',
      description: 'Create a record in any table',
      category: 'Table Records',
      icon: 'plus',
      api: {
        endpoint: '/table/{tableName}',
        method: 'POST',
        baseUrl: '{instanceUrl}/api/now',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        tableName: {
          type: 'string',
          required: true,
          label: 'Table Name',
          placeholder: 'incident',
          description: 'ServiceNow table name',
          aiControlled: false,
        },
        data: {
          type: 'object',
          required: true,
          label: 'Record Data',
          description: 'Field values for the record',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'get_record',
      name: 'Get Table Record',
      description: 'Get a record from any table',
      category: 'Table Records',
      icon: 'search',
      api: {
        endpoint: '/table/{tableName}/{sys_id}',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        tableName: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        sys_id: {
          type: 'string',
          required: true,
          label: 'Record Sys ID',
          aiControlled: false,
        },
        sysparm_display_value: {
          type: 'select',
          label: 'Display Value',
          options: [
            { label: 'True', value: 'true' },
            { label: 'False', value: 'false' },
            { label: 'All', value: 'all' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'get_all_records',
      name: 'Get All Table Records',
      description: 'Get records from any table',
      category: 'Table Records',
      icon: 'list',
      api: {
        endpoint: '/table/{tableName}',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        tableName: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        sysparm_query: {
          type: 'string',
          label: 'Query',
          aiControlled: false,
        },
        sysparm_limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
        sysparm_offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          aiControlled: false,
        },
        sysparm_fields: {
          type: 'string',
          label: 'Fields',
          placeholder: 'sys_id,number,short_description',
          description: 'Comma-separated field names',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'array' },
      },
    },

    {
      id: 'update_record',
      name: 'Update Table Record',
      description: 'Update a record in any table',
      category: 'Table Records',
      icon: 'edit',
      api: {
        endpoint: '/table/{tableName}/{sys_id}',
        method: 'PATCH',
        baseUrl: '{instanceUrl}/api/now',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        tableName: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        sys_id: {
          type: 'string',
          required: true,
          label: 'Record Sys ID',
          aiControlled: false,
        },
        data: {
          type: 'object',
          required: true,
          label: 'Update Data',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'delete_record',
      name: 'Delete Table Record',
      description: 'Delete a record from any table',
      category: 'Table Records',
      icon: 'trash',
      api: {
        endpoint: '/table/{tableName}/{sys_id}',
        method: 'DELETE',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        tableName: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        sys_id: {
          type: 'string',
          required: true,
          label: 'Record Sys ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== BUSINESS SERVICE OPERATIONS ====================
    {
      id: 'get_business_service',
      name: 'Get Business Service',
      description: 'Get a business service',
      category: 'Business Services',
      icon: 'briefcase',
      api: {
        endpoint: '/table/cmdb_ci_service/{sys_id}',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sys_id: {
          type: 'string',
          required: true,
          label: 'Service Sys ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'get_all_business_services',
      name: 'Get All Business Services',
      description: 'Get all business services',
      category: 'Business Services',
      icon: 'briefcase',
      api: {
        endpoint: '/table/cmdb_ci_service',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sysparm_query: {
          type: 'string',
          label: 'Query',
          aiControlled: false,
        },
        sysparm_limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'array' },
      },
    },

    // ==================== ATTACHMENT OPERATIONS ====================
    {
      id: 'upload_attachment',
      name: 'Upload Attachment',
      description: 'Upload an attachment to a record',
      category: 'Attachments',
      icon: 'paperclip',
      api: {
        endpoint: '/attachment/file',
        method: 'POST',
        baseUrl: '{instanceUrl}/api/now',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
      inputSchema: {
        table_name: {
          type: 'string',
          required: true,
          label: 'Table Name',
          placeholder: 'incident',
          aiControlled: false,
        },
        table_sys_id: {
          type: 'string',
          required: true,
          label: 'Record Sys ID',
          aiControlled: false,
        },
        file_name: {
          type: 'string',
          required: true,
          label: 'File Name',
          aiControlled: false,
        },
        file_content: {
          type: 'string',
          required: true,
          label: 'File Content',
          description: 'Base64 encoded file content',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'object' },
      },
    },

    {
      id: 'get_attachments',
      name: 'Get Attachments',
      description: 'Get attachments for a record',
      category: 'Attachments',
      icon: 'paperclip',
      api: {
        endpoint: '/attachment',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        table_name: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        table_sys_id: {
          type: 'string',
          required: true,
          label: 'Record Sys ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'array' },
      },
    },

    // ==================== USER GROUP OPERATIONS ====================
    {
      id: 'get_user_groups',
      name: 'Get User Groups',
      description: 'Get all user groups',
      category: 'User Groups',
      icon: 'users',
      api: {
        endpoint: '/table/sys_user_group',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sysparm_query: {
          type: 'string',
          label: 'Query',
          aiControlled: false,
        },
        sysparm_limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'array' },
      },
    },

    // ==================== DEPARTMENT OPERATIONS ====================
    {
      id: 'get_departments',
      name: 'Get Departments',
      description: 'Get all departments',
      category: 'Departments',
      icon: 'building',
      api: {
        endpoint: '/table/cmn_department',
        method: 'GET',
        baseUrl: '{instanceUrl}/api/now',
      },
      inputSchema: {
        sysparm_query: {
          type: 'string',
          label: 'Query',
          aiControlled: false,
        },
        sysparm_limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        result: { type: 'array' },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'incident_created',
      name: 'Incident Created',
      description: 'Triggers when a new incident is created',
      eventType: 'incident.created',
      icon: 'alert-triangle',
      webhookRequired: true,
      outputSchema: {
        sys_id: { type: 'string' },
        number: { type: 'string' },
        short_description: { type: 'string' },
        state: { type: 'string' },
        priority: { type: 'string' },
      },
    },
    {
      id: 'incident_updated',
      name: 'Incident Updated',
      description: 'Triggers when an incident is updated',
      eventType: 'incident.updated',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        sys_id: { type: 'string' },
        number: { type: 'string' },
        state: { type: 'string' },
        changes: { type: 'object' },
      },
    },
    {
      id: 'incident_resolved',
      name: 'Incident Resolved',
      description: 'Triggers when an incident is resolved',
      eventType: 'incident.resolved',
      icon: 'check-circle',
      webhookRequired: true,
      outputSchema: {
        sys_id: { type: 'string' },
        number: { type: 'string' },
        close_code: { type: 'string' },
        close_notes: { type: 'string' },
      },
    },
  ],
};
