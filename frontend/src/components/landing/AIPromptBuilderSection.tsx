import { useState, useContext, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Loader2, Wand2, Play, MessageSquare, Zap, Boxes, Bot } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AuthContext } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { WorkflowAPI } from "../../lib/fluxturn";

// Session storage keys
export const PENDING_PROMPT_KEY = 'fluxturn_pending_ai_prompt';
export const PENDING_PROMPT_TIMESTAMP_KEY = 'fluxturn_pending_ai_prompt_timestamp';

interface Suggestion {
  id: string;
  titleKey: string;
  // English description for the AI prompt (always in English)
  promptDescription: string;
}

const suggestions: Suggestion[] = [
  {
    id: 'gmail',
    titleKey: 'aiPromptBuilder.suggestions.gmail.title',
    promptDescription: 'Create a trigger form where all the necessary fields for Gmail will be available and send it to Gmail'
  },
  {
    id: 'translate',
    titleKey: 'aiPromptBuilder.suggestions.translate.title',
    promptDescription: 'Automatically convert messages to your preferred language'
  },
  {
    id: 'price-alert',
    titleKey: 'aiPromptBuilder.suggestions.priceAlert.title',
    promptDescription: 'Track products and get notified when they hit my target price'
  },
  {
    id: 'email-summary',
    titleKey: 'aiPromptBuilder.suggestions.emailSummary.title',
    promptDescription: 'Get a quick digest of my inbox highlights every morning'
  },
  {
    id: 'support-draft',
    titleKey: 'aiPromptBuilder.suggestions.supportDraft.title',
    promptDescription: 'Generate helpful response drafts for customer inquiries'
  },
  {
    id: 'crm-update',
    titleKey: 'aiPromptBuilder.suggestions.crmUpdate.title',
    promptDescription: 'Add new leads to my CRM without manual entry'
  },
  {
    id: 'slack-tasks',
    titleKey: 'aiPromptBuilder.suggestions.slackTasks.title',
    promptDescription: 'Turn Slack messages into to-dos with one reaction or command'
  },
];

// Typewriter placeholder phrases
const placeholderPhrases = [
  "Send a welcome email when someone signs up...",
  "Summarize my emails every morning...",
  "Create a task when I get a Slack message...",
  "Alert me when a product price drops...",
  "Translate incoming support tickets...",
  "Update my CRM from form submissions...",
];

