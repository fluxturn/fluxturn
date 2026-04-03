// Instagram Connector
// Instagram Business API for publishing media

import { ConnectorDefinition } from '../../shared';

export const INSTAGRAM_CONNECTOR: ConnectorDefinition = {
    name: 'instagram',
    display_name: 'Instagram',
    category: 'social',
    description: 'Publish media to Instagram using Facebook Graph API',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
          { label: 'Custom OAuth App', value: 'manual', description: 'Use your own Facebook app credentials' }
        ],
        default: 'oauth2'
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: true,
        placeholder: 'Your Facebook App ID',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Your Facebook App Secret',
        displayOptions: { authType: ['manual'] }
      }
    ],
    endpoints: {
      base_url: 'https://graph.facebook.com/v18.0',
      media: '/{ig-user-id}/media',
      media_publish: '/{ig-user-id}/media_publish',
      insights: '/{ig-user-id}/insights'
    },
    webhook_support: true,
    rate_limits: { requests_per_hour: 200 },
    sandbox_available: true,
    verified: false,
    oauth_config: {
      authorization_url: 'https://www.facebook.com/v18.0/dialog/oauth',
      token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      scopes: [
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_comments',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
      ]
    },
    supported_actions: [
      {
        id: 'publish_image',
        name: 'Publish Image',
        description: 'Publish a single image or carousel album to Instagram',
        category: 'Image Actions',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/{ig-user-id}/media',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com/v18.0',
          headers: {
            'Content-Type': 'application/json'
          },
          paramMapping: {
            image_url: 'image_url',
            caption: 'caption',
            location_id: 'location_id',
            user_tags: 'user_tags'
          }
        },
        inputSchema: {
          image_url: {
            type: 'string',
            required: true,
            label: 'Image URL',
            inputType: 'url',
            placeholder: 'https://example.com/image.jpg',
            description: 'Publicly accessible URL of the image to publish (JPEG or PNG, max 8MB)',
            aiControlled: false
          },
          caption: {
            type: 'string',
            label: 'Caption',
            inputType: 'textarea',
            maxLength: 2200,
            placeholder: 'Write your caption here...',
            description: 'Caption text for the post (max 2,200 characters). Supports hashtags and @mentions.',
            aiControlled: true,
            aiDescription: 'The caption text for the Instagram post'
          },
          location_id: {
            type: 'string',
            label: 'Location ID',
            placeholder: '1234567890',
            description: 'Facebook Page ID representing a location. Optional.',
            aiControlled: false
          },
          user_tags: {
            type: 'array',
            label: 'User Tags',
            description: 'Tag users in the image',
            aiControlled: false,
            items: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  label: 'Instagram Username',
                  description: 'Username to tag (without @)'
                },
                x: {
                  type: 'number',
                  label: 'X Position',
                  min: 0,
                  max: 1,
                  step: 0.01,
                  description: 'X coordinate (0.0 to 1.0)'
                },
                y: {
                  type: 'number',
                  label: 'Y Position',
                  min: 0,
                  max: 1,
                  step: 0.01,
                  description: 'Y coordinate (0.0 to 1.0)'
                }
              }
            }
          },
          is_carousel: {
            type: 'boolean',
            label: 'Carousel Album',
            default: false,
            description: 'Publish as a carousel album (multiple images)',
            aiControlled: false
          },
          children: {
            type: 'array',
            label: 'Carousel Images',
            description: 'Additional images for carousel (2-10 total images)',
            displayCondition: { is_carousel: true },
            maxItems: 9,
            aiControlled: false,
            items: {
              type: 'object',
              properties: {
                image_url: {
                  type: 'string',
                  required: true,
                  label: 'Image URL',
                  inputType: 'url',
                  description: 'URL of the carousel image'
                }
              }
            }
          }
        },
        outputSchema: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Published media ID' },
              container_id: { type: 'string', description: 'Container ID used for publishing' }
            }
          },
          error: { type: 'string' }
        }
      },
      {
        id: 'publish_reel',
        name: 'Publish Reel',
        description: 'Publish a video reel to Instagram',
        category: 'Reels Actions',
        icon: 'video',
        verified: false,
        api: {
          endpoint: '/{ig-user-id}/media',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com/v18.0',
          headers: {
            'Content-Type': 'application/json'
          },
          paramMapping: {
            video_url: 'video_url',
            caption: 'caption',
            share_to_feed: 'share_to_feed',
            cover_url: 'cover_url'
          }
        },
        inputSchema: {
          video_url: {
            type: 'string',
            required: true,
            label: 'Video URL',
            inputType: 'url',
            placeholder: 'https://example.com/video.mp4',
            description: 'Publicly accessible URL of the video (MP4 format, H.264 codec, max 1GB, 4-90 seconds)',
            aiControlled: false
          },
          caption: {
            type: 'string',
            label: 'Caption',
            inputType: 'textarea',
            maxLength: 2200,
            placeholder: 'Write your reel caption...',
            description: 'Caption text for the reel (max 2,200 characters). Supports hashtags and @mentions.',
            aiControlled: true,
            aiDescription: 'The caption text for the Instagram reel'
          },
          share_to_feed: {
            type: 'boolean',
            label: 'Share to Feed',
            default: true,
            description: 'Also share this reel to your main Instagram feed',
            aiControlled: false
          },
          cover_url: {
            type: 'string',
            label: 'Cover Image URL',
            inputType: 'url',
            placeholder: 'https://example.com/cover.jpg',
            description: 'URL of a custom cover image for the reel (optional, JPEG format)',
            aiControlled: false
          },
          location_id: {
            type: 'string',
            label: 'Location ID',
            placeholder: '1234567890',
            description: 'Facebook Page ID representing a location. Optional.',
            aiControlled: false
          },
          thumb_offset: {
            type: 'number',
            label: 'Thumbnail Offset',
            min: 0,
            placeholder: '5000',
            description: 'Frame offset in milliseconds for auto-generated thumbnail (optional)',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Published reel ID' },
              container_id: { type: 'string', description: 'Container ID used for publishing' }
            }
          },
          error: { type: 'string' }
        }
      },
      {
        id: 'publish_story',
        name: 'Publish Story',
        description: 'Publish a photo or video story to Instagram',
        category: 'Stories Actions',
        icon: 'circle',
        verified: false,
        api: {
          endpoint: '/{ig-user-id}/media',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com/v18.0',
          headers: {
            'Content-Type': 'application/json'
          },
          paramMapping: {
            media_type: 'media_type',
            image_url: 'image_url',
            video_url: 'video_url'
          }
        },
        inputSchema: {
          media_type: {
            type: 'select',
            required: true,
            label: 'Media Type',
            options: [
              { label: 'Story', value: 'STORIES' }
            ],
            default: 'STORIES',
            description: 'Type of story to publish (use Content Type below to choose photo or video)',
            aiControlled: false
          },
          content_type: {
            type: 'select',
            required: true,
            label: 'Content Type',
            options: [
              { label: 'Photo', value: 'photo' },
              { label: 'Video', value: 'video' }
            ],
            default: 'photo',
            description: 'Photo or video content',
            aiControlled: false
          },
          image_url: {
            type: 'string',
            label: 'Image URL',
            inputType: 'url',
            placeholder: 'https://example.com/story-image.jpg',
            description: 'Publicly accessible URL of the image (JPEG/PNG, 1080x1920 recommended)',
            displayCondition: { content_type: 'photo' },
            aiControlled: false
          },
          video_url: {
            type: 'string',
            label: 'Video URL',
            inputType: 'url',
            placeholder: 'https://example.com/story-video.mp4',
            description: 'Publicly accessible URL of the video (MP4, H.264, max 60 seconds)',
            displayCondition: { content_type: 'video' },
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Published story ID' }
            }
          },
          error: { type: 'string' }
        }
      },
      {
        id: 'get_media',
        name: 'Get Media',
        description: 'Retrieve published Instagram media posts',
        category: 'Media',
        icon: 'folder',
        verified: false,
        api: {
          endpoint: '/{ig-user-id}/media',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com/v18.0',
          headers: {},
          paramMapping: {
            limit: 'limit',
            fields: 'fields'
          }
        },
        inputSchema: {
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 50,
            description: 'Maximum number of posts to retrieve (1-50)',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Media fields to retrieve',
            aiControlled: false,
            items: {
              type: 'select',
              options: [
                { label: 'ID', value: 'id' },
                { label: 'Caption', value: 'caption' },
                { label: 'Media Type', value: 'media_type' },
                { label: 'Media URL', value: 'media_url' },
                { label: 'Permalink', value: 'permalink' },
                { label: 'Timestamp', value: 'timestamp' },
                { label: 'Like Count', value: 'like_count' },
                { label: 'Comments Count', value: 'comments_count' }
              ]
            }
          }
        },
        outputSchema: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              items: { type: 'array' },
              pagination: { type: 'object' }
            }
          }
        }
      },
      {
        id: 'get_media_insights',
        name: 'Get Media Insights',
        description: 'Get insights and analytics for Instagram media',
        category: 'Analytics',
        icon: 'bar-chart',
        verified: false,
        api: {
          endpoint: '/{media-id}/insights',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com/v18.0',
          headers: {},
          paramMapping: {
            media_id: 'media_id',
            metric: 'metric'
          }
        },
        inputSchema: {
          media_id: {
            type: 'string',
            required: true,
            label: 'Media ID',
            placeholder: '17895695668004550',
            description: 'ID of the media to get insights for',
            aiControlled: false
          },
          metric: {
            type: 'array',
            label: 'Metrics',
            description: 'Metrics to retrieve',
            aiControlled: false,
            items: {
              type: 'select',
              options: [
                { label: 'Impressions', value: 'impressions' },
                { label: 'Reach', value: 'reach' },
                { label: 'Engagement', value: 'engagement' },
                { label: 'Saves', value: 'saved' },
                { label: 'Video Views', value: 'video_views' },
                { label: 'Profile Visits', value: 'profile_visits' }
              ]
            }
          }
        },
        outputSchema: {
          success: { type: 'boolean' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                period: { type: 'string' },
                values: { type: 'array' }
              }
            }
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_media',
        name: 'New Media Posted',
        description: 'Triggered when new media is published to Instagram',
        eventType: 'webhook',
        verified: false,
        icon: 'image',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Media ID' },
          media_type: { type: 'string', description: 'Type of media (IMAGE, VIDEO, CAROUSEL_ALBUM)' },
          media_url: { type: 'string', description: 'Media URL' },
          caption: { type: 'string', description: 'Caption text' },
          timestamp: { type: 'string', description: 'Publish timestamp' }
        }
      },
      {
        id: 'new_comment',
        name: 'New Comment',
        description: 'Triggered when a new comment is received on your media',
        eventType: 'webhook',
        verified: false,
        icon: 'message-circle',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Comment ID' },
          text: { type: 'string', description: 'Comment text' },
          from: {
            type: 'object',
            description: 'Commenter information',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' }
            }
          },
          media_id: { type: 'string', description: 'Media ID the comment is on' },
          timestamp: { type: 'string', description: 'Comment timestamp' }
        }
      },
      {
        id: 'new_mention',
        name: 'New Mention',
        description: 'Triggered when you are mentioned in a comment or caption',
        eventType: 'webhook',
        verified: false,
        icon: 'at-sign',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Mention ID' },
          text: { type: 'string', description: 'Mention text' },
          from: {
            type: 'object',
            description: 'Mentioner information',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' }
            }
          },
          media_id: { type: 'string', description: 'Media ID (if in caption)' },
          timestamp: { type: 'string', description: 'Mention timestamp' }
        }
      }
    ]
  };
