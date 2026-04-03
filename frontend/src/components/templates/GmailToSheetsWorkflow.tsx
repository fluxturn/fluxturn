import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlowProvider,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Mail, Code, Table, Play, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

/**
 * Gmail to Google Sheets Lead Tracker Workflow
 *
 * This workflow automatically:
 * 1. Monitors Gmail for emails with "Leads" label
 * 2. Parses email data (sender, subject, body)
 * 3. Appends the lead to a Google Sheets spreadsheet
 *
 * Template Structure:
 * - Node 1: Gmail Trigger (CONNECTOR_TRIGGER)
 * - Node 2: Parse Email Data (RUN_CODE)
 * - Node 3: Add to Google Sheets (CONNECTOR_ACTION)
 */

// Define the initial workflow nodes based on the template
const initialNodes: Node[] = [
  {
    id: 'gmail_trigger_1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: {
      label: 'New Gmail with Label',
      icon: <Mail className="w-6 h-6" />,
      connector: 'gmail',
      triggerId: 'email_received',
      category: 'trigger',
      description: 'Triggers when a new email is received',
      color: 'from-red-500 to-orange-500',
      config: {
        labelName: 'Leads',
        pollInterval: 300,
      },
      configSchema: {
        labelName: {
          type: 'string',
          label: 'Label Name',
          description: 'Gmail label to monitor',
          required: true,
        },
        pollInterval: {
          type: 'number',
          label: 'Poll Interval (seconds)',
          default: 300,
          description: 'How often to check for new emails',
        },
      },
      outputSchema: {
        from: 'Sender email address',
        subject: 'Email subject',
        body: 'Email body content',
        snippet: 'Email preview snippet',
      },
    },
  },
  {
    id: 'set_parse_1',
    type: 'custom',
    position: { x: 400, y: 100 },
    data: {
      label: 'Map Email Fields',
      icon: <Code className="w-6 h-6" />,
      category: 'utility',
      description: 'Map and transform email fields (no code required)',
      color: 'from-blue-500 to-cyan-500',
      config: {
        mode: 'manual',
        fieldsToSet: [
          {
            name: 'email',
            value: '={{$json.from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/)[0]}}',
          },
          {
            name: 'name',
            value: '={{$json.from.split("<")[0].trim()}}',
          },
          {
            name: 'subject',
            value: '={{$json.subject}}',
          },
          {
            name: 'message',
            value: '={{($json.body || $json.snippet).substring(0, 500)}}',
          },
          {
            name: 'receivedDate',
            value: '={{$json.receivedDate || new Date().toISOString()}}',
          },
          {
            name: 'source',
            value: 'Gmail',
          },
        ],
        includeOtherFields: false,
      },
      configSchema: {
        mode: {
          type: 'select',
          label: 'Mode',
          options: [
            { label: 'Manual Mapping', value: 'manual' },
            { label: 'JSON', value: 'json' },
          ],
          default: 'manual',
          description: 'How to set fields',
        },
        fieldsToSet: {
          type: 'array',
          label: 'Fields to Set',
          description: 'Fields to add or modify',
          itemSchema: {
            name: { type: 'string', label: 'Field Name', required: true },
            value: { type: 'string', label: 'Field Value', required: true },
          },
        },
        includeOtherFields: {
          type: 'boolean',
          label: 'Include Other Fields',
          default: false,
          description: 'Include fields from input that are not being set',
        },
      },
      inputSchema: {
        input: {
          type: 'object',
          required: false,
          description: 'Input data from previous node',
        },
      },
      outputSchema: {
        name: 'Contact name (extracted from "Name <email>" format)',
        email: 'Email address (extracted using regex)',
        subject: 'Email subject',
        message: 'Email message (truncated to 500 chars)',
        receivedDate: 'When the email was received',
        source: 'Source (Gmail)',
      },
    },
  },
  {
    id: 'sheets_append_1',
    type: 'custom',
    position: { x: 700, y: 100 },
    data: {
      label: 'Add to Leads Sheet',
      icon: <Table className="w-6 h-6" />,
      connector: 'google_sheets',
      actionId: 'append_row',
      category: 'action',
      description: 'Append a row to a Google Sheet',
      color: 'from-green-500 to-emerald-500',
      config: {
        spreadsheetId: '{{your_spreadsheet_id}}',
        sheetName: 'Leads',
        values: '={{$json}}',
      },
      configSchema: {
        spreadsheetId: {
          type: 'string',
          required: true,
          label: 'Spreadsheet ID',
          description: 'The ID of your Google Sheets spreadsheet',
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        },
        sheetName: {
          type: 'string',
          label: 'Sheet Name',
          default: 'Sheet1',
          description: 'Name of the sheet tab',
        },
        values: {
          type: 'object',
          required: true,
          label: 'Values',
          description: 'Data to append (use ={{$json}} for previous node output)',
        },
      },
      outputSchema: {
        rowNumber: 'The row number where data was appended',
      },
    },
  },
];

