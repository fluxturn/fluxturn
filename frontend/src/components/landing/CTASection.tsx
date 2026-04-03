import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

// Comparison data
const competitors = [
  { id: 'fluxturn', name: 'FluxTurn', highlight: true },
  { id: 'zapier', name: 'Zapier', highlight: false },
  { id: 'make', name: 'Make', highlight: false },
  { id: 'n8n', name: 'n8n', highlight: false },
];

const features = [
  {
    id: 'visualBuilder',
    category: 'Core Features',
    values: { fluxturn: true, zapier: true, make: true, n8n: true }
  },
  {
    id: 'aiWorkflowGeneration',
    category: 'Core Features',
    values: { fluxturn: true, zapier: false, make: false, n8n: false }
  },
  {
    id: 'naturalLanguagePrompts',
    category: 'Core Features',
    values: { fluxturn: true, zapier: false, make: false, n8n: false }
  },
  {
    id: 'customCodeSupport',
    category: 'Core Features',
    values: { fluxturn: true, zapier: 'limited', make: true, n8n: true }
  },
  {
    id: 'selfHosting',
    category: 'Deployment',
    values: { fluxturn: true, zapier: false, make: false, n8n: true }
  },
  {
    id: 'cloudHosted',
    category: 'Deployment',
    values: { fluxturn: true, zapier: true, make: true, n8n: true }
  },
  {
    id: 'freeWorkflows',
    category: 'Pricing',
    values: { fluxturn: 'Unlimited', zapier: '5', make: '2', n8n: 'Unlimited*' }
  },
  {
    id: 'freeOperations',
    category: 'Pricing',
    values: { fluxturn: '1,000/mo', zapier: '100/mo', make: '1,000/mo', n8n: 'Self-host' }
  },
  {
    id: 'startingPrice',
    category: 'Pricing',
    values: { fluxturn: '$19/mo', zapier: '$29.99/mo', make: '$10.59/mo', n8n: '$24/mo' }
  },
  {
    id: 'integrations',
    category: 'Integrations',
    values: { fluxturn: '120+', zapier: '6,000+', make: '1,500+', n8n: '400+' }
  },
  {
    id: 'apiAccess',
    category: 'Integrations',
    values: { fluxturn: true, zapier: true, make: true, n8n: true }
  },
  {
    id: 'webhooks',
    category: 'Integrations',
    values: { fluxturn: true, zapier: true, make: true, n8n: true }
  },
  {
    id: 'realtimeExecution',
    category: 'Performance',
    values: { fluxturn: true, zapier: 'delayed', make: true, n8n: true }
  },
  {
    id: 'errorHandling',
    category: 'Performance',
    values: { fluxturn: true, zapier: true, make: true, n8n: true }
  },
  {
    id: 'teamCollaboration',
    category: 'Collaboration',
    values: { fluxturn: true, zapier: 'paid', make: 'paid', n8n: true }
  },
  {
    id: 'versionHistory',
    category: 'Collaboration',
    values: { fluxturn: true, zapier: 'paid', make: true, n8n: true }
  },
];

function ValueCell({ value, isHighlight }: { value: boolean | string; isHighlight: boolean }) {
  if (value === true) {
    return (
      <div className={`flex justify-center ${isHighlight ? 'text-cyan-500' : 'text-green-500'}`}>
        <Check className="w-5 h-5" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center text-gray-300">
        <X className="w-5 h-5" />
      </div>
    );
  }
  if (value === 'limited' || value === 'delayed' || value === 'paid') {
    return (
      <div className="flex justify-center text-amber-500">
        <Minus className="w-5 h-5" />
      </div>
    );
  }
  // String value (like pricing or counts)
  return (
    <span className={`text-sm font-medium ${isHighlight ? 'text-cyan-600' : 'text-gray-700'}`}>
      {value}
    </span>
  );
}

export function CTASection() {
  const { t } = useTranslation();

  // Group features by category
  const categories = [...new Set(features.map(f => f.category))];

  return (
    <section className="relative py-20 md:py-28 px-6 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-cyan-50 border border-cyan-200 rounded-full"
          >
            <span className="text-sm font-semibold text-cyan-600">
              {t('comparison.badge', 'Compare Platforms')}
            </span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gray-900">{t('comparison.title', 'Why Choose')}</span>{' '}
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              FluxTurn?
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('comparison.subtitle', 'See how FluxTurn compares to other workflow automation platforms')}
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="overflow-x-auto"
        >
          <div className="min-w-[700px]">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-2 mb-2">
              <div className="p-4" /> {/* Empty cell for feature names */}
              {competitors.map((competitor) => (
                <div
                  key={competitor.id}
                  className={`p-4 rounded-t-xl text-center ${
                    competitor.highlight
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="font-bold text-lg">{competitor.name}</span>
                  {competitor.highlight && (
                    <div className="text-xs mt-1 text-cyan-100">Recommended</div>
                  )}
                </div>
              ))}
            </div>

            {/* Table Body - Grouped by Category */}
            {categories.map((category) => (
              <div key={category}>
                {/* Category Header */}
                <div className="grid grid-cols-5 gap-2 mt-4 mb-2">
                  <div className="p-3 text-sm font-bold text-gray-500 uppercase tracking-wide">
                    {t(`comparison.categories.${category.toLowerCase().replace(/\s+/g, '')}`, category)}
                  </div>
                  {competitors.map((competitor) => (
                    <div
                      key={`${category}-${competitor.id}`}
                      className={`${competitor.highlight ? 'bg-cyan-50/50' : ''}`}
                    />
                  ))}
                </div>

                {/* Features in this category */}
                {features
                  .filter(f => f.category === category)
                  .map((feature, index) => (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.05 * index }}
                      className="grid grid-cols-5 gap-2"
                    >
                      <div className="p-4 text-sm text-gray-700 font-medium border-b border-gray-100">
                        {t(`comparison.features.${feature.id}`, feature.id)}
                      </div>
                      {competitors.map((competitor) => (
                        <div
                          key={`${feature.id}-${competitor.id}`}
                          className={`p-4 flex items-center justify-center border-b ${
                            competitor.highlight
                              ? 'bg-cyan-50/30 border-cyan-100'
                              : 'border-gray-100'
                          }`}
                        >
                          <ValueCell
                            value={feature.values[competitor.id as keyof typeof feature.values]}
                            isHighlight={competitor.highlight}
                          />
                        </div>
                      ))}
                    </motion.div>
                  ))}
              </div>
            ))}

            {/* Table Footer - CTA Row */}
            <div className="grid grid-cols-5 gap-2 mt-4">
              <div className="p-4" />
              {competitors.map((competitor) => (
                <div
                  key={`cta-${competitor.id}`}
                  className={`p-4 rounded-b-xl ${
                    competitor.highlight ? 'bg-cyan-50/50' : ''
                  }`}
                >
                  {competitor.highlight && (
                    <a
                      href="/register"
                      className="block w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-center text-sm font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                    >
                      {t('comparison.getStarted', 'Get Started Free')}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-gray-400 mt-8"
        >
          {t('comparison.footnote', '* Self-hosted version. Pricing and features may vary. Last updated January 2025.')}
        </motion.p>
      </div>
    </section>
  );
}
