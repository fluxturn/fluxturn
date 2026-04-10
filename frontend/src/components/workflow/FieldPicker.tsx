import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ChevronDown, ChevronRight, Database, Braces, Search, Hash, ToggleLeft, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/lib/api';

interface FieldPickerProps {
  nodeId: string; // Current node ID
  workflowId?: string | null; // Workflow ID to fetch execution data
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  mode?: 'condition' | 'action'; // Mode for different variable formats
  multiline?: boolean; // Use textarea instead of input for multi-line text
}

// Tree node structure for hierarchical display
interface FieldTreeNode {
  name: string;              // Field name: "text", "message"
  fullPath: string;          // Full expression: {{$node["X"].json.a.b}}
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  value?: unknown;             // Sample value for display
  children?: FieldTreeNode[];
}

// Group of fields from a single node
interface NodeGroup {
  nodeName: string;
  nodeType: string;
  nodeId: string;
  fields: FieldTreeNode[];
}

// Legacy interface for backward compatibility
interface FieldInfo {
  path: string;
  type: string;
  value?: unknown;
}

export const FieldPicker: React.FC<FieldPickerProps> = ({
  nodeId,
  workflowId,
  value,
  onChange,
  placeholder = 'Select or type field path',
  className = '',
  mode = 'condition',
  multiline = false,
}) => {
  const { getNodes, getEdges } = useReactFlow();
  const [open, setOpen] = useState(false);
  const [nodeGroups, setNodeGroups] = useState<NodeGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingExecutionData, setLoadingExecutionData] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get all parent nodes (nodes that come before this one in the workflow)
  const getParentNodes = () => {
    const nodes = getNodes();
    const edges = getEdges();

    // Find all edges that target the current node
    const parentNodeIds = new Set<string>();

    const findParents = (currentNodeId: string) => {
      edges.forEach((edge) => {
        if (edge.target === currentNodeId && !parentNodeIds.has(edge.source) && edge.source !== nodeId) {
          parentNodeIds.add(edge.source);
          findParents(edge.source); // Recursively find parents
        }
      });
    };

    findParents(nodeId);

    // Get the parent nodes, excluding the current node itself
    return nodes.filter((node) => parentNodeIds.has(node.id) && node.id !== nodeId);
  };

  // Build hierarchical tree structure from data
  const buildFieldTree = useCallback((data: unknown, nodeName: string, basePath = ''): FieldTreeNode[] => {
    const nodes: FieldTreeNode[] = [];

    if (!data || typeof data !== 'object') {
      return nodes;
    }

    const processValue = (key: string, val: unknown, currentPath: string): FieldTreeNode => {
      const fieldPath = currentPath ? `${currentPath}.${key}` : key;
      const fullExpression = mode === 'action'
        ? `{{$node["${nodeName}"].json.${fieldPath}}}`
        : `{{$json.${fieldPath}}}`;

      if (val === null || val === undefined) {
        return {
          name: key,
          fullPath: fullExpression,
          type: 'string',
          value: val,
        };
      }

      if (Array.isArray(val)) {
        const children: FieldTreeNode[] = [];
        // Show first item structure if available
        if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
          const arrayItemChildren = buildFieldTree(val[0] as Record<string, unknown>, nodeName, `${fieldPath}[0]`);
          children.push(...arrayItemChildren);
        }
        return {
          name: key,
          fullPath: fullExpression,
          type: 'array',
          value: `[${val.length}]`,
          children: children.length > 0 ? children : undefined,
        };
      }

      if (typeof val === 'object') {
        const children = buildFieldTree(val as Record<string, unknown>, nodeName, fieldPath);
        return {
          name: key,
          fullPath: fullExpression,
          type: 'object',
          children: children.length > 0 ? children : undefined,
        };
      }

      return {
        name: key,
        fullPath: fullExpression,
        type: typeof val as 'string' | 'number' | 'boolean',
        value: val,
      };
    };

    Object.keys(data as Record<string, unknown>).forEach((key) => {
      nodes.push(processValue(key, (data as Record<string, unknown>)[key], basePath));
    });

    return nodes;
  }, [mode]);

  // Toggle node group expansion
  const toggleNodeExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Toggle field path expansion
  const togglePathExpanded = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Filter tree nodes based on search query
  const filterTree = useCallback((nodes: FieldTreeNode[], query: string): FieldTreeNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();

    const filterNode = (node: FieldTreeNode): FieldTreeNode | null => {
      const nameMatches = node.name.toLowerCase().includes(lowerQuery);
      const valueMatches = node.value !== undefined &&
        String(node.value).toLowerCase().includes(lowerQuery);

      if (node.children) {
        const filteredChildren = node.children
          .map(filterNode)
          .filter((n): n is FieldTreeNode => n !== null);

        if (filteredChildren.length > 0 || nameMatches || valueMatches) {
          return { ...node, children: filteredChildren.length > 0 ? filteredChildren : undefined };
        }
      }

      if (nameMatches || valueMatches) {
        return node;
      }

      return null;
    };

    return nodes.map(filterNode).filter((n): n is FieldTreeNode => n !== null);
  }, []);

  // Get type icon for field
  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'object':
        return <Braces className="w-3.5 h-3.5 text-blue-400" />;
      case 'array':
        return <List className="w-3.5 h-3.5 text-purple-400" />;
      case 'string':
        return <Database className="w-3.5 h-3.5 text-green-400" />;
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-yellow-400" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <Database className="w-3.5 h-3.5 text-gray-400" />;
    }
  }, []);

  // Get type badge color
  const getTypeBadgeClass = useCallback((type: string) => {
    switch (type) {
      case 'object':
        return 'bg-blue-500/20 text-blue-400';
      case 'array':
        return 'bg-purple-500/20 text-purple-400';
      case 'string':
        return 'bg-green-500/20 text-green-400';
      case 'number':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'boolean':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }, []);

  // Format value for display
  const formatDisplayValue = useCallback((value: unknown, type: string): string => {
    if (value === null) return 'null';
    if (value === undefined) return '';
    if (type === 'string') {
      const str = String(value);
      return str.length > 30 ? `"${str.substring(0, 30)}..."` : `"${str}"`;
    }
    if (type === 'array') return String(value);
    return String(value);
  }, []);

  // Load available fields when popover opens
  useEffect(() => {
    const loadFieldsFromExecutionData = async () => {
      if (!open) return;

      const parentNodes = getParentNodes();
      // console.log('[FieldPicker] Parent nodes found:', parentNodes.length, parentNodes.map(n => ({ id: n.id, type: n.type, label: n.data?.label })));
      const groups: NodeGroup[] = [];
      let executionData: Record<string, unknown> | null = null;

      // Fetch execution data from database if workflowId exists
      if (workflowId && mode === 'action') {
        setLoadingExecutionData(true);
        try {
          const response = await api.get(`/workflow/${workflowId}/last-execution-output`);

          if (response.hasData && response.data) {
            executionData = response.data as Record<string, unknown>;
          }
        } catch (error) {
          console.error('Failed to fetch execution data:', error);
        } finally {
          setLoadingExecutionData(false);
        }
      }

      parentNodes.forEach((node) => {
        const nodeData = node.data as Record<string, unknown>;
        const nodeName = String(nodeData?.label || nodeData?.name || node.id);
        let sampleData: Record<string, unknown> = {};

        // console.log('[FieldPicker] Processing node:', nodeName, 'type:', node.type);

        // Priority 1: Check for execution data from database
        const execDataMap = executionData?.data as Record<string, Record<string, unknown>> | undefined;
        const nodeExecutionData = (execDataMap?.[node.id] || executionData?.[node.id]) as Record<string, unknown> | undefined;
        if (nodeExecutionData) {
          const nedData = nodeExecutionData.data as unknown;
          if (nedData) {
            if (Array.isArray(nedData) && nedData.length > 0) {
              const first = nedData[0] as unknown;
              if (Array.isArray(first) && first.length > 0) {
                const item = first[0] as Record<string, unknown>;
                sampleData = (item?.json as Record<string, unknown>) || item || {};
              } else if (typeof first === 'object' && first !== null && 'json' in (first as Record<string, unknown>)) {
                sampleData = (first as Record<string, unknown>).json as Record<string, unknown>;
              } else {
                sampleData = (first as Record<string, unknown>) || {};
              }
            }
          }
        }

        // Priority 2: Check for stored output data in node state
        if (Object.keys(sampleData).length === 0 && nodeData?.outputData && typeof nodeData.outputData === 'object' && Object.keys(nodeData.outputData as Record<string, unknown>).length > 0) {
          sampleData = nodeData.outputData as Record<string, unknown>;
        } else if (Object.keys(sampleData).length === 0 && nodeData?.lastResult && typeof nodeData.lastResult === 'object' && Object.keys(nodeData.lastResult as Record<string, unknown>).length > 0) {
          sampleData = nodeData.lastResult as Record<string, unknown>;
        }

        // Priority 3: For form triggers, infer fields from formFields config
        if (Object.keys(sampleData).length === 0 && node.type === 'FORM_TRIGGER' && nodeData?.formFields && Array.isArray(nodeData.formFields)) {
          const formSubmission: Record<string, string> = {};
          (nodeData.formFields as Array<{ name: string; type: string }>).forEach((field) => {
            formSubmission[field.name] = `<${field.type}>`;
          });
          sampleData.formSubmission = formSubmission as unknown as Record<string, unknown>;
          sampleData.submittedAt = '<timestamp>';
          sampleData.trigger = 'form';
        }

        // Priority 4: Check for sample data in node config
        if (Object.keys(sampleData).length === 0 && node.data?.sampleOutput) {
          sampleData = node.data.sampleOutput as Record<string, unknown>;
        }

        // Build tree structure from the data
        const fields = buildFieldTree(sampleData, nodeName);

        groups.push({
          nodeName,
          nodeType: String(node.type),
          nodeId: node.id,
          fields,
        });
      });

      // Auto-expand all nodes initially
      setExpandedNodes(new Set(groups.map(g => g.nodeId)));
      setNodeGroups(groups);
    };

    loadFieldsFromExecutionData();
  }, [open, nodeId, mode, workflowId, buildFieldTree]);

  const handleFieldSelect = (fieldPath: string) => {
    // Insert the field path at the cursor position instead of replacing
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const currentValue = value || '';

      // Insert the field path at cursor position
      const newValue = currentValue.substring(0, start) + fieldPath + currentValue.substring(end);
      onChange(newValue);

      // Set cursor position after the inserted text
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = start + fieldPath.length;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      // Fallback: append to end
      onChange((value || '') + fieldPath);
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // console.log('[FieldPicker] handleInputChange called, value:', e.target.value);
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLInputElement | HTMLTextAreaElement).selectionStart || 0);
  };

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLInputElement | HTMLTextAreaElement).selectionStart || 0);
  };

  // Recursive tree item renderer
  const renderTreeItem = (node: FieldTreeNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedPaths.has(node.fullPath);
    const paddingLeft = depth * 16;

    return (
      <div key={node.fullPath}>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-800 cursor-pointer group"
                style={{ paddingLeft: `${12 + paddingLeft}px` }}
                onClick={(e) => {
                  if (hasChildren) {
                    e.stopPropagation();
                    togglePathExpanded(node.fullPath);
                  } else {
                    handleFieldSelect(node.fullPath);
                  }
                }}
              >
                {/* Expand/Collapse or spacer */}
                <div className="w-4 flex-shrink-0">
                  {hasChildren ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePathExpanded(node.fullPath);
                      }}
                      className="p-0.5 hover:bg-gray-700 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  ) : null}
                </div>

                {/* Type icon */}
                <div className="flex-shrink-0">
                  {getTypeIcon(node.type)}
                </div>

                {/* Field name */}
                <span className="text-cyan-400 font-medium text-sm truncate">
                  {node.name}
                </span>

                {/* Type badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTypeBadgeClass(node.type)} flex-shrink-0`}>
                  {node.type}
                </span>

                {/* Value preview (for primitives) */}
                {node.value !== undefined && (
                  <span className="text-gray-500 text-xs truncate ml-auto max-w-[120px]">
                    {formatDisplayValue(node.value, node.type)}
                  </span>
                )}

                {/* Insert button on hover for objects/arrays */}
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFieldSelect(node.fullPath);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-xs text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-opacity flex-shrink-0"
                  >
                    Insert
                  </button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-gray-800 border-gray-700 text-xs font-mono max-w-[400px]">
              <p className="text-gray-300 break-all">{node.fullPath}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={multiline ? "space-y-2 w-full" : "flex gap-1.5 w-full"}>
      {multiline ? (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onKeyUp={handleInputKeyUp}
          placeholder={placeholder}
          className={`min-h-[120px] bg-gray-900 border-gray-600 text-white text-sm font-mono resize-y ${className}`}
        />
      ) : (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onKeyUp={handleInputKeyUp}
          placeholder={placeholder}
          className={`flex-1 bg-gray-800 border-gray-700 text-white text-sm ${className}`}
        />
      )}

      <DropdownMenu open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          setSearchQuery('');
          // Focus search input when opened
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      }}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600"
          >
            <Database className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[480px] bg-gray-900 border-gray-700 text-white p-0 max-h-[400px] overflow-hidden flex flex-col"
          align="end"
        >
          {/* Header with search */}
          <div className="p-3 border-b border-gray-700 bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-medium">Available Fields</p>
              {loadingExecutionData && (
                <span className="text-xs text-blue-400">Loading...</span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <Input
                ref={searchInputRef}
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 bg-gray-800 border-gray-700 text-sm text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1">
            {nodeGroups.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No parent nodes found</p>
                <p className="text-xs mt-1">Connect nodes to see available fields</p>
              </div>
            ) : (
              <>
                {nodeGroups.map((group) => {
                  const isNodeExpanded = expandedNodes.has(group.nodeId);
                  const filteredFields = filterTree(group.fields, searchQuery);

                  // Hide node group if no fields match search
                  if (searchQuery && filteredFields.length === 0) {
                    return null;
                  }

                  return (
                    <div key={group.nodeId}>
                      {/* Node header */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 border-y border-gray-700 cursor-pointer hover:bg-gray-800"
                        onClick={() => toggleNodeExpanded(group.nodeId)}
                      >
                        <button className="p-0.5">
                          {isNodeExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm font-semibold text-white">
                          {group.nodeName}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {group.nodeType}
                        </span>
                      </div>

                      {/* Fields tree */}
                      {isNodeExpanded && (
                        <div className="py-1">
                          {filteredFields.length > 0 ? (
                            filteredFields.map((field) => renderTreeItem(field, 0))
                          ) : (
                            <div className="px-4 py-2 text-xs text-gray-500 italic">
                              No output data yet - run the workflow to see fields
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer tip */}
          <DropdownMenuSeparator className="bg-gray-700" />
          <div className="p-2 bg-gray-800/50 flex-shrink-0">
            <p className="text-xs text-gray-400">
              Tip: Hover over a field to see the full expression
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
