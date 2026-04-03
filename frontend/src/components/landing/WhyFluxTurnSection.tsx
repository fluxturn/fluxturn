import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Zap, Battery, BatteryLow, BatteryFull, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

// Complex workflow nodes (before simplification)
const complexNodes = [
  { id: 1, x: 10, y: 20, label: "Trigger" },
  { id: 2, x: 30, y: 10, label: "Validate" },
  { id: 3, x: 25, y: 35, label: "Check" },
  { id: 4, x: 50, y: 15, label: "Process" },
  { id: 5, x: 45, y: 40, label: "Transform" },
  { id: 6, x: 55, y: 55, label: "Filter" },
  { id: 7, x: 70, y: 25, label: "Route" },
  { id: 8, x: 65, y: 50, label: "Merge" },
  { id: 9, x: 75, y: 65, label: "Format" },
  { id: 10, x: 85, y: 35, label: "Output" },
  { id: 11, x: 35, y: 60, label: "Log" },
  { id: 12, x: 15, y: 50, label: "Retry" },
];

// Complex connections (tangled)
const complexConnections = [
  [1, 2], [1, 3], [2, 4], [3, 5], [4, 7], [5, 6], [5, 8],
  [6, 9], [7, 10], [8, 9], [9, 10], [3, 11], [11, 12], [12, 3],
  [2, 5], [6, 8], [4, 5],
];

// Simple workflow - FluxTurn hub with connected outputs
const connectedApps = [
  { id: 'slack', icon: '/icons/connectors/slack.png', label: 'Notify Team', color: '#4A154B' },
  { id: 'gmail', icon: '/icons/connectors/gmail.png', label: 'Send Email', color: '#EA4335' },
  { id: 'notion', icon: '/icons/connectors/notion.png', label: 'Create Page', color: '#000000' },
  { id: 'airtable', icon: '/icons/connectors/airtable.png', label: 'Log Data', color: '#18BFFF' },
];

