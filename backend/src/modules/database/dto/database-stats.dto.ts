import { ApiProperty } from '@nestjs/swagger';

export class TableInfoDto {
  @ApiProperty({ description: 'Table name' })
  tableName: string;

  @ApiProperty({ description: 'Table schema/namespace' })
  schemaName: string;

  @ApiProperty({ description: 'Number of rows in table' })
  rowCount: number;

  @ApiProperty({ description: 'Table size in bytes' })
  sizeBytes: number;

  @ApiProperty({ description: 'Human readable table size' })
  sizeHuman: string;

  @ApiProperty({ description: 'Table creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last modification date' })
  lastModified: Date;

  @ApiProperty({ description: 'Table type (table, view, etc.)' })
  tableType: string;
}

export class ColumnInfoDto {
  @ApiProperty({ description: 'Column name' })
  columnName: string;

  @ApiProperty({ description: 'Data type' })
  dataType: string;

  @ApiProperty({ description: 'Whether column is nullable' })
  isNullable: boolean;

  @ApiProperty({ description: 'Default value' })
  columnDefault: string | null;

  @ApiProperty({ description: 'Character maximum length for string types' })
  characterMaximumLength: number | null;

  @ApiProperty({ description: 'Numeric precision for numeric types' })
  numericPrecision: number | null;

  @ApiProperty({ description: 'Whether column is part of primary key' })
  isPrimaryKey: boolean;

  @ApiProperty({ description: 'Whether column has unique constraint' })
  isUnique: boolean;

  @ApiProperty({ description: 'Column position in table' })
  ordinalPosition: number;
}

export class DatabaseStatsDto {
  @ApiProperty({ description: 'Database name' })
  databaseName: string;

  @ApiProperty({ description: 'Database size in bytes' })
  sizeBytes: number;

  @ApiProperty({ description: 'Human readable database size' })
  sizeHuman: string;

  @ApiProperty({ description: 'Number of tables' })
  tableCount: number;

  @ApiProperty({ description: 'Number of active connections' })
  connectionCount: number;

  @ApiProperty({ description: 'Database version' })
  version: string;

  @ApiProperty({ description: 'Database uptime' })
  uptime: string;

  @ApiProperty({ description: 'Total number of rows across all tables' })
  totalRows: number;

  @ApiProperty({ description: 'Database creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last backup date' })
  lastBackup: Date | null;

  @ApiProperty({ 
    description: 'Top tables by size',
    type: [TableInfoDto]
  })
  topTables: TableInfoDto[];
}

export class TableDetailDto {
  @ApiProperty({ description: 'Table information' })
  tableInfo: TableInfoDto;

  @ApiProperty({ 
    description: 'Column definitions',
    type: [ColumnInfoDto]
  })
  columns: ColumnInfoDto[];

  @ApiProperty({ description: 'Table indexes' })
  indexes: Array<{
    indexName: string;
    columns: string[];
    isUnique: boolean;
    isPrimary: boolean;
  }>;

  @ApiProperty({ description: 'Foreign key constraints' })
  foreignKeys: Array<{
    constraintName: string;
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
  }>;

  @ApiProperty({ description: 'Check constraints' })
  checkConstraints: Array<{
    constraintName: string;
    checkClause: string;
  }>;
}