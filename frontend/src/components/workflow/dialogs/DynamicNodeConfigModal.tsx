import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { NODE_DEFINITIONS, type NodeType, type NodeConfigField } from "@/config/workflow";
import { useReactFlow, useEdges } from "@xyflow/react";
import { ConditionsBuilder } from "@/components/workflow/ConditionsBuilder";
import { RulesBuilder } from "@/components/workflow/RulesBuilder";
import { FormFieldsBuilder } from "@/components/workflow/FormFieldsBuilder";
import { ScheduleBuilder } from "@/components/workflow/ScheduleBuilder";
import { AddCredentialModalV2 } from "@/components/credentials/AddCredentialModalV2";
import { Plus, TestTube, Loader2, ChevronDown, ChevronUp, Play, Copy, CheckCircle2, Webhook, AlertCircle, Bot } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { FieldPicker } from "@/components/workflow/FieldPicker";
import { ExpressionPicker } from "@/components/workflow/ExpressionPicker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "@/components/workflow/ImageUploadField";
import { ArrayStringField } from "@/components/workflow/ArrayStringField";
import type { JsonValue } from '@/types/json';

type NodeMode = 'execute' | 'provider';

/** Credential item returned by the credentials API. */
interface CredentialItem {
  id: string;
  name: string;
  connector_type?: string;
  connectorType?: string;
  metadata?: Record<string, unknown>;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Available connector metadata from the connectors API. */
interface ConnectorItem {
  name: string;
  display_name?: string;
  auth_type?: string;
  [key: string]: unknown;
}

/** Trigger definition returned by the triggers API. */
interface TriggerItem {
  id: string;
  name: string;
  description?: string;
  eventType?: string;
  icon?: string;
  webhookRequired?: boolean;
  inputSchema?: Record<string, unknown>;
  [key: string]: unknown;
}

/** A single field definition inside an inputSchema. */
interface SchemaFieldDef {
  type?: string;
  inputType?: string;
  label?: string;
  description?: string;
  aiDescription?: string;
  placeholder?: string;
  required?: boolean;
  default?: JsonValue;
  options?: Array<{ label: string; value: string } | string>;
  enum?: Array<string | { label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  order?: number;
  aiControlled?: boolean;
  loadOptionsFrom?: string;
  loadOptionsResource?: string;
  loadColumnsResource?: string;
  loadOptionsDependsOn?: string[];
  loadColumnsDependsOn?: string[];
  dynamicOptions?: boolean;
  displayOptions?: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> };
  displayCondition?: Record<string, unknown>;
  items?: Record<string, { properties?: Record<string, SchemaFieldDef>; type?: string; [key: string]: unknown }>;
  itemSchema?: Record<string, SchemaFieldDef>;
  properties?: Record<string, SchemaFieldDef>;
  maxItems?: number;
  accept?: string;
  [key: string]: unknown;
}

/** Webhook info returned by the webhook URL API. */
interface WebhookInfo {
  webhookUrl: string;
  triggerType?: string;
  connectorType?: string;
  verifyToken?: string;
}

/** Execution result from the node execution API. */
interface NodeExecutionResult {
  success?: boolean;
  status?: string;
  result?: {
    output?: unknown;
    data?: { success?: boolean; error?: { message?: string }; [key: string]: unknown };
    error?: { message?: string };
    [key: string]: unknown;
  };
  data?: { success?: boolean; error?: { message?: string }; [key: string]: unknown };
  error?: { message?: string };
  [key: string]: unknown;
}

/** Select option (value + label). */
interface SelectOption {
  label: string;
  value: string;
}

interface DynamicNodeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string | null;
  nodeType: NodeType | null;
}

