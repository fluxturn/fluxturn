// Data Processing Connectors - Category Index

// Export connector implementations
export { ScrapflyConnector } from './scrapfly';
export { SupabaseConnector } from './supabase';
export { ExtractFromFileConnector } from './extract-from-file';

// Export connector definitions
export { SCRAPFLY_CONNECTOR } from './scrapfly';
export { SUPABASE_CONNECTOR } from './supabase';
export { EXTRACT_FROM_FILE_CONNECTOR } from './extract-from-file';

// Combined array
import { SCRAPFLY_CONNECTOR } from './scrapfly';
import { SUPABASE_CONNECTOR } from './supabase';
import { EXTRACT_FROM_FILE_CONNECTOR } from './extract-from-file';
export const DATA_PROCESSING_CONNECTORS = [
  SCRAPFLY_CONNECTOR,
  SUPABASE_CONNECTOR,
  EXTRACT_FROM_FILE_CONNECTOR,
];
