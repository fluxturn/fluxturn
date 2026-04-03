import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Variable, ChevronRight, ChevronDown, Search } from "lucide-react";

interface VariablePickerProps {
  previousNodes: Array<{
    id: string;
    name: string;
    type: string;
    outputData?: any;
  }>;
  onSelect: (variable: string) => void;
}

export function VariablePicker({ previousNodes, onSelect }: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderObjectFields = (obj: any, path: string, nodeId: string, nodeName: string) => {
    if (!obj || typeof obj !== 'object') return null;

    return Object.entries(obj).map(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key;
      // Use the correct format that backend expects: {{$node["NodeName"].json.field}}
      const fullVariable = `{{$node["${nodeName}"].json.${fieldPath}}}`;
      const hasChildren = value && typeof value === 'object' && !Array.isArray(value);
      const isExpanded = expandedNodes.has(`${nodeId}.${fieldPath}`);

      // Filter based on search
      if (searchQuery && !key.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
      }

      return (
        <div key={fieldPath} className="ml-4">
          <div className="flex items-center gap-2 py-1 hover:bg-gray-700/50 rounded px-2 cursor-pointer group">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(`${nodeId}.${fieldPath}`)}
                className="p-0.5 hover:bg-gray-600 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}

            <button
              onClick={() => onSelect(fullVariable)}
              className="flex-1 text-left text-sm text-gray-300 group-hover:text-white"
            >
              <span className="text-cyan-400">{key}</span>
              {!hasChildren && (
                <span className="text-gray-500 ml-2">
                  {typeof value === 'string' ? `"${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"` :
                   typeof value === 'number' ? value :
                   typeof value === 'boolean' ? String(value) :
                   Array.isArray(value) ? `[${value.length} items]` :
                   '{...}'}
                </span>
              )}
            </button>

            <code className="text-xs text-gray-600 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {`{{...${key}}}`}
            </code>
          </div>

          {hasChildren && isExpanded && renderObjectFields(value, fieldPath, nodeId, nodeName)}
        </div>
      );
    });
  };

  if (previousNodes.length === 0) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed"
            disabled
          >
            <Variable className="w-4 h-4 mr-2" />
            No previous nodes
          </Button>
        </PopoverTrigger>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          <Variable className="w-4 h-4 mr-2" />
          Insert Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-gray-900 border-gray-700 p-0" align="start">
        <div className="p-3 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 px-2">Previous Nodes</div>
            {previousNodes.map((node) => {
              const isExpanded = expandedNodes.has(node.id);
              const hasData = node.outputData && Object.keys(node.outputData).length > 0;

              return (
                <div key={node.id} className="mb-2">
                  <div className="flex items-center gap-2 py-1.5 hover:bg-gray-700/50 rounded px-2 cursor-pointer">
                    <button
                      onClick={() => toggleNode(node.id)}
                      className="p-0.5 hover:bg-gray-600 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">{node.name || node.id}</div>
                      <div className="text-xs text-gray-500">{node.type}</div>
                    </div>

                    {!hasData && (
                      <span className="text-xs text-gray-600">No data</span>
                    )}
                  </div>

                  {isExpanded && hasData && (
                    <div className="mt-1">
                      {renderObjectFields(node.outputData, '', node.id, node.name || node.id)}
                    </div>
                  )}

                  {isExpanded && !hasData && (
                    <div className="ml-8 text-xs text-gray-500 py-2">
                      No output data available. Run the workflow to see data.
                    </div>
                  )}
                </div>
              );
            })}

            {previousNodes.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No previous nodes found
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <div className="text-xs text-gray-400">
            Click a field to insert its variable reference
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Format: <code className="text-cyan-400">{'{{$node["NodeName"].json.field}}'}</code>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
