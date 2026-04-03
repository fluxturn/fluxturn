import { NodeCategory } from '../base';
import { ManualTriggerExecutor } from './manual-trigger.executor';
import { ScheduleTriggerExecutor } from './schedule-trigger.executor';
import { WebhookTriggerExecutor } from './webhook-trigger.executor';
import { FormTriggerExecutor } from './form-trigger.executor';
import { ChatTriggerExecutor } from './chat-trigger.executor';
import { ConnectorTriggerExecutor } from './connector-trigger.executor';

// Export all trigger executors
export { ManualTriggerExecutor } from './manual-trigger.executor';
export { ScheduleTriggerExecutor } from './schedule-trigger.executor';
export { WebhookTriggerExecutor } from './webhook-trigger.executor';
export { FormTriggerExecutor } from './form-trigger.executor';
export { ChatTriggerExecutor } from './chat-trigger.executor';
export { ConnectorTriggerExecutor } from './connector-trigger.executor';

// All trigger executor classes for module registration
export const TriggerExecutors = [
  ManualTriggerExecutor,
  ScheduleTriggerExecutor,
  WebhookTriggerExecutor,
  FormTriggerExecutor,
  ChatTriggerExecutor,
  ConnectorTriggerExecutor,
];

// Registration metadata for each trigger
export const TriggerRegistrations = [
  {
    executor: ManualTriggerExecutor,
    options: {
      category: NodeCategory.TRIGGER,
      description: 'Manually execute workflow',
    },
  },
  {
    executor: ScheduleTriggerExecutor,
    options: {
      category: NodeCategory.TRIGGER,
      description: 'Cron-based scheduled execution',
    },
  },
  {
    executor: WebhookTriggerExecutor,
    options: {
      category: NodeCategory.TRIGGER,
      description: 'HTTP webhook endpoint',
    },
  },
  {
    executor: FormTriggerExecutor,
    options: {
      category: NodeCategory.TRIGGER,
      description: 'Form submission trigger',
    },
  },
  {
    executor: ChatTriggerExecutor,
    options: {
      category: NodeCategory.TRIGGER,
      description: 'Chat message trigger for AI workflows',
    },
  },
  {
    executor: ConnectorTriggerExecutor,
    options: {
      category: NodeCategory.TRIGGER,
      description: 'Connector-based triggers (polling/webhook)',
    },
  },
];
