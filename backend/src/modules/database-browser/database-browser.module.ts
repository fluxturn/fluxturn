import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { DatabaseBrowserController } from './database-browser.controller';
import { ConnectionService } from './services/connection.service';
import { SchemaBrowserService } from './services/schema-browser.service';
import { QueryExecutorService } from './services/query-executor.service';
import { PlatformService } from '../database/platform.service';
import { Logger } from '@nestjs/common';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [DatabaseBrowserController],
  providers: [
    ConnectionService,
    SchemaBrowserService,
    QueryExecutorService
  ],
  exports: [ConnectionService, SchemaBrowserService, QueryExecutorService]
})
export class DatabaseBrowserModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseBrowserModule.name);

  constructor(private readonly platformService: PlatformService) {}

  async onModuleInit() {
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    try {
      // Create database_connections table
      await this.platformService.query(`
        CREATE TABLE IF NOT EXISTS database_connections (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          organization_id UUID NOT NULL,
          project_id UUID NOT NULL,
          created_by UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          database_type VARCHAR(50) NOT NULL CHECK (database_type IN ('postgresql', 'mysql')),
          config JSONB NOT NULL DEFAULT '{}',
          credentials JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'error', 'pending')),
          last_tested_at TIMESTAMP WITH TIME ZONE,
          test_result JSONB,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(project_id, name)
        );
      `);

      // Create indexes
      await this.platformService.query(`
        CREATE INDEX IF NOT EXISTS idx_db_connections_project ON database_connections(project_id);
      `);

      await this.platformService.query(`
        CREATE INDEX IF NOT EXISTS idx_db_connections_org ON database_connections(organization_id);
      `);

      await this.platformService.query(`
        CREATE INDEX IF NOT EXISTS idx_db_connections_status ON database_connections(status);
      `);

      // Create query history table
      await this.platformService.query(`
        CREATE TABLE IF NOT EXISTS database_query_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          connection_id UUID NOT NULL REFERENCES database_connections(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          project_id UUID NOT NULL,
          query_text TEXT NOT NULL,
          query_type VARCHAR(50),
          execution_time_ms INTEGER,
          rows_affected INTEGER,
          status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'error')),
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create indexes for query history
      await this.platformService.query(`
        CREATE INDEX IF NOT EXISTS idx_query_history_connection ON database_query_history(connection_id);
      `);

      await this.platformService.query(`
        CREATE INDEX IF NOT EXISTS idx_query_history_user ON database_query_history(user_id);
      `);

      await this.platformService.query(`
        CREATE INDEX IF NOT EXISTS idx_query_history_created ON database_query_history(created_at DESC);
      `);

      this.logger.log('Database browser tables initialized successfully');
    } catch (error) {
      this.logger.error('Failed to create database browser tables:', error);
      // Don't throw - allow the app to continue if tables already exist
    }
  }
}
