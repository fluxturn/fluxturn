// Social Connectors - Category Index
// Each connector is organized in its own folder

// Export connector implementations
export { TwitterConnector } from './twitter';
export { FacebookConnector } from './facebook';
export { FacebookGraphConnector } from './facebook-graph';
export { InstagramConnector } from './instagram';
export { LinkedinConnector } from './linkedin';
export { PinterestConnector } from './pinterest';
export { RedditConnector } from './reddit';
export { TikTokConnector } from './tiktok';
export { YoutubeConnector } from './youtube';

// Export connector definitions
export { TWITTER_CONNECTOR } from './twitter';
export { FACEBOOK_CONNECTOR } from './facebook';
export { FACEBOOK_GRAPH_CONNECTOR } from './facebook-graph';
export { INSTAGRAM_CONNECTOR } from './instagram';
export { LINKEDIN_CONNECTOR } from './linkedin';
export { PINTEREST_CONNECTOR } from './pinterest';
export { REDDIT_CONNECTOR } from './reddit';
export { TIKTOK_CONNECTOR } from './tiktok';
export { YOUTUBE_CONNECTOR } from './youtube';

// Combined array of all social connector definitions
import { TWITTER_CONNECTOR } from './twitter';
import { FACEBOOK_CONNECTOR } from './facebook';
import { FACEBOOK_GRAPH_CONNECTOR } from './facebook-graph';
import { INSTAGRAM_CONNECTOR } from './instagram';
import { LINKEDIN_CONNECTOR } from './linkedin';
import { PINTEREST_CONNECTOR } from './pinterest';
import { REDDIT_CONNECTOR } from './reddit';
import { TIKTOK_CONNECTOR } from './tiktok';
import { YOUTUBE_CONNECTOR } from './youtube';

export const SOCIAL_CONNECTORS = [
  TWITTER_CONNECTOR,
  FACEBOOK_CONNECTOR,
  FACEBOOK_GRAPH_CONNECTOR,
  INSTAGRAM_CONNECTOR,
  LINKEDIN_CONNECTOR,
  PINTEREST_CONNECTOR,
  REDDIT_CONNECTOR,
  TIKTOK_CONNECTOR,
  YOUTUBE_CONNECTOR,
];
