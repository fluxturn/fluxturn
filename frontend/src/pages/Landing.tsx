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

      {/* TEMPORARY TEST SECTION - Remove after testing */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b6b, #ffa502)',
        padding: '40px 20px',
        textAlign: 'center' as const,
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
          Test Section - Frontend is Working!
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
          If you can see this, the landing page is rendering correctly.
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Timestamp: {new Date().toISOString()} | Remove this section before production.
        </p>
      </div>
    </div>
  );
};

export default Landing;
