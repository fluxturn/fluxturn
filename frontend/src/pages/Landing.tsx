import {
  HeroSection,
  AIAgentSection,
  FeaturesSection,
  IntegrationsSection,
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

      {/* AI Agent Section */}
      <AIAgentSection />

      {/* Features Section */}
      <FeaturesSection />

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
