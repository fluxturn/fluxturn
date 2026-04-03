import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import {
  ArrowRight,
  Bot,
  Zap,
  CheckCircle,
  Circle,
  Play,
  ChevronRight,
  Sparkles,
  Brain,
  Loader2
} from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { WorkflowAPI } from "../../lib/fluxturn";
import { toast } from "sonner";

// Session storage keys for pending AI agent
export const PENDING_AI_AGENT_KEY = 'fluxturn_pending_ai_agent';
export const PENDING_AI_AGENT_TIMESTAMP_KEY = 'fluxturn_pending_ai_agent_timestamp';

// Tools connected to AI Agent
const connectedTools = [
  { id: 'gmail', name: 'Gmail', icon: '/icons/connectors/gmail.png', color: 'from-red-500 to-pink-500' },
  { id: 'slack', name: 'Slack', icon: '/icons/connectors/slack.png', color: 'from-purple-500 to-violet-500' },
  { id: 'notion', name: 'Notion', icon: '/icons/connectors/notion.png', color: 'from-gray-600 to-gray-800' },
];

// Execution log steps
const executionSteps = [
  { type: 'input', text: 'Received: "Send welcome email to new user john@example.com"', delay: 0 },
  { type: 'thinking', text: 'AI analyzing request...', delay: 1500 },
  { type: 'decision', text: 'Selected tool: gmail_send_email', delay: 3000 },
  { type: 'executing', text: 'Executing with params: { to: "john@example.com", subject: "Welcome!" }', delay: 4500 },
  { type: 'success', text: '✓ Email sent successfully', delay: 6000 },
  { type: 'complete', text: 'Workflow completed in 1.2s', delay: 7500 },
];

