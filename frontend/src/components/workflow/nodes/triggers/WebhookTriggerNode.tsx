import { type NodeProps, type Node } from "@xyflow/react";
import { memo } from "react";
import { BaseTriggerNode } from "../../base/BaseTriggerNode";
import { Webhook } from "lucide-react";

interface WebhookTriggerNodeData {
  path?: string;
  method?: string;
  [key: string]: unknown;
}

type WebhookTriggerNodeType = Node<WebhookTriggerNodeData>;

export const WebhookTriggerNode = memo((props: NodeProps<WebhookTriggerNodeType>) => {
  const nodeStatus = (props.data as Record<string, unknown>)?.status as string || "initial";

  // Settings button handler - parent will handle opening modal via click event
  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  const description = props.data?.path
    ? `${props.data.method || "POST"}: ${props.data.path}`
    : "Not configured";

  return (
    <BaseTriggerNode
      {...props}
      icon={Webhook}
      name="Webhook"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

WebhookTriggerNode.displayName = "WebhookTriggerNode";
