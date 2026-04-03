import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { MessageSquare } from "lucide-react";

interface SlackNodeData {
  channel?: string;
  message?: string;
  [key: string]: unknown;
}

type SlackNodeType = Node<SlackNodeData>;

export const SlackNode = memo((props: NodeProps<SlackNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const description = props.data?.channel
    ? `Channel: ${props.data.channel}`
    : "Not configured";

  return (
    <BaseActionNode
      {...props}
      icon={MessageSquare}
      name="Send Slack Message"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

SlackNode.displayName = "SlackNode";
