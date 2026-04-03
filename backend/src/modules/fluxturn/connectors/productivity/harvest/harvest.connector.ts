import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class HarvestConnector extends BaseConnector {
  private readonly baseUrl = 'https://api.harvestapp.com/v2';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Harvest',
      description: 'Time tracking, invoicing, and business insights platform',
      version: '1.0.0',
      category: ConnectorCategory.PRODUCTIVITY,
      type: ConnectorType.HARVEST,
      authType: AuthType.BEARER_TOKEN,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Access token is required');
    }
    if (!this.config.credentials?.accountId) {
      throw new Error('Account ID is required');
    }
    this.logger.log('Harvest connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        headers: this.getAuthHeaders(),
      });
      return !!response;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const response = await this.apiUtils.executeRequest({
      method: request.method,
      endpoint: url,
      headers: request.headers || this.getAuthHeaders(),
      queryParams: request.queryParams,
      body: request.body,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Time Entry Actions
      case 'create_time_entry_by_duration':
        return await this.createTimeEntryByDuration(input);
      case 'create_time_entry_by_start_end':
        return await this.createTimeEntryByStartEnd(input);
      case 'get_time_entry':
        return await this.getTimeEntry(input);
      case 'get_all_time_entries':
        return await this.getAllTimeEntries(input);
      case 'update_time_entry':
        return await this.updateTimeEntry(input);
      case 'delete_time_entry':
        return await this.deleteTimeEntry(input);
      case 'restart_time_entry':
        return await this.restartTimeEntry(input);
      case 'stop_time_entry':
        return await this.stopTimeEntry(input);
      case 'delete_time_entry_external_reference':
        return await this.deleteTimeEntryExternalReference(input);

      // Client Actions
      case 'create_client':
        return await this.createClient(input);
      case 'get_client':
        return await this.getClient(input);
      case 'get_all_clients':
        return await this.getAllClients(input);
      case 'update_client':
        return await this.updateClient(input);
      case 'delete_client':
        return await this.deleteClient(input);

      // Project Actions
      case 'create_project':
        return await this.createProject(input);
      case 'get_project':
        return await this.getProject(input);
      case 'get_all_projects':
        return await this.getAllProjects(input);
      case 'update_project':
        return await this.updateProject(input);
      case 'delete_project':
        return await this.deleteProject(input);

      // Task Actions
      case 'create_task':
        return await this.createTask(input);
      case 'get_task':
        return await this.getTask(input);
      case 'get_all_tasks':
        return await this.getAllTasks(input);
      case 'update_task':
        return await this.updateTask(input);
      case 'delete_task':
        return await this.deleteTask(input);

      // User Actions
      case 'get_current_user':
        return await this.getCurrentUser();
      case 'get_user':
        return await this.getUser(input);
      case 'get_all_users':
        return await this.getAllUsers(input);
      case 'create_user':
        return await this.createUser(input);
      case 'update_user':
        return await this.updateUser(input);
      case 'delete_user':
        return await this.deleteUser(input);

      // Contact Actions
      case 'create_contact':
        return await this.createContact(input);
      case 'get_contact':
        return await this.getContact(input);
      case 'get_all_contacts':
        return await this.getAllContacts(input);
      case 'update_contact':
        return await this.updateContact(input);
      case 'delete_contact':
        return await this.deleteContact(input);

      // Invoice Actions
      case 'create_invoice':
        return await this.createInvoice(input);
      case 'get_invoice':
        return await this.getInvoice(input);
      case 'get_all_invoices':
        return await this.getAllInvoices(input);
      case 'update_invoice':
        return await this.updateInvoice(input);
      case 'delete_invoice':
        return await this.deleteInvoice(input);

      // Estimate Actions
      case 'create_estimate':
        return await this.createEstimate(input);
      case 'get_estimate':
        return await this.getEstimate(input);
      case 'get_all_estimates':
        return await this.getAllEstimates(input);
      case 'update_estimate':
        return await this.updateEstimate(input);
      case 'delete_estimate':
        return await this.deleteEstimate(input);

      // Expense Actions
      case 'create_expense':
        return await this.createExpense(input);
      case 'get_expense':
        return await this.getExpense(input);
      case 'get_all_expenses':
        return await this.getAllExpenses(input);
      case 'update_expense':
        return await this.updateExpense(input);
      case 'delete_expense':
        return await this.deleteExpense(input);

      // Company Actions
      case 'get_company':
        return await this.getCompany();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Harvest connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
      'Harvest-Account-Id': this.config.credentials.accountId,
      'User-Agent': 'Fluxturn App',
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Time Entry Actions
      {
        id: 'create_time_entry_by_duration',
        name: 'Create Time Entry by Duration',
        description: 'Create a new time entry using duration',
        inputSchema: {
          projectId: { type: 'string', required: true },
          taskId: { type: 'string', required: true },
          spentDate: { type: 'string', required: true },
          hours: { type: 'number', required: false },
          notes: { type: 'string', required: false },
          userId: { type: 'string', required: false },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'create_time_entry_by_start_end',
        name: 'Create Time Entry by Start/End Time',
        description: 'Create a new time entry using start and end time',
        inputSchema: {
          projectId: { type: 'string', required: true },
          taskId: { type: 'string', required: true },
          spentDate: { type: 'string', required: true },
          startedTime: { type: 'string', required: false },
          endedTime: { type: 'string', required: false },
          notes: { type: 'string', required: false },
          userId: { type: 'string', required: false },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'get_time_entry',
        name: 'Get Time Entry',
        description: 'Get a specific time entry',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'get_all_time_entries',
        name: 'Get All Time Entries',
        description: 'Get all time entries with optional filters',
        inputSchema: {
          userId: { type: 'string', required: false },
          clientId: { type: 'string', required: false },
          projectId: { type: 'string', required: false },
          isBilled: { type: 'boolean', required: false },
          isRunning: { type: 'boolean', required: false },
          from: { type: 'string', required: false },
          to: { type: 'string', required: false },
          updatedSince: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { time_entries: { type: 'array' } },
      },
      {
        id: 'update_time_entry',
        name: 'Update Time Entry',
        description: 'Update an existing time entry',
        inputSchema: {
          id: { type: 'string', required: true },
          projectId: { type: 'string', required: false },
          taskId: { type: 'string', required: false },
          spentDate: { type: 'string', required: false },
          startedTime: { type: 'string', required: false },
          endedTime: { type: 'string', required: false },
          hours: { type: 'number', required: false },
          notes: { type: 'string', required: false },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'delete_time_entry',
        name: 'Delete Time Entry',
        description: 'Delete a time entry',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'restart_time_entry',
        name: 'Restart Time Entry',
        description: 'Restart a stopped time entry',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'stop_time_entry',
        name: 'Stop Time Entry',
        description: 'Stop a running time entry',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'delete_time_entry_external_reference',
        name: 'Delete Time Entry External Reference',
        description: "Delete a time entry's external reference",
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Client Actions
      {
        id: 'create_client',
        name: 'Create Client',
        description: 'Create a new client',
        inputSchema: {
          name: { type: 'string', required: true },
          isActive: { type: 'boolean', required: false },
          address: { type: 'string', required: false },
          currency: { type: 'string', required: false },
        },
        outputSchema: { client: { type: 'object' } },
      },
      {
        id: 'get_client',
        name: 'Get Client',
        description: 'Get a specific client',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { client: { type: 'object' } },
      },
      {
        id: 'get_all_clients',
        name: 'Get All Clients',
        description: 'Get all clients',
        inputSchema: {
          isActive: { type: 'boolean', required: false },
          updatedSince: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { clients: { type: 'array' } },
      },
      {
        id: 'update_client',
        name: 'Update Client',
        description: 'Update an existing client',
        inputSchema: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: false },
          isActive: { type: 'boolean', required: false },
          address: { type: 'string', required: false },
          currency: { type: 'string', required: false },
        },
        outputSchema: { client: { type: 'object' } },
      },
      {
        id: 'delete_client',
        name: 'Delete Client',
        description: 'Delete a client',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Project Actions
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project',
        inputSchema: {
          clientId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          isBillable: { type: 'boolean', required: true },
          billBy: { type: 'string', required: true },
          budgetBy: { type: 'string', required: true },
          code: { type: 'string', required: false },
          isActive: { type: 'boolean', required: false },
          isFixedFee: { type: 'boolean', required: false },
          hourlyRate: { type: 'number', required: false },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'get_project',
        name: 'Get Project',
        description: 'Get a specific project',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'get_all_projects',
        name: 'Get All Projects',
        description: 'Get all projects',
        inputSchema: {
          isActive: { type: 'boolean', required: false },
          clientId: { type: 'string', required: false },
          updatedSince: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { projects: { type: 'array' } },
      },
      {
        id: 'update_project',
        name: 'Update Project',
        description: 'Update an existing project',
        inputSchema: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: false },
          code: { type: 'string', required: false },
          isActive: { type: 'boolean', required: false },
          isBillable: { type: 'boolean', required: false },
          billBy: { type: 'string', required: false },
          budgetBy: { type: 'string', required: false },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'delete_project',
        name: 'Delete Project',
        description: 'Delete a project',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Task Actions
      {
        id: 'create_task',
        name: 'Create Task',
        description: 'Create a new task',
        inputSchema: {
          name: { type: 'string', required: true },
          billableByDefault: { type: 'boolean', required: false },
          defaultHourlyRate: { type: 'number', required: false },
          isDefault: { type: 'boolean', required: false },
          isActive: { type: 'boolean', required: false },
        },
        outputSchema: { task: { type: 'object' } },
      },
      {
        id: 'get_task',
        name: 'Get Task',
        description: 'Get a specific task',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { task: { type: 'object' } },
      },
      {
        id: 'get_all_tasks',
        name: 'Get All Tasks',
        description: 'Get all tasks',
        inputSchema: {
          isActive: { type: 'boolean', required: false },
          updatedSince: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { tasks: { type: 'array' } },
      },
      {
        id: 'update_task',
        name: 'Update Task',
        description: 'Update an existing task',
        inputSchema: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: false },
          billableByDefault: { type: 'boolean', required: false },
          isActive: { type: 'boolean', required: false },
        },
        outputSchema: { task: { type: 'object' } },
      },
      {
        id: 'delete_task',
        name: 'Delete Task',
        description: 'Delete a task',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // User Actions
      {
        id: 'get_current_user',
        name: 'Get Current User',
        description: 'Get the currently authenticated user',
        inputSchema: {},
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_user',
        name: 'Get User',
        description: 'Get a specific user',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_all_users',
        name: 'Get All Users',
        description: 'Get all users',
        inputSchema: {
          isActive: { type: 'boolean', required: false },
          updatedSince: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { users: { type: 'array' } },
      },
      {
        id: 'create_user',
        name: 'Create User',
        description: 'Create a new user',
        inputSchema: {
          firstName: { type: 'string', required: true },
          lastName: { type: 'string', required: true },
          email: { type: 'string', required: true },
          telephone: { type: 'string', required: false },
          timezone: { type: 'string', required: false },
          hasAccessToAllFutureProjects: { type: 'boolean', required: false },
          isContractor: { type: 'boolean', required: false },
          isAdmin: { type: 'boolean', required: false },
          isProjectManager: { type: 'boolean', required: false },
          canSeeRates: { type: 'boolean', required: false },
          canCreateProjects: { type: 'boolean', required: false },
          canCreateInvoices: { type: 'boolean', required: false },
          isActive: { type: 'boolean', required: false },
          weeklyCapacity: { type: 'number', required: false },
          defaultHourlyRate: { type: 'number', required: false },
          costRate: { type: 'number', required: false },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'update_user',
        name: 'Update User',
        description: 'Update an existing user',
        inputSchema: {
          id: { type: 'string', required: true },
          firstName: { type: 'string', required: false },
          lastName: { type: 'string', required: false },
          email: { type: 'string', required: false },
          isActive: { type: 'boolean', required: false },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'delete_user',
        name: 'Delete User',
        description: 'Delete a user',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Contact Actions
      {
        id: 'create_contact',
        name: 'Create Contact',
        description: 'Create a new contact',
        inputSchema: {
          clientId: { type: 'string', required: true },
          firstName: { type: 'string', required: true },
          lastName: { type: 'string', required: false },
          title: { type: 'string', required: false },
          email: { type: 'string', required: false },
          phoneOffice: { type: 'string', required: false },
          phoneMobile: { type: 'string', required: false },
          fax: { type: 'string', required: false },
        },
        outputSchema: { contact: { type: 'object' } },
      },
      {
        id: 'get_contact',
        name: 'Get Contact',
        description: 'Get a specific contact',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { contact: { type: 'object' } },
      },
      {
        id: 'get_all_contacts',
        name: 'Get All Contacts',
        description: 'Get all contacts',
        inputSchema: {
          clientId: { type: 'string', required: false },
          updatedSince: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { contacts: { type: 'array' } },
      },
      {
        id: 'update_contact',
        name: 'Update Contact',
        description: 'Update an existing contact',
        inputSchema: {
          id: { type: 'string', required: true },
          firstName: { type: 'string', required: false },
          lastName: { type: 'string', required: false },
          email: { type: 'string', required: false },
        },
        outputSchema: { contact: { type: 'object' } },
      },
      {
        id: 'delete_contact',
        name: 'Delete Contact',
        description: 'Delete a contact',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Invoice Actions
      {
        id: 'create_invoice',
        name: 'Create Invoice',
        description: 'Create a new invoice',
        inputSchema: {
          clientId: { type: 'string', required: true },
          retroInvoiceId: { type: 'string', required: false },
          estimateId: { type: 'string', required: false },
          number: { type: 'string', required: false },
          purchaseOrder: { type: 'string', required: false },
          tax: { type: 'number', required: false },
          tax2: { type: 'number', required: false },
          discount: { type: 'number', required: false },
          subject: { type: 'string', required: false },
          notes: { type: 'string', required: false },
          currency: { type: 'string', required: false },
          issueDate: { type: 'string', required: false },
          dueDate: { type: 'string', required: false },
          paymentTerm: { type: 'string', required: false },
        },
        outputSchema: { invoice: { type: 'object' } },
      },
      {
        id: 'get_invoice',
        name: 'Get Invoice',
        description: 'Get a specific invoice',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { invoice: { type: 'object' } },
      },
      {
        id: 'get_all_invoices',
        name: 'Get All Invoices',
        description: 'Get all invoices',
        inputSchema: {
          clientId: { type: 'string', required: false },
          projectId: { type: 'string', required: false },
          updatedSince: { type: 'string', required: false },
          from: { type: 'string', required: false },
          to: { type: 'string', required: false },
          state: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { invoices: { type: 'array' } },
      },
      {
        id: 'update_invoice',
        name: 'Update Invoice',
        description: 'Update an existing invoice',
        inputSchema: {
          id: { type: 'string', required: true },
          subject: { type: 'string', required: false },
          notes: { type: 'string', required: false },
          purchaseOrder: { type: 'string', required: false },
        },
        outputSchema: { invoice: { type: 'object' } },
      },
      {
        id: 'delete_invoice',
        name: 'Delete Invoice',
        description: 'Delete an invoice',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Estimate Actions
      {
        id: 'create_estimate',
        name: 'Create Estimate',
        description: 'Create a new estimate',
        inputSchema: {
          clientId: { type: 'string', required: true },
          number: { type: 'string', required: false },
          purchaseOrder: { type: 'string', required: false },
          tax: { type: 'number', required: false },
          tax2: { type: 'number', required: false },
          discount: { type: 'number', required: false },
          subject: { type: 'string', required: false },
          notes: { type: 'string', required: false },
          currency: { type: 'string', required: false },
          issueDate: { type: 'string', required: false },
        },
        outputSchema: { estimate: { type: 'object' } },
      },
      {
        id: 'get_estimate',
        name: 'Get Estimate',
        description: 'Get a specific estimate',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { estimate: { type: 'object' } },
      },
      {
        id: 'get_all_estimates',
        name: 'Get All Estimates',
        description: 'Get all estimates',
        inputSchema: {
          clientId: { type: 'string', required: false },
          updatedSince: { type: 'string', required: false },
          from: { type: 'string', required: false },
          to: { type: 'string', required: false },
          state: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { estimates: { type: 'array' } },
      },
      {
        id: 'update_estimate',
        name: 'Update Estimate',
        description: 'Update an existing estimate',
        inputSchema: {
          id: { type: 'string', required: true },
          subject: { type: 'string', required: false },
          notes: { type: 'string', required: false },
        },
        outputSchema: { estimate: { type: 'object' } },
      },
      {
        id: 'delete_estimate',
        name: 'Delete Estimate',
        description: 'Delete an estimate',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Expense Actions
      {
        id: 'create_expense',
        name: 'Create Expense',
        description: 'Create a new expense',
        inputSchema: {
          projectId: { type: 'string', required: true },
          expenseCategoryId: { type: 'string', required: true },
          spentDate: { type: 'string', required: true },
          userId: { type: 'string', required: false },
          units: { type: 'number', required: false },
          totalCost: { type: 'number', required: false },
          notes: { type: 'string', required: false },
          billable: { type: 'boolean', required: false },
        },
        outputSchema: { expense: { type: 'object' } },
      },
      {
        id: 'get_expense',
        name: 'Get Expense',
        description: 'Get a specific expense',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { expense: { type: 'object' } },
      },
      {
        id: 'get_all_expenses',
        name: 'Get All Expenses',
        description: 'Get all expenses',
        inputSchema: {
          userId: { type: 'string', required: false },
          clientId: { type: 'string', required: false },
          projectId: { type: 'string', required: false },
          isBilled: { type: 'boolean', required: false },
          updatedSince: { type: 'string', required: false },
          from: { type: 'string', required: false },
          to: { type: 'string', required: false },
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { expenses: { type: 'array' } },
      },
      {
        id: 'update_expense',
        name: 'Update Expense',
        description: 'Update an existing expense',
        inputSchema: {
          id: { type: 'string', required: true },
          projectId: { type: 'string', required: false },
          expenseCategoryId: { type: 'string', required: false },
          spentDate: { type: 'string', required: false },
          units: { type: 'number', required: false },
          totalCost: { type: 'number', required: false },
          notes: { type: 'string', required: false },
        },
        outputSchema: { expense: { type: 'object' } },
      },
      {
        id: 'delete_expense',
        name: 'Delete Expense',
        description: 'Delete an expense',
        inputSchema: {
          id: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Company Actions
      {
        id: 'get_company',
        name: 'Get Company',
        description: 'Get company information',
        inputSchema: {},
        outputSchema: { company: { type: 'object' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Time Entry Methods
  private async createTimeEntryByDuration(data: any): Promise<any> {
    const { projectId, taskId, spentDate, hours, notes, userId } = data;

    const body: any = {
      project_id: projectId,
      task_id: taskId,
      spent_date: spentDate,
    };

    if (hours !== undefined) body.hours = hours;
    if (notes) body.notes = notes;
    if (userId) body.user_id = userId;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/time_entries',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async createTimeEntryByStartEnd(data: any): Promise<any> {
    const { projectId, taskId, spentDate, startedTime, endedTime, notes, userId } = data;

    const body: any = {
      project_id: projectId,
      task_id: taskId,
      spent_date: spentDate,
    };

    if (startedTime) body.started_time = startedTime;
    if (endedTime) body.ended_time = endedTime;
    if (notes) body.notes = notes;
    if (userId) body.user_id = userId;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/time_entries',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getTimeEntry(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/time_entries/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllTimeEntries(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.userId) queryParams.user_id = data.userId;
    if (data.clientId) queryParams.client_id = data.clientId;
    if (data.projectId) queryParams.project_id = data.projectId;
    if (data.isBilled !== undefined) queryParams.is_billed = data.isBilled;
    if (data.isRunning !== undefined) queryParams.is_running = data.isRunning;
    if (data.from) queryParams.from = data.from;
    if (data.to) queryParams.to = data.to;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/time_entries',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateTimeEntry(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.projectId) body.project_id = updateData.projectId;
    if (updateData.taskId) body.task_id = updateData.taskId;
    if (updateData.spentDate) body.spent_date = updateData.spentDate;
    if (updateData.startedTime) body.started_time = updateData.startedTime;
    if (updateData.endedTime) body.ended_time = updateData.endedTime;
    if (updateData.hours !== undefined) body.hours = updateData.hours;
    if (updateData.notes) body.notes = updateData.notes;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/time_entries/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteTimeEntry(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/time_entries/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async restartTimeEntry(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/time_entries/${id}/restart`,
      headers: this.getAuthHeaders(),
    });
  }

  private async stopTimeEntry(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/time_entries/${id}/stop`,
      headers: this.getAuthHeaders(),
    });
  }

  private async deleteTimeEntryExternalReference(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/time_entries/${id}/external_reference`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Client Methods
  private async createClient(data: any): Promise<any> {
    const body: any = { name: data.name };

    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.address) body.address = data.address;
    if (data.currency) body.currency = data.currency;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/clients',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getClient(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/clients/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllClients(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.isActive !== undefined) queryParams.is_active = data.isActive;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/clients',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateClient(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.name) body.name = updateData.name;
    if (updateData.isActive !== undefined) body.is_active = updateData.isActive;
    if (updateData.address) body.address = updateData.address;
    if (updateData.currency) body.currency = updateData.currency;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/clients/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteClient(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/clients/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Project Methods
  private async createProject(data: any): Promise<any> {
    const body: any = {
      client_id: data.clientId,
      name: data.name,
      is_billable: data.isBillable,
      bill_by: data.billBy,
      budget_by: data.budgetBy,
    };

    if (data.code) body.code = data.code;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.isFixedFee !== undefined) body.is_fixed_fee = data.isFixedFee;
    if (data.hourlyRate) body.hourly_rate = data.hourlyRate;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/projects',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getProject(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/projects/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllProjects(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.isActive !== undefined) queryParams.is_active = data.isActive;
    if (data.clientId) queryParams.client_id = data.clientId;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/projects',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateProject(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.name) body.name = updateData.name;
    if (updateData.code) body.code = updateData.code;
    if (updateData.isActive !== undefined) body.is_active = updateData.isActive;
    if (updateData.isBillable !== undefined) body.is_billable = updateData.isBillable;
    if (updateData.billBy) body.bill_by = updateData.billBy;
    if (updateData.budgetBy) body.budget_by = updateData.budgetBy;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/projects/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteProject(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/projects/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Task Methods
  private async createTask(data: any): Promise<any> {
    const body: any = { name: data.name };

    if (data.billableByDefault !== undefined) body.billable_by_default = data.billableByDefault;
    if (data.defaultHourlyRate) body.default_hourly_rate = data.defaultHourlyRate;
    if (data.isDefault !== undefined) body.is_default = data.isDefault;
    if (data.isActive !== undefined) body.is_active = data.isActive;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/tasks',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getTask(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/tasks/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllTasks(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.isActive !== undefined) queryParams.is_active = data.isActive;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/tasks',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateTask(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.name) body.name = updateData.name;
    if (updateData.billableByDefault !== undefined) body.billable_by_default = updateData.billableByDefault;
    if (updateData.isActive !== undefined) body.is_active = updateData.isActive;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/tasks/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteTask(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/tasks/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // User Methods
  private async getCurrentUser(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/users/me',
      headers: this.getAuthHeaders(),
    });
  }

  private async getUser(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/users/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllUsers(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.isActive !== undefined) queryParams.is_active = data.isActive;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/users',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async createUser(data: any): Promise<any> {
    const body: any = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
    };

    if (data.telephone) body.telephone = data.telephone;
    if (data.timezone) body.timezone = data.timezone;
    if (data.hasAccessToAllFutureProjects !== undefined) body.has_access_to_all_future_projects = data.hasAccessToAllFutureProjects;
    if (data.isContractor !== undefined) body.is_contractor = data.isContractor;
    if (data.isAdmin !== undefined) body.is_admin = data.isAdmin;
    if (data.isProjectManager !== undefined) body.is_project_manager = data.isProjectManager;
    if (data.canSeeRates !== undefined) body.can_see_rates = data.canSeeRates;
    if (data.canCreateProjects !== undefined) body.can_create_projects = data.canCreateProjects;
    if (data.canCreateInvoices !== undefined) body.can_create_invoices = data.canCreateInvoices;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.weeklyCapacity) body.weekly_capacity = data.weeklyCapacity;
    if (data.defaultHourlyRate) body.default_hourly_rate = data.defaultHourlyRate;
    if (data.costRate) body.cost_rate = data.costRate;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/users',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async updateUser(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.firstName) body.first_name = updateData.firstName;
    if (updateData.lastName) body.last_name = updateData.lastName;
    if (updateData.email) body.email = updateData.email;
    if (updateData.isActive !== undefined) body.is_active = updateData.isActive;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/users/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteUser(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/users/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Contact Methods
  private async createContact(data: any): Promise<any> {
    const body: any = {
      client_id: data.clientId,
      first_name: data.firstName,
    };

    if (data.lastName) body.last_name = data.lastName;
    if (data.title) body.title = data.title;
    if (data.email) body.email = data.email;
    if (data.phoneOffice) body.phone_office = data.phoneOffice;
    if (data.phoneMobile) body.phone_mobile = data.phoneMobile;
    if (data.fax) body.fax = data.fax;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/contacts',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getContact(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/contacts/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllContacts(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.clientId) queryParams.client_id = data.clientId;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/contacts',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateContact(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.firstName) body.first_name = updateData.firstName;
    if (updateData.lastName) body.last_name = updateData.lastName;
    if (updateData.email) body.email = updateData.email;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/contacts/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteContact(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/contacts/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Invoice Methods
  private async createInvoice(data: any): Promise<any> {
    const body: any = { client_id: data.clientId };

    if (data.retroInvoiceId) body.retro_invoice_id = data.retroInvoiceId;
    if (data.estimateId) body.estimate_id = data.estimateId;
    if (data.number) body.number = data.number;
    if (data.purchaseOrder) body.purchase_order = data.purchaseOrder;
    if (data.tax) body.tax = data.tax;
    if (data.tax2) body.tax2 = data.tax2;
    if (data.discount) body.discount = data.discount;
    if (data.subject) body.subject = data.subject;
    if (data.notes) body.notes = data.notes;
    if (data.currency) body.currency = data.currency;
    if (data.issueDate) body.issue_date = data.issueDate;
    if (data.dueDate) body.due_date = data.dueDate;
    if (data.paymentTerm) body.payment_term = data.paymentTerm;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/invoices',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getInvoice(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/invoices/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllInvoices(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.clientId) queryParams.client_id = data.clientId;
    if (data.projectId) queryParams.project_id = data.projectId;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.from) queryParams.from = data.from;
    if (data.to) queryParams.to = data.to;
    if (data.state) queryParams.state = data.state;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/invoices',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateInvoice(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.subject) body.subject = updateData.subject;
    if (updateData.notes) body.notes = updateData.notes;
    if (updateData.purchaseOrder) body.purchase_order = updateData.purchaseOrder;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/invoices/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteInvoice(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/invoices/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Estimate Methods
  private async createEstimate(data: any): Promise<any> {
    const body: any = { client_id: data.clientId };

    if (data.number) body.number = data.number;
    if (data.purchaseOrder) body.purchase_order = data.purchaseOrder;
    if (data.tax) body.tax = data.tax;
    if (data.tax2) body.tax2 = data.tax2;
    if (data.discount) body.discount = data.discount;
    if (data.subject) body.subject = data.subject;
    if (data.notes) body.notes = data.notes;
    if (data.currency) body.currency = data.currency;
    if (data.issueDate) body.issue_date = data.issueDate;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/estimates',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getEstimate(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/estimates/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllEstimates(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.clientId) queryParams.client_id = data.clientId;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.from) queryParams.from = data.from;
    if (data.to) queryParams.to = data.to;
    if (data.state) queryParams.state = data.state;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/estimates',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateEstimate(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.subject) body.subject = updateData.subject;
    if (updateData.notes) body.notes = updateData.notes;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/estimates/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteEstimate(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/estimates/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Expense Methods
  private async createExpense(data: any): Promise<any> {
    const body: any = {
      project_id: data.projectId,
      expense_category_id: data.expenseCategoryId,
      spent_date: data.spentDate,
    };

    if (data.userId) body.user_id = data.userId;
    if (data.units) body.units = data.units;
    if (data.totalCost) body.total_cost = data.totalCost;
    if (data.notes) body.notes = data.notes;
    if (data.billable !== undefined) body.billable = data.billable;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/expenses',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getExpense(data: any): Promise<any> {
    const { id } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/expenses/${id}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllExpenses(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.userId) queryParams.user_id = data.userId;
    if (data.clientId) queryParams.client_id = data.clientId;
    if (data.projectId) queryParams.project_id = data.projectId;
    if (data.isBilled !== undefined) queryParams.is_billed = data.isBilled;
    if (data.updatedSince) queryParams.updated_since = data.updatedSince;
    if (data.from) queryParams.from = data.from;
    if (data.to) queryParams.to = data.to;
    if (data.page) queryParams.page = data.page;
    if (data.perPage) queryParams.per_page = data.perPage;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/expenses',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateExpense(data: any): Promise<any> {
    const { id, ...updateData } = data;

    const body: any = {};
    if (updateData.projectId) body.project_id = updateData.projectId;
    if (updateData.expenseCategoryId) body.expense_category_id = updateData.expenseCategoryId;
    if (updateData.spentDate) body.spent_date = updateData.spentDate;
    if (updateData.units) body.units = updateData.units;
    if (updateData.totalCost) body.total_cost = updateData.totalCost;
    if (updateData.notes) body.notes = updateData.notes;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/expenses/${id}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteExpense(data: any): Promise<any> {
    const { id } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/expenses/${id}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Company Methods
  private async getCompany(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/company',
      headers: this.getAuthHeaders(),
    });
  }
}
