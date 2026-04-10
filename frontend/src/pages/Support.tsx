import { motion } from "framer-motion";
import { MessageCircle, Book, HelpCircle, Clock, Zap, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";

export function Support() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Support"
        description="Get help with FluxTurn. Access documentation, community forums, and email support. Enterprise customers get 24/7 dedicated support."
        canonical="/support"
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
              <HelpCircle className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">
                Support & Help
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              How Can We
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 bg-clip-text text-transparent">
                Help You?
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              Get the support you need, when you need it
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
                At FluxTurn, we're committed to providing you with exceptional support. Whether you're just getting started or need help with advanced features, we're here to assist you every step of the way.
              </p>
            </div>

            {/* Support Channels */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Support Channels</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Documentation</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our comprehensive documentation covers everything from getting started to advanced integrations.
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Quick Start Guide:</strong> Get up and running in minutes</li>
                <li><strong>API Reference:</strong> Complete API documentation with examples</li>
                <li><strong>Integration Guides:</strong> Step-by-step tutorials for popular services</li>
                <li><strong>Video Tutorials:</strong> Visual guides for common tasks</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                Visit our <Link to="/docs" className="text-cyan-600 hover:text-cyan-700 font-semibold">documentation</Link> to get started.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Community Forum</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Connect with other FluxTurn users, share ideas, and get help from the community.
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Ask Questions:</strong> Get answers from experienced users</li>
                <li><strong>Share Solutions:</strong> Help others with your expertise</li>
                <li><strong>Feature Requests:</strong> Suggest new features and vote on ideas</li>
                <li><strong>Best Practices:</strong> Learn from community members</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Email Support</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Contact our support team directly via email for personalized assistance.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li><strong>General Support:</strong> <a href="mailto:support@fluxturn.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">support@fluxturn.com</a></li>
                <li><strong>Technical Issues:</strong> <a href="mailto:tech@fluxturn.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">tech@fluxturn.com</a></li>
                <li><strong>Billing Questions:</strong> <a href="mailto:billing@fluxturn.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">billing@fluxturn.com</a></li>
                <li><strong>Enterprise Inquiries:</strong> <a href="mailto:enterprise@fluxturn.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">enterprise@fluxturn.com</a></li>
              </ul>
            </div>

            {/* Response Times */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Clock className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Response Times</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                We aim to respond to all support requests quickly. Response times vary by support tier:
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Free Tier</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Community Forum:</strong> Responses within 24-48 hours from community</li>
                <li><strong>Email Support:</strong> Best effort, typically 2-3 business days</li>
                <li><strong>Documentation:</strong> Self-service available 24/7</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Pro Tier</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Priority Email:</strong> Response within 24 business hours</li>
                <li><strong>Technical Support:</strong> Direct access to technical team</li>
                <li><strong>Documentation:</strong> Self-service available 24/7</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Enterprise Tier</h3>
              <ul className="text-gray-600 space-y-2">
                <li><strong>24/7 Support:</strong> Round-the-clock assistance</li>
                <li><strong>Dedicated Account Manager:</strong> Personal point of contact</li>
                <li><strong>Phone Support:</strong> Direct phone line for urgent issues</li>
                <li><strong>SLA Guarantee:</strong> 1-hour response time for critical issues</li>
                <li><strong>Slack Channel:</strong> Direct access to engineering team</li>
              </ul>
            </div>

            {/* Common Issues */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Book className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Common Issues & Solutions</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Authentication Problems</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you're having trouble logging in:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Verify your email address is confirmed</li>
                <li>Check if your password meets requirements</li>
                <li>Clear browser cache and cookies</li>
                <li>Try resetting your password</li>
                <li>Ensure you're not using a VPN that blocks our servers</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Workflow Not Running</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                If your workflow isn't executing:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Check workflow is activated (toggle switch is on)</li>
                <li>Verify all credentials are valid and not expired</li>
                <li>Review execution logs for error messages</li>
                <li>Ensure trigger conditions are met</li>
                <li>Check rate limits haven't been exceeded</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Integration Connection Failed</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you can't connect to a service:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Verify API credentials are correct</li>
                <li>Check if the service is experiencing downtime</li>
                <li>Ensure you have proper permissions/scopes</li>
                <li>Try disconnecting and reconnecting</li>
                <li>Review our integration guide for that service</li>
              </ul>
            </div>

            {/* System Status */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Zap className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">System Status</h2>
              </div>

              <p className="text-gray-600 leading-relaxed mb-4">
                Check the current status of FluxTurn services:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>API Status:</strong> All systems operational</li>
                <li><strong>Workflow Execution:</strong> All systems operational</li>
                <li><strong>Dashboard:</strong> All systems operational</li>
                <li><strong>Integrations:</strong> All systems operational</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                For real-time status updates and incident history, visit our status page or subscribe to notifications.
              </p>
            </div>

            {/* Resources */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Additional Resources</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Learning Resources</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Video Tutorials:</strong> Step-by-step visual guides</li>
                <li><strong>Webinars:</strong> Live training sessions and Q&A</li>
                <li><strong>Use Case Examples:</strong> Real-world workflow templates</li>
                <li><strong>Best Practices:</strong> Tips for optimal performance</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Developer Resources</h3>
              <ul className="text-gray-600 space-y-2">
                <li><strong>API Documentation:</strong> Complete reference with examples</li>
                <li><strong>SDKs:</strong> Official libraries for popular languages</li>
                <li><strong>Webhooks Guide:</strong> Real-time event notifications</li>
                <li><strong>Code Examples:</strong> Sample implementations on GitHub</li>
              </ul>
            </div>

            {/* Contact Section */}
            <div className="mb-12 p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border-2 border-cyan-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Need More Help?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <ul className="text-gray-700 space-y-2">
                <li><strong>Email:</strong> support@fluxturn.com</li>
                <li><strong>Response Time:</strong> Within 24 business hours (Pro), 2-3 days (Free)</li>
                <li><strong>Enterprise Support:</strong> Contact enterprise@fluxturn.com for 24/7 support</li>
                <li><strong>Mailing Address:</strong> FluxTurn, Nissho II 1F Room 1-B, 6-5-5 Nagatsuta, Midori-ku, Yokohama, Kanagawa, Japan</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                When contacting support, please include:
              </p>
              <ul className="text-gray-700 space-y-2">
                <li>Your account email address</li>
                <li>Detailed description of the issue</li>
                <li>Steps to reproduce the problem</li>
                <li>Screenshots or error messages (if applicable)</li>
                <li>Browser and device information</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
