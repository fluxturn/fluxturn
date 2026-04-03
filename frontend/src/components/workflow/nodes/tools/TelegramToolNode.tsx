import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Send } from "lucide-react";

interface TelegramToolNodeData {
  operation?: string;
  chatId?: string;
  text?: string;
  [key: string]: unknown;
}

type TelegramToolNodeType = Node<TelegramToolNodeData>;

export const TelegramToolNode = memo((props: NodeProps<TelegramToolNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const getDescription = () => {
    const operation = props.data?.operation || "sendMessage";
    const chatId = props.data?.chatId;

    switch (operation) {
      case "sendMessage":
        if (chatId) {
          return `Send to ${chatId.substring(0, 12)}${chatId.length > 12 ? "..." : ""}`;
        }
        return "Send Message";
      case "sendPhoto":
        return "Send Photo";
      case "getChat":
        return "Get Chat Info";
      case "getUpdates":
        return "Get Updates";
      default:
        return "Not configured";
    }
  };

  return (
    <BaseActionNode
      {...props}
      icon={Send}
      name="Telegram Tool"
      description={getDescription()}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

TelegramToolNode.displayName = "TelegramToolNode";
