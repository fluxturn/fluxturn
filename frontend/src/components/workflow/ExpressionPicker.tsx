import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  Braces,
  Search,
  ChevronRight,
  ChevronDown,
  Database,
  Workflow,
  Copy,
  CheckCircle2
} from 'lucide-react';

interface ExpressionPickerProps {
  /**
   * List of all nodes in the workflow
   */
  nodes: Array<{
    id: string;
    data: Record<string, unknown>;
  }>;

  /**
   * ID of the current node (to filter out future nodes)
   */
  currentNodeId: string;

  /**
   * Callback when an expression is selected
   */
  onSelect: (expression: string) => void;

  /**
   * Whether to show the trigger as a button (default) or inline icon
   */
  variant?: 'button' | 'icon';

  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';
}

// Common output fields for different connector types
const CONNECTOR_OUTPUT_SCHEMAS: Record<string, Array<{ path: string; label: string; description: string }>> = {
  gmail: [
    { path: 'messageId', label: 'Message ID', description: 'Unique identifier for the email' },
    { path: 'from', label: 'From', description: 'Sender email address' },
    { path: 'to', label: 'To', description: 'Recipient email address' },
    { path: 'subject', label: 'Subject', description: 'Email subject line' },
    { path: 'snippet', label: 'Preview', description: 'Email preview text' },
    { path: 'date', label: 'Date', description: 'Email date' },
  ],
  google_analytics: [
    { path: 'sessions', label: 'Sessions', description: 'Number of sessions' },
    { path: 'users', label: 'Users', description: 'Number of users' },
    { path: 'pageviews', label: 'Page Views', description: 'Total page views' },
    { path: 'bounceRate', label: 'Bounce Rate', description: 'Bounce rate percentage' },
  ],
  openai: [
    { path: 'choices[0].message.content', label: 'AI Response', description: 'The AI-generated response text' },
    { path: 'choices[0].finish_reason', label: 'Finish Reason', description: 'Why the generation stopped' },
    { path: 'usage.total_tokens', label: 'Total Tokens', description: 'Total tokens used' },
  ],
  google_sheets: [
    { path: 'values', label: 'Row Data', description: 'Array of row values' },
    { path: 'range', label: 'Range', description: 'The range that was accessed' },
    { path: 'spreadsheetUrl', label: 'Spreadsheet URL', description: 'Link to the spreadsheet' },
  ],
  slack: [
    { path: 'ts', label: 'Message Timestamp', description: 'Unique message timestamp' },
    { path: 'channel', label: 'Channel', description: 'Channel where message was sent' },
    { path: 'ok', label: 'Success', description: 'Whether the message was sent successfully' },
  ],
  // Add more connectors as needed
  default: [
    { path: 'json', label: 'Full Output', description: 'Complete output data from the node' },
    { path: 'json.id', label: 'ID', description: 'Resource identifier' },
    { path: 'json.name', label: 'Name', description: 'Resource name' },
    { path: 'json.data', label: 'Data', description: 'Main data payload' },
  ],
};

