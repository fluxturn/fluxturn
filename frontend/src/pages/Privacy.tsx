import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, UserCheck, FileText } from "lucide-react";
import { SEO } from "../components/SEO";

export function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Privacy Policy"
        description="Learn how FluxTurn collects, uses, and protects your personal information. Your privacy matters to us."
        canonical="/privacy"
      />
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 backdrop-blur-sm mb-6">
              <Shield className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">
                Privacy Policy
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
              Your Privacy
              <br />
              <span className="text-cyan-600">
                Matters to Us
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              Last updated: January 15, 2025
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="prose prose-lg max-w-none"
          >
            {/* Introduction */}
            <div className="mb-12">
              <p className="text-xl text-gray-600 leading-relaxed">
                At FluxTurn (operated by Info Inlet), we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our workflow automation platform.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Database className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Information We Collect</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Account Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you create an account, we collect:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Name and email address</li>
                <li>Company name (optional)</li>
                <li>Password (encrypted and never stored in plain text)</li>
                <li>Profile information you choose to provide</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Workflow Data</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                To provide our automation services, we process:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Workflow configurations and automation logic</li>
                <li>Integration credentials (encrypted at rest)</li>
                <li>Execution logs and error reports</li>
                <li>Data passed through your workflows (temporarily cached for execution)</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Usage Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We automatically collect:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Pages visited and features used</li>
                <li>Performance metrics and error logs</li>
              </ul>
            </div>

            {/* How We Use Your Information */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">How We Use Your Information</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                We use the collected information to:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li><strong>Provide Services:</strong> Execute your workflows and maintain platform functionality</li>
                <li><strong>Improve Platform:</strong> Analyze usage patterns to enhance features and performance</li>
                <li><strong>Communication:</strong> Send important updates, security alerts, and support messages</li>
                <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
                <li><strong>Compliance:</strong> Meet legal obligations and enforce our Terms of Service</li>
              </ul>
            </div>

            {/* Data Security */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Data Security</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                We implement industry-standard security measures:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li><strong>Encryption:</strong> All data encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication</li>
                <li><strong>Regular Audits:</strong> SOC2 Type II compliance and annual security audits</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and incident response</li>
                <li><strong>Isolated Execution:</strong> Workflow executions run in isolated containers</li>
              </ul>
            </div>

            {/* Data Sharing */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Eye className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Data Sharing & Disclosure</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>We do NOT sell your personal data.</strong> We may share information only in these limited circumstances:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li><strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
                <li><strong>Service Providers:</strong> Trusted vendors who help operate our platform (e.g., cloud hosting, payment processing)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </div>

            {/* Your Rights */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Your Privacy Rights</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your workflow data in standard formats</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Object:</strong> Object to certain data processing activities</li>
              </ul>

              <p className="text-gray-600 leading-relaxed mt-6">
                To exercise these rights, contact us at <a href="mailto:privacy@fluxturn.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">privacy@fluxturn.com</a>
              </p>
            </div>

            {/* Data Retention */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We retain your information only as long as necessary:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Account data: Until you delete your account</li>
                <li>Workflow execution logs: 90 days (configurable for Enterprise)</li>
                <li>Billing records: 7 years (legal requirement)</li>
                <li>Marketing data: Until you unsubscribe</li>
              </ul>
            </div>

            {/* International Transfers */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">International Data Transfers</h2>
              <p className="text-gray-600 leading-relaxed">
                Your data may be processed in the United States and other countries where we operate. We ensure adequate protection through Standard Contractual Clauses and Privacy Shield frameworks where applicable.
              </p>
            </div>

            {/* Children's Privacy */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                FluxTurn is not intended for users under 13. We do not knowingly collect information from children. If we discover we have collected data from a child, we will delete it immediately.
              </p>
            </div>

            {/* Cookies */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Cookies & Tracking</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use cookies and similar technologies for:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Authentication and session management</li>
                <li>Preferences and settings</li>
                <li>Analytics and performance monitoring</li>
                <li>Security and fraud prevention</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                You can control cookies through your browser settings. Note that disabling cookies may affect platform functionality.
              </p>
            </div>

            {/* Changes to Policy */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes via email or platform notification. Continued use of FluxTurn after changes constitutes acceptance of the updated policy.
              </p>
            </div>

            {/* Contact */}
            <div className="mb-12 p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border-2 border-cyan-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Questions about this Privacy Policy? Contact us:
              </p>
              <ul className="text-gray-700 space-y-2">
                <li><strong>Email:</strong> privacy@fluxturn.com</li>
                <li><strong>Mail:</strong> Info Inlet, Privacy Team, [Address]</li>
                <li><strong>Data Protection Officer:</strong> dpo@fluxturn.com</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
