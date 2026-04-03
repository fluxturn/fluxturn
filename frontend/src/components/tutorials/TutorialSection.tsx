import { motion } from 'framer-motion';
import { Rocket, Zap, Code, LucideIcon } from 'lucide-react';
import { TutorialCard } from './TutorialCard';
import type { Tutorial } from '../../data/tutorials';
import { SECTION_CONFIG } from '../../data/tutorials';

const ICONS: Record<string, LucideIcon> = {
  Rocket,
  Zap,
  Code,
};

interface TutorialSectionProps {
  sectionKey: 'getting-started' | 'core-features' | 'advanced';
  tutorials: Tutorial[];
}

export function TutorialSection({ sectionKey, tutorials }: TutorialSectionProps) {
  const config = SECTION_CONFIG[sectionKey];
  const Icon = ICONS[config.icon];

  if (tutorials.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-4 mb-10"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {config.title}
            </h2>
            <p className="text-gray-600">
              {config.description}
            </p>
          </div>
        </motion.div>

        {/* Tutorial Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorials.map((tutorial, index) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