export function AIPromptBuilderSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const organizations = authContext?.organizations ?? [];

  // Typewriter effect for placeholder
  useEffect(() => {
    if (isFocused || prompt) return;

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout: NodeJS.Timeout;

    const type = () => {
      const currentPhrase = placeholderPhrases[phraseIndex];

      if (isDeleting) {
        setPlaceholderText(currentPhrase.substring(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % placeholderPhrases.length;
          timeout = setTimeout(type, 500);
        } else {
          timeout = setTimeout(type, 30);
        }
      } else {
        setPlaceholderText(currentPhrase.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentPhrase.length) {
          isDeleting = true;
          timeout = setTimeout(type, 2000);
        } else {
          timeout = setTimeout(type, 50);
        }
      }
    };

    timeout = setTimeout(type, 500);
    return () => clearTimeout(timeout);
  }, [isFocused, prompt]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    // Always use English description for AI prompt
    setPrompt(suggestion.promptDescription);
    textareaRef.current?.focus();
  };

  const createWorkflowInExistingProject = async (promptText: string) => {
    try {
      const organizationId = organizations[0]?.id;
      if (!organizationId) {
        toast.error(t('aiPromptBuilder.errors.noOrganization'));
        navigate('/orgs');
        return;
      }

      // 1. Get existing projects for this organization
      const projectsRes = await api.getProjectsByOrganization(organizationId);
      const projects = (projectsRes as any).data || (projectsRes as any);

      if (!projects || projects.length === 0) {
        toast.error(t('aiPromptBuilder.errors.noProject'));
        navigate(`/org/${organizationId}`);
        return;
      }

      const projectId = projects[0].id;

      // 2. Create workflow with correct structure
      const now = new Date();
      const defaultName = `AI Workflow ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      const workflowRes = await WorkflowAPI.createWorkflow({
        name: defaultName,
        description: promptText.substring(0, 200),
        workflow: {
          triggers: [],
          steps: [],
          conditions: [],
          variables: [],
          outputs: [],
          canvas: {
            nodes: [],
            edges: [],
          },
        },
      }, organizationId, projectId);

      const workflowId = workflowRes.id;

      // 3. Store prompt for editor to pick up
      sessionStorage.setItem(PENDING_PROMPT_KEY, promptText);

      // 4. Navigate to editor with ai-generate flag
      navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflowId}?ai-generate=true`);

    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast.error(t('aiPromptBuilder.errors.creationFailed'));
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t('aiPromptBuilder.errors.emptyPrompt'));
      return;
    }

    setIsLoading(true);

    if (!isAuthenticated) {
      // Store prompt for after login
      sessionStorage.setItem(PENDING_PROMPT_KEY, prompt);
      sessionStorage.setItem(PENDING_PROMPT_TIMESTAMP_KEY, Date.now().toString());
      navigate('/login?intent=ai-generate');
      return;
    }

    // Authenticated - create workflow in existing project
    await createWorkflowInExistingProject(prompt);
  };

  return (
    <section className="relative py-16 md:py-20 px-6 overflow-hidden bg-gradient-to-b from-white to-gray-50/50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative px-4 md:px-8 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-block mb-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/60 shadow-sm">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                {t('aiPromptBuilder.badge')}
              </span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight"
          >
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              {t('aiPromptBuilder.heading')}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base md:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto"
          >
            {t('aiPromptBuilder.subtitle')}
          </motion.p>
        </motion.div>

        {/* AI Workflow Video Demo with Floating Cards */}
        <div className="relative mb-10">
          {/* Left Floating Cards */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute -left-4 md:-left-16 lg:-left-24 top-1/4 hidden md:flex flex-col gap-4 z-20"
          >
            {/* Natural Language Card */}
            <motion.div
              whileHover={{ scale: 1.05, x: 5 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-32 lg:w-36"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-3 shadow-md">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{t('aiPromptBuilder.cards.naturalLanguage', 'Natural Language')}</p>
            </motion.div>

            {/* No-Code Card */}
            <motion.div
              whileHover={{ scale: 1.05, x: 5 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-32 lg:w-36"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-md">
                <Boxes className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{t('aiPromptBuilder.cards.noCode', 'No-Code Builder')}</p>
            </motion.div>
          </motion.div>

          {/* Right Floating Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="absolute -right-4 md:-right-16 lg:-right-24 top-1/4 hidden md:flex flex-col gap-4 z-20"
          >
            {/* AI Generation Card */}
            <motion.div
              whileHover={{ scale: 1.05, x: -5 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-32 lg:w-36"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-3 shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{t('aiPromptBuilder.cards.aiGeneration', 'AI Generation')}</p>
            </motion.div>

            {/* Integrations Card */}
            <motion.div
              whileHover={{ scale: 1.05, x: -5 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-32 lg:w-36"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-3 shadow-md">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{t('aiPromptBuilder.cards.integrations', '120+ Integrations')}</p>
            </motion.div>
          </motion.div>

          {/* Video Container */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="relative cursor-pointer"
          >
            <div className="relative group">
              {/* Glow effect - enhanced on hover */}
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 rounded-2xl blur-xl opacity-70 transition-all duration-500 group-hover:opacity-100 group-hover:-inset-4 group-hover:blur-2xl" />

              {/* Video Frame */}
              <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-1.5 shadow-2xl transition-shadow duration-500 group-hover:shadow-cyan-500/20 group-hover:shadow-3xl">
                {/* Browser-like Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-t-lg border-b border-gray-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-md">
                      <Play className="w-3 h-3 text-cyan-400" fill="currentColor" />
                      <span className="text-xs text-gray-400 font-medium">
                        {t('aiPromptBuilder.videoTitle', 'AI Workflow Generation')}
                      </span>
                    </div>
                  </div>
                  <div className="w-12" />
                </div>

                {/* Video Element */}
                <div className="relative rounded-b-lg overflow-hidden">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto block"
                  >
                    <source src="https://cdn.fluxturn.com/videos/ai_workflow.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Prompt Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-6"
        >
          <div className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ${
            isFocused
              ? 'border-cyan-400 shadow-cyan-100/50 shadow-xl'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            {/* Glow effect when focused */}
            {isFocused && (
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-2xl blur-lg -z-10" />
            )}

            <div className="p-4 pb-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder=""
                    className="w-full min-h-[80px] text-base md:text-lg bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-gray-800 leading-relaxed"
                    disabled={isLoading}
                  />
                  {/* Animated placeholder */}
                  {!prompt && !isFocused && (
                    <div className="absolute top-0 left-0 text-base md:text-lg text-gray-400 pointer-events-none leading-relaxed">
                      {placeholderText}
                      <span className="inline-block w-0.5 h-5 bg-cyan-500 ml-0.5 animate-pulse" />
                    </div>
                  )}
                  {!prompt && isFocused && (
                    <div className="absolute top-0 left-0 text-base md:text-lg text-gray-300 pointer-events-none leading-relaxed">
                      {t('aiPromptBuilder.placeholder')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <p className="text-xs text-gray-400 hidden sm:block">
                {t('aiPromptBuilder.helperText')}
              </p>
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ml-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    {t('aiPromptBuilder.generating')}
                  </>
                ) : (
                  <>
                    {t('aiPromptBuilder.generate')}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <p className="text-sm text-gray-500 mb-3 text-center font-medium">
            {t('aiPromptBuilder.tryThese')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 rounded-full bg-white border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50 shadow-sm hover:shadow-md transition-all text-sm text-gray-600 hover:text-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t(suggestion.titleKey)}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
