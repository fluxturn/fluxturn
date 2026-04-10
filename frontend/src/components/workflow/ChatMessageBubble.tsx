import { Bot, User, Check, Loader, Circle, Lock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CredentialDetected {
  connectorName: string;
  field: string;
  masked: string;
}

interface WorkflowPreview {
  canvas?: {
    nodes?: unknown[];
    edges?: unknown[];
  };
}

export interface ChatMessageMetadata {
  workflowPreview?: WorkflowPreview;
  progressSteps?: ProgressStep[];
  credentialsDetected?: CredentialDetected[];
  requiresUserChoice?: boolean;
  quickReplies?: string[];
  workflowResult?: unknown;
  messageType?: 'analysis' | 'execution' | 'general';
  analysisData?: {
    understanding: string;
    plan: string[];
    estimatedNodes: number;
    requiredConnectors?: string[];
    confidence?: number;
  };
  pendingPrompt?: string;
  nodesToConfigure?: unknown[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: ChatMessageMetadata;
}

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  timestamp?: string;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onQuickReply?: (reply: string, metadata?: ChatMessageMetadata, messageId?: string) => void;
  onConfigureCredentials?: (credentials: CredentialDetected[]) => void;
  isAccepted?: boolean;
}

export function ChatMessageBubble({ message, onQuickReply, onConfigureCredentials, isAccepted }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-gradient-to-br from-cyan-500 to-teal-500"
            : "bg-gradient-to-br from-purple-500 to-pink-500",
          isSystem && "bg-gray-500"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-lg px-4 py-3 shadow-md",
            isUser
              ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white"
              : "glass border border-white/10 text-white"
          )}
        >
          {/* Progress Steps */}
          {message.metadata?.progressSteps && message.metadata.progressSteps.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.metadata.progressSteps.map((step) => (
                <ProgressIndicator key={step.id} step={step} />
              ))}
            </div>
          )}

          {/* Main Content */}
          <div className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </div>

          {/* Workflow Preview */}
          {message.metadata?.workflowPreview && (
            <div className="mt-3 p-3 bg-white/10 rounded border border-white/20">
              <div className="text-xs font-medium mb-1 text-cyan-300">
                Workflow Preview
              </div>
              <div className="text-xs text-gray-300">
                {message.metadata.workflowPreview.canvas?.nodes?.length || 0} nodes,{' '}
                {message.metadata.workflowPreview.canvas?.edges?.length || 0} edges
              </div>
            </div>
          )}

          {/* Quick Replies */}
          {message.metadata?.quickReplies && message.metadata.quickReplies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.metadata.quickReplies.map((reply, index) => {
                const isAcceptButton = reply === "Accept workflow";
                const isExecuteButton = reply === "Execute Workflow";
                const isThisAccepted = isAcceptButton && isAccepted;

                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickReply?.(reply, message.metadata, message.id)}
                    disabled={isThisAccepted}
                    className={cn(
                      "text-xs",
                      isAcceptButton && !isThisAccepted
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 font-semibold"
                        : isExecuteButton
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 font-semibold"
                        : isThisAccepted
                        ? "bg-gray-600 text-gray-300 border-gray-500 cursor-not-allowed opacity-70"
                        : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                    )}
                  >
                    {isThisAccepted ? "✓ Accepted" : reply}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Credentials Detected */}
          {message.metadata?.credentialsDetected && message.metadata.credentialsDetected.length > 0 && (
            <div className="mt-3 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded border border-yellow-500/30">
              <div className="flex items-start gap-2 mb-2">
                <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-yellow-300 mb-1">
                    🎯 Credentials Detected!
                  </div>
                  <div className="text-xs text-yellow-200/80 mb-2">
                    I found {message.metadata.credentialsDetected.length} credential(s) in your message:
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {message.metadata.credentialsDetected.map((cred: CredentialDetected, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-black/20 rounded px-2 py-1.5">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="font-medium text-white">{cred.connectorName}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">{cred.field}</span>
                        <span className="text-gray-400">•</span>
                        <code className="text-xs text-cyan-300 font-mono">{cred.masked}</code>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onConfigureCredentials?.(message.metadata.credentialsDetected)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs"
                  >
                    <Lock className="w-3 h-3 mr-1.5" />
                    Configure Connectors
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-400 mt-1 px-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

// Progress Indicator Component
function ProgressIndicator({ step }: { step: ProgressStep }) {
  return (
    <div className="flex items-center gap-2">
      {step.status === 'completed' && (
        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
      )}
      {step.status === 'active' && (
        <Loader className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
      )}
      {step.status === 'pending' && (
        <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />
      )}
      {step.status === 'error' && (
        <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
      )}
      <span
        className={cn(
          "text-xs",
          step.status === 'active' && "font-medium text-cyan-400",
          step.status === 'completed' && "text-green-400",
          step.status === 'pending' && "text-gray-500",
          step.status === 'error' && "text-red-400"
        )}
      >
        {step.label}
      </span>
    </div>
  );
}
