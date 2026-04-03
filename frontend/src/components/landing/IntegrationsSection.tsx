import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";

// All available connector icons
const connectors = [
  { id: 'slack', name: 'Slack', icon: '/icons/connectors/slack.png' },
  { id: 'github', name: 'GitHub', icon: '/icons/connectors/github.png' },
  { id: 'gmail', name: 'Gmail', icon: '/icons/connectors/gmail.png' },
  { id: 'telegram', name: 'Telegram', icon: '/icons/connectors/telegram.png' },
  { id: 'discord', name: 'Discord', icon: '/icons/connectors/discord.png' },
  { id: 'stripe', name: 'Stripe', icon: '/icons/connectors/stripe.png' },
  { id: 'shopify', name: 'Shopify', icon: '/icons/connectors/shopify.png' },
  { id: 'twitter', name: 'X (Twitter)', icon: '/icons/connectors/twitter.png' },
  { id: 'google_sheets', name: 'Google Sheets', icon: '/icons/connectors/google_sheets.png' },
  { id: 'mongodb', name: 'MongoDB', icon: '/icons/connectors/mongodb.png' },
  { id: 'postgresql', name: 'PostgreSQL', icon: '/icons/connectors/postgresql.png' },
  { id: 'notion', name: 'Notion', icon: '/icons/connectors/notion.png' },
  { id: 'airtable', name: 'Airtable', icon: '/icons/connectors/airtable.png' },
  { id: 'asana', name: 'Asana', icon: '/icons/connectors/asana.png' },
  { id: 'trello', name: 'Trello', icon: '/icons/connectors/trello.png' },
  { id: 'jira', name: 'Jira', icon: '/icons/connectors/jira.png' },
  { id: 'linear', name: 'Linear', icon: '/icons/connectors/linear.png' },
  { id: 'monday', name: 'Monday', icon: '/icons/connectors/monday.png' },
  { id: 'clickup', name: 'ClickUp', icon: '/icons/connectors/clickup.png' },
  { id: 'hubspot', name: 'HubSpot', icon: '/icons/connectors/hubspot.png' },
  { id: 'salesforce', name: 'Salesforce', icon: '/icons/connectors/salesforce.png' },
  { id: 'pipedrive', name: 'Pipedrive', icon: '/icons/connectors/pipedrive.png' },
  { id: 'zendesk', name: 'Zendesk', icon: '/icons/connectors/zendesk.png' },
  { id: 'intercom', name: 'Intercom', icon: '/icons/connectors/intercom.png' },
  { id: 'freshdesk', name: 'Freshdesk', icon: '/icons/connectors/freshdesk.png' },
  { id: 'mailchimp', name: 'Mailchimp', icon: '/icons/connectors/mailchimp.png' },
  { id: 'openai', name: 'OpenAI', icon: '/icons/connectors/openai.png' },
  { id: 'anthropic', name: 'Anthropic', icon: '/icons/connectors/anthropic.png' },
  { id: 'google_ai', name: 'Google AI', icon: '/icons/connectors/google_ai.png' },
  { id: 'aws_bedrock', name: 'AWS Bedrock', icon: '/icons/connectors/aws_bedrock.png' },
  { id: 'dropbox', name: 'Dropbox', icon: '/icons/connectors/dropbox.png' },
  { id: 'google_drive', name: 'Google Drive', icon: '/icons/connectors/google_drive.png' },
  { id: 'aws_s3', name: 'AWS S3', icon: '/icons/connectors/aws_s3.png' },
  { id: 'twilio', name: 'Twilio', icon: '/icons/connectors/twilio.png' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '/icons/connectors/whatsapp.png' },
  { id: 'instagram', name: 'Instagram', icon: '/icons/connectors/instagram.png' },
  { id: 'facebook', name: 'Facebook', icon: '/icons/connectors/facebook.png' },
  { id: 'linkedin', name: 'LinkedIn', icon: '/icons/connectors/linkedin.png' },
  { id: 'youtube', name: 'YouTube', icon: '/icons/connectors/youtube.png' },
  { id: 'reddit', name: 'Reddit', icon: '/icons/connectors/reddit.png' },
  { id: 'pinterest', name: 'Pinterest', icon: '/icons/connectors/pinterest.png' },
  { id: 'zoom', name: 'Zoom', icon: '/icons/connectors/zoom.png' },
  { id: 'teams', name: 'Microsoft Teams', icon: '/icons/connectors/teams.png' },
  { id: 'google_calendar', name: 'Google Calendar', icon: '/icons/connectors/google_calendar.png' },
  { id: 'paypal', name: 'PayPal', icon: '/icons/connectors/paypal.png' },
  { id: 'woocommerce', name: 'WooCommerce', icon: '/icons/connectors/woocommerce.png' },
  { id: 'mysql', name: 'MySQL', icon: '/icons/connectors/mysql.png' },
  { id: 'redis', name: 'Redis', icon: '/icons/connectors/redis.png' },
  { id: 'gitlab', name: 'GitLab', icon: '/icons/connectors/gitlab.png' },
  { id: 'google_docs', name: 'Google Docs', icon: '/icons/connectors/google_docs.png' },
];

