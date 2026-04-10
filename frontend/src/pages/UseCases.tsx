import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Search,
  Users,
  Globe,
  BarChart3,
  Sparkles,
  TrendingUp,
  Shield,
  FileText,
  X,
  ArrowRight
} from "lucide-react";
import { Button } from "../components/ui/button";

// Use Cases data
// eslint-disable-next-line react-refresh/only-export-components
export const useCasesData = [
  {
    id: 1,
    icon: <Users className="w-8 h-8" />,
    title: "Marketing Automation",
    description: "Automate email campaigns, social media posts, and lead nurturing workflows.",
    stats: "10x faster campaigns",
    category: "Marketing",
    details: "Streamline your marketing efforts with automated email sequences, social media scheduling, and lead scoring. Connect your CRM, email tools, and analytics platforms.",
    examples: ["Email drip campaigns", "Social media scheduling", "Lead scoring"],
    color: "from-orange-500 to-pink-500"
  },
  {
    id: 2,
    icon: <Globe className="w-8 h-8" />,
    title: "API Integration",
    description: "Connect multiple APIs and services to create seamless data flows across platforms.",
    stats: "500+ integrations",
    category: "IT & DevOps",
    details: "Build powerful integrations between your favorite tools without writing complex code. Sync data across platforms in real-time.",
    examples: ["REST API connections", "Webhook automation", "Data synchronization"],
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: 3,
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Data Processing",
    description: "Transform, aggregate, and analyze data from multiple sources in real-time.",
    stats: "Millions of records",
    category: "Data & Analytics",
    details: "Process large datasets, transform data formats, and create automated reporting pipelines. Connect to databases, spreadsheets, and data warehouses.",
    examples: ["ETL pipelines", "Data transformation", "Automated reporting"],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: 4,
    icon: <Sparkles className="w-8 h-8" />,
    title: "AI & Machine Learning",
    description: "Integrate AI models and ML pipelines into your automation workflows.",
    stats: "AI-powered workflows",
    category: "AI & ML",
    details: "Leverage ChatGPT, Claude, and other AI models to automate content generation, sentiment analysis, and intelligent decision-making.",
    examples: ["Content generation", "Sentiment analysis", "Image recognition"],
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: 5,
    icon: <TrendingUp className="w-8 h-8" />,
    title: "Sales Automation",
    description: "Automate lead tracking, follow-ups, and deal management across your sales pipeline.",
    stats: "3x more conversions",
    category: "Sales & CRM",
    details: "Never miss a follow-up. Automatically update your CRM, send personalized emails, and track deal progress.",
    examples: ["Lead enrichment", "Auto follow-ups", "Deal tracking"],
    color: "from-orange-400 to-pink-400"
  },
  {
    id: 6,
    icon: <Shield className="w-8 h-8" />,
    title: "IT Operations",
    description: "Monitor systems, automate incident response, and streamline DevOps workflows.",
    stats: "99.9% uptime",
    category: "IT & DevOps",
    details: "Automate server monitoring, deployment pipelines, and incident management. Integrate with GitHub, Jira, and monitoring tools.",
    examples: ["CI/CD automation", "Incident alerts", "Server monitoring"],
    color: "from-cyan-400 to-blue-400"
  },
  {
    id: 7,
    icon: <Users className="w-8 h-8" />,
    title: "HR & Onboarding",
    description: "Streamline employee onboarding, leave management, and HR workflows.",
    stats: "Save 20+ hrs/week",
    category: "HR & Operations",
    details: "Automate new hire onboarding, time-off requests, and employee data management across HR systems.",
    examples: ["Employee onboarding", "Leave tracking", "Document generation"],
    color: "from-purple-400 to-pink-400"
  },
  {
    id: 8,
    icon: <FileText className="w-8 h-8" />,
    title: "Document Automation",
    description: "Generate, process, and manage documents automatically across your organization.",
    stats: "Paperless workflows",
    category: "Operations",
    details: "Auto-generate contracts, invoices, and reports. Extract data from PDFs and sync to your systems.",
    examples: ["Contract generation", "Invoice processing", "PDF data extraction"],
    color: "from-blue-400 to-cyan-400"
  }
];

// Extract unique categories
const categories = ["All", ...Array.from(new Set(useCasesData.map(u => u.category)))];

export function UseCases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Filter use cases
  const filteredUseCases = useCasesData.filter(useCase => {
    const matchesSearch = useCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         useCase.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         useCase.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || useCase.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
              Use <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Cases</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore automation solutions for every business need. From marketing to data processing.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search use cases..."
                className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Category Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50"
                    : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300"
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>

          {/* Results Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <p className="text-gray-600">
              Showing <span className="text-cyan-600 font-semibold">{filteredUseCases.length}</span> use case{filteredUseCases.length !== 1 ? 's' : ''}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {filteredUseCases.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <p className="text-2xl text-gray-700 mb-4">No use cases found</p>
              <p className="text-gray-500 mb-8">Try adjusting your search or filters</p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                Clear Filters
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredUseCases.map((useCase, index) => (
                <motion.div
                  key={useCase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <Link to={`/use-cases/${useCase.id}`}>
                    <div className="group relative bg-white rounded-3xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer h-full border-2 border-gray-200 hover:border-cyan-300 hover:shadow-xl p-8">
                      {/* Gradient Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${useCase.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>

                      {/* Decorative Corner */}
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                        <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br ${useCase.color} rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2`} />
                      </div>

                      <div className="relative flex flex-col h-full">
                        {/* Icon */}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${useCase.color} flex items-center justify-center text-white shadow-lg mb-4`}>
                          {useCase.icon}
                        </div>

                        {/* Category Badge */}
                        <span className="inline-block w-fit px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full mb-3">
                          {useCase.category}
                        </span>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                          {useCase.title}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-600 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                          {useCase.description}
                        </p>

                        {/* Stats Display */}
                        <div className="mt-auto pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${useCase.color} animate-pulse`}></div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {useCase.stats}
                            </span>
                          </div>
                        </div>

                        {/* Hover Arrow */}
                        <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${useCase.color} flex items-center justify-center text-white shadow-lg`}>
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
