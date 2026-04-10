import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Loader2, Edit2, AlertCircle, Bot, Play } from 'lucide-react';
import { useReactFlow, useEdges } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ExpressionPicker } from '@/components/workflow/ExpressionPicker';
import { ImageUploadField } from '@/components/workflow/ImageUploadField';
import { ArrayStringField } from '@/components/workflow/ArrayStringField';
import { NodeType } from '@/config/workflow/nodeTypes';
import type { JsonValue } from '@/types/json';

type NodeMode = 'execute' | 'provider';

/** Shape of a single field definition inside an inputSchema object. */
interface InputSchemaField {
  type?: string;
  inputType?: string;
  label?: string;
  description?: string;
  aiDescription?: string;
  placeholder?: string;
  required?: boolean;
  default?: JsonValue;
  options?: Array<{ label: string; value: string } | string>;
  min?: number;
  max?: number;
  step?: number;
  aiControlled?: boolean;
  loadOptionsFrom?: string;
  loadOptionsResource?: string;
  loadOptionsDependsOn?: string[];
  displayOptions?: { show?: Record<string, unknown[]> };
  displayCondition?: Record<string, unknown>;
  items?: Record<string, { properties?: Record<string, InputSchemaField>; type?: string }>;
  maxItems?: number;
}

/** The node object passed into this panel. */
interface ConfigPanelNode {
  id: string;
  data: {
    label?: string;
    connectorType?: string;
    credentialId?: string;
    inputSchema?: Record<string, InputSchemaField>;
    config?: Record<string, JsonValue>;
    mode?: NodeMode;
    aiControlledFields?: string[];
    [key: string]: unknown;
  };
}

interface DynamicNodeConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  node: ConfigPanelNode;
  onSave: (config: Record<string, unknown>) => void;
}

