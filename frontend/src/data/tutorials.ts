export interface Tutorial {
  id: string;
  title: string;
  description: string;
  section: 'getting-started' | 'core-features' | 'advanced';
  duration: number; // minutes
  videoUrl: string; // R2 CDN URL
  thumbnail?: string; // Optional thumbnail URL
}

export const TUTORIALS: Tutorial[] = [
  // Getting Started
  {
    id: 'getting-started',
    title: 'Getting Started with FluxTurn',
    description: 'A quick introduction to the platform and key concepts you need to know.',
    section: 'getting-started',
    duration: 5,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/getting-started.mp4',
  },
  {
    id: 'first-workflow',
    title: 'Create Your First Workflow',
    description: 'Build your first automation from scratch with this step-by-step guide.',
    section: 'getting-started',
    duration: 8,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/first-workflow.mp4',
  },

  // Core Features
  {
    id: 'ai-workflows',
    title: 'Using AI to Build Workflows',
    description: 'Learn how to use natural language to generate complete workflows instantly.',
    section: 'core-features',
    duration: 6,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/ai-workflows.mp4',
  },
  {
    id: 'visual-builder',
    title: 'Visual Builder Deep Dive',
    description: 'Master the drag-and-drop visual editor with advanced tips and tricks.',
    section: 'core-features',
    duration: 8,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/visual-builder.mp4',
  },
  {
    id: 'connecting-apps',
    title: 'Connecting Apps & Services',
    description: 'Connect your favorite tools and set up integrations in minutes.',
    section: 'core-features',
    duration: 5,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/connecting-apps.mp4',
  },

  // Advanced
  {
    id: 'conditions-loops',
    title: 'Working with Conditions & Loops',
    description: 'Add logic to your workflows with conditional branching and iterations.',
    section: 'advanced',
    duration: 7,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/conditions-loops.mp4',
  },
  {
    id: 'custom-code',
    title: 'Custom Code in Workflows',
    description: 'Extend your automations with JavaScript and Python code blocks.',
    section: 'advanced',
    duration: 8,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/custom-code.mp4',
  },
  {
    id: 'real-world-automations',
    title: 'Building Real-World Automations',
    description: 'Complete walkthrough of production-ready workflow examples.',
    section: 'advanced',
    duration: 10,
    videoUrl: 'https://cdn.fluxturn.com/tutorials/real-world-automations.mp4',
  },
];

export const SECTION_CONFIG = {
  'getting-started': {
    title: 'Getting Started',
    description: 'New to FluxTurn? Start here.',
    icon: 'Rocket',
  },
  'core-features': {
    title: 'Master the Platform',
    description: 'Learn the essential features that power your automations.',
    icon: 'Zap',
  },
  'advanced': {
    title: 'Go Deeper',
    description: 'Advanced techniques for power users.',
    icon: 'Code',
  },
} as const;

export function getTutorialsBySection(section: Tutorial['section']): Tutorial[] {
  return TUTORIALS.filter((t) => t.section === section);
}
