import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

// Category definitions with their connectors
const categories = [
  {
    id: 'communication',
    label: 'Communication',
    connectors: [
      { id: 'slack', name: 'Slack', icon: '/icons/connectors/slack.png' },
      { id: 'discord', name: 'Discord', icon: '/icons/connectors/discord.png' },
      { id: 'gmail', name: 'Gmail', icon: '/icons/connectors/gmail.png' },
      { id: 'telegram', name: 'Telegram', icon: '/icons/connectors/telegram.png' },
      { id: 'teams', name: 'Teams', icon: '/icons/connectors/teams.png' },
      { id: 'whatsapp', name: 'WhatsApp', icon: '/icons/connectors/whatsapp.png' },
      { id: 'twilio', name: 'Twilio', icon: '/icons/connectors/twilio.png' },
      { id: 'zoom', name: 'Zoom', icon: '/icons/connectors/zoom.png' },
    ]
  },
  {
    id: 'ai',
    label: 'AI Tools',
    connectors: [
      { id: 'openai', name: 'OpenAI', icon: '/icons/connectors/openai.png' },
      { id: 'anthropic', name: 'Anthropic', icon: '/icons/connectors/anthropic.png' },
      { id: 'google_ai', name: 'Google AI', icon: '/icons/connectors/google_ai.png' },
      { id: 'aws_bedrock', name: 'AWS Bedrock', icon: '/icons/connectors/aws_bedrock.png' },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    connectors: [
      { id: 'mailchimp', name: 'Mailchimp', icon: '/icons/connectors/mailchimp.png' },
      { id: 'klaviyo', name: 'Klaviyo', icon: '/icons/connectors/klaviyo.png' },
      { id: 'hubspot', name: 'HubSpot', icon: '/icons/connectors/hubspot.png' },
      { id: 'facebook_ads', name: 'Facebook Ads', icon: '/icons/connectors/facebook_ads.png' },
      { id: 'google_ads', name: 'Google Ads', icon: '/icons/connectors/google_ads.png' },
      { id: 'segment', name: 'Segment', icon: '/icons/connectors/segment.png' },
    ]
  },
  {
    id: 'data',
    label: 'Data & Storage',
    connectors: [
      { id: 'mongodb', name: 'MongoDB', icon: '/icons/connectors/mongodb.png' },
      { id: 'postgresql', name: 'PostgreSQL', icon: '/icons/connectors/postgresql.png' },
      { id: 'mysql', name: 'MySQL', icon: '/icons/connectors/mysql.png' },
      { id: 'redis', name: 'Redis', icon: '/icons/connectors/redis.png' },
      { id: 'google_sheets', name: 'Sheets', icon: '/icons/connectors/google_sheets.png' },
      { id: 'aws_s3', name: 'AWS S3', icon: '/icons/connectors/aws_s3.png' },
      { id: 'dropbox', name: 'Dropbox', icon: '/icons/connectors/dropbox.png' },
      { id: 'google_drive', name: 'Drive', icon: '/icons/connectors/google_drive.png' },
    ]
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    connectors: [
      { id: 'shopify', name: 'Shopify', icon: '/icons/connectors/shopify.png' },
      { id: 'stripe', name: 'Stripe', icon: '/icons/connectors/stripe.png' },
      { id: 'paypal', name: 'PayPal', icon: '/icons/connectors/paypal.png' },
      { id: 'woocommerce', name: 'WooCommerce', icon: '/icons/connectors/woocommerce.png' },
    ]
  },
  {
    id: 'productivity',
    label: 'Productivity',
    connectors: [
      { id: 'notion', name: 'Notion', icon: '/icons/connectors/notion.png' },
      { id: 'jira', name: 'Jira', icon: '/icons/connectors/jira.png' },
      { id: 'asana', name: 'Asana', icon: '/icons/connectors/asana.png' },
      { id: 'trello', name: 'Trello', icon: '/icons/connectors/trello.png' },
      { id: 'linear', name: 'Linear', icon: '/icons/connectors/linear.png' },
      { id: 'clickup', name: 'ClickUp', icon: '/icons/connectors/clickup.png' },
      { id: 'monday', name: 'Monday', icon: '/icons/connectors/monday.png' },
      { id: 'airtable', name: 'Airtable', icon: '/icons/connectors/airtable.png' },
    ]
  },
];

// Connector card component with enhanced animations
function ConnectorCard({ connector, index }: { connector: typeof categories[0]['connectors'][0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 30, rotateY: -15 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -20, rotateY: 15 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.34, 1.56, 0.64, 1] // Spring-like easing
      }}
      whileHover={{
        scale: 1.1,
        y: -8,
        boxShadow: "0 20px 40px -15px rgba(6, 182, 212, 0.3)",
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-cyan-300 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/10 transition-all duration-300" />

      {/* Icon container with animation */}
      <motion.div
        className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 group-hover:bg-gradient-to-br group-hover:from-cyan-50 group-hover:to-blue-50 transition-all duration-300 relative z-10"
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.4 }}
      >
        <img
          src={connector.icon}
          alt={connector.name}
          className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = '0.3';
          }}
        />
      </motion.div>
      <span className="text-xs font-medium text-gray-600 group-hover:text-cyan-600 transition-colors text-center relative z-10">
        {connector.name}
      </span>

      {/* Bottom highlight on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </motion.div>
  );
}

export function HeroSection() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('communication');

  // Auto-rotate categories every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory(current => {
        const currentIndex = categories.findIndex(c => c.id === current);
        const nextIndex = (currentIndex + 1) % categories.length;
        return categories[nextIndex].id;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <section id="hero" className="relative min-h-screen flex items-center px-6 pt-20 pb-16 overflow-hidden">
      {/* Advanced Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-cyan-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-400/15 to-cyan-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-cyan-300/10 to-cyan-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-50 to-cyan-100 border border-cyan-200 backdrop-blur-sm shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-cyan-600 animate-pulse" />
              <span className="text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                {t('hero.badge')}
              </span>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                {t('hero.title1')}
                <br />
                {t('hero.title2')}
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                    {t('hero.title3')}
                  </span>
                  <motion.div
                    className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-cyan-400/30 to-blue-500/30 rounded-full blur-sm"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  />
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl">
                {t('hero.subtitle')}
              </p>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link to="/register">
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-5 text-base font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all hover:scale-105 group"
                >
                  {t('hero.cta')}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Side - Category-Based Connectors */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="relative hidden lg:block"
          >
            {/* Category Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === category.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Connectors Grid */}
            <div className="relative">
              {/* Glow effect behind */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 rounded-3xl blur-2xl" />

              {/* Container */}
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-sm font-semibold text-gray-700">
                    {currentCategory.label} Integrations
                  </span>
                </div>

                {/* Connectors Grid with AnimatePresence - Fixed height container */}
                <div className="min-h-[240px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCategory}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-4 gap-3"
                    >
                      {currentCategory.connectors.map((connector, index) => (
                        <ConnectorCard key={connector.id} connector={connector} index={index} />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    120+ total integrations available
                  </span>
                  <Link
                    to="/login"
                    className="text-xs font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1 group"
                  >
                    View all
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Success Badge below */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-6 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/30 inline-flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {t('hero.workflowRunning')}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
