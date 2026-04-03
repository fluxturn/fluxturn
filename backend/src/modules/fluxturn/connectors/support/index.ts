// Support Connectors - Category Index

// Export connector implementations
export { FreshdeskConnector } from './freshdesk';
export { IntercomConnector } from './intercom';
export { PagerDutyConnector } from './pagerduty';
export { SentryIoConnector } from './sentry-io';
export { ServiceNowConnector } from './servicenow';
export { ZendeskConnector } from './zendesk';

// Export connector definitions
export { FRESHDESK_CONNECTOR } from './freshdesk';
export { INTERCOM_CONNECTOR } from './intercom';
export { PAGERDUTY_CONNECTOR } from './pagerduty';
export { SENTRY_IO_CONNECTOR } from './sentry-io';
export { SERVICENOW_CONNECTOR } from './servicenow';
export { ZENDESK_CONNECTOR } from './zendesk';

// Combined array
import { FRESHDESK_CONNECTOR } from './freshdesk';
import { INTERCOM_CONNECTOR } from './intercom';
import { PAGERDUTY_CONNECTOR } from './pagerduty';
import { SENTRY_IO_CONNECTOR } from './sentry-io';
import { SERVICENOW_CONNECTOR } from './servicenow';
import { ZENDESK_CONNECTOR } from './zendesk';

export const SUPPORT_CONNECTORS = [
  FRESHDESK_CONNECTOR,
  INTERCOM_CONNECTOR,
  PAGERDUTY_CONNECTOR,
  SENTRY_IO_CONNECTOR,
  SERVICENOW_CONNECTOR,
  ZENDESK_CONNECTOR,
];
