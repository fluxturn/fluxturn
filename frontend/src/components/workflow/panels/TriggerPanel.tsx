import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, Globe, Loader2, AlertCircle, Terminal, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/lib/api';

interface TriggerNodeData {
  connectorType?: string;
  triggerId?: string;
  actionParams?: Record<string, unknown>;
  eventType?: string;
  triggerParams?: { pollingInterval?: number };
  label?: string;
  [key: string]: unknown;
}

interface TriggerWebhookInfo {
  webhookUrl: string;
  connectorType?: string;
  triggerType?: string;
  setupInstructions?: string;
  httpsRequired?: boolean;
  isHttps?: boolean;
}

interface TriggerPanelProps {
  nodeId: string;
  nodeData: TriggerNodeData;
  workflowId?: string | null;
  isActive?: boolean;
  onUpdate?: (data: TriggerNodeData) => void;
}

export function TriggerPanel({
  nodeId,
  nodeData,
  workflowId,
  isActive = false,
  onUpdate
}: TriggerPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<TriggerWebhookInfo | null>(null);

  const connectorType = nodeData.connectorType;
  const triggerId = nodeData.triggerId;
  const triggerConfig = nodeData.actionParams || {};
  const eventType = nodeData.eventType || 'webhook'; // Default to webhook for backwards compatibility
  const isPollingTrigger = eventType === 'polling';

  // Fetch webhook URL from backend
  useEffect(() => {
    const fetchWebhookUrl = async () => {
      if (!workflowId) {
        setWebhookUrl('Save workflow to generate webhook URL');
        return;
      }

      setLoadingWebhook(true);
      try {
        const response = await api.get(`/workflow/${workflowId}/webhook-url`);

        // Find the webhook for this specific trigger
        const triggerWebhook = response.webhooks?.find(
          (w: TriggerWebhookInfo) => w.connectorType === connectorType || w.triggerType === `${connectorType?.toUpperCase()}_TRIGGER`
        );

        if (triggerWebhook) {
          setWebhookUrl(triggerWebhook.webhookUrl);
          setWebhookInfo(triggerWebhook);
        } else if (response.webhooks?.length > 0) {
          // Fallback to first webhook if no exact match
          setWebhookUrl(response.webhooks[0].webhookUrl);
          setWebhookInfo(response.webhooks[0]);
        } else {
          setWebhookUrl('No webhook configured');
        }
      } catch (error) {
        console.error('Failed to fetch webhook URL:', error);
        // Fallback to frontend-generated URL
        setWebhookUrl(getWebhookUrlFallback());
      } finally {
        setLoadingWebhook(false);
      }
    };

    fetchWebhookUrl();
  }, [workflowId, connectorType]);

  // Fallback method to generate webhook URL (if backend fails)
  const getWebhookUrlFallback = () => {
    if (!workflowId) return 'Save workflow to generate webhook URL';

    const baseUrl = window.location.origin;
    const apiPath = '/api/v1/webhooks';

    switch (connectorType) {
      case 'telegram':
        return `${baseUrl}${apiPath}/telegram/${workflowId}`;
      case 'facebook_graph':
        return `${baseUrl}${apiPath}/facebook/${workflowId}`;
      case 'slack':
        return `${baseUrl}${apiPath}/slack/${workflowId}`;
      default:
        return `${baseUrl}${apiPath}/${connectorType}/${workflowId}`;
    }
  };

  const hasWebhookUrl = workflowId && webhookUrl.startsWith('http');

  const copyToClipboard = async () => {
    if (!hasWebhookUrl) return;
    
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success('Webhook URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  // Get trigger-specific help text
  const getTriggerHelp = () => {
    // Check if this trigger has automatic webhook registration
    const hasAutoRegistration = webhookInfo?.setupInstructions?.includes('automatically') ||
                                 connectorType === 'telegram' ||
                                 connectorType === 'gmail' ||
                                 connectorType === 'stripe';

    switch (connectorType) {
      case 'telegram':
        return {
          title: '✅ Automatic Webhook Setup',
          description: webhookInfo?.setupInstructions || 'This webhook will be automatically registered when you activate the workflow. No manual setup required!',
          steps: [
            'Save your workflow configuration',
            'Click the "Activate" button on your workflow',
            'The webhook will be automatically registered with Telegram',
            'Send a test message to your bot to verify'
          ],
          isAutomatic: true,
          httpsRequired: webhookInfo?.httpsRequired,
          isHttps: webhookInfo?.isHttps
        };
      case 'stripe':
        return {
          title: '✅ Automatic Webhook Setup',
          description: 'This webhook will be automatically registered with Stripe when you activate the workflow.',
          steps: [
            'Save your workflow configuration',
            'Click the "Activate" button on your workflow',
            'The webhook endpoint will be created in your Stripe account',
            'Test by creating a test event in Stripe Dashboard'
          ],
          isAutomatic: true
        };
      case 'facebook_graph':
        return {
          title: 'Facebook Webhook Setup',
          description: 'Configure your Facebook app to send events to this webhook.',
          steps: [
            'Go to your Facebook App Dashboard',
            'Navigate to Webhooks settings',
            'Add this URL as your callback URL',
            'Subscribe to the required events'
          ],
          isAutomatic: false
        };
      default:
        if (hasAutoRegistration) {
          return {
            title: '✅ Automatic Webhook Setup',
            description: 'This webhook will be automatically registered when you activate the workflow.',
            steps: [
              'Save your workflow configuration',
              'Click "Activate" on your workflow',
              'Webhook will be automatically registered',
              'Test by sending an event'
            ],
            isAutomatic: true
          };
        }
        return {
          title: 'Webhook Setup',
          description: 'Configure your application to send events to this webhook URL.',
          steps: [
            'Copy the webhook URL above',
            'Add it to your application settings',
            'Send a test request'
          ],
          isAutomatic: false
        };
    }
  };

  const helpInfo = getTriggerHelp();

  // For polling triggers, don't show webhook UI at all
  if (isPollingTrigger) {
    return (
      <div className="space-y-4">
        {/* Polling Configuration Info */}
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-white">
                Polling Configuration
              </Label>
              <Badge
                variant="secondary"
                className={`text-xs ${isActive ? 'bg-green-500/20 text-green-400' : ''}`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Mode:</span>
                <span className="text-gray-300">Polling</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Polling Interval:</span>
                <span className="text-gray-300">{nodeData.triggerParams?.pollingInterval || 5} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trigger Event:</span>
                <span className="text-gray-300">{nodeData.label || triggerId}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Status Section */}
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Status</h4>

            <Alert className={cn(
              "border",
              isActive ? "border-green-800 bg-green-950/50" : "border-yellow-800 bg-yellow-950/50"
            )}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">
                {isActive ? 'Workflow Active' : 'Workflow Inactive'}
              </AlertTitle>
              <AlertDescription className="text-xs text-gray-400">
                {isActive
                  ? `This trigger is active and will check for new ${triggerId === 'new_mention' ? 'mentions' : 'tweets'} every ${nodeData.triggerParams?.pollingInterval || 5} minutes.`
                  : 'Activate this workflow to start polling for new events.'}
              </AlertDescription>
            </Alert>
          </div>
        </Card>

        {/* How It Works */}
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-medium text-white">How Polling Works</h4>
            </div>

            <p className="text-xs text-gray-400">
              {triggerId === 'new_mention'
                ? 'This workflow checks for new Twitter mentions at the configured interval. Each mention triggers the workflow once.'
                : 'This workflow checks for new tweets you post at the configured interval. Each tweet triggers the workflow once.'}
            </p>

            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5">1.</span>
                <span className="text-xs text-gray-300">Every {nodeData.triggerParams?.pollingInterval || 5} minutes, we check for new {triggerId === 'new_mention' ? 'mentions' : 'tweets'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5">2.</span>
                <span className="text-xs text-gray-300">Each new item triggers the workflow exactly once</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5">3.</span>
                <span className="text-xs text-gray-300">Previously processed items are never triggered again</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Original webhook UI for webhook triggers
  return (
    <div className="space-y-4">
      {/* Webhook URL Section */}
      <Card className="p-4 bg-gray-900/50 border-gray-800">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-white">
              Webhook URL
            </Label>
            <Badge
              variant="secondary"
              className={`text-xs ${isActive ? 'bg-green-500/20 text-green-400' : ''}`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* URL Display */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex-1 p-2.5 bg-gray-950 rounded-md border font-mono text-xs",
              hasWebhookUrl ? "border-gray-700 text-gray-300" : "border-gray-800 text-gray-500"
            )}>
              {loadingWebhook ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading webhook URL...
                </div>
              ) : webhookUrl}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              disabled={!hasWebhookUrl || loadingWebhook}
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

          {/* HTTPS Warning */}
          {webhookInfo?.httpsRequired && !webhookInfo?.isHttps && (
            <Alert className="border-yellow-800 bg-yellow-950/50 mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">HTTPS Required</AlertTitle>
              <AlertDescription className="text-xs text-gray-400">
                Telegram requires HTTPS. For local development, use ngrok:<br/>
                <code className="text-xs bg-gray-950 px-1 py-0.5 rounded">ngrok http 3000</code>
              </AlertDescription>
            </Alert>
          )}

          {/* Test/Production Toggle */}
          {hasWebhookUrl && (
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="test-mode" className="text-xs text-gray-400">
                Test mode
              </Label>
              <Switch
                id="test-mode"
                checked={isTestMode}
                onCheckedChange={setIsTestMode}
                className="h-4 w-8"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Status Section */}
      <Card className="p-4 bg-gray-900/50 border-gray-800">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Status</h4>
            {isListening && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Listening...
              </div>
            )}
          </div>

          <Alert className={cn(
            "border",
            isActive ? "border-green-800 bg-green-950/50" : "border-yellow-800 bg-yellow-950/50"
          )}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">
              {isActive ? 'Workflow Active' : 'Workflow Inactive'}
            </AlertTitle>
            <AlertDescription className="text-xs text-gray-400">
              {isActive
                ? 'This trigger is active and will execute when events are received.'
                : 'Activate this workflow to start receiving webhook events.'}
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Setup Instructions */}
      <Card className={cn(
        "p-4 border-gray-800",
        helpInfo.isAutomatic ? "bg-gradient-to-br from-cyan-950/30 to-teal-950/30" : "bg-gray-900/50"
      )}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {helpInfo.isAutomatic ? (
              <Sparkles className="h-4 w-4 text-cyan-400" />
            ) : (
              <Info className="h-4 w-4 text-blue-400" />
            )}
            <h4 className="text-sm font-medium text-white">{helpInfo.title}</h4>
          </div>

          <p className="text-xs text-gray-400">{helpInfo.description}</p>

          {helpInfo.isAutomatic && (
            <Alert className="border-cyan-800/50 bg-cyan-950/30 mt-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <AlertTitle className="text-sm text-cyan-300">No manual setup needed!</AlertTitle>
              <AlertDescription className="text-xs text-gray-300">
                Just click "Activate" on your workflow and we'll handle the webhook registration automatically.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            {helpInfo.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5">{index + 1}.</span>
                <span className="text-xs text-gray-300">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Trigger-specific Configuration */}
      {triggerId === 'new_message' && connectorType === 'telegram' && (
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Message Filters</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Message Type:</span>
                <span className="text-gray-300">{triggerConfig.messageType || 'All'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Chat Type:</span>
                <span className="text-gray-300">{triggerConfig.chatType || 'All'}</span>
              </div>
              {triggerConfig.webhookToken && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Webhook Token:</span>
                  <span className="text-gray-300 font-mono">•••••••</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {triggerId === 'new_command' && connectorType === 'telegram' && (
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Command Configuration</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Command:</span>
                <span className="text-gray-300 font-mono">{triggerConfig.command || '/start'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Include Arguments:</span>
                <span className="text-gray-300">{triggerConfig.includeArgs ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Test Webhook Button */}
      {hasWebhookUrl && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => toast.info('Test webhook functionality coming soon!')}
        >
          <Terminal className="h-4 w-4 mr-2" />
          Send Test Request
        </Button>
      )}
    </div>
  );
}