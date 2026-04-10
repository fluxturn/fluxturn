import { motion } from "framer-motion";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Eye, Calendar, Share2, Heart, ArrowRight, ExternalLink, Check, Play, Clock, Zap, Shield, Code } from "lucide-react";
import { Button } from "../components/ui/button";
import { workflowTemplates } from "./Templates";
import { useState } from "react";

export function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'setup' | 'workflow'>('overview');

  const template = workflowTemplates.find(t => t.id === Number(id));

  if (!template) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Template Not Found</h1>
          <p className="text-gray-600 mb-8">The template you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/templates")} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  // Get related templates (same category, excluding current)
  const relatedTemplates = workflowTemplates
    .filter(t => t.category === template.category && t.id !== template.id)
    .slice(0, 3);

  // Handle save toggle
  const handleSave = () => {
    setIsSaved(!isSaved);
    // Here you could also save to localStorage or API
    // localStorage.setItem(`saved-template-${id}`, JSON.stringify(!isSaved));
  };

  // Handle share
  const handleShare = async () => {
    const url = window.location.href;

    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: template.title,
          text: template.description,
          url: url,
        });
      } catch {
        // User cancelled or error occurred
        // console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setShowCopiedMessage(true);
        setTimeout(() => setShowCopiedMessage(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-12 px-6 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${template.color} opacity-5 rounded-full blur-3xl`}></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400 to-cyan-600 opacity-5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link to="/templates" className="inline-flex items-center text-gray-600 hover:text-cyan-600 transition-colors font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-12 items-start">
            {/* Left Column - Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-3"
            >
              {/* Category Badge & Icon */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${template.color} flex items-center justify-center text-4xl shadow-xl`}>
                  {template.icon}
                </div>
                <span className="inline-block px-4 py-2 bg-cyan-50 text-cyan-600 text-sm font-bold rounded-full border-2 border-cyan-200">
                  {template.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                {template.title}
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {template.description}
              </p>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">5 min setup</div>
                    <div className="text-sm text-gray-600">Quick to deploy</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">No coding</div>
                    <div className="text-sm text-gray-600">Visual builder</div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{template.users}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Users</div>
                </div>
                <div className="text-center border-x border-gray-200">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{template.executions}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Executions</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">2d</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Last Update</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6 shadow-xl shadow-blue-500/50">
                    Use for Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  onClick={handleSave}
                  className={`px-6 py-6 transition-all ${
                    isSaved
                      ? "bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300 hover:border-red-400"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${isSaved ? 'fill-red-600' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                <div className="relative">
                  <Button
                    onClick={handleShare}
                    className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 px-6 py-6"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                  {showCopiedMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Link copied!
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right Column - Visual Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 lg:sticky lg:top-8"
            >
              <div className="relative bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">workflow.json</span>
                </div>

                {/* Workflow Visual */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Workflow Preview</h3>
                    <Play className="w-4 h-4 text-cyan-600" />
                  </div>

                  <div className="space-y-4">
                    {template.nodes.map((node, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (0.1 * index) }}
                        className="relative"
                      >
                        <div className="group relative bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-cyan-300 hover:shadow-lg transition-all cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <span className="text-gray-900 font-semibold block">{node}</span>
                              <span className="text-xs text-gray-500">{template.category}</span>
                            </div>
                            <Code className="w-4 h-4 text-gray-400 group-hover:text-cyan-600 transition-colors" />
                          </div>
                          {/* Hover effect overlay */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity pointer-events-none`}></div>
                        </div>

                        {/* Connection Arrow */}
                        {index < template.nodes.length - 1 && (
                          <div className="flex justify-center my-2">
                            <div className="w-px h-4 bg-gradient-to-b from-gray-300 to-cyan-400"></div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Bottom Action */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-cyan-600" />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">{template.nodes.length} Steps</div>
                        <div className="text-xs text-gray-600">Ready to deploy</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Detailed Description Section with Tabs */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                      activeTab === 'overview'
                        ? 'text-cyan-600 border-b-2 border-cyan-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('setup')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                      activeTab === 'setup'
                        ? 'text-cyan-600 border-b-2 border-cyan-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Setup Guide
                  </button>
                  <button
                    onClick={() => setActiveTab('workflow')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                      activeTab === 'workflow'
                        ? 'text-cyan-600 border-b-2 border-cyan-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Workflow Details
                  </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-8">
                  {activeTab === 'overview' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-3xl font-bold text-gray-900 mb-6">About This Template</h2>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 text-lg leading-relaxed mb-6">
                          {template.description}
                        </p>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">What This Workflow Does</h3>
                        <p className="text-gray-700 leading-relaxed mb-6">
                          This powerful automation workflow streamlines your processes by connecting multiple services
                          and handling complex logic automatically. Perfect for teams looking to save time and reduce manual work.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4 mt-8">
                          <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200">
                            <div className="text-2xl mb-2">⚡</div>
                            <h4 className="font-bold text-gray-900 mb-2">Fast Execution</h4>
                            <p className="text-sm text-gray-700">Runs in milliseconds with optimized performance</p>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                            <div className="text-2xl mb-2">🔒</div>
                            <h4 className="font-bold text-gray-900 mb-2">Secure & Reliable</h4>
                            <p className="text-sm text-gray-700">Enterprise-grade security and 99.9% uptime</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'setup' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-3xl font-bold text-gray-900 mb-6">Setup Guide</h2>
                      <div className="space-y-6">
                        {[
                          { step: 1, title: 'Create Your Account', desc: 'Click "Use for Free" to sign up or log in to your FluxTurn account' },
                          { step: 2, title: 'Import Template', desc: 'The template will be automatically added to your workflows dashboard' },
                          { step: 3, title: 'Configure Integrations', desc: 'Connect your accounts and set up API keys for each service' },
                          { step: 4, title: 'Customize Settings', desc: 'Adjust the workflow parameters to match your specific needs' },
                          { step: 5, title: 'Test & Deploy', desc: 'Run a test execution, then activate to start automating!' }
                        ].map((item) => (
                          <div key={item.step} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                              {item.step}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                              <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'workflow' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-3xl font-bold text-gray-900 mb-6">Workflow Details</h2>
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-sm text-gray-600 mb-1">Total Steps</div>
                            <div className="text-2xl font-bold text-gray-900">{template.nodes.length}</div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-sm text-gray-600 mb-1">Avg. Execution Time</div>
                            <div className="text-2xl font-bold text-gray-900">~2.5s</div>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Workflow Steps</h3>
                        {template.nodes.map((node, index) => (
                          <div key={index} className="flex gap-4 p-4 bg-white rounded-xl border-2 border-gray-200">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{node}</h4>
                              <p className="text-sm text-gray-600">Processes data and passes to next step</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Sidebar - Features */}
            <div>
              <div className="space-y-6 sticky top-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500 opacity-10 rounded-full blur-3xl"></div>
                  <h3 className="text-lg font-bold mb-4 relative">🚀 Quick Start</h3>
                  <p className="text-sm text-gray-300 mb-4 relative">Get this template running in minutes</p>
                  <Link to="/register">
                    <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold relative">
                      Start Now
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-2xl border-2 border-gray-200 p-6"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Integrations</h3>
                  <div className="space-y-2 mb-6">
                    {template.nodes.map((node, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors group cursor-pointer">
                        <span className="text-gray-900 font-medium text-sm">{node}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 uppercase mb-4 tracking-wide">Features</h4>
                    <ul className="space-y-3 text-sm">
                      {[
                        { icon: '⚡', text: 'Easy to customize' },
                        { icon: '🎯', text: 'No coding required' },
                        { icon: '🚀', text: 'Real-time execution' },
                        { icon: '🔒', text: 'Enterprise-ready' }
                      ].map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-700">
                          <span className="text-lg">{feature.icon}</span>
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Templates Section */}
      {relatedTemplates.length > 0 && (
        <section className="py-16 px-6 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Templates</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedTemplates.map((relatedTemplate, index) => (
                  <Link key={relatedTemplate.id} to={`/templates/${relatedTemplate.id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + (0.1 * index) }}
                      className="group relative bg-white rounded-2xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer h-full border-2 border-gray-200 hover:border-cyan-300 hover:shadow-xl"
                    >
                      {/* Gradient Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${relatedTemplate.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>

                      <div className="relative p-6">
                        {/* Category Badge */}
                        <span className="inline-block px-3 py-1 bg-cyan-50 text-cyan-600 text-xs font-semibold rounded-full mb-4 border border-cyan-200">
                          {relatedTemplate.category}
                        </span>

                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${relatedTemplate.color} flex items-center justify-center text-3xl shadow-lg mb-4`}>
                          {relatedTemplate.icon}
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                          {relatedTemplate.title}
                        </h3>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {relatedTemplate.users}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {relatedTemplate.executions}
                          </span>
                        </div>

                        {/* Action Button */}
                        <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-semibold shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
                          View Template
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}
