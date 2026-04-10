import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function GDPR() {
  const rights = [
    "Right to access your personal data",
    "Right to rectification of inaccurate data",
    "Right to erasure (right to be forgotten)",
    "Right to restrict processing",
    "Right to data portability",
    "Right to object to processing",
    "Rights related to automated decision-making"
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              GDPR <span className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 bg-clip-text text-transparent">Compliance</span>
            </h1>
            <p className="text-xl text-gray-600">FluxTurn is fully GDPR compliant to protect EU citizen data</p>
          </motion.div>

          <div className="prose prose-lg max-w-none mb-12">
            <h2>Our Commitment</h2>
            <p>
              We comply with the EU General Data Protection Regulation (GDPR) to ensure the highest standards of data protection for our European users.
            </p>

            <h2>Your GDPR Rights</h2>
            <ul className="space-y-3">
              {rights.map((right, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
                  <span>{right}</span>
                </li>
              ))}
            </ul>

            <h2>Data Processing</h2>
            <p>We process data based on:</p>
            <ul>
              <li><strong>Consent:</strong> You explicitly agree to data processing</li>
              <li><strong>Contract:</strong> Necessary for service provision</li>
              <li><strong>Legal Obligation:</strong> Required by law</li>
              <li><strong>Legitimate Interest:</strong> For service improvement and security</li>
            </ul>

            <h2>Data Protection Officer</h2>
            <p>For GDPR-related inquiries, contact our DPO at <a href="mailto:dpo@fluxturn.com" className="text-cyan-600">dpo@fluxturn.com</a></p>
          </div>
        </div>
      </section>
    </div>
  );
}
