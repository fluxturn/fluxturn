import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Editor } from '@monaco-editor/react';
import {
  GitBranch,
  RotateCcw,
  Shuffle,
  Zap,
  Clock,
  Filter,
  Code,
  Plus,
  Minus,
  AlertCircle,
  Info,
  PlayCircle,
  FileText
} from 'lucide-react';
import { FieldPicker } from './FieldPicker';
import { useParams } from 'react-router-dom';
import type { JsonValue } from '../../types/json';

interface SwitchCase {
  value: string;
  label: string;
}

interface ControlFlowConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  controlType: 'if' | 'loop' | 'switch' | 'parallel' | 'delay' | 'filter' | 'transform';
  currentConfig: Record<string, JsonValue>;
  onConfigUpdate: (config: Record<string, JsonValue>) => void;
}

const CONTROL_ICONS = {
  if: GitBranch,
  loop: RotateCcw,
  switch: Shuffle,
  parallel: Zap,
  delay: Clock,
  filter: Filter,
  transform: Code,
};

export const ControlFlowConfigModal: React.FC<ControlFlowConfigModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  controlType,
  currentConfig,
  onConfigUpdate,
}) => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [config, setConfig] = useState<Record<string, JsonValue>>(currentConfig);
  const [activeTab, setActiveTab] = useState('config');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  const handleConfigChange = (key: string, value: JsonValue) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleSave = () => {
    // Validate based on control type
    const errors: Record<string, string> = {};
    
    if (controlType === 'if' && !config.condition) {
      errors.condition = 'Condition is required for IF nodes';
    }
    
    if (controlType === 'loop' && !config.iterable) {
      errors.iterable = 'Iterable expression is required for LOOP nodes';
    }
    
    if (controlType === 'delay' && (!config.duration || config.duration <= 0)) {
      errors.duration = 'Duration must be greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    onConfigUpdate(config);
    onClose();
  };

  const addSwitchCase = () => {
    const cases = config.cases || [];
    setConfig(prev => ({
      ...prev,
      cases: [...cases, { value: '', label: `Case ${cases.length + 1}` }]
    }));
  };

  const removeSwitchCase = (index: number) => {
    const cases = config.cases || [];
    setConfig(prev => ({
      ...prev,
      cases: (cases as SwitchCase[]).filter((_: SwitchCase, i: number) => i !== index)
    }));
  };

  const updateSwitchCase = (index: number, updates: Partial<SwitchCase>) => {
    const cases = config.cases || [];
    setConfig(prev => ({
      ...prev,
      cases: (cases as SwitchCase[]).map((c: SwitchCase, i: number) => i === index ? { ...c, ...updates } : c)
    }));
  };

  const renderConfigFields = () => {
    switch (controlType) {
      case 'if':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Condition *
              </label>
              <div className="mt-2 space-y-2">
                <FieldPicker
                  nodeId={nodeId}
                  workflowId={workflowId}
                  value={config.condition || ''}
                  onChange={(value) => handleConfigChange('condition', value)}
                  placeholder="e.g., {{$node['Run Code'].json.status}} === 'active'"
                  mode="action"
                />
                <p className="text-xs text-white/60">
                  JavaScript expression that evaluates to true/false. Click the database icon to select fields from previous nodes.
                </p>
                {validationErrors.condition && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.condition}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Condition Type</label>
              <select
                value={config.conditionType || 'expression'}
                onChange={(e) => handleConfigChange('conditionType', e.target.value)}
                className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
              >
                <option value="expression">JavaScript Expression</option>
                <option value="exists">Field Exists</option>
                <option value="empty">Field is Empty</option>
                <option value="equals">Field Equals Value</option>
              </select>
            </div>
          </div>
        );

      case 'loop':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Iterable Expression *
              </label>
              <div className="mt-2 space-y-2">
                <FieldPicker
                  nodeId={nodeId}
                  workflowId={workflowId}
                  value={config.iterable || ''}
                  onChange={(value) => handleConfigChange('iterable', value)}
                  placeholder="e.g., {{$node['Run Code'].json.items}}"
                  mode="action"
                />
                <p className="text-xs text-white/60">
                  Expression that returns an array to iterate over. Click the database icon to select fields.
                </p>
                {validationErrors.iterable && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.iterable}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Item Variable Name</label>
              <Input
                value={config.itemVariable || 'item'}
                onChange={(e) => handleConfigChange('itemVariable', e.target.value)}
                placeholder="item"
                className="bg-white/10 border-white/20 text-white"
              />
              <p className="text-xs text-white/60 mt-1">
                Variable name for the current item in the loop.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Index Variable Name</label>
              <Input
                value={config.indexVariable || 'index'}
                onChange={(e) => handleConfigChange('indexVariable', e.target.value)}
                placeholder="index"
                className="bg-white/10 border-white/20 text-white"
              />
              <p className="text-xs text-white/60 mt-1">
                Variable name for the current index in the loop.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.parallel || false}
                onChange={(e) => handleConfigChange('parallel', e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              <label className="text-sm text-white">Run iterations in parallel</label>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Max Iterations</label>
              <Input
                type="number"
                value={config.maxIterations || ''}
                onChange={(e) => handleConfigChange('maxIterations', Number(e.target.value))}
                placeholder="Leave empty for no limit"
                className="bg-white/10 border-white/20 text-white"
                min={1}
              />
            </div>
          </div>
        );

      case 'switch': {
        const cases = config.cases || [];
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Switch Expression *
              </label>
              <FieldPicker
                nodeId={nodeId}
                workflowId={workflowId}
                value={config.expression || ''}
                onChange={(value) => handleConfigChange('expression', value)}
                placeholder="e.g., {{$node['Run Code'].json.type}}"
                mode="action"
              />
              <p className="text-xs text-white/60 mt-1">
                Expression to evaluate for matching cases. Click the database icon to select fields.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-white">Cases</label>
                <Button
                  onClick={addSwitchCase}
                  size="sm"
                  className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-3 h-3" />
                  Add Case
                </Button>
              </div>
              
              <div className="space-y-2">
                {(cases as SwitchCase[]).map((switchCase: SwitchCase, index: number) => (
                  <Card key={index} className="bg-white/10 border-white/20 p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={switchCase.value || ''}
                        onChange={(e) => updateSwitchCase(index, { value: e.target.value })}
                        placeholder="Case value"
                        className="flex-1 bg-white/10 border-white/20 text-white"
                      />
                      <Input
                        value={switchCase.label || ''}
                        onChange={(e) => updateSwitchCase(index, { label: e.target.value })}
                        placeholder="Case label"
                        className="flex-1 bg-white/10 border-white/20 text-white"
                      />
                      <Button
                        onClick={() => removeSwitchCase(index)}
                        size="sm"
                        variant="ghost"
                        className="text-white/60 hover:text-red-400 hover:bg-red-400/20"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
                
                {cases.length === 0 && (
                  <div className="text-center py-4 text-white/60 text-sm">
                    No cases defined. Click "Add Case" to create one.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeDefault || true}
                onChange={(e) => handleConfigChange('includeDefault', e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              <label className="text-sm text-white">Include default case</label>
            </div>
          </div>
        );
      }

      case 'parallel':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Number of Branches
              </label>
              <Input
                type="number"
                value={config.branches || 2}
                onChange={(e) => handleConfigChange('branches', Number(e.target.value))}
                min={2}
                max={10}
                className="bg-white/10 border-white/20 text-white"
              />
              <p className="text-xs text-white/60 mt-1">
                Number of parallel execution branches (2-10).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Wait Strategy</label>
              <select
                value={config.waitStrategy || 'all'}
                onChange={(e) => handleConfigChange('waitStrategy', e.target.value)}
                className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
              >
                <option value="all">Wait for all branches</option>
                <option value="first">Wait for first completion</option>
                <option value="majority">Wait for majority</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Timeout (seconds)</label>
              <Input
                type="number"
                value={config.timeout || ''}
                onChange={(e) => handleConfigChange('timeout', Number(e.target.value))}
                placeholder="Leave empty for no timeout"
                className="bg-white/10 border-white/20 text-white"
                min={1}
              />
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Delay Duration *
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={config.duration || ''}
                  onChange={(e) => handleConfigChange('duration', Number(e.target.value))}
                  placeholder="5"
                  className="bg-white/10 border-white/20 text-white"
                  min={0.1}
                />
                <select
                  value={config.unit || 'seconds'}
                  onChange={(e) => handleConfigChange('unit', e.target.value)}
                  className="p-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="milliseconds">Milliseconds</option>
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              {validationErrors.duration && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.duration}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.dynamic || false}
                onChange={(e) => handleConfigChange('dynamic', e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              <label className="text-sm text-white">Dynamic delay based on input data</label>
            </div>

            {config.dynamic && (
              <div>
                <label className="text-sm font-medium text-white">Delay Expression</label>
                <Input
                  value={config.delayExpression || ''}
                  onChange={(e) => handleConfigChange('delayExpression', e.target.value)}
                  placeholder="e.g., data.delay * 1000"
                  className="bg-white/10 border-white/20 text-white font-mono"
                />
                <p className="text-xs text-white/60 mt-1">
                  JavaScript expression returning delay in milliseconds.
                </p>
              </div>
            )}
          </div>
        );

      case 'filter':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter Condition *
              </label>
              <FieldPicker
                nodeId={nodeId}
                workflowId={workflowId}
                value={config.condition || ''}
                onChange={(value) => handleConfigChange('condition', value)}
                placeholder="e.g., {{$node['Run Code'].json.active}} === true"
                mode="action"
              />
              <p className="text-xs text-white/60 mt-1">
                JavaScript expression that returns true to keep the item. Click the database icon to select fields.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Filter Mode</label>
              <select
                value={config.mode || 'keep'}
                onChange={(e) => handleConfigChange('mode', e.target.value)}
                className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
              >
                <option value="keep">Keep matching items</option>
                <option value="remove">Remove matching items</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.preserveStructure || false}
                onChange={(e) => handleConfigChange('preserveStructure', e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              <label className="text-sm text-white">Preserve original data structure</label>
            </div>
          </div>
        );

      case 'transform':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Code className="w-4 h-4" />
                Transform Script *
              </label>
              <div className="mt-2 bg-black/20 rounded border border-white/20 overflow-hidden">
                <Editor
                  height="200px"
                  defaultLanguage="javascript"
                  value={config.script || '// Transform the input data\nreturn data;'}
                  onChange={(value) => handleConfigChange('script', value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                  }}
                />
              </div>
              <p className="text-xs text-white/60 mt-1">
                JavaScript function body. Use 'data' for input. Return transformed data.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white">Output Type</label>
              <select
                value={config.outputType || 'auto'}
                onChange={(e) => handleConfigChange('outputType', e.target.value)}
                className="w-full mt-1 p-2 bg-white/10 border border-white/20 rounded text-white"
              >
                <option value="auto">Auto-detect</option>
                <option value="object">Object</option>
                <option value="array">Array</option>
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.allowAsync || false}
                onChange={(e) => handleConfigChange('allowAsync', e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              <label className="text-sm text-white">Allow async/await in script</label>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-white/60">
            <Info className="w-8 h-8 mx-auto mb-2" />
            <p>No configuration available for this control type.</p>
          </div>
        );
    }
  };

  const IconComponent = CONTROL_ICONS[controlType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900/95 border-white/20 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="w-5 h-5" />
            Configure {controlType.toUpperCase()} Control
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="config" className="text-white">Configuration</TabsTrigger>
            <TabsTrigger value="test" className="text-white">Test</TabsTrigger>
            <TabsTrigger value="help" className="text-white">Help</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <ScrollArea className="max-h-96">
              <div className="pr-4">
                {renderConfigFields()}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <Card className="bg-white/10 border-white/20 p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-blue-400" />
                  <h3 className="font-medium">Test Configuration</h3>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-white">Test Input Data</label>
                  <Textarea
                    placeholder='{"example": "data", "items": [1, 2, 3]}'
                    className="bg-white/10 border-white/20 text-white font-mono text-sm mt-1"
                    rows={4}
                  />
                </div>
                
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Test Control Flow
                </Button>
                
                <div className="mt-4 p-3 bg-black/20 rounded text-xs text-white/70 font-mono">
                  Test results will appear here...
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="mt-4">
            <Card className="bg-white/10 border-white/20 p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-400" />
                  <h3 className="font-medium">{controlType.toUpperCase()} Control Help</h3>
                </div>
                
                <div className="text-sm text-white/70 space-y-2">
                  {controlType === 'if' && (
                    <>
                      <p>The IF control node branches execution based on a condition.</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Use JavaScript expressions for conditions</li>
                        <li>Reference input data with 'data' variable</li>
                        <li>True path goes to the first output, false to the second</li>
                        <li>Example: data.user.age &gt;= 18</li>
                      </ul>
                    </>
                  )}
                  
                  {controlType === 'loop' && (
                    <>
                      <p>The LOOP control node iterates over collections.</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Specify an array to iterate over</li>
                        <li>Each iteration has access to current item and index</li>
                        <li>Can run iterations in parallel for performance</li>
                        <li>Example: data.users</li>
                      </ul>
                    </>
                  )}
                  
                  {controlType === 'switch' && (
                    <>
                      <p>The SWITCH control node routes based on expression value.</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Define multiple cases with specific values</li>
                        <li>Includes optional default case</li>
                        <li>First matching case is executed</li>
                        <li>Example expression: data.type</li>
                      </ul>
                    </>
                  )}
                  
                  {/* Add help for other control types as needed */}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t border-white/20">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-white hover:bg-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={Object.keys(validationErrors).length > 0}
          >
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};