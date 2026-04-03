import { type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { BaseTriggerNode } from "../../base/BaseTriggerNode";
import { MessageCircle } from "lucide-react";

interface ChatTriggerNodeData {
  label?: string;
  placeholder?: string;
  welcomeMessage?: string;
  allowFileUploads?: boolean;
  [key: string]: unknown;
}

export const ChatTriggerNode = memo((props: NodeProps) => {
  const { data } = props;
  const nodeData = data as ChatTriggerNodeData;

  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  // Build description based on configuration
  let description = "Start with chat message";
  if (nodeData.allowFileUploads) {
    description += " (files allowed)";
  }

  return (
    <BaseTriggerNode
      {...props}
      icon={MessageCircle}
      name={nodeData.label || "Chat Trigger"}
      description={description}
      status={(data as any).status || 'initial'}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

ChatTriggerNode.displayName = "ChatTriggerNode";
