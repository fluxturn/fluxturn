import { motion } from "framer-motion";
import { Shield, Lock, Eye, Server, Key, AlertTriangle, FileText, Users } from "lucide-react";
import { SEO } from "../components/SEO";

export function Security() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Security"
        description="Learn about FluxTurn's security practices. Enterprise-grade encryption, SOC2 compliance, and data protection measures."
        canonical="/security"
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
                Security & Compliance
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Security
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 bg-clip-text text-transparent">
                First
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              Your data security is our top priority
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
                At FluxTurn, security isn't an afterthought—it's built into every aspect of our platform. We implement industry-leading practices to protect your workflows, data, and integrations at all times.
              </p>
            </div>

            {/* Encryption */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Encryption & Data Protection</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data in Transit</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                All data transmitted to and from FluxTurn is encrypted using industry-standard protocols:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>TLS 1.3:</strong> Latest transport layer security for all API calls</li>
                <li><strong>Perfect Forward Secrecy:</strong> Ensures session keys aren't compromised</li>
                <li><strong>Certificate Pinning:</strong> Prevents man-in-the-middle attacks</li>
                <li><strong>HTTPS Enforced:</strong> All connections require secure HTTPS</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data at Rest</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your stored data is protected with enterprise-grade encryption:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>AES-256 Encryption:</strong> Military-grade encryption for all stored data</li>
                <li><strong>Encrypted Backups:</strong> All backups are fully encrypted</li>
                <li><strong>Key Rotation:</strong> Regular rotation of encryption keys</li>
                <li><strong>Separate Key Management:</strong> Encryption keys stored separately from data</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">End-to-End Encryption</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Sensitive credentials and secrets benefit from additional protection:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>API keys and OAuth tokens encrypted with unique keys</li>
                <li>Credentials never logged or displayed in plain text</li>
                <li>Secure credential vault with access controls</li>
                <li>Integration credentials encrypted before storage</li>
              </ul>
            </div>

            {/* Access Control */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Key className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Authentication & Access Control</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Multi-Factor Authentication</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Protect your account with multiple layers of security:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>TOTP Support:</strong> Compatible with Google Authenticator, Authy, and more</li>
                <li><strong>SMS Backup:</strong> SMS codes as fallback option</li>
                <li><strong>Recovery Codes:</strong> Secure backup access codes</li>
                <li><strong>Biometric Options:</strong> Support for WebAuthn and FIDO2</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Role-Based Access Control (RBAC)</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Granular permissions system for team collaboration:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Define custom roles with specific permissions</li>
                <li>Limit access to workflows, integrations, and data</li>
                <li>Audit trail for all permission changes</li>
                <li>Team-based access controls for organizations</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Session Management</h3>
              <ul className="text-gray-600 space-y-2">
                <li>Automatic session expiration after inactivity</li>
                <li>Concurrent session limits per user</li>
                <li>Device tracking and management</li>
                <li>Remote session termination capability</li>
              </ul>
            </div>

            {/* Infrastructure Security */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Server className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Infrastructure & Network Security</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Cloud Infrastructure</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                FluxTurn runs on enterprise-grade cloud infrastructure:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Multi-Region Deployment:</strong> Data centers across multiple geographic regions</li>
                <li><strong>Auto-Scaling:</strong> Dynamic resource allocation for reliability</li>
                <li><strong>Load Balancing:</strong> Distributed traffic for high availability</li>
                <li><strong>Redundant Systems:</strong> Multiple layers of redundancy</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Network Protection</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Multi-layered network security protects against threats:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>DDoS Protection:</strong> Advanced mitigation against distributed attacks</li>
                <li><strong>Web Application Firewall (WAF):</strong> Protection against common web exploits</li>
                <li><strong>Intrusion Detection:</strong> Real-time monitoring for suspicious activity</li>
                <li><strong>Rate Limiting:</strong> API rate limits prevent abuse</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Workflow Isolation</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Each workflow execution runs in isolation:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Containerized execution environments</li>
                <li>Resource limits prevent resource exhaustion</li>
                <li>Network isolation between workflows</li>
                <li>Sandboxed code execution</li>
              </ul>
            </div>

            {/* Monitoring & Response */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Eye className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Monitoring & Incident Response</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">24/7 Security Monitoring</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our security team monitors systems around the clock:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Real-time threat detection and alerting</li>
                <li>Automated anomaly detection using machine learning</li>
                <li>Security Information and Event Management (SIEM)</li>
                <li>Continuous vulnerability scanning</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Incident Response Plan</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We maintain a comprehensive incident response process:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Detection:</strong> Automated and manual threat detection</li>
                <li><strong>Assessment:</strong> Rapid evaluation of security incidents</li>
                <li><strong>Containment:</strong> Immediate actions to limit impact</li>
                <li><strong>Remediation:</strong> Root cause analysis and fixes</li>
                <li><strong>Communication:</strong> Transparent notification to affected users</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Audit Logging</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Comprehensive logging for security and compliance:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>All API calls and actions logged</li>
                <li>User authentication and authorization events</li>
                <li>Workflow execution and data access logs</li>
                <li>Tamper-proof log storage with retention policies</li>
              </ul>
            </div>

            {/* Compliance */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Compliance & Certifications</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">SOC 2 Type II</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We maintain SOC 2 Type II compliance, demonstrating our commitment to:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Security controls and data protection</li>
                <li>Availability and uptime commitments</li>
                <li>Processing integrity for workflows</li>
                <li>Confidentiality of customer data</li>
                <li>Privacy protection measures</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">GDPR Compliance</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Full compliance with European data protection regulations:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Data Processing Agreements (DPAs) available</li>
                <li>Right to access, rectify, and delete data</li>
                <li>Data portability support</li>
                <li>Breach notification procedures</li>
                <li>EU data residency options (Enterprise)</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Additional Compliance</h3>
              <ul className="text-gray-600 space-y-2">
                <li><strong>HIPAA:</strong> Available for Enterprise customers</li>
                <li><strong>ISO 27001:</strong> Information security management</li>
                <li><strong>CCPA:</strong> California Consumer Privacy Act compliance</li>
                <li><strong>PCI DSS:</strong> For payment processing workflows</li>
              </ul>
            </div>

            {/* Employee Security */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Employee Security Program</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Background Checks</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                All employees with access to customer data undergo comprehensive background checks and reference verification.
              </p>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Security Training</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our team receives ongoing security education:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Mandatory security awareness training for all employees</li>
                <li>Regular phishing simulation exercises</li>
                <li>Secure coding practices for engineering team</li>
                <li>Incident response training and drills</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Access Control</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Strict limits on employee access to customer data:
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>Principle of least privilege for all access</li>
                <li>Just-in-time access provisioning</li>
                <li>All access logged and audited</li>
                <li>Immediate access revocation upon departure</li>
              </ul>
            </div>

            {/* Vulnerability Management */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 m-0">Vulnerability Management</h2>
              </div>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Regular Security Assessments</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We conduct comprehensive security testing:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Penetration Testing:</strong> Annual third-party penetration tests</li>
                <li><strong>Code Reviews:</strong> Security-focused code review process</li>
                <li><strong>Dependency Scanning:</strong> Automated scanning of third-party libraries</li>
                <li><strong>Infrastructure Audits:</strong> Regular infrastructure security audits</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Patch Management</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Rapid response to security vulnerabilities:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>Critical vulnerabilities patched within 24 hours</li>
                <li>Regular security updates applied automatically</li>
                <li>Continuous monitoring for new CVEs</li>
                <li>Coordinated disclosure process for security issues</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Bug Bounty Program</h3>
              <p className="text-gray-600 leading-relaxed">
                We welcome responsible security researchers to help identify vulnerabilities. Contact <a href="mailto:security@fluxturn.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">security@fluxturn.com</a> for details on our bug bounty program.
              </p>
            </div>

            {/* Disaster Recovery */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Disaster Recovery & Business Continuity</h2>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Backup Strategy</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your data is protected with comprehensive backup procedures:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li><strong>Continuous Backups:</strong> Real-time replication of critical data</li>
                <li><strong>Point-in-Time Recovery:</strong> Restore data from any point in time</li>
                <li><strong>Geo-Redundant Storage:</strong> Backups stored in multiple regions</li>
                <li><strong>Encrypted Backups:</strong> All backups fully encrypted</li>
              </ul>

              <h3 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Recovery Objectives</h3>
              <ul className="text-gray-600 space-y-2">
                <li><strong>RTO (Recovery Time Objective):</strong> 4 hours for full service restoration</li>
                <li><strong>RPO (Recovery Point Objective):</strong> Less than 1 hour of data loss</li>
                <li><strong>High Availability:</strong> 99.9% uptime SLA for Pro and Enterprise</li>
                <li><strong>Failover Systems:</strong> Automatic failover to backup systems</li>
              </ul>
            </div>

            {/* Responsible Disclosure */}
            <div className="mb-12 p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border-2 border-cyan-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Responsible Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Found a security vulnerability? We appreciate responsible disclosure and will work with you to address any issues promptly.
              </p>
              <ul className="text-gray-700 space-y-2">
                <li><strong>Email:</strong> <a href="mailto:security@fluxturn.com" className="text-cyan-600 hover:text-cyan-700 font-semibold">security@fluxturn.com</a></li>
                <li><strong>PGP Key:</strong> Available upon request for encrypted communication</li>
                <li><strong>Response Time:</strong> Initial response within 24 hours</li>
                <li><strong>Recognition:</strong> Security researchers credited in our Hall of Fame</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Please allow us reasonable time to address the issue before public disclosure.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
