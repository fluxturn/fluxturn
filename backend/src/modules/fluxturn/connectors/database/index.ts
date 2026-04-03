// Database Connectors - Category Index

// Export connector implementations
export { ElasticsearchConnector } from './elasticsearch';

// Export connector definitions
export { ELASTICSEARCH_CONNECTOR } from './elasticsearch';

// Combined array
import { ELASTICSEARCH_CONNECTOR } from './elasticsearch';

export const DATABASE_CONNECTORS = [
  ELASTICSEARCH_CONNECTOR,
];
