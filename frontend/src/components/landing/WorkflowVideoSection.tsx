import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function WorkflowVideoSection() {
  const { t } = useTranslation();
  return (
    <section className="relative py-12 md:py-16 px-6 bg-gradient-to-b from-white to-gray-50/50 overflow-hidden">
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
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
            className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full"
          >
            <Play className="w-4 h-4 text-cyan-500" fill="currentColor" />
            <span className="text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              {t('video.badge')}
            </span>
          </motion.div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-gray-900 via-cyan-900 to-gray-900 bg-clip-text text-transparent">
              {t('video.title')}
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('video.subtitle')}
          </p>
        </motion.div>

        {/* Video Container */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ scale: 1.02, y: -5 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="relative cursor-pointer group"
        >
          {/* Outer Glow - Enhanced on hover */}
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-cyan-500/15 rounded-2xl blur-xl opacity-70 transition-all duration-500 group-hover:opacity-100 group-hover:-inset-4 group-hover:blur-2xl" />

          {/* Video Frame */}
          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-2xl transition-shadow duration-500 group-hover:shadow-cyan-500/20 group-hover:shadow-3xl">
            {/* Browser-like Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-t-lg md:rounded-t-xl border-b border-gray-700/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 bg-gray-700/50 rounded-md text-xs text-gray-400 font-medium">
                  {t('video.editor')}
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
                className="w-full h-auto block"
              >
                <source src="https://cdn.fluxturn.com/videos/workflow_editor_vid.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Floating Decorative Cards */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="absolute -left-4 md:-left-8 top-1/4 hidden lg:block"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 transform -rotate-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm">📧</span>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-gray-900">Gmail</div>
                  <div className="text-gray-500">{t('video.connected')}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="absolute -right-4 md:-right-8 top-1/3 hidden lg:block"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 transform rotate-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm">💬</span>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-gray-900">Slack</div>
                  <div className="text-gray-500">{t('video.connected')}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 hidden md:block"
          >
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full px-5 py-2 shadow-lg shadow-cyan-500/30 flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-semibold">{t('video.dragDrop')}</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default WorkflowVideoSection;
