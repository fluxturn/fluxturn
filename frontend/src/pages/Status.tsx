import { motion } from "framer-motion";
import { CheckCircle2, Activity, Clock } from "lucide-react";

export function Status() {
  const services = [
    { name: "API", status: "operational", uptime: "99.98%" },
    { name: "Workflow Engine", status: "operational", uptime: "99.95%" },
    { name: "Web App", status: "operational", uptime: "99.99%" },
    { name: "Database", status: "operational", uptime: "99.97%" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-100 border border-green-300 mb-6">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-bold text-green-700 uppercase">All Systems Operational</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              System <span className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 bg-clip-text text-transparent">Status</span>
            </h1>
            <p className="text-xl text-gray-600">Real-time status of FluxTurn services</p>
          </motion.div>

          <div className="space-y-4 mb-16">
            {services.map((service, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="p-6 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold">{service.name}</h3>
                    <p className="text-sm text-gray-600">Operational</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{service.uptime}</p>
                  <p className="text-sm text-gray-600">30-day uptime</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 text-center">
              <Activity className="w-12 h-12 text-cyan-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Last Incident</h3>
              <p className="text-gray-700">45 days ago</p>
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 text-center">
              <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Average Response Time</h3>
              <p className="text-gray-700">125ms</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
