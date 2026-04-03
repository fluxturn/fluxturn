/**
 * Connector Icon Utility
 *
 * Returns the path to connector icons stored in /public/icons/connectors/
 * All icons are now in PNG format.
 */

/**
 * Get the icon path for a connector type
 * @param connectorType - The connector type (e.g., 'gmail', 'slack', 'openai')
 * @returns The path to the icon file
 */
export function getConnectorIconPath(connectorType: string): string {
  return `/icons/connectors/${connectorType}.png`;
}

/**
 * Check if a connector has a custom icon available
 * @param connectorType - The connector type
 * @returns True if a custom icon exists
 */
export function hasConnectorIcon(connectorType: string): boolean {
  // List of all connectors with PNG icons (63 icons)
  const availableIcons = [
    'airtable', 'anthropic', 'asana', 'aws_bedrock', 'aws_s3',
    'clickup', 'discord', 'dropbox',
    'facebook', 'facebook_ads', 'facebook_graph', 'freshdesk',
    'github', 'gitlab', 'gmail', 'google_ads', 'google_ai',
    'google_analytics', 'google_calendar', 'google_docs', 'google_drive',
    'google_forms', 'google_sheets',
    'hubspot', 'imap', 'instagram', 'intercom',
    'jira', 'jotform', 'klaviyo', 'linear', 'linkedin',
    'mailchimp', 'mixpanel', 'monday', 'mongodb', 'mysql',
    'notion', 'openai', 'openai_chatbot',
    'paypal', 'pipedrive', 'pinterest', 'plaid', 'pop3', 'postgresql',
    'reddit', 'redis',
    'salesforce', 'schedule', 'segment', 'shopify', 'slack', 'smtp', 'stripe',
    'teams', 'telegram', 'trello', 'twilio', 'twitter',
    'whatsapp', 'woocommerce',
    'youtube', 'zendesk', 'zoho', 'zoom'
  ];

  return availableIcons.includes(connectorType);
}

/**
 * Get connector icon as an img element props object
 * @param connectorType - The connector type
 * @param size - Icon size in pixels (default: 20)
 * @returns Object with src and alt for img element
 */
export function getConnectorIconProps(connectorType: string, size: number = 20) {
  return {
    src: getConnectorIconPath(connectorType),
    alt: `${connectorType} icon`,
    width: size,
    height: size,
    style: { objectFit: 'contain' as const }
  };
}
