import React, { memo, useEffect } from 'react';
import { type NodeProps, Position, useReactFlow, useUpdateNodeInternals, type Node } from '@xyflow/react';
import {
  GitBranch,
  RotateCcw,
  Shuffle,
  Filter,
  PauseCircle,
  type LucideIcon
} from 'lucide-react';
import { BaseNode, BaseNodeContent } from '../base/BaseNode';
import { BaseHandle } from '../base/BaseHandle';
import { WorkflowNode } from '../WorkflowNode';
import { type NodeStatus } from '../base/NodeStatusIndicator';

interface SwitchRuleValue {
  outputKey?: string;
}

interface ControlNodeData {
  label?: string;
  controlType?: 'if' | 'loop' | 'switch' | 'filter' | 'wait';
  config?: Record<string, unknown>;
  status?: string;
  conditions?: { conditions?: unknown[] };
  rules?: { values?: SwitchRuleValue[] };
  fallbackOutput?: string;
  items?: string;
  resume?: string;
  amount?: number;
  unit?: string;
  dateTime?: string;
  [key: string]: unknown;
}

type ControlNodeType = Node<ControlNodeData>;

const CONTROL_ICONS: Record<string, LucideIcon> = {
  if: GitBranch,
  loop: RotateCcw,
  switch: Shuffle,
  filter: Filter,
  wait: PauseCircle,
};