// Workflow Node Component
function WorkflowNode({
  type,
  label,
  icon,
  isActive,
  isAIAgent,
  color = 'from-gray-500 to-gray-600',
  delay = 0
}: {
  type: string;
  label: string;
  icon?: string;
  isActive?: boolean;
  isAIAgent?: boolean;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`
        relative rounded-xl border-2 transition-all duration-300 bg-white
        ${isAIAgent
          ? 'border-emerald-400 shadow-lg shadow-emerald-100'
          : 'border-gray-200 shadow-md'
        }
        ${isActive ? 'ring-2 ring-cyan-400 ring-offset-2' : ''}
      `}
    >
      {/* Glow effect for AI Agent */}
      {isAIAgent && (
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200/50 to-cyan-200/50 rounded-xl blur-lg -z-10" />
      )}

      <div className={`p-4 ${isAIAgent ? 'min-w-[200px]' : 'min-w-[120px]'}`}>
        {/* Node Header */}
        <div className="flex items-center gap-2 mb-2">
          {isAIAgent ? (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
          ) : icon ? (
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
              <img src={icon} alt={label} className="w-5 h-5 object-contain" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }} />
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{type}</p>
            <p className="text-sm font-semibold text-gray-900">{label}</p>
          </div>
        </div>

        {/* AI Agent specific content */}
        {isAIAgent && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-medium">Tools Agent</span>
              <span>Max 10 iterations</span>
            </div>

            {/* Connected Tools */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Connected Tools</p>
              <div className="flex gap-1.5">
                {connectedTools.map((tool, idx) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.5 + idx * 0.1 }}
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center`}
                  >
                    <img src={tool.icon} alt={tool.name} className="w-4 h-4 object-contain" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                  </motion.div>
                ))}
                <div className="w-7 h-7 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                  +
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection handles */}
      {!isAIAgent && type !== 'output' && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />
      )}
      {type !== 'trigger' && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />
      )}
    </motion.div>
  );
}

// Connection Line Component
function ConnectionLine({ delay = 0, isActive = false }: { delay?: number; isActive?: boolean }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center origin-left"
    >
      <div className={`h-0.5 w-12 ${isActive ? 'bg-cyan-500' : 'bg-gray-300'}`} />
      <ChevronRight className={`w-4 h-4 -ml-1 ${isActive ? 'text-cyan-500' : 'text-gray-300'}`} />
    </motion.div>
  );
}

// Execution Log Component
function ExecutionLog() {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    executionSteps.forEach((step, index) => {
      const timer = setTimeout(() => {
        setVisibleSteps(prev => [...prev, index]);
        setCurrentStep(index);
      }, step.delay);
      timers.push(timer);
    });

    // Reset after completion
    const resetTimer = setTimeout(() => {
      setVisibleSteps([]);
      setCurrentStep(0);
    }, 10000);
    timers.push(resetTimer);

    return () => timers.forEach(t => clearTimeout(t));
  }, [visibleSteps.length === 0]);

  const getStepIcon = (type: string, isVisible: boolean) => {
    if (!isVisible) return <Circle className="w-3 h-3 text-gray-300" />;

    switch (type) {
      case 'success':
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-emerald-500" />;
      case 'thinking':
      case 'executing':
        return (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Sparkles className="w-3 h-3 text-cyan-500" />
          </motion.div>
        );
      default:
        return <Play className="w-3 h-3 text-cyan-500" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'success':
      case 'complete':
        return 'text-emerald-600';
      case 'decision':
        return 'text-cyan-600';
      case 'thinking':
      case 'executing':
        return 'text-gray-700';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-gray-900">Execution Log</span>
        <span className="text-xs text-gray-400 ml-auto">Live</span>
      </div>

      <div className="space-y-2 font-mono text-xs">
        <AnimatePresence mode="popLayout">
          {executionSteps.map((step, index) => {
            const isVisible = visibleSteps.includes(index);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isVisible ? 1 : 0.3, x: 0 }}
                className={`flex items-start gap-2 ${getStepColor(step.type)}`}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {getStepIcon(step.type, isVisible)}
                </span>
                <span className={isVisible ? '' : 'text-gray-300'}>{step.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Generate AI Agent workflow canvas data
function generateAIAgentCanvas() {
  const chatTriggerId = `chat-trigger-${Date.now()}`;
  const openaiModelId = `openai-model-${Date.now() + 1}`;
  const aiAgentId = `ai-agent-${Date.now() + 2}`;

  const nodes = [
    {
      id: chatTriggerId,
      type: 'CHAT_TRIGGER',
      position: { x: 100, y: 200 },
      data: {
        label: 'Chat Trigger',
        type: 'CHAT_TRIGGER',
        chatInputKey: 'chatInput',
        sessionIdKey: 'sessionId',
        placeholder: 'Type your message...',
        inputFieldLabel: 'Message',
      },
    },
    {
      id: openaiModelId,
      type: 'OPENAI_CHAT_MODEL',
      position: { x: 400, y: 100 },
      data: {
        label: 'OpenAI Chat Model',
        type: 'OPENAI_CHAT_MODEL',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      },
    },
    {
      id: aiAgentId,
      type: 'AI_AGENT',
      position: { x: 400, y: 300 },
      data: {
        label: 'AI Agent',
        type: 'AI_AGENT',
        agentType: 'toolsAgent',
        systemPrompt: 'You are a helpful AI assistant.',
        input: '{{$json.chatInput}}',
        maxIterations: 10,
        returnIntermediateSteps: false,
        outputFormat: 'text',
        enableHttpTool: true,
        enableCalculatorTool: true,
      },
    },
  ];

  const edges = [
    {
      id: `edge-${chatTriggerId}-${aiAgentId}`,
      source: chatTriggerId,
      target: aiAgentId,
      sourceHandle: 'output',
      targetHandle: 'input',
      type: 'smoothstep',
      animated: true,
    },
    {
      id: `edge-${openaiModelId}-${aiAgentId}`,
      source: openaiModelId,
      target: aiAgentId,
      sourceHandle: 'output',
      targetHandle: 'model',
      type: 'smoothstep',
      animated: true,
    },
  ];

  return { nodes, edges };
}

export function AIAgentSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const organizations = authContext?.organizations ?? [];

  // Animate active node based on execution
  useEffect(() => {
    const sequence = [
      { node: 'trigger', delay: 0 },
      { node: 'agent', delay: 1500 },
      { node: 'agent', delay: 3000 },
      { node: 'agent', delay: 4500 },
      { node: 'output', delay: 6000 },
      { node: null, delay: 8000 },
    ];

    const timers = sequence.map(({ node, delay }) =>
      setTimeout(() => setActiveNode(node), delay)
    );

    // Reset cycle
    const resetTimer = setTimeout(() => setActiveNode('trigger'), 10000);
    timers.push(resetTimer);

    return () => timers.forEach(t => clearTimeout(t));
  }, [activeNode === null]);

  const createAIAgentWorkflow = async () => {
    try {
      const organizationId = organizations[0]?.id;
      if (!organizationId) {
        toast.error(t('aiAgent.errors.noOrganization', 'No organization found'));
        navigate('/orgs');
        return;
      }

      // Get existing projects
      const projectsRes = await api.getProjectsByOrganization(organizationId);
      const projects = (projectsRes as any).data || (projectsRes as any);

      if (!projects || projects.length === 0) {
        toast.error(t('aiAgent.errors.noProject', 'No project found'));
        navigate(`/org/${organizationId}`);
        return;
      }

      const projectId = projects[0].id;

      // Generate canvas with AI Agent nodes
      const canvas = generateAIAgentCanvas();

      // Create workflow
      const now = new Date();
      const workflowName = `AI Agent ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      const workflowRes = await WorkflowAPI.createWorkflow({
        name: workflowName,
        description: 'AI Agent workflow with OpenAI model',
        workflow: {
          triggers: [],
          steps: [],
          conditions: [],
          variables: [],
          outputs: [],
          canvas,
        },
      }, organizationId, projectId);

      const workflowId = workflowRes.id;

      toast.success(t('aiAgent.success.created', 'AI Agent workflow created'));
      navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflowId}`);

    } catch (error) {
      console.error('Failed to create AI Agent workflow:', error);
      toast.error(t('aiAgent.errors.creationFailed', 'Failed to create workflow'));
    }
  };

  const handleGetStarted = async () => {
    setIsCreating(true);

    if (!isAuthenticated) {
      // Store AI agent intent for after login
      sessionStorage.setItem(PENDING_AI_AGENT_KEY, JSON.stringify({ type: 'ai-agent' }));
      sessionStorage.setItem(PENDING_AI_AGENT_TIMESTAMP_KEY, Date.now().toString());
      navigate('/login?intent=try-ai-agent');
      return;
    }

    // Authenticated - create workflow directly
    await createAIAgentWorkflow();
    setIsCreating(false);
  };

  return (
    <section className="relative py-12 md:py-16 px-6 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-100/50 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-emerald-200 shadow-sm text-emerald-600 text-sm font-medium mb-6"
          >
            <Bot className="w-4 h-4" />
            {t('aiAgent.badge', 'AI-Powered Automation')}
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-gray-900">{t('aiAgent.title', 'Meet the')} </span>
            <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
              {t('aiAgent.titleHighlight', 'AI Agent Node')}
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            {t('aiAgent.subtitle', 'One powerful node that thinks, decides, and acts. Connect any tool and let AI handle the logic.')}
          </p>
        </motion.div>

        {/* Main Content: Workflow + Execution Log */}
        <div className="grid lg:grid-cols-5 gap-6 mb-12">
          {/* Workflow Canvas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-xl p-6 md:p-8"
          >
            {/* Canvas Header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-gray-400 ml-2">workflow-canvas</span>
            </div>

            {/* Workflow Visualization */}
            <div className="flex items-center justify-center gap-2 flex-wrap md:flex-nowrap py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              {/* Trigger Node */}
              <WorkflowNode
                type="trigger"
                label="Form Submit"
                color="from-blue-500 to-cyan-500"
                isActive={activeNode === 'trigger'}
                delay={0.2}
              />

              <ConnectionLine delay={0.4} isActive={activeNode === 'trigger'} />

              {/* AI Agent Node */}
              <WorkflowNode
                type="agent"
                label="AI Agent"
                isAIAgent
                isActive={activeNode === 'agent'}
                delay={0.5}
              />

              <ConnectionLine delay={0.8} isActive={activeNode === 'output'} />

              {/* Output Node */}
              <WorkflowNode
                type="output"
                label="Response"
                color="from-emerald-500 to-teal-500"
                isActive={activeNode === 'output'}
                delay={0.9}
              />
            </div>

            {/* Caption */}
            <p className="text-center text-sm text-gray-500 mt-4">
              {t('aiAgent.canvasCaption', 'AI Agent receives input, selects the right tool, and executes automatically')}
            </p>
          </motion.div>

          {/* Execution Log */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <ExecutionLog />
          </motion.div>
        </div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-4 mb-10"
        >
          {[
            {
              icon: <Zap className="w-5 h-5" />,
              title: t('aiAgent.feature1Title', 'Any Tool, One Node'),
              desc: t('aiAgent.feature1Desc', 'Connect Gmail, Slack, Notion, or any of 120+ connectors as AI tools'),
            },
            {
              icon: <Brain className="w-5 h-5" />,
              title: t('aiAgent.feature2Title', 'AI Decides'),
              desc: t('aiAgent.feature2Desc', 'Agent analyzes input and picks the right tool automatically'),
            },
            {
              icon: <Sparkles className="w-5 h-5" />,
              title: t('aiAgent.feature3Title', 'You Stay in Control'),
              desc: t('aiAgent.feature3Desc', 'Set max iterations, system prompts, and which tools are available'),
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center text-emerald-600 mb-3">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Button
            onClick={handleGetStarted}
            disabled={isCreating}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl hover:shadow-emerald-200 transition-all group disabled:opacity-70"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('aiAgent.creating', 'Creating...')}
              </>
            ) : (
              <>
                <Bot className="w-5 h-5 mr-2" />
                {t('aiAgent.cta', 'Try AI Agent')}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
          <p className="text-sm text-gray-500 mt-3">
            {t('aiAgent.ctaHint', 'No credit card required • Free tier available')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