export const ExpressionPicker: React.FC<ExpressionPickerProps> = ({
  nodes,
  currentNodeId,
  onSelect,
  variant = 'button',
  size = 'sm',
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [copiedExpression, setCopiedExpression] = useState<string | null>(null);

  // Filter to only include previous nodes (nodes before the current one)
  const previousNodes = useMemo(() => {
    const currentNodeIndex = nodes.findIndex(n => n.id === currentNodeId);
    if (currentNodeIndex === -1) return nodes;

    return nodes.slice(0, currentNodeIndex).reverse(); // Show most recent first
  }, [nodes, currentNodeId]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev =>
      prev.includes(nodeId)
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const handleCopyExpression = (expression: string) => {
    onSelect(expression);
    setCopiedExpression(expression);

    // Reset copied state after 2 seconds
    setTimeout(() => setCopiedExpression(null), 2000);

    // Optionally close popover after selection
    // setOpen(false);
  };

  const getNodeOutputFields = (node: { id: string; data: Record<string, unknown> }) => {
    const connectorType = node.data?.connectorType || node.data?.connector;

    // Get connector-specific fields or use defaults
    return CONNECTOR_OUTPUT_SCHEMAS[connectorType as string] || CONNECTOR_OUTPUT_SCHEMAS.default;
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return previousNodes;

    return previousNodes.filter(node => {
      const searchLower = searchTerm.toLowerCase();
      const labelMatch = (typeof node.data?.label === 'string' && node.data.label.toLowerCase().includes(searchLower)) || false;
      const idMatch = node.id.toLowerCase().includes(searchLower);

      // Also search through output fields
      const outputFields = getNodeOutputFields(node);
      const fieldMatch = outputFields.some(field =>
        field.label.toLowerCase().includes(searchLower) ||
        field.path.toLowerCase().includes(searchLower)
      );

      return labelMatch || idMatch || fieldMatch;
    });
  }, [previousNodes, searchTerm]);

  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600"
        >
          <Braces className="w-4 h-4" />
        </Button>
      );
    }

    return (
      <Button
        type="button"
        size={size}
        variant="outline"
        className="gap-2 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700/50 hover:border-gray-600"
      >
        <Braces className="w-3.5 h-3.5" />
        <span className="text-xs">Expression</span>
      </Button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger()}
      </PopoverTrigger>

      <PopoverContent
        className="w-[400px] p-0 bg-slate-900/95 border-white/20"
        align="start"
        sideOffset={5}
      >
        <div className="flex flex-col h-[500px]">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Workflow className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-white">Previous Node Data</h3>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                placeholder="Search nodes and fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-9 text-sm"
              />
            </div>
          </div>

          {/* Nodes List */}
          <ScrollArea className="flex-1 p-2">
            {filteredNodes.length === 0 && (
              <div className="text-center py-8 text-white/60">
                <Database className="w-12 h-12 mx-auto mb-3 text-white/30" />
                <p className="text-sm">
                  {searchTerm ? 'No matching fields found' : 'No previous nodes available'}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {searchTerm ? 'Try a different search term' : 'Add nodes before this one to see their data'}
                </p>
              </div>
            )}

            <div className="space-y-1">
              {filteredNodes.map(node => {
                const isExpanded = expandedNodes.includes(node.id);
                const outputFields = getNodeOutputFields(node);

                return (
                  <div key={node.id} className="rounded-md overflow-hidden">
                    {/* Node Header */}
                    <button
                      onClick={() => toggleNode(node.id)}
                      className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-white/70" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white/70" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 text-left">
                          <div className="text-sm font-medium text-white truncate">
                            {String(node.data?.label || node.id)}
                          </div>
                          <div className="text-xs text-white/50 truncate">
                            {node.id}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant="secondary"
                        className="ml-2 bg-purple-500/20 text-purple-300 text-xs flex-shrink-0"
                      >
                        {outputFields.length} fields
                      </Badge>
                    </button>

                    {/* Output Fields */}
                    {isExpanded && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 bg-black/20">
                        {outputFields.map(field => {
                          const expression = `{{$node.${node.id}.${field.path}}}`;
                          const isCopied = copiedExpression === expression;

                          return (
                            <button
                              key={field.path}
                              onClick={() => handleCopyExpression(expression)}
                              className="w-full flex items-start gap-2 p-2 rounded hover:bg-white/5 transition-colors group text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white group-hover:text-purple-300 transition-colors">
                                  {field.label}
                                </div>
                                <div className="text-xs text-white/50 mt-0.5">
                                  {field.description}
                                </div>
                                <code className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
                                  {expression}
                                </code>
                              </div>

                              <div className="flex-shrink-0 mt-1">
                                {isCopied ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 bg-white/5">
            <div className="text-xs text-white/60">
              <span className="text-purple-400">Tip:</span> Click any field to insert its expression
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
