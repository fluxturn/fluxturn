// TikTok Connector Definition
// Full definition with actions and triggers

import { ConnectorDefinition } from '../../shared';

export const TIKTOK_CONNECTOR: ConnectorDefinition = {
  name: 'tiktok',
  display_name: 'TikTok',
  category: 'social',
  description: 'TikTok social media connector for video content',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      options: [
        { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
        { label: 'Custom OAuth App', value: 'manual', description: 'Use your own TikTok app credentials' }
      ],
      default: 'oauth2'
    },
    {
      key: 'clientId',
      label: 'Client Key',
      type: 'string',
      required: true,
      placeholder: 'Your TikTok Client Key',
      displayOptions: { authType: ['manual'] }
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Your TikTok Client Secret',
      displayOptions: { authType: ['manual'] }
    }
  ],
  endpoints: {
    base_url: 'https://open.tiktokapis.com/v2',
    post_video: '/post/publish/video/init/',
    publish_status: '/post/publish/status/fetch/',
    creator_info: '/post/publish/creator_info/query/',
    video_list: '/video/list/',
    user_info: '/user/info/'
  },
  webhook_support: false,
  rate_limits: {
    requests_per_minute: 600
  },
  sandbox_available: false,
  verified: false,
  oauth_config: {
    authorization_url: 'https://www.tiktok.com/v2/auth/authorize/',
    token_url: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: [
      'user.info.basic',
      'video.publish',
      'video.list'
    ]
  },
  supported_actions: [
    {
      id: 'post_video',
      name: 'Post Video',
      description: 'Upload and publish a video to TikTok',
      category: 'Videos',
      icon: 'video',
      verified: false,
      api: {
        endpoint: '/post/publish/video/init/',
        method: 'POST',
        baseUrl: 'https://open.tiktokapis.com/v2',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          videoUrl: 'source_info.video_url',
          title: 'post_info.title',
          privacyLevel: 'post_info.privacy_level',
          disableComment: 'post_info.disable_comment',
          disableDuet: 'post_info.disable_duet',
          disableStitch: 'post_info.disable_stitch'
        }
      },
      inputSchema: {
        videoUrl: {
          type: 'string',
          required: true,
          label: 'Video URL',
          placeholder: 'https://example.com/video.mp4',
          description: 'URL of the video to upload (must be publicly accessible, MP4 format)',
          aiControlled: false
        },
        title: {
          type: 'string',
          label: 'Video Title/Caption',
          inputType: 'textarea',
          maxLength: 2200,
          placeholder: 'Enter your video caption...',
          description: 'Title or caption for the video (max 2200 characters). Include hashtags here.',
          aiControlled: true,
          aiDescription: 'The caption/title for the TikTok video. Should be engaging and can include relevant hashtags. Max 2200 characters.'
        },
        privacyLevel: {
          type: 'select',
          label: 'Privacy Level',
          options: [
            { label: 'Public', value: 'PUBLIC_TO_EVERYONE' },
            { label: 'Friends Only', value: 'MUTUAL_FOLLOW_FRIENDS' },
            { label: 'Followers Only', value: 'FOLLOWER_OF_CREATOR' },
            { label: 'Private', value: 'SELF_ONLY' }
          ],
          default: 'PUBLIC_TO_EVERYONE',
          description: 'Who can view this video',
          aiControlled: false
        },
        disableComment: {
          type: 'boolean',
          label: 'Disable Comments',
          default: false,
          description: 'Whether to disable comments on the video',
          aiControlled: false
        },
        disableDuet: {
          type: 'boolean',
          label: 'Disable Duet',
          default: false,
          description: 'Whether to disable duet for the video',
          aiControlled: false
        },
        disableStitch: {
          type: 'boolean',
          label: 'Disable Stitch',
          default: false,
          description: 'Whether to disable stitch for the video',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_videos',
      name: 'Get Videos',
      description: 'Get list of videos from the authenticated user',
      category: 'Videos',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/video/list/',
        method: 'POST',
        baseUrl: 'https://open.tiktokapis.com/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {
          cursor: 'cursor',
          maxCount: 'max_count'
        }
      },
      inputSchema: {
        cursor: {
          type: 'number',
          label: 'Cursor',
          placeholder: '0',
          description: 'Cursor for pagination (use value from previous response)',
          aiControlled: false
        },
        maxCount: {
          type: 'number',
          label: 'Max Count',
          default: 20,
          min: 1,
          max: 20,
          description: 'Maximum number of videos to return (1-20)',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_profile',
      name: 'Get Profile',
      description: 'Get the authenticated user profile information',
      category: 'User',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/user/info/',
        method: 'GET',
        baseUrl: 'https://open.tiktokapis.com/v2',
        headers: {
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {}
      },
      inputSchema: {}
    },
    {
      id: 'get_creator_info',
      name: 'Get Creator Info',
      description: 'Get creator posting capabilities and limitations',
      category: 'User',
      icon: 'info',
      verified: false,
      api: {
        endpoint: '/post/publish/creator_info/query/',
        method: 'POST',
        baseUrl: 'https://open.tiktokapis.com/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {access_token}'
        },
        paramMapping: {}
      },
      inputSchema: {}
    }
  ],
  supported_triggers: [
    {
      id: 'new_video',
      name: 'New Video Posted',
      description: 'Triggered when a new video is posted by the authenticated user',
      eventType: 'polling',
      verified: false,
      icon: 'video',
      webhookRequired: false,
      inputSchema: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            label: 'Trigger Event',
            default: 'new_video',
            enum: ['new_video'],
            description: 'Triggers when a new video is posted'
          },
          pollingInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            default: 15,
            enum: [5, 10, 15, 30, 60],
            description: 'How often to check for new videos'
          }
        },
        required: ['event', 'pollingInterval']
      },
      outputSchema: {
        id: { type: 'string', description: 'Video ID' },
        title: { type: 'string', description: 'Video title/caption' },
        create_time: { type: 'number', description: 'Unix timestamp of video creation' },
        cover_image_url: { type: 'string', description: 'URL of the video cover image' },
        share_url: { type: 'string', description: 'URL to share the video' },
        video_description: { type: 'string', description: 'Video description' },
        duration: { type: 'number', description: 'Video duration in seconds' },
        like_count: { type: 'number', description: 'Number of likes' },
        comment_count: { type: 'number', description: 'Number of comments' },
        share_count: { type: 'number', description: 'Number of shares' },
        view_count: { type: 'number', description: 'Number of views' }
      }
    }
  ],
};
