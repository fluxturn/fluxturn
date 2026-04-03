import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  Headers,
  Header,
  BadRequestException,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import { NoCacheInterceptor } from './interceptors/no-cache.interceptor';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiHeader
} from '@nestjs/swagger';
import { JwtOrApiKeyAuthGuard } from '../../auth/guards/jwt-or-api-key-auth.guard';
import { ConnectorsService } from './connectors.service';
import { AuthContext } from './connectors.service';
import { SlackOAuthService } from './services/slack-oauth.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { LinkedInOAuthService } from './services/linkedin-oauth.service';
import { XeroOAuthService } from './services/xero-oauth.service';
import { ZoomOAuthService } from './services/zoom-oauth.service';
import {
  CreateConnectorConfigDto,
  UpdateConnectorConfigDto,
  TestConnectorDto,
  ConnectorActionDto,
  ConnectorListQueryDto,
  ConnectorUsageQueryDto,
  OAuthCallbackDto,
  ConnectorWebhookDto,
  ConnectorTestResultDto,
  ConnectorActionResultDto,
  ConnectorUsageStatsDto
} from './dto/connector.dto';
import { ConnectorConfig, ConnectorUsageLog } from './entities/connector-config.entity';
import { ConnectorMetadata } from './shared';
import { Public } from '../../../common/decorators/public.decorator';
import { ConnectorLookup, ConnectorDefinition } from './shared';

