// Facebook Graph Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const FACEBOOK_GRAPH_CONNECTOR: ConnectorDefinition = {
    name: 'facebook_graph',
    display_name: 'Facebook Graph API',
    category: 'social',
    description: 'Interact with Facebook pages, posts, photos, videos, and user data via Graph API',
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
        label: 'App ID',
        type: 'string',
        required: true,
        placeholder: 'Your Facebook App ID',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: 'Your Facebook App Secret',
        displayOptions: { authType: ['manual'] }
      }
    ],
    oauth_config: {
      authorization_url: 'https://www.facebook.com/v18.0/dialog/oauth',
      token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      scopes: [
        'public_profile',
        'email',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_read_user_content',
        'pages_manage_engagement',
      ]
    },
    endpoints: {
      base_url: 'https://graph.facebook.com',
      video_base_url: 'https://graph-video.facebook.com',
      default_version: 'v20.0',
      node: {
        get: '/{version}/{node-id}',
        delete: '/{version}/{node-id}'
      },
      edge: {
        get: '/{version}/{node-id}/{edge}',
        post: '/{version}/{node-id}/{edge}'
      },
      pages: {
        list: '/{version}/me/accounts',
        get: '/{version}/{page-id}'
      },
      posts: {
        create: '/{version}/{page-id}/feed',
        get: '/{version}/{post-id}'
      },
      media: {
        photo: '/{version}/{page-id}/photos',
        video: '/{version}/{page-id}/videos'
      },
      insights: '/{version}/{object-id}/insights'
    },
    webhook_support: true,
    rate_limits: { requests_per_hour: 200 },
    sandbox_available: true,
    verified: true,
    supported_actions: [
      {
        id: 'http_request',
        name: 'HTTP Request',
        description: 'Make any custom HTTP request to Facebook Graph API',
        category: 'HTTP',
        icon: 'globe',
        verified: false,
        api: {
          endpoint: '/{version}/{resource}',
          method: '{method}',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            resource: 'resource',
            method: 'method',
            queryParameters: 'query',
            body: 'body',
            version: 'version'
          }
        },
        inputSchema: {
          hostUrl: {
            type: 'select',
            label: 'Host URL',
            options: [
              { label: 'Default', value: 'graph.facebook.com' },
              { label: 'Video Uploads', value: 'graph-video.facebook.com' }
            ],
            default: 'graph.facebook.com',
            description: 'The Host URL of the request. Almost all requests are passed to the graph.facebook.com host URL. The single exception is video uploads, which use graph-video.facebook.com.',
            required: true,
            aiControlled: false
          },
          method: {
            type: 'select',
            required: true,
            label: 'HTTP Request Method',
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'DELETE', value: 'DELETE' }
            ],
            default: 'GET',
            description: 'The HTTP Method to be used for the request',
            aiControlled: false
          },
          version: {
            type: 'select',
            label: 'Graph API Version',
            options: [
              { label: 'Default', value: '' },
              { label: 'v23.0', value: 'v23.0' },
              { label: 'v22.0', value: 'v22.0' },
              { label: 'v21.0', value: 'v21.0' },
              { label: 'v20.0', value: 'v20.0' },
              { label: 'v19.0', value: 'v19.0' },
              { label: 'v18.0', value: 'v18.0' }
            ],
            default: '',
            description: 'The version of the Graph API to be used in the request',
            aiControlled: false
          },
          node: {
            type: 'string',
            required: true,
            label: 'Node',
            placeholder: 'me',
            description: 'The node on which to operate. A node is an individual object with a unique ID. For example, there are many User node objects, each with a unique ID representing a person on Facebook.',
            aiControlled: false
          },
          edge: {
            type: 'string',
            label: 'Edge',
            placeholder: 'videos',
            description: 'Edge of the node on which to operate. Edges represent collections of objects which are attached to the node.',
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            placeholder: 'Add option',
            default: {},
            description: 'Additional options',
            properties: {
              fields: {
                type: 'fixedCollection',
                label: 'Fields',
                placeholder: 'Add Field',
                typeOptions: {
                  multipleValues: true
                },
                displayOptions: {
                  show: {
                    '/method': ['GET']
                  }
                },
                description: 'The list of fields to request in the GET request',
                default: {},
                items: {
                  field: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        label: 'Name',
                        default: '',
                        description: 'Name of the field'
                      }
                    }
                  }
                }
              },
              queryParameters: {
                type: 'fixedCollection',
                label: 'Query Parameters',
                placeholder: 'Add Parameter',
                typeOptions: {
                  multipleValues: true
                },
                description: 'The query parameters to send',
                default: {},
                items: {
                  parameter: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        label: 'Name',
                        default: '',
                        description: 'Name of the parameter'
                      },
                      value: {
                        type: 'string',
                        label: 'Value',
                        default: '',
                        description: 'Value of the parameter'
                      }
                    }
                  }
                }
              },
              queryParametersJson: {
                type: 'json',
                label: 'Query Parameters JSON',
                default: '{}',
                placeholder: '{"field_name": "field_value"}',
                description: 'The query parameters to send, defined as a JSON object'
              }
            }
          }
        }
      },
      {
        id: 'get_node',
        name: 'Get Node Data',
        description: 'Retrieve data from any Facebook Graph API node (user, page, post, etc.)',
        category: 'Graph API',
        icon: 'database',
        verified: false,
        api: {
          endpoint: '/{version}/{node_id}',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            nodeId: 'node_id',
            fields: 'fields',
            version: 'version'
          }
        },
        inputSchema: {
          nodeId: {
            type: 'string',
            required: true,
            label: 'Node ID',
            placeholder: 'me, page_id, post_id',
            description: 'The ID of the node to retrieve (e.g., "me", page ID, post ID)',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Specific fields to retrieve',
            placeholder: 'id,name,email',
            items: { type: 'string' },
            default: ['id', 'name'],
            aiControlled: false
          },
          version: {
            type: 'select',
            label: 'API Version',
            options: [
              { label: 'v23.0', value: 'v23.0' },
              { label: 'v22.0', value: 'v22.0' },
              { label: 'v21.0', value: 'v21.0' },
              { label: 'v20.0 (Default)', value: 'v20.0' },
              { label: 'v19.0', value: 'v19.0' },
              { label: 'v18.0', value: 'v18.0' }
            ],
            default: 'v20.0',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_edge',
        name: 'Get Edge Data',
        description: 'Retrieve connections/relationships from a node (e.g., posts, photos)',
        category: 'Graph API',
        icon: 'link',
        verified: false,
        api: {
          endpoint: '/{version}/{node_id}/{edge}',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            nodeId: 'node_id',
            edge: 'edge',
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          nodeId: {
            type: 'string',
            required: true,
            label: 'Node ID',
            placeholder: 'page_id or user_id',
            description: 'The node whose edge to retrieve',
            aiControlled: false
          },
          edge: {
            type: 'string',
            required: true,
            label: 'Edge Name',
            placeholder: 'posts, feed, photos, albums',
            description: 'The edge/connection to retrieve (e.g., posts, feed, photos)',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Fields to retrieve from edge objects',
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 100,
            description: 'Number of results to return',
            aiControlled: false
          }
        }
      },
      {
        id: 'create_page_post',
        name: 'Create Page Post',
        description: 'Publish a post to a Facebook page feed',
        category: 'Posts',
        icon: 'send',
        verified: false,
        api: {
          endpoint: '/{version}/{page_id}/feed',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            pageId: 'page_id',
            message: 'message',
            link: 'link',
            published: 'published'
          }
        },
        inputSchema: {
          pageId: {
            type: 'string',
            required: true,
            label: 'Page ID',
            description: 'Facebook Page ID where the post will be published',
            aiControlled: false
          },
          message: {
            type: 'string',
            required: true,
            label: 'Message',
            inputType: 'textarea',
            description: 'The main text content of the post',
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
          published: {
            type: 'boolean',
            label: 'Publish Immediately',
            default: true,
            description: 'Whether to publish immediately or save as draft',
            aiControlled: false
          }
        }
      },
      {
        id: 'upload_page_photo',
        name: 'Upload Page Photo',
        description: 'Upload a photo to a Facebook page from URL or local device',
        category: 'Media',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/{version}/{page_id}/photos',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            pageId: 'page_id',
            url: 'url',
            caption: 'caption',
            published: 'published'
          }
        },
        inputSchema: {
          pageId: {
            type: 'string',
            required: true,
            label: 'Page ID',
            description: 'Facebook Page ID',
            aiControlled: false
          },
          photoUploadOption: {
            type: 'string',
            label: 'Photo Upload Method',
            enum: ['url', 'upload'],
            default: 'url',
            description: 'How to attach the photo: from URL or upload from device',
            aiControlled: false
          },
          url: {
            type: 'string',
            label: 'Photo URL',
            placeholder: 'https://example.com/photo.jpg',
            description: 'Public URL of the photo to upload (required when upload method is "url")',
            displayOptions: {
              show: {
                photoUploadOption: ['url']
              }
            },
            aiControlled: false
          },
          photoFile: {
            type: 'array',
            label: 'Upload Photo from Device',
            items: {
              type: 'object',
              properties: {
                fileName: { type: 'string', description: 'File name' },
                fileData: { type: 'string', description: 'Base64 encoded file data (data:image/jpeg;base64,...)' },
                mimeType: { type: 'string', description: 'MIME type (e.g., image/jpeg, image/png)' }
              }
            },
            maxItems: 1,
            description: 'Upload a photo from your device (required when upload method is "upload")',
            displayOptions: {
              show: {
                photoUploadOption: ['upload']
              }
            },
            aiControlled: false
          },
          caption: {
            type: 'string',
            label: 'Caption',
            inputType: 'textarea',
            maxLength: 1000,
            description: 'Photo caption (optional)',
            aiControlled: true,
            aiDescription: 'The caption for the Facebook photo'
          },
          published: {
            type: 'boolean',
            label: 'Published',
            default: true,
            aiControlled: false
          }
        }
      },
      {
        id: 'upload_page_video',
        name: 'Upload Page Video',
        description: 'Upload a video to a Facebook page from URL or local device',
        category: 'Media',
        icon: 'video',
        verified: false,
        api: {
          endpoint: '/{version}/{page_id}/videos',
          method: 'POST',
          baseUrl: 'https://graph-video.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            pageId: 'page_id',
            file_url: 'file_url',
            title: 'title',
            description: 'description',
            published: 'published'
          }
        },
        inputSchema: {
          pageId: {
            type: 'string',
            required: true,
            label: 'Page ID',
            description: 'Facebook Page ID',
            aiControlled: false
          },
          videoUploadOption: {
            type: 'string',
            label: 'Video Upload Method',
            enum: ['url', 'upload'],
            default: 'url',
            description: 'How to upload the video: from URL or upload from device',
            aiControlled: false
          },
          file_url: {
            type: 'string',
            label: 'Video URL',
            placeholder: 'https://example.com/video.mp4',
            description: 'Public URL of the video file (required when upload method is "url")',
            displayOptions: {
              show: {
                videoUploadOption: ['url']
              }
            },
            aiControlled: false
          },
          videoFile: {
            type: 'array',
            label: 'Upload Video from Device',
            items: {
              type: 'object',
              properties: {
                fileName: { type: 'string', description: 'File name' },
                fileData: { type: 'string', description: 'Base64 encoded file data (data:video/mp4;base64,...)' },
                mimeType: { type: 'string', description: 'MIME type (e.g., video/mp4, video/quicktime)' }
              }
            },
            maxItems: 1,
            description: 'Upload a video from your device (required when upload method is "upload"). Max 1GB.',
            displayOptions: {
              show: {
                videoUploadOption: ['upload']
              }
            },
            aiControlled: false
          },
          title: {
            type: 'string',
            label: 'Title',
            description: 'Video title',
            aiControlled: true,
            aiDescription: 'The title of the Facebook video'
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            description: 'Video description',
            aiControlled: true,
            aiDescription: 'The description of the Facebook video'
          },
          published: {
            type: 'boolean',
            label: 'Published',
            default: true,
            aiControlled: false
          }
        }
      },
      {
        id: 'get_pages',
        name: 'Get User Pages',
        description: 'List all Facebook pages managed by the user',
        category: 'Pages',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/{version}/me/accounts',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Page fields to retrieve',
            default: ['id', 'name', 'access_token', 'category'],
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            max: 100,
            aiControlled: false
          }
        }
      },
      {
        id: 'delete_post',
        name: 'Delete Post',
        description: 'Delete a Facebook post',
        category: 'Posts',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/{version}/{post_id}',
          method: 'DELETE',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            postId: 'post_id'
          }
        },
        inputSchema: {
          postId: {
            type: 'string',
            required: true,
            label: 'Post ID',
            description: 'ID of the post to delete',
            aiControlled: false
          }
        }
      },
      {
        id: 'comment_on_post',
        name: 'Comment on Post',
        description: 'Add a comment to a Facebook post',
        category: 'Engagement',
        icon: 'message-circle',
        verified: false,
        api: {
          endpoint: '/{version}/{post_id}/comments',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            postId: 'post_id',
            message: 'message'
          }
        },
        inputSchema: {
          postId: {
            type: 'string',
            required: true,
            label: 'Post ID',
            placeholder: '123456789_987654321',
            description: 'Full Post ID (format: page_id_post_id)',
            aiControlled: false
          },
          message: {
            type: 'string',
            required: true,
            label: 'Comment Message',
            inputType: 'textarea',
            maxLength: 8000,
            description: 'Your comment text (max 8,000 characters)',
            aiControlled: true,
            aiDescription: 'The text content of the comment'
          }
        }
      },
      {
        id: 'get_page_insights',
        name: 'Get Page Insights',
        description: 'Retrieve analytics and insights for a Facebook page',
        category: 'Analytics',
        icon: 'chart',
        verified: false,
        api: {
          endpoint: '/{version}/{page_id}/insights',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
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
            description: 'Facebook Page ID',
            aiControlled: false
          },
          metric: {
            type: 'array',
            label: 'Metrics',
            description: 'Metrics to retrieve',
            items: { type: 'string' },
            default: ['page_impressions', 'page_engaged_users'],
            aiControlled: false
          },
          period: {
            type: 'select',
            label: 'Period',
            options: [
              { label: 'Day', value: 'day' },
              { label: 'Week', value: 'week' },
              { label: 'Days 28', value: 'days_28' }
            ],
            default: 'day',
            aiControlled: false
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'page_post_published',
        name: 'Page Post Published',
        description: 'Triggers when a new post is published on a Facebook page',
        eventType: 'feed',
        verified: false,
        icon: 'send',
        webhookRequired: true,
        inputSchema: {
          appId: {
            type: 'string',
            required: true,
            label: 'App ID',
            placeholder: 'Enter your Facebook App ID',
            description: 'Your Facebook App ID from App Dashboard (required for webhook management)'
          }
        },
        outputSchema: {
          postId: { type: 'string', description: 'Post ID' },
          message: { type: 'string', description: 'Post message' },
          createdTime: { type: 'string', description: 'Creation timestamp' },
          permalinkUrl: { type: 'string', description: 'Post URL' },
          from: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'page_comment_received',
        name: 'Page Comment Received',
        description: 'Triggers when a comment is posted on a page post',
        eventType: 'comments',
        verified: false,
        icon: 'message-square',
        webhookRequired: true,
        inputSchema: {
          appId: {
            type: 'string',
            required: true,
            label: 'App ID',
            placeholder: 'Enter your Facebook App ID',
            description: 'Your Facebook App ID from App Dashboard (required for webhook management)'
          }
        },
        outputSchema: {
          commentId: { type: 'string' },
          message: { type: 'string' },
          postId: { type: 'string' },
          from: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          createdTime: { type: 'string' }
        }
      },
      {
        id: 'page_message_received',
        name: 'Page Message Received',
        description: 'Triggers when a message is sent to a Facebook page',
        eventType: 'messages',
        verified: false,
        icon: 'inbox',
        webhookRequired: true,
        inputSchema: {
          appId: {
            type: 'string',
            required: true,
            label: 'App ID',
            placeholder: 'Enter your Facebook App ID',
            description: 'Your Facebook App ID from App Dashboard (required for webhook management)'
          }
        },
        outputSchema: {
          messageId: { type: 'string' },
          text: { type: 'string' },
          from: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          timestamp: { type: 'number' }
        }
      },
      // Instagram Triggers
      {
        id: 'instagram_comment',
        name: 'Instagram Comment',
        description: 'Triggers when someone comments on your Instagram media',
        eventType: 'instagram_comment',
        verified: false,
        icon: 'message-circle',
        webhookRequired: true,
        inputSchema: {
          appId: {
            type: 'string',
            required: true,
            label: 'App ID',
            placeholder: 'Enter your Facebook App ID',
            description: 'Your Facebook App ID from App Dashboard (required for webhook management)'
          },
          objectType: {
            type: 'select',
            label: 'Object Type',
            options: [
              { label: 'Instagram', value: 'instagram' }
            ],
            default: 'instagram',
            description: 'The object type to subscribe to'
          },
          includeValues: {
            type: 'boolean',
            label: 'Include Values',
            default: true,
            description: 'Whether change notifications should include the new values'
          }
        },
        outputSchema: {
          commentId: { type: 'string', description: 'Comment ID' },
          text: { type: 'string', description: 'Comment text' },
          mediaId: { type: 'string', description: 'Media ID' },
          from: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' }
            },
            description: 'Comment author'
          },
          timestamp: { type: 'string', description: 'Comment timestamp' }
        }
      },
      {
        id: 'instagram_mention',
        name: 'Instagram Mention',
        description: 'Triggers when someone mentions you in their Instagram story or post',
        eventType: 'instagram_mention',
        verified: false,
        icon: 'at-sign',
        webhookRequired: true,
        inputSchema: {
          appId: {
            type: 'string',
            required: true,
            label: 'App ID',
            placeholder: 'Enter your Facebook App ID',
            description: 'Your Facebook App ID from App Dashboard (required for webhook management)'
          },
          objectType: {
            type: 'select',
            label: 'Object Type',
            options: [
              { label: 'Instagram', value: 'instagram' }
            ],
            default: 'instagram',
            description: 'The object type to subscribe to'
          }
        },
        outputSchema: {
          mentionId: { type: 'string' },
          mediaId: { type: 'string' },
          caption: { type: 'string' },
          from: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' }
            }
          },
          timestamp: { type: 'string' }
        }
      },
      {
        id: 'instagram_story_mention',
        name: 'Instagram Story Mention',
        description: 'Triggers when you are mentioned in an Instagram story',
        eventType: 'instagram_story_mention',
        verified: false,
        icon: 'camera',
        webhookRequired: true,
        inputSchema: {
          appId: {
            type: 'string',
            required: true,
            label: 'App ID',
            placeholder: 'Enter your Facebook App ID',
            description: 'Your Facebook App ID from App Dashboard (required for webhook management)'
          },
          objectType: {
            type: 'select',
            label: 'Object Type',
            options: [
              { label: 'Instagram', value: 'instagram' }
            ],
            default: 'instagram'
          }
        },
        outputSchema: {
          storyId: { type: 'string' },
          mediaUrl: { type: 'string' },
          from: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' }
            }
          },
          timestamp: { type: 'string' }
        }
      },
      {
        id: 'instagram_media_published',
        name: 'Instagram Media Published',
        description: 'Triggers when new media is published to your Instagram account',
        eventType: 'instagram_media_published',
        verified: false,
        icon: 'image',
        webhookRequired: true,
        inputSchema: {
          appId: {
            type: 'string',
            required: true,
            label: 'App ID',
            placeholder: 'Enter your Facebook App ID',
            description: 'Your Facebook App ID from App Dashboard (required for webhook management)'
          },
          objectType: {
            type: 'select',
            label: 'Object Type',
            options: [
              { label: 'Instagram', value: 'instagram' }
            ],
            default: 'instagram'
          }
        },
        outputSchema: {
          mediaId: { type: 'string' },
          mediaType: { type: 'string', description: 'IMAGE, VIDEO, or CAROUSEL_ALBUM' },
          caption: { type: 'string' },
          mediaUrl: { type: 'string' },
          permalink: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    ]
  };
