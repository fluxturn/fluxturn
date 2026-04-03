import { NodeCategory } from '../base';
import { ToolExecutor } from './tool.executor';

// Export all tool executors
export { ToolExecutor } from './tool.executor';

// All tool executor classes for module registration
export const ToolExecutors = [
  ToolExecutor,
];

// Registration metadata for tool nodes
export const ToolRegistrations = [
  {
    executor: ToolExecutor,
    options: {
      category: NodeCategory.TOOL,
      description: 'Tool nodes for AI Agent integration',
    },
  },
];
