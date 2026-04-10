import React, { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Settings, Play, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { WorkflowNode } from '../../../types/workflow';
import type { JsonValue } from '../../../types/json';
import { ConnectorConfigModal } from '../ConnectorConfigModal';

interface ConnectorInput {
  id: string;
  name: string;
  type: string;
  required?: boolean;
}

interface ConnectorOutput {
  id: string;
  name: string;
  type: string;
}

interface ConnectorNodeData {
  label: string;
  connectorType?: string;
  config?: Record<string, JsonValue>;
  inputs?: ConnectorInput[];
  outputs?: ConnectorOutput[];
  status?: 'idle' | 'running' | 'success' | 'error';
  error?: string;
  icon?: string;
  color?: string;
  category?: string;
}

export const ConnectorNode = memo<NodeProps>(({ id, data, selected }) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const {
    label,
    connectorType,
    config = {},
    inputs = [],
    outputs = [],
    status = 'idle',
    error,
    icon,
    color = '#8b5cf6',
    category = 'connector'
  } = data as unknown as ConnectorNodeData;

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'border-blue-400 shadow-blue-400/20';
      case 'success':
        return 'border-green-400 shadow-green-400/20';
      case 'error':
        return 'border-red-400 shadow-red-400/20';
      default:
        return selected ? 'border-purple-400 shadow-purple-400/20' : 'border-white/20';
    }
  };

  return (
    <>
      <Card className={`
        min-w-40 bg-white/10 backdrop-blur-md border-2 transition-all duration-200
        ${getStatusColor()} ${selected ? 'shadow-lg' : 'shadow-sm'}
        hover:bg-white/15 hover:shadow-md
      `}>
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {icon && (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: color }}
                >
                  {icon.length <= 2 ? icon : icon.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-white font-medium text-sm">{label}</h3>
                {category && (
                  <Badge variant="secondary" className="text-xs bg-white/10 text-white/70">
                    {category}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="w-8 h-8 p-0 hover:bg-white/20 text-white/70 hover:text-white"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-md">
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          {/* Configuration preview */}
          {Object.keys(config).length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-white/50 mb-1">Configuration:</div>
              <div className="bg-black/20 p-2 rounded text-xs text-white/70 max-h-20 overflow-y-auto">
                {Object.entries(config).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-white/50">{key}:</span>
                    <span className="truncate ml-2 max-w-24">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
                {Object.keys(config).length > 3 && (
                  <div className="text-white/40">... {Object.keys(config).length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Handles */}
        {inputs.map((input: ConnectorInput, index: number) => (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{
              top: 60 + index * 20,
              background: input.required ? '#ef4444' : '#6b7280',
              borderColor: input.required ? '#dc2626' : '#4b5563',
            }}
            title={`${input.name} (${input.type})${input.required ? ' - Required' : ''}`}
          />
        ))}

        {/* Output Handles */}
        {outputs.map((output: ConnectorOutput, index: number) => (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            style={{
              top: 60 + index * 20,
              background: '#8b5cf6',
              borderColor: '#7c3aed',
            }}
            title={`${output.name} (${output.type})`}
          />
        ))}

        {/* Default handles if no specific inputs/outputs defined */}
        {inputs.length === 0 && (
          <Handle
            type="target"
            position={Position.Left}
            style={{ background: '#6b7280', borderColor: '#4b5563' }}
            title="Input"
          />
        )}
        {outputs.length === 0 && (
          <Handle
            type="source"
            position={Position.Right}
            style={{ background: '#8b5cf6', borderColor: '#7c3aed' }}
            title="Output"
          />
        )}
      </Card>

      {/* Configuration Modal */}
      <ConnectorConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        nodeId={id}
        connectorType={connectorType || 'unknown'}
        currentConfig={config}
        onConfigUpdate={(newConfig: Record<string, JsonValue>) => {
          // This would be handled by the parent workflow builder
          // console.log('Config updated:', newConfig);
        }}
      />
    </>
  );
});

ConnectorNode.displayName = 'ConnectorNode';