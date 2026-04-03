import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  OAuthTokens
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

// Google Sheets-specific interfaces
export interface SheetsAppendRequest {
  spreadsheetId: string;
  sheetName: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface SheetsUpdateRequest {
  spreadsheetId: string;
  sheetName: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface SheetsGetRequest {
  spreadsheetId: string;
  sheetName?: string;
  sheet?: string; // Legacy support
  range?: string;
  returnLinkToSheet?: boolean;
}

export interface SheetsClearRequest {
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
}

export interface SheetsCreateRequest {
  title: string;
  sheets?: Array<{
    title: string;
  }>;
}

export interface SheetsAppendOrUpdateRequest {
  spreadsheetId: string;
  sheetName: string;
  columnToMatchOn?: string; // Optional - if not provided, just appends
  valueToMatch?: string;
  values?: Record<string, any>; // Old field - for backwards compatibility
  columns?: Record<string, any>; // New field - from resourceMapper
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  appendIfNotFound?: boolean;
}

@Injectable()
export class GoogleSheetsConnector extends BaseConnector implements IConnector {
  private baseUrl = 'https://sheets.googleapis.com/v4';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Google Sheets',
      description: 'Create, read, update, and manage Google Sheets spreadsheets',
      version: '1.0.0',
      category: ConnectorCategory.STORAGE,
      type: ConnectorType.GOOGLE_SHEETS,
      logoUrl: 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico',
      documentationUrl: 'https://developers.google.com/sheets/api',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Log credential info for debugging
    this.logger.log('[initializeConnection] Credential keys:', Object.keys(this.config.credentials || {}).join(', '));

    const hasAccessToken = !!this.config.credentials?.accessToken;
    const hasRefreshToken = !!this.config.credentials?.refreshToken;
    const expiresAt = this.config.credentials?.expiresAt;

    this.logger.log(`[initializeConnection] Has accessToken: ${hasAccessToken}, Has refreshToken: ${hasRefreshToken}, expiresAt: ${expiresAt}`);

    // Check if we need to refresh the OAuth token
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      this.logger.log(`[initializeConnection] Token expiration check - Current: ${new Date(currentTime).toISOString()}, Expires: ${new Date(expirationTime).toISOString()}, Expired: ${currentTime >= expirationTime}`);

      // Refresh if expired or expiring within 5 minutes
      if (currentTime >= expirationTime - fiveMinutesInMs) {
        this.logger.log('OAuth token expired or expiring soon, refreshing...');
        try {
          await this.refreshTokens();
          this.logger.log('OAuth token refreshed successfully');
        } catch (error) {
          this.logger.error('Failed to refresh OAuth token:', error.message);
          throw new Error('OAuth token expired. Please reconnect your Google Sheets account.');
        }
      }
    } else if (!hasAccessToken) {
      throw new Error('No access token found. Please reconnect your Google Sheets account.');
    } else {
      this.logger.warn('No expiration time found for access token. Token may be expired.');
    }

    this.logger.log('Google Sheets connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const driveBaseUrl = 'https://www.googleapis.com/drive/v3';
      await this.performRequest({
        method: 'GET',
        endpoint: `${driveBaseUrl}/about`,
        headers: this.getAuthHeaders(),
        queryParams: {
          fields: 'user'
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Google Sheets health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Google Sheets API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'append_row':
        return this.appendRow(input);
      case 'update_row':
        return this.updateRow(input);
      case 'append_or_update_row':
        return this.appendOrUpdateRow(input);
      case 'get_rows':
        return this.getRows(input);
      case 'clear':
        return this.clearRange(input);
      case 'create_spreadsheet':
        return this.createSpreadsheet(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Google Sheets connector cleanup completed');
  }

  // Google Sheets-specific methods
  async appendRow(request: SheetsAppendRequest): Promise<ConnectorResponse> {
    try {
      const { spreadsheetId, sheetName, values, valueInputOption = 'USER_ENTERED' } = request;
      const range = `${sheetName}!A:ZZ`;

      this.logger.log(`[appendRow] Received request:`, JSON.stringify({ spreadsheetId, sheetName, values, valueInputOption }, null, 2));
      this.logger.log(`[appendRow] Values type: ${typeof values}, Is array: ${Array.isArray(values)}`);
      if (Array.isArray(values)) {
        this.logger.log(`[appendRow] Values length: ${values.length}`);
        if (values.length > 0) {
          this.logger.log(`[appendRow] First item type: ${typeof values[0]}, Is array: ${Array.isArray(values[0])}`);
        }
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/spreadsheets/${spreadsheetId}/values/${range}:append`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        queryParams: {
          valueInputOption,
          insertDataOption: 'INSERT_ROWS'
        },
        body: {
          values
        }
      });

      return {
        success: true,
        data: {
          spreadsheetId,
          updatedRange: response.updates?.updatedRange,
          updatedRows: response.updates?.updatedRows,
          updatedColumns: response.updates?.updatedColumns,
          updatedCells: response.updates?.updatedCells
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to append row');
    }
  }

  async updateRow(request: SheetsUpdateRequest): Promise<ConnectorResponse> {
    try {
      const { spreadsheetId, sheetName, range, values, valueInputOption = 'USER_ENTERED' } = request;
      const fullRange = `${sheetName}!${range}`;

      const response = await this.performRequest({
        method: 'PUT',
        endpoint: `${this.baseUrl}/spreadsheets/${spreadsheetId}/values/${fullRange}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        queryParams: {
          valueInputOption
        },
        body: {
          values
        }
      });

      return {
        success: true,
        data: {
          spreadsheetId,
          updatedRange: response.updatedRange,
          updatedRows: response.updatedRows,
          updatedColumns: response.updatedColumns,
          updatedCells: response.updatedCells
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update row');
    }
  }

  async appendOrUpdateRow(request: SheetsAppendOrUpdateRequest): Promise<ConnectorResponse> {
    try {
      const {
        spreadsheetId,
        sheetName,
        columnToMatchOn,
        valueToMatch,
        values,
        columns, // New field from resourceMapper
        valueInputOption = 'USER_ENTERED',
        appendIfNotFound = true
      } = request;

      // Use 'columns' if provided (from new schema), otherwise fall back to 'values'
      const rowData = columns || values;

      if (!rowData || typeof rowData !== 'object') {
        throw new Error('Column data is required');
      }

      // Step 1: Fetch all sheet data including headers
      const getResponse = await this.getRows({
        spreadsheetId,
        sheet: sheetName
      });

      if (!getResponse.success || !getResponse.data.values || getResponse.data.values.length === 0) {
        // No data in sheet, append as first row with headers
        const headers = Object.keys(rowData);
        const rowValues = headers.map(header => rowData[header]);

        const appendResponse = await this.appendRow({
          spreadsheetId,
          sheetName: sheetName,
          values: [headers, rowValues],
          valueInputOption
        });

        return {
          success: true,
          data: {
            operation: 'appended',
            rowIndex: 2,
            spreadsheetId,
            updatedRange: appendResponse.data?.updatedRange
          }
        };
      }

      const sheetData = getResponse.data.values;
      const headers = sheetData[0] as string[];

      // If no columnToMatchOn specified, just append
      if (!columnToMatchOn) {
        // Convert rowData object to array based on header order
        const rowArray = headers.map(header => {
          const headerKey = Object.keys(rowData).find(
            key => key.toLowerCase() === header.toLowerCase()
          );
          return headerKey !== undefined ? rowData[headerKey] : '';
        });

        const appendResponse = await this.appendRow({
          spreadsheetId,
          sheetName: sheetName,
          values: [rowArray],
          valueInputOption
        });

        return {
          success: true,
          data: {
            operation: 'appended',
            spreadsheetId,
            updatedRange: appendResponse.data?.updatedRange
          }
        };
      }

      // Step 2: Find the column index for the matching column
      const matchColumnIndex = headers.findIndex(
        header => header && header.toString().toLowerCase() === columnToMatchOn.toLowerCase()
      );

      if (matchColumnIndex === -1) {
        throw new Error(`Column "${columnToMatchOn}" not found in sheet headers`);
      }

      // Step 3: Search for a row where that column contains the target value
      let matchedRowIndex = -1;
      if (valueToMatch !== undefined && valueToMatch !== null) {
        for (let i = 1; i < sheetData.length; i++) {
          const row = sheetData[i];
          const cellValue = row[matchColumnIndex];

          if (cellValue !== undefined && cellValue !== null &&
              cellValue.toString() === valueToMatch.toString()) {
            matchedRowIndex = i;
            break;
          }
        }
      }

      // Step 4: Convert rowData object to array based on header order
      const rowArray = headers.map(header => {
        const headerKey = Object.keys(rowData).find(
          key => key.toLowerCase() === header.toLowerCase()
        );
        return headerKey !== undefined ? rowData[headerKey] : '';
      });

      // Step 5: Either update or append
      if (matchedRowIndex !== -1) {
        // Update the existing row
        const rowNumber = matchedRowIndex + 1; // Convert to 1-based index
        const range = `A${rowNumber}:${this.columnIndexToLetter(headers.length - 1)}${rowNumber}`;

        const updateResponse = await this.updateRow({
          spreadsheetId,
          sheetName: sheetName,
          range,
          values: [rowArray],
          valueInputOption
        });

        return {
          success: true,
          data: {
            operation: 'updated',
            rowIndex: rowNumber,
            spreadsheetId,
            updatedRange: updateResponse.data?.updatedRange
          }
        };
      } else {
        // Append new row
        if (!appendIfNotFound) {
          throw new Error('No matching row found and appendIfNotFound is false');
        }

        const appendResponse = await this.appendRow({
          spreadsheetId,
          sheetName: sheetName,
          values: [rowArray],
          valueInputOption
        });

        return {
          success: true,
          data: {
            operation: 'appended',
            rowIndex: sheetData.length + 1,
            spreadsheetId,
            updatedRange: appendResponse.data?.updatedRange
          }
        };
      }
    } catch (error) {
      return this.handleError(error as any, 'Failed to append or update row');
    }
  }

  // Helper method to convert column index to letter (0 -> A, 1 -> B, etc.)
  private columnIndexToLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  async getRows(request: any): Promise<ConnectorResponse> {
    try {
      let { spreadsheetId, sheetName, sheet, range, returnLinkToSheet } = request;

      // Support both 'sheetName' (new) and 'sheet' (legacy) parameter names
      const sheetNameValue = sheetName || sheet;

      // Handle combined range format (e.g., "Sheet1!A1:D10")
      // If range contains "!" but sheet is not provided, parse it
      if (!sheetNameValue && range && range.includes('!')) {
        const parts = range.split('!');
        sheetName = parts[0];
        range = parts[1] || undefined;
        this.logger.log(`Parsed combined range "${request.range}" into sheetName="${sheetName}", range="${range}"`);
      }

      // Use sheetNameValue for the final value
      sheetName = sheetNameValue || sheetName;

      // Validate required fields after parsing
      if (!spreadsheetId) {
        throw new Error('spreadsheetId is required');
      }
      if (!sheetName) {
        throw new Error('sheetName is required (or provide range in format "Sheet1!A1:D10")');
      }

      // Warn if sheet name looks like a placeholder
      if (sheetName.toLowerCase() === 'sheet' || sheetName.toLowerCase() === 'sheetname') {
        this.logger.warn(`Sheet name "${sheetName}" looks like a placeholder. Make sure to use the actual sheet tab name from your spreadsheet.`);
      }

      const fullRange = range ? `${sheetName}!${range}` : sheetName;

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/spreadsheets/${spreadsheetId}/values/${fullRange}`,
        headers: this.getAuthHeaders()
      });

      const data: any = {
        range: response.range,
        values: response.values || []
      };

      if (returnLinkToSheet) {
        data.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      // Provide more helpful error message for invalid range errors
      if (error.message?.includes('Unable to parse range') || error.details?.error?.message?.includes('Unable to parse range')) {
        const { sheetName: requestSheetName, sheet: requestSheet, range } = request;
        const finalSheetName = requestSheetName || requestSheet;
        const attemptedRange = range ? `${finalSheetName}!${range}` : finalSheetName;

        return {
          success: false,
          error: {
            code: 'INVALID_RANGE',
            message: `Invalid range format: "${attemptedRange}". Make sure to use the actual sheet tab name (e.g., "Sheet1", "Data") instead of placeholders like "Sheet". Check your spreadsheet for the correct sheet name.`,
            details: {
              attemptedRange,
              sheetName: finalSheetName,
              cellRange: range,
              originalError: error.message
            }
          }
        };
      }

      return this.handleError(error, 'Failed to get rows');
    }
  }

  async clearRange(request: SheetsClearRequest): Promise<ConnectorResponse> {
    try {
      const { spreadsheetId, sheetName, range } = request;

      // Build the full range (sheetName!range or just range if it already includes sheet)
      const fullRange = sheetName && range ? `${sheetName}!${range}` : (range || sheetName);

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/spreadsheets/${spreadsheetId}/values/${fullRange}:clear`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {}
      });

      return {
        success: true,
        data: {
          spreadsheetId,
          clearedRange: response.clearedRange
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to clear range');
    }
  }

  async createSpreadsheet(request: SheetsCreateRequest): Promise<ConnectorResponse> {
    try {
      const { title, sheets } = request;

      const body: any = {
        properties: {
          title
        }
      };

      if (sheets && sheets.length > 0) {
        body.sheets = sheets.map(sheet => ({
          properties: {
            title: sheet.title
          }
        }));
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/spreadsheets`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body
      });

      return {
        success: true,
        data: {
          spreadsheetId: response.spreadsheetId,
          spreadsheetUrl: response.spreadsheetUrl,
          title: response.properties.title
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create spreadsheet');
    }
  }

  async refreshTokens(): Promise<OAuthTokens> {
    try {
      const refreshToken = this.config.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const clientId = this.config.credentials.clientId;
      const clientSecret = this.config.credentials.clientSecret;
      if (!clientId || !clientSecret) {
        throw new Error('Client ID and Secret are required for token refresh');
      }

      const tokenResponse = await this.apiUtils.executeRequest({
        method: 'POST',
        endpoint: 'https://oauth2.googleapis.com/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }).toString()
      });

      if (!tokenResponse.success) {
        throw new Error('Failed to refresh OAuth token');
      }

      const tokens: OAuthTokens = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokenResponse.data.expires_in * 1000)),
        scope: tokenResponse.data.scope,
        tokenType: tokenResponse.data.token_type
      };

      // Update stored credentials
      this.config.credentials.accessToken = tokens.accessToken;
      this.config.credentials.refreshToken = tokens.refreshToken;

      return tokens;
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return this.authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'append_row',
        name: 'Append Row',
        description: 'Append rows to a sheet',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet ID',
            description: 'The ID of the spreadsheet',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive'
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet name',
            description: 'Name of the sheet tab',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet'
          },
          values: { type: 'array', required: true, label: 'Values to append', description: 'Values to append' },
          valueInputOption: { type: 'string', label: 'How input data should be interpreted', description: 'How input data should be interpreted' }
        },
        outputSchema: {
          spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
          updatedRange: { type: 'string', description: 'Updated range' },
          updatedRows: { type: 'number', description: 'Number of rows updated' }
        }
      },
      {
        id: 'update_row',
        name: 'Update Row',
        description: 'Update rows in a sheet',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet ID',
            description: 'The ID of the spreadsheet',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive'
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet name',
            description: 'Name of the sheet tab',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet'
          },
          range: { type: 'string', required: true, label: 'Range', description: 'Range to update (e.g., A1:B2)' },
          values: { type: 'array', required: true, label: 'Values', description: 'Values to update' }
        },
        outputSchema: {
          updatedRange: { type: 'string', description: 'Updated range' },
          updatedRows: { type: 'number', description: 'Number of rows updated' }
        }
      },
      {
        id: 'append_or_update_row',
        name: 'Append or Update Row',
        description: 'Append a new row or update an existing row based on a matching column',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet from your Google Drive',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive',
            order: 1
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet from the spreadsheet',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet',
            order: 2
          },
          columns: {
            type: 'resourceMapper',
            required: true,
            label: 'Columns',
            description: 'Enter values for each column',
            loadColumnsResource: 'columns',
            loadColumnsDependsOn: ['spreadsheetId', 'sheetName'],
            order: 3
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether operation succeeded' },
          operation: { type: 'string', description: 'Whether row was updated or appended' },
          rowIndex: { type: 'number', description: 'Row index affected' },
          updatedRange: { type: 'string', description: 'Range that was updated' }
        }
      },
      {
        id: 'get_rows',
        name: 'Get Rows',
        description: 'Retrieve rows from a sheet',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet ID',
            description: 'The ID of the spreadsheet',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive'
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet from the spreadsheet',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet'
          },
          range: {
            type: 'string',
            label: 'Range',
            required: false,
            inputType: 'rangeSelector',
            description: 'Select start and end column/row. Leave empty to get all rows.',
            placeholder: 'A1:D10'
          },
          returnLinkToSheet: { type: 'boolean', label: 'Return link to sheet', description: 'Include spreadsheet URL' }
        },
        outputSchema: {
          values: { type: 'array', description: 'Sheet values' },
          spreadsheetUrl: { type: 'string', description: 'URL to the spreadsheet' }
        }
      },
      {
        id: 'clear',
        name: 'Clear Range',
        description: 'Clear values from a range',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet ID',
            description: 'The ID of the spreadsheet',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive'
          },
          range: { type: 'string', required: true, label: 'Range', description: 'Range to clear' }
        },
        outputSchema: {
          clearedRange: { type: 'string', description: 'Cleared range' }
        }
      },
      {
        id: 'create_spreadsheet',
        name: 'Create Spreadsheet',
        description: 'Create a new spreadsheet',
        inputSchema: {
          title: { type: 'string', required: true, description: 'Spreadsheet title' },
          sheets: { type: 'array', description: 'Initial sheets to create' }
        },
        outputSchema: {
          spreadsheetId: { type: 'string', description: 'New spreadsheet ID' },
          spreadsheetUrl: { type: 'string', description: 'URL to the spreadsheet' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'row_added',
        name: 'On Row Added',
        description: 'Triggers when a new row is added to the sheet',
        eventType: 'polling',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet to monitor',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive'
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet to monitor',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet'
          },
          pollInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            description: 'How often to check for new rows',
            default: 5
          }
        },
        outputSchema: {
          spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
          sheetName: { type: 'string', description: 'Sheet name' },
          rowIndex: { type: 'number', description: 'Row index' },
          values: { type: 'array', description: 'Row values' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'row_updated',
        name: 'On Row Updated',
        description: 'Triggers when an existing row is updated',
        eventType: 'polling',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet to monitor',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive'
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet to monitor',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet'
          },
          pollInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            description: 'How often to check for updated rows',
            default: 5
          }
        },
        outputSchema: {
          spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
          sheetName: { type: 'string', description: 'Sheet name' },
          rowIndex: { type: 'number', description: 'Row index' },
          values: { type: 'array', description: 'Updated row values' },
          previousValues: { type: 'array', description: 'Previous row values' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'row_added_or_updated',
        name: 'On Row Added or Updated',
        description: 'Triggers when a row is added or updated',
        eventType: 'polling',
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet to monitor',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive'
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet to monitor',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet'
          },
          pollInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            description: 'How often to check for changes',
            default: 5
          }
        },
        outputSchema: {
          spreadsheetId: { type: 'string', description: 'Spreadsheet ID' },
          sheetName: { type: 'string', description: 'Sheet name' },
          rowIndex: { type: 'number', description: 'Row index' },
          values: { type: 'array', description: 'Row values' },
          eventType: { type: 'string', description: 'Event type: added or updated' }
        },
        webhookRequired: false,
        pollingEnabled: true
      }
    ];
  }

  // ============= Resource Loading Methods for Dynamic UI =============

  /**
   * Fetch list of spreadsheets from Google Drive
   * Used to populate spreadsheet dropdown dynamically
   */
  async getSpreadsheets(): Promise<Array<{ label: string; value: string }>> {
    try {
      const driveBaseUrl = 'https://www.googleapis.com/drive/v3';

      // Check if we have an access token
      if (!this.config.credentials?.accessToken) {
        this.logger.error('No access token found in credentials');
        throw new Error('Access token is missing. Please reconnect your Google account.');
      }

      this.logger.log('Fetching spreadsheets with access token');

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${driveBaseUrl}/files`,
        headers: this.getAuthHeaders(),
        queryParams: {
          q: "mimeType='application/vnd.google-apps.spreadsheet'",
          fields: 'files(id, name)',
          pageSize: 100,
          orderBy: 'modifiedTime desc'
        }
      });

      this.logger.log(`Got response from Google Drive API:`, {
        hasFiles: !!response.files,
        filesCount: response.files?.length || 0,
        files: response.files?.map((f: any) => f.name) || []
      });

      if (!response.files || response.files.length === 0) {
        this.logger.warn('No spreadsheets found in Google Drive');
        return [];
      }

      const spreadsheets = response.files.map((file: any) => ({
        label: file.name,
        value: file.id
      }));

      this.logger.log(`Returning ${spreadsheets.length} spreadsheets`);

      return spreadsheets;
    } catch (error) {
      this.logger.error(`Failed to fetch spreadsheets:`, error);

      // Check if it's an auth error
      if (error.statusCode === 401 || error.code === 'HTTP_401') {
        throw new Error('Authentication failed. Please reconnect your Google Sheets account.');
      }

      throw new Error(`Failed to fetch spreadsheets: ${error.message}`);
    }
  }

  /**
   * Fetch list of sheets from a specific spreadsheet
   * Used to populate sheet dropdown dynamically based on selected spreadsheet
   */
  async getSheetsFromSpreadsheet(spreadsheetId: string): Promise<Array<{ label: string; value: string }>> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/spreadsheets/${spreadsheetId}`,
        headers: this.getAuthHeaders(),
        queryParams: {
          fields: 'sheets.properties'
        }
      });

      if (!response.sheets || response.sheets.length === 0) {
        return [];
      }

      // Filter only GRID type sheets (exclude charts, etc.)
      return response.sheets
        .filter((sheet: any) => sheet.properties.sheetType === 'GRID')
        .map((sheet: any) => ({
          label: sheet.properties.title,
          value: sheet.properties.title
        }));
    } catch (error) {
      this.logger.error(`Failed to fetch sheets for spreadsheet ${spreadsheetId}: ${error.message}`);
      throw new Error('Failed to fetch sheets from spreadsheet');
    }
  }

  /**
   * Fetch column headers from a specific sheet
   * Used to populate column dropdowns dynamically
   */
  async getColumnHeaders(spreadsheetId: string, sheetName: string): Promise<Array<{ label: string; value: string }>> {
    try {
      // Fetch first row (headers) from the sheet
      const range = `${sheetName}!1:1`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        headers: this.getAuthHeaders(),
        queryParams: {
          valueRenderOption: 'FORMATTED_VALUE'
        }
      });

      if (!response.values || response.values.length === 0 || !response.values[0]) {
        return [];
      }

      const headers = response.values[0];

      // Filter out empty headers and map to label/value format
      return headers
        .filter((header: any) => header && header.toString().trim() !== '')
        .map((header: any) => ({
          label: header.toString(),
          value: header.toString()
        }));
    } catch (error) {
      this.logger.error(`Failed to fetch column headers for ${sheetName}: ${error.message}`);
      throw new Error('Failed to fetch column headers from sheet');
    }
  }
}
