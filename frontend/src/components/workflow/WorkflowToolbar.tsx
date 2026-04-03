import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Save, 
  Play, 
  Pause, 
  Square,
  RotateCcw, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Upload,
  Settings,
  History,
  Bug,
  Sidebar,
  Variable,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from 'lucide-react';
import type { WorkflowDefinition, WorkflowExecution } from '../../types/workflow';
import { useRoles } from '../../hooks/useRoles';

interface WorkflowToolbarProps {
  workflow: WorkflowDefinition;
  isExecuting: boolean;
  onSave: () => void;
  onExecute: () => void;
  onTogglePalette: () => void;
  onToggleVariables: () => void;
  executionHistory: WorkflowExecution[];
  onSaveAsTemplate?: () => void;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  workflow,
  isExecuting,
  onSave,
  onExecute,
  onTogglePalette,
  onToggleVariables,
  executionHistory,
  onSaveAsTemplate,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { isAdmin } = useRoles();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const exportWorkflow = () => {
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `workflow-${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedWorkflow = JSON.parse(e.target?.result as string);
            // This would be handled by the parent component
            // console.log('Import workflow:', importedWorkflow);
          } catch (error) {
            console.error('Failed to import workflow:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <Card className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left Section - Main Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onSave}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>

          {isAdmin() && onSaveAsTemplate && (
            <Button
              onClick={onSaveAsTemplate}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 gap-2"
            >
              <FileText className="w-4 h-4" />
              Save as Template
            </Button>
          )}

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          <Button
            onClick={onExecute}
            disabled={isExecuting || workflow.nodes.length === 0}
            size="sm"
            className={`gap-2 ${isExecuting 
              ? 'bg-orange-600 hover:bg-orange-700' 
              : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </Button>

          {isExecuting && (
            <Button
              onClick={() => {/* Handle stop execution */}}
              size="sm"
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>
          )}

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          {/* Debug Mode Toggle */}
          <Button
            onClick={() => setDebugMode(!debugMode)}
            size="sm"
            variant={debugMode ? "default" : "ghost"}
            className={`gap-2 ${debugMode 
              ? 'bg-yellow-600 text-white' 
              : 'text-white hover:bg-white/20'
            }`}
          >
            <Bug className="w-4 h-4" />
            {debugMode ? 'Debug On' : 'Debug'}
          </Button>
        </div>

        {/* Center Section - Workflow Info */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-white font-medium text-sm">{workflow.name}</div>
            <div className="text-white/60 text-xs">
              {workflow.nodes.length} nodes, {workflow.edges.length} connections
            </div>
          </div>

          {/* Execution Status */}
          {executionHistory.length > 0 && (
            <div className="flex items-center gap-2">
              {getExecutionStatusIcon(executionHistory[0]?.status)}
              <span className="text-white/70 text-xs">
                Last run: {executionHistory[0]?.duration 
                  ? formatDuration(executionHistory[0].duration)
                  : 'Unknown'
                }
              </span>
            </div>
          )}
        </div>

        {/* Right Section - View Controls & Tools */}
        <div className="flex items-center gap-2">
          {/* History */}
          <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 gap-2 relative"
              >
                <History className="w-4 h-4" />
                History
                {executionHistory.length > 0 && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-blue-600">
                    {executionHistory.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900/95 border-white/20 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>Execution History</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {executionHistory.map((execution) => (
                    <div
                      key={execution.id}
                      className="p-4 bg-white/10 rounded-lg border border-white/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getExecutionStatusIcon(execution.status)}
                          <span className="font-medium capitalize">{execution.status}</span>
                        </div>
                        <span className="text-sm text-white/70">
                          {new Date(execution.startedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-white/50">Duration: </span>
                          <span>{execution.duration ? formatDuration(execution.duration) : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-white/50">Nodes: </span>
                          <span>{execution.nodeExecutions.length}</span>
                        </div>
                      </div>

                      {execution.error && (
                        <div className="mt-2 p-2 bg-red-500/20 rounded text-red-300 text-sm">
                          {execution.error}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {executionHistory.length === 0 && (
                    <div className="text-center py-8 text-white/60">
                      No execution history yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          {/* Import/Export */}
          <Button
            onClick={exportWorkflow}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button
            onClick={importWorkflow}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          {/* Panel Toggles */}
          <Button
            onClick={onTogglePalette}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
          >
            <Sidebar className="w-4 h-4" />
            Nodes
          </Button>

          <Button
            onClick={onToggleVariables}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
          >
            <Variable className="w-4 h-4" />
            Variables
          </Button>

          {/* Settings */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900/95 border-white/20 text-white">
              <DialogHeader>
                <DialogTitle>Workflow Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Timeout (seconds)</label>
                  <input
                    type="number"
                    defaultValue={workflow.settings.timeout / 1000}
                    className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Error Handling</label>
                  <select
                    defaultValue={workflow.settings.errorHandling}
                    className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
                  >
                    <option value="stop">Stop on error</option>
                    <option value="continue">Continue on error</option>
                    <option value="retry">Retry on error</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Log Level</label>
                  <select
                    defaultValue={workflow.settings.logging.level}
                    className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
};