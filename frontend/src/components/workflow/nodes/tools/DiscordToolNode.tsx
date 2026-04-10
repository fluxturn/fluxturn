import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Hash } from "lucide-react";

interface DiscordToolNodeData {
  operation?: string;
  channelId?: string;
  guildId?: string;
  content?: string;
  [key: string]: unknown;
}

type DiscordToolNodeType = Node<DiscordToolNodeData>;

export const DiscordToolNode = memo((props: NodeProps<DiscordToolNodeType>) => {
  const [, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const getDescription = () => {
    const operation = props.data?.operation || "sendMessage";
    const channelId = props.data?.channelId;

    switch (operation) {
      case "sendMessage":
        if (channelId) {
          return `Send to ${channelId.substring(0, 10)}...`;
        }
        return "Send Message";
      case "getChannels":
        return "Get Channels";
      case "getMembers":
        return "Get Members";
      case "addReaction":
        return "Add Reaction";
      default:
        return "Not configured";
    }
  };

  return (
    <BaseActionNode
      {...props}
      icon={Hash}
      name="Discord Tool"
      description={getDescription()}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

DiscordToolNode.displayName = "DiscordToolNode";
