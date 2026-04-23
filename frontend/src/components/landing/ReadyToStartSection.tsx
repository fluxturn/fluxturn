import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Rocket } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";

export function ReadyToStartSection() {
  const [isPreRegisterOpen, setIsPreRegisterOpen] = useState<boolean>(false);
  const [preRegisterData, setPreRegisterData] = useState({ email: '' });
  const { t } = useTranslation();
  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.promise(
      api.preRegister(preRegisterData),
      {
        loading: 'Submitting your registration...',
        success: (response) => {
          setPreRegisterData({ email: '' });
          setIsPreRegisterOpen(false);
          return (response as Record<string, unknown>).message as string || 'Successfully registered! We will contact you soon.';
        },
        error: (error) => {
          console.error('Pre-registration error:', error);
          return error.message || 'Failed to register. Please try again later.';
        },
      }
    );
  };

  return (
    <>
      <section className="relative py-20 md:py-32 px-6 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            {/* Icon Group */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex justify-center items-center gap-4 mb-8"
            >
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Rocket className="w-7 h-7 text-white" />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight"
            >
              {t('landing.readyToStartSection.heading', 'Ready to Get Started?')}
            </motion.h2>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              
              {t('landing.readyToStartSection.subheading', 'Join thousands of teams automating their workflows with FluxTurn. Start building powerful automations today.')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setIsPreRegisterOpen(true)}
                  className="bg-white hover:bg-gray-50 text-cyan-600 px-8 py-7 text-lg font-bold rounded-2xl shadow-2xl hover:shadow-white/20 transition-all group"
                >
                  <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  {t('landing.readyToStartSection.earlyAccess', 'Get Early Access')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  disabled
                  className="border-2 border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-7 text-lg font-semibold rounded-2xl transition-all opacity-50 cursor-not-allowed"
                >
                  {t('landing.readyToStartSection.documentation', 'View Documentation')}
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">10K+</div>
                <div className="text-white/80 text-sm md:text-base">{t('landing.readyToStartSection.activeUsers', 'Active Users')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">1M+</div>
                <div className="text-white/80 text-sm md:text-base">{t('landing.readyToStartSection.workflowsExecuted', 'Workflows Executed')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">99.9%</div>
                <div className="text-white/80 text-sm md:text-base">{t('landing.readyToStartSection.uptime', 'Uptime')}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Early Access Modal */}
      <Dialog open={isPreRegisterOpen} onOpenChange={setIsPreRegisterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <img src="/logo.png" alt="FluxTurn" className="h-12 w-12" />
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  FluxTurn
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {t('landing.readyToStartSection.earlyAccessModal.subheading', 'Workflow Automation Platform')}
              </p>
            </div>
            <DialogTitle>{t('landing.readyToStartSection.earlyAccessModal.title', 'Get Early Access')}</DialogTitle>
            <DialogDescription>
              {t('landing.readyToStartSection.earlyAccessModal.description', 'Sign up early to get exclusive access and updates.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePreRegister}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-900">
                  {t('landing.readyToStartSection.earlyAccessModal.email', 'Email Address')}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('landing.readyToStartSection.earlyAccessModal.emailPlaceholder', 'you@example.com')}
                  value={preRegisterData.email}
                  onChange={(e) =>
                    setPreRegisterData({ ...preRegisterData, email: e.target.value })
                  }
                  required
                  className="border border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-lg px-4 py-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto">
                {t('landing.readyToStartSection.earlyAccessModal.submit', 'Submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
