// YouTube Connector Definition (Stub)
// TODO: Add full definition with actions and triggers

import { ConnectorDefinition } from '../../shared';

export const YOUTUBE_CONNECTOR: ConnectorDefinition = {
  name: 'youtube',
  display_name: 'YouTube',
  category: 'video',
  description: 'YouTube connector for video management and analytics',
  auth_type: 'oauth2',
  verified: false,
  supported_actions: [],
  supported_triggers: [],
};
