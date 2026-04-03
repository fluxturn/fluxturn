// Finance Connectors - Category Index

// Export connector implementations
export { PlaidConnector } from './plaid';
export { WiseConnector } from './wise';
export { ChargebeeConnector } from './chargebee';
export { QuickBooksConnector } from './quickbooks';
export { XeroConnector } from './xero';

// Export connector definitions
export { PLAID_CONNECTOR } from './plaid';
export { WISE_CONNECTOR } from './wise';
export { CHARGEBEE_CONNECTOR } from './chargebee';
export { QUICKBOOKS_CONNECTOR } from './quickbooks';
export { XERO_CONNECTOR } from './xero';

// Combined array
import { PLAID_CONNECTOR } from './plaid';
import { WISE_CONNECTOR } from './wise';
import { CHARGEBEE_CONNECTOR } from './chargebee';
import { QUICKBOOKS_CONNECTOR } from './quickbooks';
import { XERO_CONNECTOR } from './xero';

export const FINANCE_CONNECTORS = [
  PLAID_CONNECTOR,
  WISE_CONNECTOR,
  CHARGEBEE_CONNECTOR,
  QUICKBOOKS_CONNECTOR,
  XERO_CONNECTOR,
];
