// All Connector Definitions - Combined Array
// This file aggregates all connector definitions from per-connector folder structure

// MIGRATED: All connectors now from per-connector folder structure
import { AI_CONNECTOR_DEFINITIONS as AI_CONNECTORS } from '../ai';
import { ANALYTICS_CONNECTORS } from '../analytics';
import { CMS_CONNECTORS } from '../cms';
import { COMMUNICATION_CONNECTORS } from '../communication';
import { CRM_CONNECTORS } from '../crm';
import { DATA_PROCESSING_CONNECTORS } from '../data_processing';
import { DEVELOPMENT_CONNECTORS } from '../development';
import { ECOMMERCE_CONNECTORS } from '../ecommerce';
import { FINANCE_CONNECTORS } from '../finance';
import { FORMS_CONNECTORS } from '../forms';
import { INFRASTRUCTURE_CONNECTORS } from '../infrastructure';
import { MARKETING_CONNECTORS } from '../marketing';
import { PRODUCTIVITY_CONNECTORS } from '../productivity';
import { PROJECT_MANAGEMENT_CONNECTORS } from '../project-management';
import { SOCIAL_CONNECTORS } from '../social';
import { STORAGE_CONNECTORS } from '../storage';
import { SUPPORT_CONNECTORS } from '../support';
import { UTILITY_CONNECTORS } from '../utility';
import { VIDEO_CONNECTORS } from '../video';
import { ConnectorDefinition } from './types';

// Combined array of all connector definitions
export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  ...AI_CONNECTORS,
  ...ANALYTICS_CONNECTORS,
  ...CMS_CONNECTORS,
  ...COMMUNICATION_CONNECTORS,
  ...CRM_CONNECTORS,
  ...DATA_PROCESSING_CONNECTORS,
  ...DEVELOPMENT_CONNECTORS,
  ...ECOMMERCE_CONNECTORS,
  ...FINANCE_CONNECTORS,
  ...FORMS_CONNECTORS,
  ...INFRASTRUCTURE_CONNECTORS,
  ...MARKETING_CONNECTORS,
  ...PRODUCTIVITY_CONNECTORS,
  ...PROJECT_MANAGEMENT_CONNECTORS,
  ...SOCIAL_CONNECTORS,
  ...STORAGE_CONNECTORS,
  ...SUPPORT_CONNECTORS,
  ...UTILITY_CONNECTORS,
  ...VIDEO_CONNECTORS,
];

// Categories list
export const CONNECTOR_CATEGORIES = [
  'ai',
  'analytics',
  'cms',
  'communication',
  'crm',
  'data_processing',
  'development',
  'ecommerce',
  'finance',
  'forms',
  'infrastructure',
  'marketing',
  'productivity',
  'project_management',
  'social',
  'storage',
  'support',
  'utility',
  'video'
] as const;

export type ConnectorCategoryType = typeof CONNECTOR_CATEGORIES[number];

// Re-export individual category arrays for convenience
export { AI_CONNECTORS };
export { ANALYTICS_CONNECTORS };
export { CMS_CONNECTORS };
export { COMMUNICATION_CONNECTORS };
export { CRM_CONNECTORS };
export { DATA_PROCESSING_CONNECTORS };
export { DEVELOPMENT_CONNECTORS };
export { ECOMMERCE_CONNECTORS };
export { FINANCE_CONNECTORS };
export { FORMS_CONNECTORS };
export { INFRASTRUCTURE_CONNECTORS };
export { MARKETING_CONNECTORS };
export { PRODUCTIVITY_CONNECTORS };
export { PROJECT_MANAGEMENT_CONNECTORS };
export { SOCIAL_CONNECTORS };
export { STORAGE_CONNECTORS };
export { SUPPORT_CONNECTORS };
export { UTILITY_CONNECTORS };
export { VIDEO_CONNECTORS };
