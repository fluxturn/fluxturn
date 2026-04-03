import { motion } from "framer-motion";
import { FileText, Shield, Users, DollarSign, AlertTriangle, Scale } from "lucide-react";
import { SEO } from "../components/SEO";

export function Terms() {
  const lastUpdated = "January 15, 2025";

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Terms of Service"
        description="Read FluxTurn's terms of service. Understand your rights and responsibilities when using our workflow automation platform."
        canonical="/terms"
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
              <FileText className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">
                Terms of Service
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
              Terms &
              <br />
              <span className="text-cyan-600">
                Conditions
              </span>
            </h1>
            <p className="text-xl text-gray-600">Last updated: {lastUpdated}</p>
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
                These Terms of Service govern your access to and use of FluxTurn (operated by Info Inlet). By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.
              </p>
            </div>

            {/* Definitions */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Definitions</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                For purposes of these Terms:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li><strong>"Service"</strong> refers to the FluxTurn workflow automation platform and all related services</li>
                <li><strong>"User" or "You"</strong> refers to the individual or entity using our Service</li>
                <li><strong>"Content"</strong> refers to workflows, data, integrations, and any material uploaded to the Service</li>
                <li><strong>"Account"</strong> refers to your unique account created to access the Service</li>
                <li><strong>"Organization"</strong> refers to a group account with multiple users</li>
                <li><strong>"Subscription"</strong> refers to your paid plan tier (Free, Pro, or Enterprise)</li>
              </ul>
            </div>

            {/* Acceptance of Terms */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Acceptance of Terms</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                By creating an account or using FluxTurn, you confirm that:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>You are at least 18 years of age or have parental/guardian consent</li>
                <li>You have the authority to enter into these Terms</li>
                <li>You will comply with all applicable laws and regulations</li>
                <li>All information you provide is accurate and current</li>
                <li>You will maintain the security of your account credentials</li>
              </ul>
            </div>

            {/* Account Registration */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Account Registration & Security</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Registration Requirements</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                To use FluxTurn, you must create an account by providing:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Valid email address</li>
                <li>Secure password meeting our requirements</li>
                <li>Accurate profile information</li>
                <li>Company name (for organization accounts)</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Account Security</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You are responsible for:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Maintaining the confidentiality of your password</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Enabling two-factor authentication (recommended for Pro/Enterprise)</li>
                <li>Not sharing your account credentials with others</li>
              </ul>
            </div>

            {/* Acceptable Use */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Acceptable Use Policy</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Prohibited Activities</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree NOT to use the Service to:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Violate any local, state, national, or international law</li>
                <li>Infringe upon intellectual property rights of others</li>
                <li>Transmit viruses, malware, or other harmful code</li>
                <li>Attempt unauthorized access to our systems or other users' accounts</li>
                <li>Engage in denial-of-service attacks or similar disruptions</li>
                <li>Send spam, phishing attempts, or unsolicited communications</li>
                <li>Scrape or harvest data without explicit permission</li>
                <li>Reverse engineer or decompile our software</li>
                <li>Use the Service for illegal purposes or to facilitate illegal activities</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Usage Limits</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your use of the Service is subject to the following limits based on your subscription tier:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li><strong>API Rate Limits:</strong> As specified in your plan documentation</li>
                <li><strong>Workflow Executions:</strong> Monthly limits per subscription tier</li>
                <li><strong>Storage:</strong> Data storage caps per plan</li>
                <li><strong>Concurrent Workflows:</strong> Maximum simultaneous executions</li>
              </ul>
            </div>

            {/* Payment Terms */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Payment & Billing</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Subscription Fees</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                <li>All fees are in USD unless otherwise specified</li>
                <li>Fees are non-refundable except as required by law</li>
                <li>We may change pricing with 30 days advance notice</li>
                <li>You authorize us to charge your payment method for all fees</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Failed Payments</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                If a payment fails:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>We will attempt to charge your payment method up to 3 times</li>
                <li>Your account may be suspended after failed payment attempts</li>
                <li>You will receive email notifications before suspension</li>
                <li>Suspended accounts may be deleted after 30 days</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Cancellation & Refunds</h3>
              <ul className="text-gray-600 space-y-2">
                <li>You may cancel your subscription at any time</li>
                <li>Cancellation takes effect at the end of your current billing period</li>
                <li>No partial refunds for unused time in current billing period</li>
                <li>Enterprise customers: refer to your contract for cancellation terms</li>
                <li>Free tier users may delete their account at any time</li>
              </ul>
            </div>

            {/* Intellectual Property */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Scale className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Intellectual Property Rights</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">FluxTurn's Intellectual Property</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are owned by Info Inlet and are protected by:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>United States and international copyright laws</li>
                <li>Trademark registrations and common law rights</li>
                <li>Patent protections where applicable</li>
                <li>Trade secret laws</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Your Content</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You retain all rights to your Content. By using the Service, you grant us:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>A worldwide, non-exclusive license to host, store, and process your Content</li>
                <li>The right to perform backups and ensure service availability</li>
                <li>Permission to display your Content as necessary to provide the Service</li>
                <li>The right to share anonymous, aggregated analytics data</li>
              </ul>
            </div>

            {/* Service Availability */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Service Availability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We strive to maintain 99.9% uptime for Pro and Enterprise tiers, but we do not guarantee uninterrupted service. We may:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Perform scheduled maintenance with advance notice</li>
                <li>Suspend service temporarily for emergency maintenance</li>
                <li>Modify or discontinue features with reasonable notice</li>
                <li>Experience downtime due to third-party service providers</li>
              </ul>
            </div>

            {/* Termination */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Termination</h2>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Termination by You</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You may terminate your account at any time by:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Using the account deletion feature in settings</li>
                <li>Contacting our support team</li>
                <li>Canceling your subscription (service continues until period end)</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Termination by Us</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may suspend or terminate your account if you:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Violate these Terms of Service</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Fail to pay subscription fees</li>
                <li>Abuse or misuse the Service</li>
                <li>Pose a security risk to other users</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Effects of Termination</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Upon termination:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Your access to the Service will be revoked immediately</li>
                <li>You have 30 days to export your data</li>
                <li>After 30 days, your data may be permanently deleted</li>
                <li>No refunds will be provided for early termination</li>
                <li>You remain liable for any outstanding fees</li>
              </ul>
            </div>

            {/* Limitation of Liability */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>

              <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200 mb-6">
                <p className="text-gray-900 font-semibold mb-2">IMPORTANT LEGAL NOTICE</p>
                <p className="text-gray-700 leading-relaxed">
                  The Service is provided "as is" and "as available" without warranties of any kind, either express or implied.
                </p>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to fees paid in the last 12 months</li>
                <li>We are not responsible for data loss (maintain your own backups)</li>
                <li>We are not liable for third-party service failures or integrations</li>
                <li>We disclaim warranties of merchantability and fitness for a particular purpose</li>
              </ul>
            </div>

            {/* Indemnification */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Indemnification</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree to indemnify, defend, and hold harmless Info Inlet and FluxTurn from any claims, damages, losses, liabilities, and expenses arising from:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Your use or misuse of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Your Content and its use by the Service</li>
                <li>Any fraudulent or illegal activities</li>
              </ul>
            </div>

            {/* Dispute Resolution */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Dispute Resolution & Governing Law</h2>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Governing Law</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                These Terms are governed by the laws of the United States, without regard to conflict of law principles.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Arbitration Agreement</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Any disputes arising from these Terms or the Service will be resolved through binding arbitration:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Disputes will be arbitrated on an individual basis (no class actions)</li>
                <li>Arbitration will be conducted under AAA rules</li>
                <li>You may opt-out of arbitration within 30 days of account creation</li>
                <li>Small claims court matters are excluded from arbitration</li>
              </ul>
            </div>

            {/* Changes to Terms */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We reserve the right to modify these Terms at any time. If we make material changes:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>We will notify you via email at least 30 days in advance</li>
                <li>We will post the updated Terms on our website</li>
                <li>Continued use after changes constitutes acceptance</li>
                <li>You may terminate your account if you disagree with changes</li>
              </ul>
            </div>

            {/* Miscellaneous */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Miscellaneous</h2>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Entire Agreement</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                These Terms, together with our Privacy Policy and any other policies, constitute the entire agreement between you and FluxTurn.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Severability</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Waiver</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Our failure to enforce any right or provision will not be considered a waiver of those rights.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Assignment</h3>
              <p className="text-gray-600 leading-relaxed">
                You may not assign or transfer these Terms without our written consent. We may assign our rights and obligations without restriction.
              </p>
            </div>

            {/* Contact Legal Team */}
            <div className="mb-12 p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border-2 border-cyan-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Legal Team</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Questions about these Terms? Contact us:
              </p>
              <ul className="text-gray-700 space-y-2">
                <li><strong>Email:</strong> legal@fluxturn.com</li>
                <li><strong>Mail:</strong> Info Inlet, Legal Department, [Address]</li>
                <li><strong>Phone:</strong> Available for Enterprise customers</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
