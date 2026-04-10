import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { MessageSquare } from "lucide-react";

interface SlackToolNodeData {
  operation?: string;
  channel?: string;
  text?: string;
  [key: string]: unknown;
}

type SlackToolNodeType = Node<SlackToolNodeData>;

export const SlackToolNode = memo((props: NodeProps<SlackToolNodeType>) => {
  const [, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const getDescription = () => {
    const operation = props.data?.operation || "sendMessage";
    const channel = props.data?.channel;

    switch (operation) {
      case "sendMessage":
        if (channel) {
          return `Send to ${channel.substring(0, 15)}${channel.length > 15 ? "..." : ""}`;
        }
        return "Send Message";
      case "getChannels":
        return "Get Channels";
      case "listUsers":
        return "List Users";
      case "addReaction":
        return "Add Reaction";
      default:
        return "Not configured";
    }
  };

  return (
    <BaseActionNode
      {...props}
      icon={MessageSquare}
      name="Slack Tool"
      description={getDescription()}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

SlackToolNode.displayName = "SlackToolNode";