export function WhyFluxTurnSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isInView, setIsInView] = useState(false);
  const [isSimplified, setIsSimplified] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(25);

  useEffect(() => {
    if (isInView) {
      let energyInterval: NodeJS.Timeout;

      const runAnimation = () => {
        // Start with complex view
        setIsSimplified(false);
        setEnergyLevel(25);

        // After 4 seconds, switch to simplified
        const simplifyTimer = setTimeout(() => {
          setIsSimplified(true);
          // Animate energy level up
          let level = 25;
          energyInterval = setInterval(() => {
            level += 5;
            setEnergyLevel(level);
            if (level >= 100) clearInterval(energyInterval);
          }, 50);
        }, 4000);

        return simplifyTimer;
      };

      // Run initial animation
      let simplifyTimer = runAnimation();

      // Set up interval to loop every 8 seconds (4s complex + 4s simplified)
      const loopInterval = setInterval(() => {
        clearTimeout(simplifyTimer);
        clearInterval(energyInterval);
        simplifyTimer = runAnimation();
      }, 8000);

      return () => {
        clearTimeout(simplifyTimer);
        clearInterval(energyInterval);
        clearInterval(loopInterval);
      };
    }
  }, [isInView]);

  const getEnergyColor = (level: number) => {
    if (level < 30) return "from-red-500 to-red-400";
    if (level < 60) return "from-yellow-500 to-orange-400";
    return "from-emerald-500 to-green-400";
  };

  const getEnergyBgColor = (level: number) => {
    if (level < 30) return "bg-red-100";
    if (level < 60) return "bg-yellow-100";
    return "bg-emerald-100";
  };

  return (
    <section className="relative py-16 md:py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onViewportEnter={() => setIsInView(true)}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            {t('whyFluxTurn.title', 'Why')}{' '}
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              FluxTurn
            </span>
            ?
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            {t('whyFluxTurn.subtitle', 'Transform complex processes into simple, efficient workflows')}
          </p>
        </motion.div>

        {/* Main Visualization Container */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl"
        >
          {/* Energy Meter - Top Right */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
              {energyLevel < 50 ? (
                <BatteryLow className={`w-5 h-5 ${energyLevel < 30 ? 'text-red-500' : 'text-yellow-500'}`} />
              ) : (
                <BatteryFull className="w-5 h-5 text-emerald-500" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {t('whyFluxTurn.efficiency', 'Efficiency')}
              </span>
            </div>
            <div className={`w-24 h-3 rounded-full ${getEnergyBgColor(energyLevel)} overflow-hidden`}>
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${getEnergyColor(energyLevel)}`}
                initial={{ width: "25%" }}
                animate={{ width: `${energyLevel}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className={`text-sm font-bold ${energyLevel >= 60 ? 'text-emerald-600' : energyLevel >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
              {energyLevel}%
            </span>
          </div>

          {/* Status Badge - Top Left */}
          <div className="absolute top-4 left-4 z-20">
            <AnimatePresence mode="wait">
              {!isSimplified ? (
                <motion.div
                  key="complex"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 border border-gray-200"
                >
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-600">
                    {t('whyFluxTurn.status.complex', 'Complex Process')}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="simple"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 bg-emerald-100 rounded-full px-4 py-2 border border-emerald-200"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    {t('whyFluxTurn.status.optimized', 'Optimized with FluxTurn')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Workflow Canvas */}
          <div className="relative h-[400px] md:h-[450px]">
            {/* Dotted grid background */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Complex Workflow */}
            <AnimatePresence>
              {!isSimplified && (
                <>
                  {/* Complex Connections */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                    {complexConnections.map(([from, to], idx) => {
                      const fromNode = complexNodes.find(n => n.id === from);
                      const toNode = complexNodes.find(n => n.id === to);
                      if (!fromNode || !toNode) return null;
                      return (
                        <motion.line
                          key={`complex-line-${idx}`}
                          x1={`${fromNode.x + 5}%`}
                          y1={`${fromNode.y + 5}%`}
                          x2={`${toNode.x + 5}%`}
                          y2={`${toNode.y + 5}%`}
                          stroke="#d1d5db"
                          strokeWidth="2"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.6 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                        />
                      );
                    })}
                  </svg>

                  {/* Complex Nodes */}
                  {complexNodes.map((node, idx) => (
                    <motion.div
                      key={`complex-${node.id}`}
                      className="absolute"
                      style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: 2 }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                      transition={{ delay: idx * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="px-3 py-1.5 bg-white rounded-lg border border-gray-300 shadow-sm text-xs font-medium text-gray-600 whitespace-nowrap">
                        {node.label}
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Simplified Workflow */}
            <AnimatePresence>
              {isSimplified && (
                <div className="absolute inset-0 flex items-center justify-center px-8 py-16">
                  {/* Main flow container - horizontal layout */}
                  <div className="relative w-full max-w-4xl flex items-center justify-between">

                    {/* Trigger Node - Left */}
                    <motion.div
                      className="relative z-10 flex-shrink-0"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <div className="px-5 py-3 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">When this happens</p>
                            <p className="font-semibold text-gray-800">New Form Submit</p>
                          </div>
                        </div>
                      </div>

                      {/* Connection line to FluxTurn */}
                      <motion.div
                        className="absolute top-1/2 -right-36 w-36 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                        style={{ transformOrigin: 'left' }}
                      />
                      <motion.div
                        className="absolute top-1/2 -right-36 w-3 h-3 rounded-full bg-cyan-500"
                        initial={{ opacity: 0, x: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], x: [0, 144] }}
                        transition={{ delay: 1, duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
                        style={{ transform: 'translateY(-50%)' }}
                      />
                    </motion.div>

                    {/* FluxTurn Hub - Center */}
                    <motion.div
                      className="relative z-20 mx-8 flex-shrink-0"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-2xl blur-2xl opacity-40" />

                        {/* Main hub */}
                        <div className="relative px-6 py-4 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl border-2 border-cyan-400 shadow-2xl shadow-cyan-500/30">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                              <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-cyan-100 text-xs font-medium">Powered by</p>
                              <p className="text-white font-bold text-lg">FluxTurn</p>
                            </div>
                          </div>

                          {/* Processing indicator */}
                          <motion.div
                            className="mt-3 flex items-center gap-2 text-cyan-100 text-xs"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                            Processing automatically...
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Output Apps Container - Right side with fan layout */}
                    <div className="relative flex-shrink-0">
                      {/* Connection lines container */}
                      <svg className="absolute -left-40 top-1/2 -translate-y-1/2 w-40 h-48" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="connGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        {connectedApps.map((app, idx) => {
                          const startY = 96; // Center of the SVG (h-48 = 192px, center = 96)
                          const endY = 24 + idx * 50; // Evenly spaced: 24, 74, 124, 174
                          return (
                            <g key={`conn-${app.id}`}>
                              <motion.path
                                d={`M 0,${startY} C 80,${startY} 80,${endY} 160,${endY}`}
                                fill="none"
                                stroke="url(#connGradient)"
                                strokeWidth="2"
                                strokeOpacity="0.6"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.5 + idx * 0.1, duration: 0.4 }}
                              />
                              {/* Animated dot along the path */}
                              <motion.circle
                                r="4"
                                fill="#10b981"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 1, 0] }}
                                transition={{
                                  delay: 1.2 + idx * 0.3,
                                  duration: 0.6,
                                  repeat: Infinity,
                                  repeatDelay: 2.5,
                                }}
                              >
                                <animateMotion
                                  dur="0.6s"
                                  repeatCount="indefinite"
                                  begin={`${1.2 + idx * 0.3}s`}
                                  path={`M 0,${startY} C 80,${startY} 80,${endY} 160,${endY}`}
                                />
                              </motion.circle>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Output app cards */}
                      <div className="flex flex-col gap-3">
                        {connectedApps.map((app, idx) => (
                          <motion.div
                            key={`app-${app.id}`}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + idx * 0.15, type: "spring", stiffness: 200 }}
                          >
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow min-w-[160px]">
                              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                                <img
                                  src={app.icon}
                                  alt={app.id}
                                  className="w-5 h-5 object-contain"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{app.label}</p>
                                <motion.p
                                  className="text-xs text-emerald-600"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 1.2 + idx * 0.2 }}
                                >
                                  ✓ Completed
                                </motion.p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Floating particles around FluxTurn */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={`particle-${i}`}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        background: i % 2 === 0 ? '#06b6d4' : '#10b981',
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 0.8, 0],
                        scale: [0, 1, 0],
                        x: [0, Math.cos(i * 60 * Math.PI / 180) * 80],
                        y: [0, Math.sin(i * 60 * Math.PI / 180) * 60],
                      }}
                      transition={{
                        delay: 0.8 + i * 0.15,
                        duration: 1.5,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Stats Bar */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <AnimatePresence mode="wait">
                  {isSimplified ? (
                    <motion.div
                      key="stats"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-6 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{t('whyFluxTurn.stats.nodes', 'Nodes:')}</span>
                        <span className="font-bold text-gray-900">12 → 3</span>
                        <span className="text-emerald-600 text-xs font-medium">-75%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{t('whyFluxTurn.stats.time', 'Setup time:')}</span>
                        <span className="font-bold text-gray-900">2h → 5min</span>
                        <span className="text-emerald-600 text-xs font-medium">-96%</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-gray-500"
                    >
                      {t('whyFluxTurn.analyzing', 'Analyzing workflow complexity...')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/20 group"
              >
                {t('whyFluxTurn.cta', 'Start simplifying')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