export function DynamicNodeConfigPanel({
  isOpen,
  onClose,
  node,
  onSave,
}: DynamicNodeConfigPanelProps) {
  const { getNodes } = useReactFlow();
  const edges = useEdges(); // Reactive hook for edge changes
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});
  const [credentials, setCredentials] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCredential, setSelectedCredential] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');

  // Provider mode state
  const [nodeMode, setNodeMode] = useState<NodeMode>('execute');
  const [aiControlledFields, setAiControlledFields] = useState<Set<string>>(new Set());

  const inputSchema = node?.data?.inputSchema || {};
  const nodeLabel = node?.data?.label || 'Configure Node';
  const connectorType = node?.data?.connectorType || '';
  const allNodes = getNodes();

  // Check if this node is connected to an AI Agent's "tools" handle
  const isConnectedToAIToolsHandle = useMemo(() => {
    if (!node?.id) return false;

    const nodes = getNodes();

    // Find if any edge connects this node to an AI Agent's tools handle
    return edges.some((edge) => {
      if (edge.source !== node.id) return false;
      if (edge.targetHandle !== 'tools') return false;

      // Check if target node is an AI Agent
      const targetNode = nodes.find((n) => n.id === edge.target);
      return targetNode?.type === NodeType.AI_AGENT;
    });
  }, [node?.id, edges, getNodes]);

  // Load credentials for the connector type
  useEffect(() => {
    if (!node?.data?.connectorType || !isOpen) return;

    const loadCredentials = async () => {
      try {
        const response = await api.get<Array<{ id: string; name: string; connector_type: string }>>('/connectors');
        const filtered = response.filter((c: { connector_type: string }) => c.connector_type === node.data.connectorType);
        setCredentials(filtered);

        if (node.data.credentialId) {
          setSelectedCredential(node.data.credentialId);
        } else if (filtered.length > 0) {
          setSelectedCredential(filtered[0].id);
        }
      } catch (error) {
        console.error('Failed to load credentials:', error);
        toast.error('Failed to load credentials');
      }
    };

    loadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.data?.connectorType, isOpen]);

  useEffect(() => {
    if (node?.data?.config) {
      setFormData(node.data.config);
    } else {
      const defaults: Record<string, unknown> = {};
      Object.entries(inputSchema).forEach(([key, field]: [string, InputSchemaField]) => {
        if (field.default !== undefined) {
          defaults[key] = field.default;
        }
      });
      setFormData(defaults);
    }

    // Initialize mode from node data
    if (node?.data?.mode) {
      setNodeMode(node.data.mode);
    } else {
      setNodeMode('execute');
    }

    // Initialize AI-controlled fields from node data or schema defaults
    if (node?.data?.aiControlledFields) {
      setAiControlledFields(new Set(node.data.aiControlledFields));
    } else {
      // Default: use aiControlled property from inputSchema
      const defaultAiControlled = new Set<string>();
      Object.entries(inputSchema).forEach(([key, field]: [string, InputSchemaField]) => {
        if (field.aiControlled === true) {
          defaultAiControlled.add(key);
        }
      });
      setAiControlledFields(defaultAiControlled);
    }

    if (selectedCredential) {
      Object.entries(inputSchema).forEach(([key, field]: [string, InputSchemaField]) => {
        if (field.loadOptionsFrom || field.loadOptionsResource) {
          loadDynamicOptions(key, field);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, inputSchema, selectedCredential]);

  // Auto-switch mode based on AI Agent connection
  useEffect(() => {
    if (isConnectedToAIToolsHandle && nodeMode !== 'provider') {
      setNodeMode('provider');
    } else if (!isConnectedToAIToolsHandle && nodeMode === 'provider') {
      // If disconnected from AI Agent, switch back to execute mode
      setNodeMode('execute');
      // Clear AI-controlled fields when disconnected
      setAiControlledFields(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnectedToAIToolsHandle]);

  const loadDynamicOptions = async (fieldKey: string, field: InputSchemaField) => {
    if (!selectedCredential) {
      // console.warn(`Cannot load options for ${fieldKey}: no credential selected`);
      return;
    }

    let endpoint: string;

    // Handle loadOptionsFrom (direct endpoint)
    if (field.loadOptionsFrom) {
      endpoint = field.loadOptionsFrom.replace('{credentialId}', selectedCredential);
    }
    // Handle loadOptionsResource (resource name like 'tables', 'table-columns')
    else if (field.loadOptionsResource) {
      endpoint = `/api/v1/connectors/${selectedCredential}/resources/${field.loadOptionsResource}`;

      // Add query parameters for dependent fields
      if (field.loadOptionsDependsOn && Array.isArray(field.loadOptionsDependsOn)) {
        const params = new URLSearchParams();
        let missingDependency = false;

        field.loadOptionsDependsOn.forEach((depField: string) => {
          if (formData[depField]) {
            params.append(depField, formData[depField]);
          } else {
            // Mark that a required dependency is missing
            missingDependency = true;
          }
        });

        // Don't make API call if required dependent fields are missing
        if (missingDependency) {
          // console.log(`Skipping options load for ${fieldKey}: missing dependent field values`);
          return;
        }

        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }
      }
    } else {
      // console.warn(`Field ${fieldKey} has neither loadOptionsFrom nor loadOptionsResource`);
      return;
    }

    setLoadingOptions(prev => ({ ...prev, [fieldKey]: true }));

    try {
      const options = await api.get<Array<{ label: string; value: string }>>(endpoint);
      setDynamicOptions(prev => ({ ...prev, [fieldKey]: options }));
    } catch (error: unknown) {
      console.error(`Failed to load options for ${fieldKey}:`, error);
      toast.error(`Failed to load ${field.label || fieldKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDynamicOptions(prev => ({ ...prev, [fieldKey]: [] }));
    } finally {
      setLoadingOptions(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: '' }));
    }

    // Reload options for fields that depend on this field
    if (selectedCredential) {
      Object.entries(inputSchema).forEach(([key, field]: [string, InputSchemaField]) => {
        if (field.loadOptionsDependsOn?.includes(fieldKey)) {
          loadDynamicOptions(key, field);
        }
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    Object.entries(inputSchema).forEach(([key, field]: [string, InputSchemaField]) => {
      if (field.required && !formData[key]) {
        newErrors[key] = `${field.label || key} is required`;
      }

      if (field.type === 'number' && formData[key] !== undefined) {
        const num = Number(formData[key]);
        if (isNaN(num)) {
          newErrors[key] = 'Must be a valid number';
        } else {
          if (field.min !== undefined && num < field.min) {
            newErrors[key] = `Must be at least ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            newErrors[key] = `Must be at most ${field.max}`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    // In provider mode, validation is different - only validate context params
    if (nodeMode === 'execute' && !validateForm()) {
      return;
    }

    if (!selectedCredential) {
      toast.error('Please select a credential');
      return;
    }

    // Build context params (non-AI-controlled fields with values)
    const contextParams: Record<string, unknown> = {};
    if (nodeMode === 'provider') {
      Object.entries(formData).forEach(([key, value]) => {
        // Only include non-AI-controlled fields that have values
        if (!aiControlledFields.has(key) && value !== undefined && value !== '') {
          contextParams[key] = value;
        }
      });
    }

    onSave({
      ...node.data,
      credentialId: selectedCredential,
      config: formData,
      mode: nodeMode,
      aiControlledFields: Array.from(aiControlledFields),
      contextParams: nodeMode === 'provider' ? contextParams : undefined,
    });
    onClose();
  };

  // Toggle AI-controlled status for a field
  const toggleAiControlled = (fieldKey: string) => {
    setAiControlledFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
      } else {
        newSet.add(fieldKey);
      }
      return newSet;
    });
  };

  const shouldShowField = (field: InputSchemaField): boolean => {
    // Check displayOptions (new format)
    if (field.displayOptions?.show) {
      for (const [conditionField, expectedValues] of Object.entries(field.displayOptions.show)) {
        const currentValue = formData[conditionField];
        const expectedArray = Array.isArray(expectedValues) ? expectedValues : [expectedValues];

        if (!expectedArray.includes(currentValue)) {
          return false;
        }
      }
    }

    // Check displayCondition (legacy format)
    if (field.displayCondition) {
      for (const [conditionField, expectedValue] of Object.entries(field.displayCondition)) {
        const currentValue = formData[conditionField];
        if (currentValue !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  };

  const renderField = (fieldKey: string, field: InputSchemaField) => {
    // Check if field should be shown based on displayOptions
    if (!shouldShowField(field)) {
      return null;
    }

    const value = formData[fieldKey];
    const error = errors[fieldKey];
    const { type, label, description, placeholder, required, options, min, max, step, inputType } = field;
    const isAiControlled = aiControlledFields.has(fieldKey);

    const uiType = inputType || type;

    return (
      <div key={fieldKey} className="space-y-2 py-3">
        {/* Field Label with AI-controlled toggle in provider mode */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-normal text-gray-300">
            {label || fieldKey}
            {required && nodeMode === 'execute' && <span className="text-red-400 ml-1">*</span>}
          </Label>
          {nodeMode === 'provider' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`ai-${fieldKey}`}
                checked={isAiControlled}
                onCheckedChange={() => toggleAiControlled(fieldKey)}
                className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <Label
                htmlFor={`ai-${fieldKey}`}
                className={cn(
                  "text-xs cursor-pointer",
                  isAiControlled ? "text-cyan-400" : "text-gray-500"
                )}
              >
                AI fills this
              </Label>
            </div>
          )}
        </div>

        {/* Show field description in provider mode when AI-controlled */}
        {nodeMode === 'provider' && isAiControlled && (
          <div className="p-2 bg-cyan-900/20 border border-cyan-700/30 rounded text-xs text-cyan-300">
            <Bot className="w-3 h-3 inline mr-1" />
            AI will generate this value. {field.aiDescription || description || ''}
          </div>
        )}

        {/* Only show field input if not AI-controlled in provider mode */}
        {(nodeMode === 'execute' || !isAiControlled) && (
          <>

        {/* Field Input */}
        {uiType === 'textarea' ? (
          <div className="space-y-2">
            <Textarea
              value={value || ''}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              placeholder={placeholder}
              className={cn(
                'min-h-[100px] bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500',
                error && 'border-red-500'
              )}
            />
            <ExpressionPicker
              nodes={allNodes}
              currentNodeId={node.id}
              onSelect={(expression) => {
                handleFieldChange(fieldKey, (value || '') + expression);
              }}
              variant="button"
              size="sm"
            />
          </div>
        ) : type === 'number' ? (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value ? Number(e.target.value) : undefined)}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className={cn('bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500', error && 'border-red-500')}
          />
        ) : type === 'boolean' ? (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleFieldChange(fieldKey, checked)}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        ) : type === 'select' ? (
          <Select value={value || ''} onValueChange={(val) => handleFieldChange(fieldKey, val)}>
            <SelectTrigger
              className={cn(
                'bg-[#2a2a2a] border-gray-700 text-white',
                error && 'border-red-500'
              )}
              disabled={loadingOptions[fieldKey]}
            >
              <SelectValue placeholder={
                loadingOptions[fieldKey] ? 'Loading...' : placeholder || `Select ${label}`
              } />
            </SelectTrigger>
            <SelectContent className="bg-[#2a2a2a] border-gray-700">
              {loadingOptions[fieldKey] ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : (
                (dynamicOptions[fieldKey] || options || []).map((option: { label: string; value: string } | string) => {
                  const optionValue = typeof option === 'object' ? option.value : option;
                  const optionLabel = typeof option === 'object' ? option.label : option;
                  return (
                    <SelectItem
                      key={optionValue}
                      value={String(optionValue)}
                      className="text-white hover:bg-gray-700"
                    >
                      {optionLabel}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        ) : type === 'password' ? (
          <Input
            type="password"
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            placeholder={placeholder}
            className={cn('bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500', error && 'border-red-500')}
          />
        ) : type === 'object' ? (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(fieldKey, parsed);
              } catch {
                handleFieldChange(fieldKey, e.target.value);
              }
            }}
            placeholder={placeholder || '{\n  \n}'}
            className={cn('font-mono text-sm min-h-[120px] bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500', error && 'border-red-500')}
          />
        ) : type === 'fixedCollection' ? (
          // Column mappings UI for database connectors
          <div className="space-y-3">
            {(() => {
              const collectionData = value || {};
              const mappings = collectionData.mappings || [];
              const itemsConfig = field.items?.mappings?.properties || {};

              return (
                <>
                  {mappings.map((mapping: Record<string, string>, index: number) => (
                    <div key={index} className="p-3 bg-[#252525] border border-gray-700 rounded space-y-3">
                      {Object.entries(itemsConfig).map(([propKey, propField]: [string, InputSchemaField]) => (
                        <div key={propKey} className="space-y-1.5">
                          <Label className="text-xs text-gray-400">{propField.label || propKey}</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={mapping[propKey] || ''}
                              onChange={(e) => {
                                const newMappings = [...mappings];
                                newMappings[index] = { ...mapping, [propKey]: e.target.value };
                                handleFieldChange(fieldKey, { mappings: newMappings });
                              }}
                              placeholder={propField.placeholder || `Enter ${propField.label || propKey}`}
                              className="flex-1 bg-[#2a2a2a] border-gray-600 text-white text-sm placeholder:text-gray-500"
                            />
                            <ExpressionPicker
                              nodes={allNodes}
                              currentNodeId={node.id}
                              onSelect={(expression) => {
                                const newMappings = [...mappings];
                                newMappings[index] = { ...mapping, [propKey]: (mapping[propKey] || '') + expression };
                                handleFieldChange(fieldKey, { mappings: newMappings });
                              }}
                              variant="icon"
                              size="sm"
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newMappings = mappings.filter((_: Record<string, string>, i: number) => i !== index);
                          handleFieldChange(fieldKey, { mappings: newMappings });
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs h-7"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newMapping: Record<string, string> = {};
                      Object.keys(itemsConfig).forEach(key => { newMapping[key] = ''; });
                      handleFieldChange(fieldKey, { mappings: [...mappings, newMapping] });
                    }}
                    className="w-full bg-[#2a2a2a] border-gray-700 text-white hover:bg-gray-700 text-sm h-9"
                  >
                    + {field.placeholder || 'Add Mapping'}
                  </Button>
                </>
              );
            })()}
          </div>
        ) : type === 'array' && field.items?.properties?.fileData ? (
          // Special handling for file upload arrays (like mediaFiles)
          <ImageUploadField
            value={value || []}
            onChange={(files) => handleFieldChange(fieldKey, files)}
            maxFiles={field.maxItems || 4}
            maxSizeInMB={5}
            accept={field.items.properties.fileData?.accept || 'image/*'}
            label=""
            error={error}
            required={required}
          />
        ) : type === 'array' && field.items?.type === 'string' ? (
          // Simple string arrays (like mediaUrls)
          <ArrayStringField
            value={value || []}
            onChange={(urls) => handleFieldChange(fieldKey, urls)}
            placeholder={placeholder || `Enter ${label?.toLowerCase() || 'value'}`}
            error={error}
            maxItems={field.maxItems}
            nodes={allNodes}
            currentNodeId={node.id}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type={uiType || 'text'}
              value={
                uiType === 'datetime-local' && value
                  ? value.substring(0, 16) // Remove seconds for datetime-local input
                  : value || ''
              }
              onChange={(e) => {
                // For datetime-local, append seconds if not present
                const newValue =
                  uiType === 'datetime-local' && e.target.value && !e.target.value.includes(':00:00')
                    ? e.target.value + ':00'
                    : e.target.value;
                handleFieldChange(fieldKey, newValue);
              }}
              placeholder={placeholder}
              className={cn('flex-1 bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500', error && 'border-red-500')}
            />
            <ExpressionPicker
              nodes={allNodes}
              currentNodeId={node.id}
              onSelect={(expression) => {
                handleFieldChange(fieldKey, (value || '') + expression);
              }}
              variant="icon"
              size="sm"
            />
          </div>
        )}
        </>
        )}

        {/* Field Error - only show in execute mode */}
        {nodeMode === 'execute' && error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}

        {/* Description text for context fields in provider mode */}
        {nodeMode === 'provider' && !isAiControlled && description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}

        {/* No options found message */}
        {field.loadOptionsFrom && dynamicOptions[fieldKey]?.length === 0 && !loadingOptions[fieldKey] && (
          <p className="text-xs text-gray-500">
            No {label.toLowerCase()} found. Make sure your credential has access.
          </p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-[#1a1a1a] border-l border-gray-800 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {connectorType?.charAt(0).toUpperCase() || 'N'}
            </span>
          </div>
          <h2 className="text-base font-medium text-white">{nodeLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-white h-8 px-3 text-sm",
              nodeMode === 'provider'
                ? "bg-cyan-500 hover:bg-cyan-600"
                : "bg-green-500 hover:bg-green-600"
            )}
            onClick={handleSave}
          >
            {nodeMode === 'provider' ? 'Save as Tool' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('parameters')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'parameters'
              ? 'text-red-400 border-red-400'
              : 'text-gray-400 border-transparent hover:text-white'
          )}
        >
          Parameters
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'settings'
              ? 'text-red-400 border-red-400'
              : 'text-gray-400 border-transparent hover:text-white'
          )}
        >
          Settings
        </button>
        <button className="ml-auto px-4 py-2 text-sm font-medium text-gray-400 hover:text-white flex items-center gap-1">
          Docs
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'parameters' ? (
          <div className="p-4 space-y-1">
            {/* Info Banner */}
            {connectorType === 'notion' && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded">
                <p className="text-xs text-yellow-200">
                  In Notion, make sure to <span className="text-red-400 font-medium">add your connection</span> to the pages you want to access.
                </p>
              </div>
            )}

            {/* Credential Selector */}
            {connectorType && (
              <div className="space-y-2 py-3 border-b border-gray-800">
                <Label className="text-sm font-normal text-gray-300">
                  Credential to connect with
                </Label>
                <div className="flex items-center gap-2">
                  <Select value={selectedCredential} onValueChange={setSelectedCredential}>
                    <SelectTrigger className="flex-1 bg-[#2a2a2a] border-gray-700 text-white">
                      <SelectValue placeholder="Select a credential" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-gray-700">
                      {credentials.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-gray-400">
                          No credentials found for {connectorType}.
                          <br />
                          Please create one first.
                        </div>
                      ) : (
                        credentials.map((cred) => (
                          <SelectItem
                            key={cred.id}
                            value={cred.id}
                            className="text-white hover:bg-gray-700"
                          >
                            {cred.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-gray-400 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Mode Selector - Only show when connected to AI Agent's tools handle */}
            {connectorType && selectedCredential && isConnectedToAIToolsHandle && (
              <div className="space-y-2 py-3 border-b border-gray-800">
                <Label className="text-sm font-normal text-gray-300">
                  Mode
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNodeMode('execute')}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      nodeMode === 'execute'
                        ? "bg-green-900/30 border-green-500 text-green-400"
                        : "bg-[#2a2a2a] border-gray-700 text-gray-400 hover:border-gray-600"
                    )}
                  >
                    <Play className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Execute</div>
                      <div className="text-xs opacity-70">Run this action</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setNodeMode('provider')}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      nodeMode === 'provider'
                        ? "bg-cyan-900/30 border-cyan-500 text-cyan-400"
                        : "bg-[#2a2a2a] border-gray-700 text-gray-400 hover:border-gray-600"
                    )}
                  >
                    <Bot className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">AI Tool</div>
                      <div className="text-xs opacity-70">Let AI use this</div>
                    </div>
                  </button>
                </div>
                {nodeMode === 'provider' && (
                  <div className="mt-2 p-2 bg-cyan-900/20 border border-cyan-700/30 rounded text-xs text-cyan-300">
                    <Bot className="w-3 h-3 inline mr-1" />
                    This action will be available as a tool for AI Agent. Toggle "AI fills this" for fields the AI should generate.
                  </div>
                )}
              </div>
            )}

            {/* Fields */}
            {!selectedCredential && credentials.length > 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                Please select a credential to continue
              </div>
            ) : Object.keys(inputSchema).length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                No configuration required for this node
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {Object.entries(inputSchema).map(([key, field]) => renderField(key, field))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="py-8 text-center text-gray-400 text-sm">
              Settings panel - Coming soon
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
