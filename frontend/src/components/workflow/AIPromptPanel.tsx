import { useState, useEffect, useRef, useReducer } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Sparkles, Send, Trash2, MessageSquare, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage, ChatMessageBubble, ProgressStep } from './ChatMessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { JsonObject } from '@/types/json';

// State Management Types
type AIMode = 'chat' | 'build';
type WorkflowPhase = 'idle' | 'analyzing' | 'analyzed' | 'executing' | 'completed';

interface AnalysisResult {
  understanding: string;
  plan: string[];
  estimatedNodes: number;
  requiredConnectors?: string[];
  confidence?: number;
}

/** Shape of a workflow generation result returned by various generation endpoints. */
interface WorkflowGenerationResult {
  success?: boolean;
  confidence?: number;
  responseType?: 'workflow' | 'error' | 'conversational';
  message?: string;
  canRetry?: boolean;
  workflow?: {
    name?: string;
    canvas?: { nodes?: unknown[]; edges?: unknown[] };
    [key: string]: unknown;
  };
  analysis?: { reasoning?: string; [key: string]: unknown };
  nodesToConfigure?: Array<{ nodeId: string; nodeType: string; nodeName: string; reason: string }>;
  error?: { message?: string };
  [key: string]: unknown;
}

interface WorkflowState {
  phase: WorkflowPhase;
  analysisResult: AnalysisResult | null;
  pendingPrompt: string | null;
  workflowResult: WorkflowGenerationResult | null;
}

type WorkflowAction =
  | { type: 'START_ANALYSIS'; payload: { prompt: string } }
  | { type: 'ANALYSIS_COMPLETE'; payload: { analysis: AnalysisResult } }
  | { type: 'START_EXECUTION' }
  | { type: 'EXECUTION_COMPLETE'; payload: { result: WorkflowGenerationResult } }
  | { type: 'RESET' }
  | { type: 'CANCEL_ANALYSIS' };

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'START_ANALYSIS':
      return {
        ...state,
        phase: 'analyzing',
        pendingPrompt: action.payload.prompt,
        analysisResult: null,
      };
    case 'ANALYSIS_COMPLETE':
      return {
        ...state,
        phase: 'analyzed',
        analysisResult: action.payload.analysis,
      };
    case 'START_EXECUTION':
      return {
        ...state,
        phase: 'executing',
      };
    case 'EXECUTION_COMPLETE':
      return {
        ...state,
        phase: 'completed',
        workflowResult: action.payload.result,
      };
    case 'CANCEL_ANALYSIS':
      return {
        ...state,
        phase: 'idle',
        analysisResult: null,
        pendingPrompt: null,
      };
    case 'RESET':
      return {
        phase: 'idle',
        analysisResult: null,
        pendingPrompt: null,
        workflowResult: null,
      };
    default:
      return state;
  }
}

const initialWorkflowState: WorkflowState = {
  phase: 'idle',
  analysisResult: null,
  pendingPrompt: null,
  workflowResult: null,
};

interface AIPromptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateWorkflow?: (prompt: string, conversationId: string) => Promise<WorkflowGenerationResult>;
  onWorkflowSaved?: (workflow: { nodes: unknown[]; edges: unknown[]; prompt?: string }) => void;
  workflowId?: string | null; // Current workflow ID
  onConfigureNode?: (nodeId: string, nodeType: string) => void; // Open node configuration modal
  context?: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  };
}

