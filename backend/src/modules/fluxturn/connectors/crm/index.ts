// CRM Connectors - Category Index

// Export connector implementations
export { AirtableConnector } from './airtable';
export { HubSpotConnector } from './hubspot';
export { JotformConnector } from './jotform';
export { MondayConnector } from './monday';
export { PipedriveConnector } from './pipedrive';
export { SalesforceConnector } from './salesforce';
export { ZohoCRMConnector } from './zoho';

// Export connector definitions
export { AIRTABLE_CONNECTOR } from './airtable';
export { HUBSPOT_CONNECTOR } from './hubspot';
export { JOTFORM_CONNECTOR } from './jotform';
export { MONDAY_CONNECTOR } from './monday';
export { PIPEDRIVE_CONNECTOR } from './pipedrive';
export { SALESFORCE_CONNECTOR } from './salesforce';
export { ZOHO_CONNECTOR } from './zoho';

// Combined array
import { AIRTABLE_CONNECTOR } from './airtable';
import { HUBSPOT_CONNECTOR } from './hubspot';
import { JOTFORM_CONNECTOR } from './jotform';
import { MONDAY_CONNECTOR } from './monday';
import { PIPEDRIVE_CONNECTOR } from './pipedrive';
import { SALESFORCE_CONNECTOR } from './salesforce';
import { ZOHO_CONNECTOR } from './zoho';

export const CRM_CONNECTORS = [
  AIRTABLE_CONNECTOR,
  HUBSPOT_CONNECTOR,
  JOTFORM_CONNECTOR,
  MONDAY_CONNECTOR,
  PIPEDRIVE_CONNECTOR,
  SALESFORCE_CONNECTOR,
  ZOHO_CONNECTOR,
];
