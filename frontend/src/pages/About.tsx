import { motion } from "framer-motion";
import { Users, Target, Heart, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function About() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              About <span className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 bg-clip-text text-transparent">FluxTurn</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Empowering teams to automate workflows and build faster with no-code and AI-powered tools
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe automation should be accessible to everyone, not just developers. FluxTurn democratizes workflow automation by providing a powerful, intuitive platform that combines visual building with AI capabilities.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Founded in 2024 by Info Inlet, we're on a mission to help teams save time, reduce errors, and focus on what matters most—creating value for their customers.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To become the world's most trusted automation platform, powering millions of workflows across every industry.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We envision a future where every team—regardless of technical expertise—can build sophisticated automations that integrate their entire tech stack seamlessly.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-4 gap-8 mb-20">
            {[
              { icon: Users, title: "50K+", desc: "Active Users" },
              { icon: Target, title: "10M+", desc: "Workflows Executed" },
              { icon: Heart, title: "99.9%", desc: "Uptime SLA" },
              { icon: Award, title: "4.9/5", desc: "Customer Rating" }
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-200">
                <stat.icon className="w-12 h-12 text-cyan-600 mx-auto mb-4" />
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.title}</div>
                <div className="text-gray-600">{stat.desc}</div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Join Us on Our Journey</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              We're just getting started. Join thousands of teams automating their workflows with FluxTurn.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white px-10 py-7 text-xl">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
