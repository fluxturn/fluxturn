import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiSecurity,
  ApiHeader
} from '@nestjs/swagger';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key-auth.guard';
import { ConnectionService, AuthContext } from './services/connection.service';
import { SchemaBrowserService } from './services/schema-browser.service';
import { QueryExecutorService } from './services/query-executor.service';
import {
  CreateConnectionDto,
  UpdateConnectionDto,
  ListConnectionsQueryDto,
  TestConnectionDto
} from './dto/connection.dto';
import {
  ExecuteQueryDto,
  SelectRowsDto,
  InsertRowsDto,
  UpdateRowsDto,
  DeleteRowsDto,
  QueryHistoryQueryDto
} from './dto/query.dto';

@ApiTags('Database Browser')
@Controller('database-browser')
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity('api_key')
@ApiSecurity('JWT')
@ApiHeader({ name: 'x-organization-id', required: false })
@ApiHeader({ name: 'x-project-id', required: false })
export class DatabaseBrowserController {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly schemaBrowserService: SchemaBrowserService,
    private readonly queryExecutorService: QueryExecutorService
  ) {}

  // ============= Connection Management =============

  @Post('connections')
  @ApiOperation({ summary: 'Create a new database connection' })
  @ApiBody({ type: CreateConnectionDto })
  @ApiResponse({ status: 201, description: 'Connection created successfully' })
  async createConnection(
    @Request() req,
    @Body() dto: CreateConnectionDto
  ) {
    const context = this.buildAuthContext(req);
    return this.connectionService.createConnection(dto, context);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List database connections for project' })
  @ApiResponse({ status: 200, description: 'List of connections' })
  async listConnections(
    @Request() req,
    @Query() query: ListConnectionsQueryDto
  ) {
    const context = this.buildAuthContext(req);
    return this.connectionService.listConnections(query, context);
  }

  @Get('connections/:id')
  @ApiOperation({ summary: 'Get connection details' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiResponse({ status: 200, description: 'Connection details' })
  async getConnection(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const context = this.buildAuthContext(req);
    return this.connectionService.getConnection(id, context);
  }

  @Put('connections/:id')
  @ApiOperation({ summary: 'Update connection' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiBody({ type: UpdateConnectionDto })
  @ApiResponse({ status: 200, description: 'Connection updated' })
  async updateConnection(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConnectionDto
  ) {
    const context = this.buildAuthContext(req);
    return this.connectionService.updateConnection(id, dto, context);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete connection' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiResponse({ status: 204, description: 'Connection deleted' })
  async deleteConnection(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const context = this.buildAuthContext(req);
    return this.connectionService.deleteConnection(id, context);
  }

  @Post('connections/:id/test')
  @ApiOperation({ summary: 'Test an existing connection' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testSavedConnection(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const context = this.buildAuthContext(req);
    return this.connectionService.testSavedConnection(id, context);
  }

  @Post('connections/test')
  @ApiOperation({ summary: 'Test connection without saving' })
  @ApiBody({ type: TestConnectionDto })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testNewConnection(@Body() dto: TestConnectionDto) {
    return this.connectionService.testNewConnection(dto);
  }

  // ============= Schema Browsing =============

  @Get('connections/:id/schemas')
  @ApiOperation({ summary: 'List schemas/databases' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiResponse({ status: 200, description: 'List of schemas' })
  async getSchemas(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const context = this.buildAuthContext(req);
    return this.schemaBrowserService.getSchemas(id, context);
  }

  @Get('connections/:id/tables')
  @ApiOperation({ summary: 'List tables in schema' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (default: public)' })
  @ApiResponse({ status: 200, description: 'List of tables' })
  async getTables(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('schema') schema: string = 'public'
  ) {
    const context = this.buildAuthContext(req);
    return this.schemaBrowserService.getTables(id, schema, context);
  }

  @Get('connections/:id/tables/:table/columns')
  @ApiOperation({ summary: 'Get table columns' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (default: public)' })
  @ApiResponse({ status: 200, description: 'List of columns' })
  async getTableColumns(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Query('schema') schema: string = 'public'
  ) {
    const context = this.buildAuthContext(req);
    return this.schemaBrowserService.getTableColumns(id, schema, table, context);
  }

  @Get('connections/:id/tables/:table/indexes')
  @ApiOperation({ summary: 'Get table indexes' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (default: public)' })
  @ApiResponse({ status: 200, description: 'List of indexes' })
  async getTableIndexes(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Query('schema') schema: string = 'public'
  ) {
    const context = this.buildAuthContext(req);
    return this.schemaBrowserService.getTableIndexes(id, schema, table, context);
  }

  @Get('connections/:id/tables/:table/foreign-keys')
  @ApiOperation({ summary: 'Get table foreign keys' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (default: public)' })
  @ApiResponse({ status: 200, description: 'List of foreign keys' })
  async getTableForeignKeys(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Query('schema') schema: string = 'public'
  ) {
    const context = this.buildAuthContext(req);
    return this.schemaBrowserService.getTableForeignKeys(id, schema, table, context);
  }

  @Get('connections/:id/tables/:table/structure')
  @ApiOperation({ summary: 'Get full table structure' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (default: public)' })
  @ApiResponse({ status: 200, description: 'Table structure' })
  async getTableStructure(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Query('schema') schema: string = 'public'
  ) {
    const context = this.buildAuthContext(req);
    return this.schemaBrowserService.getTableStructure(id, schema, table, context);
  }

  // ============= Data Operations =============

  @Get('connections/:id/tables/:table/rows')
  @ApiOperation({ summary: 'Select rows from table' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiQuery({ name: 'schema', required: false, description: 'Schema name (default: public)' })
  @ApiQuery({ name: 'columns', required: false, description: 'Columns to select' })
  @ApiQuery({ name: 'limit', required: false, description: 'Rows per page (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset (default: 0)' })
  @ApiQuery({ name: 'order_by', required: false, description: 'ORDER BY clause' })
  @ApiResponse({ status: 200, description: 'Table rows with pagination' })
  async selectRows(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Query('schema') schema: string = 'public',
    @Query('columns') columns?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('order_by') orderBy?: string
  ) {
    const context = this.buildAuthContext(req);
    const dto: SelectRowsDto = {
      schema,
      table,
      columns,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      order_by: orderBy
    };
    return this.queryExecutorService.selectRows(id, dto, context);
  }

  @Post('connections/:id/tables/:table/rows')
  @ApiOperation({ summary: 'Insert rows into table' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiBody({ type: InsertRowsDto })
  @ApiResponse({ status: 201, description: 'Rows inserted' })
  async insertRows(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Body() dto: InsertRowsDto
  ) {
    const context = this.buildAuthContext(req);
    dto.table = table;
    return this.queryExecutorService.insertRows(id, dto, context);
  }

  @Put('connections/:id/tables/:table/rows')
  @ApiOperation({ summary: 'Update rows in table' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiBody({ type: UpdateRowsDto })
  @ApiResponse({ status: 200, description: 'Rows updated' })
  async updateRows(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Body() dto: UpdateRowsDto
  ) {
    const context = this.buildAuthContext(req);
    dto.table = table;
    return this.queryExecutorService.updateRows(id, dto, context);
  }

  @Delete('connections/:id/tables/:table/rows')
  @ApiOperation({ summary: 'Delete rows from table' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiParam({ name: 'table', description: 'Table name' })
  @ApiBody({ type: DeleteRowsDto })
  @ApiResponse({ status: 200, description: 'Rows deleted' })
  async deleteRows(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('table') table: string,
    @Body() dto: DeleteRowsDto
  ) {
    const context = this.buildAuthContext(req);
    dto.table = table;
    return this.queryExecutorService.deleteRows(id, dto, context);
  }

  // ============= Raw Query Execution =============

  @Post('connections/:id/query')
  @ApiOperation({ summary: 'Execute raw SQL query' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiBody({ type: ExecuteQueryDto })
  @ApiResponse({ status: 200, description: 'Query result' })
  async executeQuery(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteQueryDto
  ) {
    const context = this.buildAuthContext(req);
    return this.queryExecutorService.executeQuery(id, dto, context);
  }

  @Get('connections/:id/query/history')
  @ApiOperation({ summary: 'Get query history' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Results to skip' })
  @ApiResponse({ status: 200, description: 'Query history' })
  async getQueryHistory(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryHistoryQueryDto
  ) {
    const context = this.buildAuthContext(req);
    return this.queryExecutorService.getQueryHistory(
      id,
      context,
      query.limit || 50,
      query.offset || 0
    );
  }

  // ============= Helper Methods =============

  private buildAuthContext(req: any): AuthContext {
    return {
      type: req.auth?.type || 'jwt',
      userId: req.auth?.userId || req.user?.id,
      organizationId: req.auth?.organizationId || req.headers['x-organization-id'],
      projectId: req.auth?.projectId || req.headers['x-project-id'],
      appId: req.auth?.appId || req.headers['x-app-id']
    };
  }
}
