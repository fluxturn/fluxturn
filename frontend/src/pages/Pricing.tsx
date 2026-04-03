import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Sparkles, Zap, Shield, HelpCircle, Code, Globe, Database, Lock, RefreshCw, Workflow } from "lucide-react";
import { Button } from "../components/ui/button";
import { useState } from "react";
import { SEO } from "../components/SEO";

export function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      monthlyPrice: 0,
      yearlyPrice: 0,
      period: "forever",
      description: "Perfect for individuals and small projects",
      features: [
        "Up to 1,000 executions/month",
        "20 active workflows",
        "Community support",
        "Basic integrations",
        "Cloud or self-hosted",
        "API access"
      ],
      cta: "Get Started Free",
      popular: false,
      color: "from-gray-500 to-gray-600"
    },
    {
      name: "Starter",
      price: billingPeriod === 'monthly' ? "$9.99" : `$${(99.99 / 12).toFixed(2)}`,
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      period: "per month",
      yearlyTotal: billingPeriod === 'yearly' ? "$99.99/year" : null,
      originalYearly: billingPeriod === 'yearly' ? `$${(9.99 * 12).toFixed(2)}` : null,
      description: "For small teams getting started",
      features: [
        "10,000 executions/month",
        "50 active workflows",
        "Email support",
        "All integrations",
        "Advanced features",
        "Custom domains",
        "Team collaboration (up to 3)"
      ],
      cta: "Start Starter Plan",
      popular: false,
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Professional",
      price: billingPeriod === 'monthly' ? "$19.99" : `$${(199.99 / 12).toFixed(2)}`,
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      period: "per month",
      yearlyTotal: billingPeriod === 'yearly' ? "$199.99/year" : null,
      originalYearly: billingPeriod === 'yearly' ? `$${(19.99 * 12).toFixed(2)}` : null,
      description: "For professionals and growing teams",
      features: [
        "50,000 executions/month",
        "Unlimited workflows",
        "Priority support",
        "All integrations",
        "Advanced features",
        "Custom domains",
        "Team collaboration (up to 10)",
        "SSO authentication"
      ],
      cta: "Start Professional Trial",
      popular: true,
      color: "from-cyan-500 to-blue-500"
    },
    {
      name: "Enterprise",
      price: billingPeriod === 'monthly' ? "$49.99" : `$${(499.99 / 12).toFixed(2)}`,
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      period: "per month",
      yearlyTotal: billingPeriod === 'yearly' ? "$499.99/year" : null,
      originalYearly: billingPeriod === 'yearly' ? `$${(49.99 * 12).toFixed(2)}` : null,
      description: "For large organizations with custom needs",
      features: [
        "200,000 executions/month",
        "Unlimited workflows",
        "Dedicated support",
        "99.9% SLA guarantee",
        "All integrations",
        "On-premise deployment",
        "Advanced security",
        "Unlimited team members",
        "Training & onboarding"
      ],
      cta: "Start Enterprise Plan",
      popular: false,
      color: "from-cyan-500 to-blue-500"
    }
  ];

  const faqs = [
    {
      question: "Can I switch plans at any time?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges."
    },
    {
      question: "What happens if I exceed my execution limit?",
      answer: "Your workflows will pause until the next billing cycle. You can upgrade your plan anytime to continue running workflows."
    },
    {
      question: "Do you offer a free trial for Pro?",
      answer: "Yes! We offer a 14-day free trial for the Pro plan. No credit card required to start."
    },
    {
      question: "Can I self-host FluxTurn?",
      answer: "Yes! All plans, including Free, support self-hosting. You have full control over your data and infrastructure."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, Amex) and PayPal. Enterprise customers can pay via invoice."
    },
    {
      question: "Is there a discount for non-profits?",
      answer: "Yes! We offer 50% off Pro plans for verified non-profit organizations. Contact sales for details."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for FluxTurn workflow automation. Start free and scale as you grow. No hidden fees, cancel anytime."
        canonical="/pricing"
      />
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 backdrop-blur-sm mb-6">
              <Sparkles className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">
                Transparent Pricing
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900">
              Simple, Transparent
              <br />
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                Pricing for Everyone
              </span>
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Start free and scale as you grow. No hidden fees, no surprises. Cancel anytime.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center items-center gap-4 mb-16"
          >
            <span className={`text-lg font-semibold ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-16 h-8 bg-gray-200 rounded-full transition-colors hover:bg-gray-300"
            >
              <div className={`absolute top-1 ${billingPeriod === 'monthly' ? 'left-1' : 'left-9'} w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all shadow-lg`}></div>
            </button>
            <span className={`text-lg font-semibold ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
              Yearly
            </span>
            {billingPeriod === 'yearly' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                Save 16%
              </span>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative p-6 rounded-2xl ${
                  plan.popular
                    ? 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-600 shadow-xl shadow-cyan-500/20 scale-105'
                    : 'bg-white border-2 border-gray-200'
                } hover:shadow-xl transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg">
                      <Sparkles className="w-4 h-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2 text-gray-900">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-1 text-sm">/ {plan.period}</span>
                  {plan.originalYearly && plan.yearlyTotal && (
                    <div className="mt-2 text-sm">
                      <span className="line-through text-gray-400">{plan.originalYearly}</span>
                      <span className="ml-2 text-green-600 font-semibold">{plan.yearlyTotal}</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 mb-6 text-sm">{plan.description}</p>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register" className="block">
                  <Button
                    className={`w-full py-4 text-base font-semibold ${
                      plan.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="relative py-20 md:py-32 px-6 bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 backdrop-blur-sm mb-6">
              <CheckCircle2 className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">
                Core Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Everything You Need, <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Built-In</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              All plans include our full suite of automation tools and features - no hidden paywalls
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Workflow,
                title: "Visual Workflow Builder",
                desc: "Intuitive drag-and-drop interface with real-time preview and debugging",
                color: "from-cyan-500 to-blue-500"
              },
              {
                icon: Globe,
                title: "500+ Integrations",
                desc: "Connect to all your favorite apps and services out of the box",
                color: "from-blue-500 to-purple-500"
              },
              {
                icon: Code,
                title: "Custom Code Support",
                desc: "Write custom JavaScript & Python for advanced logic and transformations",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                desc: "SOC2 compliant with end-to-end encryption and access controls",
                color: "from-pink-500 to-orange-500"
              },
              {
                icon: Database,
                title: "Data Management",
                desc: "Built-in data transformation, filtering, and manipulation tools",
                color: "from-orange-500 to-cyan-500"
              },
              {
                icon: RefreshCw,
                title: "Version Control",
                desc: "Track changes, rollback workflows, and collaborate with your team",
                color: "from-cyan-500 to-blue-500"
              },
              {
                icon: Lock,
                title: "Self-Hosted Option",
                desc: "Deploy on your infrastructure for complete control and data sovereignty",
                color: "from-blue-500 to-purple-500"
              },
              {
                icon: Zap,
                title: "Real-Time Execution",
                desc: "Lightning-fast workflow execution with sub-second response times",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Sparkles,
                title: "AI Integration",
                desc: "Connect to ChatGPT, Claude, and other AI models for intelligent automation",
                color: "from-pink-500 to-orange-500"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white p-6 rounded-2xl border-2 border-gray-100 hover:border-cyan-200 hover:shadow-xl transition-all duration-300"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`} />

                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-cyan-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feature highlights bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl p-10 shadow-xl"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2 text-white">Unlimited</div>
                <div className="text-white/90 text-base font-medium">API Requests</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2 text-white">500+</div>
                <div className="text-white/90 text-base font-medium">Pre-Built Nodes</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2 text-white">24/7</div>
                <div className="text-white/90 text-base font-medium">Monitoring</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2 text-white">99.9%</div>
                <div className="text-white/90 text-base font-medium">Uptime SLA</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 md:py-32 px-6 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 backdrop-blur-sm mb-6">
              <HelpCircle className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">
                FAQ
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Got <span className="bg-gradient-to-r from-cyan-500 to-cyan-600 bg-clip-text text-transparent">Questions</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about FluxTurn pricing and plans
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white p-6 rounded-2xl border-2 border-gray-100 hover:border-cyan-200 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-600 transition-colors">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-10 border-2 border-cyan-100"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Still have questions?</h3>
            <p className="text-gray-600 mb-6 text-lg">Our sales team is here to help you find the right plan</p>
            <Link to="/contact">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Contact Sales Team
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 backdrop-blur-sm mb-8">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-300 uppercase tracking-wider">
                Start Today
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
              Ready to Transform Your<br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Workflow Automation
              </span>?
            </h2>

            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of teams automating their workflows with FluxTurn
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-10 py-7 text-lg font-bold shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all group"
                >
                  Start Building Free
                  <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link to="/docs">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-gray-600 hover:border-cyan-400 bg-gray-800/50 hover:bg-gray-700/50 text-white px-10 py-7 text-lg font-semibold backdrop-blur-sm transition-all"
                >
                  View Documentation
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Free forever plan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
