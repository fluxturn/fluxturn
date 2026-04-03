// Twitter Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const TWITTER_CONNECTOR: ConnectorDefinition = {
    name: 'twitter',
    display_name: 'Twitter/X',
    category: 'social',
    description: 'Post, like, and search tweets, send messages, search users, and add users to lists',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
          { label: 'Custom OAuth App', value: 'manual', description: 'Use your own Twitter app credentials' }
        ],
        default: 'oauth2'
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: true,
        placeholder: 'Your Twitter OAuth Client ID',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Your Twitter OAuth Client Secret',
        displayOptions: { authType: ['manual'] }
      }
    ],
    endpoints: {
      base_url: 'https://api.twitter.com',
      tweets: '/2/tweets',
      search: '/2/tweets/search/recent',
      users: '/2/users',
      directMessages: '/2/dm_conversations/with/{participant_id}/messages',
      lists: '/2/lists',
      timeline: '/2/users/{id}/tweets'
    },
    webhook_support: true,
    rate_limits: {
      tweets_per_15min: 300,
      requests_per_15min: 900
    },
    sandbox_available: false,
    verified: true,
    oauth_config: {
      authorization_url: 'https://twitter.com/i/oauth2/authorize',
      token_url: 'https://api.twitter.com/2/oauth2/token',
      scopes: [
        'tweet.read',
        'tweet.write',
        'users.read',
        'follows.read',
        'follows.write',
        'like.read',
        'like.write',
        'dm.read',
        'dm.write',
        'list.read',
        'list.write',
        'offline.access'
      ]
    },
    supported_actions: [
      {
        id: 'create_tweet',
        name: 'Create Tweet',
        description: 'Create, quote, or reply to a tweet',
        category: 'Tweets',
        icon: 'message-square',
        verified: false,
        api: {
          endpoint: '/2/tweets',
          method: 'POST',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            text: 'text',
            reply_to: 'reply.in_reply_to_tweet_id',
            media: 'media'
          }
        },
        inputSchema: {
          text: {
            type: 'string',
            required: true,
            label: 'Tweet Text',
            inputType: 'textarea',
            maxLength: 280,
            description: 'The text of the tweet. URLs will be shortened with t.co',
            aiControlled: true,
            aiDescription: 'The text content of the tweet (max 280 characters)'
          },
          reply_to: {
            type: 'string',
            label: 'Reply to Tweet ID',
            placeholder: '1187836157394112513',
            description: 'ID of the tweet to reply to (leave empty to post a new tweet)',
            aiControlled: false
          },
          mediaFiles: {
            type: 'array',
            label: 'Upload Images from Device',
            description: 'Upload up to 4 images from your device (max 5MB each). Click or drag & drop.',
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                fileData: {
                  type: 'string',
                  label: 'Image Data',
                  inputType: 'file',
                  accept: 'image/jpeg,image/png,image/gif,image/webp',
                  description: 'Base64 encoded image data'
                },
                fileName: {
                  type: 'string',
                  label: 'File Name',
                  placeholder: 'image.jpg',
                  description: 'Name of the image file'
                },
                mimeType: {
                  type: 'string',
                  label: 'MIME Type',
                  description: 'MIME type of the image'
                }
              }
            }
          },
          mediaUrls: {
            type: 'array',
            label: 'Or Use Image URLs',
            description: 'Array of publicly accessible image URLs (up to 4). Leave empty if uploading files above.',
            maxItems: 4,
            showAvailableFields: true,
            items: { type: 'string' }
          },
          videoUrl: {
            type: 'string',
            label: 'Video URL',
            placeholder: 'https://example.com/video.mp4',
            description: 'Publicly accessible video URL (MP4 format, max 512MB, max 140 seconds). Leave empty if not posting a video.'
          }
        }
      },
      {
        id: 'delete_tweet',
        name: 'Delete Tweet',
        description: 'Delete a tweet permanently',
        category: 'Tweets',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/2/tweets/{id}',
          method: 'DELETE',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            tweetId: 'id'
          }
        },
        inputSchema: {
          tweetId: {
            type: 'string',
            required: true,
            label: 'Tweet ID',
            placeholder: '1187836157394112513',
            description: 'ID of the tweet to delete'
          }
        }
      },
      {
        id: 'like_tweet',
        name: 'Like Tweet',
        description: 'Like a tweet',
        category: 'Tweets',
        icon: 'heart',
        verified: false,
        api: {
          endpoint: '/2/users/{user_id}/likes',
          method: 'POST',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            tweetId: 'tweet_id'
          }
        },
        inputSchema: {
          tweetId: {
            type: 'string',
            required: true,
            label: 'Tweet ID',
            placeholder: '1187836157394112513',
            description: 'ID of the tweet to like'
          }
        }
      },
      {
        id: 'retweet',
        name: 'Retweet',
        description: 'Retweet a tweet',
        category: 'Tweets',
        icon: 'repeat',
        verified: false,
        api: {
          endpoint: '/2/users/{user_id}/retweets',
          method: 'POST',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            tweetId: 'tweet_id'
          }
        },
        inputSchema: {
          tweetId: {
            type: 'string',
            required: true,
            label: 'Tweet ID',
            placeholder: '1187836157394112513',
            description: 'ID of the tweet to retweet'
          }
        }
      },
      {
        id: 'search_tweets',
        name: 'Search Tweets',
        description: 'Search for tweets from the last seven days',
        category: 'Tweets',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/2/tweets/search/recent',
          method: 'GET',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            query: 'query',
            maxResults: 'max_results',
            sortOrder: 'sort_order',
            startTime: 'start_time',
            endTime: 'end_time',
            tweetFields: 'tweet.fields'
          }
        },
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Search Query',
            placeholder: 'automation OR workflow',
            description: 'Search query using Twitter search operators (max 500 characters)'
          },
          maxResults: {
            type: 'number',
            label: 'Max Results',
            default: 10,
            min: 10,
            max: 100,
            description: 'Maximum number of tweets to return (10-100)'
          },
          sortOrder: {
            type: 'select',
            label: 'Sort Order',
            options: [
              { label: 'Recent', value: 'recency' },
              { label: 'Relevant', value: 'relevancy' }
            ],
            default: 'recency',
            description: 'Order to return results'
          },
          startTime: {
            type: 'string',
            label: 'Start Time',
            inputType: 'datetime',
            description: 'Tweets after this time (ISO 8601 format, within last 7 days)'
          },
          endTime: {
            type: 'string',
            label: 'End Time',
            inputType: 'datetime',
            description: 'Tweets before this time (ISO 8601 format)'
          },
          tweetFields: {
            type: 'array',
            label: 'Tweet Fields',
            description: 'Additional fields to return',
            items: {
              type: 'select',
              options: [
                { label: 'Attachments', value: 'attachments' },
                { label: 'Author ID', value: 'author_id' },
                { label: 'Created At', value: 'created_at' },
                { label: 'Public Metrics', value: 'public_metrics' },
                { label: 'Entities', value: 'entities' },
                { label: 'Geo', value: 'geo' },
                { label: 'Language', value: 'lang' }
              ]
            }
          }
        }
      },
      {
        id: 'send_direct_message',
        name: 'Send Direct Message',
        description: 'Send a direct message to a user',
        category: 'Direct Messages',
        icon: 'mail',
        verified: false,
        api: {
          endpoint: '/2/dm_conversations/with/{participant_id}/messages',
          method: 'POST',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            userId: 'participant_id',
            text: 'text',
            mediaId: 'attachments[0].media_id'
          }
        },
        inputSchema: {
          userId: {
            type: 'string',
            required: true,
            label: 'User ID or Username',
            placeholder: '@username or 1068479892537384960',
            description: 'Twitter user ID or username (with or without @)',
            aiControlled: false
          },
          text: {
            type: 'string',
            required: true,
            label: 'Message Text',
            inputType: 'textarea',
            maxLength: 10000,
            description: 'Text of the direct message (max 10,000 characters)',
            aiControlled: true,
            aiDescription: 'The message text to send as a direct message'
          },
          mediaId: {
            type: 'string',
            label: 'Media ID',
            placeholder: '1664279886239010824',
            description: 'Media ID to attach (upload media first)',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_user',
        name: 'Get User',
        description: 'Retrieve user information by username or ID',
        category: 'Users',
        icon: 'user',
        verified: false,
        api: {
          endpoint: '/2/users',
          method: 'GET',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            username: 'usernames',
            userId: 'ids'
          }
        },
        inputSchema: {
          searchBy: {
            type: 'select',
            required: true,
            label: 'Search By',
            options: [
              { label: 'Username', value: 'username' },
              { label: 'User ID', value: 'id' },
              { label: 'Me (Authenticated User)', value: 'me' }
            ],
            default: 'username',
            description: 'How to search for the user'
          },
          username: {
            type: 'string',
            label: 'Username',
            placeholder: 'n8n_io',
            description: 'Twitter username (without @)',
            displayCondition: { searchBy: 'username' }
          },
          userId: {
            type: 'string',
            label: 'User ID',
            placeholder: '1068479892537384960',
            description: 'Twitter user ID',
            displayCondition: { searchBy: 'id' }
          }
        }
      },
      {
        id: 'add_to_list',
        name: 'Add User to List',
        description: 'Add a user to a Twitter list',
        category: 'Lists',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/2/lists/{list_id}/members',
          method: 'POST',
          baseUrl: 'https://api.twitter.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            listId: 'list_id',
            userId: 'user_id'
          }
        },
        inputSchema: {
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            placeholder: '99923132',
            description: 'ID of the Twitter list'
          },
          userId: {
            type: 'string',
            required: true,
            label: 'User ID or Username',
            placeholder: '@username or 1068479892537384960',
            description: 'User to add to the list (ID or username)'
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_mention',
        name: 'New Mention',
        description: 'Triggered when someone mentions you on Twitter',
        eventType: 'polling',
        verified: false,
        icon: 'at-sign',
        webhookRequired: false,
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              label: 'Trigger Event',
              default: 'new_mention',
              enum: ['new_mention'],
              description: 'Triggers when someone mentions you in a tweet'
            },
            pollingInterval: {
              type: 'number',
              label: 'Polling Interval (minutes)',
              default: 15,
              enum: [1, 2, 5, 10, 15, 30],
              description: 'How often to check for new mentions'
            }
          },
          required: ['event', 'pollingInterval']
        },
        outputSchema: {
          id: { type: 'string' },
          text: { type: 'string' },
          author_id: { type: 'string' },
          created_at: { type: 'string' },
          public_metrics: { type: 'object' }
        }
      },
      {
        id: 'new_tweet',
        name: 'New Tweet',
        description: 'Triggered when you post a new tweet',
        eventType: 'polling',
        verified: false,
        icon: 'message-square',
        webhookRequired: false,
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              label: 'Trigger Event',
              default: 'new_tweet',
              enum: ['new_tweet'],
              description: 'Triggers when you post a new tweet'
            },
            pollingInterval: {
              type: 'number',
              label: 'Polling Interval (minutes)',
              default: 15,
              enum: [1, 2, 5, 10, 15, 30],
              description: 'How often to check for new tweets'
            }
          },
          required: ['event', 'pollingInterval']
        },
        outputSchema: {
          id: { type: 'string' },
          text: { type: 'string' },
          author_id: { type: 'string' },
          created_at: { type: 'string' },
          public_metrics: { type: 'object' }
        }
      }
    ]
  };
