// Telegram Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const TELEGRAM_CONNECTOR: ConnectorDefinition = {
    name: 'telegram',
    display_name: 'Telegram',
    category: 'communication',
    description: 'Send and receive messages through Telegram Bot API',
    auth_type: 'api_key',

    // AI Tool configuration
    usableAsTool: true,
    toolDescription: 'Send messages and media to Telegram chats. The AI can compose message content while chat ID comes from workflow context.',
    auth_fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        description: 'Get your bot token from @BotFather on Telegram',
        helpUrl: 'https://core.telegram.org/bots#botfather',
        helpText: 'How to get a bot token'
      }
    ],
    endpoints: {
      base_url: 'https://api.telegram.org/bot{botToken}',
      message: {
        send: '/sendMessage',
        edit: '/editMessageText',
        delete: '/deleteMessage'
      },
      media: {
        photo: '/sendPhoto',
        document: '/sendDocument'
      }
    },
    webhook_support: true,
    rate_limits: { requests_per_second: 30 },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a text message to a Telegram chat',
        category: 'Messages',
        icon: 'send',
        verified: false,
        api: {
          endpoint: '/sendMessage',
          method: 'POST',
          baseUrl: 'https://api.telegram.org/bot{botToken}',
          headers: {
            'Content-Type': 'application/json'
          },
          paramMapping: {
            chatId: 'chat_id',
            text: 'text',
            parseMode: 'parse_mode',
            disableNotification: 'disable_notification'
          }
        },
        inputSchema: {
          chatId: {
            type: 'string',
            required: true,
            label: 'Chat ID',
            placeholder: '@username or -123456789',
            description: 'Unique identifier for the target chat or username',
            aiControlled: false,  // Comes from workflow context (e.g., trigger event)
          },
          text: {
            type: 'string',
            required: true,
            label: 'Message Text',
            inputType: 'textarea',
            description: 'Text of the message to be sent (1-4096 characters)',
            aiControlled: true,   // AI generates this content
            aiDescription: 'The message text to send to the Telegram chat. Can include emojis and formatting.',
          },
          parseMode: {
            type: 'select',
            label: 'Parse Mode',
            options: [
              { label: 'Plain Text', value: 'none' },
              { label: 'Markdown', value: 'Markdown' },
              { label: 'HTML', value: 'HTML' }
            ],
            default: 'none',
            description: 'How to parse entities in the message',
            aiControlled: false,  // Pre-configured by user
          },
          disableNotification: {
            type: 'boolean',
            label: 'Silent Message',
            default: false,
            description: 'Send message silently without notification',
            aiControlled: false,  // Pre-configured by user
          }
        }
      },
      {
        id: 'send_photo',
        name: 'Send Photo',
        description: 'Send a photo to a Telegram chat',
        category: 'Media',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/sendPhoto',
          method: 'POST',
          baseUrl: 'https://api.telegram.org/bot{botToken}',
          headers: {
            'Content-Type': 'application/json'
          },
          paramMapping: {
            chatId: 'chat_id',
            photo: 'photo',
            caption: 'caption',
            parseMode: 'parse_mode'
          }
        },
        inputSchema: {
          chatId: {
            type: 'string',
            required: true,
            label: 'Chat ID',
            placeholder: '@username or -123456789',
            aiControlled: false,  // Comes from workflow context
          },
          photo: {
            type: 'string',
            required: true,
            label: 'Photo URL',
            placeholder: 'https://example.com/photo.jpg',
            description: 'URL of the photo to send',
            aiControlled: false,  // Usually from workflow context or user config
          },
          caption: {
            type: 'string',
            label: 'Caption',
            inputType: 'textarea',
            maxLength: 1024,
            description: 'Photo caption (optional)',
            aiControlled: true,   // AI generates caption
            aiDescription: 'Optional caption text for the photo. Describe the photo or add context.',
          },
          parseMode: {
            type: 'select',
            label: 'Caption Parse Mode',
            options: [
              { label: 'None', value: '' },
              { label: 'Markdown', value: 'Markdown' },
              { label: 'HTML', value: 'HTML' }
            ],
            default: '',
            aiControlled: false,  // Pre-configured
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_message',
        name: 'New Message',
        description: 'Triggers when a new message is received',
        eventType: 'message',
        verified: false,
        icon: 'message-square',
        webhookRequired: true,
        inputSchema: {
          messageType: {
            type: 'select',
            label: 'Message Type Filter',
            description: 'Filter messages by type',
            options: [
              { label: 'All Messages', value: 'all' },
              { label: 'Text Messages Only', value: 'text' },
              { label: 'Photo Messages Only', value: 'photo' },
              { label: 'Document Messages Only', value: 'document' }
            ],
            default: 'all'
          },
          chatType: {
            type: 'select',
            label: 'Chat Type Filter',
            description: 'Filter messages by chat type',
            options: [
              { label: 'All Chats', value: 'all' },
              { label: 'Private Chats Only', value: 'private' },
              { label: 'Groups Only', value: 'group' },
              { label: 'Supergroups Only', value: 'supergroup' },
              { label: 'Channels Only', value: 'channel' }
            ],
            default: 'all'
          },
          webhookToken: {
            type: 'string',
            label: 'Webhook Secret Token',
            description: 'Optional secret token for webhook verification',
            placeholder: 'my-secret-token-123'
          }
        },
        outputSchema: {
          telegramEvent: {
            type: 'object',
            properties: {
              updateId: { type: 'number', description: 'Update ID from Telegram' },
              timestamp: { type: 'string', description: 'ISO timestamp of the event' },
              type: { type: 'string', description: 'Event type (message, callback_query, etc.)' },
              message: {
                type: 'object',
                properties: {
                  messageId: { type: 'number', description: 'Unique message ID' },
                  text: { type: 'string', description: 'Message text content' },
                  date: { type: 'number', description: 'Unix timestamp of the message' },
                  from: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', description: 'User ID' },
                      firstName: { type: 'string', description: 'User first name' },
                      username: { type: 'string', description: 'User @username' },
                      isBot: { type: 'boolean', description: 'Whether user is a bot' }
                    }
                  },
                  chat: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', description: 'Chat ID' },
                      type: { type: 'string', description: 'Chat type (private, group, etc.)' },
                      username: { type: 'string', description: 'Chat username if available' },
                      firstName: { type: 'string', description: 'First name for private chats' },
                      title: { type: 'string', description: 'Title for group chats' }
                    }
                  },
                  entities: {
                    type: 'array',
                    description: 'Message entities (commands, mentions, etc.)',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string' },
                        offset: { type: 'number' },
                        length: { type: 'number' }
                      }
                    }
                  },
                  photo: {
                    type: 'array',
                    description: 'Photo sizes if photo message',
                    items: {
                      type: 'object',
                      properties: {
                        file_id: { type: 'string' },
                        width: { type: 'number' },
                        height: { type: 'number' },
                        file_size: { type: 'number' }
                      }
                    }
                  },
                  caption: { type: 'string', description: 'Caption for media messages' }
                }
              }
            }
          }
        }
      },
      {
        id: 'new_command',
        name: 'New Command',
        description: 'Triggers when a specific bot command is received',
        eventType: 'message',
        verified: false,
        icon: 'terminal',
        webhookRequired: true,
        inputSchema: {
          command: {
            type: 'string',
            required: true,
            label: 'Command',
            placeholder: '/start',
            description: 'The command to listen for (with or without /)'
          },
          includeArgs: {
            type: 'boolean',
            label: 'Include Arguments',
            description: 'Include command arguments in the output',
            default: true
          }
        },
        outputSchema: {
          telegramEvent: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'The command that was triggered' },
              arguments: { type: 'string', description: 'Command arguments if any' },
              message: {
                type: 'object',
                properties: {
                  messageId: { type: 'number' },
                  text: { type: 'string' },
                  from: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      firstName: { type: 'string' },
                      username: { type: 'string' }
                    }
                  },
                  chat: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      type: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'callback_query',
        name: 'Callback Query',
        description: 'Triggers when an inline keyboard button is pressed',
        eventType: 'callback_query',
        verified: false,
        icon: 'mouse-pointer',
        webhookRequired: true,
        inputSchema: {
          dataPrefix: {
            type: 'string',
            label: 'Data Prefix Filter',
            description: 'Only trigger for callback data starting with this prefix',
            placeholder: 'action_'
          }
        },
        outputSchema: {
          telegramEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type (callback_query)' },
              callbackQuery: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique query ID' },
                  data: { type: 'string', description: 'Callback data from button' },
                  from: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      firstName: { type: 'string' },
                      username: { type: 'string' }
                    }
                  },
                  message: {
                    type: 'object',
                    description: 'Original message with the button',
                    properties: {
                      messageId: { type: 'number' },
                      chat: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          type: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'new_chat_member',
        name: 'New Chat Member',
        description: 'Triggers when a new member joins a group or channel',
        eventType: 'new_chat_members',
        verified: false,
        icon: 'user-plus',
        webhookRequired: true,
        outputSchema: {
          telegramEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type' },
              chat: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  type: { type: 'string' },
                  title: { type: 'string' }
                }
              },
              newMembers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    firstName: { type: 'string' },
                    username: { type: 'string' },
                    isBot: { type: 'boolean' }
                  }
                }
              },
              from: {
                type: 'object',
                description: 'User who added the new members',
                properties: {
                  id: { type: 'number' },
                  firstName: { type: 'string' },
                  username: { type: 'string' }
                }
              }
            }
          }
        }
      },
      {
        id: 'chat_member_left',
        name: 'Chat Member Left',
        description: 'Triggers when a member leaves a group or channel',
        eventType: 'left_chat_member',
        verified: false,
        icon: 'user-minus',
        webhookRequired: true,
        outputSchema: {
          telegramEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type' },
              chat: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  type: { type: 'string' },
                  title: { type: 'string' }
                }
              },
              leftMember: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  firstName: { type: 'string' },
                  username: { type: 'string' },
                  isBot: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    ]
  };
