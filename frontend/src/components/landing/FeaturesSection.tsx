import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Brain,
  Blocks,
  Workflow,
  Code,
  Sparkles,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

// Integration icons for carousel
const integrationIcons = [
  { id: 'slack', icon: '/icons/connectors/slack.png' },
  { id: 'gmail', icon: '/icons/connectors/gmail.png' },
  { id: 'notion', icon: '/icons/connectors/notion.png' },
  { id: 'github', icon: '/icons/connectors/github.png' },
  { id: 'discord', icon: '/icons/connectors/discord.png' },
  { id: 'airtable', icon: '/icons/connectors/airtable.png' },
];

// Code lines for typing animation
const codeLines = [
  { text: 'const data = await', color: 'text-purple-400' },
  { text: '  fetch(api.endpoint);', color: 'text-cyan-400' },
  { text: 'return transform(data);', color: 'text-emerald-400' },
];

// AI Workflow Generation Animation Component
function AIWorkflowAnimation() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState(0); // 0: typing, 1: generating, 2: complete
  const prompt = t('landing.features.demoPrompt');
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let timeout1: NodeJS.Timeout;
    let timeout2: NodeJS.Timeout;
    let typeInterval: NodeJS.Timeout;

    const runAnimation = () => {
      setPhase(0);
      setDisplayedText("");

      let charIndex = 0;
      typeInterval = setInterval(() => {
        if (charIndex < prompt.length) {
          setDisplayedText(prompt.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          timeout1 = setTimeout(() => setPhase(1), 400);
          timeout2 = setTimeout(() => setPhase(2), 1600);
        }
      }, 50);
    };

    runAnimation();
    const loopInterval = setInterval(runAnimation, 6000);

    return () => {
      clearInterval(loopInterval);
      clearInterval(typeInterval);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [prompt]);

  return (
    <div className="absolute bottom-3 left-3 right-3 top-[155px] flex flex-col gap-2">
      {/* Prompt input */}
      <div className="bg-white rounded-lg border border-cyan-200 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3 text-cyan-500 flex-shrink-0" />
          <span className="text-xs text-gray-700">
            {displayedText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-0.5 h-3 bg-cyan-500 ml-0.5"
            />
          </span>
        </div>
      </div>

      {/* Workflow canvas */}
      <div className="flex-1 relative bg-white/80 rounded-lg border border-gray-200 flex items-center justify-center">
        <AnimatePresence>
          {phase >= 1 && (
            <div className="relative" style={{ width: 240, height: 120 }}>
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                {phase >= 2 && (
                  <>
                    <motion.line x1="45" y1="60" x2="85" y2="30" stroke="#06b6d4" strokeWidth="2"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.25 }} />
                    <motion.line x1="45" y1="60" x2="85" y2="90" stroke="#06b6d4" strokeWidth="2"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.25 }} />
                    <motion.line x1="155" y1="30" x2="195" y2="60" stroke="#06b6d4" strokeWidth="2"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.25 }} />
                    <motion.line x1="155" y1="90" x2="195" y2="60" stroke="#06b6d4" strokeWidth="2"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.25 }} />
                  </>
                )}
              </svg>

              {/* Trigger node */}
              <motion.div className="absolute" style={{ left: 0, top: 40, zIndex: 2 }}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0, type: "spring", stiffness: 300 }}>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-white rounded-xl shadow border border-gray-200 flex items-center justify-center">
                    <img src="/icons/connectors/gmail.png" alt="Trigger" className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1">Trigger</span>
                </div>
              </motion.div>

              {/* GitHub node */}
              <motion.div className="absolute" style={{ left: 95, top: 5, zIndex: 2 }}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-white rounded-xl shadow border border-gray-200 flex items-center justify-center">
                    <img src="/icons/connectors/github.png" alt="GitHub" className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1">GitHub</span>
                </div>
              </motion.div>

              {/* Notion node */}
              <motion.div className="absolute" style={{ left: 95, top: 70, zIndex: 2 }}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-white rounded-xl shadow border border-gray-200 flex items-center justify-center">
                    <img src="/icons/connectors/notion.png" alt="Notion" className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1">Notion</span>
                </div>
              </motion.div>

              {/* Slack node */}
              <motion.div className="absolute" style={{ left: 190, top: 40, zIndex: 2 }}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-white rounded-xl shadow border border-gray-200 flex items-center justify-center">
                    <img src="/icons/connectors/slack.png" alt="Slack" className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1">Notify</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Generating overlay */}
        {phase === 1 && (
          <motion.div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg z-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 text-xs text-cyan-600 font-medium">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="w-4 h-4" />
              </motion.div>
              Generating...
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Visual Builder Animation Component
function VisualBuilderAnimation() {
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-3 right-3 left-3 h-14 bg-white/80 rounded-lg border border-orange-100 overflow-hidden">
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line x1="52" y1="28" x2="80" y2="28" stroke="#f97316" strokeWidth="2" />
        <line x1="120" y1="28" x2="148" y2="28" stroke="#ef4444" strokeWidth="2" />
        {/* Animated dots */}
        <motion.circle r="3" fill="#f97316" cy="28"
          animate={{ cx: [52, 80], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.2 }}
        />
        <motion.circle r="3" fill="#ef4444" cy="28"
          animate={{ cx: [120, 148], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.8, delay: 0.4, repeat: Infinity, repeatDelay: 1.2 }}
        />
      </svg>

      {/* Nodes */}
      <motion.div className="absolute" style={{ left: 20, top: 12 }}
        animate={{ scale: activeNode === 0 ? 1.1 : 1 }} transition={{ duration: 0.3 }}>
        <div className={`w-8 h-8 bg-white rounded-lg shadow border ${activeNode === 0 ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200'} flex items-center justify-center`}>
          <img src="/icons/connectors/gmail.png" alt="" className="w-5 h-5" />
        </div>
      </motion.div>

      <motion.div className="absolute" style={{ left: 88, top: 12 }}
        animate={{ scale: activeNode === 1 ? 1.1 : 1 }} transition={{ duration: 0.3 }}>
        <div className={`w-8 h-8 bg-white rounded-lg shadow border ${activeNode === 1 ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200'} flex items-center justify-center`}>
          <img src="/icons/connectors/github.png" alt="" className="w-5 h-5" />
        </div>
      </motion.div>

      <motion.div className="absolute" style={{ left: 156, top: 12 }}
        animate={{ scale: activeNode === 2 ? 1.1 : 1 }} transition={{ duration: 0.3 }}>
        <div className={`w-8 h-8 bg-white rounded-lg shadow border ${activeNode === 2 ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200'} flex items-center justify-center`}>
          <img src="/icons/connectors/notion.png" alt="" className="w-5 h-5" />
        </div>
      </motion.div>
    </div>
  );
}

// AI Agent Animation Component
function AIAgentAnimation() {
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    setThinking(true);
    const interval = setInterval(() => {
      setThinking(false);
      setTimeout(() => setThinking(true), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-3 right-3 left-3 h-12 bg-white/70 rounded-lg border border-emerald-100 flex items-center justify-center gap-3">
      {/* Brain icon with pulse */}
      <motion.div
        className="relative"
        animate={thinking ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.6, repeat: thinking ? Infinity : 0 }}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow">
          <Brain className="w-4 h-4 text-white" />
        </div>
        {thinking && (
          <motion.div
            className="absolute -inset-0.5 bg-emerald-400 rounded-lg"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Thinking text */}
      <AnimatePresence mode="wait">
        {thinking ? (
          <motion.span
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-emerald-600 font-medium"
          >
            Thinking...
          </motion.span>
        ) : (
          <motion.span
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-gray-500"
          >
            Ready
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// Integrations Animation Component
function IntegrationsAnimation() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % integrationIcons.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Show 4 icons at a time
  const visibleIcons = [0, 1, 2, 3].map((offset) => {
    const idx = (currentIndex + offset) % integrationIcons.length;
    return integrationIcons[idx];
  });

  return (
    <div className="absolute bottom-3 right-3 left-3 h-12 bg-white/70 rounded-lg border border-blue-100 flex items-center justify-center gap-2">
      <AnimatePresence mode="popLayout">
        {visibleIcons.map((icon, idx) => (
          <motion.div
            key={`${icon.id}-${currentIndex}`}
            className="w-8 h-8 bg-white rounded-lg shadow border border-gray-100 flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <img src={icon.icon} alt={icon.id} className="w-5 h-5 object-contain" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Custom Code Animation Component
function CustomCodeAnimation() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCharIndex((prev) => {
        const currentLine = codeLines[visibleLines];
        if (currentLine && prev < currentLine.text.length) {
          return prev + 1;
        } else if (visibleLines < codeLines.length - 1) {
          setVisibleLines((v) => v + 1);
          return 0;
        } else {
          // Reset after complete
          setTimeout(() => {
            setVisibleLines(0);
            setCharIndex(0);
          }, 2000);
          return prev;
        }
      });
    }, 80);
    return () => clearInterval(interval);
  }, [visibleLines]);

  return (
    <div className="absolute bottom-3 right-3 left-3 bg-gray-900 rounded-lg p-2 font-mono text-[10px] shadow-lg leading-relaxed">
      {codeLines.map((line, idx) => (
        <div key={idx} className={`${line.color} ${idx > visibleLines ? 'opacity-0' : 'opacity-100'} h-4`}>
          {idx < visibleLines
            ? line.text
            : idx === visibleLines
              ? line.text.slice(0, charIndex)
              : ''}
          {idx === visibleLines && (
            <motion.span
              className="inline-block w-1 h-2.5 bg-cyan-400 ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Bento grid feature data
const bentoFeatures = [
  {
    id: 'ai-workflow',
    size: 'large',
    icon: Sparkles,
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
    borderColor: 'border-cyan-200 hover:border-cyan-300',
    Animation: AIWorkflowAnimation,
  },
  {
    id: 'visual-builder',
    size: 'medium',
    icon: Workflow,
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-50 to-red-50',
    borderColor: 'border-orange-200 hover:border-orange-300',
    Animation: VisualBuilderAnimation,
  },
  {
    id: 'ai-agent',
    size: 'medium',
    icon: Brain,
    gradient: 'from-emerald-500 to-cyan-500',
    bgGradient: 'from-emerald-50 to-cyan-50',
    borderColor: 'border-emerald-200 hover:border-emerald-300',
    Animation: AIAgentAnimation,
  },
  {
    id: 'integrations',
    size: 'medium',
    icon: Blocks,
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200 hover:border-blue-300',
    stat: '120+',
    Animation: IntegrationsAnimation,
  },
  {
    id: 'custom-code',
    size: 'medium',
    icon: Code,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200 hover:border-purple-300',
    Animation: CustomCodeAnimation,
  },
];

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section id="features" className="relative py-16 md:py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 leading-tight">
            {t('features.title', 'Empower your workflow:')}<br />
            {t('features.titleExplore', 'explore')} <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">{t('features.titleHighlight', 'all-in-one')}</span> {t('features.titleEnd', 'platform.')}
          </h2>
          <p className="text-base md:text-lg text-gray-600 mb-6 max-w-2xl">
            {t('features.subtitle', 'Everything you need to automate your workflows and connect your entire tech stack')}
          </p>
          <Link
            to="/features"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-xl group"
          >
            {t('features.cta', 'Explore Features')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[210px]">
          {bentoFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const isLarge = feature.size === 'large';
            const Animation = feature.Animation;

            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`
                  relative overflow-hidden rounded-2xl border bg-gradient-to-br ${feature.bgGradient} ${feature.borderColor}
                  p-4 cursor-pointer transition-all duration-300 hover:shadow-lg group
                  ${isLarge ? 'col-span-2 row-span-2' : ''}
                `}
              >
                {/* Icon */}
                <div className={`
                  rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shadow-lg
                  ${isLarge ? 'w-12 h-12 mb-3' : 'w-9 h-9 mb-2'}
                `}>
                  <Icon className={isLarge ? 'w-6 h-6' : 'w-4 h-4'} />
                </div>

                {/* Stat (if exists) */}
                {feature.stat && (
                  <div className="absolute top-4 right-4 text-2xl font-bold text-gray-900">
                    {feature.stat}
                  </div>
                )}

                {/* Title */}
                <h3 className={`
                  font-bold text-gray-900 mb-0.5 group-hover:text-cyan-600 transition-colors
                  ${isLarge ? 'text-lg md:text-xl' : 'text-sm'}
                `}>
                  {t(`features.bento.${feature.id}.title`)}
                </h3>

                {/* Description */}
                <p className={`
                  text-gray-600 leading-snug
                  ${isLarge ? 'text-sm max-w-xs' : 'text-xs line-clamp-2'}
                `}>
                  {t(`features.bento.${feature.id}.description`)}
                </p>

                {/* Animated content */}
                <Animation />

                {/* Hover arrow - only for large card */}
                {isLarge && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