// Define the initial edges connecting the nodes
const initialEdges: Edge[] = [
  {
    id: 'e1',
    source: 'gmail_trigger_1',
    target: 'code_parse_1',
    sourceHandle: 'source-1',
    targetHandle: 'target-1',
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#06b6d4',
    },
    style: {
      strokeWidth: 2,
      stroke: '#06b6d4',
    },
  },
  {
    id: 'e2',
    source: 'set_parse_1',
    target: 'sheets_append_1',
    sourceHandle: 'source-1',
    targetHandle: 'target-1',
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#06b6d4',
    },
    style: {
      strokeWidth: 2,
      stroke: '#06b6d4',
    },
  },
];

// Custom Node Component
interface CustomNodeProps {
  data: any;
  selected: boolean;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const [showConfig, setShowConfig] = useState(false);
  const status = data.status; // 'success', 'error', 'loading', or undefined

  return (
    <div
      className={`relative bg-white rounded-xl border-2 transition-all shadow-lg min-w-[240px] ${
        selected
          ? 'border-cyan-500 shadow-cyan-500/30'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Header with gradient background */}
      <div
        className={`px-4 py-3 rounded-t-xl bg-gradient-to-r ${data.color} text-white flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          {data.icon}
          <span className="font-semibold">{data.label}</span>
        </div>
        {status && (
          <div>
            {status === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-green-300" />
            )}
            {status === 'error' && (
              <XCircle className="w-5 h-5 text-red-300" />
            )}
            {status === 'loading' && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 bg-white rounded-b-xl">
        <p className="text-xs text-gray-600 mb-2">{data.description}</p>

        {/* Configuration Preview */}
        {data.config && (
          <div className="mt-2 space-y-1">
            {Object.entries(data.config)
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="text-gray-500">{key}:</span>{' '}
                  <span className="text-gray-700 font-mono">
                    {String(value).length > 30
                      ? String(value).substring(0, 30) + '...'
                      : String(value)}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && data.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {data.error}
          </div>
        )}

        {/* Settings Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConfig(!showConfig)}
          className="mt-3 w-full text-xs"
        >
          <Settings className="w-3 h-3 mr-1" />
          {showConfig ? 'Hide' : 'Show'} Configuration
        </Button>

        {/* Expanded Configuration */}
        {showConfig && (
          <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
            <h4 className="text-xs font-bold text-gray-900 mb-2">
              Configuration
            </h4>
            {data.configSchema &&
              Object.entries(data.configSchema).map(([key, schema]: [string, any]) => (
                <div key={key} className="text-xs">
                  <label className="block text-gray-700 font-semibold mb-1">
                    {schema.label}
                    {schema.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <p className="text-gray-500 mb-1 text-xs">
                    {schema.description}
                  </p>
                  <div className="font-mono text-xs text-gray-600 bg-white p-2 rounded border">
                    {data.config[key] || schema.default || schema.placeholder || 'Not set'}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Handles (connection points) */}
      <div
        className="absolute top-1/2 -left-2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full transform -translate-y-1/2"
        style={{ pointerEvents: 'all' }}
      />
      <div
        className="absolute top-1/2 -right-2 w-4 h-4 bg-cyan-500 border-2 border-white rounded-full transform -translate-y-1/2"
        style={{ pointerEvents: 'all' }}
      />
    </div>
  );
};

// Node types mapping
const nodeTypes = {
  custom: CustomNode,
};

// Main Workflow Component
const GmailToSheetsWorkflowInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isExecuting, setIsExecuting] = useState(false);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#06b6d4',
            },
            style: {
              strokeWidth: 2,
              stroke: '#06b6d4',
            },
          },
          eds
        )
      ),
    [setEdges]
  );

  // Simulate workflow execution
  const handleExecute = async () => {
    setIsExecuting(true);
    toast.info('Starting workflow execution...');

    try {
      // Step 1: Gmail Trigger
      toast.info('Step 1: Checking Gmail for new emails with "Leads" label...');
      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'gmail_trigger_1'
            ? { ...node, data: { ...node.data, status: 'loading' } }
            : node
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate email received
      const emailData = {
        from: 'John Doe <john.doe@example.com>',
        subject: 'Interested in your product',
        body: 'Hi, I would like to learn more about your automation platform...',
        snippet: 'Hi, I would like to learn more...',
        receivedDate: new Date().toISOString(),
      };

      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'gmail_trigger_1'
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'success',
                  outputData: emailData,
                },
              }
            : node
        )
      );
      toast.success('Step 1: New email received from John Doe');

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Map Email Fields
      toast.info('Step 2: Mapping email fields using SET node...');
      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'set_parse_1'
            ? { ...node, data: { ...node.data, status: 'loading' } }
            : node
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate SET node field mapping (no code execution)
      const parsedData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        subject: 'Interested in your product',
        message: 'Hi, I would like to learn more about your automation platform...',
        receivedDate: emailData.receivedDate,
        source: 'Gmail',
      };

      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'set_parse_1'
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'success',
                  outputData: parsedData,
                },
              }
            : node
        )
      );
      toast.success('Step 2: Email fields mapped successfully (no code used)');

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Append to Google Sheets
      toast.info('Step 3: Adding lead to Google Sheets...');
      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'sheets_append_1'
            ? { ...node, data: { ...node.data, status: 'loading' } }
            : node
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'sheets_append_1'
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'success',
                  outputData: { rowNumber: 42 },
                },
              }
            : node
        )
      );
      toast.success('Step 3: Lead added to row 42 in Google Sheets');

      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success('✅ Workflow completed successfully!', {
        description: 'Lead from John Doe has been added to your spreadsheet',
        duration: 5000,
      });
    } catch (error: any) {
      toast.error('Workflow execution failed', {
        description: error.message || 'Unknown error',
      });
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            status: 'error',
            error: error.message || 'Execution failed',
          },
        }))
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Reset workflow
  const handleReset = () => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: undefined,
          error: undefined,
          outputData: undefined,
        },
      }))
    );
    toast.info('Workflow reset');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gmail to Google Sheets Lead Tracker
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Automatically log leads from Gmail to Google Sheets
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isExecuting}
            >
              Reset
            </Button>
            <Button
              onClick={handleExecute}
              disabled={isExecuting}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Workflow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2, stroke: '#06b6d4' },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data;
              if (data.status === 'success') return '#10b981';
              if (data.status === 'error') return '#ef4444';
              if (data.status === 'loading') return '#3b82f6';
              return '#d1d5db';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* Info Panel */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-gray-900">Gmail Trigger</span>
            </div>
            <p className="text-xs text-gray-600">
              Monitors Gmail for emails with "Leads" label every 5 minutes
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Map Fields (SET)</span>
            </div>
            <p className="text-xs text-gray-600">
              Maps email fields visually - no code required!
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Table className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900">Add to Sheets</span>
            </div>
            <p className="text-xs text-gray-600">
              Appends the lead data to your Google Sheets spreadsheet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component with ReactFlowProvider
export const GmailToSheetsWorkflow: React.FC = () => {
  return (
    <ReactFlowProvider>
      <GmailToSheetsWorkflowInner />
    </ReactFlowProvider>
  );
};

export default GmailToSheetsWorkflow;
