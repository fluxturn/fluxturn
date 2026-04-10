import { type NodeProps, type Node } from "@xyflow/react";
import { memo } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Globe, Mail, MessageSquare, Zap } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface HttpRequestNodeData {
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: string;
  body?: string;
  // Connector action data
  label?: string;
  connectorType?: string;
  actionId?: string;
  icon?: string;
  [key: string]: unknown;
}

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
  const nodeStatus = (props.data as Record<string, unknown>)?.status as string || "initial";

  // Settings button handler - parent will handle opening modal via click event
  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  // Check if this is actually a connector action disguised as HTTP request
  const isConnectorAction = props.data?.connectorType && props.data?.actionId;
  
  if (isConnectorAction) {
    // This is actually a connector action, render it properly
    const getIcon = () => {
      if (props.data?.icon && typeof props.data.icon === 'string') {
        const IconComponent = (LucideIcons as Record<string, LucideIcons.LucideIcon>)[props.data.icon];
        if (IconComponent) return IconComponent;
      }
      
      switch (props.data?.connectorType) {
        case 'gmail':
          return Mail;
        case 'slack':
          return MessageSquare;
        default:
          return Zap;
      }
    };

    const icon = getIcon();
    const name = props.data?.label || 'Connector Action';
    const description = props.data?.actionId ? `${props.data.connectorType} ${props.data.actionId}` : 'Connector action';

    return (
      <BaseActionNode
        {...props}
        icon={icon}
        name={name}
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
      />
    );
  }

  // Regular HTTP Request node
  const description = props.data?.url
    ? `${props.data.method || "GET"}: ${props.data.url}`
    : "Not configured";

  return (
    <BaseActionNode
      {...props}
      icon={Globe}
      name="HTTP Request"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

HttpRequestNode.displayName = "HttpRequestNode";
