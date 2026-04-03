// Marketing Connectors - Category Index

// Export connector implementations
export { ActiveCampaignConnector } from './activecampaign';
export { BrevoConnector } from './brevo';
export { FacebookAdsConnector } from './facebook-ads';
export { GoogleAdsConnector } from './google-ads';
export { KlaviyoConnector } from './klaviyo';
export { MailchimpConnector } from './mailchimp';
export { SendGridConnector } from './sendgrid';

// Export connector definitions
export { ACTIVECAMPAIGN_CONNECTOR } from './activecampaign';
export { BREVO_CONNECTOR } from './brevo';
export { FACEBOOK_ADS_CONNECTOR } from './facebook-ads';
export { GOOGLE_ADS_CONNECTOR } from './google-ads';
export { KLAVIYO_CONNECTOR } from './klaviyo';
export { MAILCHIMP_CONNECTOR } from './mailchimp';
export { SENDGRID_MARKETING_CONNECTOR } from './sendgrid';

// Combined array
import { ACTIVECAMPAIGN_CONNECTOR } from './activecampaign';
import { BREVO_CONNECTOR } from './brevo';
import { FACEBOOK_ADS_CONNECTOR } from './facebook-ads';
import { GOOGLE_ADS_CONNECTOR } from './google-ads';
import { KLAVIYO_CONNECTOR } from './klaviyo';
import { MAILCHIMP_CONNECTOR } from './mailchimp';
import { SENDGRID_MARKETING_CONNECTOR } from './sendgrid';

export const MARKETING_CONNECTORS = [
  ACTIVECAMPAIGN_CONNECTOR,
  BREVO_CONNECTOR,
  FACEBOOK_ADS_CONNECTOR,
  GOOGLE_ADS_CONNECTOR,
  KLAVIYO_CONNECTOR,
  MAILCHIMP_CONNECTOR,
  SENDGRID_MARKETING_CONNECTOR,
];
