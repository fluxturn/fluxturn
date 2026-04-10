import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Users } from "lucide-react";

interface TeamsToolNodeData {
  operation?: string;
  teamId?: string;
  channelId?: string;
  content?: string;
  [key: string]: unknown;
}

type TeamsToolNodeType = Node<TeamsToolNodeData>;

export const TeamsToolNode = memo((props: NodeProps<TeamsToolNodeType>) => {
  const [, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const getDescription = () => {
    const operation = props.data?.operation || "sendMessage";
    const teamId = props.data?.teamId;

    switch (operation) {
      case "sendMessage":
        if (teamId) {
          return `Send to team`;
        }
        return "Send Message";
      case "getChannels":
        return "Get Channels";
      case "getMembers":
        return "Get Members";
      case "getJoinedTeams":
        return "Get Joined Teams";
      default:
        return "Not configured";
    }
  };

  return (
    <BaseActionNode
      {...props}
      icon={Users}
      name="Teams Tool"
      description={getDescription()}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

TeamsToolNode.displayName = "TeamsToolNode";
