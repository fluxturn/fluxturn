import { motion } from "framer-motion";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Heart,
  ArrowRight,
  Check,
  Zap,
  Code,
  Users,
  Star,
  FileText,
  CheckCircle2,
  Workflow,
  BookOpen
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useCasesData } from "./UseCases";
import { useState } from "react";

export function UseCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const useCase = useCasesData.find(u => u.id === Number(id));

  if (!useCase) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Use Case Not Found</h1>
          <p className="text-gray-600 mb-8">The use case you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/use-cases")} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Use Cases
          </Button>
        </div>
      </div>
    );
  }

  // Get related use cases (same category, excluding current)
  const relatedUseCases = useCasesData
    .filter(u => u.category === useCase.category && u.id !== useCase.id)
    .slice(0, 3);

  // Handle save toggle
  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  // Handle share
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: useCase.title,
          text: useCase.description,
          url: url,
        });
      } catch {
        // console.log('Share cancelled');
      }
    } else {
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
          <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${useCase.color} opacity-5 rounded-full blur-3xl`}></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400 to-cyan-600 opacity-5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link to="/use-cases" className="inline-flex items-center text-gray-600 hover:text-cyan-600 transition-colors font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Use Cases
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
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${useCase.color} flex items-center justify-center text-white shadow-xl`}>
                  {useCase.icon}
                </div>
                <span className="inline-block px-4 py-2 bg-cyan-50 text-cyan-600 text-sm font-bold rounded-full border-2 border-cyan-200">
                  {useCase.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                {useCase.title}
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {useCase.description}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border-2 border-cyan-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{useCase.stats}</div>
                  <div className="text-xs text-gray-600 mt-1">Performance</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">10K+</div>
                  <div className="text-xs text-gray-600 mt-1">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">4.9/5</div>
                  <div className="text-xs text-gray-600 mt-1">Rating</div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Action Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="sticky top-32 bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Get Started</h3>

                {/* CTA Buttons */}
                <div className="space-y-3 mb-6">
                  <Link to="/register" className="block">
                    <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all group">
                      Start Building This
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/templates" className="block">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-cyan-300 hover:border-cyan-400 bg-white hover:bg-cyan-50 text-cyan-600 hover:text-cyan-700 py-6 text-base font-semibold transition-all"
                    >
                      <BookOpen className="mr-2 w-5 h-5" />
                      View Templates
                    </Button>
                  </Link>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                      isSaved
                        ? "bg-pink-50 border-pink-300 text-pink-600"
                        : "bg-white border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                    <span className="text-sm font-semibold">
                      {isSaved ? "Saved" : "Save"}
                    </span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-cyan-300 hover:text-cyan-600 bg-white transition-all relative"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Share</span>
                    {showCopiedMessage && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg">
                        Link copied!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-600" />
                  </div>
                  Overview
                </h2>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {useCase.details}
                </p>
              </motion.div>

              {/* Key Use Cases */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                  </div>
                  Key Use Cases
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {useCase.examples.map((example, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl hover:border-cyan-200 hover:shadow-md transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-base font-semibold text-gray-700 group-hover:text-cyan-600 transition-colors">
                        {example}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* How It Works */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <Workflow className="w-5 h-5 text-cyan-600" />
                  </div>
                  How It Works
                </h2>
                <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-12 min-h-[250px] flex items-center justify-center overflow-hidden">
                  {/* Grid Pattern */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `radial-gradient(circle, #9ca3af 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                  }}></div>

                  {/* Simple Flow Visualization */}
                  <div className="relative z-10 flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg mb-3">
                        <Zap className="w-10 h-10" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Trigger</span>
                    </div>

                    <ArrowRight className="w-8 h-8 text-cyan-500" />

                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white shadow-lg mb-3">
                        <Code className="w-10 h-10" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Process</span>
                    </div>

                    <ArrowRight className="w-8 h-8 text-cyan-500" />

                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg mb-3">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Complete</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sidebar - Related Use Cases */}
            <div className="lg:col-span-1">
              {relatedUseCases.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 sticky top-32"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Related Use Cases</h3>
                  <div className="space-y-4">
                    {relatedUseCases.map((related) => (
                      <Link
                        key={related.id}
                        to={`/use-cases/${related.id}`}
                        className="block group"
                      >
                        <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100 hover:border-cyan-300 hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${related.color} flex items-center justify-center text-white shadow-md`}>
                              {related.icon}
                            </div>
                            <span className="text-xs font-semibold text-gray-500">{related.category}</span>
                          </div>
                          <h4 className="font-bold text-gray-900 group-hover:text-cyan-600 transition-colors line-clamp-2">
                            {related.title}
                          </h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
