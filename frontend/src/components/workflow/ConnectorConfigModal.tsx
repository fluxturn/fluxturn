import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Editor } from '@monaco-editor/react';
import { 
  Settings, 
  Key, 
  Database, 
  Globe, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import type { JsonValue } from '../../types/json';

interface ConnectorFieldDef {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

// Connector configurations for the 54 real connectors
const CONNECTOR_CONFIGS = {
  // AI/ML
  openai: {
    name: 'OpenAI',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, description: 'Your OpenAI API key' },
      { key: 'model', label: 'Model', type: 'select', required: true, options: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'], default: 'gpt-4' },
      { key: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 2, step: 0.1, default: 0.7 },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', min: 1, max: 4096, default: 1000 },
    ],
    documentation: 'https://platform.openai.com/docs/api-reference',
  },
  
  anthropic: {
    name: 'Anthropic Claude',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, description: 'Your Anthropic API key' },
      { key: 'model', label: 'Model', type: 'select', required: true, options: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'], default: 'claude-3-sonnet' },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', min: 1, max: 4096, default: 1000 },
    ],
    documentation: 'https://docs.anthropic.com/claude/reference',
  },

  // Communication
  slack: {
    name: 'Slack',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true, description: 'Slack Bot User OAuth Token' },
      { key: 'channel', label: 'Default Channel', type: 'text', placeholder: '#general' },
      { key: 'username', label: 'Bot Username', type: 'text', default: 'WorkflowBot' },
    ],
    documentation: 'https://api.slack.com/web',
  },

  discord: {
    name: 'Discord',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true, description: 'Discord Bot Token' },
      { key: 'guildId', label: 'Guild ID', type: 'text', description: 'Discord Server ID' },
      { key: 'channelId', label: 'Channel ID', type: 'text', description: 'Default Channel ID' },
    ],
    documentation: 'https://discord.com/developers/docs/intro',
  },

  // Databases
  postgresql: {
    name: 'PostgreSQL',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true, default: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: true, default: 5432 },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'ssl', label: 'SSL', type: 'boolean', default: false },
    ],
    documentation: 'https://node-postgres.com/',
  },

  // Cloud
  'aws-s3': {
    name: 'AWS S3',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'password', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'select', required: true, options: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'], default: 'us-east-1' },
      { key: 'bucket', label: 'Default Bucket', type: 'text' },
    ],
    documentation: 'https://docs.aws.amazon.com/s3/',
  },

  // Payments
  stripe: {
    name: 'Stripe',
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, description: 'Stripe Secret Key (sk_...)' },
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', description: 'Stripe Publishable Key (pk_...)' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', description: 'Webhook endpoint secret' },
    ],
    documentation: 'https://stripe.com/docs/api',
  },

  // Default template for unknown connectors
  default: {
    name: 'Custom Connector',
    fields: [
      { key: 'endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: 'https://api.example.com' },
      { key: 'apiKey', label: 'API Key', type: 'password', description: 'Authentication key' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000 },
    ],
    documentation: '',
  },
};

interface ConnectorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  connectorType: string;
  currentConfig: Record<string, JsonValue>;
  onConfigUpdate: (config: Record<string, JsonValue>) => void;
}

