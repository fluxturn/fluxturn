import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Editor } from '@monaco-editor/react';
import { 
  ChevronRight,
  ChevronLeft,
  Plus,
  Variable,
  Edit,
  Trash2,
  Settings,
  Search,
  ChevronDown,
  ChevronUp,
  Database,
  Globe,
  Type,
  Hash,
  ToggleLeft,
  FileText,
  List
} from 'lucide-react';
import type { JsonValue } from '../../types/json';
import type { WorkflowDefinition, WorkflowNode, WorkflowVariable } from '../../types/workflow';

interface VariablePanelProps {
  workflow: WorkflowDefinition;
  selectedNode: WorkflowNode | null;
  onNodeUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const TYPE_ICONS = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  object: FileText,
  array: List,
};

const TYPE_COLORS = {
  string: '#10b981',
  number: '#3b82f6',
  boolean: '#f59e0b',
  object: '#8b5cf6',
  array: '#ef4444',
};

export const VariablePanel: React.FC<VariablePanelProps> = ({
  workflow,
  selectedNode,
  onNodeUpdate,
  isOpen,
  onToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'variables' | 'data' | 'config'>('variables');
  const [isAddVariableOpen, setIsAddVariableOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['global', 'local']);
  const [newVariable, setNewVariable] = useState({
    name: '',
    type: 'string' as WorkflowVariable['type'],
    value: '',
    description: '',
    scope: 'global' as WorkflowVariable['scope'],
  });

  const filteredVariables = useMemo(() => {
    return workflow.variables.filter(variable =>
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workflow.variables, searchTerm]);

  const globalVariables = filteredVariables.filter(v => v.scope === 'global');
  const localVariables = filteredVariables.filter(v => v.scope === 'local');

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const addVariable = () => {
    // This would be handled by the parent workflow builder

    setNewVariable({
      name: '',
      type: 'string',
      value: '',
      description: '',
      scope: 'global',
    });
    setIsAddVariableOpen(false);
  };

  const formatVariableValue = (value: JsonValue, type: WorkflowVariable['type']) => {
    switch (type) {
      case 'object':
      case 'array':
        return JSON.stringify(value, null, 2);
      default:
        return String(value);
    }
  };

  const renderVariableItem = (variable: WorkflowVariable) => {
    const IconComponent = TYPE_ICONS[variable.type];
    const color = TYPE_COLORS[variable.type];

    return (
      <div
        key={variable.id}
        className="group p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: color + '20', color }}
            >
              <IconComponent className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-white font-medium text-sm truncate">{variable.name}</h4>
                <Badge variant="secondary" className="text-xs bg-white/10 text-white/70">
                  {variable.type}
                </Badge>
              </div>
              {variable.description && (
                <p className="text-white/60 text-xs truncate mt-1">{variable.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="w-6 h-6 p-0 text-white/60 hover:text-white">
              <Edit className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="w-6 h-6 p-0 text-white/60 hover:text-white">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2 p-2 bg-black/20 rounded text-xs text-white/70 font-mono max-h-20 overflow-y-auto">
          {formatVariableValue(variable.value, variable.type).slice(0, 100)}
          {formatVariableValue(variable.value, variable.type).length > 100 && '...'}
        </div>
      </div>
    );
  };

  const renderDataViewer = () => {
    if (!selectedNode) {
      return (
        <div className="text-center py-8 text-white/60">
          <Database className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p>Select a node to view its data</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-white font-medium mb-2">Input Data</h3>
          <div className="bg-black/20 rounded-lg p-3">
            <Editor
              height="200px"
              defaultLanguage="json"
              value={JSON.stringify(selectedNode.data, null, 2)}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </div>

        <div>
          <h3 className="text-white font-medium mb-2">Output Data</h3>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-white/60 text-sm">
              Run the workflow to see output data
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNodeConfig = () => {
    if (!selectedNode) {
      return (
        <div className="text-center py-8 text-white/60">
          <Settings className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p>Select a node to configure it</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-white font-medium mb-2">Node: {selectedNode.data.label}</h3>
          <Badge variant="secondary" className="bg-white/10 text-white/70">
            {selectedNode.type}
          </Badge>
        </div>

        <div>
          <label className="text-sm font-medium text-white">Node Label</label>
          <Input
            value={selectedNode.data.label}
            onChange={(e) => onNodeUpdate(selectedNode.id, {
              data: { ...selectedNode.data, label: e.target.value }
            })}
            className="mt-1 bg-white/10 border-white/20 text-white"
          />
        </div>

        {selectedNode.data.config && Object.keys(selectedNode.data.config).length > 0 && (
          <div>
            <h4 className="text-white font-medium mb-2">Configuration</h4>
            <div className="space-y-2">
              {Object.entries(selectedNode.data.config).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm text-white/70">{key}</label>
                  <Input
                    value={typeof value === 'string' ? value : JSON.stringify(value)}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...selectedNode.data.config,
                        [key]: e.target.value
                      };
                      onNodeUpdate(selectedNode.id, {
                        data: { ...selectedNode.data, config: updatedConfig }
                      });
                    }}
                    className="mt-1 bg-white/10 border-white/20 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-white font-medium mb-2">Position</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-white/70">X</label>
              <Input
                type="number"
                value={selectedNode.position.x}
                onChange={(e) => onNodeUpdate(selectedNode.id, {
                  position: { ...selectedNode.position, x: Number(e.target.value) }
                })}
                className="mt-1 bg-white/10 border-white/20 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-white/70">Y</label>
              <Input
                type="number"
                value={selectedNode.position.y}
                onChange={(e) => onNodeUpdate(selectedNode.id, {
                  position: { ...selectedNode.position, y: Number(e.target.value) }
                })}
                className="mt-1 bg-white/10 border-white/20 text-white text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div className="w-12 h-full bg-white/10 backdrop-blur-md border-l border-white/20 flex flex-col items-center py-4">
        <Button
          onClick={onToggle}
          size="sm"
          variant="ghost"
          className="w-8 h-8 p-0 text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-white/60 text-xs writing-mode-vertical transform rotate-90">
          Variables
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full bg-white/10 backdrop-blur-md border-r-0 border-white/20 rounded-none flex flex-col">
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Panel</h2>
          <Button
            onClick={onToggle}
            size="sm"
            variant="ghost"
            className="w-8 h-8 p-0 text-white hover:bg-white/20"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4">
          {[
            { id: 'variables', label: 'Variables', icon: Variable },
            { id: 'data', label: 'Data', icon: Database },
            { id: 'config', label: 'Config', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={selectedTab === id ? "default" : "ghost"}
              onClick={() => setSelectedTab(id as typeof selectedTab)}
              className={`text-xs gap-1 ${
                selectedTab === id 
                  ? "bg-purple-600 text-white" 
                  : "text-white/70 hover:text-white hover:bg-white/20"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </Button>
          ))}
        </div>

        {selectedTab === 'variables' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {selectedTab === 'variables' && (
          <>
            {/* Global Variables */}
            <div className="mb-6">
              <Button
                onClick={() => toggleSection('global')}
                variant="ghost"
                className="w-full justify-between p-2 text-white hover:bg-white/10 mb-2"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Global Variables ({globalVariables.length})</span>
                </div>
                {expandedSections.includes('global') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>

              {expandedSections.includes('global') && (
                <div className="space-y-2 ml-6">
                  {globalVariables.map(renderVariableItem)}
                  {globalVariables.length === 0 && (
                    <div className="text-center py-4 text-white/60 text-sm">
                      No global variables
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Local Variables */}
            <div className="mb-6">
              <Button
                onClick={() => toggleSection('local')}
                variant="ghost"
                className="w-full justify-between p-2 text-white hover:bg-white/10 mb-2"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Local Variables ({localVariables.length})</span>
                </div>
                {expandedSections.includes('local') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>

              {expandedSections.includes('local') && (
                <div className="space-y-2 ml-6">
                  {localVariables.map(renderVariableItem)}
                  {localVariables.length === 0 && (
                    <div className="text-center py-4 text-white/60 text-sm">
                      No local variables
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {selectedTab === 'data' && renderDataViewer()}
        {selectedTab === 'config' && renderNodeConfig()}
      </ScrollArea>

      {selectedTab === 'variables' && (
        <div className="p-4 border-t border-white/20 bg-white/5">
          <Dialog open={isAddVariableOpen} onOpenChange={setIsAddVariableOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4" />
                Add Variable
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900/95 border-white/20 text-white">
              <DialogHeader>
                <DialogTitle>Add Variable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newVariable.name}
                    onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                    className="mt-1 bg-white/10 border-white/20 text-white"
                    placeholder="Variable name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={newVariable.type}
                    onChange={(e) => setNewVariable({ ...newVariable, type: e.target.value as WorkflowVariable['type'] })}
                    className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="object">Object</option>
                    <option value="array">Array</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Value</label>
                  <Textarea
                    value={newVariable.value}
                    onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                    className="mt-1 bg-white/10 border-white/20 text-white"
                    placeholder="Variable value"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Scope</label>
                  <select
                    value={newVariable.scope}
                    onChange={(e) => setNewVariable({ ...newVariable, scope: e.target.value as WorkflowVariable['scope'] })}
                    className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
                  >
                    <option value="global">Global</option>
                    <option value="local">Local</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Input
                    value={newVariable.description}
                    onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                    className="mt-1 bg-white/10 border-white/20 text-white"
                    placeholder="Describe this variable"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={addVariable}
                    disabled={!newVariable.name}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Add Variable
                  </Button>
                  <Button
                    onClick={() => setIsAddVariableOpen(false)}
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Card>
  );
};