// Linkedin Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const LINKEDIN_CONNECTOR: ConnectorDefinition = {
    name: 'linkedin',
    display_name: 'LinkedIn',
    category: 'social',
    description: 'LinkedIn API for posts and professional networking with support for images, articles, and organization posting',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
          { label: 'Custom OAuth App', value: 'manual', description: 'Use your own LinkedIn app credentials' }
        ],
        default: 'oauth2'
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: true,
        placeholder: '86abcdefgh123456',
        description: 'OAuth2 Client ID from LinkedIn Developer Portal',
        helpUrl: 'https://www.linkedin.com/developers/apps',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your Client Secret',
        description: 'OAuth2 Client Secret from LinkedIn Developer Portal',
        helpUrl: 'https://www.linkedin.com/developers/apps',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'organization_support',
        label: 'Organization Support',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Request permissions to post as an organization (requires Marketing Developer Platform access)'
      },
      {
        key: 'legacy',
        label: 'Legacy',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Use legacy LinkedIn API endpoints (for apps created before 2023)'
      },
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: false,
        placeholder: 'Obtained automatically via OAuth flow',
        description: 'OAuth2 access token (automatically populated after authorization)',
        readonly: true
      },
      {
        key: 'refresh_token',
        label: 'Refresh Token',
        type: 'password',
        required: false,
        placeholder: 'Obtained automatically via OAuth flow',
        description: 'OAuth2 refresh token (automatically populated after authorization)',
        readonly: true
      },
      {
        key: 'expires_at',
        label: 'Token Expires At',
        type: 'string',
        required: false,
        placeholder: 'Automatically calculated',
        description: 'Access token expiration time',
        readonly: true
      },
      {
        key: 'company_id',
        label: 'Company ID',
        type: 'string',
        required: false,
        placeholder: '12345678',
        description: 'Optional LinkedIn company/organization ID for organization posting'
      }
    ],
    endpoints: {
      posts: '/rest/posts',
      images: '/images',
      profile: '/v2/userinfo',
      legacyProfile: '/v2/me',
      organizations: '/v2/organizationAcls'
    },
    webhook_support: false,
    rate_limits: { requests_per_day: 1000, requests_per_minute: 60 },
    sandbox_available: false,
    verified: true,
    oauth_config: {
      authorization_url: 'https://www.linkedin.com/oauth/v2/authorization',
      token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
      // Base scopes (always requested)
      scopes: ['openid', 'profile', 'email', 'w_member_social'],
      // Dynamic scope calculation:
      // - If organization_support = true: add 'w_organization_social'
      // - If legacy = true: use ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'w_organization_social']
      scope_template: '{{organization_support ? "openid profile email w_member_social w_organization_social" : legacy ? "r_liteprofile r_emailaddress w_member_social" : "openid profile email w_member_social"}}'
    },
    supported_actions: [
      {
        id: 'create_post',
        name: 'Create Post',
        description: 'Create a LinkedIn post with text, images, or articles',
        category: 'Posts',
        icon: 'file-plus',
        verified: false,
        api: {
          endpoint: '/rest/posts',
          method: 'POST',
          baseUrl: 'https://api.linkedin.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}',
            'Accept': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202504'
          },
          paramMapping: {
            text: 'commentary',
            shareMediaCategory: 'content.media',
            visibility: 'visibility'
          }
        },
        inputSchema: {
          text: {
            type: 'string',
            required: true,
            label: 'Post Text',
            inputType: 'textarea',
            maxLength: 3000,
            description: 'Post content (special characters will be automatically escaped)',
            placeholder: 'Enter your post content...',
            aiControlled: true,
            aiDescription: 'The text content of the LinkedIn post'
          },
          postAs: {
            type: 'select',
            required: false,
            label: 'Post As',
            description: 'Post as yourself or an organization',
            default: 'person',
            options: [
              { label: 'Person (Me)', value: 'person' },
              { label: 'Organization', value: 'organization' }
            ]
          },
          organizationUrn: {
            type: 'string',
            required: false,
            label: 'Organization URN',
            placeholder: '12345678',
            description: 'Organization URN (required when posting as organization)',
            displayOptions: {
              show: {
                postAs: ['organization']
              }
            }
          },
          visibility: {
            type: 'select',
            required: false,
            label: 'Visibility',
            description: 'Who can see this post',
            default: 'PUBLIC',
            options: [
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Connections Only', value: 'CONNECTIONS' }
            ]
          },
          imageUrl: {
            type: 'string',
            required: false,
            label: 'Image URL (Optional)',
            placeholder: 'https://example.com/image.jpg',
            description: 'URL of an image to include in the post. Leave empty for text-only post. Note: Cannot use with video.'
          },
          videoUrl: {
            type: 'string',
            required: false,
            label: 'Video URL (Optional)',
            placeholder: 'https://example.com/video.mp4',
            description: 'URL of a video to include in the post (max 200MB). Note: Cannot use with image - LinkedIn only supports one media type per post.'
          },
          articleUrl: {
            type: 'string',
            required: false,
            label: 'Article URL (Optional)',
            inputType: 'url',
            placeholder: 'https://example.com/article',
            description: 'URL of an article to share. Note: Cannot use with image or video.'
          },
          articleTitle: {
            type: 'string',
            required: false,
            label: 'Article Title',
            placeholder: 'Article title',
            description: 'Title for the article (shown when Article URL is provided)',
            aiControlled: true,
            aiDescription: 'Title for the article being shared'
          },
          articleDescription: {
            type: 'string',
            required: false,
            label: 'Article Description',
            inputType: 'textarea',
            placeholder: 'Article description',
            description: 'Description for the article (shown when Article URL is provided)',
            aiControlled: true,
            aiDescription: 'Description for the article being shared'
          }
        }
      },
      {
        id: 'get_profile',
        name: 'Get Profile',
        description: 'Get LinkedIn profile information',
        category: 'Profile',
        icon: 'user',
        verified: false,
        api: {
          endpoint: '/v2/userinfo',
          method: 'GET',
          baseUrl: 'https://api.linkedin.com',
          headers: {
            'Authorization': 'Bearer {access_token}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {
          user_id: {
            type: 'string',
            required: false,
            label: 'User ID',
            placeholder: 'Leave empty for current user',
            description: 'LinkedIn user ID (optional, defaults to current user)'
          },
          fields: {
            type: 'string',
            required: false,
            label: 'Fields to Retrieve',
            placeholder: 'id,firstName,lastName,profilePicture',
            description: 'Comma-separated list of fields (only works in legacy mode)',
            helpText: 'Example: id,firstName,lastName,profilePicture(displayImage~:playableStreams)',
            displayOptions: {
              show: {
                '@legacy': [true]
              }
            }
          }
        }
      },
      {
        id: 'get_person_urn',
        name: 'Get Person URN',
        description: 'Get the current user\'s person URN and basic information',
        category: 'Profile',
        icon: 'user',
        verified: false,
        api: {
          endpoint: '/v2/userinfo',
          method: 'GET',
          baseUrl: 'https://api.linkedin.com',
          headers: {
            'Authorization': 'Bearer {access_token}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {}
      },
      {
        id: 'get_organizations',
        name: 'Get Organizations',
        description: 'Get organizations where the user has admin access',
        category: 'Organization',
        icon: 'briefcase',
        verified: false,
        api: {
          endpoint: '/v2/organizationAcls',
          method: 'GET',
          baseUrl: 'https://api.linkedin.com',
          headers: {
            'Authorization': 'Bearer {access_token}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {}
      },
      {
        id: 'get_company_updates',
        name: 'Get Company Updates',
        description: 'Get updates from a LinkedIn company page',
        category: 'Organization',
        icon: 'briefcase',
        verified: false,
        api: {
          endpoint: '/rest/posts',
          method: 'GET',
          baseUrl: 'https://api.linkedin.com',
          headers: {
            'Authorization': 'Bearer {access_token}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {
          company_id: {
            type: 'string',
            required: true,
            label: 'Company ID',
            placeholder: '12345678',
            description: 'LinkedIn company/organization ID'
          },
          count: {
            type: 'number',
            required: false,
            label: 'Count',
            default: 20,
            min: 1,
            max: 50,
            description: 'Number of updates to retrieve (max 50)'
          }
        }
      },
      {
        id: 'get_post',
        name: 'Get Post',
        description: 'Get a LinkedIn post by its URN or share ID',
        category: 'Posts',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/rest/posts/{postId}',
          method: 'GET',
          baseUrl: 'https://api.linkedin.com',
          headers: {
            'Authorization': 'Bearer {access_token}',
            'Accept': 'application/json',
            'LinkedIn-Version': '202411',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        },
        inputSchema: {
          postId: {
            type: 'string',
            required: true,
            label: 'Post ID/URN',
            placeholder: 'urn:li:share:123456789',
            description: 'The post URN (e.g., urn:li:share:123456789 or urn:li:ugcPost:123456789) or just the numeric ID'
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_connection',
        name: 'New Connection',
        description: 'Triggered when a new connection is made',
        eventType: 'connection',
        verified: false,
        webhookRequired: true,
        outputSchema: {
          connectionId: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          headline: { type: 'string' },
          timestamp: { type: 'string' }
        }
      },
      {
        id: 'profile_view',
        name: 'Profile View',
        description: 'Triggered when someone views your profile',
        eventType: 'profile_view',
        verified: false,
        webhookRequired: true,
        outputSchema: {
          viewerId: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    ]
  };
