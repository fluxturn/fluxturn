// Analytics Connectors - Category Index
// Each connector is organized in its own folder

// Export connector implementations
export { GoogleAnalyticsConnector } from './google-analytics';
export { MixpanelConnector } from './mixpanel';
export { SegmentConnector } from './segment';
export { PostHogConnector } from './posthog';
export { SplunkConnector } from './splunk';
export { GrafanaConnector } from './grafana';
export { MetabaseConnector } from './metabase';

// Export connector definitions
export { GOOGLE_ANALYTICS_CONNECTOR } from './google-analytics';
export { MIXPANEL_CONNECTOR } from './mixpanel';
export { SEGMENT_CONNECTOR } from './segment';
export { POSTHOG_CONNECTOR } from './posthog';
export { SPLUNK_CONNECTOR } from './splunk';
export { GRAFANA_CONNECTOR } from './grafana';
export { METABASE_CONNECTOR } from './metabase';

// Combined array of all analytics connector definitions
import { GOOGLE_ANALYTICS_CONNECTOR } from './google-analytics';
import { MIXPANEL_CONNECTOR } from './mixpanel';
import { SEGMENT_CONNECTOR } from './segment';
import { POSTHOG_CONNECTOR } from './posthog';
import { SPLUNK_CONNECTOR } from './splunk';
import { GRAFANA_CONNECTOR } from './grafana';
import { METABASE_CONNECTOR } from './metabase';

export const ANALYTICS_CONNECTORS = [
  GOOGLE_ANALYTICS_CONNECTOR,
  MIXPANEL_CONNECTOR,
  SEGMENT_CONNECTOR,
  POSTHOG_CONNECTOR,
  SPLUNK_CONNECTOR,
  GRAFANA_CONNECTOR,
  METABASE_CONNECTOR,
];
