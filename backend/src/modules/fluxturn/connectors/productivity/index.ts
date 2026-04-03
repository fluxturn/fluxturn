// Productivity Connectors - Category Index

// Export connector implementations
export { TodoistConnector } from './todoist';
export { ClockifyConnector } from './clockify';
export { HarvestConnector } from './harvest';
export { FigmaConnector } from './figma';
export { SpotifyConnector } from './spotify';

// Export connector definitions
export { TODOIST_CONNECTOR } from './todoist';
export { CLOCKIFY_CONNECTOR } from './clockify';
export { TOGGL_CONNECTOR } from './toggl';
export { HARVEST_CONNECTOR } from './harvest';
export { FIGMA_CONNECTOR } from './figma';
export { SPOTIFY_CONNECTOR } from './spotify';

// Combined array
import { TODOIST_CONNECTOR } from './todoist';
import { CLOCKIFY_CONNECTOR } from './clockify';
import { TOGGL_CONNECTOR } from './toggl';
import { HARVEST_CONNECTOR } from './harvest';
import { FIGMA_CONNECTOR } from './figma';
import { SPOTIFY_CONNECTOR } from './spotify';

export const PRODUCTIVITY_CONNECTORS = [
  TODOIST_CONNECTOR,
  CLOCKIFY_CONNECTOR,
  TOGGL_CONNECTOR,
  HARVEST_CONNECTOR,
  FIGMA_CONNECTOR,
  SPOTIFY_CONNECTOR,
];