@ApiTags('Connectors')
@Controller('connectors')
@UseGuards(JwtOrApiKeyAuthGuard)
@UseInterceptors(NoCacheInterceptor)
@ApiSecurity('api_key')
@ApiSecurity('JWT')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-project-id',
  description: 'Project ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-app-id',
  description: 'App ID for multi-tenant context (optional)',
  required: false,
})
export class ConnectorsController {
  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly slackOAuthService: SlackOAuthService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly linkedinOAuthService: LinkedInOAuthService,
    private readonly xeroOAuthService: XeroOAuthService,
    private readonly zoomOAuthService: ZoomOAuthService,
  ) {}

  // ============= CRUD Operations =============

  @Post()
  @ApiOperation({ summary: 'Create a new connector configuration' })
  @ApiBody({ type: CreateConnectorConfigDto })
  @ApiResponse({ status: 201, description: 'Connector configuration created successfully', type: ConnectorConfig })
  @ApiResponse({ status: 400, description: 'Invalid input or validation error' })
  @ApiResponse({ status: 409, description: 'Connector name already exists in context' })
  async createConnectorConfig(
    @Request() req,
    @Body() dto: CreateConnectorConfigDto
  ): Promise<ConnectorConfig> {
    const context = this.buildAuthContext(req);

    // Allow user_id from request body (for external apps like Deskive using workspace ID)
    if (dto.user_id && !context.userId) {
      context.userId = dto.user_id;
    }

    return this.connectorsService.createConnectorConfig(dto, context);
  }

  @Get()
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'List connector configurations with filtering and pagination' })
  @ApiQuery({ name: 'connector_type', required: false, description: 'Filter by connector type' })
  @ApiQuery({ name: 'enabled', required: false, description: 'Filter by enabled status' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'error', 'pending'], description: 'Filter by status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results per page (max 100)', type: 'number' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip', type: 'number' })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['name', 'created_at', 'updated_at', 'connector_type'], description: 'Field to sort by' })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({ status: 200, description: 'List of connector configurations' })
  async listConnectorConfigs(
    @Request() req,
    @Query() query: ConnectorListQueryDto
  ): Promise<{ connectors: ConnectorConfig[]; total: number; limit: number; offset: number }> {
    const context = this.buildAuthContext(req);

    return this.connectorsService.listConnectorConfigs(query, context);
  }

  // ============= Connector Discovery - MUST BE BEFORE :id routes =============

  @Public()
  @Get('available')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get list of available connector types' })
  @ApiResponse({ status: 200, description: 'List of available connectors' })
  async getAvailableConnectors(): Promise<ConnectorMetadata[]> {
    return this.connectorsService.getAvailableConnectors();
  }

  @Public()
  @Get('available/:connectorType')
  @ApiOperation({ summary: 'Get metadata for a specific connector type' })
  @ApiParam({ name: 'connectorType', description: 'Connector type identifier', type: 'string' })
  @ApiResponse({ status: 200, description: 'Connector metadata' })
  @ApiResponse({ status: 404, description: 'Connector type not found' })
  async getConnectorMetadata(
    @Param('connectorType') connectorType: string
  ): Promise<ConnectorMetadata> {
    const metadata = await this.connectorsService.getConnectorMetadata(connectorType);
    if (!metadata) {
      throw new BadRequestException(`Unknown connector type: ${connectorType}`);
    }
    return metadata;
  }

  @Public()
  @Get('available/:connectorType/actions')
  @ApiOperation({ summary: 'Get actions for a specific connector type' })
  @ApiParam({ name: 'connectorType', description: 'Connector type identifier', type: 'string' })
  @ApiResponse({ status: 200, description: 'Connector actions list' })
  @ApiResponse({ status: 404, description: 'Connector type not found' })
  async getConnectorActions(
    @Param('connectorType') connectorType: string
  ): Promise<any[]> {
    const actions = await this.connectorsService.getConnectorActions(connectorType);
    return actions;
  }

  @Public()
  @Get('available/:connectorType/triggers')
  @ApiOperation({ summary: 'Get triggers for a specific connector type' })
  @ApiParam({ name: 'connectorType', description: 'Connector type identifier', type: 'string' })
  @ApiResponse({ status: 200, description: 'Connector triggers list' })
  @ApiResponse({ status: 404, description: 'Connector type not found' })
  async getConnectorTriggers(
    @Param('connectorType') connectorType: string
  ): Promise<any[]> {
    const triggers = await this.connectorsService.getConnectorTriggers(connectorType);
    return triggers;
  }

  // ============= Static Connector Definitions (No Database) =============

  @Public()
  @Get('definitions')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get all connector definitions (static JSON, no database query)' })
  @ApiResponse({ status: 200, description: 'All connector definitions' })
  getConnectorDefinitions(): ConnectorDefinition[] {
    return ConnectorLookup.getAll();
  }

  @Public()
  @Get('definitions/:connectorType')
  @ApiOperation({ summary: 'Get single connector definition (static JSON, no database query)' })
  @ApiParam({ name: 'connectorType', description: 'Connector type identifier', type: 'string' })
  @ApiResponse({ status: 200, description: 'Connector definition' })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  getConnectorDefinition(
    @Param('connectorType') connectorType: string
  ): ConnectorDefinition {
    const connector = ConnectorLookup.getByName(connectorType);
    if (!connector) {
      throw new BadRequestException(`Connector not found: ${connectorType}`);
    }
    return connector;
  }

  @Public()
  @Get('definitions/:connectorType/actions')
  @ApiOperation({ summary: 'Get actions for a connector (static JSON, no database query)' })
  @ApiParam({ name: 'connectorType', description: 'Connector type identifier', type: 'string' })
  @ApiResponse({ status: 200, description: 'Connector actions list' })
  getConnectorDefinitionActions(
    @Param('connectorType') connectorType: string
  ): any[] {
    return ConnectorLookup.getActions(connectorType);
  }

  @Public()
  @Get('definitions/:connectorType/triggers')
  @ApiOperation({ summary: 'Get triggers for a connector (static JSON, no database query)' })
  @ApiParam({ name: 'connectorType', description: 'Connector type identifier', type: 'string' })
  @ApiResponse({ status: 200, description: 'Connector triggers list' })
  getConnectorDefinitionTriggers(
    @Param('connectorType') connectorType: string
  ): any[] {
    return ConnectorLookup.getTriggers(connectorType);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get connector configuration by ID' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Connector configuration details', type: ConnectorConfig })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getConnectorConfig(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ConnectorConfig> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorConfig(id, context);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update connector configuration' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateConnectorConfigDto })
  @ApiResponse({ status: 200, description: 'Connector configuration updated successfully', type: ConnectorConfig })
  @ApiResponse({ status: 400, description: 'Invalid input or validation error' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 409, description: 'Connector name already exists in context' })
  async updateConnectorConfig(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConnectorConfigDto
  ): Promise<ConnectorConfig> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.updateConnectorConfig(id, dto, context);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete connector configuration' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Connector configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async deleteConnectorConfig(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    const context = this.buildAuthContext(req);
    await this.connectorsService.deleteConnectorConfig(id, context);
  }

  // ============= Connection Testing =============

  @Post(':id/test')
  @ApiOperation({ summary: 'Test connector connection' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiBody({ type: TestConnectorDto, required: false })
  @ApiResponse({ status: 200, description: 'Connection test results', type: ConnectorTestResultDto })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async testConnectorConnection(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestConnectorDto = {}
  ): Promise<ConnectorTestResultDto> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.testConnectorConnection(id, dto, context);
  }

  // ============= Model Listing =============

  @Get(':id/models')
  @ApiOperation({ summary: 'Get available models for a connector (e.g., AI models)' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'List of available models',
    schema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: { type: 'string' },
          example: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Connector does not support model listing' })
  async getConnectorModels(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ models: string[] }> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorModels(id, context);
  }

  // ============= Webhook Setup =============

  @Post(':id/webhooks/setup')
  @ApiOperation({ summary: 'Setup webhook for connector triggers' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of event types to listen for'
        }
      },
      required: ['events']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook setup successful',
    schema: {
      type: 'object',
      properties: {
        webhookUrl: { type: 'string' },
        webhookId: { type: 'string' },
        webhookSecret: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Webhook setup failed' })
  async setupWebhook(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { events: string[] }
  ): Promise<{ webhookUrl: string; webhookId: string; webhookSecret?: string }> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.setupConnectorWebhook(id, body.events, context);
  }

  // ============= Action Execution =============

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute an action on the connector' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiBody({ type: ConnectorActionDto })
  @ApiResponse({ status: 200, description: 'Action execution result', type: ConnectorActionResultDto })
  @ApiResponse({ status: 400, description: 'Connector is disabled or invalid action' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async executeConnectorAction(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConnectorActionDto
  ): Promise<ConnectorActionResultDto> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.executeConnectorAction(id, dto, context);
  }

  // ============= Dynamic Resource Loading =============

  @Get(':id/resources/spreadsheets')
  @ApiOperation({ summary: 'Get list of spreadsheets from Google Drive for a connector' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of spreadsheets' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getSpreadsheets(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'spreadsheets', {}, context);
  }

  @Get(':id/resources/sheets')
  @ApiOperation({ summary: 'Get list of sheets from a spreadsheet' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'spreadsheetId', required: true, description: 'Spreadsheet ID' })
  @ApiResponse({ status: 200, description: 'List of sheets' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Missing spreadsheet ID' })
  async getSheets(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('spreadsheetId') spreadsheetId: string
  ): Promise<Array<{ label: string; value: string }>> {
    if (!spreadsheetId) {
      throw new BadRequestException('spreadsheetId query parameter is required');
    }
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'sheets', { spreadsheetId }, context);
  }

  @Get(':id/resources/columns')
  @ApiOperation({ summary: 'Get list of column headers from a sheet' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'spreadsheetId', required: true, description: 'Spreadsheet ID' })
  @ApiQuery({ name: 'sheetName', required: true, description: 'Sheet name' })
  @ApiResponse({ status: 200, description: 'List of column headers' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Missing required parameters' })
  async getColumns(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('spreadsheetId') spreadsheetId: string,
    @Query('sheetName') sheetName: string
  ): Promise<Array<{ label: string; value: string }>> {
    if (!spreadsheetId || !sheetName) {
      throw new BadRequestException('spreadsheetId and sheetName query parameters are required');
    }
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(
      id,
      'columns',
      { spreadsheetId, sheetName },
      context
    );
  }

  @Get(':id/resources/calendars')
  @ApiOperation({ summary: 'Get list of Google Calendars from user account' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of calendars' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getCalendars(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'calendars', {}, context);
  }

  // ============= Google Drive Resources =============

  @Get(':id/resources/drives')
  @ApiOperation({ summary: 'Get list of Google Drives (My Drive + Shared Drives)' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of drives' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getDrives(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'drives', {}, context);
  }

  @Get(':id/resources/folders')
  @ApiOperation({ summary: 'Get list of folders from Google Drive' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'driveId', required: false, description: 'Drive ID to fetch folders from' })
  @ApiQuery({ name: 'parentFolderId', required: false, description: 'Parent folder ID' })
  @ApiResponse({ status: 200, description: 'List of folders' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getFolders(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('driveId') driveId?: string,
    @Query('parentFolderId') parentFolderId?: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(
      id,
      'folders',
      { driveId, parentFolderId },
      context
    );
  }

  @Get(':id/resources/files')
  @ApiOperation({ summary: 'Get list of files from Google Drive' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'folderId', required: false, description: 'Folder ID to fetch files from' })
  @ApiResponse({ status: 200, description: 'List of files' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getFiles(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('folderId') folderId?: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(
      id,
      'files',
      { folderId },
      context
    );
  }

  // ============= Notion Resources =============

  @Get(':id/resources/databases')
  @ApiOperation({ summary: 'Get list of databases from Notion workspace' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of Notion databases' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getNotionDatabases(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'databases', {}, context);
  }

  // ============= PostgreSQL Resources =============

  @Get(':id/resources/schemas')
  @ApiOperation({ summary: 'Get list of schemas from PostgreSQL database' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of database schemas' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getPostgreSQLSchemas(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'schemas', {}, context);
  }

  @Get(':id/resources/tables')
  @ApiOperation({ summary: 'Get list of tables from a PostgreSQL schema' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (defaults to public)', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of tables' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getPostgreSQLTables(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('schema') schema?: string
  ): Promise<Array<{ label: string; value: string }>> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'tables', { schema: schema || 'public' }, context);
  }

  @Get(':id/resources/table-columns')
  @ApiOperation({ summary: 'Get list of columns from a PostgreSQL table' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (defaults to public)', type: 'string' })
  @ApiQuery({ name: 'table', required: true, description: 'Table name', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of columns with types' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Missing table name' })
  async getPostgreSQLColumns(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('schema') schema?: string,
    @Query('table') table?: string
  ): Promise<Array<{ label: string; value: string; type?: string }>> {
    if (!table) {
      throw new BadRequestException('table query parameter is required');
    }
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'table-columns', { schema: schema || 'public', table }, context);
  }

  @Get(':id/resources/table-schema')
  @ApiOperation({ summary: 'Get detailed schema information for a PostgreSQL table' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (defaults to public)', type: 'string' })
  @ApiQuery({ name: 'table', required: true, description: 'Table name', type: 'string' })
  @ApiResponse({ status: 200, description: 'Table schema with column details' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Missing table name' })
  async getPostgreSQLTableSchema(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('schema') schema?: string,
    @Query('table') table?: string
  ): Promise<any> {
    if (!table) {
      throw new BadRequestException('table query parameter is required');
    }
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorResource(id, 'table-schema', { schema: schema || 'public', table }, context);
  }

  // ============= Usage Analytics =============

  @Get(':id/usage/stats')
  @ApiOperation({ summary: 'Get connector usage statistics' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date for statistics (ISO 8601)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date for statistics (ISO 8601)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by specific action' })
  @ApiQuery({ name: 'status', required: false, enum: ['success', 'error', 'timeout'], description: 'Filter by execution status' })
  @ApiResponse({ status: 200, description: 'Connector usage statistics', type: ConnectorUsageStatsDto })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getConnectorUsageStats(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConnectorUsageQueryDto
  ): Promise<ConnectorUsageStatsDto> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorUsageStats(id, query, context);
  }

  @Get(':id/usage/logs')
  @ApiOperation({ summary: 'Get connector usage logs' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date for logs (ISO 8601)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date for logs (ISO 8601)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by specific action' })
  @ApiQuery({ name: 'status', required: false, enum: ['success', 'error', 'timeout'], description: 'Filter by execution status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of logs per page (max 200)', type: 'number' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of logs to skip', type: 'number' })
  @ApiResponse({ status: 200, description: 'Connector usage logs' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getConnectorUsageLogs(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConnectorUsageQueryDto
  ): Promise<{ logs: ConnectorUsageLog[]; total: number; limit: number; offset: number }> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getConnectorUsageLogs(id, query, context);
  }


  // ============= OAuth Integration =============

  @Get(':id/oauth/status')
  @ApiOperation({ summary: 'Get OAuth connection status for a connector' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'OAuth connection status',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean', description: 'Whether OAuth is connected' },
        email: { type: 'string', description: 'Connected account email (if available)' },
        expiresAt: { type: 'string', format: 'date-time', description: 'Token expiration time' },
        scopes: { type: 'array', items: { type: 'string' }, description: 'Granted OAuth scopes' },
        connectorType: { type: 'string', description: 'Type of connector' },
        lastRefreshedAt: { type: 'string', format: 'date-time', description: 'Last token refresh time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async getOAuthStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{
    connected: boolean;
    email?: string;
    expiresAt?: string;
    scopes?: string[];
    connectorType: string;
    lastRefreshedAt?: string;
  }> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.getOAuthStatus(id, context);
  }

  @Post(':id/oauth/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke OAuth connection for a connector' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OAuth connection revoked successfully' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Connector is not OAuth-based' })
  async revokeOAuth(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ success: boolean; message: string }> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.revokeOAuth(id, context);
  }

  @Post(':id/oauth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually refresh OAuth token for a connector' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'OAuth token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        expiresAt: { type: 'string', format: 'date-time' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'No refresh token available or connector is not OAuth-based' })
  async refreshOAuthToken(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ success: boolean; expiresAt: string; message: string }> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.refreshOAuthTokenManual(id, context);
  }

  @Post(':id/oauth/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle OAuth callback for connector' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiBody({ type: OAuthCallbackDto })
  @ApiResponse({ status: 200, description: 'OAuth callback processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OAuth callback parameters' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async handleOAuthCallback(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OAuthCallbackDto
  ): Promise<{ success: boolean; message: string }> {
    const context = this.buildAuthContext(req);
    return this.connectorsService.handleOAuthCallback(id, dto.code, dto.state, context, dto.code_verifier);
  }

  @Get(':id/oauth/url')
  @ApiOperation({ summary: 'Get OAuth authorization URL for connector' })
  @ApiParam({ name: 'id', description: 'Connector configuration ID', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'redirect_uri', required: false, description: 'Custom redirect URI' })
  @ApiResponse({ status: 200, description: 'OAuth authorization URL' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  @ApiResponse({ status: 400, description: 'Connector does not support OAuth' })
  async getOAuthUrl(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('redirect_uri') redirectUri?: string
  ): Promise<{ authorization_url: string; state: string; code_verifier?: string }> {
    const context = this.buildAuthContext(req);
    const connector = await this.connectorsService.getConnectorConfig(id, context);
    const metadata = await this.connectorsService.getConnectorMetadata(connector.connector_type);

    if (!metadata?.oauth_config) {
      throw new BadRequestException('Connector does not support OAuth');
    }

    // Extract config - it should already be decrypted by getConnectorConfig
    const config = connector.config || {};

    // Debug logging
    console.log('=== OAuth URL Debug ===');
    console.log('Connector ID:', connector.id);
    console.log('Connector Type:', connector.connector_type);
    console.log('Config keys:', Object.keys(config));
    console.log('Config:', JSON.stringify(config));
    console.log('authMode:', config.authMode);
    console.log('======================');

    // Check if this is one-click OAuth
    if (config.authMode === 'oneclick') {
      return this.handleOneClickOAuth(connector, context);
    }

    // Check if using direct access token mode - OAuth not needed
    if (config.authMode === 'accessToken') {
      // If they have an access token, they don't need OAuth
      if (config.accessToken || config.access_token) {
        throw new BadRequestException(
          'This connector is configured to use a direct access token. OAuth authorization is not needed. ' +
          'If you want to use OAuth instead, change authMode to "oauth2" and provide clientId/clientSecret.'
        );
      }
      // If authMode is accessToken but no token provided, they need to enter one manually
      throw new BadRequestException(
        'This connector is configured for direct access token authentication. ' +
        'Please provide an access token in the connector configuration, or change authMode to "oauth2" for OAuth flow.'
      );
    }

    // Manual OAuth - use credentials from config
    // For centralized OAuth (Google), use environment variables
    let clientId = config.client_id || config.clientId;
    let redirectUriValue = redirectUri || config.redirect_uri || config.redirectUri;

    // Check if this is a centralized OAuth connector (Google services)
    const isGoogleService = ['google_sheets', 'gmail', 'google_calendar', 'google_docs', 'google_drive', 'google_analytics'].includes(connector.connector_type);

    if (isGoogleService && !clientId) {
      // Use centralized Google OAuth credentials from environment
      clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      redirectUriValue = redirectUriValue || process.env.GOOGLE_OAUTH_REDIRECT_URI;
      console.log('DEBUG - Using centralized Google OAuth credentials');
    }

    if (!clientId) {
      throw new BadRequestException('Client ID is required for OAuth');
    }

    if (!redirectUriValue) {
      throw new BadRequestException('Redirect URI is required for OAuth');
    }

    // Handle Xero OAuth specially - it needs proper state encoding for callback
    if (connector.connector_type === 'xero') {
      if (!this.xeroOAuthService.isConfigured()) {
        throw new BadRequestException('Xero OAuth redirect URI is not configured. Please set XERO_OAUTH_REDIRECT_URI in .env');
      }

      // Generate state with credential info for the callback
      const xeroState = this.xeroOAuthService.generateState(
        context.userId,
        connector.id,
        connector.connector_type,
        { returnUrl: undefined }
      );

      // Use XeroOAuthService to generate auth URL with user's clientId
      const xeroAuthUrl = this.xeroOAuthService.getAuthorizationUrl(clientId, xeroState);

      return {
        authorization_url: xeroAuthUrl,
        state: xeroState
      };
    }

    // Handle Zoom OAuth - needs state with credential info for callback
    if (connector.connector_type === 'zoom') {
      const zoomState = this.zoomOAuthService.generateState(
        context.userId,
        connector.id,
        connector.connector_type,
        undefined // returnUrl
      );

      const zoomParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUriValue,
        scope: metadata.oauth_config.scopes.join(' '),
        state: zoomState,
        response_type: 'code'
      });

      const zoomAuthUrl = `${metadata.oauth_config.authorization_url}?${zoomParams.toString()}`;

      return {
        authorization_url: zoomAuthUrl,
        state: zoomState
      };
    }

    // Generate state for CSRF protection
    const state = this.generateRandomState();

    // Build OAuth URL params
    const params: Record<string, string> = {
      client_id: clientId,
      redirect_uri: redirectUriValue,
      scope: metadata.oauth_config.scopes.join(' '),
      state,
      response_type: 'code'
    };

    // Add Google-specific params to force refresh token
    if (isGoogleService) {
      params.access_type = 'offline';
      params.prompt = 'consent';
    }

    // Add PKCE for Twitter/X OAuth 2.0 (required)
    let codeVerifier: string | undefined;
    if (connector.connector_type === 'twitter') {
      const crypto = require('crypto');

      // Generate code_verifier (random string)
      codeVerifier = crypto.randomBytes(32).toString('base64url');

      // Generate code_challenge from code_verifier using SHA256
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';
    }

    const urlParams = new URLSearchParams(params);
    const authUrl = `${metadata.oauth_config.authorization_url}?${urlParams.toString()}`;

    return {
      authorization_url: authUrl,
      state,
      ...(codeVerifier && { code_verifier: codeVerifier })
    };
  }

  // ============= Webhook Handling =============

  @Post('webhook/:connectorType')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle webhook from connector' })
  @ApiParam({ name: 'connectorType', description: 'Connector type that sent the webhook', type: 'string' })
  @ApiBody({ type: ConnectorWebhookDto })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async handleWebhook(
    @Param('connectorType') connectorType: string,
    @Body() dto: ConnectorWebhookDto,
    @Headers() headers: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    // Note: Webhooks don't use normal authentication, they use signature verification
    // Implementation would verify webhook signature and process the event
    
    // This would typically:
    // 1. Verify webhook signature using headers
    // 2. Find relevant connector configurations
    // 3. Process the webhook event
    // 4. Trigger any associated workflows
    
    return {
      success: true,
      message: `Webhook processed for ${connectorType}`
    };
  }

  // ============= Helper Methods =============

  /**
   * Handle one-click OAuth using platform credentials
   */
  private async handleOneClickOAuth(
    connector: any,
    context: AuthContext
  ): Promise<{ authorization_url: string; state: string; code_verifier?: string }> {
    const connectorType = connector.connector_type;

    // Map connector types to OAuth services
    const googleConnectors = ['gmail', 'youtube', 'google_sheets', 'google_drive', 'google_calendar', 'google_docs', 'google_analytics'];
    const slackConnectors = ['slack'];
    const linkedinConnectors = ['linkedin'];

    // Generate state with connector metadata
    let state: string;
    let authUrl: string;

    if (googleConnectors.includes(connectorType)) {
      // Use Google OAuth Service
      if (!this.googleOAuthService.isConfigured()) {
        throw new BadRequestException('Google OAuth is not configured on the platform. Please contact the administrator.');
      }

      state = this.googleOAuthService.generateState(
        context.userId,
        connector.id,
        connectorType,
        undefined // returnUrl
      );

      authUrl = this.googleOAuthService.getAuthorizationUrl(connectorType, state);

      return {
        authorization_url: authUrl,
        state
      };
    } else if (slackConnectors.includes(connectorType)) {
      // Use Slack OAuth Service
      if (!this.slackOAuthService.isConfigured()) {
        throw new BadRequestException('Slack OAuth is not configured on the platform. Please contact the administrator.');
      }

      state = this.slackOAuthService.generateState(
        context.userId,
        connector.id,
        connectorType,
        undefined // returnUrl
      );

      authUrl = this.slackOAuthService.getAuthorizationUrl(state);

      return {
        authorization_url: authUrl,
        state
      };
    } else if (linkedinConnectors.includes(connectorType)) {
      // Use LinkedIn OAuth Service
      if (!this.linkedinOAuthService.isConfigured()) {
        throw new BadRequestException('LinkedIn OAuth is not configured on the platform. Please contact the administrator.');
      }

      // For LinkedIn one-click OAuth, ALWAYS enable organization support by default
      // This ensures users can post as both person and organization
      const organizationSupport = true;
      const legacy = connector.credentials?.legacy ?? connector.config?.legacy ?? false;

      state = this.linkedinOAuthService.generateState(
        context.userId,
        connector.id,
        connectorType,
        {
          returnUrl: undefined,
          legacy,
          organizationSupport,
        }
      );

      authUrl = this.linkedinOAuthService.getAuthorizationUrl(state, {
        legacy,
        organizationSupport,
      });

      return {
        authorization_url: authUrl,
        state
      };
    } else {
      throw new BadRequestException(
        `One-click OAuth is not supported for ${connectorType}. Please use manual OAuth configuration.`
      );
    }
  }

  /**
   * Build authentication context from request
   */
  private buildAuthContext(req: any): AuthContext {
    const user = req.user;
    const context = this.extractMultiTenantContext(req);

    return {
      type: 'jwt',
      userId: user?.id || user?.userId || user?.sub,
      organizationId: context.organizationId,
      projectId: context.projectId,
    };
  }

  /**
   * Extract and validate multi-tenant context from request headers
   */
  private extractMultiTenantContext(req: any): {
    organizationId: string;
    projectId: string;
  } {
    const contextOrganizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const contextProjectId = req.headers['x-project-id'] || req.auth?.projectId;

    if (!contextOrganizationId) {
      throw new BadRequestException('Organization ID is required. Provide it via x-organization-id header or ensure your API key has organization context.');
    }
    if (!contextProjectId) {
      throw new BadRequestException('Project ID is required. Provide it via x-project-id header or ensure your API key has project context.');
    }

    return {
      organizationId: contextOrganizationId,
      projectId: contextProjectId,
    };
  }

  /**
   * Generate random state for OAuth CSRF protection
   */
  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}