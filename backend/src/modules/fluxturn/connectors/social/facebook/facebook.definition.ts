// Facebook Connector Definition
// Matches facebook.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const FACEBOOK_CONNECTOR: ConnectorDefinition = {
  name: 'facebook',
  display_name: 'Facebook',
  category: 'social',
  description: 'Facebook social media connector for posting and managing content',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      options: [
        { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
        { label: 'Access Token', value: 'access_token', description: 'Use a Page Access Token directly' }
      ],
      default: 'oauth2'
    },
    {
      key: 'accessToken',
      label: 'Page Access Token',
      type: 'password',
      required: true,
      placeholder: 'Your Facebook Page Access Token',
      displayOptions: { authType: ['access_token'] }
    },
    {
      key: 'pageId',
      label: 'Page ID',
      type: 'string',
      required: true,
      placeholder: 'Your Facebook Page ID',
      displayOptions: { authType: ['access_token'] }
    }
  ],
  oauth_config: {
    authorization_url: 'https://www.facebook.com/v18.0/dialog/oauth',
    token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
    ]
  },
  endpoints: {
    base_url: 'https://graph.facebook.com/v18.0',
    feed: '/{page_id}/feed',
    photos: '/{page_id}/photos',
    videos: '/{page_id}/videos',
    posts: '/{page_id}/posts',
    insights: '/{page_id}/insights'
  },
  webhook_support: true,
  rate_limits: { requests_per_hour: 200 },
  sandbox_available: false,
  verified: false,
  supported_actions: [
    {
      id: 'post_to_page',
      name: 'Post to Page',
      description: 'Post content to Facebook page',
      category: 'Posts',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '/{page_id}/feed',
        method: 'POST',
        baseUrl: 'https://graph.facebook.com/v18.0',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          pageId: 'page_id',
          message: 'message',
          link: 'link',
          photo: 'photo',
          video: 'video',
          scheduled_publish_time: 'scheduled_publish_time'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID where the post will be published',
          placeholder: 'Enter your Facebook Page ID',
          aiControlled: false
        },
        message: {
          type: 'string',
          label: 'Message',
          inputType: 'textarea',
          description: 'The text content of the post',
          maxLength: 63206,
          aiControlled: true,
          aiDescription: 'The text content of the Facebook post'
        },
        link: {
          type: 'string',
          label: 'Link URL',
          placeholder: 'https://example.com',
          description: 'URL to attach to the post (optional)',
          aiControlled: false
        },
        photo: {
          type: 'string',
          label: 'Photo URL',
          placeholder: 'https://example.com/image.jpg',
          description: 'Public URL of a photo to attach (optional)',
          aiControlled: false
        },
        video: {
          type: 'string',
          label: 'Video URL',
          placeholder: 'https://example.com/video.mp4',
          description: 'Public URL of a video to attach (optional)',
          aiControlled: false
        },
        scheduled_publish_time: {
          type: 'number',
          label: 'Scheduled Publish Time',
          description: 'Unix timestamp for when to publish the post (optional, for scheduling)',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the post was successful' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The created post ID' },
            post_id: { type: 'string', description: 'The full post ID (page_id_post_id)' }
          }
        }
      }
    },
    {
      id: 'get_page_posts',
      name: 'Get Page Posts',
      description: 'Get posts from Facebook page',
      category: 'Posts',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/{page_id}/posts',
        method: 'GET',
        baseUrl: 'https://graph.facebook.com/v18.0',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          pageId: 'page_id',
          limit: 'limit',
          fields: 'fields',
          cursor: 'after'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID to get posts from',
          placeholder: 'Enter your Facebook Page ID',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 25,
          min: 1,
          max: 100,
          description: 'Number of posts to retrieve (max 100)',
          aiControlled: false
        },
        fields: {
          type: 'string',
          label: 'Fields',
          default: 'id,message,created_time,type,link,full_picture',
          description: 'Comma-separated list of fields to retrieve',
          placeholder: 'id,message,created_time',
          aiControlled: false
        },
        cursor: {
          type: 'string',
          label: 'Pagination Cursor',
          description: 'Cursor for pagination (optional)',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the request was successful' },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array', description: 'Array of post objects' },
            pagination: {
              type: 'object',
              properties: {
                next_cursor: { type: 'string', description: 'Cursor for next page' },
                has_more: { type: 'boolean', description: 'Whether more results exist' }
              }
            }
          }
        }
      }
    },
    {
      id: 'get_page_insights',
      name: 'Get Page Insights',
      description: 'Get Facebook page analytics and insights',
      category: 'Analytics',
      icon: 'chart',
      verified: false,
      api: {
        endpoint: '/{page_id}/insights',
        method: 'GET',
        baseUrl: 'https://graph.facebook.com/v18.0',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          pageId: 'page_id',
          metric: 'metric',
          period: 'period'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID to get insights for',
          placeholder: 'Enter your Facebook Page ID',
          aiControlled: false
        },
        metric: {
          type: 'string',
          label: 'Metrics',
          default: 'page_impressions,page_reach,page_engaged_users,page_video_views',
          description: 'Comma-separated list of metrics to retrieve',
          placeholder: 'page_impressions,page_reach',
          aiControlled: false
        },
        period: {
          type: 'select',
          label: 'Period',
          options: [
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: '28 Days', value: 'days_28' }
          ],
          default: 'day',
          description: 'Time period for the insights',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the request was successful' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Metric name' },
              values: { type: 'array', description: 'Metric values over time' }
            }
          }
        }
      }
    },
    {
      id: 'get_user_profile',
      name: 'Get Page Profile',
      description: 'Get Facebook page profile information',
      category: 'Pages',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/{page_id}',
        method: 'GET',
        baseUrl: 'https://graph.facebook.com/v18.0',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          pageId: 'page_id',
          fields: 'fields'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID to get profile for (use "me" for authenticated user)',
          placeholder: 'Enter Page ID or "me"',
          aiControlled: false
        },
        fields: {
          type: 'string',
          label: 'Fields',
          default: 'id,name,about,category,fan_count,followers_count,picture,cover,website',
          description: 'Comma-separated list of fields to retrieve',
          placeholder: 'id,name,about',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the request was successful' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Page ID' },
            name: { type: 'string', description: 'Page name' },
            about: { type: 'string', description: 'Page description' },
            category: { type: 'string', description: 'Page category' },
            fan_count: { type: 'number', description: 'Number of fans/likes' },
            followers_count: { type: 'number', description: 'Number of followers' }
          }
        }
      }
    },
    {
      id: 'get_followers_count',
      name: 'Get Followers Count',
      description: 'Get the follower count for a Facebook page',
      category: 'Analytics',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/{page_id}',
        method: 'GET',
        baseUrl: 'https://graph.facebook.com/v18.0',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          pageId: 'page_id'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID to get followers count for',
          placeholder: 'Enter your Facebook Page ID',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the request was successful' },
        data: {
          type: 'object',
          properties: {
            total_followers: { type: 'number', description: 'Total number of followers' }
          }
        }
      }
    },
    {
      id: 'schedule_post',
      name: 'Schedule Post',
      description: 'Schedule a post to be published at a specific time',
      category: 'Posts',
      icon: 'clock',
      verified: false,
      api: {
        endpoint: '/{page_id}/feed',
        method: 'POST',
        baseUrl: 'https://graph.facebook.com/v18.0',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          pageId: 'page_id',
          message: 'message',
          link: 'link',
          photo: 'photo',
          video: 'video',
          scheduled_publish_time: 'scheduled_publish_time',
          published: 'published'
        }
      },
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID where the post will be scheduled',
          placeholder: 'Enter your Facebook Page ID',
          aiControlled: false
        },
        message: {
          type: 'string',
          label: 'Message',
          inputType: 'textarea',
          description: 'The text content of the scheduled post',
          maxLength: 63206,
          aiControlled: true,
          aiDescription: 'The text content of the scheduled Facebook post'
        },
        link: {
          type: 'string',
          label: 'Link URL',
          placeholder: 'https://example.com',
          description: 'URL to attach to the post (optional)',
          aiControlled: false
        },
        photo: {
          type: 'string',
          label: 'Photo URL',
          placeholder: 'https://example.com/image.jpg',
          description: 'Public URL of a photo to attach (optional)',
          aiControlled: false
        },
        video: {
          type: 'string',
          label: 'Video URL',
          placeholder: 'https://example.com/video.mp4',
          description: 'Public URL of a video to attach (optional)',
          aiControlled: false
        },
        scheduledTime: {
          type: 'string',
          required: true,
          label: 'Scheduled Time',
          description: 'ISO 8601 datetime string for when to publish the post',
          placeholder: '2024-12-25T10:00:00Z',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the scheduling was successful' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The scheduled post ID' },
            post_id: { type: 'string', description: 'The full post ID' }
          }
        }
      }
    }
  ],
  supported_triggers: [
    {
      id: 'new_post',
      name: 'New Post',
      description: 'Triggered when a new post is created on the page',
      eventType: 'feed',
      icon: 'send',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID to monitor for new posts',
          placeholder: 'Enter your Facebook Page ID'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Post ID' },
        message: { type: 'string', description: 'Post message content' },
        created_time: { type: 'string', description: 'Post creation timestamp' },
        from: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Author ID' },
            name: { type: 'string', description: 'Author name' }
          }
        }
      }
    },
    {
      id: 'new_comment',
      name: 'New Comment',
      description: 'Triggered when a new comment is received on a post',
      eventType: 'comments',
      icon: 'message-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        pageId: {
          type: 'string',
          required: true,
          label: 'Page ID',
          description: 'Facebook Page ID to monitor for new comments',
          placeholder: 'Enter your Facebook Page ID'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        message: { type: 'string', description: 'Comment text' },
        post_id: { type: 'string', description: 'Parent post ID' },
        from: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Commenter ID' },
            name: { type: 'string', description: 'Commenter name' }
          }
        },
        created_time: { type: 'string', description: 'Comment timestamp' }
      }
    }
  ],
};
