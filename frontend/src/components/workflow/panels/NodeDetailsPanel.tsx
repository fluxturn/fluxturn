import { useState, useEffect } from 'react';
import { X, Settings, Webhook, Sparkles, AlertCircle, Copy, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NodeData {
  label?: string;
  connectorType?: string;
  triggerId?: string;
  [key: string]: unknown;
}

interface WebhookInfo {
  webhookUrl: string;
  connectorType?: string;
  triggerType?: string;
  httpsRequired?: boolean;
  isHttps?: boolean;
}

interface ExecutionResultInfo {
  success?: boolean;
  status?: string;
  error?: { message?: string } | string;
}

interface NodeDetailsPanelProps {
  nodeId: string;
  nodeData: NodeData;
  nodeType: string;
  workflowId?: string;
  onClose: () => void;
  onConfigure: () => void;
}

export function NodeDetailsPanel({
  nodeId,
  nodeData,
  nodeType,
  workflowId,
  onClose,
  onConfigure
}: NodeDetailsPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResultInfo | null>(null);

  const isTriggerNode = nodeType?.includes('TRIGGER') || nodeType === 'CONNECTOR_TRIGGER';
  const connectorType = nodeData?.connectorType;
  const isWebhookTrigger = connectorType === 'telegram' || connectorType === 'gmail' || connectorType === 'facebook_graph';

  // Fetch webhook URL if this is a trigger node
  useEffect(() => {
    const fetchWebhookUrl = async () => {
      if (!workflowId || !isWebhookTrigger) return;

      setLoadingWebhook(true);
      try {
        const response = await api.get(`/workflow/${workflowId}/webhook-url`);

        // Find the webhook for this specific trigger
        const triggerWebhook = response.webhooks?.find(
          (w: WebhookInfo) => w.connectorType === connectorType || w.triggerType === `${connectorType?.toUpperCase()}_TRIGGER`
        );

        if (triggerWebhook) {
          setWebhookUrl(triggerWebhook.webhookUrl);
          setWebhookInfo(triggerWebhook);
        }
      } catch (error) {
        console.error('Failed to fetch webhook URL:', error);
      } finally {
        setLoadingWebhook(false);
      }
    };

    fetchWebhookUrl();
  }, [workflowId, connectorType, isWebhookTrigger]);

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

  const executeNode = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow first');
      return;
    }

    try {
      setExecuting(true);
      setExecutionResult(null);
      toast.info('Executing node...');

      // Execute single node via API
      const result = await api.post(`/workflow/${workflowId}/execute-node`, {
        nodeId: nodeId,
        testData: {
          test: true,
          executedAt: new Date().toISOString()
        }
      });

      // console.log('Node execution result:', result);
      setExecutionResult(result);

      // Check if execution was successful
      if (result.success || result.status === 'success') {
        toast.success('Node executed successfully!');
      } else {
        toast.error(result.error?.message || 'Node execution failed');
      }
    } catch (error: unknown) {
      console.error('Node execution error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to execute node';
      toast.error(msg);
      setExecutionResult({ success: false, error: msg });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed top-16 right-4 w-80 z-40 animate-in slide-in-from-right duration-200">
      <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-cyan-400" />
            <h3 className="font-medium text-white">Node Details</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Node Info */}
          <div>
            <div className="text-xs text-gray-400 mb-1">Node Name</div>
            <div className="text-sm text-white font-medium">{nodeData?.label || 'Unnamed Node'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-1">Node Type</div>
            <Badge variant="secondary" className="text-xs">
              {nodeType?.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Webhook URL Section for Trigger Nodes */}
          {isTriggerNode && isWebhookTrigger && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-cyan-400" />
                <div className="text-sm font-medium text-white">Webhook URL</div>
              </div>

              {/* Webhook URL Display */}
              {loadingWebhook ? (
                <div className="text-xs text-gray-400">Loading...</div>
              ) : webhookUrl ? (
                <>
                  <div className="relative">
                    <div className="p-2 bg-gray-950 rounded border border-gray-800 font-mono text-xs text-gray-300 break-all pr-10">
                      {webhookUrl}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyWebhookUrl}
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      title={copied ? 'Copied!' : 'Copy URL'}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Automatic Setup Badge */}
                  <Alert className="border-cyan-800/50 bg-cyan-950/30 py-2 px-3">
                    <Sparkles className="h-3 w-3 text-cyan-400" />
                    <AlertTitle className="text-xs text-cyan-300 font-medium mb-0">
                      Automatic Setup
                    </AlertTitle>
                    <AlertDescription className="text-xs text-gray-300 mt-1">
                      Activated when you activate the workflow
                    </AlertDescription>
                  </Alert>

                  {/* HTTPS Warning */}
                  {webhookInfo?.httpsRequired && !webhookInfo?.isHttps && (
                    <Alert className="border-yellow-800/50 bg-yellow-950/30 py-2 px-3">
                      <AlertCircle className="h-3 w-3 text-yellow-400" />
                      <AlertTitle className="text-xs text-yellow-300 font-medium mb-0">
                        HTTPS Required
                      </AlertTitle>
                      <AlertDescription className="text-xs text-gray-300 mt-1">
                        Use ngrok for local dev:<br />
                        <code className="text-xs bg-gray-950 px-1 py-0.5 rounded">ngrok http 3000</code>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-400">
                  Save workflow to generate webhook URL
                </div>
              )}
            </div>
          )}

          {/* Trigger Configuration */}
          {isTriggerNode && nodeData?.triggerId && (
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <div className="text-xs text-gray-400">Trigger Configuration</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Trigger:</span>
                  <span className="text-gray-200">{nodeData.triggerId?.replace(/_/g, ' ')}</span>
                </div>
                {connectorType && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Connector:</span>
                    <span className="text-gray-200">{connectorType}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Execute Step Button */}
          <Button
            onClick={executeNode}
            disabled={executing || !workflowId}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            size="sm"
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute Step
              </>
            )}
          </Button>

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

          {/* Configure Button */}
          <Button
            onClick={onConfigure}
            variant="outline"
            className="w-full border-gray-700 hover:bg-gray-800"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Node
          </Button>
        </div>
      </Card>
    </div>
  );
}