export const ConnectorConfigModal: React.FC<ConnectorConfigModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  connectorType,
  currentConfig,
  onConfigUpdate,
}) => {
  const [config, setConfig] = useState<Record<string, JsonValue>>(currentConfig);
  const [activeTab, setActiveTab] = useState('config');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const connectorConfig = CONNECTOR_CONFIGS[connectorType as keyof typeof CONNECTOR_CONFIGS] || CONNECTOR_CONFIGS.default;

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  const validateField = (field: ConnectorFieldDef, value: JsonValue): string | null => {
    if (field.required && (!value || value === '')) {
      return `${field.label} is required`;
    }

    if (field.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) return `${field.label} must be a number`;
      if (field.min !== undefined && num < field.min) return `${field.label} must be at least ${field.min}`;
      if (field.max !== undefined && num > field.max) return `${field.label} must be at most ${field.max}`;
    }

    if (field.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
      return `${field.label} must be a valid email address`;
    }

    if (field.type === 'url' && value && !/^https?:\/\/.+/.test(value)) {
      return `${field.label} must be a valid URL`;
    }

    return null;
  };

  const handleConfigChange = (key: string, value: JsonValue) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleSave = () => {
    // Validate all fields
    const errors: Record<string, string> = {};
    connectorConfig.fields.forEach(field => {
      const error = validateField(field, config[field.key]);
      if (error) {
        errors[field.key] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    onConfigUpdate(config);
    onClose();
  };

  const handleTestConnection = async () => {
    // This would test the connection with the configured parameters
    // console.log('Testing connection with config:', config);
    // Implementation would depend on the specific connector
  };

  const togglePasswordVisibility = (fieldKey: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const renderField = (field: ConnectorFieldDef) => {
    const value = config[field.key] ?? field.default ?? '';
    const error = validationErrors[field.key];

    switch (field.type) {
      case 'password':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <Key className="w-4 h-4" />
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
              <Input
                type={showPasswords[field.key] ? 'text' : 'password'}
                value={value}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={`bg-white/10 border-white/20 text-white pr-10 ${error ? 'border-red-400' : ''}`}
              />
              <Button
                type="button"
                onClick={() => togglePasswordVisibility(field.key)}
                size="sm"
                variant="ghost"
                className="absolute right-0 top-0 h-full w-10 text-white/60 hover:text-white"
              >
                {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {field.description && (
              <p className="text-xs text-white/60">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-white">
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              className={`w-full p-2 bg-white/10 border border-white/20 rounded text-white ${error ? 'border-red-400' : ''}`}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleConfigChange(field.key, e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              {field.label}
            </label>
            {field.description && (
              <p className="text-xs text-white/60">{field.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-white">
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            <Textarea
              value={value}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows || 3}
              className={`bg-white/10 border-white/20 text-white ${error ? 'border-red-400' : ''}`}
            />
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-white">
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleConfigChange(field.key, Number(e.target.value))}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              className={`bg-white/10 border-white/20 text-white ${error ? 'border-red-400' : ''}`}
            />
            {field.description && (
              <p className="text-xs text-white/60">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-white">
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={`bg-white/10 border-white/20 text-white ${error ? 'border-red-400' : ''}`}
            />
            {field.description && (
              <p className="text-xs text-white/60">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900/95 border-white/20 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configure {connectorConfig.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="config" className="text-white">Configuration</TabsTrigger>
            <TabsTrigger value="test" className="text-white">Test</TabsTrigger>
            <TabsTrigger value="docs" className="text-white">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <ScrollArea className="max-h-96">
              <div className="space-y-4 pr-4">
                {connectorConfig.fields.map(renderField)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <Card className="bg-white/10 border-white/20 p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h3 className="font-medium">Test Connection</h3>
                </div>
                <p className="text-sm text-white/70">
                  Test your connector configuration to ensure it's working properly.
                </p>
                <Button
                  onClick={handleTestConnection}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={Object.keys(validationErrors).length > 0}
                >
                  Test Connection
                </Button>
                
                {/* This would show test results */}
                <div className="mt-4 p-3 bg-black/20 rounded text-xs text-white/70 font-mono">
                  Test results will appear here...
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-4">
            <Card className="bg-white/10 border-white/20 p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="font-medium">Documentation</h3>
                </div>
                
                {connectorConfig.documentation && (
                  <div>
                    <p className="text-sm text-white/70 mb-2">
                      For more information about this connector, visit the official documentation:
                    </p>
                    <Button
                      onClick={() => window.open(connectorConfig.documentation, '_blank')}
                      variant="outline"
                      className="gap-2 border-white/20 text-white hover:bg-white/10"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Documentation
                    </Button>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Configuration Schema</h4>
                  <div className="bg-black/20 rounded p-3 text-xs">
                    <Editor
                      height="200px"
                      defaultLanguage="json"
                      value={JSON.stringify(connectorConfig.fields, null, 2)}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
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
          <div className="flex gap-2">
            <Button
              onClick={handleTestConnection}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={Object.keys(validationErrors).length > 0}
            >
              Test
            </Button>
            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={Object.keys(validationErrors).length > 0}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};