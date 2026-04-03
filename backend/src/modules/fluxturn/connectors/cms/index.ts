// CMS Connectors - Category Index

// Export connector implementations
export { ContentfulConnector } from './contentful';
export { WebflowConnector } from './webflow';
export { WordPressConnector } from './wordpress';
export { GhostConnector } from './ghost';
export { MediumConnector } from './medium';

// Export connector definitions
export { CONTENTFUL_CONNECTOR } from './contentful';
export { WEBFLOW_CONNECTOR } from './webflow';
export { WORDPRESS_CONNECTOR } from './wordpress';
export { GHOST_CONNECTOR } from './ghost';
export { MEDIUM_CONNECTOR } from './medium';

// Combined array
import { CONTENTFUL_CONNECTOR } from './contentful';
import { WEBFLOW_CONNECTOR } from './webflow';
import { WORDPRESS_CONNECTOR } from './wordpress';
import { GHOST_CONNECTOR } from './ghost';
import { MEDIUM_CONNECTOR } from './medium';

export const CMS_CONNECTORS = [
  CONTENTFUL_CONNECTOR,
  WEBFLOW_CONNECTOR,
  WORDPRESS_CONNECTOR,
  GHOST_CONNECTOR,
  MEDIUM_CONNECTOR,
];
