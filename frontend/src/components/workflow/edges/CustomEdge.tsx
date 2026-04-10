import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, useReactFlow, MarkerType } from '@xyflow/react';
import { X } from 'lucide-react';
import { memo, useState } from 'react';

export const CustomEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  // Check if edge was executed successfully
  const isExecuted = (data as Record<string, unknown> | undefined)?.executed === true;

  // Apply green color for executed edges with animation
  const edgeStyle = isExecuted ? {
    stroke: '#22c55e', // bright green-500
    strokeWidth: 3,
    filter: 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.5))', // green glow
  } : style;

  const edgeMarkerEnd = isExecuted ? 'url(#green-arrow)' : 'url(#default-arrow)';

  return (
    <>
      {/* SVG marker definitions */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          {/* Default arrow marker */}
          <marker
            id="default-arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          {/* Green arrow marker for executed edges */}
          <marker
            id="green-arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>
      <BaseEdge
        path={edgePath}
        markerEnd={edgeMarkerEnd}
        style={edgeStyle}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {(selected || isHovered) && (
            <button
              onClick={onEdgeDelete}
              className="w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 border border-white/20"
              title="Delete connection"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
