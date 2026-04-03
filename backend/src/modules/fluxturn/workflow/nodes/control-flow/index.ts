import { NodeCategory } from '../base';
import { LoopExecutor } from './loop.executor';
import { WaitExecutor } from './wait.executor';
import { MergeExecutor } from './merge.executor';
import { SplitExecutor } from './split.executor';
import { IfExecutor } from './if.executor';
import { SwitchExecutor } from './switch.executor';
import { FilterExecutor } from './filter.executor';

// Export all control flow executors
export { LoopExecutor } from './loop.executor';
export { WaitExecutor } from './wait.executor';
export { MergeExecutor } from './merge.executor';
export { SplitExecutor } from './split.executor';
export { IfExecutor, IfNodeExecutionResult } from './if.executor';
export { SwitchExecutor, SwitchNodeExecutionResult } from './switch.executor';
export { FilterExecutor, FilterNodeExecutionResult } from './filter.executor';

// All control flow executor classes for module registration
export const ControlFlowExecutors = [
  LoopExecutor,
  WaitExecutor,
  MergeExecutor,
  SplitExecutor,
  IfExecutor,
  SwitchExecutor,
  FilterExecutor,
];

// Registration metadata for each control flow node
export const ControlFlowRegistrations = [
  {
    executor: LoopExecutor,
    options: {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Iterate over array items',
    },
  },
  {
    executor: WaitExecutor,
    options: {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Pause workflow execution',
    },
  },
  {
    executor: MergeExecutor,
    options: {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Combine data from multiple inputs',
    },
  },
  {
    executor: SplitExecutor,
    options: {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Split data into multiple outputs',
    },
  },
  {
    executor: IfExecutor,
    options: {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Evaluate conditions and route to true/false branches',
    },
  },
  {
    executor: SwitchExecutor,
    options: {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Route items to different outputs based on rules',
    },
  },
  {
    executor: FilterExecutor,
    options: {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Filter items based on conditions',
    },
  },
];
