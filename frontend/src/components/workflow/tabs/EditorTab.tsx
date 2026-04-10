import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Connection,
  Background,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import { Maximize, ZoomIn, ZoomOut, Locate } from 'lucide-react';
import { toast } from 'sonner';
import { nodeComponents } from '@/config/workflow';
import { CustomEdge } from '@/components/workflow/edges/CustomEdge';
import { RightToolbar } from '@/components/workflow/RightToolbar';
import { BottomPanel, LogEntry } from '@/components/workflow/BottomPanel';
import type { DatabaseNodeInfo } from '@/components/workflow/database';

const edgeTypes = {
  default: CustomEdge,
};

function ZoomControls({ bottomOffset = 64 }: { bottomOffset?: number }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div
      className="absolute left-4 flex gap-2 z-30 transition-all duration-200"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <button
        onClick={() => fitView({ padding: 0.2 })}
        className="w-10 h-10 flex items-center justify-center glass hover:bg-white/10 rounded border border-white/10 transition-colors"
        title="Fit to view"
      >
        <Maximize className="w-4 h-4 text-gray-300" />
      </button>
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="w-10 h-10 flex items-center justify-center glass hover:bg-white/10 rounded border border-white/10 transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4 text-gray-300" />
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="w-10 h-10 flex items-center justify-center glass hover:bg-white/10 rounded border border-white/10 transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4 text-gray-300" />
      </button>
      <button
        onClick={() => fitView({ padding: 0.2, duration: 200 })}
        className="w-10 h-10 flex items-center justify-center glass hover:bg-white/10 rounded border border-white/10 transition-colors"
        title="Center view"
      >
        <Locate className="w-4 h-4 text-gray-300" />
      </button>
    </div>
  );
}

interface EditorTabProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  isLoading: boolean;
  executionLogs: LogEntry[];
  onClearLogs: () => void;
  onAddNode: () => void;
  onAIPrompt: () => void;
  onAddNote: () => void;
  onLayout: () => void;
  selectedNode?: Node;
  onCloseNodeData?: () => void;
  databaseNodes?: DatabaseNodeInfo[];
}

export function EditorTab({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  isLoading,
  executionLogs,
  onClearLogs,
  onAddNode,
  onAIPrompt,
  onAddNote,
  onLayout,
  selectedNode,
  onCloseNodeData,
  databaseNodes = [],
}: EditorTabProps) {
  // Track bottom panel state for zoom controls positioning
  const [panelState, setPanelState] = useState({ isOpen: false, height: 240 });

  const handlePanelStateChange = useCallback((isOpen: boolean, height: number) => {
    setPanelState({ isOpen, height });
  }, []);

  // Calculate bottom offset for zoom controls
  // When panel is closed, use 64px (bottom-16), when open use panel height + 16px
  const zoomControlsOffset = panelState.isOpen ? panelState.height + 16 : 64;

  return (
    <>
      {/* Canvas Area */}
      <div className="flex-1 relative bg-gradient-to-br from-background via-background to-cyan-950/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeComponents}
          edgeTypes={edgeTypes}
          defaultViewport={{ x: 100, y: 100, zoom: 0.7 }}
          minZoom={0.2}
          maxZoom={4}
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-transparent"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            deletable: true,
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#64748b',
            },
            style: {
              strokeWidth: 2,
              stroke: '#64748b',
            },
          }}
          edgesFocusable={true}
          edgesReconnectable={true}
        >
          <Background
            color="#1f2937"
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
          />
        </ReactFlow>

        {/* Bottom Left Zoom Controls (Outside ReactFlow) */}
        <ZoomControls bottomOffset={zoomControlsOffset} />

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="flex flex-col items-center justify-center pointer-events-auto glass px-8 py-6 rounded-lg border border-white/10">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-400 text-sm">Loading workflow...</p>
            </div>
          </div>
        )}

        {/* Empty State - Absolutely Centered (Outside ReactFlow) */}
        {nodes.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="flex flex-col items-center justify-center pointer-events-auto">
              <button
                onClick={() => {
                  // console.log('Add first step clicked');
                  onAddNode();
                }}
                className="w-24 h-24 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-cyan-500 transition-colors group cursor-pointer"
              >
                <span className="text-4xl text-gray-600 group-hover:text-cyan-500">+</span>
              </button>
              <p className="mt-4 text-gray-400 text-sm">Add first step...</p>
            </div>
          </div>
        )}

        {/* Right Toolbar  */}
        <RightToolbar
          onAddNode={onAddNode}
          onAIPrompt={onAIPrompt}
          onAddNote={onAddNote}
          onLayout={() => {
            if (nodes.length > 0) {
              toast.success('Auto layout applied');
              onLayout();
            } else {
              toast.info('No nodes to layout');
            }
          }}
        />
      </div>

      {/* Bottom Panel with Logs, Data, and Database tabs  */}
      <BottomPanel
        logs={executionLogs}
        onClearLogs={onClearLogs}
        selectedNode={selectedNode}
        onCloseNodeData={onCloseNodeData}
        databaseNodes={databaseNodes}
        onPanelStateChange={handlePanelStateChange}
      />
    </>
  );
}
