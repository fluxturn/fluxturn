import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Workflow,
  Code,
  Globe,
  Shield,
  Cloud,
  GitBranch,
  Play,
  Layers,
  Bot,
  MessageSquare,
  Wand2,
  CheckCircle2,
  MousePointer2,
  Puzzle,
  RefreshCw,
  Eye
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useTranslation } from "react-i18next";
import { SEO } from "../components/SEO";

export function Features() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Features"
        description="Discover the powerful features that make FluxTurn the most flexible workflow automation platform. Visual builder, 500+ integrations, custom code support, and enterprise security."
        canonical="/features"
      />
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />

        {/* Gradient Orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/90">{t('featuresPage.badge', 'Powerful Features')}</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            >
              {t('featuresPage.title', 'Everything You Need to')}{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                {t('featuresPage.titleHighlight', 'Automate')}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed"
            >
              {t('featuresPage.subtitle', 'Discover the powerful features that make FluxTurn the most flexible workflow automation platform for modern teams.')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/register">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all group">
                  <Zap className="w-5 h-5 mr-2" />
                  {t('featuresPage.cta', 'Start Free Trial')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="outline" className="border-2 border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white px-8 py-6 text-lg font-semibold rounded-xl transition-all">
                  {t('featuresPage.viewDocs', 'View Documentation')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Overview Stats */}
      <section className="relative py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Workflow, label: t('featuresPage.stats.workflows', 'Unlimited Workflows'), value: t('featuresPage.stats.workflowsValue', 'Build') },
              { icon: Globe, label: t('featuresPage.stats.integrations', 'Integrations'), value: '500+' },
              { icon: Code, label: t('featuresPage.stats.codeSupport', 'Code Support'), value: 'JS & Python' },
              { icon: Shield, label: t('featuresPage.stats.security', 'Security'), value: 'Enterprise' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Workflow Builder Video Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-white to-gray-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full"
              >
                <Bot className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{t('featuresPage.aiSection.badge')}</span>
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                  {t('featuresPage.aiSection.title')}{" "}
                  <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                    {t('featuresPage.aiSection.titleHighlight')}
                  </span>
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  {t('featuresPage.aiSection.subtitle')}
                </p>
              </motion.div>

              {/* Feature List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                {[
                  { icon: Wand2, key: 'naturalLanguage' },
                  { icon: MessageSquare, key: 'aiChat' },
                  { icon: Zap, key: 'instantGeneration' },
                  { icon: Code, key: 'smartSuggestions' },
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        {t(`featuresPage.aiSection.features.${feature.key}.title`)}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {t(`featuresPage.aiSection.features.${feature.key}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all group">
                    <Bot className="w-5 h-5 mr-2" />
                    {t('featuresPage.aiSection.cta')}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Side - Video */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-3xl blur-2xl opacity-60" />

              {/* Video Frame */}
              <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-2xl">
                {/* Browser-like Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-t-lg md:rounded-t-xl border-b border-gray-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-3 py-1 bg-gray-700/50 rounded-md text-xs text-gray-400 font-medium">
                      {t('featuresPage.aiSection.videoTitle')}
                    </div>
                  </div>
                  <div className="w-12" />
                </div>

                {/* Video Element */}
                <div className="relative rounded-b-lg md:rounded-b-xl overflow-hidden">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    className="w-full h-auto block"
                  >
                    <source src="https://cdn.fluxturn.com/videos/ai_workflow.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-4 -left-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg"
              >
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold text-sm">{t('featuresPage.aiSection.floatingBadge')}</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Editor Video Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-gray-50/50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Video */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative order-2 lg:order-1"
            >
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-teal-500/20 rounded-3xl blur-2xl opacity-60" />

              {/* Video Frame */}
              <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-2xl">
                {/* Browser-like Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-t-lg md:rounded-t-xl border-b border-gray-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-3 py-1 bg-gray-700/50 rounded-md text-xs text-gray-400 font-medium">
                      {t('featuresPage.visualSection.videoTitle')}
                    </div>
                  </div>
                  <div className="w-12" />
                </div>

                {/* Video Element */}
                <div className="relative rounded-b-lg md:rounded-b-xl overflow-hidden">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    className="w-full h-auto block"
                  >
                    <source src="https://cdn.fluxturn.com/videos/workflow_editor_vid.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-4 -right-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-lg"
              >
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold text-sm">{t('featuresPage.visualSection.floatingBadge')}</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Side - Content */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8 order-1 lg:order-2"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full"
              >
                <Workflow className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{t('featuresPage.visualSection.badge')}</span>
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                  {t('featuresPage.visualSection.title')}{" "}
                  <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-500 bg-clip-text text-transparent">
                    {t('featuresPage.visualSection.titleHighlight')}
                  </span>
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  {t('featuresPage.visualSection.subtitle')}
                </p>
              </motion.div>

              {/* Feature List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                {[
                  { icon: MousePointer2, key: 'dragDrop' },
                  { icon: Puzzle, key: 'integrations' },
                  { icon: RefreshCw, key: 'realtime' },
                  { icon: Eye, key: 'preview' },
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-cyan-300 hover:shadow-lg transition-all">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        {t(`featuresPage.visualSection.features.${feature.key}.title`)}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {t(`featuresPage.visualSection.features.${feature.key}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all group">
                    <Workflow className="w-5 h-5 mr-2" />
                    {t('featuresPage.visualSection.cta')}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Content - Placeholder for user content */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('featuresPage.coreFeatures.title', 'Core Features')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('featuresPage.coreFeatures.subtitle', 'Explore the powerful capabilities that set FluxTurn apart')}
            </p>
          </motion.div>

          {/* Feature cards placeholder - will be populated with content */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Workflow, title: t('featuresPage.features.visualBuilder.title', 'Visual Workflow Builder'), description: t('featuresPage.features.visualBuilder.desc', 'Drag-and-drop interface to build complex automation workflows without code.') },
              { icon: GitBranch, title: t('featuresPage.features.conditionalLogic.title', 'Conditional Logic'), description: t('featuresPage.features.conditionalLogic.desc', 'Create branching workflows with if/else conditions, loops, and decision trees.') },
              { icon: Code, title: t('featuresPage.features.customCode.title', 'Custom Code'), description: t('featuresPage.features.customCode.desc', 'Execute JavaScript or Python code for maximum flexibility.') },
              { icon: Globe, title: t('featuresPage.features.integrations.title', '500+ Integrations'), description: t('featuresPage.features.integrations.desc', 'Connect with all your favorite apps and services out of the box.') },
              { icon: Zap, title: t('featuresPage.features.realtime.title', 'Real-time Execution'), description: t('featuresPage.features.realtime.desc', 'Lightning-fast workflow execution with real-time monitoring.') },
              { icon: Shield, title: t('featuresPage.features.security.title', 'Enterprise Security'), description: t('featuresPage.features.security.desc', 'Bank-level encryption, SOC2 compliance, and granular access controls.') },
              { icon: Cloud, title: t('featuresPage.features.deployment.title', 'Cloud & Self-Hosted'), description: t('featuresPage.features.deployment.desc', 'Deploy on our cloud or self-host on your own infrastructure.') },
              { icon: Play, title: t('featuresPage.features.scheduling.title', 'Advanced Scheduling'), description: t('featuresPage.features.scheduling.desc', 'Schedule workflows to run at specific times or intervals.') },
              { icon: Layers, title: t('featuresPage.features.templates.title', '300+ Templates'), description: t('featuresPage.features.templates.desc', 'Start quickly with pre-built workflow templates for common use cases.') },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-cyan-200 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/20">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-cyan-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t('featuresPage.ctaSection.title', 'Ready to Get Started?')}
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              {t('featuresPage.ctaSection.subtitle', 'Start automating your workflows today with FluxTurn. No credit card required.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button className="bg-white hover:bg-gray-50 text-cyan-600 px-8 py-6 text-lg font-bold rounded-xl shadow-2xl hover:shadow-white/20 transition-all group">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t('featuresPage.ctaSection.cta', 'Start Free Trial')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" className="border-2 border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-6 text-lg font-semibold rounded-xl transition-all">
                  {t('featuresPage.ctaSection.viewPricing', 'View Pricing')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
