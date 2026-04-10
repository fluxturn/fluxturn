import { type NodeProps, useReactFlow, NodeResizer, NodeToolbar, Position } from "@xyflow/react";
import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoteNodeData {
  content?: string;
  color?: string;
}

const NOTE_COLORS = [
  { name: 'Teal', from: 'from-teal-700', to: 'to-teal-800', border: 'border-teal-600' },
  { name: 'Yellow', from: 'from-yellow-600', to: 'to-yellow-700', border: 'border-yellow-500' },
  { name: 'Pink', from: 'from-pink-600', to: 'to-pink-700', border: 'border-pink-500' },
  { name: 'Purple', from: 'from-purple-600', to: 'to-purple-700', border: 'border-purple-500' },
  { name: 'Blue', from: 'from-blue-600', to: 'to-blue-700', border: 'border-blue-500' },
  { name: 'Green', from: 'from-green-600', to: 'to-green-700', border: 'border-green-500' },
  { name: 'Orange', from: 'from-orange-600', to: 'to-orange-700', border: 'border-orange-500' },
  { name: 'Red', from: 'from-red-600', to: 'to-red-700', border: 'border-red-500' },
];

export const NoteNode = memo((props: NodeProps) => {
  const { id, data, selected } = props;
  const { setNodes, setEdges } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [content, setContent] = useState(((data as Record<string, unknown>)?.content as string) || "I'm a note\n\nDouble click to edit me.");
  const [colorIndex, setColorIndex] = useState(parseInt(((data as Record<string, unknown>)?.color as string) || '0'));

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // Update node data
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              content: content,
            },
          };
        }
        return node;
      })
    );
  }, [content, id, setNodes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, []);

  const handleDelete = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== id && edge.target !== id)
    );
  }, [id, setNodes, setEdges]);

  const handleColorPickerToggle = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowColorPicker(!showColorPicker);
  }, [showColorPicker]);

  const handleColorChange = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setColorIndex(index);
    setShowColorPicker(false);
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              color: index.toString(),
            },
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  const currentColor = NOTE_COLORS[colorIndex] || NOTE_COLORS[0];

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={120}
        minHeight={80}
        color="#06b6d4"
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: '50%',
        }}
      />

      {/* Custom Toolbar with Color Palette and Delete */}
      <NodeToolbar
        position={Position.Top}
        className="flex gap-1 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-1 shadow-lg"
      >
        <Button
          size="sm"
          variant="ghost"
          onClick={handleColorPickerToggle}
          className="h-8 w-8 p-0 hover:bg-gray-800 text-gray-300 hover:text-white"
        >
          <Palette className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          className="h-8 w-8 p-0 hover:bg-red-900/50 text-gray-300 hover:text-red-400"
        >
          <Trash2 className="size-4" />
        </Button>
      </NodeToolbar>

      {/* Color Picker */}
      {showColorPicker && (
        <NodeToolbar
          isVisible={showColorPicker}
          position={Position.Bottom}
          className="flex gap-1 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-2 shadow-lg"
        >
          {NOTE_COLORS.map((color, index) => (
            <button
              key={index}
              onClick={(e) => handleColorChange(e, index)}
              className={cn(
                "w-6 h-6 rounded border-2 transition-all hover:scale-110",
                `bg-gradient-to-br ${color.from} ${color.to}`,
                colorIndex === index ? "border-white scale-110" : "border-gray-600"
              )}
              title={color.name}
            />
          ))}
        </NodeToolbar>
      )}

      <div
        className={cn(
          "relative w-full h-full rounded-lg shadow-md transition-all cursor-move",
          `bg-gradient-to-br ${currentColor.from} ${currentColor.to}`,
          `border-2 ${currentColor.border}`,
          selected ? "ring-2 ring-cyan-400" : ""
        )}
        onDoubleClick={handleDoubleClick}
      >
        {/* Content */}
        <div className="p-2 h-full flex flex-col">
          {isEditing ? (
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-xs text-white"
              placeholder="Type your note here..."
            />
          ) : (
            <div className="text-xs text-white whitespace-pre-wrap break-words leading-relaxed overflow-auto">
              {content}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

NoteNode.displayName = "NoteNode";
