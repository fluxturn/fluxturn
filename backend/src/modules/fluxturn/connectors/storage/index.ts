// Storage Connectors - Category Index

// Export connector implementations
export { AWSS3Connector } from './aws-s3';
export { DropboxConnector } from './dropbox';
export { GoogleDocsConnector } from './google-docs';
export { GoogleDriveConnector } from './google-drive';
export { GoogleSheetsConnector } from './google-sheets';
export { MongoDBConnector } from './mongodb';
export { MySQLConnector } from './mysql';
export { PostgreSQLConnector } from './postgresql';
export { RedisConnector, RedisTriggerService } from './redis';
export { SnowflakeConnector } from './snowflake';

// Export connector definitions
export { AWS_S3_CONNECTOR } from './aws-s3';
export { DROPBOX_CONNECTOR } from './dropbox';
export { GOOGLE_DOCS_CONNECTOR } from './google-docs';
export { GOOGLE_DRIVE_CONNECTOR } from './google-drive';
export { GOOGLE_SHEETS_CONNECTOR } from './google-sheets';
export { MONGODB_CONNECTOR } from './mongodb';
export { MYSQL_CONNECTOR } from './mysql';
export { POSTGRESQL_CONNECTOR } from './postgresql';
export { REDIS_CONNECTOR } from './redis';
export { SNOWFLAKE_CONNECTOR } from './snowflake';

// Combined array
import { AWS_S3_CONNECTOR } from './aws-s3';
import { DROPBOX_CONNECTOR } from './dropbox';
import { GOOGLE_DOCS_CONNECTOR } from './google-docs';
import { GOOGLE_DRIVE_CONNECTOR } from './google-drive';
import { GOOGLE_SHEETS_CONNECTOR } from './google-sheets';
import { MONGODB_CONNECTOR } from './mongodb';
import { MYSQL_CONNECTOR } from './mysql';
import { POSTGRESQL_CONNECTOR } from './postgresql';
import { REDIS_CONNECTOR } from './redis';
import { SNOWFLAKE_CONNECTOR } from './snowflake';

export const STORAGE_CONNECTORS = [
  AWS_S3_CONNECTOR,
  DROPBOX_CONNECTOR,
  GOOGLE_DOCS_CONNECTOR,
  GOOGLE_DRIVE_CONNECTOR,
  GOOGLE_SHEETS_CONNECTOR,
  MONGODB_CONNECTOR,
  MYSQL_CONNECTOR,
  POSTGRESQL_CONNECTOR,
  REDIS_CONNECTOR,
  SNOWFLAKE_CONNECTOR,
];
