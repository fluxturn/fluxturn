import { type NodeProps, type Node } from "@xyflow/react";
import { memo } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { getConnectorIconPath, hasConnectorIcon } from "@/utils/workflow";
import * as LucideIcons from "lucide-react";
import { type NodeStatus } from "../../base/NodeStatusIndicator";

interface DynamicConnectorActionNodeData {
  label: string;
  description?: string;
  connectorType: string;
  actionId: string;
  inputSchema?: Record<string, unknown>;
  icon?: string;
  [key: string]: unknown;
}

type DynamicConnectorActionNodeType = Node<DynamicConnectorActionNodeData>;

export const DynamicConnectorActionNode = memo(
  (props: NodeProps<DynamicConnectorActionNodeType>) => {
    const { data } = props;
    
    // Get the connector icon - use custom icon if available, otherwise fallback to Lucide
    const getIcon = (): string | LucideIcons.LucideIcon => {
      // First, check if we have a custom connector icon
      if (data.connectorType && hasConnectorIcon(data.connectorType)) {
        return getConnectorIconPath(data.connectorType);
      }

      // Try Lucide icon from data
      if (data.icon && typeof data.icon === 'string') {
        const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[data.icon];
        if (IconComponent) {
          return IconComponent;
        }
      }

      // Fallback to default Lucide icon
      return LucideIcons.Zap;
    };

    const icon = getIcon();
    const label = data.label || 'Connector Action';
    const description = data.description || `${data.connectorType} action`;

    // Settings button handler - parent will handle opening modal via click event
    const handleOpenSettings = () => {
      // No-op: parent's handleNodeClick will handle opening the config modal
    };

    return (
      <BaseActionNode
        {...props}
        icon={icon}
        name={label}
        description={description}
        status={(data.status as NodeStatus) || 'initial'}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    );
  }
);

DynamicConnectorActionNode.displayName = "DynamicConnectorActionNode";