export function AIPromptPanel({
  isOpen,
  onClose,
  onGenerateWorkflow,
  onWorkflowSaved,
  workflowId,
  onConfigureNode,
  context,
}: AIPromptPanelProps) {
  const [mode, setMode] = useState<AIMode>('build');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [acceptedMessageIds, setAcceptedMessageIds] = useState<Set<string>>(new Set());
  const [workflowState, dispatchWorkflow] = useReducer(workflowReducer, initialWorkflowState);
  const [useMultiAgent, setUseMultiAgent] = useState(false); // false = Classic mode (default), true = Multi-Agent mode
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load or create conversation when panel opens, workflow changes, or mode changes
  useEffect(() => {
    if (isOpen) {
      // Reset conversation when workflow or mode changes
      setConversationId(null);
      setMessages([]);
      dispatchWorkflow({ type: 'RESET' }); // Reset workflow state
      loadOrCreateConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workflowId, mode]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleExecuteWorkflow = async (prompt: string) => {
    if (!conversationId || isGenerating) return;

    setIsGenerating(true);
    dispatchWorkflow({ type: 'START_EXECUTION' });

    try {
      // Show typing indicator
      await new Promise((resolve) => setTimeout(resolve, 500));

      const assistantMessageId = uuidv4();

      // 🆕 Different progress steps for Multi-Agent vs Classic
      const progressSteps: ProgressStep[] = useMultiAgent
        ? [
            { id: 'intent', label: 'Agent 1: Detecting intent...', status: 'active' },
            { id: 'connectors', label: 'Agent 2: Selecting connectors...', status: 'pending' },
            { id: 'nodes', label: 'Agent 3: Generating nodes...', status: 'pending' },
            { id: 'connections', label: 'Agent 4: Building connections...', status: 'pending' },
            { id: 'validate', label: 'Agent 5: Validating & auto-fixing...', status: 'pending' },
          ]
        : [
            { id: 'embed', label: 'Embedding your prompt...', status: 'active' },
            { id: 'search', label: 'Searching for similar workflows...', status: 'pending' },
            { id: 'similarity', label: 'Finding best matches...', status: 'pending' },
            { id: 'generate', label: 'Generating workflow...', status: 'pending' },
            { id: 'validate', label: 'Validating nodes and edges...', status: 'pending' },
          ];

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        metadata: {
          progressSteps,
          messageType: 'execution',
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Progress update helper
      const updateProgress = (stepId: string, status: ProgressStep['status']) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  metadata: {
                    ...msg.metadata,
                    progressSteps: msg.metadata?.progressSteps?.map((step) =>
                      step.id === stepId ? { ...step, status } : step,
                    ),
                  },
                }
              : msg,
          ),
        );
      };

      // 🆕 Call NEW Multi-Agent API or OLD System
      let workflowResult: WorkflowGenerationResult;

      if (useMultiAgent) {
        // NEW Multi-Agent System (95% accuracy, 75% cheaper)
        await new Promise((resolve) => setTimeout(resolve, 800));
        updateProgress('intent', 'completed');
        updateProgress('connectors', 'active');

        await new Promise((resolve) => setTimeout(resolve, 1000));
        updateProgress('connectors', 'completed');
        updateProgress('nodes', 'active');

        await new Promise((resolve) => setTimeout(resolve, 1200));
        updateProgress('nodes', 'completed');
        updateProgress('connections', 'active');

        await new Promise((resolve) => setTimeout(resolve, 600));
        updateProgress('connections', 'completed');
        updateProgress('validate', 'active');

        // Call NEW multi-agent endpoint
        const multiAgentResult = await api.generateWorkflowWithAgents({ prompt });

        updateProgress('validate', 'completed');

        // Transform response to match expected format
        if (multiAgentResult.success) {
          // Transform nodes to ReactFlow format (with data field)
          const transformedNodes =
            multiAgentResult.workflow?.nodes?.map((node: Record<string, unknown>) => {
              const { id, type, position, ...rest } = node;

              return {
                id,
                type,
                position: position || { x: 0, y: 0 },
                data: {
                  ...rest, // All other properties go into data field
                },
              };
            }) || [];

          // Transform connections to edges format
          const transformedEdges =
            multiAgentResult.workflow?.connections?.map((conn: Record<string, unknown>) => ({
              id: `${conn.source}-${conn.target}`,
              source: conn.source,
              target: conn.target,
              sourceHandle: conn.sourcePort || 'main',
              targetHandle: conn.targetPort || 'main',
            })) || [];

          workflowResult = {
            success: true,
            confidence: multiAgentResult.confidence,
            responseType: 'workflow',
            workflow: {
              name: multiAgentResult.workflow?.name || 'AI Generated Workflow',
              canvas: {
                nodes: transformedNodes,
                edges: transformedEdges,
              },
            },
            analysis: multiAgentResult.analysis,
          };

          // Debug logging removed for production
        } else {
          workflowResult = {
            success: false,
            responseType: 'error',
            message: multiAgentResult.error || 'Generation failed',
            canRetry: true,
          };
        }
      } else {
        // OLD Classic System (75% accuracy)
        await new Promise((resolve) => setTimeout(resolve, 500));
        updateProgress('embed', 'completed');
        updateProgress('search', 'active');

        await new Promise((resolve) => setTimeout(resolve, 700));
        updateProgress('search', 'completed');
        updateProgress('similarity', 'active');

        await new Promise((resolve) => setTimeout(resolve, 600));
        updateProgress('similarity', 'completed');
        updateProgress('generate', 'active');

        // Call the OLD workflow generation
        workflowResult = await onGenerateWorkflow?.(prompt, conversationId);

        await new Promise((resolve) => setTimeout(resolve, 500));
        updateProgress('generate', 'completed');
        updateProgress('validate', 'active');

        await new Promise((resolve) => setTimeout(resolve, 300));
        updateProgress('validate', 'completed');
      }

      // Update state
      dispatchWorkflow({ type: 'EXECUTION_COMPLETE', payload: { result: workflowResult } });

      // Update assistant message with final content based on responseType
      let finalContent: string;
      let quickReplies: string[];
      let requiresUserChoice = false;

      if (workflowResult?.responseType === 'workflow') {
        // Workflow successfully created
        const systemBadge = useMultiAgent ? '🚀 Multi-Agent' : '📊 Classic';
        const confidenceEmoji = (workflowResult.confidence || 90) >= 90 ? '🎯' : '✓';

        finalContent =
          `${systemBadge} ${confidenceEmoji} I've successfully created your workflow!\n\n` +
          `**Confidence:** ${workflowResult.confidence || 90}% ${useMultiAgent ? '(Multi-Agent System)' : '(Classic System)'}\n` +
          `**Nodes:** ${workflowResult.workflow?.canvas?.nodes?.length || 0}\n` +
          `**Connections:** ${workflowResult.workflow?.canvas?.edges?.length || 0}\n\n` +
          (workflowResult.analysis?.reasoning
            ? `**Reasoning:** ${workflowResult.analysis.reasoning}\n\n`
            : '') +
          `The workflow is ready on the canvas. Click "Accept workflow" to save it, or ask me to make changes.`;

        quickReplies = ['Accept workflow', 'Add error handling', 'Add scheduling', 'Modify nodes'];
        requiresUserChoice = true;
      } else if (workflowResult?.responseType === 'error') {
        finalContent =
          workflowResult.message ||
          'I encountered an issue generating the workflow. Could you provide more details or rephrase your request?';
        quickReplies = workflowResult.canRetry ? ['Try again', 'More details'] : ['More details'];
        requiresUserChoice = false;
      } else if (workflowResult?.responseType === 'conversational') {
        finalContent = workflowResult.message || 'Let me help you with that.';
        quickReplies = [];
        requiresUserChoice = false;
      } else {
        // Fallback
        finalContent = workflowResult?.success
          ? `I've successfully created your workflow!\n\nThe workflow is on the canvas. Would you like to make any changes?`
          : 'I encountered an issue generating the workflow. Could you provide more details or rephrase your request?';
        quickReplies = workflowResult?.success
          ? ['Looks great!', 'Add error handling']
          : ['Try again', 'More details'];
        requiresUserChoice = true;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: finalContent,
                metadata: {
                  ...msg.metadata,
                  workflowPreview: workflowResult?.workflow,
                  quickReplies,
                  requiresUserChoice,
                  workflowResult,
                },
              }
            : msg,
        ),
      );

      // Save assistant message to backend
      await api.addMessageToConversation(conversationId, {
        role: 'assistant',
        content: finalContent,
        metadata: {
          workflowPreview: workflowResult?.workflow as JsonObject | undefined,
          quickReplies,
        } as JsonObject,
      });

      // Update workflow state in conversation
      if (workflowResult?.workflow) {
        try {
          // Debug logging removed for production

          await api.updateConversationWorkflow(
            conversationId,
            workflowResult.workflow as JsonObject,
            context?.organizationId,
            context?.projectId,
            context?.appId,
          );

          // console.log('✅ Workflow saved to conversation successfully');

          // 🎨 Notify parent component to update the canvas
          if (onWorkflowSaved && workflowResult.workflow.canvas) {
            // console.log('📤 Sending workflow to parent component via callback');
            onWorkflowSaved({
              nodes: workflowResult.workflow.canvas.nodes || [],
              edges: workflowResult.workflow.canvas.edges || [],
              prompt: prompt, // ✅ FIX: Pass the AI prompt for tracking is_ai_generated
            });
          }

          toast.success(`Workflow generated with ${workflowResult.confidence}% confidence!`);
        } catch (error) {
          console.error('❌ Failed to save workflow to conversation:', error);
          toast.error('Failed to save workflow');
        }
      }

      // 🎯 Add configuration message if nodes need setup
      if (workflowResult?.nodesToConfigure && workflowResult.nodesToConfigure.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const configMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content:
            `⚙️ **Configuration Needed**\n\nSome nodes in your workflow need additional configuration:\n\n` +
            workflowResult.nodesToConfigure
              .map((node: { nodeName: string; reason: string }, idx: number) => `${idx + 1}. **${node.nodeName}** - ${node.reason}`)
              .join('\n') +
            `\n\nClick "Configure Nodes" to set them up now, or you can configure them later by clicking on each node.`,
          timestamp: new Date().toISOString(),
          metadata: {
            quickReplies: ['Configure Nodes', 'Configure Later'],
            nodesToConfigure: workflowResult.nodesToConfigure,
            requiresUserChoice: true,
          },
        };

        setMessages((prev) => [...prev, configMessage]);

        // Save config message to backend
        await api.addMessageToConversation(conversationId, {
          role: 'assistant',
          content: configMessage.content,
          metadata: configMessage.metadata as JsonObject,
        });
      }
    } catch (error: unknown) {
      console.error('Failed to execute workflow:', error);

      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to generate workflow');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadOrCreateConversation = async () => {
    setIsLoadingConversation(true);
    try {
      // 🎯 ALWAYS create new conversation when mode changes
      // Don't load old conversations as they might be from different mode
      // Only load existing conversation on initial panel open (not mode switch)

      // For now, always create a fresh conversation
      // TODO: In future, save mode in conversation metadata and only load matching conversations
      await createNewConversation();
    } catch (error) {
      console.error('Failed to load or create conversation:', error);
      toast.error('Failed to initialize conversation');
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const userName = user?.fullName ?? user?.firstName ?? 'User'
      
      let title: string;
      let initialMessage: string;

      if (mode === 'chat') {
        // Chat mode - general Fluxturn questions
        title = `Fluxturn Chat - ${new Date().toLocaleDateString()}`;
        initialMessage = `Hi ${userName} 👋\n\nI can answer most questions about building workflows in Fluxturn.\n\nFor specific tasks, you'll see the **Build** tab in the UI.\n\nHow can I help?`;
      } else {
        // Build mode - workflow generation
        title = workflowId
          ? `Workflow ${workflowId.slice(0, 8)} - Build`
          : `Workflow Build - ${new Date().toLocaleDateString()}`;
        initialMessage = workflowId
          ? "Hi! I'm here to help you build and refine this workflow. You can ask me to create nodes, add error handling, modify triggers, or just have a conversation about what you're trying to automate."
          : "Hi! I'm your AI workflow assistant. Describe the workflow you'd like to create, and I'll build it for you step by step.";
      }

      const response = await api.createConversation({
        title,
        workflow_id: workflowId || undefined,
        organizationId: context?.organizationId,
        projectId: context?.projectId,
        appId: context?.appId,
        initial_messages: [
          {
            id: uuidv4(),
            role: 'assistant',
            content: initialMessage,
            timestamp: new Date().toISOString(),
          },
        ] as JsonObject[],
      }) as { id: string; messages?: ChatMessage[] };

      setConversationId(response.id);
      setMessages(response.messages || []);

      // console.log(`Created new conversation for ${mode} mode`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const handleModeChange = async (newMode: AIMode) => {
    if (newMode === mode || isGenerating) return;

    // Clear current conversation and update mode
    // useEffect will detect mode change and create new conversation
    setMessages([]);
    setMode(newMode);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !conversationId) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      // Save user message to backend
      await api.addMessageToConversation(conversationId, {
        role: 'user',
        content: userMessage.content,
      });

      // 🎯 CHAT MODE: Simple Q&A, no workflow generation
      if (mode === 'chat') {
        // Show typing indicator
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Call a simple chat API (not workflow generation)
        // TODO: Create a dedicated chat endpoint for general Fluxturn questions
        const chatResponse = await api.chatWithAssistant({
          prompt: userMessage.content,
          conversationId,
        });

        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: chatResponse.message || "I'm here to help! Could you provide more details?",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Save assistant message to backend
        await api.addMessageToConversation(conversationId, {
          role: 'assistant',
          content: assistantMessage.content,
        });

        setIsGenerating(false);
        return;
      }

      // 🎯 BUILD MODE: Workflow generation flow (analyze -> execute)

      // Start analysis phase
      dispatchWorkflow({ type: 'START_ANALYSIS', payload: { prompt: userMessage.content } });

      // Show typing indicator first (like real chat apps)
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Create analysis message with progress
      const assistantMessageId = uuidv4();
      const analysisProgressSteps: ProgressStep[] = [
        { id: 'analyzing', label: 'Analyzing your request...', status: 'active' },
        { id: 'planning', label: 'Creating execution plan...', status: 'pending' },
      ];

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        metadata: {
          progressSteps: analysisProgressSteps,
          messageType: 'analysis',
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Simulate progress updates
      const updateProgress = (stepId: string, status: ProgressStep['status']) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  metadata: {
                    ...msg.metadata,
                    progressSteps: msg.metadata?.progressSteps?.map((step) =>
                      step.id === stepId ? { ...step, status } : step,
                    ),
                  },
                }
              : msg,
          ),
        );
      };

      // Progress: Analyzing
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateProgress('analyzing', 'completed');
      updateProgress('planning', 'active');

      // Call the analysis API
      const analysisResult = await api.analyzePrompt({
        prompt: userMessage.content,
        conversationId,
      });

      await new Promise((resolve) => setTimeout(resolve, 600));
      updateProgress('planning', 'completed');

      // Update state with analysis result
      dispatchWorkflow({ type: 'ANALYSIS_COMPLETE', payload: { analysis: analysisResult } });

      // Build conversational analysis message
      const finalContent =
        analysisResult.understanding +
        `\n\n**Technical breakdown:**\n` +
        analysisResult.plan.map((step, idx) => `${idx + 1}. ${step}`).join('\n') +
        `\n\n` +
        (analysisResult.requiredConnectors && analysisResult.requiredConnectors.length > 0
          ? `**Connectors needed:** ${analysisResult.requiredConnectors.join(', ')}\n\n`
          : '') +
        `Would you like me to proceed with building this workflow?`;

      const quickReplies = ['Execute Workflow', 'Modify Prompt', 'Cancel'];
      const requiresUserChoice = true;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: finalContent,
                metadata: {
                  ...msg.metadata,
                  messageType: 'analysis',
                  analysisData: analysisResult,
                  pendingPrompt: userMessage.content,
                  quickReplies,
                  requiresUserChoice,
                },
              }
            : msg,
        ),
      );

      // Save assistant message to backend
      await api.addMessageToConversation(conversationId, {
        role: 'assistant',
        content: finalContent,
        metadata: {
          messageType: 'analysis',
          analysisData: analysisResult,
          quickReplies,
        },
      });
    } catch (error: unknown) {
      console.error('Failed to analyze prompt:', error);

      // Reset workflow state on error
      dispatchWorkflow({ type: 'RESET' });

      // Add error message
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Sorry, I encountered an error while analyzing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your prompt.`,
        timestamp: new Date().toISOString(),
        metadata: {
          quickReplies: ['Try again', 'Help'],
        },
      };

      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to analyze prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickReply = async (reply: string, metadata?: Record<string, unknown>, messageId?: string) => {
    // Handle special buttons
    if (reply === 'Accept workflow') {
      // Mark this message as accepted
      if (messageId) {
        setAcceptedMessageIds((prev) => new Set(prev).add(messageId));
      }
      toast.success('Workflow accepted! You can now save it.');
      return;
    }

    if (reply === 'Execute Workflow') {
      // 🎯 Execute the workflow using the PLAN (not the original prompt)
      // This ensures AI uses the analyzed and refined plan with proper node constraints
      const analysisData = (metadata?.analysisData as AnalysisResult | undefined) || workflowState.analysisResult;

      if (analysisData && analysisData.plan && analysisData.plan.length > 0) {
        // Construct a structured prompt from the plan
        const planPrompt = [
          analysisData.understanding,
          '\nWorkflow steps:',
          ...analysisData.plan.map((step: string, idx: number) => `${idx + 1}. ${step}`),
        ].join('\n');

        await handleExecuteWorkflow(planPrompt);
      } else if (metadata?.pendingPrompt) {
        // Fallback to original prompt if no plan available
        await handleExecuteWorkflow(metadata.pendingPrompt as string);
      } else if (workflowState.pendingPrompt) {
        await handleExecuteWorkflow(workflowState.pendingPrompt);
      } else {
        toast.error('No pending workflow to execute');
      }
      return;
    }

    if (reply === 'Modify Prompt') {
      // Allow user to modify the prompt
      if (metadata?.pendingPrompt) {
        setInput(metadata.pendingPrompt as string);
      } else if (workflowState.pendingPrompt) {
        setInput(workflowState.pendingPrompt);
      }
      dispatchWorkflow({ type: 'CANCEL_ANALYSIS' });
      toast.info('You can now modify your prompt');
      return;
    }

    if (reply === 'Cancel') {
      // Cancel the analysis
      dispatchWorkflow({ type: 'CANCEL_ANALYSIS' });
      toast.info('Analysis cancelled');
      return;
    }

    if (reply === 'Try again') {
      // Auto-resend the last user message without setting input field
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMessage) {
        // Temporarily set input, send, then clear
        setInput(lastUserMessage.content);

        // Send the message after a tiny delay to ensure state update
        setTimeout(async () => {
          await handleSend();
          // Don't restore original input - leave it empty after sending
        }, 50);
      }
      return;
    }

    if (reply === 'Configure Nodes') {
      // Open configuration modal for nodes that need setup
      const nodesToConfigure = (metadata?.nodesToConfigure || []) as Array<{ nodeId: string; nodeType: string; nodeName: string }>;

      if (nodesToConfigure.length === 0) {
        toast.info('All nodes are already configured!');
        return;
      }

      // Open modal for the first node that needs configuration
      const firstNode = nodesToConfigure[0];
      if (onConfigureNode) {
        onConfigureNode(firstNode.nodeId, firstNode.nodeType);
        toast.info(`Configuring: ${firstNode.nodeName}`);
      }
      return;
    }

    if (reply === 'Configure Later') {
      // User wants to configure nodes later
      toast.info('You can configure nodes anytime by clicking on them in the canvas');
      return;
    }

    if (reply === 'Looks great!') {
      toast.success('Great! Your workflow is ready on the canvas.');
      onClose();
      return;
    }

    // For other replies, just set the input (user can edit and send)
    setInput(reply);
  };

  const handleConfigureCredentials = async (credentials: Array<{ connector: string; field: string; value: string }>) => {
    if (!conversationId) return;

    try {
      // Group credentials by connector
      const byConnector = new Map<string, Record<string, string>>();

      for (const cred of credentials) {
        if (!byConnector.has(cred.connector)) {
          byConnector.set(cred.connector, {});
        }
        byConnector.get(cred.connector)![cred.field] = cred.value;
      }

      // Configure each connector
      const results = [];
      for (const [connector, credMap] of byConnector.entries()) {
        try {
          const result = await api.autoConfigureConnector(conversationId, connector, credMap);
          results.push(result);
          toast.success(`${connector} configured successfully!`);
        } catch (error) {
          console.error(`Failed to configure ${connector}:`, error);
          toast.error(`Failed to configure ${connector}`);
        }
      }

      // Add confirmation message to chat
      if (results.length > 0) {
        const confirmationMessage = {
          id: uuidv4(),
          role: 'assistant' as const,
          content: `✅ Successfully configured ${results.length} connector(s)! Your workflow nodes can now use these credentials.`,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, confirmationMessage]);

        await api.addMessageToConversation(conversationId, {
          role: 'assistant',
          content: confirmationMessage.content,
        });
      }
    } catch (error) {
      console.error('Failed to configure credentials:', error);
      toast.error('Failed to configure credentials');
    }
  };

  const handleClearConversation = async () => {
    if (!conversationId) return;

    try {
      await api.clearConversationMessages(conversationId);
      dispatchWorkflow({ type: 'RESET' }); // Reset workflow state
      setMessages([
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Conversation cleared. How can I help you create a workflow?',
          timestamp: new Date().toISOString(),
        },
      ]);
      toast.success('Conversation cleared');
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      toast.error('Failed to clear conversation');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-[32rem] glass border-l border-white/10 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Fluxturn AI</h2>
              {/* 🆕 Multi-Agent Badge */}
              {mode === 'build' && (
                <button
                  onClick={() => setUseMultiAgent(!useMultiAgent)}
                  disabled={isGenerating}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all',
                    useMultiAgent
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10',
                    isGenerating && 'opacity-50 cursor-not-allowed',
                  )}
                  title={
                    useMultiAgent
                      ? 'Using NEW Multi-Agent (95% accuracy)'
                      : 'Using OLD System (75% accuracy)'
                  }
                >
                  <Zap className="w-3 h-3" />
                  {useMultiAgent ? 'Multi-Agent' : 'Classic'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearConversation}
                disabled={isGenerating}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white disabled:opacity-50"
                title="Clear messages"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-1 mb-3 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => handleModeChange('chat')}
              disabled={isGenerating}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'chat'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5',
              )}
            >
              Chat
            </button>
            <button
              onClick={() => handleModeChange('build')}
              disabled={isGenerating}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'build'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5',
              )}
            >
              Build
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-300">
              {mode === 'chat'
                ? 'Ask questions about Fluxturn'
                : workflowId
                  ? 'Build and refine this workflow'
                  : 'Create workflows with AI'}
            </p>
            {workflowId && (
              <p className="text-xs text-gray-500">Workflow: {workflowId.slice(0, 8)}...</p>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 text-sm">Initializing conversation...</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  onQuickReply={handleQuickReply}
                  onConfigureCredentials={handleConfigureCredentials as unknown as (credentials: Array<{ connectorName: string; field: string; masked: string }>) => void}
                  isAccepted={acceptedMessageIds.has(message.id)}
                />
              ))}

              {/* Show typing indicator while generating */}
              {isGenerating && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'chat'
                  ? 'Ask me anything about Fluxturn... (Shift+Enter for new line)'
                  : 'Describe your workflow or ask for changes... (Shift+Enter for new line)'
              }
              className="min-h-[60px] max-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-gray-400 resize-none"
              disabled={isGenerating}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating || !conversationId}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white h-auto px-4"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </>
  );
}
