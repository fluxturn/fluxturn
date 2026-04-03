import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Globe, BarChart3, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";

interface UseCasesSectionProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export function UseCasesSection({ activeCategory, setActiveCategory }: UseCasesSectionProps) {
  const { t } = useTranslation();

  const useCaseKeys = ['marketing', 'api', 'data', 'ai'] as const;
  const icons = [
    <Users className="w-8 h-8" />,
    <Globe className="w-8 h-8" />,
    <BarChart3 className="w-8 h-8" />,
    <Sparkles className="w-8 h-8" />
  ];

  return (
    <section id="use-cases" className="relative py-20 md:py-32 px-6 bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight tracking-tight">
            {t('useCases.title')}{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                {t('useCases.titleHighlight')}
              </span>
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t('useCases.subtitle')}
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-12">
          {useCaseKeys.map((key, index) => {
            const colors = [
              { bg: 'from-orange-500 to-pink-500', hover: 'hover:shadow-orange-500/20', border: 'border-orange-200/50', icon: 'from-orange-400 to-pink-400' },
              { bg: 'from-cyan-500 to-blue-500', hover: 'hover:shadow-cyan-500/20', border: 'border-cyan-200/50', icon: 'from-cyan-400 to-blue-400' },
              { bg: 'from-purple-500 to-pink-500', hover: 'hover:shadow-purple-500/20', border: 'border-purple-200/50', icon: 'from-purple-400 to-pink-400' },
              { bg: 'from-blue-500 to-cyan-500', hover: 'hover:shadow-blue-500/20', border: 'border-blue-200/50', icon: 'from-blue-400 to-cyan-400' }
            ];
            const colorScheme = colors[index % colors.length];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <Link to={`/use-cases/${index + 1}`}>
                  <div className={`relative h-full bg-white rounded-3xl p-8 border-2 ${colorScheme.border} hover:border-opacity-100 border-opacity-50 transition-all duration-500 hover:scale-105 ${colorScheme.hover} hover:shadow-2xl overflow-hidden cursor-pointer`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                      <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br ${colorScheme.bg} rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2`} />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="mb-6"
                      >
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorScheme.icon} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                          {icons[index]}
                        </div>
                      </motion.div>

                      <div className="mb-3">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                          {t(`useCases.items.${key}.category`)}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                        {t(`useCases.items.${key}.title`)}
                      </h3>

                      <p className="text-gray-600 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                        {t(`useCases.items.${key}.description`)}
                      </p>

                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colorScheme.bg} animate-pulse`}></div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t(`useCases.items.${key}.stats`)}
                          </span>
                        </div>
                      </div>

                      <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorScheme.bg} flex items-center justify-center text-white shadow-lg`}>
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link to="/use-cases">
            <Button
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all hover:scale-105 group"
            >
              {t('useCases.viewAll')}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
