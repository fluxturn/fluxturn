// Export base classes and interfaces
export * from './base';

// Export trigger executors
export * from './triggers';

// Export action executors
export * from './actions';

// Export control flow executors
export * from './control-flow';

// Export AI executors
export * from './ai';

// Export tool executors
export * from './tools';

// Aggregate all executors for module registration
import { TriggerExecutors, TriggerRegistrations } from './triggers';
import { ActionExecutors, ActionRegistrations } from './actions';
import { ControlFlowExecutors, ControlFlowRegistrations } from './control-flow';
import { AIExecutors, AIRegistrations } from './ai';
import { ToolExecutors, ToolRegistrations } from './tools';

// All executor classes
export const AllNodeExecutors = [
  ...TriggerExecutors,
  ...ActionExecutors,
  ...ControlFlowExecutors,
  ...AIExecutors,
  ...ToolExecutors,
];

// All registration metadata
export const AllNodeRegistrations = [
  ...TriggerRegistrations,
  ...ActionRegistrations,
  ...ControlFlowRegistrations,
  ...AIRegistrations,
  ...ToolRegistrations,
];
