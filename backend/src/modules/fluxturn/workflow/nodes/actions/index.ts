import { NodeCategory } from '../base';
import { HttpRequestExecutor } from './http-request.executor';
import { ConnectorActionExecutor } from './connector-action.executor';
import { DatabaseQueryExecutor } from './database-query.executor';
import { TransformDataExecutor } from './transform-data.executor';
import { RunCodeExecutor } from './run-code.executor';
import { SetExecutor } from './set.executor';

// Export all action executors
export { HttpRequestExecutor } from './http-request.executor';
export { ConnectorActionExecutor } from './connector-action.executor';
export { DatabaseQueryExecutor } from './database-query.executor';
export { TransformDataExecutor } from './transform-data.executor';
export { RunCodeExecutor } from './run-code.executor';
export { SetExecutor } from './set.executor';

// All action executor classes for module registration
export const ActionExecutors = [
  HttpRequestExecutor,
  ConnectorActionExecutor,
  DatabaseQueryExecutor,
  TransformDataExecutor,
  RunCodeExecutor,
  SetExecutor,
];

// Registration metadata for each action
export const ActionRegistrations = [
  {
    executor: HttpRequestExecutor,
    options: {
      category: NodeCategory.ACTION,
      description: 'Make HTTP/API requests',
    },
  },
  {
    executor: ConnectorActionExecutor,
    options: {
      category: NodeCategory.ACTION,
      description: 'Execute connector actions',
    },
  },
  {
    executor: DatabaseQueryExecutor,
    options: {
      category: NodeCategory.ACTION,
      description: 'Execute database queries',
    },
  },
  {
    executor: TransformDataExecutor,
    options: {
      category: NodeCategory.ACTION,
      description: 'Transform data with expressions',
    },
  },
  {
    executor: RunCodeExecutor,
    options: {
      category: NodeCategory.ACTION,
      description: 'Execute custom JavaScript code',
    },
  },
  {
    executor: SetExecutor,
    options: {
      category: NodeCategory.ACTION,
      description: 'Add, modify, or remove fields',
    },
  },
];
