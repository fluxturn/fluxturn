import { motion } from "framer-motion";
import { Download as DownloadIcon, Apple, Monitor, Smartphone } from "lucide-react";
import { Button } from "../components/ui/button";

export function DownloadPage() {
  const platforms = [
    { name: "macOS", icon: Apple, version: "v1.0.0", size: "125 MB", link: "#" },
    { name: "Windows", icon: Monitor, version: "v1.0.0", size: "132 MB", link: "#" },
    { name: "Linux", icon: Monitor, version: "v1.0.0", size: "118 MB", link: "#" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Download <span className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 bg-clip-text text-transparent">FluxTurn</span>
            </h1>
            <p className="text-xl text-gray-600">Run FluxTurn on your desktop for the best experience</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {platforms.map((platform, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-cyan-300 hover:shadow-xl transition-all text-center">
                <platform.icon className="w-20 h-20 text-cyan-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">{platform.name}</h3>
                <p className="text-gray-600 mb-1">{platform.version}</p>
                <p className="text-gray-500 text-sm mb-6">{platform.size}</p>
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white">
                  <DownloadIcon className="w-5 h-5 mr-2" /> Download
                </Button>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center p-12 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200">
            <Smartphone className="w-16 h-16 text-cyan-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Mobile Apps Coming Soon</h2>
            <p className="text-xl text-gray-600">iOS and Android apps are in development!</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// Default export for compatibility
export const Download = DownloadPage;