// Split connectors into two rows
const row1Connectors = connectors.slice(0, 25);
const row2Connectors = connectors.slice(25);

// Connector card component
function ConnectorCard({ connector, isPaused }: { connector: typeof connectors[0]; isPaused: boolean }) {
  return (
    <div
      className={`
        flex flex-col items-center gap-2 p-4 mx-3 min-w-[100px]
        bg-white rounded-xl border border-gray-100 shadow-sm
        transition-all duration-300
        ${isPaused ? 'scale-110 shadow-lg border-cyan-200' : 'hover:scale-105 hover:shadow-md'}
      `}
    >
      <div className="w-12 h-12 flex items-center justify-center">
        <img
          src={connector.icon}
          alt={connector.name}
          className="w-10 h-10 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = '0.3';
          }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 text-center whitespace-nowrap">
        {connector.name}
      </span>
    </div>
  );
}

// Marquee row component
function MarqueeRow({
  connectors,
  direction = 'left',
  isPaused,
  onHover
}: {
  connectors: typeof row1Connectors;
  direction?: 'left' | 'right';
  isPaused: boolean;
  onHover: (paused: boolean) => void;
}) {
  // Duplicate connectors for seamless loop
  const duplicatedConnectors = [...connectors, ...connectors, ...connectors];

  return (
    <div
      className="relative overflow-hidden py-2"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex"
        animate={{
          x: direction === 'left'
            ? ['0%', '-33.333%']
            : ['-33.333%', '0%']
        }}
        transition={{
          x: {
            duration: 40,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop'
          }
        }}
        style={{
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      >
        {duplicatedConnectors.map((connector, index) => (
          <ConnectorCard
            key={`${connector.id}-${index}`}
            connector={connector}
            isPaused={false}
          />
        ))}
      </motion.div>
    </div>
  );
}

export function IntegrationsSection() {
  const { t } = useTranslation();
  const [isPaused, setIsPaused] = useState(false);

  return (
    <section id="capabilities" className="relative py-10 md:py-14 px-6 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              {t('integrations.title')}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('integrations.subtitle')}
          </p>
        </motion.div>
      </div>

      {/* Full-width marquee container */}
      <div className="w-full">
        {/* Row 1 - scrolls left */}
        <MarqueeRow
          connectors={row1Connectors}
          direction="left"
          isPaused={isPaused}
          onHover={setIsPaused}
        />

        {/* Row 2 - scrolls right */}
        <MarqueeRow
          connectors={row2Connectors}
          direction="right"
          isPaused={isPaused}
          onHover={setIsPaused}
        />
      </div>

      {/* Hover hint */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-sm text-gray-500 mt-8"
      >
        {t('integrations.hoverHint', 'Hover to pause • 50+ integrations available')}
      </motion.p>
    </section>
  );
}
