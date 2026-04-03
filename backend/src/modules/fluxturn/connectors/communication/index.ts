// Communication Connectors - Category Index
// Each connector is organized in its own folder

// Export connector implementations
export { AWSSESConnector } from './aws-ses';
export { CalendlyConnector } from './calendly';
export { DiscordConnector } from './discord';
export { DiscourseConnector } from './discourse';
export { GmailConnector } from './gmail';
export { GoogleCalendarConnector } from './google-calendar';
export { ImapConnector } from './imap';
export { MattermostConnector } from './mattermost';
export { MatrixConnector } from './matrix';
export { Pop3Connector } from './pop3';
export { SlackConnector } from './slack';
export { SmtpConnector } from './smtp';
export { TeamsConnector } from './teams';
export { TelegramConnector } from './telegram';
export { TwilioConnector } from './twilio';
export { WhatsAppConnector } from './whatsapp';

// Export connector definitions
export { AWS_SES_CONNECTOR } from './aws-ses';
export { CALENDLY_CONNECTOR } from './calendly';
export { DISCORD_CONNECTOR } from './discord';
export { DISCOURSE_CONNECTOR } from './discourse';
export { GMAIL_CONNECTOR } from './gmail';
export { GOOGLE_CALENDAR_CONNECTOR } from './google-calendar';
export { IMAP_CONNECTOR } from './imap';
export { MATTERMOST_CONNECTOR } from './mattermost';
export { MATRIX_CONNECTOR } from './matrix';
export { POP3_CONNECTOR } from './pop3';
export { SLACK_CONNECTOR } from './slack';
export { SMTP_CONNECTOR } from './smtp';
export { TEAMS_CONNECTOR } from './teams';
export { TELEGRAM_CONNECTOR } from './telegram';
export { TWILIO_CONNECTOR } from './twilio';
export { WHATSAPP_CONNECTOR } from './whatsapp';

// Combined array of all communication connector definitions
import { AWS_SES_CONNECTOR } from './aws-ses';
import { CALENDLY_CONNECTOR } from './calendly';
import { DISCORD_CONNECTOR } from './discord';
import { DISCOURSE_CONNECTOR } from './discourse';
import { GMAIL_CONNECTOR } from './gmail';
import { GOOGLE_CALENDAR_CONNECTOR } from './google-calendar';
import { IMAP_CONNECTOR } from './imap';
import { MATTERMOST_CONNECTOR } from './mattermost';
import { MATRIX_CONNECTOR } from './matrix';
import { POP3_CONNECTOR } from './pop3';
import { SLACK_CONNECTOR } from './slack';
import { SMTP_CONNECTOR } from './smtp';
import { TEAMS_CONNECTOR } from './teams';
import { TELEGRAM_CONNECTOR } from './telegram';
import { TWILIO_CONNECTOR } from './twilio';
import { WHATSAPP_CONNECTOR } from './whatsapp';

export const COMMUNICATION_CONNECTORS = [
  AWS_SES_CONNECTOR,
  CALENDLY_CONNECTOR,
  DISCORD_CONNECTOR,
  DISCOURSE_CONNECTOR,
  GMAIL_CONNECTOR,
  GOOGLE_CALENDAR_CONNECTOR,
  IMAP_CONNECTOR,
  MATTERMOST_CONNECTOR,
  MATRIX_CONNECTOR,
  POP3_CONNECTOR,
  SLACK_CONNECTOR,
  SMTP_CONNECTOR,
  TEAMS_CONNECTOR,
  TELEGRAM_CONNECTOR,
  TWILIO_CONNECTOR,
  WHATSAPP_CONNECTOR,
];
