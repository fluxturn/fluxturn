// Base OAuth Controller
export { BaseOAuthController } from './base-oauth.controller';

// Individual OAuth Controllers
import { GoogleOAuthController } from './google-oauth.controller';
import { SlackOAuthController } from './slack-oauth.controller';
import { ClickUpOAuthController } from './clickup-oauth.controller';
import { ZoomOAuthController } from './zoom-oauth.controller';
import { RedditOAuthController } from './reddit-oauth.controller';
import { LinkedInOAuthController } from './linkedin-oauth.controller';
import { TwitterOAuthController } from './twitter-oauth.controller';
import { InstagramOAuthController } from './instagram-oauth.controller';
import { GitHubOAuthController } from './github-oauth.controller';
import { NotionOAuthController } from './notion-oauth.controller';
import { DiscordOAuthController } from './discord-oauth.controller';
import { ShopifyOAuthController } from './shopify-oauth.controller';
import { PinterestOAuthController } from './pinterest-oauth.controller';
import { MicrosoftTeamsOAuthController } from './microsoft-teams-oauth.controller';
import { HubSpotOAuthController } from './hubspot-oauth.controller';
import { SalesforceOAuthController } from './salesforce-oauth.controller';
import { TikTokOAuthController } from './tiktok-oauth.controller';
import { FacebookOAuthController } from './facebook-oauth.controller';
import { XeroOAuthController } from './xero-oauth.controller';

export {
  GoogleOAuthController,
  SlackOAuthController,
  ClickUpOAuthController,
  ZoomOAuthController,
  RedditOAuthController,
  LinkedInOAuthController,
  TwitterOAuthController,
  InstagramOAuthController,
  GitHubOAuthController,
  NotionOAuthController,
  DiscordOAuthController,
  ShopifyOAuthController,
  PinterestOAuthController,
  MicrosoftTeamsOAuthController,
  HubSpotOAuthController,
  SalesforceOAuthController,
  TikTokOAuthController,
  FacebookOAuthController,
  XeroOAuthController,
};

// Array of all OAuth controllers for easy module registration
export const OAuthControllers = [
  GoogleOAuthController,
  SlackOAuthController,
  ClickUpOAuthController,
  ZoomOAuthController,
  RedditOAuthController,
  LinkedInOAuthController,
  TwitterOAuthController,
  InstagramOAuthController,
  GitHubOAuthController,
  NotionOAuthController,
  DiscordOAuthController,
  ShopifyOAuthController,
  PinterestOAuthController,
  MicrosoftTeamsOAuthController,
  HubSpotOAuthController,
  SalesforceOAuthController,
  TikTokOAuthController,
  FacebookOAuthController,
  XeroOAuthController,
];
