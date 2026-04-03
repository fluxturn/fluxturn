// Discord Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const DISCORD_CONNECTOR: ConnectorDefinition = {
    name: 'discord',
    display_name: 'Discord',
    category: 'communication',
    description: 'Connect Discord to send messages, manage channels, and interact with server members',
    auth_type: 'multiple', // Supports Bot Token, OAuth2, and Webhook
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { 
            label: 'Bot Token', 
            value: 'bot_token',
            description: 'Manage messages, channels, and members on a server'
          },
          { 
            label: 'OAuth2', 
            value: 'oauth2',
            description: 'Same features as Bot Token with easier Bot installation'
          },
          { 
            label: 'Webhook', 
            value: 'webhook',
            description: 'Send messages to a specific channel'
          }
        ],
        default: 'bot_token'
      },
      // Bot Token fields
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your Discord bot token',
        description: 'Get your bot token from Discord Developer Portal',
        helpUrl: 'https://discord.com/developers/applications',
        displayOptions: {
          authType: ['bot_token']
        }
      },
      // OAuth2 fields
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: true,
        placeholder: 'Enter your Discord app client ID',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your Discord app client secret',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      {
        key: 'botTokenOAuth',
        label: 'Bot Token',
        type: 'password',
        required: false,
        placeholder: 'Enter your Discord bot token',
        description: 'Optional: Add bot token for bot-specific operations. Leave empty for user operations only',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      // Webhook fields
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'https://discord.com/api/webhooks/1234567890/abcdefghijklmnop',
        description: 'Enter the Discord webhook URL for your channel. Get this from Channel Settings > Integrations > Webhooks',
        helpText: 'Copy only the webhook URL, not any console output or error messages',
        displayOptions: {
          authType: ['webhook']
        }
      }
    ],
    endpoints: {
      base_url: 'https://discord.com/api/v10',
      channels: '/channels/{channel_id}',
      messages: '/channels/{channel_id}/messages',
      guilds: '/guilds/{guild_id}',
      members: '/guilds/{guild_id}/members',
      users: '/users/{user_id}',
      webhook: '/webhooks/{webhook_id}/{webhook_token}'
    },
    webhook_support: true,
    rate_limits: { 
      requests_per_second: 50,
      global_rate_limit: true
    },
    sandbox_available: false,
    verified: true,
    oauth_config: {
      authorization_url: 'https://discord.com/api/oauth2/authorize',
      token_url: 'https://discord.com/api/oauth2/token',
      scopes: ['identify', 'guilds', 'guilds.join', 'bot'],
      permissions: '1642758929655'
    },
    supported_actions: [
      // Channel Operations
      {
        id: 'channel_create',
        name: 'Create Channel',
        description: 'Create a new text or voice channel in a server',
        category: 'Channel',
        icon: 'hash',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/guilds/{guildId}/channels',
          method: 'POST',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          guildId: {
            type: 'string',
            required: true,
            label: 'Server ID',
            placeholder: '123456789012345678',
            description: 'The ID of the server to create the channel in',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: true,
            label: 'Channel Name',
            placeholder: 'general-chat',
            description: 'Channel name (2-100 characters, lowercase with hyphens)',
            aiControlled: true,
            aiDescription: 'The name for the new Discord channel (lowercase with hyphens)'
          },
          type: {
            type: 'select',
            required: true,
            label: 'Channel Type',
            options: [
              { label: 'Text Channel', value: 0 },
              { label: 'Voice Channel', value: 2 },
              { label: 'Category', value: 4 },
              { label: 'Announcement Channel', value: 5 },
              { label: 'Stage Channel', value: 13 },
              { label: 'Forum Channel', value: 15 }
            ],
            default: 0,
            aiControlled: false
          },
          topic: {
            type: 'string',
            label: 'Channel Topic',
            placeholder: 'Welcome to our general chat!',
            maxLength: 1024,
            description: 'Channel topic (0-1024 characters)',
            aiControlled: true,
            aiDescription: 'A description/topic for the Discord channel'
          },
          parent_id: {
            type: 'string',
            label: 'Category ID',
            placeholder: '123456789012345678',
            description: 'ID of the parent category',
            aiControlled: false
          },
          nsfw: {
            type: 'boolean',
            label: 'NSFW Channel',
            default: false,
            description: 'Whether the channel is NSFW',
            aiControlled: false
          },
          position: {
            type: 'number',
            label: 'Position',
            description: 'Sorting position of the channel',
            aiControlled: false
          }
        }
      },
      {
        id: 'channel_delete',
        name: 'Delete Channel',
        description: 'Delete a channel from a server',
        category: 'Channel',
        icon: 'trash',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/channels/{channelId}',
          method: 'DELETE',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: '123456789012345678',
            description: 'The ID of the channel to delete',
            aiControlled: false
          }
        }
      },
      // Message Operations
      {
        id: 'message_send',
        name: 'Send Message',
        description: 'Send a message to a Discord channel',
        category: 'Message',
        icon: 'send',
        verified: false,
        api: {
          endpoint: '/channels/{channelId}/messages',
          method: 'POST',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          channelId: {
            type: 'string',
            required: false, // Not required for webhooks
            label: 'Channel ID',
            placeholder: '123456789012345678',
            description: 'The channel to send the message to (not needed for webhooks)',
            aiControlled: false,
            displayOptions: {
              hide: {
                '/credentialAuthType': ['webhook'] // Hide when using webhook auth
              }
            }
          },
          content: {
            type: 'string',
            label: 'Message Content',
            inputType: 'textarea',
            maxLength: 2000,
            description: 'The message content (up to 2000 characters)',
            aiControlled: true,
            aiDescription: 'The message text to send to Discord. Maximum 2000 characters.'
          },
          embeds: {
            type: 'array',
            label: 'Embeds',
            description: 'Rich embed objects to include with the message',
            aiControlled: true,
            aiDescription: 'Optional rich embeds with title, description, color, fields, etc. Use for formatted responses.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', label: 'Title', maxLength: 256 },
                description: { type: 'string', label: 'Description', maxLength: 4096 },
                url: { type: 'string', label: 'URL' },
                color: { type: 'number', label: 'Color (decimal)' },
                fields: {
                  type: 'array',
                  label: 'Fields',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', required: true, maxLength: 256 },
                      value: { type: 'string', required: true, maxLength: 1024 },
                      inline: { type: 'boolean', default: false }
                    }
                  }
                },
                footer: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', maxLength: 2048 },
                    icon_url: { type: 'string' }
                  }
                },
                thumbnail: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' }
                  }
                },
                image: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' }
                  }
                }
              }
            }
          },
          tts: {
            type: 'boolean',
            label: 'Text-to-Speech',
            default: false,
            description: 'Send as a TTS message',
            aiControlled: false
          },
          reply_to: {
            type: 'string',
            label: 'Reply to Message ID',
            placeholder: '123456789012345678',
            description: 'ID of the message to reply to',
            aiControlled: false
          }
        }
      },
      {
        id: 'message_edit',
        name: 'Edit Message',
        description: 'Edit an existing message',
        category: 'Message',
        icon: 'edit',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/channels/{channelId}/messages/{messageId}',
          method: 'PATCH',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          messageId: {
            type: 'string',
            required: true,
            label: 'Message ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          content: {
            type: 'string',
            label: 'New Content',
            inputType: 'textarea',
            maxLength: 2000,
            aiControlled: true,
            aiDescription: 'The new message content to replace the existing message.'
          }
        }
      },
      {
        id: 'message_delete',
        name: 'Delete Message',
        description: 'Delete a message from a channel',
        category: 'Message',
        icon: 'trash',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/channels/{channelId}/messages/{messageId}',
          method: 'DELETE',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          messageId: {
            type: 'string',
            required: true,
            label: 'Message ID',
            placeholder: '123456789012345678',
            aiControlled: false
          }
        }
      },
      {
        id: 'message_react',
        name: 'Add Reaction',
        description: 'React to a message with an emoji',
        category: 'Message',
        icon: 'smile',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me',
          method: 'PUT',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          messageId: {
            type: 'string',
            required: true,
            label: 'Message ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          emoji: {
            type: 'string',
            required: true,
            label: 'Emoji',
            placeholder: '👍 or custom:123456789012345678',
            description: 'Unicode emoji or custom emoji format',
            aiControlled: false
          }
        }
      },
      // Member Operations
      {
        id: 'member_get_all',
        name: 'List Members',
        description: 'Get a list of members in a server',
        category: 'Member',
        icon: 'users',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/guilds/{guildId}/members',
          method: 'GET',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          guildId: {
            type: 'string',
            required: true,
            label: 'Server ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 100,
            min: 1,
            max: 1000,
            description: 'Max number of members to return (1-1000)',
            aiControlled: false
          },
          after: {
            type: 'string',
            label: 'After User ID',
            placeholder: '123456789012345678',
            description: 'Get members after this user ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'member_role_add',
        name: 'Add Role',
        description: 'Add a role to a member',
        category: 'Member',
        icon: 'user-plus',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/guilds/{guildId}/members/{userId}/roles/{roleId}',
          method: 'PUT',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          guildId: {
            type: 'string',
            required: true,
            label: 'Server ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          userId: {
            type: 'string',
            required: true,
            label: 'User ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          roleId: {
            type: 'string',
            required: true,
            label: 'Role ID',
            placeholder: '123456789012345678',
            aiControlled: false
          }
        }
      },
      {
        id: 'member_role_remove',
        name: 'Remove Role',
        description: 'Remove a role from a member',
        category: 'Member',
        icon: 'user-minus',
        displayOptions: {
          hide: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '/guilds/{guildId}/members/{userId}/roles/{roleId}',
          method: 'DELETE',
          baseUrl: 'https://discord.com/api/v10',
          headers: {
            'Authorization': 'Bot {botToken}'
          }
        },
        inputSchema: {
          guildId: {
            type: 'string',
            required: true,
            label: 'Server ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          userId: {
            type: 'string',
            required: true,
            label: 'User ID',
            placeholder: '123456789012345678',
            aiControlled: false
          },
          roleId: {
            type: 'string',
            required: true,
            label: 'Role ID',
            placeholder: '123456789012345678',
            aiControlled: false
          }
        }
      },
      // Webhook-specific action
      {
        id: 'webhook_send',
        name: 'Send via Webhook',
        description: 'Send a message using a webhook URL',
        category: 'Webhook',
        icon: 'webhook',
        displayOptions: {
          show: {
            '/credentialAuthType': ['webhook']
          }
        },
        api: {
          endpoint: '{webhookUrl}',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          content: {
            type: 'string',
            label: 'Message Content',
            inputType: 'textarea',
            maxLength: 2000,
            description: 'The message content',
            aiControlled: true,
            aiDescription: 'The message text to send via webhook. Maximum 2000 characters.'
          },
          username: {
            type: 'string',
            label: 'Username',
            placeholder: 'Webhook Bot',
            description: 'Override the default webhook username',
            aiControlled: false
          },
          avatar_url: {
            type: 'string',
            label: 'Avatar URL',
            placeholder: 'https://example.com/avatar.png',
            description: 'Override the default webhook avatar',
            aiControlled: false
          },
          tts: {
            type: 'boolean',
            label: 'Text-to-Speech',
            default: false,
            aiControlled: false
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_message',
        name: 'New Message',
        description: 'Triggers when a new message is posted in a channel',
        eventType: 'MESSAGE_CREATE',
        verified: false,
        icon: 'message-square',
        webhookRequired: true,
        inputSchema: {
          guildId: {
            type: 'string',
            label: 'Server ID',
            placeholder: '123456789012345678',
            description: 'The server to monitor (leave empty for all servers)'
          },
          channelId: {
            type: 'string',
            label: 'Channel ID',
            placeholder: '123456789012345678',
            description: 'Specific channel to monitor (leave empty for all channels)'
          },
          contentFilter: {
            type: 'string',
            label: 'Content Filter',
            placeholder: 'keyword',
            description: 'Only trigger for messages containing this text'
          },
          authorFilter: {
            type: 'select',
            label: 'Author Filter',
            options: [
              { label: 'All Messages', value: 'all' },
              { label: 'Only Users', value: 'users' },
              { label: 'Only Bots', value: 'bots' }
            ],
            default: 'all'
          }
        },
        outputSchema: {
          discordEvent: {
            type: 'object',
            properties: {
              messageId: { type: 'string' },
              channelId: { type: 'string' },
              guildId: { type: 'string' },
              content: { type: 'string' },
              timestamp: { type: 'string' },
              author: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  discriminator: { type: 'string' },
                  avatar: { type: 'string' },
                  bot: { type: 'boolean' }
                }
              },
              member: {
                type: 'object',
                properties: {
                  roles: { type: 'array', items: { type: 'string' } },
                  nickname: { type: 'string' }
                }
              },
              attachments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    filename: { type: 'string' },
                    url: { type: 'string' },
                    size: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'reaction_added',
        name: 'Reaction Added',
        description: 'Triggers when a reaction is added to a message',
        eventType: 'MESSAGE_REACTION_ADD',
        verified: false,
        icon: 'smile',
        webhookRequired: true,
        inputSchema: {
          guildId: {
            type: 'string',
            label: 'Server ID',
            placeholder: '123456789012345678'
          },
          channelId: {
            type: 'string',
            label: 'Channel ID',
            placeholder: '123456789012345678'
          },
          emojiFilter: {
            type: 'string',
            label: 'Emoji Filter',
            placeholder: '👍',
            description: 'Only trigger for specific emoji'
          }
        },
        outputSchema: {
          discordEvent: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              channelId: { type: 'string' },
              messageId: { type: 'string' },
              guildId: { type: 'string' },
              emoji: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      },
      {
        id: 'member_joined',
        name: 'Member Joined',
        description: 'Triggers when a new member joins the server',
        eventType: 'GUILD_MEMBER_ADD',
        verified: false,
        icon: 'user-plus',
        webhookRequired: true,
        inputSchema: {
          guildId: {
            type: 'string',
            required: true,
            label: 'Server ID',
            placeholder: '123456789012345678',
            description: 'The server to monitor for new members'
          }
        },
        outputSchema: {
          discordEvent: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  discriminator: { type: 'string' },
                  avatar: { type: 'string' }
                }
              },
              guildId: { type: 'string' },
              joinedAt: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'member_left',
        name: 'Member Left',
        description: 'Triggers when a member leaves the server',
        eventType: 'GUILD_MEMBER_REMOVE',
        verified: false,
        icon: 'user-minus',
        webhookRequired: true,
        inputSchema: {
          guildId: {
            type: 'string',
            required: true,
            label: 'Server ID',
            placeholder: '123456789012345678'
          }
        },
        outputSchema: {
          discordEvent: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  discriminator: { type: 'string' }
                }
              },
              guildId: { type: 'string' }
            }
          }
        }
      }
    ]
  };
