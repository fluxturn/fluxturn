import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { getConnectorIconPath, hasConnectorIcon } from '@/utils/workflow';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Zap,
  Code,
  GitBranch,
  RotateCcw,
  Shuffle,
  Clock,
  Filter
} from 'lucide-react';

// Connector definitions based on the 54 real connectors from fluxturn
const CONNECTORS = [
  // AI/ML
  { id: 'openai', name: 'OpenAI', category: 'AI/ML', icon: '🤖', color: '#10a37f', description: 'OpenAI GPT models' },
  { id: 'anthropic', name: 'Anthropic', category: 'AI/ML', icon: '🧠', color: '#d97706', description: 'Claude AI models' },
  { id: 'google-gemini', name: 'Google Gemini', category: 'AI/ML', icon: '✨', color: '#4285f4', description: 'Google AI models' },
  { id: 'perplexity', name: 'Perplexity', category: 'AI/ML', icon: '🔍', color: '#00d4aa', description: 'Perplexity AI search' },
  { id: 'cohere', name: 'Cohere', category: 'AI/ML', icon: '💫', color: '#39c5bb', description: 'Cohere language models' },
  { id: 'groq', name: 'Groq', category: 'AI/ML', icon: '⚡', color: '#f97316', description: 'Fast AI inference' },
  { id: 'fireworks', name: 'Fireworks', category: 'AI/ML', icon: '🎆', color: '#dc2626', description: 'Fireworks AI models' },

  // Communication
  { id: 'discord', name: 'Discord', category: 'Communication', icon: '🎮', color: '#5865f2', description: 'Discord bot integration' },
  { id: 'slack', name: 'Slack', category: 'Communication', icon: '💬', color: '#4a154b', description: 'Slack messaging' },
  { id: 'twilio', name: 'Twilio', category: 'Communication', icon: '📞', color: '#f22f46', description: 'SMS and voice calls' },
  { id: 'sendgrid', name: 'SendGrid', category: 'Communication', icon: '📧', color: '#1a82e2', description: 'Email delivery' },
  { id: 'mailchimp', name: 'Mailchimp', category: 'Communication', icon: '🐵', color: '#ffe01b', description: 'Email marketing' },
  { id: 'whatsapp', name: 'WhatsApp', category: 'Communication', icon: '📱', color: '#25d366', description: 'WhatsApp messaging' },

  // Social
  { id: 'twitter', name: 'Twitter/X', category: 'Social', icon: '🐦', color: '#1d9bf0', description: 'Twitter/X integration' },
  { id: 'facebook', name: 'Facebook', category: 'Social', icon: '📘', color: '#1877f2', description: 'Facebook API' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Social', icon: '💼', color: '#0a66c2', description: 'LinkedIn professional network' },
  { id: 'instagram', name: 'Instagram', category: 'Social', icon: '📷', color: '#e4405f', description: 'Instagram media' },
  { id: 'reddit', name: 'Reddit', category: 'Social', icon: '🤖', color: '#ff4500', description: 'Reddit API' },
  { id: 'youtube', name: 'YouTube', category: 'Social', icon: '📹', color: '#ff0000', description: 'YouTube videos' },

  // Databases
  { id: 'postgresql', name: 'PostgreSQL', category: 'Database', icon: '🐘', color: '#336791', description: 'PostgreSQL database' },
  { id: 'mysql', name: 'MySQL', category: 'Database', icon: '🐬', color: '#4479a1', description: 'MySQL database' },
  { id: 'mongodb', name: 'MongoDB', category: 'Database', icon: '🍃', color: '#47a248', description: 'MongoDB NoSQL' },
  { id: 'redis', name: 'Redis', category: 'Database', icon: '💎', color: '#dc382d', description: 'Redis cache' },
  { id: 'qdrant', name: 'Qdrant', category: 'Database', icon: '🔍', color: '#8b5cf6', description: 'Vector database' },
  { id: 'pinecone', name: 'Pinecone', category: 'Database', icon: '🌲', color: '#000000', description: 'Vector database' },

  // Cloud
  { id: 'aws-s3', name: 'AWS S3', category: 'Cloud', icon: '☁️', color: '#ff9900', description: 'Amazon S3 storage' },
  { id: 'aws-ses', name: 'AWS SES', category: 'Cloud', icon: '📧', color: '#ff9900', description: 'Amazon email service' },
  { id: 'aws-sqs', name: 'AWS SQS', category: 'Cloud', icon: '📮', color: '#ff9900', description: 'Amazon message queue' },
  { id: 'google-cloud', name: 'Google Cloud', category: 'Cloud', icon: '☁️', color: '#4285f4', description: 'Google Cloud Platform' },
  { id: 'azure', name: 'Azure', category: 'Cloud', icon: '☁️', color: '#0078d4', description: 'Microsoft Azure' },
  { id: 'cloudflare', name: 'Cloudflare', category: 'Cloud', icon: '🛡️', color: '#f38020', description: 'Cloudflare CDN' },

  // Payments
  { id: 'stripe', name: 'Stripe', category: 'Payment', icon: '💳', color: '#635bff', description: 'Stripe payments' },
  { id: 'paypal', name: 'PayPal', category: 'Payment', icon: '💰', color: '#003087', description: 'PayPal payments' },
  { id: 'razorpay', name: 'Razorpay', category: 'Payment', icon: '💸', color: '#528ff0', description: 'Razorpay payments' },
  { id: 'square', name: 'Square', category: 'Payment', icon: '⬜', color: '#006aff', description: 'Square payments' },

  // Analytics
  { id: 'segment', name: 'Segment', category: 'Analytics', icon: '📊', color: '#52bd95', description: 'Customer data platform' },
  { id: 'amplitude', name: 'Amplitude', category: 'Analytics', icon: '📈', color: '#4c85d1', description: 'Product analytics' },
  { id: 'mixpanel', name: 'Mixpanel', category: 'Analytics', icon: '📉', color: '#6c5ce7', description: 'Event analytics' },
  { id: 'google-analytics', name: 'Google Analytics', category: 'Analytics', icon: '🔍', color: '#e37400', description: 'Web analytics' },

  // Dev Tools
  { id: 'github', name: 'GitHub', category: 'DevTools', icon: '🐙', color: '#24292f', description: 'GitHub repository' },
  { id: 'gitlab', name: 'GitLab', category: 'DevTools', icon: '🦊', color: '#fc6d26', description: 'GitLab repository' },
  { id: 'jira', name: 'Jira', category: 'DevTools', icon: '🔧', color: '#0052cc', description: 'Atlassian Jira' },
  { id: 'jenkins', name: 'Jenkins', category: 'DevTools', icon: '🔨', color: '#d33833', description: 'Jenkins CI/CD' },
  { id: 'docker', name: 'Docker', category: 'DevTools', icon: '🐳', color: '#0db7ed', description: 'Docker containers' },

  // File Storage
  { id: 'dropbox', name: 'Dropbox', category: 'Storage', icon: '📦', color: '#0061ff', description: 'Dropbox storage' },
  { id: 'box', name: 'Box', category: 'Storage', icon: '📁', color: '#0061d5', description: 'Box cloud storage' },
  { id: 'google-drive', name: 'Google Drive', category: 'Storage', icon: '💾', color: '#4285f4', description: 'Google Drive storage' },
  { id: 'onedrive', name: 'OneDrive', category: 'Storage', icon: '☁️', color: '#0078d4', description: 'Microsoft OneDrive' },

  // CRM
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', icon: '☁️', color: '#00a1e0', description: 'Salesforce CRM' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', icon: '🎯', color: '#ff7a59', description: 'HubSpot CRM' },
  { id: 'pipedrive', name: 'Pipedrive', category: 'CRM', icon: '🔄', color: '#1a97f5', description: 'Pipedrive CRM' },

  // Productivity
  { id: 'notion', name: 'Notion', category: 'Productivity', icon: '📝', color: '#000000', description: 'Notion workspace' },
  { id: 'airtable', name: 'Airtable', category: 'Productivity', icon: '📋', color: '#18bfff', description: 'Airtable database' },
  { id: 'trello', name: 'Trello', category: 'Productivity', icon: '📌', color: '#026aa7', description: 'Trello boards' },
];

// Control flow nodes
const CONTROL_FLOWS = [
  { id: 'if', name: 'If/Then', type: 'control', icon: GitBranch, color: '#f59e0b', description: 'Conditional branching' },
  { id: 'loop', name: 'Loop', type: 'control', icon: RotateCcw, color: '#06b6d4', description: 'Iterate over data' },
  { id: 'switch', name: 'Switch', type: 'control', icon: Shuffle, color: '#8b5cf6', description: 'Multiple conditions' },
  { id: 'parallel', name: 'Parallel', type: 'control', icon: Zap, color: '#10b981', description: 'Run in parallel' },
  { id: 'delay', name: 'Delay', type: 'control', icon: Clock, color: '#f97316', description: 'Wait/delay execution' },
  { id: 'filter', name: 'Filter', type: 'control', icon: Filter, color: '#84cc16', description: 'Filter data' },
  { id: 'transform', name: 'Transform', type: 'control', icon: Code, color: '#6366f1', description: 'Transform data' },
];

const CATEGORIES = [
  'All',
  'AI/ML',
  'Communication',
  'Social',
  'Database',
  'Cloud',
  'Payment',
  'Analytics',
  'DevTools',
  'Storage',
  'CRM',
  'Productivity',
  'Control',
];

interface NodePaletteProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ isOpen, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);

  const filteredItems = useMemo(() => {
    const allItems = [
      ...CONNECTORS.map(c => ({ ...c, type: 'connector' as const })),
      ...CONTROL_FLOWS.map(c => ({ ...c, type: 'control' as const, category: 'Control' })),
    ];

    return allItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || 
                             item.category === selectedCategory ||
                             (selectedCategory === 'Control' && item.type === 'control');
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const onDragStart = (event: React.DragEvent, item: typeof filteredItems[number]) => {
    event.dataTransfer.setData('application/reactflow', item.type);
    event.dataTransfer.setData('application/json', JSON.stringify({
      label: item.name,
      connectorType: item.id,
      controlType: item.id,
      icon: item.icon,
      color: item.color,
      category: item.category,
      inputs: item.type === 'connector' ? [{ id: 'input', name: 'Input', type: 'any' }] : undefined,
      outputs: item.type === 'connector' ? [{ id: 'output', name: 'Output', type: 'any' }] : undefined,
    }));
    event.dataTransfer.effectAllowed = 'move';

    // Add to recently used
    const newRecentlyUsed = [item.id, ...recentlyUsed.filter(id => id !== item.id)].slice(0, 5);
    setRecentlyUsed(newRecentlyUsed);
  };

  const renderItem = (item: typeof filteredItems[number]) => {
    const IconComponent = typeof item.icon === 'string' ? null : item.icon;
    // Check if we have a custom connector icon
    const connectorId = item.id.replace(/-/g, '_'); // Convert github to github, google-drive to google_drive
    const hasCustomIcon = item.type === 'connector' && hasConnectorIcon(connectorId);

    return (
      <div
        key={item.id}
        className="group cursor-move p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
        draggable
        onDragStart={(event) => onDragStart(event, item)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: hasCustomIcon ? '#ffffff' : item.color }}
          >
            {hasCustomIcon ? (
              <img
                src={getConnectorIconPath(connectorId)}
                alt={item.name}
                className="w-7 h-7 object-contain"
              />
            ) : IconComponent ? (
              <IconComponent className="w-5 h-5" />
            ) : (
              <span className="text-sm">{item.icon}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm truncate">{item.name}</h4>
            <p className="text-white/60 text-xs truncate">{item.description}</p>
            <Badge variant="secondary" className="text-xs bg-white/10 text-white/70 mt-1">
              {item.category}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div className="w-12 h-full bg-white/10 backdrop-blur-md border-r border-white/20 flex flex-col items-center py-4">
        <Button
          onClick={onToggle}
          size="sm"
          variant="ghost"
          className="w-8 h-8 p-0 text-white hover:bg-white/20 mb-4"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="text-white/60 text-xs writing-mode-vertical transform -rotate-180">
          Nodes
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full bg-white/10 backdrop-blur-md border-l-0 border-white/20 rounded-none flex flex-col">
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Node Palette</h2>
          <Button
            onClick={onToggle}
            size="sm"
            variant="ghost"
            className="w-8 h-8 p-0 text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? "default" : "ghost"}
              onClick={() => setSelectedCategory(category)}
              className={`text-xs ${
                selectedCategory === category 
                  ? "bg-purple-600 text-white" 
                  : "text-white/70 hover:text-white hover:bg-white/20"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Recently Used */}
        {recentlyUsed.length > 0 && selectedCategory === 'All' && (
          <>
            <div className="mb-4">
              <h3 className="text-white/70 text-sm font-medium mb-2">Recently Used</h3>
              <div className="space-y-2">
                {recentlyUsed
                  .map(id => [...CONNECTORS, ...CONTROL_FLOWS].find(item => item.id === id))
                  .filter(Boolean)
                  .map(renderItem)}
              </div>
            </div>
            <Separator className="my-4 bg-white/20" />
          </>
        )}

        {/* Nodes */}
        <div className="space-y-2">
          {filteredItems.map(renderItem)}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center text-white/60 py-8">
            <Search className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p>No nodes found matching your search</p>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-white/20 bg-white/5">
        <p className="text-xs text-white/60 text-center">
          Drag and drop nodes onto the canvas
        </p>
      </div>
    </Card>
  );
};