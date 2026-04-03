import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const PricingSection = () => {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  const planKeys = ['free', 'starter', 'professional', 'enterprise'] as const;

  const planPricing = {
    free: { monthlyPrice: 0, yearlyPrice: 0 },
    starter: { monthlyPrice: 9.99, yearlyPrice: 99.99 },
    professional: { monthlyPrice: 19.99, yearlyPrice: 199.99 },
    enterprise: { monthlyPrice: 49.99, yearlyPrice: 499.99 }
  };

  return (
    <section id="pricing" className="relative py-20 md:py-32 px-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 backdrop-blur-sm mb-6">
            <Sparkles className="w-5 h-5 text-cyan-600" />
            <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">
              {t('pricing.badge')}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            {t('pricing.title')}{" "}
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              {t('pricing.titleHighlight')}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing.yearly')}
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                {t('pricing.twoMonthsFree')}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planKeys.map((key, index) => {
            const pricing = planPricing[key];
            const isPopular = key === 'professional';
            const isFree = key === 'free';

            const price = isFree
              ? "$0"
              : billingPeriod === 'monthly'
                ? `$${pricing.monthlyPrice.toFixed(2)}`
                : `$${(pricing.yearlyPrice / 12).toFixed(2)}`;

            const originalYearly = !isFree && billingPeriod === 'yearly'
              ? `$${(pricing.monthlyPrice * 12).toFixed(2)}`
              : null;

            const yearlyTotal = !isFree && billingPeriod === 'yearly'
              ? `$${pricing.yearlyPrice.toFixed(2)}/${t('pricing.year')}`
              : null;

            const features = t(`pricing.plans.${key}.features`, { returnObjects: true }) as string[];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <div className={`relative h-full flex flex-col p-6 rounded-2xl ${
                  isPopular
                    ? 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-600 shadow-xl shadow-cyan-500/20 scale-105'
                    : 'bg-white border-2 border-gray-200'
                } hover:shadow-xl transition-all`}>
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg">
                        <Sparkles className="w-4 h-4" />
                        {t('pricing.mostPopular')}
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-bold mb-2 text-gray-900">
                    {t(`pricing.plans.${key}.name`)}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{price}</span>
                    <span className="text-gray-600 ml-1 text-sm">
                      / {isFree ? t('pricing.forever') : t('pricing.perMonth')}
                    </span>
                    {originalYearly && yearlyTotal && (
                      <div className="mt-2 text-sm">
                        <span className="line-through text-gray-400">{originalYearly}</span>
                        <span className="ml-2 text-green-600 font-semibold">{yearlyTotal}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">
                    {t(`pricing.plans.${key}.description`)}
                  </p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/register" className="block mt-auto">
                    <Button
                      className={`w-full py-4 text-base font-semibold ${
                        isPopular
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      {t(`pricing.plans.${key}.cta`)}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* View Full Pricing Link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-semibold"
          >
            {t('pricing.viewFullDetails')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
