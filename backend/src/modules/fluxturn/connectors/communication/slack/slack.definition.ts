// Slack Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const SLACK_CONNECTOR: ConnectorDefinition = {
    name: 'slack',
    display_name: 'Slack',
    category: 'communication',
    description: 'Send messages and manage Slack workspaces',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authMode',
        label: 'Authentication Mode',
        type: 'select',
        required: true,
        default: 'oneclick',
        options: [
          { label: 'One-Click OAuth (Use Platform Credentials)', value: 'oneclick' },
          { label: 'Manual OAuth (Use Your Own Slack App)', value: 'manual' }
        ],
        description: 'Choose between platform-managed OAuth or your own Slack OAuth app',
        helpText: 'One-Click OAuth is easier and recommended for most users. Use Manual OAuth if you need custom scopes or branding.'
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: false,
        placeholder: 'Enter your Slack App Client ID',
        description: 'OAuth2 Client ID from your Slack App',
        helpUrl: 'https://api.slack.com/apps',
        helpText: 'Create a Slack App at api.slack.com/apps',
        displayOptions: { authMode: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: false,
        placeholder: 'Enter your Slack App Client Secret',
        description: 'OAuth2 Client Secret from your Slack App',
        helpUrl: 'https://api.slack.com/apps',
        helpText: 'Find Client Secret in your Slack App settings',
        displayOptions: { authMode: ['manual'] }
      },
      {
        key: 'redirectUrl',
        label: 'OAuth Redirect URL',
        type: 'string',
        required: false,
        placeholder: 'https://your-domain.com/oauth/callback',
        description: 'The redirect URL configured in your Slack App',
        helpUrl: 'https://api.slack.com/apps',
        helpText: 'Must match the redirect URL in your Slack App OAuth settings',
        displayOptions: { authMode: ['manual'] }
      }
    ],
    endpoints: {
      postMessage: '/chat.postMessage',
      listChannels: '/conversations.list',
      usersLookup: '/users.lookupByEmail',
      conversationsOpen: '/conversations.open'
    },
    webhook_support: true,
    rate_limits: { requests_per_minute: 60 },
    sandbox_available: true,
    verified: true,
    oauth_config: {
      authorization_url: 'https://slack.com/oauth/v2/authorize',
      token_url: 'https://slack.com/api/oauth.v2.access',
      scopes: [
        'chat:write',                // Post messages
        'chat:write.customize',      // Customize bot name and icon
        'channels:read',             // View basic info about public channels
        'channels:manage',           // Manage public channels
        'groups:read',               // View basic info about private channels
        'im:read',                   // View basic info about direct messages
        'im:write',                  // Start and manage direct messages
        'mpim:read',                 // View basic info about group direct messages
        'users:read'                 // View users and their basic info
      ]
    },
    supported_actions: [
      // ========== MESSAGE OPERATIONS ==========
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a Slack channel or direct message to a user',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel or User ID',
            placeholder: 'C01234ABCDE or U01234ABCDE',
            description: 'The ID of the channel (starts with C) or user (starts with U) to send the message to',
            helpText: 'Right-click on a channel in Slack → View channel details → Copy channel ID',
            aiControlled: false
          },
          text: {
            type: 'string',
            required: true,
            label: 'Message Text',
            inputType: 'textarea',
            placeholder: 'Enter your message here...',
            description: 'The text content of your message (supports Slack markdown formatting)',
            helpText: 'You can use *bold*, _italic_, ~strikethrough~, `code`, and ```code blocks```',
            aiControlled: true,
            aiDescription: 'The message text to send to Slack. Supports Slack markdown: *bold*, _italic_, ~strikethrough~, `code`, and code blocks.'
          },
          threadTs: {
            type: 'string',
            label: 'Reply in Thread (Optional)',
            placeholder: '1234567890.123456',
            description: 'To reply in a thread, provide the timestamp of the parent message',
            helpText: 'Leave empty to send as a new message. Use output from previous message node to reply in thread.',
            aiControlled: false
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the message was sent successfully' },
          channel: { type: 'string', description: 'The channel ID where message was sent' },
          ts: { type: 'string', description: 'Message timestamp (use this to reply in thread or update/delete message)' }
        }
      },
      {
        id: 'update_message',
        name: 'Update Message',
        description: 'Edit the text of a previously sent message',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel containing the message',
            helpText: 'Must be the same channel where the original message was sent',
            aiControlled: false
          },
          ts: {
            type: 'string',
            required: true,
            label: 'Message Timestamp',
            placeholder: '1234567890.123456',
            description: 'The timestamp of the message you want to update',
            helpText: 'You can get this from the output of the "Send Message" action or from message permalinks',
            aiControlled: false
          },
          text: {
            type: 'string',
            required: true,
            label: 'New Message Text',
            inputType: 'textarea',
            placeholder: 'Enter the updated message text...',
            description: 'The new text that will replace the existing message content',
            helpText: 'This will completely replace the old message text',
            aiControlled: true,
            aiDescription: 'The new message text to replace the existing message content.'
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the update was successful' },
          channel: { type: 'string', description: 'Channel ID' },
          ts: { type: 'string', description: 'Message timestamp' }
        }
      },
      {
        id: 'delete_message',
        name: 'Delete Message',
        description: 'Permanently delete a message from a channel (bot can only delete its own messages)',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel containing the message to delete',
            helpText: 'IMPORTANT: Slack bots can ONLY delete messages they posted themselves. User messages cannot be deleted.',
            aiControlled: false
          },
          ts: {
            type: 'string',
            required: true,
            label: 'Message Timestamp',
            placeholder: '1234567890.123456',
            description: 'The timestamp of the message you want to delete (must be a message sent by this bot)',
            helpText: 'Get this from the output of "Send Message" action. The bot can only delete messages it sent. Deletion is permanent!',
            aiControlled: false
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the deletion was successful' },
          channel: { type: 'string', description: 'Channel ID where message was deleted' },
          ts: { type: 'string', description: 'Timestamp of the deleted message' }
        }
      },
      {
        id: 'get_permalink',
        name: 'Get Message Permalink',
        description: 'Get a permanent shareable link to a specific message',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel containing the message',
            helpText: 'The channel where the message exists',
            aiControlled: false
          },
          ts: {
            type: 'string',
            required: true,
            label: 'Message Timestamp',
            placeholder: '1234567890.123456',
            description: 'The timestamp of the message',
            helpText: 'This creates a permanent URL that anyone with access to the channel can use to view the message',
            aiControlled: false
          }
        },
        outputSchema: {
          permalink: { type: 'string', description: 'The permanent URL to the message' }
        }
      },
      {
        id: 'search_messages',
        name: 'Search Messages',
        description: 'Search for messages across your workspace using queries',
        verified: false,
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Search Query',
            placeholder: 'from:@username in:#channel after:2024-01-01',
            description: 'Your search query using Slack search syntax',
            helpText: 'Examples: "bug report" | from:@john | in:#general | after:2024-01-01 | before:2024-12-31',
            aiControlled: true,
            aiDescription: 'The search query to find messages using Slack search syntax'
          },
          count: {
            type: 'number',
            label: 'Number of Results',
            placeholder: '20',
            default: 20,
            min: 1,
            max: 100,
            description: 'How many search results to return (1-100)',
            helpText: 'Default is 20 results. Use a lower number for faster searches.',
            aiControlled: false
          }
        },
        outputSchema: {
          messages: { type: 'array', description: 'Array of matching messages' },
          total: { type: 'number', description: 'Total number of matches found' }
        }
      },

      // ========== CHANNEL OPERATIONS ==========
      {
        id: 'create_channel',
        name: 'Create Channel',
        description: 'Create a new public or private channel in your workspace',
        verified: false,
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Channel Name',
            placeholder: 'project-updates',
            description: 'The name for the new channel (lowercase, no spaces)',
            helpText: 'Use hyphens or underscores instead of spaces. Example: "team-announcements" or "dev_updates"',
            pattern: '^[a-z0-9-_]+$',
            aiControlled: true,
            aiDescription: 'The name for the new Slack channel (lowercase, no spaces, use hyphens)'
          },
          is_private: {
            type: 'boolean',
            label: 'Private Channel',
            default: false,
            description: 'Create as a private channel (only invited members can see it)',
            helpText: 'Public channels are visible to all workspace members. Private channels are invite-only.',
            aiControlled: false
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'The created channel details including ID and name' }
        }
      },
      {
        id: 'get_channel',
        name: 'Get Channel Info',
        description: 'Retrieve detailed information about a specific channel',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to get information about',
            helpText: 'Get this from "Get Many Channels" action or right-click channel → View channel details',
            aiControlled: false
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Channel details: name, topic, purpose, member count, etc.' }
        }
      },
      {
        id: 'get_channels',
        name: 'Get Many Channels',
        description: 'List all channels your bot has access to',
        verified: false,
        inputSchema: {
          limit: {
            type: 'number',
            label: 'Maximum Results',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many channels to return (1-1000)',
            helpText: 'Default is 100. Use pagination for large workspaces.',
            aiControlled: false
          },
          types: {
            type: 'string',
            label: 'Channel Types',
            placeholder: 'public_channel,private_channel',
            default: 'public_channel',
            description: 'Comma-separated list of channel types to include',
            helpText: 'Options: public_channel, private_channel, mpim (group DMs), im (direct messages)',
            aiControlled: false
          }
        },
        outputSchema: {
          channels: { type: 'array', description: 'Array of channel objects with IDs, names, and details' }
        }
      },
      {
        id: 'channel_history',
        name: 'Get Channel History',
        description: 'Retrieve message history from a channel',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to get messages from',
            helpText: 'Your bot must be a member of the channel to read its history',
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Number of Messages',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many messages to retrieve (1-1000)',
            helpText: 'Recent messages are returned first. Use oldest/latest for specific time ranges.',
            aiControlled: false
          },
          oldest: {
            type: 'string',
            label: 'Start From (Timestamp)',
            placeholder: '1234567890.123456',
            description: 'Only include messages after this timestamp (optional)',
            helpText: 'Get messages after a specific point in time. Leave empty for most recent.',
            aiControlled: false
          },
          latest: {
            type: 'string',
            label: 'End At (Timestamp)',
            placeholder: '1234567890.123456',
            description: 'Only include messages before this timestamp (optional)',
            helpText: 'Get messages before a specific point in time. Leave empty for current time.',
            aiControlled: false
          }
        },
        outputSchema: {
          messages: { type: 'array', description: 'Array of message objects with text, user, timestamp, etc.' },
          has_more: { type: 'boolean', description: 'True if there are more messages available' }
        }
      },
      {
        id: 'invite_to_channel',
        name: 'Invite Users to Channel',
        description: 'Invite one or more users to join a channel',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to invite users to',
            helpText: 'You must be a member of this channel to invite others',
            aiControlled: false
          },
          users: {
            type: 'string',
            required: true,
            label: 'User IDs',
            placeholder: 'U1234ABCD,U5678EFGH',
            description: 'Comma-separated list of user IDs to invite',
            helpText: 'Get user IDs from "Get Users" action. Example: U1234ABCD,U5678EFGH (no spaces)',
            aiControlled: false
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Updated channel information after invitations' }
        }
      },
      {
        id: 'join_channel',
        name: 'Join Channel',
        description: 'Make your bot join a public channel',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel your bot should join',
            helpText: 'Bot can only join public channels. For private channels, a member must invite the bot.',
            aiControlled: false
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Channel information after joining' }
        }
      },
      {
        id: 'leave_channel',
        name: 'Leave Channel',
        description: 'Make your bot leave a channel',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel your bot should leave',
            helpText: 'Bot will no longer receive messages or have access to this channel',
            aiControlled: false
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the bot successfully left the channel' }
        }
      },
      {
        id: 'get_channel_members',
        name: 'Get Channel Members',
        description: 'List all members of a specific channel',
        verified: false,
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to get members from',
            helpText: 'Your bot must be a member of this channel to see its members',
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Maximum Results',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many members to return (1-1000)',
            helpText: 'Use pagination for channels with many members',
            aiControlled: false
          }
        },
        outputSchema: {
          members: { type: 'array', description: 'Array of user IDs who are members of the channel' }
        }
      },

      // ========== FILE OPERATIONS ==========
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to Slack and optionally share it in channels',
        verified: false,
        inputSchema: {
          content: {
            type: 'string',
            required: true,
            label: 'File Content',
            inputType: 'textarea',
            placeholder: 'Paste file content here or use output from previous node...',
            description: 'The content of the file you want to upload',
            helpText: 'Can be text content, base64 encoded data, or any string content',
            aiControlled: false
          },
          filename: {
            type: 'string',
            label: 'File Name',
            placeholder: 'report.txt',
            description: 'The name for the uploaded file (optional)',
            helpText: 'Include file extension. Example: "report.pdf", "data.csv", "image.png"',
            aiControlled: true,
            aiDescription: 'The name for the uploaded file including extension'
          },
          title: {
            type: 'string',
            label: 'File Title',
            placeholder: 'Monthly Report',
            description: 'A title for the file (optional, shown in Slack)',
            helpText: 'This appears as the file name in Slack if provided',
            aiControlled: true,
            aiDescription: 'A descriptive title for the file shown in Slack'
          },
          channels: {
            type: 'string',
            label: 'Share in Channels',
            placeholder: 'C01234ABCDE,C56789FGHIJ',
            description: 'Comma-separated channel IDs to share the file in (optional)',
            helpText: 'Leave empty to upload without sharing. Example: C01234ABCDE,C56789FGHIJ (no spaces)',
            aiControlled: false
          }
        },
        outputSchema: {
          file: { type: 'object', description: 'Uploaded file details including ID, name, URL, and sharing information' }
        }
      },
      {
        id: 'get_file',
        name: 'Get File Info',
        description: 'Retrieve detailed information about an uploaded file',
        verified: false,
        inputSchema: {
          file: {
            type: 'string',
            required: true,
            label: 'File ID',
            placeholder: 'F01234ABCDE',
            description: 'The ID of the file to retrieve information about',
            helpText: 'Get this from the "Upload File" action output or from file URLs in Slack',
            aiControlled: false
          }
        },
        outputSchema: {
          file: { type: 'object', description: 'Complete file information: name, size, type, URL, shares, etc.' }
        }
      },

      // ========== WORKSPACE OPERATIONS ==========
      {
        id: 'get_users',
        name: 'Get Users',
        description: 'Retrieve a list of users in your workspace',
        verified: false,
        inputSchema: {
          limit: {
            type: 'number',
            label: 'Maximum Results',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many users to return (1-1000)',
            helpText: 'Use this to get user IDs for inviting to channels or sending direct messages',
            aiControlled: false
          }
        },
        outputSchema: {
          users: { type: 'array', description: 'Array of user objects with IDs, names, emails, and profiles' }
        }
      },
      {
        id: 'get_messages',
        name: 'Get Messages (Legacy)',
        description: 'Retrieve messages from a channel - Use "Get Channel History" for better experience',
        verified: false,
        inputSchema: {
          options: {
            type: 'object',
            label: 'Query Options',
            description: 'Object containing channel ID and pagination settings',
            helpText: '⚠️ Note: Use "Get Channel History" action instead for a simpler, more user-friendly interface',
            aiControlled: false
          }
        },
        outputSchema: {
          messages: { type: 'array', description: 'Array of message objects' }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'message',
        name: 'New Message Posted to Channel',
        description: 'Triggers when a message is posted to a channel the app is added to',
        eventType: 'message',
        verified: false,
        icon: 'message-square',
        webhookRequired: true,
        inputSchema: {
          watchWholeWorkspace: {
            type: 'boolean',
            label: 'Watch Whole Workspace',
            description: 'When enabled, triggers for messages across all channels. When disabled, only watches specified channel.',
            default: false
          },
          channelId: {
            type: 'string',
            label: 'Channel to Watch',
            description: 'Specific channel to monitor (only used when "Watch Whole Workspace" is false)',
            placeholder: 'C01234ABCDE',
            displayOptions: {
              show: {
                watchWholeWorkspace: [false]
              }
            }
          },
          resolveIds: {
            type: 'boolean',
            label: 'Resolve User/Channel IDs',
            description: 'Resolve user and channel IDs to their names',
            default: false
          },
          ignoreUserList: {
            type: 'string',
            label: 'Ignore Messages From',
            description: 'Comma-separated list of usernames or user IDs to ignore',
            placeholder: 'U123ABC,bot_user',
            inputType: 'text'
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "message"' },
              channel: { type: 'string', description: 'Channel ID where message was posted' },
              user: { type: 'string', description: 'User ID who posted the message' },
              text: { type: 'string', description: 'Message content' },
              ts: { type: 'string', description: 'Message timestamp' },
              event_ts: { type: 'string', description: 'Event timestamp' },
              channel_type: { type: 'string', description: 'Type of channel (channel, group, im, mpim, app_home)' },
              thread_ts: { type: 'string', description: 'Thread timestamp (for threaded messages)' },
              subtype: { type: 'string', description: 'Message subtype (if applicable)' }
            }
          }
        }
      },
      {
        id: 'app_mention',
        name: 'Bot / App Mention',
        description: 'Triggers when your bot or app is mentioned in a channel',
        eventType: 'app_mention',
        verified: false,
        icon: 'at-sign',
        webhookRequired: true,
        inputSchema: {
          resolveIds: {
            type: 'boolean',
            label: 'Resolve User/Channel IDs',
            description: 'Resolve user and channel IDs to their names',
            default: false
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "app_mention"' },
              user: { type: 'string', description: 'User ID who mentioned the app' },
              text: { type: 'string', description: 'Message text containing the mention' },
              ts: { type: 'string', description: 'Message timestamp' },
              channel: { type: 'string', description: 'Channel ID' },
              event_ts: { type: 'string', description: 'Event timestamp' },
              thread_ts: { type: 'string', description: 'Thread timestamp (if in thread)' },
              channel_type: { type: 'string', description: 'Type of channel' }
            }
          }
        }
      },
      {
        id: 'reaction_added',
        name: 'Reaction Added',
        description: 'Triggers when a reaction is added to a message',
        eventType: 'reaction_added',
        verified: false,
        icon: 'smile',
        webhookRequired: true,
        inputSchema: {
          watchWholeWorkspace: {
            type: 'boolean',
            label: 'Watch Whole Workspace',
            description: 'When enabled, triggers for reactions across all channels',
            default: false
          },
          channelId: {
            type: 'string',
            label: 'Channel to Watch',
            description: 'Specific channel to monitor',
            placeholder: 'C01234ABCDE',
            displayOptions: {
              show: {
                watchWholeWorkspace: [false]
              }
            }
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "reaction_added"' },
              user: { type: 'string', description: 'User ID who added the reaction' },
              reaction: { type: 'string', description: 'Emoji name (without colons)' },
              item_user: { type: 'string', description: 'User ID who posted the message' },
              item: {
                type: 'object',
                description: 'Message details',
                properties: {
                  type: { type: 'string', description: 'Item type (usually "message")' },
                  channel: { type: 'string', description: 'Channel ID' },
                  ts: { type: 'string', description: 'Message timestamp' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'channel_created',
        name: 'New Public Channel Created',
        description: 'Triggers when a new public channel is created',
        eventType: 'channel_created',
        verified: false,
        icon: 'hash',
        webhookRequired: true,
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "channel_created"' },
              channel: {
                type: 'object',
                description: 'Channel details',
                properties: {
                  id: { type: 'string', description: 'Channel ID' },
                  name: { type: 'string', description: 'Channel name' },
                  created: { type: 'number', description: 'Unix timestamp when created' },
                  creator: { type: 'string', description: 'User ID who created the channel' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'team_join',
        name: 'New User',
        description: 'Triggers when a new user is added to Slack',
        eventType: 'team_join',
        verified: false,
        icon: 'user-plus',
        webhookRequired: true,
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "team_join"' },
              user: {
                type: 'object',
                description: 'Complete user object',
                properties: {
                  id: { type: 'string', description: 'User ID' },
                  team_id: { type: 'string', description: 'Team ID' },
                  name: { type: 'string', description: 'Username' },
                  real_name: { type: 'string', description: 'Real name' },
                  tz: { type: 'string', description: 'Timezone' },
                  profile: {
                    type: 'object',
                    description: 'User profile',
                    properties: {
                      display_name: { type: 'string' },
                      real_name: { type: 'string' },
                      email: { type: 'string' },
                      image_24: { type: 'string' },
                      image_32: { type: 'string' },
                      image_48: { type: 'string' },
                      image_72: { type: 'string' },
                      image_192: { type: 'string' },
                      image_512: { type: 'string' }
                    }
                  },
                  is_admin: { type: 'boolean' },
                  is_owner: { type: 'boolean' },
                  is_bot: { type: 'boolean' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'file_shared',
        name: 'File Shared',
        description: 'Triggers when a file is shared in a channel the app is added to',
        eventType: 'file_shared',
        verified: false,
        icon: 'file',
        webhookRequired: true,
        inputSchema: {
          watchWholeWorkspace: {
            type: 'boolean',
            label: 'Watch Whole Workspace',
            description: 'When enabled, triggers for file shares across all channels',
            default: false
          },
          channelId: {
            type: 'string',
            label: 'Channel to Watch',
            description: 'Specific channel to monitor',
            placeholder: 'C01234ABCDE',
            displayOptions: {
              show: {
                watchWholeWorkspace: [false]
              }
            }
          },
          downloadFiles: {
            type: 'boolean',
            label: 'Download Files',
            description: 'Automatically download file contents when triggered',
            default: false
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "file_shared"' },
              file_id: { type: 'string', description: 'File ID' },
              user_id: { type: 'string', description: 'User ID who shared the file' },
              file: {
                type: 'object',
                description: 'File object (minimal, use files.info for full details)',
                properties: {
                  id: { type: 'string', description: 'File ID' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'file_public',
        name: 'File Made Public',
        description: 'Triggers when a file is made public',
        eventType: 'file_public',
        verified: false,
        icon: 'globe',
        webhookRequired: true,
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "file_public"' },
              file_id: { type: 'string', description: 'File ID' },
              user_id: { type: 'string', description: 'User ID who made the file public' },
              file: {
                type: 'object',
                description: 'File object',
                properties: {
                  id: { type: 'string', description: 'File ID' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      }
    ]
  };
