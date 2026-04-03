import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  PlayCircle,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { TutorialSection } from '../components/tutorials/TutorialSection';
import { getTutorialsBySection } from '../data/tutorials';
import { SEO } from '../components/SEO';

export function Tutorials() {
  const gettingStartedTutorials = getTutorialsBySection('getting-started');
  const coreFeaturesTutorials = getTutorialsBySection('core-features');
  const advancedTutorials = getTutorialsBySection('advanced');

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Video Tutorials"
        description="Learn FluxTurn with step-by-step video guides. Master workflow automation from getting started to advanced techniques."
        canonical="/tutorials"
      />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />

        {/* Gradient Orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

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
              <PlayCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white/90">Video Tutorials</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            >
              Learn{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                FluxTurn
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
            >
              Step-by-step video guides to master workflow automation
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Tutorial Sections */}
      <div className="bg-gray-50">
        <TutorialSection
          sectionKey="getting-started"
          tutorials={gettingStartedTutorials}
        />
      </div>

      <div className="bg-white">
        <TutorialSection
          sectionKey="core-features"
          tutorials={coreFeaturesTutorials}
        />
      </div>

      {advancedTutorials.length > 0 && (
        <div className="bg-gray-50">
          <TutorialSection
            sectionKey="advanced"
            tutorials={advancedTutorials}
          />
        </div>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Build?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Put your new skills to work. Start automating your workflows today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button className="bg-white hover:bg-gray-50 text-cyan-600 px-8 py-6 text-lg font-bold rounded-xl shadow-2xl hover:shadow-white/20 transition-all group">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="outline" className="border-2 border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-6 text-lg font-semibold rounded-xl transition-all">
                  <BookOpen className="w-5 h-5 mr-2" />
                  View Documentation
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
