// Reddit Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const REDDIT_CONNECTOR: ConnectorDefinition = {
    name: 'reddit',
    display_name: 'Reddit',
    category: 'social',
    description: 'Reddit API for posts, comments, and community interaction',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
          { label: 'Custom OAuth App', value: 'manual', description: 'Use your own Reddit app credentials' }
        ],
        default: 'oauth2'
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: true,
        placeholder: 'Your Reddit App Client ID',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Your Reddit App Client Secret',
        displayOptions: { authType: ['manual'] }
      }
    ],
    endpoints: {
      posts: '/api/submit',
      comments: '/api/comment',
      search: '/search',
      user: '/user/{username}/about',
      subreddit: '/r/{subreddit}/about'
    },
    webhook_support: false,
    rate_limits: { requests_per_minute: 60 },
    sandbox_available: false,
    verified: true,
    oauth_config: {
      authorization_url: 'https://www.reddit.com/api/v1/authorize',
      token_url: 'https://www.reddit.com/api/v1/access_token',
      scopes: ['identity', 'edit', 'history', 'mysubreddits', 'read', 'save', 'submit']
    },
    supported_actions: [
      // Post Operations
      {
        id: 'post_create',
        name: 'Create Post',
        description: 'Submit a new post to a subreddit',
        category: 'Post',
        icon: 'file-plus',
        verified: false,
        api: {
          endpoint: '/api/submit',
          method: 'POST',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            subreddit: 'sr',
            title: 'title',
            text: 'text',
            url: 'url',
            kind: 'kind',
            resubmit: 'resubmit',
            sendReplies: 'sendreplies'
          }
        },
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit to post to (without r/)',
            placeholder: 'AskReddit',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            description: 'Post title (max 300 characters)',
            maxLength: 300,
            aiControlled: true,
            aiDescription: 'The title of the Reddit post'
          },
          kind: {
            type: 'select',
            required: true,
            label: 'Post Type',
            description: 'Type of post to create',
            default: 'self',
            options: [
              { label: 'Text Post', value: 'self' },
              { label: 'Link Post', value: 'link' },
              { label: 'Image Post', value: 'image' }
            ],
            aiControlled: false
          },
          text: {
            type: 'text',
            label: 'Text Content',
            description: 'Text content for self posts (supports markdown)',
            displayCondition: { kind: 'self' },
            aiControlled: true,
            aiDescription: 'The text content of the Reddit post (supports markdown)'
          },
          url: {
            type: 'string',
            label: 'URL',
            description: 'URL for link posts',
            format: 'url',
            displayCondition: { kind: 'link' },
            aiControlled: false
          },
          sendReplies: {
            type: 'boolean',
            label: 'Send Replies',
            description: 'Receive notifications for replies',
            default: true,
            aiControlled: false
          }
        }
      },
      {
        id: 'post_delete',
        name: 'Delete Post',
        description: 'Delete a post from a subreddit',
        category: 'Post',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/api/del',
          method: 'POST',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            postId: 'id'
          }
        },
        inputSchema: {
          postId: {
            type: 'string',
            required: true,
            label: 'Post ID',
            description: 'Full ID of the post (e.g., t3_xxxxx)',
            placeholder: 't3_abc123',
            aiControlled: false
          }
        }
      },
      {
        id: 'post_get',
        name: 'Get Post',
        description: 'Retrieve a specific post from a subreddit',
        category: 'Post',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/r/{subreddit}/comments/{postId}',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            subreddit: 'subreddit',
            postId: 'postId'
          }
        },
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit name (without r/)',
            placeholder: 'programming',
            aiControlled: false
          },
          postId: {
            type: 'string',
            required: true,
            label: 'Post ID',
            description: 'The post ID (without t3_ prefix)',
            placeholder: 'abc123',
            aiControlled: false
          }
        }
      },
      {
        id: 'post_get_many',
        name: 'Get Many Posts',
        description: 'Retrieve multiple posts from a subreddit',
        category: 'Post',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/r/{subreddit}/{category}',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            subreddit: 'subreddit',
            category: 'category',
            limit: 'limit'
          }
        },
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit name (without r/)',
            placeholder: 'technology',
            aiControlled: false
          },
          category: {
            type: 'select',
            required: true,
            label: 'Category',
            description: 'Filter posts by category',
            default: 'hot',
            options: [
              { label: 'Hot', value: 'hot' },
              { label: 'New', value: 'new' },
              { label: 'Rising', value: 'rising' },
              { label: 'Top', value: 'top' }
            ],
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Number of posts to retrieve (max 100)',
            default: 10,
            minimum: 1,
            maximum: 100,
            aiControlled: false
          }
        }
      },
      {
        id: 'post_search',
        name: 'Search Posts',
        description: 'Search for posts in a subreddit or across Reddit',
        category: 'Post',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/r/{subreddit}/search',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            subreddit: 'subreddit',
            query: 'q',
            sort: 'sort',
            time: 't',
            limit: 'limit'
          }
        },
        inputSchema: {
          location: {
            type: 'select',
            required: true,
            label: 'Search Location',
            description: 'Where to search for posts',
            default: 'subreddit',
            options: [
              { label: 'Specific Subreddit', value: 'subreddit' },
              { label: 'All of Reddit', value: 'all' }
            ],
            aiControlled: false
          },
          subreddit: {
            type: 'string',
            label: 'Subreddit',
            description: 'The subreddit to search (without r/)',
            placeholder: 'askscience',
            displayCondition: { location: 'subreddit' },
            aiControlled: false
          },
          query: {
            type: 'string',
            required: true,
            label: 'Search Query',
            description: 'Keywords to search for',
            placeholder: 'machine learning',
            aiControlled: false
          },
          sort: {
            type: 'select',
            label: 'Sort By',
            description: 'How to sort search results',
            default: 'relevance',
            options: [
              { label: 'Relevance', value: 'relevance' },
              { label: 'Hot', value: 'hot' },
              { label: 'Top', value: 'top' },
              { label: 'New', value: 'new' },
              { label: 'Comments', value: 'comments' }
            ],
            aiControlled: false
          },
          time: {
            type: 'select',
            label: 'Time Filter',
            description: 'Time period for search',
            default: 'all',
            options: [
              { label: 'All Time', value: 'all' },
              { label: 'Past Hour', value: 'hour' },
              { label: 'Past Day', value: 'day' },
              { label: 'Past Week', value: 'week' },
              { label: 'Past Month', value: 'month' },
              { label: 'Past Year', value: 'year' }
            ],
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Number of results to retrieve (max 100)',
            default: 25,
            minimum: 1,
            maximum: 100,
            aiControlled: false
          }
        }
      },
      // Comment Operations
      {
        id: 'comment_create',
        name: 'Create Comment',
        description: 'Create a top-level comment on a post',
        category: 'Comment',
        icon: 'message-square',
        verified: false,
        api: {
          endpoint: '/api/comment',
          method: 'POST',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            postId: 'thing_id',
            text: 'text'
          }
        },
        inputSchema: {
          postId: {
            type: 'string',
            required: true,
            label: 'Post ID',
            description: 'Full ID of the post (e.g., t3_xxxxx)',
            placeholder: 't3_abc123',
            aiControlled: false
          },
          text: {
            type: 'text',
            required: true,
            label: 'Comment Text',
            description: 'Comment text (supports markdown)',
            placeholder: 'Your comment here...',
            aiControlled: true,
            aiDescription: 'The text content of the comment (supports markdown)'
          }
        }
      },
      {
        id: 'comment_reply',
        name: 'Reply to Comment',
        description: 'Reply to an existing comment',
        category: 'Comment',
        icon: 'corner-down-right',
        verified: false,
        api: {
          endpoint: '/api/comment',
          method: 'POST',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            commentId: 'thing_id',
            text: 'text'
          }
        },
        inputSchema: {
          commentId: {
            type: 'string',
            required: true,
            label: 'Comment ID',
            description: 'Full ID of the comment to reply to (e.g., t1_xxxxx)',
            placeholder: 't1_abc123',
            aiControlled: false
          },
          text: {
            type: 'text',
            required: true,
            label: 'Reply Text',
            description: 'Reply text (supports markdown)',
            placeholder: 'Your reply here...',
            aiControlled: true,
            aiDescription: 'The reply text content (supports markdown)'
          }
        }
      },
      {
        id: 'comment_delete',
        name: 'Delete Comment',
        description: 'Delete a comment',
        category: 'Comment',
        icon: 'trash-2',
        verified: false,
        api: {
          endpoint: '/api/del',
          method: 'POST',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            commentId: 'id'
          }
        },
        inputSchema: {
          commentId: {
            type: 'string',
            required: true,
            label: 'Comment ID',
            description: 'Full ID of the comment (e.g., t1_xxxxx)',
            placeholder: 't1_abc123',
            aiControlled: false
          }
        }
      },
      {
        id: 'comment_get_many',
        name: 'Get Comments',
        description: 'Retrieve comments from a post',
        category: 'Comment',
        icon: 'message-circle',
        verified: false,
        api: {
          endpoint: '/r/{subreddit}/comments/{postId}',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            subreddit: 'subreddit',
            postId: 'postId',
            limit: 'limit'
          }
        },
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit name (without r/)',
            placeholder: 'programming',
            aiControlled: false
          },
          postId: {
            type: 'string',
            required: true,
            label: 'Post ID',
            description: 'The post ID (without t3_ prefix)',
            placeholder: 'abc123',
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Number of comments to retrieve',
            default: 50,
            minimum: 1,
            maximum: 100,
            aiControlled: false
          }
        }
      },
      // Profile Operations
      {
        id: 'profile_get',
        name: 'Get Profile',
        description: 'Retrieve authenticated user\'s profile information',
        category: 'Profile',
        icon: 'user',
        verified: false,
        api: {
          endpoint: '/api/v1/me',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            details: 'details'
          }
        },
        inputSchema: {
          details: {
            type: 'select',
            required: true,
            label: 'Profile Details',
            description: 'What profile information to retrieve',
            default: 'identity',
            options: [
              { label: 'Identity', value: 'identity' },
              { label: 'Karma', value: 'karma' },
              { label: 'Blocked Users', value: 'blocked' },
              { label: 'Friends', value: 'friends' },
              { label: 'Preferences', value: 'prefs' },
              { label: 'Trophies', value: 'trophies' }
            ],
            aiControlled: false
          }
        }
      },
      // Subreddit Operations
      {
        id: 'subreddit_get',
        name: 'Get Subreddit Info',
        description: 'Retrieve information about a subreddit',
        category: 'Subreddit',
        icon: 'folder',
        verified: false,
        api: {
          endpoint: '/r/{subreddit}/about',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            subreddit: 'subreddit'
          }
        },
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit name (without r/)',
            placeholder: 'learnprogramming',
            aiControlled: false
          },
          infoType: {
            type: 'select',
            label: 'Information Type',
            description: 'Type of information to retrieve',
            default: 'about',
            options: [
              { label: 'About', value: 'about' },
              { label: 'Rules', value: 'rules' }
            ],
            aiControlled: false
          }
        }
      },
      {
        id: 'subreddit_search',
        name: 'Search Subreddits',
        description: 'Search for subreddits by keyword',
        category: 'Subreddit',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/subreddits/search',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            query: 'q',
            limit: 'limit'
          }
        },
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Search Query',
            description: 'Keywords to search for subreddits',
            placeholder: 'programming',
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Number of results to retrieve',
            default: 10,
            minimum: 1,
            maximum: 100,
            aiControlled: false
          }
        }
      },
      // User Operations
      {
        id: 'user_get',
        name: 'Get User Info',
        description: 'Retrieve public information about a Reddit user',
        category: 'User',
        icon: 'user-check',
        verified: false,
        api: {
          endpoint: '/user/{username}/about',
          method: 'GET',
          baseUrl: 'https://oauth.reddit.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            username: 'username'
          }
        },
        inputSchema: {
          username: {
            type: 'string',
            required: true,
            label: 'Username',
            description: 'Reddit username (without u/)',
            placeholder: 'spez',
            aiControlled: false
          },
          details: {
            type: 'select',
            label: 'User Details',
            description: 'What user information to retrieve',
            default: 'about',
            options: [
              { label: 'About', value: 'about' },
              { label: 'Comments', value: 'comments' },
              { label: 'Submitted Posts', value: 'submitted' },
              { label: 'Gilded', value: 'gilded' },
              { label: 'Overview', value: 'overview' }
            ],
            aiControlled: false
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_post',
        name: 'New Post in Subreddit',
        description: 'Triggers when a new post is created in a subreddit (polling)',
        eventType: 'post',
        verified: false,
        icon: 'file-plus',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit to monitor (without r/)',
            placeholder: 'programming'
          },
          category: {
            type: 'select',
            label: 'Post Category',
            description: 'Which posts to monitor',
            default: 'new',
            options: [
              { label: 'New', value: 'new' },
              { label: 'Hot', value: 'hot' },
              { label: 'Rising', value: 'rising' },
              { label: 'Top', value: 'top' }
            ]
          },
          pollingInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            description: 'How often to check for new posts',
            default: 5,
            minimum: 1,
            maximum: 60
          }
        },
        outputSchema: {
          postId: { type: 'string', description: 'Post ID' },
          title: { type: 'string', description: 'Post title' },
          author: { type: 'string', description: 'Post author username' },
          subreddit: { type: 'string', description: 'Subreddit name' },
          url: { type: 'string', description: 'Post URL' },
          text: { type: 'string', description: 'Post text content' },
          score: { type: 'number', description: 'Post score (upvotes - downvotes)' },
          numComments: { type: 'number', description: 'Number of comments' },
          createdUtc: { type: 'number', description: 'Creation timestamp' },
          permalink: { type: 'string', description: 'Reddit permalink' }
        }
      },
      {
        id: 'new_comment',
        name: 'New Comment in Subreddit',
        description: 'Triggers when a new comment is posted in a subreddit (polling)',
        eventType: 'comment',
        verified: false,
        icon: 'message-square',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit to monitor (without r/)',
            placeholder: 'AskReddit'
          },
          pollingInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            description: 'How often to check for new comments',
            default: 5,
            minimum: 1,
            maximum: 60
          }
        },
        outputSchema: {
          commentId: { type: 'string', description: 'Comment ID' },
          author: { type: 'string', description: 'Comment author username' },
          body: { type: 'string', description: 'Comment text' },
          postId: { type: 'string', description: 'Parent post ID' },
          subreddit: { type: 'string', description: 'Subreddit name' },
          score: { type: 'number', description: 'Comment score' },
          createdUtc: { type: 'number', description: 'Creation timestamp' },
          permalink: { type: 'string', description: 'Reddit permalink' }
        }
      },
      {
        id: 'user_mention',
        name: 'User Mention',
        description: 'Triggers when the authenticated user is mentioned (polling)',
        eventType: 'mention',
        verified: false,
        icon: 'at-sign',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          pollingInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            description: 'How often to check for mentions',
            default: 10,
            minimum: 5,
            maximum: 60
          },
          includeComments: {
            type: 'boolean',
            label: 'Include Comment Mentions',
            description: 'Include mentions in comments',
            default: true
          },
          includePosts: {
            type: 'boolean',
            label: 'Include Post Mentions',
            description: 'Include mentions in posts',
            default: true
          }
        },
        outputSchema: {
          type: { type: 'string', description: 'Mention type (post or comment)' },
          id: { type: 'string', description: 'Mention ID' },
          author: { type: 'string', description: 'Mention author username' },
          body: { type: 'string', description: 'Mention text' },
          subreddit: { type: 'string', description: 'Subreddit name' },
          createdUtc: { type: 'number', description: 'Creation timestamp' },
          permalink: { type: 'string', description: 'Reddit permalink' }
        }
      },
      {
        id: 'post_updated',
        name: 'Post Score Updated',
        description: 'Triggers when a post\'s score changes significantly (polling)',
        eventType: 'post_update',
        verified: false,
        icon: 'trending-up',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          subreddit: {
            type: 'string',
            required: true,
            label: 'Subreddit',
            description: 'The subreddit to monitor (without r/)',
            placeholder: 'technology'
          },
          scoreThreshold: {
            type: 'number',
            label: 'Score Threshold',
            description: 'Minimum score change to trigger',
            default: 100,
            minimum: 10
          },
          pollingInterval: {
            type: 'number',
            label: 'Polling Interval (minutes)',
            description: 'How often to check for score updates',
            default: 15,
            minimum: 5,
            maximum: 60
          }
        },
        outputSchema: {
          postId: { type: 'string', description: 'Post ID' },
          title: { type: 'string', description: 'Post title' },
          score: { type: 'number', description: 'Current score' },
          previousScore: { type: 'number', description: 'Previous score' },
          scoreDelta: { type: 'number', description: 'Score change' },
          permalink: { type: 'string', description: 'Reddit permalink' }
        }
      }
    ]
  };
