import {
  HeroSection,
  AIPromptBuilderSection,
  WorkflowVideoSection,
  BuildYourWaySection,
  TemplatesSection,
  AIAgentSection,
  FeaturesSection,
  IntegrationsSection,
  WhyFluxTurnSection,
  PricingSection,
  BlogSection,
  CTASection,
  FAQSection
} from "../components/landing";
import { SEO } from "../components/SEO";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      <SEO canonical="/" />
      {/* Hero Section */}
      <HeroSection />

      {/* Integrations Section */}
      <IntegrationsSection />

      {/* AI Prompt Builder Section */}
      <AIPromptBuilderSection />

      {/* Workflow Video Section */}
      <WorkflowVideoSection />

      {/* Two Ways to Build Section */}
      <BuildYourWaySection />

      {/* Templates Section */}
      <TemplatesSection />

      {/* AI Agent Section */}
      <AIAgentSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Why Choose FluxTurn Section */}
      <WhyFluxTurnSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* Blog Section */}
      <BlogSection />

      {/* CTA Section */}
      <CTASection />

      {/* FAQ Section */}
      <FAQSection />
    </div>
  );
};

export default Landing;
