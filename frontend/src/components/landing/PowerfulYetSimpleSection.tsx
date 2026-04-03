import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";

export function PowerfulYetSimpleSection() {
  const { t } = useTranslation();
  return (
    <section className="relative py-24 md:py-32 px-6 overflow-hidden bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Split Layout - Text Left, Visual Right */}
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center mb-24">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 border border-cyan-200">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                  {t('powerful.badge')}
                </span>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight max-w-xl">
              {t('powerful.title')}{' '}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                {t('powerful.titleHighlight')}
              </span>{' '}
              {t('powerful.titleEnd')}
            </h2>

            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              {t('powerful.subtitle')}
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{t('powerful.stats.setupTime')}</div>
                <div className="text-sm text-gray-600">{t('powerful.stats.setupTimeLabel')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{t('powerful.stats.integrations')}</div>
                <div className="text-sm text-gray-600">{t('powerful.stats.integrationsLabel')}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{t('powerful.stats.uptime')}</div>
                <div className="text-sm text-gray-600">{t('powerful.stats.uptimeLabel')}</div>
              </div>
            </div>

            <Link to="/register">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all group">
                {t('powerful.cta')}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          {/* Right - Visual Feature Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-3xl blur-3xl opacity-30" />

            {/* Stacked Cards */}
            <div className="relative space-y-6">
              {/* Card 1 - Lightning Fast */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border-2 border-gray-100 hover:border-cyan-200 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('powerful.cards.lightning.title')}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t('powerful.cards.lightning.description')}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Card 2 - AI Integration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border-2 border-gray-100 hover:border-blue-200 transition-all cursor-pointer ml-8"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('powerful.cards.ai.title')}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t('powerful.cards.ai.description')}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Card 3 - Enterprise Security */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border-2 border-gray-100 hover:border-purple-200 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('powerful.cards.security.title')}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t('powerful.cards.security.description')}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
