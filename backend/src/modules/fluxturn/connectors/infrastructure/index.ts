// Infrastructure Connectors - Category Index

// Export connector implementations
export { CloudflareConnector } from './cloudflare';
export { GraphqlConnector } from './graphql';
export { KafkaConnector } from './kafka';
export { RabbitmqConnector } from './rabbitmq';

// Export connector definitions
export { CLOUDFLARE_CONNECTOR } from './cloudflare';
export { GRAPHQL_CONNECTOR } from './graphql';
export { KAFKA_CONNECTOR } from './kafka';
export { RABBITMQ_CONNECTOR } from './rabbitmq';

// Combined array
import { CLOUDFLARE_CONNECTOR } from './cloudflare';
import { GRAPHQL_CONNECTOR } from './graphql';
import { KAFKA_CONNECTOR } from './kafka';
import { RABBITMQ_CONNECTOR } from './rabbitmq';

export const INFRASTRUCTURE_CONNECTORS = [
  CLOUDFLARE_CONNECTOR,
  GRAPHQL_CONNECTOR,
  KAFKA_CONNECTOR,
  RABBITMQ_CONNECTOR,
];