export function DynamicNodeConfigModal({
  open,
  onOpenChange,
  nodeId,
  nodeType,
}: DynamicNodeConfigModalProps) {
  const { getNode, setNodes, getNodes } = useReactFlow();
  const { id: workflowId } = useParams();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [triggers, setTriggers] = useState<TriggerItem[]>([]);
  const [showAddCredentialModal, setShowAddCredentialModal] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [loadingTriggers, setLoadingTriggers] = useState(false);
  const [testingCredential, setTestingCredential] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [expandedCollections, setExpandedCollections] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<NodeExecutionResult | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [verifyToken, setVerifyToken] = useState<string>('');
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [loadingDynamicOptions, setLoadingDynamicOptions] = useState<Record<string, boolean>>({});

  // Provider mode state (for using connector actions as AI tools)
  const [nodeMode, setNodeMode] = useState<NodeMode>('execute');
  const [aiControlledFields, setAiControlledFields] = useState<Set<string>>(new Set());

  // Track if connector is locked (for connector-specific trigger nodes)
  const [isConnectorLocked, setIsConnectorLocked] = useState(false);

  // Reactive edges for detecting AI Agent connections
  const edges = useEdges();

  // Check if this node is connected to an AI Agent's "tools" handle
  const isConnectedToAIToolsHandle = useMemo(() => {
    if (!nodeId) return false;

    const nodes = getNodes();

    // Find if any edge connects this node to an AI Agent's tools handle
    return edges.some((edge) => {
      if (edge.source !== nodeId) return false;
      if (edge.targetHandle !== 'tools') return false;

      // Check if target node is an AI Agent
      const targetNode = nodes.find((n) => n.id === edge.target);
      return targetNode?.type === 'AI_AGENT';
    });
  }, [nodeId, edges, getNodes]);

  // Auto-switch mode based on AI Agent connection
  useEffect(() => {
    if (isConnectedToAIToolsHandle && nodeMode !== 'provider') {
      setNodeMode('provider');
    } else if (!isConnectedToAIToolsHandle && nodeMode === 'provider') {
      setNodeMode('execute');
      // Clear AI-controlled fields when disconnected from AI Agent
      setAiControlledFields(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnectedToAIToolsHandle]);

  const nodeDefinition = nodeType ? NODE_DEFINITIONS[nodeType] : null;
  const configFields = nodeDefinition?.configFields || [];

  // Check if this is a connector action or trigger
  const isConnectorAction = nodeType === 'CONNECTOR_ACTION';
  const isConnectorTrigger = nodeType === 'CONNECTOR_TRIGGER';
  const isWebhookTrigger = nodeType === 'WEBHOOK_TRIGGER';

  // Check if this node requires credentials (has connectorTypeForCredentials property)
  const requiresCredentials = !!nodeDefinition?.connectorTypeForCredentials;
  const credentialConnectorType = nodeDefinition?.connectorTypeForCredentials;

  const connectorType = formData.connectorType || formData.connector;
  const actionId = formData.actionId;
  const triggerId = formData.triggerId;
  const inputSchema = formData.inputSchema;

  // Debug logging removed for production


  // Fetch dynamic options for a field
  const fetchDynamicOptions = async (fieldName: string, fieldDef: SchemaFieldDef) => {
    if (!fieldDef.loadOptionsResource || !formData.credentialId) {
      // console.log(`[fetchDynamicOptions] Skipping ${fieldName}: missing loadOptionsResource or credentialId`);
      return;
    }

    const resourceType = fieldDef.loadOptionsResource;
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';

    // console.log(`[fetchDynamicOptions] Starting fetch for ${fieldName}, resource: ${resourceType}`);

    // Check if dependencies are met
    if (fieldDef.loadOptionsDependsOn && Array.isArray(fieldDef.loadOptionsDependsOn)) {
      // console.log(`[fetchDynamicOptions] Checking dependencies for ${fieldName}:`, fieldDef.loadOptionsDependsOn);

      const dependencyValues: Record<string, unknown> = {};
      const allDependenciesMet = fieldDef.loadOptionsDependsOn.every((dep: string) => {
        const value = formData[paramsKey]?.[dep] || formData[dep];
        dependencyValues[dep] = value;
        const isMet = value !== undefined && value !== null && value !== '';
        // console.log(`[fetchDynamicOptions] Dependency ${dep}: value="${value}", met=${isMet}`);
        return isMet;
      });

      if (!allDependenciesMet) {
        // console.log(`[fetchDynamicOptions] Dependencies not met for ${fieldName}:`, dependencyValues);
        return;
      } else {
        // console.log(`[fetchDynamicOptions] All dependencies met for ${fieldName}:`, dependencyValues);
      }
    }

    setLoadingDynamicOptions(prev => ({ ...prev, [fieldName]: true }));

    try {
      let url = `/connectors/${formData.credentialId}/resources/${resourceType}`;
      const params = new URLSearchParams();

      // Add dependency values as query params
      if (fieldDef.loadOptionsDependsOn && Array.isArray(fieldDef.loadOptionsDependsOn)) {
        fieldDef.loadOptionsDependsOn.forEach((dep: string) => {
          const value = formData[paramsKey]?.[dep] || formData[dep];
          if (value) {
            params.append(dep, value);
          }
        });
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // console.log(`[fetchDynamicOptions] Fetching from: ${url}`);
      const response = await api.get(url);

      // Ensure response is an array
      let options = response;
      if (!Array.isArray(response)) {
        // console.warn(`[fetchDynamicOptions] Response is not an array:`, response);
        // Try to extract array from common response formats
        if (response && typeof response === 'object') {
          // Check for ConnectorResponse format { success, data: { tables/columns } }
          if (response.data && typeof response.data === 'object') {
            options = response.data.tables || response.data.columns || response.data.items || response.data;
          }
          // Fallback to direct properties
          if (!Array.isArray(options)) {
            options = response.data || response.items || response.options || response.tables || response.columns || [];
          }
        } else {
          options = [];
        }
      }

      // Transform options to { value, label } format if needed
      if (Array.isArray(options) && options.length > 0) {
        // Check if options need transformation (have 'name' property but not 'value')
        if (options[0]?.name && !options[0]?.value) {
          options = options.map((opt: Record<string, unknown>) => ({
            value: opt.name,
            label: opt.name
          }));
        }
      }

      // console.log(`[fetchDynamicOptions] Got ${options?.length || 0} options for ${fieldName}`);
      setDynamicOptions(prev => ({ ...prev, [fieldName]: options }));
    } catch (error: unknown) {
      console.error(`[fetchDynamicOptions] Error for ${fieldName}:`, error);

      // Show more specific error messages
      const axiosError = error as { response?: { data?: { message?: string } } };
      if (axiosError?.response?.data?.message) {
        const errorMsg = axiosError.response.data.message;
        if (errorMsg.includes('reconnect') || errorMsg.includes('expired')) {
          toast.error(`Google Sheets credentials expired. Please reconnect your account.`);
        } else {
          toast.error(`Failed to load ${fieldDef.label || fieldName}: ${errorMsg}`);
        }
      } else {
        toast.error(`Failed to load ${fieldDef.label || fieldName} options`);
      }
    } finally {
      setLoadingDynamicOptions(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Fetch available models for AI connectors (e.g., Google Gemini)
  const fetchModels = async (fieldName: string = 'model') => {
    if (!formData.credentialId) {
      // console.log(`[fetchModels] Skipping: no credentialId`);
      return;
    }

    // Use credential-specific key to avoid cross-contamination
    const cacheKey = `${fieldName}_${formData.credentialId}`;
    // console.log(`[fetchModels] Fetching models for credential ${formData.credentialId}, cacheKey: ${cacheKey}`);
    setLoadingDynamicOptions(prev => ({ ...prev, [cacheKey]: true }));

    try {
      const url = `/connectors/${formData.credentialId}/models`;
      // console.log(`[fetchModels] Fetching from: ${url}`);

      const response = await api.get(url);
      // console.log(`[fetchModels] Response:`, response);

      // Backend returns { models: string[] }
      const models = response.models || [];
      // console.log(`[fetchModels] Got ${models.length} models for ${cacheKey}`);

      // Convert to { label, value } format for the select dropdown
      const modelOptions = models.map((model: string) => ({
        label: model,
        value: model
      }));

      setDynamicOptions(prev => ({ ...prev, [cacheKey]: modelOptions }));
    } catch (error: unknown) {
      console.error(`[fetchModels] Error:`, error);

      // Silently fail and use static options as fallback
      // Don't show error toast since static options are still available
      if ((error as { response?: { data?: { message?: string } } })?.response?.data?.message) {
        // console.log(`[fetchModels] API error: ${error.response.data.message}`);
      }
    } finally {
      setLoadingDynamicOptions(prev => ({ ...prev, [cacheKey]: false }));
    }
  };

  // Fetch credentials for connector
  const fetchCredentials = async () => {
    if (!connectorType) return;
    
    setLoadingCredentials(true);
    try {
      const response = await api.get('/connectors');
      // console.log('Credentials API response:', response);
      
      // The backend returns { connectors: [...], total, limit, offset }
      let credentialsList = [];
      if (response.connectors && Array.isArray(response.connectors)) {
        credentialsList = response.connectors;
      } else if (Array.isArray(response)) {
        credentialsList = response;
      } else if (response.data && Array.isArray(response.data)) {
        credentialsList = response.data;
      }
      
      // console.log('All credentials:', credentialsList);
      const filtered = credentialsList.filter((cred: CredentialItem) => cred.connector_type === connectorType);
      // console.log(`Filtered credentials for ${connectorType}:`, filtered);
      setCredentials(filtered);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Fetch available connectors
  const fetchConnectors = async () => {
    try {
      const response = await api.get('/connectors/available');
      // Ensure response is an array
      const connectorsList = Array.isArray(response) ? response : response.data || [];
      setConnectors(connectorsList);
    } catch (error) {
      console.error('Failed to fetch connectors:', error);
    }
  };

  // Fetch available triggers for a connector
  const fetchTriggers = async (connector: string) => {
    if (!connector) return;

    setLoadingTriggers(true);
    try {
      const response = await api.get(`/connectors/available/${connector}/triggers`);
      // console.log('Triggers API response:', response);
      const triggersList = Array.isArray(response) ? response : response.data || [];
      setTriggers(triggersList);
    } catch (error) {
      console.error('Failed to fetch triggers:', error);
      toast.error('Failed to load triggers');
    } finally {
      setLoadingTriggers(false);
    }
  };

  // Test credential connection
  const handleTestCredential = async () => {
    if (!formData.credentialId) {
      toast.error('Please select a credential first');
      return;
    }

    setTestingCredential(true);
    try {
      const response = await api.post(`/connectors/${formData.credentialId}/test`);
      if (response.success) {
        toast.success('Connection test successful!');

        // Update node status to success
        if (nodeId) {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      status: 'success',
                      error: undefined,
                    },
                  }
                : node
            )
          );
        }
      } else {
        const errorMessage = response.error?.message || 'Connection test failed';
        toast.error(errorMessage);

        // Update node status to error
        if (nodeId) {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      status: 'error',
                      error: errorMessage,
                    },
                  }
                : node
            )
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
      toast.error(errorMessage);

      // Update node status to error
      if (nodeId) {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'error',
                    error: errorMessage,
                  },
                }
              : node
          )
        );
      }
    } finally {
      setTestingCredential(false);
    }
  };

  // Fetch credentials and connectors when connector type is available (for CONNECTOR_ACTION)
  useEffect(() => {
    if (open && isConnectorAction && connectorType) {
      // console.log('Fetching data for connector:', connectorType);
      fetchCredentials();
      fetchConnectors(); // Need connector metadata for supported_actions
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isConnectorAction, connectorType, formData.connectorType]); // Added formData.connectorType to dependencies

  // Fetch triggers when connector type is available (for CONNECTOR_TRIGGER)
  useEffect(() => {
    if (open && isConnectorTrigger) {
      // console.log('CONNECTOR_TRIGGER modal opened');
      fetchConnectors(); // Always fetch connectors for the dropdown

      if (connectorType) {
        // console.log('Fetching triggers and credentials for connector:', connectorType);
        fetchTriggers(connectorType);
        fetchCredentials(); // Also fetch credentials for triggers
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isConnectorTrigger, connectorType]);

  // Fetch credentials for nodes that require them (based on connectorTypeForCredentials property)
  useEffect(() => {
    const fetchNodeCredentials = async () => {
      if (!open || !requiresCredentials || !credentialConnectorType) return;

      // console.log(`${nodeType} modal opened - fetching ${credentialConnectorType} credentials`);
      setLoadingCredentials(true);

      try {
        const response = await api.get('/connectors');
        // console.log(`Connectors API response for ${credentialConnectorType}:`, response);

        // Extract credentials array from response
        let credentialsList = [];
        if (response.connectors && Array.isArray(response.connectors)) {
          credentialsList = response.connectors;
        } else if (Array.isArray(response)) {
          credentialsList = response;
        } else if (response.data && Array.isArray(response.data)) {
          credentialsList = response.data;
        }

        // Filter for the specific connector type (or show all if "*")
        const filteredCredentials = credentialConnectorType === "*"
          ? credentialsList // Show all credentials for HTTP Request and other generic nodes
          : credentialsList.filter((cred: CredentialItem) =>
              cred.connector_type === credentialConnectorType || cred.connectorType === credentialConnectorType
            );

        // console.log(`Found ${credentialConnectorType} credentials:`, filteredCredentials);
        setCredentials(filteredCredentials);

        if (filteredCredentials.length === 0) {
          // console.warn(`No ${credentialConnectorType} credentials found. User needs to create one first.`);
        }
      } catch (error) {
        console.error(`Failed to fetch ${credentialConnectorType} credentials:`, error);
        toast.error(`Failed to load credentials`);
      } finally {
        setLoadingCredentials(false);
      }
    };

    fetchNodeCredentials();
  }, [open, requiresCredentials, credentialConnectorType, nodeType]);

  // Auto-fetch dependent field options when their dependencies change
  useEffect(() => {
    if (!inputSchema || !formData.credentialId) return;

    const properties = inputSchema.properties || inputSchema;
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';

    // Helper function to check and fetch options for a field
    const checkAndFetchField = (fieldName: string, fieldDef: SchemaFieldDef) => {
      if (!fieldDef.loadOptionsResource || !fieldDef.loadOptionsDependsOn) return;

      // Check if all dependencies are met
      const allDependenciesMet = fieldDef.loadOptionsDependsOn.every((dep: string) => {
        const value = formData[paramsKey]?.[dep] || formData[dep];
        return value !== undefined && value !== null && value !== '';
      });

      if (allDependenciesMet && !dynamicOptions[fieldName]) {
        // Dependencies are met and we haven't loaded options yet
        // console.log(`[useEffect] Auto-fetching options for ${fieldName} because dependencies are met`);
        fetchDynamicOptions(fieldName, fieldDef);
      }
    };

    // Check each top-level field
    Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      checkAndFetchField(fieldName, fieldDef);

      // Also check fields inside fixedCollections
      if (fieldDef.type === 'fixedCollection' && fieldDef.items) {
        const itemsKey = Object.keys(fieldDef.items)[0];
        const itemDef = fieldDef.items[itemsKey];

        if (itemDef?.properties) {
          Object.entries(itemDef.properties).forEach(([propName, propDef]: [string, SchemaFieldDef]) => {
            // Use the full path as the key: fieldName.propName
            checkAndFetchField(`${fieldName}.${propName}`, propDef);
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, formData.actionParams, formData.triggerParams, formData.credentialId, inputSchema]);

  // Fetch available connectors for nodes that require credentials
  // This includes both generic nodes (credentialConnectorType === "*") and specific nodes (e.g., "openai", "redis", "gmail")
  useEffect(() => {
    if (open && requiresCredentials && credentialConnectorType) {
      // console.log(`${nodeType} modal opened - fetching connectors for type: ${credentialConnectorType}`);
      fetchConnectors();
    }
  }, [open, requiresCredentials, credentialConnectorType, nodeType]);

  // Load existing node data when dialog opens
  useEffect(() => {
    if (open && nodeId) {
      const node = getNode(nodeId);
      // console.log('=== Loading Node Configuration ===');
      // console.log('Node ID:', nodeId);
      // console.log('Node Type:', nodeType);
      // console.log('Node Data:', node?.data);
      // console.log('[VALUES DEBUG ON OPEN] actionParams:', (node?.data as Record<string, unknown>)?.actionParams);
      // console.log('[VALUES DEBUG ON OPEN] actionParams.values:', ((node?.data as Record<string, unknown>)?.actionParams as Record<string, unknown>)?.values);

      if (node?.data) {
        // IMPORTANT: Set form data immediately so form can render
        setFormData(node.data);

        // Lock connector if this is a connector-specific trigger (has triggerId pre-set)
        if (node.data.triggerId && node.data.connectorType) {
          setIsConnectorLocked(true);
        } else {
          setIsConnectorLocked(false);
        }

        // Check if node is currently connected to AI Agent's tools handle
        const nodes = getNodes();
        const currentEdges = edges;
        const connectedToAI = currentEdges.some((edge) => {
          if (edge.source !== nodeId) return false;
          if (edge.targetHandle !== 'tools') return false;
          const targetNode = nodes.find((n) => n.id === edge.target);
          return targetNode?.type === 'AI_AGENT';
        });

        // Initialize mode from node data, but override if not connected to AI Agent
        const savedMode = node.data.mode as NodeMode | undefined;
        if (!connectedToAI) {
          // Not connected to AI Agent - always use execute mode
          setNodeMode('execute');
          setAiControlledFields(new Set());
        } else if (savedMode === 'execute' || savedMode === 'provider') {
          setNodeMode(savedMode);
        } else {
          setNodeMode('provider'); // Default to provider when connected to AI
        }

        // Initialize AI-controlled fields from node data or schema defaults (only if connected to AI)
        if (connectedToAI) {
          const savedAiFields = node.data.aiControlledFields as string[] | undefined;
          if (Array.isArray(savedAiFields)) {
            setAiControlledFields(new Set(savedAiFields));
          } else if (node.data.inputSchema) {
          // Default: use aiControlled property from inputSchema
          const defaultAiControlled = new Set<string>();
          const schema = (node.data.inputSchema as Record<string, SchemaFieldDef> & { properties?: Record<string, SchemaFieldDef> }).properties || node.data.inputSchema;
          Object.entries(schema as Record<string, SchemaFieldDef>).forEach(([key, field]: [string, SchemaFieldDef]) => {
            if (field.aiControlled === true) {
              defaultAiControlled.add(key);
            }
          });
          setAiControlledFields(defaultAiControlled);
        } else {
          setAiControlledFields(new Set());
        }
        } // End of if (connectedToAI)

        // If this is a connector action/trigger, fetch fresh schema from API and update
        if (node.data.connectorType && (node.data.actionId || node.data.triggerId)) {
          // console.log('[Schema Refresh] Fetching fresh schema for:', node.data.connectorType, node.data.actionId || node.data.triggerId);

          const fetchFreshSchema = async () => {
            try {
              const endpoint = node.data.actionId
                ? `/connectors/available/${node.data.connectorType}/actions`
                : `/connectors/available/${node.data.connectorType}/triggers`;

              const response = await api.get(endpoint);
              const itemId = node.data.actionId || node.data.triggerId;
              const item = (response as Array<{ id: string; inputSchema?: Record<string, unknown> }>).find((a) => a.id === itemId);

              if (item && item.inputSchema) {
                // console.log('[Schema Refresh] Fresh schema fetched:', item.inputSchema);
                // console.log('[Schema Refresh] Model field FULL schema:', JSON.stringify(item.inputSchema.model || item.inputSchema.properties?.model, null, 2));
                // console.log('[Schema Refresh] Size field FULL schema:', JSON.stringify(item.inputSchema.size, null, 2));
                // Update form data with fresh schema from API, preserving param values
                setFormData((prev) => ({
                  ...prev,
                  inputSchema: item.inputSchema // Always use fresh schema from API
                }));
              } else {
                // console.log('[Schema Refresh] No schema found in response. Item:', item);
              }
            } catch (error) {
              console.error('[Schema Refresh] Failed to fetch fresh schema:', error);
            }
          };

          fetchFreshSchema();
        }
      } else {
        // Node doesn't exist anymore (was deleted), close the modal
        onOpenChange(false);
      }
    } else {
      // Reset form when closing
      setFormData({});
      setExecutionResult(null);
      setWebhookUrl('');
      setVerifyToken('');
      setIsConnectorLocked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nodeId, nodeType, getNode, getNodes, onOpenChange]);

  // Initialize default values from inputSchema when it changes
  // Also migrate values from legacy 'config' field to 'actionParams'/'triggerParams'
  useEffect(() => {
    if (!inputSchema || !open) return;

    const properties = inputSchema.properties || inputSchema;
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';
    const currentParams = formData[paramsKey] || {};
    const legacyConfig = formData.config || {};

    // Check if we need to migrate from config or set defaults
    const needsUpdate = Object.entries(properties as Record<string, SchemaFieldDef>).some(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      const currentValue = currentParams[fieldName];
      const legacyValue = legacyConfig[fieldName];
      const isEmptyArray = Array.isArray(currentValue) && currentValue.length === 0;

      // Need update if: no value (or empty array) but has legacy value or default
      return (currentValue === undefined || isEmptyArray) &&
             (legacyValue !== undefined || fieldDef.default !== undefined);
    });

    if (needsUpdate) {
      // console.log('[DefaultValues] Initializing values from config/defaults');
      // console.log('[DefaultValues] Legacy config:', legacyConfig);
      // console.log('[DefaultValues] Current params:', currentParams);

      const updatedParams = { ...currentParams };

      Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
        const currentValue = updatedParams[fieldName];
        const legacyValue = legacyConfig[fieldName];
        const isEmptyArray = Array.isArray(currentValue) && currentValue.length === 0;

        // Migrate from legacy config first, then fall back to default
        if (currentValue === undefined || isEmptyArray) {
          if (legacyValue !== undefined) {
            updatedParams[fieldName] = legacyValue;
            // console.log(`[DefaultValues] Migrated ${fieldName} from config:`, legacyValue);
          } else if (fieldDef.default !== undefined) {
            updatedParams[fieldName] = fieldDef.default;
            // console.log(`[DefaultValues] Set default for ${fieldName}:`, fieldDef.default);
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        [paramsKey]: updatedParams
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSchema, open, isConnectorTrigger]);

  // Helper function to sort fields by order property
  const sortFieldsByOrder = (entries: Array<[string, SchemaFieldDef]>) => {
    return entries.sort(([, a], [, b]) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      return orderA - orderB;
    });
  };

  // Watch credential changes - runs when credential is selected/changed
  useEffect(() => {
    // Debug logging removed for production

    // Try to trigger loading immediately when credential changes
    if (open && inputSchema && formData.credentialId) {
      // console.log('[CredentialWatch] Triggering immediate load');
      const properties = inputSchema.properties || inputSchema;
      const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';

      Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
        // Initialize default values if not already set
        if (fieldDef.default !== undefined) {
          const currentValue = formData[paramsKey]?.[fieldName];
          if (currentValue === undefined || currentValue === null || currentValue === '') {
            // console.log(`[CredentialWatch] Setting default value for ${fieldName}: ${fieldDef.default}`);
            handleFieldChange(`${paramsKey}.${fieldName}`, fieldDef.default);
          }
        }

        // Handle dynamicOptions fields (like model selection for AI connectors)
        if (fieldDef.dynamicOptions === true) {
          // console.log(`[CredentialWatch] Detected ${fieldName} with dynamicOptions, fetching models...`);
          fetchModels(fieldName);
        }

        // Handle regular loadOptionsResource fields
        if (fieldDef.loadOptionsResource) {
          // console.log(`[CredentialWatch] Triggering fetch for ${fieldName}`);
          fetchDynamicOptions(fieldName, fieldDef);
        }
        // Handle resourceMapper fields (columns)
        if (fieldDef.type === 'resourceMapper' && fieldDef.loadColumnsResource) {
          // console.log(`[CredentialWatch] Found resourceMapper field: ${fieldName}`);
          // Will be loaded when dependencies are met
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.credentialId]);

  // Watch for spreadsheet selection to trigger sheet loading
  useEffect(() => {
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';
    const spreadsheetId = formData[paramsKey]?.spreadsheetId || formData.spreadsheetId;

    // console.log('[SpreadsheetWatch] Spreadsheet selection changed:', { spreadsheetId, open, hasInputSchema: !!inputSchema });

    if (!open || !inputSchema || !formData.credentialId || !spreadsheetId) return;

    // Find fields that depend on spreadsheetId and trigger loading
    const properties = inputSchema.properties || inputSchema;
    Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      const loadDeps = fieldDef.loadOptionsDependsOn;

      // Check if this field depends on spreadsheetId
      if (fieldDef.loadOptionsResource &&
          loadDeps &&
          Array.isArray(loadDeps) &&
          loadDeps.includes('spreadsheetId')) {
        // console.log(`[SpreadsheetWatch] Triggering fetch for dependent field: ${fieldName}`);
        fetchDynamicOptions(fieldName, fieldDef);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inputSchema, formData.credentialId, formData.spreadsheetId, formData.actionParams?.spreadsheetId, formData.triggerParams?.spreadsheetId]);

  // Watch for sheet selection to trigger column loading
  useEffect(() => {
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';
    const spreadsheetId = formData[paramsKey]?.spreadsheetId || formData.spreadsheetId;
    const sheetName = formData[paramsKey]?.sheetName || formData.sheet;

    // console.log('[SheetWatch] Sheet selection changed:', { spreadsheetId, sheetName, open, hasInputSchema: !!inputSchema });

    if (!open || !inputSchema || !formData.credentialId) return;
    if (!spreadsheetId || !sheetName) return;

    // Find resourceMapper fields and trigger column loading
    const properties = inputSchema.properties || inputSchema;
    Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      if (fieldDef.type === 'resourceMapper' && fieldDef.loadColumnsResource) {
        // console.log(`[SheetWatch] Triggering column fetch for resourceMapper: ${fieldName}`);

        // Create a modified fieldDef for fetching columns
        const columnFieldDef = {
          ...fieldDef,
          loadOptionsResource: fieldDef.loadColumnsResource,
          loadOptionsDependsOn: fieldDef.loadColumnsDependsOn
        };

        fetchDynamicOptions(fieldName, columnFieldDef);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inputSchema, formData.credentialId, formData.spreadsheetId, formData.sheet, formData.sheetName, formData.actionParams?.spreadsheetId, formData.actionParams?.sheetName, formData.actionParams?.sheet, formData.triggerParams?.spreadsheetId, formData.triggerParams?.sheetName, formData.triggerParams?.sheet]);

  // Watch for PostgreSQL table selection to trigger column loading in fixedCollection
  useEffect(() => {
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';
    const schema = formData[paramsKey]?.schema;
    const table = formData[paramsKey]?.table;

    // console.log('[PostgreSQLWatch] Table selection changed:', { schema, table, open, hasInputSchema: !!inputSchema, connectorType });

    if (!open || !inputSchema || !formData.credentialId) return;
    if (!schema || !table) return;
    if (connectorType !== 'postgresql') return;

    // Find fixedCollection fields and trigger column loading for their nested fields
    const properties = inputSchema.properties || inputSchema;
    Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      if (fieldDef.type === 'fixedCollection') {
        // console.log(`[PostgreSQLWatch] Found fixedCollection field: ${fieldName}`);

        // Get the items definition
        const itemsKey = Object.keys(fieldDef.items || {})[0];
        const itemDef = fieldDef.items?.[itemsKey];

        if (itemDef?.properties) {
          // Check each property in the fixedCollection items
          Object.entries(itemDef.properties).forEach(([propName, propDef]: [string, SchemaFieldDef]) => {
            if (propDef.loadOptionsResource) {
              // console.log(`[PostgreSQLWatch] Triggering column fetch for ${fieldName}.${propName}`);

              // Fetch options for this nested field
              fetchDynamicOptions(`${fieldName}.${propName}`, propDef);
            }
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inputSchema, formData.credentialId, connectorType, formData.actionParams?.schema, formData.actionParams?.table, formData.triggerParams?.schema, formData.triggerParams?.table]);

  // Fetch dynamic options when dependencies change
  useEffect(() => {
    // Debug logging removed for production
    if (!open) return;
    if (!inputSchema) return;
    if (!formData.credentialId) return;

    const properties = inputSchema.properties || inputSchema;

    // Trigger loading for all fields with loadOptionsResource
    Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      if (fieldDef.loadOptionsResource) {
        fetchDynamicOptions(fieldName, fieldDef);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inputSchema, formData.credentialId, actionId, formData.actionParams, formData.triggerParams]);

  // Fetch webhook URL for trigger nodes
  useEffect(() => {
    const fetchWebhookUrl = async () => {
      // Only fetch if we have a webhook-based trigger and workflow is open
      if (!open || !workflowId) return;

      // Check if this is a webhook-based trigger
      if (!isWebhookTrigger && !isConnectorTrigger) return;

      // For CONNECTOR_TRIGGER, only fetch if it's a webhook-based connector
      if (isConnectorTrigger) {
        const isConnectorWebhookTrigger = connectorType === 'telegram' || connectorType === 'gmail' || connectorType === 'facebook_graph' || connectorType === 'stripe';
        if (!isConnectorWebhookTrigger) return;
      }

      setLoadingWebhook(true);
      try {
        const response = await api.get(`/workflow/${workflowId}/webhook-url`);

        // Find the webhook for this specific trigger
        let triggerWebhook;

        if (isWebhookTrigger) {
          // For generic WEBHOOK_TRIGGER, find by triggerType
          triggerWebhook = response.webhooks?.find(
            (w: WebhookInfo) => w.triggerType === 'WEBHOOK_TRIGGER'
          );
        } else if (isConnectorTrigger) {
          // For CONNECTOR_TRIGGER, find by connectorType
          triggerWebhook = response.webhooks?.find(
            (w: WebhookInfo) => w.connectorType === connectorType || w.triggerType === `${connectorType?.toUpperCase()}_TRIGGER`
          );
        }

        if (triggerWebhook) {
          setWebhookUrl(triggerWebhook.webhookUrl);
          // Set verify token if it exists (for Facebook triggers)
          if (triggerWebhook.verifyToken) {
            setVerifyToken(triggerWebhook.verifyToken);
          }
        }
      } catch (error) {
        console.error('Failed to fetch webhook URL:', error);
      } finally {
        setLoadingWebhook(false);
      }
    };

    fetchWebhookUrl();
  }, [open, workflowId, connectorType, isConnectorTrigger, isWebhookTrigger, nodeType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nodeId) return;

    // console.log('=== Form Configuration Save ===');
    // console.log('Node ID:', nodeId);
    // console.log('Form Data:', formData);
    // console.log('[VALUES DEBUG] actionParams:', formData.actionParams);
    // console.log('[VALUES DEBUG] actionParams.values:', formData.actionParams?.values);

    // Merge default values from inputSchema for fields that are not explicitly set
    const finalFormData = { ...formData };

    if (inputSchema) {
      const properties = inputSchema.properties || inputSchema;
      const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';
      const params = finalFormData[paramsKey] || {};

      // Add default values for fields that are missing
      Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
        if (params[fieldName] === undefined && fieldDef.default !== undefined) {
          params[fieldName] = fieldDef.default;
          // console.log(`[handleSubmit] Adding default value for ${fieldName}:`, fieldDef.default);
        }
      });

      finalFormData[paramsKey] = params;
    }

    // console.log('Final Form Data (with defaults):', finalFormData);

    // Build context params for provider mode (non-AI-controlled fields with values)
    let contextParams: Record<string, unknown> | undefined;
    if (nodeMode === 'provider' && isConnectorAction) {
      contextParams = {};
      const paramsKey = 'actionParams';
      const params = finalFormData[paramsKey] || {};
      Object.entries(params).forEach(([key, value]) => {
        // Only include non-AI-controlled fields that have values
        if (!aiControlledFields.has(key) && value !== undefined && value !== '') {
          contextParams![key] = value;
        }
      });
    }

    // Update the node's data
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...finalFormData,
              // Add mode and AI fields for connector actions
              ...(isConnectorAction ? {
                mode: nodeMode,
                aiControlledFields: Array.from(aiControlledFields),
                contextParams: contextParams,
              } : {}),
              // Reset status to initial when saving (clear any test status)
              status: 'initial',
              error: undefined,
            },
          };
          // console.log('Updated Node:', updatedNode);
          return updatedNode;
        }
        return node;
      })
    );

    onOpenChange(false);
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    // console.log('[handleFieldChange] fieldName:', fieldName, 'value:', value);

    // Handle nested field paths (e.g., "actionParams.chatId")
    if (fieldName.includes('.')) {
      const parts = fieldName.split('.');
      setFormData((prev) => {
        const newData = { ...prev };
        let current = newData;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          // Clone each level to avoid mutating the original object (React state immutability)
          current[part] = current[part] ? { ...current[part] } : {};
          current = current[part];
        }

        current[parts[parts.length - 1]] = value;
        // console.log('[handleFieldChange] newData after update:', JSON.stringify(newData.actionParams, null, 2));
        return newData;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
    }
    // Note: Dependent field loading is now handled by useEffect
  };

  // Execute single node
  const executeNode = async () => {
    if (!nodeId) {
      toast.error('No node selected');
      return;
    }

    try {
      setExecuting(true);
      setExecutionResult(null);

      // Use local variable to track the effective workflow ID (may change after save)
      let effectiveWorkflowId = workflowId;

      // If no workflowId, we need to save the workflow first
      if (!effectiveWorkflowId) {
        // console.log('🔄 No workflow ID found, requesting auto-save before node execution...');
        toast.info('Saving workflow before execution...');

        // Request workflow save via custom event
        window.dispatchEvent(new CustomEvent('node-execution:request-workflow-save'));

        // Wait for save to complete or fail
        const saveResult = await new Promise<{ success: boolean; workflowId?: string; error?: string }>((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ success: false, error: 'Save timeout' });
          }, 10000); // 10 second timeout

          const handleSaveComplete = (event: Event) => {
            clearTimeout(timeout);
            window.removeEventListener('node-execution:workflow-save-complete', handleSaveComplete);
            window.removeEventListener('node-execution:workflow-save-failed', handleSaveFailed);
            resolve({ success: true, workflowId: (event as CustomEvent<{ workflowId: string }>).detail.workflowId });
          };

          const handleSaveFailed = (event: Event) => {
            clearTimeout(timeout);
            window.removeEventListener('node-execution:workflow-save-complete', handleSaveComplete);
            window.removeEventListener('node-execution:workflow-save-failed', handleSaveFailed);
            resolve({ success: false, error: (event as CustomEvent<{ error: string }>).detail.error });
          };

          window.addEventListener('node-execution:workflow-save-complete', handleSaveComplete);
          window.addEventListener('node-execution:workflow-save-failed', handleSaveFailed);
        });

        if (!saveResult.success) {
          toast.error('Failed to save workflow: ' + (saveResult.error || 'Unknown error'));
          setExecuting(false);
          return;
        }

        // console.log('✅ Workflow saved successfully, proceeding with node execution');
        // Use the workflowId from the save result
        effectiveWorkflowId = saveResult.workflowId;
      }

      toast.info('Executing node...');

      // Execute single node via API
      const result = await api.post(`/workflow/${effectiveWorkflowId}/execute-node`, {
        nodeId: nodeId,
        testData: {
          test: true,
          executedAt: new Date().toISOString()
        }
      });

      // console.log('Node execution result:', result);
      setExecutionResult(result);

      // Check if execution was successful - need to check nested error too
      const hasNestedError = result.result?.data?.success === false ||
                             result.result?.error ||
                             result.data?.success === false ||
                             result.data?.error;
      const errorMessage = result.result?.data?.error?.message ||
                          result.result?.error?.message ||
                          result.data?.error?.message ||
                          result.error?.message;

      if ((result.success || result.status === 'success') && !hasNestedError) {
        toast.success('Node executed successfully!');

        // Save execution output to the node's data so FieldPicker can access it
        if (result.result?.output) {
          setNodes((nodes) =>
            nodes.map((node) => {
              if (node.id === nodeId) {
                // Extract the actual output data
                const outputData = Array.isArray(result.result.output) && result.result.output.length > 0
                  ? result.result.output[0]?.json || result.result.output[0] || {}
                  : result.result.output?.json || result.result.output || {};

                return {
                  ...node,
                  data: {
                    ...node.data,
                    outputData, // Store output for FieldPicker
                    lastResult: outputData, // Also store as lastResult for backward compatibility
                    lastExecutedAt: new Date().toISOString(),
                    status: 'success'
                  }
                };
              }
              return node;
            })
          );
        }
      } else {
        // Show error with detailed message if available
        const displayError = errorMessage || result.error?.message || 'Node execution failed';
        toast.error(
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-sm">Node Execution Failed</div>
            <div className="text-xs text-gray-300">{displayError}</div>
          </div>,
          { duration: 8000 }
        );
      }
    } catch (error: unknown) {
      console.error('Node execution error:', error);
      const axiosErr = error as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const catchErrorMessage = axiosErr.response?.data?.error?.message ||
                                axiosErr.response?.data?.message ||
                                axiosErr.message ||
                                'Failed to execute node';
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-sm">Execution Error</div>
          <div className="text-xs text-gray-300">{catchErrorMessage}</div>
        </div>,
        { duration: 8000 }
      );
      setExecutionResult({ success: false, error: catchErrorMessage });
    } finally {
      setExecuting(false);
    }
  };

  // Copy webhook URL
  const copyWebhookUrl = async () => {
    if (!webhookUrl) return;

    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success('Webhook URL copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  // Copy verify token
  const copyVerifyToken = async () => {
    if (!verifyToken) return;

    try {
      await navigator.clipboard.writeText(verifyToken);
      setCopiedToken(true);
      toast.success('Verify Token copied!');
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      toast.error('Failed to copy token');
    }
  };

  // Check if field should be shown based on displayOptions
  const shouldShowField = (displayOptions: SchemaFieldDef['displayOptions'], currentValues: Record<string, unknown>) => {
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';

    // Check hide conditions first
    if (displayOptions?.hide) {
      for (const [path, hiddenValues] of Object.entries(displayOptions.hide)) {
        const fieldPath = path.startsWith('/') ? path.slice(1) : path;
        const actualValue = currentValues[paramsKey]?.[fieldPath] || currentValues[fieldPath];

        const hiddenArray = Array.isArray(hiddenValues) ? hiddenValues : [hiddenValues];
        if (hiddenArray.includes(actualValue)) {
          return false; // Should hide
        }
      }
    }

    // Check show conditions
    if (displayOptions?.show) {
      for (const [path, allowedValues] of Object.entries(displayOptions.show)) {
        const fieldPath = path.startsWith('/') ? path.slice(1) : path;
        const actualValue = currentValues[paramsKey]?.[fieldPath] || currentValues[fieldPath];

        const allowedArray = Array.isArray(allowedValues) ? allowedValues : [allowedValues];
        if (!allowedArray.includes(actualValue)) {
          return false; // Condition not met
        }
      }
    }

    return true; // All conditions met or no conditions
  };

  // Render connector fields dynamically
  const renderConnectorFields = () => {
    if (!inputSchema) {
      return <div className="text-gray-400">No configuration required for this action</div>;
    }

    const connector = connectors.find(c => c.name === connectorType);
    const connectorDisplayName = connector?.display_name || connectorType;
    const requiresAuth = connector?.auth_type !== 'none';

    return (
      <div className="space-y-3">
        {/* Credential Selection */}
        {requiresAuth && (
        <div className="space-y-1.5">
          <Label className="text-white text-sm">
            {connectorDisplayName} Credential
            <span className="text-red-400 ml-1">*</span>
          </Label>

          <div className="flex gap-1.5">
            <Select
              value={formData.credentialId || ""}
              onValueChange={(value) => {
                handleFieldChange("credentialId", value);
                // Find the selected credential and store its auth type
                const selectedCred = credentials.find((c) => c.id === value);
                if (selectedCred) {
                  // Store the actual auth type from credential config for multi-auth connector support
                  const credMetadata = selectedCred.metadata || selectedCred.config;
                  const authType = credMetadata?.authType || 'standard';
                  handleFieldChange("credentialAuthType", authType);
                }

                // Automatically fetch dynamic options for fields with loadOptionsResource
                if (inputSchema) {
                  const properties = inputSchema.properties || inputSchema;
                  Object.entries(properties).forEach(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
                    if (fieldDef.loadOptionsResource && !fieldDef.loadOptionsDependsOn) {
                      // Only fetch for fields that don't depend on other fields
                      setTimeout(() => fetchDynamicOptions(fieldName, fieldDef), 100);
                    }
                  });
                }
              }}
              disabled={loadingCredentials}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white flex-1">
                <SelectValue placeholder={loadingCredentials ? "Loading..." : "Select a credential"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {credentials.length === 0 ? (
                  <div className="text-gray-400 text-sm p-4 text-center">
                    No {connectorDisplayName} credentials found.
                    <br />
                    Click + to create one.
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
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setShowAddCredentialModal(true)}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              title="Add new credential"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {formData.credentialId && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleTestCredential}
                disabled={testingCredential}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                title="Test connection"
              >
                {testingCredential ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Select an existing credential or create a new one
          </p>
        </div>
        )}

        {/* Mode Selector - Only show when connected to AI Agent's tools handle */}
        {isConnectorAction && formData.credentialId && isConnectedToAIToolsHandle && (
          <div className="space-y-2">
            <Label className="text-white">Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNodeMode('execute')}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                  nodeMode === 'execute'
                    ? "bg-green-900/30 border-green-500 text-green-400"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                )}
              >
                <Play className="w-4 h-4" />
                <div>
                  <div className="text-sm font-medium">Execute</div>
                  <div className="text-xs opacity-70">Run this action</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setNodeMode('provider')}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                  nodeMode === 'provider'
                    ? "bg-cyan-900/30 border-cyan-500 text-cyan-400"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                )}
              >
                <Bot className="w-4 h-4" />
                <div>
                  <div className="text-sm font-medium">AI Tool</div>
                  <div className="text-xs opacity-70">Let AI use this</div>
                </div>
              </button>
            </div>
            {nodeMode === 'provider' && (
              <div className="p-2 bg-cyan-900/20 border border-cyan-700/30 rounded text-xs text-cyan-300">
                <Bot className="w-3 h-3 inline mr-1" />
                This action will be available as a tool for AI Agent. Toggle "AI fills this" for fields the AI should generate.
              </div>
            )}
          </div>
        )}

        {/* Dynamic Fields based on inputSchema */}
        {renderDynamicFields()}
      </div>
    );
  };

  // Render connector trigger fields dynamically
  const renderConnectorTriggerFields = () => {
    // Get display name for locked connector
    const connectorDisplayName = formData.connectorDisplayName ||
      connectors.find(c => c.name === connectorType)?.display_name ||
      connectorType;

    return (
      <div className="space-y-4">
        {/* Connector Selection - Hidden when locked to a specific connector */}
        {!isConnectorLocked && (
          <div className="space-y-2">
            <Label className="text-white">
              Select Connector
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <Select
              value={connectorType || ""}
              onValueChange={(value) => {
                handleFieldChange("connectorType", value);
                // Reset trigger when connector changes
                handleFieldChange("triggerId", "");
                handleFieldChange("label", "");
                handleFieldChange("description", "");
                handleFieldChange("eventType", "");
                handleFieldChange("icon", "");
                // Fetch triggers for new connector
                fetchTriggers(value);
              }}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select a connector..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {connectors.length === 0 ? (
                  <div className="text-gray-400 text-sm p-4 text-center">
                    No connectors available
                  </div>
                ) : (
                  connectors.map((connector) => (
                    <SelectItem
                      key={connector.name}
                      value={connector.name}
                      className="text-white hover:bg-gray-700"
                    >
                      {connector.display_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Choose which app this trigger should listen to
            </p>
          </div>
        )}

        {/* Credential Selection for Trigger - Show when connector is selected */}
        {connectorType && (
          <div className="space-y-2">
            <Label className="text-white">
              {connectorDisplayName} Credential
              <span className="text-red-400 ml-1">*</span>
            </Label>

            <div className="flex gap-2">
              <Select
                value={formData.credentialId || ""}
                onValueChange={(value) => handleFieldChange("credentialId", value)}
                disabled={loadingCredentials}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white flex-1">
                  <SelectValue placeholder={loadingCredentials ? "Loading..." : "Select a credential"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {credentials.length === 0 ? (
                    <div className="text-gray-400 text-sm p-4 text-center">
                      No {connectorDisplayName} credentials found.
                      <br />
                      Click + to create one.
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
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setShowAddCredentialModal(true)}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                title="Add new credential"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {formData.credentialId && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={handleTestCredential}
                  disabled={testingCredential}
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  title="Test connection"
                >
                  {testingCredential ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              Select an existing credential or create a new one to authenticate with {connectorDisplayName}
            </p>
          </div>
        )}

        {/* Trigger Selection */}
        {connectorType && (
          <div className="space-y-2">
            <Label className="text-white">
              Select Trigger
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <Select
              value={triggerId || ""}
              onValueChange={(value) => {
                const trigger = triggers.find(t => t.id === value);
                // console.log('Selected trigger:', trigger);
                handleFieldChange("triggerId", value);
                handleFieldChange("label", trigger?.name || value);
                handleFieldChange("description", trigger?.description || "");
                handleFieldChange("eventType", trigger?.eventType || "");
                handleFieldChange("icon", trigger?.icon || "Zap");
                handleFieldChange("inputSchema", trigger?.inputSchema || null);
                // Initialize triggerParams if there's an inputSchema
                if (trigger?.inputSchema) {
                  handleFieldChange("triggerParams", {});
                }
              }}
              disabled={loadingTriggers}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={loadingTriggers ? "Loading..." : "Select a trigger..."} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {triggers.length === 0 ? (
                  <div className="text-gray-400 text-sm p-4 text-center">
                    {loadingTriggers ? "Loading triggers..." : `No triggers available for ${connectorType}`}
                  </div>
                ) : (
                  triggers.map((trigger) => (
                    <SelectItem
                      key={trigger.id}
                      value={trigger.id}
                      className="text-white hover:bg-gray-700"
                    >
                      {trigger.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Choose which event should trigger this workflow
            </p>
          </div>
        )}

        {/* Show trigger parameter fields */}
        {triggerId && formData.inputSchema && (
          <div className="space-y-4">
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-white font-medium mb-3">Trigger Configuration</h4>
              {renderTriggerParameters()}
            </div>
          </div>
        )}

      </div>
    );
  };
  
  // Render trigger parameter fields
  const renderTriggerParameters = () => {
    if (!formData.inputSchema) return null;

    const inputSchema = formData.inputSchema;
    const triggerParams = formData.triggerParams || {};

    // Check if inputSchema has properties (full schema) or is just properties object
    const properties = inputSchema.properties || inputSchema;
    const required = inputSchema.required || [];

    return sortFieldsByOrder(Object.entries(properties)).map(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      const value = triggerParams[fieldName] ?? fieldDef.default ?? "";
      const isRequired = required.includes(fieldName) || fieldDef.required === true;

      return renderDynamicField(fieldName, fieldDef, value, isRequired, 'triggerParams');
    });
  };

  // Render dynamic fields based on the action's or trigger's input schema
  const renderDynamicFields = () => {
    if (!inputSchema) return null;

    const properties = inputSchema.properties || inputSchema;
    const required = Array.isArray(inputSchema.required) ? inputSchema.required : [];

    // Determine if we're rendering for trigger or action
    const paramsKey = isConnectorTrigger ? 'triggerParams' : 'actionParams';

    // For Telegram send_message, we'll structure it better
    if (connectorType === 'telegram' && actionId === 'send_message') {
      return renderTelegramMessageFields(properties, required);
    }

    // Generic field rendering for other connectors and triggers
    return sortFieldsByOrder(Object.entries(properties)).map(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
      // Check displayOptions before rendering
      if (fieldDef.displayOptions && !shouldShowField(fieldDef.displayOptions, formData, fieldName)) {
        return null;
      }

      const value = formData[paramsKey]?.[fieldName] ?? fieldDef.default ?? "";
      const isRequired = required.includes(fieldName) || fieldDef.required;

      return renderDynamicField(fieldName, fieldDef, value, isRequired, paramsKey);
    });
  };

  // Special rendering for Telegram message fields
  const renderTelegramMessageFields = (properties: Record<string, SchemaFieldDef>, required: string[]) => {
    const basicFields = ['chatId', 'text', 'parseMode'];
    const advancedFields = ['disableNotification', 'replyToMessageId', 'replyMarkup', 'disableWebPagePreview'];

    return (
      <>
        {/* Basic Fields */}
        {sortFieldsByOrder(Object.entries(properties))
          .filter(([key]) => basicFields.includes(key))
          .map(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
            const value = formData.actionParams?.[fieldName] ?? fieldDef.default ?? "";
            const isRequired = required.includes(fieldName);
            return renderDynamicField(fieldName, fieldDef, value, isRequired);
          })}

        {/* Advanced Options */}
        {Object.entries(properties).some(([key]) => advancedFields.includes(key)) && (
          <div className="border-t border-gray-700 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-gray-400 hover:text-white p-0 h-auto"
            >
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              Advanced Options
            </Button>

            {showAdvancedOptions && (
              <div className="mt-4 space-y-4">
                {sortFieldsByOrder(Object.entries(properties))
                  .filter(([key]) => advancedFields.includes(key))
                  .map(([fieldName, fieldDef]: [string, SchemaFieldDef]) => {
                    const value = formData.actionParams?.[fieldName] ?? fieldDef.default ?? "";
                    const isRequired = required.includes(fieldName);
                    return renderDynamicField(fieldName, fieldDef, value, isRequired);
                  })}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // Render collection field (like Options in n8n)
  const renderCollectionField = (fieldName: string, fieldDef: SchemaFieldDef, value: unknown) => {
    const collectionValue = (value || {}) as Record<string, unknown>;
    const isCollectionExpanded = expandedCollections.includes(fieldName);

    // Check if any options are already added (to auto-expand)
    const hasAnyOptions = Object.keys(collectionValue).length > 0;

    return (
      <div key={fieldName} className="space-y-3">
        {/* Add Option Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setExpandedCollections(prev =>
              isCollectionExpanded
                ? prev.filter(s => s !== fieldName)
                : [...prev, fieldName]
            );
          }}
          className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {fieldDef.placeholder || 'Add Option'}
        </Button>

        {/* Options Container - shown when button is clicked or when options exist */}
        {(isCollectionExpanded || hasAnyOptions) && (
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-white font-semibold">{fieldDef.label}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpandedCollections(prev => prev.filter(s => s !== fieldName));
                }}
                className="text-gray-400 hover:text-white"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            {/* Render each property in the collection */}
            {Object.entries(fieldDef.properties || {}).map(([propName, propDef]: [string, SchemaFieldDef]) => {
              // Check displayOptions for this property
              if (propDef.displayOptions && !shouldShowField(propDef.displayOptions, formData)) {
                return null;
              }

              const isExpanded = expandedCollections.includes(`${fieldName}.${propName}`);
              const propValue = collectionValue[propName] || propDef.default || {};

              return (
                <div key={propName} className="border border-gray-600 rounded-lg overflow-hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setExpandedCollections(prev =>
                        isExpanded
                          ? prev.filter(s => s !== `${fieldName}.${propName}`)
                          : [...prev, `${fieldName}.${propName}`]
                      );
                    }}
                    className="w-full flex justify-between p-3 hover:bg-gray-700/50"
                  >
                    <span className="text-white">{propDef.label}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {isExpanded && (
                    <div className="p-3 bg-gray-900/50 border-t border-gray-600">
                      {propDef.type === 'fixedCollection' && (
                        renderFixedCollectionField(`${fieldName}.${propName}`, propDef, propValue)
                      )}
                      {propDef.type === 'json' && (
                        <Textarea
                          value={typeof propValue === 'string' ? propValue : JSON.stringify(propValue, null, 2)}
                          onChange={(e) => handleFieldChange(`actionParams.${fieldName}.${propName}`, e.target.value)}
                          placeholder={propDef.placeholder}
                          rows={4}
                          className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render fixedCollection field (like Query Parameters, Fields in n8n)
  const renderFixedCollectionField = (fieldName: string, fieldDef: SchemaFieldDef, value: unknown) => {
    const itemsKey = Object.keys(fieldDef.items || {})[0]; // e.g., 'field', 'parameter'
    const itemDef = fieldDef.items?.[itemsKey];
    const items = value?.[itemsKey] || [];

    const addItem = () => {
      const newItem: Record<string, unknown> = {};
      Object.keys(itemDef?.properties || {}).forEach(key => {
        newItem[key] = itemDef?.properties?.[key]?.default || '';
      });

      handleFieldChange(`actionParams.${fieldName}.${itemsKey}`, [
        ...items,
        newItem
      ]);
    };

    const removeItem = (index: number) => {
      const newItems = [...items];
      newItems.splice(index, 1);
      handleFieldChange(`actionParams.${fieldName}.${itemsKey}`, newItems);
    };

    const updateItem = (index: number, propName: string, propValue: unknown) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [propName]: propValue };
      handleFieldChange(`actionParams.${fieldName}.${itemsKey}`, newItems);
    };

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm text-gray-300">{fieldDef.description}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="text-xs bg-gray-700 hover:bg-gray-600"
          >
            <Plus className="w-3 h-3 mr-1" />
            {fieldDef.placeholder || 'Add'}
          </Button>
        </div>

        {items.length === 0 && (
          <p className="text-xs text-gray-500 italic">No items added yet</p>
        )}

        {items.map((item: Record<string, unknown>, index: number) => (
          <div key={index} className="border border-gray-600 rounded-lg p-3 space-y-2 bg-gray-800/30">
            {Object.entries(itemDef?.properties || {}).map(([propName, propDef]: [string, SchemaFieldDef]) => (
              <div key={propName} className="space-y-1">
                <Label className="text-xs text-gray-400">{propDef.label}</Label>
                {/* Support loadOptionsResource for dynamic dropdowns */}
                {propDef.loadOptionsResource ? (
                  <Select
                    value={String(item[propName] || '')}
                    onValueChange={(val) => updateItem(index, propName, val)}
                    disabled={loadingDynamicOptions[`${fieldName}.${propName}`]}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm">
                      <SelectValue placeholder={
                        loadingDynamicOptions[`${fieldName}.${propName}`]
                          ? "Loading..."
                          : propDef.placeholder || "Select..."
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {(() => {
                        const options = dynamicOptions[`${fieldName}.${propName}`] || [];

                        if (options.length === 0 && !loadingDynamicOptions[`${fieldName}.${propName}`]) {
                          return (
                            <div className="text-gray-400 text-xs p-2 text-center">
                              No {propDef.label} found
                            </div>
                          );
                        }

                        return options.map((option: SelectOption | string) => {
                          const optionValue = typeof option === 'object' ? option.value : option;
                          const optionLabel = typeof option === 'object' ? option.label : option;

                          return (
                            <SelectItem
                              key={String(optionValue)}
                              value={String(optionValue)}
                              className="text-white hover:bg-gray-700 text-sm"
                            >
                              {optionLabel}
                            </SelectItem>
                          );
                        });
                      })()}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <FieldPicker
                      nodeId={nodeId}
                      workflowId={workflowId}
                      value={item[propName] || ''}
                      onChange={(newValue) => updateItem(index, propName, newValue)}
                      placeholder={propDef.placeholder || `Enter ${propDef.label || 'value'}`}
                      mode="action"
                    />
                    <ExpressionPicker
                      nodes={getNodes()}
                      currentNodeId={nodeId}
                      onSelect={(expression) => {
                        updateItem(index, propName, (item[propName] || '') + expression);
                      }}
                      variant="button"
                      size="sm"
                    />
                  </div>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(index)}
              className="text-red-400 hover:text-red-300 text-xs w-full"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    );
  };

  // Render a single dynamic field based on its definition
  // Render resource mapper (like n8n's column mapping)
  const renderResourceMapper = (fieldName: string, fieldDef: SchemaFieldDef, value: unknown, paramsKey: string) => {
    const mappedValues = (value || {}) as Record<string, string>;
    const columns = dynamicOptions[fieldName] || [];
    const isLoading = loadingDynamicOptions[fieldName];

    return (
      <div key={fieldName} className="space-y-3">
        <Label className="text-white">
          {fieldDef.label || 'Column Mapping'}
          {fieldDef.required && <span className="text-red-400 ml-1">*</span>}
        </Label>

        {isLoading ? (
          <div className="text-gray-400 text-sm p-4 text-center border border-gray-700 rounded">
            Loading columns...
          </div>
        ) : columns.length === 0 ? (
          <div className="text-gray-400 text-sm p-4 text-center border border-gray-700 rounded">
            Select a sheet to see columns
          </div>
        ) : (
          <div className="space-y-3 border border-gray-700 rounded p-4">
            <div className="text-sm text-gray-400 mb-2">
              Enter values for each column:
            </div>
            {columns.map((column: SelectOption | string) => {
              const columnName = column.value || column;
              const columnLabel = column.label || column;

              return (
                <div key={columnName} className="space-y-1">
                  <Label className="text-white text-sm">{columnLabel}</Label>
                  {nodeId ? (
                    <FieldPicker
                      nodeId={nodeId}
                      workflowId={workflowId}
                      value={mappedValues[columnName] || ''}
                      onChange={(newValue) => {
                        const newValues = { ...mappedValues, [columnName]: newValue };
                        handleFieldChange(`${paramsKey}.${fieldName}`, newValues);
                      }}
                      placeholder={`Enter ${columnLabel} or select from previous nodes`}
                    />
                  ) : (
                    <Input
                      value={mappedValues[columnName] || ''}
                      onChange={(e) => {
                        const newValues = { ...mappedValues, [columnName]: e.target.value };
                        handleFieldChange(`${paramsKey}.${fieldName}`, newValues);
                      }}
                      placeholder={`Enter ${columnLabel}`}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render simplified field input for provider mode (context params)
  const renderProviderModeFieldInput = (fieldName: string, fieldDef: SchemaFieldDef, value: unknown, paramsKey: string) => {
    const fieldType = fieldDef.type || 'string';

    // For select fields
    if (fieldType === 'select' || fieldDef.options || fieldDef.enum) {
      const options = fieldDef.options || fieldDef.enum?.map((v: string | { label: string; value: string }) => (typeof v === 'string' ? { label: v, value: v } : v)) || [];
      return (
        <Select
          value={value || ""}
          onValueChange={(val) => handleFieldChange(`${paramsKey}.${fieldName}`, val)}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder={fieldDef.placeholder || `Select ${fieldDef.label || fieldName}`} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {options.map((opt: SelectOption | string) => (
              <SelectItem
                key={typeof opt === 'object' ? opt.value : opt}
                value={typeof opt === 'object' ? opt.value : opt}
                className="text-white hover:bg-gray-700"
              >
                {typeof opt === 'object' ? opt.label : opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // For boolean fields
    if (fieldType === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => handleFieldChange(`${paramsKey}.${fieldName}`, checked)}
          />
          <span className="text-sm text-gray-400">{value ? 'Yes' : 'No'}</span>
        </div>
      );
    }

    // For textarea / long text
    if (fieldType === 'textarea' || fieldDef.inputType === 'textarea') {
      return (
        <Textarea
          value={value || ""}
          onChange={(e) => handleFieldChange(`${paramsKey}.${fieldName}`, e.target.value)}
          placeholder={fieldDef.placeholder || `Enter ${fieldDef.label || fieldName}`}
          className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
        />
      );
    }

    // For object type (JSON)
    if (fieldType === 'object') {
      return (
        <Textarea
          value={typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleFieldChange(`${paramsKey}.${fieldName}`, parsed);
            } catch {
              handleFieldChange(`${paramsKey}.${fieldName}`, e.target.value);
            }
          }}
          placeholder={fieldDef.placeholder || '{ }'}
          className="bg-gray-800 border-gray-700 text-white font-mono text-sm min-h-[80px]"
        />
      );
    }

    // Default: text input
    return (
      <Input
        type={fieldType === 'number' ? 'number' : 'text'}
        value={value || ""}
        onChange={(e) => handleFieldChange(`${paramsKey}.${fieldName}`, e.target.value)}
        placeholder={fieldDef.placeholder || `Enter ${fieldDef.label || fieldName}`}
        className="bg-gray-800 border-gray-700 text-white"
      />
    );
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

  const renderDynamicField = (fieldName: string, fieldDef: SchemaFieldDef, value: unknown, isRequired: boolean, paramsKey: string = 'actionParams') => {
    const fieldType = fieldDef.type || 'string';
    const fieldLabel = fieldDef.label || fieldDef.description || fieldName;
    const isAiControlled = aiControlledFields.has(fieldName);

    // Construct cache key for dynamicOptions (credential-specific)
    const dynamicOptionsCacheKey = fieldDef.dynamicOptions && formData.credentialId
      ? `${fieldName}_${formData.credentialId}`
      : fieldName;

    // In provider mode, show AI-controlled toggle and special UI
    if (nodeMode === 'provider' && isConnectorAction) {
      return (
        <div key={fieldName} className="space-y-2">
          {/* Field Label with AI-controlled toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-white">
              {fieldLabel}
              {isRequired && !isAiControlled && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`ai-${fieldName}`}
                checked={isAiControlled}
                onCheckedChange={() => toggleAiControlled(fieldName)}
                className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <Label
                htmlFor={`ai-${fieldName}`}
                className={cn(
                  "text-xs cursor-pointer",
                  isAiControlled ? "text-cyan-400" : "text-gray-500"
                )}
              >
                AI fills this
              </Label>
            </div>
          </div>

          {/* Show AI indicator or field input */}
          {isAiControlled ? (
            <div className="p-2 bg-cyan-900/20 border border-cyan-700/30 rounded text-xs text-cyan-300">
              <Bot className="w-3 h-3 inline mr-1" />
              AI will generate this value. {fieldDef.aiDescription || fieldDef.description || ''}
            </div>
          ) : (
            <>
              {/* Render the actual field input - simplified for provider mode */}
              {renderProviderModeFieldInput(fieldName, fieldDef, value, paramsKey)}
            </>
          )}
        </div>
      );
    }

    // Handle collection type (Options)
    if (fieldType === 'collection') {
      return renderCollectionField(fieldName, fieldDef, value);
    }

    // Handle fixedCollection type (Query Parameters, Fields)
    if (fieldType === 'fixedCollection') {
      return (
        <div key={fieldName} className="space-y-2">
          {renderFixedCollectionField(fieldName, fieldDef, value)}
        </div>
      );
    }

    // Handle resourceMapper type (dynamic column mapping like n8n)
    if (fieldType === 'resourceMapper') {
      return renderResourceMapper(fieldName, fieldDef, value, paramsKey);
    }

    // Handle array type with file upload items (like mediaFiles for Twitter)
    if (fieldType === 'array' && fieldDef.items?.properties?.fileData) {
      // Detect if this is a video upload field based on field name or mimeType description
      const isVideoField = fieldName.toLowerCase().includes('video') ||
                           fieldDef.items?.properties?.mimeType?.description?.toLowerCase().includes('video');

      // Set appropriate defaults based on media type
      const defaultAccept = isVideoField
        ? 'video/mp4,video/quicktime,video/webm,video/x-msvideo'
        : 'image/jpeg,image/png,image/gif,image/webp';
      const defaultMaxSize = isVideoField ? 1024 : 5; // 1GB for video, 5MB for images

      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-white">
            {fieldLabel}
            {isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <ImageUploadField
            value={value || []}
            onChange={(files) => handleFieldChange(`${paramsKey}.${fieldName}`, files)}
            maxFiles={fieldDef.maxItems || (isVideoField ? 1 : 4)}
            maxSizeInMB={defaultMaxSize}
            accept={fieldDef.items?.properties?.fileData?.accept || defaultAccept}
            error={undefined}
            required={isRequired}
          />
        </div>
      );
    }

    // Handle array type with simple string items (like mediaUrls for Twitter)
    // Exclude 'values' field which has special handling below
    if (fieldType === 'array' && fieldDef.items?.type === 'string' && fieldName !== 'values') {
      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-white">
            {fieldLabel}
            {isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <ArrayStringField
            value={value || []}
            onChange={(urls) => handleFieldChange(`${paramsKey}.${fieldName}`, urls)}
            placeholder={fieldDef.placeholder || `Enter ${fieldLabel?.toLowerCase() || 'value'}`}
            maxItems={fieldDef.maxItems}
            nodes={getNodes()}
            currentNodeId={nodeId}
          />
        </div>
      );
    }

    // Handle array type with itemSchema (like messages in OpenAI)
    // Special handling: For messages field, just show content field with FieldPicker
    if (fieldType === 'array' && fieldDef.itemSchema && fieldName === 'messages') {
      // For messages, we'll render it as a simple textarea with FieldPicker
      // The backend will handle the message structure
      const contentFieldDef = fieldDef.itemSchema.content || {};
      const messageValue = value || '';

      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-white">
            {fieldLabel}
            {isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>

          {nodeId ? (
            <>
              <FieldPicker
                nodeId={nodeId}
                workflowId={workflowId}
                value={messageValue}
                onChange={(newValue) => handleFieldChange(`${paramsKey}.${fieldName}`, newValue)}
                placeholder={contentFieldDef.placeholder || "Enter message or select from previous nodes"}
                mode="action"
                multiline={true}
              />
              <ExpressionPicker
                nodes={getNodes()}
                currentNodeId={nodeId}
                onSelect={(expression) => {
                  handleFieldChange(`${paramsKey}.${fieldName}`, (messageValue || '') + expression);
                }}
                variant="button"
                size="sm"
              />
            </>
          ) : (
            <Textarea
              value={messageValue}
              onChange={(e) => handleFieldChange(`${paramsKey}.${fieldName}`, e.target.value)}
              placeholder={contentFieldDef.placeholder || "Enter message"}
              rows={6}
              className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
            />
          )}
        </div>
      );
    }

    // Handle array type for values field (like in Append Row)
    // Special handling: For values field, show textarea with FieldPicker
    if (fieldType === 'array' && fieldName === 'values') {
      // Convert array to string if needed, handle empty arrays
      let arrayValue = value;
      if (Array.isArray(value)) {
        arrayValue = value.length > 0 ? JSON.stringify(value) : '';
      } else if (value === undefined || value === null) {
        arrayValue = '';
      }
      // console.log('[VALUES FIELD DEBUG] fieldName:', fieldName, 'value:', value, 'arrayValue:', arrayValue, 'paramsKey:', paramsKey);

      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-white">
            {fieldLabel}
            {isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>

          {nodeId ? (
            <>
              <FieldPicker
                nodeId={nodeId}
                workflowId={workflowId}
                value={arrayValue}
                onChange={(newValue) => {
                  // console.log('[VALUES onChange] newValue:', newValue, 'paramsKey:', paramsKey, 'fieldName:', fieldName);
                  handleFieldChange(`${paramsKey}.${fieldName}`, newValue);
                }}
                placeholder={fieldDef.placeholder || "Enter values or select from previous nodes"}
                mode="action"
                multiline={true}
              />
              <ExpressionPicker
                nodes={getNodes()}
                currentNodeId={nodeId}
                onSelect={(expression) => {
                  handleFieldChange(`${paramsKey}.${fieldName}`, (arrayValue || '') + expression);
                }}
                variant="button"
                size="sm"
              />
            </>
          ) : (
            <Textarea
              value={arrayValue}
              onChange={(e) => handleFieldChange(`${paramsKey}.${fieldName}`, e.target.value)}
              placeholder={fieldDef.placeholder || "Enter values as array"}
              rows={4}
              className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
            />
          )}
        </div>
      );
    }

    // Handle rangeSelector type (for Google Sheets range selection)
    if (fieldDef.inputType === 'rangeSelector') {
      // Parse existing value - handles partial values like "A", "A1", "A1:D", "A1:D10"
      const parseRange = (rangeStr: string) => {
        if (!rangeStr || typeof rangeStr !== 'string') {
          return { startCol: '', startRow: '', endCol: '', endRow: '' };
        }

        // Split by colon to separate start and end
        const parts = rangeStr.split(':');
        const startPart = parts[0] || '';
        const endPart = parts[1] || '';

        // Extract column (letters) and row (numbers) from each part
        const extractColRow = (part: string) => {
          const colMatch = part.match(/^([A-Z]+)/i);
          const rowMatch = part.match(/(\d+)$/);
          return {
            col: colMatch ? colMatch[1].toUpperCase() : '',
            row: rowMatch ? rowMatch[1] : ''
          };
        };

        const start = extractColRow(startPart);
        const end = extractColRow(endPart);

        return {
          startCol: start.col,
          startRow: start.row,
          endCol: end.col,
          endRow: end.row
        };
      };

      const parsed = parseRange(value);

      // Generate column options A-Z, then AA-AZ for extended columns
      const columnOptions = [
        ...Array.from({ length: 26 }, (_, i) => ({
          label: String.fromCharCode(65 + i),
          value: String.fromCharCode(65 + i)
        })),
        ...Array.from({ length: 26 }, (_, i) => ({
          label: 'A' + String.fromCharCode(65 + i),
          value: 'A' + String.fromCharCode(65 + i)
        }))
      ];

      const updateRange = (field: 'startCol' | 'startRow' | 'endCol' | 'endRow', newValue: string) => {
        const current = parseRange(value);
        const updated = { ...current, [field]: newValue };

        // Build range string - allow partial values for intermediate states
        let rangeStr = '';
        if (updated.startCol || updated.startRow) {
          rangeStr = `${updated.startCol}${updated.startRow}`;
          if (updated.endCol || updated.endRow) {
            rangeStr += `:${updated.endCol}${updated.endRow}`;
          }
        }

        handleFieldChange(`${paramsKey}.${fieldName}`, rangeStr);
      };

      return (
        <div key={fieldName} className="space-y-3">
          <Label className="text-white">
            {fieldLabel}
            {isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>

          {/* Start Range */}
          <div className="space-y-2">
            <span className="text-xs text-gray-400">Start Cell</span>
            <div className="flex items-center gap-2">
              <Select
                value={parsed.startCol}
                onValueChange={(val) => updateRange('startCol', val)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-24">
                  <SelectValue placeholder="Col" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                  {columnOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={parsed.startRow}
                onChange={(e) => updateRange('startRow', e.target.value)}
                placeholder="Row"
                className="bg-gray-800 border-gray-700 text-white w-24"
              />
            </div>
          </div>

          {/* End Range */}
          <div className="space-y-2">
            <span className="text-xs text-gray-400">End Cell (optional)</span>
            <div className="flex items-center gap-2">
              <Select
                value={parsed.endCol}
                onValueChange={(val) => updateRange('endCol', val)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-24">
                  <SelectValue placeholder="Col" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                  {columnOptions.map((opt) => (
                    <SelectItem key={`end-${opt.value}`} value={opt.value} className="text-white hover:bg-gray-700">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={parsed.endRow}
                onChange={(e) => updateRange('endRow', e.target.value)}
                placeholder="Row"
                className="bg-gray-800 border-gray-700 text-white w-24"
              />
            </div>
          </div>

          {/* Preview */}
          {value && (
            <div className="text-xs text-emerald-400">
              Range: {value}
            </div>
          )}
        </div>
      );
    }

    // Boolean fields - render inline with label
    if (fieldType === 'boolean') {
      return (
        <div key={fieldName} className="flex items-center justify-between py-1">
          <Label className="text-white text-sm">
            {fieldLabel}
          </Label>
          <Switch
            checked={value}
            onCheckedChange={(checked) => handleFieldChange(`${paramsKey}.${fieldName}`, checked)}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      );
    }

    return (
      <div key={fieldName} className="space-y-1.5">
        <Label className="text-white text-sm">
          {fieldLabel}
          {isRequired && <span className="text-red-400 ml-1">*</span>}
        </Label>

        {/* Select fields - Support both static and dynamic options */}
        {(fieldType === 'select' || fieldDef.enum || fieldDef.options || fieldDef.loadOptionsResource || fieldDef.dynamicOptions || dynamicOptions[dynamicOptionsCacheKey]) ? (
          <Select
            value={String(value || '')}
            onValueChange={(val) => {
              // Convert back to number if fieldType is number
              const convertedValue = (fieldType === 'number' || fieldType === 'integer') && val !== 'empty'
                ? Number(val)
                : val === 'empty' ? '' : val;
              handleFieldChange(`${paramsKey}.${fieldName}`, convertedValue);
            }}
            disabled={loadingDynamicOptions[dynamicOptionsCacheKey]}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full">
              <SelectValue placeholder={
                loadingDynamicOptions[dynamicOptionsCacheKey]
                  ? "Loading options..."
                  : fieldDef.placeholder || "Select..."
              } />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {(() => {
                // Use dynamic options if available, otherwise fall back to static options
                let options = dynamicOptions[dynamicOptionsCacheKey] || fieldDef.enum || fieldDef.options || [];

                // Ensure options is always an array
                if (!Array.isArray(options)) {
                  // console.warn(`Options for ${fieldName} is not an array:`, options);
                  options = [];
                }

                if (options.length === 0 && !loadingDynamicOptions[dynamicOptionsCacheKey]) {
                  return (
                    <div className="text-gray-400 text-sm p-4 text-center">
                      {fieldDef.loadOptionsResource
                        ? `No ${fieldDef.label || fieldName} found. Please check your selection.`
                        : 'No options available'}
                    </div>
                  );
                }

                return options.map((option: SelectOption | string) => {
                  const optionValue = typeof option === 'object' ? option.value : option;
                  const optionLabel = typeof option === 'object' ? option.label : option;

                  // Skip null/undefined options
                  if (optionValue === null || optionValue === undefined) {
                    return null;
                  }

                  return (
                    <SelectItem
                      key={String(optionValue || 'empty')}
                      value={String(optionValue || 'empty')}
                      className="text-white hover:bg-gray-700"
                    >
                      {optionLabel || optionValue || 'None'}
                    </SelectItem>
                  );
                });
              })()}
            </SelectContent>
          </Select>
        ) : fieldType === 'number' || fieldType === 'integer' ? (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(`${paramsKey}.${fieldName}`, e.target.valueAsNumber)}
            placeholder={fieldDef.placeholder}
            required={isRequired}
            className="bg-gray-800 border-gray-700 text-white"
          />
        ) : (fieldDef.inputType === 'textarea' || fieldName === 'text' || fieldName === 'replyMarkup') ? (
          <div className="space-y-2">
            {nodeId ? (
              <>
                <FieldPicker
                  nodeId={nodeId}
                  workflowId={workflowId}
                  value={value}
                  onChange={(newValue) => handleFieldChange(`${paramsKey}.${fieldName}`, newValue)}
                  placeholder={fieldDef.placeholder || "Enter value or select from previous nodes"}
                  mode="action"
                  multiline={true}
                />
                <ExpressionPicker
                  nodes={getNodes()}
                  currentNodeId={nodeId}
                  onSelect={(expression) => {
                    handleFieldChange(`${paramsKey}.${fieldName}`, (value || '') + expression);
                  }}
                  variant="button"
                  size="sm"
                />
              </>
            ) : (
              <Textarea
                value={value}
                onChange={(e) => handleFieldChange(`${paramsKey}.${fieldName}`, e.target.value)}
                placeholder={fieldDef.placeholder}
                required={isRequired}
                rows={fieldName === 'replyMarkup' ? 4 : 6}
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
              />
            )}
          </div>
        ) : (
          <>
            {nodeId && (fieldType === 'string' || fieldDef.inputType === 'text') ? (
              <FieldPicker
                nodeId={nodeId}
                workflowId={workflowId}
                value={value}
                onChange={(newValue) => handleFieldChange(`${paramsKey}.${fieldName}`, newValue)}
                placeholder={fieldDef.placeholder || fieldDef.description || "Enter value"}
                mode="action"
              />
            ) : (
              <Input
                type={fieldDef.inputType || 'text'}
                value={
                  fieldDef.inputType === 'datetime-local' && value
                    ? value.substring(0, 16)
                    : value
                }
                onChange={(e) => {
                  const newValue =
                    fieldDef.inputType === 'datetime-local' && e.target.value && !e.target.value.includes(':00:00')
                      ? e.target.value + ':00'
                      : e.target.value;
                  handleFieldChange(`${paramsKey}.${fieldName}`, newValue);
                }}
                placeholder={fieldDef.placeholder}
                required={isRequired}
                className="bg-gray-800 border-gray-700 text-white w-full"
              />
            )}
          </>
        )}
        
      </div>
    );
  };

  // Render webhook trigger fields with basic/advanced sections
  const renderWebhookTriggerFields = () => {
    const basicFields = ['httpMethod', 'authType'];
    const advancedFields = ['authData', 'responseMode', 'responseCode', 'responseBody', 'responseHeaders', 'corsEnabled', 'corsOrigin', 'ipWhitelist', 'ignoreBots'];

    return (
      <>
        {/* Basic Fields */}
        {configFields
          .filter((field) => basicFields.includes(field.name))
          .map(renderField)}

        {/* Advanced Options */}
        {configFields.some((field) => advancedFields.includes(field.name)) && (
          <div className="border-t border-gray-700 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-gray-400 hover:text-white p-0 h-auto"
            >
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              Advanced Options
            </Button>

            {showAdvancedOptions && (
              <div className="mt-4 space-y-4">
                {configFields
                  .filter((field) => advancedFields.includes(field.name))
                  .map(renderField)}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderField = (field: NodeConfigField) => {
    // Check displayOptions before rendering
    if (field.displayOptions && !shouldShowField(field.displayOptions, formData, field.name)) {
      return null;
    }

    const value = formData[field.name] ?? field.defaultValue ?? "";

    switch (field.type) {
      case "text":
        // console.log('[DynamicNodeConfigModal] Rendering text field:', field.name, 'nodeId:', nodeId, 'workflowId:', workflowId);
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            {nodeId ? (
              <FieldPicker
                nodeId={nodeId}
                workflowId={workflowId}
                value={value}
                onChange={(newValue) => handleFieldChange(field.name, newValue)}
                placeholder={field.placeholder || "Enter value or select from previous nodes"}
                mode="action"
              />
            ) : (
              <Input
                id={field.name}
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="bg-gray-800 border-gray-700 text-white"
              />
            )}
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );

      case "textarea":
        // console.log('[DynamicNodeConfigModal] Rendering textarea field:', field.name, 'nodeId:', nodeId, 'workflowId:', workflowId);
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            {nodeId ? (
              <FieldPicker
                nodeId={nodeId}
                workflowId={workflowId}
                value={value}
                onChange={(newValue) => handleFieldChange(field.name, newValue)}
                placeholder={field.placeholder || "Enter value or select from previous nodes"}
                mode="action"
                multiline={true}
              />
            ) : (
              <Textarea
                id={field.name}
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                rows={4}
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
              />
            )}
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );

      case "code":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={8}
              className="bg-gray-950 border-gray-700 text-green-400 font-mono text-sm"
            />
          </div>
        );

      case "select":
        // Dynamic credential selection for nodes that require credentials
        if (field.name === "credentialId" && requiresCredentials) {
          // Get a user-friendly name for the credential type
          const credentialTypeName = nodeDefinition?.label?.replace(' Chat Model', '').replace(' Memory', '') || 'Credential';

          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name} className="text-white">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              <div className="flex gap-2">
                <Select
                  value={value}
                  onValueChange={(val) => handleFieldChange(field.name, val)}
                  disabled={loadingCredentials}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white flex-1">
                    <SelectValue placeholder={loadingCredentials ? "Loading..." : field.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {credentials.length === 0 ? (
                      <div className="text-gray-400 text-sm p-4 text-center">
                        No {credentialTypeName} credentials found.
                        <br />
                        Please add a credential first.
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
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setShowAddCredentialModal(true)}
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  title={`Add new ${credentialTypeName} credential`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {value && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleTestCredential}
                    disabled={testingCredential}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    title="Test connection"
                  >
                    {testingCredential ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              {field.description && (
                <p className="text-xs text-gray-400">{field.description}</p>
              )}
            </div>
          );
        }

        // Regular select field
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleFieldChange(field.name, val)}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={field.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {field.options?.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-white hover:bg-gray-700"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.valueAsNumber)}
              placeholder={field.placeholder}
              required={field.required}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        );

      case "toggle":
        return (
          <div key={field.name} className="flex items-center justify-between py-2">
            <Label htmlFor={field.name} className="text-white">
              {field.label}
            </Label>
            <Switch
              id={field.name}
              checked={value}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
          </div>
        );

      case "conditions":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
            <ConditionsBuilder
              value={value || field.defaultValue}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
              description=""
              nodeId={nodeId || undefined}
            />
          </div>
        );

      case "rules":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
            <RulesBuilder
              value={value || field.defaultValue}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
              description=""
              nodeId={nodeId || undefined}
            />
          </div>
        );

      case "formFields":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
            <FormFieldsBuilder
              value={value || field.defaultValue || []}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
            />
          </div>
        );

      case "schedule":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
            <ScheduleBuilder
              value={value || field.defaultValue}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (!nodeDefinition) return null;

  const Icon = nodeDefinition.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 text-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${nodeDefinition.color}-500/20 rounded-lg`}>
                <Icon className={`size-6 text-${nodeDefinition.color}-400`} />
              </div>
              <div>
                <div className="text-white">
                  {isConnectorTrigger && isConnectorLocked && formData.connectorDisplayName
                    ? `${formData.connectorDisplayName} Trigger`
                    : nodeDefinition.label}
                </div>
                <div className="text-sm text-gray-400 font-normal">
                  {isConnectorTrigger && isConnectorLocked && formData.description
                    ? formData.description
                    : nodeDefinition.description}
                </div>
              </div>
            </div>

            {/* Top Right: Execute Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={executeNode}
                disabled={executing || !workflowId}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                size="sm"
              >
                {executing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {nodeMode === 'provider' ? 'Saving...' : 'Executing...'}
                  </>
                ) : (
                  <>
                    {nodeMode === 'provider' ? (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Save as Tool
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Execute Step
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

      {/* Execution Result */}
      {executionResult && (
        <Alert className={cn(
          "border",
          executionResult.success || executionResult.status === 'success'
            ? "border-green-800 bg-green-950/50"
            : "border-red-800 bg-red-950/50"
        )}>
          {executionResult.success || executionResult.status === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <AlertTitle className="text-sm">
            {executionResult.success || executionResult.status === 'success' ? 'Success' : 'Failed'}
          </AlertTitle>
          <AlertDescription className="text-xs text-gray-400 mt-1">
            {executionResult.success || executionResult.status === 'success'
              ? 'Node executed successfully'
              : executionResult.error?.message || executionResult.error || 'Execution failed'}
          </AlertDescription>
        </Alert>
      )}

      {/* Webhook URL Display for Trigger Nodes */}
      {(isConnectorTrigger || isWebhookTrigger) && webhookUrl && (
        <div className="border border-gray-800 rounded-lg p-4 bg-gray-950/50 space-y-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-cyan-400" />
            <Label className="text-sm font-medium">
              {verifyToken ? 'Webhook Configuration' : 'Webhook URL'}
            </Label>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Webhook URL</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-gray-900 rounded border border-gray-800 font-mono text-xs text-gray-300 break-all">
                {loadingWebhook ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                ) : webhookUrl}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyWebhookUrl}
                disabled={!webhookUrl || loadingWebhook}
                className="h-9 w-9 p-0"
                title={copied ? 'Copied!' : 'Copy webhook URL'}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Verify Token (for Facebook) */}
          {verifyToken && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Verify Token</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-gray-900 rounded border border-gray-800 font-mono text-xs text-gray-300 break-all">
                  {verifyToken}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyVerifyToken}
                  disabled={!verifyToken}
                  className="h-9 w-9 p-0"
                  title={copiedToken ? 'Copied!' : 'Copy verify token'}
                >
                  {copiedToken ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Use this token when setting up the webhook in Facebook App Dashboard
              </p>
            </div>
          )}
        </div>
      )}

      {isConnectorTrigger ? (
        // For trigger nodes, show form with webhook info if needed
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {renderConnectorTriggerFields()}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      ) : (
        // For other nodes, use the regular form
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {isConnectorAction ? (
            // Dynamic connector ACTION field rendering
            renderConnectorFields()
          ) : isWebhookTrigger ? (
            // Webhook trigger with basic/advanced sections
            renderWebhookTriggerFields()
          ) : configFields.length > 0 ? (
            // Regular node configuration fields
            configFields.map(renderField)
          ) : (
            <div className="text-center text-gray-400 py-8">
              <p>This node has no configuration options.</p>
              <p className="text-sm mt-2">It will execute with default settings.</p>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      )}
      </DialogContent>
      
      {/* Add Credential Modal */}
      <AddCredentialModalV2
        isOpen={showAddCredentialModal}
        onClose={() => setShowAddCredentialModal(false)}
        nodeId={nodeId || undefined}
        preSelectedConnector={connectorType}
        connectors={connectors.filter(c => {
          // For nodes with connectorTypeForCredentials property (dynamic credential handling)
          if (requiresCredentials && credentialConnectorType) {
            // If wildcard "*", show all connectors (for HTTP Request and other generic nodes)
            if (credentialConnectorType === "*") {
              return true;
            }
            return c.name === credentialConnectorType;
          }
          // For connector actions/triggers, use the connectorType from formData
          return c.name === connectorType;
        })}
        onSuccess={async (credentialId) => {
          setShowAddCredentialModal(false);

          // Small delay to ensure database transaction is complete
          await new Promise(resolve => setTimeout(resolve, 500));

          // Refresh credentials first (before selecting) to ensure the new credential is in the list
          setLoadingCredentials(true);
          try {
            if (requiresCredentials && credentialConnectorType) {
              // Re-fetch credentials for nodes with connectorTypeForCredentials property
              const response = await api.get('/connectors');
              let allConnectors = [];
              if (response.connectors && Array.isArray(response.connectors)) {
                allConnectors = response.connectors;
              } else if (Array.isArray(response)) {
                allConnectors = response;
              } else if (response.data && Array.isArray(response.data)) {
                allConnectors = response.data;
              }

              // Filter for the specific connector type (or show all if "*")
              const filteredCredentials = credentialConnectorType === "*"
                ? allConnectors
                : allConnectors.filter((conn: CredentialItem) =>
                    conn.connector_type === credentialConnectorType || conn.connectorType === credentialConnectorType
                  );
              setCredentials(filteredCredentials);
            } else {
              // For connector actions/triggers, fetch credentials for connector type
              await fetchCredentials();
            }
          } catch (error) {
            console.error('Failed to refresh credentials:', error);
          } finally {
            setLoadingCredentials(false);
          }

          // Now auto-select the new credential after refresh
          if (credentialId) {
            setFormData(prev => ({
              ...prev,
              credentialId: credentialId
            }));

            // Update the node data immediately
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      credentialId: credentialId,
                    },
                  };
                }
                return node;
              })
            );
          }

          toast.success('Credential added successfully');
        }}
      />
    </Dialog>
  );
}