export const ControlNode = memo((props: NodeProps<ControlNodeType>) => {
  const { setNodes, setEdges } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const controlType = (props.data?.controlType || 'if') as keyof typeof CONTROL_ICONS;
  const label = props.data?.label;

  const nodeStatus: NodeStatus = (props.data?.status as NodeStatus) || 'initial';
  const Icon = CONTROL_ICONS[controlType] || GitBranch;

  // Track rules count and fallback option for Switch nodes to detect changes
  const rulesCount = controlType === 'switch' ? (props.data?.rules?.values || []).length : 0;
  const fallbackOutput = controlType === 'switch' ? (props.data?.fallbackOutput || 'none') : 'none';

  // Notify React Flow when handles change (for Switch node)
  useEffect(() => {
    if (controlType === 'switch') {
      // Update React Flow's internal handle registry when rules change
      updateNodeInternals(props.id);
    }
  }, [controlType, rulesCount, fallbackOutput, updateNodeInternals, props.id]);

  const handleDelete = () => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== props.id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== props.id && edge.target !== props.id)
    );
  };

  // Get the node name based on controlType
  const getNodeName = () => {
    switch (controlType) {
      case 'if':
        return 'If';
      case 'switch':
        return 'Switch';
      case 'filter':
        return 'Filter';
      case 'loop':
        return 'Loop Over Items';
      case 'wait':
        return 'Wait';
      default:
        return label || 'Control';
    }
  };

  // Get description based on configuration
  const getDescription = (): string => {
    // Access conditions and rules directly from node data
    const conditionsCount = props.data?.conditions?.conditions?.length;
    const descRulesCount = props.data?.rules?.values?.length;

    if (controlType === 'if' && conditionsCount) {
      return `${conditionsCount} condition${conditionsCount > 1 ? 's' : ''}`;
    }
    if (controlType === 'switch' && descRulesCount) {
      return `${descRulesCount} rule${descRulesCount > 1 ? 's' : ''}`;
    }
    if (controlType === 'filter' && conditionsCount) {
      return `${conditionsCount} condition${conditionsCount > 1 ? 's' : ''}`;
    }
    if (controlType === 'loop') {
      return props.data?.items || 'Not configured';
    }
    if (controlType === 'wait') {
      const resume = props.data?.resume || 'timeInterval';
      if (resume === 'timeInterval') {
        const amount = props.data?.amount || 5;
        const unit = props.data?.unit || 'seconds';
        return `Wait ${amount} ${unit}`;
      }
      if (resume === 'specificTime') {
        return props.data?.dateTime ? `Until ${props.data.dateTime}` : 'Not configured';
      }
      if (resume === 'webhook') {
        return 'Wait for webhook';
      }
      if (resume === 'form') {
        return 'Wait for form';
      }
      return 'Not configured';
    }
    return 'Not configured';
  };

  // Render multiple handles for IF, SWITCH, FILTER
  const renderHandles = () => {
    if (controlType === 'if') {
      return (
        <>
          <BaseHandle id="target-1" type="target" position={Position.Left} />
          <BaseHandle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: '35%', background: '#10b981' }}
            title="True"
          />
          <BaseHandle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: '65%', background: '#ef4444' }}
            title="False"
          />
        </>
      );
    }

    if (controlType === 'switch') {
      const rules = props.data?.rules?.values || [];
      const switchFallbackOutput = props.data?.fallbackOutput || 'none';

      // Ensure we always have at least one rule for rendering
      const rulesCount = Math.max(rules.length, 1);
      const hasFallback = switchFallbackOutput === 'extra';
      const totalOutputs = rulesCount + (hasFallback ? 1 : 0);

      // Calculate positions based on number of outputs
      // For 1 output: 50%
      // For 2 outputs: 33%, 67%
      // For 3 outputs: 25%, 50%, 75%
      // For 4 outputs: 20%, 40%, 60%, 80%
      const getTop = (index: number) => `${((index + 1) * 100) / (totalOutputs + 1)}%`;

      // Render handles based on rules count
      if (rulesCount === 1 && !hasFallback) {
        return (
          <>
            <BaseHandle id="target-1" type="target" position={Position.Left} />
            <BaseHandle
              id="output-0"
              type="source"
              position={Position.Right}
              style={{ top: '50%', background: '#8b5cf6' }}
              title={`Output ${rules[0]?.outputKey || '0'}`}
            />
          </>
        );
      }

      if (rulesCount === 2 && !hasFallback) {
        return (
          <>
            <BaseHandle id="target-1" type="target" position={Position.Left} />
            <BaseHandle
              id="output-0"
              type="source"
              position={Position.Right}
              style={{ top: getTop(0), background: '#8b5cf6' }}
              title={`Output ${rules[0]?.outputKey || '0'}`}
            />
            <BaseHandle
              id="output-1"
              type="source"
              position={Position.Right}
              style={{ top: getTop(1), background: '#8b5cf6' }}
              title={`Output ${rules[1]?.outputKey || '1'}`}
            />
          </>
        );
      }

      if (rulesCount === 3 && !hasFallback) {
        return (
          <>
            <BaseHandle id="target-1" type="target" position={Position.Left} />
            <BaseHandle
              id="output-0"
              type="source"
              position={Position.Right}
              style={{ top: getTop(0), background: '#8b5cf6' }}
              title={`Output ${rules[0]?.outputKey || '0'}`}
            />
            <BaseHandle
              id="output-1"
              type="source"
              position={Position.Right}
              style={{ top: getTop(1), background: '#8b5cf6' }}
              title={`Output ${rules[1]?.outputKey || '1'}`}
            />
            <BaseHandle
              id="output-2"
              type="source"
              position={Position.Right}
              style={{ top: getTop(2), background: '#8b5cf6' }}
              title={`Output ${rules[2]?.outputKey || '2'}`}
            />
          </>
        );
      }

      if (rulesCount === 4 && !hasFallback) {
        return (
          <>
            <BaseHandle id="target-1" type="target" position={Position.Left} />
            <BaseHandle
              id="output-0"
              type="source"
              position={Position.Right}
              style={{ top: getTop(0), background: '#8b5cf6' }}
              title={`Output ${rules[0]?.outputKey || '0'}`}
            />
            <BaseHandle
              id="output-1"
              type="source"
              position={Position.Right}
              style={{ top: getTop(1), background: '#8b5cf6' }}
              title={`Output ${rules[1]?.outputKey || '1'}`}
            />
            <BaseHandle
              id="output-2"
              type="source"
              position={Position.Right}
              style={{ top: getTop(2), background: '#8b5cf6' }}
              title={`Output ${rules[2]?.outputKey || '2'}`}
            />
            <BaseHandle
              id="output-3"
              type="source"
              position={Position.Right}
              style={{ top: getTop(3), background: '#8b5cf6' }}
              title={`Output ${rules[3]?.outputKey || '3'}`}
            />
          </>
        );
      }

      // Fallback: render with .map (less performant but supports unlimited rules)
      return (
        <>
          <BaseHandle id="target-1" type="target" position={Position.Left} />
          {[...Array(rulesCount)].map((_, index) => (
            <BaseHandle
              key={`output-${index}`}
              id={`output-${index}`}
              type="source"
              position={Position.Right}
              style={{ top: getTop(index), background: '#8b5cf6' }}
              title={`Output ${rules[index]?.outputKey || index.toString()}`}
            />
          ))}
          {hasFallback && (
            <BaseHandle
              id="output-fallback"
              type="source"
              position={Position.Right}
              style={{ top: getTop(rulesCount), background: '#6b7280' }}
              title="Fallback"
            />
          )}
        </>
      );
    }

    if (controlType === 'filter') {
      return (
        <>
          <BaseHandle id="target-1" type="target" position={Position.Left} />
          <BaseHandle
            id="kept"
            type="source"
            position={Position.Right}
            style={{ top: '35%', background: '#10b981' }}
            title="Kept"
          />
          <BaseHandle
            id="discarded"
            type="source"
            position={Position.Right}
            style={{ top: '65%', background: '#6b7280' }}
            title="Discarded"
          />
        </>
      );
    }

    // Default: single input and output
    return (
      <>
        <BaseHandle id="target-1" type="target" position={Position.Left} />
        <BaseHandle id="source-1" type="source" position={Position.Right} />
      </>
    );
  };

  return (
    <WorkflowNode
      name={getNodeName()}
      description={getDescription()}
      onDelete={handleDelete}
    >
      <BaseNode status={nodeStatus}>
        {/* Render handles first to ensure proper z-index */}
        {renderHandles()}
        <BaseNodeContent className="flex-row items-center gap-3">
          <Icon className="size-5 text-purple-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{getNodeName()}</p>
            <p className="text-xs text-gray-400 truncate">{getDescription()}</p>
          </div>
        </BaseNodeContent>
      </BaseNode>
    </WorkflowNode>
  );
});

ControlNode.displayName = 'ControlNode';