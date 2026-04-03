import type { NodeTypes } from "@xyflow/react";
import { NodeType } from "./nodeTypes";

// Trigger Nodes
import { ManualTriggerNode } from "@/components/workflow/nodes/triggers/ManualTriggerNode";
import { ScheduleTriggerNode } from "@/components/workflow/nodes/triggers/ScheduleTriggerNode";
import { WebhookTriggerNode } from "@/components/workflow/nodes/triggers/WebhookTriggerNode";
import { FormTriggerNode } from "@/components/workflow/nodes/triggers/FormTriggerNode";
import { ChatTriggerNode } from "@/components/workflow/nodes/triggers/ChatTriggerNode";
import { DynamicConnectorTriggerNode } from "@/components/workflow/nodes/triggers/DynamicConnectorTriggerNode";

// Action Nodes
import { HttpRequestNode } from "@/components/workflow/nodes/actions/HttpRequestNode";
import { DatabaseNode } from "@/components/workflow/nodes/actions/DatabaseNode";
import { TransformNode } from "@/components/workflow/nodes/actions/TransformNode";
import { CodeNode } from "@/components/workflow/nodes/actions/CodeNode";
import { AIAgentNode } from "@/components/workflow/nodes/actions/AIAgentNode";
import { OpenAIChatModelNode } from "@/components/workflow/nodes/actions/OpenAIChatModelNode";
import { SimpleMemoryNode } from "@/components/workflow/nodes/actions/SimpleMemoryNode";
import { RedisMemoryNode } from "@/components/workflow/nodes/actions/RedisMemoryNode";
import { MergeNode } from "@/components/workflow/nodes/actions/MergeNode";
import { SplitNode } from "@/components/workflow/nodes/actions/SplitNode";
import { DynamicConnectorActionNode } from "@/components/workflow/nodes/actions/DynamicConnectorActionNode";

// Tool Nodes
import { GmailToolNode } from "@/components/workflow/nodes/tools/GmailToolNode";
import { SlackToolNode } from "@/components/workflow/nodes/tools/SlackToolNode";
import { TelegramToolNode } from "@/components/workflow/nodes/tools/TelegramToolNode";
import { DiscordToolNode } from "@/components/workflow/nodes/tools/DiscordToolNode";
import { TeamsToolNode } from "@/components/workflow/nodes/tools/TeamsToolNode";

// Debug: Log to ensure this component is loaded
// console.log('nodeComponents loading DynamicConnectorActionNode:', DynamicConnectorActionNode);

// Control Flow Nodes
import { ControlNode } from "@/components/workflow/nodes/ControlNode";

// Other Nodes
import { NoteNode } from "@/components/workflow/nodes/NoteNode";

export const nodeComponents = {
  // Triggers
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
  [NodeType.FORM_TRIGGER]: FormTriggerNode,
  [NodeType.CHAT_TRIGGER]: ChatTriggerNode,
  [NodeType.WEBHOOK]: WebhookTriggerNode, // Use same component for app webhooks
  [NodeType.CONNECTOR_TRIGGER]: DynamicConnectorTriggerNode, // Generic connector trigger

  // Specific connector triggers are handled by CONNECTOR_TRIGGER
  // [NodeType.TELEGRAM_TRIGGER]: DynamicConnectorTriggerNode,
  // [NodeType.GMAIL_TRIGGER]: DynamicConnectorTriggerNode,
  // [NodeType.FACEBOOK_TRIGGER]: DynamicConnectorTriggerNode,
  // [NodeType.TWITTER_TRIGGER]: DynamicConnectorTriggerNode,

  // Actions
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.DATABASE_QUERY]: DatabaseNode,
  [NodeType.TRANSFORM_DATA]: TransformNode,
  [NodeType.RUN_CODE]: CodeNode,
  [NodeType.AI_AGENT]: AIAgentNode,
  [NodeType.OPENAI_CHAT_MODEL]: OpenAIChatModelNode,
  [NodeType.SIMPLE_MEMORY]: SimpleMemoryNode,
  [NodeType.REDIS_MEMORY]: RedisMemoryNode,
  [NodeType.MERGE]: MergeNode,
  [NodeType.SPLIT]: SplitNode,
  [NodeType.SET]: TransformNode,
  SEND_EMAIL: DynamicConnectorActionNode, // Built-in email (uses SMTP connector)
  SEND_SLACK: DynamicConnectorActionNode, // Built-in Slack (uses Slack connector)
  [NodeType.CONNECTOR_ACTION]: DynamicConnectorActionNode,

  // Tools
  [NodeType.GMAIL_TOOL]: GmailToolNode,
  [NodeType.SLACK_TOOL]: SlackToolNode,
  [NodeType.TELEGRAM_TOOL]: TelegramToolNode,
  [NodeType.DISCORD_TOOL]: DiscordToolNode,
  [NodeType.TEAMS_TOOL]: TeamsToolNode,

  // Control Flow
  [NodeType.IF_CONDITION]: ControlNode,
  [NodeType.SWITCH]: ControlNode,
  [NodeType.FILTER]: ControlNode,
  [NodeType.LOOP]: ControlNode,
  [NodeType.WAIT]: ControlNode,

  // Other
  note: NoteNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
